/* Everyday needs: hunger, hygiene and social contact. 100 is fine, 0 is bad. They fall a little with every part of the day and are restored by what the
   player does: eating, washing up (a bucket at first, a shower cabin if the flat has one), and time with people. When one runs very low it presses on the
   player gently (a little stress, a little reputation if unwashed, in the worst case a little energy; never health directly) so that it is worth looking after, without ever deciding the game by itself.
   The idea of needs shown as small meters next to the portrait came from watching another life game's screen; the numbers and rules are ours.
   Pure functions over the game state; they do not use the engine's code, only its State type, so the engine can call them. */
import type { State } from './engine';
import { warmthMeter } from './warmth';
import { meterColours } from './settings';
import { choreMoodlets } from './chores';

export interface Needs { hunger: number; hygiene: number; social: number; fun: number; bladder: number }
export type NeedKey = keyof Needs;
export const NEED_KEYS: NeedKey[] = ['hunger', 'hygiene', 'social', 'fun', 'bladder'];
export const NEED_INFO: Record<NeedKey, { icon: string; label: string; color: string }> = {
  hunger: { icon: '🍲', label: 'Hunger', color: '#f08a3c' }, hygiene: { icon: '🧼', label: 'Hygiene', color: '#2bb5c9' }, social: { icon: '💬', label: 'Social', color: '#a56be0' },
  fun: { icon: '🎉', label: 'Fun', color: '#f0b43c' }, bladder: { icon: '🚽', label: 'Bladder', color: '#5a8fd6' },
};
/** What each part of the day takes from each need. */
export const DECAY: Record<NeedKey, number> = { hunger: 4, hygiene: 3, social: 3, fun: 3, bladder: 6 };
const START: Record<NeedKey, number> = { hunger: 80, hygiene: 80, social: 70, fun: 70, bladder: 90 };
/** Below LOW a need adds a little stress; at VERY_LOW (nothing left) hunger also takes a little energy. A player who eats, sees people and rests now and then never meets either. */
export const LOW = 10, VERY_LOW = 0;

const clamp = (v: number): number => Math.max(0, Math.min(100, Math.round(v)));
const slotNo = (s: State): number => s.day * 3 + s.slot;

/** The needs of the player (made on first use; saves from before simply start at ordinary values). */
export function needsOf(s: State): Needs {
  const x = s as State & { needs?: Needs };
  const n = x.needs;
  if (!n || typeof n !== 'object') x.needs = { ...START };
  else for (const k of NEED_KEYS) if (!Number.isFinite(n[k])) n[k] = START[k]; else n[k] = clamp(n[k]);
  return x.needs as Needs;
}

/** One part of the day passes: every need falls, and a need that is very low presses on the player. Returns short notes for the day's report. */
export function decayNeeds(s: State): string[] {
  const n = needsOf(s), out: string[] = [];
  for (const k of NEED_KEYS) n[k] = clamp(n[k] - DECAY[k]);
  if (n.hunger <= LOW) { s.stress = Math.min(100, s.stress + 1); if (n.hunger <= VERY_LOW) { s.energy = Math.max(0, s.energy - 3); out.push('You are very hungry and weak.'); } else out.push('You are hungry.'); }
  if (n.hygiene <= LOW) { s.rep = Math.max(0, s.rep - 1); out.push('You really need to wash up; people notice.'); }
  if (n.social <= LOW) { s.stress = Math.min(100, s.stress + 1); out.push('You feel lonely.'); }
  if (n.fun <= LOW) { s.stress = Math.min(100, s.stress + 1); out.push('You are bored: all work and no play.'); }
  if (n.bladder <= LOW) { s.stress = Math.min(100, s.stress + 1); out.push('You really need a toilet.'); }
  return out;
}

/** What an action does for the needs. Called by the engine for every action. */
export function needsOnAction(s: State, actionId: string): void {
  const n = needsOf(s);
  if (actionId === 'food') n.hunger = clamp(n.hunger + 50);
  else if (actionId === 'home') n.hygiene = clamp(n.hygiene + 20);                    // at home there is time to wash a little
  else if (actionId === 'people') n.social = clamp(n.social + 30);
  else if (actionId === 'out' || actionId === 'culture' || actionId === 'pets') n.social = clamp(n.social + 14);
  else if (actionId === 'family') n.social = clamp(n.social + 18);
  // fun: going out, culture, pets and people are fun; an evening at home or online a little
  const FUN: Record<string, number> = { out: 25, culture: 30, pets: 20, people: 15, family: 12, online: 8, home: 6, flight: 10 };
  if (FUN[actionId]) n.fun = clamp(n.fun + FUN[actionId]);
  if (actionId.startsWith('act:')) n.fun = clamp(n.fun + 20);
  // a toilet: at home always, and there is one wherever the part of the day is spent, except on the road
  if (actionId === 'home') n.bladder = 100; else if (actionId !== 'travel' && actionId !== 'flight') n.bladder = clamp(n.bladder + 40);
}
/** Using the toilet at home (no time taken). */
export function useToilet(s: State): WashResult { const n = needsOf(s); if (n.bladder >= 95) return { ok: false, msg: 'You do not need to go.' }; n.bladder = 100; return { ok: true, msg: 'Much better.' }; }

