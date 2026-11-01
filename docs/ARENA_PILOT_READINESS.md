# Arena pilot-readiness checklist

> **Superseding status — 2026-10-30:** Issue #7 / Phase 4 is independently `chat-approved` after Preview cleanup and owner-confirmed final Auth comparison. Issue #8 covers read-only production assessment and release planning. The older dated Preview blocks below are historical, not current staging state. Production/pilot remains **NO-GO**; see `ARENA_PHASE5_PRODUCTION_READINESS.md` for current evidence and gates.


Date: 2026-10-29 (America/Detroit) — **historical snapshot; gate results below predate the 2026-10-30 Preview smoke/cleanup and approval.**

This is a separate release/pilot checklist. Phase 3 was independently approved on GitHub Issue #6 (comment 6506971946). The owner-directed Phase 4 readiness task was Issue #7, now independently `chat-approved` (see the superseding status above); the gate rows below are dated 2026-10-29 snapshots. Neither approval authorizes a pilot. `ARENA_ENABLED=false` remains the default.

| Gate | Current result | Owner and required evidence/action |
|---|---|---|
| Independent review of Phase 3 | PASS | Issue #6 is labeled `chat-approved`; independent reviewer comment 6506971946 approved the actual attached package, migrations, tests and evidence. This approval is not release authorization. |
| Local default-off and Arena regression | PASS | `.env.example` declares `ARENA_ENABLED=false`; backend exact-`true` flag parser defaults false and empty host allowlist denies all. Current standalone tests: 39/39, handoff tests: 4/4, browser E2E: 2/2. Backend targeted tests: 68/68. |
| Disposable full-schema migration/RLS/browser validation | PASS | On 2026-10-29, `scripts/arena-review-postgres.sh` applied all 48 migrations (the branch had 48 at that time; 49 by the later 2026-10-29 Preview-prep run below) to a fresh disposable PostgreSQL instance on loopback; all six Arena tables had RLS enabled. Full backend run at that time: 2,097 passed, 6 skipped (later runs: 2,344 on 49 migrations; 2,350 on 2026-10-31 per `ARENA_PROJECT_STATUS.md`); included 11/11 PostgreSQL/browser integration tests. Temporary DB removed. No shared database was contacted. |
| Approved pilot host identity | PARTIAL — flow approved, identity pending | Owner approved a new throwaway Instant Identity account and allowlisting the authenticated `sub`; the actual account and returned `sub` do not yet exist. The integration code uses `AuthenticatedUser.sub`. Do not switch to the team response’s `playerId` recommendation without owner direction; verify the chosen account mapping before configuration. Current empty allowlist denies every host. |
| Mounted Orbace host/audience/overlay UI | PASS for local integrated E2E; BLOCKED for pilot deployment | The isolated worktree has the Arena page and API adapter. PostgreSQL/browser integration covered authenticated host, separate anonymous audience context, gameplay and rematch. Production/staging mount and actual host account smoke remain unauthorized/unverified. |
| Owner-supplied private puzzle set | PASS for input validation; seed pending DB safeguards | Of 20 supplied boards, 16 are consistent, uniquely solvable, and rated Extreme by Orbace validation/rating; these exceed the owner-authorized ten-board minimum. Four are excluded (9/12/18 conflicting givens; 10 multiple solutions). Seed the 16 only into `ArenaPuzzleSupply` after shared-DB safeguards pass. |
| Shared staging DB migration and coordination | BLOCKED | Owner selected `cjimlozschaolqqsqksu`, a project shared with Zero-Tap. Read-only SQL found no public application tables, but this does not imply Auth/passkey state is disposable. Container startup runs all pending Prisma migrations (49 directories in this branch), not just Arena. Confirm Team Mobile coordination, exact baseline/Arena migration and RLS order, and the owner-required recovery/backup guard before starting the app or writing. No shared DB change was made. |
| Auth, Origin, proxy and cookie production smoke | BLOCKED | Local tests cover canonical session auth, fail-closed host allowlist, ownership, CSRF, same-origin and scheme mismatch. Operations must identify approved deployment origin, TLS termination and trusted-proxy behavior; then an authorized staging smoke can verify secure cookies and ingress without trusting arbitrary forwarded headers. |
| Abuse controls and operations | NEEDS FIX | Existing per-route limits, solve ingress leases, TTL behavior, pause/cancel and feature-off behavior have local regression evidence. Before pilot, owners must set audience/host/polling capacity and retention limits, validate cleanup/DB outage monitoring, and approve runbook actions. Guest vote-stuffing remains a documented product risk in `docs/issues/ARENA-ISSUE-001-guest-vote-stuffing.md`; no decision to require identity or accept the risk was found. |
| Privacy and retention | PARTIAL — policy approved | Owner approved test-only identities, no Arena analytics, no raw IP/guest identifiers in logs, and a seven-day maximum. The Preview retention setting is not configured because the service remains stopped; configure and verify it, then purge test data after the smoke. Confirm cookie notice and deletion steps in the staging flow. |
| Full integration regression/load | NEEDS FIX | Local full backend and browser suite passed, but no staging/proxy smoke, 50-guest capacity run, accessibility audit at target resolutions, or existing `/challenge`, Reddit Help to Solve, Su-Pu and official scoring regression run has been performed for Phase 4. Schedule those in the approved environment before go/no-go. |
| Dependency/security baseline | NEEDS FIX | Prior npm audit evidence reported 45 dependency findings (25 moderate, 18 high, 2 critical); this task did not rerun audit or alter dependencies. Repository owner must triage under normal dependency governance. |
| Rollback, observability and controlled enablement | BLOCKED | Prepare/approve signals, cancellation, DB restoration, flag-off and operator ownership before pilot. No shared migration, production configuration, deployment or enablement is authorized. Keep `ARENA_ENABLED=false`. |

