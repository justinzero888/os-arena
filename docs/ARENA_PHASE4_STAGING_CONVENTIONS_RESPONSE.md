# Orbace Arena Phase 4 — Staging Conventions Response

**To:** Orbace Arena / Codex team
**Re:** Information request ahead of controlled staging validation
**Scope:** Information only. Nothing was deployed, migrated, enabled, or created, and no live system was queried.

## How to read this document

**Sources.** Every statement comes from the repository at `orbace-sudoku` `origin/main` (fetched 2026-10-29): `docs/deployment.md`, `AGENTS.md`, `backend/org-api/fly.preview.toml`, `backend/org-api/.env.example`, `backend/org-api/prisma/schema.prisma`, `backend/org-api/src/lib/feature-flags.ts`, the Phase 3 session-service plan, and `docs/project-status.md`. The Arena integration audit in this repo (`docs/ARENA_INTEGRATION_AUDIT.md`) supplies the Arena-side facts. **I did not check Fly, Supabase, Vercel, or any other live system.** Any "current state" claim is only as fresh as those documents, and the repo is the source of record for conventions, not for what is running today.

**Status tags** (used per item):

| Tag | Meaning |
|---|---|
| **CONFIRMED** | Stated in repository documentation or config |
| **RECOMMENDED** | My proposal, not an existing convention |
| **OWNER DECISION** | Needs the Arena owner to decide |
| **SETUP NEEDED** | Does not exist, or is not usable as-is |
| **UNVERIFIED** | Inferred or not checkable from the repo |

## Executive summary

1. **There is no environment named "staging."** The nearest equivalent is the **preview** environment: Fly app `justinzero-preview` plus the isolated Supabase project `orbace-sudoku-preview`. `AGENTS.md` records the Fly app as **suspended**. It was last used for the Phase 3 session-service work (July 2026).
2. **Three hazards could touch production by accident** (details below):
   - A push to `origin/main` auto-deploys the web frontend, and CI's `migrate-db` job runs on pushes to `main`.
   - `backend/org-api/.env.example` points `DATABASE_URL` at the production Supabase host.
   - The Arena Phase 1 branch **starts rounds by reading `PuzzleDaily`**, which is the public Daily supply. That contradicts the Phase 4 "private puzzles only, no fallback" requirement.
3. The Arena owner needs to make five decisions: resume the preview app, choose the web origin for browser testing, choose the host account, approve a private-puzzle design, and approve a retention policy (section 7).

---

## 1. Staging environment

| Item | Status | Detail |
|---|---|---|
| Environment name | **CONFIRMED** | "Preview." Provisioned 2026-07-26 for Phase 3. The named contact is Justin Zero, who is the sole maintainer, so "Platform Team" collapses to one person. |
| Backend / deploy config | **CONFIRMED** | Fly app `justinzero-preview`, region `ord`, config `backend/org-api/fly.preview.toml`. Internal port 8080, health check `GET /health`, `auto_stop_machines`, `min_machines_running = 0`, 1 GB shared CPU. No scheduled jobs. |
| App state | **CONFIRMED (per docs)** | `AGENTS.md` says "`justinzero-preview` is suspended (free)." **UNVERIFIED** whether that is still true. |
| API base URL | **UNVERIFIED** | Not written anywhere I read. By Fly naming it would be `https://justinzero-preview.fly.dev`. Confirm before use. |
| Staging web URL | **SETUP NEEDED** | No preview web frontend is documented. The Phase 3 verification was done by calling the preview API directly. |
| Same origin? | **CONFIRMED for production only** | Production is same-origin through a Vercel `/api/*` rewrite to the Fly backend (`orbace-v4-frontend/vercel.json`). The preview API has its own host and no documented web proxy. |
| Origin / CSRF / auth behavior | **CONFIRMED** | A global CSRF `preHandler` runs on POST/PUT/PATCH/DELETE requests that carry the `orbace_session` cookie. It checks `Origin`, with a double-submit fallback when `Origin` is absent. Pure bearer requests are exempt. The cookie is `httpOnly`, `secure`, `SameSite=Lax`, host-only (no `Domain`), `path=/`. The cookie path is gated by `USE_COOKIE_SESSIONS`, which was left **on** in preview on 2026-07-26 (current value **UNVERIFIED**). |
| Proxy | **CONFIRMED** | Production path is user → Cloudflare → Vercel static SPA → `/api/*` proxied to Fly. Cloudflare rewrites HTML and caches. The preview has none of that unless one is created. |
| Deployment mechanism | **CONFIRMED** | Manual `fly deploy` from a machine with a CLI session. There are no CI-based deploys. Fly applies Prisma migrations on container boot. |
| Shared with others? | **CONFIRMED (effectively no)** | A single maintainer owns it. Treat it as single-tenant. |
| Feature-flag convention | **CONFIRMED** | Flags are environment variables set as Fly secrets (`fly secrets set KEY=value`, which triggers a rolling restart). `feature-flags.ts` uses `FLAG_*` names, default **off**, exact-string match, read fresh on every call. `USE_COOKIE_SESSIONS` is a precedent for per-environment flips. The Arena flag `ARENA_ENABLED` follows the same exact-match, fail-closed pattern (per the Arena audit). |

