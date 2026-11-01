# Independent Review Request — Arena POC Anonymous Share-Link Access

**To:** Independent reviewer (ChatGPT)  
**From:** Builder (Codex)  
**Status:** `codex-review` / READY FOR INDEPENDENT REVIEW  
**Requested outcome:** `INDEPENDENT REVIEW PASS` or `NEEDS FIX` with concrete findings.

## 1. Candidate identity

| Item | Value |
|---|---|
| New candidate | `dc06cb118bef91c892989c136d7a8b8a8e1add42` |
| Prior candidate (sign-in) | `720bbb25a941142b7f3e7578f58e01215eb96a53` |
| Prior candidate (POC-IR-01) | `86b9113c5aba92ac2527df4f559bf9adaed7e6cd` |
| Original reviewed candidate | `3f97269e3a4c1446f478a35fbf1a261617f0f2e9` |
| Baseline | `3d5f0d331b1edf1bd942a9e3142de7bd6ea00d09` |
| Tag | `arena-poc-preview-anonymous-2026-10-31` |
| Branch | `codex/arena-phase4-preview` |
| Isolated worktree | `/Users/justinzero/.codex/worktrees/orbace-arena-phase4-preview` |
| Candidate state | Local commit only; worktree clean; no push, merge, production deploy, or production DB change |

This candidate retains the POC-IR-01 polling correction and the sign-in/key fixes. It adds anonymous share-link access for the controlled Preview and preserves the session URL through Orbace sign-in.

## 2. Anonymous share-link correction

**Finding:** Vercel Deployment Protection (`ssoProtection: all_except_custom_domains`, no password or automation bypass) intercepted anonymous Arena share and overlay URLs before the app loaded. Protection is deployment-wide and cannot be scoped to `/arena` by path. The sign-in return also dropped `?session=`, so voters would land on `/arena` without the session.

**Preview-only configuration correction:**

- Disabled `ssoProtection` on the dedicated `orbace-arena-phase4-preview` project only (`ssoProtection: null`).
- The production Vercel project was not changed.
- Orbace app authentication, host allowlist, CSRF/origin, and Arena API authorization remain server-enforced.
- The Preview URL is unlisted/noindex but reachable by anyone with the link. This is a deliberate POC-Preview-only access decision.

**Code correction:**

- `arena.js` now stashes `location.pathname + location.search` in the existing `orbace_return_to` value before navigating to `/signin`, preserving `?session=…`.
- `phase4-preview-routing.test.mjs` asserts the session-preserving expression.

## 3. Package contents

| Path | Contents |
|---|---|
| `REVIEW_REQUEST.md` | This request. |
| `CANDIDATE.txt` | Candidate/baseline/prior/tag/branch/worktree. |
| `implementation.patch` | Complete binary-safe diff from baseline to candidate. |
| `ir01-remediation.patch` | POC-IR-01 delta (`3f97269e` -> `86b9113c`). |
| `signin-preview-fix.patch` | Sign-in return / key normalization delta (`86b9113c` -> `720bbb25`). |
| `anonymous-share-fix.patch` | Session-preserving sign-in return delta (`720bbb25` -> candidate). |
| `CHANGED_FILES.md` | Full inventory and focused deltas. |
| `docs/ARENA_POC_PREVIEW_EVIDENCE.md` | Updated execution evidence. |
| `docs/evidence/arena-poc-preview-e2e-2026-10-31.json` | Original full browser pass. |
| `docs/evidence/arena-poc-preview-ir01-e2e-2026-10-31.json` | POC-IR-01 controlled journey; zero 429s/page errors. |
| `docs/evidence/arena-poc-preview-signin-2026-10-31.json` | Actual email sign-in return journey. |
| `docs/evidence/arena-poc-preview-anonymous-share-2026-10-31.json` | Anonymous share URL + 3 voter sign-in/vote + overlay journey; zero 429s/page errors. |
| `source/` | Arena auth/voting/gameplay/host/projection/puzzle-supply/RLS source snapshots. |
| `tests/` | Arena unit, PostgreSQL integration, review integration, flag/CSRF/retention/routing tests. |
| `test-results/full-backend.log` | Full backend suite: 2,347 passed / 6 skipped. |
| `test-results/arena-focused.log` | Arena-focused suite: 85/85. |
| `test-results/tsc.log` | `npx tsc --noEmit`, exit 0. |
| `test-results/build.log` | `npm run build`, exit 0. |
| `test-results/frontend-routing.log` | Preview routing, sign-in wiring, anonymous return, quoted-key guards. |
| `test-results/preview-api-smoke.log` | Deployed Preview API smoke with new origin. |
| `SECURITY_PRIVACY_REVIEW.md` | Updated with anonymous-access and Vercel-protection separation. |
| `PREVIEW_FINAL_STATE.md` | Preview final state and cleanup evidence. |
| `preview-final-state.log` | Raw final-state commands. |
| `MANIFEST.sha256` | SHA-256 of every package file except the manifest itself. |

