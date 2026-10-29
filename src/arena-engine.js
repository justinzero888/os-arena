import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const PRESETS = Object.freeze({
  easy: Object.freeze({ id: 'easy', name: 'Easy Sprint', difficulty: 'Easy', seconds: 180 }),
  medium: Object.freeze({ id: 'medium', name: 'Medium Match', difficulty: 'Medium', seconds: 300 }),
  hard: Object.freeze({ id: 'hard', name: 'Hard Survival', difficulty: 'Hard', seconds: 480 }),
});
export const PRESET_TIE_PRIORITY = Object.freeze(['easy', 'medium', 'hard']);
const BASE_GIVENS = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const BASE_SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
const hash = value => createHash('sha256').update(value).digest();
const newId = () => randomBytes(9).toString('base64url');

export function puzzleForRound(round) {
  // A digit permutation preserves Sudoku validity and gives rematches a fresh board.
  const shift = Math.max(0, round) % 8 + 1;
  const mapDigit = c => c === '0' ? '0' : String((Number(c) - 1 + shift) % 9 + 1);
  return { givens: [...BASE_GIVENS].map(mapDigit).join(''), solution: [...BASE_SOLUTION].map(mapDigit).join('') };
}

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
  constructor({ now = () => Date.now(), presetVoteMs = 20_000, sessionTtlMs = 2 * 60 * 60 * 1000 } = {}) {
    this.now = now;
    this.sessionTtlMs = sessionTtlMs;
    this.presetVoteMs = presetVoteMs;
    this.sessions = new Map();
    this.idempotent = new Map();
  }

  create(defaultPreset = 'easy', priorSessionId = null) {
    if (!PRESETS[defaultPreset]) throw new ArenaError(400, 'INVALID_PRESET');
    const id = newId();
    const hostToken = randomBytes(32).toString('base64url');
    const round = priorSessionId ? (this.sessions.get(priorSessionId)?.round ?? 0) + 1 : 0;
    const puzzle = puzzleForRound(round);
    const session = {
      id, hostHash: hash(hostToken), status: 'PRESET_VOTE', defaultPreset, preset: null,
      presetResults: null, votes: new Map(), puzzle, round, priorSessionId,
      createdAt: this.now(), touchedAt: this.now(), ballotDeadline: this.now() + this.presetVoteMs,
      roundDeadline: null, winner: null, resultReason: null, version: 1, pendingSolves: new Map(), nextSession: null,
    };
    this.sessions.set(id, session);
    return { id, hostToken, version: session.version };
  }

  #session(id) {
    const session = this.sessions.get(id);
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
      if (session.touchedAt <= cutoff && session.pendingSolves.size === 0) { this.sessions.delete(id); evicted.add(id); }
    }
    if (!evicted.size) return 0;
    for (const key of this.idempotent.keys()) if (evicted.has(key.slice(0, key.indexOf(':')))) this.idempotent.delete(key);
    return evicted.size;
  }

  #advance(session) {
    const now = this.now();
    if (session.status === 'PRESET_VOTE' && now >= session.ballotDeadline) resolvePreset(session);
    const eligibleSolvePending = [...session.pendingSolves.values()].some(({ ingressAt }) => ingressAt < session.roundDeadline);
    if (session.status === 'PLAYING' && now >= session.roundDeadline && !eligibleSolvePending) {
      session.status = 'FINISHED'; session.winner = 'audience'; session.resultReason = 'TIME_EXPIRED'; session.version += 1;
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

  publicSnapshot(id) {
    const s = this.#session(id);
    const now = this.now();
    return {
      id: s.id, status: s.status, version: s.version, preset: s.preset,
      presets: Object.values(PRESETS), presetTiePriority: PRESET_TIE_PRIORITY,
      presetVote: s.status === 'PRESET_VOTE'
        ? { closesAt: s.ballotDeadline, totalVotesCast: s.votes.size, results: null }
        : { closesAt: s.ballotDeadline, totalVotesCast: s.votes.size, results: s.presetResults },
      puzzle: s.status === 'PLAYING' || s.status === 'FINISHED' ? { givens: s.puzzle.givens } : null,
      deadline: s.roundDeadline, serverNow: now,
      secondsRemaining: s.status === 'PLAYING' ? Math.max(0, Math.ceil((s.roundDeadline - now) / 1000)) : null,
      result: s.status === 'FINISHED' ? { winner: s.winner, reason: s.resultReason } : null,
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
    if (s.status !== 'PRESET_VOTE') throw new ArenaError(409, 'BALLOT_CLOSED');
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
    if (s.status === 'PRESET_VOTE') throw new ArenaError(409, 'BALLOT_OPEN');
    if (s.status !== 'READY') throw new ArenaError(409, 'INVALID_TRANSITION');
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
      s.status = 'FINISHED'; s.winner = 'host'; s.resultReason = 'SOLVED'; s.version += 1;
    } else if (this.now() >= s.roundDeadline) {
      s.status = 'FINISHED'; s.winner = 'audience'; s.resultReason = 'TIME_EXPIRED'; s.version += 1;
    } else {
      throw new ArenaError(400, 'SOLUTION_INCORRECT');
    }
    const result = this.hostSnapshot(id, token);
    this.idempotent.set(key, result);
    return result;
  }

  rematch(id, token, expectedVersion, defaultPreset = 'easy', requestId) {
    const s = this.#session(id); this.#requireHost(s, token);
    const key = `${id}:rematch:${requestId}`;
    if (typeof requestId !== 'string' || requestId.length < 8 || requestId.length > 100) throw new ArenaError(400, 'INVALID_REQUEST_ID');
    if (this.idempotent.has(key)) return this.idempotent.get(key);
    if (s.status !== 'FINISHED') throw new ArenaError(409, 'INVALID_TRANSITION');
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