**Recommended.** Use `justinzero-preview` plus the preview Supabase project, deployed manually from the Arena branch. For browser validation of the host flow with a cookie session, choose one of:
- **(a)** a Vercel preview deployment of `orbace-v4-frontend` whose `/api` rewrite points at `justinzero-preview`, or
- **(b)** drive host actions against the preview API origin directly.

Option (a) matches production's same-origin Origin/CSRF behavior and is the better test. **OWNER DECISION.**

---

## 2. Database, migrations, and RLS

| Item | Status | Detail |
|---|---|---|
| Non-production database | **CONFIRMED** | Supabase project `orbace-sudoku-preview`, ref `vzpqsfpdktcnkkrcxzfj`. It is "genuinely separate" and schema-identical to production through the same Prisma migrations. |
| Shared or disposable | **CONFIRMED / UNVERIFIED** | Persistent and used for the Phase 3 tests. It is not documented as disposable, so treat it as shared-with-history. Its current migration state is **UNVERIFIED**. |
| Getting `DATABASE_URL` | **CONFIRMED** | The app reads it from Fly secrets. For CLI work it is read from a local, git-ignored `.env`. The Supabase CLI uses a personal access token from the owner's password manager. Never paste values into GitHub or chat. |
| Who applies Prisma migrations | **CONFIRMED** | `prisma migrate deploy` runs automatically on every Fly container boot (`Dockerfile` CMD). It also runs in CI on pushes to `main` (the `migrate-db` job). **Deploying the Arena build to the preview app is what applies Arena's Prisma migrations to the preview DB.** |
| RLS track | **CONFIRMED** | Hand-written SQL lives in `infra/supabase/migrations/`, applied manually through the Supabase SQL editor or `supabase db query --linked`. Prisma never manages it. A preview-specific file exists at `infra/supabase/preview/011_rls_preview_all_tables.sql`. Convention: every Prisma table gets its `ENABLE ROW LEVEL SECURITY` in the same session. |
| Arena RLS | **CONFIRMED (per Arena audit)** | The five Arena tables enable RLS inside the same Prisma migration transaction. The local disposable-Postgres script (`scripts/arena-review-postgres.sh`) applied all 48 migrations and verified RLS. |
| Can Arena migrations apply to preview? | **UNVERIFIED** | The preview DB has been idle since July. Before applying, run a **read-only** comparison of `_prisma_migrations` against the 48 checked-in migrations to detect drift. |
| Backup | **UNVERIFIED** | No backup procedure is documented for the preview project. **RECOMMENDED:** take a logical dump or snapshot before the first Arena migration, if the plan allows. |
| Rollback | **CONFIRMED (partial)** | `fly releases rollback` reverts code, not schema. Prisma migrations have no down-migrations. Arena's tables are new, so **RECOMMENDED** rollback is: flag off, then (if needed) reviewed SQL that drops only the five Arena tables. |
| Production must not be used | **CONFIRMED, with hazards** | Production is Fly app `justinzero` and Supabase ref `qzyfzpzncdmmqvcvgrmq`. |

