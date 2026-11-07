/* Where the rules in the game come from: the law or the official body, with a "last checked" date and a watch note for rules that change.
   Honest by design: `verifiedOn` stays null until a PERSON has opened the official source and confirmed the game's rule against it
   (scripts/verify-source.mjs sets the date), and the screens say "not yet checked by a person" until then. A checked date older than
   STALE_DAYS shows as "check again". The links go to the official portals, where each law is found by its number. */
import type { State } from '../engine';

export interface Source {
  id: string;
  law: { en: string; ru: string };
  /** What the game uses it for. */
  topic: string;
  authority: string;
  url: string;
  tags: string[];
  /** ISO date a person confirmed the game against this source, or null. */
  verifiedOn: string | null;
  /** What an online search of public sources found (not a person's check: verifiedOn stays null). docs/SOURCES_CHECK.md has the links. */
  webCheck?: { on: string; en: string; ru: string };
  /** A reminder for rules that are changed often. */
  watch?: { en: string; ru: string };
}

export const STALE_DAYS = 180;
const MVD = 'https://xn--b1aew.xn--p1ai/', PRAVO = 'http://pravo.gov.ru/', GOS = 'https://www.gosuslugi.ru/', FNS = 'https://www.nalog.gov.ru/', EAEU = 'https://eaeunion.org/', RKN = 'https://rkn.gov.ru/';

