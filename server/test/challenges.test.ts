import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { call, player, start } from './util.js';
import type { Ctx } from './util.js';

let c: Ctx;
let A: Awaited<ReturnType<typeof player>>, B: Awaited<ReturnType<typeof player>>, K: Awaited<ReturnType<typeof player>>;
beforeAll(async () => { c = await start(); A = await player(c, 'anna'); B = await player(c, 'bakyt'); K = await player(c, 'kofi'); }, 120_000);
afterAll(async () => { await c?.app.close(); await c?.t.close(); });

type Ch = { id: string; chapter: number; kind: string; target: number; weekly: boolean; reward: number; have: number; done: boolean; claimed: boolean; joined: boolean; title_ru: string };
const list = async (cookie: string, city = 'Moscow'): Promise<Record<string, Ch>> => {
  const r = await call(c, 'GET', `/api/challenges?city=${encodeURIComponent(city)}`, undefined, cookie);
  return Object.fromEntries((r.json.challenges as unknown as Ch[]).map(x => [x.id, x]));
};
const EVENTS = ['msg_place', 'msg_direct', 'msg_ru', 'partner_new', 'city_room_new', 'welcome_newcomer', 'partner_abroad', 'follow', 'followed', 'mutual', 'note_sent', 'note_received', 'gift_sent', 'gift_received', 'like_given', 'like_received', 'ad_posted', 'ad_city_new', 'vote_cast', 'home_shown', 'score_sent', 'city_new', 'coop_done'];

describe('the storyline', () => {
  it('80 challenges in 8 chapters of 10, in English and Russian; every counted challenge counts something the server records', async () => {
    const r = await call(c, 'GET', '/api/challenges?city=Moscow', undefined, A.cookie);
    expect(r.json.chapters as unknown[]).toHaveLength(8);
    const all = r.json.challenges as unknown as Ch[]; expect(all).toHaveLength(80);
    for (let ch = 1; ch <= 8; ch++) expect(all.filter(x => x.chapter === ch), `chapter ${ch}`).toHaveLength(10);
    expect(all.every(x => /[А-Яа-я]/.test(x.title_ru))).toBe(true);
    const evs = (await c.t.admin("select distinct event from app.challenges where kind = 'event'")).rows.map(x => String(x.event));
    expect(evs.filter(e => !EVENTS.includes(e))).toEqual([]);
    expect(new Set(all.map(x => x.kind))).toEqual(new Set(['event', 'coop', 'city']));
    expect((await call(c, 'GET', '/api/challenges')).status).toBe(401);
  });
});

describe('counted by the server from what players do', () => {
  it('a hello at a place: done, claimed once for its reward; claiming what is not done is refused', async () => {
    expect((await call(c, 'POST', '/api/challenges/first_hello/claim', {}, A.cookie)).json.error).toBe('not done yet');
    await call(c, 'POST', '/api/messages', { room: 'place:Moscow:market', body: 'Hello everyone' }, A.cookie);
    const l = await list(A.cookie); expect(l.first_hello).toMatchObject({ have: 1, done: true, claimed: false });
    expect((await call(c, 'POST', '/api/challenges/first_hello/claim', {}, A.cookie)).json.reward).toBe(300);
    expect((await call(c, 'POST', '/api/challenges/first_hello/claim', {}, A.cookie)).json.error).toBe('already claimed');
    expect((await list(A.cookie)).first_hello.claimed).toBe(true);
    expect((await list(B.cookie)).first_hello.have).toBe(0);                              // somebody else's progress is not yours
  });
  it('a new person to talk to counts once, however many messages; Russian letters count as Russian', async () => {
    const room = (x: string, y: string): string => { const [lo, hi] = [x, y].sort(); return `direct:${lo}:${hi}`; };
    for (let i = 0; i < 3; i++) await call(c, 'POST', '/api/messages', { room: room(A.id, B.id), body: i ? 'again' : 'Привет!' }, A.cookie);
    const l = await list(A.cookie); expect(l.three_people.have).toBe(1); expect(l.fifty_messages.have).toBe(3); expect(l.first_russian.have).toBe(1);
  });
  it('friends: following, being followed, and mutual friends for both', async () => {
    await call(c, 'POST', '/api/follows', { user: B.id }, A.cookie);
    expect((await list(A.cookie)).first_friend.have).toBe(0);
    await call(c, 'POST', '/api/follows', { user: A.id }, B.cookie);
    const a = await list(A.cookie), b = await list(B.cookie);
    expect(a.first_follow.have).toBe(1); expect(a.first_friend.done).toBe(true); expect(b.first_friend.done).toBe(true); expect(a.followed_five.have).toBe(1);
  });
  it('weekly challenges start again each week', async () => {
    for (let i = 0; i < 5; i++) await call(c, 'POST', '/api/messages', { room: 'place:Moscow:park', body: 'line ' + i }, K.cookie);
    expect((await list(K.cookie)).weekly_hello.done).toBe(true);
    expect((await call(c, 'POST', '/api/challenges/weekly_hello/claim', {}, K.cookie)).json.reward).toBe(300);
    await c.t.admin('update app.social_counts set week = week - 1 where week > 0');
    await c.t.admin('update app.challenge_claims set week = week - 1 where week > 0');
    const l = await list(K.cookie); expect(l.weekly_hello).toMatchObject({ have: 0, done: false, claimed: false });
    expect(l.chat_regular.have).toBe(5);                                                  // the all-time count stays
  });
  it('welcoming a newcomer and talking across countries are recognised', async () => {
    const N = await player(c, 'newbie');                                                  // joined just now
    await call(c, 'POST', '/api/profile/origin', { country: 'ng', region: 'Africa' }, K.cookie);
    await call(c, 'POST', '/api/profile/origin', { country: 'UZ', region: 'CIS' }, N.cookie);
    const [lo, hi] = [K.id, N.id].sort();
    await call(c, 'POST', '/api/messages', { room: `direct:${lo}:${hi}`, body: 'Welcome to the city!' }, K.cookie);
    const l = await list(K.cookie); expect(l.welcome_one.done).toBe(true); expect(l.friends_abroad.have).toBe(1);
    expect((await call(c, 'POST', '/api/profile/origin', { country: 'Nigeria', region: 'Africa' }, K.cookie)).json.error).toBe('invalid input');
    expect((await call(c, 'GET', '/api/players?q=kof', undefined, N.cookie)).json).toEqual([{ id: K.id, username: 'kofi', country: 'NG' }]);
  });
});

