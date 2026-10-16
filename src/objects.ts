/* Small things to do with the objects at home that take no part of the day: watch the television, drink tea from the kettle or the samovar, sit down
   for a moment. Each can be done once in each part of the day and leaves a small effect (and tea a good feeling for the rest of the day). Opt-in, so
   the bots never use them and the balance is untouched. Pure functions over the game state. */
import type { State } from './engine';
import { needsOf } from './needs';

export type Use = 'tv' | 'tea' | 'sit';
export interface Result { ok: boolean; msg: string; pose?: 'sit' | 'idle' }
type S = State & { objects?: { last: Partial<Record<Use, number>>; tea?: { day: number; samovar: boolean } } };
const slotNo = (s: State): number => s.day * 3 + s.slot;
const clamp = (v: number): number => Math.max(0, Math.min(100, Math.round(v)));
const book = (s: State): NonNullable<S['objects']> => { const x = s as S; if (!x.objects || typeof x.objects !== 'object' || typeof x.objects.last !== 'object') x.objects = { last: {} }; return x.objects; };

/** Uses an object. `samovar` says whether the tea comes from a samovar (better than from the kettle). */
export function useObject(s: State, use: Use, samovar = false): Result {
  const b = book(s), now = slotNo(s);
  if (b.last[use] === now) return { ok: false, msg: use === 'tv' ? 'Enough television for now.' : use === 'tea' ? 'You have just had tea.' : 'You have just sat down.' };
  b.last[use] = now; const n = needsOf(s);
  if (use === 'tv') { n.fun = clamp(n.fun + 15); s.energy = Math.min(100, s.energy + 2); return { ok: true, msg: 'You watch a bit of a quiz show. Fun +15.', pose: 'sit' }; }
  if (use === 'tea') { s.stress = Math.max(0, s.stress - (samovar ? 4 : 2)); b.tea = { day: s.day, samovar }; return { ok: true, msg: samovar ? 'Tea from the samovar, in a glass in a metal holder. Very calming.' : 'A cup of tea from the kettle.', pose: 'sit' }; }
  s.stress = Math.max(0, s.stress - 1); s.energy = Math.min(100, s.energy + 1);
  return { ok: true, msg: 'You sit down for a minute.', pose: 'sit' };
}
/** The good feeling tea leaves for the rest of the day, for the moodlets. */
export function teaMoodlet(s: State): { key: string; v: number } | null { const t = (s as S).objects?.tea; return t && t.day === s.day ? { key: t.samovar ? 'ml.samovar' : 'ml.tea', v: t.samovar ? 2 : 1 } : null; }
