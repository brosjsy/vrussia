/* The learning report and the real-life checklist, built from the player's finished (or running) game.
   Pure: a game state in, plain data out. It says only what the state shows (a paper held, a strike earned), never guesses, and every step
   points to the sources of src/platform/citations.ts. The checklist is general guidance from the game's rules, not legal advice. */
import type { State } from '../engine';
import { forTags, topicsOf } from './citations';
import type { Source } from './citations';

export interface Item { id: string; en: string; ru: string }
export interface Step extends Item { done: boolean; tags: string[] }
export interface Report {
  name: string; label: string; ending: string; day: number; score: number;
  done: Item[]; mistakes: Item[]; steps: Step[]; sources: Source[];
}

const L = (id: string, en: string, ru: string): Item => ({ id, en, ru });
const held = (n: number | undefined): boolean => (n ?? 0) > 0;
const anyBank = (s: State): boolean => Object.values(s.bank).some(Boolean);

interface Rule { item: Item; when: (s: State) => boolean }
const DONE: Rule[] = [
  { item: L('registered', 'Registered at your address', 'Встали на миграционный учёт по адресу'), when: s => s.status !== 'citizen' && (!!s.flags.registered || held(s.docs.reg)) },
  { item: L('med', 'Passed the medical examination', 'Прошли медицинское освидетельствование'), when: s => !!s.flags.med },
  { item: L('insured', 'Took out health insurance', 'Оформили медицинскую страховку'), when: s => !!s.flags.insured },
  { item: L('rutest', 'Passed the Russian language and history test', 'Сдали экзамен по русскому языку и истории'), when: s => !!s.flags.rutest },
  { item: L('patent', 'Held a valid work patent', 'Имели действующий патент на работу'), when: s => s.status === 'migrant' && (held(s.docs.patent) || !!s.marks.patent) },
  { item: L('bank', 'Opened a bank account', 'Открыли банковский счёт'), when: anyBank },
  { item: L('selfemployed', 'Registered as self-employed or started a business', 'Стали самозанятым или открыли дело'), when: s => !!s.flags.selfEmployed || !!s.flags.bizOpened || !!s.biz },
  { item: L('rvp', 'Reached a temporary residence permit (RVP)', 'Получили разрешение на временное проживание (РВП)'), when: s => !!s.flags.rvp },
  { item: L('vnzh', 'Reached a residence permit (VNZh)', 'Получили вид на жительство (ВНЖ)'), when: s => !!s.flags.vnzh },
  { item: L('citizen', 'Became a citizen', 'Стали гражданином России'), when: s => !!s.flags.naturalized },
  { item: L('studies', 'Was admitted to study', 'Поступили на учёбу'), when: s => !!s.flags.admitted || !!s.flags.enrolled },
  { item: L('licence', 'Got a driving licence', 'Получили водительские права'), when: s => !!s.flags.license || !!s.flags.licence },
  { item: L('rights', 'Learned your rights', 'Узнали свои права'), when: s => !!s.flags.knowsRights },
  { item: L('married', 'Married', 'Вступили в брак'), when: s => !!s.flags.married },
  { item: L('clean', 'Finished without a legal strike', 'Не получили ни одного предупреждения от закона'), when: s => s.day >= 30 && s.strikes === 0 },
];
const MISTAKES: Rule[] = [
  { item: L('strikes', 'Legal strikes on your record', 'Предупреждения от закона в вашем деле'), when: s => s.strikes > 0 },
  { item: L('patent_ban', 'Lost the right to work on a patent', 'Потеряли право работать по патенту'), when: s => !!s.flags.patentBan || !!s.marks.patentBan },
  { item: L('patent_notice', 'Missed the notification to the migration authority', 'Не уведомили миграционные органы вовремя'), when: s => !!s.flags.patentNotice && !s.flags.patentOk },
  { item: L('passport_lost', 'Lost your passport', 'Потеряли паспорт'), when: s => !!s.flags.passportLost },
  { item: L('expelled', 'Was expelled from the university', 'Были отчислены из университета'), when: s => !!s.flags.expelled },
  { item: L('deported', 'The game ended in deportation', 'Игра закончилась депортацией'), when: s => s.over === 'deported' },
  { item: L('debt', 'The game ended in debt', 'Игра закончилась долгами'), when: s => s.over === 'debt' },
  { item: L('hospital', 'The game ended in hospital', 'Игра закончилась больницей'), when: s => s.over === 'hospital' },
  { item: L('late_registration', 'Expired registration', 'Просроченная регистрация'), when: s => s.status !== 'citizen' && s.day > 20 && !s.flags.registered && s.docs.reg <= 0 && s.strikes > 0 },
];

