# Final Flow 1 Demo Freeze — Review Package

**To:** Independent reviewer (ChatGPT) / demo owner  
**From:** Builder (Codex)  
**Status:** FLOW 1 = **DEMO READY** (builder verification PASS); candidate frozen for TwitchCon. No production, push, or merge.

## 1. Candidate identity

| Item | Value |
|---|---|
| Frozen candidate | `d78178c4cd20040bf6e6da3b8ffaac4d0615c87d` |
| Prior candidate | `3576aba240cfbb5681173486b25be1e013876e4d` |
| Baseline | `3d5f0d331b1edf1bd942a9e3142de7bd6ea00d09` |
| Tag | `arena-poc-demo-mode-2026-10-31` |
| Branch | `codex/arena-phase4-preview` |
| Worktree | clean local commit; no push/merge/production |

## 2. Item 1 — Demo Mode anonymous audience

Final TwitchCon POC decision: **anonymous audience voting**.

- Host: existing Orbace authentication + host allowlist + session ownership. Create/start/pause/resume/cancel/rematch/solve remain host-only and server-authorized.
- Audience: no Orbace/Tier-2 authentication and no Arena account. No `Sign in to vote` UI; the only auth link is `Host sign in`.
- Anonymous votes use an opaque `arena_voter` httpOnly/SameSite=Lax browser cookie, or an existing instant browser identity when present. Repeat/change updates one row.
- This is one browser/session, **not one human**. There is no fingerprinting/Sybil protection and no one-human-one-vote claim.
- Anonymous audience can watch, vote/change preset, use existing strike voting, see live board/values/Notes/timer/result, and vote in the rematch ballot.
- Anonymous audience cannot create/start/pause/resume/cancel/rematch/solve, access `/host`, or obtain host state; `/host` returns 401 and the host panel is hidden. Public payloads withhold solution, `puzzleId`, host controls, and identities.

## 3. Item 2 — Notes/Pencil spectator sync

- Host Notes are sent through the existing `POST /board` sync (no new transport) and returned as `round.notes` in the existing polling projection.
- Audience and OBS overlay render the same candidates read-only; toggles/removals sync; entering a final value clears that cell's notes and shows the value.
- Notes are public host solving progress, in-memory on the single POC API instance, reset on restart, and never used by solve validation.
- No solution or private puzzle identifier is included in Notes or the public projection.

## 4. Final Flow 1 regression

Host login → create Arena → share link → 3 anonymous audience contexts join without sign-in → host sees `4 watching · 0 voters` → 3 anonymous votes and a changed vote stay at 3 → `4 watching · 3 voters` / `3 audience vote(s)` → early start → audience/overlay blanks and live values → synchronized timer (`04:58` on host/audience/overlay) → Notes `12` appear on audience + overlay → candidate removed to `1` → final value clears Notes → solve → `Host wins` on host/audience/overlay → rematch allows an anonymous vote.

Also verified: no manual refresh required; anonymous `/host` 401; host authorization protected; no private puzzle ID/solution leakage; **0 `429` / 0 page errors**.

Evidence: `docs/evidence/arena-poc-preview-demo-mode-2026-10-31.json`.

## 5. Tests

| Check | Result | Log |
|---|---|---|
| Focused Arena suite | **88 passed / 0 failed** | `test-results/arena-focused.log` |
| Full backend suite | **2,350 passed / 6 skipped** | `test-results/full-backend.log` |
| TypeScript | `npx tsc --noEmit` exit 0 | `test-results/tsc.log` |
| Backend build | `npm run build` exit 0 | `test-results/build.log` |
| Frontend Preview guards | pass | `test-results/frontend-routing.log` |
| Preview API smoke | pass | `test-results/preview-api-smoke.log` |
| Read-limit control | 40 `200`, 41st `429`, other client `200` | `test-results/preview-read-limit.log` |
| Demo Mode six-context journey | pass; 0 429; 0 page errors | `docs/evidence/...demo-mode...json` |

## 6. Preview / freeze state

- Preview: `https://orbace-arena-phase4-preview-4esyt5trj.vercel.app/arena`
- Host account: `arena-host-test@arena-preview.invalid` (existing synthetic Preview password).
- Vercel Deployment Protection remains disabled only for the dedicated POC Preview; one Fly machine; `ARENA_PREVIEW_PUBLIC_READS=true` only there.
- Test puzzle supply row `8d535e61-4721-4c7a-943a-7420d260cad2` (`OWNER_FLOW1_SUBMISSION_TEST_20261031`) is first eligible for submission testing; no public-catalog collision; server-private solution.
- No production change; no push/merge.

## 7. Package

ZIP `arena-poc-preview-d78178c4.zip` delivered to the ChatGPT Project **“Orbace Sudoku Twitchcon Arena”** under `review-packages/`, with source/test snapshots, complete and focused patches, updated evidence/security/final-state docs, logs, and `MANIFEST.sha256`. The same ZIP and this request are staged in the control repository’s `review-packages/` for provenance.

## 8. Remaining blocker

**None.** Flow 1 is frozen as DEMO READY for the TwitchCon demo. Independent review remains separate; production/shared-system actions remain owner-gated.
