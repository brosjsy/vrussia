/* The cooking challenge: any of the dishes (cook-dishes-*.ts) cooked step by step at home. The player picks the ingredients from a shelf with some that
   do not belong, prepares each (wash it? peel it? pat it dry? thaw it how?) and answers the steps of cooking that kind of dish, each with the right
   way and the usual mistakes. A hint costs a little of the score. At the end: stars, the picture of the dish, what went wrong and why, the danger
   mistakes (washing raw chicken, thawing on the counter, the pot left out overnight) which can make the player ill, and suggestions: similar dishes,
   what the pantry already allows, the dish of the day. Staples (flour, oil, spices, grain, tins) stay in the pantry once bought; fresh food is used up.
   The skill is the kitchen skill of cooking.ts. Pure rules over the game state; the dishes are added by the lazy loader. */
import type { State } from './engine';
import { advance, dateOf } from './engine';
import { ING, PREP, TYPES, LEFTOVER, DONENESS, SAFETY, CUISINES } from './cook-data';
import { homeOf } from './homelife';
import type { Kind, Step } from './cook-data';
import type { Dish } from './cook-dishes-a';
import { kitchenOf } from './cooking';
import { needsOf } from './needs';

export interface DishInfo { id: string; name: string; ru: string; cuisine: string; type: string; ings: string[]; minutes: number; level: number }
export const DISHES: DishInfo[] = [];
const byId = new Map<string, DishInfo>();
/** Adds a file of dish lines (each id once). */
export function addDishes(rows: Dish[]): void {
  for (const [id, name, ru, cuisine, type, ings, minutes, level] of rows) {
    if (byId.has(id)) continue;
    const d: DishInfo = { id, name, ru, cuisine, type, ings: ings.split(/\s+/).filter(Boolean), minutes, level }; DISHES.push(d); byId.set(id, d);
  }
}
/** Loads every dish file (each its own small download). */
export async function loadDishes(): Promise<DishInfo[]> {
  const [a, b, c, d] = await Promise.all([import('./cook-dishes-a'), import('./cook-dishes-b'), import('./cook-dishes-c'), import('./cook-dishes-d')]);
  addDishes(a.DISHES_A); addDishes(b.DISHES_B); addDishes(c.DISHES_C); addDishes(d.DISHES_D); return DISHES;
}
export const dishOf = (id: string): DishInfo | undefined => byId.get(id);

/** The Russian of the messages above, by their English (filled as each message is made, so names and numbers are in it). */
export const MSG_RU = new Map<string, string>();
const L = (en: string, ruText: string): string => { if (MSG_RU.size > 400) MSG_RU.clear(); MSG_RU.set(en, ruText); return en; };
const hash = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };
const clamp = (v: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, Math.round(v)));
/** A deterministic shuffle. */
function shuffle<T>(xs: T[], seed: string): T[] { return xs.map((x, i) => [hash(`${seed}|${i}`), x] as const).sort((a, b) => a[0] - b[0]).map(p => p[1]); }

/** Staples stay in the pantry once bought. */
const STAPLE: Kind[] = ['spice', 'oil', 'dry', 'flour', 'grain', 'legume', 'kidney', 'sauce', 'tin', 'sweet', 'drink', 'nut'];
export const isStaple = (k: string): boolean => STAPLE.includes(ING[k]?.[3] as Kind);
/** Kinds whose mistakes are a danger to health, not only to taste. */
const RISKY: Kind[] = ['poultry', 'meat', 'mince', 'fish', 'sea', 'egg', 'kidney', 'frozen', 'flour', 'tin', 'mush'];

export interface CookState { best: Record<string, number>; count: Record<string, number>; pantry: string[]; xp: number; meals: { id: string; day: number; n: number }[]; ill?: number; diet?: Diet; shared?: Record<string, number>; kit?: string[]; called?: number; freeHint?: boolean; fresh?: Record<string, number>; wasted?: number; shop?: Shop; cuisineOf?: Record<string, string>; safeRun?: number; hosted?: boolean }
type SS = State & { cook?: CookState };
export function cookOf(s: State): CookState {
  const x = s as SS; if (!x.cook) x.cook = { best: {}, count: {}, pantry: ['salt', 'water'], xp: 0, meals: [] };
  return x.cook;
}
export const TITLES = ['Beginner', 'Learner', 'Home cook', 'Good cook', 'Family chef', 'Master of the kitchen'];
export const TITLES_RU = ['Новичок', 'Ученик', 'Домашний повар', 'Хороший повар', 'Шеф семьи', 'Мастер кухни'];
/** The cook's rank from the experience: 0 to 5. */
export const rankOf = (s: State): number => { const xp = cookOf(s).xp; return xp >= 3000 ? 5 : xp >= 1500 ? 4 : xp >= 700 ? 3 : xp >= 250 ? 2 : xp >= 60 ? 1 : 0; };

/** Diets: halal (no pork, ham, salo, bacon or wine; sausage counts as pork to be safe), vegetarian (no meat, poultry, fish or seafood), vegan (also no
   dairy, eggs or honey; it is also the Orthodox fast without fish). */
