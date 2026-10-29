# Codex Kickoff — Start Arena Phase 1

Repository: `justinzero888/os-arena`  
Target branch/worktree: current Arena feature branch (reported as `feat/arena-mvp`; verify before acting)  
Plan: `docs/ARENA_EXECUTION_PLAN.md`  
Tracker: `docs/ARENA_PROJECT_STATUS.md`

## Instruction

Start work now. Phase 0 discovery has already been substantially completed. Do not rerun a broad audit and do not wait for another planning round.

1. Inspect `git status` and preserve every existing tracked, modified, and untracked file. Do not reset, clean, stash, overwrite, or revert work to obtain a clean tree.
2. Read architecture v2.1, `docs/FRONTEND_BACKEND_TWITCH_FLOW.md` if present, the execution plan, the status tracker, and Issue #4 implementation/acceptance notes.
3. Perform only the bounded Phase 0 delta checks: host-auth integration point; DB migration/RLS/transaction conventions; safe Sudoku validation entry point; browser E2E and regression commands; actual location/status of existing audit/prototype work. Record evidence and gaps. Do not repeat completed discovery.
4. Update/create `docs/ARENA_INTEGRATION_AUDIT.md` and `docs/ARENA_INTEGRATION_DECISIONS.md`. Reuse the existing audit and do not overwrite its prior findings.
5. Continue directly into Phase 1: define the persistent data/API/security boundary and implement a thin feature-flagged vertical slice using existing Orbace conventions. Keep `ARENA_ENABLED=false` by default.
6. Keep the Arena architecture as a modular monolith using the existing stack unless concrete evidence proves that infeasible. Do not add a microservice, Redis, or Twitch API dependency by default.
7. Add/establish repeatable automated browser E2E during Phase 1. Tests must prove flag-off behavior, host/guest boundary, no solution leak, server-authoritative state, and one safe vertical slice. Expand the matrix as later phases land.
8. Update `docs/ARENA_PROJECT_STATUS.md` after each milestone with status, evidence, exact commands/results, blockers, and next action. Do not mark a phase complete before its exit gate passes.
9. Do not modify `orbace-sudoku-v2`, production settings, secrets, or deployment. Do not commit, push, merge, deploy, or change production without explicit authorization.
10. Do not block on Twitch chat/EventSub. It is not required for the first playable MVP.

## Required first report

Return a concise evidence-based report with:
- worktree/branch status and any pre-existing changes preserved;
- the five bounded delta-check findings, with file/line or command evidence;
- the integration audit and decision-register updates;
- Phase 1 files changed and architectural decisions;
- exact tests run and results from this worktree;
- unresolved blockers only if they materially affect security, architecture, production safety, or scope;
- the next concrete action.

`codex-review` means ready for review, not approved. Stop before any commit/push/merge/deploy or production change.
