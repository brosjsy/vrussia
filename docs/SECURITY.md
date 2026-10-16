# Security of the online part (own server)

What is protected, how, and how it was checked. The server is `server/`; the deployment is described in `docs/DEPLOY_VPS.md`.

## What an attacker might want, and what stops it

| Threat | Defence | Checked by |
|---|---|---|
| Stealing a session | 256-bit random token in an `HttpOnly; Secure; SameSite=Lax` cookie named `__Host-…` (bound to one host); only its SHA-256 is stored; idle (14 d) and absolute (60 d) limits; a new session at each log-in | `server/test/auth.test.ts` (cookie flags, hash only, fixation, expiry, header/forged cookie refused), `test/api-client.test.ts` (no token in the page's storage) |
| Guessing passwords | Argon2id (19 MiB, 2 passes); 10 log-in tries per minute per IP and 10 per 15 min per e-mail; at least 10 characters, common passwords and the e-mail itself refused | `auth.test.ts`, `security.test.ts` (rate limits at their real values) |
| Finding out who has an account | Same answers and timing for known and unknown addresses at sign-up, log-in, forgot-password and resend; "email not confirmed" only after the right password | `auth.test.ts` |
| Using a link twice, or an old link | E-mail tokens are single use, short-lived (24 h / 30 min), stored as hashes, cancelled by a newer one; they travel after `#` (never in server logs or Referer) and are removed from the address bar | `auth.test.ts`, `test/api-client.test.ts` |
| Taking over through a reset | A reset ends every session and sends a "password changed" e-mail; changing the password needs the current one and logs out other devices; deleting the account needs the password | `auth.test.ts` |
| Forged requests from other sites (CSRF) | Every change must carry an allowed `Origin` and JSON; other sites get no CORS permission | `security.test.ts`; removing the check makes the test fail (checked) |
| Reading or changing another player's data | The player's id always comes from the session, never from the request; private rows are filtered by it in every query and SQL function | `server/test/game.test.ts` (saves, private talks, ads, sessions of others); loosening the private-talk rule makes the test fail (checked) |
| SQL injection | Only parameterised queries; input checked with zod | `security.test.ts` |
| A stolen database copy | No passwords or tokens in it (hashes only); backups encrypted to a key kept off the server | design; the backup script (not run here) |
| A compromised server process | The server's database role cannot change tables, read the migration history, or create roles; statements stop after 15 s; systemd/Docker sandboxing | `server/test/db.test.ts` |
| Flooding | Rate limits per IP; chat, ads, notes, scores and e-mails have daily or hourly caps in SQL | `game.test.ts`, `auth.test.ts` |
| Leaking details in errors | Only known, plain error codes reach the player; anything else is "server error" and goes to the log, where cookies are removed | `security.test.ts` |

## Known limits

- The per-e-mail log-in counter lives in the server's memory: with more than one server process, put a shared store (Redis) in front.
- No two-factor authentication yet; no e-mail change flow yet (the address is fixed at sign-up).
- Not yet tested against a real PostgreSQL server, real SMTP, or in Docker (none on the development machine).
- Old Supabase code is still in the repository (unused when `VITE_API_URL` is set) until its removal is approved.

## Checks to repeat before each release

```bash
cd server && npm test && npm run smoke && npm audit --omit=dev
cd .. && npm test && npx vite build
```
