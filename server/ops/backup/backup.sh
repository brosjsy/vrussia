#!/usr/bin/env bash
# Nightly backup of the V Russia database (run by the systemd timer ops/backup/vrussia-backup.timer, or cron).
# - pg_dump in custom format (compressed, restorable table by table) as the read-only role vr_backup;
# - encrypted with age (https://age-encryption.org) to a PUBLIC key, so the VPS alone cannot read old backups if it is broken into;
# - a SHA-256 next to each file; 14 daily and 8 weekly copies kept; optionally copied off the machine with rclone.
# Needs: pg_dump (same major version as the server), age, sha256sum; optional: rclone.
# Settings come from /etc/vrussia/backup.env (chmod 600):  PGPASSWORD=...  AGE_RECIPIENT=age1...  [RCLONE_REMOTE=remote:bucket/vrussia]
set -euo pipefail
umask 077
source /etc/vrussia/backup.env
DIR="${BACKUP_DIR:-/var/backups/vrussia}"
DB="${PGDATABASE:-vrussia}"
: "${AGE_RECIPIENT:?set AGE_RECIPIENT (the public key backups are encrypted to)}"
mkdir -p "$DIR/daily" "$DIR/weekly"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$DIR/daily/vrussia-$STAMP.dump.age"

PGHOST="${PGHOST:-/var/run/postgresql}" PGUSER=vr_backup pg_dump --dbname="$DB" --format=custom --compress=9 \
  | age --encrypt --recipient "$AGE_RECIPIENT" > "$OUT.part"
mv "$OUT.part" "$OUT"
sha256sum "$OUT" > "$OUT.sha256"
[ "$(stat -c %s "$OUT")" -gt 1024 ] || { echo "backup suspiciously small: $OUT" >&2; exit 1; }

# a weekly copy on Sundays
if [ "$(date -u +%u)" = "7" ]; then cp "$OUT" "$OUT.sha256" "$DIR/weekly/"; fi
# keep 14 daily and 8 weekly
ls -1t "$DIR"/daily/*.dump.age 2>/dev/null | tail -n +15 | while read -r f; do rm -f -- "$f" "$f.sha256"; done
ls -1t "$DIR"/weekly/*.dump.age 2>/dev/null | tail -n +9 | while read -r f; do rm -f -- "$f" "$f.sha256"; done

# off the machine (strongly recommended: a backup on the same disk dies with the disk)
if [ -n "${RCLONE_REMOTE:-}" ]; then rclone copy --immutable "$DIR" "$RCLONE_REMOTE"; fi
echo "backup ok: $OUT"