export type Diet = 'any' | 'halal' | 'veg' | 'vegan';
export const DIETS: Record<Diet, [string, string]> = { any: ['Everything', 'Всё'], halal: ['Halal (no pork, no wine)', 'Халяль (без свинины и вина)'], veg: ['Vegetarian', 'Вегетарианское'], vegan: ['Vegan / the fast', 'Веганское / постное'] };
const PORK = new Set(['pork', 'bacon', 'ham', 'salo', 'sausage', 'wine']);
const ANIMAL: Kind[] = ['poultry', 'meat', 'mince', 'fish', 'sea'], ANIMAL_KEYS = new Set(['sausage', 'ham', 'salo', 'herring', 'driedfish', 'tuna', 'crayfish', 'caviar', 'fishsauce', 'gelatin', 'stockcube']);
const FROM_ANIMALS: Kind[] = ['egg', 'dairy', 'cheese'];
export function dietOk(d: DishInfo, diet: Diet = 'any'): boolean {
  if (diet === 'any') return true;
  if (diet === 'halal') return !d.ings.some(k => PORK.has(k));
  const meat = d.ings.some(k => ANIMAL.includes(ING[k][3]) || ANIMAL_KEYS.has(k));
  if (diet === 'veg') return !meat;
  return !meat && !d.ings.some(k => (FROM_ANIMALS.includes(ING[k][3]) && k !== 'tofu' && k !== 'coconut') || k === 'honey' || k === 'butter' || k === 'ghee' || k === 'condensed' || k === 'icecream');
}
export const dietOf = (s: State): Diet => cookOf(s).diet ?? 'any';

/** Who the cooked dish is shared with (once per cooking): the partner, guests, the neighbours. */
export type Share = 'partner' | 'guests' | 'neighbours' | 'family';
/** What a guest cannot eat. The allergens follow the common food allergy lists: nuts, sesame, gluten, milk, eggs, fish and seafood. */
export type Need = 'nuts' | 'sesame' | 'gluten' | 'milk' | 'egg' | 'fish' | 'halal' | 'veg';
export const NEED_TEXT: Record<Need, [string, string]> = { nuts: ['allergic to nuts', 'аллергия на орехи'], sesame: ['allergic to sesame', 'аллергия на кунжут'], gluten: ['no gluten (coeliac)', 'без глютена (целиакия)'],
  milk: ['no milk (lactose)', 'без молока (лактоза)'], egg: ['allergic to eggs', 'аллергия на яйца'], fish: ['allergic to fish and seafood', 'аллергия на рыбу и морепродукты'], halal: ['eats halal', 'ест халяль'], veg: ['vegetarian', 'вегетарианец'] };
