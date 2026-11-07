import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { call, player, start } from './util.js';
import type { Ctx } from './util.js';

let c: Ctx;
let A: Awaited<ReturnType<typeof player>>, B: Awaited<ReturnType<typeof player>>, K: Awaited<ReturnType<typeof player>>, D: Awaited<ReturnType<typeof player>>;
beforeAll(async () => { c = await start(); A = await player(c, 'anna'); B = await player(c, 'bakyt'); K = await player(c, 'kofi'); D = await player(c, 'dina'); }, 120_000);
afterAll(async () => { await c?.app.close(); await c?.t.close(); });

const follow = async (x: typeof A, y: typeof A) => call(c, 'POST', '/api/follows', { user: y.id }, x.cookie);
const mine = async (x: typeof A) => (await call(c, 'GET', '/api/crews/mine', undefined, x.cookie)).json as unknown as { crew: { id: number; name: string; role: string; members: { username: string; role: string }[] } | null; invites: { id: number; crew_name: string }[] };

describe('crews', () => {
  it('lets a player found one crew with a clean, free name', async () => {
    expect((await call(c, 'POST', '/api/crews', { name: 'ab' }, A.cookie)).status).toBe(400);
    expect((await call(c, 'POST', '/api/crews', { name: 'Метро Кружок', city: 'Moscow' }, A.cookie)).status).toBe(200);
    expect((await call(c, 'POST', '/api/crews', { name: 'Second Crew' }, A.cookie)).json.error).toBe('already in a crew');
    expect((await call(c, 'POST', '/api/crews', { name: 'метро кружок' }, B.cookie)).json.error).toBe('name taken');
    expect((await call(c, 'POST', '/api/crews', { name: 'сука team' }, B.cookie)).json.error).toBe('language');
    const m = await mine(A); expect(m.crew?.name).toBe('Метро Кружок'); expect(m.crew?.role).toBe('owner'); expect(m.crew?.members.map(x => x.username)).toEqual(['anna']);
  });
  it('invites only friends who follow each other, once, and only into a crew with room', async () => {
    expect((await call(c, 'POST', '/api/crews/invite', { friend: B.id }, A.cookie)).json.error).toBe('not friends');
    await follow(A, B); expect((await call(c, 'POST', '/api/crews/invite', { friend: B.id }, A.cookie)).json.error).toBe('not friends');
    await follow(B, A);
    expect((await call(c, 'POST', '/api/crews/invite', { friend: B.id }, A.cookie)).status).toBe(200);
    expect((await call(c, 'POST', '/api/crews/invite', { friend: B.id }, A.cookie)).json.error).toBe('already invited');
    expect((await call(c, 'POST', '/api/crews/invite', { friend: K.id }, B.cookie)).json.error).toBe('not in a crew');
    expect((await call(c, 'POST', '/api/crews/invite', { friend: A.id }, A.cookie)).json.error).toBe('no such player');
    expect((await mine(B)).invites).toHaveLength(1);
  });
  it('lets the invited player say yes (and joins the crew chat) or no', async () => {
    const inv = (await mine(B)).invites[0]!;
    expect((await call(c, 'POST', `/api/crews/invites/${inv.id}/answer`, { accept: true }, K.cookie)).json.error).toBe('no such invitation');
    expect((await call(c, 'POST', `/api/crews/invites/${inv.id}/answer`, { accept: true }, B.cookie)).status).toBe(200);
    const m = await mine(B); expect(m.crew?.role).toBe('member'); expect(m.invites).toHaveLength(0); expect(m.crew?.members.map(x => x.username)).toEqual(['anna', 'bakyt']);
    await follow(A, K); await follow(K, A); await call(c, 'POST', '/api/crews/invite', { friend: K.id }, A.cookie);
    const kInv = (await mine(K)).invites[0]!; await call(c, 'POST', `/api/crews/invites/${kInv.id}/answer`, { accept: false }, K.cookie);
    expect((await mine(K)).crew).toBeNull(); expect((await mine(K)).invites).toHaveLength(0);
  });
  it('keeps the crew chat for its members only', async () => {
    const room = `crew:${(await mine(A)).crew!.id}`;
    const first = await call(c, 'POST', '/api/messages', { room, body: 'Hello crew' }, A.cookie); expect(first.json, JSON.stringify(first.json)).toMatchObject({ id: expect.anything() });
    expect((await call(c, 'POST', '/api/messages', { room, body: 'Hi Anna' }, B.cookie)).status).toBe(200);
    expect((await call(c, 'POST', '/api/messages', { room, body: 'Let me in' }, D.cookie)).json.error).toBe('not your crew');
    const read = async (x: typeof A) => ((await call(c, 'GET', `/api/messages?room=${encodeURIComponent(room)}`, undefined, x.cookie)).json as unknown as { body: string }[]).map(m => m.body);
    expect((await read(B)).sort()).toEqual(['Hello crew', 'Hi Anna']); expect(await read(D)).toEqual([]); expect(await read(K)).toEqual([]);
    expect((await call(c, 'POST', '/api/messages', { room: 'crew:99999', body: 'x1' }, A.cookie)).json.error).toBe('not your crew');
  });
  it('counts the crew events on the server for the crew chapter', async () => {
    const r = await call(c, 'GET', '/api/challenges?city=Moscow', undefined, A.cookie);
    const ch = Object.fromEntries((r.json.challenges as unknown as { id: string; have: number; chapter: number }[]).map(x => [x.id, x]));
    expect(ch.crew_found!.have).toBe(1); expect(ch.crew_hello!.have).toBe(1); expect(ch.crew_new_member!.have).toBe(1); expect(ch.crew_first_invite!.have).toBe(2);
    expect((r.json.challenges as unknown as { chapter: number }[]).filter(x => x.chapter === 9)).toHaveLength(10);
    const rb = await call(c, 'GET', '/api/challenges?city=Moscow', undefined, B.cookie);
    expect((rb.json.challenges as unknown as { id: string; have: number }[]).find(x => x.id === 'crew_joined_one')!.have).toBe(1);
  });
  it('lets the owner remove a member, leave with the crew passing on, and closes an empty crew', async () => {
    expect((await call(c, 'POST', '/api/crews/kick', { user: A.id }, B.cookie)).json.error).toBe('not the owner');
    expect((await call(c, 'POST', '/api/crews/kick', { user: A.id }, A.cookie)).json.error).toBe('use leave');
    await call(c, 'POST', '/api/crews/leave', {}, A.cookie);
    const b = await mine(B); expect(b.crew?.role).toBe('owner'); expect((await mine(A)).crew).toBeNull();
    expect((await call(c, 'POST', '/api/crews/leave', {}, A.cookie)).json.error).toBe('not in a crew');
    await call(c, 'POST', '/api/crews/leave', {}, B.cookie);
    expect((await c.t.admin('select count(*)::int as n from app.crews')).rows[0]!.n).toBe(0);
  });
});

describe('the crews\' table', () => {
  it('ranks crews by the sum of their members\' best results and needs a login', async () => {
    expect((await call(c, 'GET', '/api/crews/top')).status).toBe(401);
    const founded = async (x: typeof A, name: string) => { await call(c, 'POST', '/api/crews', { name }, x.cookie); };
    await founded(A, 'High Scorers'); await founded(K, 'Quiet Ones');
    const score = (x: typeof A, n: number) => call(c, 'POST', '/api/scores', { origin: 'ng', city: 'Moscow', ending: 'time', score: n, days: 30 }, x.cookie);
    await score(A, 500); await score(A, 300); await score(K, 100); await score(D, 900);                    // D belongs to no crew: not counted
    const top = (await call(c, 'GET', '/api/crews/top', undefined, A.cookie)).json as unknown as { name: string; members: number; points: number }[];
    expect(top.map(t => t.name)).toEqual(['High Scorers', 'Quiet Ones']);
    expect(Number(top[0]!.points)).toBe(500); expect(Number(top[1]!.points)).toBe(100); expect(Number(top[0]!.members)).toBe(1);
  });
});
