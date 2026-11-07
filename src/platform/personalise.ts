/* Personalised scenario selection. The game draws the next scenario with weights; this adds one more factor per scenario, between 0.5 and 2:
     need     - papers scenarios when the player's papers have a problem; a gentler draw when energy or health are very low or stress very high;
     learned  - for each category of scenario, how often the player's earlier ones went well for them (a Beta(1,1) average over what happened
                after each scenario of that category), so categories that keep turning out badly are shown a little less and those that help more;
     novelty  - already handled by the game (repeats fade).
   Everything is learned and kept on this device (key "vrussia_profile"); nothing is sent. The player can turn it off. It never makes a
   scenario impossible and never touches the legal and police rules, so the lessons of the game stay the same for everyone. */
import type { Scenario, State } from '../engine';
import type { KV } from '../store';

export const PROFILE_KEY = 'vrussia_profile';
export const MIN_SAMPLES = 5, LO = 0.5, HI = 2;
export interface CatStat { n: number; good: number }
export interface Profile { on: boolean; cats: Record<string, CatStat> }
const PROTECTED = new Set(['police', 'intro']);          // the rules of the law and the start of the game are not tuned

const defaultKV = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
export function loadProfile(kv: KV | null = defaultKV()): Profile {
  try {
    const o = JSON.parse(kv?.getItem(PROFILE_KEY) ?? 'null') as Partial<Profile> | null;
    const cats: Record<string, CatStat> = {};
    if (o?.cats && typeof o.cats === 'object') for (const [k, v] of Object.entries(o.cats)) if (/^[a-z_-]{1,20}$/.test(k) && v && Number.isFinite(v.n) && Number.isFinite(v.good) && v.n >= 0 && v.good >= 0 && v.good <= v.n) cats[k] = { n: Math.min(v.n, 500), good: Math.min(v.good, 500) };
    return { on: o?.on !== false, cats };
  } catch { return { on: true, cats: {} }; }
}
export function saveProfile(p: Profile, kv: KV | null = defaultKV()): void { try { kv?.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* ignore */ } }

/** How well things stand for the player, as one number: used to see whether a scenario helped or hurt. */
export const wellbeing = (s: Pick<State, 'health' | 'energy' | 'stress' | 'rep' | 'know' | 'money' | 'strikes'>): number =>
  s.health * 0.6 + s.energy * 0.3 - s.stress * 0.6 + s.rep * 0.3 + s.know * 0.8 + Math.max(-20, Math.min(20, s.money / 2000)) - s.strikes * 12;

/** Records what happened after a scenario of this category: it went well when the player ended up better off than before. */
export function learn(p: Profile, cat: string, before: number, after: number): void {
  if (!p.on || PROTECTED.has(cat) || !/^[a-z_-]{1,20}$/.test(cat)) return;
  const c = p.cats[cat] ?? (p.cats[cat] = { n: 0, good: 0 });
  c.n = Math.min(c.n + 1, 500); if (after >= before) c.good = Math.min(c.good + 1, c.n);
  if (c.n >= 500) { c.n = 250; c.good = Math.round(c.good / 2); }        // old evidence fades
}
/** The weight factor for one scenario for this player. 1 means no change. */
export function factor(p: Profile, sc: Pick<Scenario, 'cat'>, s: Pick<State, 'status' | 'energy' | 'health' | 'stress' | 'flags' | 'docs' | 'strikes'>, hasProblems: boolean): number {
  if (!p.on || PROTECTED.has(sc.cat)) return 1;
  let f = 1;
  if (sc.cat === 'papers' && hasProblems && s.status !== 'citizen') f *= 1.5;
  if (s.energy < 20 || s.health < 25 || s.stress > 85) f *= sc.cat === 'papers' || sc.cat === 'health' ? 1.2 : 0.8;
  const c = p.cats[sc.cat];
  if (c && c.n >= MIN_SAMPLES) f *= 0.8 + 0.6 * ((c.good + 1) / (c.n + 2));           // 0.8 (always bad) to 1.4 (always good)
  return Math.max(LO, Math.min(HI, f));
}