export const SOURCES: readonly Source[] = [
  { id: 'fz115', topic: 'status', tags: ['status', 'patent', 'labour', 'duty'], authority: 'MVD', url: MVD, verifiedOn: null, webCheck: { on: '2026-10-31', en: 'Not confirmed online: the game’s “two months to notify the Interior Ministry after a patent” and the exam price of ₽5,300 (a fixed price was planned by decree). Sources differ (30 days, 2 months); check the current text.', ru: 'Не подтверждено: «два месяца на уведомление МВД после патента» и цена экзамена ₽5 300 (планировалась фиксированная цена по постановлению). Источники расходятся (30 дней, 2 месяца); проверьте действующий текст.' },
    law: { en: 'Federal Law No. 115-FZ of 25 July 2002 “On the Legal Status of Foreign Citizens in the Russian Federation” (patents, work permits, RVP, VNZh)', ru: 'Федеральный закон от 25.07.2002 № 115-ФЗ «О правовом положении иностранных граждан в Российской Федерации» (патент, разрешение на работу, РВП, ВНЖ)' },
    watch: { en: 'Amended often: check the current text.', ru: 'Часто меняется: проверяйте действующую редакцию.' } },
  { id: 'fz109', topic: 'registration', tags: ['registration'], authority: 'MVD', url: MVD, verifiedOn: null, webCheck: { on: '2026-10-31', en: 'The 7 working days, 15 days for Uzbek and Tajik workers, 30 days for EAEU workers and 90 days for Belarusians match what public sources say. Changes from September 2026 were announced; their details were not found.', ru: '7 рабочих дней, 15 дней для работников из Узбекистана и Таджикистана, 30 дней для граждан ЕАЭС и 90 дней для белорусов совпадают с публичными источниками. Об изменениях с сентября 2026 сообщалось, подробностей найти не удалось.' },
    law: { en: 'Federal Law No. 109-FZ of 18 July 2006 “On Migration Registration of Foreign Citizens and Stateless Persons”', ru: 'Федеральный закон от 18.07.2006 № 109-ФЗ «О миграционном учёте иностранных граждан и лиц без гражданства в Российской Федерации»' },
    watch: { en: 'The time allowed to register depends on nationality and purpose of the stay.', ru: 'Срок постановки на учёт зависит от гражданства и цели пребывания.' } },
  { id: 'tax2271', topic: 'patent', tags: ['patent'], authority: 'FNS', url: FNS, verifiedOn: null, webCheck: { on: '2026-10-31', en: 'Moscow: ₽10,000 a month in 2026 (₽1,200 × 2.842 × 2.9323), ₽8,900 in 2025: matches the game.', ru: 'Москва: ₽10,000 в месяц в 2026 году (₽1,200 × 2,842 × 2,9323), в 2025 — ₽8,900: совпадает с игрой.' },
    law: { en: 'Tax Code of the Russian Federation, Article 227.1 (fixed advance payment of income tax for patent holders)', ru: 'Налоговый кодекс РФ, статья 227.1 (фиксированный авансовый платёж по НДФЛ для патентов)' },
    watch: { en: 'The amount is set by region and changes every year.', ru: 'Размер зависит от региона и меняется каждый год.' } },
  { id: 'fz62', topic: 'citizenship', tags: ['citizenship', 'status'], authority: 'MVD', url: MVD, verifiedOn: null,
    law: { en: 'Federal Law No. 62-FZ of 31 May 2002 “On Citizenship of the Russian Federation”', ru: 'Федеральный закон от 31.05.2002 № 62-ФЗ «О гражданстве Российской Федерации»' } },
  { id: 'eaeu', topic: 'eaeu', tags: ['eaeu', 'labour'], authority: 'Eurasian Economic Commission', url: EAEU, verifiedOn: null, webCheck: { on: '2026-10-31', en: 'The Commission FAQ confirms that workers of member states need no work permit. An amendment to Article 97 was reported; its status was not confirmed.', ru: 'В разъяснениях Комиссии подтверждено, что работникам государств-членов разрешение на работу не нужно. Сообщалось о поправке к статье 97; её статус не подтверждён.' },
    law: { en: 'Treaty on the Eurasian Economic Union of 29 May 2014, Section XXVI (labour migration)', ru: 'Договор о Евразийском экономическом союзе от 29.05.2014, раздел XXVI (трудовая миграция)' } },
  { id: 'koap', topic: 'fines', tags: ['fines', 'status'], authority: 'Government', url: PRAVO, verifiedOn: null,
    law: { en: 'Code of Administrative Offences, No. 195-FZ of 30 December 2001 (for example Article 18.8, breaking the rules of entry and stay)', ru: 'Кодекс РФ об административных правонарушениях от 30.12.2001 № 195-ФЗ (например, статья 18.8 — нарушение правил въезда и пребывания)' } },
  { id: 'tk', topic: 'labour', tags: ['labour'], authority: 'Rostrud', url: PRAVO, verifiedOn: null,
    law: { en: 'Labour Code of the Russian Federation, No. 197-FZ of 30 December 2001', ru: 'Трудовой кодекс РФ от 30.12.2001 № 197-ФЗ' } },
  { id: 'fz422', topic: 'selfemployed', tags: ['selfemployed'], authority: 'FNS', url: FNS, verifiedOn: null,
    law: { en: 'Federal Law No. 422-FZ of 27 November 2018 (tax on professional income, “self-employed”)', ru: 'Федеральный закон от 27.11.2018 № 422-ФЗ (налог на профессиональный доход, «самозанятые»)' } },
  { id: 'fz273', topic: 'education', tags: ['education'], authority: 'Ministry of Education', url: PRAVO, verifiedOn: null,
    law: { en: 'Federal Law No. 273-FZ of 29 December 2012 “On Education in the Russian Federation”', ru: 'Федеральный закон от 29.12.2012 № 273-ФЗ «Об образовании в Российской Федерации»' } },
  { id: 'sk', topic: 'family', tags: ['family'], authority: 'Government', url: GOS, verifiedOn: null,
    law: { en: 'Family Code of the Russian Federation, No. 223-FZ of 29 December 1995', ru: 'Семейный кодекс РФ от 29.12.1995 № 223-ФЗ' } },
  { id: 'fz256', topic: 'matcap', tags: ['matcap'], authority: 'Social Fund', url: GOS, verifiedOn: null, webCheck: { on: '2026-10-31', en: 'Maternity capital from 1 February 2026: ₽728,921.90 for a first child; the game says about ₽730,000.', ru: 'Материнский капитал с 1 февраля 2026: ₽728 921,90 на первого ребёнка; в игре около ₽730 000.' },
    law: { en: 'Federal Law No. 256-FZ of 29 December 2006 (maternity capital)', ru: 'Федеральный закон от 29.12.2006 № 256-ФЗ (материнский капитал)' },
    watch: { en: 'The amount is indexed every year.', ru: 'Сумма индексируется каждый год.' } },
  { id: 'pdd', topic: 'traffic', tags: ['traffic'], authority: 'GIBDD', url: GOS, verifiedOn: null,
    law: { en: 'Traffic Rules of the Russian Federation (Government Decree No. 1090 of 23 October 1993)', ru: 'Правила дорожного движения РФ (постановление Правительства от 23.10.1993 № 1090)' } },
  { id: 'duty', topic: 'duty', tags: ['duty'], authority: 'FNS', url: FNS, verifiedOn: null, webCheck: { on: '2026-10-31', en: 'From 26 July 2026 (Federal Law of 26 June 2026 No. 190-FZ): RVP ₽15,000, VNZh ₽30,000, citizenship ₽50,000: matches the game.', ru: 'С 26 июля 2026 (закон от 26.06.2026 № 190-ФЗ): РВП ₽15,000, ВНЖ ₽30,000, гражданство ₽50,000: совпадает с игрой.' },
    law: { en: 'Tax Code of the Russian Federation, Chapter 25.3 (state duty)', ru: 'Налоговый кодекс РФ, глава 25.3 (государственная пошлина)' },
    watch: { en: 'Fees are changed by law: confirm the amount on the official site.', ru: 'Размеры пошлин меняются законом: уточняйте на официальном сайте.' } },
  { id: 'land', topic: 'land', tags: ['land', 'build'], authority: 'Rosreestr', url: GOS, verifiedOn: null, webCheck: { on: '2026-11-01', en: 'Found online: a land sale is a written contract, only a plot with a cadastral number can be sold, the transfer of ownership is registered in the state register (Rosreestr), a foreigner may not buy farmland, and a house and its plot cannot be sold apart. The state duty for a private person is as the game says only in outline; check the current Tax Code amount.', ru: 'Найдено в сети: купля-продажа земли оформляется письменным договором, продать можно только участок с кадастровым номером, переход права регистрируется в Росреестре, иностранцу нельзя покупать сельхозземли, дом и участок нельзя продавать отдельно. Размер пошлины для физлица в игре упрощён: сверьтесь с Налоговым кодексом.' },
    law: { en: 'Land Code of the Russian Federation (arts. 15, 37) and Federal Law No. 218-FZ “On State Registration of Real Estate”', ru: 'Земельный кодекс РФ (ст. 15, 37) и Федеральный закон от 13.07.2015 № 218-ФЗ «О государственной регистрации недвижимости»' } },
  { id: 'landtax', topic: 'land', tags: ['land'], authority: 'FNS', url: FNS, verifiedOn: null, webCheck: { on: '2026-11-01', en: 'Not confirmed by this search: the rates of 0.3% (housing, farm and similar plots) and 1.5% (others) of the cadastral value, set in art. 394 of the Tax Code, are from general knowledge and local authorities may set lower rates.', ru: 'Этим поиском не подтверждено: ставки 0,3% (жильё, сельхоз и т. п.) и 1,5% (прочие) от кадастровой стоимости по ст. 394 НК РФ взяты из общих знаний; местные власти могут снижать ставки.' },
    law: { en: 'Tax Code of the Russian Federation, Chapter 31 (land tax)', ru: 'Налоговый кодекс РФ, глава 31 (земельный налог)' } },
  { id: 'grk', topic: 'build', tags: ['build'], authority: 'Minstroy', url: GOS, verifiedOn: null, webCheck: { on: '2026-11-01', en: 'Found online: a private house on your own plot needs a notification of planned building (art. 51.1 of the Town Planning Code), not a permit; other buildings follow art. 51. A government decree of 23 May 2026 No. 589 sets rules for the registers of such notifications from 1 September 2026. Lawyers’ sites disagree on details; read the current text.', ru: 'Найдено в сети: для частного дома на своём участке нужно уведомление о планируемом строительстве (ст. 51.1 ГрК), а не разрешение; для остальных зданий — ст. 51. Постановление Правительства от 23.05.2026 № 589 устанавливает правила реестров уведомлений с 1 сентября 2026. Юридические сайты расходятся в деталях: читайте действующий текст.' },
    law: { en: 'Town Planning Code of the Russian Federation, arts. 51 and 51.1', ru: 'Градостроительный кодекс РФ, ст. 51 и 51.1' } },
  { id: 'fz54', topic: 'shop', tags: ['shop', 'build'], authority: 'FNS', url: FNS, verifiedOn: null, webCheck: { on: '2026-11-01', en: 'Found online: shops and cafés, including those on a patent, must use a registered online cash register (54-FZ); a foreigner who lives in Russia legally can register as an individual entrepreneur, which takes up to three working days; the patent income limit is ₽20 million a year from 2026.', ru: 'Найдено в сети: розничная торговля и общепит, в том числе на патенте, обязаны применять зарегистрированную онлайн-кассу (54-ФЗ); иностранец, законно проживающий в России, может зарегистрироваться ИП (до трёх рабочих дней); лимит дохода на патенте — 20 млн ₽ в год с 2026 года.' },
    law: { en: 'Federal Law No. 54-FZ “On the Use of Cash Registers”', ru: 'Федеральный закон от 22.05.2003 № 54-ФЗ «О применении контрольно-кассовой техники»' } },
  { id: 'fz152', topic: 'data', tags: ['data'], authority: 'Roskomnadzor', url: RKN, verifiedOn: null,
    law: { en: 'Federal Law No. 152-FZ of 27 July 2006 “On Personal Data”', ru: 'Федеральный закон от 27.07.2006 № 152-ФЗ «О персональных данных»' } },
];

