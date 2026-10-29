# Frontend, backend, and Twitch message flow audit

**Audit basis:** local `os-arena` checkout at `feat/arena-mvp`, HEAD `764423f`, plus a read-only inspection of the sibling `orbace-sudoku` checkout on `claude/supu-library-phase1-2`. The Orbace checkout contains unrelated uncommitted changes; this is an audit of that local working tree, not a clean or live-production snapshot. No credentials or environment-file values were read for this audit.

## Findings

| Severity | Finding and evidence | Impact | Minimal action |
|---|---|---|---|
| **Blocker for the Arena pilot** | The `os-arena` repository contains a Twitch smoke-test process, tests, handoff scripts, and architecture docs. It has no Arena page, API route/service, session or ballot model, game-state store, host allowlist enforcement, or overlay implementation. Searches in the Orbace backend/frontend also found no `/api/arena` route or Arena session schema. The PRD/RPD describes those as target design. | The pilot cannot currently host a round, accept votes, synchronize a timer, render an overlay, validate a host win, or rematch. `ARENA_*` names in `.env.example` are placeholders, not evidence of runtime support. | Treat the Arena web/API/state path as unimplemented. Keep the feature closed until the authorized implementation adds server-side authorization, state, validation, and public-safe projections. |
| **High integration hazard** | The existing public practice route `GET /api/puzzle-challenge/select` in `orbace-sudoku/backend/org-api/src/routes/challenge.routes.ts:748-765` returns a `solution` field. It uses optional authentication, not a host-only guard. | Reusing that response as an Arena guest or overlay snapshot would disclose the answer. This is a reuse hazard for Arena; this audit does not characterize the existing practice route as a defect. | Keep the solution in server-controlled Arena state and omit it from guest/overlay responses. Add a separate Arena adapter/projection rather than exposing this response. |
| **Medium documentation drift** | `os-arena/README.md:23` says chat contents are not printed. Current `src/twitch-connectivity-test.js:254-268` logs `message.text` and fragment type/text for the narrow diagnostic. | A viewer’s trigger text is written to the local process log. The current diagnostic does not log auth headers, tokens, sender IDs, or raw EventSub payloads, but the README understates what is logged. | Keep diagnostic logs local and narrow; update the README when the temporary diagnostic is removed or its documented behavior changes. |
| **Unknown / not live-verified** | This audit did not contact Twitch, the database, hosting providers, or production services. Existing source/config and documentation describe integration points but do not prove current production configuration or live availability. | Do not infer deployment state or feature availability from source files. | Verify separately during an authorized pilot rehearsal; do not treat this read-only audit as live verification. |

## 1. Twitch smoke-test message path — implemented

```mermaid
sequenceDiagram
  actor Sender as Viewer/test sender (human Twitch account)
  participant Chat as Designated Twitch channel
  participant Twitch as Twitch EventSub
  participant Node as os-arena local Node listener
  participant Matcher as Handler guards
  participant API as Twitch Send Chat Message API
  actor Bot as Bot account in chat

  Sender->>Chat: Types "Hey Guys"
  Twitch->>Node: channel.chat.message over EventSub WebSocket
  Node->>Matcher: message.text, fragment summary, broadcaster identity
  Matcher->>Matcher: Channel match; dedupe; reject bot-authored; exact trigger
  Matcher->>API: POST "VoHiYo" only after opt-in, exact-channel confirmation, cooldown
  API-->>Node: HTTP status and is_sent result
  API-->>Chat: Accepted bot message
  Chat-->>Sender: "VoHiYo" appears in chat if Twitch delivers it
```

The channel owner is the **broadcaster/destination**. The bot account supplies the user access token and is the **sender** for the reply. A viewer or channel owner using a different account can be the **test sender**. These roles are identified by Twitch user IDs, not inferred from a URL slug.

