/* The phone's Driving exam app (the traffic police portal): the four steps to a licence, and the written theory exam itself, one question at a time,
   with the result and the explanations at the end. The rules are in drivingexam.ts; this file only draws them. */
import type { State } from './engine';
import * as G from './engine';
import { lang } from './i18n';
import { playOk } from './sound';
import { paper, grade, cannotSit, enrolSchool, practiceIn, cannotPractise, practicePaper, gradePractice, EXAM_LEN, MAX_WRONG, RETAKE_DAYS, RETAKE_FEE, SCHOOL_FEE, PRACTICE_LEN, PRACTICE_MAX_WRONG, PRACTICE_RETRY_DAYS, PRACTICE_FEE } from './drivingexam';
import type { Item, Graded } from './drivingexam';
import type { AppDeps } from './study-ui';

const esc = (x: string): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function openDriving(host: HTMLElement, s: State, d: AppDeps): void {
  const ru = lang() === 'ru', tx = (en: string, r: string): string => (ru ? r : en), pick = (b: [string, string]): string => (ru ? b[1] : b[0]);
  let items: Item[] = [], answers: number[] = [], at = 0, result: Graded | null = null, flash = '', mode: 'theory' | 'practice' = 'theory';
  const head = (): string => `<div class="phHead"><button class="ghost" data-dr="back" aria-label="${tx('Back', 'Назад')}">‹ ${tx('Back', 'Назад')}</button><b>🚘 ${tx('Driving exam', 'Экзамен на права')}</b></div>`;

  const steps = (): string => {
    const have = !!s.flags.license, theory = !!s.flags.theory || have, school = !!s.flags.enrolled || have || G.isForeigner(s);
    const row = (done: boolean, now: boolean, text: string): string => `<li class="jobCard"><span class="msgIcon">${done ? '✅' : now ? '👉' : '🔒'}</span><div><b>${esc(text)}</b></div></li>`;
    return `<ul class="msgs">${row(school, !school, tx('1. Driving school (or a foreign licence to exchange)', '1. Автошкола (или иностранные права для обмена)'))}
      ${row(theory, school && !theory, tx(`2. Theory exam on this portal: ${EXAM_LEN} questions, ${MAX_WRONG} mistakes at most`, `2. Теоретический экзамен на портале: ${EXAM_LEN} вопросов, не более ${MAX_WRONG} ошибок`))}
      ${row(have, theory && !have, tx(`3. Practical exam: ${PRACTICE_LEN} road situations, ${PRACTICE_MAX_WRONG} mistake at most (or exchange of the foreign licence)`, `3. Практический экзамен: ${PRACTICE_LEN} дорожных ситуаций, не более ${PRACTICE_MAX_WRONG} ошибки (или обмен иностранных прав)`))}
      ${row(have, false, tx('4. Licence: now you may buy a car and drive', '4. Права на руках: можно покупать машину и ездить'))}</ul>`;
  };
  /** The next real step as buttons: enrol in the school, the practical exam, the exchange of a foreign licence. */
  const next = (): string => {
    if (s.flags.license) return `<p class="phNote">🎉 ${tx('You have your licence. The car dealership is open.', 'Права у вас. Автосалон открыт.')}</p>`;
    const out: string[] = [];
    if (!s.flags.enrolled) out.push(`<button type="button" class="secondary" data-dr="school">🏫 ${tx(`Enrol in a driving school (₽${SCHOOL_FEE})`, `Записаться в автошколу (₽${SCHOOL_FEE})`)}</button>`);
    if (s.flags.theory) {
      if (s.flags.enrolled) {
        const wait = Math.max(practiceIn(s), s.marks.practicalFail !== undefined ? s.marks.practicalFail + PRACTICE_RETRY_DAYS - s.day : 0);
        out.push(wait > 0 ? `<p class="phNote">${tx(`Practical exam: opens in ${wait} day(s).`, `Практический экзамен: откроется через ${wait} дн.`)}</p>` : `<button type="button" class="primary" data-dr="practical">🚦 ${tx('Take the practical exam', 'Сдавать практический экзамен')}${(s.marks.practicalTries ?? 0) > 0 ? ` (₽${PRACTICE_FEE})` : ''}</button>`);
      }
      if (G.isForeigner(s)) out.push(`<button type="button" class="secondary" data-dr="exchange">📄 ${tx('Exchange my foreign licence (₽5,500)', 'Обменять иностранные права (₽5 500)')}</button>`);
    }
    return out.join('');
  };
  const home = (): void => {
    const why = cannotSit(s), f = flash; flash = '';
    host.innerHTML = `<div class="phone sub driving">${head()}${f ? `<p class="phNote" role="status">${esc(f)}</p>` : ''}
      <p class="sub">${tx('Without a licence you cannot buy a car or drive one. Pass the written exam here first.', 'Без прав нельзя ни купить машину, ни ездить. Сначала сдайте письменный экзамен здесь.')}</p>
      ${steps()}
      ${next()}
      ${why && !s.flags.theory && !s.flags.license && !(!s.flags.enrolled && !G.isForeigner(s)) ? `<p class="phNote">${esc(ru ? ruWhy(why) : why)}</p>` : ''}
      ${!why ? `<button type="button" class="primary" data-dr="start">${tx('Start the exam', 'Начать экзамен')}${(s.marks.theoryTries ?? 0) > 0 ? ` (₽${RETAKE_FEE})` : ''}</button>` : ''}
      <p class="sub">${tx(`If you fail, you can retry after ${RETAKE_DAYS} days.`, `Если не сдали — пересдача через ${RETAKE_DAYS} дней.`)}</p></div>`;
    wire();
  };
  const ruWhy = (w: string): string => (w.startsWith('You already') ? 'У вас уже есть права.' : w.startsWith('You have passed') ? 'Теория сдана. Дальше — практический экзамен или обмен иностранных прав.' : w.startsWith('Enrol') ? 'Сначала запишитесь в автошколу.' : w.startsWith('The traffic') ? 'Для заявления нужна действующая регистрация.' : w.startsWith('You failed') ? `Теория не сдана. ${w.replace(/\D+/g, ' ').trim()} дн. до пересдачи.` : `Пересдача стоит ₽${RETAKE_FEE}.`);
  const ask = (): void => {
    const it = items[at];
    host.innerHTML = `<div class="phone sub driving">${head()}<p class="sub">${tx('Question', 'Вопрос')} ${at + 1} / ${items.length}</p>
      <h3 role="heading">${esc(pick(it.q))}</h3>
      <div class="col">${it.options.map((o, i) => `<button type="button" class="secondary" data-dr="ans" data-i="${i}">${esc(pick(o))}</button>`).join('')}</div></div>`;
    wire();
  };
  const finish = (): void => {
    result = mode === 'practice' ? gradePractice(s, items, answers) : grade(s, items, answers); playOk(result.passed); G.save(s); d.refresh();
    const r = result;
    const wrongList = r.mistakes.map(i => `<li><b>${esc(pick(items[i].q))}</b><br><small>${tx('Right answer', 'Верный ответ')}: ${esc(pick(items[i].options[items[i].ok]))}. ${esc(pick(items[i].why))}</small></li>`).join('');
    host.innerHTML = `<div class="phone sub driving">${head()}<h3>${r.passed ? '✅' : '❌'} ${r.passed ? tx('Passed', 'Сдано') : tx('Failed', 'Не сдано')}: ${r.right} / ${items.length}</h3>
      <p class="phNote" role="status">${mode === 'practice' ? esc(r.passed ? tx('You passed the practical exam. The licence is yours: the car dealership is open.', 'Практический экзамен сдан. Права у вас: автосалон открыт.') : tx(`Too many mistakes (${r.wrong}; ${PRACTICE_MAX_WRONG} allowed). Retry in ${PRACTICE_RETRY_DAYS} days.`, `Слишком много ошибок (${r.wrong}; допускается ${PRACTICE_MAX_WRONG}). Пересдача через ${PRACTICE_RETRY_DAYS} дня.`)) : r.passed ? esc(tx('Theory passed. Next: the practical exam at the traffic police (open on the Driving exam screen after two weeks of lessons), or the exchange of a foreign licence.', 'Теория сдана. Дальше — практический экзамен в ГИБДД (откроется на этом экране после двух недель занятий) или обмен иностранных прав.')) : esc(tx(`Too many mistakes (${r.wrong}; ${MAX_WRONG} allowed). Retry in ${RETAKE_DAYS} days.`, `Слишком много ошибок (${r.wrong}; допускается ${MAX_WRONG}). Пересдача через ${RETAKE_DAYS} дней.`))}</p>
      ${wrongList ? `<h4>${tx('Your mistakes', 'Ваши ошибки')}</h4><ul class="msgs">${wrongList}</ul>` : ''}
      <button type="button" class="primary" data-dr="done">${tx('Done', 'Готово')}</button></div>`;
    wire();
  };
  const wire = (): void => {
    host.querySelectorAll<HTMLButtonElement>('[data-dr]').forEach(b => { b.onclick = () => {
      const a = b.dataset.dr;
      if (a === 'back' || a === 'done') return d.back();
      if (a === 'school') { const r = enrolSchool(s); flash = ru ? (r.ok ? 'Договор подписан. Выучите правила и сдайте теорию здесь.' : 'Не получилось: не хватает денег или нужна регистрация.') : r.msg; playOk(r.ok); if (r.ok) { G.save(s); d.refresh(); } return home(); }
      if (a === 'practical') { if (cannotPractise(s)) return home(); mode = 'practice'; items = practicePaper(d.random); answers = []; at = 0; result = null; return ask(); }
      if (a === 'exchange') { const sc = G.get('driving_exchange', s); if (sc) d.scenario(sc as G.Scenario); else { flash = tx('Not available now.', 'Сейчас недоступно.'); home(); } return; }
      if (a === 'start') { if (cannotSit(s)) return home(); mode = 'theory'; items = paper(d.random); answers = []; at = 0; result = null; return ask(); }
      if (a === 'ans') { answers[at] = Number(b.dataset.i); at += 1; return at >= items.length ? finish() : ask(); }
    }; });
  };
  home();
}
