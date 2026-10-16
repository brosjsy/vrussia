/* Database migrations: the numbered .sql files in server/migrations, applied in order, each in its own transaction, each once.
   - Applied files are recorded with a checksum in app_meta.migrations; changing a file that was already applied stops the run
     (write a new migration instead), so every database built from this repository has exactly the same history.
   - A session-level advisory lock means two servers starting together do not migrate at the same time.
   - Forward only: there is no automatic "down". Undoing a change is a new migration, reviewed like any other.
   Migrations are run by the owner role (vr_owner), never by the role the server runs as. */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
/** One database session (migrations need the same session for the lock, the transactions and the statements). `exec` runs a file of many statements. */
export interface Session { query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>; exec(sql: string): Promise<unknown> }

const LOCK = 7_340_101;   // any fixed number, the same for every server of this application
export interface Migration { name: string; sql: string; checksum: string }

export function readMigrations(dir: string): Migration[] {
  const files = readdirSync(dir).filter(f => /^\d{4}_[a-z0-9_]+\.sql$/.test(f)).sort();
  return files.map(name => { const sql = readFileSync(join(dir, name), 'utf8'); return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') }; });
}

/** Applies what has not been applied yet; returns the names applied now. */
export async function migrate(client: Session, list: Migration[], log: (m: string) => void = () => undefined): Promise<string[]> {
  await client.query('select pg_advisory_lock($1)', [LOCK]);
  try {
    await client.query('create schema if not exists app_meta');
    await client.query('create table if not exists app_meta.migrations (name text primary key, checksum text not null, applied_at timestamptz not null default now())');
    const done = new Map((await client.query('select name, checksum from app_meta.migrations')).rows.map(r => [String(r.name), String(r.checksum)]));
    for (const [name] of done) if (!list.some(m => m.name === name)) throw new Error(`Migration ${name} is recorded in the database but its file is missing`);
    const applied: string[] = [];
    for (const m of list) {
      const was = done.get(m.name);
      if (was) { if (was !== m.checksum) throw new Error(`Migration ${m.name} was changed after it was applied; write a new migration instead`); continue; }
      await client.exec('begin');
      try {
        await client.exec(m.sql);
        await client.query('insert into app_meta.migrations (name, checksum) values ($1, $2)', [m.name, m.checksum]);
        await client.exec('commit');
      } catch (e) { await client.exec('rollback'); throw new Error(`Migration ${m.name} failed: ${(e as Error).message}`); }
      applied.push(m.name); log(`applied ${m.name}`);
    }
    return applied;
  } finally { await client.query('select pg_advisory_unlock($1)', [LOCK]); }
}
