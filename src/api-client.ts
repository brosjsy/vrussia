/* The online part, talking to the game's OWN server (server/ in this repository) instead of Supabase. It offers the same methods as the
   Supabase client in cloud.ts, so the Online screen and the automatic save work with either; the game uses this one when it was built with
   VITE_API_URL. Differences that matter:
   - The session is an HttpOnly cookie set by the server: no token is ever visible to the page's scripts or kept in localStorage. This device
     keeps only who is logged in (e-mail, public name) to draw the screen; the server checks the cookie on every request.
   - Sign-up sends a confirmation e-mail; the public name chosen at sign-up is taken at the first log-in.
   - Forgotten password, confirming the e-mail, changing the password and the list of sessions are new; deleting the account asks for the password. */
import type { State } from './engine';
import type { KV } from './store';
import { explain, SESSION_KEY } from './cloud';
import type { Result, Session, ScoreRow, ChatMessage, Present, PlayerAd, PublicHome, HomeDesign, Note, Gift, Friend, BestHome, Talk, Announcement, CloudConfig } from './cloud';
import { isRude, hasContact } from './rude';
const CONTACTS = 'No phone numbers, messenger names, @handles or e-mail addresses: players talk inside the game, where everyone is protected.';

const USERNAME = /^[a-z0-9_]{3,20}$/;
const PENDING = 'vrussia_pending_name';
export const PASSWORD_MIN = 10;

/** The address of the game's own server, or null (then there is no such online part). https only, except a local development server. */
export function apiFromEnv(env: Record<string, unknown> = (import.meta as unknown as { env?: Record<string, unknown> }).env ?? {}): string | null {
  const url = String(env.VITE_API_URL ?? '').replace(/\/+$/, '');
  return /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(url) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url) ? url : null;
}

/** Plain words for the server's answers that the Supabase table in cloud.ts does not know. */
export function explainApi(code: string): string {
  const own: Record<string, string> = {
    'password too short': `The password needs at least ${PASSWORD_MIN} characters. A few words make a good one.`, 'password too long': 'That password is too long.',
    'password too common': 'That password is too easy to guess. Try a few unrelated words.', 'password like email': 'The password cannot be your e-mail address.',
    'bad email': 'That does not look like an e-mail address.', 'bad link': 'This link does not work any more (it was used, it expired, or a newer one was sent). Ask for a new one.',
    'wrong password': 'That is not your current password.', 'invalid input': 'Something in the form is not right.', 'origin not allowed': 'This page is not allowed to use the online service.',
    'server error': 'The online service had a problem. Try again later.', 'no profile': 'Choose your public name first.', 'not signed in': 'Log in first.', 'email not confirmed': 'Confirm your e-mail first: open the link we sent you.',
  };
  return own[code] ?? explain(code);
}

/** An advert of a player on a place in a city (advertising spaces); views counts the real players who have seen it. */
export interface Advert { id: number; username: string; city: string; spot: string; head: string; line: string; color: string; icon: string; expires_at: string; views: number | string }
export interface Challenge { id: string; chapter: number; sort: number; kind: 'event' | 'coop' | 'city'; target: number; weekly: boolean; reward: number; title_en: string; title_ru: string; text_en: string; text_ru: string; have: number; done: boolean; claimed: boolean; joined: boolean }
export interface Chapter { id: number; title_en: string; title_ru: string; text_en: string; text_ru: string }
export interface Coop { id: number; challenge_id: string; status: 'invited' | 'accepted' | 'done'; inviter_done: boolean; invitee_done: boolean; mine: boolean; other: string; other_name: string }

/** Today's table of the Kitchen's online challenge. */
export interface CookTable { top: { username: string; score: number; stars: number }[]; mine: { score: number; place: number } | null; count: number }
export class ApiCloud {
  readonly cfg: CloudConfig;
  private readonly f: typeof fetch;
  private readonly kv: KV | null;
  private sess: Session | null = null;

