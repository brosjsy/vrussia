/* Class mode, the pupil's side and the teacher's side. A pupil needs no account: a class code and a nickname (never a real name). When a game
   ends, the result and the list of topics learned go to the teacher, and only to the teacher. A teacher needs an account (so a class has an
   owner) and sees a table of results. The server rules are in server/src/routes-platform.ts. All network calls take an injected `fetch`. */
import type { KV } from '../store';
import type { Report } from './report';
import { compact } from './report';

export const CLASS_KEY = 'vrussia_class';
export interface Assignment { origin?: string; diff?: 'easy' | 'normal' | 'hard'; city?: string; note?: string }
export interface Membership { code: string; name: string; assignment: Assignment; nickname: string }
export interface ClassRow { code: string; name: string; assignment: Assignment; created_at: string; results: number }
export interface ResultRow { nickname: string; origin: string; ending: string; score: number; days: number; learned: { done: string[]; mistakes: string[] }; created_at: string }
export interface Net { base: string | null; fetch?: typeof fetch }
export interface Reply<T = undefined> { ok: boolean; msg: string; data?: T }

const defaultKV = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
export const CODE = /^[A-Z0-9]{6}$/;
export const NICK = /^[\p{L}\p{N} _.-]{2,20}$/u;
export const cleanCode = (v: string): string => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

export function membership(kv: KV | null = defaultKV()): Membership | null {
  try {
    const m = JSON.parse(kv?.getItem(CLASS_KEY) ?? 'null') as Membership | null;
    return m && CODE.test(m.code) && typeof m.nickname === 'string' && NICK.test(m.nickname) ? m : null;
  } catch { return null; }
}
export function leave(kv: KV | null = defaultKV()): void { try { kv?.removeItem(CLASS_KEY); } catch { /* ignore */ } }

async function call<T>(n: Net, method: string, path: string, body?: unknown, cookie = false): Promise<Reply<T>> {
  if (!n.base) return { ok: false, msg: 'offline' };
  try {
    const f = n.fetch ?? fetch.bind(globalThis);
    const res = await f(n.base + path, { method, credentials: cookie ? 'include' : 'omit', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const json = await res.json().catch(() => null) as unknown;
    return res.ok ? { ok: true, msg: '', data: json as T } : { ok: false, msg: String((json as { error?: string } | null)?.error ?? res.status) };
  } catch { return { ok: false, msg: 'offline' }; }
}

/** A pupil joins: the class must exist; the nickname is checked here as well as on the server. */
export async function join(n: Net, codeIn: string, nickname: string, kv: KV | null = defaultKV()): Promise<Reply<Membership>> {
  const code = cleanCode(codeIn), nick = nickname.trim();
  if (!CODE.test(code)) return { ok: false, msg: 'bad code' };
  if (!NICK.test(nick)) return { ok: false, msg: 'bad nickname' };
  const r = await call<{ name: string; assignment: Assignment }>(n, 'GET', `/api/classes/${code}`);
  if (!r.ok || !r.data) return { ok: false, msg: r.msg === '404' || r.msg === 'no such class' ? 'no such class' : r.msg };
  const m: Membership = { code, name: r.data.name, assignment: r.data.assignment ?? {}, nickname: nick };
  try { kv?.setItem(CLASS_KEY, JSON.stringify(m)); } catch { /* ignore */ }
  return { ok: true, msg: '', data: m };
}

export interface RunSummary { origin: string; ending: 'hospital' | 'deported' | 'debt' | 'time'; score: number; days: number }
/** Sends the pupil's result and learning summary to the teacher. Does nothing when the pupil is not in a class. */
export async function sendResult(n: Net, run: RunSummary, rep: Report, kv: KV | null = defaultKV()): Promise<Reply> {
  const m = membership(kv);
  if (!m) return { ok: false, msg: 'no class' };
  return call(n, 'POST', `/api/classes/${m.code}/results`, { nickname: m.nickname, origin: run.origin, ending: run.ending, score: Math.max(0, Math.min(100000, Math.round(run.score))), days: Math.max(1, Math.min(800, run.days)), learned: compact(rep) });
}

/* ---------- the teacher ---------- */
export const createClass = (n: Net, name: string, assignment: Assignment): Promise<Reply<{ code: string }>> => call(n, 'POST', '/api/classes', { name: name.trim(), assignment }, true);
export const myClasses = (n: Net): Promise<Reply<ClassRow[]>> => call(n, 'GET', '/api/classes', undefined, true);
export const results = (n: Net, code: string): Promise<Reply<ResultRow[]>> => call(n, 'GET', `/api/classes/${cleanCode(code)}/results`, undefined, true);
export const removeClass = (n: Net, code: string): Promise<Reply> => call(n, 'DELETE', `/api/classes/${cleanCode(code)}`, undefined, true);

/** The results as a CSV file for a spreadsheet. Cells that could be read as a formula are made safe. */
export function resultsCsv(rows: ResultRow[]): string {
  const cell = (v: string | number): string => { let s = String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return ['nickname,character,ending,score,days,done,mistakes', ...rows.map(r => [r.nickname, r.origin, r.ending, r.score, r.days, r.learned.done.join(' '), r.learned.mistakes.join(' ')].map(cell).join(','))].join('\n');
}
