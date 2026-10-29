# Issue #5 — Phase 1 review handoff

Date: 2026-10-29 (America/Detroit)

Status: local review package prepared; independent approval is pending. Issue #5 stays open with `codex-review`. This implementation inspection and the remediation were performed by the implementation agent; they do not constitute independent approval.

## Exact source under review

- Orbace repository remote: `https://github.com/justinzero888/orbace-sudoku-v2.git`.
- Isolated worktree: `/Users/justinzero/.codex/worktrees/orbace-arena-phase1`.
- Local branch: `codex/arena-phase1-integration`.
- Patch base: `60b25fd3c65631e1c39ac44d36d340001c08034b`.
- Arena support/docs repository: `/Users/justinzero/orbacetech/DevProjects/os-twitcharena`, branch `feat/arena-mvp`.
- Review bundle: `/Users/justinzero/Documents/Codex/2026-10-28/project-orbace-sudoku-arena-1-read/outputs/issue-5-review/`.

The bundle contains a complete Orbace patch including untracked implementation/test/migration files, a file manifest with SHA-256 values, the local DB runner, this report, and a separate pilot checklist. It contains no `.env`, account credentials, production configuration, or unrelated primary-checkout changes. Patch application is checked against a temporary reconstruction of the listed base files. No normal Git index, branch ref, commit, or remote is changed by preparing the bundle. Do not apply the patch over the dirty primary Orbace checkout.

## Findings and local corrections

| Finding | Correction and evidence |
|---|---|
| A completed solve could lose its ingress ticket when the body timer fired during later adjudication. Ingress was captured after asynchronous authentication. | Capture ingress before async auth/rate-limit work. Apply one 15-second total auth/registration/body budget. Register tickets while holding the owning session row lock. Clear the body timer at Fastify `preValidation` after the complete body has parsed. Disconnect cleanup retains adjudicating tickets; handler/response completion removes them once. Regression delays a complete pre-deadline solve past the former body timer while a deadline poll runs, then verifies HOST wins and cleanup occurs once. Separate exact-deadline/late cases reject the solve. |
| Lease lifetime did not explicitly cover bounded transaction waiting/adjudication. | Solve transactions use a 5-second pool wait and 10-second transaction limit; PostgreSQL session lock/statement waits are limited to 5 seconds. Durable ticket lease is 35 seconds from ingress, covering body budget, pool wait, adjudication, and margin. Timeout polls honor only eligible unexpired tickets after a 15-second deadline grace. An actual PostgreSQL test proves expired orphan leases stop blocking audience timeout. No transaction is held while a body streams. |
| Private Arena tables were created by Prisma before a separate RLS script ran. | RLS is now enabled on all five tables inside the same Prisma migration transaction as CREATE TABLE. The existing RLS companion remains safe to reapply. Fresh migration evidence shows protection before the companion; a granted non-owner role sees zero private round rows while the trusted backend sees them. No shared migration was changed/applied. |
| Default Fastify error responses could echo private values from an ORM exception. | Arena has a scoped generic error handler; unexpected failures return 503 without exception text. All Arena replies use `Cache-Control: no-store`. A forced exception containing the fixture answer is redacted in the regression. |
| Idempotency keys were accepted without checking command type. Malformed UUID-shaped paths reached PostgreSQL. | Start/solve replay checks bind to the expected event type. Solve retries can replay a terminal solved result without a new ticket. Strict UUID shape checks run before queries. Dedicated regressions cover command collision/replay and a malformed ID. |
| The real rate limiter ran after the solve onRequest hook, so early rejections bypassed it. | Invoke the existing plugin limiter before auth/DB work and disable its later automatic hook for this one route. The integration test initially reproduced the bypass; after correction a burst returns 429 with Retry-After and no ingress rows. |
| The original integrated browser proof mocked auth and did not install app CSRF/rate-limit hooks. | Added a separate test with actual Orbace session service, stored session cookie, canonical authenticate(), CSRF, rate limiting, Prisma, PostgreSQL, and separate host/anonymous browser contexts. All identities and cookies are synthetic local fixtures; no approved real host or Supabase account is used. |

## Criterion results

