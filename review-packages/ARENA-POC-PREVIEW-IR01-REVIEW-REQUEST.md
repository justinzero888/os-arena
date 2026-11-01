# Independent Re-Review Request — Arena POC POC-IR-01 Remediation

**To:** Independent reviewer (ChatGPT)  
**From:** Builder (Codex)  
**Status:** `codex-review` / READY FOR INDEPENDENT RE-REVIEW  
**Requested outcome:** `INDEPENDENT REVIEW PASS` or `NEEDS FIX` with concrete findings.

## 1. Candidate identity

| Item | Value |
|---|---|
| New candidate | `86b9113c5aba92ac2527df4f559bf9adaed7e6cd` |
| Prior reviewed candidate | `3f97269e3a4c1446f478a35fbf1a261617f0f2e9` |
| Baseline | `3d5f0d331b1edf1bd942a9e3142de7bd6ea00d09` |
| Tag | `arena-poc-preview-ir01-2026-10-31` |
| Branch | `codex/arena-phase4-preview` |
| Isolated worktree | `/Users/justinzero/.codex/worktrees/orbace-arena-phase4-preview` |
| Candidate state | Local commit only; worktree clean; no push, merge, production deploy, or production DB change |

The previous independent review accepted all POC areas except POC-IR-01. This candidate is the prior reviewed candidate plus the narrow POC-IR-01 correction.

## 2. POC-IR-01 correction

**Finding:** normal non-host voters and anonymous viewers probed the host-only endpoint on every one-second refresh, generating expected `401`/`403` responses and consuming the global per-IP budget. Repeated automation produced occasional `429` responses.

**Correction (frontend only):** `refresh()` now keeps a tri-state host probe (`unknown` / `host` / `not-host`):

- probe the host endpoint once per session;
- a confirmed host polls the host endpoint as its snapshot (one request per tick);
- non-host and anonymous viewers poll only the public session;
- overlay polls only the public overlay endpoint and never probes host capability;
- `setSessionUrl` resets the probe for a new session; create/rematch mark the creator as host; an `online` listener re-detects host state after reconnect.

Host authorization remains server-authoritative. Mutation rate limits, CSRF/origin checks, and all existing abuse/security controls are unchanged; no limit was raised or disabled.

**Files changed vs. prior candidate (see `ir01-remediation.patch`):**

- `orbace-v4-frontend/js/arena.js`
- `backend/org-api/src/routes/__tests__/arena.review.postgres.integration.test.ts` (regression test)

## 3. Package contents

| Path | Contents |
|---|---|
| `REVIEW_REQUEST.md` | This request. |
| `CANDIDATE.txt` | New/prior/baseline/tag/branch/worktree. |
| `implementation.patch` | Complete binary-safe diff from baseline to new candidate. |
| `ir01-remediation.patch` | Focused diff from prior reviewed candidate to new candidate. |
| `CHANGED_FILES.md` | Full inventory and POC-IR-01 delta. |
| `docs/ARENA_POC_PREVIEW_EVIDENCE.md` | Updated execution evidence, including IR-01 remediation. |
| `docs/evidence/arena-poc-preview-e2e-2026-10-31.json` | Original full browser pass. |
| `docs/evidence/arena-poc-preview-ir01-e2e-2026-10-31.json` | Controlled IR-01 journey, zero 429s/page errors. |
| `source/` | Arena auth/voting/gameplay/host/projection/puzzle-supply/RLS source snapshots. |
| `tests/` | Arena unit, PostgreSQL integration, review integration, flag/CSRF/retention/routing tests. |
| `test-results/full-backend.log` | Full backend suite: 2,347 passed / 6 skipped. |
| `test-results/arena-focused.log` | Arena-focused suite: 85/85. |
| `test-results/tsc.log` | `npx tsc --noEmit`, exit 0. |
| `test-results/build.log` | `npm run build`, exit 0. |
| `test-results/frontend-routing.log` | Preview routing/build guards, exit 0. |
| `test-results/preview-api-smoke.log` | Deployed Preview API smoke with new origin. |
| `SECURITY_PRIVACY_REVIEW.md` | Updated with the POC-IR-01 polling correction. |
| `PREVIEW_FINAL_STATE.md` | Preview final state and cleanup evidence. |
| `preview-final-state.log` | Raw final-state commands. |
| `MANIFEST.sha256` | SHA-256 of every package file except the manifest itself. |