## Staging smoke sequence (owner-authorized after prerequisites pass)

The owner authorized the Preview-only migration, configuration, deployment, smoke and cleanup in the Phase 4 staging authorization document, subject to its target, backup, host and puzzle safeguards. The selected Supabase ref is now superseded by `cjimlozschaolqqsqksu`. Before any mutation, positively verify the Fly app and database target without exposing secret values, verify backup/recovery capability, seed only the 16 validated owner-supplied Extreme puzzles, create the throwaway Instant Identity host and obtain its `sub`, and confirm the Preview origin/proxy. If a guard is unresolved, stop before mutating Preview. Then run only in that isolated environment:

1. Confirm flag off: Arena health/create routes are unavailable; existing challenge, Su-Pu, and Reddit-help routes still work.
2. Apply the reviewed additive migration using the staging owner’s approved procedure; verify six Arena tables have RLS enabled and intended grants/policies match the reviewed design. Record the migration revision and rollback/forward-fix decision.
3. Set only the approved staging host ID and same-origin public URL. Confirm secure cookie attributes and CSRF/Origin checks behind the configured trusted proxy; reject an untrusted forwarded host/scheme.
4. Execute host login → create → anonymous guest join/vote → start → solve → authoritative result → rematch in separate browser contexts. Capture status codes, request IDs, timings and redacted errors only; never capture answer payloads, credentials, raw guest keys or access tokens.
5. Confirm cancellation, pause/expiry behavior, service health, cleanup, and the chosen kill switch. Turn the staging flag off and verify new sessions are blocked. Record how already-active sessions are handled before any test begins.
6. Remove test sessions/fixtures, verify no leaked private supply or personal data remains, and obtain operations/DB/privacy sign-off.

## GO / NO-GO criteria

**GO for a limited pilot** only after every BLOCKED gate above has written owner approval, the real supply is licensed/approved and sufficient for the declared rematch target, privacy/retention and anti-abuse policies are decided, staging smoke and rollback are evidenced, load/capacity limits and support ownership are explicit, and an authorized release request names environment, host, window, and flag change. Independent Phase 3 approval alone is not a GO.

**NO-GO** if any owner decision is missing; host allowlist is empty/uncertain; puzzle supply falls back to public/official data or repeats inside the agreed window; RLS/origin/auth checks fail; sensitive data appears in logs/responses; unexpected 5xx, deadline divergence, or duplicate terminal result occurs; capacity or rollback is unverified; or the feature flag is enabled outside the explicitly approved environment. Record the incident, stop new sessions using the approved kill-switch procedure, and do not resume until owners close the gate.

## Rollback and observability approval checklist

- [ ] Operations names an on-call owner and tested alert route for Arena 5xx/error rate, database failures/pool saturation, request latency, active/expired sessions, solve-ingress backlog/lease expiry, rate-limit rejection, and terminal-result conflicts.
- [ ] Owners choose numeric alert thresholds and observation window; none are inferred by this local review.
- [ ] Logs/metrics are reviewed to exclude access tokens, cookies, solutions, host IDs where unnecessary, guest hashes, and raw IP addresses.
- [ ] Rollback owner documents the additive-schema recovery/forward-fix plan and verifies it on disposable PostgreSQL; do not drop data or reverse schema in a shared DB without DB-owner approval.
- [ ] Kill-switch owner documents what happens to existing sessions when the flag turns off, and practices the exact operator procedure in staging.
- [ ] Incident, cancellation, user-support, privacy deletion, and post-pilot data-retention steps have named owners and contact paths.

