/* The "Before Russia" screen: the steps of a foreigner's way to Russia as a timeline (each with its button, or why it waits), the date and the days
   left before classes begin, the visa form, the appointment calendar, the interview, the tickets and the migration card. The rules are in
   prearrival.ts. Shown in place of the game until the character has arrived; its words are kept here (English and Russian). */
import type { State } from './engine';
import * as G from './engine';
import * as P from './prearrival';
import type { Pre, Purpose, Form } from './prearrival';
import { COUNTRIES, REGIONS, flagOf, countryByCode } from './countries';
import { lang } from './i18n';

const W: Record<string, [string, string]> = {
  title: ['Before Russia', 'До России'], at: ['At home in', 'Дома:'], left: ['days until classes begin (1 September)', 'дн. до начала занятий (1 сентября)'], late: ['days late for classes', 'дн. опоздания к занятиям'], leftWork: ['days until you are expected in Russia (1 September)', 'дн. до приезда в Россию (1 сентября)'], lateWork: ['days after 1 September', 'дн. после 1 сентября'],
  spent: ['Spent on the way', 'Потрачено на дорогу'], track_study: ['Study visa', 'Учебная виза'], track_study_free: ['No visa needed (CIS)', 'Без визы (СНГ)'], track_migrant: ['Worker, no visa (patent in Russia)', 'Работа без визы (патент в России)'], track_eaeu: ['EAEU worker, no visa, no patent', 'Работник ЕАЭС: без визы и патента'],
  country: ['Your country', 'Ваша страна'], choose: ['Choose', 'Выбрать'], passport: ['Passport', 'Паспорт'], valid: ['valid for', 'действует ещё'], months: ['months', 'мес.'], need: ['needed', 'нужно'],
  renew: ['Renew (21 days)', 'Обновить (21 день)'], renewFast: ['Renew fast (7 days)', 'Срочно (7 дней)'], idOk: ['Your ID card is enough to enter (EAEU).', 'Для въезда достаточно ID-карты (ЕАЭС).'],
  invite: ['Invitation from the university', 'Приглашение от университета'], admission: ['Letter of admission', 'Письмо о зачислении'], ask: ['Ask the university', 'Запросить в университете'], expected: ['expected on', 'ожидается'],
  docs: ['Documents', 'Документы'], hiv: ['HIV certificate', 'Справка об ВИЧ'], insurance: ['Health insurance', 'Медстраховка'], photo: ['Photo 3.5 × 4.5', 'Фото 3,5 × 4,5'], get: ['Get', 'Получить'],
  form: ['Visa application form', 'Анкета на визу'], fill: ['Fill in', 'Заполнить'], again: ['Fill in again', 'Заполнить заново'], purpose: ['Purpose of the trip', 'Цель поездки'], entries: ['Entries', 'Въезды'], entry: ['Date of entry', 'Дата въезда'], host: ['Host organisation', 'Принимающая организация'], fullName: ['Full name as in the passport', 'Имя как в паспорте'], save: ['Save the form', 'Сохранить анкету'],
  'p.study': ['Study', 'Учёба'], 'p.work': ['Work', 'Работа'], 'p.tourism': ['Tourism', 'Туризм'], 'p.private': ['Private visit', 'Частный визит'], 'e.single': ['Single', 'Однократная'], 'e.double': ['Double', 'Двукратная'], 'e.multiple': ['Multiple', 'Многократная'],
  checkHint: ['Write it exactly as in your invitation.', 'Пишите точно как в приглашении.'],
  book: ['Appointment at the visa centre', 'Запись в визовый центр'], full: ['full', 'мест нет'], booked: ['Booked for', 'Запись на'], go: ['Go to the appointment', 'Идти на приём'], waitFor: ['Wait until that day', 'Ждать до этого дня'],
  interview: ['At the visa centre: the officer asks', 'В визовом центре: вопросы сотрудника'], urgent: ['Urgent processing (3 days, higher fee)', 'Срочное оформление (3 дня, дороже)'], hand: ['Hand in the documents', 'Сдать документы'],
  decision: ['Decision', 'Решение'], collect: ['Collect the passport', 'Забрать паспорт'], check: ['Check the visa at the counter', 'Проверить визу у окошка'], noCheck: ['Just take it', 'Просто забрать'],
  course: ['Pre-departure course (free, optional)', 'Курс перед отъездом (бесплатно, по желанию)'], take: ['Take it (3 days)', 'Пройти (3 дня)'],
  ticket: ['Ticket', 'Билет'], buy: ['Buy', 'Купить'], change: ['Change to this', 'Поменять на этот'], card: ['The migration card at the border: purpose of the visit', 'Миграционная карта на границе: цель визита'], arrive: ['Fly / ride and arrive', 'Лететь / ехать и прибыть'],
  wait1: ['Wait a day', 'Подождать день'], waitTo: ['Wait until', 'Ждать до'], diary: ['Diary', 'Дневник'], done: ['done', 'готово'], hours: ['h on the way', 'ч в пути'],
  why: ['Waiting for', 'Не хватает'],
};
const w = (k: string): string => W[k]?.[lang() === 'ru' ? 1 : 0] ?? k;
const ru = (): boolean => lang() === 'ru';
const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const date = (t: number): string => P.dateOf(t).toLocaleDateString(ru() ? 'ru-RU' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'long' });

