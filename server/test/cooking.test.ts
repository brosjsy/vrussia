import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { call, player, start } from './util.js';
import type { Ctx } from './util.js';

let c: Ctx;
let A: Awaited<ReturnType<typeof player>>, B: Awaited<ReturnType<typeof player>>, K: Awaited<ReturnType<typeof player>>;
beforeAll(async () => { c = await start(); A = await player(c, 'amaka'); B = await player(c, 'boris'); K = await player(c, 'kemal'); }, 120_000);
afterAll(async () => { await c?.app.close(); await c?.t.close(); });
type Table = { top: { username: string; score: number; stars: number }[]; mine: { score: number; place: number } | null; count: number };
const send = (who: { cookie: string } | undefined, score: number, stars: number, dish = 'omelet') => call(c, 'POST', '/api/cooking/today', { dish, score, stars }, who?.cookie);

describe('the Kitchen online challenge (round 139)', () => {
  it('scores go on today\'s table, best first; each player keeps their best; the player sees their place', async () => {
    expect((await send(A, 72, 2)).json.best).toBe(72);
    expect((await send(A, 50, 1)).json.best).toBe(72);                              // a worse try does not replace the best
    expect((await send(A, 95, 3)).json.best).toBe(95);
    expect((await send(B, 80, 2)).status).toBe(200);
    const t = (await call(c, 'GET', '/api/cooking/today?dish=omelet', undefined, B.cookie)).json as unknown as Table;
    expect(t.top.map(x => x.username)).toEqual(['amaka', 'boris']); expect(t.top[0]).toMatchObject({ score: 95, stars: 3 });
    expect(t.mine).toEqual({ score: 80, place: 2 }); expect(t.count).toBe(2);
    const anon = (await call(c, 'GET', '/api/cooking/today?dish=omelet')).json as unknown as Table; expect(anon.mine).toBeNull();
    expect(((await call(c, 'GET', '/api/cooking/today?dish=borscht')).json as unknown as Table).top).toEqual([]);
  });
  it('impossible scores, bad dishes and anonymous sending are refused; ten tries a day', async () => {
    expect((await send(K, 95, 1)).json.error).toBe('score not possible');
    expect((await send(K, 101, 3)).status).toBe(400);
    expect((await send(K, 50, 1, 'drop table')).status).toBe(400);
    expect((await send(undefined, 50, 1)).status).toBe(401);
    for (let i = 0; i < 10; i++) expect((await send(K, 30 + i, 0)).status).toBe(200);
    expect((await send(K, 99, 3)).json.error).toBe('too many scores today');
  });
});
