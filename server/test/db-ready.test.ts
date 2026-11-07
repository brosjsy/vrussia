import { describe, it, expect } from 'vitest';
import { waitForDb, explainDbError } from '../src/db-ready.js';
import type { Queryable } from '../src/db.js';

const fake = (script: (n: number, text: string) => unknown): Queryable => { let n = 0; return { query: async (text: string) => { const r = script(++n, text); if (r instanceof Error) throw r; return { rows: r as never[], rowCount: 1 }; } } as Queryable; };
const errc = (code: string): Error => Object.assign(new Error('x'), { code });
const fast = { sleep: async () => undefined, delayMs: 0 };

describe('waiting for the database', () => {
  it('tries again while the database starts, then goes on', async () => {
    const seen: string[] = [];
    await waitForDb(fake((n, t) => (n < 3 ? errc('ECONNREFUSED') : t.includes('to_regclass') ? [{ ok: 'app.users' }] : [])), { ...fast, log: m => seen.push(m) });
    expect(seen.length).toBe(2);
  });
  it('stops at once on a wrong password and says what to do', async () => {
    await expect(waitForDb(fake(() => errc('28P01')), fast)).rejects.toThrow(/db:setup/);
  });
  it('says the migrations were not run when the tables are missing', async () => {
    await expect(waitForDb(fake((_n, t) => (t.includes('to_regclass') ? [{ ok: null }] : [])), fast)).rejects.toThrow(/no tables yet/);
  });
  it('gives up after the allowed tries', async () => {
    await expect(waitForDb(fake(() => errc('ECONNREFUSED')), { ...fast, tries: 3 })).rejects.toThrow(/cannot be reached/);
  });
  it('explains unknown errors with their own message', () => { expect(explainDbError(new Error('boom'))).toContain('boom'); });
});
