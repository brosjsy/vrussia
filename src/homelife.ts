/* Life at home between the big events: the flat gets dirty, the dishes pile up, the rubbish bag fills, the plants dry out, things break (a dripping
   tap, a dead socket, the fridge), the keys get lost, and the player oversleeps without an alarm. The player washes up, cleans (or pays a cleaner),
   takes the rubbish out (and sorts it: Moscow and many cities collect plastic and paper apart), waters the plants, fixes things or calls a handyman,
   calls a locksmith, sets the alarm, watches a series, reads, naps. Neglect costs stress, hygiene and money; care is small comfort every day.
   Prices are game values. The daily part runs with the other end-of-turn rules when this module is loaded (the page loads it at the start). */
import type { State } from './engine';
import { advance } from './engine';
import { turnHooks } from './turn';

export type Breakdown = 'tap' | 'socket' | 'fridge' | 'heater';
export interface Plant { name: string; water: number }
export interface HomeLife { dirt: number; dishes: number; rubbish: number; plants: Plant[]; broken: Breakdown | null; brokenDay: number; keysLost: boolean; alarm: number | null; series: number; books: number; pages: number; done: Record<string, number>; ticked: number; sorted: number }
export interface Result { ok: boolean; msg: string }

type S = State & { homelife?: HomeLife };
export const homeOf = (s: State): HomeLife => {
  const x = s as S;
  if (!x.homelife || typeof x.homelife !== 'object') x.homelife = { dirt: 20, dishes: 2, rubbish: 30, plants: [], broken: null, brokenDay: -1, keysLost: false, alarm: 7 * 60, series: 0, books: 0, pages: 0, done: {}, ticked: s.day, sorted: 0 };
  return x.homelife;
};
const clamp = (v: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, v));
const hash = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };
const luck = (s: State, what: string): number => (hash(`${s.name}|${s.day}|${what}`) % 10000) / 10000;
const needs = (s: State): { hunger: number; hygiene: number; social: number; fun: number; bladder: number } | null => (s as State & { needs?: { hunger: number; hygiene: number; social: number; fun: number; bladder: number } }).needs ?? null;
const no = (msg: string): Result => ({ ok: false, msg });
/** Once a day for each thing. */
const once = (s: State, key: string): string | null => homeOf(s).done[key] === s.day ? 'You did that today already.' : null;
const mark = (s: State, key: string): void => { homeOf(s).done[key] = s.day; };
const atHome = (s: State): string | null => s.loc !== 'home' ? 'You are not at home.' : homeOf(s).keysLost ? 'You lost your keys: you cannot get in. Call a locksmith.' : null;

export const BREAK: Record<Breakdown, { name: string; ru: string; diy: number; pro: number; text: string }> = {
  tap: { name: 'The kitchen tap drips', ru: 'Капает кран на кухне', diy: 0.7, pro: 1500, text: 'The water bill grows, drop by drop, and you hear it at night.' },
  socket: { name: 'A socket sparks and is dead', ru: 'Искрит и не работает розетка', diy: 0.4, pro: 2000, text: 'Do not touch it wet. An electrician is safer.' },
  fridge: { name: 'The fridge stopped cooling', ru: 'Холодильник перестал морозить', diy: 0.2, pro: 4500, text: 'The food will spoil in a day or two.' },
  heater: { name: 'The radiator is cold', ru: 'Батарея холодная', diy: 0.5, pro: 0, text: 'Probably air in the system. The building\'s management company fixes radiators for free.' },
};