const NEED_KEYS: Record<Exclude<Need, 'halal' | 'veg'>, (k: string) => boolean> = {
  nuts: k => ['peanut', 'walnut', 'almond', 'pinenut', 'peanutbutter'].includes(k), sesame: k => ['sesame', 'sesameoil', 'tahini'].includes(k),
  gluten: k => ['flour', 'ryeflour', 'bread', 'ryebread', 'lavash', 'pasta', 'noodles', 'semolina', 'bulgur', 'couscous', 'barley', 'dough', 'soysauce', 'kvass'].includes(k),
  milk: k => (['dairy', 'cheese'].includes(ING[k]?.[3]) && k !== 'tofu') || ['butter', 'ghee', 'condensed', 'icecream'].includes(k),
  egg: k => k === 'egg', fish: k => ['fish', 'sea'].includes(ING[k]?.[3]) || ['herring', 'driedfish', 'tuna', 'crayfish', 'caviar', 'fishsauce'].includes(k),
};
/** Can someone with this need eat the dish? */
export const safeFor = (d: DishInfo, need: Need): boolean => need === 'halal' ? dietOk(d, 'halal') : need === 'veg' ? dietOk(d, 'veg') : !d.ings.some(NEED_KEYS[need]);
const GUEST_NAMES = ['Aigul', 'Tunde', 'Masha', 'Rustam', 'Chiamaka', 'Dima', 'Zarina', 'Kemi', 'Oleg', 'Farida', 'Seun', 'Katya', 'Bakhtiyor', 'Amaka', 'Lena', 'Timur'];
const NEEDS: (Need | null)[] = ['nuts', 'gluten', 'milk', 'halal', 'veg', 'fish', 'egg', 'sesame', null, null, null, null];
/** This week's friends who would come round: three or four, some with a need. */
export function guestsOf(s: State): { name: string; need: Need | null }[] {
  const wk = Math.floor(s.day / 7), n = 3 + (hash(`${s.name}|${wk}|n`) % 2), out: { name: string; need: Need | null }[] = [];
  for (let i = 0; out.length < n && i < 40; i++) { const name = GUEST_NAMES[hash(`${s.name}|${wk}|g${i}`) % GUEST_NAMES.length]; if (name !== s.name && !out.some(g => g.name === name)) out.push({ name, need: NEEDS[hash(`${s.name}|${wk}|${name}`) % NEEDS.length] }); }
  return out;
}
/** Once a week, a call home for a family recipe: a little experience and a free hint for the next dish. */
export function callHome(s: State): { ok: boolean; msg: string } {
  const C = cookOf(s); if (C.called !== undefined && s.day - C.called < 7) return { ok: false, msg: L(`You called a few days ago; call again in ${7 - (s.day - C.called)} days.`, `Вы звонили на днях; позвоните снова через ${7 - (s.day - C.called)} дн.`) };
  C.called = s.day; C.xp += 20; C.freeHint = true; s.famLove = clamp(s.famLove + 4); const n = needsOf(s); n.social = clamp(n.social + 6);
  return { ok: true, msg: L('An hour on a video call: the family recipe, the secret everyone forgets to write down, and news from home. The next hint is free.', 'Час по видеосвязи: семейный рецепт, секрет, который все забывают записать, и новости из дома. Следующая подсказка бесплатна.') };
}
export function share(s: State, id: string, who: Share): { ok: boolean; msg: string } {
  const C = cookOf(s), d = dishOf(id), stars = C.best[id] ?? 0; C.shared ??= {};
  if (!d || !C.count[id]) return { ok: false, msg: L('Cook it first.', 'Сначала приготовьте.') };
  if ((C.shared[id] ?? -1) >= C.count[id]) return { ok: false, msg: L('This one is already shared.', 'Этим блюдом уже угостили.') };
  if (who === 'partner' && !s.partner) return { ok: false, msg: L('You have no partner to cook for.', 'У вас нет партнёра, для которого готовить.') };
  C.shared[id] = C.count[id]; const n = needsOf(s), good = stars >= 2;
  if (who === 'partner' && s.partner) { s.partner.love = clamp(s.partner.love + (good ? 6 : 1)); n.social = clamp(n.social + 10); return { ok: true, msg: good ? L(`${s.partner.name} loves the ${d.name}: "Make it again."`, `${s.partner.name} в восторге: ${d.ru}. «Приготовь ещё».`) : L(`${s.partner.name} eats the ${d.name} politely.`, `${s.partner.name} вежливо ест: ${d.ru}.`) }; }
  if (who === 'family') {
    if (!s.kids && !s.partner) { C.shared[id] = -1; return { ok: false, msg: L('There is no family at home to feed.', 'Дома нет семьи, которую нужно кормить.') }; }
    s.famLove = clamp(s.famLove + (good ? 5 : 2)); n.social = clamp(n.social + 8); if (s.partner) s.partner.love = clamp(s.partner.love + 2);
    return { ok: true, msg: good ? L(`The family eats the ${d.name} to the last spoon.`, `Семья съедает всё до последней ложки (${d.ru}).`) : L(`The family eats the ${d.name}; the children ask for bread.`, `Семья ест (${d.ru}); дети просят хлеба.`) };
  }
  if (who === 'guests') {
    const g = guestsOf(s), hurt = g.filter(x => x.need && !['halal', 'veg'].includes(x.need) && !safeFor(d, x.need)), cannot = g.filter(x => (x.need === 'halal' || x.need === 'veg') && !safeFor(d, x.need));
    n.social = clamp(n.social + 20); n.fun = clamp(n.fun + 8); s.stress = clamp(s.stress - 4);
    if (hurt.length) { s.rep = clamp(s.rep - 3); s.stress = clamp(s.stress + 10); return { ok: true, msg: L(`${hurt.map(x => x.name).join(' and ')} ${hurt.length > 1 ? 'are' : 'is'} ${NEED_TEXT[hurt[0].need as Need][0]}: the ${d.name} had it in. An antihistamine, an early taxi home and an awkward chat tomorrow. Ask your guests before you cook.`, `${hurt.map(x => x.name).join(' и ')}: ${NEED_TEXT[hurt[0].need as Need][1]}, а это было в блюде (${d.ru}). Антигистаминное, ранее такси домой и неловкий разговор завтра. Спрашивайте гостей, прежде чем готовить.`) }; }
    s.rep = clamp(s.rep + (good ? 2 : 0) - cannot.length); if (good && !cannot.length) C.hosted = true;
    const left = cannot.length ? ` ${cannot.map(x => x.name).join(' and ')} (${NEED_TEXT[cannot[0].need as Need][0]}) only ${cannot.length > 1 ? 'eat' : 'eats'} the bread and salad.` : '', leftRu = cannot.length ? ` ${cannot.map(x => x.name).join(' и ')} (${NEED_TEXT[cannot[0].need as Need][1]}) едят только хлеб и салат.` : '';
    return { ok: true, msg: L(`${good ? `Friends come round for ${d.name}; the evening goes late.` : `Friends come round; the ${d.name} is not your best, the company is.`}${left}`, `${good ? `Друзья пришли на ${d.ru}; вечер затянулся.` : `Друзья пришли; блюдо (${d.ru}) не лучшее, зато компания отличная.`}${leftRu}`) };
  }
  s.rep = clamp(s.rep + (good ? 3 : 1)); n.social = clamp(n.social + 8);
  return { ok: true, msg: L(`You take a plate of ${d.name} to the neighbours. ${good ? 'They bring back the plate with sweets on it.' : 'They thank you.'}`, `Вы относите соседям тарелку (${d.ru}). ${good ? 'Они возвращают тарелку с конфетами.' : 'Они благодарят.'}`) };
}
/** Ingredients named in free text ("potato, eggs, лук"). */
export function ingredientsIn(text: string): string[] {
  const words = text.toLowerCase().split(/[,;\n]+/).map(t => t.trim()).filter(t => t.length >= 2);
  const out = new Set<string>(), keys = Object.keys(ING), names = (k: string): string[] => [ING[k][0].toLowerCase(), ING[k][1].toLowerCase()];
  for (const wd of words) {                                         // a name that starts with the word wins ("potato" is not "sweet potato")
    const starts = keys.filter(k => k === wd || names(k).some(n => n.startsWith(wd))), hits = starts.length ? starts : keys.filter(k => names(k).some(n => n.includes(wd)));
    for (const k of hits) out.add(k);
  }
  return [...out];
}

