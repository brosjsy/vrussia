/* The platform routes: anonymous usage events and error reports, feature flags, classes for teachers and NGOs, "download my data", and a small
   administrator area. Events never carry a player id, an IP address or an e-mail address (migrations/0010_platform.sql). Every input is checked (zod). */
import { randomInt } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Db } from './db.js';
import { AppError } from './auth.js';
import type { SessionUser } from './auth.js';

function parse<T extends z.ZodType>(schema: T, v: unknown): z.infer<T> {
  const r = schema.safeParse(v ?? {});
  if (!r.success) throw new AppError(400, 'invalid input');
  return r.data;
}

const name = z.string().regex(/^[a-z0-9_.:-]{2,60}$/);
const prop = z.union([z.string().max(80), z.number().finite(), z.boolean()]);
const props = z.record(z.string().regex(/^[a-z0-9_]{1,24}$/), prop).refine(o => Object.keys(o).length <= 8);
const code = z.string().regex(/^[A-Z0-9]{6}$/);
const ENDINGS = ['hospital', 'deported', 'debt', 'time'] as const;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';       // no 0/O or 1/I, so a code read aloud in a classroom is not mistaken
const newCode = (): string => Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

export async function platformRoutes(app: FastifyInstance, db: Db, need: (req: FastifyRequest) => SessionUser, admins: string[]): Promise<void> {
  const one = async <T>(sql: string, params: unknown[] = []): Promise<T | null> => (await db.query<T>(sql, params)).rows[0] ?? null;
  const all = async <T>(sql: string, params: unknown[] = []): Promise<T[]> => (await db.query<T>(sql, params)).rows;
  const ok = { ok: true };
  const admin = (req: FastifyRequest): SessionUser => {
    const u = need(req);
    if (!u.verified || !admins.includes(u.email.toLowerCase())) throw new AppError(403, 'not allowed');
    return u;
  };

  /* ---------- usage events and errors (anonymous) ---------- */
  app.post('/api/telemetry', { config: { rateLimit: { max: 40, timeWindow: '1 minute' } } }, async req => {
    const b = parse(z.object({
      sid: z.string().regex(/^[a-z0-9]{8,32}$/).optional(), build: z.string().regex(/^[A-Za-z0-9._-]{1,30}$/).optional(),
      events: z.array(z.object({ kind: z.enum(['event', 'error']), name, props: props.optional() })).min(1).max(20),
    }), req.body);
    for (const e of b.events) await db.query('insert into app.telemetry (kind, name, props, sid, build) values ($1, $2, $3, $4, $5)', [e.kind, e.name, JSON.stringify(e.props ?? {}), b.sid ?? null, b.build ?? null]);
    if (Math.random() < 0.01) await db.query('select app.prune_telemetry()');
    return { ok: true, n: b.events.length };
  });

  /* ---------- feature flags ---------- */
  app.get('/api/flags', async () => all('select key, enabled, rollout from app.flags order by key'));
  app.put('/api/admin/flags/:key', async req => {
    admin(req);
    const k = parse(z.object({ key: z.string().regex(/^[a-z0-9_]{2,40}$/) }), req.params).key;
    const b = parse(z.object({ enabled: z.boolean(), rollout: z.number().int().min(0).max(100).default(100), note: z.string().max(200).default('') }), req.body);
    await db.query('insert into app.flags (key, enabled, rollout, note) values ($1, $2, $3, $4) on conflict (key) do update set enabled = $2, rollout = $3, note = $4, updated_at = now()', [k, b.enabled, b.rollout, b.note]);
    return ok;
  });

  /* ---------- the administrator area ---------- */
  app.get('/api/admin/stats', async req => {
    admin(req);
    const days = Math.max(1, Math.min(90, Number((req.query as { days?: string }).days) || 14));
    const events = await all<{ name: string; n: number; sessions: number }>("select name, count(*)::int as n, count(distinct sid)::int as sessions from app.telemetry where kind = 'event' and at > now() - make_interval(days => $1) group by name order by n desc limit 100", [days]);
    const errors = await all<{ name: string; message: string; n: number; last: string }>("select name, coalesce(props->>'message', '') as message, count(*)::int as n, max(at)::text as last from app.telemetry where kind = 'error' and at > now() - make_interval(days => $1) group by name, props->>'message' order by n desc limit 50", [days]);
    const perDay = await all<{ day: string; n: number }>("select to_char(at, 'YYYY-MM-DD') as day, count(distinct sid)::int as n from app.telemetry where kind = 'event' and at > now() - make_interval(days => $1) group by 1 order by 1", [days]);
    const endings = await all<{ ending: string; n: number }>("select props->>'ending' as ending, count(*)::int as n from app.telemetry where kind = 'event' and name = 'run_end' and at > now() - make_interval(days => $1) group by 1 order by 2 desc", [days]);
    const quits = await all<{ day: number; n: number }>("select (props->>'day')::int as day, count(*)::int as n from app.telemetry where kind = 'event' and name = 'session_end' and props ? 'day' and at > now() - make_interval(days => $1) group by 1 order by 1", [days]);
    const scenarios = await all<{ id: string; n: number }>("select props->>'id' as id, count(*)::int as n from app.telemetry where kind = 'event' and name = 'scenario' and at > now() - make_interval(days => $1) group by 1 order by 2 desc limit 200", [days]);
    return { days, events, errors, sessionsPerDay: perDay, endings, quitDays: quits, scenarios };
  });
  app.post('/api/admin/announcements', async req => {
    admin(req);
    const b = parse(z.object({ title: z.string().min(2).max(80), body: z.string().min(2).max(500) }), req.body);
    return { id: (await one<{ id: number }>('select app.post_announcement($1, $2) as id', [b.title, b.body]))!.id };
  });
  app.get('/api/admin/whoami', async req => { const u = need(req); return { admin: u.verified && admins.includes(u.email.toLowerCase()) }; });

  /* ---------- classes (teachers and NGOs need an account; pupils play with a code and a nickname) ---------- */
  const assignment = z.object({
    origin: z.string().regex(/^[a-z0-9_]{2,20}$/).optional(), diff: z.enum(['easy', 'normal', 'hard']).optional(),
    city: z.string().min(2).max(40).optional(), note: z.string().max(300).optional(),
  }).strict();
  app.post('/api/classes', async req => {
    const u = need(req), b = parse(z.object({ name: z.string().min(2).max(60), assignment: assignment.default({}) }), req.body);
    if ((await one<{ n: number }>('select count(*)::int as n from app.classes where owner = $1', [u.userId]))!.n >= 10) throw new AppError(400, 'too many classes');
    for (let i = 0; i < 8; i++) {
      const c = newCode();
      try { await db.query('insert into app.classes (code, owner, name, assignment) values ($1, $2, $3, $4)', [c, u.userId, b.name, JSON.stringify(b.assignment)]); return { code: c }; }
      catch (e) { if (!/duplicate key|unique/i.test(String((e as Error).message))) throw e; }
    }
    throw new AppError(500, 'server error');
  });
  app.get('/api/classes', async req => all("select code, name, assignment, created_at, (select count(*)::int from app.class_results r where r.code = c.code) as results from app.classes c where owner = $1 order by created_at desc", [need(req).userId]));
  app.get('/api/classes/:code', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async req => {
    const c = parse(z.object({ code }), req.params).code;
    const row = await one<{ name: string; assignment: unknown }>('select name, assignment from app.classes where code = $1', [c]);
    if (!row) throw new AppError(404, 'no such class');
    return row;
  });
  app.post('/api/classes/:code/results', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async req => {
    const c = parse(z.object({ code }), req.params).code;
    const b = parse(z.object({
      nickname: z.string().regex(/^[\p{L}\p{N} _.-]{2,20}$/u), origin: z.string().regex(/^[a-z0-9_]{2,20}$/), ending: z.enum(ENDINGS),
      score: z.number().int().min(0).max(100000), days: z.number().int().min(1).max(800),
      learned: z.object({ done: z.array(z.string().max(60)).max(40), mistakes: z.array(z.string().max(60)).max(40) }).default({ done: [], mistakes: [] }),
    }), req.body);
    if (!(await one('select 1 from app.classes where code = $1', [c]))) throw new AppError(404, 'no such class');
    if ((await one<{ n: number }>('select count(*)::int as n from app.class_results where code = $1', [c]))!.n >= 300) throw new AppError(400, 'class is full');
    await db.query('insert into app.class_results (code, nickname, origin, ending, score, days, learned) values ($1, $2, $3, $4, $5, $6, $7) on conflict (code, nickname) do update set origin = $3, ending = $4, score = $5, days = $6, learned = $7, created_at = now()',
      [c, b.nickname, b.origin, b.ending, b.score, b.days, JSON.stringify(b.learned)]);
    return ok;
  });
  app.get('/api/classes/:code/results', async req => {
    const u = need(req), c = parse(z.object({ code }), req.params).code;
    if (!(await one('select 1 from app.classes where code = $1 and owner = $2', [c, u.userId]))) throw new AppError(404, 'no such class');
    return all('select nickname, origin, ending, score, days, learned, created_at from app.class_results where code = $1 order by score desc, nickname', [c]);
  });
  app.delete('/api/classes/:code', async req => {
    const u = need(req), c = parse(z.object({ code }), req.params).code;
    await db.query('delete from app.classes where code = $1 and owner = $2', [c, u.userId]);
    return ok;
  });

  /* ---------- "download my data" (the right of access) ---------- */
  app.get('/api/account/export', async req => {
    const u = need(req);
    const [user, profile, save, scores, classes] = await Promise.all([
      one('select id, email, created_at from app.users where id = $1', [u.userId]),
      one('select * from app.profiles where id = $1', [u.userId]),
      one('select data, updated_at from app.saves where player_id = $1', [u.userId]),
      all('select origin, city, ending, score, days, created_at from app.scores where player_id = $1 order by created_at', [u.userId]),
      all('select code, name, assignment, created_at from app.classes where owner = $1', [u.userId]),
    ]);
    return { exported_at: new Date().toISOString(), user, profile, save, scores, classes };
  });
}
