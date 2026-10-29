# ARENA-ISSUE-002: Puzzle generation yields only 8 boards from one public grid

- **Status:** Deferred, awaiting PM decision
- **Severity:** Low to Medium (competitive integrity, replay value)
- **Found by:** Code review of `feat/arena-mvp`
- **Location:** `src/arena-engine.js`, `puzzleForRound`

## Problem
`puzzleForRound` digit-shifts a single base grid (the well-known Wikipedia puzzle), producing 8 distinct boards. Round 0 and round 8 are identical, so the board repeats every 8 rematches. The base puzzle is public, so a host can precompute the solution or recognize the pattern. Digit permutation does not change the structure, so the layout of givens is always the same.

## Impact
A host can win by memorizing, and long streams will see repeats. Matters if results are ever ranked or promoted.

## Options for PM
1. **Larger curated bank** (per difficulty: Easy/Medium/Hard, unique-solution verified), chosen by round. Easiest to QA and tune difficulty; needs a puzzle source and licensing check.
2. **Seeded randomized transforms** of a base grid: row/column swaps within bands, band/stack swaps, transpose, digit relabel. Large board space with little data, but the structure stays recognizable.
3. **Generator with a uniqueness solver and difficulty rating.** Best variety; most work and needs a difficulty model for the three presets.
4. **Accept for pilot.**

Note: `ArenaStore.create` derives the board from `round`; a bank or seed needs to stay server-side and deterministic per session, and `test/arena.test.js` asserts specific boards (`puzzleForRound(0/1)`).

## Acceptance criteria (once decided)
- No repeat within N consecutive rematches (N set by PM).
- Every puzzle has a verified unique solution and a difficulty matching its preset.
- Solution is never exposed in snapshots; existing engine tests updated.
