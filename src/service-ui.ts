/* The phone's Service app: the vacancy board (state jobs, like the job sites and the state's job portal), the application with its interview and
   checks, the working day (leaving home, the way, the car park, the checkpoint, the cases, lunch, leaving), and the service profile (the badge, the
   rank, the file). The rules are in service.ts; its words are kept here (English and Russian; the cases themselves are in English). */
import type { State } from './engine';
import * as G from './engine';
import * as V from './service';
import type { RoleId, Mode, Park, Leave } from './service';
import { lang } from './i18n';

const W: Record<string, [string, string]> = {
  title: ['State service', 'Госслужба'], vac: ['Vacancies', 'Вакансии'], day: ['Workday', 'Рабочий день'], prof: ['Profile', 'Профиль'],
  boardHint: ['Jobs in the state services and state companies, as on the job sites and the state portal of vacancies.', 'Вакансии госслужб и госкомпаний — как на сайтах вакансий и на портале «Работа России».'],
  all: ['All', 'Все'], service: ['Services with ranks', 'Службы со званиями'], state: ['State institutions and companies', 'Госучреждения и госкомпании'],
  month: ['a month', 'в месяц'], cit: ['Russian citizens only', 'Только граждане РФ'], citNo: ['Open to legal residents', 'Для легально проживающих'], know: ['knowledge', 'знания'], fit: ['medical and fitness test', 'медкомиссия и физподготовка'], hours: ['hours', 'часы'],
  applyBtn: ['Apply', 'Откликнуться'], yours: ['your job', 'ваша работа'], status: ['Your application', 'Ваш отклик'],
  sent: ['Sent. The personnel department will call on', 'Отправлен. Отдел кадров позвонит'], interview: ['Interview', 'Собеседование'], go: ['Answer and finish the interview', 'Ответить и завершить собеседование'],
  checks: ['Checks in progress; results on', 'Идут проверки; результат'], offer: ['Offer', 'Предложение'], accept: ['Accept the offer', 'Принять предложение'], refused: ['Not hired', 'Отказ'], tryAgain: ['Apply somewhere else', 'Откликнуться ещё'],
  none: ['You do not work for the state yet. Find a vacancy.', 'Вы пока не на госслужбе. Найдите вакансию.'],
  leave: ['When do you leave home?', 'Когда выходите из дома?'], how: ['How do you go?', 'Как добираетесь?'], park: ['Parking', 'Парковка'], goBtn: ['Go to work', 'Идти на работу'],
  'm.metro': ['Metro', 'Метро'], 'm.bus': ['Bus', 'Автобус'], 'm.walk': ['On foot', 'Пешком'], 'm.car': ['My car', 'Своя машина'], 'm.taxi': ['Taxi', 'Такси'],
  'p.lot': ['Staff car park (free with the pass; full after 08:15)', 'Служебная парковка (бесплатно по пропуску; мест нет после 08:15)'], 'p.street': ['Paid street parking (150 ₽ an hour)', 'Платная парковка на улице (150 ₽/час)'], 'p.pavement': ['On the pavement (free… or a 3,000 ₽ fine)', 'На тротуаре (бесплатно… или штраф 3 000 ₽)'],
  starts: ['The day starts at', 'Начало в'], cases: ['On your desk today', 'Сегодня на столе'], lunch: ['Lunch with', 'Обед с'], out: ['Leave work', 'Уйти с работы'],
  'l.ontime': ['On time', 'Вовремя'], 'l.overtime': ['Stay two hours more (+25%)', 'Задержаться на два часа (+25%)'], 'l.early': ['Slip away early', 'Уйти пораньше'],
  doneToday: ['Your day is over. Come back tomorrow.', 'Рабочий день окончен. До завтра.'], arrived: ['At work since', 'На работе с'],
  badge: ['Badge', 'Номер удостоверения'], rank: ['Rank', 'Звание / должность'], since: ['In service since day', 'На службе с дня'], shifts: ['working days', 'рабочих дней'], shift1: ['working day', 'рабочий день'], merit: ['merit', 'заслуги'], next: ['next at', 'следующее при'],
  reprimands: ['reprimands', 'выговоров'], commend: ['letters of thanks', 'благодарностей'], earned: ['earned', 'заработано'], colleagues: ['Colleagues', 'Коллеги'], file: ['Personal file', 'Личное дело'], resign: ['Resign', 'Уволиться'], pay: ['pay a day', 'в день'],
};
const w = (k: string): string => W[k]?.[lang() === 'ru' ? 1 : 0] ?? k;
const ru = (): boolean => lang() === 'ru';
const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

