/* The online part is tested against a real PostgreSQL that runs inside the test (PGlite): the migration is applied as it is, and the security rules are
   tried as an anonymous visitor and as several signed-in players. Supabase's own pieces (the auth schema, the two roles, auth.uid()) are stood in for
   by a few lines below, in the way Supabase defines them. Nothing here touches a real server. */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222', C = '33333333-3333-4333-8333-333333333333';
let db: PGlite;

/** Runs SQL as a signed-in player (their id) or as an anonymous visitor (null), each call in its own transaction, with the security rules in force. */
async function as<T = Record<string, unknown>>(uid: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  return db.transaction(async tx => {
    await tx.exec(`set local role ${uid ? 'authenticated' : 'anon'}`);
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid ?? '']);
    return (await tx.query<T>(sql, params)).rows;
  });
}
const fails = async (p: Promise<unknown>): Promise<string> => { try { await p; return ''; } catch (e) { return String((e as Error).message || e); } };

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create role anon nologin; create role authenticated nologin;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
    alter default privileges in schema public grant usage, select on sequences to anon, authenticated;
  `);
  await db.exec(readFileSync('supabase/migrations/0001_init.sql', 'utf8'));
  await db.query('insert into auth.users (id) values ($1), ($2), ($3)', [A, B, C]);
  await as(A, `select public.claim_profile('anna', true)`); await as(B, `select public.claim_profile('boris', true)`); await as(C, `select public.claim_profile('child_c', false)`);
}, 120000);

describe('the migration', () => {
  it('applies cleanly and every table has row level security switched on', async () => {
    const t = (await db.query<{ relname: string; relrowsecurity: boolean }>(`select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' order by 1`)).rows;
    expect(t.map(x => x.relname)).toEqual(['announcements', 'blocks', 'counters', 'messages', 'presence', 'profiles', 'reports', 'saves', 'scores', 'votes']);
    for (const x of t) expect(x.relrowsecurity, x.relname).toBe(true);
  });
  it('no table can be written freely: every write rule names the player, and checked tables have no write rule at all', async () => {
    const p = (await db.query<{ tablename: string; cmd: string; qual: string | null; with_check: string | null }>(`select tablename, cmd, qual, with_check from pg_policies where schemaname = 'public'`)).rows;
    for (const x of p.filter(y => y.cmd !== 'SELECT')) expect(`${x.qual ?? ''} ${x.with_check ?? ''}`, `${x.tablename} ${x.cmd}`).toMatch(/auth\.uid\(\)/);
    for (const tbl of ['scores', 'messages', 'presence', 'votes', 'counters', 'announcements']) expect(p.filter(x => x.tablename === tbl && x.cmd !== 'SELECT'), tbl).toEqual([]);
  });
});

describe('accounts', () => {
  it('a profile is claimed once with a proper name; names are public and unique', async () => {
    expect((await as(null, 'select username from public.profiles order by 1')).map(r => (r as { username: string }).username)).toEqual(['anna', 'boris', 'child_c']);
    expect(await fails(as(A, `select public.claim_profile('Bad Name!', true)`))).toMatch(/bad username/);
    const d = '44444444-4444-4444-8444-444444444444'; await db.query('insert into auth.users (id) values ($1)', [d]);
    expect(await fails(as(d, `select public.claim_profile('anna', true)`))).toMatch(/username taken/);
    expect(await fails(as(null, `select public.claim_profile('ghost', true)`))).toMatch(/permission denied|not signed in/);
    await as(A, `select public.claim_profile('anna', true)`);                                    // claiming again is harmless
    expect(await fails(as(B, `update public.profiles set username = 'hacked' where id = '${A}' returning id`))).toBe(''); expect((await as(null, `select username from public.profiles where id = '${A}'`))[0]).toEqual({ username: 'anna' });
    expect(await fails(as(B, `insert into public.profiles (id, username) values ('${d}', 'sneaky')`))).toMatch(/row-level security/);
  });
});

describe('cloud saves', () => {
  it('a player writes and reads only their own saved game', async () => {
    await as(A, `insert into public.saves (player_id, data, version, day) values ('${A}', '{"money": 5}', 7, 12)`);
    await as(A, `update public.saves set data = '{"money": 9}', day = 13 where player_id = '${A}'`);
    expect(await as(A, 'select day, data from public.saves')).toEqual([{ day: 13, data: { money: 9 } }]);
    expect(await as(B, 'select * from public.saves')).toEqual([]); expect(await as(null, 'select * from public.saves')).toEqual([]);
    expect(await fails(as(B, `insert into public.saves (player_id, data, version, day) values ('${A}', '{}', 7, 1)`))).toMatch(/row-level security/);
    await as(B, `update public.saves set day = 999 where player_id = '${A}'`); await as(B, `delete from public.saves where player_id = '${A}'`);
    expect((await as(A, 'select day from public.saves'))[0]).toEqual({ day: 13 });
    expect(await fails(as(A, `update public.saves set version = 5000 where player_id = '${A}'`))).toMatch(/check/);
  });
});

