import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { call, cookieOf, start, tokenIn, ORIGIN } from './util.js';
import type { Ctx } from './util.js';
import { tokenHash } from '../src/secrets.js';

let c: Ctx;
beforeAll(async () => { c = await start(); }, 60_000);
afterAll(async () => { await c?.app.close(); await c?.t.close(); });

const PW = 'correct horse battery staple';

describe('signing up and confirming the e-mail', () => {
  it('sign-up answers the same for a new and a known address; the known one gets a warning e-mail instead of a second account', async () => {
    const a = await call(c, 'POST', '/api/auth/register', { email: '  Anna@Example.org ', password: PW });
    expect(a.status).toBe(200);
    const mail = c.mail.last('anna@example.org')!; expect(mail.subject).toContain('V Russia');
    expect(mail.html).toContain('#verify='); expect(mail.text).toContain('#verify=');
    expect(mail.text).toContain('https://game.example.org/play/#verify=');                // the token is after '#': never sent to a server or in a Referer
    const b = await call(c, 'POST', '/api/auth/register', { email: 'anna@example.org', password: 'another long password' });
    expect(b.status).toBe(200); expect(b.json).toEqual(a.json);
    expect(c.mail.last('anna@example.org')!.subject).toMatch(/tried to sign up/);
    expect((await c.t.admin("select count(*)::int as n from app.users where email = 'anna@example.org'")).rows[0].n).toBe(1);
  });
  it('weak passwords and bad addresses are refused with a reason', async () => {
    expect((await call(c, 'POST', '/api/auth/register', { email: 'b@example.org', password: 'short' })).json.error).toBe('password too short');
    expect((await call(c, 'POST', '/api/auth/register', { email: 'b@example.org', password: 'password123' })).json.error).toBe('password too common');
    expect((await call(c, 'POST', '/api/auth/register', { email: 'b@example.org', password: 'b@example.org' })).json.error).toBe('password like email');
    expect((await call(c, 'POST', '/api/auth/register', { email: 'not an address', password: PW })).json.error).toBe('bad email');
    expect((await call(c, 'POST', '/api/auth/register', { email: 'b@example.org', password: 'x'.repeat(300) })).json.error).toBe('password too long');
  });
  it('nothing secret is stored as it is: the password as an Argon2id hash, the e-mail token only as its SHA-256', async () => {
    const u = await c.t.admin("select password_hash from app.users where email = 'anna@example.org'");
    expect(String(u.rows[0].password_hash)).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    const token = tokenIn(c.mail.sent.filter(m => m.to === 'anna@example.org')[0].text, 'verify');
    const dump = JSON.stringify((await c.t.admin('select * from app.email_tokens')).rows);
    expect(dump).not.toContain(token);
    expect((await c.t.admin('select count(*)::int as n from app.email_tokens where token_hash = $1', [tokenHash(token)])).rows[0].n).toBe(1);
  });
  it('logging in before confirming is refused (only after the right password, so it tells a stranger nothing)', async () => {
    expect((await call(c, 'POST', '/api/auth/login', { email: 'anna@example.org', password: PW })).json.error).toBe('email not confirmed');
    expect((await call(c, 'POST', '/api/auth/login', { email: 'anna@example.org', password: 'wrong password!!' })).json.error).toBe('invalid login credentials');
  });
  it('the link works once; a used, an expired or a made-up link does nothing', async () => {
    const token = tokenIn(c.mail.sent.filter(m => m.to === 'anna@example.org')[0].text, 'verify');
    expect((await call(c, 'POST', '/api/auth/verify', { token })).status).toBe(200);
    expect((await call(c, 'POST', '/api/auth/verify', { token })).json.error).toBe('bad link');
    expect((await call(c, 'POST', '/api/auth/verify', { token: 'A'.repeat(43) })).json.error).toBe('bad link');
    expect((await call(c, 'POST', '/api/auth/verify', { token: "x' or 1=1 --" })).json.error).toBe('bad link');
    await call(c, 'POST', '/api/auth/register', { email: 'late@example.org', password: PW });
    const late = tokenIn(c.mail.last('late@example.org')!.text, 'verify');
    await c.t.admin("update app.email_tokens set expires_at = now() - interval '1 second' where token_hash = $1", [tokenHash(late)]);
    expect((await call(c, 'POST', '/api/auth/verify', { token: late })).json.error).toBe('bad link');
  });
  it('asking for the link again cancels the old one; answers the same for unknown addresses', async () => {
    await call(c, 'POST', '/api/auth/register', { email: 'again@example.org', password: PW });
    const first = tokenIn(c.mail.last('again@example.org')!.text, 'verify');
    const r1 = await call(c, 'POST', '/api/auth/resend', { email: 'again@example.org' });
    const second = tokenIn(c.mail.last('again@example.org')!.text, 'verify'); expect(second).not.toBe(first);
    const r2 = await call(c, 'POST', '/api/auth/resend', { email: 'nobody@example.org' }); expect(r2.json).toEqual(r1.json);
    expect(c.mail.last('nobody@example.org')).toBeUndefined();
    expect((await call(c, 'POST', '/api/auth/verify', { token: first })).json.error).toBe('bad link');
    expect((await call(c, 'POST', '/api/auth/verify', { token: second })).status).toBe(200);
  });
});

