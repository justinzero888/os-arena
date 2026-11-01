# Twitch Chat + OBS demo readiness — 2026-10-31

## Status

**NOT READY / BLOCKED before live demo.** The requested bidirectional demo cannot run from the current checkout because the configured Bot B user access token fails Twitch validation with HTTP 401.

## Identity/config audit (secret-free)

| Role | Configured identity | Result |
| --- | --- | --- |
| A broadcaster/channel | `1548437801` | Configured as EventSub broadcaster and send destination |
| B Orbace bot | `1597519737` | Configured as EventSub sender and token user expectation |
| C human viewer | not configured | Must be a separate Twitch account; C must not equal B |

`TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID` exactly matches A, live sending is explicitly enabled, and `ARENA_ENABLED=false` remains enforced.

## Implementation audit

The current Twitch process supports token validation, EventSub WebSocket connection, `channel.chat.message` subscription, broadcaster matching, bot self-message filtering, duplicate suppression, exact `Hey Guys` matching, and Send Chat Message API calls. It does **not** currently implement a `!arena` parser or an Arena-status provider. The standalone server has a local read-only `/overlay/<session-id>` route, but no Twitch-to-Arena integration and no public Preview origin in this checkout.

Adding `!arena` status wiring would therefore be a new integration change, not a configuration-only demo step. It was not added during this blocked preflight.

## Live preflight evidence

The secret-free validation command reached Twitch, but Twitch returned HTTP 401 from OAuth validation. No EventSub WebSocket, subscription, chat delivery, trigger match, Arena status lookup, Send Chat Message call, or OBS broadcast check was attempted after that failure.

### Recheck after reported token refresh

The same redacted preflight was rerun after the owner reported a refreshed local token. It again returned `TOKEN_VALIDATION_FAILED` / Twitch HTTP 401. The failure remains at the **TOKEN** boundary; no EventSub or OBS action was attempted.

Offline validation remains green: `npm run check` and `node --test test/twitch-connectivity-test.test.js` (**22 passed, 0 failed**).

## Required owner action

Justin must authenticate the **Bot B** Twitch account and issue a fresh user access token for the configured application with:

- `user:bot`
- `user:read:chat`
- `user:write:chat`

Store only the token value in the local ignored `.env` as `TWITCH_USER_ACCESS_TOKEN`. Do not paste it into chat, GitHub, screenshots, OBS, or review artifacts. Then rerun the one-shot validator (or `npm run twitch:test`) locally. A successful validator will be the next gate before requesting Viewer C to send `!arena`.

## OBS boundary

The repository documents the local overlay pattern as `http://127.0.0.1:4183/overlay/<session-id>`. That is not a remotely viewable Twitch/OBS Preview deployment. OBS setup and a real broadcast require an approved Preview/staging origin and a running Arena session; neither can be verified while token validation is failing.

## Follow-up preflight after token refresh

The local token now validates successfully without exposing its value:

- authenticated user matches Bot B `1597519737`;
- required scopes `user:bot`, `user:read:chat`, and `user:write:chat` are present;
- broadcaster/send-confirmation ID remains `1548437801`;
- `ARENA_ENABLED=false`.

The controlled listener then connected to EventSub, received a welcome, and created a `channel.chat.message` subscription successfully. The listener was stopped cleanly after this setup check.

The next boundary is implementation: this checkout still matches only the existing `Hey Guys` trigger and has no `!arena` parser or Arena-status provider. No `!arena` proof or OBS broadcast proof is claimed.

## Controlled chat proof result

After correcting the broadcaster ID to `1597519737` and restarting the listener, the controlled Alex → Justinzero test passed:

- EventSub diagnostic received `Hey Guys` with a text fragment;
- broadcaster matched the configured channel;
- matcher accepted the trigger;
- Twitch confirmed `VoHiYo` submission;
- the resulting bot-authored `VoHiYo` event was received and ignored by the self-message guard;
- the reply was visible in the Justinzero chat screenshots supplied for the test.

This proves the Twitch Chat API/EventSub transport and send path. It does **not** yet prove the requested `!arena` status command or the OBS broadcast path.

## Final local integration evidence

The subsequent controlled demo also verified:

- `!arena` from the separate Alex viewer reached EventSub and returned the active public Arena mode/difficulty/countdown in Twitch chat;
- `/api/arena/sessions/live` resolved to the current public `PLAYING` session;
- joined audience and read-only overlay rendered the public Sudoku givens without solution or host capability;
- OBS Browser Source loaded `/overlay/live?obs=1`, followed the active session, rendered the grid, and displayed the synchronized terminal result.

The local Twitch → Arena → Twitch path and Arena → OBS Browser Source path are **PASS**. An actual OBS stream transmitted to Twitch remains **not verified**; the supplied evidence shows the configured OBS preview with `Start Streaming` still available.

## Broadcast proof

The final controlled run showed the Justinzero Twitch channel live with the OBS-composited Arena scene visible in Twitch's viewer, including the read-only public grid and synchronized terminal state. The viewer also retained the earlier safe `!arena` status reply. This closes the OBS → Twitch broadcast hop for the local test:

```text
Twitch viewer → EventSub → Arena public status → Twitch bot reply
Arena public overlay → OBS Browser Source → Twitch live video
```

**TWITCH CHAT + OBS LOCAL INTEGRATION PROOF = PASS.** This remains a local/demo proof only; it does not authorize a production deployment or alter the default-off feature flag.

