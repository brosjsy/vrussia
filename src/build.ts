/* Building your own house: the way up from a rented room to a home that is truly yours. A plot of land, then the foundation, the walls, the roof and the
   finishing work, each paid for in turn and each taking a few days of real building. When the last stage is done the player lives in the house they built
   (a roomy home with a yard), pays no rent and feels the pride of it. Only citizens may buy land here, as in life for most land. Every price and duration is
   an invented game value. Pure functions over the game state; they use only the State type, so the engine can call the daily tick. */
import type { State } from './engine';

export interface Stage { id: string; name: string; cost: number; days: number; blurb: string }
export const STAGES: Stage[] = [
  { id: 'plot', name: 'Buy a plot of land', cost: 300000, days: 0, blurb: 'Six hundred square metres at the edge of town, with a fence and a well.' },
  { id: 'foundation', name: 'Pour the foundation', cost: 250000, days: 3, blurb: 'A concrete strip, trucks and a very serious foreman.' },
  { id: 'walls', name: 'Raise the walls', cost: 400000, days: 4, blurb: 'Brick by brick, with neighbours giving advice over the fence.' },
  { id: 'roof', name: 'Put on the roof', cost: 300000, days: 3, blurb: 'Rafters, tiles and a pine branch on the ridge for luck.' },
  { id: 'finish', name: 'Windows, floors and paint', cost: 350000, days: 4, blurb: 'Glass in the windows, planks on the floor and a door that closes.' },
];
export const TOTAL_COST = STAGES.reduce((t, s) => t + s.cost, 0);

export interface Build { done: number; working: boolean; readyDay: number; finished: boolean }
export interface BuildView { done: number; working: boolean; daysLeft: number; next: Stage | null; finished: boolean; percent: number }
export interface Result { ok: boolean; msg: string }

/** The project for reading (nothing is created in the game state). */
const read = (s: State): Build => {
  const b = (s as State & { build?: Build }).build;
  return b && typeof b === 'object' && Number.isInteger(b.done) && b.done >= 0 && b.done <= STAGES.length && Number.isFinite(b.readyDay) && typeof b.working === 'boolean' ? b : { done: 0, working: false, readyDay: 0, finished: false };
};
const write = (s: State): Build => { const x = s as State & { build?: Build }; const b = read(s); if (x.build !== b) x.build = { ...b }; return x.build as Build; };

export function viewOf(s: State): BuildView {
  const b = read(s), done = b.done;
  return { done, working: b.working, daysLeft: b.working ? Math.max(0, b.readyDay - s.day) : 0, next: done < STAGES.length ? STAGES[done] : null, finished: b.finished || done >= STAGES.length, percent: Math.round((done / STAGES.length) * 100) };
}

/** Pays for the next stage and starts it (the plot is bought at once, the others take days). */
export function startNext(s: State): Result {
  const v = viewOf(s);
  if (v.finished) return { ok: false, msg: 'Your house is finished.' };
  if (v.working) return { ok: false, msg: `The builders are still at work: ${v.daysLeft} day${v.daysLeft === 1 ? '' : 's'} left.` };
  const st = v.next as Stage;
  if (s.status !== 'citizen') return { ok: false, msg: 'Only citizens can buy land and build here. Get citizenship first.' };
  if (s.money < st.cost) return { ok: false, msg: 'Not enough money for this stage.' };
  s.money -= st.cost; const b = write(s);
  if (st.days === 0) { b.done++; return { ok: true, msg: `${st.name}: done.` }; }
  b.working = true; b.readyDay = s.day + st.days;
  return { ok: true, msg: `${st.name}: the builders start. ${st.days} days.` };
}

/** Called at the turn of each day: finishes the stage that was being built, and the house when the last stage is done. Returns a note for the day's report, or ''. */
export function tickBuild(s: State): string {
  const b0 = read(s); if (!b0.working || s.day < b0.readyDay) return '';
  const b = write(s), st = STAGES[b.done]; b.working = false; b.done++;
  if (b.done >= STAGES.length && !b.finished) {
    b.finished = true; s.housing = 'house'; s.rent = 0; s.stress = Math.max(0, s.stress - 15); s.rep = Math.min(100, s.rep + 8);
    return 'Your house is finished! You carry the first box through your own front door.';
  }
  return `${st.name}: finished.`;
}
