import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startDb, ROOT } from './harness.js';
import type { TestDb } from './harness.js';
import { migrate, readMigrations } from '../src/migrate.js';

let t: TestDb;
beforeAll(async () => { t = await startDb(); }, 60_000);
afterAll(async () => { await t?.close(); });

describe('migrations', () => {
  it('apply on an empty database, are recorded with checksums, and a second run applies nothing', async () => {
    const r = await t.admin('select name, length(checksum) as l from app_meta.migrations order by name');
    expect(r.rows.map(x => x.name)).toEqual(readMigrations(ROOT + 'migrations').map(m => m.name));
    expect(r.rows.every(x => x.l === 64)).toBe(true);
    expect(await t.as('vr_owner', s => migrate(s, readMigrations(ROOT + 'migrations')))).toEqual([]);
  });
  it('refuse to run when an applied file was changed, or when an applied file is missing', async () => {
    const list = readMigrations(ROOT + 'migrations');
    await expect(t.as('vr_owner', s => migrate(s, list.map((m, i) => (i === 0 ? { ...m, checksum: 'x'.repeat(64) } : m))))).rejects.toThrow(/was changed after it was applied/);
    await expect(t.as('vr_owner', s => migrate(s, list.slice(1)))).rejects.toThrow(/its file is missing/);
  });
  it('a failing migration leaves nothing behind, and the next good one still applies', async () => {
    const list = readMigrations(ROOT + 'migrations');
    await expect(t.as('vr_owner', s => migrate(s, [...list, { name: '9998_broken.sql', sql: 'create table app.half (id int); select 1/0;', checksum: 'y'.repeat(64) }]))).rejects.toThrow(/9998_broken.sql failed/);
    expect((await t.admin("select to_regclass('app.half') as t")).rows[0].t).toBeNull();
    expect((await t.admin("select count(*)::int as n from app_meta.migrations where name = '9998_broken.sql'")).rows[0].n).toBe(0);
    expect(await t.as('vr_owner', s => migrate(s, [...list, { name: '9999_fine.sql', sql: 'create table app.fine (id int);', checksum: 'z'.repeat(64) }]))).toEqual(['9999_fine.sql']);
    await t.admin('drop table app.fine'); await t.admin("delete from app_meta.migrations where name = '9999_fine.sql'");
  });
});

describe('least privilege: what the server role (vr_app) cannot do', () => {
  const refused = async (sql: string): Promise<string> => { try { await t.db.query(sql); return 'allowed'; } catch (e) { return (e as Error).message; } };
  it('runs as vr_app', async () => { expect((await t.db.query<{ u: string }>('select current_user as u')).rows[0].u).toBe('vr_app'); });
  it('cannot create, change or drop tables, or create roles', async () => {
    expect(await refused('create table app.evil (id int)')).toMatch(/permission denied/);
    expect(await refused('create table public.evil (id int)')).toMatch(/permission denied/);
    expect(await refused('drop table app.users')).toMatch(/must be owner|permission denied/);
    expect(await refused('alter table app.users add column x int')).toMatch(/must be owner|permission denied/);
    expect(await refused('create role sneaky')).toMatch(/permission denied/);
  });
  it('cannot read or change the migration history, write announcements, rewrite scores or messages, or delete the audit log', async () => {
    expect(await refused('select * from app_meta.migrations')).toMatch(/permission denied/);
    expect(await refused("insert into app.announcements (title, body) values ('hi', 'there')")).toMatch(/permission denied/);
    expect(await refused('update app.scores set score = 99999')).toMatch(/permission denied/);
    expect(await refused("update app.messages set body = 'changed'")).toMatch(/permission denied/);
    expect(await refused('delete from app.auth_events')).toMatch(/permission denied/);
  });
  it('the backup role can read every table and cannot write', async () => {
    await t.as('vr_backup', async s => {
      expect((await s.query('select count(*)::int as n from app.users')).rows[0].n).toBe(0);
      await expect(s.query("insert into app.counters (key) values ('xx')")).rejects.toThrow(/permission denied|read-only/);
      expect((await s.query('select count(*)::int as n from app_meta.migrations')).rows[0].n).toBe(readMigrations(ROOT + 'migrations').length);                // what pg_dump needs: the history and the id sequences
      expect((await s.query('select last_value from app.scores_id_seq')).rows.length).toBe(1);
    });
  });
});
