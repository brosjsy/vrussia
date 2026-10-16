/* Cooking at home. The player keeps a pantry of groceries (bought by the bag: cheaper at the market, dearer at the corner shop or by delivery) and cooks
   at the stove. Five Russian and Central Asian dishes and a packet of noodles for the beginner: a harder dish needs more groceries and more skill,
   fills more and leaves a better feeling for the rest of the day (a moodlet). Cooking takes no part of the day, but the stove can be used at most twice
   in each part of the day, and every dish cooked teaches a little. Everything is opt-in: the bots never cook, so the balance reports do not change.
   Pure functions over the game state. */
import { bump } from './events';
import type { State } from './engine';
import { needsOf } from './needs';

export interface Recipe { id: string; name: string; ru: string; icon: string; portions: number; skill: number; hunger: number; mood: number; learn: number }
/** The dishes, from the easiest. `portions` of groceries used; `skill` needed (0 to 100); `hunger` filled; `mood` the weight of the good feeling. */
export const RECIPES: Recipe[] = [
  { id: 'noodles', name: 'Instant noodles', ru: 'Лапша быстрого приготовления', icon: '🍜', portions: 1, skill: 0, hunger: 25, mood: 0, learn: 1 },
  { id: 'syrniki', name: 'Syrniki (cottage cheese pancakes)', ru: 'Сырники', icon: '🥞', portions: 1, skill: 5, hunger: 35, mood: 1, learn: 3 },
  { id: 'blini', name: 'Blini', ru: 'Блины', icon: '🥞', portions: 2, skill: 12, hunger: 45, mood: 2, learn: 4 },
  { id: 'pelmeni', name: 'Home-made pelmeni', ru: 'Пельмени', icon: '🥟', portions: 2, skill: 22, hunger: 60, mood: 2, learn: 5 },
  { id: 'plov', name: 'Plov', ru: 'Плов', icon: '🍚', portions: 3, skill: 35, hunger: 75, mood: 3, learn: 6 },
  { id: 'borsch', name: 'Borscht', ru: 'Борщ', icon: '🍲', portions: 3, skill: 45, hunger: 80, mood: 3, learn: 6 },
];
/** A bag of groceries is this many portions; where it is bought decides the price. */
export const BAG = 5;
export const BAG_PRICE = { market: 450, shop: 600, delivery: 850 } as const;
export type Where = keyof typeof BAG_PRICE;
export const PER_SLOT = 2;

export interface Kitchen { pantry: number; skill: number; meal?: { id: string; day: number }; used?: { slot: number; n: number } }
export interface Result { ok: boolean; msg: string }
type S = State & { kitchen?: Kitchen };
const clamp = (v: number): number => Math.max(0, Math.min(100, Math.round(v)));
const slotNo = (s: State): number => s.day * 3 + s.slot;

/** The player's kitchen (made on first use). */
export function kitchenOf(s: State): Kitchen {
  const x = s as S;
  if (!x.kitchen || typeof x.kitchen !== 'object') x.kitchen = { pantry: 0, skill: 0 };
  const k = x.kitchen; k.pantry = Math.max(0, Math.floor(Number(k.pantry) || 0)); k.skill = clamp(Number(k.skill) || 0);
  return k;
}
/** Where groceries can be bought right now: the market only when the player is there; the corner shop and delivery anywhere. */
export const shopsHere = (s: State): Where[] => (s.loc === 'market' ? ['market', 'shop', 'delivery'] : ['shop', 'delivery']);
/** Buys a bag of groceries. */
export function buyGroceries(s: State, where: Where): Result {
  if (!shopsHere(s).includes(where)) return { ok: false, msg: 'The market is only open to you when you are there.' };
  const price = BAG_PRICE[where]; if (s.money < price) return { ok: false, msg: 'Not enough money for a bag of groceries.' };
  s.money -= price; kitchenOf(s).pantry += BAG;
  return { ok: true, msg: `A bag of groceries (${BAG} portions) for ${price} roubles${where === 'delivery' ? ', brought to the door' : ''}.` };
}
/** Why a dish cannot be cooked now, or null. */
export function cannotCook(s: State, r: Recipe): string | null {
  const k = kitchenOf(s);
  if (k.skill < r.skill) return `Needs cooking skill ${r.skill} (you have ${k.skill}).`;
  if (k.pantry < r.portions) return `Needs ${r.portions} ${r.portions === 1 ? 'portion' : 'portions'} of groceries (you have ${k.pantry}).`;
  if (k.used && k.used.slot === slotNo(s) && k.used.n >= PER_SLOT) return 'The stove has done enough for this part of the day.';
  return null;
}
/** Cooks a dish and eats it: groceries go, hunger fills, the skill grows, and the dish leaves a good feeling for the rest of the day. */
export function cook(s: State, id: string): Result {
  const r = RECIPES.find(x => x.id === id); if (!r) return { ok: false, msg: 'There is no such dish.' };
  const why = cannotCook(s, r); if (why) return { ok: false, msg: why };
  const k = kitchenOf(s), n = needsOf(s), now = slotNo(s);
  k.pantry -= r.portions; n.hunger = clamp(n.hunger + r.hunger); k.skill = clamp(k.skill + r.learn);
  k.used = k.used && k.used.slot === now ? { slot: now, n: k.used.n + 1 } : { slot: now, n: 1 };
  if (r.mood > 0 && (!k.meal || k.meal.day !== s.day || (RECIPES.find(x => x.id === k.meal!.id)?.mood ?? 0) <= r.mood)) k.meal = { id: r.id, day: s.day };
  bump(s, 'cook'); if (r.id === 'blini') bump(s, 'blini');                     // holiday tasks (events.ts)
  return { ok: true, msg: `${r.name}: done and eaten.${r.mood ? ' Delicious.' : ''}` };
}
/** The feeling a good meal leaves (for the moodlets), or null. */
export function mealMoodlet(s: State): { key: string; v: number } | null {
  const k = (s as S).kitchen; if (!k?.meal || k.meal.day !== s.day) return null;
  const r = RECIPES.find(x => x.id === k.meal!.id); return r && r.mood ? { key: `ml.meal.${r.id}`, v: r.mood } : null;
}