**Hazards to design around:**
- **`backend/org-api/.env.example` ships a production `DATABASE_URL` and `SUPABASE_URL`** (host `db.qzyfzpzncdmmqvcvgrmq…`). Copying it verbatim aims local Prisma commands at production. `deployment.md` also notes dev and prod share a Supabase project by default.
- **Pushing to `origin/main` is a production event.** The frontend auto-deploys, and `migrate-db` runs against the project CI is configured for (**UNVERIFIED** which one). Arena work must stay on a branch and must not merge to `main` as part of staging.

**Recommended guard:** before any Prisma or SQL command, assert the connection string contains `vzpqsfpdktcnkkrcxzfj` and refuse if it contains `qzyfzpzncdmmqvcvgrmq`.

---

## 3. Host account

| Item | Status | Detail |
|---|---|---|
| Account type | **RECOMMENDED** | A dedicated staging account created inside the **preview** Supabase project, with no relation to real users. Orbace supports Instant Identity (tier-1 anonymous UUID) and Google sign-in. |
| Existing account | **UNVERIFIED** | The Phase 3 tests registered fresh identities. No named reusable test account is documented. |
| Stable identifier to allowlist | **CONFIRMED (per Arena audit) / OWNER DECISION** | The Arena routes call canonical `authenticate()` and compare the verified `sub` (Supabase auth user UUID) with the allowlist. Orbace `playerId` may differ from `sub`, so Arena should allowlist `sub`, confirmed against the preview account. |
| Getting the identifier without credentials | **RECOMMENDED** | After the owner signs in, they read the identifier from an authenticated response such as `GET /auth/session` (returns the player object) or from the Supabase dashboard's Authentication > Users page. They paste only the UUID. Codex never needs a password or token. |
| Google/OAuth in staging | **UNVERIFIED / SETUP NEEDED** | `project-status.md` records a Google OAuth client with JS origins for `orbacesudoku.com` "and preview URL", but not which URL. The preview Supabase project would need its own Google provider and redirect URLs. **RECOMMENDED:** use Instant Identity for the first smoke so OAuth is not a dependency. |
| Who creates it | **OWNER DECISION** | The owner signs in manually. Codex cannot provision a Supabase user without the service-role key, which stays owner-only. |

---

## 4. Private Arena puzzle supply

**Blocker to resolve first.** The Arena audit (Phase 1) says round start reads `puzzleId`, `givens`, and `solution` from **`PuzzleDaily`** through an internal Prisma select. `PuzzleDaily` is the public Daily supply, so this conflicts with the Phase 4 rule "never fall back to public Daily/official/protected supply." The design must change before staging. **OWNER DECISION.**

| Item | Status | Detail |
|---|---|---|
| Approved source or generator | **PARTIAL** | A generator exists at `packages/sudoku_engine/lib/src/engine/sudoku_generator.dart`. Whether it guarantees unique solutions and is approved for Arena is **UNVERIFIED** and needs an owner call. |
| Use generated Orbace puzzles? | **RECOMMENDED / OWNER DECISION** | Yes. Orbace-generated puzzles are Orbace-owned, which avoids third-party licensing. Do **not** use the standalone prototype's base grid, which is a well-known public puzzle (see `ARENA-ISSUE-002`). |
| How to seed | **RECOMMENDED** | Create a dedicated Arena-owned table (for example `arena_puzzle`) with `givens`, `solution`, `checksum`, `preset/tier`, `provenance`, and `status`. Enable RLS and let no other surface read or write it. Seed it from a reviewed script run only against the preview DB. |
| Quantity and mix | **RECOMMENDED** | About 12 puzzles: 4 Easy, 4 Medium, 4 Hard (the three Arena presets). That covers one smoke and several rematches with no repeats. Verify each has a unique solution. |
| Provenance and ownership | **RECOMMENDED** | Record the generator version, date, and solver verification per row. Mark them Arena-private with no promotion path to other surfaces. |
| Tables to exclude | **CONFIRMED** | `PuzzleDaily` (public Daily), `PuzzlePool` (the Daily promotion queue; reading it can interfere with `usedOn` promotion), `Pack` / `PackPuzzle`, `PuzzleChallengeSubmission`, `CompetitionPuzzleSlot` / `CompetitionAttempt`, and the shared `Puzzle`, `CanonicalPuzzle`, `SourcePuzzle`, and `PuzzleProvenance` library and identity tables unless the owner explicitly approves reuse. |

