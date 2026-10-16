/* Small per-browser preferences. Currently: text size (three steps), kept in localStorage and applied as a CSS variable. */
import type { KV } from './store';

export const TEXT_KEY = 'vrussia_textsize';
export const TEXT_STEPS = [1, 1.15, 1.3] as const;

const defaultKV = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };

/** The saved step index (0 to 2); anything unexpected means the default 0. */
export function textStep(kv: KV | null = defaultKV()): number {
  try { const n = Number(kv?.getItem(TEXT_KEY)); return Number.isInteger(n) && n >= 0 && n < TEXT_STEPS.length ? n : 0; } catch { return 0; }
}

export function applyTextStep(step: number, root: HTMLElement = document.documentElement): void {
  const k = Math.min(Math.max(Math.trunc(step) || 0, 0), TEXT_STEPS.length - 1);
  root.style.setProperty('--fs', String(TEXT_STEPS[k]));
  root.dataset.textStep = String(k);
}

/** Moves to the next step (wrapping around), saves it, applies it and returns the new index. */
export function cycleTextStep(kv: KV | null = defaultKV(), root: HTMLElement = document.documentElement): number {
  const next = (textStep(kv) + 1) % TEXT_STEPS.length;
  try { kv?.setItem(TEXT_KEY, String(next)); } catch { /* ignore */ }
  applyTextStep(next, root);
  return next;
}

/* ---------- the phone: night mode and the "new" tags on apps not opened yet ---------- */
export const NIGHT_KEY = 'vrussia_phone_night', SEEN_KEY = 'vrussia_phone_seen';

export function phoneNight(kv: KV | null = defaultKV()): boolean { try { return kv?.getItem(NIGHT_KEY) === '1'; } catch { return false; } }
export function setPhoneNight(on: boolean, kv: KV | null = defaultKV()): void { try { kv?.setItem(NIGHT_KEY, on ? '1' : '0'); } catch { /* ignore */ } }

/** The apps the player has opened, by id. Anything unexpected in storage means none. */
export function seenApps(kv: KV | null = defaultKV()): Set<string> {
  try { const v = JSON.parse(kv?.getItem(SEEN_KEY) ?? '[]'); return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 60) : []); } catch { return new Set(); }
}
export function markSeen(id: string, kv: KV | null = defaultKV()): void {
  try { const s = seenApps(kv); if (s.has(id)) return; s.add(id); kv?.setItem(SEEN_KEY, JSON.stringify([...s])); } catch { /* ignore */ }
}
