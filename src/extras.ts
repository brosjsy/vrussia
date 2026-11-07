/* Planned paid extras: an INTEREST TEST, not a shop. The phone shows what could one day be sold (docs/REVENUE_PLAYERS.md), with the planned price in real
   roubles, says in plain words that nothing is on sale and nothing is charged, and lets the player press "I would want this". That adds 1 to an anonymous
   counter on the server (src/api-client.ts, counters interest_*) and remembers on this device that the player pressed, so one device counts once per offer.
   Nothing about the player is sent or stored. The test ends on EXTRAS_OPEN_UNTIL; after that the phone no longer shows it. Pure: no screen, no network. */
import type { KV } from './store';
import type { CounterKey } from './api-client';

export type ExtraId = 'exam' | 'plus' | 'looks' | 'gift';
export interface Extra { id: ExtraId; counter: CounterKey; icon: string; name: string; ru: string; what: string; whatRu: string; priceRub: number; period: string; periodRu: string }
/** The prices are assumptions to be tested (docs/REVENUE_PLAYERS.md, section 3); they are real roubles, never game money. */
export const EXTRAS: Extra[] = [
  { id: 'exam', counter: 'interest_exam', icon: '📝', name: 'Exam practice pass', ru: 'Тренажёр к экзамену', what: 'Practice questions and timed mock exams for the Russian-language, history and law exam, each answer with its source.', whatRu: 'Вопросы для тренировки и пробные экзамены по русскому языку, истории и законодательству; у каждого ответа указан источник.', priceRub: 349, period: 'for 60 days', periodRu: 'на 60 дней' },
  { id: 'plus', counter: 'interest_plus', icon: '⭐', name: 'Plus', ru: 'Плюс', what: 'A printable real-life checklist and progress report in your language, saved-run history, an offline pack and every look. Cancel in one step.', whatRu: 'Печатный список дел на реальную жизнь и отчёт о ваших успехах на вашем языке, история игр, офлайн-версия и все оформления. Отказаться можно в один шаг.', priceRub: 149, period: 'a month', periodRu: 'в месяц' },
  { id: 'looks', counter: 'interest_looks', icon: '🎨', name: 'Looks', ru: 'Оформления', what: 'Extra phone looks, outfits, flat styles and designer colours. Only how things look; nothing changes in a story.', whatRu: 'Дополнительные виды телефона, одежда, стили квартиры и цвета в конструкторе. Меняется только внешний вид, истории не меняются.', priceRub: 99, period: 'each', periodRu: 'за штуку' },
  { id: 'gift', counter: 'interest_gift', icon: '🎁', name: 'A seat for someone else', ru: 'Место для другого человека', what: 'Pay for a year of Plus for a relative, a friend or a worker, with a gift code.', whatRu: 'Оплатить год «Плюса» для родственника, друга или работника по подарочному коду.', priceRub: 990, period: 'a year', periodRu: 'в год' },
];

/** The last day the test is shown (YYYY-MM-DD). Change it here to run it longer or stop it. */
export const EXTRAS_OPEN_UNTIL = '2027-01-31';
export const extrasOpen = (today: string = new Date().toISOString().slice(0, 10)): boolean => today <= EXTRAS_OPEN_UNTIL;

export const INTEREST_KEY = 'vrussia_extras_interest';
const kvDefault = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
/** The offers this device has already pressed. Anything odd in storage means none. */
export function pressed(kv: KV | null = kvDefault()): Set<ExtraId> {
  try { const v: unknown = JSON.parse(kv?.getItem(INTEREST_KEY) ?? '[]'); return new Set((Array.isArray(v) ? v : []).filter((x): x is ExtraId => EXTRAS.some(e => e.id === x))); } catch { return new Set(); }
}
/** Remembers a press. True only the first time on this device, so the counter is not pushed up by pressing again. */
export function press(id: ExtraId, kv: KV | null = kvDefault()): boolean {
  const have = pressed(kv); if (have.has(id)) return false;
  have.add(id);
  try { kv?.setItem(INTEREST_KEY, JSON.stringify([...have])); } catch { /* forgotten on reload: the worst case is one more count */ }
  return true;
}
/** A real price in roubles, written in words so it is never taken for the game's own money. */
export const rub = (n: number, ru = true): string => `${n.toLocaleString('ru-RU')} ${ru ? 'руб.' : 'RUB'}`;
