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

   The connectivity test validates the token against Twitch, checks its identity and scopes, opens an EventSub WebSocket session, and subscribes to `channel.chat.message`. It logs message IDs and whether a message matched; it does not print chat contents or credentials. With sending disabled, an exact `HeyGuys` message is observed but receives no reply.

4. To test a reply, first confirm the configured channel ID is the intended test channel. Set `TWITCH_TEST_SEND_ENABLED=true` and set `TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID` to exactly the same numeric channel ID as `TWITCH_CHANNEL_USER_ID`. Restart `npm run twitch:test`, then send `HeyGuys` in that channel. The smoke test sends `VoHiYo` and reports whether Twitch confirmed delivery. It has a local five-second reply cooldown and ignores bot messages and duplicate EventSub deliveries. Stop with Ctrl-C, then set sending back to `false`.

Twitch EventSub may request a reconnect or revoke a subscription. This smoke test stops safely and reports that condition; restart it to establish a fresh session. A live Twitch check requires valid local credentials and access to Twitch's API and WebSocket endpoints. Unit tests use mocks and do not require Twitch credentials or network access.

## Current setup state

See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for the repository audit, Orbace reuse/gap matrix, local setup status, checks, and remaining account/access blockers. No Arena gameplay, deployment, push, or production configuration change is part of this connectivity test.
