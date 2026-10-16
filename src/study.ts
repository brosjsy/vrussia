/* Education and skills. Six skills (cooking, fitness, Russian, programming, charisma, music) from 0 to 100, grown by what the player does. Courses
   at a fictional university (programming, cybersecurity, design, and Russian from A1 to C1): enrol for a fee, attend lectures (each a part of the
   day), do homework at the desk at home (no time, once in each part of the day) and sit the exam, which is passed more surely with more skill. A
   passed course gives a certificate, raises the skill and the knowledge, and is shown on the profile. And a real mini-lesson: five Russian words a
   day, with the word spoken aloud where the browser can. Opt-in: the bots never study here, so the balance reports do not change. Pure. */
import { bump } from './events';
import type { State, Scenario } from './engine';
import { kitchenOf } from './cooking';

export type Skill = 'cooking' | 'fitness' | 'russian' | 'programming' | 'charisma' | 'music';
export const SKILLS: { id: Skill; name: string; ru: string; icon: string }[] = [
  { id: 'cooking', name: 'Cooking', ru: 'Кулинария', icon: '🍳' }, { id: 'fitness', name: 'Fitness', ru: 'Фитнес', icon: '💪' }, { id: 'russian', name: 'Russian', ru: 'Русский язык', icon: '🗣️' },
  { id: 'programming', name: 'Programming', ru: 'Программирование', icon: '💻' }, { id: 'charisma', name: 'Charisma', ru: 'Обаяние', icon: '😊' }, { id: 'music', name: 'Music', ru: 'Музыка', icon: '🎸' },
];
export interface Course { id: string; name: string; ru: string; skill: Skill; fee: number; lectures: number; homework: number; min: number; gain: number; level?: string }
/** The university's courses. `min` is the skill needed to enrol; `gain` what passing adds. Russian goes from A1 to C1 in four courses. */
export const COURSES: Course[] = [
  { id: 'ru-a1', name: 'Russian A1', ru: 'Русский A1', skill: 'russian', fee: 3000, lectures: 3, homework: 3, min: 0, gain: 15, level: 'A1' },
  { id: 'ru-a2', name: 'Russian A2', ru: 'Русский A2', skill: 'russian', fee: 4000, lectures: 4, homework: 4, min: 20, gain: 15, level: 'A2' },
  { id: 'ru-b1', name: 'Russian B1', ru: 'Русский B1', skill: 'russian', fee: 6000, lectures: 5, homework: 5, min: 40, gain: 15, level: 'B1' },
  { id: 'ru-c1', name: 'Russian C1', ru: 'Русский C1', skill: 'russian', fee: 9000, lectures: 6, homework: 6, min: 60, gain: 20, level: 'C1' },
  { id: 'prog', name: 'Programming basics', ru: 'Основы программирования', skill: 'programming', fee: 12000, lectures: 5, homework: 6, min: 0, gain: 25 },
  { id: 'cyber', name: 'Cybersecurity', ru: 'Кибербезопасность', skill: 'programming', fee: 18000, lectures: 6, homework: 6, min: 30, gain: 25 },
  { id: 'design', name: 'Graphic design', ru: 'Графический дизайн', skill: 'charisma', fee: 10000, lectures: 4, homework: 5, min: 0, gain: 10 },      // design has no skill of its own: a good eye counts as charisma
];
export const UNIVERSITY = 'Northern State University';           // fictional
export const UNIVERSITY_RU = 'Северный государственный университет';

export interface Enrolled { id: string; lectures: number; homework: number; lastHw: number }
export interface StudyBook { skills: Record<Skill, number>; course: Enrolled | null; certs: string[]; lesson?: { day: number; done: number[] } }
export interface Result { ok: boolean; msg: string }
type S = State & { study?: StudyBook };
const clamp = (v: number): number => Math.max(0, Math.min(100, Math.round(v)));
const slotNo = (s: State): number => s.day * 3 + s.slot;

