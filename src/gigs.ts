/* Starter jobs from the phone's Jobs app: a courier and a barista. A shift is a short mini-game, and how well it is played decides the pay:
   the courier chooses the order of the deliveries on a small map of the district (the shorter the route, the better), the barista makes the drinks the
   customers ask for (every drink right is a point). A shift takes energy and some hunger and can be done once a day; ten good shifts raise the rank and
   the pay. Opt-in and small money (about a day's odd job), so the bots never use it and the balance does not change. Pure and deterministic. */
import type { State } from './engine';
import { needsOf } from './needs';

export type GigId = 'courier' | 'barista';
export interface Gig { id: GigId; name: string; ru: string; icon: string; base: number; energy: number; ranks: string[]; ranksRu: string[] }
export const GIGS: Gig[] = [
  { id: 'courier', name: 'Courier', ru: 'Курьер', icon: '🚴', base: 1100, energy: 22, ranks: ['Newcomer', 'Courier', 'Senior courier'], ranksRu: ['Новичок', 'Курьер', 'Старший курьер'] },
  { id: 'barista', name: 'Barista', ru: 'Бариста', icon: '☕', base: 1000, energy: 18, ranks: ['Trainee', 'Barista', 'Head barista'], ranksRu: ['Стажёр', 'Бариста', 'Старший бариста'] },
];
export const RANK_AT = [0, 10, 25];          // shifts needed for each rank
export const RANK_BONUS = [1, 1.1, 1.2];
export interface GigBook { shifts: Partial<Record<GigId, number>>; best: Partial<Record<GigId, number>>; lastDay: Partial<Record<GigId, number>>; earned: number }
type S = State & { gigs?: GigBook };
const rng = (seed: string): (() => number) => { let h = 2166136261; for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0; let v = h || 1; return () => { v = (Math.imul(v ^ (v >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return (v >>> 8) / 16777216; }; };

export function gigsOf(s: State): GigBook {
  const x = s as S;
  if (!x.gigs || typeof x.gigs !== 'object') x.gigs = { shifts: {}, best: {}, lastDay: {}, earned: 0 };
  return x.gigs;
}
export const rankOf = (s: State, id: GigId): number => { const n = gigsOf(s).shifts[id] ?? 0; return RANK_AT.filter(r => n >= r).length - 1; };
/** Why a shift cannot start now, or null. */
export function cannotWork(s: State, id: GigId): string | null {
  const g = GIGS.find(x => x.id === id); if (!g) return 'There is no such job.';
  if (gigsOf(s).lastDay[id] === s.day) return 'One shift a day. Come back tomorrow.';
  if (s.energy < g.energy + 5) return 'You are too tired for a shift.';
  if (s.phone <= 0) return 'You need a working phone to take shifts.';
  return null;
}

/* ---------- the courier: a route through the district ---------- */
export interface Pt { x: number; y: number }
export interface CourierRound { depot: Pt; stops: Pt[] }
/** Four deliveries on a 6 x 6 map of the district, the same for the same day. */
export function courierRound(s: State): CourierRound {
  const r = rng(`courier|${s.city}|${s.day}`), pts: Pt[] = [], depot = { x: 0, y: 0 };
  while (pts.length < 4) { const p = { x: 1 + Math.floor(r() * 5), y: 1 + Math.floor(r() * 5) }; if (!pts.some(q => q.x === p.x && q.y === p.y)) pts.push(p); }
  return { depot, stops: pts };
}
/** Blocks walked (streets run on a grid) from the depot through the stops in the given order. */
export function routeLength(round: CourierRound, order: number[]): number {
  let at = round.depot, n = 0;
  for (const i of order) { const p = round.stops[i]; n += Math.abs(p.x - at.x) + Math.abs(p.y - at.y); at = p; }
  return n;
}
const perms = (a: number[]): number[][] => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p])));
/** The shortest possible route. */
export const bestRoute = (round: CourierRound): number => Math.min(...perms(round.stops.map((_, i) => i)).map(o => routeLength(round, o)));
/** How good a chosen order is: 1 for the shortest route, less for longer ones. An order that misses or repeats a stop scores 0. */
export function courierScore(round: CourierRound, order: number[]): number {
  if (order.length !== round.stops.length || new Set(order).size !== order.length || order.some(i => !(i >= 0 && i < round.stops.length))) return 0;
  return Math.max(0, Math.min(1, bestRoute(round) / routeLength(round, order)));
}