describe('the leaderboard', () => {
  it('scores come only through the checked function; impossible ones and floods are refused; everybody can read', async () => {
    expect(await fails(as(A, `insert into public.scores (player_id, username, origin, city, ending, score, days) values ('${A}', 'anna', 'moscow', 'Moscow', 'time', 99999, 730)`))).toMatch(/row-level security/);
    await as(A, `select public.submit_score('moscow', 'Moscow', 'time', 9800, 730)`); await as(B, `select public.submit_score('tajik', 'Moscow', 'deported', 1200, 80)`);
    expect(await fails(as(A, `select public.submit_score('moscow', 'Moscow', 'time', 90000, 730)`))).toMatch(/score not possible/);
    expect(await fails(as(A, `select public.submit_score('moscow', 'Moscow', 'won', 100, 30)`))).toMatch(/check/);
    expect(await fails(as(null, `select public.submit_score('moscow', 'Moscow', 'time', 100, 30)`))).toMatch(/permission denied|not signed in/);
    expect(await as(null, 'select username, score from public.scores order by score desc')).toEqual([{ username: 'anna', score: 9800 }, { username: 'boris', score: 1200 }]);
    for (let i = 0; i < 9; i++) await as(B, `select public.submit_score('tajik', 'Moscow', 'time', 100, 30)`);
    expect(await fails(as(B, `select public.submit_score('tajik', 'Moscow', 'time', 100, 30)`))).toMatch(/too many scores/);
    expect(await fails(as(B, `delete from public.scores where username = 'anna' returning id`))).toBe(''); expect((await as(null, `select count(*)::int as n from public.scores where username = 'anna'`))[0]).toEqual({ n: 1 });
  });
});

describe('who is online', () => {
  it('a heartbeat puts a player at a place; the count is public; a stale player is not counted', async () => {
    await as(A, `select public.heartbeat('Moscow', 'bank')`); await as(B, `select public.heartbeat('Moscow', 'market')`); await as(A, `select public.heartbeat('Moscow', 'mfc')`);
    expect((await as(null, 'select public.online_count() as n'))[0]).toEqual({ n: 2 });
    expect(await as(B, 'select username, place from public.presence order by 1')).toEqual([{ username: 'anna', place: 'mfc' }, { username: 'boris', place: 'market' }]);
    expect(await as(null, 'select * from public.presence')).toEqual([]);                                    // visitors see the number, not the names
    expect(await fails(as(B, `insert into public.presence (player_id, username, city, place) values ('${C}', 'x', 'Moscow', 'bank')`))).toMatch(/row-level security/);
    await db.exec(`update public.presence set seen_at = now() - interval '10 minutes' where username = 'boris'`);
    expect((await as(null, 'select public.online_count() as n'))[0]).toEqual({ n: 1 }); expect((await as(A, 'select count(*)::int as n from public.presence'))[0]).toEqual({ n: 1 });
  });
});

