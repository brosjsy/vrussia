import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { Cloud, configFromEnv, explain, placeRoom, directRoom, SESSION_KEY } from '../src/cloud';

const CFG = { url: 'https://abc.supabase.co', key: 'anon-key-that-is-long-enough-123' };
interface Req { url: string; method: string; headers: Record<string, string>; body: unknown }
type Reply = { status?: number; json?: unknown };
/** A stand-in for the server: it records every request and answers from a list of rules (the first whose text is in the address wins). */
function server(rules: [string, Reply | ((r: Req) => Reply)][] = []): { fetch: typeof fetch; reqs: Req[] } {
  const reqs: Req[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    const req: Req = { url: String(url), method: init?.method ?? 'GET', headers: (init?.headers ?? {}) as Record<string, string>, body: init?.body ? JSON.parse(String(init.body)) : undefined };
    reqs.push(req);
    const rule = rules.find(([k]) => req.url.includes(k)); const rep = rule ? (typeof rule[1] === 'function' ? rule[1](req) : rule[1]) : { json: [] };
    return new Response(rep.json === undefined ? '' : JSON.stringify(rep.json), { status: rep.status ?? 200 });
  }) as unknown as typeof fetch;
  return { fetch: f, reqs };
}
const kv = (): { m: Map<string, string>; getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } => { const m = new Map<string, string>(); return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); } }; };
const TOKEN = { access_token: 'AAA', refresh_token: 'RRR', expires_in: 3600, user: { id: 'u-1', email: 'a@b.ru' } };
const signedIn = async (extra: [string, Reply | ((r: Req) => Reply)][] = [], now = { t: 1_000_000 }): Promise<{ c: Cloud; reqs: Req[]; store: ReturnType<typeof kv>; now: { t: number } }> => {
  const store = kv(); const sv = server([['grant_type=password', { json: TOKEN }], ['profiles?', { json: [{ username: 'anna', adult: true }] }], ...extra]);
  const c = new Cloud(CFG, { fetch: sv.fetch, kv: store, now: () => now.t }); await c.signIn('a@b.ru', 'secret-password'); sv.reqs.length = 0;
  return { c, reqs: sv.reqs, store, now };
};

describe('settings', () => {
  it('there is an online part only when both settings are present and sensible', () => {
    expect(configFromEnv({})).toBeNull(); expect(configFromEnv({ VITE_SUPABASE_URL: 'https://abc.supabase.co' })).toBeNull(); expect(configFromEnv({ VITE_SUPABASE_URL: 'http://insecure.example', VITE_SUPABASE_ANON_KEY: 'x'.repeat(40) })).toBeNull();
    expect(configFromEnv({ VITE_SUPABASE_URL: 'https://abc.supabase.co/', VITE_SUPABASE_ANON_KEY: 'x'.repeat(40) })).toEqual({ url: 'https://abc.supabase.co', key: 'x'.repeat(40) });
  });
  it('rooms have one name for a place and one for two players whichever way round', () => {
    expect(placeRoom('Moscow', 'bank')).toBe('place:Moscow:bank'); expect(directRoom('b', 'a')).toBe('direct:a:b'); expect(directRoom('a', 'b')).toBe('direct:a:b');
  });
  it('server answers become plain words', () => {
    expect(explain('username taken')).toMatch(/taken/); expect(explain('Invalid login credentials')).toMatch(/Wrong e-mail or password/); expect(explain('slow down')).toMatch(/too fast/); expect(explain('something odd')).toMatch(/Try again later/);
  });
});