/** The day's changes at home: dirt, dishes, rubbish, thirsty plants, a breakdown, lost keys; and what neglect costs. */
export function tickHome(s: State): string[] {
  const h = homeOf(s); if (h.ticked >= s.day || s.over) return [];
  const days = Math.min(30, s.day - h.ticked); h.ticked = s.day;
  const people = 1 + (s.partner ? 1 : 0) + s.kids;
  h.dirt = clamp(h.dirt + 5 * days * (0.7 + 0.3 * people)); h.dishes = Math.min(30, h.dishes + 2 * days * people); h.rubbish = clamp(h.rubbish + 12 * days * (0.8 + 0.2 * people));
  for (const p of h.plants) p.water = clamp(p.water - 15 * days);
  const out: string[] = [];
  const dead = h.plants.filter(p => p.water <= 0); if (dead.length) { h.plants = h.plants.filter(p => p.water > 0); out.push(`🥀 ${dead.map(p => p.name).join(', ')} dried out.`); }
  const n = needs(s);
  if (h.dirt >= 80) { s.stress = clamp(s.stress + 2); if (n) n.hygiene = clamp(n.hygiene - 5); out.push('The flat is a mess: it weighs on you.'); }
  if (h.rubbish >= 100) { s.rep = clamp(s.rep - 1); out.push('The rubbish smells; a neighbour mentioned it on the stairs.'); }
  if (h.broken === 'tap') s.money -= 60;
  if (h.broken === 'fridge' && s.day - h.brokenDay >= 2) { out.push('The food in the broken fridge spoiled.'); if (n) n.hunger = clamp(n.hunger - 10); }
  if (!h.broken && luck(s, 'break') < 0.02 * days) { const k = (['tap', 'socket', 'fridge', 'heater'] as Breakdown[])[hash(`${s.day}|b`) % 4]; h.broken = k; h.brokenDay = s.day; out.push(`🔧 ${BREAK[k].name}. ${BREAK[k].text}`); }
  if (!h.keysLost && luck(s, 'keys') < 0.008 * days) { h.keysLost = true; out.push('🔑 You cannot find your keys anywhere. Locked out.'); }
  if (oversleeps(s)) { advance(s); out.push('⏰ No alarm, and you were tired: you slept through the whole morning.'); }
  return out;
}

