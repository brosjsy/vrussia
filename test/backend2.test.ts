/* The second migration (adverts, following, private talks, hiding reported messages, the daily cap, deleting an account, the clean-up job), tested like
   the first one: on a real PostgreSQL inside the test (PGlite), as an anonymous visitor and as several signed-in players. Nothing touches a real server. */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const id = (n: number): string => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const A = id(1), B = id(2), C = id(3), D = id(4), E = id(5);
let db: PGlite;
async function as<T = Record<string, unknown>>(uid: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  return db.transaction(async tx => { await tx.exec(`set local role ${uid ? 'authenticated' : 'anon'}`); await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid ?? '']); return (await tx.query<T>(sql, params)).rows; });
}
const fails = async (p: Promise<unknown>): Promise<string> => { try { await p; return ''; } catch (e) { return String((e as Error).message || e); } };
const direct = (a: string, b: string): string => `direct:${a < b ? a : b}:${a < b ? b : a}`;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth; create table auth.users (id uuid primary key);
    create role anon nologin; create role authenticated nologin;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
    alter default privileges in schema public grant usage, select on sequences to anon, authenticated;
  `);
  await db.exec(readFileSync('supabase/migrations/0001_init.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/0002_community.sql', 'utf8'));
  await db.query('insert into auth.users (id) values ($1), ($2), ($3), ($4), ($5)', [A, B, C, D, E]);
  for (const [u, n] of [[A, 'anna'], [B, 'boris'], [C, 'clara'], [D, 'dima'], [E, 'elena']]) await as(u, `select public.claim_profile('${n}', true)`);
}, 120000);

describe('the second migration', () => {
  it('applies after the first, and every table still has row level security', async () => {
    const t = (await db.query<{ relname: string; relrowsecurity: boolean }>(`select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'`)).rows;
    expect(t.map(x => x.relname)).toEqual(expect.arrayContaining(['ads', 'ad_reports', 'follows'])); expect(t.every(x => x.relrowsecurity)).toBe(true);
  });
});

describe('adverts from players', () => {
  it('a signed-in player with a name puts up an ad; everybody can read it; nobody can insert or change one directly', async () => {
    expect(await fails(as(null, `select public.post_ad('Moscow', 'sell', 'Winter boots', 'size 42', 1500)`))).not.toBe('');
    const [{ post_ad }] = await as<{ post_ad: number }>(A, `select public.post_ad('Moscow', 'sell', '  Winter boots  ', 'size 42', 1500)`); expect(Number(post_ad)).toBeGreaterThan(0);
    const seen = await as<{ title: string; username: string }>(null, `select title, username from public.ads where city = 'Moscow'`); expect(seen).toEqual([{ title: 'Winter boots', username: 'anna' }]);
    expect(await fails(as(B, `insert into public.ads (player_id, username, city, kind, title) values ('${B}', 'boris', 'Moscow', 'sell', 'Direct insert')`))).not.toBe('');
    await as(B, `update public.ads set title = 'Hacked title'`); expect((await as<{ title: string }>(null, `select title from public.ads`))[0].title).toBe('Winter boots');
  });
  it('refuses a bad kind, a bad title and a mad price, and allows three ads at a time', async () => {
    expect(await fails(as(B, `select public.post_ad('Moscow', 'weapons', 'Something', '', 0)`))).not.toBe('');
    expect(await fails(as(B, `select public.post_ad('Moscow', 'job', 'ab', '', 0)`))).toContain('bad length');
    expect(await fails(as(B, `select public.post_ad('Moscow', 'sell', 'A palace', '', 2000000000)`))).not.toBe('');
    for (const t of ['Help to move', 'Russian lessons', 'Looking for a room']) await as(B, `select public.post_ad('Kazan', 'job', '${t}', '', 0)`);
    expect(await fails(as(B, `select public.post_ad('Kazan', 'job', 'A fourth ad', '', 0)`))).toContain('too many');
  });
  it('only the owner takes an ad down; three reports hide it; an expired ad is not shown', async () => {
    await as(C, `delete from public.ads where username = 'boris'`); expect((await as(null, `select 1 from public.ads where username = 'boris'`)).length).toBe(3);
    const [{ id: ad }] = await as<{ id: number }>(null, `select id from public.ads where username = 'boris' limit 1`);
    await as(B, `delete from public.ads where id = ${ad}`); expect((await as(null, `select 1 from public.ads where username = 'boris'`)).length).toBe(2);
    const [{ id: target }] = await as<{ id: number }>(null, `select id from public.ads where username = 'anna'`);
    await as(B, `select public.report_ad(${target})`); await as(B, `select public.report_ad(${target})`); await as(C, `select public.report_ad(${target})`);
    expect((await as(null, `select 1 from public.ads where id = ${target}`)).length).toBe(1);               // two different players are not enough
    await as(D, `select public.report_ad(${target})`); expect((await as(null, `select 1 from public.ads where id = ${target}`)).length).toBe(0);
    expect((await as(C, `select 1 from public.ad_reports`)).length).toBe(0);                                  // nobody reads the reports
    await db.query(`update public.ads set expires_at = now() - interval '1 hour' where username = 'boris'`); expect((await as(null, `select 1 from public.ads where username = 'boris'`)).length).toBe(0);
  });
});

