/* npm run migrate: applies the migrations in server/migrations with the OWNER role.
   It reads MIGRATION_DATABASE_URL (a connection as vr_owner), never the server's DATABASE_URL, so the two rights stay apart.
   Usage:  MIGRATION_DATABASE_URL=postgres://vr_owner:...@host:5432/vrussia npm run migrate            (status: add "status") */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { migrate, readMigrations } from './migrate.js';

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) { console.error('Set MIGRATION_DATABASE_URL to a connection as vr_owner.'); process.exit(2); }
const here = dirname(fileURLToPath(import.meta.url));
const dir = [join(here, '../migrations'), join(here, '../../migrations')].find(d => existsSync(d));          // from src/ or from dist/src/
if (!dir) { console.error('The migrations folder was not found.'); process.exit(2); }
const list = readMigrations(dir);
const ssl = process.env.DATABASE_SSL === 'off' ? false : { rejectUnauthorized: true };
const client = new pg.Client({ connectionString: url, ssl });
await client.connect();
try {
  if (process.argv[2] === 'status') {
    const done = await client.query("select name, applied_at from app_meta.migrations order by name").catch(() => ({ rows: [] as { name: string; applied_at: Date }[] }));
    const have = new Set(done.rows.map(r => r.name));
    for (const m of list) console.log(`${have.has(m.name) ? 'applied ' : 'PENDING '} ${m.name}`);
  } else {
    const applied = await migrate({ query: (t, p) => client.query(t, p), exec: sql => client.query(sql) }, list, m => console.log(m));
    console.log(applied.length ? `Done: ${applied.length} applied.` : 'Nothing to apply: the database is up to date.');
  }
} catch (e) { console.error((e as Error).message); process.exitCode = 1; } finally { await client.end(); }
