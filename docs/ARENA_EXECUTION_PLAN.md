# Orbace Sudoku Arena — Revised Execution Plan

**Status:** Working plan for implementation  
**Baseline:** Architecture v2.1 + existing flow audit + standalone Issue #4 MVP prototype  
**Last updated:** 2026-10-29  
**Repository:** `justinzero888/os-arena` (standalone repository; keep `orbace-sudoku-v2` untouched)

## 1. Project objective

Deliver a safe, feature-flagged Arena pilot integrated with Orbace's existing application, while preserving the current Sudoku experience, official rankings, Reddit Help to Solve, Su-Pu, and existing challenge flows. Arena remains unranked. Twitch is the broadcast/discovery surface only; Twitch API, OAuth, and chat integration are not MVP dependencies.

The architecture direction is settled: reuse the existing Orbace auth, database, Sudoku engine, hosting, and application conventions; implement Arena as a modular feature in the existing application unless the integration audit finds a concrete blocker. Do not create a separate microservice by default.

`ARENA_ENABLED=false` must remain the default. Do not deploy, enable production flags, change production configuration, or modify the existing `orbace-sudoku-v2` repository without explicit authorization.

## 2. Baseline and what is already done

### Reuse completed work; do not repeat it

- Architecture direction and key product decisions are documented in `Orbace_Sudoku_Arena_PRD_Architecture_v2.1.md`.
- The existing-flow audit was completed in Issue #3 and recorded in `docs/FRONTEND_BACKEND_TWITCH_FLOW.md` in the local `os-arena` worktree. It is reported as local, uncommitted, and unpushed; preserve it and do not assume it exists on GitHub.
- The audit found that Arena gameplay was not present in the audited application flow and identified a public puzzle-selection endpoint that exposes the solution; do not reuse that endpoint for Arena.
- Issue #4 produced a standalone in-memory Arena prototype with host/audience/overlay flows, preset voting, timed solving, server-side solution validation, result state, rematch, origin/cookie/rate-limit controls, version guards, idempotency, and deadline/body-abort handling.
- Latest reported checks for the prototype: `npm run check`, `npm test` (36 tests), `npm run handoff:test` (4 tests), and `git diff --check` passed. These are reported results and must be rerun against the current worktree before relying on them.
- A manual browser E2E was reported for host + guest: create session, join/vote, start, solve with a known fixture, verify result after refresh, and rematch with a new session and zero votes.
- The prototype is in-memory and single-process. It is a behavior/UX spike, **not** proof of persistence, multi-instance correctness, production auth integration, or production deployment readiness.
- Twitch EventSub smoke testing did not observe an external chat message. Do not block Arena implementation on Twitch chat; retain the self-message guard and do not force replies.

### Bounded delta verification only

Before Phase 1 coding, inspect the existing audit, architecture v2.1, Issue #4 implementation/results, and current worktree. Verify only integration-critical items not already supported by evidence:

1. Current Orbace auth/host authorization integration point.
2. Database migration/schema conventions and applicable RLS/transaction patterns.
3. Existing Sudoku engine entry point and safe server-side full-solution validation path.
4. Existing browser E2E/test command and regression-test entry points.
5. Exact current status/location of the audit and prototype files, including uncommitted work.

Record evidence and unresolved decisions in `docs/ARENA_INTEGRATION_AUDIT.md` and `docs/ARENA_INTEGRATION_DECISIONS.md`. Do not rerun broad discovery, repeat completed tests without a reason, or delay Phase 1 for unrelated Twitch work. If a critical detail cannot be verified quickly, document the gap, choose the safest reversible option consistent with v2.1, and proceed where possible.

## 3. Delivery phases and exit gates

### Phase 0 — Baseline discovery and delta verification

**Status:** BASELINE COMPLETE; bounded delta verification remains as the opening task inside Phase 1. Do not treat this as a fresh discovery phase.

**Work:** Reuse the existing flow audit, architecture v2.1, and Issue #4 review. Confirm only the five integration-critical items above and preserve local changes.

**Deliverables:** Updated/referenced audit and decision register; explicit unresolved questions, each with owner, impact, and decision deadline.

