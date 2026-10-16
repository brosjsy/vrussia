/* Accounts: sign-up, confirming the e-mail, logging in and out, sessions, a forgotten password, changing the password, deleting the account.
   Rules that hold everywhere here:
   - Nothing tells a stranger whether an e-mail address has an account: sign-up, "forgot password" and "send the link again" answer the same
     either way, and logging in with an unknown address takes as long as with a wrong password.
   - Links in e-mails carry the token after a '#' (the part of an address that browsers never send to a server or in the Referer header);
     the game reads it and posts it to the server. Each token works once, for a short time, and only its hash is kept.
   - A new session at every log-in (an old cookie is never upgraded); every session ends when the password is reset. */
import type { Db, Queryable } from './db.js';
import type { EmailSender, Templates } from './email.js';
import { checkPassword, cleanToken, dummyHash, hashPassword, needsRehash, newToken, passwordProblem, tokenHash } from './secrets.js';

export class AppError extends Error {
  constructor(readonly status: number, readonly code: string, message?: string) { super(message ?? code); }
}
export interface AuthDeps {
  db: Db; mail: EmailSender; tpl: Templates;
  cfg: { APP_URL: string; SESSION_IDLE_DAYS: number; SESSION_MAX_DAYS: number; VERIFY_TOKEN_HOURS: number; RESET_TOKEN_MINUTES: number; REQUIRE_VERIFIED_EMAIL: boolean };
  /** Problems sending an e-mail are logged, never shown to the person (that would tell whether the address has an account). */
  onMailError?: (e: unknown) => void;
}
export interface Meta { ip?: string; userAgent?: string }
export interface SessionUser { sessionId: string; userId: string; email: string; verified: boolean; username: string | null; adult: boolean }

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;
export const normEmail = (v: unknown): string => {
  const e = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (e.length > 254 || !EMAIL.test(e)) throw new AppError(400, 'bad email');
  return e;
};
const DAY = 86_400_000;
const link = (base: string, key: string, token: string): string => { const u = new URL(base); u.hash = `${key}=${token}`; return u.toString(); };
const utc = (d: Date): string => d.toISOString().replace('T', ' ').slice(0, 16);
const clip = (v: string | undefined, n: number): string | null => (v ? v.slice(0, n) : null);

export class Auth {
  constructor(private readonly d: AuthDeps) {}

  private async event(q: Queryable, userId: string | null, kind: string, meta: Meta = {}): Promise<void> {
    await q.query('insert into app.auth_events (user_id, kind, ip) values ($1, $2, $3)', [userId, kind, clip(meta.ip, 64)]);
  }
  private async mail(name: Parameters<Templates['render']>[0], to: string, vars: Record<string, string>): Promise<void> {
    try { await this.d.mail.send(this.d.tpl.render(name, to, vars)); } catch (e) { this.d.onMailError?.(e); }
  }
  /** A new e-mail token; any older unused token of the same kind for the same person stops working. */
  private async issue(q: Queryable, userId: string, email: string, kind: 'verify' | 'reset'): Promise<string> {
    await q.query('delete from app.email_tokens where user_id = $1 and kind = $2 and used_at is null', [userId, kind]);
    const t = newToken(), ms = kind === 'verify' ? this.d.cfg.VERIFY_TOKEN_HOURS * 3_600_000 : this.d.cfg.RESET_TOKEN_MINUTES * 60_000;
    await q.query('insert into app.email_tokens (user_id, kind, email, token_hash, expires_at) values ($1, $2, $3, $4, $5)', [userId, kind, email, t.hash, new Date(Date.now() + ms)]);
    return t.token;
  }
  /** How many e-mails of a kind went to a person in the last hour (to stop anyone from using the server to flood an inbox). */
  private async recent(q: Queryable, userId: string, kind: string): Promise<number> {
    const r = await q.query<{ n: number }>("select count(*)::int as n from app.auth_events where user_id = $1 and kind = $2 and created_at > now() - interval '1 hour'", [userId, kind]);
    return r.rows[0].n;
  }

