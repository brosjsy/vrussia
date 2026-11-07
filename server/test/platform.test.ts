import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { call, player, start } from './util.js';
import type { Ctx } from './util.js';

let c: Ctx;
let T: Awaited<ReturnType<typeof player>>, S: Awaited<ReturnType<typeof player>>, ADM: Awaited<ReturnType<typeof player>>;
beforeAll(async () => {
  c = await start({ ADMIN_EMAILS: 'boss@example.org' });
  T = await player(c, 'teacher'); S = await player(c, 'student'); ADM = await player(c, 'boss');
}, 120_000);
afterAll(async () => { await c?.app.close(); await c?.t.close(); });

describe('usage events and error reports', () => {
  it('anyone can send events; they carry no player and no address', async () => {
    const r = await call(c, 'POST', '/api/telemetry', { sid: 'abcdef123456', build: '2.0.0', events: [{ kind: 'event', name: 'run_start', props: { origin: 'tajik', diff: 'normal' } }, { kind: 'error', name: 'error', props: { message: 'x is not a function' } }] });
    expect(r.json).toEqual({ ok: true, n: 2 });
    const rows = (await c.t.admin('select kind, name, props, sid from app.telemetry order by id')).rows;
    expect(rows.map(x => x.name)).toEqual(['run_start', 'error']);
    expect(Object.keys(rows[0]).sort()).toEqual(['kind', 'name', 'props', 'sid']);
  });
  it('bad names, too many events, too many or too long properties and nested objects are refused', async () => {
    const bad = async (body: unknown): Promise<number> => (await call(c, 'POST', '/api/telemetry', body)).status;
    expect(await bad({ events: [{ kind: 'event', name: 'Bad Name' }] })).toBe(400);
    expect(await bad({ events: [] })).toBe(400);
    expect(await bad({ events: Array.from({ length: 21 }, () => ({ kind: 'event', name: 'tick' })) })).toBe(400);
    expect(await bad({ events: [{ kind: 'event', name: 'tick', props: { a: 'x'.repeat(81) } }] })).toBe(400);
    expect(await bad({ events: [{ kind: 'event', name: 'tick', props: { a: { b: 1 } } }] })).toBe(400);
    expect(await bad({ events: [{ kind: 'event', name: 'tick', props: Object.fromEntries(Array.from({ length: 9 }, (_, i) => ['k' + i, i])) }] })).toBe(400);
    expect(await bad({ sid: 'has spaces!', events: [{ kind: 'event', name: 'tick' }] })).toBe(400);
  });
});

describe('feature flags and the administrator area', () => {
  it('flags are public to read, and only a listed, confirmed administrator can change them', async () => {
    expect((await call(c, 'PUT', '/api/admin/flags/new_tour', { enabled: true }, T.cookie)).status).toBe(403);
    expect((await call(c, 'PUT', '/api/admin/flags/new_tour', { enabled: true })).status).toBe(401);
    expect((await call(c, 'PUT', '/api/admin/flags/new_tour', { enabled: true, rollout: 50, note: 'half of the players' }, ADM.cookie)).status).toBe(200);
    expect((await call(c, 'PUT', '/api/admin/flags/Bad-Key', { enabled: true }, ADM.cookie)).status).toBe(400);
    expect((await call(c, 'GET', '/api/flags')).json).toEqual([{ key: 'new_tour', enabled: true, rollout: 50 }]);
    expect((await call(c, 'GET', '/api/admin/whoami', undefined, ADM.cookie)).json.admin).toBe(true);
    expect((await call(c, 'GET', '/api/admin/whoami', undefined, T.cookie)).json.admin).toBe(false);
  });
  it('the numbers: events, errors and endings are counted; others see nothing', async () => {
    await call(c, 'POST', '/api/telemetry', { sid: 'zzzzzzzz1111', events: [{ kind: 'event', name: 'run_end', props: { ending: 'deported' } }, { kind: 'event', name: 'session_end', props: { day: 12 } }, { kind: 'event', name: 'scenario', props: { id: 'reg_day1' } }] });
    expect((await call(c, 'GET', '/api/admin/stats', undefined, T.cookie)).status).toBe(403);
    const s = (await call(c, 'GET', '/api/admin/stats?days=7', undefined, ADM.cookie)).json as unknown as { events: { name: string; n: number }[]; errors: { message: string }[]; endings: { ending: string; n: number }[]; quitDays: { day: number }[]; scenarios: { id: string }[] };
    expect(s.events.map(e => e.name)).toContain('run_start');
    expect(s.errors[0].message).toBe('x is not a function');
    expect(s.endings).toEqual([{ ending: 'deported', n: 1 }]);
    expect(s.quitDays).toEqual([{ day: 12, n: 1 }]);
    expect(s.scenarios).toEqual([{ id: 'reg_day1', n: 1 }]);
  });
  it('an administrator can post an announcement; nobody else can', async () => {
    expect((await call(c, 'POST', '/api/admin/announcements', { title: 'Hello', body: 'New tutorial' }, S.cookie)).status).toBe(403);
    expect((await call(c, 'POST', '/api/admin/announcements', { title: 'Hello', body: 'New tutorial' }, ADM.cookie)).status).toBe(200);
    expect((await call(c, 'GET', '/api/announcements', undefined, S.cookie)).json[0]).toMatchObject({ title: 'Hello' });
  });
});

