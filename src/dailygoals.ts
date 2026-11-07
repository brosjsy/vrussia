/* Daily goals: every game day the player gets three small goals, drawn from a pool of about a hundred, the same for the same player on the same day. A goal is
   "do this kind of thing n times today" (an action of the day, a kind of scene, an action at a place) or "end the day in good shape" (calm, rested, healthy,
   in touch). Finished goals pay a small reward at the end of the day: a little knowledge, reputation, calm or energy, never money. Over a two-year game
   that is about 2,200 goals to meet. Pure rules over the state; the engine tells this module what happened (track) and settles the day (settle). */
import type { State, Effects } from './engine';

export interface Goal { id: string; en: string; ru: string; icon: string; tier: 1 | 2 | 3; reward: Effects; check: (s: State, c: Counts) => number; need: number; end?: boolean }
export type Counts = Record<string, number>;
export interface DayGoals { day: number; counts: Counts; paid: string[] }
type S = State & { dg?: DayGoals };

const hash = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); return h >>> 0; };
const times = (n: number, en: string, ru: string): [string, string] => [n === 1 ? en : `${en} ×${n}`, n === 1 ? ru : `${ru} ×${n}`];

/* the kinds of action (engine.actions), the kinds of scene (scenario categories) and the places on the map, with their names in two languages */
const ACTIONS: [string, string, string, string][] = [
  ['work', '🛠️', 'Work a shift', 'Выйти на смену'], ['food', '🍲', 'Eat a proper meal', 'Нормально поесть'], ['out', '🚇', 'Go out into the city', 'Выйти в город'],
  ['paper', '📄', 'Deal with paperwork', 'Заняться бумагами'], ['money', '💳', 'Run an errand to a bank or shop', 'Сходить в банк или магазин'], ['people', '❤️', 'Spend time with people', 'Провести время с людьми'],
  ['edu', '📚', 'Study', 'Позаниматься'], ['home', '🛏️', 'Look after your home and rest', 'Позаботиться о доме и отдохнуть'], ['online', '💻', 'Use an online service', 'Воспользоваться онлайн-сервисом'],
  ['pets', '🐕', 'Spend time with animals', 'Провести время с животными'], ['culture', '🏛️', 'Take part in culture or community life', 'Побывать на культурном событии'], ['family', '📞', 'Call your family', 'Позвонить семье'],
];
const CATS: [string, string, string, string][] = [
  ['shop', '🛒', 'Meet a shopping situation', 'Разобраться в ситуации с покупками'], ['bank', '🏦', 'Handle a banking situation', 'Разобраться с банковским вопросом'], ['health', '🩺', 'Take care of your health', 'Позаботиться о здоровье'],
  ['social', '🤝', 'Meet a social situation', 'Побывать в общении'], ['love', '💞', 'Meet a moment of the heart', 'Пережить сердечный момент'], ['culture', '🎭', 'Meet a cultural moment', 'Встретить культурный момент'],
  ['life', '🏙️', 'Meet a moment of city life', 'Встретить городской момент'], ['food', '🥟', 'Meet a food moment', 'Встретить момент о еде'], ['home', '🏠', 'Meet a home moment', 'Встретить домашний момент'],
  ['edu', '🎓', 'Meet a study moment', 'Встретить учебный момент'], ['work', '🧱', 'Meet a moment at work', 'Встретить момент на работе'], ['paper', '🗂️', 'Meet a paperwork moment', 'Встретить момент с документами'],
  ['police', '🚓', 'Meet a moment with the law', 'Встретить момент с законом'], ['family', '👪', 'Meet a family moment', 'Встретить семейный момент'], ['pets', '🐾', 'Meet a moment with animals', 'Встретить момент с животными'],
];
const PLACES: [string, string, string, string][] = [
  ['station', '🚉', 'the railway station', 'на вокзале'], ['mfc', '🗄️', 'the MFC', 'в МФЦ'], ['guvm', '🛂', 'the migration office', 'в миграционной службе'], ['uni', '🎓', 'the university', 'в университете'],
  ['market', '🥕', 'the market', 'на рынке'], ['clinic', '🩺', 'the polyclinic', 'в поликлинике'], ['work', '🏭', 'your workplace', 'на работе'], ['bank', '🏦', 'the bank', 'в банке'],
  ['center', '🏙️', 'the city centre', 'в центре города'], ['mall', '🛍️', 'the mall', 'в торговом центре'], ['airport', '✈️', 'the airport', 'в аэропорту'], ['hospital', '🏥', 'the hospital', 'в больнице'], ['shelter', '🐶', 'the animal shelter', 'в приюте для животных'],
];
const REWARDS: Effects[] = [{ know: 1 }, { rep: 1 }, { stress: -3 }, { energy: 3 }, { know: 1, stress: -1 }, { rep: 1, energy: 1 }, { health: 1 }];
const rewardFor = (id: string, tier: number): Effects => { const base = REWARDS[hash(id) % REWARDS.length]!; if (tier < 2) return base; const out: Effects = {}; for (const [k, v] of Object.entries(base)) (out as Record<string, number>)[k] = (v as number) * 2; return out; };

