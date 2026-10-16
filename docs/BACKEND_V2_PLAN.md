# Own backend (v2): audit and plan

Requested 16 October 2026: replace the Supabase-based online part with an independently owned backend (PostgreSQL, Node.js, TypeScript),
with custom authentication, server-side sessions, hashed single-use e-mail tokens, branded and customisable e-mails, and a
provider-independent e-mail interface. No Supabase Auth, Database, Storage or client libraries in the final architecture.

## 1. Audit of the repository as it is

| Area | Finding |
|---|---|
| Game | A browser game (TypeScript + Vite, `src/`), ~110 test files, ~780 tests. Everything the game needs runs in the browser. |
| Player data | **Saved games live on the player's device** (`localStorage`, `src/store.ts`, export/import of a save file). This is the only real data, and nothing below touches it. |
| Online part | `src/cloud.ts` (one `Cloud` class, ~40 methods) speaks to Supabase over plain `fetch` (REST + GoTrue auth). `src/cloud-ui.ts` (the Online screen) and `src/cloud-sync.ts` (automatic save) only use the `Cloud` methods. |
| Server schema | `supabase/migrations/0001..0003.sql`: profiles, saves, scores, presence, chat (messages, blocks, reports), votes, counters, announcements, ads, follows, homes, guest book, home votes. Rules are enforced with RLS and `security definer` functions that rely on `auth.uid()` and `auth.users` (Supabase-only). |
| Server data | **None.** The Supabase project was never created (the owner chose "code only"), so there is no server data to migrate. |
| Supabase libraries | None: no `@supabase/*` package is installed. The coupling is the URL shapes (`/auth/v1`, `/rest/v1`), the `apikey` header and `auth.uid()`/`auth.users` in SQL. |
| Secrets | `.env` is git-ignored; `.env.example` holds only public names (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). No secrets are committed. |
| Session handling today | Access and refresh tokens are stored in `localStorage` (readable by any script on the page, so an XSS could steal them). |
| Tooling on this machine | Node 24; **no Docker and no `psql`**. Database tests therefore run against PGlite (real PostgreSQL compiled to WebAssembly) through its Postgres wire-protocol socket, using the same `pg` driver as production. Docker files are written but cannot be built or run here. |

### Risks found

