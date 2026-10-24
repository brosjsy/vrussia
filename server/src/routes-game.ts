/* The online parts of the game. Every route checks its input (zod) and acts only as the logged-in player: the player's id always comes from
   the session, never from the request, so nobody can read or change another player's private rows. The rules themselves (limits, the
   language filter, who may write to whom) stay in the SQL functions of migrations/0002_game.sql. */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Db } from './db.js';
import { AppError } from './auth.js';
import type { SessionUser } from './auth.js';

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const city = z.string().min(2).max(40);
const id = z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
function parse<T extends z.ZodType>(schema: T, v: unknown): z.infer<T> {
  const r = schema.safeParse(v ?? {});
  if (!r.success) throw new AppError(400, 'invalid input');
  return r.data;
}

export async function gameRoutes(app: FastifyInstance, db: Db, need: (req: FastifyRequest) => SessionUser): Promise<void> {
  const one = async <T>(sql: string, params: unknown[]): Promise<T | null> => (await db.query<T>(sql, params)).rows[0] ?? null;
  const all = async <T>(sql: string, params: unknown[] = []): Promise<T[]> => (await db.query<T>(sql, params)).rows;
  const ok = { ok: true };

  /* ---------- profile ---------- */
  app.post('/api/profile', async req => {
    const u = need(req), b = parse(z.object({ username: z.string(), adult: z.boolean().optional() }), req.body);
    return one('select username, adult from app.claim_profile($1, $2, $3)', [u.userId, b.username.trim().toLowerCase(), b.adult ?? false]);
  });
  app.get('/api/players', async req => {
    need(req);
    const q = String((req.query as { q?: string }).q ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (q.length < 2) return [];
    return all("select id, username, country from app.profiles where username like $1 || '%' order by username limit 20", [q]);
  });

  /* ---------- the saved game ---------- */
  app.put('/api/save', async req => {
    const u = need(req), b = parse(z.object({ data: z.record(z.string(), z.unknown()) }), req.body);
    const version = Number(b.data.version) || 1, day = Math.max(0, Math.round(Number(b.data.day) || 0));
    await db.query('insert into app.saves (player_id, data, version, day, updated_at) values ($1, $2, $3, $4, now()) on conflict (player_id) do update set data = excluded.data, version = excluded.version, day = excluded.day, updated_at = now()',
      [u.userId, JSON.stringify(b.data), version, day]);
    return ok;
  });
  app.get('/api/save', async req => one('select data, updated_at from app.saves where player_id = $1', [need(req).userId]));

  /* ---------- leaderboard, presence ---------- */
  app.post('/api/scores', async req => {
    const u = need(req), b = parse(z.object({ origin: z.string().min(2).max(20), city, ending: z.enum(['hospital', 'deported', 'debt', 'time']), score: z.number().int().min(0).max(100000), days: z.number().int().min(1).max(800) }), req.body);
    return { id: (await one<{ id: number }>('select app.submit_score($1, $2, $3, $4, $5, $6) as id', [u.userId, b.origin, b.city, b.ending, b.score, b.days]))!.id };
  });
  app.get('/api/scores', async req => {
    const limit = Math.max(1, Math.min(100, Number((req.query as { limit?: string }).limit) || 20));
    return all('select username, origin, city, ending, score, days, created_at from app.scores order by score desc, created_at asc limit $1', [limit]);
  });
  app.post('/api/presence', async req => {
    const u = need(req), b = parse(z.object({ city, place: z.string().min(2).max(20) }), req.body);
    await db.query('select app.heartbeat($1, $2, $3)', [u.userId, b.city, b.place]); return ok;
  });
  app.get('/api/presence/count', async () => ({ count: (await one<{ n: number }>("select count(*)::int as n from app.presence where seen_at > now() - interval '3 minutes'", []))!.n }));
  app.get('/api/presence', async req => {
    need(req); const c = parse(z.object({ city }), req.query).city;
    return all("select username, city, place from app.presence where city = $1 and seen_at > now() - interval '3 minutes' limit 200", [c]);
  });

  /* ---------- chat ---------- */
  app.get('/api/messages', async req => {
    const u = need(req), q = parse(z.object({ room: z.string().max(120), after: z.coerce.number().int().min(0).default(0) }), req.query);
    return all('select * from app.read_messages($1, $2, $3)', [u.userId, q.room, q.after]);
  });
  app.post('/api/messages', async req => {
    const u = need(req), b = parse(z.object({ room: z.string().max(120), body: z.string().max(1000) }), req.body);
    return { id: (await one<{ id: number }>('select app.send_message($1, $2, $3) as id', [u.userId, b.room, b.body]))!.id };
  });
  app.post('/api/blocks', async req => {
    const u = need(req), b = parse(z.object({ user: uuid }), req.body);
    if (b.user === u.userId) throw new AppError(400, 'invalid input');
    await db.query('insert into app.blocks (blocker, blocked) select $1, $2 where exists (select 1 from app.profiles where id = $2) on conflict do nothing', [u.userId, b.user]); return ok;
  });
  app.get('/api/blocks', async req => all('select b.blocked as id, p.username from app.blocks b join app.profiles p on p.id = b.blocked where b.blocker = $1 order by p.username', [need(req).userId]));
  app.delete('/api/blocks/:user', async req => {
    const u = need(req), b = parse(z.object({ user: uuid }), req.params);
    await db.query('delete from app.blocks where blocker = $1 and blocked = $2', [u.userId, b.user]); return ok;
  });
  app.post('/api/reports', async req => {
    const u = need(req), b = parse(z.object({ message: id, reason: z.string().trim().min(3).max(200) }), req.body);
    await db.query('select app.report_message($1, $2, $3)', [u.userId, b.message, b.reason]); return ok;
  });
  app.get('/api/talks', async req => all('select * from app.my_talks($1)', [need(req).userId]));

  /* ---------- votes, counters, announcements ---------- */
  app.post('/api/votes', async req => {
    const u = need(req), b = parse(z.object({ week: z.number().int().min(0).max(100000), city, candidate: z.string().min(1).max(40) }), req.body);
    await db.query('select app.cast_vote($1, $2, $3, $4)', [u.userId, b.week, b.city, b.candidate]); return ok;
  });
  app.get('/api/votes', async req => { const q = parse(z.object({ week: z.coerce.number().int().min(0).max(100000), city }), req.query); return all('select * from app.vote_tally($1, $2)', [q.week, q.city]); });
  app.post('/api/counters/:key', async req => {
    const key = parse(z.object({ key: z.enum(['visits', 'daily_found']) }), req.params).key;
    if (key === 'daily_found') need(req);
    return { value: (await one<{ v: number }>('select app.bump($1) as v', [key]))!.v };
  });
  app.get('/api/counters', async () => all('select key, value from app.counters order by key'));
  app.get('/api/announcements', async () => all('select id, title, body, created_at from app.announcements order by id desc limit 5'));

  /* ---------- adverts ---------- */
  app.get('/api/ads', async req => {
    const c = parse(z.object({ city }), req.query).city;
    return all('select id, player_id, username, city, kind, title, body, price, created_at from app.ads where city = $1 and not hidden and expires_at > now() order by id desc limit 40', [c]);
  });
  app.post('/api/ads', async req => {
    const u = need(req), b = parse(z.object({ city, kind: z.enum(['room', 'job', 'sell', 'service', 'lost']), title: z.string().max(200), body: z.string().max(280).default(''), price: z.number().int().min(0).max(10_000_000).default(0) }), req.body);
    return { id: (await one<{ id: number }>('select app.post_ad($1, $2, $3, $4, $5, $6) as id', [u.userId, b.city, b.kind, b.title, b.body, b.price]))!.id };
  });
  /** The player's own adverts that are still up (at most 3 at a time; the screen says so before the player tries). */
  app.get('/api/ads/mine', async req => all('select id, city, kind, title, created_at from app.ads where player_id = $1 and expires_at > now() order by id desc', [need(req).userId]));
  app.delete('/api/ads/:id', async req => {
    const u = need(req), a = parse(z.object({ id }), req.params).id;
    return { ok: (await db.query('delete from app.ads where id = $1 and player_id = $2', [a, u.userId])).rowCount > 0 };
  });
  app.post('/api/ads/:id/report', async req => { const u = need(req), a = parse(z.object({ id }), req.params).id; await db.query('select app.report_ad($1, $2)', [u.userId, a]); return ok; });

  /* ---------- advertising spaces (migrations/0006_adspace.sql) ---------- */
  /** The adverts up in a city. Anyone may look; a logged-in player who looks counts as one view of each (once a day). */
  app.get('/api/adverts', async req => {
    const c = parse(z.object({ city }), req.query).city;
    let viewer: string | null = null; try { viewer = need(req).userId; } catch { /* looking without an account is fine */ }
    return all('select * from app.adverts_in($1, $2)', [viewer, c]);
  });
  app.get('/api/adverts/mine', async req => all('select a.id, a.city, a.spot, a.head, a.expires_at, (select count(*) from app.advert_views v where v.advert_id = a.id) as views from app.adverts a where a.player_id = $1 and a.expires_at > now() order by a.id desc', [need(req).userId]));
  app.post('/api/adverts', async req => {
    const u = need(req), b = parse(z.object({ city, spot: z.enum(['stop', 'metro', 'board', 'wall', 'screen']), head: z.string().max(64), line: z.string().max(120).default(''), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), icon: z.string().min(1).max(8), days: z.number().int().min(1).max(14) }), req.body);
    return { id: (await one<{ id: number }>('select app.mount_advert($1, $2, $3, $4, $5, $6, $7, $8) as id', [u.userId, b.city, b.spot, b.head, b.line, b.color, b.icon, b.days]))!.id };
  });
  app.delete('/api/adverts/:id', async req => {
    const u = need(req), a = parse(z.object({ id }), req.params).id;
    return { ok: (await db.query('delete from app.adverts where id = $1 and player_id = $2', [a, u.userId])).rowCount > 0 };
  });
  app.post('/api/adverts/:id/report', async req => { const u = need(req), a = parse(z.object({ id }), req.params).id; await db.query('select app.report_advert($1, $2)', [u.userId, a]); return ok; });

  /* ---------- the Kitchen's online challenge (migrations/0007_cooking.sql) ---------- */
  const dish = z.string().regex(/^[A-Za-z0-9_]{2,40}$/);
  /** Today's table for a dish: the ten best, and the player's own place when logged in. Anyone may look. */
  app.get('/api/cooking/today', async req => {
    const d = parse(z.object({ dish }), req.query).dish;
    let me: string | null = null; try { me = need(req).userId; } catch { /* looking without an account is fine */ }
    const top = await all('select username, score, stars from app.cook_scores where day = current_date and dish = $1 order by score desc, updated_at asc limit 10', [d]);
    const mine = me ? await one<{ score: number; place: number }>('select s.score, (select count(*) + 1 from app.cook_scores o where o.day = current_date and o.dish = s.dish and (o.score > s.score or (o.score = s.score and o.updated_at < s.updated_at)))::int as place from app.cook_scores s where s.player_id = $1 and s.day = current_date and s.dish = $2', [me, d]) : null;
    const count = (await one<{ n: number }>('select count(*)::int as n from app.cook_scores where day = current_date and dish = $1', [d]))!.n;
    return { top, mine, count };
  });
  app.post('/api/cooking/today', async req => {
    const u = need(req), b = parse(z.object({ dish, score: z.number().int().min(0).max(100), stars: z.number().int().min(0).max(3) }), req.body);
    return { best: (await one<{ best: number }>('select app.cook_submit($1, $2, $3, $4) as best', [u.userId, b.dish, b.score, b.stars]))!.best };
  });

  /* ---------- following and friends ---------- */
  app.post('/api/follows', async req => {
    const u = need(req), b = parse(z.object({ user: uuid }), req.body);
    if (b.user === u.userId) throw new AppError(400, 'invalid input');
    await db.query('select app.follow($1, $2)', [u.userId, b.user]); return ok;
  });
  app.delete('/api/follows/:id', async req => { const u = need(req), o = parse(z.object({ id: uuid }), req.params).id; await db.query('delete from app.follows where follower = $1 and followed = $2', [u.userId, o]); return ok; });
  app.get('/api/follows', async req => { const u = need(req); return all('select follower, followed from app.follows where follower = $1 or followed = $1 limit 400', [u.userId]); });
  app.get('/api/friends', async req => all('select * from app.my_friends($1)', [need(req).userId]));

  /* ---------- the player's country (profile) ---------- */
  app.post('/api/profile/origin', async req => {
    const u = need(req), b = parse(z.object({ country: z.string().regex(/^[A-Za-z]{2}$/), region: z.enum(['CIS', 'Europe', 'Asia', 'Africa', 'Americas', 'Oceania']) }), req.body);
    await db.query('select app.set_origin($1, $2, $3)', [u.userId, b.country, b.region]); return ok;
  });

  /* ---------- challenges with other players (migrations 0004, 0005) ---------- */
  app.get('/api/challenges', async req => {
    const u = need(req), cityQ = parse(z.object({ city: city.optional() }), req.query).city ?? null;
    const [chapters, list] = await Promise.all([all('select * from app.chapters order by id'), all('select * from app.my_challenges($1, $2)', [u.userId, cityQ])]);
    return { chapters, challenges: list };
  });
  app.post('/api/challenges/:id/claim', async req => {
    const u = need(req), cid = parse(z.object({ id: z.string().regex(/^[a-z0-9_]{3,40}$/) }), req.params).id, b = parse(z.object({ city: city.optional() }), req.body);
    return { reward: (await one<{ r: number }>('select app.claim_challenge($1, $2, $3) as r', [u.userId, cid, b.city ?? null]))!.r };
  });
  app.post('/api/challenges/:id/join', async req => {
    const u = need(req), cid = parse(z.object({ id: z.string().regex(/^[a-z0-9_]{3,40}$/) }), req.params).id, b = parse(z.object({ city }), req.body);
    return { count: (await one<{ n: number }>('select app.city_join($1, $2, $3) as n', [u.userId, cid, b.city]))!.n };
  });
  app.get('/api/coops', async req => {
    const u = need(req);
    return all(`select c.id, c.challenge_id, c.status, c.inviter_done, c.invitee_done, c.created_at, c.inviter = $1 as mine,
      case when c.inviter = $1 then c.invitee else c.inviter end as other, p.username as other_name
      from app.coops c join app.profiles p on p.id = case when c.inviter = $1 then c.invitee else c.inviter end
      where (c.inviter = $1 or c.invitee = $1) and c.status <> 'declined' order by c.id desc limit 50`, [u.userId]);
  });
  app.post('/api/coops', async req => {
    const u = need(req), b = parse(z.object({ friend: uuid, challenge: z.string().regex(/^[a-z0-9_]{3,40}$/) }), req.body);
    return { id: (await one<{ id: number }>('select app.coop_invite($1, $2, $3) as id', [u.userId, b.friend, b.challenge]))!.id };
  });
  app.post('/api/coops/:id/answer', async req => {
    const u = need(req), cid = parse(z.object({ id }), req.params).id, b = parse(z.object({ yes: z.boolean() }), req.body);
    await db.query('select app.coop_answer($1, $2, $3)', [u.userId, cid, b.yes]); return ok;
  });
  app.post('/api/coops/:id/done', async req => {
    const u = need(req), cid = parse(z.object({ id }), req.params).id;
    return { status: (await one<{ s: string }>('select app.coop_done($1, $2) as s', [u.userId, cid]))!.s };
  });

  /* ---------- homes, the guest book, the best flat ---------- */
  app.put('/api/home', async req => {
    const u = need(req), b = parse(z.object({ city, dwelling: z.string().regex(/^[a-z]{3,12}$/), design: z.record(z.string(), z.unknown()), stars: z.number().int().min(0).max(400) }), req.body);
    await db.query('select app.publish_home($1, $2, $3, $4, $5)', [u.userId, b.city, b.dwelling, JSON.stringify(b.design), b.stars]); return ok;
  });
  /** Which home the player liked this week (one like a week), or null. */
  app.get('/api/homes/my-vote', async req => ({ owner: (await one<{ owner: string }>('select owner from app.home_votes where voter = $1 and week = floor(extract(epoch from now()) / 604800)::int', [need(req).userId]))?.owner ?? null }));
  app.get('/api/homes/best', async req => { need(req); return all('select * from app.best_homes()'); });
  app.get('/api/homes/:id', async req => { need(req); const o = parse(z.object({ id: uuid }), req.params).id; return one('select player_id, username, city, dwelling, design, stars, updated_at from app.homes where player_id = $1', [o]); });
  app.post('/api/homes/:id/vote', async req => { const u = need(req), o = parse(z.object({ id: uuid }), req.params).id; await db.query('select app.vote_home($1, $2)', [u.userId, o]); return ok; });
  app.get('/api/guestbook/:id', async req => {
    const u = need(req), o = parse(z.object({ id: uuid }), req.params).id;
    return all('select g.id, g.owner, g.author, g.author_name, g.body, g.gift, g.created_at from app.guestbook g where g.owner = $1 and not g.hidden and not exists (select 1 from app.blocks b where b.blocker = $2 and b.blocked = g.author) order by g.id desc limit 30', [o, u.userId]);
  });
  app.post('/api/guestbook/:id', async req => {
    const u = need(req), o = parse(z.object({ id: uuid }), req.params).id, b = parse(z.object({ body: z.string().max(1000), gift: z.enum(['flowers', 'cake', 'tea', 'chocolates']).nullable().default(null) }), req.body);
    return { id: (await one<{ id: number }>('select app.sign_guestbook($1, $2, $3, $4) as id', [u.userId, o, b.body, b.gift]))!.id };
  });
}