let draft: Form | null = null;
let answers: number[] = [0, 0, 0].map(() => -1);
let urgent = false;
let card: Purpose | '' = '';

const step = (ok: boolean, title: string, body: string, active = !ok): string =>
  `<li class="prStep${ok ? ' ok' : ''}${active ? ' now' : ''}"><span class="prDot" aria-hidden="true">${ok ? '✓' : ''}</span><div><b>${esc(title)}</b>${body}</div></li>`;
const btn = (act: string, label: string, extra = '', cls = 'primary'): string => `<button type="button" class="${cls}" data-pr="${act}"${extra}>${esc(label)}</button>`;

function countryStep(s: State, p: Pre): string {
  if (p.country) { const c = countryByCode(p.country)!; return step(true, `${w('country')}: ${flagOf(c.code)} ${ru() ? c.ru : c.en}`, `<small>${esc(w('track_' + p.track))}</small>`); }
  const opts = REGIONS.map(r => `<optgroup label="${esc(ru() ? r.ru : r.en)}">${COUNTRIES.filter(c => c.region === r.id && c.code !== 'RU').map(c => `<option value="${c.code}"${s.home.includes(c.en) ? ' selected' : ''}>${flagOf(c.code)} ${esc(ru() ? c.ru : c.en)}</option>`).join('')}</optgroup>`).join('');
  return step(false, w('country'), `<div class="prRow"><select id="prCountry">${opts}</select>${btn('country', w('choose'))}</div>`);
}
function passportStep(p: Pre): string {
  if (p.track === 'eaeu' && P.ID_CARD_OK.includes(p.country)) return step(true, w('passport'), `<small>${esc(w('idOk'))}</small>`);
  const ok = P.passportOk(p);
  const body = `<small>${esc(w('valid'))} ${p.passportUntil} ${esc(w('months'))} · ${esc(w('need'))} ${P.passportNeed(p)}</small>` +
    (ok ? '' : p.renewReady !== null ? `<small>${esc(w('expected'))} ${esc(date(p.renewReady))}</small>${btn('wait:' + p.renewReady, `${w('waitTo')} ${date(p.renewReady)}`, '', 'ghost')}` : `<div class="prRow">${btn('renew', `${w('renew')} · ${G.money(P.PRICES.renew)}`)}${btn('renewFast', `${w('renewFast')} · ${G.money(P.PRICES.renewFast)}`, '', 'ghost')}</div>`);
  return step(ok, w('passport'), body);
}
function inviteStep(p: Pre): string {
  const name = p.track === 'study' ? w('invite') : w('admission');
  if (p.invite) return step(true, name, `<small>${esc(P.UNI)}</small>`);
  return step(false, name, p.inviteReady === null ? btn('invite', w('ask')) : `<small>${esc(w('expected'))} ${esc(date(p.inviteReady))}</small>${btn('wait:' + p.inviteReady, `${w('waitTo')} ${date(p.inviteReady)}`, '', 'ghost')}`);
}
function docsStep(p: Pre): string {
  const row = (k: 'hiv' | 'insurance' | 'photo', price: number): string => `<li>${p[k] ? '✓' : '○'} ${esc(w(k))}${p[k] ? '' : ` ${btn(k, `${w('get')} · ${G.money(price)}`, '', 'ghost small')}`}</li>`;
  return step(p.hiv && p.insurance && p.photo, w('docs'), `<ul class="prDocs">${row('hiv', P.PRICES.hiv)}${row('insurance', P.PRICES.insurance)}${row('photo', P.PRICES.photo)}</ul>`);
}
function formStep(s: State, p: Pre): string {
  if (p.t < p.refusedUntil) return step(false, w('form'), `<small class="why">${esc(p.log[0] ?? '')}</small>${btn('wait:' + p.refusedUntil, `${w('waitTo')} ${date(p.refusedUntil)}`, '', 'ghost')}`);
  if (p.form && !draft) return step(true, w('form'), `<small>${esc(w('p.' + p.form.purpose))} · ${esc(w('e.' + p.form.entries))} · ${esc(date(p.form.entry))} · ${esc(p.form.uni)}</small>${p.decision === null ? btn('editForm', w('again'), '', 'ghost small') : ''}`);
  if (!draft) return step(false, w('form'), btn('editForm', w('fill')));
  const d = draft, sel = (id: string, vals: string[], cur: string, pre: string): string => `<select id="${id}">${vals.map(v => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(w(pre + v))}</option>`).join('')}</select>`;
  const days = Array.from({ length: 40 }, (_, i) => p.t + 8 + i).filter(x => x <= P.LEAD + 30);
  return step(false, w('form'), `<div class="prForm"><p class="sub">${esc(w('checkHint'))}</p>
    <label>${esc(w('fullName'))}<input id="prName" value="${esc(d.name)}"></label>
    <label>${esc(w('purpose'))}${sel('prPurpose', ['tourism', 'private', 'study', 'work'], d.purpose, 'p.')}</label>
    <label>${esc(w('entries'))}${sel('prEntries', ['multiple', 'double', 'single'], d.entries, 'e.')}</label>
    <label>${esc(w('host'))}<input id="prUni" value="${esc(d.uni)}" placeholder="${esc(P.UNI)}"></label>
    <label>${esc(w('entry'))}<select id="prEntry">${days.map(x => `<option value="${x}"${x === d.entry ? ' selected' : ''}>${esc(date(x))}</option>`).join('')}</select></label>
    ${btn('saveForm', w('save'))}</div>`);
}
function bookStep(s: State, p: Pre): string {
  if (p.decision !== null) return step(true, w('book'), `<small>${esc(w('done'))}</small>`);
  if (p.appt !== null) {
    const today = p.t === p.appt;
    return step(false, w('book'), `<small>${esc(w('booked'))} ${esc(date(p.appt))}</small>` + (today ? interviewHtml(s, p) : btn('wait:' + p.appt, `${w('waitFor')}`, '', 'ghost')));
  }
  if (!p.form) return step(false, w('book'), `<small class="why">${esc(w('why'))}: ${esc(w('form'))}</small>`, false);
  return step(false, w('book'), `<div class="prSlots">${P.slotsFor(p).map(x => `<button type="button" class="prSlot" data-pr="book:${x.day}"${x.free ? '' : ' disabled'}>${esc(date(x.day))}${x.free ? '' : `<small>${esc(w('full'))}</small>`}</button>`).join('')}</div>`);
}
function interviewHtml(s: State, p: Pre): string {
  const qs = P.questionsFor(p);
  return `<div class="prInterview"><p><b>${esc(w('interview'))}</b></p>${qs.map((q, i) => { const Q = P.QUESTIONS[q];
    const order = [0, 1, 2].sort((x, y) => (x * 7 + q * 3 + p.tries) % 3 - (y * 7 + q * 3 + p.tries) % 3);      // the right answer is not always first
    return `<fieldset><legend>${esc(ru() ? Q.ru : Q.q)}</legend>${order.map(j => Q.a[j]).map((a, k) => { const j = order[k]; return `<label><input type="radio" name="prQ${i}" value="${j}"${answers[i] === j ? ' checked' : ''}> ${esc(ru() ? a.ru : a.t)}</label>`; }).join('')}</fieldset>`; }).join('')}
    <label class="prCheck"><input type="checkbox" id="prUrgent"${urgent ? ' checked' : ''}> ${esc(w('urgent'))}</label>
    ${btn('attend', w('hand'), answers.some(a => a < 0) ? ' disabled' : '')}</div>`;
}
function decisionStep(p: Pre): string {
  if (p.collected) return step(true, w('decision'), `<small>${esc(p.checked ? w('done') : '')}</small>`);
  if (p.decision === null) return step(false, w('decision'), '', false);
  if (!P.decided(p)) return step(false, w('decision'), `<small>${esc(w('expected'))} ${esc(date(p.decision))}</small>${btn('wait:' + p.decision, `${w('waitTo')} ${date(p.decision)}`, '', 'ghost')}`);
  return step(false, w('collect'), `<div class="prRow">${btn('collect:1', w('check'))}${btn('collect:0', w('noCheck'), '', 'ghost')}</div>`);
}
function courseStep(p: Pre): string { return step(p.course, w('course'), p.course ? '' : btn('course', w('take'), '', 'ghost'), false); }
function ticketStep(s: State, p: Pre): string {
  const why = P.readyToGo(s, p);
  if (why.length) return step(false, w('ticket'), `<small class="why">${esc(w('why'))}: ${esc(why.join(', '))}</small>`, false);
  const list = P.ticketsFor(s, p).map(t => `<li class="prTicket${p.ticket?.id === t.id ? ' on' : ''}"><span>${t.mode === 'train' ? '🚆' : '✈️'}</span><div><b>${esc(t.label)}</b><small>${esc(date(t.day))} · ${t.hours} ${esc(w('hours'))}</small></div><b>${G.money(t.price)}</b>${p.ticket?.id === t.id ? `<i>✓</i>` : btn('ticket:' + t.id, p.ticket ? w('change') : w('buy'), '', 'ghost small')}</li>`).join('');
  return step(!!p.ticket, w('ticket'), `<ul class="prTickets">${list}</ul>`, !p.ticket);
}
function arriveStep(p: Pre): string {
  if (!p.ticket) return step(false, w('arrive'), '', false);
  return step(false, w('arrive'), `<fieldset class="prCard"><legend>${esc(w('card'))}</legend>${(['tourism', 'private', 'work', 'study'] as Purpose[]).map(v => `<label><input type="radio" name="prCard" value="${v}"${card === v ? ' checked' : ''}> ${esc(w('p.' + v))}</label>`).join('')}</fieldset>${btn('arrive', `${w('arrive')} · ${date(p.ticket.day)}`, card ? '' : ' disabled')}`);
}

/** The whole screen. */
export function preHtml(s: State): string {
  const p = P.preOf(s)!; const left = P.LEAD - p.t;
  const c = countryByCode(p.country);
  const steps = [countryStep(s, p), passportStep(p)];
  if (p.track === 'study') steps.push(inviteStep(p), docsStep(p), formStep(s, p), bookStep(s, p), decisionStep(p));
  if (p.track === 'study_free') steps.push(inviteStep(p));
  if (p.track === 'migrant' || p.track === 'eaeu') steps.push(courseStep(p));
  steps.push(ticketStep(s, p), arriveStep(p));
  return `<div class="pre"><header class="prHead"><h2>🧳 ${esc(w('title'))}</h2>
      <p><b>${esc(date(p.t))}</b> · ${esc(w('at'))} ${c ? `${flagOf(c.code)} ${esc(ru() ? c.ru : c.en)}` : esc(s.home)}</p>
      <div class="prMeta"><span class="prLeft${left < 0 ? ' late' : left < 14 ? ' soon' : ''}"><b>${Math.abs(left)}</b> ${esc(p.track === 'migrant' || p.track === 'eaeu' ? (left >= 0 ? w('leftWork') : w('lateWork')) : left >= 0 ? w('left') : w('late'))}</span><span>${esc(w('spent'))}: <b>${G.money(p.spent)}</b></span><span>${p.country ? esc(w('track_' + p.track)) : ''}</span></div>
      <div class="prRow">${btn('wait:' + (p.t + 1), w('wait1'), '', 'ghost small')}</div></header>
    <ol class="prSteps">${steps.join('')}</ol>
    <details class="prDiary"><summary>${esc(w('diary'))} (${p.log.length})</summary><ul>${p.log.map(l => `<li>${esc(l)}</li>`).join('')}</ul></details></div>`;
}

/** Connects the screen; `done` is called once the character has arrived (the first day in Russia begins). */
export function wirePre(host: HTMLElement, s: State, d: { notify: (m: string) => void; again: () => void; done: (msg: string) => void }): void {
  const p = P.preOf(s)!;
  const run = (r: { ok: boolean; msg: string }): void => { d.notify(r.msg); d.again(); };
  host.querySelectorAll<HTMLInputElement>('input[name^="prQ"]').forEach(r => { r.onchange = () => { answers[Number(r.name.slice(3))] = Number(r.value); d.again(); }; });
  host.querySelectorAll<HTMLInputElement>('input[name="prCard"]').forEach(r => { r.onchange = () => { card = r.value as Purpose; d.again(); }; });
  const u = host.querySelector<HTMLInputElement>('#prUrgent'); if (u) u.onchange = () => { urgent = u.checked; };
  const keep = (): void => { if (!draft) return; const v = (id: string): string => host.querySelector<HTMLInputElement | HTMLSelectElement>(id)?.value ?? '';
    draft = { name: v('#prName'), purpose: v('#prPurpose') as Purpose, entries: v('#prEntries') as Form['entries'], uni: v('#prUni'), entry: Number(v('#prEntry')) }; };
  host.querySelectorAll<HTMLButtonElement>('[data-pr]').forEach(b => { b.onclick = () => {
    const [act, arg] = (b.dataset.pr as string).split(':');
    if (act === 'country') return run(P.chooseCountry(s, host.querySelector<HTMLSelectElement>('#prCountry')?.value ?? ''));
    if (act === 'renew' || act === 'renewFast') return run(P.renewPassport(p, act === 'renewFast'));
    if (act === 'invite') return run(P.requestInvite(p));
    if (act === 'hiv') return run(P.getHiv(p)); if (act === 'insurance') return run(P.buyInsurance(p)); if (act === 'photo') return run(P.takePhoto(p));
    if (act === 'course') return run(P.takeCourse(s, p));
    if (act === 'editForm') { draft = p.form ? { ...p.form } : { name: '', purpose: 'tourism', entries: 'multiple', uni: '', entry: p.t + 14 }; d.again(); return; }
    if (act === 'saveForm') { keep(); const r = P.fillForm(p, draft!); if (r.ok) draft = null; return run(r); }
    if (act === 'book') return run(P.book(p, Number(arg)));
    if (act === 'wait') { keep(); return run(P.waitUntil(p, Number(arg))); }
    if (act === 'attend') { const r = P.attend(s, p, answers, urgent); answers = [-1, -1, -1]; return run(r); }
    if (act === 'collect') return run(P.collect(p, arg === '1'));
    if (act === 'ticket') return run(P.buyTicket(s, p, arg));
    if (act === 'arrive' && card) { const r = P.arrive(s, card); if (r.ok) { draft = null; card = ''; d.done(r.msg); } else run(r); }
  }; });
}
/** Opens the screen in the game's modal and keeps it until the character arrives. */
export function openPre(s: State, d: { notify: (m: string) => void; save: () => void; arrived: () => void }): void {
  if (!P.preOf(s)) P.startAtHome(s);
  d.save();                                                   // a reload keeps the preparation
  const modal = document.getElementById('modal')!, body = document.getElementById('modalBody')!;
  const draw = (): void => { body.innerHTML = preHtml(s); wirePre(body, s, { notify: d.notify, again: () => { d.save(); draw(); }, done: msg => { d.save(); modal.hidden = true; modal.classList.remove('preMode'); d.notify(msg); d.arrived(); } }); };
  modal.classList.remove('phoneMode'); modal.classList.add('preMode'); modal.hidden = false; draw();
  // the preparation stays on screen until the arrival: closing the window or opening another screen brings it back
  const watch = new MutationObserver(() => { if (!P.preparing(s)) { watch.disconnect(); return; } if (modal.hidden) { modal.hidden = false; draw(); } else if (!body.querySelector('.pre, .help')) draw(); });
  watch.observe(modal, { attributes: true, attributeFilter: ['hidden'] }); watch.observe(body, { childList: true });
}
/** For the tests. */
export function resetPreView(): void { draft = null; answers = [-1, -1, -1]; urgent = false; card = ''; }
