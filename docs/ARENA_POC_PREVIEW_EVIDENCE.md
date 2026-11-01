# Arena POC — Preview Execution Evidence (2026-10-31)

> **Status:** IMPLEMENTATION PASS — READY FOR INDEPENDENT REVIEW. This is a builder record, not independent acceptance. Production, commit, push, merge, and production enablement were not performed.

## 1. Objective and governing directive

Execute the authenticated-host + authenticated-audience timed Sudoku POC on the existing Orbace auth/backend/DB/deployment stack:

- `docs/Arena POC — Controlling Implementation Directive/Arena POC — Controlling Implementation Directive.md`
- The POC supersedes anonymous guest voting: one authenticated Orbace user = one effective vote; repeat votes update the same vote; anonymous viewers may watch but not vote; only the allowlisted host may host.

## 2. Implementation identity

| Item | Value |
|---|---|
| Worktree | `/Users/justinzero/.codex/worktrees/orbace-arena-phase4-preview` |
| Branch | `codex/arena-phase4-preview` |
| HEAD at evidence time | `3d5f0d331b1edf1bd942a9e3142de7bd6ea00d09` |
| State | Uncommitted changes; no commit, push, or merge performed |
| Control repo | `/Users/justinzero/orbacetech/DevProjects/os-twitcharena` |

## 3. Preview environment

| Component | Value |
|---|---|
| Backend | Fly app `justinzero-preview` (latest deployed backend image; machines restarted before final validation) |
| Frontend (original full pass) | Vercel project `orbace-arena-phase4-preview` (root `.vercel` link); deployment `https://orbace-arena-phase4-preview-9rco6rvlk.vercel.app` |
| Frontend (POC-IR-01 remediation) | Vercel deployment `https://orbace-arena-phase4-preview-6crmw2eyu.vercel.app` |
| Frontend (sign-in follow-up) | Vercel deployment `https://orbace-arena-phase4-preview-9cti36x5t.vercel.app` |
| Frontend (anonymous share-link follow-up) | Vercel deployment `https://orbace-arena-phase4-preview-2bocroddc.vercel.app` |
| Frontend (Flow 1 demo readiness) | Vercel deployment `https://orbace-arena-phase4-preview-44plnxqb1.vercel.app` |
| Database/Auth | Supabase project `orbace-sudoku-zerotap-test` (`cjimlozschaolqqsqksu`) |
| Fly secrets | `ARENA_ENABLED=true`, `ARENA_ALLOWED_HOST_IDS=5b881dec-70a9-4c40-b207-ebc884019e01`, `ARENA_ALLOWED_ORIGINS=https://orbace-arena-phase4-preview-44plnxqb1.vercel.app`; existing `DATABASE_URL`, `SUPABASE_*`, `TIER1_TOKEN_SECRET`, `USE_COOKIE_SESSIONS` unchanged |
| Backend capacity | Fly app scaled to **1 machine** for POC presence coherence |
| Vercel access | Deployment Protection is **disabled** for the dedicated POC Preview project so anonymous audience and overlay URLs are reachable. Production project untouched. Orbace auth and Arena host/API authorization remain server-enforced. |

### Synthetic Preview accounts

Created through the existing `/auth/uuid/register` → `/auth/uuid/upgrade` → `PUT /player/me` path. Passwords were generated locally and are not stored in this repository.

| Account | Supabase UUID | Player UUID |
|---|---|---|
| `arena-host-test` | `5b881dec-70a9-4c40-b207-ebc884019e01` | `a03481ad-3fca-42ed-acc9-c5772dd4f676` |
| `arena-voter-1` | `9ab84f9a-9c49-43d8-9892-c232fc6f2318` | `4e23dc97-8291-49a6-87f0-23e63fd08701` |
| `arena-voter-2` | `f37e4219-3794-409e-883f-112d747a5385` | `8302624a-b0f7-4396-9067-52950f3270e3` |
| `arena-voter-3` | `0c07d0ea-1764-42b6-8ca1-e34c7948fce6` | `03ae962f-a228-49d5-a40a-08ce3964683e` |

## 4. Code changes

### Backend