describe('logging in and sessions', () => {
  let cookie = '';
  it('a wrong password and an unknown address give the same answer', async () => {
    const a = await call(c, 'POST', '/api/auth/login', { email: 'anna@example.org', password: 'not the password' });
    const b = await call(c, 'POST', '/api/auth/login', { email: 'ghost@example.org', password: 'not the password' });
    expect(a.status).toBe(401); expect(b.status).toBe(401); expect(a.json).toEqual(b.json);
  });
  it('logging in sets an HttpOnly, Secure, SameSite=Lax, host-only cookie; the session is kept only as a hash', async () => {
    const r = await call(c, 'POST', '/api/auth/login', { email: 'anna@example.org', password: PW });
    expect(r.status).toBe(200); expect(r.json).toMatchObject({ email: 'anna@example.org', verified: true, username: null });
    const set = String(r.headers['set-cookie']);
    expect(set).toMatch(/^__Host-vr_session=[A-Za-z0-9_-]{43};/); expect(set).toMatch(/HttpOnly/); expect(set).toMatch(/Secure/); expect(set).toMatch(/SameSite=Lax/); expect(set).toMatch(/Path=\//); expect(set).not.toMatch(/Domain=/);
    cookie = cookieOf(r.headers['set-cookie']);
    expect(JSON.stringify((await c.t.admin('select * from app.sessions')).rows)).not.toContain(cookie.split('=')[1]);
    expect((await call(c, 'GET', '/api/auth/me', undefined, cookie)).json.email).toBe('anna@example.org');
    expect(r.headers['cache-control']).toBe('no-store');
  });
  it('a session is never taken from a header or a made-up cookie', async () => {
    expect((await call(c, 'GET', '/api/auth/me', undefined, undefined, { authorization: 'Bearer ' + cookie.split('=')[1] })).status).toBe(401);
    expect((await call(c, 'GET', '/api/auth/me', undefined, '__Host-vr_session=' + 'B'.repeat(43))).status).toBe(401);
    expect((await call(c, 'GET', '/api/auth/me', undefined, 'vr_session=' + cookie.split('=')[1])).status).toBe(401);   // only the __Host- name counts
  });
  it('logging in again with an old cookie ends that old session (no session fixation)', async () => {
    const r = await call(c, 'POST', '/api/auth/login', { email: 'anna@example.org', password: PW }, cookie);
    const fresh = cookieOf(r.headers['set-cookie']); expect(fresh).not.toBe(cookie);
    expect((await call(c, 'GET', '/api/auth/me', undefined, cookie)).status).toBe(401);
    cookie = fresh;
  });
  it('a session ends when idle too long, at its absolute end, and at log-out', async () => {
    const other = cookieOf((await call(c, 'POST', '/api/auth/login', { email: 'anna@example.org', password: PW })).headers['set-cookie']);
    await c.t.admin("update app.sessions set idle_expires_at = now() - interval '1 second' where token_hash = $1", [tokenHash(other.split('=')[1])]);
    expect((await call(c, 'GET', '/api/auth/me', undefined, other)).status).toBe(401);
    const third = cookieOf((await call(c, 'POST', '/api/auth/login', { email: 'anna@example.org', password: PW })).headers['set-cookie']);
    await c.t.admin("update app.sessions set expires_at = now() - interval '1 second' where token_hash = $1", [tokenHash(third.split('=')[1])]);
    expect((await call(c, 'GET', '/api/auth/me', undefined, third)).status).toBe(401);
    const fourth = cookieOf((await call(c, 'POST', '/api/auth/login', { email: 'anna@example.org', password: PW })).headers['set-cookie']);
    const out = await call(c, 'POST', '/api/auth/logout', {}, fourth); expect(String(out.headers['set-cookie'])).toMatch(/__Host-vr_session=;/);
    expect((await call(c, 'GET', '/api/auth/me', undefined, fourth)).status).toBe(401);
    expect((await call(c, 'GET', '/api/auth/me', undefined, cookie)).status).toBe(200);
  });
  it('the list of one\'s sessions; ending one of them; nobody can end somebody else\'s', async () => {
    const second = cookieOf((await call(c, 'POST', '/api/auth/login', { email: 'anna@example.org', password: PW })).headers['set-cookie']);
    const list = (await call(c, 'GET', '/api/auth/sessions', undefined, cookie)).json as unknown as { id: string; current: boolean }[];
    expect(list.filter(s => s.current)).toHaveLength(1); const otherId = list.find(s => !s.current)!.id;
    await call(c, 'POST', '/api/auth/register', { email: 'bob@example.org', password: PW }); await call(c, 'POST', '/api/auth/verify', { token: tokenIn(c.mail.last('bob@example.org')!.text, 'verify') });
    const bob = cookieOf((await call(c, 'POST', '/api/auth/login', { email: 'bob@example.org', password: PW })).headers['set-cookie']);
    expect((await call(c, 'DELETE', `/api/auth/sessions/${otherId}`, undefined, bob)).json.ok).toBe(false);
    expect((await call(c, 'GET', '/api/auth/me', undefined, second)).status).toBe(200);
    expect((await call(c, 'DELETE', `/api/auth/sessions/${otherId}`, undefined, cookie)).json.ok).toBe(true);
    expect((await call(c, 'GET', '/api/auth/me', undefined, second)).status).toBe(401);
  });
});

describe('a forgotten password', () => {
  it('unknown addresses get the same answer and no e-mail; a known one gets a link that works once, ends every session and changes the password', async () => {
    const before = c.mail.sent.length;
    const a = await call(c, 'POST', '/api/auth/forgot', { email: 'ghost@example.org' }); expect(c.mail.sent.length).toBe(before);
    const b = await call(c, 'POST', '/api/auth/forgot', { email: 'anna@example.org' }); expect(b.json).toEqual(a.json);
    const mail = c.mail.last('anna@example.org')!; expect(mail.subject).toMatch(/Reset/); const token = tokenIn(mail.text, 'reset');
    const live = cookieOf((await call(c, 'POST', '/api/auth/login', { email: 'anna@example.org', password: PW })).headers['set-cookie']);
    expect((await call(c, 'POST', '/api/auth/reset', { token, password: 'short' })).json.error).toBe('password too short');        // a weak password does not use up the link
    expect((await call(c, 'POST', '/api/auth/reset', { token, password: 'a brand new passphrase' })).status).toBe(200);
    expect((await call(c, 'POST', '/api/auth/reset', { token, password: 'yet another passphrase' })).json.error).toBe('bad link');
    expect((await call(c, 'GET', '/api/auth/me', undefined, live)).status).toBe(401);
    expect(c.mail.last('anna@example.org')!.subject).toMatch(/password was changed/);
    expect((await call(c, 'POST', '/api/auth/login', { email: 'anna@example.org', password: PW })).status).toBe(401);
    expect((await call(c, 'POST', '/api/auth/login', { email: 'anna@example.org', password: 'a brand new passphrase' })).status).toBe(200);
  });
  it('a newer link cancels the older one; an expired one does nothing', async () => {
    await call(c, 'POST', '/api/auth/forgot', { email: 'bob@example.org' }); const old = tokenIn(c.mail.last('bob@example.org')!.text, 'reset');
    await call(c, 'POST', '/api/auth/forgot', { email: 'bob@example.org' }); const nu = tokenIn(c.mail.last('bob@example.org')!.text, 'reset');
    expect((await call(c, 'POST', '/api/auth/reset', { token: old, password: 'bob has a new passphrase' })).json.error).toBe('bad link');
    await c.t.admin("update app.email_tokens set expires_at = now() - interval '1 second' where token_hash = $1", [tokenHash(nu)]);
    expect((await call(c, 'POST', '/api/auth/reset', { token: nu, password: 'bob has a new passphrase' })).json.error).toBe('bad link');
  });
  it('nobody can flood an inbox: at most five reset e-mails an hour to one person', async () => {
    const before = c.mail.sent.filter(m => m.to === 'again@example.org').length;
    for (let i = 0; i < 8; i++) await c.app.inject({ method: 'POST', url: '/api/auth/forgot', payload: { email: 'again@example.org' }, headers: { origin: ORIGIN }, remoteAddress: `10.0.0.${i}` });
    expect(c.mail.sent.filter(m => m.to === 'again@example.org').length - before).toBe(5);
  });
});

describe('changing the password and deleting the account', () => {
  it('needs the current password; other devices are logged out, this one stays', async () => {
    const PW2 = 'a brand new passphrase';
    const here = cookieOf((await call(c, 'POST', '/api/auth/login', { email: 'anna@example.org', password: PW2 })).headers['set-cookie']);
    const there = cookieOf((await call(c, 'POST', '/api/auth/login', { email: 'anna@example.org', password: PW2 })).headers['set-cookie']);
    expect((await call(c, 'POST', '/api/auth/password', { current: 'wrong one!!', next: 'third passphrase here' }, here)).json.error).toBe('wrong password');
    expect((await call(c, 'POST', '/api/auth/password', { current: PW2, next: 'third passphrase here' }, here)).status).toBe(200);
    expect((await call(c, 'GET', '/api/auth/me', undefined, here)).status).toBe(200);
    expect((await call(c, 'GET', '/api/auth/me', undefined, there)).status).toBe(401);
  });
  it('deleting needs the password, removes everything on the server, ends the session and says so by e-mail', async () => {
    const here = cookieOf((await call(c, 'POST', '/api/auth/login', { email: 'anna@example.org', password: 'third passphrase here' })).headers['set-cookie']);
    await call(c, 'POST', '/api/profile', { username: 'anna', adult: true }, here);
    await call(c, 'PUT', '/api/save', { data: { version: 3, day: 12, money: 5 } }, here);
    expect((await call(c, 'POST', '/api/auth/delete', { password: 'nope nope nope' }, here)).json.error).toBe('wrong password');
    const r = await call(c, 'POST', '/api/auth/delete', { password: 'third passphrase here' }, here);
    expect(r.status).toBe(200); expect(String(r.headers['set-cookie'])).toMatch(/__Host-vr_session=;/);
    for (const tb of ['users', 'profiles', 'saves', 'sessions']) expect((await c.t.admin(`select count(*)::int as n from app.${tb} t where ${tb === 'users' ? "t.email = 'anna@example.org'" : tb === 'sessions' ? 'not exists (select 1 from app.users u where u.id = t.user_id)' : "t::text like '%anna%'"}`)).rows[0].n, tb).toBe(0);
    expect(c.mail.last('anna@example.org')!.subject).toMatch(/deleted/);
    expect((await call(c, 'GET', '/api/auth/me', undefined, here)).status).toBe(401);
  });
});