export function studyOf(s: State): StudyBook {
  const x = s as S;
  if (!x.study || typeof x.study !== 'object' || typeof x.study.skills !== 'object') x.study = { skills: { cooking: 0, fitness: 0, russian: 0, programming: 0, charisma: 0, music: 0 }, course: null, certs: [] };
  for (const k of SKILLS) x.study.skills[k.id] = clamp(Number(x.study.skills[k.id]) || 0);
  return x.study;
}
/** A skill's level; cooking is kept by the kitchen (cooking.ts) and read from there. */
export const skillOf = (s: State, k: Skill): number => (k === 'cooking' ? kitchenOf(s).skill : studyOf(s).skills[k]);
export const raise = (s: State, k: Skill, by: number): void => { if (k === 'cooking') { const kk = kitchenOf(s); kk.skill = clamp(kk.skill + by); } else { const b = studyOf(s); b.skills[k] = clamp(b.skills[k] + by); } };
/** The Russian level the player has reached by certificate. */
export const russianLevel = (s: State): string => COURSES.filter(c => c.level && studyOf(s).certs.includes(c.id)).map(c => c.level as string).pop() ?? '—';

export function cannotEnrol(s: State, id: string): string | null {
  const c = COURSES.find(x => x.id === id); if (!c) return 'There is no such course.';
  const b = studyOf(s);
  if (b.certs.includes(id)) return 'You already passed this course.';
  if (b.course) return 'Finish your current course first.';
  if (skillOf(s, c.skill) < c.min) return `Needs ${SKILLS.find(k => k.id === c.skill)?.name ?? c.skill} skill ${c.min}.`;
  if (c.level && c.id !== 'ru-a1') { const prev = COURSES[COURSES.indexOf(c) - 1]; if (!b.certs.includes(prev.id)) return `Pass ${prev.name} first.`; }
  if (s.money < c.fee) return `The fee is ${c.fee} roubles.`;
  return null;
}
export function enrol(s: State, id: string): Result {
  const why = cannotEnrol(s, id); if (why) return { ok: false, msg: why };
  const c = COURSES.find(x => x.id === id) as Course; s.money -= c.fee; studyOf(s).course = { id, lectures: 0, homework: 0, lastHw: -1 };
  return { ok: true, msg: `Enrolled in ${c.name}: ${c.lectures} lectures and ${c.homework} pieces of homework, then the exam.` };
}
export const current = (s: State): Course | undefined => COURSES.find(c => c.id === studyOf(s).course?.id);
/** A lecture at the university, as a scenario of the engine (it takes a part of the day). */
export function lectureScenario(s: State, ru = false): Scenario | null {
  const c = current(s), e = studyOf(s).course; if (!c || !e || e.lectures >= c.lectures) return null;
  return { id: `lecture_${c.id}`, cat: 'study', title: `🎓 ${ru ? c.ru : c.name}`, text: ru ? `Лекция ${e.lectures + 1} из ${c.lectures} в университете.` : `Lecture ${e.lectures + 1} of ${c.lectures} at the university.`, dynamic: true,
    choices: [{ t: ru ? 'Слушать и записывать' : 'Listen and take notes', r: () => ({ msg: ru ? 'Полезная лекция.' : 'A useful lecture.', fx: { energy: -8, know: 1, run: st => { const ee = studyOf(st).course; if (ee) ee.lectures++; raise(st, c.skill, 2); bump(st, 'lecture'); } } }) }] };
}
/** Homework at the desk: no time, once in each part of the day. */
export function homework(s: State): Result {
  const c = current(s), e = studyOf(s).course; if (!c || !e) return { ok: false, msg: 'You are not on a course.' };
  if (e.homework >= c.homework) return { ok: false, msg: 'All the homework is done. Time for the exam.' };
  if (e.lastHw === slotNo(s)) return { ok: false, msg: 'Enough homework for now.' };
  if (s.energy < 10) return { ok: false, msg: 'Too tired to think.' };
  e.homework++; e.lastHw = slotNo(s); s.energy -= 5; raise(s, c.skill, 2);
  return { ok: true, msg: `Homework ${e.homework} of ${c.homework} done.` };
}
/** The chance to pass: half from being ready (all lectures and homework), the rest from the skill. */
export function passChance(s: State): number {
  const c = current(s), e = studyOf(s).course; if (!c || !e) return 0;
  const ready = (e.lectures / c.lectures + e.homework / c.homework) / 2;
  return Math.max(0.05, Math.min(0.97, 0.15 + ready * 0.5 + skillOf(s, c.skill) / 250));
}
export const examReady = (s: State): boolean => { const c = current(s), e = studyOf(s).course; return !!c && !!e && e.lectures >= c.lectures && e.homework >= c.homework; };
/** Sits the exam. `roll` is a number from 0 to 1 (the luck of the day). A pass gives the certificate; a fail keeps the course for another try. */
export function sitExam(s: State, roll: number): Result {
  const c = current(s); if (!c) return { ok: false, msg: 'You are not on a course.' };
  if (!examReady(s)) return { ok: false, msg: 'Attend every lecture and do all the homework first.' };
  const b = studyOf(s);
  if (roll < passChance(s)) { b.certs.push(c.id); b.course = null; raise(s, c.skill, c.gain); s.know = Math.min(100, s.know + 3); s.rep = Math.min(100, s.rep + 2); return { ok: true, msg: `Passed! Certificate: ${c.name}.` }; }
  const e = b.course as Enrolled; e.homework = Math.max(0, e.homework - 2);
  return { ok: false, msg: 'Failed this time. Do two more pieces of homework and try again.' };
}

