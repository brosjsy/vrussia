/* Gifts between friends: what each gift is, what it costs the sender and what it does for the one who takes it. Pure rules over the game state; the server
   (migrations/0016_gifts.sql) decides who may send to whom, how often, and keeps the counts for the storyline's "Kindness" chapter. The sender pays from their
   own wallet before the gift goes; the money gift is capped at 1,000 ₽ by the server. */
import type { State, Effects } from './engine';
import * as G from './engine';

export type GiftKind = 'tea' | 'flowers' | 'cake' | 'chocolates' | 'soup' | 'scarf' | 'money';
export interface GiftDef { icon: string; en: string; ru: string; price: number; fx: Effects }
export const GIFTS: Record<GiftKind, GiftDef> = {
  tea: { icon: '🍵', en: 'A pot of good tea', ru: 'Хороший чай', price: 150, fx: { stress: -4 } },
  flowers: { icon: '💐', en: 'A bunch of flowers', ru: 'Букет цветов', price: 450, fx: { stress: -3, rep: 1 } },
  cake: { icon: '🍰', en: 'A homemade cake', ru: 'Домашний торт', price: 500, fx: { energy: 4, stress: -3 } },
  chocolates: { icon: '🍫', en: 'A box of chocolates', ru: 'Коробка конфет', price: 350, fx: { stress: -3, energy: 2 } },
  soup: { icon: '🍲', en: 'A pot of hot soup', ru: 'Кастрюля горячего супа', price: 300, fx: { energy: 6, health: 2 } },
  scarf: { icon: '🧣', en: 'A warm scarf', ru: 'Тёплый шарф', price: 900, fx: { clothes: 6, health: 1 } },
  money: { icon: '💶', en: 'A little money', ru: 'Немного денег', price: 0, fx: {} },
};
export const KINDS = Object.keys(GIFTS) as GiftKind[];
export const MAX_MONEY = 1000;

/** What the gift costs the sender: the price, or the sum itself for money. */
export const cost = (kind: GiftKind, amount = 0): number => (kind === 'money' ? Math.max(0, Math.min(MAX_MONEY, Math.round(amount))) : GIFTS[kind].price);

/** Why the sender cannot send this now (null when they can). */
export function cannotSend(s: State, kind: GiftKind, amount = 0): string | null {
  if (!GIFTS[kind]) return 'No such gift.';
  if (kind === 'money' && (amount < 50 || amount > MAX_MONEY)) return `A money gift is between 50 and ${MAX_MONEY.toLocaleString('en-US')} ₽.`;
  if (s.money < cost(kind, amount)) return 'You do not have enough money for that gift.';
  return null;
}
/** The sender pays. Call after the server accepted the gift. */
export function pay(s: State, kind: GiftKind, amount = 0): void { s.money -= cost(kind, amount); }
/** The one who takes the gift gets its effect (and the money for a money gift). */
export function receive(s: State, kind: GiftKind, amount = 0): string {
  const g = GIFTS[kind]; if (!g) return '';
  if (kind === 'money') { const m = Math.max(0, Math.min(MAX_MONEY, Math.round(amount))); s.money += m; return `+${m.toLocaleString('en-US')} ₽`; }
  G.apply(s, g.fx); return g.en;
}
