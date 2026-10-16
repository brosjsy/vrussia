// @vitest-environment jsdom
/* The game's client for its own server (src/api-client.ts) against the REAL server (server/src) and a real PostgreSQL (PGlite, with the
   migrations and the least-privileged role), joined by a stand-in for the browser's fetch that keeps the cookie like a browser does. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ApiCloud, apiFromEnv } from '../src/api-client';
import * as G from '../src/engine';
import '../src/content';
import { start, ORIGIN } from '../server/test/util';
import type { Ctx } from '../server/test/util';
import { mountOnline, openAuthLink, resetOnlineView } from '../src/cloud-ui';

let c: Ctx;
beforeAll(async () => { c = await start({ LOG_LEVEL: 'error' }); }, 60_000);
afterAll(async () => { await c?.app.close(); await c?.t.close(); });

/** A browser: one cookie jar, the game's Origin on every request, HttpOnly cookies invisible to the page. */
function browser(): { fetch: typeof fetch; jar: () => string } {
  let jar = '';
  const f = (async (url: string, init: RequestInit = {}) => {
    const u = new URL(url);
    const r = await c.app.inject({ method: (init.method ?? 'GET') as 'GET', url: u.pathname + u.search, payload: init.body as string | undefined, headers: { ...(init.headers as Record<string, string>), origin: ORIGIN, ...(jar ? { cookie: jar } : {}) } });
    const set = r.headers['set-cookie']; if (set) { const v = String(Array.isArray(set) ? set[0] : set).split(';')[0]; jar = v.endsWith('=') ? '' : v; }
    return { ok: r.statusCode < 400, status: r.statusCode, json: async () => r.json(), text: async () => r.body } as Response;
  }) as unknown as typeof fetch;
  return { fetch: f, jar: () => jar };
}
const store = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, raw: m }; };
const linkIn = (to: string, key: string): string => new RegExp(`#${key}=([A-Za-z0-9_-]{43})`).exec(c.mail.last(to)!.text)![1];

describe('the game\'s client with its own server', () => {
  it('only an https address (or a local development server) switches it on', () => {
    expect(apiFromEnv({ VITE_API_URL: 'https://api.example.org/' })).toBe('https://api.example.org');
    expect(apiFromEnv({ VITE_API_URL: 'http://localhost:8080' })).toBe('http://localhost:8080');
    expect(apiFromEnv({ VITE_API_URL: 'http://api.example.org' })).toBeNull(); expect(apiFromEnv({})).toBeNull();
  });
  it('sign up, confirm by the e-mail link, log in (the name chosen at sign-up is taken), save and load; no token is kept on the device', async () => {
    const b = browser(), kv = store(), api = new ApiCloud('https://api.example.org', { fetch: b.fetch, kv });
    expect((await api.signUp('masha@example.org', 'short', 'masha', true)).ok).toBe(false);
    const r = await api.signUp('masha@example.org', 'a long passphrase for masha', 'masha', true); expect(r.msg + JSON.stringify(r.ok)).toMatch(/true$/); expect(r.msg).toMatch(/e-mail/);
    expect((await api.signIn('masha@example.org', 'a long passphrase for masha')).msg).toMatch(/Confirm your e-mail/);
    expect((await api.verifyEmail(linkIn('masha@example.org', 'verify'))).ok).toBe(true);
    const li = await api.signIn('masha@example.org', 'a long passphrase for masha'); expect(li.msg).toBe('Welcome, @masha.');
    expect(api.session()).toMatchObject({ email: 'masha@example.org', username: 'masha', adult: true, access: '', refresh: '' });
    const token = b.jar().split('=')[1]; expect(token).toHaveLength(43);
    expect([...kv.raw.values()].join(' ')).not.toContain(token);                               // the session token is only in the HttpOnly cookie
    const s = G.newState('Masha', 'moscow'); s.money = 777;
    expect((await api.save(s)).ok).toBe(true);
    const ld = await api.load(); expect(ld.data?.state.money).toBe(777);
    expect((await api.send('place:Moscow:home', 'Привет!')).ok).toBe(true);
    expect(((await api.messages('place:Moscow:home')).data ?? [])[0].body).toBe('Привет!');
  });
  it('after a reload the server says who is logged in; when the session is gone the screen forgets it', async () => {
    const b = browser(), kv = store();
    const api = new ApiCloud('https://api.example.org', { fetch: b.fetch, kv });
    await api.signIn('masha@example.org', 'a long passphrase for masha');
    const again = new ApiCloud('https://api.example.org', { fetch: b.fetch, kv });
    expect((await again.restore())?.username).toBe('masha');
    await c.t.admin('delete from app.sessions');
    expect(await again.restore()).toBeNull(); expect(again.session()).toBeNull();
  });
  it('a forgotten password: the link, a new password, every device logged out; deleting the account needs the password', async () => {
    const b = browser(), api = new ApiCloud('https://api.example.org', { fetch: b.fetch, kv: store() });
    expect((await api.forgot('masha@example.org')).ok).toBe(true);
    expect((await api.resetPassword(linkIn('masha@example.org', 'reset'), 'masha has a new passphrase')).ok).toBe(true);
    expect((await api.signIn('masha@example.org', 'a long passphrase for masha')).ok).toBe(false);
    expect((await api.signIn('masha@example.org', 'masha has a new passphrase')).ok).toBe(true);
    expect((await api.deleteAccount('')).ok).toBe(false); expect((await api.deleteAccount('wrong password!!')).msg).toMatch(/not your current password/);
    expect((await api.deleteAccount('masha has a new passphrase')).ok).toBe(true); expect(api.session()).toBeNull();
    expect((await api.signIn('masha@example.org', 'masha has a new passphrase')).ok).toBe(false);
  });
  it('the Online screen: a reset link from an e-mail opens the new-password form, and saving it works', async () => {
    const b = browser(), api = new ApiCloud('https://api.example.org', { fetch: b.fetch, kv: store() });
    await api.signUp('lena@example.org', 'a long passphrase for lena', 'lena', false); await api.verifyEmail(linkIn('lena@example.org', 'verify'));
    await api.forgot('lena@example.org');
    resetOnlineView(); expect(openAuthLink('#reset=' + linkIn('lena@example.org', 'reset'))).toBe(true); expect(openAuthLink('#reset=short')).toBe(false);
    const host = document.body.appendChild(document.createElement('div')); const notes: string[] = [];
    const stop = mountOnline(host, { cloud: api, state: () => null, notify: m => notes.push(m), onLoad: () => undefined });
    const pass = host.querySelector<HTMLInputElement>('#olResetPass')!; expect(pass).toBeTruthy(); expect(pass.minLength).toBe(10);
    pass.value = 'lena has a fresh passphrase'; host.querySelector<HTMLFormElement>('#olReset')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise(r => setTimeout(r, 300));
    expect(notes.join(' ')).toMatch(/password is changed/); expect(host.querySelector('#olReset')).toBeNull(); expect(host.querySelector('#olForgotBtn')).toBeTruthy();
    stop();
    expect((await api.signIn('lena@example.org', 'lena has a fresh passphrase')).ok).toBe(true);
  });
});

