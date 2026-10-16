# Running V Russia on your own VPS, with your own PostgreSQL

This is the plan for hosting the game, its server and **your own database that you manage yourself** on one rented Linux machine (a VPS).
No Supabase or other database service is involved. Everything named here is in this repository under `server/`.

> Status: the server, the migrations and the scripts are written and tested in this repository (49 server tests, 5 tests of the game's client against the real server, and an end-to-end smoke
> test through the real PostgreSQL driver). **They have not yet been run on a real VPS or a real PostgreSQL server**, because neither exists
> yet. Docker and the backup scripts could not be run on the development machine (no Docker, no `pg_dump` there); their syntax was checked.
> Expect to follow this guide once on a test VPS before putting real players on it.

## 1. The machine

| | Start with | Grow to |
|---|---|---|
| Size | 2 vCPU, 4 GB RAM, 80 GB SSD | 4 vCPU, 8 GB, 160 GB when you pass ~2,000 daily players or the database passes ~20 GB |
| System | **Ubuntu 24.04 LTS** (or Debian 12) | |
| Where | A provider with a data centre near your players, snapshots and a firewall in its panel (Hetzner, DigitalOcean, OVH, Vultr, Linode, Selectel / Timeweb in Russia). If many players are in Russia, check where the data must legally be kept (Federal Law 152-FZ on personal data: e-mail addresses are personal data). | |
| Extra | Turn on the provider's automatic weekly snapshots (cheap, a second safety net) | A second small VPS in another city for the off-site backup copies, or object storage |

One machine runs everything: nginx (HTTPS), the game's files, the API server (Node.js) and PostgreSQL 17. PostgreSQL listens **only on
127.0.0.1**, so it cannot be reached from the internet at all.

```
internet ──443──▶ nginx ──▶ /var/www/vrussia (the game)          example.com
                       └──▶ 127.0.0.1:8080  API server (vr_app)  api.example.com
                                 └──▶ 127.0.0.1:5432  PostgreSQL 17 (local only)
                                           └──▶ nightly encrypted backups ──▶ off-site copy
```

## 2. First hour on the VPS (security basics)

```bash
# as root, once
adduser admin && usermod -aG sudo admin                  # your own login; then log in as admin
# copy your SSH public key to /home/admin/.ssh/authorized_keys, check you can log in with it, THEN:
sudo sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/; s/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl reload ssh
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y ufw fail2ban unattended-upgrades nginx certbot python3-certbot-nginx age rclone
sudo ufw default deny incoming && sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable   # 5432 stays CLOSED
sudo dpkg-reconfigure -plow unattended-upgrades          # security updates install themselves
sudo timedatectl set-timezone UTC
```

## 3. PostgreSQL 17, installed directly (recommended for managing it yourself)

Installed from the PostgreSQL project's own packages, so you get every minor (security) release through `apt`.

```bash
sudo apt install -y postgresql-common && sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
sudo apt install -y postgresql-17
sudo cp server/ops/postgres/vrussia.conf /etc/postgresql/17/main/conf.d/vrussia.conf    # listen on 127.0.0.1, memory, logs
sudo cp server/ops/postgres/pg_hba.conf /etc/postgresql/17/main/pg_hba.conf            # who may connect, and how
sudo systemctl restart postgresql
sudo -u postgres createdb vrussia
sudo -u postgres psql -d vrussia -v ON_ERROR_STOP=1 -f server/ops/db/00_roles.sql     # the three roles
sudo -u postgres psql -d vrussia    # then type, one at a time, and give each a different long random password:
#   \password vr_owner
#   \password vr_app
#   \password vr_backup
```

Generate passwords with `openssl rand -base64 32`. Keep them in a password manager. The three roles:

| Role | Used by | May |
|---|---|---|
| `vr_owner` | you, when you run migrations | create and change tables (owns the schema) |
| `vr_app` | the running server | read and write rows of the game's tables, call its functions; **no** table changes, no migration history, 15 s per statement |
| `vr_backup` | the nightly backup | read everything, write nothing |
| `postgres` | you, for administration | everything; only reachable as the Linux user `postgres` (`sudo -u postgres psql`) |