---

## 5. Privacy and retention

| Item | Status | Detail |
|---|---|---|
| Existing staging data policy | **SETUP NEEDED** | I found no documented policy for test users, anonymous identifiers, logs, or staging retention. Existing retention material covers other surfaces (Reddit retention purge, Su-Pu lab retention) and is not a general staging rule. |
| Test users and sessions | **CONFIRMED (by practice)** | The Phase 3 preview tests used freshly registered identities in the isolated preview project. |
| Logs | **CONFIRMED** | Backend errors go to Sentry (`src/lib/sentry.ts`, via the `SENTRY_DSN` secret). Fly logs hold runtime output. Whether the preview app has a Sentry DSN is **UNVERIFIED**. |
| Analytics and telemetry | **UNVERIFIED** | Nothing staging-specific is documented. |
| Real account data in staging | **RECOMMENDED** | No. The preview project is isolated, so the staging host should be a throwaway identity. |
| Arena's own draft policy | **CONFIRMED** | The Arena PRD proposes salted guest hashes, no raw IP retention beyond transient rate limiting, and `ARENA_EVENT_RETENTION_DAYS=30`. |

**Recommended staging policy (for owner approval):** test-only data, no real accounts, a 7-day retention cap on Arena events, a reviewed purge of Arena tables after the smoke, no analytics on Arena endpoints, and no raw IPs or guest identifiers in logs. **OWNER DECISION.**

---

## 6. Deployment, smoke, and rollback

| Item | Status | Detail |
|---|---|---|
| Deploy a staging build | **CONFIRMED / RECOMMENDED** | Run `npx prisma generate` in `backend/org-api/` first (stale-client trap). Then `fly deploy` from the Arena branch with the preview config (`-c fly.preview.toml`). The exact command line is **UNVERIFIED**. |
| Setting `ARENA_ENABLED=true` in staging only | **RECOMMENDED** | `fly secrets set ARENA_ENABLED=true -a justinzero-preview`. Never pass `-a justinzero`. Set it only after the migration and seed are verified. |
| Host allowlist | **RECOMMENDED** | Supply the host `sub` as a Fly secret on the preview app only. The variable name is defined by `arenaHostAllowlist()` on the Arena branch, and I did not verify it. An empty allowlist must keep all hosts rejected (fail-closed). |
| Health and smoke checks | **CONFIRMED / SETUP NEEDED** | `GET /health` and `GET /org/status` are the documented post-deploy checks. `tools/scripts/prod-smoke.sh` targets production. Do not run it against staging without checking how it is parameterized (**UNVERIFIED**). **RECOMMENDED:** an Arena-specific smoke covering flag-off 404, anonymous host 401, non-allowlisted host rejected, allowlisted host can create, guest vote, start, solve, and rematch idempotency. |
| Logs and metrics | **CONFIRMED** | `fly logs -a justinzero-preview`, Sentry, and the Supabase dashboard logs for the preview project. |
| Rollback | **CONFIRMED** | Flag off (`fly secrets unset` or set to `false`) is the fastest path and was exercised on preview for `USE_COOKIE_SESSIONS`. `fly releases rollback` reverts code. Schema rollback is manual (section 2). |
| Release process | **CONFIRMED** | `docs/release-handoff-contract.md` requires an RC document pinning one commit, with scope, DB changes, test evidence, post-deploy checks, and rollback. That contract is written for production. **RECOMMENDED:** a lightweight RC note for the staging run. |
| Repo and branch requirements | **CONFIRMED / RECOMMENDED** | The Arena work lives on `codex/arena-phase1-integration`, which branched before the current `main` (mobile and backend changes have landed since). Rebase or merge `main` and re-run the backend suite before deploying. Keep it on a branch. Merging to `main` is a production event. |

