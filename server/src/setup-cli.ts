/* npm run db:setup: the whole first-time database set-up in one safe, repeatable command (running it again changes nothing that is already right).
   1. creates the three roles (ops/db/00_roles.sql), 2. gives them passwords if OWNER_PASSWORD / APP_PASSWORD / BACKUP_PASSWORD are set,
   3. applies the migrations as vr_owner. It reads ADMIN_DATABASE_URL (a superuser, or the owner of the database); nothing is read from the game's own settings.
   Usage:  ADMIN_DATABASE_URL=postgres://postgres:...@localhost:5432/vrussia APP_PASSWORD=... npm run db:setup */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { migrate, readMigrations } from './migrate.js';
import { explainDbError } from './db-ready.js';

const url = process.env.ADMIN_DATABASE_URL;
if (!url) { console.error('Set ADMIN_DATABASE_URL to a connection as the database administrator (for example the postgres user).'); process.exit(2); }
const here = dirname(fileURLToPath(import.meta.url));
const find = (rel: string): string | undefined => [join(here, '..', rel), join(here, '../..', rel)].find(p => existsSync(p));
const migrationsDir = find('migrations'), rolesFile = find('ops/db/00_roles.sql');
if (!migrationsDir || !rolesFile) { console.error('The migrations folder or ops/db/00_roles.sql was not found.'); process.exit(2); }

const client = new pg.Client({ connectionString: url, ssl: process.env.DATABASE_SSL === 'off' ? false : { rejectUnauthorized: true } });
try {
  await client.connect();
  await client.query(readFileSync(rolesFile, 'utf8'));
  console.log('roles ready: vr_owner, vr_app, vr_backup');
  for (const [role, env] of [['vr_owner', 'OWNER_PASSWORD'], ['vr_app', 'APP_PASSWORD'], ['vr_backup', 'BACKUP_PASSWORD']] as const) {
    const pw = process.env[env];
    if (pw) { await client.query(`alter role ${role} password ${client.escapeLiteral(pw)}`); console.log(`password set for ${role}`); }
  }
  await client.query('grant vr_owner to current_user').catch(() => undefined);      // a non-superuser administrator needs to be allowed to act as the owner
  await client.query('set role vr_owner');
  const applied = await migrate({ query: (t, p) => client.query(t, p), exec: sql => client.query(sql) }, readMigrations(migrationsDir), m => console.log(m));
  console.log(applied.length ? `Done: ${applied.length} migration(s) applied.` : 'Nothing to apply: the database is up to date.');
  if (!process.env.APP_PASSWORD) console.log('Note: no APP_PASSWORD was given; set one (alter role vr_app password ...) before the server connects as vr_app.');
} catch (e) { console.error(explainDbError(e)); console.error((e as Error).message); process.exitCode = 1; } finally { await client.end().catch(() => undefined); }