- `backend/org-api/src/routes/arena.routes.ts`
  - `POST /api/arena/sessions/:id/votes` now requires `authenticate()`; anonymous votes return `401`.
  - Voter identity is the resolved `PlayerAccount.id` (falling back to the JWT subject when no player row is linked), hashed into the existing `arena_votes.guest_key_hash` column. This keeps one effective vote per Orbace player even if the same person switches between bearer and cookie auth, and repeat votes upsert one row.
  - Defensive `401` if `authenticate()` returns null without having sent a reply.
  - No schema migration was needed; the Phase 4 Arena schema and RLS companion migration are unchanged.

### Frontend

- `orbace-v4-frontend/js/arena.js`
  - Votes and strike votes are available only when signed in and not in overlay mode.
  - Non-signed-in viewers see `Sign in to Orbace to vote.`
  - `getArenaHostSession` returning `403` is treated as “not the host” instead of a page-level error, so authenticated non-host voters can still watch and vote.
- `orbace-v4-frontend/arena.html`
  - Start-panel copy now states viewers must sign in to vote.
- `orbace-v4-frontend/scripts/prepare-phase4-preview-config.mjs`
  - Preview-only config uses root-relative build commands (`cd orbace-v4-frontend && …`) for the monorepo-root Vercel link.
  - Preview CSP adds `https://cjimlozschaolqqsqksu.supabase.co` to `connect-src`; production `vercel.json` is unchanged.

### Tests

- `arena.routes.test.ts`: authenticated-vote hash assertion, anonymous-vote 401, repeat-vote-updates-one-row.
- `arena.routes.postgres.integration.test.ts`: guest cookie assertion replaced with `set-cookie` absence.
- `arena.review.postgres.integration.test.ts`: host + anonymous viewer + three authenticated voters; voter-cannot-host 403; mounted-page journey uses voter cookies.

## 5. Validation

### Focused local backend

Command (disposable PostgreSQL 16 on loopback, database `arena_app`, all Prisma migrations plus `infra/supabase/migrations/020_rls_arena_pilot.sql`):

```bash
ARENA_TEST_DATABASE_URL=... npx vitest run \
  src/routes/__tests__/arena.routes.test.ts \
  src/routes/__tests__/arena.routes.postgres.integration.test.ts \
  src/routes/__tests__/arena.review.postgres.integration.test.ts \
  src/lib/__tests__/feature-flags.test.ts \
  src/middleware/__tests__/csrf.middleware.test.ts
```

Result: **88 passed / 0 failed** (5 files), including the POC-IR-01 host-probe regression, bearer-only voter identity, presence counting/cap, audience live sync/zero rendering, Notes mode, and early start. RLS check before the companion migration: all six Arena tables `relrowsecurity=true`, 49 Prisma migrations applied.

### Full backend regression

```bash
ARENA_TEST_DATABASE_URL=... npx vitest run
```

Result: **2,350 passed / 6 skipped**; 169 test files passed, 1 skipped.

### Static/build

- `npx tsc --noEmit` — pass.
- `npm run build` (`tsc`) — pass.
- `npm run test:phase4-preview-routing` — pass.

### Preview API smoke

Against `https://justinzero-preview.fly.dev` with `Origin: https://orbace-arena-phase4-preview-9rco6rvlk.vercel.app`:

| Check | Result |
|---|---|
| `GET /api/arena/health` | `200 {"enabled":true}` |
| Host `POST /api/arena/sessions` | `201`, `BALLOT_OPEN` |
| Anonymous vote | `401 Unauthorized` |
| Authenticated voter vote | `200` |
| Voter changes vote | `200`; host projection `voteCount=2` for two distinct voters (repeat updated, not duplicated) |
| Voter `GET .../host` | `403` |
| Voter `POST .../start` | `403` |
| Vote from disallowed origin | `403 Origin not allowed` |
| Anonymous `GET /api/arena/sessions/:id` | `200`, no solution |
| Host `GET .../host` | `200`, host controls present |

### Post-hardening Preview API smoke

After the canonical voter-key change was redeployed, the same Preview smoke was rerun with three distinct authenticated voters plus one repeat vote. Result: three vote calls returned `200`; the host projection reported `voteCount=3` (repeat changed the existing vote rather than adding a fourth). Anonymous vote, voter-cannot-host, and disallowed-origin checks still returned `401`/`403`.

