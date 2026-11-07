// A whole online stack on this computer, for playing the game in a browser against the real server (development only):
// a PostgreSQL wire server (PGlite, in memory unless DEV_DB_DIR names a folder), the roles script, the migrations, and the BUILT server
// (npm run build first) on http://127.0.0.1:8787 with e-mails printed here instead of sent.
// Then start the game with VITE_API_URL=http://127.0.0.1:8787 (for example in a .env.development.local file, which git ignores).
// Stop with Ctrl+C.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, renameSync } from 'node:fs';
import pg from 'pg';

const DBPORT = Number(process.env.DEV_DB_PORT ?? 25433), API = Number(process.env.DEV_API_PORT ?? 8787), GAME = process.env.DEV_GAME ?? 'http://127.0.0.1:5173';
// DEV_DB_DIR keeps the database in a folder between runs (npm run local does this); without it everything is in memory
const url = `postgres://postgres@127.0.0.1:${DBPORT}/postgres`;
/** Opens the database, creates the roles and applies the migrations. Returns the database and its socket server. */
async function bringUp(dir) {
  const db = await PGlite.create(dir || undefined);
  const sock = new PGLiteSocketServer({ db, port: DBPORT, host: '127.0.0.1' });
  try {
    await sock.start();
    const admin = new pg.Client({ connectionString: url }); await admin.connect();
    await admin.query(readFileSync(new URL('../ops/db/00_roles.sql', import.meta.url), 'utf8'));
    await admin.query('set role vr_owner'); await admin.end();
    await new Promise((ok, bad) => { const p = spawn(process.execPath, ['dist/src/migrate-cli.js'], { env: { ...process.env, MIGRATION_DATABASE_URL: url, DATABASE_SSL: 'off' }, stdio: 'inherit' }); p.on('exit', c => (c === 0 ? ok() : bad(new Error('migrations failed')))); });
  } catch (e) { await sock.stop().catch(() => {}); await db.close().catch(() => {}); throw e; }
  return { db, sock };
}
// DEV_DB_DIR keeps the database in a folder between runs (npm run local does this); without it everything is in memory.
// A folder that cannot be opened (a crash left it half written) or whose history no longer matches the migration files (a migration was
// edited while it was still being written) is moved aside as <folder>.old-<time> and a fresh database is built, so a development set-up never gets stuck.
const dir = process.env.DEV_DB_DIR || undefined;
let up;
try { up = await bringUp(dir); } catch (e) {
  if (!dir || !existsSync(dir)) throw e;
  const aside = `${dir}.old-${Date.now()}`;
  console.error(`dev stack: the saved database could not be used (${e.message}). Moving it to ${aside} and starting a fresh one.`);
  renameSync(dir, aside);
  up = await bringUp(dir);
}
const { db, sock } = up;
const a2 = new pg.Client({ connectionString: url }); await a2.connect(); await a2.query('set role vr_app'); await a2.end();
const srv = spawn(process.execPath, ['dist/src/main.js'], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development', HOST: '127.0.0.1', PORT: String(API), PUBLIC_URL: `http://127.0.0.1:${API}`, APP_URL: GAME + '/', CORS_ORIGINS: GAME + (process.env.DEV_CORS_EXTRA ? ',' + process.env.DEV_CORS_EXTRA : ''),   // DEV_CORS_EXTRA: a second game address, to play two players in one browser (localhost next to 127.0.0.1)
  DATABASE_URL: url, DATABASE_SSL: 'off', DATABASE_POOL_MAX: '1', COOKIE_SECURE: 'false', EMAIL_TRANSPORT: 'console', EMAIL_FROM: 'V Russia <no-reply@localhost>', LOG_LEVEL: 'warn' } });
console.log(`dev stack: database on ${DBPORT}, server on http://127.0.0.1:${API}, game allowed from ${GAME}`);
const stop = async () => { srv.kill('SIGTERM'); await sock.stop(); await db.close(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
srv.on('exit', async code => { console.error(`dev stack: the server stopped (code ${code})`); await sock.stop(); await db.close(); process.exit(code || 1); });
