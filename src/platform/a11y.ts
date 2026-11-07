/* Two more accessibility and speed switches, kept on this device (key "vrussia_a11y"):
     contrast - a higher-contrast colour scheme with thicker focus outlines;
     lite     - the lighter game for old phones and slow networks: no 3D world (the flat map is used) and calmer motion.
   Lite starts on by itself when the browser says the data saver is on, or the device has little memory or one or two processor cores; the player can
   still switch it either way. The two classes are put on <html>, and src/platform/platform.css styles them. */
import type { KV } from '../store';

export const A11Y_KEY = 'vrussia_a11y';
export interface A11y { contrast: boolean; lite: boolean }
interface Nav { hardwareConcurrency?: number; deviceMemory?: number; connection?: { saveData?: boolean } }

const defaultKV = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };

/** True for a device that is probably weak or on a metered network. */
export function looksWeak(nav: Nav = typeof navigator !== 'undefined' ? navigator as unknown as Nav : {}): boolean {
  return nav.connection?.saveData === true || (nav.deviceMemory ?? 8) <= 2 || (nav.hardwareConcurrency ?? 8) <= 2;
}
export function loadA11y(kv: KV | null = defaultKV(), nav?: Nav): A11y {
  const base: A11y = { contrast: false, lite: looksWeak(nav) };
  try {
    const o = JSON.parse(kv?.getItem(A11Y_KEY) ?? '{}') as Partial<A11y>;
    return { contrast: typeof o.contrast === 'boolean' ? o.contrast : base.contrast, lite: typeof o.lite === 'boolean' ? o.lite : base.lite };
  } catch { return base; }
}
export function saveA11y(a: A11y, kv: KV | null = defaultKV()): void { try { kv?.setItem(A11Y_KEY, JSON.stringify(a)); } catch { /* storage may be blocked */ } }
export function applyA11y(a: A11y, root: HTMLElement = document.documentElement): void { root.classList.toggle('hiContrast', a.contrast); root.classList.toggle('lite', a.lite); }
/** For the 3D view: lite means the flat map, whatever else is set. */
export const liteOn = (kv: KV | null = defaultKV()): boolean => loadA11y(kv).lite;