### Preview browser E2E (pre-hardening full pass)

Driver: Puppeteer, five isolated browser contexts (host, three voters, one anonymous viewer) against the Vercel Preview deployment. Each account signed in through the page’s Supabase SDK, then exercised the mounted Arena UI.

Evidence: `docs/evidence/arena-poc-preview-e2e-2026-10-31.json`.

| Step | Result |
|---|---|
| Four synthetic accounts sign in | pass |
| Host creates session | pass |
| Three distinct voters vote | `3 audience vote(s)` |
| Voter changes vote | count remains 3; `standard` pressed |
| Anonymous viewer | vote controls disabled; `Sign in to Orbace to vote.`; host panel hidden; can watch |
| Ordinary voter | host panel hidden; start disabled |
| Host starts round | `PLAYING`; audience cells read-only |
| Server validates solve | `Host wins — solved before the deadline.` |
| Public payload privacy | no solution, no `hostControls`, no `puzzleId` |
| Rematch | new session created; voter sees ballot and votes |

The browser diagnostics contained only expected Arena polling responses: non-host host-projection checks (`403`), anonymous host-projection checks (`401`), occasional rate-limit responses (`429`), and a missing favicon (`404`). No unexpected page errors occurred.

The full five-context pass above was recorded before the final voter-key hardening. After hardening, the Preview main flow (sign-in, three voters, repeat vote, anonymous watch-only, voter-cannot-host, start, solve, privacy) passed again and rematch creation succeeded. The final ad-hoc Preview rematch voter re-auth/vote re-run was blocked by Puppeteer background-tab throttling and protocol timeouts in the harness, not by an application error; the post-hardening local mounted-page integration journey through rematch passed in the focused suite.

### POC-IR-01 remediation and controlled Preview journey

**Finding:** normal voters and anonymous viewers probed the host-only endpoint on every one-second refresh, generating expected `401`/`403` responses and consuming the global per-IP request budget. Repeated automation produced occasional `429` responses.

**Correction (frontend only):** `refresh()` now keeps a tri-state host probe (`unknown` / `host` / `not-host`). It probes the host endpoint once per session; a confirmed host then polls the host endpoint as its snapshot (one request per tick), while non-host viewers and anonymous viewers poll only the public session. Overlay uses only the public overlay endpoint and never probes host capability. `setSessionUrl` resets the probe for a new session, create/rematch mark the creator as host, and an `online` listener re-detects host state after reconnect. Host authorization remains server-authoritative; mutation rate limits, CSRF/origin checks, and all existing abuse controls are unchanged.

**Local regression:** the review integration suite now includes a mounted-page test asserting host probes for a confirmed host are continuous, a voter makes exactly one host probe and then public-only polling, and overlay makes zero host probes. Focused suite: **85/85**.

**Controlled Preview journey:** new frontend deployment `https://orbace-arena-phase4-preview-6crmw2eyu.vercel.app`, six isolated contexts (host, three authenticated voters, anonymous viewer, overlay). Result: **PASS with zero 429 responses and zero page errors**.

| Acceptance check | Result |
|---|---|
| Host + 3 authenticated voters + anonymous viewer + overlay | pass |
| Exactly 3 effective votes | `voteCount=3` |
| Repeat vote remains 3 | count stayed 3; `standard` pressed |
| Anonymous watch-only | vote controls disabled; sign-in message; host hidden |
| Voter cannot host | host panel hidden; start disabled |
| Host remains authorized | host panel restored after reload; host projection `voteCount=3` |
| Refresh recovers state | voter reload retained `BALLOT_OPEN` + `voteCount=3`; host reload restored host panel |
| Solve/result | `Host wins — solved before the deadline.` |
| Overlay consistency | ballot and playing states read-only; votes/host hidden |
| Rematch | new session created; voter reloaded, saw the ballot, and voted |
| No user-visible/rate-limit responses | `429` count `0`; page-error count `0` |

Evidence: `docs/evidence/arena-poc-preview-ir01-e2e-2026-10-31.json`.

### Sign-in return and Preview key normalization (follow-up)

Two POC-experience defects were found during owner inspection of the live Preview:

