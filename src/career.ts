/* Careers: a job is no longer a flat wage. Every shift counts, and after enough shifts in the same job the player is promoted a rank (Trainee, Junior,
   Specialist, Senior, Lead) with a small raise. Changing the job starts again at Trainee. Pure functions over the game state; they use only the State
   type, so the engine can call them. The idea of ranks inside each job, climbing from a first shift to the top, came from watching another life game's job
   list; the ranks, the thresholds and the raises are ours. */
import type { State } from './engine';

export const RANKS = ['Trainee', 'Junior', 'Specialist', 'Senior', 'Lead'] as const;
/** Shifts needed to reach each rank, and the pay multiplier of each rank (the top pays a quarter more than the first). */
export const THRESHOLDS = [0, 8, 24, 56, 110] as const;
export const BOOST = [1, 1.06, 1.12, 1.18, 1.25] as const;

export interface Career { job: string; shifts: number }
export interface CareerView { job: string; level: number; rank: string; shifts: number; next: number | null; left: number | null; boost: number }

/** The career of the player in the current job. A different or lost job starts a new one (made on first use; saves from before simply start at zero shifts). */
export function careerOf(s: State): Career {
  const x = s as State & { career?: Career };
  if (!x.career || typeof x.career !== 'object' || x.career.job !== (s.job ?? '') || !Number.isFinite(x.career.shifts) || x.career.shifts < 0) x.career = { job: s.job ?? '', shifts: 0 };
  x.career.shifts = Math.floor(x.career.shifts);
  return x.career;
}
export const levelFor = (shifts: number): number => { let l = 0; for (let i = 0; i < THRESHOLDS.length; i++) if (shifts >= THRESHOLDS[i]) l = i; return l; };

export function viewOf(s: State): CareerView {
  const c = careerOf(s), level = levelFor(c.shifts), next = level + 1 < THRESHOLDS.length ? THRESHOLDS[level + 1] : null;
  return { job: c.job, level, rank: RANKS[level], shifts: c.shifts, next, left: next === null ? null : next - c.shifts, boost: BOOST[level] };
}
/** The pay multiplier of the player's present rank (1 without a job). */
export const boostOf = (s: State): number => (s.job ? viewOf(s).boost : 1);

/** One shift was worked. Returns a sentence when it brought a promotion, otherwise an empty text. */
export function recordShift(s: State): string {
  if (!s.job) return '';
  const c = careerOf(s), before = levelFor(c.shifts); c.shifts++;
  const after = levelFor(c.shifts);
  return after > before ? `Promotion: you are now ${RANKS[after].toLowerCase()} in this job, with a raise.` : '';
}
