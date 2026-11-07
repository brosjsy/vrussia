/* Anonymous usage numbers, error reports and feature flags.
   Privacy rules, tested in test/platform.test.ts:
     - nothing is sent until the player has said yes (consent.ts), and never when the game has no server;
     - an event is a short name and at most 8 simple properties (no free text from the player, no names, e-mails or addresses);
     - the only id is a random one made for this tab (not kept), and the request carries no cookie;
     - an error report is cut to 200 characters, with web addresses' query parts and e-mail addresses removed, and the same error is sent once.
   Everything that needs the network goes through an injected `fetch`. */
import type { KV } from '../store';
import { analyticsAllowed } from './consent';

export type Props = Record<string, string | number | boolean>;
export interface Event { kind: 'event' | 'error'; name: string; props?: Props }
export interface TelemetryDeps { base: string | null; fetch?: typeof fetch; kv?: KV | null; build?: string; now?: () => number; random?: () => number }

const NAME = /^[a-z0-9_.:-]{2,60}$/, KEY = /^[a-z0-9_]{1,24}$/;
export const MAX_QUEUE = 20, MAX_ERRORS = 10;

/** A property set the server will accept, or null: bad keys and nested or long values are dropped, not guessed at. */
export function cleanProps(p: unknown): Props {
  const out: Props = {};
  if (!p || typeof p !== 'object') return out;
  for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
    if (Object.keys(out).length >= 8) break;
    if (!KEY.test(k)) continue;
    if (typeof v === 'string') out[k] = v.slice(0, 80);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
  }
  return out;
}
/** An error message made safe to send: no e-mail addresses, no query strings or fragments of addresses, no long digit runs, at most 200 characters. */
export function scrub(msg: string): string {
  return String(msg).replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]').replace(/(https?:\/\/[^\s?#]+)[?#]\S*/g, '$1').replace(/\d{6,}/g, '#').replace(/\s+/g, ' ').trim().slice(0, 200);
}

export class Telemetry {
  readonly sid: string;
  private queue: Event[] = [];
  private sentErrors = new Set<string>();
  private readonly f: typeof fetch;
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(private readonly d: TelemetryDeps) {
    this.f = d.fetch ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : (() => Promise.reject(new Error('no fetch'))) as typeof fetch);
    const r = d.random ?? Math.random;
    this.sid = Array.from({ length: 12 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(r() * 36)]).join('');
  }
  /** True when events would really be sent. */
  get on(): boolean { return !!this.d.base && analyticsAllowed(this.d.kv === undefined ? undefined : this.d.kv); }
  track(name: string, props?: unknown): boolean {
    if (!this.on || !NAME.test(name)) return false;
    if (this.queue.length >= MAX_QUEUE) this.queue.shift();
    this.queue.push({ kind: 'event', name, props: cleanProps(props) });
    this.later();
    return true;
  }
  error(message: string, where = ''): boolean {
    if (!this.on) return false;
    const m = scrub(message); if (!m) return false;
    const key = m + '|' + where;
    if (this.sentErrors.has(key) || this.sentErrors.size >= MAX_ERRORS) return false;
    this.sentErrors.add(key);
    this.queue.push({ kind: 'error', name: 'error', props: cleanProps({ message: m.slice(0, 80), where: scrub(where).slice(0, 80) }) });
    this.later();
    return true;
  }
  private later(): void {
    if (this.timer || typeof setTimeout !== 'function') return;
    this.timer = setTimeout(() => { this.timer = null; void this.flush(); }, 5000);
  }
  /** Sends what is waiting. Never throws; a failed send drops the events (they are statistics, not data worth keeping at any cost). */
  async flush(): Promise<boolean> {
    if (!this.queue.length) return true;
    const events = this.queue.splice(0, MAX_QUEUE);
    if (!this.on) return false;
    try {
      const res = await this.f(this.d.base + '/api/telemetry', { method: 'POST', credentials: 'omit', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sid: this.sid, build: this.d.build, events }) });
      return res.ok;
    } catch { return false; }
  }
}

/* ---------- feature flags ---------- */
export interface Flag { key: string; enabled: boolean; rollout: number }
const FLAG_CACHE = 'vrussia_flags', BUCKET = 'vrussia_bucket';
const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) % 100; };

/** Flags the game knows, with the value used when the server has none (or there is no server). */
export const FLAG_DEFAULTS: Record<string, boolean> = { tour: true, daily: true, classes: true, packs: true, share_card: true };

export class Flags {
  private flags: Flag[] = [];
  private bucket = '';
  constructor(private readonly kv: KV | null, private readonly search = '') {
    try { this.flags = (JSON.parse(kv?.getItem(FLAG_CACHE) ?? '[]') as Flag[]).filter(f => f && typeof f.key === 'string'); } catch { this.flags = []; }
    try { this.bucket = kv?.getItem(BUCKET) ?? ''; if (!this.bucket) { this.bucket = Math.random().toString(36).slice(2, 12); kv?.setItem(BUCKET, this.bucket); } } catch { this.bucket = 'x'; }
  }
  /** Fetches the flags from the server (no cookie) and keeps them for next time. */
  async refresh(base: string | null, f: typeof fetch = fetch.bind(globalThis)): Promise<boolean> {
    if (!base) return false;
    try {
      const res = await f(base + '/api/flags', { credentials: 'omit' }); if (!res.ok) return false;
      const list = await res.json() as Flag[];
      if (!Array.isArray(list)) return false;
      this.flags = list.filter(x => x && typeof x.key === 'string' && typeof x.enabled === 'boolean').map(x => ({ key: x.key, enabled: x.enabled, rollout: Math.max(0, Math.min(100, Number(x.rollout) || 0)) }));
      try { this.kv?.setItem(FLAG_CACHE, JSON.stringify(this.flags)); } catch { /* ignore */ }
      return true;
    } catch { return false; }
  }
  /** On or off: a ?ff=name or ?ff=-name in the address wins (for testing), then the server's flag with its percentage of players, then the default. */
  isOn(key: string): boolean {
    const m = /[?&]ff=([^&]*)/.exec(this.search);
    if (m) for (const part of decodeURIComponent(m[1]).split(',')) { if (part === key) return true; if (part === '-' + key) return false; }
    const f = this.flags.find(x => x.key === key);
    if (f) return f.enabled && hash(this.bucket + key) < f.rollout;
    return FLAG_DEFAULTS[key] ?? false;
  }
}
