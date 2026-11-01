# Orbace Sudoku Arena — Project Status Tracker

> **Current authoritative update — 2026-10-31:** Flow 1 is **DEMO READY** on the TwitchCon POC candidate `d78178c4cd20040bf6e6da3b8ffaac4d0615c87d` (frozen for the demo). Final Demo Mode: host uses existing Orbace auth/allowlist/ownership; audience votes anonymously via the smallest opaque browser cookie (no sign-in/Tier-2; not one-human-one-vote); host-only APIs remain protected. Host Notes now sync to anonymous audiences and the read-only overlay through the existing board/polling path; notes are public host progress, in-memory, and never affect solve validation. Final regression with host + 3 anonymous audience contexts + overlay passed: anonymous joins/votes/change, 4 watching/3 voters, early start, live values, notes 12→1→clear, synchronized timer, result convergence, rematch anonymous vote; **0 429 / 0 page errors**. Focused **88/88**; full backend **2,350 passed / 6 skipped**. Preview candidate is frozen; production untouched; independent review remains separate. See `ARENA_POC_PREVIEW_EVIDENCE.md`.
>
> **Prior authoritative update — 2026-10-30:** Phase 4 / Issue #7 is independently `chat-approved`; Phase 5 / Issue #8 is `codex-working` for read-only production assessment and release-plan preparation. Production/pilot is **NO-GO** pending DB-owner reconciliation of historical migration drift, operating-model decisions, independent plan review and separate owner authorization for each production mutation. Current evidence is in `ARENA_PHASE5_PRODUCTION_READINESS.md`. Older dated blocks below are historical.


**As of:** 2026-10-29  
**Project manager view:** Based on the existing audit, architecture v2.1, Issue #4 report, and most recent review summary.  
**Status legend:** `COMPLETE` = supported by recorded evidence; `PARTIAL` = useful work exists but exit criteria are not met; `NOT STARTED` = no phase delivery reported; `BLOCKED` = cannot proceed safely until named dependency is resolved.

> Status is evidence-based, not optimistic. The Issue #4 prototype is a standalone proof of concept; it does not mean the production integration phases are complete. Reported test results should be rerun in the current worktree before being treated as a fresh green build.

## 1. Executive summary