/** The challenge grows with the cook: level 1 dishes are open to all, level 2 from the rank of Learner, level 3 from Home cook. */
export const LEVEL_RANK = [0, 0, 1, 2];
export function lockedWhy(s: State, d: DishInfo): string | null {
  const need = LEVEL_RANK[d.level] ?? 0; return rankOf(s) >= need ? null : L(`Level ${d.level}: reach the rank of ${TITLES[need]} first (cook easier dishes well).`, `Уровень ${d.level}: сначала получите звание «${TITLES_RU[need]}» (хорошо готовьте блюда попроще).`);
}
/** The cuisines the player has cooked from: how many dishes of each, of how many. A cuisine is mastered at ten dishes (or all of them). */
export function stampsOf(s: State): { cuisine: string; done: number; total: number; master: boolean }[] {
  const C = cookOf(s), out = new Map<string, { done: number; total: number }>();
  for (const d of DISHES) { const x = out.get(d.cuisine) ?? { done: 0, total: 0 }; x.total++; if (C.count[d.id]) x.done++; out.set(d.cuisine, x); }
  return [...out].map(([cuisine, x]) => ({ cuisine, ...x, master: x.done >= Math.min(10, x.total) })).filter(x => x.done > 0).sort((a, b) => b.done - a.done);
}

/** What the shopping costs: the ingredients not in the pantry. */
export function shoppingOf(s: State, keys: string[]): { buy: string[]; cost: number } {
  const C = cookOf(s), have = new Set([...C.pantry, ...Object.keys(C.fresh ?? {})]), buy = keys.filter(k => !have.has(k)), f = SHOPS[C.shop ?? 'shop'][2];
  return { buy, cost: Math.round(buy.reduce((n, k) => n + priceOf(s, k), 0) * f) };
}
/** Where the shopping is done: the corner shop, the market (cheaper, takes a part of the day, haggling allowed), delivery (dearer, to the door). */
export type Shop = 'shop' | 'market' | 'delivery';
export const SHOPS: Record<Shop, [string, string, number]> = { shop: ['The corner shop', 'Магазин у дома', 1], market: ['The market (takes a part of the day)', 'Рынок (занимает часть дня)', 0.8], delivery: ['Delivery to the door', 'Доставка до двери', 1.25] };
/** At the market: haggling. Knowing the language and being known helps; a refusal annoys the seller and costs nothing. */
export function haggle(s: State): { ok: boolean; msg: string } {
  const C = cookOf(s); if ((C.shop ?? 'shop') !== 'market') return { ok: false, msg: L('Haggling is for the market.', 'Торгуются на рынке.') };
  if ((C as CookState & { haggled?: number }).haggled === s.day) return { ok: false, msg: L('You have haggled today already.', 'Сегодня вы уже торговались.') };
  (C as CookState & { haggled?: number }).haggled = s.day;
  const p = 0.35 + s.know / 250 + s.rep / 400, won = (hash(`${s.name}|${s.day}|haggle`) % 100) / 100 < p;
  if (won) { (C as CookState & { deal?: number }).deal = s.day; return { ok: true, msg: L('"Ладно, для вас — дешевле." Ten per cent off today\'s shopping at the market.', '«Ладно, для вас — дешевле». Минус десять процентов на сегодняшние покупки на рынке.') }; }
  return { ok: false, msg: L('The seller shakes her head: "Цена нормальная." The price stays.', 'Продавщица качает головой: «Цена нормальная». Цена остаётся.') };
}
const dealToday = (s: State): boolean => (cookOf(s) as CookState & { deal?: number }).deal === s.day && cookOf(s).shop === 'market';
/** How long fresh food keeps in the fridge after it is bought (days); half a pack is left over for the next dish. */
const KEEPS: Partial<Record<Kind, number>> = { poultry: 2, meat: 2, mince: 1, fish: 1, sea: 1, leaf: 3, herb: 3, berry: 3, mush: 3, dairy: 5, bread: 4, veg: 7, fruit: 7, cheese: 14, egg: 21, root: 21, frozen: 60 };
export const keepsFor = (k: string): number => KEEPS[ING[k]?.[3] as Kind] ?? 0;
/** What is in the fridge and how many days each keeps; what has gone off is thrown away (and counted). */
export function fridgeOf(s: State): { thrown: string[]; items: { k: string; left: number }[] } {
  const C = cookOf(s), f = (C.fresh ??= {}), thrown: string[] = [];
  for (const [k, day] of Object.entries(f)) if (s.day - day > keepsFor(k)) { thrown.push(k); C.wasted = (C.wasted ?? 0) + priceOf(s, k); delete f[k]; }
  return { thrown, items: Object.entries(f).map(([k, day]) => ({ k, left: keepsFor(k) - (s.day - day) })).sort((a, b) => a.left - b.left) };
}
/** Fresh vegetables, fruit, berries and herbs follow the season: cheap from July to September, dear from December to April (hothouse and
   imported); roots keep through the winter. Other things cost the same all year. */
