/* Cyber life (round 151): the frauds people in Russia actually meet in 2025–2026, the real ways to protect oneself, and a career in information security.
   - Scenes that come up in ordinary life: "your mobile contract expires", "confirm your doctor's appointment", "vote for my niece", a "walking courier" job that
     is really a dropper's, a relative's cloned voice, a viewing fee for a flat that does not exist, a QR code on a parking meter, a leak of your password,
     a phishing letter at work, a university CTF, a bug found in a shop's site — and the state's own tools: the self-ban on loans (Gosuslugi, since 1 March 2025),
     the "second hand" trusted person (banks, since 1 September 2025), the self-ban on SIM contracts, two-step login.
   - "Scam or not?": a daily round of five messages in the Cyber app; each answer explains the sign that gives the trick away.
   - Protections switched on in the app make the traps in the scenes harmless.
   - A job: information-security analyst (SOC), with its own workday scenes.
   Facts are taken from the Bank of Russia, the MVD and the laws themselves (docs/research/cyber-facts.md). Loaded on demand: it is not in the first download.
   Pure game rules over the state; the words are in English and Russian. */
import * as G from './engine';
import type { State, Outcome, Effects, Choice } from './engine';
import { lang } from './i18n';

const ru = (): boolean => lang() === 'ru';
const tr = (en: string, r: string): string => (ru() ? r : en);
const O = (en: string, r: string, fx: Effects = {}): Outcome => ({ msg: tr(en, r), fx });

/* ---------- the player's cyber book ---------- */
export type ProtId = 'selfban' | 'trusted' | 'twofa' | 'simban' | 'passwords' | 'updates';
export interface CyberBook { xp: number; spotted: number; fooled: number; rounds: number; best: number; day: number; done: number[]; score: number; shield: Partial<Record<ProtId, number>> }
type S = State & { cyber?: CyberBook };
export function cyberOf(s: State): CyberBook {
  const x = s as S;
  if (!x.cyber || typeof x.cyber !== 'object' || typeof x.cyber.shield !== 'object') x.cyber = { xp: 0, spotted: 0, fooled: 0, rounds: 0, best: 0, day: -1, done: [], score: 0, shield: {} };
  return x.cyber;
}
export const shielded = (s: State, id: ProtId): boolean => (s as S).cyber?.shield?.[id] !== undefined;
export const LEVELS: [number, string, string][] = [[0, 'Beginner', 'Новичок'], [40, 'Careful', 'Внимательный'], [120, 'Hard to fool', 'Не проведёшь'], [260, 'Cyber-hygienist', 'Кибергигиенист'], [480, 'Cyber defender', 'Киберзащитник']];
export function levelOf(s: State): { n: number; name: string; next: number | null } {
  const xp = (s as S).cyber?.xp ?? 0; let n = 0; LEVELS.forEach((l, i) => { if (xp >= l[0]) n = i; });
  return { n, name: ru() ? LEVELS[n][2] : LEVELS[n][1], next: n + 1 < LEVELS.length ? LEVELS[n + 1][0] : null };
}

/* ---------- protections: the real tools ---------- */
export interface Protection { id: ProtId; icon: string; en: string; ru: string; how: string; howRu: string; cost: number; energy: number }
export const PROTECTIONS: Protection[] = [
  { id: 'selfban', icon: '🚫', en: 'Self-ban on loans', ru: 'Самозапрет на кредиты', cost: 0, energy: 3,
    how: 'Set on Gosuslugi (since 1 March 2025) or at an MFC, free. Banks and microfinance firms cannot give you a loan remotely; lifting it takes effect only on the second day.',
    howRu: 'Ставится на Госуслугах (с 1 марта 2025 года) или в МФЦ, бесплатно. Банки и МФО не выдадут вам кредит дистанционно; снятие вступает в силу только на второй день.' },
  { id: 'trusted', icon: '🤝', en: 'A trusted person ("second hand")', ru: 'Доверенное лицо («вторая рука»)', cost: 0, energy: 3,
    how: 'Since 1 September 2025 your bank lets you name a trusted person who must confirm big transfers within 12 hours; they never get access to your money.',
    howRu: 'С 1 сентября 2025 года банк позволяет назначить доверенное лицо, которое подтверждает крупные переводы в течение 12 часов; доступа к вашим деньгам у него нет.' },
  { id: 'twofa', icon: '🔐', en: 'Two-step login on Gosuslugi', ru: 'Двухэтапный вход на Госуслугах', cost: 0, energy: 2,
    how: 'A second step (an app code is safer than SMS) keeps the account yours even if the password leaks. Never tell anyone a code.',
    howRu: 'Второй шаг (код из приложения надёжнее СМС) сохраняет аккаунт, даже если пароль утёк. Никому не называйте коды.' },
  { id: 'simban', icon: '📵', en: 'Self-ban on SIM contracts', ru: 'Самозапрет на договоры связи', cost: 0, energy: 3,
    how: 'Since 1 September 2025 you can forbid SIM contracts without your personal visit (Gosuslugi or MFC); it is lifted only in person at an MFC.',
    howRu: 'С 1 сентября 2025 года можно запретить оформлять сим-карты без вашего личного присутствия (Госуслуги или МФЦ); снять — только лично в МФЦ.' },
  { id: 'passwords', icon: '🗝️', en: 'Different passwords and a password manager', ru: 'Разные пароли и менеджер паролей', cost: 0, energy: 4,
    how: 'One leaked password then opens one door, not all of them.', howRu: 'Тогда утёкший пароль открывает одну дверь, а не все.' },
  { id: 'updates', icon: '🔄', en: 'Updates, and apps only from the official store', ru: 'Обновления и приложения только из официального магазина', cost: 0, energy: 2,
    how: 'A "bank app update" sent by a link is malware that gives strangers remote access to your phone.', howRu: '«Обновление банка» по ссылке — это вирус, дающий чужим удалённый доступ к телефону.' },
];
export function protect(s: State, id: ProtId): { ok: boolean; msg: string } {
  const p = PROTECTIONS.find(x => x.id === id); if (!p) return { ok: false, msg: tr('There is no such protection.', 'Такой защиты нет.') };
  const b = cyberOf(s); if (b.shield[id] !== undefined) return { ok: false, msg: tr('Already switched on.', 'Уже включено.') };
  if (s.energy < p.energy) return { ok: false, msg: tr('Too tired to sort it out now.', 'Слишком устали, чтобы разбираться сейчас.') };
  if (id === 'trusted' && !Object.values(s.bank).some(Boolean)) return { ok: false, msg: tr('You need a bank account first.', 'Сначала нужен счёт в банке.') };
  b.shield[id] = s.day; s.energy -= p.energy; b.xp += 10; s.know = G.clamp(s.know + 1, 0, 100);
  return { ok: true, msg: `${p.icon} ${tr(p.en, p.ru)}: ${tr('switched on.', 'включено.')} ${tr(p.how, p.howRu)}` };
}