describe('chat', () => {
  it('adults talk in the room of a place; a player who is not an adult neither writes nor reads', async () => {
    await as(A, `select public.send_message('place:Moscow:bank', '  Hello from the bank  ')`);
    expect(await as(B, `select username, body from public.messages where room = 'place:Moscow:bank'`)).toEqual([{ username: 'anna', body: 'Hello from the bank' }]);
    expect(await fails(as(C, `select public.send_message('place:Moscow:bank', 'hi')`))).toMatch(/adults/); expect(await as(C, 'select * from public.messages')).toEqual([]); expect(await as(null, 'select * from public.messages')).toEqual([]);
    expect(await fails(as(A, `select public.send_message('place:Moscow:bank', '')`))).toMatch(/bad length/); expect(await fails(as(A, `select public.send_message('place:Moscow:bank', repeat('x', 281))`))).toMatch(/bad length/);
    expect(await fails(as(A, `select public.send_message('nonsense', 'hi')`))).toMatch(/bad room/);
    expect(await fails(as(A, `insert into public.messages (room, sender, username, body) values ('place:Moscow:bank', '${B}', 'boris', 'forged')`))).toMatch(/row-level security/);
  });
  it('nobody can flood: the seventh message in half a minute is refused', async () => {
    for (let i = 0; i < 5; i++) await as(A, `select public.send_message('place:Moscow:mfc', 'line ${i}')`);
    expect(await fails(as(A, `select public.send_message('place:Moscow:mfc', 'one too many')`))).toMatch(/slow down/);
  });
  it('a private talk is read by its two people only, and a blocked person is neither heard nor able to write', async () => {
    const room = (await as(A, `select public.direct_room('${A}', '${B}') as r`))[0] as { r: string };
    await db.exec(`update public.messages set created_at = now() - interval '5 minutes'`);
    await as(B, `select public.send_message('${room.r}', 'psst')`);
    expect((await as(A, `select body from public.messages where room = '${room.r}'`)).length).toBe(1);
    const d = '55555555-5555-4555-8555-555555555555'; await db.query('insert into auth.users (id) values ($1)', [d]); await as(d, `select public.claim_profile('dmitry', true)`);
    expect(await as(d, `select body from public.messages where room = '${room.r}'`)).toEqual([]);
    expect(await fails(as(d, `select public.send_message('${room.r}', 'let me in')`))).toMatch(/not your talk/);
    await as(A, `insert into public.blocks (blocker, blocked) values ('${A}', '${B}')`);
    expect(await as(A, `select body from public.messages where sender = '${B}'`)).toEqual([]);                    // anna no longer sees what boris wrote
    expect(await fails(as(B, `select public.send_message('${room.r}', 'hello?')`))).toMatch(/blocked/);
    expect(await fails(as(B, `insert into public.blocks (blocker, blocked) values ('${A}', '${d}')`))).toMatch(/row-level security/);
    expect(await as(B, 'select * from public.blocks')).toEqual([]);                                             // a block is private to the one who made it
  });
  it('a message can be reported once; reports are not readable by players', async () => {
    const id = ((await db.query<{ id: number }>(`select id from public.messages order by id limit 1`)).rows[0]).id;
    await as(B, `insert into public.reports (reporter, message_id, reason) values ('${B}', ${id}, 'rude words')`);
    expect(await fails(as(B, `insert into public.reports (reporter, message_id, reason) values ('${B}', ${id}, 'again')`))).toMatch(/duplicate|unique/);
    expect(await fails(as(B, `insert into public.reports (reporter, message_id, reason) values ('${A}', ${id}, 'forged report')`))).toMatch(/row-level security/);
    expect(await as(B, 'select * from public.reports')).toEqual([]); expect((await db.query('select count(*)::int as n from public.reports')).rows[0]).toEqual({ n: 1 });
  });
});

describe('the weekly election with real votes', () => {
  it('one vote a week for each player, a public count, and nobody sees how another voted', async () => {
    await as(A, `select public.cast_vote(3, 'Kazan', 'c3-1')`); await as(B, `select public.cast_vote(3, 'Kazan', 'c3-1')`); await as(C, `select public.cast_vote(3, 'Kazan', 'c3-4')`);
    expect(await fails(as(A, `select public.cast_vote(3, 'Kazan', 'c3-2')`))).toMatch(/already voted/);
    await as(A, `select public.cast_vote(4, 'Kazan', 'c4-0')`);
    expect(await as(null, `select candidate, votes::int as votes from public.vote_tally(3, 'Kazan')`)).toEqual([{ candidate: 'c3-1', votes: 2 }, { candidate: 'c3-4', votes: 1 }]);
    expect((await as(B, 'select candidate from public.votes')).length).toBe(1);
    expect(await fails(as(B, `insert into public.votes (week, city, player_id, candidate) values (9, 'Kazan', '${B}', 'x')`))).toMatch(/row-level security/);
  });
});

describe('shared numbers and announcements', () => {
  it('visits can be counted by anybody, the daily find only by a signed-in player, and nothing else', async () => {
    expect((await as(null, `select public.bump('visits') as v`))[0]).toEqual({ v: 1 }); expect((await as(A, `select public.bump('visits') as v`))[0]).toEqual({ v: 2 });
    expect(await fails(as(null, `select public.bump('daily_found')`))).toMatch(/not signed in/); expect((await as(A, `select public.bump('daily_found') as v`))[0]).toEqual({ v: 1 });
    expect(await fails(as(A, `select public.bump('money')`))).toMatch(/bad counter/);
    await as(A, `update public.counters set value = 1000000 where key = 'visits'`); expect(await as(null, `select value::int as value from public.counters where key = 'visits'`)).toEqual([{ value: 2 }]);
  });
  it('announcements are read by everybody and written by no player', async () => {
    await db.exec(`insert into public.announcements (title, body) values ('Welcome', 'The city is open.')`);
    expect(await as(null, 'select title from public.announcements')).toEqual([{ title: 'Welcome' }]);
    expect(await fails(as(A, `insert into public.announcements (title, body) values ('Fake', 'Free money')`))).toMatch(/row-level security/);
  });
});