const mig = (s: State): boolean => s.status === 'migrant';
const abroad = (s: State): boolean => s.status !== 'citizen';
const STEPS: { item: Item; tags: string[]; for: (s: State) => boolean; done: (s: State) => boolean }[] = [
  { item: L('s_reg', 'Register your stay with the migration authority within the time the law gives for your nationality and purpose, and keep the paper.', 'Встаньте на миграционный учёт в срок, который закон даёт для вашего гражданства и цели приезда, и храните документ.'), tags: ['registration'], for: abroad, done: s => !!s.flags.registered || held(s.docs.reg) },
  { item: L('s_med', 'Do the medical examination and the other checks required for the kind of stay you have.', 'Пройдите медицинское освидетельствование и другие проверки, нужные для вашего вида пребывания.'), tags: ['status'], for: mig, done: s => !!s.flags.med },
  { item: L('s_ins', 'Take out voluntary health insurance (a patent needs it) and keep the policy with you.', 'Оформите полис ДМС (для патента он нужен) и носите его с собой.'), tags: ['patent', 'status'], for: mig, done: s => !!s.flags.insured },
  { item: L('s_test', 'Pass the Russian language, history and law test for the work patent.', 'Сдайте экзамен по русскому языку, истории и законодательству для патента.'), tags: ['status'], for: mig, done: s => !!s.flags.rutest },
  { item: L('s_pat', 'Apply for the patent and pay the fixed advance payment on time every month; keep every receipt.', 'Подайте на патент и вовремя вносите фиксированный авансовый платёж; сохраняйте все квитанции.'), tags: ['patent'], for: mig, done: s => held(s.docs.patent) || !!s.marks.patent },
  { item: L('s_contract', 'Work only with a written employment contract, and make sure the employer notifies the migration authority.', 'Работайте только по письменному трудовому договору и проследите, чтобы работодатель уведомил миграционные органы.'), tags: ['labour', 'status'], for: abroad, done: s => !!s.job },
  { item: L('s_eaeu', 'As a citizen of an EAEU country you need no patent: work under a contract and register as the rules for your country say.', 'Гражданину страны ЕАЭС патент не нужен: работайте по договору и встаньте на учёт по правилам вашей страны.'), tags: ['eaeu'], for: s => s.status === 'eaeu', done: s => !!s.job },
  { item: L('s_stud', 'Keep your enrolment and the university’s migration registration in order: your stay depends on them.', 'Следите за зачислением и миграционным учётом через университет: от них зависит ваше пребывание.'), tags: ['education', 'registration'], for: s => s.status === 'student', done: s => !!s.flags.enrolled || !!s.flags.admitted },
  { item: L('s_bank', 'Open a bank account and use it for rent and salary, so there is a record.', 'Откройте банковский счёт и платите им за жильё и получайте зарплату, чтобы остался след в документах.'), tags: ['labour'], for: () => true, done: anyBank },
  { item: L('s_rent', 'Rent only with a written contract; keep copies of every paper and note the deadlines in your phone.', 'Снимайте жильё только по письменному договору; храните копии всех бумаг и записывайте сроки в телефон.'), tags: ['registration', 'labour'], for: () => true, done: () => false },    // advice the state cannot show
  { item: L('s_ladder', 'Think ahead: the language test and a clean record lead to RVP, then VNZh, then citizenship. Fees are set by law; check the amount.', 'Думайте наперёд: экзамен и чистая история ведут к РВП, затем к ВНЖ и гражданству. Пошлины устанавливает закон; уточняйте размер.'), tags: ['status', 'citizenship', 'duty'], for: abroad, done: s => !!s.flags.rvp || !!s.flags.vnzh || !!s.flags.naturalized },
  { item: L('s_oms', 'Keep your compulsory health insurance policy (OMS) and register with a clinic.', 'Сохраните полис ОМС и прикрепитесь к поликлинике.'), tags: ['family'], for: s => s.status === 'citizen', done: s => !!s.flags.insured },
  { item: L('s_tax', 'If you earn on your own, register as self-employed or as an individual entrepreneur and pay tax on time.', 'Если зарабатываете сами, оформите самозанятость или ИП и платите налоги вовремя.'), tags: ['selfemployed'], for: s => !!s.flags.selfEmployed || !!s.biz, done: s => !!s.flags.selfEmployed || !!s.biz },
];

