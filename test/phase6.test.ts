// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { Cloud } from '../src/cloud';
import { startSync, fingerprint, EVERY_MS } from '../src/cloud-sync';
import { mountOnline, resetOnlineView, muted, mute } from '../src/cloud-ui';
import { isRude } from '../src/rude';

const CFG = { url: 'https://abc.supabase.co', key: 'anon-key-that-is-long-enough-123' };
interface Req { url: string; method: string; body: unknown }
type Reply = { status?: number; json?: unknown; down?: boolean };
type Rule = [string, Reply | ((r: Req) => Reply)];
function server(rules: Rule[]): { fetch: typeof fetch; reqs: Req[] } {
  const reqs: Req[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    const req: Req = { url: String(url), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined }; reqs.push(req);
    const rule = rules.find(([k]) => req.url.includes(k)); const rep = rule ? (typeof rule[1] === 'function' ? rule[1](req) : rule[1]) : { json: [] };
    if (rep.down) throw new TypeError('Failed to fetch');
    return new Response(rep.json === undefined ? '' : JSON.stringify(rep.json), { status: rep.status ?? 200 });
  }) as unknown as typeof fetch;
  return { fetch: f, reqs };
}
const TOKEN = { access_token: 'AAA', refresh_token: 'RRR', expires_in: 3600, user: { id: 'u-1', email: 'a@b.ru' } };
const signedIn = async (rules: Rule[] = []): Promise<{ c: Cloud; reqs: Req[] }> => {
  const sv = server([['grant_type=password', { json: TOKEN }], ['profiles?select=username,adult', { json: [{ username: 'anna', adult: true }] }], ...rules]);
  const c = new Cloud(CFG, { fetch: sv.fetch, kv: null, now: () => 1_000_000 }); await c.signIn('a@b.ru', 'secret-password'); sv.reqs.length = 0; return { c, reqs: sv.reqs };
};
const settle = async (): Promise<void> => { for (let i = 0; i < 12; i++) await new Promise(r => setTimeout(r, 0)); };
const game = (): G.State => G.newState('Anna', 'moscow');

describe('the language filter', () => {
  it('stops the worst words in Russian and English and lets ordinary talk through; the client refuses before sending', async () => {
    expect(isRude('Ты СУКА')).toBe(true); expect(isRude('what the fuck')).toBe(true);
    expect(isRude('Привет, соседи! Как дела? Хорошая квартира.')).toBe(false); expect(isRude('Classic cassette shop')).toBe(false);
    const { c, reqs } = await signedIn(); const r = await c.send('place:Moscow:market', 'вот сука'); expect(r.ok).toBe(false); expect(r.msg).toContain('polite'); expect(reqs.length).toBe(0);
    expect((await c.signGuestbook('u-2', 'shit flat', null)).ok).toBe(false); expect(reqs.length).toBe(0);
  });
});

describe('the new server calls', () => {
  it('publish a home, read one, sign the guest book with a gift, like, the best flats, friends and searching by name', async () => {
    const home = { player_id: 'u-2', username: 'boris', city: 'Kazan', dwelling: 'dorm', design: { placed: [] }, stars: 3, updated_at: 'x' };
    const { c, reqs } = await signedIn([['homes?select', { json: [home] }], ['rpc/my_friends', { json: [{ id: 'u-2', username: 'boris', mutual: true, online: true, city: 'Kazan', place: 'market' }] }], ['profiles?select=id,username', { json: [{ id: 'u-3', username: 'borya' }] }]]);
    expect((await c.publishHome('Moscow', 'studio', { placed: [{ id: 'stool', i: 1, j: 1, rot: 0 }] }, 999)).ok).toBe(true);
    expect(reqs.pop()!.body).toEqual({ p_city: 'Moscow', p_dwelling: 'studio', p_design: { placed: [{ id: 'stool', i: 1, j: 1, rot: 0 }] }, p_stars: 400 });
    expect((await c.home('u-2')).data).toEqual(home);
    await c.signGuestbook('u-2', '  Nice!  ', 'cake'); expect(reqs.pop()!.body).toEqual({ p_owner: 'u-2', p_body: 'Nice!', p_gift: 'cake' });
    await c.voteHome('u-2'); expect(reqs.pop()!.url).toContain('rpc/vote_home');
    expect((await c.friends()).data![0].online).toBe(true);
    expect((await c.findPlayers('Bor')).data).toEqual([{ id: 'u-3', username: 'borya' }]); expect(reqs.pop()!.url).toContain('username=like.bor*');
    expect((await c.findPlayers('b')).data).toEqual([]);
  });
});