type Tab = 'vac' | 'day' | 'prof';
const view: { tab: Tab; filter: 'all' | 'service' | 'state'; depart: number; mode: Mode | null; park: Park; iv: number[] } = { tab: 'vac', filter: 'all', depart: 7 * 60 + 30, mode: null, park: 'lot', iv: [-1, -1, -1] };
const b = (act: string, label: string, cls = 'primary', extra = ''): string => `<button type="button" class="${cls}" data-sv="${act}"${extra}>${esc(label)}</button>`;

function vacancies(s: State): string {
  const sv = V.serviceOf(s), a = sv.app;
  const status = a ? (() => { const r = V.roleOf(a.role)!;
    const body = a.stage === 'sent' ? `<p>${esc(w('sent'))} ${esc(`day ${a.due + 1}`)}</p>`
      : a.stage === 'interview' ? `<div class="svIv">${V.interviewFor(s).map((q, i) => `<fieldset><legend>${esc(V.INTERVIEW[q].q)}</legend>${V.INTERVIEW[q].a.map((x, j) => ({ x, j })).sort((m, n) => (m.j * 5 + q + s.day) % 3 - (n.j * 5 + q + s.day) % 3).map(({ x, j }) => `<label><input type="radio" name="svIv${i}" value="${j}"${view.iv[i] === j ? ' checked' : ''}> ${esc(x.t)}</label>`).join('')}</fieldset>`).join('')}${b('interview', w('go'), 'primary', view.iv.some(x => x < 0) ? ' disabled' : '')}</div>`
      : a.stage === 'checks' ? `<p>${esc(w('checks'))} ${esc(`day ${a.due + 1}`)}</p>`
      : a.stage === 'offer' ? `<p>${esc(r.org)}: ${G.money(V.monthly(r))} ${esc(w('month'))}</p>${b('accept', w('accept'))}`
      : `<p class="why">${esc(w('refused'))}: ${esc(a.why ?? '')}</p>${b('clearApp', w('tryAgain'), 'ghost')}`;
    return `<section class="svCard svStatus"><h3>${esc(w('status'))}: ${r.icon} ${esc(ru() ? r.ru : r.name)}</h3>${body}</section>`; })() : '';
  const list = V.ROLES.filter(r => view.filter === 'all' || r.kind === view.filter).map(r => { const why = V.cannotApply(s, r.id), mine = sv.role === r.id;
    return `<li class="svVac${mine ? ' mine' : ''}"><span class="svIc">${r.icon}</span><div><b>${esc(ru() ? r.ru : r.name)}</b><small>${esc(ru() ? r.orgRu : r.org)}</small>
      <div class="svTags"><span class="svPay">${G.money(V.monthly(r))} ${esc(w('month'))}</span><span>${esc(r.cit ? w('cit') : w('citNo'))}</span><span>${esc(w('know'))} ${r.know}+</span>${r.fit ? `<span>${esc(w('fit'))}</span>` : ''}<span>${esc(w('hours'))} ${V.clock(r.start)}–${V.clock(r.end)}</span></div>
      ${mine ? `<i class="sub">${esc(w('yours'))}</i>` : why ? `<small class="why">${esc(why)}</small>` : b('apply:' + r.id, w('applyBtn'), 'ghost small')}</div></li>`; }).join('');
  const f = (['all', 'service', 'state'] as const).map(x => `<button type="button" class="svChip${view.filter === x ? ' on' : ''}" data-sv="filter:${x}" aria-pressed="${view.filter === x}">${esc(w(x))}</button>`).join('');
  return `${status}<p class="sub">${esc(w('boardHint'))}</p><div class="svChips">${f}</div><ul class="svVacs">${list}</ul>`;
}

