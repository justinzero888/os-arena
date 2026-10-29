import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';
import { ArenaError, ArenaStore } from './arena-engine.js';

const ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const COOKIE = 'arena_guest';
const sha = value => createHash('sha256').update(value).digest('hex');
const safeDecode = value => { try { return decodeURIComponent(value); } catch { return value; } };
const parseCookies = header => Object.fromEntries((header || '').split(';').map(part => part.trim()).filter(Boolean).flatMap(part => {
  const i = part.indexOf('='); return i < 1 ? [] : [[part.slice(0, i), safeDecode(part.slice(i + 1))]];
}));
const json = (res, status, body, extra = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
  res.end(JSON.stringify(body));
};

export function createArenaServer({ enabled = process.env.ARENA_ENABLED === 'true', store = new ArenaStore(), maxBody = 8192, bodyTimeoutMs = 10_000, now = () => Date.now() } = {}) {
  const salt = randomBytes(32);
  const rates = new Map();
  const sweepRates = at => { for (const [key, bucket] of rates) if (at >= bucket.resetAt) rates.delete(key); };
  const takeRate = (key, limit, at) => {
    let bucket = rates.get(key);
    if (!bucket || at >= bucket.resetAt) bucket = { count: 0, resetAt: at + 60_000 };
    bucket.count += 1; rates.set(key, bucket);
    return bucket.count > limit ? Math.max(1, Math.ceil((bucket.resetAt - at) / 1000)) : 0;
  };
  const server = createServer(async (req, res) => {
    const ingressAt = now();
    let url;
    try { url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); }
    catch { return json(res, 400, { error: 'BAD_REQUEST' }, { Connection: 'close' }); }
    const origin = req.headers.origin;
    let sameOrigin = false;
    if (origin) {
      try {
        const parsedOrigin = new URL(origin);
        const requestOrigin = new URL(`${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`);
        sameOrigin = origin === parsedOrigin.origin && parsedOrigin.origin === requestOrigin.origin;
      } catch { /* Invalid or opaque origins are rejected below. */ }
    }
    if (req.method === 'POST' && !sameOrigin) {
      return json(res, 403, { error: 'ORIGIN_REJECTED' });
    }
    if (url.pathname.startsWith('/api/arena/')) {
      if (!enabled) return json(res, 404, { error: 'ARENA_DISABLED' });
      let solveSessionId = null;
      let solveTicket = null;
      try {
        const cookies = parseCookies(req.headers.cookie);
        if (req.method === 'POST') {
          const ip = req.socket.remoteAddress || 'unknown';
          const retryAfter = takeRate(`ip:${ip}`, 30, ingressAt);
          if (retryAfter) return json(res, 429, { error: 'RATE_LIMITED' }, { 'Retry-After': String(retryAfter) });
        }
        const solveMatch = req.method === 'POST' && url.pathname.match(/^\/api\/arena\/sessions\/([A-Za-z0-9_-]+)\/solve$/);
        if (solveMatch) {
          solveSessionId = solveMatch[1];
          solveTicket = store.beginSolve(solveSessionId, cookies[`arena_host_${solveSessionId}`], ingressAt);
        }
        const body = req.method === 'POST' ? await readJson(req, maxBody, bodyTimeoutMs) : {};
        if (req.method === 'POST' && req.headers['content-type']?.split(';')[0] !== 'application/json') return json(res, 415, { error: 'JSON_REQUIRED' });
        const createMatch = url.pathname === '/api/arena/sessions' && req.method === 'POST';
        if (createMatch) {
          const created = store.create(body.defaultPreset || 'easy');
          const cookieName = `arena_host_${created.id}`;
          res.setHeader('Set-Cookie', `${cookieName}=${encodeURIComponent(created.hostToken)}; HttpOnly; SameSite=Strict; Path=/api/arena/sessions/${created.id}${req.socket.encrypted ? '; Secure' : ''}`);
          return json(res, 201, { id: created.id, version: created.version, hostUrl: `/host/${created.id}`, joinUrl: `/join/${created.id}`, overlayUrl: `/overlay/${created.id}` });
        }
        const match = url.pathname.match(/^\/api\/arena\/sessions\/([A-Za-z0-9_-]+)(?:\/(host|votes|start|solve|rematch))?$/);
        if (!match) return json(res, 404, { error: 'NOT_FOUND' });
        const [, id, action] = match;
        if (req.method === 'GET' && !action) {
          let guest = cookies[COOKIE];
          const headers = {};
          if (!guest || !/^[A-Za-z0-9_-]{32,}$/.test(guest)) {
            guest = randomBytes(32).toString('base64url');
            headers['Set-Cookie'] = `${COOKIE}=${guest}; HttpOnly; SameSite=Lax; Path=/${req.socket.encrypted ? '; Secure' : ''}`;
          }
          return json(res, 200, store.publicSnapshot(id), headers);
        }
        if (req.method === 'GET' && action === 'host') {
          const token = cookies[`arena_host_${id}`];
          return json(res, 200, store.hostSnapshot(id, token));
        }
        if (req.method !== 'POST') return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
        if (action === 'votes') {
          let guest = cookies[COOKIE];
          const headers = {};
          if (!guest || !/^[A-Za-z0-9_-]{32,}$/.test(guest)) {
            guest = randomBytes(32).toString('base64url');
            headers['Set-Cookie'] = `${COOKIE}=${guest}; HttpOnly; SameSite=Lax; Path=/${req.socket.encrypted ? '; Secure' : ''}`;
          }
          const guestHash = createHash('sha256').update(salt).update(guest).digest('hex');
          const retryAfter = takeRate(`guest:${guestHash}`, 10, ingressAt);
          if (retryAfter) return json(res, 429, { error: 'RATE_LIMITED' }, { ...headers, 'Retry-After': String(retryAfter) });
          return json(res, 200, store.vote(id, guestHash, body.preset, body.requestId), headers);
        }
        const token = cookies[`arena_host_${id}`];
        if (action === 'start') return json(res, 200, store.start(id, token, body.expectedVersion, body.requestId));
        if (action === 'solve') return json(res, 200, store.solve(id, token, body, ingressAt));
        if (action === 'rematch') {
          const created = store.rematch(id, token, body.expectedVersion, body.defaultPreset || 'easy', body.requestId);
          const cookieName = `arena_host_${created.id}`;
          res.setHeader('Set-Cookie', `${cookieName}=${encodeURIComponent(created.hostToken)}; HttpOnly; SameSite=Strict; Path=/api/arena/sessions/${created.id}${req.socket.encrypted ? '; Secure' : ''}`);
          return json(res, 201, { id: created.id, version: created.version, hostUrl: `/host/${created.id}`, joinUrl: `/join/${created.id}`, overlayUrl: `/overlay/${created.id}` });
        }
        return json(res, 404, { error: 'NOT_FOUND' });
      } catch (error) {
        if (res.destroyed || res.writableEnded) return;
        if (error instanceof ArenaError) return json(res, error.status, { error: error.code });
        // The request body is abandoned unread, so close the connection after the response is flushed.
        if (error?.code === 'BODY_TOO_LARGE') return json(res, 413, { error: 'BODY_TOO_LARGE' }, { Connection: 'close' });
        if (error?.code === 'BODY_TIMEOUT') return json(res, 408, { error: 'BODY_TIMEOUT' }, { Connection: 'close' });
        if (error?.code === 'BODY_ABORTED') return json(res, 400, { error: 'BODY_ABORTED' });
        if (error?.code === 'INVALID_JSON') return json(res, 400, { error: 'INVALID_JSON' });
        return json(res, 500, { error: 'INTERNAL_ERROR' });
      } finally {
        store.finishSolve(solveSessionId, solveTicket);
      }
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
    const relative = url.pathname === '/' || /^\/(?:host|join|overlay)\/[A-Za-z0-9_-]+$/.test(url.pathname)
      ? 'index.html' : ['/arena.js', '/arena-ui-state.js'].includes(url.pathname) ? url.pathname.slice(1) : null;
    if (!relative) return json(res, 404, { error: 'NOT_FOUND' });
    try {
      const data = await readFile(join(ROOT, normalize(relative)));
      res.writeHead(200, { 'Content-Type': relative.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'" });
      res.end(data);
    } catch { json(res, 404, { error: 'NOT_FOUND' }); }
  });
  const sweeper = setInterval(() => { sweepRates(now()); store.prune(); }, 60_000);
  sweeper.unref();
  server.on('close', () => clearInterval(sweeper));
  return server;
}

function readJson(req, maxBytes, timeoutMs) {
  return new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;
    let settled = false;
    let timer;
    const bodyError = code => Object.assign(new Error(code), { code });
    const cleanup = () => {
      clearTimeout(timer);
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
      req.off('aborted', onAborted);
      req.off('close', onClose);
    };
    const rejectIncomplete = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      req.off('data', onData);
      reject(error);
      // Keep error/close listeners until the destroyed or aborted request closes.
    };
    const onData = chunk => {
      if (settled) return;
      bytes += Buffer.byteLength(chunk);
      if (bytes > maxBytes) {
        rejectIncomplete(bodyError('BODY_TOO_LARGE'));
      } else data += chunk;
    };
    const onEnd = () => {
      if (settled) return;
      if (!data) {
        settled = true;
        cleanup();
        return resolve({});
      }
      try {
        const body = JSON.parse(data);
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
        settled = true;
        cleanup();
        resolve(body);
      } catch {
        settled = true;
        cleanup();
        reject(bodyError('INVALID_JSON'));
      }
    };
    const onError = error => {
      if (settled) return cleanup();
      settled = true;
      cleanup();
      reject(error);
    };
    const onAborted = () => rejectIncomplete(bodyError('BODY_ABORTED'));
    const onClose = () => {
      if (!req.complete) rejectIncomplete(bodyError('BODY_ABORTED'));
      cleanup();
    };

    req.setEncoding('utf8');
    req.on('data', onData);
    req.once('end', onEnd);
    req.once('error', onError);
    req.once('aborted', onAborted);
    req.once('close', onClose);
    timer = setTimeout(() => {
      rejectIncomplete(bodyError('BODY_TIMEOUT'));
    }, timeoutMs);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.env.ARENA_ENABLED !== 'true') {
    console.error('Arena is disabled. Set ARENA_ENABLED=true for an explicit local pilot run.');
    process.exitCode = 1;
  } else {
    const port = Number(process.env.PORT || 4173);
    const server = createArenaServer();
    server.listen(port, '127.0.0.1', () => console.log(`Arena local pilot listening at http://127.0.0.1:${port}`));
  }
}
