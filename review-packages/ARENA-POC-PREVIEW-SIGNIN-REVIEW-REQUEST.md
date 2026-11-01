# Independent Review Request — Arena POC Sign-in Follow-up

**To:** Independent reviewer (ChatGPT)  
**From:** Builder (Codex)  
**Status:** `codex-review` / READY FOR INDEPENDENT REVIEW  
**Requested outcome:** `INDEPENDENT REVIEW PASS` or `NEEDS FIX` with concrete findings.

## 1. Candidate identity

| Item | Value |
|---|---|
| New candidate | `720bbb25a941142b7f3e7578f58e01215eb96a53` |
| Prior candidate (POC-IR-01) | `86b9113c5aba92ac2527df4f559bf9adaed7e6cd` |
| Original reviewed candidate | `3f97269e3a4c1446f478a35fbf1a261617f0f2e9` |
| Baseline | `3d5f0d331b1edf1bd942a9e3142de7bd6ea00d09` |
| Tag | `arena-poc-preview-signin-2026-10-31` |
| Branch | `codex/arena-phase4-preview` |
| Isolated worktree | `/Users/justinzero/.codex/worktrees/orbace-arena-phase4-preview` |
| Candidate state | Local commit only; worktree clean; no push, merge, production deploy, or production DB change |

The independent review previously returned NEEDS FIX only for POC-IR-01. The POC-IR-01 correction is included in this candidate and its focused patch remains available. This candidate adds two owner-found POC-experience fixes: returning to Arena after sign-in and normalizing the Preview Supabase key written into browser config.

## 2. Follow-up correction

**Finding 1 — sign-in did not return to Arena.** The Arena Sign in link went to `/signin`; without a stashed return path, the sign-in page defaults to `/account` after authentication.

**Finding 2 — email sign-in failed with `Invalid API key`.** The Preview build env supplied the Supabase anon key with surrounding quotes (Supabase CLI `-o env` output), so `js/config.js` contained a doubly quoted key.

**Corrections (frontend/build only):**

- `arena.html` exposes `id="arena-signin"`; `arena.js` stashes the existing `orbace_return_to=/arena` session-storage value before navigating. The sign-in page consumes it and returns to `/arena`.
- `build-phase4-preview.mjs` strips one pair of surrounding quotes from `PHASE4_PREVIEW_SUPABASE_URL` / `PHASE4_PREVIEW_SUPABASE_ANON_KEY` before writing the browser config.
- `phase4-preview-routing.test.mjs` asserts the Arena sign-in wiring and the unquoted key output.

**Files changed vs. POC-IR-01 candidate (see `signin-preview-fix.patch`):**

- `orbace-v4-frontend/arena.html`
- `orbace-v4-frontend/js/arena.js`
- `orbace-v4-frontend/scripts/build-phase4-preview.mjs`
- `orbace-v4-frontend/test/phase4-preview-routing.test.mjs`

No backend route, auth, rate-limit, or security-control change.

## 3. Package contents

| Path | Contents |
|---|---|
| `REVIEW_REQUEST.md` | This request. |
| `CANDIDATE.txt` | Candidate/baseline/prior/tag/branch/worktree. |
| `implementation.patch` | Complete binary-safe diff from baseline to candidate. |
| `ir01-remediation.patch` | POC-IR-01 and sign-in fixes from `3f97269e` to candidate. |
| `signin-preview-fix.patch` | Focused sign-in / key-normalization diff from `86b9113c` to candidate. |
| `CHANGED_FILES.md` | Full inventory and focused deltas. |
| `docs/ARENA_POC_PREVIEW_EVIDENCE.md` | Updated execution evidence. |
| `docs/evidence/arena-poc-preview-e2e-2026-10-31.json` | Original full browser pass. |
| `docs/evidence/arena-poc-preview-ir01-e2e-2026-10-31.json` | POC-IR-01 controlled journey; zero 429s/page errors. |
| `docs/evidence/arena-poc-preview-signin-2026-10-31.json` | Actual email sign-in return journey; zero 429s/page errors. |
| `source/` | Arena auth/voting/gameplay/host/projection/puzzle-supply/RLS source snapshots. |
| `tests/` | Arena unit, PostgreSQL integration, review integration, flag/CSRF/retention/routing tests. |
| `test-results/full-backend.log` | Full backend suite: 2,347 passed / 6 skipped (backend unchanged since POC-IR-01). |
| `test-results/arena-focused.log` | Arena-focused suite: 85/85 (backend unchanged since POC-IR-01). |
| `test-results/tsc.log` | `npx tsc --noEmit`, exit 0. |
| `test-results/build.log` | `npm run build`, exit 0. |
| `test-results/frontend-routing.log` | Preview routing, sign-in wiring, and unquoted-key guards. |
| `test-results/preview-api-smoke.log` | Deployed Preview API smoke with new origin. |
| `SECURITY_PRIVACY_REVIEW.md` | Updated with POC-IR-01 and sign-in/key corrections. |
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
| Frontend Preview guards | pass, including sign-in wiring and quoted-env normalization | `test-results/frontend-routing.log` |
| Preview API smoke | 3 voters, repeat update, `voteCount=3`, 401/403 checks | `test-results/preview-api-smoke.log` |
| POC-IR-01 journey | zero 429s, zero page errors | `docs/evidence/arena-poc-preview-ir01-e2e-2026-10-31.json` |
| Sign-in return journey | zero 429s, zero page errors | `docs/evidence/arena-poc-preview-signin-2026-10-31.json` |

## 5. Sign-in acceptance

Preview deployment: `https://orbace-arena-phase4-preview-9cti36x5t.vercel.app`.

| Check | Result |
|---|---|
| Arena Sign in link stashes Arena return path | `orbace_return_to=/arena` observed on `/signin` |
| Email sign-in succeeds without `Invalid API key` | pass |
| Post-sign-in navigation returns to `/arena` | pass |
| Auth restores as registered host | `arena-host-test`, status `registered`, no error banner |
| Host can create a session | pass; host panel visible |
| Rate/page errors during sign-in | `0` `429`; `0` page errors |

## 6. Security review summary

`SECURITY_PRIVACY_REVIEW.md` covers auth roles, trusted UUID derivation, host authorization, private puzzle supply, public/overlay projection privacy, solve/deadline/concurrency, RLS, voter privacy, POC-IR-01 polling, and the sign-in/key-normalization fixes. No blocking security or privacy defect was found in the POC scope.

## 7. Review instructions

Please independently inspect the focused `signin-preview-fix.patch`, the retained POC-IR-01 correction, the sign-in/return test, the Preview evidence, and the updated security review. Return one of:

- **INDEPENDENT REVIEW PASS**; or
- **NEEDS FIX** with concrete, reproducible findings.

Do not treat the builder’s PASS as approval. Production deployment, shared DB/RLS application, commit/push/merge, and production enablement remain separate owner-controlled gates.

## 8. Delivery

The ZIP is delivered to the ChatGPT Project **“Orbace Sudoku Twitchcon Arena”** (`g-p-6ae23bca4730819183f10e4b0449e329`) under:

`review-packages/arena-poc-preview-720bbb25.zip`

The same ZIP and this request are staged in the control repository under `review-packages/`. The project copy is the review delivery; the repository copy is for provenance.
