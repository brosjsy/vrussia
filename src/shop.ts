/* The shop: a catalogue of things to buy, and the rules for buying them. Pure functions over the game state.
   All items and prices are invented game values (they are not real shop prices). Clothes are shown on the player's portrait. */
import { bump } from './events';
import * as G from './engine';
import type { State, Effects } from './engine';
import { normalizeLook } from './avatar';
import type { Worn, Look } from './avatar';

/** Things that are simply worn or not (no choice of which one). */
export type FlagSlot = 'glasses' | 'gloves' | 'bag' | 'thermals' | 'sunglasses';
const FLAG: FlagSlot[] = ['glasses', 'gloves', 'bag', 'thermals', 'sunglasses'];
const isFlag = (slot: string): slot is FlagSlot => (FLAG as string[]).includes(slot);
/** Where a thing is sold: a market stall, a mall or a boutique (by its price). */
export const tierOf = (item: { price: number }): 'budget' | 'mid' | 'premium' => (item.price < 2500 ? 'budget' : item.price < 10000 ? 'mid' : 'premium');
export type ShopCat = 'clothes' | 'tech' | 'food' | 'gifts' | 'home';
export interface Item {
  id: string; name: string; icon: string; cat: ShopCat; price: number; blurb: string;
  fx: Effects;                                  // what buying does to the player
  slot?: 'outer' | 'hat' | 'scarf' | FlagSlot;   // wearable: shown on the portrait
  once?: boolean;                               // can be owned only once
  phone?: number;                               // sets the phone level (1 basic, 2 good, 3 flagship)
  look?: Partial<Look>;                         // changes what the character wears: top, trousers or shoes
}

export const CATEGORIES: { id: ShopCat; label: string; icon: string }[] = [
  { id: 'clothes', label: 'Clothes', icon: '🧥' }, { id: 'tech', label: 'Phones', icon: '📱' }, { id: 'food', label: 'Food', icon: '🍲' },
  { id: 'gifts', label: 'Gifts', icon: '🎁' }, { id: 'home', label: 'Home', icon: '🏠' },
];

