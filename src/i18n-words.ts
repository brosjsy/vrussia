/* The words of the interface in the player's language (round 149): the character creator, the dreams, the cities, the places, the checklist, the
   decrees and the story scenes. The Russian lists are their own small download (i18n-words-ru.ts, scenes-ru.ts), loaded when the game is in Russian, so
   the first download stays small; until they arrive, and in English, the English is shown. */
import { lang, addStrings } from './i18n';
import type { SceneRu } from './scenes-ru';

interface Lists {
  WORDS_RU: Record<string, string>; EYE_RU: Record<string, string>; CITY_RU: Record<string, string>; GROUP_RU: Record<string, Record<string, string>>; PLACE_RU: Record<string, string>;
  FLAVOUR_RU: Record<string, string>; CHECK_RU: Record<string, string>; DECREE_RU: Record<string, string>; SCENES_RU: Record<string, SceneRu>; HOME_RU: Record<string, string>; CAT_RU: Record<string, string>;
}
let D: Lists | null = null;
let loading: Promise<boolean> | null = null;
/** Loads the Russian lists (once). True when they were not there before (the screen should be drawn again). */
export function loadRussian(): Promise<boolean> {
  if (D) return Promise.resolve(false);
  loading ??= Promise.all([import('./i18n-words-ru'), import('./scenes-ru')]).then(([w, sc]) => { D = { ...w, SCENES_RU: sc.SCENES_RU, HOME_RU: sc.HOME_RU, CAT_RU: sc.CAT_RU }; addStrings({}, w.HERO_RU); return true; });
  return loading;
}
const ru = (): boolean => lang() === 'ru' && !!D;
/** A creator or dream word in the player's language. */
export const L = (en: string): string => (ru() ? D!.WORDS_RU[en] ?? en : en);
/** A creator choice in the form its group needs (a straight nose, but straight brows). */
export const LG = (group: string, en: string): string => (ru() ? D!.GROUP_RU[group]?.[en] ?? D!.WORDS_RU[en] ?? en : en);
/** An eye colour. */
export const eyeL = (en: string): string => (ru() ? D!.EYE_RU[en] ?? en : en);
/** A city. */
export const cityName = (en: string): string => (ru() ? D!.CITY_RU[en] ?? en : en);
export const placeL = (en: string): string => (ru() ? D!.PLACE_RU[en] ?? en : en);
export const flavourL = (id: string, en: string): string => (ru() ? D!.FLAVOUR_RU[id] ?? en : en);
export const checkL = (en: string): string => (ru() ? D!.CHECK_RU[en] ?? en : en);
export const decreeL = (en: string): string => (ru() ? D!.DECREE_RU[en] ?? (en.startsWith("Farmers'") ? 'Фермерский рынок в выходные на центральной площади' : en) : en);
export const firstMonthL = (): string => (ru() ? 'Первый месяц' : 'First month');
export const huntL = (place: string, found: number, prize: string, more: number): { title: string; sub: string } => ru()
  ? { title: `Ежедневный поиск: загляните в «${placeL(place)}»`, sub: `Найдено: ${found} · ${prize} ещё через ${more}` }
  : { title: `Daily hunt: look at ${place}`, sub: `${found} found · ${prize} after ${more} more` };
/** A story scene in Russian, if it has been translated (and the lists have arrived). */
export const sceneRu = (id: string): SceneRu | undefined => (ru() ? D!.SCENES_RU[id] : undefined);
export const homeRu = (en: string): string => (ru() ? D!.HOME_RU[en] ?? en : en);
export const catRu = (en: string): string => (ru() ? D!.CAT_RU[en] ?? en : en);