**Data checksums** (detect a failing disk early): with PostgreSQL stopped, `sudo -u postgres /usr/lib/postgresql/17/bin/pg_checksums --enable -D /var/lib/postgresql/17/main`.

## 4. The server (API)

```bash
sudo adduser --system --group --home /opt/vrussia vrussia
sudo mkdir -p /opt/vrussia /etc/vrussia && sudo chown admin /opt/vrussia
# put the repository's server/ folder at /opt/vrussia/server (git clone, or copy), then:
cd /opt/vrussia/server && npm ci && npm run build && npm prune --omit=dev
sudo cp .env.example /etc/vrussia/server.env && sudo chmod 600 /etc/vrussia/server.env && sudo nano /etc/vrussia/server.env
#   fill in: your domains, DATABASE_URL with the vr_app password, the SMTP settings of your e-mail provider, the brand
MIGRATION_DATABASE_URL='postgres://vr_owner:THE_OWNER_PASSWORD@127.0.0.1:5432/vrussia' DATABASE_SSL=off npm run migrate
sudo cp ops/systemd/vrussia-api.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now vrussia-api
curl -s http://127.0.0.1:8080/api/health          # {"ok":true}
```

Node.js 24 LTS: install from NodeSource or with the distribution's package if it is version 22 or newer.
`npm run migrate:status` lists applied and pending migrations. Run migrations **before** starting a new version of the server.

### Alternative: Docker

`server/docker-compose.yml` runs PostgreSQL 17 and the API in containers (PostgreSQL only on a private network, the API on
127.0.0.1:8080, read-only filesystem, no Linux capabilities). It is simpler to start but harder to tune and back up by hand; if you choose it,
run the roles script and the migrations with `docker compose exec db psql ...` and adapt the backup timer to `docker compose exec db pg_dump`.

## 5. HTTPS and the game

```bash
sudo cp server/ops/nginx/vrussia.conf /etc/nginx/sites-available/vrussia && sudo ln -s /etc/nginx/sites-available/vrussia /etc/nginx/sites-enabled/
# replace example.com with your domains in that file, point both DNS names (A/AAAA records) at the VPS, then:
sudo certbot --nginx -d example.com -d api.example.com          # certificates renew by themselves
npm run build    # in the game folder, with VITE_API_URL=https://api.example.com in .env; copy dist/ to /var/www/vrussia
sudo nginx -t && sudo systemctl reload nginx
```

The API must be on the **same site** as the game (`api.example.com` next to `example.com`): the session cookie is `SameSite=Lax`.

## 6. E-mail

Any provider that offers SMTP works (Amazon SES, Postmark, Mailgun, Brevo, a Yandex 360 or Mail.ru business mailbox for players in
Russia...). Put its host, port and login in `server.env`. For mail to arrive and not land in spam, add the provider's **SPF** and **DKIM**
DNS records for your domain and a **DMARC** record (`_dmarc.example.com  TXT  "v=DMARC1; p=quarantine"`). Send a test by signing up yourself.
The wording and look of the e-mails are files in `server/templates/`; to change them without touching the code, copy the files you want to change into a folder and set
`TEMPLATE_DIR` (and the `BRAND_*` settings for name, colour, logo, support address and footer).

## 7. Backups (do not skip this)

**Level 1: nightly encrypted dumps** (included):

```bash
age-keygen -o age-key.txt          # ON YOUR OWN COMPUTER, not on the VPS. Keep age-key.txt safe (two copies). It prints the public key age1...
sudo mkdir -p /var/backups/vrussia && sudo chown postgres: /var/backups/vrussia
sudo tee /etc/vrussia/backup.env >/dev/null <<'X'
PGPASSWORD=THE_VR_BACKUP_PASSWORD
AGE_RECIPIENT=age1...the public key...
RCLONE_REMOTE=offsite:vrussia-backups
X
sudo chmod 600 /etc/vrussia/backup.env && sudo chown postgres: /etc/vrussia/backup.env
sudo cp server/ops/backup/vrussia-backup.{service,timer} /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now vrussia-backup.timer
sudo systemctl start vrussia-backup.service && journalctl -u vrussia-backup -n 20      # run one now and read the result
```

