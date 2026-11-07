/* The phone routes: the permanent game number of a player, texts between players, and the small messages that set up an audio call (WebRTC signalling).
   The sound itself goes from browser to browser and never touches this server. Everything is checked (zod); the rules (adults only, language, contact details,
   blocks, rate limits) live in the database functions of migrations/0011_phone.sql, so a bug in a route cannot skip them. */
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

/** The Luhn check digit for the digits d: the same rule as src/phonenumber.ts, so the browser accepts every number made here. */
export function luhn(d: string): number {
  let sum = 0;
  for (let i = 0; i < d.length; i++) { let n = Number(d[d.length - 1 - i]); if (i % 2 === 0) { n *= 2; if (n > 9) n -= 9; } sum += n; }
  return (10 - (sum % 10)) % 10;
}
/** Twelve digits in the range of players: 0, 1 to 8, nine random digits, the check digit. */
export function newDigits(): string {
  const head = '0' + String(1 + randomInt(8)) + Array.from({ length: 9 }, () => String(randomInt(10))).join('');
  return head + luhn(head);
}

const digits = z.string().regex(/^0[1-8][0-9]{10}$/);
const noFlood = { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } };

export async function phoneRoutes(app: FastifyInstance, db: Db, need: (req: FastifyRequest) => SessionUser): Promise<void> {
  const all = async <T>(sql: string, params: unknown[] = []): Promise<T[]> => (await db.query<T>(sql, params)).rows;
  const ok = { ok: true };

  /* The player's own number: made at the first request and never changed. */
  app.get('/api/phone/number', noFlood, async req => {
    const u = need(req);
    for (let i = 0; i < 6; i++) {
      try { return { digits: (await db.query<{ n: string }>('select app.claim_number($1, $2) as n', [u.userId, newDigits()])).rows[0].n }; }
      catch (e) { if (!/number taken|duplicate key|unique/i.test(String((e as Error).message))) throw e; }
    }
    throw new AppError(500, 'server error');
  });

  /* Texts */
  app.post('/api/phone/texts', noFlood, async req => {
    const u = need(req), b = parse(z.object({ to: digits, body: z.string().min(1).max(160) }).strict(), req.body);
    if (Math.random() < 0.02) await db.query('select app.prune_phone()');       // old texts (30 days) and stale call signals go now and then
    return { id: (await db.query<{ id: string }>('select app.send_text($1, $2, $3) as id', [u.userId, b.to, b.body])).rows[0].id };
  });
  /* What came in (newest 50, not hidden, nothing from people the player blocked) and what the player sent, with the other side's number. */
  app.get('/api/phone/texts', noFlood, async req => {
    const u = need(req), after = Math.max(0, Number((req.query as { after?: string }).after) || 0);
    return all(`select t.id, t.body, t.created_at, (t.sender = $1) as mine,
        (select n.digits from app.phone_numbers n where n.user_id = case when t.sender = $1 then t.recipient else t.sender end) as other
      from app.texts t
      where t.id > $2 and (t.sender = $1 or (t.recipient = $1 and not t.hidden and not exists (select 1 from app.blocks b where b.blocker = $1 and b.blocked = t.sender)))
      order by t.id desc limit 50`, [u.userId, after]);
  });
  app.post('/api/phone/texts/:id/report', noFlood, async req => {
    const u = need(req), id = parse(z.object({ id: z.coerce.number().int().positive() }), req.params).id;
    await db.query('select app.report_text($1, $2)', [u.userId, id]);
    return ok;
  });
  /* Blocking by number (the block list of the chat is used, so a block works for both). */
  app.post('/api/phone/block', noFlood, async req => {
    const u = need(req), b = parse(z.object({ number: digits }).strict(), req.body);
    await db.query('insert into app.blocks (blocker, blocked) select $1, user_id from app.phone_numbers where digits = $2 and user_id <> $1 on conflict do nothing', [u.userId, b.number]);
    return ok;
  });

  /* Call signalling: offer, answer, ice, hangup, decline. Polled by the other side; each signal is deleted once read. */
  app.post('/api/phone/signal', { config: { rateLimit: { max: 150, timeWindow: '1 minute' } } }, async req => {
    const u = need(req), b = parse(z.object({ to: digits, kind: z.enum(['offer', 'answer', 'ice', 'hangup', 'decline']), data: z.string().max(8000).default('') }).strict(), req.body);
    return { id: (await db.query<{ id: string }>('select app.send_signal($1, $2, $3, $4) as id', [u.userId, b.to, b.kind, b.data])).rows[0].id };
  });
  app.get('/api/phone/signal', { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } }, async req => {
    const u = need(req);
    return all(`delete from app.call_signals s where s.recipient = $1 and s.created_at > now() - interval '2 minutes'
      returning s.id, s.kind, s.data, (select n.digits from app.phone_numbers n where n.user_id = s.sender) as "from"`, [u.userId]);
  });

  /* The right to erase: all texts and signals of the player (the account deletion removes them too, through the foreign keys). */
  app.delete('/api/phone/data', noFlood, async req => {
    const u = need(req);
    await db.query('delete from app.texts where sender = $1 or recipient = $1', [u.userId]);
    await db.query('delete from app.call_signals where sender = $1 or recipient = $1', [u.userId]);
    return ok;
  });
}