1. Tokens in `localStorage` (XSS-stealable). The new design uses an `HttpOnly` cookie that scripts cannot read.
2. Authorisation lives in RLS policies tied to Supabase roles (`anon`, `authenticated`); outside Supabase those roles do not exist.
3. The client-side language filter and length checks are only convenience; the server must repeat them (it does today in SQL and will keep doing so).
4. No e-mail flows of our own (verification and reset were Supabase's).

## 2. Target architecture

```
browser (the game, Vite build)  ──HTTPS, cookie──▶  server/ (Node 24, Fastify, TypeScript)  ──pg, TLS──▶  PostgreSQL 16+
                                                       │
                                                       └──▶ EmailSender (interface): console | SMTP (any provider) | ...
```

- **`server/`**: its own npm package (so the game's download never contains server code), Fastify 5, `zod` validation, `pg` driver.
- **Passwords**: Argon2id (`@node-rs/argon2`; OWASP parameters: 19 MiB memory, 2 iterations, 1 lane). 10 to 256 characters.
- **Sessions**: a 256-bit random token in an `HttpOnly; Secure; SameSite=Lax; Path=/` cookie. The database keeps only its SHA-256 hash, with an idle timeout (14 days) and an absolute lifetime (60 days). New session at every login; all sessions ended after a password reset or change; a list of one's sessions with "log out everywhere".
- **E-mail tokens** (verification, password reset): 256-bit random, only the SHA-256 hash (hex) is stored, single use (`used_at`), short lives (verification 24 h, reset 30 min), older unused tokens of the same kind are cancelled when a new one is issued.
- **No account enumeration**: sign-up, "forgot password" and "resend verification" answer the same whatever the e-mail; an existing address gets a "someone tried to sign up with your address" e-mail instead.
- **CSRF**: `SameSite=Lax` cookie, plus every state-changing request must carry an `Origin` from the configured allow-list and a JSON body.
- **Rate limits**: per IP on every route, stricter per IP and per e-mail on login, sign-up, forgot-password and resend.
- **Headers**: `@fastify/helmet` (no-sniff, frame-deny, HSTS in production, a restrictive CSP for API answers).
- **E-mails**: an `EmailSender` interface (`send({to, subject, html, text})`); implementations: `console` (development and tests) and `smtp` (nodemailer, works with any provider: SES, Postmark, Mailgun, Gmail…). Templates are files in `server/templates/` with `{{placeholders}}` (values are HTML-escaped), and a brand block (name, colour, logo address, support address, footer) set in configuration.
- **Database**: version-controlled migrations (`server/migrations/`, plain SQL, applied by a small runner in `server/src/migrate.ts`: checksums, an advisory lock, one transaction per file, forward only; chosen over node-pg-migrate to avoid another dependency). The Supabase schema is ported: `auth.uid()` becomes an explicit `p_user` argument passed by the server after it checks the session; `auth.users` becomes `app.users`. The game rules already written in SQL (score caps, message limits, ad limits, reports that hide content…) are kept, so behaviour does not change.
- **Least privilege**: three roles: `vr_owner` (owns the schema, runs migrations, never used by the running server), `vr_app` (the server: only `select/insert/update/delete` on the tables it needs and `execute` on the functions; no DDL), `vr_backup` (read-only, for `pg_dump`). A setup script creates them; the migrations grant to them.
- **Client**: `src/cloud.ts` keeps its methods; a new transport talks to `VITE_API_URL` with `credentials: 'include'`, so the Online screen and the automatic save keep working unchanged. New screens: verify e-mail, forgot/reset password, sessions.
- **Operations**: `Dockerfile` (multi-stage, non-root user), `docker-compose.yml` (Postgres + server + a backup job), `scripts/backup.sh` / `restore.sh` (`pg_dump -Fc`, retention), `docs/DEPLOY.md`, `docs/SECURITY.md` (threat model and the checks that were run).

### About the "LagosLifeApp" branding

The brief asks for LagosLifeApp-branded e-mails. This repository is **V Russia**, and Lagos Life is the other game we looked at earlier (only for ideas). Putting another product's name on our e-mails would look like impersonation unless you own that name. So the brand is **configuration** (`BRAND_NAME`, `BRAND_COLOR`, `BRAND_LOGO_URL`, `BRAND_SUPPORT_EMAIL`, `BRAND_FOOTER`) and the default is "V Russia". If LagosLifeApp is yours, set `BRAND_NAME=LagosLifeApp` and it appears in every e-mail. Nothing else needs to change.

## 3. Stages (each one verified before the next)

| # | Stage | Verified by |
|---|---|---|
| 1 | `server/` package, configuration (validated, fails fast), Fastify app, health check, PGlite test harness | typecheck, tests |
| 2 | Migrations: roles, `app.users`, sessions, e-mail tokens, the ported game schema; grants | migration up on a fresh database, tests that `vr_app` cannot run DDL or read other schemas |
| 3 | Auth: sign-up, verify, resend, login, logout, me, forgot, reset, change password, sessions, delete account | tests incl. token reuse, expiry, enumeration, rate limits, CSRF, session fixation |
| 4 | E-mail: interface, console and SMTP senders, customisable branded templates | tests (escaping, brand, links, text version) |
| 5 | Game API: saves, scores, presence, chat, blocks, reports, votes, counters, announcements, ads, follows, talks, homes, guest book, best homes, friends, find players | port of the Supabase tests to the new API |
| 6 | Client switch: `src/cloud.ts` transport to the new API; verify/forgot/reset screens | existing cloud and cloud-ui tests, new ones |
| 7 | Docker, compose, backups, deployment and security documentation, `npm audit` | file checks; Docker cannot be run on this machine (stated) |

### Needs your approval (not done until you say so)

- **Deleting** `supabase/` and the Supabase parts of `src/cloud.ts`, `docs/BACKEND.md`, `.env.example` and their tests. Until then they stay in the repository, unused once the new transport is switched on.
- Anything on a real server (creating databases, DNS, sending real e-mails). Everything here is code and local tests.
- Git: nothing is committed or pushed (your standing rule).

## 4. Status (16 October 2026)

| # | Stage | State |
|---|---|---|
| 1 | Server package, settings, app | Done. The settings refuse insecure production values. |
| 2 | Migrations, roles, grants | Done: 0001 accounts, 0002 game (ported), 0003 backup rights. 7 tests, including what `vr_app` cannot do. |
| 3 | Accounts and sessions | Done. 17 tests. |
| 4 | E-mail | Done: console, SMTP and memory senders; 5 templates and a layout; an override folder; brand settings. |
| 5 | Game API | Done: every method of the old client. 11 tests, including privacy between players. |
| 6 | Client switch | Done: `src/api-client.ts`, used when `VITE_API_URL` is set; forgot, reset, confirm, change password and delete-with-password in the Online screen. 5 end-to-end tests against the real server. |
| 7 | Docker, backups, deployment, security | Written: `server/Dockerfile`, `server/docker-compose.yml`, `server/ops/`, `docs/DEPLOY_VPS.md`, `docs/SECURITY.md`. **Not run**: Docker and `pg_dump` are not installed on the development machine. |

Changes from the plan: the migration runner is a small one of our own (`server/src/migrate.ts`: checksums, an advisory lock, one
transaction per file, forward only) instead of node-pg-migrate; token hashes are stored as 64-character hex text.

Verified: 49 server tests (14 of them security), the end-to-end smoke test (`npm run smoke` in `server/`: the migration command, the built
server, real HTTP and the pg driver), two deliberate breakages caught by the tests (the forged-request check and private-talk privacy),
`npm audit` in `server/`: 0 vulnerabilities.

Not verified: a real PostgreSQL server, real SMTP delivery, the Docker image, the backup and restore scripts, the nginx and systemd files.

