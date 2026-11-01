# Arena integration audit — Phase 0 delta

**Date:** 2026-10-29  
**Scope:** The five integration checks requested by Issue #5 and `CODEX_PHASE1_KICKOFF.md`. This is a delta check, not a replacement for `FRONTEND_BACKEND_TWITCH_FLOW.md`.  
**Safety:** Orbace checkout inspected read-only. Its current branch is `claude/supu-library-phase1-2` and has numerous modified and untracked files; none were changed. No environment files or credentials were read.

> **Remediation delta — 2026-10-29:** The earlier statement that internal
> `PuzzleDaily` selection was safe is superseded. Arena now requires an
> explicitly eligible row from a private `arena_puzzle_supply` table, returns
> no puzzle identifier in public or host projections, and rejects supply whose
> board is available through the registered public daily/pool/pack puzzle route.
> A missing safe candidate returns a conflict; it never falls back to public or
> official puzzle records. This revised local work remains pending independent
> review and has not been applied to a shared database.

## Worktree and baseline

- Arena checkout: `/Users/justinzero/orbacetech/DevProjects/os-twitcharena`, branch `feat/arena-mvp`, HEAD `764423f` (`feat: add Twitch chat connectivity smoke test`), remote `origin` is `https://github.com/justinzero888/os-arena.git`.
- Initial worktree had modified `README.md`, `package.json`, `src/twitch-connectivity-test.js`, and `test/twitch-connectivity-test.test.js`, plus untracked environment/architecture docs, `docs/`, `public/`, `scripts/`, and Arena source/tests. These are pre-existing and preserved.
- Existing Issue #3 audit is `docs/FRONTEND_BACKEND_TWITCH_FLOW.md`; the Issue #4 prototype is `src/arena-engine.js`, `src/arena-server.js`, `public/`, and `test/arena.test.js`. The prototype is in-memory and single-process; it is not production integration.
- `.env.example` declares `ARENA_ENABLED=false`. The server starts only when `ARENA_ENABLED === 'true'`; default and disabled route behavior are fail-closed.

## Bounded integration findings

| Check | Evidence observed | Integration consequence |
|---|---|---|
| Host auth | `orbace-sudoku/backend/org-api/src/middleware/auth.middleware.ts` exports `authenticate(req, reply)` and resolves verified Supabase JWTs and, when enabled, Orbace session cookies into `AuthenticatedUser`. Existing routes call this for protected actions. No Arena host allowlist or per-session ownership policy was found in the bounded backend search. | Future Arena host routes should call the canonical middleware and then enforce a server-side Arena host allowlist and session ownership. The standalone host capability cookie is prototype-only and must not become production user auth. |
| Persistence, migrations, RLS, transactions | Prisma schema is `backend/org-api/prisma/schema.prisma`; SQL migrations live under `infra/supabase/migrations/` and include explicit RLS enablement/policies (for example `002_row_level_security.sql`). Services use Prisma callback transactions; observed row-locking and serializable transaction examples include `supu-lab.routes.ts` and `promotion.service.ts`. | Persist session/round state, votes, and events using the existing Postgres/Prisma boundary. Serialize state-changing commands and deadline resolution in a DB transaction with a row lock/version check. Add RLS and policies in the same reviewed integration change. No Arena migration is being applied here. |
| Sudoku validation | `backend/org-api/src/services/puzzle-validator.service.ts` is the server-side TypeScript validator for puzzle submissions and returns the unique solution in its valid result. The canonical domain validator is `packages/sudoku_engine/lib/src/engine/sudoku_validator.dart`; it validates partial/solved boards but is Flutter/Dart code. The public `GET /api/puzzle-challenge/select` response is explicitly documented by the earlier audit as returning `solution`. | Do not reuse the public selection endpoint or return validator results to clients. A server-only adapter must hold the answer and return a boolean/result code; solution-bearing values stay out of all public DTOs and event streams. Whether the validator can be imported cleanly into the Fastify service remains an implementation detail for the future integration change. |
| Browser E2E and regressions | Orbace root `package.json` defines `test:e2e` with `@playwright/test`; root `playwright.config.ts` runs the existing frontend suite. Backend uses Vitest; Flutter engine uses `flutter test`; frontend has Node smoke tests. Arena currently has Node built-in tests and no browser automation dependency or E2E command. | Establish an Arena-owned Playwright E2E command in this repository. It will exercise the existing local prototype and its fail-closed flag; it will not claim Orbace integration coverage. |
| Current work and feature gate | `git status --short --branch` showed the above pre-existing files on `feat/arena-mvp`; no local changes were reset or stashed. `src/arena-server.js` already provides the Issue #4 local host/guest/overlay vertical slice and gates API routes behind `ARENA_ENABLED`. | Reuse and exercise the prototype as the Phase 1 local vertical slice. Persistent storage, Orbace authentication, production routes, and deployment remain out of this repository-only milestone. |