describe('together: co-op and the whole city', () => {
  it('a co-op challenge: friends only; the friend accepts; done when BOTH have done their part; nobody else can answer', async () => {
    expect((await call(c, 'POST', '/api/coops', { friend: K.id, challenge: 'tea_together' }, A.cookie)).json.error).toBe('friends only');
    const inv = await call(c, 'POST', '/api/coops', { friend: B.id, challenge: 'tea_together' }, A.cookie); const id = Number(inv.json.id); expect(id).toBeGreaterThan(0);
    expect((await call(c, 'POST', '/api/coops', { friend: B.id, challenge: 'tea_together' }, A.cookie)).json.error).toBe('already invited');
    expect((await call(c, 'POST', `/api/coops/${id}/answer`, { yes: true }, K.cookie)).json.error).toBe('no such invitation');
    expect((await call(c, 'POST', `/api/coops/${id}/done`, {}, A.cookie)).json.error).toBe('no such invitation');   // not accepted yet
    expect((await call(c, 'GET', '/api/coops', undefined, B.cookie)).json).toMatchObject([{ id, challenge_id: 'tea_together', status: 'invited', mine: false, other_name: 'anna' }]);
    expect((await call(c, 'GET', '/api/coops', undefined, K.cookie)).json).toEqual([]);
    expect((await call(c, 'POST', `/api/coops/${id}/answer`, { yes: true }, B.cookie)).status).toBe(200);
    expect((await call(c, 'POST', `/api/coops/${id}/done`, {}, A.cookie)).json.status).toBe('waiting');
    expect((await list(A.cookie)).tea_together.done).toBe(false);
    expect((await call(c, 'POST', `/api/coops/${id}/done`, {}, B.cookie)).json.status).toBe('done');
    const a = await list(A.cookie), b = await list(B.cookie);
    expect(a.tea_together.done && b.tea_together.done).toBe(true); expect(a.three_together.have).toBe(1);
    expect((await call(c, 'POST', '/api/challenges/tea_together/claim', {}, B.cookie)).json.reward).toBe(1200);
  });
  it('a city challenge: players of a city join; claiming needs your own joining and the shared total', async () => {
    await c.t.admin("update app.challenges set target = 2 where id = 'welcome_evening'");
    expect((await call(c, 'POST', '/api/challenges/welcome_evening/join', { city: 'Kazan' }, A.cookie)).json.count).toBe(1);
    expect((await call(c, 'POST', '/api/challenges/welcome_evening/claim', { city: 'Kazan' }, A.cookie)).json.error).toBe('not done yet');
    expect((await call(c, 'POST', '/api/challenges/welcome_evening/join', { city: 'Kazan' }, B.cookie)).json.count).toBe(2);
    expect((await call(c, 'POST', '/api/challenges/welcome_evening/join', { city: 'Kazan' }, B.cookie)).json.count).toBe(2);   // joining twice counts once
    expect((await list(K.cookie, 'Kazan')).welcome_evening).toMatchObject({ have: 2, done: true, joined: false });
    expect((await call(c, 'POST', '/api/challenges/welcome_evening/claim', { city: 'Kazan' }, K.cookie)).json.error).toBe('join first');
    expect((await call(c, 'POST', '/api/challenges/welcome_evening/claim', { city: 'Kazan' }, A.cookie)).json.reward).toBe(800);
    expect((await list(A.cookie, 'Moscow')).welcome_evening.have).toBe(0);                // another city has its own total
  });
});
