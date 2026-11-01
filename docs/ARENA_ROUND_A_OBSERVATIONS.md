# Arena Round A observations

## 2026-10-30 — FAILED / remediation in progress

**Evidence:** [Round A — Host + 1 guest](../e2e/Round%20A%20%E2%80%94%20Host%20%2B%201%20guest.pdf), pages 1–4. The tester launched `ARENA_ENABLED=true npm run arena:dev` at port 4173, which is the standalone in-memory prototype, not the integrated Orbace Preview. Do not proceed to Round B until Round A is rerun and passes.

**Root causes:**

1. The standalone engine defines Easy Sprint, Medium Match and Hard Survival and derives boards from an old built-in fixture; the integrated worktree has separate Extreme-only private supply and time modes. The standalone command did not exercise that integrated implementation.
2. `ArenaStore.create()` initializes `PRESET_VOTE` and sets the deadline to creation time plus 20 seconds. Time spent copying the link/opening the other browser consumes the ballot window. The guest screenshot shows the ballot already closed with no vote controls.
3. `resolvePreset()` chooses the host default when no votes exist and `start()` checks READY and version but not guest participation. Consequently a zero-vote round can start.
4. The prototype only sets a guest cookie and shows static crowd text. It does not explicitly register join/presence or provide a participant count distinct from votes.

**Status:** FAILED. Product choice for the pre-round ballot is being clarified; the existing Strike/Spare interaction is a candidate, not a newly approved mechanic. A new Round A observation with actual run evidence and exact tests is required after remediation. No production changes.

## 2026-10-30 — remediation implemented / tester rerun required

The owner chose the existing approved time-mode ballot; all modes use owner-validated Extreme puzzles. The standalone local prototype now registers guest heartbeats, displays connected guest count separately from votes, enters LOBBY after a guest joins, opens a 20-second VOTING window only on host action with a connected guest, and enforces a connected voting participant before Start. If the ballot closes without an eligible voter, the host can reopen it for a fresh full window. There is no host-only override. Guest confirmation and server-derived countdown are visible. Local puzzle data is ignored by Git; the loader accepts only the 16 previously owner-validated Extreme puzzle hashes and fails closed for unapproved or missing supply. Rematches use a different approved puzzle until supply is exhausted.

Automated validation: `npm test` 42 passed; `npm run arena:e2e` 3 passed (uses a shortened four-second test ballot; [browser test output](../e2e/round-a-remediation-browser-final-v2.txt)); `npm run check` passed; `npm run handoff:test` 4 passed; `git diff --check` passed. Unit tests verify the full 20-second boundary and late/pre-deadline solve handling. The first two-browser execution exposed and fixed an invalid UI identifier; an additional empty-ballot test initially required an explicit navigation wait.

This is **not** a human Round A pass. The original failure evidence remains [Round A — Host + 1 guest](../e2e/Round%20A%20%E2%80%94%20Host%20%2B%201%20guest.pdf). Port 4173 was already in use; rerun on 4183 using the updated [local pilot instructions](../README.md#repeat-round-a--host-and-one-guest). Record new evidence and do not begin Round B until Round A passes. The standalone prototype still does not implement Strike/Spare; that remains in the separately integrated worktree.