| Criterion | Status | Evidence / limit |
|---|---|---|
| Updated evidence and API/data/security decisions | PASS | Audit, decision register, status tracker, review report and pilot checklist updated. Implemented API is distinguished from planned rematch/strike/UI work. |
| Canonical host auth, allowlist, ownership and guest boundary | PASS | Real persisted Orbace cookie auth and CSRF in browser/API tests; anonymous host access 401, missing allowlist 403, wrong owner covered by route regressions. Real pilot identity approval remains separate. |
| Exact Origin and intended proxy scheme | PASS | Same-origin HTTP and trusted-proxy HTTPS accepted; scheme mismatch and cookie requests without Origin/CSRF rejected. Deployment must enforce the app's existing trusted proxy boundary. |
| Private solution/identity responses and errors | PASS | Public/host projections and injected ORM-error responses omit answer, host identity/cookie and guest hash. Host and guest cookies are not script-readable. No new public event-log route exists. |
| Durable state and transactional concurrency | PASS | Full-schema disposable PostgreSQL journey; 12 concurrent same-guest votes leave one vote row and 13 gap-free event versions. This is not a multi-machine/load certification. |
| Solve ingress, cleanup and bounded timeout coordination | PASS | Abort, premature close, timeout, delayed complete adjudication, delayed auth, exact/late deadline and exactly-once cleanup regressions; expired orphan lease checked against real PostgreSQL. |
| Migrations and RLS | PASS | Prisma schema valid/generated; 48 checked-in migrations apply to fresh local PostgreSQL; five tables protected before companion, zero client policies; restricted role cannot read private rounds. Owner approval is still required before shared application. |
| Default feature flag OFF | PASS | Unset/non-exact flags fail closed; enabled-only synthetic tests restore test environment. `.env.example` remains `ARENA_ENABLED=false`; no live flag/config changed. |
| Thin repeatable test/browser slice | PASS | Real cookie-auth host and separate anonymous guest exercise vote/READY/start/solve/result via registered backend routes. The page is a blank test harness, not the unimplemented Orbace product UI. |
| Regression checks | PASS | Exact final results below; six existing skipped tests remain skipped. |
| Reviewable diff and source identity | PASS | Local patch, base SHA, source hashes, apply check and manifest. No publication authorized/performed. |
| Existing work preservation | PASS | Changes restricted to Arena-owned docs/support and the isolated integration worktree. Primary Orbace and unrelated os-arena files were not edited/reset/stashed/staged. Existing unrelated primary-checkout whitespace was left untouched. |
| Independent approval | BLOCKED | A separate reviewer must inspect this exact patch/source manifest and record a decision. The implementation agent has not approved its own work. Remote diff publication requires explicit user authorization. |

## Reproduction and exact test results

Prerequisites already available locally: the existing Node/npm runtime and locked backend dependencies, PostgreSQL CLI binaries, and the existing Puppeteer/Playwright browser installations. For a fresh isolated checkout use the repository lockfile with `npm ci` in `backend/org-api`; do not copy the primary `.env` or change shared infrastructure.

From os-arena:

```sh
bash scripts/arena-review-postgres.sh \
  /Users/justinzero/.codex/worktrees/orbace-arena-phase1 \
  /private/tmp/arena-phase1-review-evidence
```

The script refuses an occupied port 55432, creates a fresh loopback-only database, validates/generates Prisma, applies all migrations, inspects RLS before reapplying the companion, builds, and runs:

```sh
ARENA_TEST_DATABASE_URL='postgresql://arena@127.0.0.1:55432/arena_app?schema=public' npm test -- --reporter=dot
```

Final result: **2,089 passed, 6 skipped; 155 files passed, 1 skipped**. Arena route regressions: **22 passed**; new canonical-session/PostgreSQL review file: **6 passed**; original PostgreSQL/browser integration file: **2 passed**. Prisma validate/generate, all 48 migrations, and `npm run build` passed. The runner removed its temporary database on exit. Logs are in the review bundle's `test-results/` directory.

Standalone os-arena commands rerun:

```sh
npm run check
npm test
npm run handoff:test
npm run arena:e2e
git diff --check
```

Results: syntax **PASS**; Node **36/36**; handoff **4/4**; Playwright **2/2**; tracked diff check **PASS**. The new shell runner also passes `bash -n`. Integrated-worktree diff and exported-patch whitespace checks pass. Markdown's existing two-space line breaks are intentional. These results do not approve production or certify the complete later-phase UI.

## Reviewer decision requested

Review authorization/ownership, private DTO/error projections, transaction/ticket lifecycle, RLS role assumptions, exact Origin/proxy handling and regressions against the patch/manifest. Record PASS / NEEDS FIX / BLOCKED per criterion and concrete evidence. Keep Issue #5 in `codex-review` until that separate review concludes; `chat-approved` has not been granted. Publication, pilot host selection, UI delivery, database-owner approval and release are separate actions described in the pilot checklist.