- Every night at 03:15 UTC: `pg_dump` as `vr_backup`, encrypted to your public key, a SHA-256 checksum, 14 daily + 8 weekly copies.
- `RCLONE_REMOTE` copies them off the machine (`rclone config` once: an S3 bucket, Backblaze B2, another VPS over SFTP...). A backup that
  lives only on the same disk is lost with it.
- Because backups are encrypted to a key that is **not** on the VPS, somebody who breaks into the VPS cannot read old backups.

**Level 2 (later): point-in-time recovery.** Nightly dumps can lose up to a day. When the game has many players, add continuous WAL
archiving with **pgBackRest** or **WAL-G** to object storage (restore to any minute). The commented lines in `ops/postgres/vrussia.conf` show where.

**Test the restore once a month** (an untested backup is a hope, not a backup):

```bash
scp age-key.txt admin@vps:/tmp/ && ssh admin@vps
sudo -u postgres /opt/vrussia/server/ops/backup/restore.sh /var/backups/vrussia/daily/<newest>.dump.age vrussia_restore /tmp/age-key.txt
shred -u /tmp/age-key.txt
sudo -u postgres dropdb vrussia_restore      # after checking the counts it printed
```

### Restoring after a disaster

1. Stop the API: `sudo systemctl stop vrussia-api`.
2. Restore the newest good backup into a new database (`restore.sh ... vrussia_new ...`) and check it.
3. Rename: `sudo -u postgres psql -c "alter database vrussia rename to vrussia_broken"` then `... vrussia_new rename to vrussia"`.
4. Start the API, check `/api/health`, log in yourself. Keep `vrussia_broken` until you are sure, then drop it.

## 8. Looking after it

| How often | What |
|---|---|
| Automatic | security updates (unattended-upgrades), certificate renewal (certbot), nightly backups, hourly clean-up of old sessions/presence/tokens (the server does it) |
| Weekly | `journalctl -u vrussia-api --since -7d -p warning`; `journalctl -u vrussia-backup -n 5`; disk space `df -h` (alert at 80%) |
| Monthly | restore test (above); `sudo apt full-upgrade` and reboot if a new kernel came; `cd server && npm audit --omit=dev` |
| Each new version | back up, `npm ci && npm run build`, `npm run migrate`, `sudo systemctl restart vrussia-api`, check `/api/health` |
| Yearly | PostgreSQL major upgrade (`pg_upgradecluster`) after testing on a copy; rotate the three database passwords |

Monitoring: an external uptime check on `https://api.example.com/api/health` (UptimeRobot, Better Stack, or your own) that e-mails you.
Useful queries (as `sudo -u postgres psql vrussia`):

```sql
select pg_size_pretty(pg_database_size('vrussia'));                                   -- database size
select count(*) from pg_stat_activity where datname = 'vrussia';                      -- open connections
select kind, count(*) from app.auth_events where created_at > now() - interval '1 day' group by kind;   -- logins, failures, resets
select relname, n_dead_tup from pg_stat_user_tables order by n_dead_tup desc limit 5; -- autovacuum keeping up?
```

## 9. Moving from this guide to Docker or to two machines later

- Two machines: put PostgreSQL on a second VPS on the provider's **private network**, change `listen_addresses` to its private address,
  use `hostssl` lines in `pg_hba.conf`, and `DATABASE_SSL=require` with a real certificate.
- Several API servers: the log-in limit per e-mail is kept in memory per server; put a shared store (Redis) behind `@fastify/rate-limit`
  and the throttle in `server/src/app.ts` before running more than one.
