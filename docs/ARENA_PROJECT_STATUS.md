# Orbace Sudoku Arena — Project Status Tracker

**As of:** 2026-10-29  
**Project manager view:** Based on the existing audit, architecture v2.1, Issue #4 report, and most recent review summary.  
**Status legend:** `COMPLETE` = supported by recorded evidence; `PARTIAL` = useful work exists but exit criteria are not met; `NOT STARTED` = no phase delivery reported; `BLOCKED` = cannot proceed safely until named dependency is resolved.

> Status is evidence-based, not optimistic. The Issue #4 prototype is a standalone proof of concept; it does not mean the production integration phases are complete. Reported test results should be rerun in the current worktree before being treated as a fresh green build.

## 1. Executive summary

- **Phase 0 — Discovery baseline:** **COMPLETE for bounded delta.** Existing audit reused; auth, DB/RLS/transaction, validator, E2E, and worktree evidence recorded in `docs/ARENA_INTEGRATION_AUDIT.md`.
- **Issue #4 — Standalone MVP prototype:** **PROTOTYPE DELIVERED; review-ready report recorded.** This is not production integration.
- **Phase 1 — Integration foundation:** **COMPLETE for the defined backend/test vertical-slice exit gate.** The isolated Orbace worktree contains canonical auth plus fail-closed allowlisting, Prisma persistence/migrations/RLS, transactional state coordination, and registered routes. A disposable full-schema PostgreSQL-backed same-origin browser journey passed. The production Orbace UI is not mounted; the real host allowlist is unset and denies everyone. These are pilot/rollout prerequisites, not Phase 1 exit criteria.
- **Phases 2–7:** **NOT STARTED** as integrated delivery phases.
- **Production:** Feature flag must remain OFF; no deployment or production changes authorized.

## 2. Phase-by-phase status

| Phase | Status | Evidence / completed work | Remaining work / exit criteria | Next action |
|---|---|---|---|---|
| 0. Baseline discovery and delta verification | **COMPLETE — bounded checks** | `docs/FRONTEND_BACKEND_TWITCH_FLOW.md` reused. `docs/ARENA_INTEGRATION_AUDIT.md` records canonical auth, Prisma/Postgres and SQL/RLS/transaction patterns, server validator plus solution-leak hazard, browser commands, and current tree status. | No broad re-audit. Production implementation boundaries remain documented. | Proceed with Phase 1; keep Orbace checkout read-only. |
| Issue #4. Standalone MVP prototype | **PARTIAL — reported review-ready** | In-memory engine/server/UI; host/audience/overlay, preset voting, timed solve, server-side full-board validation, results, rematch. Reported hardening: ingress-timestamp deadline race handling, exact Origin check, disabled Start until READY, request-body abort/timeout ticket cleanup, stale snapshot guards. Latest reported checks: `npm run check`, `npm test` 36 passed, `npm run handoff:test` 4 passed, `git diff --check`; manual host+guest browser flow reported successful. | Re-run checks in current worktree. Keep in-memory/single-process limitations explicit. No persistent DB, multi-instance locking, production auth integration, integrated automated browser E2E, strike/pause/cancel/production hosting in the prototype. The Issue #4 label was not changed by the prior review. | Treat as reference implementation and acceptance baseline; do not overstate as production-ready. |
| 1. Integration foundation and vertical-slice design | **PASS in local test scope; independent approval pending** | Canonical cookie-auth host/allowlist, private DTO/error redaction, row-locked Prisma state, bounded solve tickets and atomic RLS are implemented in isolated branch `codex/arena-phase1-integration`, base `60b25fd3`. Latest review run: backend 2,089 passed/6 skipped, 155 files passed/1 skipped; schema validation/generation, 48 fresh migrations and build passed. Standalone: 36 Node, 4 handoff, 2 browser tests passed. Reviewable patch/source hashes and exact reproduction commands are in `ARENA_PHASE1_REVIEW.md`. | Separate reviewer has not approved the implementation. Real host ID, Orbace product UI, shared migration approval and pilot enablement remain separate readiness gates in `ARENA_PILOT_READINESS.md`. | Keep Issue #5 open in `codex-review`; review the exact local patch before any approval or publication. |
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

**Independent review is the next gate.** Inspect `ARENA_PHASE1_REVIEW.md` and the local patch/hash manifest. Local defects found during review preparation have been corrected and retested; independent approval remains pending. Use `ARENA_PILOT_READINESS.md` for later host/UI/database-owner/release gates. Keep `ARENA_ENABLED=false` and Issue #5 open in `codex-review`.


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