/* ---------- "Scam or not?" ---------- */
export interface Msg { ch: 'sms' | 'call' | 'chat' | 'mail' | 'web' | 'qr'; from: string; en: string; ru: string; scam: boolean; sign: string; signRu: string }
export const MESSAGES: Msg[] = [
  { ch: 'call', from: '+7 9xx …', scam: true, en: '"Your contract with the mobile operator expires today. Tell me the code from the SMS to extend it."', ru: '«Ваш договор с оператором связи истекает сегодня. Назовите код из СМС, чтобы продлить».', sign: 'Contracts do not expire like this, and the code logs strangers into your Gosuslugi.', signRu: 'Договоры так не истекают, а код открывает чужим ваши Госуслуги.' },
  { ch: 'call', from: 'Bank security', scam: true, en: '"Your money is under attack. Move it to a safe account right now and tell no one."', ru: '«Ваши деньги под угрозой. Срочно переведите их на безопасный счёт и никому не говорите».', sign: 'The Bank of Russia says plainly: "safe accounts" do not exist. Urgency and secrecy are the tell.', signRu: 'Банк России прямо говорит: «безопасных счетов» не существует. Срочность и тайна — главный признак.' },
  { ch: 'sms', from: 'Gosuslugi', scam: false, en: 'Code 4821 to sign in to Gosuslugi. Do not tell it to anyone, not even an employee.', ru: 'Код 4821 для входа на Госуслуги. Никому его не сообщайте, даже сотруднику.', sign: 'A real service message: it gives a code you asked for and warns never to share it.', signRu: 'Настоящее сообщение: код, который вы запросили сами, и предупреждение никому его не говорить.' },
  { ch: 'call', from: 'Polyclinic', scam: true, en: '"We are moving your record to the new electronic medical card. Confirm with the code from the SMS."', ru: '«Переводим вас на электронную медкарту. Подтвердите кодом из СМС».', sign: 'No clinic needs a code for this. The code is for your Gosuslugi account.', signRu: 'Поликлинике для этого не нужен код. Код — от вашего аккаунта Госуслуг.' },
  { ch: 'chat', from: 'Aunt Galya', scam: true, en: '"Vote for my niece in the drawing contest, please! Just sign in with Telegram on the page."', ru: '«Проголосуй за мою племянницу в конкурсе рисунков! Там надо войти через Телеграм».', sign: 'The page steals your Telegram: the "login" links a stranger\'s device to your account. Ask your aunt by phone.', signRu: 'Страница угоняет Телеграм: «вход» привязывает чужое устройство к вашему аккаунту. Позвоните тёте.' },
  { ch: 'chat', from: '"Director" (new number)', scam: true, en: '"The FSB will call you about our company. Cooperate fully and do not tell colleagues."', ru: '«Вам позвонят из ФСБ насчёт нашей компании. Сотрудничайте и не говорите коллегам».', sign: 'The "fake boss": a new account with the boss\'s photo. Call the real director on the number you have.', signRu: '«Фейкбосс»: новый аккаунт с фото начальника. Позвоните настоящему директору по известному номеру.' },
  { ch: 'call', from: 'Your son (voice)', scam: true, en: '"Mum, I had an accident, I need money now, a man will come for it — don\'t call me back."', ru: '«Мама, я попал в аварию, срочно нужны деньги, за ними приедет человек — не перезванивай».', sign: 'Voices can be cloned with AI. Hang up and call your relative on the number you know.', signRu: 'Голос можно подделать нейросетью. Положите трубку и позвоните родственнику по известному номеру.' },
  { ch: 'sms', from: 'Courier', scam: true, en: 'Your parcel is waiting. Confirm the address and pay 49 ₽ for delivery: pochta-dostavka.top', ru: 'Ваша посылка ждёт. Подтвердите адрес и оплатите доставку 49 ₽: pochta-dostavka.top', sign: 'A small payment on an odd address is for stealing your card details. Check tracking in the official app.', signRu: 'Мелкая оплата по странному адресу нужна, чтобы украсть данные карты. Проверьте трек в официальном приложении.' },
  { ch: 'chat', from: 'Job chat', scam: true, en: '"Walking courier wanted, 5,000 ₽ a day: collect packages from pensioners and pay the cash into a card."', ru: '«Требуется пеший курьер, 5000 ₽ в день: забирать пакеты у пенсионеров и вносить деньги на карту».', sign: 'This is how fraudsters recruit cash couriers: it is complicity in fraud (art. 159), not a job.', signRu: 'Так вербуют курьеров мошенников: это соучастие в мошенничестве (ст. 159), а не работа.' },
  { ch: 'chat', from: 'Acquaintance', scam: true, en: '"Lend me your card for a week — money will come in, you pass it on and keep 10%."', ru: '«Дай карту на неделю — придут деньги, перекинешь дальше и оставишь себе 10%».', sign: 'That is a dropper. Since 5 July 2025 handing over your card for gain is a crime (art. 187): up to 3 years.', signRu: 'Это дропперство. С 5 июля 2025 года передача карты за вознаграждение — преступление (ст. 187): до 3 лет.' },
  { ch: 'web', from: 'Rental ad', scam: true, en: 'Two-room flat in the centre for half the usual price. Pay a 3,000 ₽ "viewing fee" first; the owner is abroad.', ru: 'Двушка в центре за полцены. Сначала «плата за просмотр» 3000 ₽; хозяин за границей.', sign: 'Too cheap, an owner who cannot meet, money before the viewing: a flat that does not exist.', signRu: 'Слишком дёшево, хозяин недоступен, деньги до просмотра — квартиры не существует.' },
  { ch: 'qr', from: 'Parking meter', scam: true, en: 'A sticker with a QR code on the parking meter: "Pay for parking here".', ru: 'Наклейка с QR-кодом на паркомате: «Оплатить парковку здесь».', sign: 'Stickers over the official code lead to fake payment pages. Use the official app or the meter.', signRu: 'Наклейки поверх официального кода ведут на поддельные страницы оплаты. Платите через официальное приложение.' },
  { ch: 'chat', from: 'Investments', scam: true, en: '"Guaranteed 30% a month. Our trader works on the exchange for you. Places are limited!"', ru: '«Гарантированные 30% в месяц. Трейдер работает на бирже за вас. Мест мало!»', sign: 'Guaranteed high returns do not exist; fake brokers now also pull people into dropper schemes.', signRu: 'Гарантированной высокой доходности не бывает; лжеброкеры ещё и втягивают людей в схемы дропперов.' },
  { ch: 'sms', from: 'Your bank', scam: false, en: 'A transfer of 25,000 ₽ was paused for 2 days: the recipient is in the Bank of Russia database of fraud. Call the number on your card.', ru: 'Перевод 25 000 ₽ приостановлен на 2 дня: получатель в базе Банка России о мошенничестве. Позвоните по номеру на карте.', sign: 'A real rule since 25 July 2024: banks pause transfers to accounts in the fraud database.', signRu: 'Настоящее правило с 25 июля 2024 года: банки приостанавливают переводы на счета из базы мошенников.' },
  { ch: 'mail', from: 'hr-bonus@company-pay.net', scam: true, en: 'Dear colleague, your annual bonus is in the attached file "Bonus_2026.exe".', ru: 'Уважаемый коллега, ваша годовая премия — во вложении «Premiya_2026.exe».', sign: 'A strange sender domain and a program in the attachment: phishing. Report it to the security team.', signRu: 'Чужой домен отправителя и программа во вложении — фишинг. Сообщите в службу безопасности.' },
  { ch: 'sms', from: 'Operator', scam: false, en: 'Incoming call from "Bank. Credit offers" — the name of the company is shown because the call is labelled.', ru: 'Входящий звонок «Банк. Кредитные предложения» — название показано, потому что звонок маркирован.', sign: 'Since 1 September 2025 calls from companies are labelled with the name. Unlabelled "banks" are suspicious.', signRu: 'С 1 сентября 2025 года звонки организаций маркируются названием. «Банк» без маркировки — повод насторожиться.' },
  { ch: 'call', from: '"Investigator"', scam: true, en: '"A loan was taken in your name. To cancel it, take a new loan yourself and give the cash to our courier."', ru: '«На вас оформлен кредит. Чтобы его аннулировать, возьмите встречный и передайте наличные курьеру».', sign: 'Police do not cancel loans by phone or collect cash. Hang up and call 102.', signRu: 'Полиция не отменяет кредиты по телефону и не забирает наличные. Положите трубку и звоните 102.' },
  { ch: 'web', from: 'Marketplace', scam: true, en: 'The seller asks to continue in a messenger and pay by a direct card transfer "for a discount".', ru: 'Продавец просит перейти в мессенджер и оплатить переводом на карту «со скидкой».', sign: 'Off the platform there is no protection of the deal. Pay only inside the marketplace.', signRu: 'Вне площадки сделка не защищена. Платите только внутри маркетплейса.' },
  { ch: 'sms', from: 'Gosuslugi', scam: false, en: 'You set a self-ban on loans. It is in force from tomorrow. If it was not you, contact an MFC.', ru: 'Вы установили самозапрет на кредиты. Он действует с завтрашнего дня. Если это были не вы, обратитесь в МФЦ.', sign: 'A normal notice of a protection you switched on yourself.', signRu: 'Обычное уведомление о защите, которую вы включили сами.' },
  { ch: 'chat', from: 'Seller on Avito', scam: true, en: '"I will send the parcel with delivery — fill in your card on this page to receive the money".', ru: '«Отправлю с доставкой — введите карту на этой странице, чтобы получить деньги».', sign: 'To receive money nobody needs the expiry date and CVV. A fake "safe deal" page.', signRu: 'Чтобы получить деньги, не нужны срок действия и CVV. Это поддельная страница «безопасной сделки».' },
  { ch: 'call', from: 'Bank (labelled)', scam: false, en: 'Your bank calls back after you asked a question in the app, and asks nothing secret.', ru: 'Банк перезванивает после вашего вопроса в приложении и не спрашивает ничего секретного.', sign: 'A call you expected, labelled, with no codes, passwords or transfers asked: fine.', signRu: 'Ожидаемый маркированный звонок без кодов, паролей и переводов — всё в порядке.' },
  { ch: 'sms', from: 'Unknown', scam: true, en: 'Your Gosuslugi account was accessed from a new device. If it was not you, call 8-800-xxx-xx-xx.', ru: 'В ваш аккаунт Госуслуг вошли с нового устройства. Если это не вы, позвоните 8-800-xxx-xx-xx.', sign: 'The number in the text belongs to fraudsters. Check the account yourself in the official app.', signRu: 'Номер в тексте — мошеннический. Проверьте аккаунт сами в официальном приложении.' },
  { ch: 'chat', from: 'Fellow student', scam: true, en: '"Sell me your account on the university portal for 2,000 ₽, I only need it for a few days."', ru: '«Продай аккаунт на портале вуза за 2000 ₽, мне только на пару дней».', sign: 'Accounts and SIM cards are not for sale: they are used for fraud in your name. Passing a SIM to others is fined since 2025.', signRu: 'Аккаунты и сим-карты не продают: через них мошенничают от вашего имени. За передачу сим-карты с 2025 года штраф.' },
  { ch: 'mail', from: 'University', scam: false, en: 'The faculty invites students to a CTF competition on Saturday: teams of up to five, registration on the official site.', ru: 'Факультет приглашает на соревнования CTF в субботу: команды до пяти человек, регистрация на официальном сайте.', sign: 'A normal invitation: no money, codes or files asked for.', signRu: 'Обычное приглашение: не просят ни денег, ни кодов, ни файлов.' },
];
const seeded = (seed: number): (() => number) => { let x = seed >>> 0 || 1; return () => { x = (Math.imul(x ^ (x >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return (x >>> 8) / 16777216; }; };
/** Today's five messages (the same all day). */
export function todaysRound(s: State): number[] {
  const r = seeded(s.day * 7919 + s.name.length * 31), pool = MESSAGES.map((_, i) => i), out: number[] = [];
  while (out.length < 5) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}
/** Answers one message of today's round: right answers give experience; the round, once complete, pays a little knowledge once a day. */
export function answer(s: State, idx: number, saysScam: boolean): { right: boolean; sign: string; finished: boolean; msg: string } {
  const b = cyberOf(s), m = MESSAGES[idx], round = todaysRound(s);
  if (b.day !== s.day) { b.day = s.day; b.done = []; b.score = 0; }
  if (!round.includes(idx) || b.done.includes(idx)) return { right: false, sign: '', finished: b.done.length >= 5, msg: tr('That message is not in today\'s round.', 'Этого сообщения нет в сегодняшнем раунде.') };
  const right = saysScam === m.scam; b.done.push(idx);
  if (right) { b.score++; b.xp += 8; if (m.scam) b.spotted++; } else if (m.scam) b.fooled++;
  const finished = b.done.length >= 5; let msg = '';
  if (finished) { b.rounds++; b.best = Math.max(b.best, b.score); if (G.firstToday(s, 'cyber-quiz')) { s.know = G.clamp(s.know + (b.score >= 4 ? 2 : 1), 0, 100); s.stress = G.clamp(s.stress - 2, 0, 100); } msg = tr(`Round over: ${b.score} of 5.`, `Раунд окончен: ${b.score} из 5.`); }
  return { right, sign: tr(m.sign, m.signRu), finished, msg };
}

/* ---------- the job ---------- */
export const CYBER_JOB = { id: 'infosec', name: 'Information security analyst (SOC)', pay: 8800, energy: 14, stress: 12, line: 'Night alerts, phishing letters and logs: you keep the company safe.', min: 55 };

/* ---------- scenes ---------- */
const hasBank = (s: State): boolean => Object.values(s.bank).some(Boolean);
const foreign = (s: State): boolean => s.status !== 'citizen';
const capLoss = (s: State, n: number): number => -Math.min(n, Math.max(300, Math.floor(Math.max(0, s.money) * 0.6)));
type Pick = [en: string, ru: string, r: (s: State) => Outcome];
/** A cyber scene: English and Russian title and text, and choices that answer in the player's language. */
function C(id: string, cat: string, w: number, req: ((s: State) => boolean) | undefined, title: [string, string], text: [string, string], picks: Pick[]): void {
  G.S({ id: `cy-${id}`, cat, w, req, title: title[0], text: text[0], choices: picks.map(p => ({ t: p[0], r: p[2] })),
    build: s => { void s; return { title: tr(...title), text: tr(...text), choices: picks.map((p): Choice => ({ t: tr(p[0], p[1]), r: p[2] })) } as { text: string; choices: Choice[] }; } });
}
let registered = false;
/** Adds the cyber scenes and the job to the game (once). */
export function registerCyber(): void {
  if (registered) return; registered = true;
  C('contract', 'life', 0.8, undefined, ['"Your mobile contract expires"', '«Ваш договор со связью истекает»'], ['A polite voice says your SIM contract ends today and you will lose the number unless you read out the code they are sending.', 'Вежливый голос сообщает, что договор на сим-карту истекает сегодня и номер пропадёт, если не назвать код из СМС.'], [
    ['Read out the code', 'Назвать код', s => shielded(s, 'twofa') ? O('The code alone is not enough: your two-step login stops them. You hang up and change the password anyway.', 'Одного кода мало: двухэтапный вход их остановил. Вы кладёте трубку и всё равно меняете пароль.', { stress: 4, know: 2 })
      : O('The code was for your Gosuslugi. By evening there is a loan application in your name and a week of calls to undo it.', 'Это был код от Госуслуг. К вечеру на вас подана заявка на кредит, и неделя уходит на звонки.', { money: capLoss(s, 5000), stress: 18, know: 3, energy: -10 })],
    ['Hang up and check in the operator\'s app', 'Положить трубку и проверить в приложении оператора', () => O('Your contract has no end date. You block the number.', 'У договора нет срока окончания. Вы блокируете номер.', { know: 2, stress: -2 })]]);
  C('doctor', 'health', 0.7, undefined, ['"Confirm your doctor\'s appointment"', '«Подтвердите запись к врачу»'], ['A call "from the polyclinic": your check-up is booked, just confirm it with the code from an SMS.', 'Звонок «из поликлиники»: вы записаны на диспансеризацию, осталось подтвердить кодом из СМС.'], [
    ['Tell the code', 'Сказать код', s => shielded(s, 'twofa') ? O('Two-step login holds. The caller gets nothing.', 'Двухэтапный вход выдержал. Звонящий ничего не получил.', { stress: 3, know: 2 }) : O('Someone changes the phone number in your Gosuslugi. Getting the account back takes a trip to the MFC.', 'Кто-то меняет номер телефона в ваших Госуслугах. Чтобы вернуть аккаунт, приходится идти в МФЦ.', { stress: 15, energy: -12, know: 3 })],
    ['Say you will call the registry yourself', 'Сказать, что сами позвоните в регистратуру', () => O('The registry knows nothing about it. Clinics never ask for codes.', 'В регистратуре ничего не знают. Поликлиники коды не спрашивают.', { know: 2 })]]);
  C('niece', 'social', 0.7, undefined, ['"Vote for my niece!"', '«Проголосуй за племянницу!»'], ['A message from a friend\'s account: a link to a children\'s drawing contest where you vote by signing in with your messenger.', 'Сообщение с аккаунта знакомой: ссылка на конкурс детских рисунков, где голосуют, войдя через мессенджер.'], [
    ['Vote', 'Проголосовать', () => O('The "vote" linked a stranger\'s device to your account. Your contacts get the same link from you, and some get asked for money.', '«Голосование» привязало чужое устройство к вашему аккаунту. Вашим контактам уходит та же ссылка, у некоторых просят денег.', { stress: 14, rep: -3, know: 3 })],
    ['Call the friend first', 'Сначала позвонить знакомой', () => O('Her account was stolen an hour ago. You warn the group chat.', 'Её аккаунт украли час назад. Вы предупреждаете общий чат.', { know: 2, rep: 2, friends: 1 })]]);
  C('courier-job', 'work', 0.8, s => !s.job || s.money < 15000, ['A job as a "walking courier"', 'Работа «пешим курьером»'], ['A chat offers 5,000 ₽ a day: take packages from elderly people at their door and pay the cash into a card.', 'В чате предлагают 5000 ₽ в день: забирать пакеты у пожилых людей у двери и вносить наличные на карту.'], [
    ['Take the job', 'Согласиться', () => O('On the third day the police are waiting at the door. Cash couriers are charged as accomplices to fraud (art. 159 of the Criminal Code).', 'На третий день у двери ждёт полиция. Курьеров мошенников судят как соучастников мошенничества (ст. 159 УК РФ).', { strike: 1, stress: 30, rep: -10, know: 4, flag: 'cyDropper' })],
    ['Refuse and report the chat', 'Отказаться и пожаловаться на чат', () => O('You report the chat. A pensioner somewhere keeps her savings.', 'Вы жалуетесь на чат. Где-то пенсионерка сохранит свои сбережения.', { know: 3, rep: 2 })]]);
  C('card-rent', 'social', 0.7, hasBank, ['"Lend me your card"', '«Дай карту на время»'], ['An acquaintance offers 10% of whatever passes through your card if you lend it for a week.', 'Знакомый обещает 10% от всего, что пройдёт через вашу карту, если одолжить её на неделю.'], [
    ['Lend it', 'Одолжить', () => O('The card is blocked within days: your account is in the Bank of Russia database of droppers. Since 5 July 2025 this is a crime (art. 187), up to 3 years.', 'Через несколько дней карту блокируют: счёт попал в базу дропперов Банка России. С 5 июля 2025 года это преступление (ст. 187), до 3 лет.', { strike: 1, stress: 22, know: 4, flag: 'cyDropper', run: s => { for (const k of Object.keys(s.bank)) s.bank[k] = false; } })],
    ['Say no', 'Отказать', () => O('"Your loss," he says. Your card stays yours, and so does your name.', '«Как знаешь», — говорит он. Карта остаётся вашей, как и ваше имя.', { know: 2 })]]);
  C('voice', 'family', 0.6, undefined, ['A relative\'s voice', 'Голос родственника'], ['Your cousin\'s voice, crying: an accident, money is needed now, a man will come for it, do not call back.', 'Голос двоюродного брата, в слезах: авария, срочно нужны деньги, за ними приедет человек, не перезванивай.'], [
    ['Get the cash ready', 'Собрать наличные', s => shielded(s, 'trusted') && hasBank(s) ? O('Your trusted person refuses to confirm the withdrawal and calls you. The cousin is at home, fine.', 'Доверенное лицо не подтверждает снятие и звонит вам. Брат дома, всё хорошо.', { stress: 6, know: 3 }) : O('There was no accident. The voice was cloned from his videos.', 'Аварии не было. Голос подделали по его видео.', { money: capLoss(s, 20000), stress: 25, know: 4 })],
    ['Hang up and call him back', 'Положить трубку и перезвонить ему', () => O('He answers from his sofa. The voice was a deepfake.', 'Он отвечает с дивана. Голос был подделкой.', { know: 3, famLove: 1 })]]);
  C('rental', 'estate', 0.7, undefined, ['A flat at half the price', 'Квартира за полцены'], ['A lovely flat, half the usual rent. The owner is abroad and asks for a 3,000 ₽ "viewing fee" by transfer.', 'Отличная квартира за полцены. Хозяин за границей и просит перевести 3000 ₽ «за просмотр».'], [
    ['Pay the fee', 'Заплатить', s => O('The ad disappears with your money. The flat never existed.', 'Объявление исчезает вместе с деньгами. Квартиры не было.', { money: capLoss(s, 3000), stress: 10, know: 3 })],
    ['Ask to see it first', 'Попросить сначала показать', () => O('The "owner" stops answering. Money before a viewing is a classic trick.', '«Хозяин» пропадает. Деньги до просмотра — классическая уловка.', { know: 2 })]]);
  C('qr', 'life', 0.5, s => !!s.car || s.money > 20000, ['A QR code on the parking meter', 'QR-код на паркомате'], ['A sticker with a QR code: "pay for parking here".', 'Наклейка с QR-кодом: «оплатить парковку здесь».'], [
    ['Scan and pay', 'Отсканировать и оплатить', s => O('The page was fake: the card details went to strangers.', 'Страница была поддельной: данные карты ушли чужим.', { money: capLoss(s, 4000), stress: 10, know: 3 })],
    ['Pay in the official app', 'Оплатить в официальном приложении', () => O('The sticker was glued over the real code. You tell the parking office.', 'Наклейка была поверх настоящего кода. Вы сообщаете в администрацию парковок.', { know: 2 })]]);
  C('leak', 'life', 0.5, undefined, ['Your password in a leak', 'Ваш пароль в утечке'], ['A service warns that your e-mail and password were found in a leaked database.', 'Сервис предупреждает: ваша почта и пароль найдены в утёкшей базе.'], [
    ['Ignore it', 'Не обращать внимания', s => shielded(s, 'passwords') ? O('Your other accounts have their own passwords, so nothing else opens.', 'У других аккаунтов свои пароли, больше ничего не открывается.', { know: 2 }) : O('The same password opened your marketplace account; someone ordered with your saved card.', 'Этот же пароль открыл аккаунт на маркетплейсе; кто-то заказал по сохранённой карте.', { money: capLoss(s, 3500), stress: 12, know: 3 })],
    ['Change passwords and switch on two-step login', 'Сменить пароли и включить двухэтапный вход', s => { const b = cyberOf(s); b.shield.passwords ??= s.day; return O('Half an hour well spent.', 'Полчаса потрачены не зря.', { know: 3, energy: -4 }); }]]);
  C('phish-work', 'work', 0.8, s => !!s.job, ['A letter about your bonus', 'Письмо о премии'], ['At work: "Your annual bonus is in the attached file Bonus_2026.exe", from an unfamiliar address.', 'На работе: «Ваша годовая премия — во вложении Premiya_2026.exe», с незнакомого адреса.'], [
    ['Open the file', 'Открыть файл', () => O('The program encrypts the shared folder. The security team spends the night restoring it from backups.', 'Программа шифрует общую папку. Служба безопасности всю ночь восстанавливает её из резервных копий.', { rep: -6, stress: 15, know: 3 })],
    ['Forward it to the security team', 'Переслать в службу безопасности', () => O('The team blocks the sender for the whole company and thanks you.', 'Безопасники блокируют отправителя для всей компании и благодарят вас.', { rep: 4, know: 2, merit: 1 })]]);
  C('ctf', 'edu', 0.9, s => !!s.flags.admitted || s.know >= 50, ['A CTF competition', 'Соревнования CTF'], ['The university holds a capture-the-flag competition: teams solve security puzzles for a day.', 'В университете проходят соревнования CTF: команды весь день решают задачи по безопасности.'], [
    ['Join a team', 'Вступить в команду', s => s.know >= 60 ? O('Your team finishes in the top three. A security company hands you its card.', 'Ваша команда в тройке призёров. Компания по кибербезопасности даёт вам визитку.', { know: 5, rep: 4, money: 5000, energy: -20, flag: 'cyCtf' }) : O('You solve two tasks out of twelve and learn more than in a month of lectures.', 'Вы решаете две задачи из двенадцати и узнаёте больше, чем за месяц лекций.', { know: 4, energy: -18, stress: 4, flag: 'cyCtf' })],
    ['Not this time', 'Не в этот раз', () => O('Maybe next semester.', 'Может быть, в следующем семестре.', {})]]);
  C('bounty', 'work', 0.6, s => s.job === 'infosec' || s.know >= 75, ['A hole in a shop\'s website', 'Дыра на сайте магазина'], ['You notice that a shop\'s site shows other customers\' orders if you change one number in the address.', 'Вы замечаете, что сайт магазина показывает чужие заказы, если поменять одну цифру в адресе.'], [
    ['Report it through their bug bounty', 'Сообщить через программу баг-баунти', () => O('The shop fixes it within a day and pays a reward. Responsible disclosure is how professionals work.', 'Магазин исправляет ошибку за день и платит вознаграждение. Так работают профессионалы — ответственное раскрытие.', { money: 30000, know: 4, rep: 5 })],
    ['Download the customers\' data', 'Скачать данные покупателей', () => O('Illegal access to personal data is a crime (art. 272.1 of the Criminal Code, since December 2024). The shop\'s logs show who did it.', 'Незаконный доступ к персональным данным — преступление (ст. 272.1 УК РФ, с декабря 2024 года). В журналах магазина видно, кто это сделал.', { strike: 1, stress: 25, rep: -12 })]]);
  C('selfban', 'paper', 0.8, s => !shielded(s, 'selfban'), ['The self-ban on loans', 'Самозапрет на кредиты'], ['Gosuslugi suggests a free self-ban on loans: nobody, you included, can then take a loan remotely in your name.', 'Госуслуги предлагают бесплатный самозапрет на кредиты: тогда никто, даже вы, не сможет дистанционно взять кредит на ваше имя.'], [
    ['Set it', 'Установить', s => { cyberOf(s).shield.selfban = s.day; return O('Done in two minutes. Fraudsters who get your codes can no longer take a loan in your name.', 'Готово за две минуты. Мошенники с вашими кодами больше не возьмут кредит на ваше имя.', { know: 3, stress: -3 }); }],
    ['Later', 'Потом', () => O('You close the banner.', 'Вы закрываете баннер.', {})]]);
  C('trusted', 'bank', 0.7, s => hasBank(s) && !shielded(s, 'trusted'), ['A "second hand" for your account', '«Вторая рука» для счёта'], ['Your bank offers to name a trusted person who will confirm big transfers and cash withdrawals within 12 hours.', 'Банк предлагает назначить доверенное лицо, которое подтверждает крупные переводы и снятие наличных в течение 12 часов.'], [
    ['Name a family member', 'Назначить родственника', s => { cyberOf(s).shield.trusted = s.day; return O('Now a scammer who rushes you also has to rush your mother. That rarely works.', 'Теперь мошеннику придётся торопить ещё и вашу маму. Это редко получается.', { know: 3, famLove: 1 }); }],
    ['No, thanks', 'Нет, спасибо', () => O('Maybe one day.', 'Может, когда-нибудь.', {})]]);
  C('sim-papers', 'paper', 0.8, foreign, ['A SIM card "without papers"', 'Сим-карта «без документов»'], ['A man at the market sells SIM cards "already registered, no Gosuslugi needed".', 'На рынке продают сим-карты «уже оформленные, без всяких Госуслуг».'], [
    ['Buy one', 'Купить', () => O('Since 2025 a foreigner\'s SIM must be confirmed through Gosuslugi and biometrics, in person; this one is someone else\'s and is cut off within a week. Passing numbers to others is fined.', 'С 2025 года сим-карту иностранца подтверждают через Госуслуги и биометрию, лично; эта чужая и через неделю отключается. За передачу номера другим — штраф.', { money: -1500, stress: 10, know: 3 })],
    ['Do it properly at the operator\'s office', 'Оформить как положено в салоне оператора', () => O('Passport, Gosuslugi, a face scan: forty minutes, and the number is truly yours (at most 10 numbers for a foreigner).', 'Паспорт, Госуслуги, биометрия — сорок минут, и номер действительно ваш (иностранцу — не больше 10 номеров).', { know: 3, energy: -6 })]]);
  C('cooling', 'bank', 0.5, hasBank, ['A loan you did not want', 'Кредит, который вы не хотели'], ['After a long, frightening call you agreed to a 150,000 ₽ loan. The bank says the money arrives in four hours.', 'После долгого пугающего звонка вы согласились на кредит 150 000 ₽. Банк сообщает: деньги поступят через четыре часа.'], [
    ['Cancel it during the cooling-off period', 'Отказаться в период охлаждения', () => O('Since 1 September 2025 loans of 50–200 thousand are paid out only after 4 hours, so you can refuse without interest. You do.', 'С 1 сентября 2025 года кредиты от 50 до 200 тысяч выдаются только через 4 часа, и от них можно отказаться без процентов. Вы отказываетесь.', { know: 4, stress: -5 })],
    ['Let it go through and do what the caller says', 'Оставить и сделать, как велел звонивший', s => O('The money goes to a "safe account" that does not exist, and the loan stays with you.', 'Деньги уходят на несуществующий «безопасный счёт», а кредит остаётся на вас.', { money: capLoss(s, 25000), stress: 28, know: 4 })]]);
  // the job and its workdays
  if (!G.jobs.some(j => j.id === CYBER_JOB.id)) G.jobs.push({ ...CYBER_JOB });
  C('soc-night', 'work', 1.2, s => s.job === 'infosec', ['A night alert', 'Ночная тревога'], ['At 3 a.m. the monitoring shows an employee account logging in from two countries at once.', 'В 3 часа ночи мониторинг показывает вход в учётку сотрудника сразу из двух стран.'], [
    ['Block the account and wake the duty engineer', 'Заблокировать учётку и разбудить дежурного', () => O('It was a stolen password. You stopped it before anything left the company.', 'Пароль был украден. Вы остановили атаку раньше, чем что-то утекло.', { rep: 5, know: 3, energy: -8, merit: 1 })],
    ['Note it for the morning', 'Отметить до утра', () => O('By morning a customer database is on a forum. A hard meeting follows.', 'К утру клиентская база на форуме. Предстоит тяжёлое совещание.', { rep: -8, stress: 15 })]]);
  C('soc-pd', 'work', 1.0, s => s.job === 'infosec', ['Personal data in a spreadsheet', 'Персональные данные в таблице'], ['A manager keeps customers\' passport numbers in a spreadsheet shared with "anyone with the link".', 'Менеджер хранит паспортные данные клиентов в таблице, открытой «всем, у кого есть ссылка».'], [
    ['Close the access and explain 152-FZ', 'Закрыть доступ и объяснить 152-ФЗ', () => O('Personal data must be protected by law (152-FZ), and leaks now bring large fines. The manager thanks you, a little pale.', 'Персональные данные по закону (152-ФЗ) должны быть защищены, а за утечки теперь крупные штрафы. Менеджер, слегка побледнев, благодарит.', { rep: 4, know: 2 })],
    ['Leave it, it is not your table', 'Оставить, таблица не ваша', () => O('Two months later it turns up in a leak, with your company\'s name on it.', 'Через два месяца таблица всплывает в утечке с названием вашей компании.', { rep: -6, stress: 10 })]]);
  G.index();
}
/** Is this scene one of the cyber life's? */
export const isCyberScene = (id: string): boolean => id.startsWith('cy-');
