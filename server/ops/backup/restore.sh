#!/usr/bin/env bash
# Restores a backup made by backup.sh INTO A NEW, EMPTY DATABASE. It refuses to touch an existing database: switching the live
# database to the restored copy is a separate, deliberate step (docs/DEPLOY_VPS.md, "Restoring").
# Usage (as the postgres Linux user, with the age PRIVATE key that is kept OFF the VPS):
#   sudo -u postgres ops/backup/restore.sh /var/backups/vrussia/daily/vrussia-<stamp>.dump.age  vrussia_restore  ~/age-key.txt
set -euo pipefail
FILE="${1:?backup file}"; TARGET="${2:?name of a NEW database, e.g. vrussia_restore}"; KEY="${3:?age private key file}"
[[ "$TARGET" =~ ^[a-z_][a-z0-9_]{0,40}$ ]] || { echo "bad database name" >&2; exit 2; }
if [ -f "$FILE.sha256" ]; then sha256sum --check --status "$FILE.sha256" || { echo "checksum does not match: the file is damaged" >&2; exit 1; }; fi
if psql -tAc "select 1 from pg_database where datname = '$TARGET'" | grep -q 1; then echo "database $TARGET already exists: refusing to overwrite it" >&2; exit 1; fi
createdb --owner=vr_owner "$TARGET"
age --decrypt --identity "$KEY" "$FILE" | pg_restore --dbname="$TARGET" --exit-on-error            # owners and grants come back as they were (the roles exist on this cluster)
psql -d "$TARGET" -v ON_ERROR_STOP=1 -c "grant connect on database $TARGET to vr_app, vr_backup"
psql -d "$TARGET" -tAc "select 'users: ' || count(*) from app.users union all select 'saves: ' || count(*) from app.saves union all select 'migrations: ' || string_agg(name, ', ' order by name) from app_meta.migrations"
echo "restored into $TARGET. Check it, then follow docs/DEPLOY_VPS.md to switch over."