  constructor(private readonly base: string, deps: { fetch?: typeof fetch; kv?: KV | null } = {}) {
    this.cfg = { url: base, key: '' };
    this.f = deps.fetch ?? fetch.bind(globalThis);
    this.kv = deps.kv === undefined ? (typeof localStorage === 'undefined' ? null : localStorage) : deps.kv;
    try { const raw = JSON.parse(this.kv?.getItem(SESSION_KEY) ?? 'null') as Session | null; if (raw && typeof raw.userId === 'string' && typeof raw.email === 'string') this.sess = { ...raw, access: '', refresh: '' }; } catch { this.sess = null; }
  }
  session(): Session | null { return this.sess; }
  private keep(s: Session | null): void { this.sess = s; try { if (s) this.kv?.setItem(SESSION_KEY, JSON.stringify({ ...s, access: '', refresh: '' })); else this.kv?.removeItem(SESSION_KEY); } catch { /* the screen then forgets on reload; the cookie still works */ } }

  private async call<T>(method: string, path: string, body?: unknown): Promise<Result<T>> {
    try {
      const res = await this.f(this.base + path, { method, credentials: 'include', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      const json = await res.json().catch(() => null) as unknown;
      if (res.ok) return { ok: true, msg: '', data: json as T };
      const code = String((json as { error?: string } | null)?.error ?? res.status);
      if (res.status === 401 && code === 'not signed in') this.keep(null);       // the cookie ran out: the screen shows the log-in form again
      return { ok: false, msg: res.status === 429 ? explain('rate limit') : explainApi(code) };
    } catch { return { ok: false, msg: 'No connection. The game goes on offline.' }; }
  }
  private adopt(me: { id: string; email: string; username: string | null; adult: boolean }): void {
    this.keep({ access: '', refresh: '', expires: 0, userId: me.id, email: me.email, username: me.username, adult: me.adult });
  }
  /** Asks the server who is logged in (after a reload, or a link from an e-mail). */
  async restore(): Promise<Session | null> {
    const r = await this.call<{ id: string; email: string; username: string | null; adult: boolean }>('GET', '/api/auth/me');
    if (r.ok && r.data) this.adopt(r.data); else if (!r.ok && r.msg !== 'No connection. The game goes on offline.') this.keep(null);
    return this.sess;
  }

  /* ---------- accounts ---------- */
  async signUp(email: string, password: string, username: string, adult: boolean, origin?: { country: string; region: string }): Promise<Result> {
    const name = username.trim().toLowerCase();
    if (!USERNAME.test(name)) return { ok: false, msg: explain('bad username') };
    if (password.length < PASSWORD_MIN) return { ok: false, msg: explainApi('password too short') };
    const r = await this.call('POST', '/api/auth/register', { email: email.trim(), password });
    if (!r.ok) return { ok: false, msg: r.msg };
    try { this.kv?.setItem(PENDING, JSON.stringify({ name, adult, ...(origin ?? {}) })); } catch { /* chosen again after logging in */ }
    return { ok: true, msg: 'Almost there: open the link in the e-mail we sent you, then log in. (No e-mail? Check the spam folder.)' };
  }
  async signIn(email: string, password: string): Promise<Result> {
    const r = await this.call<{ id: string; email: string; username: string | null; adult: boolean }>('POST', '/api/auth/login', { email: email.trim(), password });
    if (!r.ok || !r.data) return { ok: false, msg: r.msg };
    this.adopt(r.data);
    if (!r.data.username) {
      let pending: { name: string; adult: boolean; country?: string; region?: string } | null = null; try { pending = JSON.parse(this.kv?.getItem(PENDING) ?? 'null'); } catch { pending = null; }
      if (pending && USERNAME.test(pending.name)) { const c = await this.claim(pending.name, !!pending.adult); if (c.ok && pending.country) await this.setOrigin(pending.country, pending.region ?? 'Europe'); try { this.kv?.removeItem(PENDING); } catch { /* ignore */ } if (c.ok) return { ok: true, msg: `Welcome, @${pending.name}.` }; }
      return { ok: true, msg: 'Logged in. Choose your public name.' };
    }
    return { ok: true, msg: `Welcome back, @${r.data.username}.` };
  }
  async claim(username: string, adult: boolean): Promise<Result> {
    const name = username.trim().toLowerCase(); if (!USERNAME.test(name)) return { ok: false, msg: explain('bad username') };
    const r = await this.call<{ username: string; adult: boolean }>('POST', '/api/profile', { username: name, adult });
    if (!r.ok) return { ok: false, msg: r.msg };
    if (this.sess) this.keep({ ...this.sess, username: r.data?.username ?? name, adult: r.data?.adult ?? adult });
    return { ok: true, msg: `Your name is @${r.data?.username ?? name}.` };
  }
  async signOut(): Promise<Result> { await this.call('POST', '/api/auth/logout', {}); this.keep(null); return { ok: true, msg: 'Logged out.' }; }
  async verifyEmail(token: string): Promise<Result> { const r = await this.call('POST', '/api/auth/verify', { token }); return r.ok ? { ok: true, msg: 'Your e-mail is confirmed. You can log in now.' } : { ok: false, msg: r.msg }; }
  async resendVerification(email: string): Promise<Result> { const r = await this.call('POST', '/api/auth/resend', { email: email.trim() }); return r.ok ? { ok: true, msg: 'If that address has an account waiting for confirmation, a new link is on its way.' } : { ok: false, msg: r.msg }; }
  async forgot(email: string): Promise<Result> { const r = await this.call('POST', '/api/auth/forgot', { email: email.trim() }); return r.ok ? { ok: true, msg: 'If that address has an account, an e-mail with a link is on its way. The link works for 30 minutes.' } : { ok: false, msg: r.msg }; }
  async resetPassword(token: string, password: string): Promise<Result> {
    if (password.length < PASSWORD_MIN) return { ok: false, msg: explainApi('password too short') };
    const r = await this.call('POST', '/api/auth/reset', { token, password }); if (r.ok) this.keep(null);
    return r.ok ? { ok: true, msg: 'Your password is changed and every device was logged out. Log in with the new password.' } : { ok: false, msg: r.msg };
  }
  async changePassword(current: string, next: string): Promise<Result> { const r = await this.call('POST', '/api/auth/password', { current, next }); return r.ok ? { ok: true, msg: 'Password changed. Your other devices were logged out.' } : { ok: false, msg: r.msg }; }
  async endOtherSessions(): Promise<Result<number>> { const r = await this.call<{ ended: number }>('POST', '/api/auth/sessions/end-others', {}); return r.ok ? { ok: true, msg: `Logged out on ${r.data?.ended ?? 0} other device(s).`, data: r.data?.ended ?? 0 } : { ok: false, msg: r.msg }; }
  async deleteAccount(password = ''): Promise<Result> {
    if (!password) return { ok: false, msg: 'Type your password to delete the account.' };
    const r = await this.call('POST', '/api/auth/delete', { password }); if (!r.ok) return { ok: false, msg: r.msg };
    this.keep(null); return { ok: true, msg: 'Your account and everything stored with it are deleted.' };
  }

  /* ---------- the game ---------- */
  async save(s: State): Promise<Result> { const r = await this.call('PUT', '/api/save', { data: s }); return r.ok ? { ok: true, msg: 'Saved online.' } : { ok: false, msg: r.msg }; }
  async load(): Promise<Result<{ state: State; updated_at: string } | null>> {
    const r = await this.call<{ data: State; updated_at: string } | null>('GET', '/api/save'); if (!r.ok) return { ok: false, msg: r.msg };
    return { ok: true, msg: r.data ? 'Loaded your latest saved game.' : 'No saved game online yet.', data: r.data ? { state: r.data.data, updated_at: r.data.updated_at } : null };
  }
  async submitScore(origin: string, city: string, ending: string, score: number, days: number): Promise<Result<number>> { const r = await this.call<{ id: number }>('POST', '/api/scores', { origin, city, ending, score: Math.round(score), days: Math.max(1, Math.round(days)) }); return r.ok ? { ok: true, msg: '', data: r.data?.id } : { ok: false, msg: r.msg }; }
  top(limit = 20): Promise<Result<ScoreRow[]>> { return this.call('GET', `/api/scores?limit=${Math.max(1, Math.min(100, Math.round(limit)))}`); }
  heartbeat(city: string, place: string): Promise<Result> { return this.call('POST', '/api/presence', { city, place }); }
  async online(): Promise<Result<number>> { const r = await this.call<{ count: number }>('GET', '/api/presence/count'); return r.ok ? { ok: true, msg: '', data: Number(r.data?.count) || 0 } : { ok: false, msg: r.msg }; }
  here(city: string): Promise<Result<Present[]>> { return this.call('GET', `/api/presence?city=${encodeURIComponent(city)}`); }
  messages(room: string, afterId = 0): Promise<Result<ChatMessage[]>> { return this.call('GET', `/api/messages?room=${encodeURIComponent(room)}&after=${Math.max(0, Math.round(afterId))}`); }
  async send(room: string, body: string): Promise<Result<number>> {
    const text = body.trim(); if (text.length < 1 || text.length > 280) return { ok: false, msg: explain('bad length') };
    if (isRude(text)) return { ok: false, msg: explain('language') };
    if (hasContact(text)) return { ok: false, msg: CONTACTS };
    const r = await this.call<{ id: number }>('POST', '/api/messages', { room, body: text }); return r.ok ? { ok: true, msg: '', data: r.data?.id } : { ok: false, msg: r.msg };
  }
  async block(userId: string): Promise<Result> { const r = await this.call('POST', '/api/blocks', { user: userId }); return r.ok ? { ok: true, msg: 'Blocked. You will not see their messages.' } : { ok: false, msg: r.msg }; }
  blocks(): Promise<Result<{ id: string; username: string }[]>> { return this.call('GET', '/api/blocks'); }
  async unblock(userId: string): Promise<Result> { const r = await this.call('DELETE', `/api/blocks/${encodeURIComponent(userId)}`); return r.ok ? { ok: true, msg: 'Unblocked. You can write to each other again.' } : { ok: false, msg: r.msg }; }
  async report(messageId: number, reason: string): Promise<Result> {
    const text = reason.trim().slice(0, 200); if (text.length < 3) return { ok: false, msg: 'Say in a few words what is wrong.' };
    const r = await this.call('POST', '/api/reports', { message: messageId, reason: text }); return r.ok ? { ok: true, msg: 'Reported. Thank you.' } : { ok: false, msg: r.msg };
  }
  castVote(week: number, city: string, candidate: string): Promise<Result> { return this.call('POST', '/api/votes', { week, city, candidate }); }
  tally(week: number, city: string): Promise<Result<{ candidate: string; votes: number }[]>> { return this.call('GET', `/api/votes?week=${week}&city=${encodeURIComponent(city)}`); }
  async bump(key: 'visits' | 'daily_found'): Promise<Result<number>> { const r = await this.call<{ value: number }>('POST', `/api/counters/${key}`, {}); return r.ok ? { ok: true, msg: '', data: r.data?.value } : { ok: false, msg: r.msg }; }
  counters(): Promise<Result<{ key: string; value: number }[]>> { return this.call('GET', '/api/counters'); }
  announcements(): Promise<Result<Announcement[]>> { return this.call('GET', '/api/announcements'); }
  ads(city: string): Promise<Result<PlayerAd[]>> { return this.call('GET', `/api/ads?city=${encodeURIComponent(city)}`); }
  async postAd(city: string, kind: PlayerAd['kind'], title: string, body: string, price: number): Promise<Result<number>> {
    const t = title.trim(); if (t.length < 4 || t.length > 60) return { ok: false, msg: 'Write a title of 4 to 60 characters.' };
    if (!(price >= 0)) return { ok: false, msg: 'The price cannot be below zero.' };
    if (hasContact(t) || hasContact(body)) return { ok: false, msg: 'No phone numbers or messenger names: players answer through the private chat of the game.' };
    const r = await this.call<{ id: number }>('POST', '/api/ads', { city, kind, title: t, body: body.trim().slice(0, 280), price: Math.round(price) || 0 }); return r.ok ? { ok: true, msg: '', data: r.data?.id } : { ok: false, msg: r.msg };
  }
  async removeAd(id: number): Promise<Result> { const r = await this.call<{ ok: boolean }>('DELETE', `/api/ads/${Math.round(id)}`); return r.ok && r.data?.ok ? { ok: true, msg: 'The ad is taken down.' } : { ok: false, msg: r.ok ? 'That ad is not yours or is gone.' : r.msg }; }
  async reportAd(id: number): Promise<Result> { const r = await this.call('POST', `/api/ads/${Math.round(id)}/report`, {}); return r.ok ? { ok: true, msg: 'Reported. Thank you.' } : { ok: false, msg: r.msg }; }
  talks(): Promise<Result<Talk[]>> { return this.call('GET', '/api/talks'); }
  async follow(userId: string): Promise<Result> { const r = await this.call('POST', '/api/follows', { user: userId }); return r.ok ? { ok: true, msg: 'You follow them now.' } : { ok: false, msg: r.msg }; }
  async unfollow(userId: string): Promise<Result> { const r = await this.call('DELETE', `/api/follows/${encodeURIComponent(userId)}`); return r.ok ? { ok: true, msg: 'You no longer follow them.' } : { ok: false, msg: r.msg }; }
  following(): Promise<Result<{ follower: string; followed: string }[]>> { return this.call('GET', '/api/follows'); }
  publishHome(city: string, dwelling: string, design: HomeDesign, stars: number): Promise<Result> { return this.call('PUT', '/api/home', { city, dwelling, design, stars: Math.max(0, Math.min(400, Math.round(stars))) }); }
  home(userId: string): Promise<Result<PublicHome | null>> { return this.call('GET', `/api/homes/${encodeURIComponent(userId)}`); }
  guestbook(owner: string): Promise<Result<Note[]>> { return this.call('GET', `/api/guestbook/${encodeURIComponent(owner)}`); }
  async signGuestbook(owner: string, body: string, gift: Gift | null): Promise<Result<number>> {
    const t = body.trim(); if (t.length < 1 || t.length > 200) return { ok: false, msg: 'A note has 1 to 200 characters.' };
    if (isRude(t)) return { ok: false, msg: explain('language') };
    if (hasContact(t)) return { ok: false, msg: CONTACTS };
    const r = await this.call<{ id: number }>('POST', `/api/guestbook/${encodeURIComponent(owner)}`, { body: t, gift }); return r.ok ? { ok: true, msg: '', data: r.data?.id } : { ok: false, msg: r.msg };
  }
  /** The Kitchen's online challenge (server/migrations/0007_cooking.sql): today's table for a dish, sending a score. */
  cookToday(dish: string): Promise<Result<CookTable>> { return this.call('GET', `/api/cooking/today?dish=${encodeURIComponent(dish)}`); }
  async sendCookScore(dish: string, score: number, stars: number): Promise<Result<number>> {
    const r = await this.call<{ best: number }>('POST', '/api/cooking/today', { dish, score: Math.round(score), stars }); return r.ok ? { ok: true, msg: '', data: r.data?.best } : { ok: false, msg: r.msg };
  }
  /** Advertising spaces (server/migrations/0006_adspace.sql): the adverts of players up in a city, mounting one, taking it down, reporting. */
  adverts(city: string): Promise<Result<Advert[]>> { return this.call('GET', `/api/adverts?city=${encodeURIComponent(city)}`); }
  myAdverts(): Promise<Result<{ id: number; city: string; spot: string; head: string; views: number }[]>> { return this.call('GET', '/api/adverts/mine'); }
  async mountAdvert(a: { city: string; spot: string; head: string; line: string; color: string; icon: string; days: number }): Promise<Result<number>> {
    const r = await this.call<{ id: number }>('POST', '/api/adverts', a); return r.ok ? { ok: true, msg: '', data: r.data?.id } : { ok: false, msg: r.msg };
  }
  async removeAdvert(id: number): Promise<Result> { const r = await this.call<{ ok: boolean }>('DELETE', `/api/adverts/${Math.round(id)}`); return r.ok && r.data?.ok ? { ok: true, msg: 'Taken down online too.' } : { ok: false, msg: r.ok ? 'That advert is not yours or is gone.' : r.msg }; }
  async reportAdvert(id: number): Promise<Result> { const r = await this.call('POST', `/api/adverts/${Math.round(id)}/report`, {}); return r.ok ? { ok: true, msg: 'Reported. Thank you.' } : { ok: false, msg: r.msg }; }
  myAds(): Promise<Result<{ id: number; city: string; kind: string; title: string; created_at: string }[]>> { return this.call('GET', '/api/ads/mine'); }
  async myHomeVote(): Promise<Result<string | null>> { const r = await this.call<{ owner: string | null }>('GET', '/api/homes/my-vote'); return r.ok ? { ok: true, msg: '', data: r.data?.owner ?? null } : { ok: false, msg: r.msg }; }
  /* ---------- challenges with other players ---------- */
  challenges(city: string): Promise<Result<{ chapters: Chapter[]; challenges: Challenge[] }>> { return this.call('GET', `/api/challenges?city=${encodeURIComponent(city)}`); }
  async claimChallenge(id: string, city: string): Promise<Result<number>> { const r = await this.call<{ reward: number }>('POST', `/api/challenges/${encodeURIComponent(id)}/claim`, { city }); return r.ok ? { ok: true, msg: '', data: r.data?.reward ?? 0 } : { ok: false, msg: r.msg }; }
  async joinCity(id: string, city: string): Promise<Result<number>> { const r = await this.call<{ count: number }>('POST', `/api/challenges/${encodeURIComponent(id)}/join`, { city }); return r.ok ? { ok: true, msg: '', data: r.data?.count ?? 0 } : { ok: false, msg: r.msg }; }
  coops(): Promise<Result<Coop[]>> { return this.call('GET', '/api/coops'); }
  async coopInvite(friend: string, challenge: string): Promise<Result> { const r = await this.call('POST', '/api/coops', { friend, challenge }); return r.ok ? { ok: true, msg: 'Invitation sent.' } : { ok: false, msg: r.msg }; }
  coopAnswer(id: number, yes: boolean): Promise<Result> { return this.call('POST', `/api/coops/${id}/answer`, { yes }); }
  async coopDone(id: number): Promise<Result<string>> { const r = await this.call<{ status: string }>('POST', `/api/coops/${id}/done`, {}); return r.ok ? { ok: true, msg: '', data: r.data?.status } : { ok: false, msg: r.msg }; }
  setOrigin(country: string, region: string): Promise<Result> { return this.call('POST', '/api/profile/origin', { country, region }); }
  voteHome(owner: string): Promise<Result> { return this.call('POST', `/api/homes/${encodeURIComponent(owner)}/vote`, {}); }
  bestHomes(): Promise<Result<BestHome[]>> { return this.call('GET', '/api/homes/best'); }
  friends(): Promise<Result<Friend[]>> { return this.call('GET', '/api/friends'); }
  findPlayers(name: string): Promise<Result<{ id: string; username: string }[]>> { const q = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''); if (q.length < 2) return Promise.resolve({ ok: true, msg: '', data: [] }); return this.call('GET', `/api/players?q=${encodeURIComponent(q)}`); }
}