## 4. Test results

| Check | Result | Log |
|---|---|---|
| Full backend suite | **2,347 passed / 6 skipped** (169 files passed, 1 skipped) | `test-results/full-backend.log` |
| Arena-focused suite | **85 passed / 0 failed** (5 files) | `test-results/arena-focused.log` |
| TypeScript | `npx tsc --noEmit` exit 0 | `test-results/tsc.log` |
| Build | `npm run build` exit 0 | `test-results/build.log` |
| Frontend Preview routing | pass | `test-results/frontend-routing.log` |
| Preview API smoke | 3 distinct voters; repeat updates; `voteCount=3`; anonymous 401; voter-cannot-host 403; bad origin 403 | `test-results/preview-api-smoke.log` |
| POC-IR-01 controlled journey | pass; **0** `429`; **0** page errors | `docs/evidence/arena-poc-preview-ir01-e2e-2026-10-31.json` |

The focused suite includes a mounted-page regression asserting host probes are continuous only for a confirmed host, a voter makes exactly one host probe and then public-only polling, and overlay makes zero host probes.

## 5. POC-IR-01 acceptance

Controlled Preview deployment: `https://orbace-arena-phase4-preview-6crmw2eyu.vercel.app`. Six isolated browser contexts: host, three authenticated voters, anonymous viewer, overlay.

| Acceptance check | Result |
|---|---|
| Host + 3 authenticated voters + anonymous viewer + overlay | pass |
| No unexpected/user-visible `RATE_LIMITED` | **0** `429` responses; 0 page errors |
| Exactly 3 effective votes | `voteCount=3` |
| Repeat vote remains 3 | count stayed 3; `standard` pressed |
| Anonymous watch-only | vote controls disabled; sign-in message; host hidden |
| Voter cannot host | host panel hidden; start disabled |
| Host remains authorized | host panel restored after reload; host projection `voteCount=3` |
| Refresh recovers correct state | voter reload retained `BALLOT_OPEN` + `voteCount=3`; host reload restored host panel |
| Solve/result consistent | `Host wins — solved before the deadline.` |
| Overlay consistent | ballot and playing states read-only; votes/host hidden |
| Rematch works | new session created; voter reloaded, saw ballot, and voted |

## 6. Security review summary

`SECURITY_PRIVACY_REVIEW.md` covers auth roles, trusted UUID derivation, host authorization, private puzzle supply, public/overlay projection privacy, solve/deadline/concurrency, RLS, voter privacy, and the POC-IR-01 correction. No blocking security or privacy defect was found in the POC scope. Production-hardening follow-ups remain, including canonicalizing host allowlisting to `PlayerAccount.id`.

## 7. Review instructions

Please independently inspect the focused `ir01-remediation.patch`, the updated frontend polling logic, the regression test, the controlled Preview evidence, and the updated security review. Return one of:

- **INDEPENDENT REVIEW PASS**; or
- **NEEDS FIX** with concrete, reproducible findings.

Do not treat the builder’s PASS as approval. Production deployment, shared DB/RLS application, commit/push/merge, and production enablement remain separate owner-controlled gates.

## 8. Delivery

The ZIP is delivered to the ChatGPT Project **“Orbace Sudoku Twitchcon Arena”** (`g-p-6ae23bca4730819183f10e4b0449e329`) under:

`review-packages/arena-poc-preview-86b9113c.zip`

The same ZIP and this request are staged in the control repository under `review-packages/`. The project copy is the review delivery; the repository copy is for provenance.