## Existing user-facing flows kept separate

The prior Issue #3 audit remains authoritative for `/challenge`, Reddit Help to Solve, Su-Pu, and the solution-bearing puzzle-selection endpoint. This Phase 0 delta did not re-audit those flows. Arena remains unranked and uses a distinct API and view projections. The primary dirty Orbace checkout remains unchanged; the follow-up integration is isolated in a separate clean worktree.

## Phase 0 gaps and follow-up status

1. **Host authorization:** no Arena allowlist/ownership rule existed during Phase 0. The follow-up adds canonical auth plus a fail-closed allowlist; a designated local host ID remains unconfigured.
2. **Persistent execution:** Phase 0 only had an in-memory slice. The follow-up adds Prisma/Postgres models, migrations, RLS, and locked transactions in the isolated app worktree; no shared DB is migrated and no full app DB play has been run.
3. **Sudoku adapter:** the public selector remains prohibited. The follow-up reads `PuzzleDaily` through an internal Prisma select and emits only the safe projection; temporary DB did not contain the existing Orbace schema/puzzle fixtures.
4. **Browser proof:** an Arena-local Playwright command exists and was reported as 2/2 passed in M2. It tests the standalone server, not the integrated Orbace app routes; app browser E2E remains open.

## Current conclusion

The bounded Phase 0 exit condition is met: the integration-critical conventions are evidenced, unresolved integration boundaries are documented, and safe implementation work has proceeded. This does **not** mean production auth, persistence, or Arena deployment is complete.

## Phase 3 approval and Phase 4 readiness evidence — 2026-10-29

The Phase 3 package was independently approved on GitHub Issue #6 (comment 6506971946; issue label `chat-approved`). The approval covers the actual package and evidence; it does not authorize release actions.

