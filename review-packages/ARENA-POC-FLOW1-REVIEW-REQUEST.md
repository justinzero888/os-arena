# Independent Review Request — Arena Flow 1 Demo Readiness

**To:** Independent reviewer (ChatGPT)  
**From:** Builder (Codex)  
**Status:** `codex-review` / READY FOR INDEPENDENT REVIEW  
**Requested outcome:** `INDEPENDENT REVIEW PASS` or `NEEDS FIX` with concrete findings.

## 1. Candidate identity

| Item | Value |
|---|---|
| New candidate | `cc40537534e6fdd6d1061f7d721c8e8fbb89c210` |
| Prior candidate | `dc06cb118bef91c892989c136d7a8b8a8e1add42` |
| Original reviewed candidate | `3f97269e3a4c1446f478a35fbf1a261617f0f2e9` |
| Baseline | `3d5f0d331b1edf1bd942a9e3142de7bd6ea00d09` |
| Tag | `arena-poc-flow1-2026-10-31` |
| Branch | `codex/arena-phase4-preview` |
| Isolated worktree | `/Users/justinzero/.codex/worktrees/orbace-arena-phase4-preview` |
| Candidate state | Local commit only; worktree clean; no push, merge, production deploy, or production DB change |

This candidate retains the prior POC-IR-01, sign-in/key, and anonymous share-link corrections and adds the Flow 1 demo-readiness milestone (F1-01 through F1-04).

## 2. Flow 1 outcomes

### F1-01 — audience authentication/voting state

- Anonymous pages show an explicit `Sign in to vote` action and disabled vote controls.
- The action uses the existing Orbace email/OAuth flow and the existing `orbace_return_to` value, returning to the exact `/arena?session=…` URL.
- Authenticated ordinary Orbace users can vote; no Arena-specific login and no Tier-2 requirement.
- Host capability remains host allowlist plus session ownership.
- Voter-1/2/3 signed in through the actual UI; exactly 3 effective votes; voter-1's change kept the count at 3.

### F1-02 — live spectator synchronization and zero rendering

Root cause fixed: the polling update used `cell.disabled` to decide whether to render a given clue or the board value. Audience cells are disabled, so empty cells rendered givens `0` and host progress was ignored. The path now uses `cell.dataset.given`.

- Empty audience/overlay cells render blank, never `0`.
- Audience and overlay update automatically from public polling while the host plays.
- The authoritative timer continues; the terminal result converges; refresh recovers state.
- Polling is the existing 2-second interval; non-hat host probing remains one-per-session.
- The six-page normal journey produced **0 `429`** and **0 page errors**.
- The three read-only Arena GETs are exempt from the 100/min global fallback on this POC Preview only. Auth, host allowlist, no-store, vote/start/solve limiters, and every mutation protection remain unchanged. This is documented as POC-only and must be reviewed before production.

### F1-03 — audience presence

The host panel shows `N watching · M voters`.

Exact semantics:

- `watching` = distinct opaque per-page client IDs that fetched the public session or overlay endpoint on the single POC API instance within the last 10 seconds, excluding the host page's `/host` heartbeats. It is active Arena page instances, **not unique people**; multiple tabs/devices count separately; voters and overlay count as viewers; the host is excluded.
- `voters` = distinct canonical voter keys (`arena_votes.guestKeyHash`) with at least one recorded vote in the session.
- Presence is in-memory, approximate, resets on restart, and is coherent because the POC runs one Fly machine. No viewer UUIDs, emails, or participant identities are exposed.

Observed: `1 watching · 0 voters` after the anonymous spectator opened the link; `5 watching · 0 voters` after three voters and the overlay joined; `5 watching · 3 voters` after voting and after voter-1 changed their vote.

### F1-04 — minimum Notes/Pencil mode

- Host toggles `Notes: Off/On`.
- Typing 1–9 in an empty editable cell adds/toggles small pencil marks; clicking an existing mark toggles it.
- Entering a final value clears that cell's notes; fixed clues cannot be edited or noted.
- Notes are frontend-only UI state, never sent to the board/solve API, and cannot affect authoritative validation.
- No undo/hints/auto-candidates/propagation/persistence was added; existing strike behavior is unchanged.

### Early start / ballot window

The ballot window is 60 seconds; the host can start while it is open, resolving the preset from votes already cast. A stale-version start 409 triggers one host-session refresh/retry, so the demo needs one Start click.

## 3. Six-context Flow 1 validation

Preview: `https://orbace-arena-phase4-preview-44plnxqb1.vercel.app`

