import test from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { ArenaStore, ArenaError, PRESETS, puzzleForRound } from '../src/arena-engine.js';
import { createArenaServer } from '../src/arena-server.js';
import { acceptSnapshot, isCountdownOnly, updateStartButton } from '../public/arena-ui-state.js';

const validGrid = value => [...value].map(Number);
const failure = (fn, code) => assert.throws(fn, error => error instanceof ArenaError && error.code === code);
const requestId = n => `request-${n}-123456`;

function startRound(store, created, version = created.version) {
  const host = store.hostSnapshot(created.id, created.hostToken);
  return store.start(created.id, created.hostToken, version === created.version ? host.version : version, requestId(Math.random()));
}

test('preset vote: no votes use host default; ties follow the documented priority; last vote wins', () => {
  let now = 1_000;
  const store = new ArenaStore({ now: () => now });
  const noVotes = store.create('medium');
  now += 20_000;
  const ready = store.start(noVotes.id, noVotes.hostToken, store.hostSnapshot(noVotes.id, noVotes.hostToken).version, requestId(1));
  assert.equal(ready.preset, 'medium');
  assert.deepEqual(ready.presetVote.results, { easy: 0, medium: 0, hard: 0 });

  const tied = store.create('hard');
  store.vote(tied.id, 'guest-a', 'hard', requestId(2));
  store.vote(tied.id, 'guest-b', 'easy', requestId(3));
  store.vote(tied.id, 'guest-c', 'easy', requestId(4));
  store.vote(tied.id, 'guest-d', 'hard', requestId(5));
  now += 20_000;
  const tieResult = store.start(tied.id, tied.hostToken, store.hostSnapshot(tied.id, tied.hostToken).version, requestId(6));
  assert.equal(store.vote(tied.id, 'guest-a', 'hard', requestId(2)).accepted, true);
  assert.equal(store.publicSnapshot(tied.id).presetVote.totalVotesCast, 4);
  assert.equal(tieResult.preset, 'easy');
  assert.deepEqual(tieResult.presetVote.results, { easy: 2, medium: 0, hard: 2 });

  const changed = store.create();
  store.vote(changed.id, 'same-guest', 'hard', requestId(7));
  store.vote(changed.id, 'same-guest', 'medium', requestId(8));
  now += 20_000;
  const changedResult = store.start(changed.id, changed.hostToken, store.hostSnapshot(changed.id, changed.hostToken).version, requestId(9));
  assert.equal(changedResult.preset, 'medium');
  assert.equal(changedResult.presetVote.results.hard, 0);
  now += 1;
  assert.ok(PRESETS.easy.seconds > 0);
});

test('public projection hides vote breakdown until close and omits solution, token and guest keys', () => {
  const store = new ArenaStore();
  const created = store.create();
  store.vote(created.id, 'private-guest-hash', 'hard', requestId(10));
  const open = store.publicSnapshot(created.id);
  assert.equal(open.presetVote.results, null);
  assert.equal(open.presetVote.totalVotesCast, 1);
  assert.equal(JSON.stringify(open).includes(puzzleForRound(0).solution), false);
  assert.equal(JSON.stringify(open).includes(created.hostToken), false);
  assert.equal(JSON.stringify(open).includes('private-guest-hash'), false);
  assert.equal('hostHash' in open, false);
  assert.equal('notes' in open, false);
});

test('full solution is validated and a qualifying pre-deadline solve wins across processing delay', () => {
  let now = 10_000;
  const store = new ArenaStore({ now: () => now, presetVoteMs: 0 });
  const created = store.create();
  const started = startRound(store, created);
  failure(() => store.solve(created.id, created.hostToken, { solution: Array(81).fill(1), expectedVersion: started.version, requestId: requestId(12) }), 'SOLUTION_INCORRECT');
  now = started.deadline + 1;
  const won = store.solve(created.id, created.hostToken, { solution: validGrid(puzzleForRound(0).solution), expectedVersion: started.version, requestId: requestId(13) }, started.deadline - 1);
  assert.equal(won.status, 'FINISHED');
  assert.deepEqual(won.result, { winner: 'host', reason: 'SOLVED' });
});

