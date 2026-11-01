# Issue #5 acceptance checkpoint

**Date:** 2026-10-29

This checkpoint records the agreed stopping boundary for Issue #5. The issue
is ready for independent review; it is not approved for release, shared
database migration, host configuration, or pilot enablement.

## Findings and evidence

| Finding | Classification | Evidence |
|---|---|---|
| Direct stored-answer lookup through a public puzzle identifier | **Resolved locally** | `backend/org-api/src/routes/arena.routes.ts:91-110` omits `puzzleId` from projections. `arena.review.postgres.integration.test.ts:144-155` starts a private-supply round and verifies `GET /puzzles/<supply-id>` is 404 and does not contain the answer. |
| Selection of future, scheduled, or public official puzzles | **Resolved locally** | `arena.routes.ts:296-327` selects only explicit `ArenaPuzzleSupply` rows and rejects daily/pool/pack collisions. `arena.review.postgres.integration.test.ts:157-172` proves a scheduled official Daily collision produces 409 and its existing lookup still withholds the answer. |
| Private supply persistence and default-deny access | **Verified locally** | `prisma/schema.prisma:927-938` defines the private supply; `prisma/migrations/20261029130000_arena_pilot/migration.sql:82-100` creates it with RLS. The disposable PostgreSQL run applied 48 migrations and verified RLS with zero Arena client policies. |
| Host authorization, Origin/CSRF, deadline and concurrency behavior | **Verified locally** | Existing Arena route and browser regressions passed in the fresh disposable PostgreSQL run. The full test suite result was 2,091 passed, 6 skipped. |
| Guest cookie vote stuffing | **Accepted risk / deferred** | `docs/issues/ARENA-ISSUE-001-guest-vote-stuffing.md` documents the bounded pilot risk and requires a PM decision before a stronger identity model is added. |
| Eight-board rematch repetition | **Accepted risk / deferred** | `docs/issues/ARENA-ISSUE-002-small-puzzle-bank.md` documents the small-bank limitation and its PM options. |
| Shared migration/RLS owner approval, real host allowlisting, product UI mounting, pilot operation | **Blocked** | These require separate owner and deployment authorization. No shared database, host, UI mount, or production configuration was changed. |
| Independent acceptance review | **Blocked** | Issue #5 is labeled `codex-review`. The implementation agent does not self-approve. The revised package is at `/Users/justinzero/Documents/Codex/2026-10-29/issue-5-remediation-review/`. |

## Required checks performed

| Command | Result |
|---|---|
| `npm run check` | Passed |
| `npm test` | 39 passed |
| `npm run handoff:test` | 4 passed |
| `npm run arena:e2e` | 2 passed |
| `bash scripts/arena-review-postgres.sh …` | 48 migrations applied; backend build passed; 2,091 passed, 6 skipped |
| `git diff --check` | Passed in the changed worktrees |

## Completion declaration

**Issue #5: BLOCKED for final approval.** The agreed local remediation and
verification boundary is **PASS**. Final completion remains blocked on a new
independent review and the separately authorized pilot-readiness gates listed
above. No automatic follow-on work is authorized from this checkpoint.
