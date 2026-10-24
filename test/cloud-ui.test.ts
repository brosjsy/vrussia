// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { Cloud } from '../src/cloud';
import { mountOnline, resetOnlineView } from '../src/cloud-ui';

const CFG = { url: 'https://abc.supabase.co', key: 'anon-key-that-is-long-enough-123' };
interface Req { url: string; method: string; body: unknown }
type Reply = { status?: number; json?: unknown };
type Rule = [string, Reply | ((r: Req) => Reply)];
/** A stand-in for the server: records every request and answers from a list of rules (the first whose text is in the address wins). */
function server(rules: Rule[]): { fetch: typeof fetch; reqs: Req[] } {
  const reqs: Req[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    const req: Req = { url: String(url), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined };
    reqs.push(req);
    const rule = rules.find(([k]) => req.url.includes(k)); const rep = rule ? (typeof rule[1] === 'function' ? rule[1](req) : rule[1]) : { json: [] };
    return new Response(rep.json === undefined ? '' : JSON.stringify(rep.json), { status: rep.status ?? 200 });
  }) as unknown as typeof fetch;
  return { fetch: f, reqs };
}
const TOKEN = { access_token: 'AAA', refresh_token: 'RRR', expires_in: 3600, user: { id: 'u-1', email: 'a@b.ru' } };
const settle = async (): Promise<void> => { for (let i = 0; i < 12; i++) await new Promise(r => setTimeout(r, 0)); };
const game = (): G.State => G.newState('Anna', G.origins[0].id);

interface Rig { host: HTMLElement; reqs: Req[]; said: string[]; loaded: G.State[]; stop: () => void; c: Cloud }
async function rig(o: { rules?: Rule[]; adult?: boolean; signedIn?: boolean; state?: G.State | null } = {}): Promise<Rig> {
  const sv = server([['grant_type=password', { json: TOKEN }], ['profiles?', { json: [{ username: 'anna', adult: o.adult ?? true }] }], ...(o.rules ?? [])]);
  const c = new Cloud(CFG, { fetch: sv.fetch, kv: null, now: () => 1_000_000 });
  if (o.signedIn !== false) { await c.signIn('a@b.ru', 'secret-password'); sv.reqs.length = 0; }
  const host = document.createElement('div'), said: string[] = [], loaded: G.State[] = [];
  const st = o.state === undefined ? game() : o.state;
  const stop = mountOnline(host, { cloud: c, state: () => st, notify: m => said.push(m), onLoad: s => loaded.push(s) });
  await settle();
  return { host, reqs: sv.reqs, said, loaded, stop, c };
}
const click = async (r: Rig, sel: string): Promise<void> => { const b = r.host.querySelector<HTMLElement>(sel); if (!b) throw new Error('no ' + sel); b.click(); await settle(); };
const submit = async (r: Rig, sel: string): Promise<void> => { const f = r.host.querySelector<HTMLFormElement>(sel); if (!f) throw new Error('no ' + sel); f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); await settle(); };
const fill = (r: Rig, id: string, v: string): void => { (r.host.querySelector('#' + id) as HTMLInputElement).value = v; };

beforeEach(() => resetOnlineView());

