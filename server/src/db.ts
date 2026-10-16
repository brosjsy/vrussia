/* The database, as the rest of the server sees it: parameterised queries (never strings glued together with user input) and transactions.
   In production this is the `pg` driver with a connection pool; the tests plug in PGlite (real PostgreSQL in WebAssembly) behind the same
   interface, with the same migrations and the same least-privileged role. Whole numbers of type bigint come back as JavaScript numbers in both. */
import pg from 'pg';

export interface Rows<T> { rows: T[]; rowCount: number }
export interface Queryable { query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<Rows<T>> }
export interface Db extends Queryable {
  /** Runs `fn` in one transaction: everything or nothing. */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

pg.types.setTypeParser(20, v => (v === null ? null : Number(v)));       // bigint: ids and counts stay far below 2^53

export function pgDb(url: string, ssl: 'require' | 'off', max: number): Db {
  const pool = new pg.Pool({
    connectionString: url, max,
    ssl: ssl === 'require' ? { rejectUnauthorized: true } : false,
    idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000,                // no request can hold the database for long
    application_name: 'vrussia-server',
  });
  pool.on('error', () => { /* a dropped idle connection: the pool makes a new one */ });
  const wrap = (c: Pick<pg.PoolClient, 'query'>): Queryable => ({
    query: async <T>(text: string, params?: unknown[]) => { const r = await c.query(text, params); return { rows: r.rows as T[], rowCount: r.rowCount ?? 0 }; },
  });
  return {
    ...wrap(pool),
    async tx(fn) {
      const c = await pool.connect();
      let broken = false;
      try {
        await c.query('begin');
        const out = await fn(wrap(c));
        await c.query('commit');
        return out;
      } catch (e) {
        try { await c.query('rollback'); } catch { broken = true; /* the connection is gone; the database rolls back by itself */ }
        throw e;
      } finally { c.release(broken); }          // a broken connection is thrown away, not given to the next request
    },
    close: () => pool.end(),
  };
}
