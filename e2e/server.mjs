import { ArenaStore } from '../src/arena-engine.js';
import { createArenaServer } from '../src/arena-server.js';

// A test-only process uses the actual local server and in-memory engine with a
// short preset ballot. It never reads .env or starts Twitch/production code.
const server = createArenaServer({
  enabled: true,
  store: new ArenaStore({ presetVoteMs: 1_000 }),
});

server.listen(4179, '127.0.0.1');
const shutdown = () => server.close(() => process.exit(0));
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