export const CATALOG: Item[] = [
  { id: 'coat-winter', name: 'Winter coat', icon: '🧥', cat: 'clothes', price: 6000, blurb: 'Warm for a Russian winter.', fx: { clothes: 40, rep: 1 }, slot: 'outer', once: true },
  { id: 'jacket-warm', name: 'Warm jacket', icon: '🧥', cat: 'clothes', price: 3500, blurb: 'Good until about minus ten.', fx: { clothes: 25 }, slot: 'outer', once: true },
  { id: 'hat-ushanka', name: 'Ushanka hat', icon: '🎩', cat: 'clothes', price: 1200, blurb: 'Fur hat with ear flaps.', fx: { clothes: 8, health: 1 }, slot: 'hat', once: true },
  { id: 'hat-beanie', name: 'Knitted beanie', icon: '🧢', cat: 'clothes', price: 500, blurb: 'Light and cheap.', fx: { clothes: 5 }, slot: 'hat', once: true },
  { id: 'hat-doppi', name: 'Embroidered skullcap', icon: '🎩', cat: 'clothes', price: 900, blurb: 'A doppi or tubeteika, worn in Central Asia and by the Volga peoples.', fx: { clothes: 4, merit: 1 }, slot: 'hat', once: true },
  { id: 'hat-headscarf', name: 'Headscarf', icon: '🧕', cat: 'clothes', price: 700, blurb: 'A light scarf for the head.', fx: { clothes: 4 }, slot: 'hat', once: true },
  { id: 'chapan', name: 'Striped robe (chapan)', icon: '🧥', cat: 'clothes', price: 5200, blurb: 'A long quilted robe from Central Asia, warm and festive.', fx: { clothes: 26, merit: 1 }, slot: 'outer', once: true },
  { id: 'scarf-wool', name: 'Wool scarf', icon: '🧣', cat: 'clothes', price: 700, blurb: 'Soft and red.', fx: { clothes: 5 }, slot: 'scarf', once: true },
  { id: 'glasses', name: 'Glasses', icon: '👓', cat: 'clothes', price: 2500, blurb: 'A thoughtful look.', fx: { rep: 1, know: 1 }, slot: 'glasses', once: true },
  { id: 'boots-winter', name: 'Winter boots', icon: '🥾', cat: 'clothes', price: 4500, blurb: 'Dry feet in the snow.', fx: { clothes: 22, health: 1 }, look: { shoes: 'boots', shoeColor: 2 }, once: true },
  { id: 'sneakers', name: 'Sneakers', icon: '👟', cat: 'clothes', price: 3000, blurb: 'For spring and autumn.', fx: { clothes: 12 }, look: { shoes: 'sneakers', shoeColor: 0 }, once: true },
  { id: 'suit', name: 'Business suit', icon: '👔', cat: 'clothes', price: 9000, blurb: 'For interviews and offices.', fx: { clothes: 25, rep: 3 }, look: { style: 'smart', accent: 6, bottom: 'trousers', bottomColor: 1 }, once: true },
  { id: 'tee-white', name: 'White T-shirt', icon: '👕', cat: 'clothes', price: 800, blurb: 'Simple and clean.', fx: { clothes: 6 }, look: { style: 'casual', accent: 5 }, once: true },
  { id: 'sweater-wool', name: 'Wool sweater', icon: '🧶', cat: 'clothes', price: 2800, blurb: 'Warm, with long sleeves.', fx: { clothes: 15 }, look: { style: 'sweater', accent: 6 }, once: true },
  { id: 'shirt-blue', name: 'Blue shirt', icon: '👔', cat: 'clothes', price: 1800, blurb: 'Neat, with a collar.', fx: { clothes: 10, rep: 1 }, look: { style: 'smart', accent: 0 }, once: true },
  { id: 'hoodie-red', name: 'Red hoodie', icon: '🧥', cat: 'clothes', price: 2200, blurb: 'Comfortable and sporty.', fx: { clothes: 12 }, look: { style: 'sporty', accent: 1 }, once: true },
  { id: 'dress-green', name: 'Green dress', icon: '👗', cat: 'clothes', price: 3500, blurb: 'For parties and visits.', fx: { clothes: 12, rep: 1 }, look: { style: 'dress', accent: 2 }, once: true },
  { id: 'blouse-folk', name: 'Folk blouse', icon: '🎎', cat: 'clothes', price: 2400, blurb: 'Embroidered, for holidays.', fx: { clothes: 10, merit: 1 }, look: { style: 'folk', accent: 1 }, once: true },
  { id: 'jeans-blue', name: 'Blue jeans', icon: '👖', cat: 'clothes', price: 2500, blurb: 'Goes with everything.', fx: { clothes: 10 }, look: { bottom: 'jeans', bottomColor: 0 }, once: true },
  { id: 'trousers-grey', name: 'Grey trousers', icon: '👖', cat: 'clothes', price: 3000, blurb: 'For work and interviews.', fx: { clothes: 10, rep: 1 }, look: { bottom: 'trousers', bottomColor: 2 }, once: true },
  { id: 'shorts-sand', name: 'Sand shorts', icon: '🩳', cat: 'clothes', price: 1500, blurb: 'For the few hot days.', fx: { clothes: 4 }, look: { bottom: 'shorts', bottomColor: 3 }, once: true },
  { id: 'skirt-navy', name: 'Navy skirt', icon: '👗', cat: 'clothes', price: 2000, blurb: 'Smart and easy.', fx: { clothes: 8 }, look: { bottom: 'skirt', bottomColor: 1 }, once: true },
  { id: 'shoes-formal', name: 'Formal shoes', icon: '👞', cat: 'clothes', price: 3500, blurb: 'For offices and weddings.', fx: { clothes: 8, rep: 1 }, look: { shoes: 'shoes', shoeColor: 1 }, once: true },
  { id: 'sandals', name: 'Sandals', icon: '👡', cat: 'clothes', price: 1200, blurb: 'Light summer shoes.', fx: { clothes: 3 }, look: { shoes: 'sandals', shoeColor: 2 }, once: true },
  { id: 'coat-puffer', name: 'Puffer jacket (pukhovik)', icon: '🧥', cat: 'clothes', price: 7500, blurb: 'Quilted and light, the coat of half the country.', fx: { clothes: 42 }, slot: 'outer', once: true },
  { id: 'coat-wool', name: 'Long wool coat', icon: '🧥', cat: 'clothes', price: 9500, blurb: 'Down to the knee, smart enough for the office.', fx: { clothes: 38, rep: 2 }, slot: 'outer', once: true },
  { id: 'coat-dublyonka', name: 'Sheepskin coat (dublyonka)', icon: '🧥', cat: 'clothes', price: 24000, blurb: 'Suede outside, fleece inside: the warmest there is.', fx: { clothes: 48, rep: 3 }, slot: 'outer', once: true },
  { id: 'valenki', name: 'Felt boots (valenki)', icon: '🥾', cat: 'clothes', price: 2200, blurb: 'Pressed wool, for the deepest frost and dry snow.', fx: { clothes: 20, health: 1 }, look: { shoes: 'valenki', shoeColor: 4 }, once: true },
  { id: 'mittens', name: 'Knitted mittens', icon: '🧤', cat: 'clothes', price: 600, blurb: 'Warmer than gloves. Grandmothers approve.', fx: { clothes: 5 }, slot: 'gloves', once: true },
  { id: 'thermals', name: 'Thermal leggings', icon: '🩲', cat: 'clothes', price: 1200, blurb: 'Under the trousers, for minus twenty.', fx: { clothes: 8 }, slot: 'thermals', once: true },
  { id: 'tracksuit', name: 'Three-stripe tracksuit', icon: '🏃', cat: 'clothes', price: 2600, blurb: 'Zip jacket and trousers with white stripes. No logo.', fx: { clothes: 12 }, look: { style: 'tracksuit', accent: 6, bottom: 'trousers', bottomColor: 1 }, once: true },
  { id: 'hat-cap', name: 'Baseball cap', icon: '🧢', cat: 'clothes', price: 500, blurb: 'For the sun of the white nights.', fx: { clothes: 3 }, slot: 'hat', once: true },
  { id: 'sunglasses', name: 'Sunglasses', icon: '🕶️', cat: 'clothes', price: 1800, blurb: 'For summer and for bright snow.', fx: { rep: 1 }, slot: 'sunglasses', once: true },
  { id: 'bag', name: 'Leather shoulder bag', icon: '👜', cat: 'clothes', price: 3200, blurb: 'Documents, a charger and a snack.', fx: { clothes: 4 }, slot: 'bag', once: true },
  { id: 'slippers', name: 'House slippers (tapochki)', icon: '🥿', cat: 'clothes', price: 400, blurb: 'Shoes come off at the door. Guests get a pair too.', fx: { stress: -1 }, look: { shoes: 'slippers', shoeColor: 3 }, once: true },
  { id: 'phone-basic', name: 'Basic phone', icon: '📱', cat: 'tech', price: 7000, blurb: 'Calls, messages, a bank app.', fx: {}, phone: 1, once: true },
  { id: 'phone-good', name: 'Good smartphone', icon: '📱', cat: 'tech', price: 18000, blurb: 'A better camera and a map that works in the snow.', fx: { stress: -2 }, phone: 2, once: true },
  { id: 'phone-flagship', name: 'Flagship phone', icon: '📲', cat: 'tech', price: 65000, blurb: 'The best one. Everybody looks at it.', fx: { rep: 2, stress: -3 }, phone: 3, once: true },
  { id: 'dinner', name: 'Pelmeni dinner', icon: '🥟', cat: 'food', price: 400, blurb: 'Hot and filling.', fx: { energy: 20, stress: -2 } },
  { id: 'cake', name: 'Honey cake', icon: '🍰', cat: 'food', price: 600, blurb: 'A small celebration.', fx: { stress: -6, energy: 5 } },
  { id: 'groceries', name: 'A week of groceries', icon: '🛒', cat: 'food', price: 3000, blurb: 'Fills the fridge.', fx: { energy: 25, health: 1 } },
  { id: 'flowers', name: 'Flowers', icon: '💐', cat: 'gifts', price: 800, blurb: 'An odd number, of course.', fx: { stress: -2 } },
  { id: 'chocolates', name: 'Box of chocolates', icon: '🍫', cat: 'gifts', price: 500, blurb: 'A safe gift for anyone.', fx: { famLove: 2 } },
  { id: 'tea-set', name: 'Tea set', icon: '🍵', cat: 'home', price: 1500, blurb: 'Makes evenings calmer.', fx: { stress: -3 }, once: true },
  { id: 'plant', name: 'House plant', icon: '🌿', cat: 'home', price: 700, blurb: 'A green corner.', fx: { stress: -2 }, once: true },
];