/** The report for a game state. `needed` steps are those that apply to this player; a step is done when the state shows it. */
export function buildReport(s: State): Report {
  const steps: Step[] = STEPS.filter(x => x.for(s)).map(x => ({ ...x.item, tags: x.tags, done: x.done(s) }));
  const tags = new Set<string>(topicsOf(s)); steps.forEach(x => x.tags.forEach(t => tags.add(t)));
  return {
    name: s.name, label: s.label, ending: s.over ? String(s.over) : '', day: s.day + 1, score: 0,
    done: DONE.filter(r => r.when(s)).map(r => r.item), mistakes: MISTAKES.filter(r => r.when(s)).map(r => r.item),
    steps, sources: forTags(tags),
  };
}
/** What goes to a teacher: only ids, no free text. */
export const compact = (r: Report): { done: string[]; mistakes: string[] } => ({ done: r.done.map(x => x.id).slice(0, 40), mistakes: r.mistakes.map(x => x.id).slice(0, 40) });
export const isEmpty = (r: Report): boolean => r.done.length === 0 && r.mistakes.length === 0;

export interface Labels { title: string; done: string; mistakes: string; next: string; sources: string; day: string; none: string; note: string; never: string; checked: string; old: string; open: string }

/** A whole page for printing or saving as PDF. Links open in the browser; the page has its own light print styles. */
export function printableHtml(r: Report, ru: boolean, lab: Labels, esc: (s: string) => string, srcHtml: (list: readonly Source[]) => string): string {
  const txt = (i: Item): string => esc(ru ? i.ru : i.en);
  const list = (items: Item[], mark: string): string => items.length ? `<ul>${items.map(i => `<li>${mark} ${txt(i)}</li>`).join('')}</ul>` : `<p class="none">${esc(lab.none)}</p>`;
  return `<!doctype html><html lang="${ru ? 'ru' : 'en'}"><head><meta charset="utf-8"><title>${esc(lab.title)} — ${esc(r.name)}</title>
<style>body{font:15px/1.5 system-ui,Segoe UI,Arial,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#111}h1{font-size:22px;margin:0}h2{font-size:17px;margin:22px 0 6px;border-bottom:2px solid #c33;padding-bottom:3px}ul{padding-left:0;list-style:none}li{margin:5px 0}.sub{color:#555}.none{color:#777}.box{display:inline-block;width:1em}small{display:block;color:#555}.src b{font-weight:600}a{color:#036}@media print{a{color:#000}body{margin:0}}</style></head><body>
<h1>🇷🇺 ${esc(lab.title)}</h1><p class="sub">${esc(r.name)} · ${esc(r.label)} · ${esc(lab.day)} ${r.day}</p>
<h2>✔ ${esc(lab.done)}</h2>${list(r.done, '✔')}
<h2>⚠ ${esc(lab.mistakes)}</h2>${list(r.mistakes, '•')}
<h2>☐ ${esc(lab.next)}</h2><ul>${r.steps.map(x => `<li>${x.done ? '☑' : '☐'} ${txt(x)}</li>`).join('')}</ul>
<h2>📚 ${esc(lab.sources)}</h2>${srcHtml(r.sources)}
<p class="sub">${esc(lab.note)}</p></body></html>`;
}
