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

## Current Phase 4 status — 2026-10-29

The old eight-board `puzzleForRound` description remains accurate for the standalone in-memory prototype, but it is not the integrated Orbace Arena supply path. The approved Phase 3 integration selects only explicit eligible `ArenaPuzzleSupply` rows, excludes repeats in the series, rejects candidates present in public daily/pool/pack routes and fails closed on scheduled official collisions or missing safe supply. This resolves the source-isolation defect, not the product supply decision: no seed/catalog was found, test fixtures are temporary, and there is no approved source/license, volume target, preset tier rubric, or repetition acceptance value. Product must decide those before real pilot supply is loaded.

## Superseding Phase 4 owner decision — 2026-10-29

The owner resolved the Phase 4 supply/preset decision: provide at least ten owner-supplied 81-character Extreme puzzle strings for the private Arena supply. The three ballot presets are time modes (Quick, Standard, Endurance); all must select Extreme. Do not create Easy/Medium/Hard boards, use public/Daily/official supply, or substitute generated puzzles. The owner supplied 20 strings. Orbace `validateGivens` and `rateDifficulty` classify 16 as consistent, uniquely solvable, and Extreme (indices 1–8, 11, 13–17, 19–20). Indices 9, 12, and 18 have conflicting givens; index 10 has multiple solutions. Do not seed these four. The 16 valid boards exceed the earlier ten-board Phase 4 minimum and can be seeded with owner-supplied provenance through the existing `ArenaPuzzleSupply` path after staging DB safeguards pass. The four invalid boards remain excluded; corrections are optional if a full 20-board set is desired.

This resolves the Phase 4 source/difficulty choice, but not the standalone prototype’s known eight-board repeat behavior or a product policy for repetitions beyond the staged set. The integrated private supply excludes puzzles used earlier in a session series and fails closed when no safe eligible puzzle exists. Keep this issue open for the long-term repetition policy.
