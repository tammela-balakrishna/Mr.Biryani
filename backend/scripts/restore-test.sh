#!/usr/bin/env bash
# Restore drill: restores a backup into a THROWAWAY database and checks that the critical
# tables and the seven roles are present. Never points at the live database.
# Usage: RESTORE_ADMIN_URL=postgresql://user:pass@host:5432/postgres ./scripts/restore-test.sh backups/mrbiryani-XXXX.dump
set -euo pipefail

: "${RESTORE_ADMIN_URL:?Set RESTORE_ADMIN_URL to a libpq URL of a maintenance database (e.g. .../postgres) with CREATEDB rights}"
dump="${1:?Usage: restore-test.sh <dump-file>}"
scratch="mrbiryani_restore_$(date -u +%s)"
scratch_url="${RESTORE_ADMIN_URL%/*}/$scratch"

psql "$RESTORE_ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE $scratch"
cleanup() { psql "$RESTORE_ADMIN_URL" -q -c "DROP DATABASE IF EXISTS $scratch" >/dev/null; }
trap cleanup EXIT

pg_restore --no-owner --no-privileges --exit-on-error --dbname="$scratch_url" "$dump"

roles=$(psql "$scratch_url" -tAc "SELECT count(*) FROM roles WHERE code IN ('CUSTOMER','WAITER','RECEPTIONIST','CAPTAIN','CASHIER','MANAGER','ADMIN')")
audit_triggers=$(psql "$scratch_url" -tAc "SELECT count(*) FROM pg_trigger WHERE tgname = 'audit_logs_no_update_delete'")
flyway=$(psql "$scratch_url" -tAc "SELECT count(*) FROM flyway_schema_history WHERE success")

[ "$roles" = "7" ] || { echo "FAIL: expected 7 system roles, found $roles"; exit 1; }
[ "$audit_triggers" = "1" ] || { echo "FAIL: audit append-only trigger missing"; exit 1; }
[ "$flyway" -ge 1 ] || { echo "FAIL: no successful Flyway migrations recorded"; exit 1; }
echo "PASS: restored $dump into a scratch database (roles=$roles, migrations=$flyway); scratch database dropped"
