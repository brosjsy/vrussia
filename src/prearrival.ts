/* Before Russia: a foreign character can start their life at home, with everything that comes before the first day in Russia. A student from most
   countries needs a study visa: the university asks the migration department for an invitation, the student gets an HIV certificate (needed for a visa
   of more than three months), health insurance and a photo, fills in the online application, books an appointment at the visa centre, hands in the
   documents in person and answers the officer's questions, waits for the decision, checks the visa sticker, and buys a ticket. A student from a CIS
   country with free entry needs no visa, only a passport and the letter of admission. A worker from Tajikistan or Uzbekistan needs a foreign passport
   and, once in Russia, a patent, and the patent is only given when "work" is written as the purpose on the migration card; a worker from Kyrgyzstan
   (EAEU) may travel with the ID card.
   Simplified from the real procedure (2026; the rules change often, and the consulate of each country says what applies there). Every price and
   every number of days is a game value. Pure and deterministic: no screen. The page shows it (prearrival-ui.ts) until the character has arrived; the
   game's own day 0 (1 September) begins on arrival, and what the preparation cost more or less than usual is added to or taken from the money. */
import type { State } from './engine';
import { countryByCode } from './countries';

export type Track = 'study' | 'study_free' | 'migrant' | 'eaeu';
export type Step = 'country' | 'passport' | 'invite' | 'hiv' | 'insurance' | 'photo' | 'form' | 'book' | 'interview' | 'decision' | 'collect' | 'course' | 'ticket' | 'depart';
export type Purpose = 'study' | 'work' | 'tourism' | 'private';
export interface Form { purpose: Purpose; entries: 'single' | 'double' | 'multiple'; entry: number; uni: string; name: string }
export interface Ticket { id: string; label: string; day: number; price: number; mode: 'plane' | 'train'; hours: number }
export interface Pre {
  track: Track; country: string; t: number; spent: number; done: boolean; log: string[];
  passportUntil: number;            // months the passport is still valid
  renewReady: number | null;        // the day a new passport is ready
  inviteReady: number | null; invite: boolean;
  hiv: boolean; insurance: boolean; photo: boolean; course: boolean;
  form: Form | null; appt: number | null; tries: number; refusedUntil: number;
  decision: number | null; urgent: boolean; collected: boolean; typo: boolean; checked: boolean;
  ticket: Ticket | null; card: Purpose | null;
}
export interface Result { ok: boolean; msg: string }

/** The preparation calendar ends on 1 September (the first day of the game) and starts 70 days before it. A study visa takes the whole of it; a CIS
    student begins 40 days before, a worker two weeks before (no visa to wait for). */
export const LEAD = 70;
export const STARTS: Record<Track, number> = { study: 0, study_free: 30, migrant: 56, eaeu: 56 };
/** CIS countries whose citizens need no visa to enter Russia (a passport; for some an ID card). Turkmenistan needs a visa. */
export const VISA_FREE = ['AM', 'AZ', 'BY', 'KZ', 'KG', 'MD', 'TJ', 'UZ'];
export const ID_CARD_OK = ['AM', 'BY', 'KZ', 'KG'];          // EAEU members: an ID card is enough
export const UNI = 'Kazan Federal University';
export const PRICES = { renew: 3500, renewFast: 8000, hiv: 1500, insurance: 4000, photo: 500, consular: 2500, consularFast: 5000, centre: 1800 };
export const DAYS = { renew: 21, renewFast: 7, invite: 25, admission: 10, hiv: 2, decision: 10, decisionFast: 3, fix: 3, refused: 30 };

type S = State & { pre?: Pre };
export const preOf = (s: State): Pre | null => (s as S).pre ?? null;
export const preparing = (s: State): boolean => { const p = preOf(s); return !!p && !p.done; };
const hash = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };
const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');
const pay = (p: Pre, n: number): void => { p.spent += n; };
const note = (p: Pre, m: string): Result => { p.log.unshift(`Day ${p.t + 1}: ${m}`); p.log = p.log.slice(0, 40); return { ok: true, msg: m }; };
const no = (msg: string): Result => ({ ok: false, msg });

