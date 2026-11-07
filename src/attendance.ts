/* Attendance at the university. A student (flags.admitted) is expected in class on every weekday. Going to class (a lecture of a course, or the
   "go to class" scene) marks the day; a weekday with no mark is a truancy. Truancies are counted in a term of 120 days: 3 bring a warning from the
   dean, 6 a cut stipend, 9 a call to the dean's office with a fine on reputation, 12 the expulsion (the place, and with it the student status).
   Pure: the engine calls settleAttendance() as a day ends. Only types are imported, so there is no cycle with the engine. */
import type { State } from './engine';
import { lang } from './i18n';

export const TERM_DAYS = 120;
export const WARN_AT = 3, STIPEND_AT = 6, DEAN_AT = 9, EXPEL_AT = 12;

/** On the student roll: admitted and not expelled. */
export const onRoll = (s: State): boolean => !!s.flags.admitted && !s.flags.expelled;
/** Monday to Friday (JS getDay 1 to 5). */
export const schoolDay = (weekday: number): boolean => weekday >= 1 && weekday <= 5;
export const absences = (s: State): number => s.marks.absences ?? 0;
export const attendedToday = (s: State): boolean => s.marks.attended === s.day;
/** Marks today as attended. */
export function attend(s: State): void { s.marks.attended = s.day; }

/** The closing of a day (before the day counter turns): returns the lines to show. `weekday` is the JS weekday of the day that ends. */
export function settleAttendance(s: State, weekday: number): string[] {
  if (!onRoll(s)) return [];
  const ru = lang() === 'ru', out: string[] = [];
  if (s.day > 0 && s.day % TERM_DAYS === 0) s.marks.absences = 0;                    // a new term, a clean register
  if (!schoolDay(weekday) || attendedToday(s)) return out;
  const n = (s.marks.absences = absences(s) + 1);
  out.push(ru ? `Прогул: вас не было на занятиях. Пропусков в семестре: ${n}.` : `You skipped class today. Absences this term: ${n}.`);
  if (n === WARN_AT) { s.rep = Math.max(0, s.rep - 3); s.stress = Math.min(100, s.stress + 6); out.push(ru ? 'Староста сообщил в деканат. Первое предупреждение: репутация −3.' : 'The group leader told the dean\'s office. First warning: reputation −3.'); }
  else if (n === STIPEND_AT) { const cut = Math.round(s.allow * 0.3); s.allow -= cut; s.stress = Math.min(100, s.stress + 8); out.push(ru ? `Стипендию урезали из-за пропусков: −₽${cut} в неделю.` : `Your stipend is cut for the absences: −₽${cut} a week.`); }
  else if (n === DEAN_AT) { s.rep = Math.max(0, s.rep - 6); s.stress = Math.min(100, s.stress + 10); s.queue.push('uni_dean_call'); out.push(ru ? 'Вас вызывают к декану. Ещё три прогула — отчисление.' : 'You are called to the dean. Three more absences and you are expelled.'); }
  else if (n >= EXPEL_AT) {
    s.flags.admitted = false; s.flags.expelled = true; s.rep = Math.max(0, s.rep - 10); s.stress = Math.min(100, s.stress + 20); s.marks.absences = 0;
    out.push(ru ? 'Вас отчислили за систематические прогулы. Место в университете потеряно.' : 'You are expelled for repeated truancy. Your university place is gone.');
  }
  return out;
}