describe('automatic saving to the server', () => {
  const fakeWin = (): { win: never; doc: never; fire: (e: string) => void; tick: () => void; vis: { v: string } } => {
    const handlers: Record<string, (() => void)[]> = {}; let interval: (() => void) | null = null; const vis = { v: 'visible' };
    const on = (e: string, f: () => void): void => { (handlers[e] ??= []).push(f); }, off = (e: string, f: () => void): void => { handlers[e] = (handlers[e] ?? []).filter(x => x !== f); };
    return { win: { addEventListener: on, removeEventListener: off, setInterval: (f: () => void) => { interval = f; return 1; }, clearInterval: () => { interval = null; } } as never, doc: { addEventListener: on, removeEventListener: off, get visibilityState() { return vis.v; } } as never, fire: e => (handlers[e] ?? []).forEach(f => f()), tick: () => interval?.(), vis };
  };
  it('saves every 30 seconds only when the game changed, when the tab is hidden, and publishes the home', async () => {
    let s = game(); const { c, reqs } = await signedIn(); s.owner = c.session()!.userId; const w = fakeWin(); let t = 0;
    const sy = startSync({ cloud: c, state: () => s, home: () => ({ city: s.city, dwelling: 'family', design: { placed: [] }, stars: 2 }), now: () => t, win: w.win, doc: w.doc });
    expect(EVERY_MS).toBe(30_000);
    w.tick(); await settle(); expect(reqs.filter(r => r.url.includes('saves?')).length).toBe(1); expect(reqs.some(r => r.url.includes('publish_home'))).toBe(true);
    w.tick(); await settle(); expect(reqs.filter(r => r.url.includes('saves?')).length).toBe(1);             // nothing changed: nothing sent
    s = { ...s, money: s.money + 1 }; t += 1000; w.vis.v = 'hidden'; w.fire('visibilitychange'); await settle(); expect(reqs.filter(r => r.url.includes('saves?')).length).toBe(2);
    expect(sy.status().lastSaved).toBe(1000); expect(reqs.filter(r => r.url.includes('publish_home')).length).toBe(1);   // the home at most every five minutes
    sy.stop(); s = { ...s, money: 5 }; w.tick(); await settle(); expect(reqs.filter(r => r.url.includes('saves?')).length).toBe(2);
    expect(fingerprint(s)).not.toBe(fingerprint({ ...s, day: s.day + 1 }));
  });
  it('without a connection the game goes on and the save goes up when the browser is online again; nothing is sent when signed out', async () => {
    let down = true; const s = game();
    const sv = server([['grant_type=password', { json: TOKEN }], ['profiles?select=username,adult', { json: [{ username: 'anna', adult: true }] }], ['saves?', () => (down ? { down: true } : { status: 201 })]]);
    const c = new Cloud(CFG, { fetch: sv.fetch, kv: null, now: () => 1_000_000 }); await c.signIn('a@b.ru', 'secret-password'); s.owner = c.session()!.userId;
    const w = fakeWin(); const statuses: boolean[] = [];
    const sy = startSync({ cloud: c, state: () => s, win: w.win, doc: w.doc, onStatus: st => statuses.push(st.pending) });
    w.tick(); await settle(); expect(sy.status().pending).toBe(true); expect(sy.status().error).toContain('connection');
    down = false; w.fire('online'); await settle(); expect(sy.status().pending).toBe(false); expect(statuses).toEqual([true, false]);
    await c.signOut(); const n = sv.reqs.length; w.tick(); await settle(); expect(sv.reqs.length).toBe(n);
  });
  it('never uploads a game that belongs to another account, nor a game with no owner (found in manual testing, round 150)', async () => {
    const s = game(); const { c, reqs } = await signedIn(); const w = fakeWin();
    const sy = startSync({ cloud: c, state: () => s, win: w.win, doc: w.doc });
    s.owner = 'someone-else'; w.tick(); await settle(); s.owner = undefined; w.tick(); await settle();
    expect(reqs.filter(r => r.url.includes('saves?')).length).toBe(0);
    s.owner = c.session()!.userId; w.tick(); await settle(); expect(reqs.filter(r => r.url.includes('saves?')).length).toBe(1);
    sy.stop();
  });
});