/* ---------- five Russian words a day ---------- */
export const WORDS: [string, string][] = [
  ['привет', 'hello'], ['спасибо', 'thank you'], ['пожалуйста', 'please'], ['хлеб', 'bread'], ['вода', 'water'], ['метро', 'metro'], ['улица', 'street'], ['дом', 'house'],
  ['работа', 'work'], ['деньги', 'money'], ['друг', 'friend'], ['семья', 'family'], ['зима', 'winter'], ['снег', 'snow'], ['холодно', 'cold'], ['тепло', 'warm'],
  ['магазин', 'shop'], ['врач', 'doctor'], ['паспорт', 'passport'], ['билет', 'ticket'], ['поезд', 'train'], ['чай', 'tea'], ['суп', 'soup'], ['завтра', 'tomorrow'],
  ['сегодня', 'today'], ['вчера', 'yesterday'], ['утро', 'morning'], ['вечер', 'evening'], ['книга', 'book'], ['окно', 'window'], ['дверь', 'door'], ['ключ', 'key'],
  ['сосед', 'neighbour'], ['город', 'city'], ['река', 'river'], ['мост', 'bridge'], ['парк', 'park'], ['аптека', 'pharmacy'], ['банк', 'bank'], ['цена', 'price'],
  ['дорого', 'expensive'], ['дёшево', 'cheap'], ['налево', 'to the left'], ['направо', 'to the right'], ['прямо', 'straight on'], ['где', 'where'], ['сколько', 'how much'], ['помогите', 'help'],
];
const pickN = (seed: number, n: number, max: number): number[] => { const out: number[] = []; let v = (seed * 2654435761) >>> 0 || 1; while (out.length < n) { v = (Math.imul(v ^ (v >>> 15), 2246822519) + 0x9e3779b9) >>> 0; const k = v % max; if (!out.includes(k)) out.push(k); } return out; };
/** Today's five words: each with its translation and three wrong answers, the same all day. */
export function lessonOf(s: State): { ru: string; en: string; options: string[]; k: number }[] {
  return pickN(s.day + 7, 5, WORDS.length).map((k, i) => {
    const wrong = pickN(s.day * 31 + i + 3, 6, WORDS.length).filter(j => j !== k).slice(0, 3).map(j => WORDS[j][1]);
    const options = [...wrong]; options.splice((s.day + i) % 4, 0, WORDS[k][1]);
    return { ru: WORDS[k][0], en: WORDS[k][1], options, k };
  });
}
/** Answers a word of today's lesson. A right answer the first time raises Russian by one. */
export function answerWord(s: State, i: number, answer: string): Result {
  const l = lessonOf(s)[i]; if (!l) return { ok: false, msg: 'No such word.' };
  const b = studyOf(s); if (!b.lesson || b.lesson.day !== s.day) b.lesson = { day: s.day, done: [] };
  if (b.lesson.done.includes(i)) return { ok: false, msg: 'You have done this word today.' };
  if (answer !== l.en) return { ok: false, msg: `Not quite: «${l.ru}» means “${l.en}”.` };
  b.lesson.done.push(i); raise(s, 'russian', 1); s.know = Math.min(100, s.know + 0.2); bump(s, 'words');
  return { ok: true, msg: `Right: «${l.ru}» = ${l.en}.` };
}
export const lessonDone = (s: State): number => { const l = studyOf(s).lesson; return l && l.day === s.day ? l.done.length : 0; };
