#!/usr/bin/env bash
# Logical backup of the Mr. BIRIYANI database (custom format, compressed).
# Usage: DATABASE_URL_PG=postgresql://user:pass@host:5432/mrbiryani ./scripts/backup.sh [output_dir]
# Store the output off-machine (encrypted object storage) and keep the schedule in your ops tooling.
set -euo pipefail

: "${DATABASE_URL_PG:?Set DATABASE_URL_PG to a libpq URL, e.g. postgresql://user:pass@host:5432/mrbiryani}"
out_dir="${1:-./backups}"
mkdir -p "$out_dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
file="$out_dir/mrbiryani-$stamp.dump"

pg_dump --format=custom --no-owner --no-privileges --file="$file" "$DATABASE_URL_PG"
pg_restore --list "$file" > /dev/null   # fail now if the archive is unreadable
echo "Backup written: $file ($(du -h "$file" | cut -f1))"