## 4. Test results

| Check | Result | Log |
|---|---|---|
| Full backend suite | **2,347 passed / 6 skipped** | `test-results/full-backend.log` |
| Arena-focused suite | **85 passed / 0 failed** | `test-results/arena-focused.log` |
| TypeScript | `npx tsc --noEmit` exit 0 | `test-results/tsc.log` |
| Backend build | `npm run build` exit 0 | `test-results/build.log` |
| Frontend Preview guards | pass, including session-preserving sign-in return | `test-results/frontend-routing.log` |
| Preview API smoke | 3 voters, repeat update, `voteCount=3`, 401/403 checks | `test-results/preview-api-smoke.log` |
| IR-01 journey | zero 429s, zero page errors | `docs/evidence/arena-poc-preview-ir01-e2e-2026-10-31.json` |
| Sign-in journey | zero 429s, zero page errors | `docs/evidence/arena-poc-preview-signin-2026-10-31.json` |
| Anonymous share journey | zero 429s, zero page errors | `docs/evidence/arena-poc-preview-anonymous-share-2026-10-31.json` |

## 5. Anonymous share-link acceptance

Preview deployment: `https://orbace-arena-phase4-preview-2bocroddc.vercel.app`.

| Check | Result |
|---|---|
| Exact share URL with `#:~:text=…` reaches Arena without Vercel login | pass; title `Sudoku Arena | Orbace`, no Vercel login text |
| Anonymous visitor can watch | ballot count visible; no error |
| Anonymous visitor cannot vote | vote controls disabled; API vote `401` |
| Anonymous visitor cannot host | host panel hidden |
| Voter 1, 2, and 3 sign in through the actual Orbace email flow | pass; all returned to `/arena?session=<id>` |
| Voters can vote after return | pass |
| Exactly 3 effective votes | host projection `voteCount=3` |
| Repeat vote remains 3 | `voteCount=3` after change |
| Voter cannot host | host panel hidden; start disabled |
| OBS/read-only overlay reachable anonymously | pass; votes/host hidden; no Vercel login |
| Rate/page errors | `0` `429`; `0` page errors |

## 6. Security review summary

`SECURITY_PRIVACY_REVIEW.md` covers auth roles, trusted UUID derivation, host authorization, private puzzle supply, public/overlay projection privacy, solve/deadline/concurrency, RLS, voter privacy, POC-IR-01 polling, sign-in/key normalization, and the anonymous share-link / Vercel protection separation. The Vercel protection layer is disabled only for the dedicated POC Preview; production remains untouched, and Arena API authorization remains server-enforced. No blocking security or privacy defect was found in the POC scope.

## 7. Review instructions

Please independently inspect the `anonymous-share-fix.patch`, the unchanged POC-IR-01 and sign-in corrections, the Vercel Preview protection setting, the anonymous share evidence, and the updated security review. Return one of:

- **INDEPENDENT REVIEW PASS**; or
- **NEEDS FIX** with concrete, reproducible findings.

Do not treat the builder’s PASS as approval. Production deployment, shared DB/RLS application, commit/push/merge, and production enablement remain separate owner-controlled gates.

## 8. Delivery

The ZIP is delivered to the ChatGPT Project **“Orbace Sudoku Twitchcon Arena”** (`g-p-6ae23bca4730819183f10e4b0449e329`) under:

`review-packages/arena-poc-preview-dc06cb11.zip`

The same ZIP and this request are staged in the control repository under `review-packages/`. The project copy is the review delivery; the repository copy is for provenance.