describe('the Online screen', () => {
  it('without an online part it says so, shows no form and sends nothing', () => {
    const host = document.createElement('div'); const said: string[] = [];
    const stop = mountOnline(host, { cloud: null, state: () => null, notify: m => said.push(m), onLoad: () => { throw new Error('no'); } });
    expect(host.textContent).toContain('no online part'); expect(host.querySelector('form')).toBeNull(); expect(host.querySelector('[data-tab]')).toBeNull(); stop();
  });

  it('a visitor sees the log-in form, can switch to making an account, and logging in shows their name', async () => {
    const r = await rig({ signedIn: false });
    expect(r.host.querySelector('#olAuth')).not.toBeNull(); expect(r.host.querySelector('#olName')).toBeNull();
    await click(r, '#olSwitch'); expect(r.host.querySelector('#olName')).not.toBeNull(); expect(r.host.querySelector('#olAdult')).not.toBeNull(); expect(r.host.textContent).toContain('keeps your email');
    await click(r, '#olSwitch'); fill(r, 'olEmail', 'a@b.ru'); fill(r, 'olPass', 'secret-password'); await submit(r, '#olAuth');
    expect(r.reqs.some(q => q.url.includes('grant_type=password'))).toBe(true);
    expect(r.host.textContent).toContain('@anna'); expect(r.host.querySelector('#olSave')).not.toBeNull(); expect(r.said.join(' ')).toContain('Welcome back');
    expect(r.host.innerHTML).not.toContain('secret-password');
    r.stop();
  });

  it('a wrong password is explained and the form stays', async () => {
    const r = await rig({ signedIn: false, rules: [] });
    const sv = server([['grant_type=password', { status: 400, json: { error_description: 'Invalid login credentials' } }]]);
    const c = new Cloud(CFG, { fetch: sv.fetch, kv: null }); const host = document.createElement('div'); const said: string[] = [];
    const stop = mountOnline(host, { cloud: c, state: () => null, notify: m => said.push(m), onLoad: () => undefined }); await settle();
    (host.querySelector('#olEmail') as HTMLInputElement).value = 'a@b.ru'; (host.querySelector('#olPass') as HTMLInputElement).value = 'wrong-password';
    host.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true })); await settle();
    expect(said.length).toBe(1); expect(host.querySelector('#olAuth')).not.toBeNull(); expect(c.session()).toBeNull();
    stop(); r.stop();
  });

  it('somebody logged in without a public name is asked to choose one', async () => {
    const r = await rig({ rules: [], signedIn: false });
    const sv = server([['grant_type=password', { json: TOKEN }], ['profiles?', { json: [] }], ['rpc/claim_profile', q => ({ json: { username: (q.body as { p_username: string }).p_username, adult: true } })]]);
    const c = new Cloud(CFG, { fetch: sv.fetch, kv: null, now: () => 1_000_000 }); await c.signIn('a@b.ru', 'secret-password');
    const host = document.createElement('div'); const stop = mountOnline(host, { cloud: c, state: () => null, notify: () => undefined, onLoad: () => undefined }); await settle();
    expect(host.querySelector('#olClaim')).not.toBeNull(); expect(host.querySelector('#olSave')).toBeNull();
    (host.querySelector('#olName') as HTMLInputElement).value = 'Masha_7'; host.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true })); await settle();
    expect(sv.reqs.find(q => q.url.includes('claim_profile'))?.body).toEqual({ p_username: 'masha_7', p_adult: false });
    expect(host.textContent).toContain('@masha_7');
    stop(); r.stop();
  });

  it('saving sends the game of this player; loading hands the saved game back', async () => {
    const saved = game(); saved.day = 12; saved.money = 4321;
    const r = await rig({ rules: [['saves?select', { json: [{ data: saved, updated_at: '2026-01-01T00:00:00Z' }] }], ['saves?on_conflict', { status: 201 }]] });
    await click(r, '#olSave');
    const put = r.reqs.find(q => q.url.includes('saves?on_conflict'))!; expect((put.body as { player_id: string }).player_id).toBe('u-1'); expect((put.body as { data: G.State }).data.name).toBe('Anna');
    await click(r, '#olLoad'); expect(r.loaded.length).toBe(1); expect(r.loaded[0].money).toBe(4321);
    r.stop();
  });

  it('a saved game from another version of the rules is refused', async () => {
    const r = await rig({ rules: [['saves?select', { json: [{ data: { version: 3, day: 1 }, updated_at: 'x' }] }]] });
    await click(r, '#olLoad'); expect(r.loaded.length).toBe(0); expect(r.said.join(' ')).toContain('another version');
    r.stop();
  });

  it('with no game there is nothing to save', async () => {
    const r = await rig({ state: null }); await click(r, '#olSave');
    expect(r.reqs.some(q => q.url.includes('saves'))).toBe(false); expect(r.said.join(' ')).toContain('Start a game');
    r.stop();
  });

  it('the leaderboard lists the scores and a hostile name or city cannot put markup on the page', async () => {
    const r = await rig({ rules: [['scores?', { json: [{ username: '<img src=x onerror=alert(1)>', origin: 'student', city: '<b>Moscow</b>', ending: 'time', score: 9000, days: 300, created_at: 'x' }, { username: 'ivan', origin: 'it', city: 'Kazan', ending: 'time', score: 100, days: 30, created_at: 'x' }] }]] });
    await click(r, '[data-tab="top"]');
    expect(r.host.querySelectorAll('.olTop li').length).toBe(2); expect(r.host.querySelector('.olTop img')).toBeNull(); expect(r.host.querySelector('.olTop span b')).toBeNull();
    expect(r.host.textContent).toContain('9000'); expect(r.host.textContent).toContain('@ivan');
    r.stop();
  });

  it('chat is closed to visitors and to players who are not adults', async () => {
    const a = await rig({ signedIn: false }); await click(a, '[data-tab="chat"]'); expect(a.host.querySelector('#olSend')).toBeNull(); expect(a.host.textContent).toContain('Log in'); a.stop();
    resetOnlineView();
    const b = await rig({ adult: false }); await click(b, '[data-tab="chat"]'); expect(b.host.querySelector('#olSend')).toBeNull(); expect(b.host.textContent).toContain('18'); expect(b.reqs.some(q => q.url.includes('messages'))).toBe(false); b.stop();
  });

  it('the chat shows the room of the place, sends to it, and offers report and block only on the messages of others', async () => {
    const st = game(); const room = `place:${st.city}:${st.loc}`;
    const r = await rig({ state: st, rules: [['messages?', { json: [{ id: 2, room, sender: 'u-2', username: 'oleg', body: '<script>x</script> hi', created_at: 'x' }, { id: 1, room, sender: 'u-1', username: 'anna', body: 'mine', created_at: 'x' }] }], ['rpc/send_message', { json: 3 }], ['reports', { status: 201 }], ['blocks', { status: 201 }]] });
    await click(r, '[data-tab="chat"]');
    expect(r.reqs.find(q => q.url.includes('messages?'))!.url).toContain(encodeURIComponent(room));
    const items = Array.from(r.host.querySelectorAll('.olChat li')); expect(items.length).toBe(2); expect(items[0].textContent).toContain('mine');   // the oldest first
    expect(r.host.querySelector('.olChat script')).toBeNull();
    expect(r.host.querySelectorAll('[data-report]').length).toBe(1); expect(r.host.querySelector('.mine [data-report]')).toBeNull(); expect(r.host.querySelector('.mine [data-block]')).toBeNull();
    fill(r, 'olText', '  hello there  '); await submit(r, '#olSend');
    expect(r.reqs.find(q => q.url.includes('send_message'))!.body).toEqual({ p_room: room, p_body: 'hello there' });
    await click(r, '[data-report="2"]'); expect((r.reqs.find(q => q.url.includes('reports'))!.body as { message_id: number }).message_id).toBe(2);
    await click(r, '[data-block="u-2"]'); expect(r.reqs.find(q => q.url.includes('/blocks'))!.body).toEqual({ blocker: 'u-1', blocked: 'u-2' });
    r.stop();
  });

  it('a refused message is explained to the player', async () => {
    const r = await rig({ rules: [['rpc/send_message', { status: 400, json: { message: 'slow down' } }]] });
    await click(r, '[data-tab="chat"]'); fill(r, 'olText', 'again'); await submit(r, '#olSend');
    expect(r.said.length).toBe(1); expect(r.said[0].length).toBeGreaterThan(5);
    r.stop();
  });

  it('the news tab shows the announcements and the number of visits', async () => {
    const r = await rig({ rules: [['announcements?', { json: [{ id: 1, title: 'Winter update', body: 'Snow <i>everywhere</i>', created_at: 'x' }] }], ['counters?', { json: [{ key: 'visits', value: 12345 }] }]] });
    await click(r, '[data-tab="news"]');
    expect(r.host.textContent).toContain('Winter update'); expect(r.host.textContent).toContain('12,345'); expect(r.host.querySelector('.olNews i')).toBeNull();
    r.stop();
  });

  it('logging out goes back to the form, and a stopped screen draws nothing more', async () => {
    const r = await rig(); await click(r, '#olOut');
    expect(r.c.session()).toBeNull(); expect(r.host.querySelector('#olAuth')).not.toBeNull();
    r.stop(); const before = r.host.innerHTML; r.host.querySelector<HTMLElement>('#olSwitch')!.click(); await settle(); expect(r.host.innerHTML).toBe(before);
  });
});