function workday(s: State): string {
  const sv = V.serviceOf(s), r = sv.role ? V.roleOf(sv.role) : null; if (!r) return `<p class="hint">${esc(w('none'))}</p>`;
  const d = sv.today?.day === s.day ? sv.today : null;
  if (!d) {
    const modes = V.modesFor(s); if (!view.mode || !modes.includes(view.mode)) view.mode = modes[0];
    return `<section class="svCard"><h3>${r.icon} ${esc(ru() ? r.ru : r.name)}</h3><p class="sub">${esc(w('starts'))} <b>${V.clock(r.start)}</b> · ${esc(r.office)} · ${G.money(V.payOf(s, r))} ${esc(w('pay'))}</p>
      <p class="svLabel">${esc(w('leave'))}</p><div class="svChips">${V.DEPART.map(t => `<button type="button" class="svChip${t === view.depart ? ' on' : ''}" data-sv="depart:${t}">${V.clock(t)}</button>`).join('')}</div>
      <p class="svLabel">${esc(w('how'))}</p><div class="svChips">${modes.map(m => `<button type="button" class="svChip${m === view.mode ? ' on' : ''}" data-sv="mode:${m}">${esc(w('m.' + m))}${V.fareOf(m) ? ` · ${G.money(V.fareOf(m))}` : ''}</button>`).join('')}</div>
      ${view.mode === 'car' ? `<p class="svLabel">${esc(w('park'))}</p><div class="svPark">${(['lot', 'street', 'pavement'] as Park[]).map(p => `<label><input type="radio" name="svPark" value="${p}"${p === view.park ? ' checked' : ''}> ${esc(w('p.' + p))}</label>`).join('')}</div>` : ''}
      ${b('go', w('goBtn'))}</section>`;
  }
  if (d.out) return `<p class="hint">${esc(w('doneToday'))}</p>`;
  const cases = V.casesToday(s).map(c => { const chosen = d.cases[c.id];
    return `<li class="svCase${chosen !== undefined ? ' done' : ''}"><b>${esc(c.title)}</b><p>${esc(c.text)}</p>${chosen !== undefined ? `<p class="sub">✓ ${esc(c.opts[chosen].t)}</p>` : `<div class="svOpts">${c.opts.map((o, j) => b(`decide:${c.id}:${j}`, o.t, 'ghost')).join('')}</div>`}</li>`; }).join('');
  return `<section class="svCard"><p>${esc(w('arrived'))} <b>${V.clock(d.at)}</b>${d.late ? ' ⚠️' : ''} · ${esc(r.office)}</p></section>
    <h3>${esc(w('cases'))}</h3><ul class="svCases">${cases}</ul>
    ${d.lunch ? '' : `<div class="svChips">${sv.colleagues.map((c, i) => b('lunch:' + i, `${w('lunch')} ${c.name}`, 'ghost small')).join('')}</div>`}
    <h3>${esc(w('out'))}</h3><div class="svChips">${(['ontime', 'overtime', 'early'] as Leave[]).map(l => b('leave:' + l, w('l.' + l), l === 'ontime' ? 'primary' : 'ghost')).join('')}</div>`;
}

function profile(s: State): string {
  const sv = V.serviceOf(s), r = sv.role ? V.roleOf(sv.role) : null;
  const card = r ? (() => { const k = V.rankOf(s);
    return `<section class="svId"><div class="svIdTop"><span class="svIc big">${r.icon}</span><div><small>${esc(ru() ? r.orgRu : r.org)}</small><b>${esc(s.name)}</b><span>${esc((ru() ? r.ranksRu : r.ranks)[k])}</span></div></div>
      <dl><dt>${esc(w('badge'))}</dt><dd>${esc(sv.badge)}</dd><dt>${esc(w('rank'))}</dt><dd>${esc((ru() ? r.ranksRu : r.ranks)[k])}${k < 4 ? ` · ${esc(w('next'))} ${V.RANK_AT[k + 1]} ${esc(w('merit'))}` : ''}</dd>
      <dt>${esc(w('since'))}</dt><dd>${sv.since + 1} · ${sv.shifts} ${esc(w(sv.shifts === 1 ? 'shift1' : 'shifts'))}</dd><dt>${esc(w('merit'))}</dt><dd>${sv.merit}</dd>
      <dt>${esc(w('reprimands'))}</dt><dd>${sv.reprimands}</dd><dt>${esc(w('commend'))}</dt><dd>${sv.commend}</dd><dt>${esc(w('earned'))}</dt><dd>${G.money(sv.earned)}</dd></dl></section>
      <h3>${esc(w('colleagues'))}</h3><ul class="svCols">${sv.colleagues.map(c => `<li><b>${esc(c.name)}</b><meter min="0" max="100" value="${c.rel}"></meter></li>`).join('')}</ul>
      ${b('resign', w('resign'), 'ghost small')}`; })() : `<p class="hint">${esc(w('none'))}</p>`;
  return `${card}<details class="svFile"><summary>${esc(w('file'))} (${sv.log.length})</summary><ul>${sv.log.map(l => `<li>${esc(l)}</li>`).join('')}</ul></details>`;
}