/** The date of a day of preparation (day 0 is 70 days before 1 September 2026). */
export const dateOf = (t: number): Date => new Date(2026, 8, 1 - LEAD + t);
/** A day of preparation as words, e.g. "Tue 28 July". */
export const dayName = (t: number): string => dateOf(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' });
export const weekday = (t: number): boolean => { const d = dateOf(t).getDay(); return d !== 0 && d !== 6; };

/** Which way to Russia the character's origin and country take. */
export function trackFor(status: string, country: string): Track {
  if (status === 'eaeu') return 'eaeu';
  if (status === 'migrant') return 'migrant';
  return VISA_FREE.includes(country) ? 'study_free' : 'study';
}
/** Starts the preparation at home. The worker origins have their country already; the student chooses one first (country ''). */
export function startAtHome(s: State): Pre {
  const country = s.o === 'tajik' ? 'TJ' : s.o === 'uzbek' ? 'UZ' : s.o === 'kyrgyz' ? 'KG' : '';
  const p: Pre = {
    track: trackFor(s.status, country), country, t: STARTS[trackFor(s.status, country)], spent: 0, done: false, log: [],
    passportUntil: 6 + (hash(s.name + s.o) % 30), renewReady: null, inviteReady: null, invite: false, hiv: false, insurance: false, photo: false, course: false,
    form: null, appt: null, tries: 0, refusedUntil: -1, decision: null, urgent: false, collected: false, typo: hash('typo' + s.name) % 6 === 0, checked: false, ticket: null, card: null,
  };
  (s as S).pre = p; return p;
}
/** The student's country: it decides whether a visa is needed. */
export function chooseCountry(s: State, code: string): Result {
  const p = preOf(s), c = countryByCode(code); if (!p) return no('Not preparing.');
  if (!c || c.code === 'RU') return no('Choose your country (not Russia: a Russian citizen needs no visa).');
  if (s.status !== 'student') return no('Your country is already set.');
  p.country = c.code; p.track = trackFor(s.status, c.code); s.home = c.en; if (p.t === 0) p.t = STARTS[p.track];
  return note(p, p.track === 'study' ? `${c.en}: you need a Russian study visa.` : `${c.en}: no visa needed, a passport and the letter of admission are enough.`);
}

/** How many months of validity the passport needs: a study visa (90 days, then a year in Russia) wants about 18 months; for work, a year. */
export const passportNeed = (p: Pre): number => p.track === 'study' || p.track === 'study_free' ? 18 : 12;
export const passportOk = (p: Pre): boolean => p.renewReady === null ? p.passportUntil >= passportNeed(p) || (p.track === 'eaeu' && ID_CARD_OK.includes(p.country)) : p.t >= p.renewReady;
export function renewPassport(p: Pre, fast: boolean): Result {
  if (passportOk(p)) return no('Your passport is valid long enough.');
  if (p.renewReady !== null) return no(`Your new passport is ready on day ${p.renewReady + 1}.`);
  pay(p, fast ? PRICES.renewFast : PRICES.renew); p.renewReady = p.t + (fast ? DAYS.renewFast : DAYS.renew);
  return note(p, `You applied for a new passport (${fmt(fast ? PRICES.renewFast : PRICES.renew)} ₽). It will be ready in ${fast ? DAYS.renewFast : DAYS.renew} days.`);
}
/** The university's invitation (study visa) or letter of admission (no visa): the university asks for it, the student waits. */
export function requestInvite(p: Pre): Result {
  if (p.track !== 'study' && p.track !== 'study_free') return no('Only students need a letter from the university.');
  if (p.inviteReady !== null) return no(`The university has asked already. The letter is expected on day ${p.inviteReady + 1}.`);
  p.inviteReady = p.t + (p.track === 'study' ? DAYS.invite : DAYS.admission);
  return note(p, p.track === 'study' ? 'The university asked the Ministry of Internal Affairs for your invitation. It usually takes three to four weeks.' : 'The university will e-mail your letter of admission in about ten days.');
}
export const inviteIn = (p: Pre): boolean => p.inviteReady !== null && p.t >= p.inviteReady;
export function getHiv(p: Pre): Result { if (p.hiv) return no('You have the certificate.'); pay(p, PRICES.hiv); p.t += DAYS.hiv; p.hiv = true; tick(p); return note(p, `HIV test at a licensed lab: a certificate in two days (${fmt(PRICES.hiv)} ₽). A visa of more than three months needs it.`); }
export function buyInsurance(p: Pre): Result { if (p.insurance) return no('You are insured.'); pay(p, PRICES.insurance); p.insurance = true; return note(p, `Health insurance valid in Russia for the whole visa (${fmt(PRICES.insurance)} ₽).`); }
export function takePhoto(p: Pre): Result { if (p.photo) return no('You have the photos.'); pay(p, PRICES.photo); p.photo = true; return note(p, `Two colour photos 3.5 × 4.5 cm on a light background (${fmt(PRICES.photo)} ₽).`); }
/** The free pre-departure course of the national migration agency (workers): rights, the rules of registration and the patent, a little Russian. */
export function takeCourse(s: State, p: Pre): Result {
  if (p.track !== 'migrant' && p.track !== 'eaeu') return no('This course is for workers.');
  if (p.course) return no('You took the course.');
  p.course = true; p.t += 3; tick(p); s.know = Math.min(100, s.know + 4);
  return note(p, 'Three days of the pre-departure course: what registration, the medical exam and the patent are, what a real job offer looks like, the hotline numbers. Free.');
}

/** What the visa application must say: study, a single entry (the first study visa is single-entry, 90 days; the university extends it), the
    university of the invitation, the name exactly as in the passport, and an entry date the visa can start on. */
export function formProblems(s: State, p: Pre, f: Form): string[] {
  const out: string[] = [];
  if (f.purpose !== 'study') out.push('the purpose of the trip is not "study"');
  if (f.entries !== 'single') out.push('the first study visa is single-entry');
  if (f.uni.trim().toLowerCase() !== UNI.toLowerCase()) out.push('the host is not the university of the invitation');
  if (f.name.trim().toLowerCase() !== s.name.trim().toLowerCase()) out.push('the name is not written as in the passport');
  if (!(f.entry > p.t + 7 && f.entry <= LEAD + 30)) out.push('the entry date is too soon or too late');
  return out;
}
/** Fills in the online application (the consulate's form site). It is accepted whatever it says; the officer reads it at the appointment. */
export function fillForm(p: Pre, f: Form): Result {
  if (p.track !== 'study') return no('No visa is needed.');
  if (p.t < p.refusedUntil) return no(`After a refusal you may apply again from day ${p.refusedUntil + 1}.`);
  p.form = { ...f, uni: f.uni.trim(), name: f.name.trim() };
  return note(p, 'The application form is filled in and printed, with its number for booking.');
}
/** The visa centre's free appointments over the next three weeks: working days only, some already full (the same for everyone on the same day). */
export function slotsFor(p: Pre): { day: number; free: boolean }[] {
  const out: { day: number; free: boolean }[] = [];
  for (let d = p.t + 1; d <= p.t + 21; d++) if (weekday(d)) out.push({ day: d, free: d - p.t >= 4 && hash(`slot|${p.country}|${d}`) % 3 !== 0 });
  return out;
}
export function book(p: Pre, day: number): Result {
  if (p.track !== 'study') return no('No visa is needed, so no appointment.');
  if (!p.form) return no('Fill in the application form first: the appointment is booked with its number.');
  if (p.decision !== null) return no('Your documents are already with the consulate.');
  const slot = slotsFor(p).find(x => x.day === day); if (!slot) return no('Choose a day from the list.');
  if (!slot.free) return no('That day is full. Choose another.');
  p.appt = day; return note(p, `Appointment booked at the visa centre for ${dayName(day)}. Come with every document, in person.`);
}
/** Waits until a day (the appointment, a letter, the decision, the flight). Things that were due come in. */
export function waitUntil(p: Pre, day: number): Result {
  if (day <= p.t) return no('That day has come.');
  p.t = Math.min(day, LEAD + 60); tick(p);
  return { ok: true, msg: `It is ${dayName(p.t)}.` };
}
function tick(p: Pre): void {
  if (p.appt !== null && p.t > p.appt) { p.appt = null; note(p, 'You missed the appointment. Book another one.'); }
  if (p.renewReady !== null && p.t >= p.renewReady && p.passportUntil < 120) { p.passportUntil = 120; note(p, 'Your new passport is ready: valid for ten years.'); }
  if (p.inviteReady !== null && p.t >= p.inviteReady && !p.invite) { p.invite = true; note(p, p.track === 'study' ? 'The invitation has come: Kazan Federal University, study, single entry.' : 'The letter of admission has come.'); }
}

/** What is still missing for the appointment. */
export function missing(s: State, p: Pre): string[] {
  const m: string[] = [];
  if (!passportOk(p)) m.push('a passport valid long enough');
  if (!p.invite) m.push('the invitation');
  if (!p.hiv) m.push('the HIV certificate'); if (!p.insurance) m.push('health insurance'); if (!p.photo) m.push('a photo');
  if (!p.form) m.push('the application form');
  return m;
}
/** The officer's questions at the appointment; the right answer is the one that agrees with the documents. */
export const QUESTIONS: { q: string; ru: string; a: { t: string; ru: string; ok: boolean }[] }[] = [
  { q: 'Why are you going to Russia?', ru: 'Зачем вы едете в Россию?', a: [{ t: 'To study at the university that invited me.', ru: 'Учиться в университете, который меня пригласил.', ok: true }, { t: 'To look for work, and maybe study later.', ru: 'Искать работу, а учиться, может, потом.', ok: false }, { t: 'Tourism. I will see.', ru: 'Туризм. Там посмотрю.', ok: false }] },
  { q: 'Where will you study, and what?', ru: 'Где и чему вы будете учиться?', a: [{ t: 'Kazan Federal University: first a preparatory year of Russian.', ru: 'Казанский федеральный университет: сначала подготовительный год русского.', ok: true }, { t: 'In Moscow, somewhere.', ru: 'В Москве, где-нибудь.', ok: false }, { t: 'I do not remember the name.', ru: 'Не помню названия.', ok: false }] },
  { q: 'Who pays for your studies and your life there?', ru: 'Кто платит за учёбу и жизнь?', a: [{ t: 'A government quota covers the studies; my family sends money for living.', ru: 'Учёбу оплачивает квота, на жизнь присылает семья.', ok: true }, { t: 'I will work there.', ru: 'Буду работать там.', ok: false }, { t: 'Nobody yet.', ru: 'Пока никто.', ok: false }] },
  { q: 'Where will you live?', ru: 'Где вы будете жить?', a: [{ t: 'In the university dormitory; the university registers me.', ru: 'В общежитии университета, регистрирует университет.', ok: true }, { t: 'With friends, I do not know where.', ru: 'У друзей, не знаю где.', ok: false }, { t: 'In a hotel for a few days.', ru: 'Несколько дней в гостинице.', ok: false }] },
  { q: 'When do your classes start?', ru: 'Когда начинаются занятия?', a: [{ t: 'On the first of September.', ru: 'Первого сентября.', ok: true }, { t: 'In winter, I think.', ru: 'Зимой, кажется.', ok: false }, { t: 'Whenever I arrive.', ru: 'Когда приеду.', ok: false }] },
];
/** The three questions asked on this try. */
export const questionsFor = (p: Pre): number[] => { const a = hash(`q|${p.country}|${p.tries}`) % QUESTIONS.length; return [a, (a + 2) % QUESTIONS.length, (a + 4) % QUESTIONS.length]; };

/** The appointment itself: on the booked day, every document, a correct form, and answers that agree with them. `answers` are the chosen answer for
    each of the three questions. A form that says the wrong thing is sent back; answers that contradict the documents (work or tourism instead of
    study) are a refusal, and a new application only after 30 days. */
export function attend(s: State, p: Pre, answers: number[], urgent: boolean): Result {
  if (p.appt === null) return no('Book an appointment first.');
  if (p.t !== p.appt) return no(`Your appointment is on ${dayName(p.appt)}.`);
  p.tries++; p.appt = null;
  const miss = missing(s, p); if (miss.length) return { ok: false, msg: note(p, `Sent home: you came without ${miss.join(', ')}. Book again when you have everything.`).msg };
  const bad = formProblems(s, p, p.form!); if (bad.length) { p.form = null; return { ok: false, msg: note(p, `The officer gives the form back: ${bad.join('; ')}. Fill it in again and book a new day.`).msg }; }
  const qs = questionsFor({ ...p, tries: p.tries - 1 }), right = qs.filter((q, i) => QUESTIONS[q].a[answers[i]]?.ok).length;
  const lied = qs.some((q, i) => { const a = QUESTIONS[q].a[answers[i]]; return !!a && !a.ok && /work|Tourism/i.test(a.t); });
  if (lied || right < 2) { p.form = null; p.refusedUntil = p.t + DAYS.refused; return { ok: false, msg: note(p, `Refused: the answers do not agree with a study visa. You may apply again from day ${p.refusedUntil + 1}. The fees were not taken.`).msg }; }
  const fee = (urgent ? PRICES.consularFast : PRICES.consular) + PRICES.centre; pay(p, fee);
  p.urgent = urgent; p.decision = p.t + (urgent ? DAYS.decisionFast : DAYS.decision);
  return note(p, `Documents accepted, fingerprints and photo taken, ${fmt(fee)} ₽ paid. The decision is expected in ${urgent ? DAYS.decisionFast : DAYS.decision} days.`);
}
export const decided = (p: Pre): boolean => p.decision !== null && p.t >= p.decision;
/** Collecting the passport with the visa. A careful person checks the sticker at the counter; a mistake is fixed in three days. */
export function collect(p: Pre, check: boolean): Result {
  if (!decided(p)) return no(p.decision === null ? 'The consulate has nothing of yours yet.' : `The decision is expected on day ${p.decision + 1}.`);
  if (p.collected) return no('You have your passport with the visa.');
  p.collected = true; p.checked = check;
  if (check && p.typo) { p.typo = false; p.t += DAYS.fix; tick(p); return note(p, 'You checked the visa at the counter: one letter of your name was wrong. They printed a new one in three days, free of charge.'); }
  return note(p, check ? 'The visa is right: your name, single entry, study, from your entry date for 90 days.' : 'You took the passport without looking at the visa.');
}

/** The tickets on offer: by plane (through a hub for most countries: there are no direct flights from most of Europe) and, for Central Asia, the train. */
export function ticketsFor(s: State, p: Pre): Ticket[] {
  const c = countryByCode(p.country), region = c?.region ?? 'Asia', to = s.city;
  const base = region === 'CIS' ? 16000 : region === 'Europe' ? 42000 : region === 'Asia' ? 38000 : region === 'Africa' ? 62000 : region === 'Americas' ? 85000 : 105000;
  const via = region === 'CIS' ? '' : region === 'Africa' ? ' via Istanbul' : region === 'Americas' ? ' via Istanbul' : region === 'Europe' ? ' via Istanbul or Belgrade' : ' via Dubai';
  const from = c?.en ?? s.home, start = p.t + 2, out: Ticket[] = [];
  const earliest = p.track === 'study' && p.form ? Math.max(start, p.form.entry) : start;
  for (const [k, lead, mult] of [['a', 0, 1.35], ['b', 7, 1], ['c', 14, 0.85]] as const) {
    const day = earliest + lead;
    out.push({ id: `plane-${k}`, label: `${from} → ${to}${via}`, day, price: Math.round(base * mult / 100) * 100, mode: 'plane', hours: region === 'CIS' ? 5 : region === 'Europe' ? 9 : region === 'Africa' ? 14 : region === 'Americas' ? 22 : 12 });
  }
  if (p.country === 'TJ' || p.country === 'UZ' || p.country === 'KG' || p.country === 'KZ') out.push({ id: 'train', label: `${from} → ${to}, the train through Kazakhstan (about four days)`, day: earliest + 3, price: 9000, mode: 'train', hours: 96 });
  return out;
}
/** Can the character go now? The reasons, in order. */
export function readyToGo(s: State, p: Pre): string[] {
  const r: string[] = [];
  if (!p.country) r.push('choose your country');
  if (!passportOk(p)) r.push('a valid passport');
  if (p.track === 'study' && !p.collected) r.push('the visa in your passport');
  if (p.track === 'study_free' && !p.invite) r.push('the letter of admission');
  return r;
}
export function buyTicket(s: State, p: Pre, id: string): Result {
  const why = readyToGo(s, p); if (why.length) return no(`Before a ticket: ${why.join(', ')}.`);
  const t = ticketsFor(s, p).find(x => x.id === id); if (!t) return no('No such ticket.');
  if (p.ticket) p.spent -= Math.round(p.ticket.price * 0.75);                 // changing a ticket: a quarter of the old one is lost
  pay(p, t.price); p.ticket = t;
  return note(p, `Ticket bought: ${t.label}, ${dayName(t.day)}, ${fmt(t.price)} ₽.`);
}

/** What the trip normally costs: the cheap but not the cheapest way, without mistakes. The difference from what was spent goes into the money. */
export function expectedCost(s: State, p: Pre): number {
  const t = ticketsFor(s, p).find(x => x.id === 'plane-b')!.price;
  if (p.track === 'study') return PRICES.hiv + PRICES.insurance + PRICES.photo + PRICES.consular + PRICES.centre + t;
  return t;
}
/** Departure and arrival: the border, the migration card (the purpose must be the right one), and the first day in Russia begins. */
export function arrive(s: State, card: Purpose): Result {
  const p = preOf(s); if (!p) return no('Not preparing.');
  if (!p.ticket) return no('Buy a ticket first.');
  if (p.t < p.ticket.day) waitUntil(p, p.ticket.day);
  p.card = card; p.done = true;
  const lines: string[] = [];
  const delta = expectedCost(s, p) - p.spent;
  s.money = Math.max(3000, s.money + delta);
  lines.push(delta === 0 ? 'The preparation cost what it usually costs.' : delta > 0 ? `The preparation cost ${fmt(delta)} ₽ less than usual: you keep it.` : `The preparation cost ${fmt(-delta)} ₽ more than usual.`);
  if (p.track === 'study') { s.docs.visa = 90; lines.push('A single-entry study visa for 90 days: the university will extend it.'); }
  if (p.typo && !p.checked) { s.stress = Math.min(100, s.stress + 10); lines.push('At passport control the officer noticed a letter of your name wrong on the visa. An hour of questions, then a stamp. Fix it at the university.'); }
  const want: Purpose = p.track === 'study' || p.track === 'study_free' ? 'study' : 'work';
  if (card !== want) {
    if (want === 'work') { s.money = Math.max(0, s.money - 12000); s.stress = Math.min(100, s.stress + 12); lines.push('You wrote another purpose than "work" on the migration card. A patent is only given with "work": you had to leave the country and enter again (12,000 ₽, two lost days).'); }
    else { s.strikes++; lines.push('The migration card says another purpose than your visa. The university\'s migration officer makes you correct it, with a warning.'); }
  }
  if (p.t > LEAD && (p.track === 'study' || p.track === 'study_free')) { s.rep = Math.max(0, s.rep - 5); s.stress = Math.min(100, s.stress + 6); lines.push(`You arrived ${p.t - LEAD} days after classes began.`); }
  if (p.course) lines.push('The pre-departure course helps: you know which office is which.');
  p.log.unshift(`Arrived in ${s.city}.`);
  s.log.unshift({ day: s.day, text: `Arrived in Russia after ${p.t} days of preparation at home.` });
  return { ok: true, msg: lines.join(' ') };
}
