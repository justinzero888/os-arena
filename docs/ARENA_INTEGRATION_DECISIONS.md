# Arena integration decisions — Phase 1 foundation

**Date:** 2026-10-29  
**Status:** Phase 1 integration foundation implemented in an isolated local Orbace worktree; rollout prerequisites remain separate.

## Settled boundaries

| Area | Decision | Rationale / evidence |
|---|---|---|
| Runtime shape | Keep Arena as a modular feature of Orbace's existing Fastify app for eventual integration. Keep this repository's local prototype isolated; no microservice, Redis, or Twitch dependency. | Architecture v2.1; existing Orbace Fastify/Prisma stack. |
| Flag | `ARENA_ENABLED=false` is the default. The API stays unavailable unless explicitly enabled in a local pilot environment. | `.env.example`, `src/arena-server.js`, and the existing flag-off regression test. No production setting is changed. |
| Host identity | Arena host requests use Orbace `authenticate()` and a separate server-side Arena allowlist/ownership check. The allowlist is empty by default and denies all hosts. | Implemented in `backend/org-api/src/routes/arena.routes.ts` and `src/lib/feature-flags.ts`; tests inject a test identity and verify allowlist and ownership rejection. No client-supplied ID or cookie establishes host identity. |
| Persistence | Use existing Postgres through Prisma. Arena session/round/vote/event/solve-ingress models have SQL migrations and a matching RLS companion. Serialize each session's state transitions, vote closure, deadline resolution, and solve adjudication with a locked session row and expected version. | Implemented in isolated backend worktree. Applied to a disposable full-schema PostgreSQL database only; five Arena tables have RLS and no client policies. |
| Private puzzle answer | Store/use the selected solution only in server-controlled state or a restricted private record. Keep public givens separate. Never reuse `/api/puzzle-challenge/select` as an Arena response. | The old public selector returns `solution`; the server validator's successful result also carries a solution and therefore needs a private adapter. |
| State/API boundary | Server owns phase, version, deadlines, ballot closure, and winner. Mutating commands carry expected version and idempotency key. Stale writes return conflict; retries do not duplicate effects. | Issue #4 prototype and architecture v2.1. Persisted equivalent requires transactional locking. |
| Response projections | Distinct host, guest, and overlay DTO builders. Public/guest/overlay include only public puzzle givens, phase/version, timer/deadline, allowed aggregate vote results, and terminal result. Host DTO can add permitted controls/private host notes. No DTO contains the answer, host capability, raw guest key/ID, or raw IP. | Prevent accidental serialization of the aggregate; existing prototype already separates `publicSnapshot` and `hostSnapshot`. |
| Guest identity | Anonymous browser key is server-issued, Secure/HttpOnly/SameSite in deployed HTTPS, stored hashed/salted at rest, rate-limited, and unique per ballot. | Architecture v2.1; current prototype uses a salted hash and local cookies. A production cookie scope/retention policy must match the deployed host. |
| Origin/CSRF | Mutating browser routes require exact same-origin validation and use the existing Orbace CSRF middleware. Set no-store for session snapshots; validate versions, content types, body size, and rate limits on the server. | Implemented for the API plugin. Route and middleware tests cover accepted same-origin and rejected scheme mismatch; only same-origin Arena UI is supported. |
| Sudoku validation | Add an Arena adapter around a server-side validator. It may compare a submitted complete grid against a trusted answer or validate it server-side, but only emits `SOLVED`/not-solved. Do not expose the validator's solution-bearing result. | Existing `puzzle-validator.service.ts` is server-side and returns a solution internally; Dart validator is client/domain-side. |
| Realtime | Begin with versioned, no-store snapshot polling. Do not add WebSockets until measured need requires it. | Architecture v2.1 fallback and prototype behavior. |
| Regression/E2E | Use Node's built-in test runner for standalone engine/HTTP tests and the existing Orbace Vitest/Puppeteer stack for integrated API/browser coverage. Keep the standalone Arena command independent of sibling packages and credentials. | Standalone Playwright E2E and opt-in PostgreSQL-backed same-origin browser E2E both pass. The integrated browser journey uses test-only auth, never a real token. |
| Existing product flows | Arena endpoints and state remain separate from `/challenge`, Reddit Help to Solve, Su-Pu, and official ranking/scoring. Run existing integration regression suites when an actual Orbace integration change is made. | Issue #3 flow audit and architecture v2.1. |

## Persistent model sketch

