/* Privacy choices kept on this device: whether the player allows anonymous usage numbers and error reports. Nothing is sent until they say yes.
   Also "download my data" and "erase my data" for everything the game keeps in this browser (every key starting with "vrussia").
   Plain data and an injected storage, so the whole file is tested without a browser. */
import type { KV } from '../store';

export const CONSENT_KEY = 'vrussia_consent';
export const POLICY_VERSION = 1;
export interface Consent { v: number; analytics: boolean; at: number }

/** A storage that can also be listed; localStorage is one. */
export interface ListableKV extends KV { readonly length: number; key(i: number): string | null }

const defaultKV = (): ListableKV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };

/** The saved choice, or null when the player has not chosen (or chose under an older policy, which asks again). */
export function getConsent(kv: KV | null = defaultKV()): Consent | null {
  try {
    const o = JSON.parse(kv?.getItem(CONSENT_KEY) ?? 'null') as Partial<Consent> | null;
    return o && o.v === POLICY_VERSION && typeof o.analytics === 'boolean' ? { v: o.v, analytics: o.analytics, at: Number(o.at) || 0 } : null;
  } catch { return null; }
}
export function setConsent(analytics: boolean, kv: KV | null = defaultKV(), now = Date.now()): Consent {
  const c: Consent = { v: POLICY_VERSION, analytics, at: now };
  try { kv?.setItem(CONSENT_KEY, JSON.stringify(c)); } catch { /* storage may be blocked */ }
  return c;
}
export const needsBanner = (kv: KV | null = defaultKV()): boolean => getConsent(kv) === null;
/** True only when the player said yes. No answer means no. */
export const analyticsAllowed = (kv: KV | null = defaultKV()): boolean => getConsent(kv)?.analytics === true;

const ours = (k: string | null): k is string => !!k && k.startsWith('vrussia');
function ourKeys(kv: ListableKV): string[] { const out: string[] = []; for (let i = 0; i < kv.length; i++) { const k = kv.key(i); if (ours(k)) out.push(k); } return out.sort(); }

/** Everything this game keeps in the browser, as one object (JSON values are parsed; the rest stay text). */
export function exportLocalData(kv: ListableKV | null = defaultKV(), now = Date.now()): { exportedAt: string; data: Record<string, unknown> } {
  const data: Record<string, unknown> = {};
  if (kv) for (const k of ourKeys(kv)) { const raw = kv.getItem(k); try { data[k] = JSON.parse(raw ?? 'null'); } catch { data[k] = raw; } }
  return { exportedAt: new Date(now).toISOString(), data };
}
/** Removes everything this game keeps in the browser. Returns how many entries went. Other sites' and other apps' keys are left alone. */
export function eraseLocalData(kv: ListableKV | null = defaultKV()): number {
  if (!kv) return 0;
  const keys = ourKeys(kv);
  for (const k of keys) { try { kv.removeItem(k); } catch { /* ignore */ } }
  return keys.length;
}
