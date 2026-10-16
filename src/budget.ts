/* The bank app's two new parts: a savings goal (a pot the player puts money into and takes it back from, with a name and a target) and a budget: the
   money that came in and went out over the last thirty days, by kind, from the payment history. Opt-in: money in the pot is safe from spending, and
   the bots never use it. Pure functions over the game state. */
import type { State } from './engine';

export interface Savings { name: string; goal: number; saved: number }
export interface Result { ok: boolean; msg: string }
type S = State & { savings?: Savings };

export function savingsOf(s: State): Savings {
  const x = s as S;
  if (!x.savings || typeof x.savings !== 'object') x.savings = { name: '', goal: 0, saved: 0 };
  x.savings.saved = Math.max(0, Math.floor(Number(x.savings.saved) || 0)); x.savings.goal = Math.max(0, Math.floor(Number(x.savings.goal) || 0));
  return x.savings;
}
/** Sets what the player is saving for. */
export function setGoal(s: State, name: string, goal: number): Result {
  const n = name.replace(/[<>]/g, '').trim().slice(0, 40), g = Math.round(goal);
  if (n.length < 2) return { ok: false, msg: 'Give the goal a name.' };
  if (!(g >= 1000 && g <= 50_000_000)) return { ok: false, msg: 'A goal is between 1,000 and 50,000,000 roubles.' };
  const v = savingsOf(s); v.name = n; v.goal = g;
  return { ok: true, msg: `Saving for: ${n}.` };
}
/** Moves money into the pot (positive) or back out of it (negative). */
export function move(s: State, amount: number): Result {
  const v = savingsOf(s), a = Math.round(amount);
  if (!a) return { ok: false, msg: 'Type an amount.' };
  if (a > 0 && a > s.money) return { ok: false, msg: 'You do not have that much.' };
  if (a < 0 && -a > v.saved) return { ok: false, msg: 'There is not that much in the pot.' };
  s.money -= a; v.saved += a;
  return { ok: true, msg: a > 0 ? `${a} roubles put aside.${v.goal && v.saved >= v.goal ? ' Goal reached!' : ''}` : `${-a} roubles taken from the pot.` };
}

export type Kind = 'income' | 'home' | 'food' | 'travel' | 'shopping' | 'papers' | 'other';
const RULES: [Kind, RegExp][] = [
  ['home', /rent|utilit|deposit|flat|room|furnit|renovat|plot|house|build/i], ['food', /food|grocer|cafe|dinner|meal|cook|pelmeni/i],
  ['travel', /ticket|taxi|metro|train|flight|bus|car|fuel|petrol/i], ['shopping', /bought|shop|clothes|phone|gift/i],
  ['papers', /patent|fee|fine|registration|exam|visa|tax|document/i],
];
/** What a payment is, from its label (and income when money came in). */
export const kindOf = (label: string, amount: number): Kind => (amount > 0 ? 'income' : RULES.find(([, re]) => re.test(label))?.[0] ?? 'other');
/** The last thirty days in, out and by kind, from the payment history. */
export function budget(s: State, days = 30): { income: number; spent: number; byKind: Record<Kind, number> } {
  const tx = (s as State & { ph?: { tx?: { day: number; label: string; amount: number }[] } }).ph?.tx ?? [];
  const byKind: Record<Kind, number> = { income: 0, home: 0, food: 0, travel: 0, shopping: 0, papers: 0, other: 0 };
  for (const t of tx) if (s.day - t.day < days) byKind[kindOf(t.label, t.amount)] += Math.abs(t.amount);
  const spent = byKind.home + byKind.food + byKind.travel + byKind.shopping + byKind.papers + byKind.other;
  return { income: byKind.income, spent, byKind };
}
