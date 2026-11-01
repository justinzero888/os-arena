# Orbace Sudoku Arena — submission source and run guide

This repository records two related, distinct demonstrations. The local Twitch/OBS flow is self-contained here. The Orbace Preview product flow uses the existing Orbace application and the Arena-specific patch in [`integration/orbace/arena-poc.patch`](../integration/orbace/arena-poc.patch). The patch is source for the frozen Arena integration, not a deployment instruction or an authorization to change a shared database.

## Flow 1: Orbace-integrated Preview Arena

The frozen Arena-specific changes are the diff from Orbace baseline `3d5f0d331b1edf1bd942a9e3142de7bd6ea00d09` to demo candidate `d78178c4cd20040bf6e6da3b8ffaac4d0615c87d`. It contains backend Arena routes, host authorization, private puzzle persistence and migration/RLS, frontend Arena UI/API adapter, and integration tests. It applies to the separate `justinzero888/orbace-sudoku-v2` application checkout at the stated baseline:

```sh
git checkout 3d5f0d331b1edf1bd942a9e3142de7bd6ea00d09
git apply --check /path/to/os-arena/integration/orbace/arena-poc.patch
git apply /path/to/os-arena/integration/orbace/arena-poc.patch
```

The underlying Orbace application is a pre-existing platform, not code created for this hackathon. Access to its base repository and a disposable PostgreSQL/Supabase environment is needed to run this integrated flow. Do not apply its migration to a shared database without separate authorization. The Preview environment is a controlled demo, not a public production release.

## Flow 2: local Twitch chat and OBS demo

Requirements: Node.js 22+, npm, a Twitch developer application and bot user access token with `user:bot`, `user:read:chat`, and `user:write:chat`; OBS is optional for the API tests. No live credentials are included in this repository.

```sh
npm ci
test -e .env || cp .env.example .env
test -e .arena-extreme-supply.json || (umask 077; cp fixtures/arena-extreme-supply.example.json .arena-extreme-supply.json)
npm run check
npm test
npm run handoff:test
PORT=4183 ARENA_ENABLED=true npm run arena:dev
```

Open `http://127.0.0.1:4183/` to create a local session. Share the guest link with a second browser context. The host opens the time-mode ballot; the guest votes; the host starts only after required participation. OBS Browser Source can use the stable `http://127.0.0.1:4183/overlay/live` URL, which follows the latest session or rematch. The board, timer, and result are read-only in OBS.

For Twitch chat, configure the designated test channel and bot IDs in the local `.env` following [the Twitch/OBS runbook](TWITCH_CHAT_OBS_DEMO_RUNBOOK.md). Keep `ARENA_ENABLED=false` for a standalone transport proof. The `!arena` response only reads the local Arena status endpoint; it does not control gameplay. Sending requires `TWITCH_TEST_SEND_ENABLED=true` and an exact channel confirmation. Never commit `.env`, access tokens, or a stream key.

Browser tests require `npx playwright install chromium` followed by `npm run arena:e2e`. These use local fixtures and do not contact Twitch. The local demo stores sessions in memory and is not an authenticated or durable production service. Extreme puzzle givens in the sample fixture are public demo input; solutions are calculated and kept server-side at runtime.

## Source boundaries

- `src/`, `public/`, `test/`, and `e2e/` contain the standalone demo and regression tests.
- `integration/orbace/arena-poc.patch` contains the frozen Arena-specific Orbace product integration source and tests.
- `fixtures/arena-extreme-supply.example.json` is a sanitized, reproducible local demo supply with givens only.
- `ARENA_ENABLED=false` is the default. No production feature enablement, shared migration, or deployment is implied by publishing source.