**Exit gate:** No repeated full audit. Critical integration points are evidenced or a documented safe fallback exists. Proceed to Phase 1.

### Phase 1 — Integration foundation and vertical-slice design

**Status:** QUEUED — GitHub Issue #5 created with `chat-request`; implementation has not yet been verified as started.

**Work:**
- Map Arena to the actual Orbace auth, DB/migration, server routing, Sudoku engine, and UI conventions.
- Define the Arena module boundary and feature-flag behavior. Keep Arena disabled by default.
- Design persistent session, ballot/vote, event, and private solution storage. Use existing DB infrastructure; do not add Redis or a new service without evidence it is necessary.
- Define distinct public, guest, host, and overlay response DTOs. No public response may contain a solution, host credential, host-only notes, or guest identifiers.
- Define server-authoritative time/state advancement and concurrency strategy (transaction/row lock or existing optimistic-concurrency convention).
- Define host authorization and guest-cookie/CSRF/Origin/rate-limit patterns consistent with the existing app.
- Establish repeatable automated browser E2E capability and identify existing regression suites.

**Deliverables:** `docs/ARENA_INTEGRATION_AUDIT.md`, `docs/ARENA_INTEGRATION_DECISIONS.md`, module/API/data model notes, test plan, and a thin end-to-end vertical slice behind the flag.

**Exit gate:** Reviewed data/API/security boundaries; migration strategy clear; feature flag proven to block Arena routes/actions when off; one safe, repeatable vertical slice in test/dev environment.

### Phase 2 — Session lifecycle, voting, and event ordering

**Status:** Not started.

**Work:** Implement persistent lifecycle and deterministic state advancement. Preset ballot: 20 seconds; Easy Sprint (Easy, 180 seconds), Medium Match (Medium, 300 seconds), Hard Survival (Hard, 480 seconds). Hide per-choice totals until ballot close; no votes use host default; ties use fixed priority. Guest votes are idempotent; the last valid vote before close counts. Late joiners may vote only while the ballot is open.

Define monotonic terminal states, safe rematch as a new session linked to its predecessor, ordered/sanitized event sequence, idle/orphan TTL, and consistent version/idempotency/error contracts.

**Exit gate:** Concurrent vote/close tests, no-vote/tie/late-joiner/rematch tests, persistence/restart behavior, and duplicate/stale command tests pass.

### Phase 3 — Sudoku integration, deadlines, and winner determination

**Status:** Not started.

**Work:** Integrate the existing Sudoku engine through a safe server-side validation path. Never reuse the known public endpoint that leaks the solution. Store solution data privately. Server ingress timestamp is authoritative: a valid solve received before deadline wins even if body processing finishes later; a solve received at/after deadline cannot win. Full solution validation is mandatory; a client hash alone is insufficient.

Use one consistent server time source. All reads/writes that can cross a deadline call a single state-advance routine. Document deterministic precedence for deadline, eligible solve, ballot close, and strike opening, consistent with the v2.1 decision register; add race tests.

**Exit gate:** Correct solve/timeout behavior, delayed request-body race tests, invalid-board rejection, no solution leakage in every projection, and regression checks pass.

### Phase 4 — Strike, technical pause, cancellation, and operations

**Status:** Not started.

**Work:** Strike opens at 30% effective elapsed time for 15 seconds. It is a parallel overlay ballot, not a blocking gameplay phase; the host may keep solving. Solve, timeout, or cancellation voids the ballot. Tie/zero votes mean Spare. Implement exactly one modifier variant per round: `ARENA_MODIFIER_MODE=no_notes|time_penalty`. If No Notes is not safe to implement with the existing board, use `min(10 seconds, max(0, remaining - 30 seconds))`; no penalty when 30 seconds or less remain. Label fallback clearly in UI and telemetry.

Technical pause freezes the round clock, ballot deadlines, strike trigger progress, and active modifier duration. `PAUSED` is a substate of `PLAYING` (and pause during preset vote should be supported if feasible without weakening correctness). Operator cancellation has no winner. Flag OFF blocks new sessions; existing sessions may finish unless explicitly revoked by an authorized operator.

