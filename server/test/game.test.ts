import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { call, player, start } from './util.js';
import type { Ctx } from './util.js';

let c: Ctx;
let A: Awaited<ReturnType<typeof player>>, B: Awaited<ReturnType<typeof player>>, K: Awaited<ReturnType<typeof player>>, Y: Awaited<ReturnType<typeof player>>;
beforeAll(async () => {
  c = await start();
  A = await player(c, 'alina'); B = await player(c, 'boris'); K = await player(c, 'kolya'); Y = await player(c, 'young', false);
}, 120_000);
afterAll(async () => { await c?.app.close(); await c?.t.close(); });

describe('profiles and saves', () => {
  it('a public name is taken once and kept; bad names are refused', async () => {
    expect((await call(c, 'POST', '/api/profile', { username: 'alina' }, B.cookie)).json.username).toBe('boris');           // a player keeps the name they chose
    const email = 'noname@example.org', password = 'a long passphrase for noname';
    await call(c, 'POST', '/api/auth/register', { email, password });
    await call(c, 'POST', '/api/auth/verify', { token: /#verify=([A-Za-z0-9_-]{43})/.exec(c.mail.last(email)!.text)![1] });
    const nn = String((await call(c, 'POST', '/api/auth/login', { email, password })).headers['set-cookie']).split(';')[0];
    expect((await call(c, 'POST', '/api/profile', { username: 'alina' }, nn)).json.error).toBe('username taken');
    expect((await call(c, 'POST', '/api/profile', { username: 'Bad Name!' }, nn)).json.error).toBe('bad username');
    expect((await call(c, 'POST', '/api/messages', { room: 'place:Moscow:home', body: 'hi' }, nn)).json.error).toBe('no profile');
    expect((await call(c, 'GET', '/api/players?q=al', undefined, B.cookie)).json).toEqual([{ id: A.id, username: 'alina', country: null }]);
  });
  it('each player saves and loads only their own game', async () => {
    expect((await call(c, 'PUT', '/api/save', { data: { version: 3, day: 40, money: 1234 } }, A.cookie)).status).toBe(200);
    expect(((await call(c, 'GET', '/api/save', undefined, A.cookie)).json.data as Record<string, unknown>).money).toBe(1234);
    expect((await call(c, 'GET', '/api/save', undefined, B.cookie)).json).toBeNull();
    await call(c, 'PUT', '/api/save', { data: { version: 3, day: 1, money: 1, player_id: A.id } }, B.cookie);      // naming somebody else in the data changes nothing
    expect(((await call(c, 'GET', '/api/save', undefined, A.cookie)).json.data as Record<string, unknown>).money).toBe(1234);
  });
});

describe('leaderboard and presence', () => {
  it('scores: impossible ones and more than ten a day are refused; the list is public', async () => {
    expect((await call(c, 'POST', '/api/scores', { origin: 'ng', city: 'Moscow', ending: 'time', score: 90000, days: 10 }, A.cookie)).json.error).toBe('score not possible');
    for (let i = 0; i < 10; i++) expect((await call(c, 'POST', '/api/scores', { origin: 'ng', city: 'Moscow', ending: 'time', score: 100 + i, days: 30 }, A.cookie)).status).toBe(200);
    expect((await call(c, 'POST', '/api/scores', { origin: 'ng', city: 'Moscow', ending: 'time', score: 5, days: 30 }, A.cookie)).json.error).toBe('too many scores today');
    const top = (await call(c, 'GET', '/api/scores?limit=3')).json as unknown as { username: string; score: number }[];
    expect(top.map(r => r.score)).toEqual([109, 108, 107]); expect(top[0].username).toBe('alina');
  });
  it('presence: a count for everybody, names only for players, friends see where friends are', async () => {
    await call(c, 'POST', '/api/presence', { city: 'Moscow', place: 'market' }, A.cookie);
    expect((await call(c, 'GET', '/api/presence/count')).json.count).toBe(1);
    expect((await call(c, 'GET', '/api/presence?city=Moscow', undefined, B.cookie)).json).toEqual([{ username: 'alina', city: 'Moscow', place: 'market' }]);
    await call(c, 'POST', '/api/follows', { user: A.id }, B.cookie);
    expect((await call(c, 'GET', '/api/friends', undefined, B.cookie)).json).toEqual([{ id: A.id, username: 'alina', mutual: false, online: true, city: 'Moscow', place: 'market' }]);
    await call(c, 'POST', '/api/follows', { user: B.id }, A.cookie);
    expect(((await call(c, 'GET', '/api/friends', undefined, B.cookie)).json as unknown as { mutual: boolean }[])[0].mutual).toBe(true);
    expect((await call(c, 'POST', '/api/follows', { user: B.id }, B.cookie)).json.error).toBe('invalid input');
  });
});

describe('chat', () => {
  const room = 'place:Moscow:market';
  it('adults only; bad words and floods refused; under-18s can neither read nor write', async () => {
    expect((await call(c, 'POST', '/api/messages', { room, body: 'Привет всем' }, A.cookie)).status).toBe(200);
    expect((await call(c, 'POST', '/api/messages', { room, body: 'ты сука' }, A.cookie)).json.error).toBe('language');
    expect((await call(c, 'POST', '/api/messages', { room, body: 'hi' }, Y.cookie)).json.error).toBe('chat is for adults');
    expect((await call(c, 'GET', `/api/messages?room=${room}`, undefined, Y.cookie)).json).toEqual([]);
    const F = await player(c, 'flooder');
    for (let i = 0; i < 6; i++) expect((await call(c, 'POST', '/api/messages', { room, body: 'line ' + i }, F.cookie)).status).toBe(200);    // six in half a minute are fine
    expect((await call(c, 'POST', '/api/messages', { room, body: 'one more' }, F.cookie)).json.error).toBe('slow down');
    expect((await call(c, 'POST', '/api/messages', { room, body: 'from boris' }, B.cookie)).status).toBe(200);
  });
  it('a private talk is read only by its two people; nobody can write into somebody else\'s talk', async () => {
    const [lo, hi] = [A.id, B.id].sort(); const talk = `direct:${lo}:${hi}`;
    expect((await call(c, 'POST', '/api/messages', { room: talk, body: 'just us' }, A.cookie)).status).toBe(200);
    expect(((await call(c, 'GET', `/api/messages?room=${talk}`, undefined, B.cookie)).json as unknown[]).length).toBe(1);
    expect((await call(c, 'GET', `/api/messages?room=${talk}`, undefined, K.cookie)).json).toEqual([]);
    expect((await call(c, 'POST', '/api/messages', { room: talk, body: 'me too' }, K.cookie)).json.error).toBe('not your talk');
    expect(((await call(c, 'GET', '/api/talks', undefined, B.cookie)).json as unknown as { other_name: string }[])[0].other_name).toBe('alina');
    expect((await call(c, 'GET', '/api/talks', undefined, K.cookie)).json).toEqual([]);
  });
  it('blocking hides what they write and stops them writing to me; three reports hide a message', async () => {
    await call(c, 'POST', '/api/blocks', { user: B.id }, K.cookie);
    const seen = (await call(c, 'GET', `/api/messages?room=${room}`, undefined, K.cookie)).json as unknown as { username: string; id: number }[];
    expect(seen.some(m => m.username === 'boris')).toBe(false);
    const [lo, hi] = [B.id, K.id].sort();
    expect((await call(c, 'POST', '/api/messages', { room: `direct:${lo}:${hi}`, body: 'hello?' }, B.cookie)).json.error).toBe('blocked');
    const msg = seen.find(m => m.username === 'alina')!;
    for (const who of [B, K]) expect((await call(c, 'POST', '/api/reports', { message: msg.id, reason: 'rude to me' }, who.cookie)).status).toBe(200);
    expect(((await call(c, 'GET', `/api/messages?room=${room}`, undefined, B.cookie)).json as unknown as { id: number }[]).some(m => m.id === msg.id)).toBe(true);
    const third = await player(c, 'third');
    await call(c, 'POST', '/api/reports', { message: msg.id, reason: 'rude to me' }, third.cookie);
    expect(((await call(c, 'GET', `/api/messages?room=${room}`, undefined, B.cookie)).json as unknown as { id: number }[]).some(m => m.id === msg.id)).toBe(false);
  });
});

describe('adverts, homes, the guest book, votes', () => {
  it('ads: three at a time; only the owner takes one down; three reports hide it', async () => {
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) ids.push(Number((await call(c, 'POST', '/api/ads', { city: 'Moscow', kind: 'sell', title: 'Old sofa ' + i, price: 100 }, A.cookie)).json.id));
    expect((await call(c, 'POST', '/api/ads', { city: 'Moscow', kind: 'sell', title: 'One too many' }, A.cookie)).json.error).toMatch(/too many ads/);
    expect((await call(c, 'DELETE', `/api/ads/${ids[0]}`, undefined, B.cookie)).json.ok).toBe(false);
    expect((await call(c, 'DELETE', `/api/ads/${ids[0]}`, undefined, A.cookie)).json.ok).toBe(true);
    for (const who of [B, K, Y]) await call(c, 'POST', `/api/ads/${ids[1]}/report`, {}, who.cookie);
    const list = (await call(c, 'GET', '/api/ads?city=Moscow')).json as unknown as { id: number }[];
    expect(list.map(a => a.id)).toEqual([ids[2]]);
    expect((await call(c, 'POST', '/api/ads', { city: 'Moscow', kind: 'sell', title: 'fuck this' }, B.cookie)).json.error).toBe('language');
    const mine = (await call(c, 'GET', '/api/ads/mine', undefined, A.cookie)).json as unknown as { id: number }[];        // only one's own adverts that are still up
    expect(mine.map(x => x.id).sort()).toEqual([ids[1], ids[2]].sort()); expect((await call(c, 'GET', '/api/ads/mine', undefined, B.cookie)).json).toEqual([]); expect((await call(c, 'GET', '/api/ads/mine')).status).toBe(401);
  });
  it('homes: shown to players; notes and gifts in the guest book, not in one\'s own; one like a week', async () => {
    expect((await call(c, 'PUT', '/api/home', { city: 'Moscow', dwelling: 'studio', design: { placed: [{ id: 'sofa', i: 1, j: 1, rot: 0 }] }, stars: 12 }, A.cookie)).status).toBe(200);
    expect(((await call(c, 'GET', `/api/homes/${A.id}`, undefined, B.cookie)).json).stars).toBe(12);
    expect((await call(c, 'GET', `/api/homes/${A.id}`)).status).toBe(401);
    expect((await call(c, 'POST', `/api/guestbook/${A.id}`, { body: 'Lovely flat!', gift: 'cake' }, B.cookie)).status).toBe(200);
    expect((await call(c, 'POST', `/api/guestbook/${A.id}`, { body: 'me', gift: null }, A.cookie)).json.error).toBe('your own home');
    expect((await call(c, 'POST', `/api/guestbook/${B.id}`, { body: 'hi' }, A.cookie)).json.error).toBe('no such home');
    expect(((await call(c, 'GET', `/api/guestbook/${A.id}`, undefined, A.cookie)).json as unknown as { gift: string }[])[0].gift).toBe('cake');
    expect((await call(c, 'GET', '/api/homes/my-vote', undefined, B.cookie)).json).toEqual({ owner: null });
    expect((await call(c, 'POST', `/api/homes/${A.id}/vote`, {}, B.cookie)).status).toBe(200);
    expect((await call(c, 'GET', '/api/homes/my-vote', undefined, B.cookie)).json).toEqual({ owner: A.id }); expect((await call(c, 'GET', '/api/homes/my-vote', undefined, K.cookie)).json).toEqual({ owner: null });
    expect((await call(c, 'POST', `/api/homes/${A.id}/vote`, {}, B.cookie)).json.error).toBe('already voted');
    expect(((await call(c, 'GET', '/api/homes/best', undefined, K.cookie)).json as unknown as { username: string; votes: number }[])[0]).toMatchObject({ username: 'alina', votes: 1 });
  });
  it('the weekly election: one vote per player and city; the count is public; counters and news', async () => {
    expect((await call(c, 'POST', '/api/votes', { week: 5, city: 'Moscow', candidate: 'Ivanov' }, A.cookie)).status).toBe(200);
    expect((await call(c, 'POST', '/api/votes', { week: 5, city: 'Moscow', candidate: 'Petrov' }, A.cookie)).json.error).toBe('already voted');
    await call(c, 'POST', '/api/votes', { week: 5, city: 'Moscow', candidate: 'Ivanov' }, B.cookie);
    expect((await call(c, 'GET', '/api/votes?week=5&city=Moscow')).json).toEqual([{ candidate: 'Ivanov', votes: 2 }]);
    expect((await call(c, 'POST', '/api/counters/visits', {})).json.value).toBe(1);
    expect((await call(c, 'POST', '/api/counters/daily_found', {})).status).toBe(401);
    expect((await call(c, 'POST', '/api/counters/anything', {})).status).toBe(400);
    await c.t.admin("insert into app.announcements (title, body) values ('Hello', 'The server is open')");
    expect(((await call(c, 'GET', '/api/announcements')).json as unknown as { title: string }[])[0].title).toBe('Hello');
  });
  it('the hourly clean-up removes old presence, expired sessions and old tokens', async () => {
    await c.t.admin("update app.presence set seen_at = now() - interval '2 days'");
    await c.t.admin("update app.sessions set idle_expires_at = now() - interval '1 second' where user_id = $1", [Y.id]);
    const r = (await c.t.db.query<Record<string, number>>('select * from app.cleanup()')).rows[0];
    expect(r.presence_gone).toBe(1); expect(r.sessions_gone).toBeGreaterThanOrEqual(1);
    expect((await call(c, 'GET', '/api/auth/me', undefined, Y.cookie)).status).toBe(401);
  });
});