> **Current authoritative update — 2026-10-29:** Phase 3 / Issue #6 received
> independent `chat-approved` on GitHub (review comment 6506971946). The
> approved package verifies gameplay, timing, privacy, puzzle isolation, RLS,
> and PostgreSQL/browser integration. Owner-directed Phase 4 is pilot readiness
> (the execution plan's former Phase 7), tracked in Issue #7 (now `chat-approved`).
> Current local rerun: standalone 39 tests, handoff 4, browser 2; focused
> Orbace 68; disposable full backend/PostgreSQL/browser 2,097 passed and 6
> skipped. No shared database, host, staging, production, or release action
> occurred. See `ARENA_PILOT_READINESS.md` for current gates.

- **Phase 0 — Discovery baseline:** **COMPLETE for bounded delta.** Existing audit reused; auth, DB/RLS/transaction, validator, E2E, and worktree evidence recorded in `docs/ARENA_INTEGRATION_AUDIT.md`.
- **Issue #4 — Standalone MVP prototype:** **PROTOTYPE DELIVERED; review-ready report recorded.** This is not production integration.
- **Phase 1 — Integration foundation:** **COMPLETE for the defined backend/test vertical-slice exit gate.** The isolated Orbace worktree contains canonical auth plus fail-closed allowlisting, Prisma persistence/migrations/RLS, transactional state coordination, and registered routes. A disposable full-schema PostgreSQL-backed same-origin browser journey passed. The production Orbace UI is not mounted; the real host allowlist is unset and denies everyone. These are pilot/rollout prerequisites, not Phase 1 exit criteria.
- **Phase 2 — Integrated UI/E2E:** **INDEPENDENTLY APPROVED** per owner direction; detailed earlier evidence remains in the Phase 2 review package and GitHub history.
- **Phase 3 — Host gameplay and authoritative resolution:** **INDEPENDENTLY APPROVED** on Issue #6; the reviewer found no blocking defect.
- **Owner-directed Phase 4 — Pilot readiness:** **INDEPENDENTLY `chat-approved`** on Issue #7 (2026-10-30). This corresponds to the old Phase 7 label in the execution plan. Production/pilot remains NO-GO; see `ARENA_PHASE5_PRODUCTION_READINESS.md`.
- **Production:** Feature flag must remain OFF; no deployment or production changes authorized.

## 2. Phase-by-phase status

The table below preserves the original execution-plan numbering and historical snapshots. The owner-directed Issues #5/#6/#7 sequence has since re-sequenced work; use the current authoritative summary and dated Phase 3/Phase 4 addendum below for current approval/readiness state.

| Phase | Status | Evidence / completed work | Remaining work / exit criteria | Next action |
|---|---|---|---|---|
| 0. Baseline discovery and delta verification | **COMPLETE — bounded checks** | `docs/FRONTEND_BACKEND_TWITCH_FLOW.md` reused. `docs/ARENA_INTEGRATION_AUDIT.md` records canonical auth, Prisma/Postgres and SQL/RLS/transaction patterns, server validator plus solution-leak hazard, browser commands, and current tree status. | No broad re-audit. Production implementation boundaries remain documented. | Proceed with Phase 1; keep Orbace checkout read-only. |
| Issue #4. Standalone MVP prototype | **PARTIAL — reported review-ready** | In-memory engine/server/UI; host/audience/overlay, preset voting, timed solve, server-side full-board validation, results, rematch. Reported hardening: ingress-timestamp deadline race handling, exact Origin check, disabled Start until READY, request-body abort/timeout ticket cleanup, stale snapshot guards. Latest reported checks: `npm run check`, `npm test` 36 passed, `npm run handoff:test` 4 passed, `git diff --check`; manual host+guest browser flow reported successful. | Re-run checks in current worktree. Keep in-memory/single-process limitations explicit. No persistent DB, multi-instance locking, production auth integration, integrated automated browser E2E, strike/pause/cancel/production hosting in the prototype. The Issue #4 label was not changed by the prior review. | Treat as reference implementation and acceptance baseline; do not overstate as production-ready. |
| 1. Integration foundation and vertical-slice design | **LOCAL REMEDIATION PASS (historical snapshot); later phases independently approved — see current update at top** | Canonical cookie-auth host/allowlist, private DTO/error redaction, row-locked Prisma state, bounded solve tickets and atomic RLS are implemented in isolated branch `codex/arena-phase1-integration`, base `60b25fd3`. The remediation adds a private Arena supply, removes public puzzle identifiers, and rejects candidates present in public puzzle catalogs; latest full local backend run: 2,091 passed/6 skipped, 155 files passed/1 skipped. | A new independent review is required. Real host ID, Orbace product UI, shared migration approval and pilot enablement remain separate readiness gates in `ARENA_PILOT_READINESS.md`. | Historical: Issue #5 was kept in `codex-working` pending the revised review package. Current approval state is in the updates at the top of this file. |
| 2. Lifecycle, voting, event ordering | **NOT STARTED** | Prototype offers in-memory lifecycle/voting behavior to reuse selectively. | Persistent lifecycle, deterministic ballot closure/ties/no-vote rules, idempotency, concurrency/version conflicts, sanitized event sequence, rematch linkage, idle TTL. | Implement only after Phase 1 design gate. |
| 3. Sudoku integration, deadlines, winner | **NOT STARTED** | Prototype validates full solution and has reported deadline-race regression coverage. Existing public endpoint leak is a known hazard. | Integrate safe engine path; keep solution private; persistence; deterministic server time/state advancement; complete deadline race matrix; projection leak tests. | Reuse race-test concepts; do not reuse leaking endpoint. |
| 4. Strike, pause, cancellation, operations | **NOT STARTED** | Architecture v2.1 contains rules for strike, time-penalty fallback, pause, cancellation, and feature flag behavior. | Implement and test pause-frozen clocks/ballots/modifier, solve-during-strike, one modifier per round, cancel/no winner, flag-off policy, operator path. | Follow v2.1; use time-penalty fallback if No Notes is unsafe. |
| 5. Host/audience/overlay UX | **NOT STARTED for integrated app** | Standalone prototype has host/audience/overlay UI and a reported manual browser E2E. | Integrate with app; responsive 1280×720 and 1920×1080; accessible controls/live regions; reload recovery; server-driven timer; no secrets; privacy notice; rematch UX. | Use prototype as reference, not as proof of integration. |
| 6. Automated E2E, security, concurrency, regression | **PARTIAL groundwork only** | Unit/HTTP prototype tests and manual E2E reported. Detailed test matrix defined in execution plan. | Repeatable browser E2E; host + 3 guests + overlay; all race/security/privacy/pause/strike/rematch cases; `/challenge`, Reddit Help to Solve, Su-Pu, official scoring regressions; 50-guest smoke target. | Add automated E2E early in Phase 1 and expand with every phase. |
| 7. Pilot readiness and controlled release | **NOT STARTED** | `ARENA_ENABLED=false` is the agreed default. | Operator runbook, privacy/retention review, monitoring, rate limits, cancellation/rollback drill, approved pilot checklist. | Do not deploy/enable until explicitly authorized. |

## 3. Workstream and risk register

| ID | Risk / dependency | Current assessment | Mitigation / action | Owner |
|---|---|---|---|---|
| R1 | Existing public puzzle-selection endpoint exposes solution | Known from audit; high severity if reused | Do not reuse; add automated projection/endpoint leakage assertions before integration | Codex |
| R2 | Current prototype is in-memory/single process | Known limitation | Persistent state and concurrency design in Phase 1; no production claims based on prototype | Codex |
| R3 | Host authorization integration details | **Implemented fail-closed in isolated app branch; pilot allowlist still unconfigured** | Use canonical `authenticate()` identity plus `ARENA_ALLOWED_HOST_IDS`; do not authorize any host until an approved local identity is configured | Codex + product/operations |
| R4 | Sudoku server-side validation path | Needs bounded verification | Identify engine entry point and validate full solution server-side; document fallback if integration is unsafe | Codex |
| R5 | No Notes may require invasive board changes | Open design risk | Prove feasibility early; if unsafe, use labeled 10-second time-penalty formula | Codex |
| R6 | Browser E2E repeatability | Prototype manual E2E reported; integrated suite not yet proven | Establish a documented automated browser E2E command in Phase 1 | Codex |
| R7 | Twitch chat/EventSub testing | External-message test not observed; not MVP dependency | Do not block Arena work on Twitch; retain self-message guard; no forced replies | Codex |
| R8 | Existing Orbace worktree has uncommitted changes | Must be protected | Do not modify/reset/clean/stash/revert `orbace-sudoku-v2`; preserve all `os-arena` local changes too | Codex |
| R9 | Feature flag / production safety | `ARENA_ENABLED` exact-`true` gate is tested; production untouched | Leave unset/false by default; no production enablement or migration application without explicit authorization | Codex + user approval |

## 4. Decision register (current baseline)

| Decision | Status | Notes |
|---|---|---|
| Modular monolith using existing Orbace stack | **SETTLED** | Do not reopen without concrete evidence of a blocker. |
| Twitch is broadcast/discovery, not identity/source of truth | **SETTLED** | No Twitch API/chat integration required for first playable MVP. |
| Arena unranked; existing rankings and Sudoku flows unchanged | **SETTLED** | Regression coverage required. |
| Feature flag default OFF | **SETTLED** | `ARENA_ENABLED=false`; pilot enablement needs explicit authorization. |
| Public/guest/host/overlay views separated | **REQUIRED** | No solution, host secrets, private notes, or guest identifiers in public projections. |
| Server full-solution validation and ingress-time deadline authority | **REQUIRED** | Hash-only validation is insufficient. |
| Strike semantics / time penalty fallback / technical pause | **SETTLED in v2.1** | Implement one modifier variant per round; use fallback if No Notes is unsafe. |
| Production deploy, commit, push, merge, or production config changes | **NOT AUTHORIZED** | Stop and ask before any such action. |

## 5. Test evidence ledger

| Evidence item | Reported status | Confidence / follow-up |
|---|---|---|
| `npm run check` | **Passed on 2026-10-29** | Rerun in the current os-arena worktree. |
| `npm test` | **36 passed, 0 failed on 2026-10-29** | Rerun in the current os-arena worktree. |
| `npm run handoff:test` | **4 passed, 0 failed on 2026-10-29** | Rerun in the current os-arena worktree. |
| `npm run arena:e2e` | **2 passed, 0 failed on 2026-10-29** | Chromium: flag-off, host/guest authorization boundary, vote/readiness/start/solve/result, and public payload redaction. |
| `git diff --check` | **Passed on 2026-10-29** | Rerun in os-arena after status/audit updates. |
| Deadline ingress/body-delay race | **Passed in current run** | Standalone regression and integrated DB route suite pass; late ingress is rejected. |
| Origin scheme+host rejection | **Passed in current run** | Unit/CSRF tests accept legitimate same-origin and reject scheme mismatch; deployment origin remains same-origin with API. |
| Incomplete/aborted body ticket cleanup | **Passed in current run** | Standalone tests cover abort and body timeout; backend tests cover bounded durable ticket cleanup. |
| Stale snapshot cannot regress UI phase | **Passed in current run** | Standalone UI-state regression confirms stale READY cannot overwrite PLAYING and session change resets version guard. |
| Manual host + guest solve + refresh + rematch | Reported successful | Useful smoke evidence; not a substitute for automated browser E2E. |
| Twitch external message | Not observed | Not an Arena MVP gate. |
| Backend `npx vitest run src/routes/__tests__/arena.routes.test.ts src/lib/__tests__/feature-flags.test.ts src/middleware/__tests__/csrf.middleware.test.ts` | **51 passed, 0 failed** on 2026-10-29 | Current isolated Orbace worktree. Covers default-off, allowlisted host, ownership, public redaction, same-origin and scheme mismatch, solve deadline/ticket handling. |
| Backend `ARENA_TEST_DATABASE_URL='postgresql://arena@127.0.0.1:55432/arena_app?schema=public' npm test -- --reporter=dot` | **2,073 passed, 6 skipped** on 2026-10-29 | Full Orbace `backend/org-api` suite; 154 files passed, 1 skipped. Includes PostgreSQL-backed route journey and real same-origin browser test. The first attempt used the wrong local DB role; rerun with the verified role passed. |
| Backend `DATABASE_URL=<local placeholder> npx prisma validate` / `npx prisma generate` | Passed | No configured DB or credentials read; fake URL used for schema-only commands. |
| Backend `npx tsc --noEmit` / `npm run build` | **Passed on 2026-10-29** | Isolated Orbace backend worktree. Targeted ESLint is unavailable because this backend package has no ESLint 9 `eslint.config.*` file. |
| Arena migrations in disposable PostgreSQL | **Applied successfully; five tables RLS enabled, zero policies** | Temporary cluster under `/private/tmp`; migrations were not applied to an Orbace environment. `prisma db pull --print` confirmed model/column mappings. |
| Prisma row-lock concurrency probe | **Passed** | Two concurrent `SELECT ... FOR UPDATE` transactions serialized and both version increments applied once (final version 3) on the disposable database. |

## 6. Definition of done per phase

Every phase update must record:

1. Status and date.
2. Files/modules changed.
3. Acceptance criteria met and evidence.
4. Exact test commands and pass/fail counts from the current worktree.
5. Security/privacy assertions added or run.
6. Known gaps, blockers, and decisions needed.
7. Next action and whether the phase exit gate is met.

A phase may be marked `COMPLETE` only when its exit gate in `ARENA_EXECUTION_PLAN.md` is met. A report that code exists is not sufficient. A test that was not run in the current worktree must be marked “reported, not rerun.”

## 7. Immediate next step

**Current next gate:** complete the reviewable Phase 4 readiness package on Issue #7, then stop at the first authorization boundary. Do not configure a real host, use a shared/staging database, deploy, or enable Arena. Keep `ARENA_ENABLED=false` and preserve the dirty Orbace/os-arena worktrees.


## 8. Milestone / status-change log

| Date | Milestone | Status | Evidence / decision | Next action |
|---|---|---|---|---|
| 2026-10-28 (reported) | Existing-flow audit / Issue #3 | Baseline completed | `docs/FRONTEND_BACKEND_TWITCH_FLOW.md` reported created locally; preserve it and verify its actual worktree presence before relying on it. | Reuse findings; do not repeat broad audit. |
| 2026-10-29 (reported) | Issue #4 standalone MVP | Prototype delivered; review-ready report | Host/audience/overlay, preset voting, timed solve, full-board validation, result/rematch; prototype test and manual browser results are reported in Issue #4. | Treat as prototype evidence, not production integration. |
| 2026-10-29 | Revised plan and tracker prepared | Ready for handoff | Phase 0 is explicitly a completed baseline plus bounded delta checks; Phase 1 is the next delivery phase. | Place these docs under the local `os-arena/docs/` folder and start Codex Issue #5. |
| 2026-10-29 | GitHub Issue #5 created | Queued (`chat-request`) | https://github.com/justinzero888/os-arena/issues/5 | User/Codex to start task; report worktree findings and proceed. |
| 2026-10-29 | Issue #5 M0 — worktree protection | **COMPLETE** | Arena branch `feat/arena-mvp`; preserved all pre-existing tracked/untracked work. Sibling Orbace branch `claude/supu-library-phase1-2` contains unrelated edits and was inspected read-only. | Complete bounded delta only. |
| 2026-10-29 | Issue #5 M1 — bounded integration evidence and decisions | **COMPLETE** | Added `docs/ARENA_INTEGRATION_AUDIT.md` and `docs/ARENA_INTEGRATION_DECISIONS.md`; Phase 0 bounded gate met. Evidence identifies canonical auth, Prisma/Postgres/RLS/transaction conventions, private-validator boundary, and existing E2E commands. No tests run in this milestone. | Continue into Phase 1 M2; establish Arena-local browser E2E using the existing local slice. |
| 2026-10-29 | Issue #5 M2 — local vertical-slice browser coverage | **COMPLETE** | Added `@playwright/test` as a dev dependency and an Arena-owned E2E server/config/spec. `npm run arena:e2e`: 2 passed (flag-off browser request; host + guest vote, server-driven transition, solve/result, host authorization boundary, and public payload redaction). Documented setup in README. | Run M3 syntax, Node regression, handoff, E2E, and diff checks; retain Phase 1 as partial if integration exit gate is not met. |
| 2026-10-29 | Issue #5 M3 — local verification | **COMPLETE; Phase 1 remains PARTIAL** | `npm run check` passed; `npm test` passed 36/36; `npm run handoff:test` passed 4/4; `npm run arena:e2e` passed 2/2; `git diff --check` passed. Verified `.env.example` keeps `ARENA_ENABLED=false`. Browser artifacts are outside the repository under `/tmp/os-arena-playwright-results`. | Maintain `codex-working`; application auth/persistence integration gates remain. |
| 2026-10-29 | Issue #5 M4 — isolated Orbace backend integration | **PARTIAL pending integrated DB/browser evidence** | Added Arena Fastify routes, feature flag/host allowlist, Prisma models, Prisma + RLS migrations, transaction row locks, ingress-ticket solve coordination, exact Origin/CSRF, guest vote hash cookie, and public redaction tests on local branch `codex/arena-phase1-integration`. Earlier focused and full suites passed. Dirty primary Orbace checkout remains unchanged. | Use disposable full-schema DB and integrated browser journey to close M5. |
| 2026-10-29 | Issue #5 M5 — full-schema persistence and integrated browser journey | **COMPLETE; Phase 1 exit gate met** | Applied all 48 checked-in Prisma migration directories, including Arena, and the Arena RLS companion only to disposable local PostgreSQL. Verified RLS on five Arena tables with zero client policies. Opt-in integration tests seed `PuzzleDaily`, execute persisted route operations, and use a real same-origin Puppeteer browser; full suite: 2,073 passed/6 skipped, 154 files passed/1 skipped. Backend `npm run build` passed. Standalone os-arena: `npm run check`, `npm test` (36/36), `npm run handoff:test` (4/4), `npm run arena:e2e` (2/2), and `git diff --check` all passed. Confirmed `.env.example` retains `ARENA_ENABLED=false`. Dirty primary Orbace and os-arena work preserved; no shared DB/deploy/push/commit/merge. | Mark Issue #5 `codex-review`. Real pilot host ID, Orbace UI mount, shared migration approval, and deployment are future authorized rollout gates. |

## 9. Phase update template

Append a row to the milestone log and update the relevant phase row whenever Codex completes a meaningful milestone. Include the current branch/worktree status, exact files changed, exact commands run, pass/fail counts, security/privacy checks, blockers, and next action. Tests from an earlier report must remain labeled **reported, not rerun** until executed in the current worktree.

A phase is **COMPLETE** only when its plan exit gate is met. If code is present but a gate is not met, use **PARTIAL**. If work is waiting to be picked up, use **QUEUED**. If a material safety/architecture decision prevents safe progress, use **BLOCKED** and state the specific decision needed.

## 10. Issue #5 review preparation — 2026-10-29

This update supersedes the earlier M4/M5 test snapshots. The implementation agent prepared the code for independent review and fixed concrete local findings; it has not independently approved its own work.

| Criterion | Result | Evidence |
|---|---|---|
| Evidence/API/security register | PASS | Updated audit/decisions and `ARENA_PHASE1_REVIEW.md`; implemented routes distinguished from future rematch/strike/UI work. |
| Authorization, guests and Origin/CSRF | PASS | Actual canonical session cookie, allowlist, CSRF and rate-limit middleware in separate host/guest browser contexts. No real pilot account used. |
| Privacy, including failures | PASS | Explicit projections, no-store replies and generic error response; injected solution-bearing exception redacted. |
| Durable state, concurrency and solve coordination | PASS | 12 concurrent votes produce one vote and gap-free event versions; delayed auth/complete adjudication, abort/close/timeout and exact/late deadline regressions; expired orphan ticket tested in PostgreSQL. |
| Prisma migration and RLS | PASS | RLS enabled inside CREATE transaction; five tables protected before companion SQL; granted non-owner reader sees zero private round rows. |
| Flag OFF and safe repeatable browser slice | PASS | Default remains false; real cookie-auth host/anonymous guest API browser flow and standalone flag-off tests pass. Production UI is not mounted. |
| Reviewable local diff and work preservation | PASS | Exact base SHA, complete tracked/untracked patch and source hashes; original primary checkout and unrelated os-arena files retained. |
| Independent reviewer approval | BLOCKED | A separate reviewer must review the exact bundle; publication also awaits explicit user authorization. No label approval granted. |
| Pilot readiness | NEEDS FIX / BLOCKED | Separate checklist records UI/gameplay work and host, DB-owner, privacy and release decisions. |

Final verification: `bash scripts/arena-review-postgres.sh /Users/justinzero/.codex/worktrees/orbace-arena-phase1 <evidence-directory>` passed. Internally: Prisma validate/generate, all 48 migrations, RLS inspection, `npm run build`, and `ARENA_TEST_DATABASE_URL=<disposable-loopback-URL> npm test -- --reporter=dot`: **2,089 passed, 6 skipped; 155 files passed, 1 skipped**. Route tests: **22**; new real-auth/PostgreSQL security tests: **6**; original DB/browser tests: **2**. Temporary PostgreSQL is removed on success/failure. `npm run check`, `npm test` (**36/36**), `npm run handoff:test` (**4/4**), `npm run arena:e2e` (**2/2**), `bash -n scripts/arena-review-postgres.sh`, and scoped `git diff --check` passed. Existing unrelated whitespace in the dirty primary checkout was preserved; its content was not copied to the review bundle.

Review corrections: pre-auth ingress capture and bounded body budget; session-locked ticket registration; timer ends when body parsing completes; adjudication cleanup guard and bounded transaction/lease; inline atomic RLS; sanitized ORM errors; command-type idempotency binding and strict UUID paths; actual limiter runs before early solve rejection; real canonical-session/CSRF/rate-limit/browser/RLS tests. Prior test-double browser proof remains as a separate test and is no longer the only integration evidence.

Milestone M6: **review package ready; independent approval pending**. Code/migrations/tests remain local and uncommitted/unpushed. No primary Orbace files, production settings, real credentials, shared database, deployments, commits, pushes or merges were changed. Issue #5 stays open in `codex-review`.

## Phase 3 approval and owner-directed Phase 4 — 2026-10-29

Phase 3 / Issue #6 is independently approved (`chat-approved`); the independent reviewer recorded approval in comment 6506971946. Phase 4 here means pilot readiness and controlled local/staging validation, as directed by the owner, and maps to the execution plan's former Phase 7. Issue #7 is open as `codex-working`. This re-sequencing does not imply that any shared, staging, production, or pilot action is authorized.

### Phase 4 M0/M1 — protection and readiness evidence

- Preserved the existing os-arena branch `feat/arena-mvp` at HEAD `7cb341f1e54161a1b1f0713a719707e49ddf5d31`, tracking `origin/feat/arena-mvp`. Initial `git status --short --branch` was: `M docs/ARENA_INTEGRATION_AUDIT.md`, `M docs/ARENA_INTEGRATION_DECISIONS.md`, `M docs/ARENA_PROJECT_STATUS.md`, `M scripts/arena-review-postgres.sh`, `?? AGENTS.md`, `?? docs/ARENA_ISSUE5_CHECKPOINT.md`, `?? e2e/Orbace_Arena_Phase3_Review_2026-10-29.zip`, and `?? e2e/Orbace_Arena_Phase3_Review_2026-10-29.zip.sha256`. No checkout cleanup, reset, or stash occurred.
- The isolated Orbace integration worktree remains dirty on `codex/arena-phase1-integration`; all pre-existing Phase 1–3 files were left intact. No changes were made there.
- `.env.example` has `ARENA_ENABLED=false` and an empty host allowlist. The Orbace flag parser accepts only exact `ARENA_ENABLED=true`; the allowlist returns empty when unset. No `.env` contents were read.
- Private supply uses the `ArenaPuzzleSupply` table; selection requires `eligible=true`, rejects matching records in public daily/pool/pack routes, and has no public-catalog fallback. No supply seed/catalog was found. Integration tests create disposable fixtures; real supply volume, source rights, and difficulty approval are not established.
- See `ARENA_PILOT_READINESS.md` for PASS / NEEDS FIX / BLOCKED classifications and owner actions. The shared DB, real host, deployment origin/proxy, privacy retention, rollback, staging smoke and pilot launch are still gated.

### Phase 4 M3 — current local test results

| Command | Result |
|---|---|
| `npm run check` | PASS; all JavaScript syntax checks completed. |
| `npm test` | PASS; 39 tests, 0 failures. Initial sandbox attempt could not bind loopback; rerun with local test authorization passed. |
| `npm run handoff:test` | PASS; 4 tests, 0 failures. |
| `npm run arena:e2e` | PASS; 2 browser tests, including flag-off and host/guest lifecycle with privacy projection. Initial sandbox attempt could not bind loopback; authorized loopback rerun passed. |
| `npx --no-install vitest run src/routes/__tests__/arena.routes.test.ts src/lib/__tests__/feature-flags.test.ts src/middleware/__tests__/csrf.middleware.test.ts --reporter=dot` (Orbace backend) | PASS; 3 files, 68 tests, 0 failures. Covers flag-off, auth/allowlist, Origin/CSRF and body-ticket cleanup. |
| `PATH="/opt/homebrew/bin:$PATH" bash scripts/arena-review-postgres.sh /Users/justinzero/.codex/worktrees/orbace-arena-phase1 /private/tmp/os-arena-phase4-evidence` | PASS; fresh disposable Postgres, all 48 migrations, Prisma validation/generation/build, six Arena tables RLS-enabled, full backend 155 files passed/1 skipped; 2,097 passed/6 skipped. Included 11/11 PostgreSQL/browser integration tests. Script removed its temporary database. |
| `git diff --check` | PASS before readiness-document edits; rerun after edits before completion. |

### Current milestone and boundary

Local readiness evidence is updated; no implementation changes or production/shared actions were made. The first genuine authorization boundary is reached: DB owner review/application, product-approved real puzzle supply and source rights, an explicitly approved host identity, operations-approved staging origin/proxy and credentials, privacy/retention acceptance, and an authorized staging smoke target are required before the corresponding checks can occur. The next safe milestone is owner decisions and environment-specific approvals; do not move Issue #7 to review until the readiness artifacts and final diff check are complete.

## Phase 4 M2 continuation — approved Preview target and remaining gates (2026-10-29)

The owner explicitly superseded the earlier Preview database selection: use Supabase project `orbace-sudoku-zerotap-test` (ref `cjimlozschaolqqsqksu`) for Arena staging. The owner also decided that the three ballot presets are time modes and every mode selects only from Extreme puzzles. These decisions supersede the older `vzpqsfpdktcnkkrcxzfj` target and any Easy/Medium/Hard puzzle-supply interpretation; no gameplay expansion was made.

Read-only checks against the newly approved target confirmed it is `ACTIVE_HEALTHY`, reachable, and currently has no public application tables, `_prisma_migrations` table, Arena tables, or Arena RLS policies. No SQL writes, migrations, seeds, or Auth/Storage changes were made. `justinzero-preview` remains suspended. Fly exposes a `DATABASE_URL` secret name, but its target cannot be verified while the machine is stopped without starting an app whose boot process can run Prisma migrations. Backup/recovery capability is also not confirmed. Therefore no Preview restart or mutation has occurred. The prior Vercel Preview environment check found no configured variables.

The current isolated Orbace worktree rerun is newer than the preceding M3 evidence: Prisma validation/generation, all 49 migrations, RLS verification, build, and the full backend suite passed (**2,344 passed, 6 skipped**); the Arena PostgreSQL/browser integration journey passed; frontend smoke and Preview routing tests passed; the Extreme time-mode selector tests passed. Evidence is in `/private/tmp/orbace-arena-phase4-final3-evidence`, `/private/tmp/arena-phase4-extreme-frontend-smoke.log`, and `/private/tmp/arena-phase4-preview-routing.log` (where available). `git diff --check` must be rerun after this status update.

**Puzzle intake update:** the owner supplied 20 81-character digit strings. Orbace `validateGivens` and `rateDifficulty` classify 16 as consistent, uniquely solvable, and Extreme (indices 1–8, 11, 13–17, 19–20); indices 9, 12, and 18 have conflicting givens, and index 10 has multiple solutions. The four rejected boards are not seedable; corrected/replacement strings are needed for a full 20-board set. No raw puzzle strings were added to the repository or GitHub.

**Still blocked:** the Fly secret target and shared-project migration/recovery path need safe verification; Team Mobile coordination is not recorded; the throwaway Instant Identity host `sub` does not yet exist; and Preview/Vercel configuration and smoke have not been applied. Issue #7 remains `codex-working`; no independent review package or staging success is claimed. `ARENA_ENABLED=false` remains the default.

A final read-only check positively identified Fly app `justinzero-preview` at `justinzero-preview.fly.dev`; the app is `suspended` and both `ord` machines are `stopped`. Supabase project-list metadata confirms `orbace-sudoku-zerotap-test` (`cjimlozschaolqqsqksu`) is `ACTIVE_HEALTHY` in `us-west-2`. The API health endpoint is not currently verifiable while Fly remains stopped.

### Phase 4 M2 — current-main reconciliation (2026-10-29)

Rebased isolated Orbace branch `codex/arena-phase4-preview` from prior base `961084c2` onto current local `origin/main` at `9f4d4a54`. The upstream delta consists only of two Phase 4 shared-artifact documentation commits. A temporary stash protected the complete staged/unstaged/untracked worktree; it was restored after the rebase, and the previous index split was restored from the stash index tree. Final status remains intentionally dirty with the same Arena implementation plus the explicit `ARENA_ENABLED=false` template line. No commit, push, merge, or deployment occurred.

### Phase 4 evidence review — shared staging project and instruction precedence (2026-10-29)

The newly available Orbace team response and appendix are treated as technical evidence/recommendations, not as additional owner authorization. The direct owner decisions remain controlling: use the existing `justinzero-preview` app and selected `cjimlozschaolqqsqksu` database; use the bare `ARENA_ENABLED` flag; use the owner-approved Vercel same-origin approach; allowlist the authenticated `sub`; and use the 16 validated owner-supplied Extreme boards; four invalid inputs are excluded. Therefore the team document’s suggested new Fly app, `FLAG_ARENA_ENABLED`, generated 12–20 puzzle mix, and `playerId` allowlist do not replace those decisions.

The team response establishes that the selected Supabase project is shared with Zero-Tap and may contain Auth/passkey configuration even though read-only SQL found no public application tables. Do not reset the project, touch Auth/passkey/RP settings, or assume the project is disposable. The response says baseline `prisma migrate deploy` runs on container boot, which means starting the current backend may apply all 49 checked-in Prisma migrations, not only the Arena migration. The exact shared-project migration order and Team Mobile coordination remain unconfirmed. Although the team response recommends no backup for an empty project, the owner’s earlier staging authorization specifically required backup/recovery verification; that guard remains unresolved because the selected project is shared.

Authenticated Fly status resolved the response’s stale/ambiguous 404 probe: the existing `justinzero-preview` app still exists but is suspended with stopped machines. No new Fly app is being created. The code continues to use the owner-directed `AuthenticatedUser.sub`; staging must verify the chosen throwaway account’s actual authenticated `sub` before setting the allowlist.

### Phase 4 Preview checkpoint — 2026-10-30

Owner reported shared Auth post-check PASS; Preview Auth count is 4 and the single approved host UUID exists. The current migration ledger has 48 matching checksums and one pending Arena migration, with no failed or unexpected migrations. Read-only inspection found `public._prisma_migrations` has RLS disabled and SELECT grants for both `anon` and `authenticated`; this differs from the stated zero-table RLS baseline. No Arena migration or tables were applied. A Preview integration image was deployed with Arena disabled, but machines remained stopped; the prior image `deployment-01M653CP6FPJKQTPNSQP70C1R7` was restored to prevent automatic migration on restart. Both machines point to the prior image. The Preview host allowlist and disabled flag were configured. Frontend Preview target guard was updated to the owner-approved project; `npm run test:phase4-preview-routing` passed. Staging E2E, supply seed, security validation and independent review remain blocked pending database-owner disposition of the existing ledger exposure. No Zero-Tap/Auth configuration was changed.

### Phase 4 Preview checkpoint — shared security remediation and staging setup

Owner reported Auth configuration unchanged and Team Mobile remediated the migration-ledger RLS/grants. Read-only verification: 0 public tables without RLS; ledger RLS on, anon/authenticated SELECT denied; 48 migration checksums matched; auth.users 4. Applied reviewed `20261029130000_arena_pilot` with atomic RLS and `020_rls_arena_pilot.sql`; observed 49 completed migration rows, six RLS-protected Arena tables, no public tables lacking RLS, no Arena RLS policies, auth.users 4. Seeded 16 validated Extreme puzzles in a guarded transaction rejecting existing supply and public puzzle collisions. Anon role saw zero rows in private supply and sessions. Preview health HTTP 200; Arena flag-off HTTP 404; runtime confirmed flag false and approved host UUID allowlist. Vercel Preview deployed after correcting frontend copy into child directory and updating the authorized project guard; `npm run test:phase4-preview-routing` and a disposable frontend build passed. Vercel CLI generated a project deployment-protection bypass token for authenticated smoke; token is not recorded here. Actual Preview path returned 404 for flag-off through `vercel curl`. Full staging browser E2E, flag-on/security/rollback validation, teardown coordination, and independent review remain incomplete; Issue #7 remains in codex-working.

### Phase 4 live validation checkpoint — 2026-10-30

Protected Vercel Preview browser runs passed host authentication and session creation, anonymous audience voting, round start, pause/resume, strike and time penalty, authoritative solve/shared result, fresh-puzzle rematch, and cancellation. Live negative checks passed anonymous/non-allowlisted host rejection, Origin and missing-CSRF rejection, wrong session, stale version, invalid/late solve, private public-route lookup isolation, simultaneous start, solve/cancel and rematch, and idempotent start retry. An aborted partial request left no ticket; the Preview proxy buffered it, so no live in-flight ticket was observed. A delayed complete request similarly arrived at the server after the deadline and was rejected; backend in-flight ticket handling remains covered by deterministic local tests.

The initial parallel disposable PostgreSQL suite had two failures from overlapping Arena puzzle fixtures. A targeted Vitest configuration serializes test files only when `ARENA_TEST_DATABASE_URL` is set; the normal full disposable run passed 2,344 tests, 6 skipped. Focused backend: 82 passed; standalone: 39 passed; handoff: 4 passed; standalone browser: 2 passed; Preview routing/build regression passed. `git diff --check` passed in both repositories. Arena is disabled, Preview health returned 200 and the protected Arena endpoint returned 404. The validation-generated Vercel automation bypass was revoked; SSO protection was unchanged. Latest DB: 49 migrations, no failed migrations, six Arena RLS tables, zero public tables without RLS, ledger SELECT denied to anon/authenticated, 16 eligible Extreme boards, auth.users 4.

[Team Mobile pre-teardown notice](https://github.com/justinzero888/os-arena/issues/7#issuecomment-6515287600) was posted; delivery to a Team Mobile channel is unconfirmed. Arena-only cleanup and test Auth user deletion are deferred pending coordination; final protected Auth configuration hash comparison requires the owner/Team Mobile private snapshot. Automatic approval review rejected a subsequent temporary authentication-helper upload, citing unverified payload and exposure risk; no fresh raw E2E rerun was recorded after that rejection. Issue #7 remains codex-working and independent-review handoff is not complete.

### Phase 4 Arena-only cleanup — 2026-10-30

Following the notice at https://github.com/justinzero888/os-arena/issues/7#issuecomment-6515287600, deleted 19 Arena sessions for the designated throwaway host and cascaded their Arena-owned operational data; no other host sessions existed. Deleted exactly that one Auth identity via the verified Preview Auth admin endpoint; auth.users returned from 4 to 3 and the identity is absent. No player account was associated with it. Final read-only check: Arena sessions/rounds/votes/events/ingresses all 0; 16 approved eligible Extreme supply records remain; 49 completed migrations, no failures; all six Arena tables protected; zero public tables without RLS; migration ledger inaccessible by anon/authenticated SELECT. Anon Data API checks: ledger HTTP 401 and private supply HTTP 200 with zero rows.

Removed the Arena-only Fly host/origin settings and the two Preview build environment variables. Arena remains off; Preview health HTTP 200. A fresh protected Preview browser check after cleanup observed Arena health HTTP 404 and disabled create/join controls. Its temporary automation bypass was revoked afterward and Vercel SSO settings were unchanged; sanitized raw output is at `/private/tmp/arena-phase4-final-postcleanup-browser.log`. Earlier observed host/audience, strike, solve, rematch and cancellation runs are correlated in the draft evidence; no new shared-machine helper was uploaded for final browser evidence.

[Final Auth comparison requested](https://github.com/justinzero888/os-arena/issues/7#issuecomment-6520796252): Team Mobile/owner must compare their private post-cleanup configuration snapshot with baseline hash `5424067b31a5c2fe08a12c40bd9d42b71a088a593dd4835c8c4c93ddf3e3256f`. This comparison is pending. Issue #7 remains open, codex-working; no builder PASS or independent-review handoff has been declared.

### Phase 4 final Auth gate — 2026-10-30

The owner confirmed FINAL AUTH GATE PASS: the post-cleanup private Auth configuration SHA-256 matches `5424067b31a5c2fe08a12c40bd9d42b71a088a593dd4835c8c4c93ddf3e3256f` and all protected Auth/passkey settings remain unchanged. The snapshot remains privately held by the owner/Team Mobile. The owner accepted the documented Preview proxy buffering limitation, with deterministic backend ingress/ticket tests retained. The previously issued Team Mobile issue notice is the recorded delivery evidence; no claim of human-read receipt is made. The builder is preparing the final independent-review bundle; independent approval is pending.

### Phase 4 final review attachment checkpoint — 2026-10-30

The owner confirmed the final Auth gate PASS. The new final review ZIP was generated and its 60-entry manifest verified; SHA-256 `d68eff614d92a7eb3a3c1e0d0e46c97103b6c1ebdcb77ea08e5cc53b12ebdb2d`. The earlier reviewer conversation received the draft as a user attachment; the new final ZIP has not yet been verified attached or readable there. Issue #7 remains codex-working until the final ZIP accessibility gate is confirmed. Evidence and exact delivery limitation: https://github.com/justinzero888/os-arena/issues/7#issuecomment-6521768434. No independent approval or production authorization is inferred.

### Phase 5 M1 — read-only production assessment and planning, 2026-10-30

Issue #8 is open in codex-working. The production readiness plan, proposed operating model and staged release/rollback runbook are in `docs/ARENA_PHASE5_PRODUCTION_READINESS.md`. Production check found no Arena tables or Arena variables; 48 completed migration rows and one rolled-back attempt, with one completed migration checksum differing from current reviewed source. The database owner must reconcile this history and actual schema before any production mutation. All public tables had RLS at inspection; anon ledger query returned zero rows despite existing SQL SELECT grants. Pilot host and kill-switch owner, audience/window, monitoring thresholds, production supply rights and readiness remain owner decisions. Production/pilot is NO-GO. No production state was changed.

### Phase 5 M2 — release-plan review package, 2026-10-30

Read-only production assessment and proposed staged runbook are complete for review, with explicit NO-GO and owner/DB-owner decisions still open. No production operation was performed. A local review ZIP was created at `Orbace_Arena_Phase5_Preparation_Review_2026-10-30.zip`; SHA-256 `d25d1198a497523e353762f87f66d90d99616fa23d46b900cd05851e1be0cc61`, 11 manifest entries verified. Reviewer attachment/access has not yet been confirmed, so Issue #8 remains codex-working. `git diff --check` and `git diff --cached --check` passed; no application tests were rerun for this documentation-only phase.

### Phase 5 owner planning selections — 2026-10-30

The owner nominated the first host account and selected a supervised 60-minute pilot with up to 20 invited viewers. The nominated account is recorded in the local Phase 5 readiness plan; production identity verification and allowlisting remain separately gated. Kill-switch authority was not separately named and must be confirmed. No production mutation was authorized.

The revised Phase 5 review package incorporates the owner-nominated first host and 60-minute / 20-viewer planning limits. It supersedes the initial package; SHA-256 `9a6a6465de5f4545127f9cbb46acfad15cf00fedcf1e042cc8f007970b2607ee`, 11 manifest entries verified. Kill-switch authority remains to be confirmed; reviewer access is unverified, so Issue #8 remains codex-working.
