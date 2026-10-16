/* The third migration (homes that can be visited, the guest book, the weekly best-flat vote, the friends list, the language filter), tested like the
   first two on a real PostgreSQL inside the test (PGlite), as different players. Nothing touches a real server. */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const id = (n: number): string => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const A = id(1), B = id(2), C = id(3), D = id(4);
let db: PGlite;
async function as<T = Record<string, unknown>>(uid: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  return db.transaction(async tx => { await tx.exec(`set local role ${uid ? 'authenticated' : 'anon'}`); await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid ?? '']); return (await tx.query<T>(sql, params)).rows; });
}
const fails = async (p: Promise<unknown>): Promise<string> => { try { await p; return ''; } catch (e) { return String((e as Error).message || e); } };
const design = JSON.stringify({ placed: [{ id: 'sofa-2', i: 1, j: 2, rot: 0 }], wall: '#e8d9c4', floor: 'parquet' });

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
  for (const f of ['0001_init.sql', '0002_community.sql', '0003_homes_and_friends.sql']) await db.exec(readFileSync('supabase/migrations/' + f, 'utf8'));
  await db.query('insert into auth.users (id) values ($1), ($2), ($3), ($4)', [A, B, C, D]);
  for (const [u, n] of [[A, 'anna'], [B, 'boris'], [C, 'clara'], [D, 'dima']]) await as(u, `select public.claim_profile('${n}', true)`);
}, 120000);

describe('the third migration', () => {
  it('applies after the first two; every table has row level security', async () => {
    const t = (await db.query<{ relname: string; relrowsecurity: boolean }>(`select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'`)).rows;
    expect(t.map(x => x.relname)).toEqual(expect.arrayContaining(['homes', 'guestbook', 'home_votes'])); expect(t.every(x => x.relrowsecurity)).toBe(true);
  });
});

describe('homes', () => {
  it('a player publishes their own home (the name comes from the profile); others see it; nobody writes somebody else\'s', async () => {
    await as(A, `select public.publish_home('Moscow', 'studio', $1::jsonb, 12)`, [design]);
    const seen = await as<{ username: string; stars: number }>(B, `select username, stars from public.homes`); expect(seen).toEqual([{ username: 'anna', stars: 12 }]);
    await as(A, `select public.publish_home('Moscow', 'family', $1::jsonb, 20)`, [design]); expect((await as<{ dwelling: string }>(B, `select dwelling from public.homes`))[0].dwelling).toBe('family');
    expect(await fails(as(B, `insert into public.homes (player_id, username, city, dwelling, design) values ('${A}', 'anna', 'Moscow', 'house', '{}')`))).not.toBe('');
    expect(await fails(as(null, `select public.publish_home('Moscow', 'studio', '{}'::jsonb, 0)`))).not.toBe('');
    expect(await fails(as(B, `select public.publish_home('Moscow', 'DROP TABLE', '{}'::jsonb, 0)`))).not.toBe('');
    expect((await as(null, `select 1 from public.homes`)).length).toBe(0);                                         // only signed-in players visit
  });
});

describe('the guest book', () => {
  it('a visitor leaves a note and a gift; the owner sees it, can hide it; nobody writes in their own book or a home that does not exist', async () => {
    await as(B, `select public.sign_guestbook('${A}', '  Lovely flat!  ', 'flowers')`);
    const book = await as<{ body: string; gift: string; author_name: string }>(A, `select body, gift, author_name from public.guestbook where owner = '${A}'`); expect(book).toEqual([{ body: 'Lovely flat!', gift: 'flowers', author_name: 'boris' }]);
    expect(await fails(as(A, `select public.sign_guestbook('${A}', 'me', null)`))).toContain('own');
    expect(await fails(as(B, `select public.sign_guestbook('${C}', 'hi', null)`))).toContain('no such home');
    expect(await fails(as(B, `select public.sign_guestbook('${A}', 'hi', 'a car')`))).not.toBe('');
    expect(await fails(as(C, `insert into public.guestbook (owner, author, author_name, body) values ('${A}', '${C}', 'clara', 'direct')`))).not.toBe('');
    await as(C, `update public.guestbook set body = 'hacked'`); expect((await as<{ body: string }>(A, `select body from public.guestbook`))[0].body).toBe('Lovely flat!');
    await as(A, `update public.guestbook set hidden = true`); expect((await as(D, `select 1 from public.guestbook`)).length).toBe(0);
  });
  it('bad language is refused in notes, chat and adverts; a blocked player cannot write; ten notes a day at most', async () => {
    expect(await fails(as(C, `select public.sign_guestbook('${A}', 'ты сука', null)`))).toContain('language');
    expect(await fails(as(C, `select public.send_message('place:Moscow:market', 'what the FUCK')`))).toContain('language');
    expect(await fails(as(C, `select public.post_ad('Moscow', 'sell', 'Shit for sale', '', 100)`))).toContain('language');
    expect((await as<{ is_rude: boolean }>(null, `select public.is_rude('Привет, соседка! Хорошая квартира.')`))[0].is_rude).toBe(false);
    await as(A, `insert into public.blocks (blocker, blocked) values ('${A}', '${D}')`); expect(await fails(as(D, `select public.sign_guestbook('${A}', 'hello', null)`))).toContain('blocked');
    for (let i = 0; i < 10; i++) await as(C, `select public.sign_guestbook('${A}', 'note ${i}', null)`);
    expect(await fails(as(C, `select public.sign_guestbook('${A}', 'one more', null)`))).toContain('too many');
  });
});

describe('the best flat of the week', () => {
  it('one like a week per player, never for one\'s own home; the list counts the likes', async () => {
    await as(B, `select public.publish_home('Kazan', 'dorm', $1::jsonb, 3)`, [design]);
    await as(B, `select public.vote_home('${A}')`); await as(C, `select public.vote_home('${A}')`); await as(A, `select public.vote_home('${B}')`);
    expect(await fails(as(B, `select public.vote_home('${B}')`))).not.toBe(''); expect(await fails(as(B, `select public.vote_home('${A}')`))).toContain('already');
    const top = await as<{ username: string; votes: number }>(D, `select username, votes from public.best_homes()`);
    expect(top.map(x => [x.username, Number(x.votes)])).toEqual([['anna', 2], ['boris', 1]]);
    expect(await fails(as(C, `insert into public.home_votes (week, voter, owner) values (1, '${C}', '${B}')`))).not.toBe('');
  });
});

describe('friends', () => {
  it('lists who the player follows, whether they follow back, and whether they are online and where', async () => {
    await as(A, `insert into public.follows (follower, followed) values ('${A}', '${B}'), ('${A}', '${C}')`);
    await as(B, `insert into public.follows (follower, followed) values ('${B}', '${A}')`);
    await as(B, `select public.heartbeat('Kazan', 'market')`);
    const f = await as<{ username: string; mutual: boolean; online: boolean; city: string | null }>(A, `select username, mutual, online, city from public.my_friends()`);
    expect(f).toEqual([{ username: 'boris', mutual: true, online: true, city: 'Kazan' }, { username: 'clara', mutual: false, online: false, city: null }]);
    expect((await as(D, `select 1 from public.my_friends()`)).length).toBe(0); expect(await fails(as(null, `select 1 from public.my_friends()`))).not.toBe('');
  });
});
