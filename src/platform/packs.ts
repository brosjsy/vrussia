/* Community scenario packs: a moderator, a teacher or an NGO writes extra scenarios in a JSON file; the game checks it strictly and only then
   adds the scenarios. A pack can change the numbers of the game in small, bounded steps and set flags; it cannot run code, open a network
   connection or touch anything else. Packs live in this browser only (key "vrussia_packs"), nothing is uploaded. Format: docs/PACKS.md. */
import { O, S, index, scenarios } from '../engine';
import type { Effects, Status } from '../engine';
import type { KV } from '../store';

export const PACKS_KEY = 'vrussia_packs';
export const MAX_PACK_BYTES = 120_000, MAX_SCENARIOS = 60, MAX_STORED = 200_000;
const STATUSES: Status[] = ['citizen', 'migrant', 'eaeu', 'student'];
/** The numbers a choice may change, and the most it may change each by in one go. */
const LIMITS: Record<string, [number, number]> = {
  money: [-50000, 50000], energy: [-30, 30], health: [-20, 20], stress: [-30, 30], rep: [-15, 15], know: [-10, 10],
  strike: [0, 1], friends: [-3, 3], famLove: [-15, 15], merit: [0, 3], clothes: [-10, 10],
};
const FLAG = /^[a-z0-9_]{1,30}$/;

export interface PackChoice { t: string; msg: string; fx?: Record<string, unknown> }
export interface PackScenario { id: string; title: string; text: string; choices: PackChoice[]; who?: Status[]; months?: number[]; w?: number; once?: boolean }
export interface Pack { format: 'vrussia-pack'; version: 1; id: string; name: string; author?: string; scenarios: PackScenario[] }

const isStr = (v: unknown, min: number, max: number): v is string => typeof v === 'string' && v.trim().length >= min && v.length <= max;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Every problem in a pack, in plain words; an empty list means the pack is safe to add. */
export function validatePack(raw: unknown): string[] {
  const p: string[] = [];
  if (!isObj(raw)) return ['The file is not a pack (it must be a JSON object).'];
  if (raw.format !== 'vrussia-pack') p.push('"format" must be "vrussia-pack".');
  if (raw.version !== 1) p.push('"version" must be 1.');
  if (typeof raw.id !== 'string' || !/^[a-z0-9]{2,20}$/.test(raw.id)) p.push('"id" must be 2 to 20 small letters or digits.');
  if (!isStr(raw.name, 2, 60)) p.push('"name" must be 2 to 60 characters.');
  if (raw.author !== undefined && !isStr(raw.author, 1, 60)) p.push('"author" must be up to 60 characters.');
  if (!Array.isArray(raw.scenarios) || raw.scenarios.length === 0) { p.push('"scenarios" must be a list with at least one scenario.'); return p; }
  if (raw.scenarios.length > MAX_SCENARIOS) p.push(`A pack has at most ${MAX_SCENARIOS} scenarios.`);
  const seen = new Set<string>();
  raw.scenarios.slice(0, MAX_SCENARIOS).forEach((sc, i) => {
    const at = `Scenario ${i + 1}`;
    if (!isObj(sc)) { p.push(`${at}: must be an object.`); return; }
    if (typeof sc.id !== 'string' || !/^[a-z0-9-]{2,30}$/.test(sc.id)) p.push(`${at}: "id" must be 2 to 30 small letters, digits or dashes.`);
    else if (seen.has(sc.id)) p.push(`${at}: the id "${sc.id}" is used twice.`); else seen.add(sc.id);
    if (!isStr(sc.title, 2, 80)) p.push(`${at}: "title" must be 2 to 80 characters.`);
    if (!isStr(sc.text, 10, 700)) p.push(`${at}: "text" must be 10 to 700 characters.`);
    if (sc.w !== undefined && !(typeof sc.w === 'number' && sc.w >= 0.1 && sc.w <= 3)) p.push(`${at}: "w" (how often) must be between 0.1 and 3.`);
    if (sc.once !== undefined && typeof sc.once !== 'boolean') p.push(`${at}: "once" must be true or false.`);
    if (sc.who !== undefined && !(Array.isArray(sc.who) && sc.who.length > 0 && sc.who.every(x => STATUSES.includes(x as Status)))) p.push(`${at}: "who" must be a list of ${STATUSES.join(', ')}.`);
    if (sc.months !== undefined && !(Array.isArray(sc.months) && sc.months.length > 0 && sc.months.every(m => Number.isInteger(m) && (m as number) >= 1 && (m as number) <= 12))) p.push(`${at}: "months" must be numbers from 1 to 12.`);
    if (!Array.isArray(sc.choices) || sc.choices.length < 2 || sc.choices.length > 4) { p.push(`${at}: "choices" must have 2 to 4 choices.`); return; }
    sc.choices.forEach((c, j) => {
      const ct = `${at}, choice ${j + 1}`;
      if (!isObj(c)) { p.push(`${ct}: must be an object.`); return; }
      if (!isStr(c.t, 1, 80)) p.push(`${ct}: "t" (the button) must be 1 to 80 characters.`);
      if (!isStr(c.msg, 3, 400)) p.push(`${ct}: "msg" (the result) must be 3 to 400 characters.`);
      if (c.fx !== undefined) {
        if (!isObj(c.fx)) { p.push(`${ct}: "fx" must be an object.`); return; }
        for (const [k, v] of Object.entries(c.fx)) {
          if (k === 'flag') { const list = Array.isArray(v) ? v : [v]; if (!list.every(x => typeof x === 'string' && FLAG.test(x)) || list.length > 3) p.push(`${ct}: "flag" must be up to 3 names of small letters, digits or _.`); }
          else if (LIMITS[k]) { const [lo, hi] = LIMITS[k]; if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) p.push(`${ct}: "${k}" must be a number from ${lo} to ${hi}.`); }
          else p.push(`${ct}: "${k}" is not allowed in a pack.`);
        }
      }
    });
  });
  return p;
}

