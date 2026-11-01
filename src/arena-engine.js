import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { loadExtremeSupply } from './arena-extreme-supply.js';

export const PRESETS = Object.freeze({
  quick: Object.freeze({ id: 'quick', name: 'Quick', difficulty: 'Extreme', seconds: 180 }),
  standard: Object.freeze({ id: 'standard', name: 'Standard', difficulty: 'Extreme', seconds: 300 }),
  endurance: Object.freeze({ id: 'endurance', name: 'Endurance', difficulty: 'Extreme', seconds: 480 }),
});
export const PRESET_TIE_PRIORITY = Object.freeze(['quick', 'standard', 'endurance']);
const hash = value => createHash('sha256').update(value).digest();
const newId = () => randomBytes(9).toString('base64url');
let supply;
export function puzzleForRound(round) {
  supply ??= loadExtremeSupply();
  if (!Number.isSafeInteger(round) || round < 0 || round >= supply.length) throw new ArenaError(503, 'EXTREME_SUPPLY_EXHAUSTED');
  return supply[round];
}

const participatingGuests = session => [...session.votes.keys()].filter(guest => session.guests.has(guest)).length;

function resolvePreset(session) {
  const counts = Object.fromEntries(PRESET_TIE_PRIORITY.map(id => [id, 0]));
  for (const choice of session.votes.values()) counts[choice] += 1;
  const max = Math.max(...Object.values(counts));
  const winner = max === 0
    ? session.defaultPreset
    : PRESET_TIE_PRIORITY.find(id => counts[id] === max);
  session.preset = winner;
  session.presetResults = counts;
  session.status = 'READY';
  session.version += 1;
}

export class ArenaStore {
  constructor({ now = () => Date.now(), presetVoteMs = 20_000, sessionTtlMs = 2 * 60 * 60 * 1000, minParticipants = 1 } = {}) {
    if (!Number.isSafeInteger(minParticipants) || minParticipants < 1 || minParticipants > 20) throw new Error('Invalid minimum participant count');
    this.minParticipants = minParticipants;
    this.now = now;
    this.sessionTtlMs = sessionTtlMs;
    this.presetVoteMs = presetVoteMs;
    this.sessions = new Map();
    this.idempotent = new Map();
    this.activeSessionId = null;
    this.nextSessionSequence = 0;
  }

  create(defaultPreset = 'quick', priorSessionId = null) {
    if (!PRESETS[defaultPreset]) throw new ArenaError(400, 'INVALID_PRESET');
    const id = newId();
    const hostToken = randomBytes(32).toString('base64url');
    const round = priorSessionId ? (this.sessions.get(priorSessionId)?.round ?? 0) + 1 : 0;
    const puzzle = puzzleForRound(round);
    const session = {
      id, sessionSequence: ++this.nextSessionSequence, hostHash: hash(hostToken), status: 'CREATED', defaultPreset, preset: null, guests: new Map(),
      presetResults: null, votes: new Map(), puzzle, round, priorSessionId,
      createdAt: this.now(), touchedAt: this.now(), ballotDeadline: null,
      roundDeadline: null, winner: null, resultReason: null, version: 1, pendingSolves: new Map(), nextSession: null,
    };
    this.sessions.set(id, session);
    this.activeSessionId = id;
    return { id, hostToken, version: session.version };
  }

