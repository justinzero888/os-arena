# Independent Re-Review Request — Arena Flow 1 Remediation

**To:** Independent reviewer (ChatGPT)  
**From:** Builder (Codex)  
**Status:** `codex-review` / READY FOR INDEPENDENT RE-REVIEW  
**Requested outcome:** `INDEPENDENT REVIEW PASS` or `NEEDS FIX` with concrete findings.

## 1. Candidate identity

| Item | Value |
|---|---|
| New candidate | `3576aba240cfbb5681173486b25be1e013876e4d` |
| Prior candidate (Flow 1) | `cc40537534e6fdd6d1061f7d721c8e8fbb89c210` |
| Original reviewed candidate | `3f97269e3a4c1446f478a35fbf1a261617f0f2e9` |
| Baseline | `3d5f0d331b1edf1bd942a9e3142de7bd6ea00d09` |
| Tag | `arena-poc-flow1-remediated-2026-10-31` |
| Branch | `codex/arena-phase4-preview` |
| Isolated worktree | `/Users/justinzero/.codex/worktrees/orbace-arena-phase4-preview` |
| Candidate state | Local commit only; worktree clean; no push, merge, production deploy, or production DB change |

This candidate responds to the two High findings in the previous review and retains the Flow 1 and earlier accepted corrections.

## 2. HIGH-1 remediation — bearer voter identity

`canonicalVoterKeyHash()` previously built `{ OR: [{ tier1Uuid: voter.tier1Uuid ?? undefined }, { supabaseId: voter.sub }] }`. A Supabase JWT has only `sub`, so the first branch could be an empty object and `findFirst()` could select an unrelated player.

The lookup is now conditional:

- bearer identity without `tier1Uuid`: `{ supabaseId: voter.sub }` only;
- Tier-1 identity with `tier1Uuid`: the existing `OR` of `tier1Uuid` and `supabaseId`.

No empty OR branch can match an unrelated player. A focused unit test simulates the old empty-branch behavior and asserts two distinct bearer-only subjects produce distinct hashes keyed to their own player rows (`test-results/arena-focused.log`). The real cookie-session journey remains covered by the integration suite.

## 3. HIGH-2 remediation — bounded Preview reads and presence

The unconditional read exemption is removed. The relaxation is now gated by `ARENA_PREVIEW_PUBLIC_READS`:

- default **false** in `.env.example`; production/default uses the normal global fallback;
- set **true only** on the POC Preview Fly app.

When enabled, the three read-only Arena GETs get:

- a **per-client 40/min** read limit using the opaque `X-Arena-Client` header (IP fallback when absent);
- a **300/min per-IP** route limit;
- a presence map capped at **256 viewer entries + 8 host entries** per session, with stale 10-second entries pruned on every presence touch and oldest-entry eviction when over cap.

Control evidence (`test-results/preview-read-limit.log`): 40 same-client reads returned `200`, the 41st returned `429`, and a different client returned `200`. The six-context Flow 1 journey with the limits active still returned **0 `429` and 0 page errors**. The `ARENA_PREVIEW_PUBLIC_READS` flag is present only on the POC Preview; production is untouched.

## 4. Flow 1 status retained

- F1-01: explicit `Sign in to vote`, session-preserving return, 3 UI-authenticated voters, 3 effective votes, repeat stays 3.
- F1-02: audience/overlay live sync, blank empty cells (never `0`), timer/result convergence, refresh recovery.
- F1-03: host-only `N watching · M voters`; exact page-instance/canonical-voter semantics; no identities.
- F1-04: host Notes/Pencil mode; candidates, toggle, final-value clear; UI-only.
- Flow 1 six-context journey passed with the new read limits active: 0 `429`, 0 page errors.

## 5. Test results

| Check | Result | Log |
|---|---|---|
| Focused Arena suite | **88 passed / 0 failed** | `test-results/arena-focused.log` |
| Full backend suite | **2,350 passed / 6 skipped** | `test-results/full-backend.log` |
| TypeScript | `npx tsc --noEmit` exit 0 | `test-results/tsc.log` |
| Backend build | `npm run build` exit 0 | `test-results/build.log` |
| Frontend Preview guards | pass | `test-results/frontend-routing.log` |
| Preview API smoke | pass | `test-results/preview-api-smoke.log` |
| Preview read-limit control | 40 `200`, 41st `429`, other client `200` | `test-results/preview-read-limit.log` |
| Flow 1 six-context journey | pass; 0 429; 0 page errors | `docs/evidence/arena-poc-preview-flow1-six-context-2026-10-31.json` |

## 6. Package contents

| Path | Contents |
|---|---|
| `REVIEW_REQUEST.md` | This request. |
| `CANDIDATE.txt` | Candidate/baseline/prior/tag/branch/worktree. |
| `implementation.patch` | Complete baseline-to-candidate diff. |
| `review-remediation.patch` | Focused HIGH-1/HIGH-2 remediation (`cc405375` -> candidate). |
| `flow1-remediation.patch`, `ir01-remediation.patch`, `signin-preview-fix.patch`, `anonymous-share-fix.patch` | Retained prior focused fixes. |
| `CHANGED_FILES.md` | Full inventory and focused deltas. |
| `docs/ARENA_POC_PREVIEW_EVIDENCE.md` | Updated execution and remediation evidence. |
| `docs/evidence/` | Original, IR-01, sign-in, anonymous share, Flow 1 six-context, and read-limit control JSON. |
| `source/`, `tests/` | Arena source/test snapshots. |
| `test-results/` | Full/focused suites, tsc, build, routing, API smoke, read-limit control. |
| `SECURITY_PRIVACY_REVIEW.md` | Updated with HIGH-1/HIGH-2 remediation and Preview-scoped limits. |
| `PREVIEW_FINAL_STATE.md`, `preview-final-state.log` | Final Preview state and cleanup. |
| `MANIFEST.sha256` | SHA-256 of every package file except the manifest itself. |

## 7. Review instructions

Please independently inspect the bearer identity query, the focused bearer-only regression test, the Preview-gated read/presence limits, the read-limit control, the six-context Flow 1 evidence, the updated security review, and final state. Return one of:

- **INDEPENDENT REVIEW PASS**; or
- **NEEDS FIX** with concrete, reproducible findings.

Do not treat the builder’s PASS as approval. Production deployment, shared DB/RLS application, commit/push/merge, and production enablement remain separate owner-controlled gates.

## 8. Delivery

The ZIP is delivered to the ChatGPT Project **“Orbace Sudoku Twitchcon Arena”** (`g-p-6ae23bca4730819183f10e4b0449e329`) under:

`review-packages/arena-poc-preview-3576aba2.zip`

The same ZIP and this request are staged in the control repository under `review-packages/`. The project copy is the review delivery; the repository copy is for provenance.