  /* ---------- sign-up and the e-mail address ---------- */
  async register(rawEmail: unknown, password: unknown, meta: Meta = {}): Promise<void> {
    const email = normEmail(rawEmail);
    const why = passwordProblem(String(password ?? ''), email); if (why) throw new AppError(400, why);
    const hash = await hashPassword(String(password));                       // made before looking, so both answers take as long
    const out = await this.d.db.tx(async q => {
      const old = await q.query<{ id: string }>('select id from app.users where email = $1', [email]);
      if (old.rows[0]) {
        const id = old.rows[0].id;
        if (await this.recent(q, id, 'signup_exists_mail') >= 3) return null;
        await this.event(q, id, 'signup_exists_mail', meta);
        return { kind: 'exists' as const };
      }
      const u = await q.query<{ id: string }>('insert into app.users (email, password_hash) values ($1, $2) returning id', [email, hash]);
      const id = u.rows[0].id;
      await this.event(q, id, 'signup', meta); await this.event(q, id, 'verify_mail', meta);
      return { kind: 'new' as const, token: await this.issue(q, id, email, 'verify') };
    });
    if (out?.kind === 'new') await this.mail('verify', email, { link: link(this.d.cfg.APP_URL, 'verify', out.token), hours: String(this.d.cfg.VERIFY_TOKEN_HOURS) });
    else if (out?.kind === 'exists') await this.mail('signup-exists', email, { link: link(this.d.cfg.APP_URL, 'forgot', '1') });
  }
  async resendVerification(rawEmail: unknown, meta: Meta = {}): Promise<void> {
    const email = normEmail(rawEmail);
    const token = await this.d.db.tx(async q => {
      const u = await q.query<{ id: string; v: Date | null }>('select id, email_verified_at as v from app.users where email = $1', [email]);
      const row = u.rows[0]; if (!row || row.v) return null;
      if (await this.recent(q, row.id, 'verify_mail') >= 5) return null;
      await this.event(q, row.id, 'verify_mail', meta);
      return this.issue(q, row.id, email, 'verify');
    });
    if (token) await this.mail('verify', email, { link: link(this.d.cfg.APP_URL, 'verify', token), hours: String(this.d.cfg.VERIFY_TOKEN_HOURS) });
  }
  async verifyEmail(raw: unknown, meta: Meta = {}): Promise<void> {
    const token = cleanToken(raw); if (!token) throw new AppError(400, 'bad link');
    await this.d.db.tx(async q => {
      const r = await q.query<{ id: number; user_id: string; email: string }>("select id, user_id, email from app.email_tokens where token_hash = $1 and kind = 'verify' and used_at is null and expires_at > now() for update", [tokenHash(token)]);
      const t = r.rows[0]; if (!t) throw new AppError(400, 'bad link');
      await q.query('update app.email_tokens set used_at = now() where id = $1', [t.id]);
      const u = await q.query('update app.users set email_verified_at = coalesce(email_verified_at, now()) where id = $1 and email = $2', [t.user_id, t.email]);
      if (!u.rowCount) throw new AppError(400, 'bad link');                 // the address changed since the link was sent
      await this.event(q, t.user_id, 'verified', meta);
    });
  }