export const itemById = (id: string): Item | undefined => CATALOG.find(i => i.id === id);
export const owned = (s: State, id: string): boolean => (s.inv?.[id] ?? 0) > 0;

/** Why this item cannot be bought now, or null when it can. */
export function unavailable(s: State, item: Item): string | null {
  if (item.once && owned(s, item.id)) return 'You already have it.';
  if (item.phone !== undefined && s.phone >= item.phone) return 'You already have a phone this good or better.';
  if (item.phone !== undefined && item.phone > 1 && s.phone < 1) return 'Buy a working basic phone first.';
  if (s.money < item.price) return `You need ${G.money(item.price)}; you have ${G.money(s.money)}.`;
  return null;
}

export interface BuyResult { ok: boolean; message: string }

/** Buys an item: takes the money, applies the effects, keeps it in the bag, puts it on the portrait and records the payment. */
export function buy(s: State, id: string): BuyResult {
  const item = itemById(id);
  if (!item) return { ok: false, message: 'There is no such item.' };
  const why = unavailable(s, item);
  if (why) return { ok: false, message: why };
  const extra: Effects = item.id === 'flowers' && s.partner ? { love: 3 } : {};   // flowers for a partner mean more
  G.apply(s, { ...item.fx, ...extra, money: -item.price });
  G.recTx(s, `Bought: ${item.name}`, -item.price);
  if (item.once) (s.inv ??= {})[id] = 1;
  if (item.cat === 'gifts' || item.id === 'cake') bump(s, 'gift');             // holiday tasks (events.ts)
  if (item.look) s.look = normalizeLook({ ...normalizeLook(s.look), ...item.look });
  if (item.phone !== undefined) s.phone = Math.max(s.phone, item.phone);
  if (item.slot) {
    const w: Worn = s.worn ?? (s.worn = {});
    if (isFlag(item.slot)) w[item.slot] = true; else w[item.slot] = item.id;
  }
  return { ok: true, message: `You bought: ${item.name} for ${G.money(item.price)}.` };
}