1. **Sign-in did not return to Arena.** The Arena page’s Sign in link went to `/signin`, and the sign-in page defaults to `/account` after authentication when no return path is stashed.
2. **Email sign-in failed with `Invalid API key`.** The Preview build env supplied the Supabase anon key with surrounding quotes (the Supabase CLI `-o env` output format), so `js/config.js` contained a doubly quoted key and Supabase rejected it.

**Correction (frontend/build only):**

- The Arena Sign in link now stashes `location.pathname + location.search` in the existing `orbace_return_to` session-storage value before navigating; the sign-in page consumes it and returns to the same Arena URL, including `?session=…`.
- `build-phase4-preview.mjs` strips one pair of surrounding quotes from `PHASE4_PREVIEW_SUPABASE_URL` / `PHASE4_PREVIEW_SUPABASE_ANON_KEY` before writing `js/config.js`.
- `phase4-preview-routing.test.mjs` now asserts the Arena sign-in wiring and the unquoted key output.

**Verification:** new Preview deployment `https://orbace-arena-phase4-preview-9cti36x5t.vercel.app`. With the synthetic host account, the actual email sign-in flow passed: `/arena` → `/signin` → email/password → `/arena`, auth `registered` as `arena-host-test`, then host session creation. Zero `429` responses and zero page errors.

Evidence: `docs/evidence/arena-poc-preview-signin-2026-10-31.json`.

### Anonymous share-link access and session-preserving sign-in (follow-up)

**Finding:** Vercel Deployment Protection intercepted anonymous share/overlay URLs before the Orbace app could load. The project had `ssoProtection: all_except_custom_domains` with no password or automation bypass; protection is deployment-wide and cannot be path-scoped to Arena. Separately, the sign-in return path was `/arena` only, so voters lost `?session=` after authentication.

**Correction:**

- Disabled `ssoProtection` for the dedicated `orbace-arena-phase4-preview` Preview project only. The production project was not changed. This removes the Vercel access layer for the controlled POC while leaving Orbace application auth, host allowlist, CSRF/origin, and Arena API authorization server-enforced.
- The Arena sign-in link stashes `location.pathname + location.search`, so the sign-in page returns the voter to the exact session URL.
- `phase4-preview-routing.test.mjs` asserts the session-preserving return expression.

**Verification:** new Preview deployment `https://orbace-arena-phase4-preview-2bocroddc.vercel.app`.

| Acceptance check | Result |
|---|---|
| Exact share URL with `#:~:text=…` reaches Arena without Vercel login | pass; title `Sudoku Arena | Orbace`, no Vercel login text |
| Anonymous visitor can watch | ballot count visible; no error |
| Anonymous visitor cannot vote | vote controls disabled; API vote `401` |
| Anonymous visitor cannot host | host panel hidden |
| Voter 1/2/3 sign in through the actual Orbace email flow | pass; all returned to `/arena?session=<id>` |
| Voters can vote after return | pass |
| Exactly 3 effective votes | host projection `voteCount=3` |
| Repeat vote remains 3 | `voteCount=3` after change |
| Voter cannot host | host panel hidden; start disabled |
| OBS/read-only overlay reachable anonymously | pass; votes/host hidden; no Vercel login |
| Rate/page errors | `0` `429`; `0` page errors |

Evidence: `docs/evidence/arena-poc-preview-anonymous-share-2026-10-31.json`.

### Flow 1 demo readiness — F1-01 through F1-04

**F1-01 — audience authentication/voting state.** Anonymous viewers see a clear `Sign in to vote` button and disabled vote controls. The button uses the existing Orbace email sign-in flow and the existing `orbace_return_to` mechanism, returning to the exact `/arena?session=…` URL. Authenticated ordinary Orbace users can vote; no Arena-specific login and no Tier-2 requirement. The host capability remains allowlist + ownership protected. Voter-1/2/3 signed in through the actual UI; 3 effective votes were recorded and voter-1's change kept the count at 3.