| Step | Result |
|---|---|
| Host signs in through Orbace and creates Arena | pass |
| Anonymous clean browser opens share URL | pass; no Vercel/Orbace auth |
| Host sees audience indicator change | `1 watching · 0 voters` |
| Anonymous sees Arena, cannot vote | vote controls disabled; `Sign in to vote` visible |
| Anonymous selects `Sign in to vote` and completes Orbace auth | pass for voter-1/2/3 |
| Return to same Arena session | all three landed on `/arena?session=<id>` |
| Voting controls become available | pass |
| Exactly 3 effective votes | host `voteCount=3`; `3 audience vote(s)` |
| Voter-1 changes vote; count remains 3 | pass |
| Host sees voting activity and presence | `5 watching · 3 voters` |
| Host starts while ballot open; preset resolves | pass; one click |
| Audience grid contains blanks, never zero | pass |
| Host enters values; audience + overlay update without refresh | pass |
| Host Notes mode: multiple candidates, toggle, final value clears | `1,2` → `1` → cleared |
| Host continues/solves | `Host wins — solved before the deadline.` |
| Host + voters + anonymous + overlay converge on result | pass |
| Rematch | new session; voter returned and voted |
| Privacy | no solution, `hostControls`, `puzzleId`, or participant identity in public payload |
| 429 / page errors | **0 / 0** |

Evidence: `docs/evidence/arena-poc-preview-flow1-six-context-2026-10-31.json`.

## 4. Test results

| Check | Result | Log |
|---|---|---|
| Focused Arena suite | **87 passed / 0 failed** (5 files) | `test-results/arena-focused.log` |
| Full backend suite | **2,349 passed / 6 skipped** (169 files passed, 1 skipped) | `test-results/full-backend.log` |
| TypeScript | `npx tsc --noEmit` exit 0 | `test-results/tsc.log` |
| Backend build | `npm run build` exit 0 | `test-results/build.log` |
| Frontend Preview guards | pass | `test-results/frontend-routing.log` |
| Preview API smoke | 3 voters, repeat update, `voteCount=3` | `test-results/preview-api-smoke.log` |
| Flow 1 six-context journey | pass; 0 429; 0 page errors | `docs/evidence/...flow1...json` |

Focused tests include presence counting, audience sync/zero rendering, Notes toggling/clearing, early start, host-probe regression, and the existing security/auth journeys.

## 5. POC-only decisions requiring review

1. **Vercel Deployment Protection is disabled** for the dedicated POC Preview so anonymous share/overlay URLs reach the app. Production is untouched; Orbace auth, host allowlist, CSRF/origin, and API authorization remain server-enforced.
2. **Read-only Arena GETs are exempt from the global fallback rate limit** on this POC Preview. This is required for six-page normal polling to avoid false `429`s; mutation limiters and auth remain intact. Do not carry this exemption to production without a new rate-limit decision.
3. **Presence is in-memory and the Fly app is scaled to one machine** for coherence. It is approximate, counts page instances not people, and resets on restart. Do not carry to multi-instance/production without a shared presence design.
4. **Early start / 60-second ballot** is a POC state-machine allowance; the host can start from BALLOT_OPEN and the preset resolves from votes cast.

## 6. Package contents

| Path | Contents |
|---|---|
| `REVIEW_REQUEST.md` | This request. |
| `CANDIDATE.txt` | Candidate/baseline/prior/tag/branch/worktree. |
| `implementation.patch` | Complete binary-safe diff from baseline to candidate. |
| `flow1-remediation.patch` | Focused Flow 1 delta (`dc06cb11` -> candidate). |
| `ir01-remediation.patch`, `signin-preview-fix.patch`, `anonymous-share-fix.patch` | Retained prior focused fixes. |
| `CHANGED_FILES.md` | Full inventory and focused deltas. |
| `docs/ARENA_POC_PREVIEW_EVIDENCE.md` | Updated execution evidence. |
| `docs/evidence/` | Original, IR-01, sign-in, anonymous share, and Flow 1 six-context JSON evidence. |
| `source/` | Arena auth/voting/gameplay/host/projection/puzzle-supply/RLS source snapshots. |
| `tests/` | Arena unit, PostgreSQL integration, review integration, flag/CSRF/retention/routing tests. |
| `test-results/` | Full/focused suites, tsc, build, routing, API smoke. |
| `SECURITY_PRIVACY_REVIEW.md` | Updated with Flow 1 security/privacy and POC-only decisions. |
| `PREVIEW_FINAL_STATE.md`, `preview-final-state.log` | Final Preview state and cleanup. |
| `MANIFEST.sha256` | SHA-256 of every package file except the manifest itself. |

## 7. Review instructions

Please independently inspect the Flow 1 delta, the audience/board and Notes behavior, presence semantics, rate-limit exemption, six-context evidence, security review, and final-state evidence. Return one of:

- **INDEPENDENT REVIEW PASS**; or
- **NEEDS FIX** with concrete, reproducible findings.

Do not treat the builder’s PASS as approval. Production deployment, shared DB/RLS application, commit/push/merge, and production enablement remain separate owner-controlled gates.

## 8. Delivery

The ZIP is delivered to the ChatGPT Project **“Orbace Sudoku Twitchcon Arena”** (`g-p-6ae23bca4730819183f10e4b0449e329`) under:

`review-packages/arena-poc-preview-cc405375.zip`

The same ZIP and this request are staged in the control repository under `review-packages/`. The project copy is the review delivery; the repository copy is for provenance.