describe('the Friends tab', () => {
  beforeEach(() => { resetOnlineView(); localStorage.clear(); });
  const mk = async (rules: Rule[], st: G.State = game()) => {
    const { c, reqs } = await signedIn(rules); const host = document.createElement('div'), said: string[] = [];
    const stop = mountOnline(host, { cloud: c, state: () => st, notify: m => said.push(m), onLoad: () => undefined, home: () => ({ city: st.city, dwelling: 'family', design: { placed: [] }, stars: 4 }) }); await settle();
    const click = async (sel: string): Promise<void> => { host.querySelector<HTMLElement>(sel)!.click(); await settle(); };
    return { c, reqs, host, said, stop, click, st };
  };
  it('shows friends with who is online, finds and follows a player, and lists the best flats', async () => {
    const r = await mk([['rpc/my_friends', { json: [{ id: 'u-2', username: 'boris', mutual: true, online: true, city: 'Kazan', place: 'market' }, { id: 'u-3', username: 'clara', mutual: false, online: false, city: null, place: null }] }], ['rpc/best_homes', { json: [{ owner: 'u-2', username: 'boris', city: 'Kazan', dwelling: 'dorm', stars: 3, votes: 4 }] }], ['profiles?select=id,username', { json: [{ id: 'u-9', username: 'dima' }] }], ['follows', { status: 201 }]]);
    await r.click('[data-tab="friends"]');
    expect(r.host.querySelectorAll('.olFriends .dot').length).toBe(2); expect(r.host.querySelectorAll('.olFriends .dot.on').length).toBe(1); expect(r.host.textContent).toContain('🤝');
    expect(r.host.querySelector('.olTop')!.textContent).toContain('4 👍');
    (r.host.querySelector('#olFindText') as HTMLInputElement).value = 'dim'; r.host.querySelector<HTMLFormElement>('#olFind')!.dispatchEvent(new Event('submit', { cancelable: true })); await settle();
    await r.click('[data-follow="u-9"]'); expect(r.reqs.find(q => q.url.includes('/follows') && q.method === 'POST')!.body).toEqual({ follower: 'u-1', followed: 'u-9' });
    await r.click('#olPublish'); expect(r.reqs.some(q => q.url.includes('publish_home'))).toBe(true);
    r.stop();
  });
  it('a visit shows the plan of the home and the guest book; a note with a gift costs game money; a like is sent', async () => {
    const home = { player_id: 'u-2', username: 'boris', city: 'Kazan', dwelling: 'dorm', design: { placed: [{ id: 'sofa-2', i: 1, j: 1, rot: 0 }, { id: 'stool', i: 5, j: 2, rot: 1 }], floor: 'parquet' }, stars: 3, updated_at: 'x' };
    const r = await mk([['rpc/my_friends', { json: [{ id: 'u-2', username: 'boris', mutual: true, online: false, city: null, place: null }] }], ['homes?select', { json: [home] }], ['guestbook?select', { json: [{ id: 1, owner: 'u-2', author: 'u-3', author_name: 'clara', body: 'Cosy <b>flat</b>', gift: 'flowers', created_at: 'x' }] }], ['rpc/sign_guestbook', { json: 2 }], ['rpc/vote_home', { status: 200 }]]);
    await r.click('[data-tab="friends"]'); await r.click('[data-visit="u-2"]');
    expect(r.host.querySelectorAll('.plan .plItem').length).toBe(2); expect(r.host.querySelector('.olNotes')!.textContent).toContain('💐'); expect(r.host.querySelector('.olNotes b b')).toBeNull();
    const m0 = r.st.money; (r.host.querySelector('#olNoteText') as HTMLInputElement).value = 'Thank you for having me'; (r.host.querySelector('#olGift') as HTMLSelectElement).value = 'cake';
    r.host.querySelector<HTMLFormElement>('#olNote')!.dispatchEvent(new Event('submit', { cancelable: true })); await settle();
    expect(r.reqs.find(q => q.url.includes('sign_guestbook'))!.body).toEqual({ p_owner: 'u-2', p_body: 'Thank you for having me', p_gift: 'cake' }); expect(r.st.money).toBe(m0 - 600);
    await r.click('#olLike'); expect(r.reqs.some(q => q.url.includes('vote_home'))).toBe(true);
    await r.click('#olVisitBack'); expect(r.host.querySelector('.plan')).toBeNull();
    r.stop();
  });
  it('mute hides a player\'s messages on this device for a day', async () => {
    const t0 = Date.now(); mute('u-7', t0); expect(muted(t0)['u-7']).toBeGreaterThan(t0); expect(muted(t0 + 86_400_001)['u-7']).toBeUndefined();
    localStorage.clear();
    const st = game(), room = `place:${st.city}:${st.loc}`;
    const r = await mk([['messages?', { json: [{ id: 2, room, sender: 'u-7', username: 'loud', body: 'spam spam', created_at: 'x' }, { id: 1, room, sender: 'u-8', username: 'kind', body: 'hello', created_at: 'x' }] }]], st);
    await r.click('[data-tab="chat"]'); expect(r.host.querySelectorAll('.olChat li').length).toBe(2);
    await r.click('[data-mute="u-7"]'); expect(r.host.querySelectorAll('.olChat li').length).toBe(1); expect(r.host.textContent).not.toContain('spam'); expect(r.said.pop()).toContain('day');
    r.stop();
  });
});