export type Freshness = 'unchecked' | 'fresh' | 'old';
export function freshness(src: Source, now = Date.now()): Freshness {
  if (!src.verifiedOn) return 'unchecked';
  const t = Date.parse(src.verifiedOn);
  return Number.isFinite(t) && now - t <= STALE_DAYS * 864e5 ? 'fresh' : 'old';
}
export const byId = (id: string): Source | undefined => SOURCES.find(s => s.id === id);
/** Sources for any of the given topic tags, in the table's order, without repeats. */
export function forTags(tags: Iterable<string>): Source[] { const want = new Set(tags); return SOURCES.filter(s => s.tags.some(x => want.has(x))); }

/** The topics a player's game touched, from who they are and what they did. */
export function topicsOf(s: Pick<State, 'status' | 'flags' | 'docs' | 'strikes' | 'biz' | 'kids'>): string[] {
  const t = new Set<string>(['data']);
  if (s.status === 'migrant') ['registration', 'patent', 'status', 'labour', 'fines', 'duty'].forEach(x => t.add(x));
  if (s.status === 'eaeu') ['eaeu', 'registration', 'labour', 'status'].forEach(x => t.add(x));
  if (s.status === 'student') ['education', 'registration', 'status'].forEach(x => t.add(x));
  if (s.status === 'citizen') t.add('labour');
  const f = s.flags;
  if (f.rvp || f.vnzh || f.rutest || f.rvpGround) { t.add('status'); t.add('duty'); }
  if (f.naturalized || f.vnzh) { t.add('citizenship'); t.add('duty'); }
  if (f.married || f.marriedCitizen || f.proposed || s.kids > 0) t.add('family');
  if (f.matCapIssued || f.pregnant || f.childAllowance) t.add('matcap');
  if (f.selfEmployed || s.biz) t.add('selfemployed');
  if (f.license || f.licence) t.add('traffic');
  if (f.admitted || f.enrolled || f.studied || f.scholarship) t.add('education');
  if (s.strikes > 0 || f.patentBan || f.patentNotice) t.add('fines');
  return [...t];
}

