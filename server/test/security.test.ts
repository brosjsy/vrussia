import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { call, start, testConfig, ORIGIN } from './util.js';
import type { Ctx } from './util.js';
import { loadConfig } from '../src/config.js';
import { Templates, TEMPLATES, brandFrom } from '../src/email.js';
import { Throttle } from '../src/app.js';
import { passwordProblem, needsRehash, hashPassword } from '../src/secrets.js';

describe('forged requests and other sites', () => {
  let c: Ctx;
  beforeAll(async () => { c = await start(); }, 60_000);
  afterAll(async () => { await c?.app.close(); await c?.t.close(); });
  it('a change without an Origin, or from another site, is refused before anything happens', async () => {
    const none = await c.app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'x@example.org', password: 'a long passphrase' } });
    expect(none.statusCode).toBe(403);
    const evil = await c.app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'x@example.org', password: 'a long passphrase' }, headers: { origin: 'https://evil.example' } });
    expect(evil.statusCode).toBe(403);
    expect((await c.t.admin("select count(*)::int as n from app.users where email = 'x@example.org'")).rows[0].n).toBe(0);
  });
  it('a form post (not JSON) is refused', async () => {
    const r = await c.app.inject({ method: 'POST', url: '/api/auth/login', payload: 'email=a%40b.c&password=x', headers: { origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' } });
    expect(r.statusCode).toBe(415);
  });
  it('the game\'s address may call with the cookie; other sites get no permission to read answers', async () => {
    const ok = await c.app.inject({ method: 'OPTIONS', url: '/api/auth/login', headers: { origin: ORIGIN, 'access-control-request-method': 'POST' } });
    expect(ok.statusCode).toBe(204); expect(ok.headers['access-control-allow-origin']).toBe(ORIGIN); expect(ok.headers['access-control-allow-credentials']).toBe('true');
    const bad = await c.app.inject({ method: 'GET', url: '/api/scores', headers: { origin: 'https://evil.example' } });
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('security headers on every answer; no caching of account answers; no server name', async () => {
    const r = await c.app.inject({ method: 'GET', url: '/api/health' });
    expect(r.statusCode).toBe(200);
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(String(r.headers['content-security-policy'])).toContain("default-src 'none'");
    expect(String(r.headers['content-security-policy'])).toContain("frame-ancestors 'none'");
    expect(r.headers['x-powered-by']).toBeUndefined();
    expect((await call(c, 'GET', '/api/auth/me')).headers['cache-control']).toBe('no-store');
  });
  it('database errors never leak to the player; injection attempts are only data', async () => {
    const r = await call(c, 'GET', "/api/ads?city=Moscow' or '1'='1");
    expect(r.status).toBe(200); expect(r.json).toEqual([]);
    const e = await call(c, 'GET', '/api/scores?limit=1;drop table app.users');
    expect(e.status).toBe(200);
    expect((await c.t.admin('select count(*)::int as n from app.users')).rows[0].n).toBeGreaterThanOrEqual(0);
  });
  it('the private parts need a session', async () => {
    for (const [m, u] of [['GET', '/api/save'], ['GET', '/api/friends'], ['GET', '/api/talks'], ['GET', '/api/messages?room=place:Moscow:home'], ['GET', '/api/auth/sessions']] as const) expect((await call(c, m, u)).status, u).toBe(401);
    for (const [m, u, b] of [['PUT', '/api/save', { data: {} }], ['POST', '/api/messages', { room: 'place:Moscow:home', body: 'hi' }], ['POST', '/api/scores', { origin: 'ng', city: 'Moscow', ending: 'time', score: 1, days: 1 }]] as const) expect((await call(c, m, u, b)).status, u).toBe(401);
  });
});

describe('rate limits at their real settings', () => {
  let c: Ctx;
  beforeAll(async () => { c = await start({ RATE_PER_MIN: '300', RATE_AUTH_PER_MIN: '10', LOGIN_PER_EMAIL: '10' }); }, 60_000);
  afterAll(async () => { await c?.app.close(); await c?.t.close(); });
  it('the 11th log-in from one address in a minute is refused', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) codes.push((await call(c, 'POST', '/api/auth/login', { email: `p${i}@example.org`, password: 'whatever long' })).status);
    expect(codes.slice(0, 10).every(s => s === 401)).toBe(true); expect(codes[10]).toBe(429);
  });
  it('one e-mail address gets at most 10 tries in 15 minutes, from any number of addresses', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) codes.push((await c.app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'target@example.org', password: 'guess number ' + i }, headers: { origin: ORIGIN }, remoteAddress: `10.1.0.${i}` })).statusCode);
    expect(codes[10]).toBe(429);
  });
  it('the counter forgets old attempts', () => {
    const t = new Throttle(2, 1000);
    expect(t.hit('a', 0)).toBe(true); expect(t.hit('a', 10)).toBe(true); expect(t.hit('a', 20)).toBe(false); expect(t.hit('a', 1015)).toBe(true);
  });
});

