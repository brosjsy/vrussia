/* Holidays and seasonal events. Five events with dates: New Year (the tree, gifts, fireworks), Maslenitsa (the pancake week before Lent),
   Tatiana's Day (students' day, 25 January), City Day (early September) and the White Nights (June, in Saint Petersburg). While an event is on, it has
   three small tasks; each finished task gives points on a free seasonal pass with three rewards (money and a festive keepsake). Nothing is sold: the
   pass is free. Other parts of the game report what the player did with \`bump(s, key)\` (cooked blini, visited a landmark, bought a gift...); this file
   does not import them. Opt-in in practice: the bots never do these tasks, and the rewards are small. Pure. */
import type { State } from './engine';

export interface Task { key: string; need: number; en: string; ru: string }
export interface GameEvent { id: string; icon: string; name: string; ru: string; en_text: string; ru_text: string; tasks: Task[]; rewards: { at: number; money: number; keepsake: string; ru: string }[]; city?: string }
/** The events. Maslenitsa moves with Easter: the game knows its dates for 2027 and 2028 (the years a game can reach). */
export const EVENTS: GameEvent[] = [
  { id: 'newyear', icon: '🎄', name: 'New Year', ru: 'Новый год', en_text: 'Tangerines, a tree with lights, gifts for everybody and fireworks at midnight.', ru_text: 'Мандарины, ёлка с огнями, подарки и салют в полночь.',
    tasks: [{ key: 'gift', need: 3, en: 'Give 3 gifts (flowers, chocolates or a cake)', ru: 'Подарить 3 подарка (цветы, конфеты или торт)' }, { key: 'cook', need: 2, en: 'Cook 2 festive dishes at home', ru: 'Приготовить дома 2 праздничных блюда' }, { key: 'centre', need: 1, en: 'See the fireworks in the city centre', ru: 'Посмотреть салют в центре города' }],
    rewards: [{ at: 1, money: 500, keepsake: 'A glass tree ornament', ru: 'Стеклянная ёлочная игрушка' }, { at: 2, money: 1000, keepsake: 'A Ded Moroz figure', ru: 'Фигурка Деда Мороза' }, { at: 3, money: 2000, keepsake: 'A snow globe of your city', ru: 'Снежный шар с вашим городом' }] },
  { id: 'tatiana', icon: '🎓', name: "Tatiana's Day", ru: 'Татьянин день', en_text: "Students' day: lectures end early and everybody celebrates.", ru_text: 'День студентов: лекции кончаются рано, и все празднуют.',
    tasks: [{ key: 'lecture', need: 1, en: 'Go to a lecture', ru: 'Сходить на лекцию' }, { key: 'words', need: 5, en: 'Learn the five Russian words of the day', ru: 'Выучить пять русских слов дня' }, { key: 'social', need: 1, en: 'Meet people', ru: 'Встретиться с людьми' }],
    rewards: [{ at: 1, money: 300, keepsake: 'A student badge', ru: 'Студенческий значок' }, { at: 2, money: 600, keepsake: 'A university mug', ru: 'Университетская кружка' }, { at: 3, money: 1000, keepsake: 'A signed textbook', ru: 'Учебник с автографом' }] },
  { id: 'maslenitsa', icon: '🥞', name: 'Maslenitsa', ru: 'Масленица', en_text: 'Pancake week: blini every day, sledges, and the straw figure burned on Sunday to see winter off.', ru_text: 'Блинная неделя: блины каждый день, санки и чучело, которое сжигают в воскресенье, провожая зиму.',
    tasks: [{ key: 'blini', need: 3, en: 'Cook blini 3 times', ru: 'Испечь блины 3 раза' }, { key: 'park', need: 1, en: 'Go to the festival in the park', ru: 'Сходить на гуляния в парк' }, { key: 'social', need: 2, en: 'Meet people twice', ru: 'Дважды встретиться с людьми' }],
    rewards: [{ at: 1, money: 400, keepsake: 'A painted wooden spoon', ru: 'Расписная деревянная ложка' }, { at: 2, money: 800, keepsake: 'A Pavlovo Posad style shawl', ru: 'Павловопосадский платок' }, { at: 3, money: 1500, keepsake: 'A small straw doll', ru: 'Соломенная куколка' }] },
  { id: 'whitenights', icon: '🌅', name: 'White Nights', ru: 'Белые ночи', city: 'Saint Petersburg', en_text: 'The sun hardly sets. The bridges open at night and the city stays up.', ru_text: 'Солнце почти не садится. Ночью разводят мосты, и город не спит.',
    tasks: [{ key: 'embankment', need: 1, en: 'Walk on the embankment', ru: 'Погулять по набережной' }, { key: 'landmark', need: 2, en: 'Visit 2 landmarks', ru: 'Посетить 2 достопримечательности' }, { key: 'social', need: 1, en: 'Meet people', ru: 'Встретиться с людьми' }],
    rewards: [{ at: 1, money: 400, keepsake: 'A photo of the opened bridge', ru: 'Фото разведённого моста' }, { at: 2, money: 800, keepsake: 'A sailor striped shirt', ru: 'Тельняшка' }, { at: 3, money: 1500, keepsake: 'A model of the cruiser', ru: 'Модель крейсера' }] },
  { id: 'cityday', icon: '🎉', name: 'City Day', ru: 'День города', en_text: 'Concerts, fairs in the squares and fireworks over the river.', ru_text: 'Концерты, ярмарки на площадях и салют над рекой.',
    tasks: [{ key: 'landmark', need: 2, en: 'Visit 2 landmarks', ru: 'Посетить 2 достопримечательности' }, { key: 'centre', need: 1, en: 'Go to the city centre', ru: 'Сходить в центр города' }, { key: 'cafe', need: 1, en: 'Have something at a café', ru: 'Зайти в кафе' }],
    rewards: [{ at: 1, money: 400, keepsake: 'A city flag', ru: 'Флажок города' }, { at: 2, money: 800, keepsake: 'A fair-ground magnet', ru: 'Магнит с ярмарки' }, { at: 3, money: 1500, keepsake: 'A city day medal', ru: 'Памятная медаль Дня города' }] },
];
const MASLENITSA: Record<number, [number, number]> = { 2027: [3, 8], 2028: [2, 21] };      // the Monday of Maslenitsa week (month, day)
const dateOf = (s: State): Date => new Date(new Date(2026, 8, 1).getTime() + s.day * 864e5);
/** The event on now, or null. City Day is the first Saturday of September and the week around it; New Year from 25 December to 8 January. */
export function activeEvent(s: State): GameEvent | null {
  const d = dateOf(s), y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  const on = (id: string): GameEvent => EVENTS.find(e => e.id === id) as GameEvent;
  if ((m === 12 && day >= 25) || (m === 1 && day <= 8)) return on('newyear');
  if (m === 1 && day >= 24 && day <= 26) return on('tatiana');
  const ms = MASLENITSA[y]; if (ms) { const start = new Date(y, ms[0] - 1, ms[1]), end = new Date(y, ms[0] - 1, ms[1] + 7); if (d >= start && d < end) return on('maslenitsa'); }
  if (m === 6 && /petersburg/i.test(s.city)) return on('whitenights');
  if (m === 9 && day <= 10) return on('cityday');
  return null;
}
/** The year of an event, so that New Year 2026/27 and New Year 2027/28 are kept apart. */
const runOf = (s: State, e: GameEvent): string => { const d = dateOf(s); return `${e.id}:${e.id === 'newyear' && d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear()}`; };
interface Book { counts: Record<string, Record<string, number>>; claimed: Record<string, number[]>; keepsakes: string[] }
type S = State & { events?: Book };
export function bookOf(s: State): Book { const x = s as S; if (!x.events || typeof x.events !== 'object' || typeof x.events.counts !== 'object') x.events = { counts: {}, claimed: {}, keepsakes: [] }; return x.events; }
/** Reports something the player did; it counts only toward an event that is on now. */
export function bump(s: State, key: string, by = 1): void {
  const e = activeEvent(s); if (!e || !e.tasks.some(t => t.key === key)) return;
  const b = bookOf(s), run = runOf(s, e), c = (b.counts[run] ??= {}); c[key] = (c[key] ?? 0) + by;
}
/** The event's tasks with their progress, and how many are done. */
export function progress(s: State): { event: GameEvent; tasks: { task: Task; have: number; done: boolean }[]; done: number } | null {
  const e = activeEvent(s); if (!e) return null;
  const c = bookOf(s).counts[runOf(s, e)] ?? {};
  const tasks = e.tasks.map(task => { const have = Math.min(task.need, c[task.key] ?? 0); return { task, have, done: have >= task.need }; });
  return { event: e, tasks, done: tasks.filter(x => x.done).length };
}
/** Takes the rewards of the pass that have been earned and not yet taken. Returns what was given. */
export function claim(s: State): { money: number; keepsakes: string[] } {
  const p = progress(s); if (!p) return { money: 0, keepsakes: [] };
  const b = bookOf(s), run = runOf(s, p.event), got = (b.claimed[run] ??= []); let money = 0; const ks: string[] = [];
  p.event.rewards.forEach((r, i) => { if (p.done >= r.at && !got.includes(i)) { got.push(i); money += r.money; ks.push(r.keepsake); b.keepsakes.push(r.keepsake); } });
  s.money += money; return { money, keepsakes: ks };
}
export const claimable = (s: State): number => { const p = progress(s); if (!p) return 0; const got = bookOf(s).claimed[runOf(s, p.event)] ?? []; return p.event.rewards.filter((r, i) => p.done >= r.at && !got.includes(i)).length; };