---

## 7. Owner-only manual actions

- Decide whether to **resume** the suspended `justinzero-preview` Fly app (billing is minimal but real).
- Perform or authorize all **secret** operations on the preview app (`DATABASE_URL`, Supabase keys, `TIER1_TOKEN_SECRET`, `ARENA_ENABLED`, the allowlist). These need a Fly session.
- Provide Supabase access (`supabase login` / access token) for any preview SQL or RLS work.
- **Sign in** with the staging host account and share only its `sub`.
- Configure Google OAuth redirect and origin entries for preview, if Google sign-in is wanted.
- Create or approve a **Vercel preview** deployment and `/api` rewrite, if option (a) is chosen.
- Approve the preview-DB migration, the private-puzzle design and seed, and the retention policy.
- Confirm in writing that **no production resource** is in scope.

---

## 8. Remaining unknowns and blockers

**Blockers (must resolve before the authorization is requested):**
1. **Puzzle supply design.** Arena's round start reads `PuzzleDaily`. A private supply must replace it.
2. **Preview state.** The Fly app is documented as suspended, and the preview DB's migration state is unknown.
3. **Web origin.** No preview frontend exists, so the same-origin Origin/CSRF behavior can't be exercised in a browser until option (a) or (b) is chosen.
4. **Branch drift.** The Arena branch must be brought up to date with `origin/main` before any deploy.

**Unknowns to confirm (answerable without changing anything):**
- The preview API hostname and whether the app is running.
- The current value of `USE_COOKIE_SESSIONS` and the secret set on the preview app.
- Whether `_prisma_migrations` on the preview DB matches the checked-in migrations.
- Which database CI's `migrate-db` job targets.
- Whether `sub` and `playerId` differ for the staging account.
- Whether Google sign-in works on preview.
- Whether the preview app has a Sentry DSN.
- How `prod-smoke.sh` and `pre-deploy-check.sh` can be pointed at preview.
- The generator's uniqueness guarantee, and approval to use it.
- Backup options on the preview Supabase plan.

**Proposed single authorization for the Arena owner** (once the blockers are closed): resume `justinzero-preview`; apply the Arena migrations to the preview DB only; seed about 12 private puzzles; enable `ARENA_ENABLED` on the preview app only; allowlist one staging host `sub`; run the Arena smoke; then purge Arena data and turn the flag off. Production, `main`, and the production Supabase project stay out of scope.

## Superseding owner direction — 2026-10-29

This response is historical and was written before the owner’s staging authorization. The owner has since explicitly selected `orbace-sudoku-zerotap-test` (Supabase ref `cjimlozschaolqqsqksu`) as the Arena Preview database, superseding the earlier `vzpqsfpdktcnkkrcxzfj` ref. The owner authorized the Preview-only migration/deployment/configuration and smoke after all target and recovery guards pass. The owner also decided on three ballot time modes using **Extreme puzzles only**, approved a throwaway Instant Identity host, and approved a seven-day event retention cap, no Arena analytics, and no raw IP or guest identifiers in logs. The owner later supplied 20 boards; 16 pass Orbace consistency, uniqueness, and Extreme-rating validation, exceeding the ten-board minimum. Four invalid boards are excluded (indices 9, 10, 12, 18).

Read-only checks subsequently verified the newly selected project as active/healthy and initially empty. No migrations, seed, app start, deployment, host configuration, or feature enablement has occurred. Fly Preview remains suspended; its configured `DATABASE_URL` target and backup/recovery capability are still unverified, so the app has not been started. These unresolved shared-DB guards and the missing throwaway host identity remain blockers; the 16 validated puzzles are ready for private seeding once those safeguards pass.
