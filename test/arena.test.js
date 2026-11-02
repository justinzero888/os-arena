import test from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadExtremeSupply } from '../src/arena-extreme-supply.js';
import { ArenaStore, ArenaError, PRESETS, puzzleForRound } from '../src/arena-engine.js';
import { createArenaServer } from '../src/arena-server.js';
import { acceptSnapshot, isCountdownOnly, updateStartButton } from '../public/arena-ui-state.js';

const validGrid = value => [...value].map(Number);
const failure = (fn, code) => assert.throws(fn, error => error instanceof ArenaError && error.code === code);
const requestId = n => `request-${n}-123456`;

function prepareVote(store, created, guest = 'test-guest', choice = 'quick') {
  store.join(created.id, guest);
  const host = store.hostSnapshot(created.id, created.hostToken);
  store.openVoting(created.id, created.hostToken, host.version);
  store.vote(created.id, guest, choice, requestId(Math.random()));
}
function startRound(store, created, version = created.version) {
  const session = store.sessions.get(created.id);
  if (['CREATED', 'LOBBY'].includes(session.status)) prepareVote(store, created);
  session.ballotDeadline = store.now();
  store.join(created.id, [...session.votes.keys()][0]);
  const host = store.hostSnapshot(created.id, created.hostToken);
  return store.start(created.id, created.hostToken, version === created.version ? host.version : version, requestId(Math.random()));
}

test('guest joins before host opens voting; ballot closes only after its duration; no empty audience start', () => {
  let now = 1000;
  const store = new ArenaStore({ now: () => now });
  const created = store.create('standard');
  assert.equal(store.publicSnapshot(created.id).status, 'CREATED');
  failure(() => store.openVoting(created.id, created.hostToken, created.version), 'GUEST_REQUIRED');
  store.join(created.id, 'guest-a');
  let host = store.hostSnapshot(created.id, created.hostToken);
  assert.equal(host.status, 'LOBBY');
  assert.equal(host.participantCount, 1);
  assert.equal(host.presetVote.totalVotesCast, 0);
  failure(() => store.vote(created.id, 'guest-a', 'quick', requestId(1)), 'BALLOT_CLOSED');
  store.openVoting(created.id, created.hostToken, host.version);
  store.vote(created.id, 'guest-a', 'standard', requestId(2));
  now += 19_999; store.join(created.id, 'guest-a');
  host = store.hostSnapshot(created.id, created.hostToken);
  assert.equal(host.status, 'VOTING');
  failure(() => store.start(created.id, created.hostToken, host.version, requestId(3)), 'BALLOT_OPEN');
  now += 1; host = store.hostSnapshot(created.id, created.hostToken);
  assert.equal(host.status, 'READY');
  assert.equal(host.preset, 'standard');
  assert.equal(host.presetVote.totalVotesCast, 1);
  assert.equal(store.publicSnapshot(created.id).version, host.version);
  assert.equal(store.start(created.id, created.hostToken, host.version, requestId(4)).status, 'PLAYING');
  const empty = store.create(); store.join(empty.id, 'guest-b'); let e = store.hostSnapshot(empty.id, empty.hostToken);
  store.openVoting(empty.id, empty.hostToken, e.version); now += 20_000; store.join(empty.id, 'guest-b');
  e = store.hostSnapshot(empty.id, empty.hostToken);
  failure(() => store.start(empty.id, empty.hostToken, e.version, requestId(5)), 'PARTICIPATION_REQUIRED');
  store.join(empty.id, 'guest-b'); e = store.hostSnapshot(empty.id, empty.hostToken);
  assert.equal(store.openVoting(empty.id, empty.hostToken, e.version).status, 'VOTING');
  assert.equal(store.publicSnapshot(empty.id).presetVote.totalVotesCast, 0);
});

test('stable live alias follows the newest public session without exposing host capability', () => {
  const store = new ArenaStore();
  const first = store.create('quick');
  assert.equal(store.publicSnapshot('live').id, first.id);
  assert.equal(JSON.stringify(store.publicSnapshot('live')).includes(first.hostToken), false);
  const second = store.create('endurance');
  const live = store.publicSnapshot('live');
  assert.equal(live.id, second.id);
  assert.equal(live.preset, null);
  failure(() => store.hostSnapshot('live', first.hostToken), 'NOT_AUTHORIZED');
});

