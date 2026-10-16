import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../src/config.js';
import type { Config } from '../src/config.js';
import { buildApp } from '../src/app.js';
import { MemorySender } from '../src/email.js';
import { startDb } from './harness.js';
import type { TestDb } from './harness.js';

export const ORIGIN = 'https://game.example.org';
export const testConfig = (over: Record<string, string> = {}): Config => loadConfig({
  NODE_ENV: 'test', PUBLIC_URL: 'https://api.example.org', APP_URL: 'https://game.example.org/play/', CORS_ORIGINS: ORIGIN,
  DATABASE_URL: 'postgres://unused/for/tests', DATABASE_SSL: 'off', EMAIL_TRANSPORT: 'memory', EMAIL_FROM: 'V Russia <no-reply@example.org>',
  LOG_LEVEL: 'silent', RATE_PER_MIN: '100000', RATE_AUTH_PER_MIN: '100000', LOGIN_PER_EMAIL: '100000', ...over,   // the limits themselves: test/security.test.ts
});

export interface Ctx { app: FastifyInstance; t: TestDb; mail: MemorySender; cfg: Config }
export async function start(over: Record<string, string> = {}): Promise<Ctx> {
  const t = await startDb(), mail = new MemorySender(), cfg = testConfig(over);
  const app = await buildApp({ cfg, db: t.db, mail });
  return { app, t, mail, cfg };
}

/** A request as the game in the browser sends it: from the game's address, JSON, with the cookie if there is one. */
export async function call(c: Ctx, method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}) {
  const r = await c.app.inject({ method, url, payload: body === undefined ? undefined : (body as object), headers: { origin: ORIGIN, ...(cookie ? { cookie } : {}), ...headers } });
  let json: unknown = null; try { json = r.json(); } catch { json = null; }
  return { status: r.statusCode, json: json as Record<string, unknown> & unknown[], headers: r.headers, raw: r };
}
export const tokenIn = (text: string, key: string): string => { const m = new RegExp(`#${key}=([A-Za-z0-9_-]{43})`).exec(text); if (!m) throw new Error(`no ${key} link in: ${text}`); return m[1]; };
export const cookieOf = (setCookie: unknown): string => String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0];

/** A confirmed, logged-in player with a public name; returns the cookie and the id. */
export async function player(c: Ctx, name: string, adult = true): Promise<{ cookie: string; id: string; email: string }> {
  const email = `${name}@example.org`, password = `a long passphrase for ${name}`;
  await call(c, 'POST', '/api/auth/register', { email, password });
  await call(c, 'POST', '/api/auth/verify', { token: tokenIn(c.mail.last(email)!.text, 'verify') });
  const r = await call(c, 'POST', '/api/auth/login', { email, password });
  const cookie = cookieOf(r.headers['set-cookie']);
  const p = await call(c, 'POST', '/api/profile', { username: name, adult }, cookie);
  if (p.status !== 200) throw new Error('profile: ' + JSON.stringify(p.json));
  return { cookie, id: String(r.json.id), email };
}
