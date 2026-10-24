/* Moving up: the rented homes a player can move to from the starting room or dorm (a room in a kommunalka, a studio, a two-room flat), and the
   monthly utility bill (ZhKKh) of a rented home chosen this way. Moving costs a deposit of two weeks' rent and changes the weekly rent the game
   already charges. The bill is issued on the first day of each month and is due a week later; paying late adds a warning and a small penalty each
   week, never an eviction. Everything is opt-in: a player who never moves never sees a bill, and the bots never move, so the balance reports do not
   change. Pure functions over the game state. */
import type { State } from './engine';
import type { Dwelling } from './homes';

export interface Rental { id: RentalId; name: string; ru: string; icon: string; dwelling: Dwelling; rent: number; size: number; needs: string }
export type RentalId = 'kommunalka' | 'khrush' | 'studio' | 'eurotwo' | 'tworoom';
/** Weekly rents for Moscow and Saint Petersburg; other cities pay about two thirds. Invented game values. */
export const RENTALS: Rental[] = [
  { id: 'kommunalka', name: 'A room in a kommunalka', ru: 'Комната в коммуналке', icon: '🚪', dwelling: 'kommunal', rent: 4500, size: 18, needs: 'nothing' },
  { id: 'khrush', name: 'A one-room flat in a khrushchyovka', ru: 'Однушка в хрущёвке', icon: '🏚️', dwelling: 'khrush', rent: 6500, size: 31, needs: 'nothing' },
  { id: 'studio', name: 'A studio flat', ru: 'Студия', icon: '🏢', dwelling: 'studio', rent: 9000, size: 28, needs: 'a job or a good reputation (40)' },
  { id: 'eurotwo', name: 'A euro-two in a new block', ru: 'Евродвушка в новостройке', icon: '🏙️', dwelling: 'eurotwo', rent: 12000, size: 40, needs: 'a job' },
  { id: 'tworoom', name: 'A two-room flat', ru: 'Двухкомнатная квартира', icon: '🏠', dwelling: 'family', rent: 15000, size: 52, needs: 'a job and four weeks of rent in the bank' },
];
const BIG = ['Moscow', 'Saint Petersburg'];
export const rentIn = (r: Rental, city: string): number => (BIG.includes(city) ? r.rent : Math.round((r.rent * 0.65) / 100) * 100);

export interface Bill { month: string; amount: number; issued: number; due: number; paid: boolean; warnings: number }
export interface Home { rental?: RentalId; bills: Bill[] }
export interface Result { ok: boolean; msg: string }
type S = State & { home2?: Home };
const date = (day: number): Date => new Date(new Date(2026, 8, 1).getTime() + day * 864e5);
const monthKey = (day: number): string => { const d = date(day); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export function homeOf(s: State): Home {
  const x = s as S;
  if (!x.home2 || typeof x.home2 !== 'object' || !Array.isArray(x.home2.bills)) x.home2 = { bills: [] };
  return x.home2;
}
/** The rented home the player moved to, if any (only while renting). */
export const rentalOf = (s: State): Rental | undefined => (s.housing === 'rented' ? RENTALS.find(r => r.id === homeOf(s).rental) : undefined);
/** Why the player cannot move there now, or null. */
export function cannotMove(s: State, id: RentalId): string | null {
  const r = RENTALS.find(x => x.id === id); if (!r) return 'There is no such home.';
  if (s.housing !== 'rented') return 'You own your home: there is no need to rent.';
  if (homeOf(s).rental === id) return 'You already live here.';
  const rent = rentIn(r, s.city);
  if (id === 'studio' && !s.job && s.rep < 40) return 'The landlord wants a job or a good reputation.';
  if (id === 'eurotwo' && !s.job) return 'The landlord wants a job.';
  if (id === 'tworoom' && (!s.job || s.money < rent * 4)) return 'The landlord wants a job and four weeks of rent in the bank.';
  if (s.money < rent * 2) return `The deposit is two weeks of rent: ${rent * 2} roubles.`;
  return null;
}
/** Moves into a rented home: pays the deposit and sets the new weekly rent. */
export function moveTo(s: State, id: RentalId): Result {
  const why = cannotMove(s, id); if (why) return { ok: false, msg: why };
  const r = RENTALS.find(x => x.id === id) as Rental, rent = rentIn(r, s.city);
  s.money -= rent * 2; s.rent = rent; homeOf(s).rental = id;
  return { ok: true, msg: `You move into ${r.name.toLowerCase()}. The deposit was ${rent * 2} roubles; the rent is now ${rent} a week. Utilities are billed monthly.` };
}

/** The utility bill of a month: by the size of the home, more in the heating season (October to April). */
export function billFor(s: State, day = s.day): number {
  const r = rentalOf(s); if (!r) return 0;
  const m = date(day).getMonth() + 1, heating = m >= 10 || m <= 4;
  return Math.round((r.size * (heating ? 140 : 90)) / 10) * 10;
}
export const DUE_DAYS = 7, PENALTY = 0.05, MAX_WARNINGS = 3;
/** Brings the bills up to date (called when the screen opens and at each turn): a new bill on the first day of a month, and a warning for each week
    an unpaid bill is late. Returns the lines to tell the player. */
export function tickBills(s: State): string[] {
  const h = homeOf(s), out: string[] = []; if (!rentalOf(s)) return out;
  const key = monthKey(s.day);
  if (!h.bills.some(b => b.month === key)) { const amount = billFor(s); h.bills.push({ month: key, amount, issued: s.day, due: s.day + DUE_DAYS, paid: false, warnings: 0 }); out.push(`The utility bill for this month: ${amount} roubles, due in a week.`); }
  for (const b of h.bills) {
    if (b.paid) continue;
    const weeksLate = Math.floor((s.day - b.due) / 7) + 1;
    while (s.day >= b.due && b.warnings < Math.min(MAX_WARNINGS, weeksLate)) { b.warnings++; b.amount = Math.round((b.amount * (1 + PENALTY)) / 10) * 10; out.push(`Utility bill overdue: warning ${b.warnings} of ${MAX_WARNINGS}, now ${b.amount} roubles.`); }
  }
  h.bills = h.bills.slice(-12);
  return out;
}
export const unpaid = (s: State): Bill[] => homeOf(s).bills.filter(b => !b.paid);
/** Pays every unpaid bill, if there is the money. */
export function payBills(s: State): Result {
  const list = unpaid(s), sum = list.reduce((n, b) => n + b.amount, 0);
  if (!list.length) return { ok: false, msg: 'Nothing to pay.' };
  if (s.money < sum) return { ok: false, msg: `The bills come to ${sum} roubles; you have ${s.money}.` };
  s.money -= sum; for (const b of list) b.paid = true;
  return { ok: true, msg: `Utilities paid: ${sum} roubles.` };
}
