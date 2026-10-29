# os-arena integration environment

This repository currently contains the Arena environment audit and an isolated Twitch chat connectivity smoke test. The smoke test does not start Arena gameplay; `ARENA_ENABLED` must remain `false`.

## Twitch connectivity smoke test

Requires Node.js 22 or later. It uses Node's built-in `fetch`, `WebSocket`, and test runner, so no npm packages need to be installed.

1. Create `.env` from `.env.example` only if you do not already have a local `.env`; `.env` is ignored by Git. This safe command preserves existing local configuration:

   ```sh
   test -e .env || cp .env.example .env
   ```
2. Create or select a Twitch developer application and obtain a **user access token for the bot account** with `user:bot`, `user:read:chat`, and `user:write:chat` scopes. Put its client ID and token in the local `.env`. Set `TWITCH_BOT_USER_ID` to the numeric Twitch user ID for that token and `TWITCH_CHANNEL_USER_ID` to the numeric ID of the channel to observe. Do not paste credentials into chat, issue trackers, or source files.
3. Leave `ARENA_ENABLED=false` and `TWITCH_TEST_SEND_ENABLED=false` for the first check. Run:

   ```sh
   npm run check
   npm test
   npm run twitch:test
   ```

   The connectivity test validates the token against Twitch, checks its identity and scopes, opens an EventSub WebSocket session, and subscribes to `channel.chat.message`. It logs message IDs and whether a message matched; it does not print chat contents or credentials. With sending disabled, an exact `Hey Guys` message is observed but receives no reply.

4. To test a reply, first confirm the configured channel ID is the intended test channel. Set `TWITCH_TEST_SEND_ENABLED=true` and set `TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID` to exactly the same numeric channel ID as `TWITCH_CHANNEL_USER_ID`. Restart `npm run twitch:test`, then send `Hey Guys` in that channel. The smoke test sends `VoHiYo` and reports whether Twitch confirmed delivery. It has a local five-second reply cooldown and ignores bot messages and duplicate EventSub deliveries. Stop with Ctrl-C, then set sending back to `false`.

Twitch EventSub may request a reconnect or revoke a subscription. This smoke test stops safely and reports that condition; restart it to establish a fresh session. A live Twitch check requires valid local credentials and access to Twitch's API and WebSocket endpoints. Unit tests use mocks and do not require Twitch credentials or network access.

## Current setup state

See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for the repository audit, Orbace reuse/gap matrix, local setup status, checks, and remaining account/access blockers. No Arena gameplay, deployment, push, or production configuration change is part of this connectivity test.

## Arena local pilot (standalone)

The local host/audience prototype runs only in this repository, uses Node's built-in HTTP server, and stores sessions in memory. It has no Orbace login, database, Twitch, or sibling-app dependency; the host capability is an HttpOnly cookie held in the creating browser. Do not expose this local pilot to the public internet. Arena is opt-in and remains disabled by default. The command below enables it only for this local process; it does not alter `.env` or production settings.

The local server uses the documented Node.js 22+ runtime and has no runtime package dependencies. Start it from the repository root:

```sh
ARENA_ENABLED=true npm run arena:dev
```

Open `http://127.0.0.1:4173`, create the host session, then open the displayed `/join/<id>` URL in a separate browser profile/window. The host starts the round after the fixed 20-second preset ballot closes. Guests can change a vote while voting is open; choice totals stay hidden until the ballot closes. Preset ties use the displayed Easy Sprint → Medium Match → Hard Survival priority, and no votes use the host's default. The server validates the host's complete submitted board and owns the round deadline. The host page, join page, and `/overlay/<id>` view poll the same server state. Refreshing restores state while the process is running; stopping/restarting the process clears all sessions. Rematch creates a new linked session and new board.

The standalone pilot is a local development slice, not the production Orbace-authenticated pilot described by the PRD. It does not implement strike voting, pause/cancel, durable storage, multi-process locking, or production-grade abuse controls. Keep `ARENA_ENABLED=false` in `.env.example` and production configuration.

### Repeatable browser E2E

The browser suite uses the repository-local Playwright test dependency. From the repository root, install locked dependencies and the matching Chromium browser once, then run the suite:

```sh
npm ci
npx playwright install chromium
npm run arena:e2e
```

This starts an isolated test server on `127.0.0.1:4179` with a short ballot window. The test verifies disabled-flag behavior, host/guest separation, vote-to-ready-to-start-to-solve flow, result projection, and that guest responses contain no solution or host capability. The test server uses in-memory fixtures and never reads `.env`, contacts Twitch, or changes production settings. Browser artifacts are written to `/tmp/os-arena-playwright-results`.
