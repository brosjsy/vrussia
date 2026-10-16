/* The online part of the game, seen from the browser: accounts, the saved game kept on the server, the leaderboard, who is online, chat between real
   players, the real votes of the weekly election, shared counters and the owner's announcements. It talks to a Supabase project (see
   supabase/migrations and docs/BACKEND.md) with plain web requests, so no extra library is shipped. If the game was built without the two settings
   (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) there is no online part at all and the game stays fully offline.
   What is kept on this device: the session (two tokens, the e-mail and the public name). The password is sent once to sign in and is never kept.
   Everything that needs the network goes through one injected `fetch`, so the whole file is tested without a server. */
import type { State } from './engine';
import type { KV } from './store';

import { isRude } from './rude';
import { ApiCloud, apiFromEnv } from './api-client';
export interface CloudConfig { url: string; key: string }
export interface Session { access: string; refresh: string; expires: number; userId: string; email: string; username: string | null; adult: boolean }
export interface Result<T = undefined> { ok: boolean; msg: string; data?: T }
export interface ScoreRow { username: string; origin: string; city: string; ending: string; score: number; days: number; created_at: string }
export interface ChatMessage { id: number; room: string; sender: string; username: string; body: string; created_at: string }
export interface Present { username: string; city: string; place: string }
export interface PlayerAd { id: number; player_id: string; username: string; city: string; kind: 'room' | 'job' | 'sell' | 'service' | 'lost'; title: string; body: string; price: number; created_at: string }
export interface PublicHome { player_id: string; username: string; city: string; dwelling: string; design: HomeDesign; stars: number; updated_at: string }
export interface HomeDesign { placed: { id: string; i: number; j: number; rot: 0 | 1 }[]; wall?: string; floor?: string; w?: number; d?: number }
export interface Note { id: number; owner: string; author: string; author_name: string; body: string; gift: Gift | null; created_at: string }
export type Gift = 'flowers' | 'cake' | 'tea' | 'chocolates';
export interface Friend { id: string; username: string; mutual: boolean; online: boolean; city: string | null; place: string | null }
export interface BestHome { owner: string; username: string; city: string; dwelling: string; stars: number; votes: number }
export interface Talk { room: string; other: string; other_name: string; last_body: string; last_at: string }
export interface Announcement { id: number; title: string; body: string; created_at: string }
export interface CloudDeps { fetch?: typeof fetch; kv?: KV | null; now?: () => number }

export const SESSION_KEY = 'vrussia_session';
const USERNAME = /^[a-z0-9_]{3,20}$/;

/** The settings the game was built with, or null when there is no online part. */
export function configFromEnv(env: Record<string, unknown> = (import.meta as unknown as { env?: Record<string, unknown> }).env ?? {}): CloudConfig | null {
  const url = String(env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, ''), key = String(env.VITE_SUPABASE_ANON_KEY ?? '');
  return /^https:\/\/[a-z0-9.-]+$/i.test(url) && key.length > 20 ? { url, key } : null;
}
/** The chat room of a place in a city, and of two players. */
export const placeRoom = (city: string, place: string): string => `place:${city}:${place}`;
export const directRoom = (a: string, b: string): string => `direct:${a < b ? a : b}:${a < b ? b : a}`;

/** Plain words for what the server may answer. */
export function explain(raw: string): string {
  const t = raw.toLowerCase();
  const table: [RegExp, string][] = [
    [/username taken|profiles_username_key/, 'That name is taken. Choose another.'], [/bad username/, 'A name has 3 to 20 small letters, digits or underscores.'],
    [/invalid login credentials/, 'Wrong e-mail or password.'], [/already registered|already been registered/, 'This e-mail already has an account. Log in instead.'],
    [/email not confirmed/, 'Confirm your e-mail first: open the link we sent you.'], [/password should be at least|weak password/, 'The password is too short.'],
    [/slow down/, 'You are writing too fast. Wait a little.'], [/adults/, 'Chat is only for players who are 18 or older.'], [/blocked/, 'You cannot write to this player.'],
    [/language/, 'Please keep it polite: that word is not allowed.'], [/your own home/, 'That is your own home.'], [/no such home/, 'This player has not shown their home yet.'], [/too many notes/, 'Enough notes for today.'],
    [/too many ads/, 'You have enough ads up for now. Take one down or wait.'], [/daily limit/, 'That is enough messages for today.'],
    [/already voted/, 'You have already voted this week.'], [/too many scores/, 'Too many results today. Try again tomorrow.'], [/score not possible/, 'This result could not be accepted.'],
    [/not signed in|jwt|permission denied|401/, 'Log in first.'], [/bad length/, 'A message has 1 to 280 characters.'], [/rate limit|429/, 'Too many requests. Wait a minute.'],
  ];
  for (const [re, msg] of table) if (re.test(t)) return msg;
  return 'The online service did not accept that. Try again later.';
}

