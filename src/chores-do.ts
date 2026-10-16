/* What a player does from the Daily life app: wash clothes, top up the mobile plan, connect home internet, get and top up a transport card.
   The everyday rules (wear, bills, moods, fares) are in chores.ts; this part loads with the app, not with the first download. */
import type { State } from './engine';
import { choresOf, hasWasher, cardName, LAUNDROMAT, PLAN_MONTH, WIFI_INSTALL, WIFI_MONTH, CARD_DEPOSIT } from './chores';
import type { Result } from './chores';

export function washClothes(s: State, where: 'home' | 'laundromat'): Result {
  const c = choresOf(s);
  if (c.clothes >= 95) return { ok: false, msg: 'Your clothes are clean.' };
  if (where === 'home') {
    if (s.loc !== 'home') return { ok: false, msg: 'You can only use your machine at home.' };
    if (!hasWasher(s)) return { ok: false, msg: 'You have no washing machine. Buy one, or use a laundromat.' };
    c.clothes = 100; s.energy = Math.max(0, s.energy - 3); return { ok: true, msg: 'The washing machine hums; your clothes are clean.' };
  }
  if (s.money < LAUNDROMAT) return { ok: false, msg: `A load at the laundromat costs ${LAUNDROMAT} ₽.` };
  s.money -= LAUNDROMAT; c.clothes = 100; return { ok: true, msg: `Clean clothes from the laundromat (${LAUNDROMAT} ₽).` };
}
export function topUpPhone(s: State, months = 1): Result {
  const m = Math.max(1, Math.min(6, Math.round(months))), cost = PLAN_MONTH * m, c = choresOf(s);
  if (s.money < cost) return { ok: false, msg: `That costs ${cost} ₽.` };
  s.money -= cost; c.planUntil = Math.max(c.planUntil, s.day) + 30 * m;
  return { ok: true, msg: `Mobile plan paid for ${m} month${m === 1 ? '' : 's'}.` };
}
export function connectWifi(s: State): Result {
  const c = choresOf(s);
  if (c.wifi) return { ok: false, msg: 'Home internet is already connected.' };
  if (s.housing === 'homeless') return { ok: false, msg: 'You need a home first.' };
  if (s.money < WIFI_INSTALL + WIFI_MONTH) return { ok: false, msg: `Installation and the first month cost ${WIFI_INSTALL + WIFI_MONTH} ₽.` };
  s.money -= WIFI_INSTALL + WIFI_MONTH; c.wifi = true; c.wifiUntil = s.day + 30;
  return { ok: true, msg: 'The technician came: home internet works.' };
}
export function buyCard(s: State): Result {
  const c = choresOf(s);
  if (c.card && c.card.city === s.city) return { ok: false, msg: `You already have a ${cardName(s.city)}.` };
  if (s.money < CARD_DEPOSIT) return { ok: false, msg: `The deposit is ${CARD_DEPOSIT} ₽.` };
  s.money -= CARD_DEPOSIT; c.card = { city: s.city, balance: 0 }; s.flags.troika = true;     // the first-month checklist counts it
  return { ok: true, msg: `You have a ${cardName(s.city)} now. Top it up to ride for less.` };
}
export function topUpCard(s: State, amount: number): Result {
  const c = choresOf(s), a = Math.round(amount);
  if (!c.card || c.card.city !== s.city) return { ok: false, msg: `Get a ${cardName(s.city)} first.` };
  if (!(a >= 100 && a <= 5000)) return { ok: false, msg: 'Top up 100 to 5,000 ₽.' };
  if (s.money < a) return { ok: false, msg: 'You do not have that much.' };
  s.money -= a; c.card.balance += a;
  return { ok: true, msg: `${a} ₽ on your ${cardName(s.city)}.` };
}
