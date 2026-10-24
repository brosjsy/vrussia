/* A real PostgreSQL for the tests: PGlite (PostgreSQL 17 compiled to WebAssembly), in memory. The roles script and the migrations run on it
   exactly as on a real server (as an administrator, then as vr_owner); afterwards everything runs as vr_app, the small role the server uses.
   PGlite is one database session; its queries and transactions take turns, so concurrent requests in a test are still safe. */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate, readMigrations } from '../src/migrate.js';
import type { Session } from '../src/migrate.js';
import type { Db, Queryable, Rows } from '../src/db.js';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..') + '/';   // a plain string: a browser-like test environment replaces the URL class

export interface TestDb {
  db: Db;
  /** Runs SQL as the administrator (to look at or change what a test needs), then returns to vr_app. */
  admin: (sql: string, params?: unknown[]) => Promise<Rows<Record<string, unknown>>>;
  /** Runs `fn` as another role (vr_owner for migrations, vr_backup for backups), then returns to vr_app. */
  as: <T>(role: string, fn: (s: Session) => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
}

export async function startDb(): Promise<TestDb> {
  // PT_DB_DIR keeps the database in a folder (the play-test can leave its players behind for testing by hand: npm run local -- --db <folder>)
  const pgl = await PGlite.create({ dataDir: process.env.PT_DB_DIR || undefined, parsers: { 20: (v: string) => Number(v) } });
  const session: Session = { query: (t, p) => pgl.query(t, p) as never, exec: sql => pgl.exec(sql) };
  await pgl.exec(readFileSync(ROOT + 'ops/db/00_roles.sql', 'utf8'));
  await pgl.exec('set role vr_owner');
  await migrate(session, readMigrations(ROOT + 'migrations'));
  await pgl.exec('set role vr_app');
  const wrap = (q: { query: PGlite['query'] }): Queryable => ({
    query: async <T>(text: string, params?: unknown[]) => { const r = await q.query<T>(text, params); return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length }; },
  });
  const db: Db = { ...wrap(pgl), tx: fn => pgl.transaction(t => fn(wrap(t as never))), close: async () => undefined };
  const as = async <T>(role: string, fn: (s: Session) => Promise<T>): Promise<T> => {
    await pgl.exec('reset role'); if (role !== 'admin') await pgl.exec(`set role ${role}`);
    try { return await fn(session); } finally { await pgl.exec('reset role'); await pgl.exec('set role vr_app'); }
  };
  return { db, as, admin: (sql, params = []) => as('admin', () => wrap(pgl).query(sql, params)), close: () => pgl.close() };
}
