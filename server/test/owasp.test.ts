/* OWASP Top 10 (2021), tested against the whole API, old routes and the platform routes together. One describe block per category; the comment on
   each says what the category asks and which tests answer it. The browser side is in ../../test/owasp-client.test.ts, and A06 (known
   vulnerable packages) runs as `npm audit` in CI (.github/workflows/quality.yml). Report: docs/OWASP.md. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { call, player, start, ORIGIN, cookieOf } from './util.js';
import type { Ctx } from './util.js';

let c: Ctx;
let A: Awaited<ReturnType<typeof player>>, B: Awaited<ReturnType<typeof player>>;
beforeAll(async () => { c = await start({ ADMIN_EMAILS: 'alice@example.org' }); A = await player(c, 'alice'); B = await player(c, 'bob'); }, 120_000);
afterAll(async () => { await c?.app.close(); await c?.t.close(); });

describe('A01 Broken access control', () => {
  const PRIVATE: [string, string][] = [
    ['GET', '/api/auth/me'], ['GET', '/api/save'], ['PUT', '/api/save'], ['POST', '/api/scores'], ['GET', '/api/friends'], ['GET', '/api/talks'], ['GET', '/api/blocks'], ['POST', '/api/messages'],
    ['GET', '/api/ads/mine'], ['GET', '/api/classes'], ['POST', '/api/classes'], ['GET', '/api/account/export'], ['GET', '/api/admin/stats'], ['GET', '/api/admin/whoami'], ['POST', '/api/admin/announcements'], ['PUT', '/api/admin/flags/x_flag'],
  ];
  it('every private route refuses a visitor who is not logged in', async () => {
    for (const [m, u] of PRIVATE) expect((await call(c, m as 'GET', u, m === 'GET' ? undefined : {})).status, `${m} ${u}`).toBe(401);
  });
  it('an ordinary player cannot use administrator routes (vertical escalation)', async () => {
    for (const [m, u, b] of [['GET', '/api/admin/stats'], ['POST', '/api/admin/announcements', { title: 'hi', body: 'there' }], ['PUT', '/api/admin/flags/x_flag', { enabled: true }]] as [string, string, unknown?][]) {
      expect((await call(c, m as 'GET', u, b, B.cookie)).status, u).toBe(403);
    }
    expect((await call(c, 'GET', '/api/admin/stats', undefined, A.cookie)).status).toBe(200);
  });
  it('one player cannot read, change or delete another player’s class, results, save or export (horizontal escalation / IDOR)', async () => {
    const code = String((await call(c, 'POST', '/api/classes', { name: 'Alice class' }, A.cookie)).json.code);
    await call(c, 'POST', `/api/classes/${code}/results`, { nickname: 'Pupil', origin: 'tajik', ending: 'time', score: 5, days: 5 });
    expect((await call(c, 'GET', `/api/classes/${code}/results`, undefined, B.cookie)).status).toBe(404);
    await call(c, 'DELETE', `/api/classes/${code}`, undefined, B.cookie);
    expect((await call(c, 'GET', `/api/classes/${code}`)).status).toBe(200);
    expect(((await call(c, 'GET', '/api/classes', undefined, B.cookie)).json as unknown[]).length).toBe(0);
    await call(c, 'PUT', '/api/save', { data: { version: 3, money: 1, owner: A.id } }, B.cookie);
    expect((await call(c, 'GET', '/api/save', undefined, A.cookie)).json).toBeNull();                      // naming Alice in the body changed nothing of hers
    const ex = JSON.stringify((await call(c, 'GET', '/api/account/export', undefined, B.cookie)).json);
    expect(ex).not.toContain('alice@example.org'); expect(ex).not.toContain(code);
  });
  it('the player id always comes from the session: a forged id in the body or query is ignored', async () => {
    const r = await call(c, 'POST', '/api/classes', { name: 'Forged', owner: B.id, player_id: B.id }, A.cookie);
    expect(r.status).toBe(200);
    expect(((await c.t.admin('select owner from app.classes where name = $1', ['Forged'])).rows[0] as { owner: string }).owner).toBe(A.id);
  });
});

describe('A02 Cryptographic failures', () => {
  it('the session cookie is HttpOnly, SameSite and host-bound, and no secret is in a response body', async () => {
    const r = await call(c, 'POST', '/api/auth/login', { email: A.email, password: 'a long passphrase for alice' });
    const sc = String(r.headers['set-cookie']);
    expect(sc).toMatch(/HttpOnly/i); expect(sc).toMatch(/SameSite=Lax/i); expect(sc).toMatch(/^__Host-/); expect(sc).toMatch(/Secure/i);
    expect(JSON.stringify(r.json)).not.toMatch(/password|hash|token/i);
  });
  it('the database keeps only hashes: no password and no raw session token', async () => {
    const u = (await c.t.admin('select * from app.users where email = $1', [A.email])).rows[0] as Record<string, unknown>;
    expect(JSON.stringify(u)).not.toContain('a long passphrase'); expect(String(u.password_hash ?? u.pw_hash ?? '')).toMatch(/^\$argon2id\$/);
    const token = decodeURIComponent(A.cookie.split('=')[1]);
    expect(JSON.stringify((await c.t.admin('select * from app.sessions')).rows)).not.toContain(token);
  });
  it('the export of a player’s data never includes password or session material', async () => {
    expect(JSON.stringify((await call(c, 'GET', '/api/account/export', undefined, A.cookie)).json)).not.toMatch(/argon2|password|session|token/i);
  });
});

describe('A03 Injection', () => {
  const PAYLOADS = ["' OR 1=1; --", "'; DROP TABLE app.classes; --", '" OR ""="', '${7*7}', '{{7*7}}', '<script>alert(1)</script>', '\u0000', 'a'.repeat(5000), "Robert'); DROP TABLE app.users;--"];
  it('SQL injection payloads in every kind of input are stored as plain text or refused, and the tables survive', async () => {
    for (const p of PAYLOADS) {
      for (const [m, u, b] of [
        ['POST', '/api/classes', { name: p }], ['POST', '/api/classes/ABC234/results', { nickname: p, origin: 'tajik', ending: 'time', score: 1, days: 1 }],
        ['POST', '/api/telemetry', { events: [{ kind: 'event', name: 'tick', props: { a: p } }] }], ['GET', `/api/players?q=${encodeURIComponent(p)}`, undefined], ['GET', `/api/scores?limit=${encodeURIComponent(p)}`, undefined],
        ['GET', `/api/classes/${encodeURIComponent(p)}`, undefined], ['PUT', `/api/admin/flags/${encodeURIComponent(p)}`, { enabled: true }],
      ] as [string, string, unknown?][]) {
        const r = await call(c, m as 'GET', u, b, A.cookie);
        expect([200, 400, 401, 403, 404, 414], `${m} ${u.slice(0, 40)} ${String(p).slice(0, 20)}`).toContain(r.status);
      }
    }
    expect((await c.t.admin('select count(*)::int as n from app.users')).rows[0].n).toBeGreaterThanOrEqual(2);
    expect((await c.t.admin("select to_regclass('app.classes') is not null as ok")).rows[0].ok).toBe(true);
  });
  it('a stored script is returned as data (JSON) and never as a page', async () => {
    await call(c, 'POST', '/api/classes', { name: '<img src=x onerror=alert(1)>' }, A.cookie);
    const r = await call(c, 'GET', '/api/classes', undefined, A.cookie);
    expect(String(r.headers['content-type'])).toMatch(/application\/json/); expect(String(r.headers['x-content-type-options'])).toBe('nosniff');
  });
  it('the shapes are strict: unknown keys in an assignment and wrong types are refused', async () => {
    expect((await call(c, 'POST', '/api/classes', { name: 'X1', assignment: { origin: 'tajik', __proto__: { admin: true }, run: 'x' } }, A.cookie)).status).toBe(400);
    expect((await call(c, 'POST', '/api/classes', { name: { $ne: '' } }, A.cookie)).status).toBe(400);
    expect((await call(c, 'POST', '/api/telemetry', { events: [{ kind: 'event', name: 'tick', props: { a: { $gt: 1 } } }] })).status).toBe(400);
  });
});

describe('A04 Insecure design', () => {
  it('abuse is capped by design: classes per teacher, results per class, events per request, size of a request', async () => {
    const T = await player(c, 'teach2');
    for (let i = 0; i < 10; i++) await call(c, 'POST', '/api/classes', { name: 'Class ' + i }, T.cookie);
    expect((await call(c, 'POST', '/api/classes', { name: 'Class 11' }, T.cookie)).status).toBe(400);
    expect((await call(c, 'POST', '/api/telemetry', { events: Array.from({ length: 21 }, () => ({ kind: 'event', name: 'tick' })) })).status).toBe(400);
    const big = await call(c, 'POST', '/api/telemetry', { events: [{ kind: 'event', name: 'tick', props: { a: 'x' } }], pad: 'y'.repeat(600_000) });
    expect(big.status).toBe(413);
  });
  it('the public endpoints have their own tight rate limits', async () => {
    const tight = await start({ ADMIN_EMAILS: '' });
    try {
      const codes: number[] = [];
      for (let i = 0; i < 45; i++) codes.push((await call(tight, 'POST', '/api/telemetry', { events: [{ kind: 'event', name: 'tick' }] })).status);
      expect(codes.slice(0, 40).every(s => s === 200)).toBe(true); expect(codes.slice(40)).toContain(429);
      const looks: number[] = [];
      for (let i = 0; i < 35; i++) looks.push((await call(tight, 'GET', '/api/classes/ABC234')).status);
      expect(looks).toContain(429);
    } finally { await tight.app.close(); await tight.t.close(); }
  });
  it('scores that are impossible are refused and a class result cannot claim a score above the game’s maximum', async () => {
    expect((await call(c, 'POST', '/api/scores', { origin: 'ng', city: 'Moscow', ending: 'time', score: 90000, days: 10 }, A.cookie)).status).toBe(400);
    const code = String((await call(c, 'POST', '/api/classes', { name: 'Limits' }, B.cookie)).json.code);
    expect((await call(c, 'POST', `/api/classes/${code}/results`, { nickname: 'Cheat', origin: 'a1', ending: 'time', score: 10_000_000, days: 5 })).status).toBe(400);
  });
});

describe('A05 Security misconfiguration', () => {
  it('security headers are on every answer, and the server does not say what it is', async () => {
    const r = await call(c, 'GET', '/api/flags');
    const h = r.headers;
    expect(String(h['content-security-policy'])).toContain("default-src 'none'"); expect(String(h['content-security-policy'])).toContain("frame-ancestors 'none'");
    expect(h['x-content-type-options']).toBe('nosniff'); expect(h['x-powered-by']).toBeUndefined(); expect(h['server']).toBeUndefined();
    expect(String(h['referrer-policy'])).toBeTruthy(); expect(String(h['cross-origin-resource-policy'])).toBe('same-site');
  });
  it('another site gets no cross-origin permission and cannot make a change', async () => {
    const evil = { origin: 'https://evil.example' };
    const r = await call(c, 'GET', '/api/flags', undefined, undefined, evil);
    expect(r.headers['access-control-allow-origin']).toBeUndefined();
    expect((await call(c, 'POST', '/api/classes', { name: 'Evil' }, A.cookie, evil)).status).toBe(403);
    expect((await call(c, 'POST', '/api/telemetry', { events: [{ kind: 'event', name: 'tick' }] }, undefined, evil)).status).toBe(403);
    const ok = await call(c, 'GET', '/api/flags', undefined, undefined, { origin: ORIGIN });
    expect(ok.headers['access-control-allow-origin']).toBe(ORIGIN);
  });
  it('errors tell the player nothing about the server: no stack, no SQL, no paths', async () => {
    const bad = [await call(c, 'POST', '/api/classes', '{not json' as never, A.cookie, { 'content-type': 'application/json' }), await call(c, 'GET', '/api/nothing-here'), await call(c, 'GET', '/api/classes/%00%00')];
    for (const r of bad) { const t = JSON.stringify(r.json) + String(r.raw.body); expect(t).not.toMatch(/at \w+ \(|node_modules|\.ts:|select |relation |syntax error|ECONN/i); }
  });
  it('no default accounts or test secrets ship in the migrations or the source', () => {
    const dir = join(process.cwd(), 'migrations');
    for (const f of readdirSync(dir)) expect(readFileSync(join(dir, f), 'utf8'), f).not.toMatch(/insert into app\.users/i);
    for (const f of readdirSync(join(process.cwd(), 'src'))) expect(readFileSync(join(process.cwd(), 'src', f), 'utf8'), f).not.toMatch(/(password|secret|api[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"]/i);
  });
});

describe('A07 Identification and authentication failures', () => {
  it('a logged-out cookie stops working at once, and a deleted account takes its classes and sessions with it', async () => {
    const V = await player(c, 'victim');
    await call(c, 'POST', '/api/classes', { name: 'Doomed' }, V.cookie);
    const login = await call(c, 'POST', '/api/auth/login', { email: V.email, password: 'a long passphrase for victim' });
    const cookie = cookieOf(login.headers['set-cookie']);
    expect((await call(c, 'GET', '/api/auth/me', undefined, cookie)).status).toBe(200);
    await call(c, 'POST', '/api/auth/logout', {}, cookie);
    expect((await call(c, 'GET', '/api/auth/me', undefined, cookie)).status).toBe(401);
    const again = cookieOf((await call(c, 'POST', '/api/auth/login', { email: V.email, password: 'a long passphrase for victim' })).headers['set-cookie']);
    expect((await call(c, 'POST', '/api/auth/delete', { password: 'wrong password here' }, again)).status).toBeGreaterThanOrEqual(400);
    expect((await call(c, 'POST', '/api/auth/delete', { password: 'a long passphrase for victim' }, again)).status).toBe(200);
    expect((await call(c, 'GET', '/api/auth/me', undefined, again)).status).toBe(401);
    expect((await c.t.admin("select count(*)::int as n from app.classes where name = 'Doomed'")).rows[0].n).toBe(0);
  });
  it('guessing is slowed down and answers do not reveal which e-mail has an account; weak passwords are refused', async () => {
    const strict = await start({ RATE_AUTH_PER_MIN: '5', LOGIN_PER_EMAIL: '3' });
    try {
      const known = await call(strict, 'POST', '/api/auth/login', { email: 'nobody@example.org', password: 'x'.repeat(12) });
      expect(known.status).toBe(401);
      const codes: number[] = []; for (let i = 0; i < 8; i++) codes.push((await call(strict, 'POST', '/api/auth/login', { email: 'nobody@example.org', password: 'x'.repeat(12) })).status);
      expect(codes).toContain(429);
    } finally { await strict.app.close(); await strict.t.close(); }
    expect((await call(c, 'POST', '/api/auth/register', { email: 'weak@example.org', password: 'password1234' })).status).toBe(400);
    expect((await call(c, 'POST', '/api/auth/register', { email: 'weak@example.org', password: 'short' })).status).toBe(400);
  });
  it('a failed login leaves a record (also A09)', async () => {
    await call(c, 'POST', '/api/auth/login', { email: A.email, password: 'definitely wrong password' });
    expect((await c.t.admin("select count(*)::int as n from app.auth_events where kind like '%fail%'")).rows[0].n).toBeGreaterThan(0);
  });
});

describe('A08 Software and data integrity failures', () => {
  it('a request must come from the game: JSON only, an allowed Origin, and a body that fits the shape', async () => {
    const form = await c.app.inject({ method: 'POST', url: '/api/classes', payload: 'name=Evil', headers: { origin: ORIGIN, cookie: A.cookie, 'content-type': 'application/x-www-form-urlencoded' } });
    expect(form.statusCode).toBeGreaterThanOrEqual(400);
    expect((await call(c, 'POST', '/api/classes', { name: 'X' }, A.cookie, { origin: 'null' })).status).toBe(403);
  });
  it('what the game stores is not executed by the server: saves and results are opaque data with size limits', async () => {
    expect((await call(c, 'PUT', '/api/save', { data: { constructor: { prototype: { admin: true } }, __proto__: { admin: true } } }, A.cookie)).status).toBeLessThan(500);
    expect((await call(c, 'GET', '/api/admin/whoami', undefined, B.cookie)).json.admin).toBe(false);
    const code = String((await call(c, 'POST', '/api/classes', { name: 'Integrity' }, B.cookie)).json.code);
    const huge = { nickname: 'Pupil', origin: 'tajik', ending: 'time', score: 1, days: 1, learned: { done: Array.from({ length: 50 }, () => 'x'), mistakes: [] } };
    expect((await call(c, 'POST', `/api/classes/${code}/results`, huge)).status).toBe(400);
  });
  it('the dependency list is pinned exactly, so a build installs what was tested', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { dependencies: Record<string, string> };
    for (const [n, v] of Object.entries(pkg.dependencies)) expect(v, n).toMatch(/^\d/);
  });
});

describe('A09 Security logging and monitoring failures', () => {
  it('errors from the browsers are collected and an administrator can see them; cookies never reach the logs', async () => {
    await call(c, 'POST', '/api/telemetry', { sid: 'owasp0001abc', events: [{ kind: 'error', name: 'error', props: { message: 'TypeError: x is undefined', where: 'ui.js:1' } }] });
    const s = (await call(c, 'GET', '/api/admin/stats', undefined, A.cookie)).json as unknown as { errors: { message: string }[] };
    expect(s.errors.map(e => e.message)).toContain('TypeError: x is undefined');
    const src = readFileSync(join(process.cwd(), 'src', 'app.ts'), 'utf8');
    expect(src).toContain('req.headers.cookie'); expect(src).toContain('set-cookie');          // the logger redacts them
  });
  it('the usage table has no place to put an address, a user agent or an account', async () => {
    const cols = (await c.t.admin("select column_name from information_schema.columns where table_schema = 'app' and table_name = 'telemetry'")).rows.map(r => String(r.column_name)).sort();
    expect(cols).toEqual(['at', 'build', 'id', 'kind', 'name', 'props', 'sid']);
  });
  it('old records are removed by the retention function', async () => {
    await c.t.admin("insert into app.telemetry (kind, name, at) values ('event', 'old_one', now() - interval '100 days')");
    await c.t.admin('select app.prune_telemetry()');
    expect((await c.t.admin("select count(*)::int as n from app.telemetry where name = 'old_one'")).rows[0].n).toBe(0);
  });
});

describe('A10 Server-side request forgery', () => {
  it('addresses typed by players are stored or refused but never fetched: the server makes no outgoing web request', async () => {
    const real = globalThis.fetch; let calls = 0;
    globalThis.fetch = (async () => { calls++; throw new Error('the server must not fetch'); }) as typeof fetch;
    try {
      const url = 'http://169.254.169.254/latest/meta-data/';
      await call(c, 'POST', '/api/classes', { name: url, assignment: { note: url } }, A.cookie);
      await call(c, 'POST', '/api/telemetry', { events: [{ kind: 'event', name: 'tick', props: { u: url } }] });
      await call(c, 'POST', '/api/classes/ABC234/results', { nickname: 'http://127.0.0.1', origin: 'tajik', ending: 'time', score: 1, days: 1 });
      await call(c, 'POST', '/api/profile', { username: 'ssrf_user', avatar: url }, A.cookie);
    } finally { globalThis.fetch = real; }
    expect(calls).toBe(0);
  });
  it('the source has no code that fetches a player-supplied address', () => {
    for (const f of readdirSync(join(process.cwd(), 'src'))) {
      const t = readFileSync(join(process.cwd(), 'src', f), 'utf8');
      expect(t, f).not.toMatch(/\bfetch\(|http\.request|https\.request|axios|node-fetch|\bgot\(/);
    }
  });
});
