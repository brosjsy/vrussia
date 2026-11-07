import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { call, player, start } from './util.js';
import type { Ctx } from './util.js';

let c: Ctx;
let A: Awaited<ReturnType<typeof player>>, B: Awaited<ReturnType<typeof player>>, K: Awaited<ReturnType<typeof player>>, D: Awaited<ReturnType<typeof player>>, E: Awaited<ReturnType<typeof player>>, F: Awaited<ReturnType<typeof player>>;
beforeAll(async () => { c = await start(); A = await player(c, 'anna'); B = await player(c, 'bakyt'); K = await player(c, 'kofi'); D = await player(c, 'dina'); E = await player(c, 'emil'); F = await player(c, 'farid'); }, 120_000);
afterAll(async () => { await c?.app.close(); await c?.t.close(); });

const befriend = async (x: typeof A, y: typeof A) => { await call(c, 'POST', '/api/follows', { user: y.id }, x.cookie); await call(c, 'POST', '/api/follows', { user: x.id }, y.cookie); };
type Mine = { flat: { id: number; city: string; members: { username: string; chore_today: boolean }[] } | null; invites: { id: number; city: string }[] };
const mine = async (x: typeof A) => (await call(c, 'GET', '/api/flats/mine', undefined, x.cookie)).json as unknown as Mine;
const have = async (x: typeof A) => Object.fromEntries(((await call(c, 'GET', '/api/challenges?city=Moscow', undefined, x.cookie)).json.challenges as unknown as { id: string; have: number }[]).map(r => [r.id, r.have]));

describe('shared flats', () => {
  it('lets a player start one flat in a city', async () => {
    expect((await call(c, 'POST', '/api/flats', { city: 'x' }, A.cookie)).status).toBe(400);
    expect((await call(c, 'POST', '/api/flats', { city: 'Moscow' }, A.cookie)).status).toBe(200);
    expect((await call(c, 'POST', '/api/flats', { city: 'Kazan' }, A.cookie)).json.error).toBe('already in a flat');
    const m = await mine(A); expect(m.flat?.city).toBe('Moscow'); expect(m.flat?.members.map(x => x.username)).toEqual(['anna']);
  });
  it('invites only friends who follow each other, and no more than four people live there', async () => {
    expect((await call(c, 'POST', '/api/flats/invite', { friend: B.id }, A.cookie)).json.error).toBe('not friends');
    expect((await call(c, 'POST', '/api/flats/invite', { friend: K.id }, B.cookie)).json.error).toBe('not in a flat');
    for (const p of [B, K, D, E]) await befriend(A, p);
    for (const p of [B, K, D]) {
      expect((await call(c, 'POST', '/api/flats/invite', { friend: p.id }, A.cookie)).status).toBe(200);
      const inv = (await mine(p)).invites[0]!; expect(inv.city).toBe('Moscow');
      expect((await call(c, 'POST', `/api/flats/invites/${inv.id}/answer`, { accept: true }, p.cookie)).status).toBe(200);
    }
    expect((await mine(A)).flat?.members).toHaveLength(4);
    expect((await call(c, 'POST', '/api/flats/invite', { friend: E.id }, A.cookie)).json.error).toBe('flat is full');
    expect((await call(c, 'POST', '/api/flats/invite', { friend: B.id }, A.cookie)).json.error).toBe('already in a flat');
  });
  it('lets an invitation be declined and does not let anyone answer for someone else', async () => {
    await call(c, 'POST', '/api/flats/leave', {}, D.cookie);
    expect((await call(c, 'POST', '/api/flats/invite', { friend: E.id }, A.cookie)).status).toBe(200);
    const inv = (await mine(E)).invites[0]!;
    expect((await call(c, 'POST', `/api/flats/invites/${inv.id}/answer`, { accept: true }, F.cookie)).json.error).toBe('no such invitation');
    await call(c, 'POST', `/api/flats/invites/${inv.id}/answer`, { accept: false }, E.cookie);
    expect((await mine(E)).flat).toBeNull(); expect((await mine(E)).invites).toHaveLength(0);
  });
  it('allows one chore a day, and counts a chore done on the same day as a flatmate for the team', async () => {
    expect((await call(c, 'POST', '/api/flats/chore', {}, F.cookie)).json.error).toBe('not in a flat');
    expect((await call(c, 'POST', '/api/flats/chore', {}, A.cookie)).json.doneToday).toBe(1);
    expect((await call(c, 'POST', '/api/flats/chore', {}, A.cookie)).json.error).toBe('chore done today');
    expect((await call(c, 'POST', '/api/flats/chore', {}, B.cookie)).json.doneToday).toBe(2);
    const a = await have(A), b = await have(B);
    expect(a.flat_first_chore).toBe(1); expect(a.flat_chore_team ?? 0).toBe(0); expect(b.flat_first_chore).toBe(1); expect(b.flat_team_clean).toBe(1);
    expect((await mine(A)).flat?.members.filter(x => x.chore_today)).toHaveLength(2);
  });
  it('counts the flat events for the roommates chapter', async () => {
    const a = await have(A); expect(a.flat_found).toBe(1); expect(a.flat_first_invite).toBe(4); expect(a.flat_flatmate).toBe(3);
    expect((await have(B)).flat_move_in).toBe(1);
    const r = await call(c, 'GET', '/api/challenges?city=Moscow', undefined, A.cookie);
    expect((r.json.challenges as unknown as { chapter: number }[]).filter(x => x.chapter === 10)).toHaveLength(10);
  });
  it('passes the flat on when the owner leaves and closes an empty one', async () => {
    await call(c, 'POST', '/api/flats/leave', {}, A.cookie);
    expect((await c.t.admin('select owner from app.flats')).rows[0]!.owner).toBe(B.id);
    for (const p of [B, K]) await call(c, 'POST', '/api/flats/leave', {}, p.cookie);
    expect((await c.t.admin('select count(*)::int as n from app.flats')).rows[0]!.n).toBe(0);
    expect((await call(c, 'POST', '/api/flats/leave', {}, A.cookie)).json.error).toBe('not in a flat');
  });
});