- `ArenaSession`: opaque ID, host Orbace user ID, lifecycle status, optimistic version, preset ballot close, active round pointer, created/updated/expiry times, predecessor link.
- `ArenaRound`: session ID, sequence, selected preset/puzzle reference, immutable public givens, restricted solution reference, phase, start/deadline, modifier, terminal result.
- `ArenaVote`: session/round, salted guest-key hash, ballot kind, choice, request/idempotency key, created/updated time; unique constraints enforce one current ballot per browser and deduplicate command retries.
- `ArenaEvent`: session/round, monotonically increasing event version, allowlisted event type and safe payload, timestamp; no raw guest identity, IP, host credential, answer, or private notes.

All session mutations, including polling-triggered timeout resolution, must lock/update one `ArenaSession` version transactionally. Public readers receive projection DTOs, never ORM rows.

## API outline

| Method/path | Caller | Purpose | Boundary |
|---|---|---|---|
| `POST /api/arena/sessions` | authenticated, allowlisted host | Create session and return opaque links | Orbace auth, host allowlist, CSRF/Origin, rate limit |
| `GET /api/arena/sessions/:id/host` | owning host | Host projection | Orbace auth + session ownership |
| `GET /api/arena/sessions/:id` | guest | Public-safe projection; guest cookie is issued on voting | No capability mutation; no solution or host-only fields |
| `POST /api/arena/sessions/:id/votes` | anonymous guest | Upsert preset vote; strike and request deduplication are later phases | Guest key hash, open ballot, choice validation, rate limit, Origin/CSRF |
| `POST /api/arena/sessions/:id/start` | owning host | Start only from authoritative READY state | Version + idempotency, transaction lock |
| `POST /api/arena/sessions/:id/solve` | owning host | Submit complete board for adjudication | Ingress timestamp, transaction lock, deadline, full-board validation |
| `POST /api/arena/sessions/:id/rematch` | owning host | Create linked fresh session | Ownership, version/idempotency, no inherited ballots/modifier |

The rematch row above is a planned contract and is not implemented in the integrated Phase 1 API. Create/vote do not currently accept command idempotency keys; start/solve do. The model sketch includes later-phase fields (for example predecessor linkage) that are not claimed as delivered schema.

The standalone prototype uses `/api/arena` routes. Orbace API routes are now registered in `src/index.ts` under `/api/arena`; the test-only browser journey exercises the persisted backend flow. A production Orbace host/audience page has not been mounted.

## Open items, owners, and deadlines

| Item | Owner | Impact | Decision point |
|---|---|---|---|
| Which Orbace web surface should host Arena pages and route registration? | Orbace product/engineering | Determines UI mount and exact backend module location. | Before production integration begins. |
| Which user IDs are authorized Arena hosts and how is the allowlist managed? | Product/operations | Required for host access; no default public host privilege. | Before any non-local pilot. |
| Which existing puzzle source supplies licensed/approved Arena puzzles? | Product/engineering | Determines persistence reference and reuse rights. | Before connecting puzzle selection. |
| Which Prisma migration/RLS role model is appropriate for server-only Arena tables? | Orbace backend owner | Must preserve RLS and service access policy. | With the first Orbace schema change. |
| Retention/consent details for guest browser identifiers and event history. | Product/privacy owner | Limits persistence and public join behavior. | Before external pilot. |

## Implementation boundary for Issue #5

Issue #5 preserves the standalone os-arena prototype and adds an isolated Orbace backend integration foundation. The dirty primary Orbace checkout, production settings, and shared databases are unchanged. No commit, push, merge, deployment, or credential use occurred. The test-only integration uses the canonical auth middleware boundary with a test identity double and a local disposable database/browser journey.

## Updated implementation status — 2026-10-29

The user explicitly expanded the work to the Orbace integration gates. Implementation now exists in the isolated local Orbace worktree `/Users/justinzero/.codex/worktrees/orbace-arena-phase1`, branch `codex/arena-phase1-integration` from clean committed HEAD `60b25fd3`. The dirty primary checkout was not edited, reset, stashed, or copied over. This is local uncommitted development work only; no commit, push, merge, deploy, production setting, or shared DB migration occurred.