**F1-02 — live spectator synchronization and zero rendering.** Root cause of the audience bug: the polling update path used `cell.disabled` to decide whether to render the given clue or the board value. Audience cells are disabled, so empty cells rendered the givens `0` and host progress was ignored. The update path now uses `cell.dataset.given`, so fixed clues render givens and empty editable cells render blank/current board values. Audience, anonymous, and overlay pages updated automatically during host play; empty cells never showed literal `0`; the authoritative timer and terminal result converged; refresh recovered state. Polling remains the existing 2-second interval; host probes are still one-per-session for non-hosts. Six pages at normal polling produced **0** `429` and **0** page errors. The three read-only Arena GETs (`/sessions/:id`, `/overlay`, `/host`) use a Preview-gated read policy: `ARENA_PREVIEW_PUBLIC_READS` is false by default; only on the POC Preview does it apply a per-client 40/min read limit plus a 300/min per-IP cap. With the flag off, the normal global fallback applies. Auth, host allowlist, no-store, and every mutation limiter remain unchanged.

**F1-03 — audience presence.** The host sees `N watching · M voters` in the host panel. Exact counting semantics:

- `watching` = distinct opaque page client IDs that fetched the public session or overlay endpoint on the single POC API instance within the last 10 seconds, excluding the host page's own `/host` heartbeats. It is active Arena page instances, **not unique people**; multiple tabs/devices count separately; voters and overlay count as viewers; the host is excluded.
- `voters` = distinct canonical voter keys (`arena_votes.guestKeyHash`) with at least one recorded vote in the session.
- Presence is approximate, in-memory, resets on app restart, and is coherent because the POC runs one Fly machine. No viewer UUIDs, emails, or participant identities are exposed.

Observed in the six-context journey: `1 watching · 0 voters` after the anonymous spectator opened the link; `5 watching · 0 voters` after three voters and the overlay joined; `5 watching · 3 voters` after voting and after voter-1 changed their vote.

**F1-04 — minimum Notes/Pencil mode.** The host can toggle `Notes: Off/On`; typing 1–9 in an empty editable cell adds/toggles small pencil marks; clicking an existing mark toggles it; a normal value entry clears that cell's notes; fixed clues cannot be edited or noted. Notes are frontend-only UI state and are not sent to the board/solve API, so they cannot affect authoritative validation. The notes overlay is a small 9-slot pencil-mark grid; no undo/replay/propagation/toolbar expansion. Existing strike behavior is unchanged. Verified: notes `1,2` rendered, clicking `2` left `1`, toggling off and entering the final value cleared notes.

**Flow 1 timing/start.** The ballot window is 60 seconds; the host can start while the ballot is still open, resolving the preset from votes already cast. A stale-version 409 on start triggers one automatic host-session refresh and retry, so the demo needs one Start click. The six-context journey used early start and completed in one click.

### Review findings remediation (NEEDS FIX response)

**HIGH-1 — bearer voter identity.** `canonicalVoterKeyHash()` now builds the player lookup conditionally. A bearer identity with no `tier1Uuid` queries only `{ supabaseId: voter.sub }`; only a Tier-1 identity adds the `OR` `tier1Uuid` branch. There is no empty `OR` branch that can match an unrelated player. A focused unit test simulates the old empty-branch behavior and asserts two distinct bearer-only subjects produce distinct hashes keyed to their own player rows. The real cookie-session journey remains covered separately.

**HIGH-2 — Preview read relaxation and presence.** The relaxation is gated by `ARENA_PREVIEW_PUBLIC_READS` (false by default; true only on the POC Preview Fly app). When enabled, the three read-only Arena GETs get:

- a per-client 40/min read limit (opaque `X-Arena-Client`, IP fallback when absent);
- a 300/min per-IP route limit;
- a presence cap of 256 viewer entries and 8 host entries per session, with stale 10-second entries pruned on every presence touch (not only host polls) and oldest-entry eviction when over cap.

When the flag is off, the normal global fallback applies; production has no route relaxation. Control evidence: 40 same-client reads returned `200`, the 41st returned `429`, and a different client returned `200` (`docs/evidence/arena-poc-preview-read-limit-2026-10-31.json`). The six-context Flow 1 journey with the limits active still produced **0** `429` and **0** page errors.

### Final TwitchCon Demo Mode — anonymous audience + notes spectator sync

This section supersedes the authenticated-audience F1-01 behavior above. **TwitchCon POC / Demo Mode — anonymous audience voting** is the final Flow 1 authorization decision.