test('timeout wins at the deadline; a solve received at or after deadline cannot win', () => {
  let now = 50_000;
  const store = new ArenaStore({ now: () => now, presetVoteMs: 0 });
  const created = store.create();
  const started = startRound(store, created);
  now = started.deadline;
  const timedOut = store.publicSnapshot(created.id);
  assert.deepEqual(timedOut.result, { winner: 'audience', reason: 'TIME_EXPIRED' });
  failure(() => store.solve(created.id, created.hostToken, { solution: validGrid(puzzleForRound(0).solution), expectedVersion: started.version, requestId: requestId(14) }, started.deadline), 'STALE_VERSION');
});

test('deadline polling waits for an earlier-ingress solve request still reading its body', async () => {
  let now = 100_000;
  const store = new ArenaStore({ now: () => now, presetVoteMs: 0 });
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
  const store = new ArenaStore({ now: () => now, presetVoteMs: 0 });
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
  const store = new ArenaStore({ now: () => now, presetVoteMs: 0 });
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
  const next = store.rematch(created.id, created.hostToken, won.version, 'medium', requestId(16));
  assert.equal(store.publicSnapshot(next.id).status, 'PRESET_VOTE');
  assert.equal(store.publicSnapshot(next.id).priorSessionId, created.id);
  assert.notEqual(puzzleForRound(1).givens, puzzleForRound(0).givens);
  assert.equal(store.publicSnapshot(created.id).result.winner, 'host');
  assert.equal(store.rematch(created.id, created.hostToken, won.version, 'medium', requestId(16)).id, next.id);
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
    const created = await host('/api/arena/sessions', { defaultPreset: 'easy' });
    assert.equal(created.status, 201);
    assert.equal('hostToken' in created.body, false);
    assert.equal(created.body.hostUrl, `/host/${created.body.id}`);
    const id = created.body.id;
    const publicOpen = await guest(`/api/arena/sessions/${id}`);
    assert.equal(publicOpen.status, 200);
    const deniedHostView = await guest(`/api/arena/sessions/${id}/host`);
    assert.equal(deniedHostView.status, 403);
    const voted = await guest(`/api/arena/sessions/${id}/votes`, { preset: 'medium', requestId: requestId(20) });
    assert.equal(voted.status, 200);
    now += 20_000;
    const hostState = await host(`/api/arena/sessions/${id}/host`);
    assert.equal(hostState.status, 200);
    const started = await host(`/api/arena/sessions/${id}/start`, { expectedVersion: hostState.body.version, requestId: requestId(21) });
    assert.equal(started.body.preset, 'medium');
    const guestPlaying = await guest(`/api/arena/sessions/${id}`);
    assert.equal(guestPlaying.body.status, 'PLAYING');
    assert.equal('solution' in guestPlaying.body.puzzle, false);
    const won = await host(`/api/arena/sessions/${id}/solve`, { solution: validGrid(puzzleForRound(0).solution), expectedVersion: started.body.version, requestId: requestId(22) });
    assert.deepEqual(won.body.result, { winner: 'host', reason: 'SOLVED' });
    const refreshed = await guest(`/api/arena/sessions/${id}`);
    assert.equal(refreshed.body.status, 'FINISHED');
    assert.deepEqual(refreshed.body.result, { winner: 'host', reason: 'SOLVED' });
    const next = await host(`/api/arena/sessions/${id}/rematch`, { expectedVersion: won.body.version, defaultPreset: 'easy', requestId: requestId(23) });
    assert.equal(next.status, 201);
    assert.notEqual(next.body.id, id);
    assert.equal((await host(`/api/arena/sessions/${next.body.id}/host`)).body.status, 'PRESET_VOTE');
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
    const created = await host('/api/arena/sessions', { defaultPreset: 'easy' });
    await guest(`/api/arena/sessions/${created.body.id}`);
    let last;
    for (let i = 0; i < 11; i += 1) {
      last = await guest(`/api/arena/sessions/${created.body.id}/votes`, { preset: 'easy', requestId: requestId(100 + i) });
    }
    assert.equal(last.status, 429);
    assert.equal(last.body.error, 'RATE_LIMITED');
  });
});