export function seasonOf(s: State, k: string): number {
  const kind = ING[k]?.[3], m = dateOf(s).getMonth() + 1;
  if (kind === 'root') return m >= 8 && m <= 10 ? 0.85 : m >= 3 && m <= 6 ? 1.15 : 1;
  if (!['veg', 'leaf', 'herb', 'fruit', 'berry'].includes(kind as string)) return 1;
  return m >= 7 && m <= 9 ? 0.7 : m === 12 || m <= 4 ? 1.5 : 1;
}
export const priceOf = (s: State, k: string): number => Math.round((ING[k]?.[4] ?? 0) * seasonOf(s, k));

/** Kitchen equipment beyond the hob, the pot and the pan. An oven comes with an owned flat, a house, a village house or the family's flat; in a rented room or dorm
   a tabletop oven is bought. [English, Russian, price, the kinds of dish it is needed for] */
export const KIT: Record<string, [string, string, number, string[]]> = {
  oven: ['Tabletop oven', 'Мини-печь', 5900, ['bake', 'roast', 'pie']], steamer: ['Steamer basket', 'Пароварка-вставка', 900, ['steam']],
  grillpan: ['Grill pan', 'Сковорода-гриль', 1800, ['grill']], jars: ['Preserving jars and a seamer', 'Банки и закаточная машинка', 1500, ['pickle']],
  blender: ['Blender', 'Блендер', 2500, []],
};
const BLEND = /smoothie|milkshake|lassi|hummus|gazpacho|pesto|cream soup|muhammara|guacamole|baba ghanoush/i;
export const kitOf = (s: State): string[] => { const C = cookOf(s), own = ['flat', 'house', 'village'].includes(s.housing) || (s.housing === 'rented' && s.rent === 0) ? ['oven'] : []; return [...new Set([...own, ...(C.kit ?? [])])]; };
/** The equipment a dish needs that the player does not have. */
export function missingKit(s: State, d: DishInfo): string[] {
  const have = kitOf(s);
  return Object.entries(KIT).filter(([k, v]) => !have.includes(k) && (v[3].includes(d.type) || (k === 'blender' && BLEND.test(d.name)))).map(([k]) => k);
}
export function buyKit(s: State, k: string): { ok: boolean; msg: string } {
  const it = KIT[k], C = cookOf(s); if (!it) return { ok: false, msg: L('No such thing.', 'Такого нет.') };
  if (kitOf(s).includes(k)) return { ok: false, msg: L('You have one already.', 'У вас это уже есть.') };
  if (s.money < it[2]) return { ok: false, msg: L(`It costs ${it[2].toLocaleString('en-US')} ₽.`, `Это стоит ${it[2].toLocaleString('ru-RU')} ₽.`) };
  s.money -= it[2]; C.kit = [...(C.kit ?? []), k]; return { ok: true, msg: L(`Bought: ${it[0].toLowerCase()} for ${it[2].toLocaleString('en-US')} ₽.`, `Куплено: ${it[1].toLowerCase()} за ${it[2].toLocaleString('ru-RU')} ₽.`) };
}