const KEYWORDS: [RegExp, string][] = [
  [/registr|регистр|учёт|учет/i, 'registration'], [/patent|патент/i, 'patent'], [/\b(rvp|vnzh|residence permit|рвп|внж)\b/i, 'status'], [/citizen|натурал|гражданств/i, 'citizenship'],
  [/eaeu|еаэс/i, 'eaeu'], [/fine|штраф|police|полици|deport|депорт/i, 'fines'], [/contract|employer|договор|работодател|salary|зарплат/i, 'labour'], [/self-employed|самозанят|\bnpd\b/i, 'selfemployed'],
  [/universit|exam|student|университет|экзамен|студент/i, 'education'], [/marriage|wedding|брак|свадьб|child|ребён|ребен/i, 'family'], [/maternity|материнск/i, 'matcap'], [/licen[cs]e|driving|права|вождени/i, 'traffic'], [/state duty|пошлин/i, 'duty'],
];
/** Topics a piece of scenario text is about (a light keyword match; used to show “Sources” under legal scenarios). */
export function topicsOfText(text: string): string[] { const out = new Set<string>(); for (const [re, tag] of KEYWORDS) if (re.test(text)) out.add(tag); return [...out]; }

export function sourcesHtml(list: readonly Source[], ru: boolean, labels: { never: string; checked: string; old: string; open: string }, esc: (s: string) => string, now = Date.now()): string {
  return `<ul class="srcList">${list.map(s => {
    const f = freshness(s, now);
    const note = f === 'unchecked' ? labels.never : f === 'fresh' ? `${labels.checked}: ${s.verifiedOn}` : `${labels.old} (${s.verifiedOn})`;
    return `<li class="src ${f}"><b>${esc(ru ? s.law.ru : s.law.en)}</b><small>${esc(s.authority)} · ${esc(note)}${s.watch ? ' · ⚠ ' + esc(ru ? s.watch.ru : s.watch.en) : ''}</small>${s.webCheck ? `<small class="web">${esc(ru ? 'Поиск в интернете' : 'Online search')} ${esc(s.webCheck.on)}: ${esc(ru ? s.webCheck.ru : s.webCheck.en)}</small>` : ''}<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(labels.open)}</a></li>`;
  }).join('')}</ul>`;
}