describe('finding and talking to other players', () => {
  const AD = { id: 7, player_id: 'u-2', username: 'oleg', city: 'x', kind: 'sell', title: '<b>Bike</b> for sale', body: 'rides <i>well</i>', price: 2500, created_at: 'x' };
  it('the adverts tab lists the adverts of real players in the city, safely, and a visitor gets no form', async () => {
    const r = await rig({ signedIn: false, rules: [['ads?', { json: [AD] }]] }); await click(r, '[data-tab="ads"]');
    expect(r.host.querySelectorAll('.olAds li').length).toBe(1); expect(r.host.querySelector('.olAds b b')).toBeNull(); expect(r.host.querySelector('.olAds i')).toBeNull(); expect(r.host.textContent).toContain('2,500');
    expect(r.host.querySelector('#olAdForm')).toBeNull(); expect(r.host.querySelector('[data-dm]')).toBeNull(); r.stop();
  });
  it('a player puts up an advert in their city, takes their own down, and reports somebody else\'s', async () => {
    const st = game();
    const r = await rig({ state: st, rules: [['ads?id=eq', { status: 200 }], ['ads?', { json: [AD, { ...AD, id: 8, player_id: 'u-1', username: 'anna', title: 'My old kettle' }] }], ['rpc/post_ad', { json: 9 }], ['rpc/report_ad', { status: 200 }]] });
    await click(r, '[data-tab="ads"]');
    expect(r.reqs.find(q => q.url.includes('ads?select'))!.url).toContain(encodeURIComponent(st.city));
    expect(r.host.querySelectorAll('[data-adoff]').length).toBe(1); expect(r.host.querySelectorAll('[data-adreport]').length).toBe(1);
    fill(r, 'olAdTitle', 'Winter boots'); fill(r, 'olAdPrice', '-500'); await submit(r, '#olAdForm');          // a price below zero is refused, not saved as 500 (round 150)
    expect(r.reqs.some(q => q.url.includes('rpc/post_ad'))).toBe(false);
    fill(r, 'olAdTitle', '  Winter boots '); fill(r, 'olAdBody', 'size 42'); fill(r, 'olAdPrice', '1 500 rub'); (r.host.querySelector('#olAdKind') as HTMLSelectElement).value = 'sell'; await submit(r, '#olAdForm');
    expect(r.reqs.find(q => q.url.includes('rpc/post_ad'))!.body).toEqual({ p_city: st.city, p_kind: 'sell', p_title: 'Winter boots', p_body: 'size 42', p_price: 1500 });
    await click(r, '[data-adoff="8"]'); expect(r.reqs.some(q => q.method === 'DELETE' && q.url.includes('ads?id=eq.8'))).toBe(true);
    await click(r, '[data-adreport="7"]'); expect(r.reqs.find(q => q.url.includes('rpc/report_ad'))!.body).toEqual({ p_ad: 7 });
    r.stop();
  });
  it('"write" on an advert opens a private talk with its owner: messages are read from and sent to the room of the two, and "back" returns to the place', async () => {
    const st = game(), room = 'direct:u-1:u-2';
    const r = await rig({ state: st, rules: [['ads?', { json: [AD] }], ['rpc/my_talks', { json: [{ room, other: 'u-2', other_name: 'oleg', last_body: 'hi', last_at: 'x' }] }], ['rpc/send_message', { json: 5 }], ['messages?', { json: [] }]] });
    await click(r, '[data-tab="ads"]'); await click(r, '.olAds [data-dm="u-2"]');
    expect(r.host.textContent).toContain('@oleg'); expect(r.reqs.filter(q => q.url.includes('messages?')).pop()!.url).toContain(encodeURIComponent(room));
    expect(r.host.querySelectorAll('.olTalks [data-dm]').length).toBe(1);
    fill(r, 'olText', 'is the bike still for sale?'); await submit(r, '#olSend');
    expect(r.reqs.find(q => q.url.includes('send_message'))!.body).toEqual({ p_room: room, p_body: 'is the bike still for sale?' });
    await click(r, '#olBack'); expect(r.reqs.filter(q => q.url.includes('messages?')).pop()!.url).toContain(encodeURIComponent('place:' + st.city + ':' + st.loc));
    r.stop();
  });
  it('deleting the account needs two presses, then the session is gone', async () => {
    const r = await rig({ rules: [['rpc/delete_my_account', { status: 200 }]] });
    await click(r, '#olDelete'); expect(r.reqs.some(q => q.url.includes('delete_my_account'))).toBe(false); expect(r.c.session()).not.toBeNull(); expect(r.host.querySelector('#olDelete')!.textContent).toContain('cannot be undone');
    await click(r, '#olDelete'); expect(r.reqs.some(q => q.url.includes('delete_my_account'))).toBe(true); expect(r.c.session()).toBeNull(); expect(r.host.querySelector('#olAuth')).not.toBeNull();
    r.stop();
  });
});