  #session(id) {
    const resolvedId = id === 'live' ? this.activeSessionId : id;
    const session = resolvedId ? this.sessions.get(resolvedId) : null;
    if (!session) throw new ArenaError(404, 'SESSION_NOT_FOUND');
    session.touchedAt = this.now();
    this.#advance(session);
    return session;
  }

  // Evicts sessions idle past the TTL and their idempotency keys; a live round is touched by every poll.
  prune() {
    const cutoff = this.now() - this.sessionTtlMs;
    const evicted = new Set();
    for (const [id, session] of this.sessions) {
      if (session.touchedAt <= cutoff && session.pendingSolves.size === 0) { this.sessions.delete(id); evicted.add(id); if (this.activeSessionId === id) this.activeSessionId = null; }
    }
    if (!evicted.size) return 0;
    for (const key of this.idempotent.keys()) if (evicted.has(key.slice(0, key.indexOf(':')))) this.idempotent.delete(key);
    return evicted.size;
  }

  #advance(session) {
    const now = this.now();
    for (const [guest, seen] of session.guests) {
      if (now - seen > 15_000) { session.guests.delete(guest); if (session.status !== 'PLAYING') session.version += 1; }
    }
    if (session.status === 'VOTING' && now >= session.ballotDeadline) resolvePreset(session);
    const eligibleSolvePending = [...session.pendingSolves.values()].some(({ ingressAt }) => ingressAt < session.roundDeadline);
    if (session.status === 'PLAYING' && now >= session.roundDeadline && !eligibleSolvePending) {
      session.status = 'RESULT'; session.winner = 'audience'; session.resultReason = 'TIME_EXPIRED'; session.version += 1;
    }
  }

  beginSolve(id, token, ingressAt) {
    const session = this.sessions.get(id);
    if (!session) throw new ArenaError(404, 'SESSION_NOT_FOUND');
    this.#requireHost(session, token);
    if (session.status !== 'PLAYING' || ingressAt >= session.roundDeadline) return null;
    const ticket = randomBytes(18).toString('base64url');
    session.pendingSolves.set(ticket, { ingressAt });
    return ticket;
  }

  finishSolve(id, ticket) {
    if (!ticket) return;
    const session = this.sessions.get(id);
    if (!session) return;
    session.pendingSolves.delete(ticket);
    if (session.status === 'PLAYING') this.#advance(session);
  }

  #requireHost(session, token) {
    if (!token || !timingSafeEqual(session.hostHash, hash(token))) {
      throw new ArenaError(403, 'NOT_AUTHORIZED');
    }
  }

  join(id, guestHash) {
    const s = this.#session(id);
    const wasPresent = s.guests.has(guestHash);
    s.guests.set(guestHash, this.now());
    if (s.status === 'CREATED') s.status = 'LOBBY';
    if (!wasPresent && s.status !== 'PLAYING') s.version += 1;
    return this.publicSnapshot(id);
  }

  openVoting(id, token, expectedVersion) {
    const s = this.#session(id); this.#requireHost(s, token);
    if (s.version !== expectedVersion) throw new ArenaError(409, 'STALE_VERSION');
    const mayReopen = s.status === 'READY' && participatingGuests(s) < this.minParticipants;
    if ((s.status !== 'LOBBY' && !mayReopen) || s.guests.size === 0) throw new ArenaError(409, 'GUEST_REQUIRED');
    if (mayReopen) { s.votes.clear(); s.preset = null; s.presetResults = null; }
    s.status = 'VOTING'; s.ballotDeadline = this.now() + this.presetVoteMs; s.version += 1;
    return this.hostSnapshot(id, token);
  }

  publicSnapshot(id) {
    const s = this.#session(id);
    const now = this.now();
    return {
      id: s.id, status: s.status, version: s.version, preset: s.preset,
      sessionSequence: s.sessionSequence,
      presets: Object.values(PRESETS), presetTiePriority: PRESET_TIE_PRIORITY, participantCount: s.guests.size, participationRequired: this.minParticipants, participationSatisfied: participatingGuests(s) >= this.minParticipants,
      presetVote: s.status === 'VOTING'
        ? { closesAt: s.ballotDeadline, totalVotesCast: s.votes.size, results: null }
        : { closesAt: s.ballotDeadline, totalVotesCast: s.votes.size, results: s.presetResults },
      puzzle: s.status === 'PLAYING' || s.status === 'RESULT' ? { givens: s.puzzle.givens } : null,
      deadline: s.roundDeadline, serverNow: now,
      secondsRemaining: s.status === 'PLAYING' ? Math.max(0, Math.ceil((s.roundDeadline - now) / 1000)) : null,
      result: s.status === 'RESULT' ? { winner: s.winner, reason: s.resultReason } : null,
      priorSessionId: s.priorSessionId,
    };
  }

  hostSnapshot(id, token) {
    const s = this.#session(id); this.#requireHost(s, token);
    return { ...this.publicSnapshot(id), canControl: true, round: s.round };
  }

  vote(id, guestHash, choice, requestId) {
    const s = this.#session(id);
    if (!PRESETS[choice]) throw new ArenaError(400, 'INVALID_PRESET');
    if (typeof requestId !== 'string' || requestId.length < 8 || requestId.length > 100) throw new ArenaError(400, 'INVALID_REQUEST_ID');
    const key = `${id}:vote:${guestHash}:${requestId}`;
    if (this.idempotent.has(key)) return this.idempotent.get(key);
    if (s.status !== 'VOTING') throw new ArenaError(409, 'BALLOT_CLOSED');
    if (!s.guests.has(guestHash)) throw new ArenaError(403, 'JOIN_REQUIRED');
    s.votes.set(guestHash, choice); s.version += 1;
    const result = { version: s.version, accepted: true };
    this.idempotent.set(key, result);
    return result;
  }

  start(id, token, expectedVersion, requestId) {
    const s = this.#session(id); this.#requireHost(s, token);
    const key = `${id}:start:${requestId}`;
    if (typeof requestId !== 'string' || requestId.length < 8 || requestId.length > 100) throw new ArenaError(400, 'INVALID_REQUEST_ID');
    if (this.idempotent.has(key)) return this.idempotent.get(key);
    if (!Number.isInteger(expectedVersion) || expectedVersion !== s.version) throw new ArenaError(409, 'STALE_VERSION');
    if (s.status === 'VOTING') throw new ArenaError(409, 'BALLOT_OPEN');
    if (s.status !== 'READY') throw new ArenaError(409, 'INVALID_TRANSITION');
    if (participatingGuests(s) < this.minParticipants) throw new ArenaError(409, 'PARTICIPATION_REQUIRED');
    s.status = 'PLAYING'; s.roundDeadline = this.now() + PRESETS[s.preset].seconds * 1000; s.version += 1;
    const result = this.hostSnapshot(id, token);
    this.idempotent.set(key, result);
    return result;
  }

  solve(id, token, { solution, expectedVersion, requestId }, ingressAt = this.now()) {
    const s = this.sessions.get(id);
    if (!s) throw new ArenaError(404, 'SESSION_NOT_FOUND');
    this.#requireHost(s, token);
    const key = `${id}:solve:${requestId}`;
    if (this.idempotent.has(key)) return this.idempotent.get(key);
    if (typeof requestId !== 'string' || requestId.length < 8 || requestId.length > 100) throw new ArenaError(400, 'INVALID_REQUEST_ID');
    if (!Number.isInteger(expectedVersion) || expectedVersion !== s.version) throw new ArenaError(409, 'STALE_VERSION');
    if (s.status !== 'PLAYING') throw new ArenaError(409, 'INVALID_TRANSITION');
    if (this.now() >= s.roundDeadline && ingressAt >= s.roundDeadline) {
      this.#advance(s);
      throw new ArenaError(409, 'SESSION_TERMINAL');
    }
    const submitted = Array.isArray(solution) && solution.length === 81 && solution.every(n => Number.isInteger(n) && n >= 1 && n <= 9)
      ? solution.join('') : '';
    const correct = submitted === s.puzzle.solution && ingressAt < s.roundDeadline;
    if (correct) {
      s.status = 'RESULT'; s.winner = 'host'; s.resultReason = 'SOLVED'; s.version += 1;
    } else if (this.now() >= s.roundDeadline) {
      s.status = 'RESULT'; s.winner = 'audience'; s.resultReason = 'TIME_EXPIRED'; s.version += 1;
    } else {
      throw new ArenaError(400, 'SOLUTION_INCORRECT');
    }
    const result = this.hostSnapshot(id, token);
    this.idempotent.set(key, result);
    return result;
  }

  rematch(id, token, expectedVersion, defaultPreset = 'quick', requestId) {
    const s = this.#session(id); this.#requireHost(s, token);
    const key = `${id}:rematch:${requestId}`;
    if (typeof requestId !== 'string' || requestId.length < 8 || requestId.length > 100) throw new ArenaError(400, 'INVALID_REQUEST_ID');
    if (this.idempotent.has(key)) return this.idempotent.get(key);
    if (s.status !== 'RESULT') throw new ArenaError(409, 'INVALID_TRANSITION');
    // A finished session has exactly one successor, whatever requestId the retry carries.
    if (s.nextSession) return s.nextSession;
    if (expectedVersion !== s.version) throw new ArenaError(409, 'STALE_VERSION');
    const created = this.create(defaultPreset, id);
    s.nextSession = created;
    this.idempotent.set(key, created);
    return created;
  }
}

export class ArenaError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