/** What the player is wearing, for the portrait. */
export const wornOf = (s: State): Worn => ({ ...(s.worn ?? {}) });
export const lookOf = (s: State): ReturnType<typeof normalizeLook> => normalizeLook(s.look);

/* ---------- the wardrobe: wear again something you own ---------- */
export const wearable = (item: Item): boolean => !!item.look || !!item.slot;
/** Things the player owns that can be worn. */
export const wardrobe = (s: State): Item[] => CATALOG.filter(i => owned(s, i.id) && wearable(i));

/** Is the player wearing this right now? */
export function wearing(s: State, item: Item): boolean {
  if (item.slot) return isFlag(item.slot) ? !!s.worn?.[item.slot] : s.worn?.[item.slot] === item.id;
  if (item.look) { const l = normalizeLook(s.look) as unknown as Record<string, unknown>; return Object.entries(item.look).every(([k, v]) => l[k] === v); }
  return false;
}

/** Puts on something that is owned: a worn thing goes on or comes off, and a top, trousers or shoes replace the current ones. */
export function wear(s: State, id: string): BuyResult {
  const item = itemById(id);
  if (!item || !owned(s, id) || !wearable(item)) return { ok: false, message: 'You do not have that to wear.' };
  if (item.slot) {
    const w: Worn = s.worn ?? (s.worn = {});
    if (wearing(s, item)) { delete w[item.slot]; return { ok: true, message: `You took off: ${item.name}.` }; }
    if (isFlag(item.slot)) w[item.slot] = true; else w[item.slot] = item.id;
    return { ok: true, message: `You are wearing: ${item.name}.` };
  }
  s.look = normalizeLook({ ...normalizeLook(s.look), ...item.look });
  return { ok: true, message: `You are wearing: ${item.name}.` };
}
