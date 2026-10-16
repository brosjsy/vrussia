/* The HTTP server: security around every request, the account routes, and the game routes (routes-game.ts).
   - The session is an HttpOnly cookie (scripts on the page cannot read it), SameSite=Lax, Secure in production, named "__Host-..." when it
     can be (bound to this exact host). The server never accepts a session from a header or the address.
   - Requests that change something must come from an address in CORS_ORIGINS (the Origin header) and carry JSON: a form on another site
     cannot do either, which stops cross-site request forgery. Other sites cannot read answers (no CORS headers for them).
   - Rate limits per IP on everything, tighter on the account routes, and per e-mail on logging in.
   - Security headers (helmet); answers about accounts are never cached; cookies and passwords never reach the log. */
import Fastify from 'fastify';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { Config } from './config.js';
import type { Db } from './db.js';
import { Auth, AppError } from './auth.js';
import type { SessionUser } from './auth.js';
import type { EmailSender } from './email.js';
import { Templates, brandFrom } from './email.js';
import { gameRoutes } from './routes-game.js';

declare module 'fastify' {
  interface FastifyRequest { user: SessionUser | null }
}
export interface AppDeps { cfg: Config; db: Db; mail: EmailSender; templates?: Templates }

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
/** Postgres errors raised on purpose by the game's functions: their words are safe to pass on; anything else is a plain "server error". */
const KNOWN = /^(bad username|username taken|no profile|too many scores today|score not possible|chat is for adults|bad length|language|slow down|daily limit|not your talk|bad room|blocked|no such message|already voted|bad counter|too many ads today|too many ads|no such ad|too many follows|your own home|no such home|too many notes|no such challenge|already claimed|not done yet|join first|friends only|too many invitations|already invited|no such invitation)$/;

/** Counts attempts per key in a sliding window (logging in per e-mail). Kept in memory: with several servers, put a shared store in front. */
export class Throttle {
  private readonly hits = new Map<string, number[]>();
  constructor(private readonly max: number, private readonly windowMs: number) {}
  hit(key: string, now = Date.now()): boolean {
    const list = (this.hits.get(key) ?? []).filter(t => now - t < this.windowMs);
    if (list.length >= this.max) { this.hits.set(key, list); return false; }
    list.push(now); this.hits.set(key, list);
    if (this.hits.size > 50_000) for (const [k, v] of this.hits) if (!v.some(t => now - t < this.windowMs)) this.hits.delete(k);
    return true;
  }
}

