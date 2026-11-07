/* More interface languages: Uzbek (Latin), Tajik (Cyrillic) and Kyrgyz (Cyrillic), for the people the game is made for.
   They are an overlay on the Russian interface: a key with no entry here shows its Russian text (the language most players from these countries
   already read), then English. Story texts follow the Russian game. These tables were written without a native-speaker review and say so in
   docs/LOCALES.md: have them read before a public launch. The choice is kept under "vrussia_locale". */
import { lang, loadInterfaceRu, overlayActive, setLang, setOverlay } from '../i18n';
import type { KV } from '../store';

export type Locale = 'en' | 'ru' | 'uz' | 'tg' | 'ky' | 'kk' | 'uk' | 'az' | 'hy' | 'ka' | 'tr' | 'zh' | 'hi' | 'ar' | 'vi' | 'es' | 'fr' | 'de' | 'pt';
export const LOCALES: { id: Locale; native: string; english: string }[] = [
  { id: 'en', native: 'English', english: 'English' }, { id: 'ru', native: 'Русский', english: 'Russian' },
  { id: 'uz', native: 'Oʻzbekcha', english: 'Uzbek' }, { id: 'tg', native: 'Тоҷикӣ', english: 'Tajik' }, { id: 'ky', native: 'Кыргызча', english: 'Kyrgyz' },
  { id: 'kk', native: 'Қазақша', english: 'Kazakh' }, { id: 'uk', native: 'Українська', english: 'Ukrainian' }, { id: 'az', native: 'Azərbaycanca', english: 'Azerbaijani' },
  { id: 'hy', native: 'Հայերեն', english: 'Armenian' }, { id: 'ka', native: 'ქართული', english: 'Georgian' }, { id: 'tr', native: 'Türkçe', english: 'Turkish' },
  { id: 'zh', native: '中文', english: 'Chinese' }, { id: 'hi', native: 'हिन्दी', english: 'Hindi' }, { id: 'ar', native: 'العربية', english: 'Arabic' },
  { id: 'vi', native: 'Tiếng Việt', english: 'Vietnamese' }, { id: 'es', native: 'Español', english: 'Spanish' }, { id: 'fr', native: 'Français', english: 'French' },
  { id: 'de', native: 'Deutsch', english: 'German' }, { id: 'pt', native: 'Português', english: 'Portuguese' },
];
export const LOCALE_KEY = 'vrussia_locale';
const isLocale = (v: unknown): v is Locale => LOCALES.some(l => l.id === v);

/** The overlays (Uzbek, Tajik, Kyrgyz) are a separate download, handed in by `useOverlays` before `setLocale` is asked for one of them. */
let overlays: Partial<Record<Locale, Record<string, string>>> | null = null;
export function useOverlays(o: NonNullable<typeof overlays>): void { overlays = { ...overlays, ...o }; }
export type Extra = Exclude<Locale, 'en' | 'ru'>;
export const isExtra = (l: unknown): l is Extra => isLocale(l) && l !== 'en' && l !== 'ru';
/** Languages whose speakers mostly read Russian too: a text they lack shows in Russian. The others fall back to English. */
const RU_BASED = new Set<string>(['uz', 'tg', 'ky', 'kk', 'uk', 'az', 'hy', 'ka']);
export const fallsBackToRu = (l: unknown): boolean => typeof l === 'string' && RU_BASED.has(l);
export const isRtl = (l: unknown): boolean => l === 'ar';

const defaultKV = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };

let now: Locale = 'en';
/** The language in use: an extra language while its overlay is on, otherwise the game's own English or Russian (the old RU button changes that too). */
export const currentLocale = (): Locale => (overlayActive() ? now : lang());

/** The saved locale; with none saved, the browser's language when it is one of ours, else the game's own rule (Russian browsers get Russian). */
export function savedLocale(kv: KV | null = defaultKV(), navLang = typeof navigator !== 'undefined' ? navigator.language || '' : ''): Locale | null {
  try { const v = kv?.getItem(LOCALE_KEY); if (isLocale(v)) return v; } catch { /* ignore */ }
  const c = /^([a-z]{2})/i.exec(navLang)?.[1].toLowerCase();
  return c && c !== 'en' && c !== 'ru' && isLocale(c) ? c : null;
}

/** Switches the interface. Returns true when the language changed. English and Russian are the game's own; the others use Russian underneath. */
export function setLocale(l: Locale, kv: KV | null = defaultKV()): boolean {
  if (!isLocale(l)) return false;
  const changed = l !== now;
  now = l;
  try { kv?.setItem(LOCALE_KEY, l); } catch { /* ignore */ }
  if (isExtra(l)) { setLang(fallsBackToRu(l) ? 'ru' : 'en'); setOverlay(overlays?.[l] ?? null); }
  else { setOverlay(null); setLang(l); }
  try { document.documentElement.lang = l; document.documentElement.dir = isRtl(l) ? 'rtl' : 'ltr'; } catch { /* no document */ }
  if (lang() === 'ru') void loadInterfaceRu().then(fresh => { if (fresh) try { document.dispatchEvent(new Event('vr-lang')); } catch { /* no document */ } });     // the Russian texts are their own download; the game draws itself again when they arrive
  return changed;
}
