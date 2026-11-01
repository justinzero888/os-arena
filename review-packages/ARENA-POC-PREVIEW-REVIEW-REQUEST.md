# Independent Review Request — Arena POC Preview

**To:** Independent reviewer (ChatGPT)  
**From:** Builder (Codex)  
**Status:** `codex-review` / READY FOR INDEPENDENT REVIEW  
**Requested outcome:** `INDEPENDENT REVIEW PASS` or `NEEDS FIX` with concrete findings.

## 1. Candidate identity

| Item | Value |
|---|---|
| Candidate commit | `3f97269e3a4c1446f478a35fbf1a261617f0f2e9` |
| Baseline commit | `3d5f0d331b1edf1bd942a9e3142de7bd6ea00d09` |
| Tag | `arena-poc-preview-2026-10-31` |
| Branch | `codex/arena-phase4-preview` |
| Isolated worktree | `/Users/justinzero/.codex/worktrees/orbace-arena-phase4-preview` |
| Candidate state | Local commit only; worktree clean; no push, merge, production deploy, or production DB change |

The candidate commit is the exact tree that produced the final Preview backend deployment. The Preview frontend deployment was built from the same source tree before the final voter-key hardening; the voter-key change is backend-only. The committed tree matches the working tree that was deployed.

## 2. Package contents

| Path | Contents |
|---|---|
| `REVIEW_REQUEST.md` | This request. |
| `CANDIDATE.txt` | Candidate/baseline/tag/branch/worktree. |
| `implementation.patch` | Complete binary-safe diff from baseline to candidate. |
| `CHANGED_FILES.md` | Full status/purpose inventory. |
| `docs/ARENA_POC_PREVIEW_EVIDENCE.md` | Preview execution evidence and caveats. |
| `docs/evidence/arena-poc-preview-e2e-2026-10-31.json` | Three-voter + anonymous + solve + rematch browser evidence. |
| `source/` | Arena auth/voting/gameplay/host/projection/puzzle-supply/RLS source snapshots. |
| `tests/` | Arena unit, PostgreSQL integration, review integration, flag/CSRF/retention/routing tests. |
| `test-results/full-backend.log` | Full backend suite: 2,346 passed / 6 skipped. |
| `test-results/arena-focused.log` | Arena-focused suite: 84/84. |
| `test-results/tsc.log` | `npx tsc --noEmit`, exit 0. |
| `test-results/build.log` | `npm run build`, exit 0. |
| `test-results/frontend-routing.log` | Preview routing/build guards, exit 0. |
| `test-results/preview-api-smoke.log` | Deployed Preview API smoke, including 3 voters and repeat vote. |
| `SECURITY_PRIVACY_REVIEW.md` | Auth roles, trusted UUID derivation, host authorization, puzzle/public/overlay privacy, RLS, concurrency. |
| `PREVIEW_FINAL_STATE.md` | Preview final state and cleanup evidence. |
| `preview-final-state.log` | Raw final-state commands. |
| `MANIFEST.sha256` | SHA-256 of every package file except the manifest itself. |

## 3. Test-result summary

| Check | Result | Log |
|---|---|---|
| Full backend suite | **2,346 passed / 6 skipped** (169 files passed, 1 skipped) | `test-results/full-backend.log` |
| Arena-focused suite | **84 passed / 0 failed** (5 files) | `test-results/arena-focused.log` |
| TypeScript | `npx tsc --noEmit` exit 0 | `test-results/tsc.log` |
| Build | `npm run build` exit 0 | `test-results/build.log` |
| Frontend Preview routing | pass | `test-results/frontend-routing.log` |
| Preview API smoke | 3 distinct voters; repeat updates; `voteCount=3`; anonymous 401; voter-cannot-host 403; bad origin 403; public payload has no solution | `test-results/preview-api-smoke.log` |

The full backend and Arena-focused suites were run against a disposable local PostgreSQL 16 database with all 49 Prisma migrations plus the Arena RLS companion. RLS was enabled on all six Arena tables.

## 4. Preview evidence summary

- Host and three voters authenticated through the Preview Supabase project; three distinct votes produced `3 audience vote(s)`; a changed vote kept the count at 3.
- Anonymous viewer could watch; vote controls were disabled with `Sign in to Orbace to vote.`; host panel hidden.
- Ordinary voter could not host; start disabled.
- Host started the round; the audience board was read-only.
- Host submitted the stored supply solution; server returned `Host wins — solved before the deadline.`
- Public payload omitted the solution, `hostControls`, and `puzzleId`.
- Rematch created a new session; the full pass recorded the voter joining the fresh ballot and voting.
- The full five-context browser pass was recorded before the final voter-key hardening. After hardening, the Preview main flow passed again and rematch creation succeeded; the final ad-hoc rematch re-run hit Puppeteer background-tab/protocol flakiness in the harness. The post-hardening local mounted-page integration journey through rematch passed in the Arena-focused suite.

## 5. Security review summary

`SECURITY_PRIVACY_REVIEW.md` covers:

- server-verified Supabase bearer, signed Tier-1, and cookie identities;
- dual-credential conflict handling;
- canonical `PlayerAccount.id` voter key and one-vote-per-player upsert;
- deny-by-default host allowlist and session-ownership checks;
- exact Origin/CSRF behavior;
- eligible-only private puzzle supply, public-catalog exclusion, and fail-closed selection;
- public/overlay projection privacy (no solution, no `puzzleId`, no host controls; winning board null);
- authoritative solve/deadline/concurrency handling;
- RLS enabled with zero client policies and the Prisma server connection as the intended access path;
- Preview-only feature enablement and final cleanup.

No blocking security or privacy defect was found in the POC scope. Production-hardening follow-ups are listed in the review, including canonicalizing host allowlisting to `PlayerAccount.id` so host identity is transport-independent.

## 6. Review instructions

Please independently inspect the candidate diff, relevant source/tests, test logs, Preview evidence, security review, and final-state evidence. Return one of:

- **INDEPENDENT REVIEW PASS**; or
- **NEEDS FIX** with concrete, reproducible findings.

Do not treat the builder’s PASS as approval. Production deployment, shared DB/RLS application, commit/push/merge, and production enablement remain separate owner-controlled gates.

## 7. Delivery

The ZIP is delivered to the ChatGPT Project **“Orbace Sudoku Twitchcon Arena”** (`g-p-6ae23bca4730819183f10e4b0449e329`) under:

`review-packages/arena-poc-preview-3f97269e.zip`

The same ZIP and `REVIEW_REQUEST.md` are staged in the control repository under `review-packages/`. The project copy is the review delivery; the repository copy is for provenance.