No checklist item supplies automatic authorization for a later step. Prepare concrete reviewable changes first; obtain the corresponding owner's explicit authorization before real host configuration, shared migration, publication or release. For this Phase 4, “PASS” on local behavior is not a pilot go decision; the blocked owner gates above must be resolved first.

## Superseding owner decisions and current Preview evidence — 2026-10-29

The owner approved replacing the earlier Supabase Preview ref with `orbace-sudoku-zerotap-test` (`cjimlozschaolqqsqksu`) as the staging DB. This supersedes the older ref in the initial staging-conventions response. The owner selected an Extreme-only puzzle supply and approved three ballot time modes; all three must choose only Extreme puzzles. The owner approved a throwaway Instant Identity host, 7-day maximum Arena event retention, no Arena analytics, and no raw IP/guest identifiers in application logs. The owner later supplied 20 puzzle strings; 16 passed format, consistency, uniqueness, and Extreme rating, satisfying the ten-puzzle minimum. Four invalid boards are excluded. The actual host `sub` is still pending.

Read-only Supabase verification reports the approved project active/healthy, with zero public app tables, no `_prisma_migrations`, no Arena tables and no Arena policies. No migration, seed, or shared data change has been made. The Fly Preview app is suspended and has a `DATABASE_URL` secret configured by name only; its value/host cannot be safely verified from the stopped app, and startup may trigger Prisma migrations. Its backup/recovery path is unverified. Do not resume until the database target and recovery procedure are positively verified without exposing secrets. The prior Vercel Preview env check returned zero variables, so routing is not configured.

| Updated gate | Current result | Evidence / next action |
|---|---|---|
| Approved Preview DB target | PASS (identity/read-only access only) | `orbace-sudoku-zerotap-test`, ref `cjimlozschaolqqsqksu`, is active/healthy; initial schema is empty. This does not approve a migration by itself. |
| Preview DB connection target and recovery | BLOCKED | Fly secret name exists but stopped-machine target is unverified; backup/recovery is unknown. Obtain a safe verification/backup path before starting Preview or applying migration. Never share secret values. |
| Extreme puzzle supply | PASS — 16 validated; seed pending at this snapshot (seeded later for the Preview smoke, then cleaned up) | 16 of 20 owner-supplied boards are consistent, unique, and rated Extreme; four invalid boards are excluded. This exceeds the ten-board minimum. Seed only after shared DB safeguards pass. |
| Preset semantics | PASS (decision) | Quick/Standard/Endurance are time modes; every preset requests Extreme difficulty. Regression test passed. |
| Throwaway host | PARTIAL (historical; later satisfied — see superseding status and `ARENA_PHASE5_PRODUCTION_READINESS.md`) | Owner approved a new Instant Identity account and allowlisting its Supabase `sub`; at this snapshot the account/identifier was not yet created. Keep allowlist empty until then. |
| Local/default-off validation | PASS | `ARENA_ENABLED` exact-true parser defaults off. Current backend full run: 2,344 passed, 6 skipped; all 49 disposable migrations and six-table RLS check passed. Frontend smoke and preview routing passed. |
| Preview deployment and E2E | BLOCKED | App remains suspended; Vercel Preview has no env vars. Complete only after connection/backup, shared-project coordination, host identity, and origin/proxy prerequisites are resolved and exact target guards are rechecked; the 16 validated puzzles satisfy the supply minimum. |

Historical (2026-10-29): Issue #7 was then in `codex-working`; it is now `chat-approved`. At this snapshot no Preview mutation, migration, deployment, host configuration, or feature enablement had occurred in this milestone.

A read-only Fly status check confirmed `justinzero-preview` and hostname `justinzero-preview.fly.dev`; state is `suspended`, with both machines stopped. Supabase project metadata confirms the replacement project is `ACTIVE_HEALTHY` in `us-west-2`. This establishes exact service identity, not the injected database secret target or API health.

### Source reconciliation evidence

The isolated Orbace integration branch now has current local `origin/main` (`9f4d4a54`) as its base. The two upstream commits add only Phase 4 shared-artifact documents; no application changes were in that delta. Existing staged, unstaged, and untracked Arena work was preserved and restored.