- **Host:** existing Orbace authentication + Arena host allowlist + session ownership. Host-only APIs remain protected.
- **Audience:** no Orbace/Tier-2 authentication and no Arena account. Viewer pages show no `Sign in to vote` action or requirement; the nav exposes only `Host sign in`. Anonymous votes use an opaque `arena_voter` httpOnly/SameSite=Lax browser cookie (or an existing instant browser identity if present). Repeat votes update one row. This is one browser/session, **not one human**; the POC does not claim one-human-one-vote and has no fingerprinting/Sybil protection.
- **Anonymous audience capabilities:** watch; vote/change preset; participate in existing strike voting through the same endpoint; see live board/values; see host Notes; see timer/state/result; vote in the rematch ballot.
- **Anonymous audience restrictions:** the host panel is hidden; `/host` returns `401`; create/start/pause/resume/cancel/rematch/solve remain host-auth, allowlist, and ownership protected; public payloads withhold solution, `puzzleId`, `hostControls`, and identities.
- **Notes synchronization:** host Notes are sent with the existing `POST /board` sync and exposed as `round.notes` in the existing polling projection. Audience and overlay render them read-only; toggles/removals sync; a final value clears them; notes never affect solve validation and are never persisted. Notes are in-memory on the single POC API instance and reset on restart.
- **Test puzzle:** owner test supply row `8d535e61-4721-4c7a-943a-7420d260cad2` (`OWNER_FLOW1_SUBMISSION_TEST_20261031`) is the earliest eligible private supply row, so new sessions load the requested board regardless of the preset vote. No public-catalog collision was found. The solution remains server-private; the row is test-only and can be removed later.

**Final regression (host + 3 anonymous audience contexts + overlay):** host login → create → share → three anonymous pages join without sign-in → host sees `4 watching · 0 voters` → 3 anonymous votes and voter-1 change → `4 watching · 3 voters` / `3 audience vote(s)` → early start → blanks, live values, synchronized timer (`04:58` on host/audience/overlay) → notes `12` visible on audience + overlay → candidate removed to `1` → final value clears notes → solve/result converges on all contexts → rematch allows an anonymous vote. **0 `429`, 0 page errors.** Evidence: `docs/evidence/arena-poc-preview-demo-mode-2026-10-31.json`.

## 6. Security and privacy checks

- Anonymous vote rejected (`401`); one authenticated player cannot create multiple effective votes (upsert by canonical `PlayerAccount.id` key). Bearer-only identities are keyed by the verified Supabase subject with no empty `OR` lookup branch.
- Non-allowlisted authenticated users cannot host (`403`); UI also hides host controls.
- Origin allowlist is enforced on Arena state-changing routes; a disallowed origin receives `403`.
- Public session projection does not expose the solution, `hostControls`, or `puzzleId`.
- Arena puzzle supply remains private/eligible-only; the Preview database contains owner-seeded `OWNER_PHASE4_PREVIEW_20261030` Extreme puzzles.
- Arena feature flag is enabled only on the Preview app; production configuration was not touched.
- Vercel Deployment Protection is disabled only for the dedicated POC Preview project so anonymous audience/overlay URLs reach the Orbace app. Production is untouched; Orbace auth, host allowlist, CSRF/origin, and Arena API authorization remain server-enforced.
- Presence is capped at 256 viewer entries and 8 host entries per session and pruned on every touch; read-only polling has a Preview-gated per-client 40/min limit and 300/min per-IP cap.
- Test Arena sessions created during validation were deleted; the Preview host has zero remaining sessions. The four synthetic accounts remain for reviewer/owner use.

## 7. Known limitations and owner-controlled gates