describe('a hostile player (round 124, learning round 10)', () => {
  it('markup typed into an advert or a chat line reaches other players as plain text, never as page code', async () => {
    const make = async (name: string): Promise<ApiCloud> => {
      const b = browser(), api = new ApiCloud('https://api.example.org', { fetch: b.fetch, kv: store() });
      await api.signUp(`${name}@example.org`, `a long passphrase for ${name}`, name, true); await api.verifyEmail(linkIn(`${name}@example.org`, 'verify'));
      await api.signIn(`${name}@example.org`, `a long passphrase for ${name}`); return api;
    };
    const evil = await make('mallory'), victim = await make('victim');
    const payload = '<img src=x onerror="window.__pwned=1">';
    expect((await evil.postAd('Moscow', 'sell', payload, '<script>window.__pwned=2</script>', 10)).ok).toBe(true);
    expect((await evil.send('place:Moscow:home', payload)).ok).toBe(true);
    const s = G.newState('Victim', 'moscow'); s.queue = [];
    resetOnlineView();
    const host = document.body.appendChild(document.createElement('div'));
    const stop = mountOnline(host, { cloud: victim, state: () => s, notify: () => undefined, onLoad: () => undefined });
    for (const tab of ['ads', 'chat']) {
      host.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`)!.click(); await new Promise(r => setTimeout(r, 400));
      expect(host.querySelector('img[src="x"]'), tab).toBeNull(); expect(host.querySelector('.olBody script'), tab).toBeNull();
      expect(host.textContent, tab).toContain('<img src=x');                // shown as the text the player typed
    }
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
    stop();
  });
});

describe('challenges with other players, from the Online screen (round 124)', () => {
  it('the country chosen at sign-up reaches the profile; a hello in the chat completes a challenge; its reward goes into the game', async () => {
    const b = browser(), api = new ApiCloud('https://api.example.org', { fetch: b.fetch, kv: store() });
    expect((await api.signUp('zara@example.org', 'a long passphrase for zara', 'zara', true, { country: 'KZ', region: 'CIS' })).ok).toBe(true);
    await api.verifyEmail(linkIn('zara@example.org', 'verify')); await api.signIn('zara@example.org', 'a long passphrase for zara');
    expect((await c.t.admin("select country, region from app.profiles where username = 'zara'")).rows[0]).toEqual({ country: 'KZ', region: 'CIS' });
    await api.send('place:Moscow:home', 'Сәлем! Hello!');
    const s = G.newState('Zara', 'moscow'); s.queue = []; const m0 = s.money;
    resetOnlineView();
    const host = document.body.appendChild(document.createElement('div')); const notes: string[] = [];
    const stop = mountOnline(host, { cloud: api, state: () => s, notify: m => notes.push(m), onLoad: () => undefined });
    host.querySelector<HTMLButtonElement>('[data-tab="challenges"]')!.click(); await new Promise(r => setTimeout(r, 500));
    expect(host.querySelectorAll('.chlChapter')).toHaveLength(8);
    expect(host.querySelector('.chlHead[aria-expanded="true"]')!.textContent).toContain('Hello, neighbours');
    const take = host.querySelector<HTMLButtonElement>('[data-claim="first_hello"]')!; expect(take.textContent).toContain('300');
    take.click(); await new Promise(r => setTimeout(r, 500));
    expect(s.money).toBe(m0 + 300); expect(notes.join(' ')).toMatch(/Reward taken: \+300/);
    expect(host.querySelector('[data-claim="first_hello"]')).toBeNull();
    host.querySelector<HTMLButtonElement>('[data-join="welcome_evening"]')!.click(); await new Promise(r => setTimeout(r, 500));
    expect(notes.join(' ')).toMatch(/You joined/);
    expect(host.textContent).toContain('Needs a mutual friend first');                       // co-op challenges need a friend
    stop();
  });
});