describe('accounts', () => {
  it('checks the name, the e-mail and the password before anything is sent', async () => {
    const sv = server(); const c = new Cloud(CFG, { fetch: sv.fetch, kv: kv() });
    expect((await c.signUp('a@b.ru', 'longenough', 'No', true)).ok).toBe(false); expect((await c.signUp('not-an-email', 'longenough', 'anna', true)).ok).toBe(false); expect((await c.signUp('a@b.ru', 'short', 'anna', true)).ok).toBe(false);
    expect(sv.reqs.length).toBe(0);
  });
  it('signs up, takes the public name, keeps the session but never the password', async () => {
    const store = kv(); const sv = server([['/auth/v1/signup', { json: TOKEN }], ['rpc/claim_profile', { json: { username: 'anna', adult: true } }], ['profiles?', { json: [] }]]);
    const c = new Cloud(CFG, { fetch: sv.fetch, kv: store, now: () => 1000 });
    const r = await c.signUp(' a@b.ru ', 'secret-password', 'Anna', true); expect(r).toMatchObject({ ok: true }); expect(r.msg).toContain('@anna');
    expect(sv.reqs[0]).toMatchObject({ method: 'POST', body: { email: 'a@b.ru', password: 'secret-password' } }); expect(sv.reqs[0].headers.apikey).toBe(CFG.key);
    const claim = sv.reqs.find(q => q.url.includes('claim_profile'))!; expect(claim.body).toEqual({ p_username: 'anna', p_adult: true }); expect(claim.headers.Authorization).toBe('Bearer AAA');
    expect(c.session()).toMatchObject({ userId: 'u-1', username: 'anna', adult: true, access: 'AAA' }); expect(store.m.get(SESSION_KEY)).not.toContain('secret-password');
    expect(new Cloud(CFG, { fetch: sv.fetch, kv: store }).session()?.username).toBe('anna');                         // it is still there after the page is opened again
  });
  it('when the project wants a confirmed e-mail, it says so and signs nobody in', async () => {
    const sv = server([['/auth/v1/signup', { json: { user: { id: 'u-1' } } }]]); const c = new Cloud(CFG, { fetch: sv.fetch, kv: kv() });
    const r = await c.signUp('a@b.ru', 'secret-password', 'anna', true); expect(r.ok).toBe(true); expect(r.msg).toMatch(/link in the e-mail/); expect(c.session()).toBeNull();
  });
  it('a wrong password, a taken name and no network are said in plain words', async () => {
    const c1 = new Cloud(CFG, { fetch: server([['grant_type=password', { status: 400, json: { error_description: 'Invalid login credentials' } }]]).fetch, kv: kv() }); expect((await c1.signIn('a@b.ru', 'x')).msg).toMatch(/Wrong e-mail or password/); expect(c1.session()).toBeNull();
    const { c } = await signedIn([['rpc/claim_profile', { status: 400, json: { message: 'username taken' } }]]); expect((await c.claim('boris', true)).msg).toMatch(/taken/);
    const off = new Cloud(CFG, { fetch: (async () => { throw new TypeError('offline'); }) as unknown as typeof fetch, kv: kv() }); expect((await off.signIn('a@b.ru', 'x')).msg).toMatch(/No connection/); expect((await off.top()).ok).toBe(false);
  });
  it('logging out forgets the session on this device', async () => {
    const { c, store, reqs } = await signedIn(); expect(store.m.has(SESSION_KEY)).toBe(true);
    await c.signOut(); expect(c.session()).toBeNull(); expect(store.m.has(SESSION_KEY)).toBe(false); expect(reqs.some(q => q.url.endsWith('/auth/v1/logout'))).toBe(true);
    expect((await c.save(G.newState('X', 'moscow'))).msg).toMatch(/Log in first/);
  });
  it('a token that is about to run out is renewed first, and a refused renewal signs the player out', async () => {
    const now = { t: 1_000_000 }; const { c, reqs } = await signedIn([['grant_type=refresh_token', { json: { access_token: 'BBB', refresh_token: 'R2', expires_in: 3600 } }], ['rpc/heartbeat', { json: null }]], now);
    await c.heartbeat('Moscow', 'bank'); expect(reqs.some(q => q.url.includes('refresh_token'))).toBe(false);
    now.t += 3600_000; reqs.length = 0; await c.heartbeat('Moscow', 'bank');
    expect(reqs[0].url).toContain('grant_type=refresh_token'); expect(reqs[0].body).toEqual({ refresh_token: 'RRR' }); expect(reqs[1].headers.Authorization).toBe('Bearer BBB'); expect(c.session()?.refresh).toBe('R2');
    const bad = await signedIn([['grant_type=refresh_token', { status: 400, json: { error: 'invalid_grant' } }]], { t: 1 }); bad.now.t = 9e9; expect((await bad.c.heartbeat('Moscow', 'bank')).msg).toMatch(/Log in first/); expect(bad.c.session()).toBeNull();
  });
});

describe('the saved game, the leaderboard and who is online', () => {
  it('saves the whole game under the player and loads it back', async () => {
    const s = G.newState('Anna', 'moscow'); s.day = 12;
    const { c, reqs } = await signedIn([['saves?select', { json: [{ data: s, updated_at: '2026-10-14T10:00:00Z' }] }], ['saves?on_conflict', { status: 201 }]]);
    expect((await c.save(s)).ok).toBe(true); const up = reqs[0]; expect(up.url).toContain('/rest/v1/saves?on_conflict=player_id'); expect(up.method).toBe('POST');
    expect(up.body).toMatchObject({ player_id: 'u-1', version: s.version, day: 12 }); expect((up.body as { data: G.State }).data.name).toBe('Anna'); expect(up.headers.Prefer).toContain('merge-duplicates');
    const back = await c.load(); expect(back.ok).toBe(true); expect(back.data?.state.day).toBe(12); expect(back.msg).toMatch(/latest saved game/);
    const none = await signedIn([['saves?select', { json: [] }]]); const r = await none.c.load(); expect(r.ok).toBe(true); expect(r.data).toBeNull(); expect(r.msg).toMatch(/No saved game/);
  });
  it('sends a finished life to the leaderboard and reads the top of it without an account', async () => {
    const { c, reqs } = await signedIn([['rpc/submit_score', { json: 42 }]]);
    expect(await c.submitScore('moscow', 'Moscow', 'time', 9800.4, 730)).toMatchObject({ ok: true, data: 42 }); expect(reqs[0].body).toEqual({ p_origin: 'moscow', p_city: 'Moscow', p_ending: 'time', p_score: 9800, p_days: 730 });
    const sv = server([['scores?', { json: [{ username: 'anna', score: 9800 }] }]]); const anon = new Cloud(CFG, { fetch: sv.fetch, kv: kv() });
    const top = await anon.top(500); expect(top.data?.[0].username).toBe('anna'); expect(sv.reqs[0].url).toContain('order=score.desc'); expect(sv.reqs[0].url).toContain('limit=100'); expect(sv.reqs[0].headers.Authorization).toBe(`Bearer ${CFG.key}`);
  });
  it('tells the server where the player is, and reads the number online and who is in the city', async () => {
    const { c, reqs } = await signedIn([['rpc/heartbeat', { json: null }], ['rpc/online_count', { json: 7 }], ['presence?', { json: [{ username: 'boris', city: 'Saint Petersburg', place: 'bank' }] }]]);
    expect((await c.heartbeat('Saint Petersburg', 'bank')).ok).toBe(true); expect(reqs[0].body).toEqual({ p_city: 'Saint Petersburg', p_place: 'bank' });
    expect((await c.online()).data).toBe(7); const h = await c.here('Saint Petersburg'); expect(h.data?.[0].username).toBe('boris'); expect(reqs[2].url).toContain('city=eq.Saint%20Petersburg');
  });
});