**Exit gate:** Pause/resume at every timing boundary; solve-during-strike; modifier expiration/data preservation; cancel/revoke; and feature-flag transition tests pass.

### Phase 5 — Host, audience, and overlay experience

**Status:** Not started for production integration. Prototype UI exists as a reference.

**Work:** Implement accessible, responsive host/audience/overlay views within existing app conventions. Host HUD includes timer, phase, pause/cancel confirmations, modifier time, and overlay preview. Audience sees vote status, their own vote, clear result, and rematch link. Overlay is readable at 1280×720 and 1920×1080, recoverable after reload, and never embeds host tokens or secrets. Countdown truth comes from the server snapshot. Provide a short cookie/privacy notice and label the time-penalty fallback.

Prefer stable host overlay/join URLs if low risk; otherwise provide copyable URLs and explicit rematch guidance. Avoid scope expansion into animations, series scoring, or Twitch API integration until all gates pass.

**Exit gate:** Host + multiple guests + overlay browser E2E; reload/reconnect; keyboard and live-region checks; responsive layout at target sizes; no sensitive data in network payloads.

### Phase 6 — Rigorous E2E, security, concurrency, and regression

**Status:** Not started as an integrated repeatable suite. Prototype unit/HTTP tests are a starting point.

**Required E2E matrix:**
1. Feature flag OFF: Arena unavailable, no session mutation; existing Orbace flows work.
2. Host creates session; unauthorized host actions fail; guest joins anonymously with secure cookie.
3. Preset vote: open/closed window, change vote, duplicate idempotency key, no votes, tie priority, late joiner, totals hidden until close.
4. Start round only from valid READY state; fresh puzzle of requested difficulty; no solution exposed to public/guest/overlay.
5. Correct full solution before deadline wins; incorrect/incomplete solution does not; deadline expires to audience win.
6. Deadline races: ingress just before deadline with delayed body; ingress exactly at and after deadline; competing solve and timeout; exactly one terminal result.
7. Strike: opens at 30% effective elapsed, 15-second close, tie/zero -> Spare, No Notes/time-penalty outcome, solve during ballot voids it, timeout/cancel voids it, late joiner during open ballot.
8. Pause before strike, during strike ballot, and during modifier; all relevant clocks/deadlines freeze and resume accurately.
9. Host command version conflicts, stale revision, duplicate command, idempotent retry, safe error codes, rate limits and Retry-After.
10. CSRF/Origin rejection, host-cookie protections, guest-cookie scope, unauthorized host access, no host credential in overlay URL.
11. Public/guest/host/overlay/event-log privacy assertions: no solution, host secrets, private notes, guest identifiers, or raw IPs where prohibited.
12. Reload/reconnect: overlay and host restore authoritative state/timer; stale snapshots cannot regress phase; polling convergence within one interval plus processing.
13. Rematch: creates a new session, links predecessor, new puzzle, no inherited votes/modifier, same guest cookie can join.
14. Cancel/revoke and orphan TTL; terminal states remain monotonic.
15. Two complete consecutive rounds with host + at least three independent guest/browser contexts and overlay.
16. Existing `/challenge`, Reddit Help to Solve, Su-Pu capture/replay, and official scoring regression checks.
17. Smoke/load test with 50 guests as a target, not a capacity guarantee; prioritize duplicate vote and deadline races over raw throughput.

**Exit gate:** Automated browser E2E command is documented and repeatable; all mandatory cases pass; test report includes environment, command, results, failures, and known gaps. Manual-only checks are clearly identified.

### Phase 7 — Pilot readiness and controlled release

**Status:** Not started.

**Work:** Run operator checklist; confirm privacy notice/retention (30 days subject to approved privacy policy), monitoring, rate limits, cancellation procedure, rollback/kill switch, and support steps. Verify feature flag remains OFF by default in all shipped configs. Pilot enablement requires separate explicit authorization.

**Exit gate:** Release checklist approved; rollback tested; no production enablement/deployment without explicit authorization.

## 4. Phase tracking rules and milestone checkpoints

