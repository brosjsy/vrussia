import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { call, player, start } from './util.js';
import type { Ctx } from './util.js';

let c: Ctx;
let A: Awaited<ReturnType<typeof player>>, B: Awaited<ReturnType<typeof player>>, K: Awaited<ReturnType<typeof player>>, D: Awaited<ReturnType<typeof player>>;
beforeAll(async () => { c = await start(); A = await player(c, 'anna'); B = await player(c, 'bakyt'); K = await player(c, 'kofi'); D = await player(c, 'dina'); }, 120_000);
afterAll(async () => { await c?.app.close(); await c?.t.close(); });

const befriend = async (x: typeof A, y: typeof A) => { await call(c, 'POST', '/api/follows', { user: y.id }, x.cookie); await call(c, 'POST', '/api/follows', { user: x.id }, y.cookie); };
const send = (from: typeof A, to: typeof A, kind: string, amount?: number, note?: string) => call(c, 'POST', '/api/gifts', { to: to.id, kind, amount, note }, from.cookie);
const have = async (x: typeof A) => Object.fromEntries(((await call(c, 'GET', '/api/challenges?city=Moscow', undefined, x.cookie)).json.challenges as unknown as { id: string; have: number }[]).map(r => [r.id, r.have]));
type Inbox = { gifts: number; crew_invites: number; flat_invites: number; coops: number };

describe('gifts between friends', () => {
  it('go only to friends who follow back, and not to yourself or someone who blocked you', async () => {
    expect((await send(A, B, 'tea')).json.error).toBe('not friends');
    await befriend(A, B); await befriend(A, K);
    expect((await send(A, A, 'tea')).json.error).toBe('no such player');
    await call(c, 'POST', '/api/blocks', { user: A.id }, K.cookie);
    expect((await send(A, K, 'tea')).json.error).toBe('blocked');
    expect((await send(A, B, 'tea', undefined, 'Warm wishes')).status).toBe(200);
  });
  it('accept only known kinds, sensible money, and a clean short note', async () => {
    expect((await send(A, B, 'car')).status).toBe(400);
    expect((await send(A, B, 'money', 0)).status).toBe(400);
    expect((await send(A, B, 'money', 5000)).status).toBe(400);
    expect((await send(A, B, 'tea', 100)).status).toBe(200);                 // the amount is ignored for a gift that is not money
    expect((await send(A, B, 'flowers', undefined, 'x'.repeat(81))).status).toBe(400);
  });
  it('limit a sender to three gifts a day and filter rude words and contact details', async () => {
    expect((await send(A, B, 'cake', undefined, 'сука')).json.error).toBe('language');
    expect((await send(A, B, 'cake', undefined, 'call me +7 912 345 67 89')).json.error).toBe('contact details');
    expect((await send(A, B, 'money', 300, 'For the rent')).status).toBe(200);       // the third gift of the day (two were sent above)
    expect((await send(A, B, 'cake')).json.error).toBe('daily limit');
  });
  it('wait in the inbox of the receiver only, can be taken once, and only by the receiver', async () => {
    const mine = (await call(c, 'GET', '/api/gifts', undefined, B.cookie)).json as unknown as { id: number; sender_name: string; kind: string; amount: number; note: string }[];
    expect(mine.map(g => g.kind).sort()).toEqual(['money', 'tea', 'tea']);
    expect(mine.find(g => g.kind === 'money')).toMatchObject({ amount: 300, sender_name: 'anna', note: 'For the rent' });
    expect(((await call(c, 'GET', '/api/gifts', undefined, A.cookie)).json as unknown as unknown[])).toHaveLength(0);
    const id = mine.find(g => g.kind === 'money')!.id;
    expect((await call(c, 'POST', `/api/gifts/${id}/claim`, {}, A.cookie)).json.error).toBe('no such gift');
    const taken = await call(c, 'POST', `/api/gifts/${id}/claim`, {}, B.cookie);
    expect(taken.json).toMatchObject({ kind: 'money', amount: 300, sender_name: 'anna' });
    expect((await call(c, 'POST', `/api/gifts/${id}/claim`, {}, B.cookie)).json.error).toBe('no such gift');
  });
  it('show in the inbox count and in the kindness chapter, which is the twelfth', async () => {
    expect((await call(c, 'GET', '/api/inbox', undefined, B.cookie)).json).toMatchObject({ gifts: 2, crew_invites: 0, flat_invites: 0, coops: 0 } satisfies Inbox);
    const a = await have(A), b = await have(B);
    expect(a.gift_first).toBe(3); expect(b.gift_received_first).toBe(1);
    const r = await call(c, 'GET', '/api/challenges?city=Moscow', undefined, A.cookie);
    expect((r.json.challenges as unknown as { chapter: number }[]).filter(x => x.chapter === 12)).toHaveLength(10);
    expect((await call(c, 'GET', '/api/inbox', undefined, D.cookie)).json).toMatchObject({ gifts: 0 });
  });
  it('count invitations in the inbox too', async () => {
    await befriend(B, D); await call(c, 'POST', '/api/crews', { name: 'Gift Givers' }, B.cookie); await call(c, 'POST', '/api/crews/invite', { friend: D.id }, B.cookie);
    await call(c, 'POST', '/api/flats', { city: 'Kazan' }, B.cookie); await call(c, 'POST', '/api/flats/invite', { friend: D.id }, B.cookie);
    expect((await call(c, 'GET', '/api/inbox', undefined, D.cookie)).json).toMatchObject({ gifts: 0, crew_invites: 1, flat_invites: 1 });
  });
});
