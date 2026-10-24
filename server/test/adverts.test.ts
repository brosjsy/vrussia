import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { call, player, start } from './util.js';
import type { Ctx } from './util.js';

let c: Ctx;
let A: Awaited<ReturnType<typeof player>>, B: Awaited<ReturnType<typeof player>>, K: Awaited<ReturnType<typeof player>>, D: Awaited<ReturnType<typeof player>>;
beforeAll(async () => { c = await start(); A = await player(c, 'anna'); B = await player(c, 'bakyt'); K = await player(c, 'kofi'); D = await player(c, 'dina'); }, 120_000);
afterAll(async () => { await c?.app.close(); await c?.t.close(); });

const ad = (o: Record<string, unknown> = {}): Record<string, unknown> => ({ city: 'Kazan', spot: 'board', head: 'Russian lessons', line: 'An hour a day, near the metro', color: '#2f6fd6', icon: '🎓', days: 3, ...o });
type Advert = { id: number; username: string; spot: string; head: string; views: string | number };

describe('advertising spaces (round 125)', () => {
  it('a mounted advert is seen by the others in the city; each real viewer counts once a day, the author never', async () => {
    const r = await call(c, 'POST', '/api/adverts', ad(), A.cookie); expect(r.status).toBe(200); const id = r.json.id as number;
    for (let i = 0; i < 2; i++) await call(c, 'GET', '/api/adverts?city=Kazan', undefined, B.cookie);
    await call(c, 'GET', '/api/adverts?city=Kazan', undefined, A.cookie);
    const seen = (await call(c, 'GET', '/api/adverts?city=Kazan', undefined, K.cookie)).json as unknown as Advert[];
    expect(seen.find(x => x.id === id)).toMatchObject({ username: 'anna', spot: 'board', head: 'Russian lessons' });
    expect(Number(seen.find(x => x.id === id)!.views)).toBe(2);                   // bakyt and kofi
    expect(((await call(c, 'GET', '/api/adverts?city=Moscow', undefined, B.cookie)).json as unknown as Advert[]).some(x => x.id === id)).toBe(false);
    const mine = (await call(c, 'GET', '/api/adverts/mine', undefined, A.cookie)).json as unknown as Advert[]; expect(mine.map(x => x.id)).toEqual([id]);
    expect((await call(c, 'GET', '/api/adverts?city=Kazan')).status).toBe(200);    // looking without an account is fine
  });
  it('the advertising law and the language filter: refused on the server too', async () => {
    for (const head of ['Cold beer here', 'Best casino', 'Quick loan today', 'Visit www.shop']) expect((await call(c, 'POST', '/api/adverts', ad({ head }), B.cookie)).json.error, head).toBe('language');
    expect((await call(c, 'POST', '/api/adverts', ad({ head: 'ok', line: 'x' }), B.cookie)).json.error).toBe('bad length');
    expect((await call(c, 'POST', '/api/adverts', ad({ spot: 'roof' }), B.cookie)).status).toBe(400);
    expect((await call(c, 'POST', '/api/adverts', ad({ color: 'red' }), B.cookie)).status).toBe(400);
    expect((await call(c, 'POST', '/api/adverts', ad())).status).toBe(401);
  });
  it('two adverts at a time; a place has only so many frames', async () => {
    expect((await call(c, 'POST', '/api/adverts', ad({ spot: 'wall' }), A.cookie)).status).toBe(200);
    expect((await call(c, 'POST', '/api/adverts', ad({ spot: 'stop' }), A.cookie)).json.error).toBe('too many adverts');
    expect((await call(c, 'POST', '/api/adverts', ad({ spot: 'wall' }), B.cookie)).status).toBe(200);
    expect((await call(c, 'POST', '/api/adverts', ad({ spot: 'wall' }), K.cookie)).json.error).toBe('place taken');   // a city has two walls
    expect((await call(c, 'POST', '/api/adverts', ad({ spot: 'wall', city: 'Samara' }), K.cookie)).status).toBe(200);
  });
  it('taken down only by its author; three reports hide it; days are capped at a week', async () => {
    const id = ((await call(c, 'GET', '/api/adverts/mine', undefined, B.cookie)).json as unknown as Advert[])[0].id;
    expect((await call(c, 'DELETE', `/api/adverts/${id}`, undefined, A.cookie)).json.ok).toBe(false);
    const k = ((await call(c, 'GET', '/api/adverts/mine', undefined, K.cookie)).json as unknown as Advert[])[0].id;
    for (const p of [A, B, D]) await call(c, 'POST', `/api/adverts/${k}/report`, {}, p.cookie);
    expect(((await call(c, 'GET', '/api/adverts?city=Samara', undefined, D.cookie)).json as unknown as Advert[]).some(x => x.id === k)).toBe(false);
    expect((await call(c, 'DELETE', `/api/adverts/${id}`, undefined, B.cookie)).json.ok).toBe(true);
    const r = await call(c, 'POST', '/api/adverts', ad({ days: 14, city: 'Omsk' }), D.cookie);
    const days = (await c.t.admin(`select extract(day from expires_at - created_at)::int as d from app.adverts where id = ${Number(r.json.id)}`)).rows[0].d;
    expect(Number(days)).toBeLessThanOrEqual(7);
  });
});