The live phase state is maintained in `docs/ARENA_PROJECT_STATUS.md`; this plan defines scope and exit gates. The GitHub task queue is `justinzero888/os-arena` Issues. As of 2026-10-29, Issue #5 (`Phase 1: Integrate Arena foundation using completed audit and MVP baseline`) is open with `chat-request`. Creating the issue is task preparation, not proof that implementation has started.

Use these checkpoints for every phase:

- **M0 — Worktree protection:** record branch and `git status`; identify and preserve pre-existing modifications/untracked files.
- **M1 — Evidence/design:** document the current evidence, integration decisions, data/API/security boundaries, and any bounded unknowns.
- **M2 — Implementation:** deliver the smallest coherent behavior for that phase, behind the flag where applicable.
- **M3 — Verification:** run focused unit/contract/security tests plus impacted regression and browser E2E tests; capture exact commands and results.
- **M4 — Exit review:** compare evidence against the phase exit gate; mark `COMPLETE` only if every required criterion passes. Otherwise retain `PARTIAL` and list the exact remaining criteria.

Codex must update the status tracker after M1, M2, and M3, not only at phase completion. Do not invent completion percentages. Use `NOT STARTED`, `QUEUED`, `IN PROGRESS`, `PARTIAL`, `BLOCKED`, and `COMPLETE` with evidence. `BLOCKED` is reserved for a material blocker; ordinary unanswered questions should be documented with a safe reversible path where possible.

## 5. Cross-cutting invariants (must not be traded away)

- Arena is unranked and does not alter official rankings or existing Sudoku flows.
- Standalone `os-arena` must not depend on `orbace-sudoku-v2` as a runtime service; integration work should happen through reviewed changes in the appropriate repo only when authorized.
- Do not modify the existing `orbace-sudoku-v2` checkout or disturb its uncommitted changes.
- `ARENA_ENABLED=false` by default; no production config/secret changes, deployment, commit, push, or merge without explicit authorization.
- Never expose solutions, host credentials, private notes, or guest identifiers in public-facing payloads/events.
- Server validates the complete solution and is authoritative for time, phase transitions, and winner.
- Terminal state is monotonic; retries are idempotent; stale revisions return explicit conflict errors.
- No raw IP in event logs; secure cookie, Origin/CSRF checks, rate limits, and private/no-store behavior where needed.
- Use the existing stack and conventions. No new microservice/Redis dependency unless the audit proves it necessary and the decision is recorded.

## 6. Codex working protocol

1. Read architecture v2.1, `docs/FRONTEND_BACKEND_TWITCH_FLOW.md` if present, this plan, `docs/ARENA_PROJECT_STATUS.md`, and Issue #4 acceptance results before coding.
2. Preserve all pre-existing tracked, untracked, and modified files. Do not reset, clean, stash, overwrite, or revert work just to make the tree clean.
3. Begin with the bounded Phase 0 delta checks, not a fresh audit. Record findings and continue into Phase 1 without waiting for user input unless a decision materially changes security, architecture, production behavior, or scope.
4. Make reversible, testable changes in the standalone `os-arena` worktree/feature branch. Do not modify `orbace-sudoku-v2` or production.
5. Keep a phase checklist in `docs/ARENA_PROJECT_STATUS.md`; update status, evidence, test command/results, blockers, and next action after every meaningful milestone.
6. Add automated tests with each behavior. Prefer repeatable browser E2E over manual-only validation.
7. Do not claim a phase complete until its exit gate is met and evidence is recorded. `codex-review` means review-ready, not approved.
8. Stop and ask before any commit, push, merge, deployment, production setting change, secret handling, or cross-repository mutation.
9. Report: files changed, decisions made, tests run with exact results, remaining failures, security/privacy checks, and the next phase. Never report a test as passed unless it was actually run in the current worktree.

## 7. Immediate next action

Start Phase 1. First inspect the current worktree and read the existing audit/architecture/Issue #4 evidence. Perform only the bounded integration-critical delta verification described in Phase 0, write/update the audit and decision register, then implement the Phase 1 integration foundation and a thin feature-flagged vertical slice. Keep the scope tight and do not wait for another planning round.