- `loadConfig()` requires the names `TWITCH_CLIENT_ID`, `TWITCH_USER_ACCESS_TOKEN`, `TWITCH_BOT_USER_ID`, and `TWITCH_CHANNEL_USER_ID`; both IDs must be numeric. Token validation checks the configured client and bot identity and requires `user:bot`, `user:read:chat`, and `user:write:chat` scopes (`src/twitch-connectivity-test.js:21-76,94-143)).
- The EventSub subscription is `channel.chat.message`, with `broadcaster_user_id = TWITCH_CHANNEL_USER_ID` and `user_id = TWITCH_BOT_USER_ID`, over the current WebSocket session (`src/twitch-connectivity-test.js:161-193). The incoming event is independently checked against `event.broadcaster_user_id`; the self-message check compares `event.chatter_user_id` to the configured bot ID (`235-289).
- The current trigger is case-sensitive `Hey Guys` after trimming leading/trailing whitespace. Matching reads `event.message.text`; fragment text is logged for diagnosis but is **not** assembled or used by the matcher. Thus a Twitch emote fragment is not accepted unless `message.text.trim()` itself equals the trigger (`254-268,291-295)).
- EventSub `metadata.message_id` deduplicates deliveries in an in-memory bounded map of at most 1,000 IDs. The event queue serializes processing. Dedupe state is process-local and resets on restart. The local send cooldown is five seconds. A bot-authored event is intentionally ignored to prevent reply loops (`10-11,243-318,352-353,419-423)).
- Sending requires `TWITCH_TEST_SEND_ENABLED=true` and `TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID` exactly equal to `TWITCH_CHANNEL_USER_ID`; sending then POSTs to Twitch with the configured channel as broadcaster and bot as sender. It requires HTTP 200 and `is_sent=true`; safe error messages retain status/drop code without exposing the response body or authorization header (`53-67,196-232,292-316)).
- `ARENA_ENABLED` must parse as false-like or startup fails. That gate protects this isolated connectivity test from being mistaken for gameplay; there is no Arena runtime here for the flag to enable. The smoke test does not implement Arena gameplay (`45-50,321-335)).
- A WebSocket welcome and enabled subscription show session/subscription setup. A keepalive only shows that the WebSocket session is alive; neither proves that a chat event arrived or a reply was sent (`392-440)). A successful Send Chat Message API response says Twitch accepted the send; visual observation in the channel is still needed to verify the reply appeared.

**Safe diagnostics:** the current temporary diagnostic emits only `event.message.text`, each fragment’s `type` and `text`, a boolean broadcaster/channel comparison, and a boolean matcher result. This is viewer-provided text and should stay in a restricted local terminal; do not paste arbitrary chat text into public issue history. Other logs include operational subscription/message identifiers but do not log credentials. Never log the local `.env`, tokens, authorization headers, or full raw EventSub envelopes.