describe('classes', () => {
  let code = '';
  it('a teacher makes a class; the code is six easy letters; a pupil reads the assignment without an account', async () => {
    const r = await call(c, 'POST', '/api/classes', { name: 'Class 9B', assignment: { origin: 'tajik', diff: 'easy', note: 'Get registered in 7 days' } }, T.cookie);
    code = String(r.json.code);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect((await call(c, 'POST', '/api/classes', { name: 'x' })).status).toBe(401);
    expect((await call(c, 'POST', '/api/classes', { name: 'Class', assignment: { evil: 1 } }, T.cookie)).status).toBe(400);
    expect((await call(c, 'GET', `/api/classes/${code}`)).json).toEqual({ name: 'Class 9B', assignment: { origin: 'tajik', diff: 'easy', note: 'Get registered in 7 days' } });
    expect((await call(c, 'GET', '/api/classes/AAAAAA')).status).toBe(404);
    expect((await call(c, 'GET', '/api/classes/abc')).status).toBe(400);
  });
  it('pupils send a result under a nickname; sending again replaces it; only the teacher can read them', async () => {
    const send = (nickname: string, score: number) => call(c, 'POST', `/api/classes/${code}/results`, { nickname, origin: 'tajik', ending: 'time', score, days: 730, learned: { done: ['registration'], mistakes: ['late_registration'] } });
    expect((await send('Dilya', 900)).status).toBe(200);
    expect((await send('Dilya', 1200)).status).toBe(200);
    expect((await send('Rustam', 800)).status).toBe(200);
    expect((await send('<script>', 5)).status).toBe(400);
    expect((await call(c, 'POST', '/api/classes/ZZZZZZ/results', { nickname: 'Dilya', origin: 'tajik', ending: 'time', score: 1, days: 1 })).status).toBe(404);
    const rows = (await call(c, 'GET', `/api/classes/${code}/results`, undefined, T.cookie)).json as unknown as { nickname: string; score: number }[];
    expect(rows.map(r => [r.nickname, r.score])).toEqual([['Dilya', 1200], ['Rustam', 800]]);
    expect((await call(c, 'GET', `/api/classes/${code}/results`, undefined, S.cookie)).status).toBe(404);   // somebody else's class looks like no class
    expect((await call(c, 'GET', `/api/classes/${code}/results`)).status).toBe(401);
    expect(((await call(c, 'GET', '/api/classes', undefined, T.cookie)).json[0] as unknown as { results: number }).results).toBe(2);
  });
  it('only the owner deletes a class, and its results go with it; at most ten classes', async () => {
    await call(c, 'DELETE', `/api/classes/${code}`, undefined, S.cookie);
    expect((await call(c, 'GET', `/api/classes/${code}`)).status).toBe(200);
    await call(c, 'DELETE', `/api/classes/${code}`, undefined, T.cookie);
    expect((await call(c, 'GET', `/api/classes/${code}`)).status).toBe(404);
    expect((await c.t.admin('select count(*)::int as n from app.class_results')).rows[0].n).toBe(0);
    for (let i = 0; i < 10; i++) expect((await call(c, 'POST', '/api/classes', { name: 'Class ' + i }, S.cookie)).status).toBe(200);
    expect((await call(c, 'POST', '/api/classes', { name: 'One more' }, S.cookie)).json.error).toBe('too many classes');
  });
});

describe('download my data', () => {
  it('returns the account, its save and scores, and nobody else\'s', async () => {
    await call(c, 'PUT', '/api/save', { data: { version: 3, day: 5, money: 77 } }, T.cookie);
    await call(c, 'POST', '/api/scores', { origin: 'ng', city: 'Moscow', ending: 'time', score: 100, days: 30 }, T.cookie);
    const e = (await call(c, 'GET', '/api/account/export', undefined, T.cookie)).json as unknown as { user: { email: string }; save: { data: { money: number } }; scores: unknown[] };
    expect(e.user.email).toBe('teacher@example.org');
    expect(e.save.data.money).toBe(77);
    expect(e.scores).toHaveLength(1);
    expect(JSON.stringify(e)).not.toContain('student@example.org');
    expect(JSON.stringify(e)).not.toMatch(/password|hash/i);
    expect((await call(c, 'GET', '/api/account/export')).status).toBe(401);
  });
});
