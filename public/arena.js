import { acceptSnapshot, isCountdownOnly, updateStartButton } from './arena-ui-state.js';

const $ = id => document.getElementById(id);
const path = location.pathname.split('/').filter(Boolean);
const role = path[0] === 'host' ? 'host' : path[0] === 'overlay' ? 'overlay' : path[0] === 'join' ? 'guest' : 'home';
const sessionId = path[1] || new URLSearchParams(location.search).get('session');
let current = null;
let poller = null;
const labels = { PRESET_VOTE: 'Audience preset vote is open', READY: 'Preset vote closed — ready to start', PLAYING: 'Round in progress', FINISHED: 'Round complete' };
const request = async (url, body) => {
  const response = await fetch(url, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
};
function fail(error) { $('error').textContent = error.message; }
function beginBoard(givens, editable) {
  const board = $('board'); board.replaceChildren();
  if (!givens || !editable) { board.classList.add('hidden'); return; }
  board.classList.remove('hidden');
  let draft = [];
  try { draft = JSON.parse(localStorage.getItem(`arena-board-draft-${sessionId}`) || '[]'); } catch { draft = []; }
  if (!Array.isArray(draft)) draft = [];
  [...givens].forEach((digit, index) => {
    if (digit !== '0') {
      const cell = document.createElement('div'); cell.className = 'cell given'; cell.textContent = digit; cell.dataset.index = String(index); cell.setAttribute('aria-label', `given ${digit}`); board.append(cell);
    } else {
      const cell = document.createElement('input'); cell.className = 'cell'; cell.type = 'text'; cell.inputMode = 'numeric'; cell.maxLength = 1; cell.pattern = '[1-9]'; cell.dataset.index = String(index); cell.value = /^[1-9]$/.test(String(draft[index] || '')) ? String(draft[index]) : ''; cell.setAttribute('aria-label', `row ${Math.floor(index / 9) + 1}, column ${index % 9 + 1}`);
      cell.addEventListener('input', () => { draft[index] = /^[1-9]$/.test(cell.value) ? cell.value : ''; try { localStorage.setItem(`arena-board-draft-${sessionId}`, JSON.stringify(draft)); } catch { /* Draft persistence is best-effort. */ } });
      board.append(cell);
    }
  });
}
function paintTimer(state) {
  $('timer').textContent = state.secondsRemaining == null ? '' : `Time remaining: ${Math.floor(state.secondsRemaining / 60)}:${String(state.secondsRemaining % 60).padStart(2, '0')}`;
}
function paint(state) {
  const accepted = acceptSnapshot(current, state, sessionId);
  if (accepted === current) return;
  const countdownOnly = isCountdownOnly(current, accepted);
  state = accepted;
  current = state;
  if (countdownOnly) return paintTimer(state);
  $('home').classList.add('hidden'); $('session').classList.remove('hidden');
  $('status').textContent = labels[state.status] || state.status;
  paintTimer(state);
  $('preset').textContent = state.preset ? `Preset: ${state.presets.find(p => p.id === state.preset)?.name || state.preset}` : `Tie priority: ${state.presetTiePriority.map(id => state.presets.find(p => p.id === id).name).join(' → ')}`;
  $('guest').classList.toggle('hidden', role !== 'guest'); $('host').classList.toggle('hidden', role !== 'host');
  if (role === 'host') {
    $('links').innerHTML = `Audience link: <a href="/join/${state.id}">${location.origin}/join/${state.id}</a><br>Read-only overlay: <a href="/overlay/${state.id}">${location.origin}/overlay/${state.id}</a>`;
    $('hostHint').textContent = 'Only this browser has the host control cookie. Board values are submitted to the server as a complete solution; the solution is not sent to guest snapshots.';
    $('start').classList.toggle('hidden', !['PRESET_VOTE', 'READY'].includes(state.status));
    updateStartButton($('start'), state);
    beginBoard(state.puzzle?.givens, state.status === 'PLAYING');
    $('solve').classList.toggle('hidden', state.status !== 'PLAYING');
    $('rematch').classList.toggle('hidden', state.status !== 'FINISHED');
  } else if (role === 'guest') {
    const form = $('voteForm'); form.replaceChildren();
    if (state.status === 'PRESET_VOTE') {
      for (const p of state.presets) {
        const label = document.createElement('label'); label.className = 'preset-option';
        const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'preset'; radio.value = p.id;
        label.append(radio, ` ${p.name} — ${p.difficulty}, ${p.seconds} seconds`); form.append(label);
      }
      const button = document.createElement('button'); button.textContent = 'Cast / change vote'; form.append(button);
    }
    const vote = state.presetVote;
    $('voteStatus').textContent = vote.results ? `Votes: ${Object.entries(vote.results).map(([id,n]) => `${state.presets.find(p => p.id === id).name}: ${n}`).join(' · ')}` : `${vote.totalVotesCast} vote(s) cast. Choice totals are hidden until the ballot closes.`;
    $('links').textContent = '';
    beginBoard(state.puzzle?.givens, false);
  } else {
    $('guest').classList.add('hidden'); $('host').classList.add('hidden'); $('links').textContent = '';
  }
  if (state.result) {
    $('result').classList.remove('hidden');
    $('result').textContent = state.result.winner === 'host' ? 'Host wins — solved before the deadline.' : 'Audience wins — time expired.';
  } else $('result').classList.add('hidden');
}
async function refresh() {
  if (!sessionId) return;
  try {
    const url = role === 'host' ? `/api/arena/sessions/${sessionId}/host` : `/api/arena/sessions/${sessionId}`;
    paint(await request(url));
    $('error').textContent = '';
  } catch (error) { fail(error); }
}
if (role === 'home' && !sessionId) {
  $('create').addEventListener('click', async () => {
    try { const result = await request('/api/arena/sessions', { defaultPreset: $('defaultPreset').value }); location.assign(result.hostUrl); }
    catch (error) { fail(error); }
  });
} else if (sessionId) {
  $('voteForm').addEventListener('submit', async event => {
    event.preventDefault();
    const preset = new FormData(event.currentTarget).get('preset'); if (!preset) return;
    try { await request(`/api/arena/sessions/${sessionId}/votes`, { preset, requestId: crypto.randomUUID() }); await refresh(); }
    catch (error) { fail(error); }
  });
  $('start').addEventListener('click', async () => {
    try { await request(`/api/arena/sessions/${sessionId}/start`, { expectedVersion: current.version, requestId: crypto.randomUUID() }); await refresh(); }
    catch (error) { fail(error); }
  });
  $('solve').addEventListener('click', async () => {
    try {
      const solution = new Array(81);
      for (const cell of $('board').querySelectorAll('.cell')) {
        const index = Number(cell.dataset.index ?? [...$('board').children].indexOf(cell));
        solution[index] = Number(cell.matches('input') ? cell.value : cell.textContent);
      }
      if (solution.some(n => !Number.isInteger(n) || n < 1 || n > 9)) throw new Error('Fill every empty cell with a digit from 1 to 9.');
      await request(`/api/arena/sessions/${sessionId}/solve`, { solution, expectedVersion: current.version, requestId: crypto.randomUUID() }); localStorage.removeItem(`arena-board-draft-${sessionId}`); await refresh();
    } catch (error) { fail(error); }
  });
  $('rematch').addEventListener('click', async () => {
    try { const next = await request(`/api/arena/sessions/${sessionId}/rematch`, { expectedVersion: current.version, defaultPreset: current.preset || 'easy', requestId: crypto.randomUUID() }); location.assign(next.hostUrl); }
    catch (error) { fail(error); }
  });
  refresh(); poller = setInterval(refresh, 1000);
}