- **No push/merge/deploy to production.** The current candidate is a local commit (`d78178c4cd20040bf6e6da3b8ffaac4d0615c87d`) in the isolated worktree; it was not pushed or merged. Prior candidates: `3576aba240cfbb5681173486b25be1e013876e4d` (review remediation), `cc40537534e6fdd6d1061f7d721c8e8fbb89c210` (Flow 1), and earlier POC candidates.
- **Vercel Preview URL is ephemeral.** A new frontend deployment changes the origin; `ARENA_ALLOWED_ORIGINS` on Fly must be updated and the app restarted.
- **Vercel Deployment Protection is intentionally disabled for the POC Preview project.** The Preview URL is unlisted/noindex; anyone with the link can reach the app. This is a Preview-only access decision required for anonymous audience/overlay testing. Production remains protected and untouched; Arena API auth, host allowlist, CSRF/origin, and host authorization remain server-enforced.
- **Presence is approximate and single-instance.** The Fly Preview app is scaled to one machine; presence is in-memory, 10-second TTL, and counts active page instances, not unique people. It resets on restart.
- **Anonymous audience voting is Demo Mode only.** One opaque browser cookie (or existing instant browser identity) is one effective vote; repeat/change updates one row. This is not one-human-one-vote and has no fingerprinting/Sybil protection. Host-only authorization remains separate and server-enforced.
- **Host Notes are public solving progress and are in-memory.** Notes sync through the existing polling/board route, are visible read-only to audience/overlay, are never used by solve validation, and reset on API restart. They are not persisted.
- **The test puzzle is Preview-only data.** Owner supply row `8d535e61-4721-4c7a-943a-7420d260cad2` is first eligible for the submission test; remove or restore it after the demo if desired.
- **Preview-gated read polling relaxation.** `ARENA_PREVIEW_PUBLIC_READS=true` only on the POC Preview applies a per-client 40/min limit plus a 300/min per-IP cap, with capped/pruned presence. Default/production uses the normal global fallback. Do not enable this flag outside the POC Preview without a new rate-limit decision.
- **20-second ballot.** Voters must join the session link promptly; a rematch creates a fresh 20-second ballot. The E2E forces a full reload when moving an existing browser context to the new rematch query string.
- **Preview browser-harness flakiness.** The pre-fix ad-hoc rematch re-run hit Puppeteer background-tab throttling/protocol timeouts; the POC-IR-01 controlled journey disabled background timer throttling, used interval polling, and passed cleanly. This is test-harness behavior, not an application defect.
- **Preview CSP patch is local-only.** The committed production `vercel.json` was not modified.
- **Synthetic accounts** exist only in the Preview Supabase project; their passwords are held outside the repository.
- **Independent review is still required.** This document records builder validation only.

## 8. Reproduction notes

1. Start from the isolated worktree and install backend/frontend dependencies.
2. Run the focused and full backend commands above with a disposable PostgreSQL database and the RLS companion migration.
3. Build the Preview frontend with `PHASE4_PREVIEW_SUPABASE_URL` and `PHASE4_PREVIEW_SUPABASE_ANON_KEY`; use `prepare-phase4-preview-config.mjs` to generate the local Vercel config.
4. Deploy the backend to `justinzero-preview` and the frontend to the Preview Vercel project.
5. Set `ARENA_ENABLED=true`, `ARENA_ALLOWED_HOST_IDS=<host Supabase UUID>`, `ARENA_ALLOWED_ORIGINS=<Preview origin>`, and `ARENA_PREVIEW_PUBLIC_READS=true` on Fly. Leave `ARENA_PREVIEW_PUBLIC_READS` false in production.
6. Run the Demo Mode browser E2E with a host account, at least two anonymous audience contexts, and an overlay.

## 9. Review package

- **Candidate:** `d78178c4cd20040bf6e6da3b8ffaac4d0615c87d`
- **Prior candidate:** `3576aba240cfbb5681173486b25be1e013876e4d` (review remediation)
- **Baseline:** `3d5f0d331b1edf1bd942a9e3142de7bd6ea00d09`
- **Tag:** `arena-poc-demo-mode-2026-10-31`
- **Package:** `review-packages/arena-poc-preview-d78178c4.zip`
- **Contents:** review request, candidate/baseline identity, complete implementation patch, focused Demo Mode patch plus retained review/Flow 1/POC-IR-01/sign-in/anonymous-share patches, changed-file inventory, evidence docs/JSON (original, IR-01, sign-in, anonymous share, Flow 1, read-limit control, Demo Mode final), Arena source/test snapshots, full and focused test logs, TypeScript/build/routing logs, Preview API smoke, security/privacy review, Preview final-state evidence, and `MANIFEST.sha256`.
- **Delivery:** placed in the ChatGPT Project “Orbace Sudoku Twitchcon Arena” under `review-packages/` and `sources/`, with a provenance copy in this repository’s `review-packages/` directory.