The owner-directed Phase 4 is pilot readiness (the execution plan's former Phase 7). Local inspection of the isolated Orbace worktree at `/Users/justinzero/.codex/worktrees/orbace-arena-phase1` confirmed:

- `isArenaEnabled()` in `backend/org-api/src/lib/feature-flags.ts` accepts only exact `ARENA_ENABLED === 'true'`; `arenaHostAllowlist()` returns an empty set when unset/blank. `.env.example` remains `ARENA_ENABLED=false` and has an empty host allowlist.
- `backend/org-api/src/routes/arena.routes.ts` selects only `ArenaPuzzleSupply` rows with `eligible=true`, excludes prior series puzzle IDs, checks candidate givens/solutions against daily, pool and pack public routes, and returns conflict when no safe candidate exists. There is no public-catalog fallback.
- No Arena supply seed or catalog is present in the inspected backend files. PostgreSQL integration tests create and delete disposable fixture supply; this is not evidence of a curated or adequately sized real bank.
- On 2026-10-29, the documented `scripts/arena-review-postgres.sh` was run with a fresh disposable loopback PostgreSQL DB. All 48 migrations applied, all six Arena tables reported `rls=true`, `arena_policies=0` before the companion, and `migrations_applied=48`. The full test suite reported 155 files passed/1 skipped and 2,097 tests passed/6 skipped, including 11 PostgreSQL/browser integration tests. The script removed its disposable DB; no shared endpoint was used.
- Current default-off evidence also includes `npm run check`, `npm test` (39/39), `npm run handoff:test` (4/4), `npm run arena:e2e` (2/2), and focused Orbace tests (68/68). Logs are in `/private/tmp/os-arena-phase4-evidence` for this local run.

This evidence does not verify an approved host, production/staging origin or proxy, shared migration/RLS behavior, privacy-retention approval, real curated supply, load capacity, or deployment/rollback in an operated environment. Those remain explicit owner gates in `ARENA_PILOT_READINESS.md`.

## Phase 1 implementation evidence (2026-10-29 follow-up)

The user expanded the requested work from a repository-only prototype into safe Orbace integration. To preserve the dirty primary checkout, implementation is in the clean Orbace worktree `/Users/justinzero/.codex/worktrees/orbace-arena-phase1`, local branch `codex/arena-phase1-integration`, based on committed HEAD `60b25fd3`. The original checkout at `/Users/justinzero/orbacetech/DevProjects/orbace-sudoku` remains unchanged and has unrelated pre-existing work. The path named `orbace-sudoku-v2` is not present.

| Gate | Implemented evidence | Verification / remaining limit |
|---|---|---|
| Orbace host authentication and allowlist | `backend/org-api/src/routes/arena.routes.ts` calls canonical `authenticate()` and compares its verified `sub` with the fail-closed `ARENA_ALLOWED_HOST_IDS` parser in `src/lib/feature-flags.ts`. Start/solve also verify ownership against the persisted host ID. | Route tests cover flag-off, non-allowlisted and non-owner rejection, and authorized creation. No pilot host ID was configured; missing allowlist denies every host. |
| Default-off feature flag | `isArenaEnabled()` returns true only for exact `ARENA_ENABLED=true`; routes return indistinguishable 404 while unset/off. | Feature flag tests cover unset and non-exact values. No production flag was read or changed. |
| Durable model and migrations | Prisma models `ArenaSession`, `ArenaRound`, `ArenaVote`, `ArenaEvent`, and `ArenaSolveIngress`; matching DDL under `backend/org-api/prisma/migrations/20261029130000_arena_pilot/`; RLS-only companion `infra/supabase/migrations/019_arena_pilot.sql`. Round solution is stored privately and never selected in response projections. | `prisma validate/generate` pass. Both migrations were applied only to disposable PostgreSQL under `/private/tmp`; RLS query confirmed five base tables enabled and zero policies. No Orbace DB migration was applied. |
| Transaction/concurrency boundary | State changes and deadline advancement use `SELECT ... FOR UPDATE` on the session inside Prisma callback transactions, expected versions, and versioned events. A solve request records a durable ingress ticket before body parsing without holding a transaction or row lock during body reads; bounded body timeout/abort cleanup removes it exactly once. Deadline resolution honors eligible pre-deadline tickets while stale leases expire. | Route regressions cover a pending pre-deadline ticket, a valid delayed solve, late solve rejection, and exactly-once cleanup. A disposable PostgreSQL probe serialized two concurrent row-locked updates, final version 3. Full backend tests and the integrated DB/browser journey pass. |
| Guest and public boundaries | Anonymous ballot uses a server-issued HttpOnly/SameSite cookie; only its SHA-256 hash is persisted. Mutating requests require exact scheme+authority Origin; cookie-authenticated Arena same-origin requests are recognized by the existing CSRF guard. Public DTO is explicitly built and excludes host ID, guest hash, and solution; snapshots are no-store. | Automated route/CSRF tests cover legitimate same-origin, mismatched scheme, and solution/identity redaction. Cross-origin Arena UI is intentionally not enabled; the route requires same-origin with the API. |
| Existing Sudoku integration | Start reads only `puzzleId`, `givens`, and `solution` directly from internal `PuzzleDaily` using Prisma. It does not call `GET /api/puzzle-challenge/select`; selected solution stays in ArenaRound backend state. | The opt-in integration test seeds a temporary `PuzzleDaily` row in the disposable full-schema database, runs the persisted route journey, and asserts public/host responses omit the solution and host identity. Existing challenge/Su-Pu/scoring code was not modified. |
| Browser and existing flows | Fastify routes are registered in existing `src/index.ts`. The integration test starts those routes on a same-origin Fastify test server and drives a real Puppeteer browser through the PostgreSQL-backed flow. A production Orbace Arena page is not mounted yet. | `ARENA_TEST_DATABASE_URL=... npm test -- --reporter=dot` passed with 2,073 passed/6 skipped, including both real DB/browser integration tests. `npm run arena:e2e` in os-arena passed 2/2 for the standalone flag-off and host/guest prototype journeys. |

### Current integration exit status

**Phase 1 exit gate: COMPLETE for the backend integration foundation and safe test vertical slice.** Evidence is in isolated local branch `codex/arena-phase1-integration`; all 48 checked-in Prisma migration directories, including the Arena Prisma migration, plus the RLS companion were applied only to a disposable local full-schema PostgreSQL database. RLS was verified on all five Arena tables with zero client policies. The opted-in test database journey passed through the registered routes using test-only auth and a real same-origin browser, including puzzle selection and public-response redaction. Default-off behavior, allowlist, ownership, Origin/CSRF, persistence, row locking, and solve ingress/deadline handling have automated coverage. The production Orbace UI is not mounted, the real host allowlist remains unset (so all hosts are denied), and no shared/production database or deployment was changed; these are pilot/rollout prerequisites rather than Phase 1 exit failures. The primary dirty Orbace checkout remains unchanged. Dependency installation reported 45 existing audit findings (25 moderate, 18 high, 2 critical); dependencies were not upgraded or audited/fixed as part of Arena.


## Review preparation update — 2026-10-29

The prior Phase 1 PASS is a local test-gate record and does not mean independent approval. The implementation agent inspected the actual tracked/untracked source and corrected concrete ticket-lifecycle, pre-auth ingress, early-rejection rate-limit, error-path privacy, UUID/idempotency and atomic-RLS defects. Current evidence and file scope are in `ARENA_PHASE1_REVIEW.md`; pilot prerequisites are in `ARENA_PILOT_READINESS.md`.

The real upstream is `justinzero888/orbace-sudoku-v2`, locally checked out under `orbace-sudoku`; integration changes stay in the isolated worktree, and the primary checkout is unchanged. The new review integration test uses real synthetic Orbace session cookies, canonical authenticate()/CSRF/rate limiting, real PostgreSQL and distinct host/guest browser contexts. It supplements the older auth-double browser test. RLS is now active immediately after Prisma migration, before the companion script; a granted non-owner role cannot read private round rows. Final full suite: 2,089 passed, 6 skipped; 155 files passed, 1 skipped. Prisma/build and fresh 48-migration run pass. All test DBs are disposable and removed. No shared DB, real host authorization or product UI mount is implied.

## Phase 4 continuation — target supersession and read-only verification (2026-10-29)

The owner replaced the original authorized Preview DB ref `vzpqsfpdktcnkkrcxzfj` with `cjimlozschaolqqsqksu` (`orbace-sudoku-zerotap-test`) for Arena staging. The decision on puzzle supply is also clarified: Quick/Standard/Endurance are time presets, and only Extreme puzzles may be selected. No code path or documentation may interpret these as three Sudoku difficulties.

Read-only CLI verification found the approved Supabase project active/healthy and reachable, with no public application tables, no Prisma migration ledger, no Arena tables and no Arena RLS policies. The database was not mutated. Fly Preview is suspended; its secret listing confirms `DATABASE_URL` exists by name, but does not reveal its target. Because app startup may invoke Prisma migrations, and the recovery/backup procedure is unverified, the machine was not resumed. The prior Vercel Preview configuration check found no environment variables. The owner has supplied 20 boards; 16 pass format, consistency, unique-solution, and Extreme-rating checks, while four are excluded (indices 9, 10, 12, 18). A throwaway host `sub` remains absent.

The latest disposable local integration rerun applied all 49 Prisma migrations and RLS companion checks, built Orbace, passed the full backend suite (**2,344 passed, 6 skipped**), and passed the PostgreSQL/browser Arena journey. These results do not establish shared Preview readiness. No Preview or production state was changed.

The exact Fly Preview app/hostname is confirmed by read-only `fly status`: `justinzero-preview` / `justinzero-preview.fly.dev`, suspended with both machines stopped. Supabase project-list metadata confirms the selected target is active/healthy in `us-west-2`. The stopped app prevents an HTTP health or runtime secret-target check.

## Phase 4 private puzzle intake validation — 2026-10-29

The owner supplied 20 digit-only 81-character boards. The existing Orbace `validateGivens` and `rateDifficulty` functions were run locally; an independent Python backtracking solver also checked solution counts. Sixteen boards are consistent, uniquely solvable, and rated Extreme by Orbace's current difficulty rater (indices 1–8, 11, 13–17, 19–20). Indices 9, 12, and 18 have conflicting givens; index 10 has multiple solutions. No solution strings or raw puzzle values were copied into this repository or GitHub. The four rejected boards are excluded from seeding until corrected/replaced. No database was written.
