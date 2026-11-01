# os-arena integration environment

This repository contains the standalone local Arena demo, Twitch chat/OBS bridge, tests, and the Arena-specific source patch for the Orbace-integrated Preview demo. See [the submission source guide](docs/HACKATHON_SOURCE_AND_RUN.md) for the two distinct flows. `ARENA_ENABLED=false` remains the default.

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

The local server uses Node.js 22+ and no runtime package dependencies. Its private local supply must contain the owner-validated Extreme boards. A sanitized demo fixture containing only the 16 puzzle givens is included in `fixtures/arena-extreme-supply.example.json`; the runtime copy remains Git-ignored. The server accepts only the 16 approved board hashes, verifies each has exactly one solution, and fails closed when the file is missing or invalid. To create the runtime copy without overwriting an existing one:

```sh
test -e .arena-extreme-supply.json || (umask 077; cp fixtures/arena-extreme-supply.example.json .arena-extreme-supply.json)
```

Start a new local process on a free port. Port 4173 was already occupied during remediation; do not assume an existing process has the new code. This command uses port 4183 and does not change `.env`:

```sh
PORT=4183 ARENA_ENABLED=true npm run arena:dev
```

### Repeat Round A — host and one guest

1. Host opens `http://127.0.0.1:4183`, creates an Arena and copies the audience link. The session starts in CREATED and has no running ballot.
2. Guest opens that link in a separate browser profile or private window. Confirm the guest sees “You joined the crowd” and the host sees one connected guest and zero votes. Presence counts browser sessions seen in the last 15 seconds, not verified people.
3. Host selects **Open voting**. Guest and host see VOTING and the countdown. The guest votes for a time mode; all modes use approved Extreme puzzles. The ballot remains open for 20 seconds from the host action. The guest can change the vote while it is open.
4. After the ballot closes, confirm both see READY and the host sees one connected guest and one vote. Start remains disabled unless the configured number of currently connected guests have voted; the local default is one. The `ArenaStore` constructor supports `minParticipants` from 1 to 20 for local test configurations. If no connected guest voted, the host can reopen voting for a fresh full window. There is no test override.
5. Host starts and solves, or waits for the server deadline. Confirm the two windows display the same result. Rematch starts a new linked session with a fresh approved puzzle and a new lobby/ballot.
6. Record the observation and evidence in `docs/ARENA_ROUND_A_OBSERVATIONS.md`. **Do not proceed to Round B until the tester records a Round A pass.** Stop the server with Ctrl-C.

The standalone prototype has no Orbace login, persistent database, Twitch integration, or Strike/Spare vote. The approved integrated Orbace worktree implements a separate Strike/Spare vote during the round; this correction does not move it or introduce a new voting mechanic. Neither the standalone run nor its automated tests are a production pilot. Do not expose this local server to the public internet. `ARENA_ENABLED=false` remains the default.

For the Twitch/OBS demo, use the stable public aliases `http://127.0.0.1:4183/api/arena/sessions/live` and `http://127.0.0.1:4183/overlay/live`. They follow the newest local Arena session, so a rematch does not require changing `.env` or the OBS Browser Source. Host and guest control links remain session-specific.

### Repeatable browser E2E

The browser suite uses the repository-local Playwright test dependency. From the repository root, install locked dependencies and the matching Chromium browser once, then run the suite:

```sh
npm ci
npx playwright install chromium
npm run arena:e2e
```

This starts an isolated test server on `127.0.0.1:4179` with a four-second ballot window. The tests verify disabled-flag behavior, guest join, host-controlled voting, an empty ballot blocking Start, vote-to-ready-to-start-to-solve flow, result projection, and that guest responses contain no solution or host capability. The Round B test also uses three isolated browser cookie jars and a read-only `/overlay/<session-id>` page, changes one guest vote, verifies three counted votes, compares PLAYING snapshots within one second, reloads a guest and overlay during PLAYING, then verifies the terminal result in every view with no API `429`. The unit test verifies the full configured 20-second ballot boundary and three guests' normal 36 presence heartbeats per minute. The test server uses in-memory fixtures and never reads `.env`, contacts Twitch, or changes production settings. Browser artifacts are written to `/tmp/os-arena-playwright-results`.

### Repeat Round B — host, three browser identities, and OBS

1. Start the local pilot on port 4183. In one browser profile create a session; open its audience URL in three separate browser profiles or private windows. A profile/window is a browser identity because it owns the `arena_guest` HttpOnly cookie; multiple tabs in one profile intentionally share one identity and one vote.
2. Confirm the host shows **3 connected guests**. Open voting, cast one vote from each guest, and change one guest's selection. Confirm the host shows **3 votes received**, not four.
3. In OBS, add a Browser Source whose URL is `http://127.0.0.1:4183/overlay/<session-id>`. Confirm it displays the same lobby/voting state and countdown as the host and guest views. The overlay is read-only and does not need a guest cookie.
4. Start the round. Compare status and countdown across host, all three guests, and the Browser Source. During PLAYING, reload one guest. For an explicit Browser Source refresh, enable **Refresh browser when scene becomes active** in its properties, switch to another scene, then switch back. Both must recover PLAYING and the current countdown.
5. Solve or allow the timer to expire. Confirm the same terminal result in all views and record the run in `docs/ARENA_ROUND_B_OBSERVATIONS.md`. Do not treat browser contexts as verified people or the automated browser test as evidence that OBS itself was operated.
