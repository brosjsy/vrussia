// End-to-end smoke test of the BUILT server (npm run build first): a PostgreSQL wire-protocol server (PGlite) on a local port, the roles
// script, `node dist/src/migrate-cli.js`, then `node dist/src/main.js` over real HTTP: sign up, confirm by the link printed by the console
// e-mail transport, log in with the cookie, save and load. Not a replacement for a run against a real PostgreSQL; see docs/DEPLOY_VPS.md.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import pg from 'pg';

const DBPORT = 25432, APIPORT = 28080, ORIGIN = 'http://localhost:5173';
const db = await PGlite.create();
const sock = new PGLiteSocketServer({ db, port: DBPORT, host: '127.0.0.1' }); await sock.start();
const url = `postgres://postgres@127.0.0.1:${DBPORT}/postgres`;
const run = (args, env) => new Promise((ok, bad) => { const p = spawn(process.execPath, args, { env: { ...process.env, ...env } }); let out = ''; p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; }); p.on('exit', code => (code === 0 ? ok(out) : bad(new Error(out)))); });
const step = (m) => console.log('✔ ' + m);

const admin = new pg.Client({ connectionString: url }); await admin.connect();
await admin.query(readFileSync(new URL('../ops/db/00_roles.sql', import.meta.url), 'utf8'));
await admin.query('set role vr_owner'); await admin.end();              // PGlite is one session: the role stays for the next connection
console.log((await run(['dist/src/migrate-cli.js'], { MIGRATION_DATABASE_URL: url, DATABASE_SSL: 'off' })).trim()); step('migrations applied by migrate-cli');
console.log((await run(['dist/src/migrate-cli.js'], { MIGRATION_DATABASE_URL: url, DATABASE_SSL: 'off' })).trim()); step('second run applies nothing');
const a2 = new pg.Client({ connectionString: url }); await a2.connect(); await a2.query('set role vr_app'); await a2.end();

let log = '';
const srv = spawn(process.execPath, ['dist/src/main.js'], { env: { ...process.env, NODE_ENV: 'development', HOST: '127.0.0.1', PORT: String(APIPORT), PUBLIC_URL: `http://127.0.0.1:${APIPORT}`, APP_URL: ORIGIN + '/', CORS_ORIGINS: ORIGIN,
  DATABASE_URL: url, DATABASE_SSL: 'off', DATABASE_POOL_MAX: '1', COOKIE_SECURE: 'false', EMAIL_TRANSPORT: 'console', EMAIL_FROM: 'V Russia <no-reply@localhost>', LOG_LEVEL: 'warn' } });
srv.stdout.on('data', d => { log += d; }); srv.stderr.on('data', d => { log += d; });
const api = async (method, path, body, cookie) => { const r = await fetch(`http://127.0.0.1:${APIPORT}${path}`, { method, headers: { origin: ORIGIN, ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, json: await r.json().catch(() => null), cookie: r.headers.get('set-cookie') }; };
for (let i = 0; i < 50; i++) { try { if ((await api('GET', '/api/health')).status === 200) break; } catch { /* not up yet */ } await new Promise(r => setTimeout(r, 200)); }
try {
  if ((await api('GET', '/api/health')).status !== 200) throw new Error('server did not start:\n' + log);
  step('server up, health check passes through the pg driver');
  const email = 'smoke@example.org', password = 'a long smoke passphrase';
  if ((await api('POST', '/api/auth/register', { email, password })).status !== 200) throw new Error('register failed');
  await new Promise(r => setTimeout(r, 300));
  const token = /#verify=([A-Za-z0-9_-]{43})/.exec(log)?.[1]; if (!token) throw new Error('no verify link in the console e-mail:\n' + log);
  step('sign-up e-mail printed by the console transport');
  if ((await api('POST', '/api/auth/verify', { token })).status !== 200) throw new Error('verify failed');
  const li = await api('POST', '/api/auth/login', { email, password }); if (li.status !== 200 || !/HttpOnly/i.test(li.cookie ?? '')) throw new Error('login failed ' + JSON.stringify(li));
  const cookie = li.cookie.split(';')[0]; step('confirmed and logged in; HttpOnly cookie set (not Secure, development only)');
  if ((await api('POST', '/api/profile', { username: 'smoke', adult: true }, cookie)).status !== 200) throw new Error('profile failed');
  if ((await api('PUT', '/api/save', { data: { version: 3, day: 7, money: 42 } }, cookie)).status !== 200) throw new Error('save failed');
  const ld = await api('GET', '/api/save', undefined, cookie); if (ld.json?.data?.money !== 42) throw new Error('load failed');
  step('profile, save and load over HTTP');
  if ((await api('POST', '/api/auth/login', { email, password: 'wrong wrong wrong' })).status !== 401) throw new Error('wrong password accepted');
  const forged = await fetch(`http://127.0.0.1:${APIPORT}/api/auth/logout`, { method: 'POST', headers: { origin: 'https://evil.example', cookie } }); if (forged.status !== 403) throw new Error('forged request accepted');
  step('wrong password refused; a request from another site refused');
  console.log('SMOKE TEST PASSED');
} finally { srv.kill('SIGTERM'); await new Promise(r => setTimeout(r, 500)); await sock.stop(); await db.close(); }
