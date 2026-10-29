# Arena pilot-readiness checklist

Date: 2026-10-29 (America/Detroit)

This is a separate release/pilot checklist. Phase 1 test evidence does not authorize a pilot. `ARENA_ENABLED=false` remains the default; Issue #5 is open with `codex-review` and has no independent approval.

| Gate | Current result | Owner and required evidence/action |
|---|---|---|
| Independent review of exact Phase 1 patch | BLOCKED | Separate reviewer: inspect `ARENA_PHASE1_REVIEW.md`, patch and SHA-256 manifest; review auth/privacy/concurrency/RLS/regressions and record findings. |
| Publish a review branch/diff to GitHub | BLOCKED | User: explicitly authorize the exact files/branch and commit/push if remote publication is wanted. Local review bundle is ready; no publication performed. |
| Approved pilot host identity | BLOCKED | Product/operations: approve the exact canonical Orbace identity and environment in writing. Then configure only that environment's `ARENA_ALLOWED_HOST_IDS`. No host has been configured or implicitly approved; missing allowlist denies everyone. |
| Integrate complete Orbace host/audience/overlay UI | NEEDS FIX | Web/backend: mount using existing Orbace app/board conventions and real auth session. Add accessible Start/solve/state controls, server-driven time, stale snapshot guards, read-only overlay, reload and rematch. The current integrated browser test uses a blank API harness, not the product UI. |
| Lifecycle and full gameplay readiness | NEEDS FIX | Implement remaining planned phases: robust ballot/idempotent vote contract, TTL cleanup, linked rematch/fresh puzzles, strike, pause/cancel/revocation, two consecutive rounds and multi-guest/overlay scenarios. Do not treat the Phase 1 one-round API slice as complete MVP gameplay. |
| Approved puzzle supply | BLOCKED | Product/backend: approve supply/rights and sufficient fresh puzzles for each preset. Current adapter reads trusted internal `PuzzleDaily`; known solution-bearing public selector remains prohibited. |
| Database-owner review and shared migration approval | BLOCKED | DB owner: review additive Prisma schema, inline atomic RLS plus idempotent companion, service-role/owner bypass, grants and rollback. Confirm naming/order with pending Su-Pu migration work. Only disposable local migrations have run. |
| Integrate without disturbing pending Orbace work | NEEDS FIX | Engineering: reconcile shared schema/flag edits with the dirty primary branch in a separately authorized integration step. Patch is based on clean committed `60b25fd3`; do not apply it over existing uncommitted files. |
| Deployment origin and ingress boundary | BLOCKED | Operations: approve same-origin UI/API routing, TLS, cookie Secure/HttpOnly/SameSite, and trusted proxy/header enforcement. Direct untrusted proxy-header access must not be exposed. |
| Abuse and operational controls | NEEDS FIX | Engineering/operations: confirm guest/host limits, polling capacity, expired ticket/session cleanup, cancellation/runbook, telemetry without secrets/answers/raw guest identity and database-failure recovery. Current solve limit and expired-ticket behavior are tested locally. |
| Privacy and retention | BLOCKED | Product/privacy owner: approve cookie notice, DB retention/deletion and the planned 30-day event-retention policy. High-entropy guest keys are hashed; no raw key belongs in DB/event payloads. |
| Full regression and load gate | NEEDS FIX | QA: execute plan phases 2–6, including real UI, host + 3 guests + overlay, all deadline/strike/pause/cancel/rematch races, `/challenge`, Reddit Help to Solve, Su-Pu, official scoring and 50-guest target. Existing backend regression suite passes; no claim of a new full product UI/load run. |
| Dependency/security baseline | NEEDS FIX | Repository owner: triage the 45 pre-existing dependency audit findings recorded during earlier npm ci (25 moderate, 18 high, 2 critical) using normal dependency governance; no packages were upgraded by this review. |
| Rollback/kill-switch and controlled enablement | BLOCKED | Operations/user: approve rollout checklist, tested rollback and operator actions; authorize deployment/shared migration and pilot flag enablement separately. No production, deployment or shared database action is authorized. |

No checklist item supplies automatic authorization for a later step. Prepare concrete reviewable changes first; obtain the corresponding owner's explicit authorization before real host configuration, shared migration, publication or release.