  /* ---------- logging in and sessions ---------- */
  async login(rawEmail: unknown, password: unknown, meta: Meta = {}, oldToken?: string | null): Promise<{ token: string; user: SessionUser }> {
    const email = normEmail(rawEmail), pw = typeof password === 'string' ? password.slice(0, 256) : '';
    const r = await this.d.db.query<{ id: string; password_hash: string; v: Date | null }>('select id, password_hash, email_verified_at as v from app.users where email = $1', [email]);
    const u = r.rows[0];
    const ok = u ? await checkPassword(u.password_hash, pw) : (await checkPassword(await dummyHash(), pw), false);
    if (!u || !ok) { if (u) await this.event(this.d.db, u.id, 'login_failed', meta); throw new AppError(401, 'invalid login credentials'); }
    if (this.d.cfg.REQUIRE_VERIFIED_EMAIL && !u.v) throw new AppError(403, 'email not confirmed');
    if (needsRehash(u.password_hash)) await this.d.db.query('update app.users set password_hash = $2 where id = $1', [u.id, await hashPassword(pw)]);
    const t = newToken(), now = Date.now();
    const sid = await this.d.db.tx(async q => {
      const old = cleanToken(oldToken); if (old) await q.query('delete from app.sessions where token_hash = $1', [tokenHash(old)]);
      const s = await q.query<{ id: string }>('insert into app.sessions (user_id, token_hash, idle_expires_at, expires_at, ip, user_agent) values ($1, $2, $3, $4, $5, $6) returning id',
        [u.id, t.hash, new Date(now + this.d.cfg.SESSION_IDLE_DAYS * DAY), new Date(now + this.d.cfg.SESSION_MAX_DAYS * DAY), clip(meta.ip, 64), clip(meta.userAgent, 300)]);
      await this.event(q, u.id, 'login', meta);
      return s.rows[0].id;
    });
    const user = await this.userOf(sid);
    return { token: t.token, user: user! };
  }
  private async userOf(sessionId: string): Promise<SessionUser | null> {
    const r = await this.d.db.query<{ sid: string; uid: string; email: string; v: Date | null; username: string | null; adult: boolean | null }>(
      'select s.id as sid, u.id as uid, u.email, u.email_verified_at as v, p.username, p.adult from app.sessions s join app.users u on u.id = s.user_id left join app.profiles p on p.id = u.id where s.id = $1', [sessionId]);
    const x = r.rows[0];
    return x ? { sessionId: x.sid, userId: x.uid, email: x.email, verified: !!x.v, username: x.username, adult: !!x.adult } : null;
  }
  /** The person a session cookie belongs to, or null. A used session lives on (its idle time starts again), up to its absolute end. */
  async sessionUser(raw: unknown): Promise<SessionUser | null> {
    const token = cleanToken(raw); if (!token) return null;
    const r = await this.d.db.query<{ id: string; last: Date }>('select id, last_seen_at as last from app.sessions where token_hash = $1 and idle_expires_at > now() and expires_at > now()', [tokenHash(token)]);
    const s = r.rows[0]; if (!s) return null;
    if (Date.now() - new Date(s.last).getTime() > 60_000)
      await this.d.db.query('update app.sessions set last_seen_at = now(), idle_expires_at = least(expires_at, now() + make_interval(days => $2)) where id = $1', [s.id, this.d.cfg.SESSION_IDLE_DAYS]);
    return this.userOf(s.id);
  }
  async logout(sessionId: string): Promise<void> { await this.d.db.query('delete from app.sessions where id = $1', [sessionId]); }
  async sessions(u: SessionUser): Promise<{ id: string; created_at: Date; last_seen_at: Date; ip: string | null; user_agent: string | null; current: boolean }[]> {
    const r = await this.d.db.query<{ id: string; created_at: Date; last_seen_at: Date; ip: string | null; user_agent: string | null }>(
      'select id, created_at, last_seen_at, ip, user_agent from app.sessions where user_id = $1 and expires_at > now() and idle_expires_at > now() order by last_seen_at desc', [u.userId]);
    return r.rows.map(s => ({ ...s, current: s.id === u.sessionId }));
  }
  /** Ends one of the person's own sessions (somebody else's id simply matches nothing). */
  async endSession(u: SessionUser, id: unknown): Promise<boolean> {
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) return false;
    return (await this.d.db.query('delete from app.sessions where id = $1 and user_id = $2', [id, u.userId])).rowCount > 0;
  }
  async endOtherSessions(u: SessionUser): Promise<number> { return (await this.d.db.query('delete from app.sessions where user_id = $1 and id <> $2', [u.userId, u.sessionId])).rowCount; }

  /* ---------- passwords ---------- */
  async forgot(rawEmail: unknown, meta: Meta = {}): Promise<void> {
    const email = normEmail(rawEmail);
    const token = await this.d.db.tx(async q => {
      const u = await q.query<{ id: string }>('select id from app.users where email = $1', [email]);
      const id = u.rows[0]?.id; if (!id) return null;
      if (await this.recent(q, id, 'reset_mail') >= 5) return null;
      await this.event(q, id, 'reset_mail', meta);
      return this.issue(q, id, email, 'reset');
    });
    if (token) await this.mail('reset', email, { link: link(this.d.cfg.APP_URL, 'reset', token), minutes: String(this.d.cfg.RESET_TOKEN_MINUTES) });
  }
  async reset(raw: unknown, password: unknown, meta: Meta = {}): Promise<void> {
    const token = cleanToken(raw); if (!token) throw new AppError(400, 'bad link');
    const pw = String(password ?? '');
    const peek = await this.d.db.query<{ email: string }>("select u.email from app.email_tokens t join app.users u on u.id = t.user_id where t.token_hash = $1 and t.kind = 'reset' and t.used_at is null and t.expires_at > now()", [tokenHash(token)]);
    if (!peek.rows[0]) throw new AppError(400, 'bad link');
    const why = passwordProblem(pw, peek.rows[0].email); if (why) throw new AppError(400, why);   // a weak password does not use up the link
    const hash = await hashPassword(pw);
    const email = await this.d.db.tx(async q => {
      const r = await q.query<{ id: number; user_id: string; email: string }>("select id, user_id, email from app.email_tokens where token_hash = $1 and kind = 'reset' and used_at is null and expires_at > now() for update", [tokenHash(token)]);
      const t = r.rows[0]; if (!t) throw new AppError(400, 'bad link');
      await q.query('update app.email_tokens set used_at = now() where id = $1', [t.id]);
      await q.query("delete from app.email_tokens where user_id = $1 and kind = 'reset' and used_at is null", [t.user_id]);
      // the link proved the person reads this mailbox, so the address counts as confirmed too
      const u = await q.query<{ email: string }>('update app.users set password_hash = $2, password_changed_at = now(), email_verified_at = case when email = $3 then coalesce(email_verified_at, now()) else email_verified_at end where id = $1 returning email', [t.user_id, hash, t.email]);
      await q.query('delete from app.sessions where user_id = $1', [t.user_id]);
      await this.event(q, t.user_id, 'password_reset', meta);
      return u.rows[0].email;
    });
    await this.mail('password-changed', email, { when: utc(new Date()) });
  }
  async changePassword(u: SessionUser, current: unknown, next: unknown, meta: Meta = {}): Promise<void> {
    const r = await this.d.db.query<{ password_hash: string }>('select password_hash from app.users where id = $1', [u.userId]);
    if (!r.rows[0] || !(await checkPassword(r.rows[0].password_hash, String(current ?? '')))) throw new AppError(401, 'wrong password');
    const why = passwordProblem(String(next ?? ''), u.email); if (why) throw new AppError(400, why);
    const hash = await hashPassword(String(next));
    await this.d.db.tx(async q => {
      await q.query('update app.users set password_hash = $2, password_changed_at = now() where id = $1', [u.userId, hash]);
      await q.query('delete from app.sessions where user_id = $1 and id <> $2', [u.userId, u.sessionId]);     // every other device is logged out
      await q.query("delete from app.email_tokens where user_id = $1 and kind = 'reset' and used_at is null", [u.userId]);
      await this.event(q, u.userId, 'password_changed', meta);
    });
    await this.mail('password-changed', u.email, { when: utc(new Date()) });
  }
  /** Deletes the account and everything stored with it on the server (asks for the password again). Cannot be undone. */
  async deleteAccount(u: SessionUser, password: unknown, meta: Meta = {}): Promise<void> {
    const r = await this.d.db.query<{ password_hash: string }>('select password_hash from app.users where id = $1', [u.userId]);
    if (!r.rows[0] || !(await checkPassword(r.rows[0].password_hash, String(password ?? '')))) throw new AppError(401, 'wrong password');
    await this.d.db.tx(async q => {
      await this.event(q, u.userId, 'account_deleted', meta);
      await q.query('delete from app.users where id = $1', [u.userId]);       // profiles, saves, scores, messages, sessions... go with it
    });
    await this.mail('account-deleted', u.email, { when: utc(new Date()) });
  }
}
