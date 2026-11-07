/* Waiting for the database at start-up, and saying what is wrong in plain words. A server that starts a few seconds before its database
   (docker compose, a restarted VPS) tries again for a while instead of dying; a wrong password, a missing database or tables that were
   never created stop it at once with the one command that fixes it. */
import type { Queryable } from './db.js';

/** The tables the running server needs most; if one is missing the migrations were never run. */
const NEEDED = ['app.users', 'app.sessions'];

export function explainDbError(e: unknown): string {
  const err = e as { code?: string; message?: string; errors?: { code?: string }[] };
  const code = err?.code ?? err?.errors?.[0]?.code ?? '';
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT' || code === 'EAI_AGAIN') return 'The database cannot be reached. Is it running, and are the host and port in DATABASE_URL right?';
  if (code === '28P01' || code === '28000') return 'The database refused the user name or password in DATABASE_URL. Run "npm run db:setup" (it sets the role passwords) and use the same ones.';
  if (code === '3D000') return 'The database named in DATABASE_URL does not exist. Create it (createdb), then run "npm run db:setup".';
  if (code === '42P01' || code === '3F000') return 'The database has no tables yet. Run "npm run db:setup" (or "npm run migrate") once, then start the server again.';
  if (/SSL|TLS/i.test(err?.message ?? '')) return 'The database connection failed on TLS. For a database on the same machine or private network set DATABASE_SSL=off.';
  return `The database check failed: ${err?.message ?? String(e)}`;
}

const permanent = (e: unknown): boolean => ['28P01', '28000', '3D000', '42P01', '3F000'].includes((e as { code?: string })?.code ?? '');

/** Tries `select 1` and the table check until the database answers, up to `tries` times. Throws one clear error. */
export async function waitForDb(q: Queryable, opts: { tries?: number; delayMs?: number; log?: (m: string) => void; sleep?: (ms: number) => Promise<void> } = {}): Promise<void> {
  const tries = opts.tries ?? 20, delay = opts.delayMs ?? 1500, log = opts.log ?? (() => undefined), sleep = opts.sleep ?? (ms => new Promise(r => setTimeout(r, ms)));
  let last: unknown;
  for (let i = 1; i <= tries; i++) {
    try {
      await q.query('select 1');
      for (const t of NEEDED) {
        const r = await q.query<{ ok: string | null }>('select to_regclass($1) as ok', [t]);
        if (!r.rows[0]?.ok) throw Object.assign(new Error(`table ${t} is missing`), { code: '42P01' });
      }
      return;
    } catch (e) {
      last = e;
      if (permanent(e)) break;
      log(`waiting for the database (${i}/${tries}): ${explainDbError(e)}`);
      if (i < tries) await sleep(delay);
    }
  }
  throw new Error(explainDbError(last));
}