export function washDishes(s: State): Result { const w = atHome(s) ?? once(s, 'dishes'); if (w) return no(w); const h = homeOf(s); if (!h.dishes) return no('The sink is empty.'); s.energy = clamp(s.energy - 4); h.dishes = 0; mark(s, 'dishes'); return { ok: true, msg: 'The sink is empty and the plates are on the rack.' }; }
export function clean(s: State, hire: boolean): Result {
  const w = atHome(s) ?? once(s, 'clean'); if (w) return no(w); const h = homeOf(s);
  if (hire) { if (s.money < 2500) return no('A cleaner costs 2,500 ₽.'); s.money -= 2500; } else { if (s.energy < 15) return no('You are too tired to clean.'); s.energy = clamp(s.energy - 12); }
  h.dirt = 0; s.stress = clamp(s.stress - 4); mark(s, 'clean');
  return { ok: true, msg: hire ? 'A cleaner from an app did the whole flat in three hours (2,500 ₽).' : 'You vacuumed, mopped and dusted. The flat breathes.' };
}
export function rubbish(s: State, sort: boolean): Result {
  const w = once(s, 'rubbish'); if (w) return no(w); const h = homeOf(s); if (h.rubbish < 10) return no('The bin is almost empty.');
  s.energy = clamp(s.energy - (sort ? 4 : 2)); h.rubbish = 0; mark(s, 'rubbish'); if (sort) { h.sorted++; if (h.sorted % 5 === 0) s.rep = clamp(s.rep + 1); }
  return { ok: true, msg: sort ? 'Plastic and paper into the blue container, the rest into the grey one.' : 'One bag down the stairs to the containers in the yard.' };
}
export function buyPlant(s: State, name: string): Result { const h = homeOf(s); if (h.plants.length >= 6) return no('No room on the windowsill.'); if (s.money < 600) return no('A plant costs 600 ₽.'); s.money -= 600; h.plants.push({ name: name.trim().slice(0, 20) || 'A ficus', water: 80 }); return { ok: true, msg: `${h.plants[h.plants.length - 1].name} is on the windowsill.` }; }
export function water(s: State): Result { const w = atHome(s) ?? once(s, 'water'); if (w) return no(w); const h = homeOf(s); if (!h.plants.length) return no('You have no plants.'); for (const p of h.plants) p.water = 100; s.stress = clamp(s.stress - 1); mark(s, 'water'); return { ok: true, msg: 'The plants are watered. One of them has a new leaf.' }; }
/** Fixing a breakdown: yourself (it may go wrong; knowledge helps), a handyman, or for a cold radiator the management company (free, two days). */
export function fix(s: State, how: 'diy' | 'pro'): Result {
  const h = homeOf(s), k = h.broken; if (!k) return no('Nothing is broken.'); const b = BREAK[k];
  if (how === 'pro') { if (s.money < b.pro) return no(`The handyman asks ${b.pro.toLocaleString('en-US')} ₽.`); s.money -= b.pro; h.broken = null; return { ok: true, msg: b.pro ? `A handyman came the same evening and fixed it (${b.pro.toLocaleString('en-US')} ₽).` : 'You called the management company: a plumber bled the radiator the next day, free of charge.' }; }
  const w = atHome(s); if (w) return no(w);
  s.energy = clamp(s.energy - 10);
  if (luck(s, 'diy' + k) < b.diy + s.know / 400) { h.broken = null; s.stress = clamp(s.stress - 3); return { ok: true, msg: 'A video, a spanner and an hour: fixed it yourself.' }; }
  if (k === 'socket') { s.health = clamp(s.health - 8); return { ok: true, msg: 'A shock threw your hand back. Call an electrician.' }; }
  return { ok: true, msg: 'It is worse now. Time for a handyman.' };
}
export function locksmith(s: State): Result { const h = homeOf(s); if (!h.keysLost) return no('Your keys are in your pocket.'); if (s.money < 3000) return no('The locksmith asks 3,000 ₽ and your passport with the address.'); s.money -= 3000; h.keysLost = false; return { ok: true, msg: 'A locksmith opened the door in twenty minutes, checked your registration and changed the lock (3,000 ₽).' }; }
export function setAlarm(s: State, minute: number | null): Result { homeOf(s).alarm = minute; return { ok: true, msg: minute === null ? 'No alarm: you will wake when you wake.' : `The alarm is set for ${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}.` }; }
/** Without an alarm, a tired person may sleep through the morning (the morning part of the day is lost). */
export function oversleeps(s: State): boolean { return homeOf(s).alarm === null && s.slot === 0 && s.energy < 40 && luck(s, 'sleep') < 0.5; }
export function watchSeries(s: State): Result { const w = atHome(s) ?? once(s, 'tv'); if (w) return no(w); const h = homeOf(s); h.series++; s.stress = clamp(s.stress - 6); const n = needs(s); if (n) n.fun = clamp(n.fun + 20); mark(s, 'tv'); return { ok: true, msg: `Episode ${h.series} of a Russian series about a family in a village. ${h.series % 8 === 0 ? 'The season ends on a cliffhanger.' : 'One more? Tomorrow.'}` }; }
export function read(s: State): Result {
  const w = once(s, 'read'); if (w) return no(w); const h = homeOf(s); h.pages += 40; s.know = clamp(s.know + 1); s.stress = clamp(s.stress - 3); const n = needs(s); if (n) n.fun = clamp(n.fun + 8); mark(s, 'read');
  if (h.pages >= 300) { h.pages = 0; h.books++; return { ok: true, msg: `You finished a book: that makes ${h.books}.` }; }
  return { ok: true, msg: 'Forty pages before sleep.' };
}
export function nap(s: State): Result { const w = atHome(s) ?? once(s, 'nap'); if (w) return no(w); if (s.slot === 2) return no('It is evening: go to bed instead.'); s.energy = clamp(s.energy + 15); mark(s, 'nap'); advance(s); return { ok: true, msg: 'Half an hour that became two. You wake up rested and a bit lost.' }; }

turnHooks.push(tickHome);