| Integration decision | Status and evidence |
|---|---|
| Runtime/module | Fastify plugin `src/routes/arena.routes.ts` is registered from `src/index.ts`; no service or Redis added. |
| Default feature flag | `isArenaEnabled()` accepts exact `ARENA_ENABLED=true`; unset/false routes return 404. No runtime template sets it on. |
| Host identity | `authenticate()` supplies trusted Orbace `sub`; `ARENA_ALLOWED_HOST_IDS` is an explicit comma-separated fail-closed allowlist. Host operations verify session ownership. No host IDs were configured for this task. |
| Persistence/RLS | Five Prisma models and matching Prisma DDL + RLS companion migration are present. RLS is enabled with zero client policies. Applied only to a disposable temporary PostgreSQL cluster for validation. The app's trusted Prisma service role remains a required deployment boundary. |
| Transactions | State changes serialize via `SELECT ... FOR UPDATE`, expected versions, and events. Solve ingress is durably ticketed before parsing without holding a DB transaction during body reads; bounded timeout and abort/close handling share exactly-once cleanup. Deadline resolution honors active pre-deadline tickets; stale leases are bounded. |
| Public/private data | Public and host responses are explicit projections with no solution, host ID, or guest hash. Guest votes store only SHA-256 of a random HttpOnly cookie token. The route does not use the leaking public puzzle selector; it queries `PuzzleDaily` internally. |
| Origin and CSRF | Mutations with Origin require exact scheme + authority match. Existing cookie CSRF guard recognizes the same-origin Arena request path; normal app allowlisted origins remain unchanged. Cross-origin Arena UI is not supported by this slice. |
| Test evidence | `prisma validate`, `prisma generate`, `tsc --noEmit`, backend build, full backend suite (2,073 passed/6 skipped), temporary full-schema migration/RLS verification, a local Prisma row-lock probe, and the PostgreSQL-backed same-origin browser journey passed. The standalone os-arena check/test/handoff/browser E2E suite also passed. |

### Phase 1 exit decision and later pilot prerequisites

Phase 1 exit gate is **MET**: audit and decision register are evidence-based; auth/allowlist and data/API/privacy boundaries are implemented; migration strategy is exercised on a disposable full-schema DB; the exact `ARENA_ENABLED=true` gate is fail-closed; and a repeatable PostgreSQL-backed same-origin browser journey covers the integrated API slice without leaking the solution.

Before a real pilot or shared-environment release, an approved real host ID must be supplied to `ARENA_ALLOWED_HOST_IDS` (unset currently denies everyone), the host/audience page must be mounted in Orbace's UI, the DB/RLS migration must receive normal owner review before a shared migration, and deployment/pilot enablement needs separate authorization. No secrets, real host credentials, production settings, shared DB, or deployment were used.

## Review-preparation decisions — 2026-10-29 (supersedes older implementation/test wording)

- **Source identity:** isolated worktree points to Git remote `justinzero888/orbace-sudoku-v2`; the primary local folder is named `orbace-sudoku`. The actual primary checkout remains untouched. Patch base is `60b25fd3c65631e1c39ac44d36d340001c08034b`. No claim that these are different upstream applications is intended.
- **Ingress and leases:** capture before async middleware. One 15-second auth/registration/body budget; record eligibility and owning host under the session lock. End the body timer at complete parse (`preValidation`); disconnect cleanup cannot remove an adjudicating ticket. Transaction maxWait=5 seconds, timeout=10 seconds, PostgreSQL lock/statement timeout=5 seconds, ticket lease=35 seconds from ingress. Expired orphan leases cannot block timeout indefinitely. Existing 15-second deadline adjudication grace is retained and is visible behavior; no client timestamp is trusted. These local tests do not certify unsynchronized multi-machine clocks or event-loop/DB outages beyond the documented bounds.
- **RLS:** enable all five private tables atomically in the Prisma DDL transaction. Keep the companion SQL idempotent for the normal owner-reviewed process. No migration has been shared/deployed; editing the unshipped Arena migration is safe. Non-owner default-deny tested with explicit SELECT grants; trusted backend owner/service access is deliberate and needs DB-owner review before rollout.
- **Privacy on failure:** scoped error handler emits generic messages; no ORM exception values are serialized. All Arena replies are no-store. Guest identity remains a SHA-256 hash of a random 32-byte cookie token, not a raw ID; no additional salt is used for this high-entropy token.
- **Rate limiting:** use the existing plugin's limiter before solve auth and ticket creation. The plugin otherwise appends its onRequest hook after the custom hook, allowing early rejection to bypass counting; the new integration test reproduced and now guards this case.
- **Idempotency/API accuracy:** only start and solve have version/key command replay, bound to the correct event type. Guest upsert keeps one vote row but repeated votes still append events/increment versions; stronger request deduplication, create idempotency and rematch remain planned Phase 2 work.
- **Test identity:** original DB/browser tests use an auth double. New independent harness uses an actual locally generated Orbace session cookie and persisted synthetic player via canonical middleware/CSRF with separate anonymous browser context. No Supabase login, real host approval or actual account credential is used. Same-origin product UI is still unmounted.
- **Evidence:** final backend 2,089 passed/6 skipped (155 files passed/1 skipped); build/schema/migrations and restricted-role RLS pass. Standalone 36 Node/4 handoff/2 browser tests pass. See `ARENA_PHASE1_REVIEW.md` for exact commands and the local review bundle/patch manifest.
- **Approval:** local fixes and review packet are ready; external independent approval and any publication are still pending. Keep Issue #5 open in `codex-review`; see separate `ARENA_PILOT_READINESS.md` for host/UI/shared-DB/release decisions.