export type WashKind = 'bucket' | 'shower';
export interface WashResult { ok: boolean; msg: string }
/** Washing up takes no time but can be done only once in each part of the day. A bucket gives a good wash, a shower cabin a perfect one and calms a little more. */
export function wash(s: State, kind: WashKind): WashResult {
  const t = s.tmp as Record<string, string | number>, now = slotNo(s);
  if (t.washedAt === now) return { ok: false, msg: 'You have already washed up this part of the day.' };
  const n = needsOf(s); t.washedAt = now;
  if (kind === 'shower') { n.hygiene = 100; s.stress = Math.max(0, s.stress - 3); return { ok: true, msg: 'A hot shower. You feel brand new.' }; }
  n.hygiene = clamp(n.hygiene + 55); s.stress = Math.max(0, s.stress - 1);
  return { ok: true, msg: 'A bucket bath: you feel fresher.' };
}

/** The most urgent need as a short phrase for the chip over the player, or null when none is low. */
export function needStatus(s: State): { text: string; color: string; key: NeedKey } | null {
  const n = needsOf(s);
  if (n.hunger <= LOW) return { text: 'Hungry · eat something', color: '#e07b2a', key: 'hunger' };
  if (n.hygiene <= LOW) return { text: 'Dirty · wash up', color: '#2bb5c9', key: 'hygiene' };
  if (n.social <= LOW) return { text: 'Lonely · meet someone', color: '#a56be0', key: 'social' };
  if (n.bladder <= LOW) return { text: 'Needs a toilet · go home', color: '#5a8fd6', key: 'bladder' };
  if (n.fun <= LOW) return { text: 'Bored · go out', color: '#f0b43c', key: 'fun' };
  return null;
}
/** The colour of a meter at this value. */
let colourSafe = false;
/** Colours that people with red-green colour blindness can tell apart (a setting). */
export const setColourSafe = (on: boolean): void => { colourSafe = on; };
export const meterColor = (v: number): string => { const [ok, warn, bad] = meterColours(colourSafe); return v <= 12 ? bad : v <= 30 ? warn : ok; };

/* ---------- why a bar is low, and moodlets ---------- */
export type Meter = NeedKey | 'energy' | 'health' | 'calm' | 'warmth';
/** Why a meter stands where it does and the quickest way to fill it, as keys of the words (the screen translates them). */
export function meterAdvice(s: State, key: Meter): { why: string; fix: string; value: number } {
  const n = needsOf(s), w = warmthMeter(s, s.loc === 'home');
  const value = key === 'energy' ? s.energy : key === 'health' ? s.health : key === 'calm' ? 100 - s.stress : key === 'warmth' ? (w ?? 100) : n[key];
  const low = value <= 30 ? 'low' : 'ok';
  return { why: `why.${key}.${low}`, fix: `fix.${key}`, value };
}
/** Small feelings with a reason and a weight, from what the player's state is now: "Well rested +2", "Cold -1"... The mood line sums them up. */
export interface Moodlet { key: string; v: number }
export function moodlets(s: State): Moodlet[] {
  const n = needsOf(s), w = warmthMeter(s, s.loc === 'home'), out: Moodlet[] = [];
  if (s.energy >= 80) out.push({ key: 'ml.rested', v: 2 }); else if (s.energy <= 25) out.push({ key: 'ml.tired', v: -2 });
  if (n.hunger >= 80) out.push({ key: 'ml.fed', v: 1 }); else if (n.hunger <= LOW) out.push({ key: 'ml.hungry', v: -2 });
  if (n.fun >= 75) out.push({ key: 'ml.fun', v: 2 }); else if (n.fun <= LOW) out.push({ key: 'ml.bored', v: -1 });
  if (n.social >= 75) out.push({ key: 'ml.company', v: 1 }); else if (n.social <= LOW) out.push({ key: 'ml.lonely', v: -2 });
  if (n.hygiene <= LOW) out.push({ key: 'ml.dirty', v: -1 }); else if (n.hygiene >= 90) out.push({ key: 'ml.fresh', v: 1 });
  if (n.bladder <= LOW) out.push({ key: 'ml.bladder', v: -2 });
  if (w !== null && w < 40) out.push({ key: 'ml.cold', v: w < 20 ? -2 : -1 });
  if (s.stress >= 70) out.push({ key: 'ml.stressed', v: -2 }); else if (s.stress <= 20) out.push({ key: 'ml.calm', v: 1 });
  if (s.health <= 30) out.push({ key: 'ml.unwell', v: -2 });
  if (s.friends >= 3) out.push({ key: 'ml.friends', v: 1 });
  if (s.money < 0) out.push({ key: 'ml.debt', v: -2 });
  out.push(...choreMoodlets(s));                                    // clean clothes, the mobile plan, home internet (chores.ts)
  return out;
}