/* ---------- the barista: making the drinks people ask for ---------- */
export const DRINKS = ['Cappuccino', 'Latte', 'Americano', 'Raf', 'Tea'] as const;
export const DRINKS_RU = ['Капучино', 'Латте', 'Американо', 'Раф', 'Чай'] as const;
export const MILKS = ['None', 'Cow', 'Oat'] as const;
export const MILKS_RU = ['Без молока', 'Коровье', 'Овсяное'] as const;
export const SUGARS = [0, 1, 2] as const;
export interface Order { drink: number; milk: number; sugar: number }
/** Five orders, the same for the same day. Americano and tea come without milk more often. */
export function baristaRound(s: State): Order[] {
  const r = rng(`barista|${s.city}|${s.day}`);
  return Array.from({ length: 5 }, () => { const drink = Math.floor(r() * DRINKS.length), noMilk = drink === 2 || drink === 4; return { drink, milk: noMilk && r() < 0.7 ? 0 : 1 + Math.floor(r() * 2), sugar: Math.floor(r() * 3) }; });
}
/** The order as a customer says it. */
export function orderText(o: Order, ru = false): string {
  const d = (ru ? DRINKS_RU : DRINKS)[o.drink], m = o.milk === 0 ? (ru ? 'без молока' : 'no milk') : ru ? `на ${o.milk === 1 ? 'обычном' : 'овсяном'} молоке` : `with ${o.milk === 1 ? 'cow' : 'oat'} milk`;
  const sg = o.sugar === 0 ? (ru ? 'без сахара' : 'no sugar') : ru ? `${o.sugar} ложк${o.sugar === 1 ? 'а' : 'и'} сахара` : `${o.sugar} sugar${o.sugar > 1 ? 's' : ''}`;
  return `${d}, ${m}, ${sg}`;
}
/** How many of the made drinks match the orders, as a share. */
export function baristaScore(orders: Order[], made: Order[]): number {
  if (!orders.length) return 0;
  return orders.filter((o, i) => made[i] && made[i].drink === o.drink && made[i].milk === o.milk && made[i].sugar === o.sugar).length / orders.length;
}

/* ---------- paying the shift ---------- */
export interface Paid { ok: boolean; msg: string; pay: number; rankUp: boolean }
/** Ends a shift with a score from 0 to 1: pays between 60 and 120 per cent of the job's base (more at a higher rank), takes energy and hunger. */
export function finishShift(s: State, id: GigId, score: number): Paid {
  const why = cannotWork(s, id); if (why) return { ok: false, msg: why, pay: 0, rankUp: false };
  const g = GIGS.find(x => x.id === id) as Gig, b = gigsOf(s), before = rankOf(s, id), sc = Math.max(0, Math.min(1, Number(score) || 0));
  const pay = Math.round((g.base * (0.6 + 0.6 * sc) * RANK_BONUS[before]) / 10) * 10;
  s.money += pay; s.energy = Math.max(0, s.energy - g.energy); const n = needsOf(s); n.hunger = Math.max(0, n.hunger - 10);
  b.lastDay[id] = s.day; b.earned += pay; if (sc >= 0.5) b.shifts[id] = (b.shifts[id] ?? 0) + 1; b.best[id] = Math.max(b.best[id] ?? 0, sc);
  const rankUp = rankOf(s, id) > before;
  return { ok: true, msg: `${g.name} shift done: ${pay} roubles${sc >= 0.95 ? ', and a thank-you from the boss' : sc < 0.5 ? ' (a weak shift does not count toward a promotion)' : ''}.${rankUp ? ` Promoted: ${g.ranks[rankOf(s, id)]}!` : ''}`, pay, rankUp };
}