export interface Option { t: string; ok: boolean; why?: string }
export interface Question { stage: 'prep' | 'cook'; title: string; q: string; ing?: string; options: Option[]; danger: boolean }
export interface Challenge { dish: DishInfo; shelf: string[]; questions: Question[] }
const toOptions = (st: Step | { ok: string; bad: [string, string][] }, seed: string): Option[] => shuffle([{ t: st.ok, ok: true }, ...st.bad.map(([t, why]) => ({ t, ok: false, why }))], seed);
/** Builds the challenge of a dish: the shelf (the right ingredients and some that do not belong), the preparation and the cooking steps. */
export function challengeOf(id: string, seed = ''): Challenge | null {
  const d = dishOf(id); if (!d) return null; const t = TYPES[d.type]; if (!t) return null;
  // the shelf: the dish's own ingredients and 4-6 others from dishes of other kinds
  const own = new Set(d.ings), pool = shuffle(Object.keys(ING).filter(k => !own.has(k) && k !== 'water'), `${id}|${seed}|shelf`), extra = pool.slice(0, 4 + (hash(id) % 3));
  const shelf = shuffle([...d.ings, ...extra], `${id}|${seed}|order`);
  // preparation: up to four ingredients, the risky kinds first, one question per kind
  const seen = new Set<Kind>(), prep: Question[] = [];
  const rank = (k: string): number => { const i = RISKY.indexOf(ING[k][3]); return i < 0 ? 99 : i; }, order = [...d.ings].sort((a, b) => rank(a) - rank(b));
  for (const k of order) {
    const kind = ING[k][3], p = PREP[kind]; if (!p || seen.has(kind) || prep.length >= 4 || ['spice', 'drink', 'sweet', 'dry'].includes(kind)) continue;
    seen.add(kind); prep.push({ stage: 'prep', title: `${ING[k][2]} ${ING[k][0]}`, q: p.q, ing: k, options: toOptions(p, `${id}|${seed}|${k}`), danger: RISKY.includes(kind) });
  }
  const meaty = d.ings.some(k => ['poultry', 'mince'].includes(ING[k][3]) || k === 'pork'), hasDone = t.steps.some(st => /Done\?/.test(st.q));
  const safety = SAFETY[hash(`${id}|${seed}|safety`) % SAFETY.length];
  const steps = [...t.steps, ...(meaty && !hasDone ? [DONENESS] : []), safety, ...(['pickle', 'drink'].includes(d.type) ? [] : [LEFTOVER])];
  const cook: Question[] = steps.map((st, i) => ({ stage: 'cook', title: `${i + 1}. ${st.q}`, q: st.q, options: toOptions(st, `${id}|${seed}|s${i}`), danger: st === DONENESS || st === LEFTOVER || st === safety || /safe|bacteria|botulism|toxin|salmonella|fire|explod/i.test(st.bad.map(b => b[1]).join(' ')) }));
  return { dish: d, shelf, questions: [...prep, ...cook] };
}