describe('messages', () => {
  it('a message reported by three different players disappears for everybody', async () => {
    const [{ send_message: m }] = await as<{ send_message: number }>(A, `select public.send_message('place:Moscow:market', 'something rude')`);
    for (const u of [B, C]) await as(u, `insert into public.reports (reporter, message_id, reason) values ('${u}', ${m}, 'rude')`);
    expect((await as(D, `select 1 from public.messages where id = ${m}`)).length).toBe(1);
    await as(D, `insert into public.reports (reporter, message_id, reason) values ('${D}', ${m}, 'rude')`);
    expect((await as(E, `select 1 from public.messages where id = ${m}`)).length).toBe(0); expect((await as(A, `select 1 from public.messages where id = ${m}`)).length).toBe(0);
  });
  it('nobody sends more than 300 messages in a day', async () => {
    await db.query(`insert into public.messages (room, sender, username, body, created_at) select 'place:Moscow:bank', $1, 'elena', 'x', now() - interval '2 hours' from generate_series(1, 299)`, [E]);
    await as(E, `select public.send_message('place:Moscow:bank', 'number three hundred')`);
    expect(await fails(as(E, `select public.send_message('place:Moscow:bank', 'one too many')`))).toContain('daily limit');
  });
  it('a player sees the list of their private talks, with the other name and the last line, and nobody else\'s', async () => {
    await as(A, `select public.send_message('${direct(A, B)}', 'hello boris')`); await as(B, `select public.send_message('${direct(A, B)}', 'hello anna')`); await as(C, `select public.send_message('${direct(C, D)}', 'psst')`);
    const a = await as<{ other_name: string; last_body: string }>(A, `select other_name, last_body from public.my_talks()`); expect(a).toEqual([{ other_name: 'boris', last_body: 'hello anna' }]);
    const b = await as<{ other_name: string }>(B, `select other_name from public.my_talks()`); expect(b.map(x => x.other_name)).toEqual(['anna']);
    expect((await as(E, `select 1 from public.my_talks()`)).length).toBe(0); expect(await fails(as(null, `select 1 from public.my_talks()`))).not.toBe('');
  });
});

describe('following', () => {
  it('a player follows and unfollows for themselves only; both sides see it, others do not; nobody follows themselves', async () => {
    await as(A, `insert into public.follows (follower, followed) values ('${A}', '${B}')`);
    expect(await fails(as(C, `insert into public.follows (follower, followed) values ('${A}', '${C}')`))).not.toBe('');
    expect(await fails(as(A, `insert into public.follows (follower, followed) values ('${A}', '${A}')`))).not.toBe('');
    expect((await as(B, `select 1 from public.follows`)).length).toBe(1); expect((await as(C, `select 1 from public.follows`)).length).toBe(0);
    await as(B, `delete from public.follows`); expect((await as(A, `select 1 from public.follows`)).length).toBe(1);
    await as(A, `delete from public.follows where followed = '${B}'`); expect((await as(A, `select 1 from public.follows`)).length).toBe(0);
  });
});

describe('the owner\'s tools', () => {
  it('players cannot run the clean-up; the owner can, and it removes only what is old', async () => {
    expect(await fails(as(A, `select * from public.cleanup()`))).not.toBe('');
    await db.query(`insert into public.presence (player_id, username, city, place, seen_at) values ($1, 'anna', 'Moscow', 'market', now() - interval '3 days')`, [A]);
    await db.query(`insert into public.messages (room, sender, username, body, created_at) values ('place:Moscow:uni', $1, 'anna', 'old', now() - interval '40 days')`, [A]);
    await db.query(`update public.ads set expires_at = now() - interval '10 days' where username = 'boris'`);
    const fresh = Number((await db.query<{ n: number }>(`select count(*)::int as n from public.messages where created_at > now() - interval '30 days'`)).rows[0].n);
    const r = (await db.query<{ presence_gone: number; messages_gone: number; ads_gone: number }>(`select * from public.cleanup()`)).rows[0];
    expect(Number(r.presence_gone)).toBe(1); expect(Number(r.messages_gone)).toBe(1); expect(Number(r.ads_gone)).toBe(2);
    expect(Number((await db.query<{ n: number }>(`select count(*)::int as n from public.messages`)).rows[0].n)).toBe(fresh);
  });
  it('a player deletes their own account and everything of theirs goes with it; nobody else is touched', async () => {
    expect(await fails(as(null, `select public.delete_my_account()`))).not.toBe('');
    await as(E, `select public.submit_score('tajik', 'Moscow', 'time', 500, 100)`);
    await as(E, `select public.delete_my_account()`);
    for (const t of ['profiles where id', 'scores where player_id', 'messages where sender']) expect((await db.query(`select 1 from public.${t} = $1`, [E])).rows.length, t).toBe(0);
    expect((await db.query(`select 1 from public.profiles`)).rows.length).toBe(4);
  });
});