export async function buildApp(d: AppDeps): Promise<FastifyInstance> {
  const { cfg } = d;
  const app = Fastify({
    trustProxy: cfg.TRUST_PROXY, bodyLimit: 512 * 1024,
    logger: cfg.LOG_LEVEL === 'silent' ? false : { level: cfg.LOG_LEVEL, redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'] },
  });
  const tpl = d.templates ?? new Templates(brandFrom(cfg), cfg.TEMPLATE_DIR);
  const auth = new Auth({ db: d.db, mail: d.mail, tpl, cfg, onMailError: e => app.log.error({ err: e }, 'e-mail not sent') });
  const loginThrottle = new Throttle(cfg.LOGIN_PER_EMAIL, 15 * 60_000);
  const cookieName = cfg.COOKIE_SECURE && !cfg.COOKIE_DOMAIN ? `__Host-${cfg.COOKIE_NAME}` : cfg.COOKIE_NAME;
  const allowed = new Set([...cfg.CORS_ORIGINS, new URL(cfg.PUBLIC_URL).origin]);

  await app.register(helmet, {
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] } },
    hsts: cfg.NODE_ENV === 'production' ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
  await app.register(cookie);
  await app.register(rateLimit, { max: cfg.RATE_PER_MIN, timeWindow: '1 minute' });

  app.decorateRequest('user', null);
  // cross-origin rules and the defence against forged requests
  app.addHook('onRequest', async (req, reply) => {
    const origin = req.headers.origin;
    if (origin && allowed.has(origin)) {
      reply.header('Access-Control-Allow-Origin', origin).header('Access-Control-Allow-Credentials', 'true').header('Vary', 'Origin');
      if (req.method === 'OPTIONS') {
        return reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE').header('Access-Control-Allow-Headers', 'Content-Type').header('Access-Control-Max-Age', '600').code(204).send();
      }
    }
    if (UNSAFE.has(req.method) && (!origin || !allowed.has(origin))) return reply.code(403).send({ error: 'origin not allowed' });
  });
  app.addHook('preHandler', async req => { req.user = await auth.sessionUser(req.cookies[cookieName]); });
  app.addHook('onSend', async (req, reply) => { if (req.url.startsWith('/api/auth/')) reply.header('Cache-Control', 'no-store'); });

  app.setErrorHandler((err: Error & { statusCode?: number; code?: string }, req, reply) => {
    if (err instanceof AppError) return reply.code(err.status).send({ error: err.code });
    if (err.statusCode === 429) return reply.code(429).send({ error: 'rate limit' });
    if (err.code === 'P0001' && KNOWN.test(err.message)) return reply.code(400).send({ error: err.message });          // raised by our own SQL
    if (typeof err.code === 'string' && /^(22|23)/.test(err.code)) return reply.code(400).send({ error: 'invalid input' }); // a database rule said no
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) return reply.code(err.statusCode).send({ error: err.statusCode === 415 ? 'json only' : 'bad request' });
    req.log.error({ err }, 'request failed');
    return reply.code(500).send({ error: 'server error' });
  });

  const meta = (req: FastifyRequest) => ({ ip: req.ip, userAgent: String(req.headers['user-agent'] ?? '') });
  const body = (req: FastifyRequest): Record<string, unknown> => (req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {});
  const strict = { config: { rateLimit: { max: cfg.RATE_AUTH_PER_MIN, timeWindow: '1 minute' } } };
  const setCookie = (reply: FastifyReply, token: string) => reply.setCookie(cookieName, token, { httpOnly: true, secure: cfg.COOKIE_SECURE, sameSite: 'lax', path: '/', domain: cfg.COOKIE_DOMAIN, maxAge: cfg.SESSION_MAX_DAYS * 86_400 });
  const clearCookie = (reply: FastifyReply) => reply.clearCookie(cookieName, { path: '/', domain: cfg.COOKIE_DOMAIN, secure: cfg.COOKIE_SECURE, httpOnly: true, sameSite: 'lax' });
  const me = (u: SessionUser) => ({ id: u.userId, email: u.email, verified: u.verified, username: u.username, adult: u.adult });
  const need = (req: FastifyRequest): SessionUser => { if (!req.user) throw new AppError(401, 'not signed in'); return req.user; };
  const done = { ok: true };
  const generic = { ok: true, message: 'If the address can receive e-mail from us, a message is on its way.' };

  app.get('/api/health', async () => { await d.db.query('select 1'); return { ok: true }; });

  app.post('/api/auth/register', strict, async req => { const b = body(req); await auth.register(b.email, b.password, meta(req)); return generic; });
  app.post('/api/auth/resend', strict, async req => { await auth.resendVerification(body(req).email, meta(req)); return generic; });
  app.post('/api/auth/verify', strict, async req => { await auth.verifyEmail(body(req).token, meta(req)); return done; });
  app.post('/api/auth/forgot', strict, async req => { await auth.forgot(body(req).email, meta(req)); return generic; });
  app.post('/api/auth/reset', strict, async (req, reply) => { const b = body(req); await auth.reset(b.token, b.password, meta(req)); clearCookie(reply); return done; });
  app.post('/api/auth/login', strict, async (req, reply) => {
    const b = body(req), key = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 254) : '';
    if (!loginThrottle.hit(key)) throw new AppError(429, 'rate limit');
    const r = await auth.login(b.email, b.password, meta(req), req.cookies[cookieName]);
    setCookie(reply, r.token);
    return me(r.user);
  });
  app.post('/api/auth/logout', async (req, reply) => { if (req.user) await auth.logout(req.user.sessionId); clearCookie(reply); return done; });
  app.get('/api/auth/me', async req => me(need(req)));
  app.post('/api/auth/password', strict, async req => { const b = body(req); await auth.changePassword(need(req), b.current, b.next, meta(req)); return done; });
  app.get('/api/auth/sessions', async req => auth.sessions(need(req)));
  app.delete('/api/auth/sessions/:id', async req => ({ ok: await auth.endSession(need(req), (req.params as { id?: string }).id) }));
  app.post('/api/auth/sessions/end-others', async req => ({ ended: await auth.endOtherSessions(need(req)) }));
  app.post('/api/auth/delete', strict, async (req, reply) => { await auth.deleteAccount(need(req), body(req).password, meta(req)); clearCookie(reply); return done; });

  await gameRoutes(app, d.db, need);
  return app;
}