export interface Answer { qi: number; chosen: number; hint?: boolean }
export interface Outcome { ok: boolean; msg: string; stars: number; score: number; cost: number; mistakes: { title: string; chose: string; why: string; danger: boolean }[]; forgot: string[]; wrongPicks: string[]; ill: boolean; leftovers: boolean; firstTime: boolean; daily?: boolean; tired?: boolean }
/** Why the dish cannot be cooked now, or null. */
export function cannotCookDish(s: State, id: string, picked: string[] = []): string | null {
  const d = dishOf(id); if (!d) return L('No such dish.', 'Такого блюда нет.');
  const lock = lockedWhy(s, d); if (lock) return lock;
  if (s.housing === 'homeless') return L('You have no kitchen.', 'У вас нет кухни.');
  if (s.loc !== 'home') return L('Cooking is done in your kitchen at home.', 'Готовят на кухне дома.');
  if (homeOf(s).keysLost) return L('You lost your keys: you cannot get into the kitchen. Call a locksmith (Household).', 'Вы потеряли ключи и не можете попасть на кухню. Вызовите слесаря (Хозяйство).');
  const kit = missingKit(s, d); if (kit.length) return L(`You need: ${kit.map(k => KIT[k][0].toLowerCase()).join(', ')} (My kitchen).`, `Нужно: ${kit.map(k => KIT[k][1].toLowerCase()).join(', ')} (Моя кухня).`);
  if (s.energy < 8) return L('You are too tired to cook.', 'Вы слишком устали, чтобы готовить.');
  if (homeOf(s).dishes >= 20) return L('The sink is full of dirty dishes: wash them first.', 'Раковина полна грязной посуды: сначала помойте её.');
  if (cookOf(s).ill !== undefined && s.day - (cookOf(s).ill as number) < 1) return L('You are still recovering from the last meal.', 'Вы ещё не отошли от прошлой еды.');
  const { cost } = shoppingOf(s, picked.length ? picked : d.ings); if (s.money < cost) return L(`The shopping costs ${cost.toLocaleString('en-US')} ₽.`, `Покупки стоят ${cost.toLocaleString('ru-RU')} ₽.`);
  if (cookOf(s).shop === 'market' && s.slot >= 2) return L('The market is closed in the evening: shop at the corner shop or order delivery.', 'Вечером рынок закрыт: купите в магазине у дома или закажите доставку.');
  return null;
}
/** Cooks: scores the shelf and the answers, pays for the shopping, feeds the player and maybe makes them ill. */
export function cook(s: State, c: Challenge, picked: string[], answers: Answer[]): Outcome {
  const d = c.dish, why = cannotCookDish(s, d.id, picked), C = cookOf(s);
  const empty: Outcome = { ok: false, msg: why ?? '', stars: 0, score: 0, cost: 0, mistakes: [], forgot: [], wrongPicks: [], ill: false, leftovers: false, firstTime: false };
  if (why) return empty;
  const own = new Set(d.ings), pick = new Set(picked);
  const forgot = d.ings.filter(k => !pick.has(k) && k !== 'water'), wrongPicks = picked.filter(k => !own.has(k));
  let points = d.ings.length - forgot.length - wrongPicks.length, total = d.ings.length;
  const mistakes: Outcome['mistakes'] = []; let danger = 0, leftoversOk = false;
  c.questions.forEach((q, qi) => {
    const a = answers.find(x => x.qi === qi), o = a ? q.options[a.chosen] : undefined; total += 2;
    if (o?.ok) { points += a?.hint ? 1 : 2; if (q.title.endsWith(LEFTOVER.q)) leftoversOk = true; }
    else { mistakes.push({ title: q.title, chose: o?.t ?? '(no answer)', why: o?.why ?? 'There was no answer.', danger: q.danger }); if (q.danger) danger++; }
  });
  const score = clamp((Math.max(0, points) / total) * 100), stars = score >= 90 ? 3 : score >= 70 ? 2 : score >= 45 ? 1 : 0;
  fridgeOf(s);                                                                      // what has gone off is thrown away first
  const { buy } = shoppingOf(s, picked), cost = Math.round(shoppingOf(s, picked).cost * (dealToday(s) ? 0.9 : 1)); s.money -= cost;
  for (const k of buy) if (isStaple(k) && !C.pantry.includes(k)) C.pantry.push(k);
  const fresh = (C.fresh ??= {});
  for (const k of picked) { if (isStaple(k) || !keepsFor(k)) continue; if (buy.includes(k)) fresh[k] = s.day; else delete fresh[k]; }   // a new pack leaves half; the half left is used up
  const market = (C.shop ?? 'shop') === 'market' && buy.length > 0;
  (C.cuisineOf ??= {})[d.id] = d.cuisine; C.safeRun = danger ? 0 : (C.safeRun ?? 0) + 1;     // for the achievements
  const firstTime = !C.count[d.id]; C.count[d.id] = (C.count[d.id] ?? 0) + 1; C.best[d.id] = Math.max(C.best[d.id] ?? 0, stars);
  const daily = dishOfDay(s)?.id === d.id && stars >= 2;                  // the dish of the day, cooked well, counts double
  C.xp += (d.level * 10 * Math.max(1, stars) + (firstTime ? 15 : 0)) * (daily ? 2 : 1);
  const k = kitchenOf(s); k.skill = clamp(k.skill + d.level * (stars + 1) / 2);
  const n = needsOf(s); n.hunger = clamp(n.hunger + 20 + stars * 12); n.fun = clamp(n.fun + 3 + stars * 3);
  s.stress = clamp(s.stress - stars * 2); s.energy = clamp(s.energy - Math.min(15, 4 + Math.round(d.minutes / 20))); if (firstTime) s.know = clamp(s.know + 1);
  // a danger mistake: a chance of food poisoning (decided by the day and the dish)
  // tired cooks cut and burn themselves
  const tired = s.energy < 30 && (hash(`${s.name}|${s.day}|${d.id}|hurt`) % 100) < 30;
  if (tired) s.health = clamp(s.health - 3);
  homeOf(s).dishes = Math.min(30, homeOf(s).dishes + 2 + d.level);                // the pots, the pans, the plates
  const ill = danger > 0 && (hash(`${s.name}|${s.day}|${d.id}|ill`) % 100) < Math.min(70, danger * 22);
  if (ill) { s.health = clamp(s.health - 15); s.stress = clamp(s.stress + 10); n.hunger = clamp(n.hunger - 25); C.ill = s.day; }
  if (leftoversOk && !['drink', 'sandwich'].includes(d.type)) { C.meals.push({ id: d.id, day: s.day, n: 2 }); C.meals = C.meals.slice(-6); }
  if ((d.minutes >= 90 || market) && !s.over) advance(s);                          // a long dish or a trip to the market takes a part of the day
  const msg = ill ? `${d.name} looked fine, but in the night your stomach said otherwise: food poisoning. The mistakes below are why.`
    : stars === 3 ? `${d.name}: perfect. Everyone asks for the recipe.` : stars === 2 ? `${d.name}: good. A few things to do better next time.`
    : stars === 1 ? `${d.name}: edible. It could be much better.` : `${d.name}: that did not work. Read why below and try again.`;
  return { ok: true, msg: `${daily && !ill ? `${msg} The dish of the day: double experience.` : msg}${tired ? ' Too tired: you burnt a finger on the pan (cook when rested).' : ''}`, tired, stars, score, cost, mistakes, forgot, wrongPicks, ill, leftovers: leftoversOk, firstTime, daily };
}
/** Portions of leftovers still good (three days in the fridge). */
export const leftoversLeft = (s: State): number => cookOf(s).meals.filter(m => s.day - m.day <= 3).reduce((n, m) => n + m.n, 0);
/** Eats a portion of leftovers from the fridge (good for three days). */
export function eatLeftovers(s: State): { ok: boolean; msg: string } {
  const C = cookOf(s); C.meals = C.meals.filter(m => s.day - m.day <= 3 && m.n > 0);
  const m = C.meals[0]; if (!m) return { ok: false, msg: L('No leftovers in the fridge.', 'В холодильнике нет остатков.') };
  m.n--; const n = needsOf(s); n.hunger = clamp(n.hunger + 30); if (m.n <= 0) C.meals.shift();
  return { ok: true, msg: L(`Reheated ${dishOf(m.id)?.name ?? 'leftovers'} until steaming hot. Still good.`, `Разогрето до горячего пара: ${dishOf(m.id)?.ru ?? 'остатки'}. Всё ещё вкусно.`) };
}

