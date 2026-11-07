/* The looks of the phone. Eight generic shapes of the phones people use (no brand names, no logos): the screens inside are always the same.
   The shape is chosen from the device the first time (screen size, touch, a few words in the user agent) and can be changed on the phone's home screen;
   the choice is kept on this device only. Pure choosing here; the drawing is the .skin-* rules in style.css. */
import type { KV } from './store';

export type SkinId = 'notch' | 'island' | 'punch' | 'compact' | 'foldable' | 'budget' | 'keypad' | 'tablet';
export interface Skin { id: SkinId; name: string; ru: string; blurb: string }
export const SKINS: Skin[] = [
  { id: 'notch', name: 'Notch phone', ru: 'С чёлкой', blurb: 'A tall screen with a small notch at the top.' },
  { id: 'island', name: 'Island phone', ru: 'С островком', blurb: 'A pill-shaped camera cut-out floating at the top.' },
  { id: 'punch', name: 'Punch-hole phone', ru: 'С точкой камеры', blurb: 'A tiny round camera hole in the screen.' },
  { id: 'compact', name: 'Compact phone', ru: 'Компактный', blurb: 'A small phone for one hand.' },
  { id: 'foldable', name: 'Foldable phone', ru: 'Раскладной', blurb: 'A wide screen with a fold in the middle.' },
  { id: 'budget', name: 'Budget phone', ru: 'Бюджетный', blurb: 'Thick frame and a chin, like many cheaper phones.' },
  { id: 'keypad', name: 'Keypad phone', ru: 'Кнопочный', blurb: 'A small green screen with real keys, for calls and texts.' },
  { id: 'tablet', name: 'Tablet', ru: 'Планшет', blurb: 'A big screen with a thin frame.' },
];
export const SKIN_KEY = 'vrussia_phone_skin';
export const isSkin = (x: unknown): x is SkinId => typeof x === 'string' && SKINS.some(s => s.id === x);

export interface Device { width: number; height: number; touch: boolean; ua: string }
/** The shape that fits a device best: a wide touch screen is a tablet or a foldable, a small one is a compact, an old-fashioned user agent is a keypad phone. */
export function detectSkin(d: Device): SkinId {
  const ua = d.ua.toLowerCase();
  if (/fold|flip|sm-f9|sm-f7/.test(ua)) return 'foldable';
  if (/ipad|tablet|sm-t|nexus 7|kindle/.test(ua) || (d.touch && Math.min(d.width, d.height) >= 700)) return 'tablet';
  if (/iphone/.test(ua)) return d.height >= 800 ? 'island' : 'compact';
  if (/android/.test(ua)) return d.width <= 340 ? 'compact' : d.height / Math.max(1, d.width) > 2 ? 'punch' : 'budget';
  if (/series40|nokia|kaios|opera mini|jio ?phone/.test(ua)) return 'keypad';
  if (!d.touch && d.width < 520) return 'compact';
  return 'notch';
}
const kvDefault = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
/** The chosen skin, or the one that fits this device. Anything unexpected in storage means "choose by device". */
export function skinOf(kv: KV | null = kvDefault(), dev: Device = currentDevice()): SkinId {
  try { const v = kv?.getItem(SKIN_KEY); if (isSkin(v)) return v; } catch { /* use the device */ }
  return detectSkin(dev);
}
export function setSkin(id: SkinId, kv: KV | null = kvDefault()): void { try { kv?.setItem(SKIN_KEY, id); } catch { /* the choice is then forgotten on reload */ } }
export function currentDevice(): Device {
  const w = typeof window === 'undefined' ? 390 : window.innerWidth, h = typeof window === 'undefined' ? 800 : window.innerHeight;
  return { width: w, height: h, touch: typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0, ua: typeof navigator === 'undefined' ? '' : navigator.userAgent };
}
/** Puts the skin on a phone element (and takes the old one off). */
export function applySkin(el: Element | null, id: SkinId): void {
  if (!el) return;
  for (const s of SKINS) el.classList.remove('skin-' + s.id);
  el.classList.add('skin-' + id);
}