describe('settings', () => {
  const base = { PUBLIC_URL: 'https://api.example.org', APP_URL: 'https://game.example.org', CORS_ORIGINS: 'https://game.example.org', DATABASE_URL: 'postgres://u@h/db', EMAIL_FROM: 'x <x@example.org>' };
  it('production refuses insecure settings, all problems at once', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'false', EMAIL_TRANSPORT: 'console', APP_URL: 'http://game.example.org', CORS_ORIGINS: '*' }))
      .toThrow(/COOKIE_SECURE[\s\S]*EMAIL_TRANSPORT[\s\S]*https[\s\S]*CORS_ORIGINS/);
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', EMAIL_TRANSPORT: 'smtp' })).toThrow(/SMTP_HOST/);
    expect(loadConfig({ ...base, NODE_ENV: 'production', EMAIL_TRANSPORT: 'smtp', SMTP_HOST: 'smtp.example.org', SMTP_PORT: '465' }).DATABASE_SSL).toBe('require');
    expect(() => loadConfig({ ...base, DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
  });
});

describe('passwords', () => {
  it('long passphrases welcome; short, common, or the e-mail itself are not', async () => {
    expect(passwordProblem('a long simple phrase', 'a@b.cc')).toBeNull();
    expect(passwordProblem('aaaaaaaaaaaa', 'a@b.cc')).toBe('password too common');
    expect(passwordProblem('johnsmith1', 'johnsmith1@b.cc')).toBe('password like email');
    expect(needsRehash(await hashPassword('a long simple phrase'))).toBe(false);
    expect(needsRehash('$argon2id$v=19$m=4096,t=3,p=1$abc$def')).toBe(true);
  });
});

describe('e-mail templates', () => {
  const cfg = testConfig({ BRAND_NAME: 'LagosLifeApp', BRAND_COLOR: '#0a7d3b', BRAND_SUPPORT_EMAIL: 'help@example.org' });
  it('every template renders with the brand, an HTML and a text version, and the link in both', () => {
    const t = new Templates(brandFrom(cfg));
    for (const name of TEMPLATES) {
      const m = t.render(name, 'a@b.cc', { link: 'https://game.example.org/#verify=abc', hours: '24', minutes: '30', when: '2026-10-16 10:00' });
      expect(m.subject, name).toContain('LagosLifeApp'); expect(m.html).toContain('#0a7d3b'); expect(m.html).toContain('help@example.org'); expect(m.text).toContain('LagosLifeApp');
      if (['verify', 'reset', 'signup-exists'].includes(name)) { expect(m.html).toContain('https://game.example.org/#verify=abc'); expect(m.text).toContain('https://game.example.org/#verify=abc'); }
      expect(m.html).not.toMatch(/\{\{/); expect(m.text).not.toMatch(/\{\{/);
    }
  });
  it('values are HTML-escaped (a name with markup cannot inject anything); a missing value is an error, not a gap', () => {
    const t = new Templates({ ...brandFrom(cfg), name: '<script>x</script>' });
    const m = t.render('verify', 'a@b.cc', { link: 'https://x.example/"><img src=x>', hours: '24' });
    expect(m.html).not.toContain('<script>x</script>'); expect(m.html).toContain('&lt;script&gt;'); expect(m.html).not.toContain('"><img');
    expect(() => new Templates(brandFrom(cfg)).render('verify', 'a@b.cc', { hours: '24' })).toThrow(/\{\{link\}\}/);
  });
  it('a folder of own templates replaces the built-in files with the same names', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tpl-'));
    writeFileSync(join(dir, 'verify.subject'), 'Welcome aboard {{brand_name}}!');
    const m = new Templates(brandFrom(cfg), dir).render('verify', 'a@b.cc', { link: 'https://x.example', hours: '24' });
    expect(m.subject).toBe('Welcome aboard LagosLifeApp!'); expect(m.html).toContain('Confirm my e-mail');
  });
});
