/* The first minutes, made easier. Three small helpers drawn from the research on first-time players (docs/UX_RESEARCH.md):
     nextStep - one short, always-visible goal ("Register your stay"), so a new player never wonders what to do (short-term goals, always in view);
     hints    - a plain tip the first time something becomes relevant (low energy, low money, a strike, a paper about to expire), once each
                (teach when it matters, not all at the start);
     wins     - what has just been achieved since the last look (a paper obtained, a goal done), so the game can celebrate at once
                (early wins and feedback within the first minutes).
   Pure: a game state in, plain data out. The screen part is in platform-ui.ts. */
import type { State } from '../engine';
import { buildReport } from './report';
import type { Step } from './report';
import type { KV } from '../store';

export interface Text { en: string; ru: string }
/** Short names of the checklist steps, and the guide topic that explains each. */
export const GOALS: Record<string, { label: Text; topic: string }> = {
  s_reg: { label: { en: 'Register your stay', ru: 'Встать на миграционный учёт' }, topic: 'registration' },
  s_med: { label: { en: 'Pass the medical exam', ru: 'Пройти медосмотр' }, topic: 'medical' },
  s_ins: { label: { en: 'Get health insurance', ru: 'Оформить страховку' }, topic: 'medical' },
  s_test: { label: { en: 'Pass the Russian language test', ru: 'Сдать экзамен по русскому языку' }, topic: 'language' },
  s_pat: { label: { en: 'Buy your work patent', ru: 'Купить патент на работу' }, topic: 'patent' },
  s_contract: { label: { en: 'Find a job with a contract', ru: 'Найти работу по договору' }, topic: 'patent' },
  s_eaeu: { label: { en: 'Find a job with a contract', ru: 'Найти работу по договору' }, topic: 'eaeu' },
  s_stud: { label: { en: 'Settle in at the university', ru: 'Освоиться в университете' }, topic: 'student' },
  s_bank: { label: { en: 'Open a bank account', ru: 'Открыть банковский счёт' }, topic: 'account' },
  s_ladder: { label: { en: 'Work towards a residence permit', ru: 'Двигаться к разрешению на проживание' }, topic: 'ladder' },
  s_oms: { label: { en: 'Get your health insurance policy', ru: 'Оформить полис ОМС' }, topic: 'medical' },
  s_tax: { label: { en: 'Register your own income', ru: 'Оформить свой доход' }, topic: 'help' },
};
const ADVICE = new Set(['s_rent']);       // advice the state cannot show as done
const ORDER = ['s_reg', 's_med', 's_ins', 's_test', 's_pat', 's_contract', 's_eaeu', 's_stud', 's_bank', 's_oms', 's_tax', 's_ladder'];

export interface Next { id: string; label: Text; topic: string; daysLeft: number | null }
/** The most useful thing to do next, or null when everything on the list is done. */
export function nextStep(s: State): Next | null {
  // a registration that has run out is the most urgent thing; one that is about to run out comes next (docs.reg counts the days it is still valid)
  if (s.status !== 'citizen' && !s.flags.rvp && !s.flags.naturalized) {
    if (s.docs.reg <= 0) return { id: 's_reg', label: GOALS.s_reg.label, topic: 'registration', daysLeft: null };
    if (s.docs.reg <= 5) return { id: 'renew_reg', label: { en: 'Renew your registration', ru: 'Продлить регистрацию' }, topic: 'registration', daysLeft: s.docs.reg };
  }
  const steps = buildReport(s).steps.filter(x => !x.done && !ADVICE.has(x.id) && GOALS[x.id]);
  steps.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const st: Step | undefined = steps[0];
  if (!st) return null;
  return { id: st.id, label: GOALS[st.id].label, topic: GOALS[st.id].topic, daysLeft: null };
}

export interface Hint { id: string; when: (s: State) => boolean; text: Text }
export const HINTS: readonly Hint[] = [
  { id: 'energy', when: s => s.energy < 30, text: { en: 'Your energy is low. Eat or rest at home before you work, or you will burn out.', ru: 'Энергия на исходе. Поешьте или отдохните дома, прежде чем работать, иначе наступит выгорание.' } },
  { id: 'money', when: s => s.day >= 3 && s.money < 1500, text: { en: 'Money is running low and rent is due on Saturday. A shift at work brings cash.', ru: 'Деньги заканчиваются, а в субботу нужно платить за жильё. Смена на работе принесёт деньги.' } },
  { id: 'strike', when: s => s.strikes >= 1, text: { en: 'You got a legal strike. Three can end in deportation: put your papers in order first.', ru: 'Вы получили предупреждение. Три могут закончиться депортацией: сначала приведите бумаги в порядок.' } },
  { id: 'stress', when: s => s.stress > 75, text: { en: 'Stress is high and it hurts your health. A quiet evening at home brings it down.', ru: 'Стресс высокий и вредит здоровью. Тихий вечер дома его снижает.' } },
  { id: 'expiring', when: s => s.status !== 'citizen' && ((s.docs.reg > 0 && s.docs.reg <= 3) || (s.docs.patent > 0 && s.docs.patent <= 5)), text: { en: 'One of your papers is about to expire. Open Documents and renew it in time.', ru: 'Срок одного из документов скоро истечёт. Откройте «Документы» и продлите его вовремя.' } },
  { id: 'first_week', when: s => s.day >= 7, text: { en: 'A week has passed. Press ❓ or the More menu to ask the guide anything.', ru: 'Прошла неделя. Нажмите ❓ или меню «Ещё», чтобы спросить гида о чём угодно.' } },
];
export const HINTS_KEY = 'vrussia_hints';
const defaultKV = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
export function seenHints(kv: KV | null = defaultKV()): Set<string> {
  try { const v = JSON.parse(kv?.getItem(HINTS_KEY) ?? '[]') as unknown; return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 40) : []); } catch { return new Set(); }
}
/** The first hint that applies and has not been shown yet; marks it shown. At most one is returned per call. */
export function takeHint(s: State, kv: KV | null = defaultKV()): Hint | null {
  const seen = seenHints(kv), h = HINTS.find(x => !seen.has(x.id) && x.when(s));
  if (!h) return null;
  seen.add(h.id); try { kv?.setItem(HINTS_KEY, JSON.stringify([...seen])); } catch { /* ignore */ }
  return h;
}

export interface Win { id: string; text: Text; first: boolean }
/** Which checklist steps are done now that were not done at the last look. `known` is updated; the first look only records what is already done. */
export function newWins(s: State, known: Set<string> | null): { wins: Win[]; known: Set<string> } {
  const done = new Set(buildReport(s).steps.filter(x => x.done).map(x => x.id));
  if (known === null) return { wins: [], known: done };
  const wins = [...done].filter(id => !known.has(id) && GOALS[id]).map((id, i) => ({ id, text: GOALS[id].label, first: known.size === 0 && i === 0 }));
  return { wins, known: done };
}