describe('chat, votes and shared numbers', () => {
  it('reads a room, sends a message of the right length, blocks and reports', async () => {
    const { c, reqs } = await signedIn([['messages?', { json: [{ id: 5, username: 'boris', body: 'hi' }] }], ['rpc/send_message', { json: 6 }], ['/rest/v1/blocks', { status: 201 }], ['/rest/v1/reports', { status: 201 }]]);
    const m = await c.messages(placeRoom('Moscow', 'bank'), 4); expect(m.data?.[0].body).toBe('hi'); expect(reqs[0].url).toContain('room=eq.place%3AMoscow%3Abank'); expect(reqs[0].url).toContain('id=gt.4');
    expect((await c.send(placeRoom('Moscow', 'bank'), '  hello  ')).ok).toBe(true); expect(reqs[1].body).toEqual({ p_room: 'place:Moscow:bank', p_body: 'hello' });
    const n = reqs.length; expect((await c.send('place:Moscow:bank', '   ')).ok).toBe(false); expect((await c.send('place:Moscow:bank', 'x'.repeat(281))).ok).toBe(false); expect(reqs.length).toBe(n);       // nothing is sent
    expect((await c.block('u-2')).ok).toBe(true); expect(reqs[n].body).toEqual({ blocker: 'u-1', blocked: 'u-2' });
    expect((await c.report(5, 'rude')).ok).toBe(true); expect(reqs[n + 1].body).toEqual({ reporter: 'u-1', message_id: 5, reason: 'rude' }); expect((await c.report(5, 'x')).ok).toBe(false);
  });
  it('a refusal by the server (too fast, not an adult) is passed on in plain words', async () => {
    const fast = await signedIn([['rpc/send_message', { status: 400, json: { message: 'slow down' } }]]); expect((await fast.c.send('place:Moscow:bank', 'hi')).msg).toMatch(/too fast/);
    const kid = await signedIn([['rpc/send_message', { status: 400, json: { message: 'chat is for adults' } }]]); expect((await kid.c.send('place:Moscow:bank', 'hi')).msg).toMatch(/18 or older/);
  });
  it('casts one vote, reads the count without an account, and counts visits', async () => {
    const { c, reqs } = await signedIn([['rpc/cast_vote', { json: null }], ['rpc/vote_tally', { json: [{ candidate: 'c3-1', votes: 2 }] }], ['rpc/bump', { json: 11 }]]);
    expect((await c.castVote(3, 'Kazan', 'c3-1')).ok).toBe(true); expect(reqs[0].body).toEqual({ p_week: 3, p_city: 'Kazan', p_candidate: 'c3-1' });
    expect((await c.tally(3, 'Kazan')).data).toEqual([{ candidate: 'c3-1', votes: 2 }]); expect((await c.bump('visits')).data).toBe(11);
    const sv = server([['rpc/bump', { json: 1 }]]); const anon = new Cloud(CFG, { fetch: sv.fetch, kv: kv() }); expect((await anon.bump('visits')).ok).toBe(true); expect((await anon.bump('daily_found')).msg).toMatch(/Log in first/); expect(sv.reqs.length).toBe(1);
  });
  it('a damaged session kept on the device is ignored', () => {
    const store = kv(); store.m.set(SESSION_KEY, '{broken'); expect(new Cloud(CFG, { fetch: server().fetch, kv: store }).session()).toBeNull();
    store.m.set(SESSION_KEY, JSON.stringify({ access: 5 })); expect(new Cloud(CFG, { fetch: server().fetch, kv: store }).session()).toBeNull();
  });
});