test('Extreme supply is approved, unique, bounded and fails closed on unapproved input', () => {
  const supply = loadExtremeSupply();
  assert.equal(supply.length, 16);
  assert.ok(Object.values(PRESETS).every(mode => mode.difficulty === 'Extreme'));
  assert.equal(new Set(supply.map(puzzle => puzzle.givens)).size, 16);
  assert.notEqual(puzzleForRound(0).givens, puzzleForRound(1).givens);
  failure(() => puzzleForRound(16), 'EXTREME_SUPPLY_EXHAUSTED');
  const directory = mkdtempSync(join(tmpdir(), 'arena-unapproved-'));
  try {
    const path = join(directory, 'supply.json');
    writeFileSync(path, JSON.stringify({ tier: 'Extreme', puzzles: [{ givens: '0'.repeat(81) }] }));
    assert.throws(() => loadExtremeSupply(path), /Unapproved/);
    assert.throws(() => loadExtremeSupply(join(directory, 'missing')), /unavailable/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('disconnected guests expire and cannot satisfy the participation requirement', () => {
  let now = 1000; const store = new ArenaStore({ now: () => now }); const created = store.create();
  prepareVote(store, created); now += 20_000;
  const ready = store.hostSnapshot(created.id, created.hostToken);
  assert.equal(ready.participantCount, 0);
  assert.equal(ready.participationSatisfied, false);
  failure(() => store.start(created.id, created.hostToken, ready.version, requestId(6)), 'PARTICIPATION_REQUIRED');
});

test('configured participant minimum is enforced using connected voters', () => {
  let now = 1_000; const store = new ArenaStore({ now: () => now, minParticipants: 2 });
  const created = store.create(); prepareVote(store, created, 'first');
  store.join(created.id, 'second'); now += 20_000; store.join(created.id, 'first'); store.join(created.id, 'second');
  let ready = store.hostSnapshot(created.id, created.hostToken);
  assert.equal(ready.participationRequired, 2); assert.equal(ready.participationSatisfied, false);
  failure(() => store.start(created.id, created.hostToken, ready.version, requestId(7)), 'PARTICIPATION_REQUIRED');
  store.openVoting(created.id, created.hostToken, ready.version);
  store.vote(created.id, 'first', 'quick', requestId(8)); store.vote(created.id, 'second', 'standard', requestId(9));
  now += 20_000; store.join(created.id, 'first'); store.join(created.id, 'second'); ready = store.hostSnapshot(created.id, created.hostToken);
  assert.equal(ready.participationSatisfied, true); assert.equal(store.start(created.id, created.hostToken, ready.version, requestId(10)).status, 'PLAYING');
});

test('public projection hides vote breakdown and private capabilities', () => {
  const store = new ArenaStore(); const created = store.create();
  prepareVote(store, created, 'private-guest-hash', 'endurance');
  const open = store.publicSnapshot(created.id);
  assert.equal(open.presetVote.results, null);
  assert.equal(open.presetVote.totalVotesCast, 1);
  assert.equal(JSON.stringify(open).includes(puzzleForRound(0).solution), false);
  assert.equal(JSON.stringify(open).includes(created.hostToken), false);
  assert.equal(JSON.stringify(open).includes('private-guest-hash'), false);
});

test('host board progress is server-authoritative and safe in public snapshots', () => {
  let now = 10_000;
  const store = new ArenaStore({ now: () => now, presetVoteMs: 1 });
  const created = store.create();
  const started = startRound(store, created);
  const emptyIndex = [...puzzleForRound(0).givens].findIndex(digit => digit === '0');
  const values = Array(81).fill('');
  values[emptyIndex] = '7';
  const updated = store.updateBoard(created.id, created.hostToken, { values, expectedVersion: started.version });
  assert.equal(updated.puzzle.board[emptyIndex], '7');
  assert.equal(store.publicSnapshot(created.id).puzzle.board[emptyIndex], '7');
  assert.equal(JSON.stringify(store.publicSnapshot(created.id)).includes(puzzleForRound(0).solution), false);
  failure(() => store.updateBoard(created.id, 'wrong-token', { values, expectedVersion: updated.version }), 'NOT_AUTHORIZED');
  failure(() => store.updateBoard(created.id, created.hostToken, { values: Array(80).fill(''), expectedVersion: updated.version }), 'INVALID_BOARD');
});

test('full solution is validated and a qualifying pre-deadline solve wins across processing delay', () => {
  let now = 10_000;
  const store = new ArenaStore({ now: () => now, presetVoteMs: 1 });
  const created = store.create();
  const started = startRound(store, created);
  failure(() => store.solve(created.id, created.hostToken, { solution: Array(81).fill(1), expectedVersion: started.version, requestId: requestId(12) }), 'SOLUTION_INCORRECT');
  now = started.deadline + 1;
  const won = store.solve(created.id, created.hostToken, { solution: validGrid(puzzleForRound(0).solution), expectedVersion: started.version, requestId: requestId(13) }, started.deadline - 1);
  assert.equal(won.status, 'RESULT');
  assert.deepEqual(won.result, { winner: 'host', reason: 'SOLVED' });
});

test('timeout wins at the deadline; a solve received at or after deadline cannot win', () => {
  let now = 50_000;
  const store = new ArenaStore({ now: () => now, presetVoteMs: 1 });
  const created = store.create();
  const started = startRound(store, created);
  now = started.deadline;
  const timedOut = store.publicSnapshot(created.id);
  assert.deepEqual(timedOut.result, { winner: 'audience', reason: 'TIME_EXPIRED' });
  failure(() => store.solve(created.id, created.hostToken, { solution: validGrid(puzzleForRound(0).solution), expectedVersion: started.version, requestId: requestId(14) }, started.deadline), 'STALE_VERSION');
});

test('deadline polling waits for an earlier-ingress solve request still reading its body', async () => {
  let now = 100_000;
  const store = new ArenaStore({ now: () => now, presetVoteMs: 1 });
  const created = store.create();
  const started = startRound(store, created);
  let responseResolve;
  let responseReject;
  const responsePromise = new Promise((resolve, reject) => { responseResolve = resolve; responseReject = reject; });

  await withServer(async base => {
    const body = JSON.stringify({ solution: validGrid(puzzleForRound(0).solution), expectedVersion: started.version, requestId: requestId(18) });
    const request = httpRequest(`${base}/api/arena/sessions/${created.id}/solve`, {
      method: 'POST',
      headers: {
        Origin: base,
        Cookie: `arena_host_${created.id}=${created.hostToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, response => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { text += chunk; });
      response.on('end', () => responseResolve({ status: response.statusCode, body: JSON.parse(text) }));
    });
    request.on('error', responseReject);
    const splitAt = Math.floor(body.length / 2);
    request.write(body.slice(0, splitAt));
    for (let attempts = 0; store.sessions.get(created.id).pendingSolves.size === 0 && attempts < 50; attempts += 1) {
      await new Promise(resolve => setTimeout(resolve, 2));
    }
    assert.equal(store.sessions.get(created.id).pendingSolves.size, 1, 'solve ingress must be registered before body parsing completes');

    now = started.deadline;
    const polled = await fetch(`${base}/api/arena/sessions/${created.id}`, { headers: { Origin: base } });
    const pollState = await polled.json();
    assert.equal(pollState.status, 'PLAYING');
    assert.equal(pollState.result, null);

    request.end(body.slice(splitAt));
    const solveResponse = await responsePromise;
    assert.equal(solveResponse.status, 200);
    assert.deepEqual(solveResponse.body.result, { winner: 'host', reason: 'SOLVED' });
    assert.deepEqual(store.publicSnapshot(created.id).result, { winner: 'host', reason: 'SOLVED' });
  }, store, { now: () => now });
});

async function waitForPendingSolve(store, id, expected) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (store.sessions.get(id).pendingSolves.size === expected) return;
    await new Promise(resolve => setTimeout(resolve, 2));
  }
  assert.equal(store.sessions.get(id).pendingSolves.size, expected);
}

async function openPartialSolve(base, created, body = '{"solution":') {
  const request = httpRequest(`${base}/api/arena/sessions/${created.id}/solve`, {
    method: 'POST',
    headers: {
      Origin: base,
      Cookie: `arena_host_${created.id}=${created.hostToken}`,
      'Content-Type': 'application/json',
      'Content-Length': 500,
    },
  });
  request.on('error', () => {});
  request.write(body);
  return request;
}

test('aborted partial solve releases its ticket and allows deadline resolution', async () => {
  let now = 120_000;
  const store = new ArenaStore({ now: () => now, presetVoteMs: 1 });
  const created = store.create();
  const started = startRound(store, created);
  await withServer(async base => {
    const request = await openPartialSolve(base, created);
    await waitForPendingSolve(store, created.id, 1);
    now = started.deadline;
    assert.equal(store.publicSnapshot(created.id).status, 'PLAYING');
    request.destroy();
    await waitForPendingSolve(store, created.id, 0);
    assert.deepEqual(store.publicSnapshot(created.id).result, { winner: 'audience', reason: 'TIME_EXPIRED' });
  }, store, { now: () => now });
});

test('body-read timeout releases an incomplete solve ticket', async () => {
  let now = 140_000;
  const store = new ArenaStore({ now: () => now, presetVoteMs: 1 });
  const created = store.create();
  const started = startRound(store, created);
  await withServer(async base => {
    await openPartialSolve(base, created);
    await waitForPendingSolve(store, created.id, 1);
    now = started.deadline;
    await waitForPendingSolve(store, created.id, 0);
    assert.deepEqual(store.publicSnapshot(created.id).result, { winner: 'audience', reason: 'TIME_EXPIRED' });
  }, store, { now: () => now, bodyTimeoutMs: 25 });
});

test('rematch links a fresh session and puzzle while preserving the finished result', () => {
  let now = 80_000;
  const store = new ArenaStore({ now: () => now });
  const created = store.create();
  now += 20_000;
  const started = startRound(store, created);
  const won = store.solve(created.id, created.hostToken, { solution: validGrid(puzzleForRound(0).solution), expectedVersion: started.version, requestId: requestId(15) });
  const next = store.rematch(created.id, created.hostToken, won.version, 'standard', requestId(16));
  assert.equal(store.publicSnapshot(next.id).status, 'CREATED');
  assert.equal(store.publicSnapshot(next.id).priorSessionId, created.id);
  assert.notEqual(puzzleForRound(1).givens, puzzleForRound(0).givens);
  assert.equal(store.publicSnapshot(created.id).result.winner, 'host');
  assert.equal(store.rematch(created.id, created.hostToken, won.version, 'standard', requestId(16)).id, next.id);
  failure(() => store.start(next.id, created.hostToken, next.version, requestId(17)), 'NOT_AUTHORIZED');
});

async function withServer(fn, store = new ArenaStore(), serverOptions = {}) {
  const server = createArenaServer({ enabled: true, store, ...serverOptions });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try { await fn(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
function jarFetch(base) {
  const jar = new Map();
  return async (path, body) => {
    const headers = { Origin: base };
    if (body) headers['Content-Type'] = 'application/json';
    if (jar.size) headers.Cookie = [...jar].map(([k,v]) => `${k}=${v}`).join('; ');
    const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined });
    for (const line of response.headers.getSetCookie()) {
      const [pair] = line.split(';'); const split = pair.indexOf('='); jar.set(pair.slice(0, split), pair.slice(split + 1));
    }
    return { status: response.status, body: await response.json() };
  };
}

test('HTTP lifecycle: host capability cookie, guest vote, start, solve, refresh, rematch', async () => {
  let now = Date.now();
  await withServer(async base => {
    const host = jarFetch(base);
    const guest = jarFetch(base);
    const created = await host('/api/arena/sessions', { defaultPreset: 'quick' });
    assert.equal(created.status, 201);
    assert.equal('hostToken' in created.body, false);
    assert.equal(created.body.hostUrl, `/host/${created.body.id}`);
    const id = created.body.id;
    const publicOpen = await guest(`/api/arena/sessions/${id}`);
    assert.equal(publicOpen.status, 200);
    const deniedHostView = await guest(`/api/arena/sessions/${id}/host`);
    assert.equal(deniedHostView.status, 403);
    await guest(`/api/arena/sessions/${id}/join`, {});
    const lobby = await host(`/api/arena/sessions/${id}/host`);
    await host(`/api/arena/sessions/${id}/open-voting`, { expectedVersion: lobby.body.version });
    const voted = await guest(`/api/arena/sessions/${id}/votes`, { preset: 'standard', requestId: requestId(20) });
    assert.equal(voted.status, 200);
    now += 20_000;
    await guest(`/api/arena/sessions/${id}/join`, {});
    const hostState = await host(`/api/arena/sessions/${id}/host`);
    assert.equal(hostState.status, 200);
    const started = await host(`/api/arena/sessions/${id}/start`, { expectedVersion: hostState.body.version, requestId: requestId(21) });
    assert.equal(started.body.preset, 'standard');
    const guestPlaying = await guest(`/api/arena/sessions/${id}`);
    assert.equal(guestPlaying.body.status, 'PLAYING');
    assert.equal('solution' in guestPlaying.body.puzzle, false);
    const emptyIndex = [...puzzleForRound(0).givens].findIndex(digit => digit === '0');
    const values = Array(81).fill(''); values[emptyIndex] = '7';
    const board = await host(`/api/arena/sessions/${id}/board`, { values, expectedVersion: started.body.version });
    assert.equal(board.status, 200);
    const guestBoard = await guest(`/api/arena/sessions/${id}`);
    assert.equal(guestBoard.body.puzzle.board[emptyIndex], '7');
    const won = await host(`/api/arena/sessions/${id}/solve`, { solution: validGrid(puzzleForRound(0).solution), expectedVersion: board.body.version, requestId: requestId(22) });
    assert.deepEqual(won.body.result, { winner: 'host', reason: 'SOLVED' });
    const refreshed = await guest(`/api/arena/sessions/${id}`);
    assert.equal(refreshed.body.status, 'RESULT');
    assert.deepEqual(refreshed.body.result, { winner: 'host', reason: 'SOLVED' });
    const next = await host(`/api/arena/sessions/${id}/rematch`, { expectedVersion: won.body.version, defaultPreset: 'quick', requestId: requestId(23) });
    assert.equal(next.status, 201);
    assert.notEqual(next.body.id, id);
    assert.equal((await host(`/api/arena/sessions/${next.body.id}/host`)).body.status, 'CREATED');
  }, new ArenaStore({ now: () => now }));
});

test('feature flag is fail-closed and POST rejects absent or foreign Origin', async () => {
  await withServer(async base => {
    const off = createArenaServer({ enabled: false });
    await new Promise(resolve => off.listen(0, '127.0.0.1', resolve));
    const offBase = `http://127.0.0.1:${off.address().port}`;
    let disabled;
    try { disabled = await fetch(offBase + '/api/arena/sessions', { method: 'POST', headers: { Origin: offBase, 'Content-Type': 'application/json' }, body: '{}' }); }
    finally { await new Promise(resolve => off.close(resolve)); }
    assert.equal(disabled.status, 404);
    const acceptedSameOrigin = await fetch(base + '/api/arena/sessions', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(acceptedSameOrigin.status, 201);
    const missingOrigin = await fetch(base + '/api/arena/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(missingOrigin.status, 403);
    const schemeMismatch = await fetch(base + '/api/arena/sessions', { method: 'POST', headers: { Origin: base.replace(/^http:/, 'https:'), 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(schemeMismatch.status, 403);
    const foreign = await fetch(base + '/api/arena/sessions', { method: 'POST', headers: { Origin: 'https://attacker.invalid', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(foreign.status, 403);
  });
});


test('guest vote endpoint enforces per-browser rate limits', async () => {
  await withServer(async base => {
    const host = jarFetch(base);
    const guest = jarFetch(base);
    const created = await host('/api/arena/sessions', { defaultPreset: 'quick' });
    await guest(`/api/arena/sessions/${created.body.id}/join`, {});
    const lobby = await host(`/api/arena/sessions/${created.body.id}/host`);
    await host(`/api/arena/sessions/${created.body.id}/open-voting`, { expectedVersion: lobby.body.version });
    let last;
    for (let i = 0; i < 11; i += 1) {
      last = await guest(`/api/arena/sessions/${created.body.id}/votes`, { preset: 'quick', requestId: requestId(100 + i) });
    }
    assert.equal(last.status, 429);
    assert.equal(last.body.error, 'RATE_LIMITED');
  });
});

test('three browser identities can sustain normal five-second heartbeats without sharing a rate bucket', async () => {
  let now = 0;
  await withServer(async base => {
    const host = jarFetch(base);
    const guests = [jarFetch(base), jarFetch(base), jarFetch(base)];
    const created = await host('/api/arena/sessions', { defaultPreset: 'quick' });
    const id = created.body.id;

    // The client joins immediately, then once every five seconds: 12 joins per
    // browser per minute, or 36/minute for three local browser contexts.
    for (let beat = 0; beat < 12; beat += 1) {
      now = beat * 5_000;
      for (const guest of guests) {
        const response = await guest(`/api/arena/sessions/${id}/join`, {});
        assert.equal(response.status, 200);
      }
    }
    const lobby = await host(`/api/arena/sessions/${id}/host`);
    assert.equal(lobby.body.participantCount, 3);
    const voting = await host(`/api/arena/sessions/${id}/open-voting`, { expectedVersion: lobby.body.version });
    assert.equal(voting.status, 200);
    for (const [index, guest] of guests.entries()) {
      const response = await guest(`/api/arena/sessions/${id}/votes`, { preset: index === 1 ? 'standard' : 'quick', requestId: requestId(300 + index) });
      assert.equal(response.status, 200);
    }
    // A vote replacement is still one vote because browser identity is the
    // server-side guest cookie hash, not the number of open pages.
    const changed = await guests[0](`/api/arena/sessions/${id}/votes`, { preset: 'standard', requestId: requestId(304) });
    assert.equal(changed.status, 200);
    assert.equal((await host(`/api/arena/sessions/${id}/host`)).body.presetVote.totalVotesCast, 3);
  }, new ArenaStore({ now: () => now, presetVoteMs: 120_000 }), { now: () => now });
});

test('guest presence heartbeat remains rate-limited per browser identity', async () => {
  let now = 0;
  await withServer(async base => {
    const host = jarFetch(base);
    const guest = jarFetch(base);
    const created = await host('/api/arena/sessions', { defaultPreset: 'quick' });
    let last;
    for (let i = 0; i < 16; i += 1) last = await guest(`/api/arena/sessions/${created.body.id}/join`, {});
    assert.equal(last.status, 429);
    assert.equal(last.body.error, 'RATE_LIMITED');
  }, new ArenaStore({ now: () => now }), { now: () => now });
});

test('a snapshot-minted guest cookie still requires an IP-limited first join', async () => {
  let now = 0;
  await withServer(async base => {
    const host = jarFetch(base);
    const created = await host('/api/arena/sessions', { defaultPreset: 'quick' });
    const guests = Array.from({ length: 30 }, () => jarFetch(base));
    // GET may set an arena_guest cookie, but it must not establish a new
    // identity that can bypass the 30/minute shared-IP registration guard.
    for (const guest of guests) assert.equal((await guest(`/api/arena/sessions/${created.body.id}`)).status, 200);
    let last;
    for (const guest of guests) last = await guest(`/api/arena/sessions/${created.body.id}/join`, {});
    assert.equal(last.status, 429); // Create + 29 distinct first joins = 30.
    assert.equal(last.body.error, 'RATE_LIMITED');
  }, new ArenaStore({ now: () => now }), { now: () => now });
});


test('host cannot end the fixed time-mode ballot early', () => {
  let now = 70_000; const store = new ArenaStore({ now: () => now }); const created = store.create();
  prepareVote(store, created); const open = store.hostSnapshot(created.id, created.hostToken);
  const button = { disabled: false }; updateStartButton(button, open); assert.equal(button.disabled, true);
  failure(() => store.start(created.id, created.hostToken, open.version, requestId(200)), 'BALLOT_OPEN');
  now += 20_000; store.join(created.id, 'test-guest'); const ready = store.hostSnapshot(created.id, created.hostToken);
  updateStartButton(button, ready); assert.equal(button.disabled, false);
  assert.equal(store.start(created.id, created.hostToken, ready.version, requestId(201)).status, 'PLAYING');
});

test('host Start control is disabled until authoritative state is READY', () => {
  const button = { disabled: false };
  updateStartButton(button, null);
  assert.equal(button.disabled, true);
  updateStartButton(button, { status: 'VOTING', canControl: true, preset: null, presetVote: { totalVotesCast: 0 } });
  assert.equal(button.disabled, true);
  updateStartButton(button, { status: 'VOTING', canControl: true, preset: 'quick' });
  assert.equal(button.disabled, true);
  updateStartButton(button, { status: 'READY', canControl: true, preset: 'standard', participationSatisfied: true });
  assert.equal(button.disabled, false);
  updateStartButton(button, { status: 'READY', canControl: false, preset: 'standard' });
  assert.equal(button.disabled, true);
  updateStartButton(button, { status: 'RESULT', canControl: true, preset: 'standard' });
  assert.equal(button.disabled, true);
});

test('older snapshots cannot revert PLAYING or enable Start; session changes reset the version guard', () => {
  const expectedSessionId = 'session-current';
  const playing = { id: expectedSessionId, version: 5, status: 'PLAYING', canControl: true, preset: 'quick' };
  const staleReady = { id: expectedSessionId, version: 4, status: 'READY', canControl: true, preset: 'quick' };
  let current = acceptSnapshot(null, playing, expectedSessionId);
  const startButton = { disabled: true };
  updateStartButton(startButton, current);
  assert.equal(current.status, 'PLAYING');
  assert.equal(startButton.disabled, true);

  current = acceptSnapshot(current, staleReady, expectedSessionId);
  updateStartButton(startButton, current);
  assert.equal(current.status, 'PLAYING');
  assert.equal(startButton.disabled, true);

  const nextSessionId = 'session-next';
  const nextReady = { id: nextSessionId, version: 1, status: 'READY', canControl: true, preset: 'standard', participationSatisfied: true };
  current = acceptSnapshot(current, nextReady, nextSessionId);
  assert.equal(current.id, nextSessionId);
  assert.equal(current.status, 'READY');
  updateStartButton(startButton, current);
  assert.equal(startButton.disabled, false);
  current = acceptSnapshot(current, staleReady, nextSessionId);
  assert.equal(current, nextReady, 'a delayed response from the prior session is ignored');
});

test('live overlay accepts the server-resolved current session ID', () => {
  const current = acceptSnapshot(null, { id: 'resolved-session', sessionSequence: 2, version: 1, status: 'PLAYING' }, 'live');
  assert.equal(current.id, 'resolved-session');
  const stale = acceptSnapshot(current, { id: 'older-session', sessionSequence: 1, version: 99, status: 'READY' }, 'live');
  assert.equal(stale, current, 'an alias response from another session cannot replace the current view');
});

test('rematch is idempotent per finished session even with a fresh requestId', () => {
  let now = 80_000;
  const store = new ArenaStore({ now: () => now });
  const created = store.create();
  now += 20_000;
  const started = startRound(store, created);
  const won = store.solve(created.id, created.hostToken, { solution: validGrid(puzzleForRound(0).solution), expectedVersion: started.version, requestId: requestId(40) });
  const first = store.rematch(created.id, created.hostToken, won.version, 'quick', requestId(41));
  const second = store.rematch(created.id, created.hostToken, won.version, 'quick', requestId(42));
  assert.equal(second.id, first.id);
  assert.equal(store.sessions.size, 2);
});

test('prune evicts idle sessions and their idempotency keys but keeps touched ones', () => {
  let now = 0;
  const store = new ArenaStore({ now: () => now, sessionTtlMs: 1000 });
  const idle = store.create();
  const live = store.create();
  prepareVote(store, idle, 'guest-a');
  now = 900; store.publicSnapshot(live.id);
  now = 1500;
  assert.equal(store.prune(), 1);
  failure(() => store.publicSnapshot(idle.id), 'SESSION_NOT_FOUND');
  assert.equal(store.publicSnapshot(live.id).id, live.id);
  assert.equal([...store.idempotent.keys()].some(key => key.startsWith(`${idle.id}:`)), false);
});

test('same-version snapshots only refresh the countdown', () => {
  const current = { id: 's1', version: 3, status: 'PLAYING', secondsRemaining: 10 };
  assert.equal(isCountdownOnly(current, { ...current, secondsRemaining: 9 }), true);
  assert.equal(isCountdownOnly(current, { ...current, version: 4 }), false);
  assert.equal(isCountdownOnly(null, current), false);
});
