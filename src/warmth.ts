/* Weather and clothes. The day's temperature follows the month and the weather (a frosty January day is far colder than a rainy October one); what the
   player wears gives warmth points (a puffer jacket a lot, a T-shirt almost nothing); the Warmth meter compares the two and only shows in the cold
   months. Being badly under-dressed outdoors in the cold adds a little stress; the existing rule of the game (health falls on frosty days for somebody
   without warm clothes) stays as it was. Pure and deterministic. */
import type { State } from './engine';
import { normalizeLook } from './avatar';
import type { Worn } from './avatar';

export type Season = 'winter' | 'offseason' | 'summer';
/** The calendar date of the game day (the same rule as the engine's, kept here so that this file does not need the engine). */
const dateOf = (s: State): Date => new Date(new Date(2026, 8, 1).getTime() + s.day * 864e5);
const hash = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };

/** The season of a month (1 to 12). */
export const seasonOf = (month: number): Season => (month === 12 || month <= 2 ? 'winter' : month >= 6 && month <= 8 ? 'summer' : 'offseason');
/** The ranges of temperature, in degrees Celsius, for each season and weather. Winter frost goes down to -25. */
const RANGE: Record<Season, Record<string, [number, number]>> = {
  winter: { frost: [-25, -15], snow: [-12, -2], clear: [-16, -5], rain: [-3, 1], heat: [-5, 0] },
  offseason: { frost: [-10, -3], snow: [-5, 0], rain: [1, 7], clear: [3, 13], heat: [14, 20] },
  summer: { frost: [8, 12], snow: [8, 12], rain: [13, 18], clear: [17, 24], heat: [25, 32] },
};
/** The temperature of the player's day: the same all day, different on another day. */
export function temperatureOf(s: State): number {
  const m = dateOf(s).getMonth() + 1, [lo, hi] = RANGE[seasonOf(m)][s.weather] ?? [0, 10];
  return lo + (hash(`${s.city}|${s.day}|${s.weather}`) % (hi - lo + 1));
}
/** Saint Petersburg's white nights: the sun hardly sets from late May to mid July. */
export const whiteNights = (s: State): boolean => { const d = dateOf(s), m = d.getMonth() + 1, day = d.getDate(); return /petersburg/i.test(s.city) && ((m === 5 && day >= 25) || m === 6 || (m === 7 && day <= 15)); };

/** Warmth points of each thing that can be worn. */
export const OUTER_WARMTH: Record<string, number> = { 'coat-dublyonka': 52, 'coat-puffer': 50, 'coat-wool': 42, 'coat-winter': 42, chapan: 30, 'jacket-warm': 28 };
export const HAT_WARMTH: Record<string, number> = { 'hat-ushanka': 12, 'hat-beanie': 7, 'hat-headscarf': 3, 'hat-doppi': 2, 'hat-cap': 1 };
const TOP: Record<string, number> = { sweater: 8, sporty: 6, tracksuit: 6, smart: 3, folk: 3, casual: 1, dress: 1 };
const BOTTOM: Record<string, number> = { trousers: 4, jeans: 4, skirt: -2, shorts: -5 };
const SHOES: Record<string, number> = { valenki: 18, boots: 14, shoes: 4, sneakers: 3, slippers: 1, sandals: -3 };

/** How warm an outfit is, in points (about 0 for summer clothes, about 90 for everything a Russian winter asks for). */
export function outfitWarmth(rawLook: unknown, worn: Worn = {}): number {
  const l = normalizeLook(rawLook);
  return (OUTER_WARMTH[worn.outer ?? ''] ?? 0) + (HAT_WARMTH[worn.hat ?? ''] ?? 0) + (worn.scarf ? 6 : 0) + (worn.gloves ? 6 : 0) + (worn.thermals ? 8 : 0)
    + (TOP[l.style] ?? 1) + (BOTTOM[l.bottom] ?? 0) + (SHOES[l.shoes] ?? 0);
}
/** How many warmth points a temperature asks for: nothing above 10 degrees, 24 at zero, about 84 at minus 25. */
export const warmthNeeded = (temp: number): number => (temp >= 10 ? 0 : Math.round((10 - temp) * 2.4));
/** The Warmth meter (0 freezing, 100 snug), or null when it is not cold enough for it to matter. Indoors the player is always warm. */
export function warmthMeter(s: State, indoors = false): number | null {
  const t = temperatureOf(s); if (t >= 8) return null;
  if (indoors) return 100;
  // somebody with a decent wardrobe (clothing 50 or more) has an old coat on even if they never chose one in the wardrobe
  const implied = !s.worn?.outer && s.clothes >= 50 ? 30 : 0;
  const have = outfitWarmth(s.look, s.worn ?? {}) + implied, need = warmthNeeded(t);
  return Math.max(0, Math.min(100, Math.round(60 + (have - need) * 1.6)));
}
/** A word for the mood line when the cold is what the player feels most, or null. */
export const coldWord = (s: State): string | null => { const m = warmthMeter(s, s.loc === 'home'); return m === null ? null : m < 20 ? 'Freezing' : m < 40 ? 'Chilly' : null; };

/** What to wear today: a short list of things the outfit lacks, cheapest first, and the line for the player. */
export function advice(s: State): { temp: number; season: Season; missing: string[]; line: string } {
  const temp = temperatureOf(s), season = seasonOf(dateOf(s).getMonth() + 1), w = s.worn ?? {}, l = normalizeLook(s.look), missing: string[] = [];
  if (temp < 8) {
    if (!w.outer && s.clothes < 50) missing.push('a warm coat'); if (temp < 0 && !w.hat) missing.push('a hat'); if (temp < -5 && !w.scarf) missing.push('a scarf');
    if (temp < -5 && !w.gloves) missing.push('mittens'); if (temp < 0 && l.shoes !== 'boots' && l.shoes !== 'valenki') missing.push('winter boots');
    if (temp < -15 && !w.thermals) missing.push('thermal leggings');
  } else if (temp > 22 && (w.outer || l.style === 'sweater')) missing.push('lighter clothes');
  const deg = `${temp > 0 ? '+' : ''}${temp}°C`;
  const line = missing.length ? `${deg}: you would be better off with ${missing.join(', ')}.` : temp < 8 ? `${deg}: you are dressed for it.` : `${deg}: a pleasant day.`;
  return { temp, season, missing, line };
}
/** Called once for each part of the day (the engine's needs hook): outdoors in the cold and badly under-dressed, the player gets a little more stressed. Returns a line or ''. */
export function coldPress(s: State): string {
  const m = warmthMeter(s, s.loc === 'home'); if (m === null || m >= 20) return '';
  s.stress = Math.min(100, s.stress + 1);
  return 'You are freezing out here. Dress warmer.';
}
