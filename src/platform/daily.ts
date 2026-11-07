/* The daily game and seasonal events. Everybody gets the same character, difficulty and starting city on the same (UTC) day, so results can
   be compared; a streak and a best score are kept on this device. Seasons are shown on the title screen with a short note and suggest a
   character; they do not change the rules. Pure apart from the storage. Results of the daily game also go to the normal leaderboard when the
   player is logged in. */
import type { KV } from '../store';

export const DAILY_KEY = 'vrussia_daily';
export interface Preset { date: string; origin: string; diff: 'easy' | 'normal' | 'hard'; city: string }
export interface DailyRecord { last: string; streak: number; best: Record<string, number> }

const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
export const dateKey = (t = Date.now()): string => new Date(t).toISOString().slice(0, 10);
const dayNumber = (key: string): number => Math.floor(Date.parse(key + 'T00:00:00Z') / 864e5);

/** Today's game from the date alone (the same for everyone). `origins` and `cities` are the ids and names the game has. */
export function presetFor(key: string, origins: readonly string[], cities: readonly string[]): Preset {
  const h = hash('vrussia|' + key);
  const diffs: Preset['diff'][] = ['easy', 'normal', 'normal', 'hard'];
  return { date: key, origin: origins[h % origins.length], diff: diffs[(h >>> 8) % diffs.length], city: cities[(h >>> 16) % cities.length] };
}

export interface Season { id: string; en: string; ru: string; noteEn: string; noteRu: string; from: [number, number]; to: [number, number]; origin?: string }
/** Month and day ranges (inclusive; a range may cross the new year). */
export const SEASONS: readonly Season[] = [
  { id: 'newyear', en: 'New Year', ru: 'Новый год', noteEn: 'The big holiday: salaries, gifts and ten days of rest. Try to be settled by 31 December.', noteRu: 'Главный праздник: зарплаты, подарки и десять дней отдыха. Постарайтесь устроиться к 31 декабря.', from: [12, 20], to: [1, 10] },
  { id: 'maslenitsa', en: 'Maslenitsa', ru: 'Масленица', noteEn: 'Pancake week before Lent: a good time to meet neighbours.', noteRu: 'Блинная неделя перед Постом: хорошо знакомиться с соседями.', from: [2, 15], to: [3, 15] },
  { id: 'victory', en: 'Victory Day', ru: 'День Победы', noteEn: '9 May: parades, the Immortal Regiment and a day off.', noteRu: '9 мая: парады, «Бессмертный полк» и выходной.', from: [5, 1], to: [5, 12] },
  { id: 'back', en: 'Back to school', ru: 'Начало учебного года', noteEn: 'Autumn: universities open on 1 September. A season for students.', noteRu: 'Осень: вузы открываются 1 сентября. Сезон студентов.', from: [8, 20], to: [9, 20], origin: 'student' },
  { id: 'harvest', en: 'Dacha season', ru: 'Дачный сезон', noteEn: 'Summer at the dacha: gardens, jars and friends.', noteRu: 'Лето на даче: огороды, заготовки и друзья.', from: [6, 1], to: [8, 19] },
];
export function seasonOn(month: number, day: number): Season | null {
  const v = month * 100 + day;
  return SEASONS.find(s => { const a = s.from[0] * 100 + s.from[1], b = s.to[0] * 100 + s.to[1]; return a <= b ? v >= a && v <= b : v >= a || v <= b; }) ?? null;
}
export const seasonOfDate = (t = Date.now()): Season | null => { const d = new Date(t); return seasonOn(d.getUTCMonth() + 1, d.getUTCDate()); };

const defaultKV = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
export function record(kv: KV | null = defaultKV()): DailyRecord {
  try {
    const o = JSON.parse(kv?.getItem(DAILY_KEY) ?? 'null') as Partial<DailyRecord> | null;
    if (o && typeof o.last === 'string' && Number.isInteger(o.streak) && o.best && typeof o.best === 'object') return { last: o.last, streak: Math.max(0, o.streak as number), best: o.best as Record<string, number> };
  } catch { /* fall through */ }
  return { last: '', streak: 0, best: {} };
}
/** The streak as it stands on `today`: it survives until the end of the day after the last game, and is gone after that. */
export function liveStreak(r: DailyRecord, today: string): number {
  if (!r.last) return 0;
  const gap = dayNumber(today) - dayNumber(r.last);
  return gap <= 1 && gap >= 0 ? r.streak : 0;
}
/** Records a finished daily game. A second game on the same day keeps the streak and only raises the best score. */
export function finish(score: number, kv: KV | null = defaultKV(), today = dateKey()): DailyRecord {
  const r = record(kv), gap = r.last ? dayNumber(today) - dayNumber(r.last) : Infinity;
  const streak = gap === 0 ? Math.max(1, r.streak) : gap === 1 ? r.streak + 1 : 1;
  const best = { ...r.best, [today]: Math.max(r.best[today] ?? 0, Math.round(score)) };
  for (const k of Object.keys(best).sort().slice(0, -30)) delete best[k];       // keep a month
  const next: DailyRecord = { last: today, streak, best };
  try { kv?.setItem(DAILY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}