test('host cannot end the fixed preset ballot early', () => {
  let now = 70_000;
  const store = new ArenaStore({ now: () => now });
  const created = store.create();
  const ballotOpen = store.hostSnapshot(created.id, created.hostToken);
  const startButton = { disabled: false };
  updateStartButton(startButton, ballotOpen);
  assert.equal(startButton.disabled, true);
  failure(() => store.start(created.id, created.hostToken, created.version, requestId(200)), 'BALLOT_OPEN');
  assert.equal(store.publicSnapshot(created.id).status, 'PRESET_VOTE');
  now += 20_000;
  const ready = store.hostSnapshot(created.id, created.hostToken);
  assert.equal(ready.status, 'READY');
  updateStartButton(startButton, ready);
  assert.equal(startButton.disabled, false);
  const version = ready.version;
  assert.equal(store.start(created.id, created.hostToken, version, requestId(201)).status, 'PLAYING');
});

test('host Start control is disabled until authoritative state is READY', () => {
  const button = { disabled: false };
  updateStartButton(button, null);
  assert.equal(button.disabled, true);
  updateStartButton(button, { status: 'PRESET_VOTE', canControl: true, preset: null, presetVote: { totalVotesCast: 0 } });
  assert.equal(button.disabled, true);
  updateStartButton(button, { status: 'PRESET_VOTE', canControl: true, preset: 'easy' });
  assert.equal(button.disabled, true);
  updateStartButton(button, { status: 'READY', canControl: true, preset: 'medium' });
  assert.equal(button.disabled, false);
  updateStartButton(button, { status: 'READY', canControl: false, preset: 'medium' });
  assert.equal(button.disabled, true);
  updateStartButton(button, { status: 'FINISHED', canControl: true, preset: 'medium' });
  assert.equal(button.disabled, true);
});

test('older snapshots cannot revert PLAYING or enable Start; session changes reset the version guard', () => {
  const expectedSessionId = 'session-current';
  const playing = { id: expectedSessionId, version: 5, status: 'PLAYING', canControl: true, preset: 'easy' };
  const staleReady = { id: expectedSessionId, version: 4, status: 'READY', canControl: true, preset: 'easy' };
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
  const nextReady = { id: nextSessionId, version: 1, status: 'READY', canControl: true, preset: 'medium' };
  current = acceptSnapshot(current, nextReady, nextSessionId);
  assert.equal(current.id, nextSessionId);
  assert.equal(current.status, 'READY');
  updateStartButton(startButton, current);
  assert.equal(startButton.disabled, false);
  current = acceptSnapshot(current, staleReady, nextSessionId);
  assert.equal(current, nextReady, 'a delayed response from the prior session is ignored');
});

test('rematch is idempotent per finished session even with a fresh requestId', () => {
  let now = 80_000;
  const store = new ArenaStore({ now: () => now });
  const created = store.create();
  now += 20_000;
  const started = startRound(store, created);
  const won = store.solve(created.id, created.hostToken, { solution: validGrid(puzzleForRound(0).solution), expectedVersion: started.version, requestId: requestId(40) });
  const first = store.rematch(created.id, created.hostToken, won.version, 'easy', requestId(41));
  const second = store.rematch(created.id, created.hostToken, won.version, 'easy', requestId(42));
  assert.equal(second.id, first.id);
  assert.equal(store.sessions.size, 2);
});

test('prune evicts idle sessions and their idempotency keys but keeps touched ones', () => {
  let now = 0;
  const store = new ArenaStore({ now: () => now, sessionTtlMs: 1000 });
  const idle = store.create();
  const live = store.create();
  store.vote(idle.id, 'guest-a', 'easy', requestId(50));
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
