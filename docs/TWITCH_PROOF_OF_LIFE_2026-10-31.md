# Twitch proof-of-life audit — 2026-10-31

## Result

**BLOCKED at credential/token validation.** The controlled A/B/C proof-of-life was not started beyond the initial authentication check because Twitch returned HTTP 401 from `GET https://id.twitch.tv/oauth2/validate`.

No EventSub WebSocket session, subscription, chat delivery, trigger match, or Send Chat Message API call was attempted after that failure. No reply was sent.

## Configuration audit (secret-free)

- `TWITCH_CLIENT_ID`: present (value not recorded)
- `TWITCH_USER_ACCESS_TOKEN`: present (value not recorded)
- `TWITCH_BOT_USER_ID`: `1597519737`
- `TWITCH_CHANNEL_USER_ID`: `1548437801`
- `TWITCH_TEST_SEND_ENABLED`: `true`
- `TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID`: `1548437801` (exact match)
- `ARENA_ENABLED`: `false`

The local configuration guards therefore accepted the identity/channel relationship and the explicit send opt-in. They cannot establish that the token is current or authorized.

## Live evidence

Command (executed with network access; secrets were not printed):

```text
node --env-file=.env --input-type=module - <<'NODE'
import { loadConfig, validateUserAccessToken } from './src/twitch-connectivity-test.js';
const config = loadConfig();
await validateUserAccessToken(config);
NODE
```

Observed result: `TOKEN_VALIDATION_FAILED` — Twitch HTTP 401. The implementation intentionally logs no response body, token, authorization header, or `.env` contents.

Focused offline regression suite: `node --test test/twitch-connectivity-test.test.js` — **22 passed, 0 failed**.

## Smallest correction

Replace or refresh the **bot account's user access token** for the configured Twitch application, retaining the required scopes `user:bot`, `user:read:chat`, and `user:write:chat`. Then rerun the validation. Do not change Arena gameplay, channel IDs, or the trigger until validation succeeds.

After a successful validation, run one controlled listener session and test the existing `Hey Guys` → `VoHiYo` path. The next boundary to report will be EventSub subscription/delivery, sender/self-message filtering, trigger matching, or Send Chat Message API acceptance.