const pool = (): Goal[] => {
  const out: Goal[] = [];
  for (const [id, icon, en, ru] of ACTIONS) for (const n of [1, 2, 3]) {
    if (n === 3 && !['out', 'food', 'edu', 'people', 'home'].includes(id)) continue;
    const gid = `act-${id}-${n}`, [e, r] = times(n, en, ru), tier = n as 1 | 2 | 3;
    out.push({ id: gid, en: e, ru: r, icon, tier, need: n, reward: rewardFor(gid, tier), check: (_s, c) => c[`act:${id}`] ?? 0 });
  }
  for (const [id, icon, en, ru] of CATS) for (const n of [1, 2, 3]) {
    if (n === 3 && !['shop', 'social', 'life', 'work'].includes(id)) continue;
    const gid = `cat-${id}-${n}`, [e, r] = times(n, en, ru), tier = n as 1 | 2 | 3;
    out.push({ id: gid, en: e, ru: r, icon, tier, need: n, reward: rewardFor(gid, tier), check: (_s, c) => c[`cat:${id}`] ?? 0 });
  }
  for (const [id, icon, en, ru] of PLACES) for (const n of [1, 2]) {
    const gid = `place-${id}-${n}`, tier = n as 1 | 2;
    out.push({ id: gid, en: `Do something at ${en}${n > 1 ? ` ×${n}` : ''}`, ru: `Заняться делом ${ru}${n > 1 ? ` ×${n}` : ''}`, icon, tier, need: n, reward: rewardFor(gid, tier), check: (_s, c) => c[`place:${id}`] ?? 0 });
  }
  // end-of-day goals: read from the state when the day is settled
  const E: [string, string, string, string, number, (s: State) => number, 1 | 2 | 3][] = [
    ['calm', '🧘', 'End the day calm (stress 50 or less)', 'Закончить день спокойно (стресс не выше 50)', 1, s => (s.stress <= 50 ? 1 : 0), 1],
    ['serene', '🕊️', 'End the day very calm (stress 30 or less)', 'Закончить день очень спокойно (стресс не выше 30)', 1, s => (s.stress <= 30 ? 1 : 0), 2],
    ['rested', '😌', 'End the day with energy of 40 or more', 'Закончить день с энергией от 40', 1, s => (s.energy >= 40 ? 1 : 0), 1],
    ['fresh', '⚡', 'End the day with energy of 70 or more', 'Закончить день с энергией от 70', 1, s => (s.energy >= 70 ? 1 : 0), 2],
    ['healthy', '💪', 'End the day with health of 70 or more', 'Закончить день со здоровьем от 70', 1, s => (s.health >= 70 ? 1 : 0), 1],
    ['strong', '🏋️', 'End the day with health of 90 or more', 'Закончить день со здоровьем от 90', 1, s => (s.health >= 90 ? 1 : 0), 2],
    ['liked', '🙂', 'End the day with a reputation of 40 or more', 'Закончить день с репутацией от 40', 1, s => (s.rep >= 40 ? 1 : 0), 1],
    ['clean', '✅', 'End the day with no legal strikes', 'Закончить день без предупреждений', 1, s => (s.strikes === 0 ? 1 : 0), 1],
    ['solvent', '💰', 'End the day with money in hand', 'Закончить день с деньгами в кармане', 1, s => (s.money > 0 ? 1 : 0), 1],
    ['papers', '📑', 'End the day with valid registration', 'Закончить день с действующей регистрацией', 1, s => (s.status === 'citizen' || s.docs.reg > 0 ? 1 : 0), 1],
  ];
  for (const [id, icon, en, ru, need, f, tier] of E) { const gid = `end-${id}`; out.push({ id: gid, en, ru, icon, tier, need, reward: rewardFor(gid, tier), check: s => f(s), end: true }); }
  return out;
};
export const POOL: Goal[] = pool();
export const goalById = (id: string): Goal | undefined => POOL.find(g => g.id === id);

const dg = (s: State): DayGoals => {
  const x = s as S;
  if (!x.dg || typeof x.dg !== 'object' || x.dg.day !== s.day) x.dg = { day: s.day, counts: {}, paid: [] };
  return x.dg;
};
/** The player's three goals today: the same for the same name and day, all different, and not three of one sort. */
export function goalsFor(s: State): Goal[] {
  const picked: Goal[] = [], kinds = new Set<string>(); let i = 0;
  while (picked.length < 3 && i < 60) {
    const g = POOL[hash(`${s.name}|${s.o}|${s.day}|${i++}`) % POOL.length]!, kind = g.id.split('-')[0]! + (g.end ? '' : '');
    if (picked.includes(g) || (kinds.has(kind) && picked.length < 2 && i < 30)) continue;
    // keep a goal that cannot be met out: no job, no shift; no business, no business; no pets nearby is fine (the shelter is on every map)
    if (g.id.startsWith('act-work') && !s.job) continue;
    if (g.id.startsWith('act-family') && s.status === 'citizen' && s.home === s.city) continue;
    picked.push(g); kinds.add(kind);
  }
  return picked;
}
/** What the engine tells us: an action of the day, a scene of a kind. The place is where the player stands. */
export function track(s: State, ev: { action?: string; cat?: string }): void {
  const d = dg(s), c = d.counts;
  if (ev.action) { c[`act:${ev.action}`] = (c[`act:${ev.action}`] ?? 0) + 1; c[`place:${s.loc}`] = (c[`place:${s.loc}`] ?? 0) + 1; }
  if (ev.cat) c[`cat:${ev.cat}`] = (c[`cat:${ev.cat}`] ?? 0) + 1;
}
/** How far the goal has come today (0 to need). */
export function progress(s: State, g: Goal): number { const have = g.check(s, dg(s).counts); return Math.min(g.need, have); }
export const isDone = (s: State, g: Goal): boolean => progress(s, g) >= g.need;
/** At the end of the day: the goals the player met are paid, once. Returns the lines for the day's report and the rewards to apply. */
export function settle(s: State): { lines: string[]; fx: Effects[] } {
  const d = dg(s), lines: string[] = [], fx: Effects[] = [];
  for (const g of goalsFor(s)) if (isDone(s, g) && !d.paid.includes(g.id)) { d.paid.push(g.id); fx.push(g.reward); lines.push(`${g.icon} ${g.en}`); }
  return { lines, fx };
}