/** The online challenge: one easy dish for every player in the world on each real day (by the UTC date; the dishes load in the same order everywhere). */
export function dishOfRealDay(now = new Date()): DishInfo | undefined {
  const easy = DISHES.filter(d => d.level === 1); return easy.length ? easy[hash(`real|${now.toISOString().slice(0, 10)}`) % easy.length] : undefined;
}
/** The dish of the day: a challenge for extra experience. */
export const dishOfDay = (s: State): DishInfo | undefined => DISHES.length ? DISHES[hash(`day|${s.day}`) % DISHES.length] : undefined;
/** Dishes like this one: the same kind or many of the same ingredients. */
export function similar(id: string, n = 4): DishInfo[] {
  const d = dishOf(id); if (!d) return [];
  const set = new Set(d.ings.filter(k => !isStaple(k)));
  return DISHES.filter(x => x.id !== id).map(x => ({ x, sc: x.ings.filter(k => set.has(k)).length * 2 + (x.type === d.type ? 2 : 0) + (x.cuisine === d.cuisine ? 1 : 0) }))
    .sort((a, b) => b.sc - a.sc || a.x.id.localeCompare(b.x.id)).slice(0, n).map(p => p.x);
}
/** Dishes that can be made from these ingredients (with the fewest things still to buy). */
export function fromIngredients(keys: string[], n = 6, diet: Diet = 'any'): { d: DishInfo; missing: string[] }[] {
  const have = new Set(keys);
  return DISHES.filter(d => dietOk(d, diet)).map(d => ({ d, missing: d.ings.filter(k => !have.has(k) && k !== 'water' && k !== 'salt'), hit: d.ings.filter(k => have.has(k) && !isStaple(k)).length }))
    .filter(x => x.hit > 0).sort((a, b) => a.missing.length - b.missing.length || b.hit - a.hit || a.d.id.localeCompare(b.d.id)).slice(0, n).map(({ d, missing }) => ({ d, missing }));
}
/** Suggestions for the player: from the pantry, the cuisine of home, the next level up. */
export function suggest(s: State): { why: string; d: DishInfo }[] {
  const C = cookOf(s), r = rankOf(s), out: { why: string; d: DishInfo }[] = [];
  const day = dishOfDay(s); if (day && dietOk(day, dietOf(s))) out.push({ why: 'Dish of the day', d: day });
  const home = /Nigeria/.test(s.home) ? 'ng' : /Tajik|Uzbek/.test(s.home) ? 'uz' : /Kyrgyz|Kazakh/.test(s.home) ? 'kz' : 'ru';
  const diet = dietOf(s), fresh = DISHES.filter(d => !C.count[d.id] && dietOk(d, diet));
  const pick = (why: string, xs: DishInfo[]): void => { const d = xs.find(x => !out.some(o => o.d.id === x.id)); if (d) out.push({ why, d }); };
  pick('A taste of home', shuffle(fresh.filter(d => d.cuisine === home), `${s.day}|home`));
  pick('Easy to start with', shuffle(fresh.filter(d => d.level === 1), `${s.day}|easy`));
  const top = Math.max(...[1, 2, 3].filter(l => r >= LEVEL_RANK[l]));
  pick('Your next challenge', shuffle(fresh.filter(d => d.level === top), `${s.day}|next`));
  const best = fromIngredients(C.pantry.filter(k => k !== 'salt' && k !== 'water'), 3, diet)[0]; if (best) pick('With what is in your pantry', [best.d]);
  return out;
}
/** Search by name (both languages) or by an ingredient. */
export function search(q: string, cuisine = 'all', type = 'all', diet: Diet = 'any'): DishInfo[] {
  const t = q.trim().toLowerCase();
  return DISHES.filter(d => (cuisine === 'all' || d.cuisine === cuisine) && (type === 'all' || d.type === type) && dietOk(d, diet)
    && (!t || d.name.toLowerCase().includes(t) || d.ru.toLowerCase().includes(t) || d.ings.some(k => ING[k][0].toLowerCase().includes(t) || ING[k][1].toLowerCase().includes(t))));
}
export { CUISINES, TYPES, ING };