**Previously reported live observation (Issue #2):** a `channel.chat.message` event arrived on the corrected channel, the diagnostic showed trigger text `Hey Guys`, a plain-text fragment, channel match true, and matcher result true. The event was bot-authored, so the self-message guard stopped processing before the send function. No send API call or `VoHiYo` reply was observed. This was not an end-to-end pass; see [Issue #2 trace](https://github.com/justinzero888/os-arena/issues/2#issuecomment-6484613509). This Issue #3 audit did not repeat the live test.

## 2. Arena browser and API path — planned, not implemented

The architecture documents propose an authenticated Orbace host browser, an anonymous guest voting page, a read-only OBS overlay, an Arena API/session service, the existing Orbace auth system and database, and a Sudoku adapter. The host would create/control the round; guests would cast bounded votes from a first-party browser identity; the overlay would read a public-safe snapshot; the server would own ballots, timer deadlines, board revisions, and outcome. The proposed fallback for realtime is versioned snapshot polling; this is design text, not a discovered endpoint (`Orbace_Sudoku_Arena_PRD_Architecture_v2.1.md:126-183`, `Orbace_Sudoku_Arena_RPD_Architecture_v0.1.md:48-88`).

The proposed client/server messages are:

| Sender → receiver | Transport and data | Identity and acceptance guard |
|---|---|---|
| Authenticated host browser → Arena API | HTTPS create/open/start/move/pause/cancel/rematch commands; session ID and expected state revision | Orbace authenticated identity plus session ownership; phase, deadline, and revision checks belong on the server. |
| Guest browser → Arena API | HTTPS preset/strike vote with ballot ID and choice; the guest cookie represents a browser, not a unique human | Server-issued first-party guest key, stored as a salted hash; ballot window, allowed option, rate limit, and one ballot row per guest key are server-enforced. |
| Arena API → host/guest/OBS browser | Safe session snapshot or event sequence, by HTTP polling or an optional stream | Public projection omits host-only state and private solution; host-only state requires host auth. The proposal suggests version/ETag polling if a stream is not straightforward. |
| OBS/browser source → Arena API | Read-only public snapshot/events request; no control commands | Session ID locates the view; no host token or credentials belong in the overlay URL. |

These request shapes and guards are architecture proposals, not implemented endpoints. The current checkouts have no Arena host page, guest page, overlay URL, Arena HTTP route, state machine, timer/session record, vote table, or Arena event stream. No Arena browser request can be traced end-to-end today. The Arena repository also contains no deploy/runtime manifest for those proposed surfaces; existing deployment targets in `IMPLEMENTATION_STATUS.md` describe Orbace infrastructure only, and were not checked live. Do not present the proposed sequence as operational.

## 3. Existing Orbace surfaces to keep separate

- **Orbace authentication:** Fastify’s `authenticate()` resolves bearer identities and, when cookie sessions are enabled, can resolve an Orbace session cookie. It returns 401 for missing/invalid identity and rejects conflicting credentials on mutating calls (`orbace-sudoku/backend/org-api/src/middleware/auth.middleware.ts:23-67,98-155`). The backend uses Prisma against PostgreSQL (`backend/org-api/prisma/schema.prisma:1-11`). Arena host allowlisting/session ownership rules are not present.
- **`/challenge` (Challenge the House):** the vanilla-JS page checks a user-entered puzzle through `POST /api/puzzles/check` and submits a rights-confirmed community puzzle through `POST /api/submissions`; Turnstile, shape/solution checks, rate limits, and submission validation live server-side (`orbace-v4-frontend/js/page-challenge.js:215-228,360-390`; `backend/org-api/src/routes/challenge.routes.ts:183-255,338-430`). Separate puzzle-pack practice selection is `GET /api/puzzle-challenge/select` and returns a solution; it is not an Arena game endpoint (`challenge.routes.ts:748-765`).
- **Reddit Help to Solve:** a separate Devvit web app uses a Reddit-hosted client/server path, not Twitch or the Orbace Arena API. Its client calls help request and helper-session endpoints; the server exposes routes under `/prototype/help/*` and uses the Devvit server context/Redis (`Reddit-Integration/orbace-reddit-prototype/src/client/game.tsx:524-679`; `src/server/routes/api.ts:671-754,1025-1058,1330-1522`). It supports collaborative puzzle solving, a different interaction model from Arena voting.
- **Su-Pu:** the Fastify API accepts an optional verified identity for `POST /supu`; attribution comes from the verified Orbace user, not a body-supplied player ID. Public library routes expose public shares; `GET /supu/mine` requires authentication; private replay reads check owner identity. The web replay page reads `GET /supu/:id` and renders captured or legacy move history (`backend/org-api/src/routes/supu.routes.ts:130-155,471-545,564-585`; `orbace-v4-frontend/js/su-pu-pages.js:198-255`). This is an existing replay/share feature, not Arena round state.

The existing Flutter packages include reusable Sudoku domain validation and a shared board widget (`packages/sudoku_engine/lib/src/engine/sudoku_validator.dart:3-43`; `packages/sudoku_ui/lib/src/widgets/board/sudoku_board.dart:7-40`). The client widget is rendering code; server-side move adjudication and a private Arena solution contract still need to be designed and implemented independently.

## 4. Offline evidence and unresolved questions

The Arena repo has no dependency install requirement for its Node checks. The following completed successfully during this audit:

- `npm run check`
- `npm test`: 22 tests passed, 0 failed.
- `npm run handoff:test`: 4 tests passed, 0 failed.

Those tests cover the Twitch smoke test and GitHub handoff helpers; they do not demonstrate Arena functionality or run the separate Orbace/Reddit suites. The Node tests confirm default-off behavior, explicit send confirmation, exact matcher behavior, bot-message and duplicate filtering, token/ID/scope checks, subscription shape, safe send errors, and mock WebSocket startup.

Open questions for a future authorized implementation: which Orbace web client hosts the Arena UI; where host allowlists live and how authorization maps to session ownership; which existing persistent stores/migration track apply; how a private solution is selected and protected; how to serialize move/deadline terminal races; whether versioned polling is sufficient under the chosen hosting path; and whether the No Notes behavior can be safely hidden in the selected board. The documents describe choices but do not settle these against a built Arena implementation.