export function serviceHtml(s: State): string {
  const tick = V.tickApplication(s);
  const tabs = (['vac', 'day', 'prof'] as Tab[]).map(t => `<button type="button" role="tab" class="asTab${t === view.tab ? ' on' : ''}" data-sv="tab:${t}" aria-selected="${t === view.tab}">${esc(w(t))}</button>`).join('');
  const body = view.tab === 'vac' ? vacancies(s) : view.tab === 'day' ? workday(s) : profile(s);
  return `<div class="svc">${tick ? `<p class="phNote" role="status">${esc(tick)}</p>` : ''}<div class="asTabs" role="tablist">${tabs}</div>${body}</div>`;
}
/** Connects the screen; `again` saves and draws again. */
export function wireService(host: HTMLElement, s: State, d: { notify: (m: string) => void; again: () => void }): void {
  const run = (r: { ok: boolean; msg: string }): void => { d.notify(r.msg); d.again(); };
  host.querySelectorAll<HTMLInputElement>('input[name^="svIv"]').forEach(r => { r.onchange = () => { view.iv[Number(r.name.slice(4))] = Number(r.value); d.again(); }; });
  host.querySelectorAll<HTMLInputElement>('input[name="svPark"]').forEach(r => { r.onchange = () => { view.park = r.value as Park; }; });
  host.querySelectorAll<HTMLButtonElement>('[data-sv]').forEach(btn => { btn.onclick = () => {
    const [act, a1, a2] = (btn.dataset.sv as string).split(':');
    if (act === 'tab') { view.tab = a1 as Tab; return d.again(); }
    if (act === 'filter') { view.filter = a1 as typeof view.filter; return d.again(); }
    if (act === 'apply') return run(V.apply(s, a1 as RoleId));
    if (act === 'interview') { const r = V.interview(s, view.iv); view.iv = [-1, -1, -1]; return run(r); }
    if (act === 'accept') { const r = V.accept(s); if (r.ok) view.tab = 'day'; return run(r); }
    if (act === 'clearApp') { V.serviceOf(s).app = null; return d.again(); }
    if (act === 'depart') { view.depart = Number(a1); return d.again(); }
    if (act === 'mode') { view.mode = a1 as Mode; return d.again(); }
    if (act === 'go') return run(V.goToWork(s, view.depart, view.mode ?? 'walk', view.park));
    if (act === 'decide') return run(V.decide(s, a1, Number(a2)));
    if (act === 'lunch') return run(V.lunch(s, Number(a1)));
    if (act === 'leave') return run(V.leaveWork(s, a1 as Leave));
    if (act === 'resign') return run(V.resign(s));
  }; });
}
/** Takes over the phone screen until the player goes back (the same way as the Jobs app). */
export function openService(host: HTMLElement, s: State, d: { back: () => void; refresh: () => void; notify: (m: string) => void }): void {
  let flash = '';
  const draw = (): void => {
    const f = flash; flash = '';
    host.innerHTML = `<div class="phone sub svcApp"><div class="phHead"><button class="ghost" data-svback aria-label="Back">‹</button><b>🏛️ ${esc(w('title'))}</b></div>${f ? `<p class="phNote" role="status">${esc(f)}</p>` : ''}${serviceHtml(s)}</div>`;
    host.querySelector<HTMLButtonElement>('[data-svback]')!.onclick = () => d.back();
    wireService(host, s, { notify: m => { flash = m; d.notify(m); }, again: () => { d.refresh(); draw(); } });
  };
  draw();
}
/** For the tests. */
export function resetServiceView(): void { view.tab = 'vac'; view.filter = 'all'; view.depart = 7 * 60 + 30; view.mode = null; view.park = 'lot'; view.iv = [-1, -1, -1]; }
