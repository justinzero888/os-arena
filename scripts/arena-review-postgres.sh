#!/usr/bin/env bash
# Disposable local review database only. Does not source .env or reuse a DB;
# Prisma receives an explicit loopback DATABASE_URL for every subprocess.
set -euo pipefail

arena_repo="${1:-/Users/justinzero/.codex/worktrees/orbace-arena-phase1}"
arena_evidence="${2:-/private/tmp/arena-phase1-review-evidence}"
arena_pg_port=55432
for arena_command in initdb pg_ctl createdb psql pg_isready node npm; do
  command -v "$arena_command" >/dev/null || { echo "Missing prerequisite: $arena_command" >&2; exit 1; }
done
test -f "$arena_repo/backend/org-api/prisma/schema.prisma" || { echo 'Expected Orbace backend worktree' >&2; exit 1; }
test -x "$arena_repo/backend/org-api/node_modules/.bin/vitest" || { echo 'Run the documented npm ci in backend/org-api first' >&2; exit 1; }
if pg_isready -q -h 127.0.0.1 -p "$arena_pg_port"; then
  echo 'Port 55432 is already in use; this script will not touch that server' >&2
  exit 1
fi
mkdir -p "$arena_evidence"
arena_pg_dir="$(mktemp -d /private/tmp/arena-phase1-review.XXXXXX)"
arena_cleanup() {
  pg_ctl -D "$arena_pg_dir/data" stop -m fast >/dev/null 2>&1 || true
  rm -rf -- "$arena_pg_dir"
}
trap arena_cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
initdb -D "$arena_pg_dir/data" -U arena -A trust --no-locale >"$arena_evidence/initdb.log"
pg_ctl -D "$arena_pg_dir/data" -l "$arena_pg_dir/server.log" -o "-p $arena_pg_port -h 127.0.0.1 -k $arena_pg_dir" -w start
createdb -h 127.0.0.1 -p "$arena_pg_port" -U arena arena_app
arena_db_url="postgresql://arena@127.0.0.1:$arena_pg_port/arena_app?schema=public"
cd "$arena_repo/backend/org-api"
export DATABASE_URL="$arena_db_url"
npx --no-install prisma validate 2>&1 | tee "$arena_evidence/prisma-validate.log"
npx --no-install prisma generate 2>&1 | tee "$arena_evidence/prisma-generate.log"
npx --no-install prisma migrate deploy 2>&1 | tee "$arena_evidence/migrations.log"
# Inspect protection BEFORE the optional companion script: private tables
# must already be protected by the Prisma migration's own transaction.
psql -h 127.0.0.1 -p "$arena_pg_port" -U arena -d arena_app -v ON_ERROR_STOP=1 -Atc \
  "SELECT relname || '|rls=' || relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('arena_sessions','arena_rounds','arena_votes','arena_events','arena_solve_ingresses','arena_puzzle_supply') ORDER BY relname; SELECT 'arena_policies=' || count(*) FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'arena_%'; SELECT 'migrations_applied=' || count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;" \
  | tee "$arena_evidence/rls-before-companion.log"
psql -h 127.0.0.1 -p "$arena_pg_port" -U arena -d arena_app -v ON_ERROR_STOP=1 \
  -f "$arena_repo/infra/supabase/migrations/019_arena_pilot.sql" >"$arena_evidence/rls-companion.log"
npm run build 2>&1 | tee "$arena_evidence/build.log"
ARENA_TEST_DATABASE_URL="$arena_db_url" npm test -- --reporter=dot 2>&1 | tee "$arena_evidence/backend-tests.log"
echo 'Local review finished; the disposable database will now be removed.'
