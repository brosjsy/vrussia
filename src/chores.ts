/* Everyday chores of a life in Russia (round 124: things the play-tests found nobody could do):
   - Laundry: clothes get worn a little every day; wash them at home (with a washing machine) or at a laundromat (прачечная).
   - The mobile plan: a monthly tariff paid in advance; when it runs out there is no mobile internet until it is topped up.
   - Home internet: connecting it costs an installation fee; then a monthly bill.
   - A city transport card (Тройка in Moscow, Подорожник in Saint Petersburg, a local card elsewhere): a small deposit, then trips are
     a little cheaper than paying each time.
   Prices are the game's, set near real 2026 levels in big cities (a laundromat load ~350 ₽, a basic tariff ~450 ₽/month, home
   internet ~600 ₽/month). Nothing here ends the game: missing a chore only costs mood (moodlets) or comfort. */
import type { State } from './engine';

export interface Chores { clothes: number; lastDay: number; planUntil: number; wifi: boolean; wifiUntil: number; card: { city: string; balance: number } | null }
type S = State & { chores?: Chores };
export interface Result { ok: boolean; msg: string }

export const LAUNDROMAT = 350, PLAN_MONTH = 450, WIFI_INSTALL = 1500, WIFI_MONTH = 600, CARD_DEPOSIT = 80, CARD_DISCOUNT = 0.85;
const clamp = (v: number): number => Math.max(0, Math.min(100, Math.round(v)));

export function choresOf(s: State): Chores {
  const x = s as S;
  if (!x.chores || typeof x.chores.clothes !== 'number') x.chores = { clothes: 80, lastDay: s.day, planUntil: s.day + 30, wifi: false, wifiUntil: 0, card: null };
  // one card for the whole game: the shop scene "Transport card" (flag troika, bought with 500 ₽ on it) is this card too
  if (s.flags.troika && !x.chores.card) x.chores.card = { city: s.city, balance: 500 };
  return x.chores;
}
/** The name of the city's transport card. */
export const cardName = (city: string, ru = false): string => (city === 'Moscow' ? (ru ? 'Тройка' : 'Troika') : city === 'Saint Petersburg' ? (ru ? 'Подорожник' : 'Podorozhnik') : ru ? 'Транспортная карта' : 'Transport card');
/** A washing machine placed at home. Reads the saved furniture list directly: importing furniture.ts here would pull the furniture code into the first download. */
export const hasWasher = (s: State): boolean => ((s as State & { furn?: { placed?: { id: string }[] } }).furn?.placed ?? []).some(p => p.id === 'washer');

/** Once a day (called by turn.ts): clothes wear, the phone plan and the internet bill. Returns notes for the day. */
export function tickChores(s: State): string[] {
  const c = choresOf(s), out: string[] = [];
  const days = Math.max(0, s.day - c.lastDay); if (!days) return out;
  c.lastDay = s.day;
  c.clothes = clamp(c.clothes - 7 * days);
  if (c.clothes === 0 && days) out.push('Your clothes need washing.');
  if (s.day === c.planUntil) out.push('Your mobile plan ran out today: top it up for mobile internet.');
  if (c.wifi && s.day >= c.wifiUntil) {
    if (s.money >= WIFI_MONTH) { s.money -= WIFI_MONTH; c.wifiUntil = s.day + 30; out.push(`Home internet: ${WIFI_MONTH} ₽ for the month.`); }
    else { c.wifi = false; out.push('Home internet was switched off: the monthly bill was not paid.'); }
  }
  return out;
}

export const planActive = (s: State): boolean => choresOf(s).planUntil > s.day;
/** Pays a fare: from the card when it has enough (cheaper), else in cash. Returns what was paid. */
export function payFare(s: State, fare: number): number {
  const c = choresOf(s);
  if (c.card && c.card.city === s.city) { const f = Math.round(fare * CARD_DISCOUNT); if (c.card.balance >= f) { c.card.balance -= f; return f; } }
  s.money -= fare; return fare;
}
/** How the chores feel (added to the moodlets of needs.ts). */
export function choreMoodlets(s: State): { key: string; v: number }[] {
  const c = choresOf(s), out: { key: string; v: number }[] = [];
  if (c.clothes <= 15) out.push({ key: 'ml.dirtyClothes', v: -1 }); else if (c.clothes >= 90) out.push({ key: 'ml.cleanClothes', v: 1 });
  if (!planActive(s)) out.push({ key: 'ml.noData', v: -1 });
  if (c.wifi) out.push({ key: 'ml.wifi', v: 1 });
  return out;
}