export class Cloud {
  private readonly f: typeof fetch;
  private readonly kv: KV | null;
  private readonly now: () => number;
  private sess: Session | null = null;

  constructor(readonly cfg: CloudConfig, deps: CloudDeps = {}) {
    this.f = deps.fetch ?? fetch.bind(globalThis);
    this.kv = deps.kv === undefined ? (typeof localStorage === 'undefined' ? null : localStorage) : deps.kv;
    this.now = deps.now ?? (() => Date.now());
    try { const raw = JSON.parse(this.kv?.getItem(SESSION_KEY) ?? 'null') as Session | null; if (raw && typeof raw.access === 'string' && typeof raw.refresh === 'string' && typeof raw.userId === 'string') this.sess = raw; } catch { this.sess = null; }
  }

  /** Who is signed in on this device (null when nobody). */
  session(): Session | null { return this.sess; }
  private keep(s: Session | null): void { this.sess = s; try { if (s) this.kv?.setItem(SESSION_KEY, JSON.stringify(s)); else this.kv?.removeItem(SESSION_KEY); } catch { /* the session then lasts until the page closes */ } }

  private async call(path: string, init: { method?: string; body?: unknown; auth?: boolean; headers?: Record<string, string> } = {}): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
    const headers: Record<string, string> = { apikey: this.cfg.key, 'Content-Type': 'application/json', ...(init.headers ?? {}) };
    if (init.auth !== false) headers.Authorization = `Bearer ${this.sess?.access ?? this.cfg.key}`;
    try {
      const res = await this.f(this.cfg.url + path, { method: init.method ?? (init.body === undefined ? 'GET' : 'POST'), headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
      const text = await res.text(); let json: unknown = null; try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      return { ok: res.ok, status: res.status, json, text };
    } catch { return { ok: false, status: 0, json: null, text: 'network' }; }
  }
  private fail<T>(r: { status: number; json: unknown; text: string }): Result<T> {
    if (r.status === 0) return { ok: false, msg: 'No connection. The game goes on offline.' };
    const j = (r.json ?? {}) as Record<string, unknown>;
    return { ok: false, msg: explain(String(j.message ?? j.msg ?? j.error_description ?? j.error ?? r.text ?? r.status) + ' ' + r.status) };
  }
  /** Before a request that needs the player: a fresh token when the old one is about to run out. */
  private async fresh(): Promise<boolean> {
    if (!this.sess) return false;
    if (this.now() < this.sess.expires - 60_000) return true;
    const r = await this.call('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: this.sess.refresh }, auth: false });
    if (!r.ok) { if (r.status !== 0) this.keep(null); return false; }
    const j = r.json as { access_token: string; refresh_token: string; expires_in: number };
    this.keep({ ...this.sess, access: j.access_token, refresh: j.refresh_token, expires: this.now() + j.expires_in * 1000 });
    return true;
  }
  private async rpc<T>(fn: string, args: Record<string, unknown>, needPlayer = true): Promise<Result<T>> {
    if (needPlayer && !(await this.fresh())) return { ok: false, msg: 'Log in first.' };
    const r = await this.call(`/rest/v1/rpc/${fn}`, { body: args });
    return r.ok ? { ok: true, msg: '', data: r.json as T } : this.fail<T>(r);
  }
  private async rows<T>(query: string, needPlayer = false): Promise<Result<T[]>> {
    if (needPlayer && !(await this.fresh())) return { ok: false, msg: 'Log in first.' };
    if (!needPlayer && this.sess) await this.fresh();
    const r = await this.call(`/rest/v1/${query}`);
    return r.ok && Array.isArray(r.json) ? { ok: true, msg: '', data: r.json as T[] } : this.fail<T[]>(r);
  }

  /* ---------- accounts ---------- */
  private async adopt(j: { access_token: string; refresh_token: string; expires_in: number; user: { id: string; email?: string } }): Promise<void> {
    this.keep({ access: j.access_token, refresh: j.refresh_token, expires: this.now() + j.expires_in * 1000, userId: j.user.id, email: j.user.email ?? '', username: null, adult: false });
    const p = await this.rows<{ username: string; adult: boolean }>(`profiles?select=username,adult&id=eq.${j.user.id}`);
    if (p.ok && p.data && p.data[0] && this.sess) this.keep({ ...this.sess, username: p.data[0].username, adult: p.data[0].adult });
  }
  /** Makes an account. If the project asks for a confirmed e-mail, the player is told to open the link and log in afterwards. */
  async signUp(email: string, password: string, username: string, adult: boolean, _origin?: { country: string; region: string }): Promise<Result> {
    const name = username.trim().toLowerCase();
    if (!USERNAME.test(name)) return { ok: false, msg: explain('bad username') };
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return { ok: false, msg: 'That does not look like an e-mail address.' };
    if (password.length < 8) return { ok: false, msg: 'The password needs at least 8 characters.' };
    const r = await this.call('/auth/v1/signup', { body: { email: email.trim(), password, data: { username: name, adult } }, auth: false });
    if (!r.ok) return this.fail(r);
    const j = r.json as { access_token?: string; refresh_token?: string; expires_in?: number; user?: { id: string; email?: string } };
    if (!j.access_token || !j.user) return { ok: true, msg: 'Account made. Open the link in the e-mail we sent, then log in.' };
    await this.adopt(j as Parameters<Cloud['adopt']>[0]);
    const c = await this.claim(name, adult); return c.ok ? { ok: true, msg: `Welcome, @${name}.` } : c;
  }
  async signIn(email: string, password: string): Promise<Result> {
    const r = await this.call('/auth/v1/token?grant_type=password', { body: { email: email.trim(), password }, auth: false });
    if (!r.ok) return this.fail(r);
    await this.adopt(r.json as Parameters<Cloud['adopt']>[0]);
    return { ok: true, msg: this.sess?.username ? `Welcome back, @${this.sess.username}.` : 'Logged in. Choose your public name.' };
  }
  /** Takes the public name (needed once, after the first log-in). */
  async claim(username: string, adult: boolean): Promise<Result> {
    const name = username.trim().toLowerCase(); if (!USERNAME.test(name)) return { ok: false, msg: explain('bad username') };
    const r = await this.rpc<{ username: string; adult: boolean }>('claim_profile', { p_username: name, p_adult: adult });
    if (!r.ok) return { ok: false, msg: r.msg };
    if (this.sess) this.keep({ ...this.sess, username: r.data?.username ?? name, adult: r.data?.adult ?? adult });
    return { ok: true, msg: `Your name is @${name}.` };
  }
  async signOut(): Promise<Result> {
    if (this.sess) await this.call('/auth/v1/logout', { method: 'POST', body: {} });
    this.keep(null); return { ok: true, msg: 'Logged out.' };
  }

  /* ---------- the saved game ---------- */
  async save(s: State): Promise<Result> {
    if (!(await this.fresh()) || !this.sess) return { ok: false, msg: 'Log in first.' };
    const r = await this.call('/rest/v1/saves?on_conflict=player_id', { body: { player_id: this.sess.userId, data: s, version: s.version, day: Math.max(0, s.day), updated_at: new Date(this.now()).toISOString() }, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
    return r.ok ? { ok: true, msg: 'Saved online.' } : this.fail(r);
  }
  async load(): Promise<Result<{ state: State; updated_at: string } | null>> {
    const r = await this.rows<{ data: State; updated_at: string }>(`saves?select=data,updated_at&limit=1`, true);
    if (!r.ok) return { ok: false, msg: r.msg };
    const row = r.data?.[0]; return { ok: true, msg: row ? 'Loaded your latest saved game.' : 'No saved game online yet.', data: row ? { state: row.data, updated_at: row.updated_at } : null };
  }

  /* ---------- the leaderboard ---------- */
  submitScore(origin: string, city: string, ending: string, score: number, days: number): Promise<Result<number>> {
    return this.rpc<number>('submit_score', { p_origin: origin, p_city: city, p_ending: ending, p_score: Math.round(score), p_days: Math.max(1, Math.round(days)) });
  }
  top(limit = 20): Promise<Result<ScoreRow[]>> { return this.rows<ScoreRow>(`scores?select=username,origin,city,ending,score,days,created_at&order=score.desc,created_at.asc&limit=${Math.max(1, Math.min(100, Math.round(limit)))}`); }

  /* ---------- who is online ---------- */
  heartbeat(city: string, place: string): Promise<Result> { return this.rpc('heartbeat', { p_city: city, p_place: place }); }
  async online(): Promise<Result<number>> { const r = await this.rpc<number>('online_count', {}, false); return r.ok ? { ok: true, msg: '', data: Number(r.data) || 0 } : r; }
  here(city: string): Promise<Result<Present[]>> { return this.rows<Present>(`presence?select=username,city,place&city=eq.${encodeURIComponent(city)}&limit=200`, true); }

  /* ---------- chat ---------- */
  messages(room: string, afterId = 0): Promise<Result<ChatMessage[]>> { return this.rows<ChatMessage>(`messages?select=id,room,sender,username,body,created_at&room=eq.${encodeURIComponent(room)}&id=gt.${Math.max(0, Math.round(afterId))}&order=id.desc&limit=50`, true); }
  send(room: string, body: string): Promise<Result<number>> {
    const text = body.trim(); if (text.length < 1 || text.length > 280) return Promise.resolve({ ok: false, msg: explain('bad length') });
    if (isRude(text)) return Promise.resolve({ ok: false, msg: explain('language') });
    return this.rpc<number>('send_message', { p_room: room, p_body: text });
  }
  async block(userId: string): Promise<Result> {
    if (!(await this.fresh()) || !this.sess) return { ok: false, msg: 'Log in first.' };
    const r = await this.call('/rest/v1/blocks', { body: { blocker: this.sess.userId, blocked: userId }, headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' } });
    return r.ok ? { ok: true, msg: 'Blocked. You will not see their messages.' } : this.fail(r);
  }
  async report(messageId: number, reason: string): Promise<Result> {
    if (!(await this.fresh()) || !this.sess) return { ok: false, msg: 'Log in first.' };
    const text = reason.trim().slice(0, 200); if (text.length < 3) return { ok: false, msg: 'Say in a few words what is wrong.' };
    const r = await this.call('/rest/v1/reports', { body: { reporter: this.sess.userId, message_id: messageId, reason: text }, headers: { Prefer: 'return=minimal' } });
    return r.ok || r.status === 409 ? { ok: true, msg: 'Reported. Thank you.' } : this.fail(r);
  }

  /* ---------- the weekly election, shared numbers, announcements ---------- */
  castVote(week: number, city: string, candidate: string): Promise<Result> { return this.rpc('cast_vote', { p_week: week, p_city: city, p_candidate: candidate }); }
  tally(week: number, city: string): Promise<Result<{ candidate: string; votes: number }[]>> { return this.rpc('vote_tally', { p_week: week, p_city: city }, false); }
  bump(key: 'visits' | 'daily_found'): Promise<Result<number>> { return this.rpc<number>('bump', { p_key: key }, key === 'daily_found'); }
  counters(): Promise<Result<{ key: string; value: number }[]>> { return this.rows(`counters?select=key,value`); }
  announcements(): Promise<Result<Announcement[]>> { return this.rows<Announcement>(`announcements?select=id,title,body,created_at&order=id.desc&limit=5`); }

  /* ---------- the second step: adverts from players, private talks, following, removing the account ---------- */
  ads(city: string): Promise<Result<PlayerAd[]>> { return this.rows<PlayerAd>(`ads?select=id,player_id,username,city,kind,title,body,price,created_at&city=eq.${encodeURIComponent(city)}&order=id.desc&limit=40`); }
  postAd(city: string, kind: PlayerAd['kind'], title: string, body: string, price: number): Promise<Result<number>> {
    const t = title.trim(); if (t.length < 4 || t.length > 60) return Promise.resolve({ ok: false, msg: 'Write a title of 4 to 60 characters.' });
    return this.rpc<number>('post_ad', { p_city: city, p_kind: kind, p_title: t, p_body: body.trim().slice(0, 280), p_price: Math.max(0, Math.round(price) || 0) });
  }
  async removeAd(id: number): Promise<Result> {
    if (!(await this.fresh())) return { ok: false, msg: 'Log in first.' };
    const r = await this.call(`/rest/v1/ads?id=eq.${Math.round(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    return r.ok ? { ok: true, msg: 'The ad is taken down.' } : this.fail(r);
  }
  async reportAd(id: number): Promise<Result> { const r = await this.rpc('report_ad', { p_ad: Math.round(id) }); return r.ok ? { ok: true, msg: 'Reported. Thank you.' } : { ok: false, msg: r.msg }; }
  talks(): Promise<Result<Talk[]>> { return this.rpc<Talk[]>('my_talks', {}); }
  async follow(userId: string): Promise<Result> {
    if (!(await this.fresh()) || !this.sess) return { ok: false, msg: 'Log in first.' };
    const r = await this.call('/rest/v1/follows', { body: { follower: this.sess.userId, followed: userId }, headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' } });
    return r.ok ? { ok: true, msg: 'You follow them now.' } : this.fail(r);
  }
  async unfollow(userId: string): Promise<Result> {
    if (!(await this.fresh()) || !this.sess) return { ok: false, msg: 'Log in first.' };
    const r = await this.call(`/rest/v1/follows?follower=eq.${this.sess.userId}&followed=eq.${encodeURIComponent(userId)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    return r.ok ? { ok: true, msg: 'You no longer follow them.' } : this.fail(r);
  }
  following(): Promise<Result<{ follower: string; followed: string }[]>> { return this.rows('follows?select=follower,followed&limit=400', true); }
  /** Removes the account and everything stored with it on the server, then forgets the session on this device. Cannot be undone. */
  async deleteAccount(_password?: string): Promise<Result> { const r = await this.rpc('delete_my_account', {}); if (!r.ok) return { ok: false, msg: r.msg }; this.keep(null); return { ok: true, msg: 'Your account and everything stored with it are deleted.' }; }

  /* ---------- the third step: homes to visit, the guest book, the best flat, friends ---------- */
  publishHome(city: string, dwelling: string, design: HomeDesign, stars: number): Promise<Result> { return this.rpc('publish_home', { p_city: city, p_dwelling: dwelling, p_design: design, p_stars: Math.max(0, Math.min(400, Math.round(stars))) }); }
  async home(userId: string): Promise<Result<PublicHome | null>> { const r = await this.rows<PublicHome>(`homes?select=player_id,username,city,dwelling,design,stars,updated_at&player_id=eq.${encodeURIComponent(userId)}&limit=1`, true); return r.ok ? { ok: true, msg: '', data: r.data?.[0] ?? null } : { ok: false, msg: r.msg }; }
  guestbook(owner: string): Promise<Result<Note[]>> { return this.rows<Note>(`guestbook?select=id,owner,author,author_name,body,gift,created_at&owner=eq.${encodeURIComponent(owner)}&order=id.desc&limit=30`, true); }
  signGuestbook(owner: string, body: string, gift: Gift | null): Promise<Result<number>> {
    const t = body.trim(); if (t.length < 1 || t.length > 200) return Promise.resolve({ ok: false, msg: 'A note has 1 to 200 characters.' });
    if (isRude(t)) return Promise.resolve({ ok: false, msg: explain('language') });
    return this.rpc<number>('sign_guestbook', { p_owner: owner, p_body: t, p_gift: gift });
  }
  voteHome(owner: string): Promise<Result> { return this.rpc('vote_home', { p_owner: owner }); }
  bestHomes(): Promise<Result<BestHome[]>> { return this.rpc<BestHome[]>('best_homes', {}); }
  friends(): Promise<Result<Friend[]>> { return this.rpc<Friend[]>('my_friends', {}); }
  /** Players whose public name starts with what was typed. */
  findPlayers(name: string): Promise<Result<{ id: string; username: string }[]>> { const q = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''); if (q.length < 2) return Promise.resolve({ ok: true, msg: '', data: [] }); return this.rows(`profiles?select=id,username&username=like.${q}*&limit=10`, true); }
}

/** What the Online screen and the automatic save need from an online client: the game's own server (ApiCloud, api-client.ts) or Supabase (Cloud). */
export type OnlineClient = { [K in keyof Cloud]: Cloud[K] } & Partial<Pick<ApiCloud, 'restore' | 'verifyEmail' | 'resendVerification' | 'forgot' | 'resetPassword' | 'changePassword' | 'endOtherSessions' | 'myAds' | 'myHomeVote' | 'challenges' | 'claimChallenge' | 'joinCity' | 'coops' | 'coopInvite' | 'coopAnswer' | 'coopDone' | 'setOrigin'>>;

let shared: OnlineClient | null | undefined;
/** The one connection of the page: the game's own server when built with VITE_API_URL, else Supabase (being retired), else null (offline). */
export function cloud(): OnlineClient | null {
  if (shared === undefined) { const api = apiFromEnv(); const cfg = api ? null : configFromEnv(); shared = api ? new ApiCloud(api) : cfg ? new Cloud(cfg) : null; }
  return shared;
}
