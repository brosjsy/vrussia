/* The rules that run around every action and at the end of every turn, in ONE place, so that the page, the bots of the tests and any
   future server check play by exactly the same rules. Until round 124 some of them lived only in the page (ui.ts): a game played without
   the page never got rent bills, holiday progress for visits and social actions, the dream's reward or its achievements. */
import * as G from './engine';
import type { State, Achievement } from './engine';
import { tickBills } from './housing';
import { bump, bookOf } from './events';
import { dreamOf } from './dreams';
import { tickChores } from './chores';

/** Before an action is performed: what it counts for (holiday tasks). */
export function beforeAction(s: State, id: string): void {
  if (id === 'people' || id === 'family') bump(s, 'social');
}

export interface TurnNews { notes: string[]; achievements: Achievement[]; dream: string | null }
/** At the end of each turn: the city-centre visit counted once a day, bills, the dream, achievements. */
export function afterTurn(s: State): TurnNews {
  const book = bookOf(s) as ReturnType<typeof bookOf> & { centreDay?: number };
  if (s.loc === 'center' && book.centreDay !== s.day) { book.centreDay = s.day; bump(s, 'centre'); }
  const notes = [...tickBills(s), ...tickChores(s)];
  let dream: string | null = null;
  const dr = dreamOf(s);
  if (dr && !s.flags.dreamDone && dr.done(s)) {
    s.flags.dreamDone = true;
    G.apply(s, { rep: 3, stress: -5 });
    s.log.unshift({ day: s.day, text: `Your dream came true: ${dr.goal}.` });
    dream = `${dr.icon} ${dr.label}`;
  }
  return { notes, achievements: G.checkAchievements(s), dream };
}