/** Builds the game's scenarios from a checked pack. Ids get the prefix "pack-<id>-", so a pack can never replace a scenario of the game. */
export function register(pack: Pack): number {
  let n = 0;
  for (const sc of pack.scenarios) {
    S({
      id: `pack-${pack.id}-${sc.id}`, cat: 'life', title: sc.title, text: sc.text, who: sc.who, months: sc.months, w: sc.w ?? 1, once: sc.once,
      choices: sc.choices.map(c => ({ t: c.t, r: () => O(c.msg, (c.fx ?? {}) as Effects) })),
    });
    n++;
  }
  index();
  return n;
}
/** Takes a pack's scenarios out of the game again. */
export function unregister(packId: string): number {
  const prefix = `pack-${packId}-`; let n = 0;
  for (let i = scenarios.length - 1; i >= 0; i--) if (scenarios[i].id.startsWith(prefix)) { scenarios.splice(i, 1); n++; }
  index();
  return n;
}

const defaultKV = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
export function storedPacks(kv: KV | null = defaultKV()): Pack[] {
  try { const l = JSON.parse(kv?.getItem(PACKS_KEY) ?? '[]') as unknown; return Array.isArray(l) ? l.filter(x => validatePack(x).length === 0) as Pack[] : []; } catch { return []; }
}
export interface AddResult { ok: boolean; problems: string[]; count: number }
/** Checks, stores and registers a pack given as text. A pack with an id already added replaces the old one. */
export function addPack(text: string, kv: KV | null = defaultKV()): AddResult {
  if (text.length > MAX_PACK_BYTES) return { ok: false, problems: [`The file is too big (at most ${MAX_PACK_BYTES / 1000} KB).`], count: 0 };
  let raw: unknown; try { raw = JSON.parse(text); } catch { return { ok: false, problems: ['The file is not valid JSON.'], count: 0 }; }
  const problems = validatePack(raw);
  if (problems.length) return { ok: false, problems, count: 0 };
  const pack = raw as Pack, others = storedPacks(kv).filter(x => x.id !== pack.id);
  const all = JSON.stringify([...others, pack]);
  if (all.length > MAX_STORED) return { ok: false, problems: ['Too many packs are stored: remove one first.'], count: 0 };
  try { kv?.setItem(PACKS_KEY, all); } catch { return { ok: false, problems: ['This browser cannot store the pack.'], count: 0 }; }
  unregister(pack.id);
  return { ok: true, problems: [], count: register(pack) };
}
export function removePack(id: string, kv: KV | null = defaultKV()): void {
  try { kv?.setItem(PACKS_KEY, JSON.stringify(storedPacks(kv).filter(p => p.id !== id))); } catch { /* ignore */ }
  unregister(id);
}
/** At start-up: the packs added earlier. */
export function loadStored(kv: KV | null = defaultKV()): number { let n = 0; for (const p of storedPacks(kv)) { unregister(p.id); n += register(p); } return n; }

export const TEMPLATE: Pack = {
  format: 'vrussia-pack', version: 1, id: 'myclass', name: 'My first pack', author: 'Your name',
  scenarios: [{
    id: 'bus-ticket', title: 'The bus conductor', who: ['migrant', 'student'], w: 1,
    text: 'On the bus the conductor asks for your fare. You are not sure how much it costs in this city.',
    choices: [
      { t: 'Ask the passenger next to you', msg: 'She tells you the price and where to buy a card. You learn something and make a friend.', fx: { know: 1, friends: 1 } },
      { t: 'Hand over a large note', msg: 'The conductor sighs, but gives change. It takes a while.', fx: { money: -100, stress: 2 } },
    ],
  }],
};
