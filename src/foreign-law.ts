/* The rulebook for foreigners in Russia, in one place: entry and stay, registration, work, study, the ladder to residence and citizenship, offences and
   expulsion, and what a foreigner may demand. Each rule names the real law (115-FZ on the status of foreign citizens, 109-FZ on migration registration,
   KoAP, the EAEU treaty) and says in a line how the game uses it. These are GAME SUMMARIES, simplified: the figures and the deadlines change often, so
   every screen ends with "check the official source" and src/platform/citations.ts holds the links. Pure data and a few pure helpers over the state. */
import type { State } from './engine';
import * as G from './engine';

export type Topic = 'entry' | 'registration' | 'work' | 'study' | 'ladder' | 'offences' | 'rights' | 'life';
export type Who = 'all' | 'student' | 'migrant' | 'eaeu';
export interface Rule { id: string; topic: Topic; who: Who; law: string; en: string; ru: string; game: { en: string; ru: string } }

export const TOPICS: Record<Topic, { en: string; ru: string; icon: string }> = {
  entry: { en: 'Entry and stay', ru: 'Въезд и пребывание', icon: '🛂' }, registration: { en: 'Registration', ru: 'Учёт по месту пребывания', icon: '🏠' },
  work: { en: 'Work', ru: 'Работа', icon: '🧱' }, study: { en: 'Study', ru: 'Учёба', icon: '🎓' }, ladder: { en: 'Residence and citizenship', ru: 'Проживание и гражданство', icon: '📈' },
  offences: { en: 'Offences and expulsion', ru: 'Нарушения и выдворение', icon: '⚖️' }, rights: { en: 'Your rights', ru: 'Ваши права', icon: '🛡️' }, life: { en: 'Daily life', ru: 'Повседневная жизнь', icon: '🏙️' },
};

export const RULES: readonly Rule[] = [
  // entry and stay
  { id: 'visa-regime', topic: 'entry', who: 'all', law: '115-FZ art. 5, 25.1',
    en: 'Most foreign citizens need a visa to enter. Citizens of the CIS countries (and a few others) enter without one, but visa-free entry is not the right to work: that needs a patent or a permit.',
    ru: 'Большинству иностранцев для въезда нужна виза. Граждане стран СНГ (и ряда других государств) въезжают без визы, но безвизовый въезд — не право на работу: для неё нужен патент или разрешение.',
    game: { en: 'The pre-arrival track decides your visa: study, work or visa-free.', ru: 'Дорога до приезда задаёт вашу визу: учёба, работа или без визы.' } },
  { id: 'stay-90-180', topic: 'entry', who: 'all', law: '115-FZ art. 5',
    en: 'A foreigner may stay for up to 90 days in every 180 days, unless the visa, the treaty or a permit gives longer. EAEU citizens are not bound by this limit.',
    ru: 'Иностранец может находиться в России до 90 суток в течение каждых 180 суток, если виза, договор или разрешение не дают больше. Граждан ЕАЭС это ограничение не касается.',
    game: { en: 'Papers that run out are a "problem": raids, fines and strikes follow.', ru: 'Истёкшие бумаги — «проблема»: следуют рейды, штрафы и предупреждения.' } },
  { id: 'migration-card', topic: 'entry', who: 'all', law: '115-FZ art. 5; 109-FZ',
    en: 'At the border you get a migration card (or an electronic record). It shows the purpose of entry. Keep it for the whole stay: the police may ask for it with the passport.',
    ru: 'На границе выдаётся миграционная карта (или делается электронная запись). В ней указана цель въезда. Храните её весь срок: полиция может попросить её вместе с паспортом.',
    game: { en: 'The purpose you pick on arrival (study, work, private) shapes which papers you need.', ru: 'Цель, выбранная при приезде (учёба, работа, частная), определяет нужные бумаги.' } },
  { id: 'carry-papers', topic: 'entry', who: 'all', law: '115-FZ art. 5; Law on Police',
    en: 'A foreigner must have the passport, the migration card and the registration with them. A photo on the phone is not a document.',
    ru: 'Иностранец обязан иметь при себе паспорт, миграционную карту и подтверждение регистрации. Фото на телефоне документом не считается.',
    game: { en: 'Without them a police check costs a fine, time and a strike.', ru: 'Без них проверка полиции стоит штрафа, времени и предупреждения.' } },
  { id: 'passport-valid', topic: 'entry', who: 'all', law: '115-FZ art. 5',
    en: 'The passport must be valid for the whole planned stay; for a long visa, aim for at least a year and a half of validity.',
    ru: 'Паспорт должен действовать весь планируемый срок; для долгой визы лучше иметь запас в полтора года.',
    game: { en: 'The pre-arrival steps check the passport validity.', ru: 'Шаги до приезда проверяют срок действия паспорта.' } },
  // registration
  { id: 'reg-7', topic: 'registration', who: 'all', law: '109-FZ art. 20',
    en: 'You must be registered at the address where you stay within 7 working days of arrival. The host (landlord, hotel, university, employer) files the notice; you keep the slip.',
    ru: 'Вас должны поставить на учёт по адресу пребывания в течение 7 рабочих дней со дня приезда. Уведомление подаёт принимающая сторона (хозяин жилья, гостиница, вуз, работодатель); вы храните корешок.',
    game: { en: 'The registration counter in the papers app counts down; at zero you have no valid registration.', ru: 'Счётчик регистрации в бумагах идёт вниз; на нуле регистрации нет.' } },
  { id: 'reg-workers', topic: 'registration', who: 'eaeu', law: '109-FZ; EAEU Treaty',
    en: 'Longer terms apply to some workers: 15 days for citizens of Uzbekistan and Tajikistan with a work document, 30 days for EAEU workers, and 90 days for Belarusians.',
    ru: 'Для некоторых работников сроки дольше: 15 дней для граждан Узбекистана и Таджикистана с документом на работу, 30 дней для работников из ЕАЭС и 90 дней для белорусов.',
    game: { en: 'Your starting registration days depend on where you come from.', ru: 'Начальные дни регистрации зависят от вашей страны.' } },
  { id: 'reg-move', topic: 'registration', who: 'all', law: '109-FZ art. 20',
    en: 'When you move to a new address, you must be registered there again; the old registration does not travel with you. A registration "on paper" with no real living there is a crime for the host.',
    ru: 'При переезде нужно встать на учёт по новому адресу: старая регистрация не переносится. «Фиктивная» регистрация без проживания — уголовное дело для принимающей стороны.',
    game: { en: 'Moving flat resets the registration until you register at the new address.', ru: 'Переезд сбрасывает регистрацию, пока вы не встанете на учёт по новому адресу.' } },
  // work
  { id: 'patent', topic: 'work', who: 'migrant', law: '115-FZ art. 13.3; Tax Code 227.1',
    en: 'A citizen of a visa-free country works on a patent: you pass the exam in Russian, history and law, a medical exam and fingerprinting, buy insurance, then pay a fixed advance payment every month for the region. Keep the receipts.',
    ru: 'Гражданин безвизовой страны работает по патенту: сдаёт экзамен по русскому языку, истории и законодательству, проходит медосмотр и дактилоскопию, оформляет страховку и каждый месяц вносит фиксированный авансовый платёж за регион. Сохраняйте чеки.',
    game: { en: 'Working with no valid patent is a "problem": a raid ends in a fine and maybe expulsion.', ru: 'Работа без действующего патента — «проблема»: рейд заканчивается штрафом и, возможно, выдворением.' } },
  { id: 'patent-contract', topic: 'work', who: 'migrant', law: '115-FZ art. 13.3',
    en: 'With a patent you must sign a written employment contract and your employer must notify the Interior Ministry; after the deadline in the law the patent can be cancelled. The deadlines change, so check them.',
    ru: 'По патенту нужно заключить письменный трудовой договор, а работодатель обязан уведомить МВД; после срока, указанного в законе, патент могут аннулировать. Сроки меняются, проверяйте их.',
    game: { en: 'Jobs on the board say whether they are formal; informal jobs bring cheaper pay but raids.', ru: 'В вакансиях указано, оформлена ли работа: без оформления платят меньше, но грозят рейды.' } },
  { id: 'eaeu-work', topic: 'work', who: 'eaeu', law: 'EAEU Treaty art. 97',
    en: 'Citizens of EAEU countries (Armenia, Belarus, Kazakhstan, Kyrgyzstan) need no patent or work permit: they work under a contract, on the same terms as citizens for pay and social cover.',
    ru: 'Гражданам стран ЕАЭС (Армения, Беларусь, Казахстан, Киргизия) патент и разрешение на работу не нужны: они работают по договору, на равных с гражданами по оплате и соцзащите.',
    game: { en: 'EAEU starts have no patent step; only registration has a deadline.', ru: 'У стартов из ЕАЭС нет шага с патентом; срок есть только у регистрации.' } },
  { id: 'work-permit-hqs', topic: 'work', who: 'all', law: '115-FZ art. 13.2',
    en: 'Citizens of countries that need a visa work on a work permit, which is limited by quotas. Highly qualified specialists (a high salary, set by law) get a simpler route and can bring their family.',
    ru: 'Граждане стран с визовым режимом работают по разрешению на работу, которое ограничено квотами. Высококвалифицированным специалистам (высокая зарплата, определённая законом) путь проще, и они могут привезти семью.',
    game: { en: 'A visa start is a work-visa start; the pay and the rights differ from a patent worker.', ru: 'Старт по визе — это рабочая виза; оплата и права отличаются от работника по патенту.' } },
  { id: 'tax', topic: 'work', who: 'all', law: 'Tax Code art. 207, 224',
    en: 'Income tax is 13% for residents (183 days or more in a year) and 30% for non-residents, with the patent advance payment replacing it for patent workers. Higher incomes pay more under the progressive scale.',
    ru: 'Подоходный налог — 13% для резидентов (от 183 дней в году) и 30% для нерезидентов; у работников по патенту его заменяет авансовый платёж. Более высокие доходы облагаются по прогрессивной шкале.',
    game: { en: 'The budget screen shows what is taken from each pay.', ru: 'Экран бюджета показывает, что удерживают из каждой выплаты.' } },
  // study
  { id: 'student-visa', topic: 'study', who: 'student', law: '115-FZ art. 5, 16',
    en: 'A student stays on a study visa and is registered through the university. If you are expelled or stop studying, the grounds for the stay end and you must leave or change status.',
    ru: 'Студент находится в России по учебной визе и ставится на учёт через вуз. Если вас отчислили или вы перестали учиться, основания пребывания заканчиваются: нужно уехать или сменить статус.',
    game: { en: 'Failing exams can lose your visa and end the run.', ru: 'Провал экзаменов может стоить визы и закончить игру.' } },
  { id: 'student-work', topic: 'study', who: 'student', law: '115-FZ art. 13',
    en: 'Under the law as reported, a full-time foreign student may work in their free time without a separate work permit; part-time or other students need the usual papers. A bill to require a permit was reported, so check the current text. Working without the right to do so is an offence for the student and the employer.',
    ru: 'По закону в изложении источников, иностранный студент очной формы может работать в свободное от учёбы время без отдельного разрешения на работу; студентам других форм нужны обычные документы. Сообщалось о законопроекте, требующем разрешения, проверьте действующий текст. Работа без права на неё — нарушение для студента и работодателя.',
    game: { en: 'A student with a job is no longer flagged as a problem; a dean letter only helps with employers.', ru: 'Студент с работой больше не считается нарушителем; письмо из деканата лишь помогает с работодателями.' } },
  // ladder
  { id: 'rvp', topic: 'ladder', who: 'all', law: '115-FZ art. 6',
    en: 'A temporary residence permit (RVP) is given for three years, within a quota. Some can apply outside the quota: for example a spouse of a citizen, a parent of a citizen child, or a native Russian speaker in the state programme. You need a clean record, the language test and the state fee.',
    ru: 'Разрешение на временное проживание (РВП) выдаётся на три года в пределах квоты. Вне квоты могут подать, например, супруг гражданина, родитель ребёнка-гражданина или носитель русского языка по госпрограмме. Нужны чистое досье, экзамен по языку и госпошлина.',
    game: { en: 'RVP costs ₽15,000 in the game and removes the registration problem.', ru: 'РВП в игре стоит 15 000 ₽ и снимает проблему с регистрацией.' } },
  { id: 'vnzh', topic: 'ladder', who: 'all', law: '115-FZ art. 8',
    en: 'A residence permit (VNZh) is normally issued after at least a year on a temporary residence permit; the permit term is stated in the document (older rules: five years, renewable; one source says it is now open-ended, so check). You must live in Russia, keep your income and language certificate, and confirm your residence to the migration office each year; long absences can lose the permit.',
    ru: 'Вид на жительство (ВНЖ) обычно выдаётся после года по РВП; срок указан в документе (по прежним правилам пять лет с продлением; один источник пишет, что теперь он бессрочный, проверьте). Нужно жить в России, иметь доход и сертификат по языку и ежегодно подтверждать проживание в миграционной службе; долгое отсутствие может лишить ВНЖ.',
    game: { en: 'VNZh costs ₽30,000 in the game; with it papers stop being a daily problem.', ru: 'ВНЖ в игре стоит 30 000 ₽; с ним бумаги перестают быть ежедневной проблемой.' } },
  { id: 'citizenship', topic: 'ladder', who: 'all', law: '62-FZ art. 13, 14',
    en: 'Citizenship needs the residence permit, normally five years of residence, a legal source of income, the language test, and a duty to notify the state of any other citizenship you hold. Some groups use a simpler route.',
    ru: 'Для гражданства нужны ВНЖ, обычно пять лет проживания, законный источник дохода, экзамен по языку и уведомление о другом гражданстве. Для ряда категорий путь проще.',
    game: { en: 'Citizenship costs ₽50,000 and ends the foreigner rules for you.', ru: 'Гражданство стоит 50 000 ₽ и снимает правила для иностранцев.' } },
  // offences
  { id: 'koap-stay', topic: 'offences', who: 'all', law: 'KoAP 18.8',
    en: 'Breaking the rules of entry or stay (no registration, expired papers, overstaying) is fined, and the court may add administrative expulsion; in Moscow and St Petersburg expulsion is added more often.',
    ru: 'Нарушение режима въезда или пребывания (нет регистрации, истёк срок, превышение срока) наказывается штрафом, а суд может добавить административное выдворение; в Москве и Санкт-Петербурге выдворение назначают чаще.',
    game: { en: 'A raid with papers out of order is a fine and perhaps expulsion.', ru: 'Рейд с неправильными бумагами — штраф и, возможно, выдворение.' } },
  { id: 'koap-work', topic: 'offences', who: 'all', law: 'KoAP 18.10',
    en: 'Working without a permit or patent is fined; the employer who hires you pays much more. Repeat and serious cases lead to expulsion.',
    ru: 'Работа без разрешения или патента влечёт штраф; работодатель, который вас нанял, платит значительно больше. Повторные и тяжёлые случаи ведут к выдворению.',
    game: { en: 'The raid scene names this article.', ru: 'Сцена рейда называет эту статью.' } },
  { id: 'entry-ban', topic: 'offences', who: 'all', law: '114-FZ art. 27',
    en: 'An entry ban follows expulsion, deportation or serious breaches. Reported terms: 3 years from departure for overstaying more than 90 days in 180; 5 years after administrative expulsion or deportation, or after repeated offences within a year; up to 10 years after repeated expulsion. A ban can be challenged in court, but it is hard.',
    ru: 'Запрет въезда назначается после выдворения, депортации или серьёзных нарушений. Сроки по сообщениям: 3 года со дня выезда при превышении 90 суток из 180; 5 лет после административного выдворения или депортации либо после повторных нарушений в течение года; до 10 лет после повторного выдворения. Запрет можно оспорить в суде, но это трудно.',
    game: { en: 'Expulsion ends the run with an entry ban of five years.', ru: 'Выдворение завершает игру с запретом въезда на пять лет.' } },
  { id: 'crime', topic: 'offences', who: 'all', law: 'UK RF; 115-FZ art. 25.10',
    en: 'A conviction for a crime can make a foreigner\'s stay "undesirable" or lead to expulsion after the sentence. Drug offences (UK 228) are especially harsh.',
    ru: 'Осуждение за преступление может сделать пребывание иностранца «нежелательным» или привести к выдворению после наказания. Особенно жёстко наказываются наркопреступления (УК 228).',
    game: { en: 'A criminal conviction for a foreigner ends the run in expulsion.', ru: 'Приговор иностранцу за преступление заканчивает игру выдворением.' } },
  { id: 'register-controlled', topic: 'offences', who: 'all', law: '260-FZ (2025)',
    en: 'A foreigner who has lost the legal grounds to stay (expired papers, a stay over the limit, an expulsion or entry-ban decision, an illegal crossing) goes on the register of controlled persons. Listed people may not change their residence without the MVD, leave their region, trade in property or cars, marry or drive; bank spending is capped at about 30,000 ₽ a month; and they must report to the MVD. Children can be listed too. Mistaken listings are common: prove your status to the MVD (about 30 days).',
    ru: 'Иностранец, потерявший законные основания для пребывания (истекли документы, превышен срок, есть решение о выдворении или запрете въезда, незаконное пересечение границы), вносится в реестр контролируемых лиц. Внесённым нельзя менять место жительства без МВД, покидать регион, совершать сделки с недвижимостью и автомобилями, жениться и водить; траты по счетам ограничены примерно 30 000 ₽ в месяц; нужно являться в МВД. В реестр могут внести и детей. Ошибочные внесения часто случаются: подтвердите статус в МВД (около 30 дней).',
    game: { en: 'After 30 days without valid papers you are put on the register; a wrongly listed legal resident can appeal.', ru: 'После 30 дней без действующих бумаг вас вносят в реестр; ошибочно внесённый законный житель может обжаловать.' } },
  { id: 'fake-papers', topic: 'offences', who: 'all', law: 'UK 322.1, 327',
    en: 'Buying a "registration" or "patent" from an intermediary who has no right to give it, or using forged papers, is a crime for the buyer too. The only way to get papers is through the official offices and the MFC.',
    ru: 'Покупка «регистрации» или «патента» у посредника, не имеющего на это права, и использование поддельных бумаг — преступление и для покупателя. Законный путь — только через официальные ведомства и МФЦ.',
    game: { en: 'Scenes that offer a "quick paper for money" are traps.', ru: 'Сцены с «быстрой бумагой за деньги» — ловушки.' } },
  // rights
  { id: 'police-rights', topic: 'rights', who: 'all', law: 'Law on Police art. 5; KoAP 27.5',
    en: 'You may ask why you are stopped, ask for an interpreter, refuse to sign what you do not understand, call a lawyer and your consulate, and tell a relative within three hours of detention.',
    ru: 'Вы вправе спросить, почему вас остановили, потребовать переводчика, отказаться подписывать непонятное, вызвать адвоката и консульство и в течение трёх часов сообщить родным о задержании.',
    game: { en: 'Learning your rights (the leaflet) makes the polite option work better at checks.', ru: 'Знание прав (памятка) делает вежливый вариант на проверках надёжнее.' } },
  { id: 'unpaid-wages', topic: 'rights', who: 'all', law: 'TK RF art. 136, 142',
    en: 'An employer must pay wages on time even to a foreign worker. If they do not, you can complain to the labour inspectorate or the prosecutor without losing your status, as long as your own papers are in order.',
    ru: 'Работодатель обязан вовремя платить зарплату и иностранному работнику. Если нет, можно пожаловаться в трудовую инспекцию или прокуратуру, не теряя статуса, если ваши бумаги в порядке.',
    game: { en: 'Informal work leaves you with no way to complain: another reason to be formal.', ru: 'Неоформленная работа лишает возможности пожаловаться: ещё одна причина оформиться.' } },
  // life
  { id: 'medical', topic: 'life', who: 'all', law: '323-FZ art. 80; Duma law of Nov 2025 (reported)',
    en: 'Emergency care is free for everyone. Routine care in state clinics needs an OMS policy, which is tied to legal residence (RVP or VNZh). A law passed by the Duma in November 2025 is reported to give labour migrants an OMS policy only after about five years of work (highly qualified specialists excepted); until then use voluntary insurance (VHI/DMS). Check the final text.',
    ru: 'Неотложная помощь бесплатна для всех. Плановая помощь в государственных клиниках требует полиса ОМС, который связан с законным проживанием (РВП или ВНЖ). По сообщениям, закон, принятый Думой в ноябре 2025 года, даёт трудовым мигрантам полис ОМС лишь примерно после пяти лет работы (кроме высококвалифицированных специалистов); до этого пользуйтесь добровольным страхованием (ДМС). Проверьте итоговый текст.',
    game: { en: 'Clinic scenes price care by your insurance.', ru: 'В сценах клиник цена лечения зависит от страховки.' } },
  { id: 'bank-sim', topic: 'life', who: 'all', law: '115-FZ (AML); 126-FZ',
    en: 'A bank or a phone operator may ask for the passport and the registration to open an account or a SIM card. Some banks refuse accounts for people with no legal grounds to stay.',
    ru: 'Банк или оператор связи могут попросить паспорт и регистрацию, чтобы открыть счёт или SIM-карту. Некоторые банки отказывают тем, у кого нет законных оснований для пребывания.',
    game: { en: 'The register of controlled persons freezes your accounts.', ru: 'Реестр контролируемых лиц замораживает ваши счета.' } },
  { id: 'notify-change', topic: 'life', who: 'all', law: '115-FZ art. 11; 109-FZ',
    en: 'Tell the migration office about a change of address, a new job, a new passport, a change of name or a marriage within the deadline in the law; otherwise it is an offence even if everything else is in order.',
    ru: 'Сообщайте в миграционную службу о смене адреса, новой работе, новом паспорте, смене имени или браке в срок, указанный в законе; иначе это нарушение, даже если остальное в порядке.',
    game: { en: 'Notice scenes at the migration department cost time, not money, when done on time.', ru: 'Сцены уведомлений в миграционной службе стоят времени, а не денег, если вовремя.' } },
  // added after the online check of 4 November 2026
  { id: 'income-test', topic: 'work', who: 'migrant', law: '115-FZ amendments (Duma 8 Jul 2026)',
    en: 'A patent worker must show income above the subsistence minimum for themself and each dependant. If income falls below it, or you become unemployed, the patent is not renewed or is annulled and you must leave within about 15 days. A fixed advance payment is paid for each dependant too.',
    ru: 'Работник по патенту должен подтвердить доход выше прожиточного минимума на себя и каждого иждивенца. Если доход ниже или вы остались без работы, патент не продлевается или аннулируется, и выехать нужно примерно в течение 15 дней. За каждого иждивенца вносится фиксированный авансовый платёж.',
    game: { en: 'A low-income review can cost you the patent.', ru: 'Проверка дохода может стоить вам патента.' } },
  { id: 'dependants', topic: 'life', who: 'migrant', law: '115-FZ amendments (2026)',
    en: 'Foreign family members may stay while the worker\'s patent is valid. A child who turns 18 needs their own patent or must leave within about 30 days.',
    ru: 'Члены семьи иностранца могут жить в России, пока действует патент работника. Ребёнок, которому исполнилось 18, должен получить собственный патент или выехать примерно в течение 30 дней.',
    game: { en: 'A teenager\'s birthday becomes a legal deadline.', ru: 'День рождения подростка становится юридическим сроком.' } },
  { id: 'employer-notice', topic: 'work', who: 'all', law: '115-FZ art. 13 para 8; KoAP 18.15; MVD order 290 (12 May 2026)',
    en: 'An employer must notify the MVD within 3 working days of concluding or ending an employment contract with a foreigner; from 1 September 2026 new forms apply, stating the contract term. Violations cost officials 35,000–50,000 ₽ and organisations 400,000–800,000 ₽ or a suspension of up to 90 days.',
    ru: 'Работодатель обязан уведомить МВД в течение 3 рабочих дней со дня заключения или расторжения трудового договора с иностранцем; с 1 сентября 2026 года действуют новые формы с указанием срока договора. За нарушения должностным лицам грозит 35 000–50 000 ₽, организациям — 400 000–800 000 ₽ или приостановка деятельности до 90 суток.',
    game: { en: 'An employer who does not notify the MVD puts your job at risk.', ru: 'Работодатель, не уведомивший МВД, ставит вашу работу под угрозу.' } },
  { id: 'fees-2026', topic: 'ladder', who: 'all', law: '189-FZ, 190-FZ (in force 1 Jul 2026)',
    en: 'State duties rose on 1 July 2026: temporary residence 15,000 ₽ (8,000 ₽ for study), residence permit 30,000 ₽, citizenship 50,000 ₽, work permit 5,000 ₽. The duty for registering a foreigner at an address was abolished.',
    ru: 'С 1 июля 2026 года выросли госпошлины: РВП 15 000 ₽ (для учёбы 8 000 ₽), ВНЖ 30 000 ₽, гражданство 50 000 ₽, разрешение на работу 5 000 ₽. Пошлина за постановку иностранца на учёт по месту пребывания отменена.',
    game: { en: 'The game uses these figures for the ladder.', ru: 'Игра использует эти суммы для лестницы статусов.' } },
  { id: 'citizen-record', topic: 'ladder', who: 'all', law: 'Presidential Decree 379 (1 Jun 2026)',
    en: 'A citizenship application needs a criminal-record certificate from every state whose citizenship you hold, issued not more than 3 months before. Refugees, asylum holders and some other groups are exempt.',
    ru: 'К заявлению о гражданстве нужна справка о судимости из каждого государства, гражданином которого вы являетесь, выданная не раньше чем за 3 месяца. Беженцы, лица с убежищем и ряд других категорий освобождены.',
    game: { en: 'The citizenship step asks for the certificate.', ru: 'Шаг «гражданство» требует эту справку.' } },
  { id: 'digital-reg', topic: 'registration', who: 'all', law: '109-FZ; 162-FZ (from 1 Sep 2026)',
    en: 'Since February 2025 a migration registration lasts at most one year, and from 1 September 2026 the procedure moves to digital form. Keep the confirmation you receive, on paper or in the app.',
    ru: 'С февраля 2025 года миграционный учёт действует не дольше года, а с 1 сентября 2026 года порядок переходит в цифровой формат. Сохраняйте полученное подтверждение, на бумаге или в приложении.',
    game: { en: 'Registration scenes offer the digital way.', ru: 'Сцены регистрации предлагают цифровой путь.' } },
  { id: 'sim-biometrics', topic: 'life', who: 'all', law: 'Communications law changes (since 1 Jan 2025)',
    en: 'A foreigner buying a SIM card needs a verified Gosuslugi account and biometrics (face and voice) taken at a listed bank, with the passport, its translation and the SNILS number. Contracts are signed in person, and one person may hold only a limited number of numbers.',
    ru: 'Иностранцу для покупки SIM-карты нужны подтверждённая учётная запись на Госуслугах и биометрия (лицо и голос) в банке из списка, с паспортом, его переводом и СНИЛС. Договор подписывается лично, а число номеров на человека ограничено.',
    game: { en: 'Getting a SIM now takes a bank visit first.', ru: 'Чтобы получить SIM-карту, теперь сначала нужно в банк.' } },
  { id: 'internet-life', topic: 'life', who: 'all', law: 'Communications law (2026); press reports',
    en: 'Mobile internet shutdowns and "whitelists" of allowed sites are common in 2026, many services push the state messenger Max, and some foreign apps are blocked or slow. Keep cash, a paper map and the numbers you need.',
    ru: 'В 2026 году частые отключения мобильного интернета и «белые списки» сайтов, многие сервисы продвигают государственный мессенджер Max, а часть иностранных приложений заблокирована или работает медленно. Держите наличные, бумажную карту и нужные номера.',
    game: { en: 'Outage scenes test whether you kept cash and offline contacts.', ru: 'Сцены отключений проверяют, остались ли у вас наличные и офлайн-контакты.' } },
  { id: 'consumer-14', topic: 'rights', who: 'all', law: 'Consumer Protection Law art. 25; Gov. decree 2463 (31 Dec 2020)',
    en: 'A non-food item of proper quality can be exchanged within 14 days (the day of purchase is not counted) if it is unused, keeps its tags and look, and you can show a receipt or other proof; a government list names goods that cannot be exchanged (perfumes, underwear, cables and others).',
    ru: 'Непродовольственный товар надлежащего качества можно обменять в течение 14 дней (день покупки не считается), если он не использовался, сохранил ярлыки и вид, а у вас есть чек или иное подтверждение; правительственный перечень называет товары, не подлежащие обмену (парфюмерия, бельё, кабельная продукция и другие).',
    game: { en: 'Shop scenes follow the 14 days and the list of exceptions.', ru: 'Сцены в магазинах следуют сроку в 14 дней и перечню исключений.' } },
  { id: 'consumer-distance', topic: 'rights', who: 'all', law: 'Consumer Protection Law art. 26.1',
    en: 'Goods bought at a distance (online) follow their own rules, not the shop exchange of art. 25. Read the seller\'s return terms and keep the packaging.',
    ru: 'На товары, купленные дистанционно (в интернете), действуют свои правила, а не обмен в магазине по ст. 25. Читайте условия возврата продавца и сохраняйте упаковку.',
    game: { en: 'Online orders have their own return scene.', ru: 'У онлайн-заказов своя сцена возврата.' } },
  { id: 'resign-2weeks', topic: 'work', who: 'all', law: 'Labour Code art. 80',
    en: 'An employee may leave by giving the employer written notice two weeks before; the period starts the day after the employer gets the application. A shorter time can be agreed.',
    ru: 'Работник может уволиться, письменно предупредив работодателя за две недели; срок идёт со следующего дня после получения заявления. Более короткий срок можно согласовать.',
    game: { en: 'The resignation scene counts the two weeks.', ru: 'Сцена увольнения учитывает две недели.' } },
  { id: 'probation-3days', topic: 'work', who: 'all', law: 'Labour Code art. 71',
    en: 'During the probation period an employee may leave with three days\' written notice. A probation is normally at most three months.',
    ru: 'На испытательном сроке работник может уволиться, предупредив письменно за три дня. Испытание обычно не дольше трёх месяцев.',
    game: { en: 'The probation scene shows the three days.', ru: 'Сцена испытательного срока показывает три дня.' } },
  { id: 'final-pay', topic: 'work', who: 'all', law: 'Labour Code art. 140, 84.1',
    en: 'All sums due must be paid on the last day of work, and the work record handed over. Waiting for "the tenth of the month" is not what the Code says.',
    ru: 'Все причитающиеся суммы должны быть выплачены в последний день работы, а трудовая книжка выдана. Ожидание «десятого числа» не соответствует Кодексу.',
    game: { en: 'The final-pay scene rewards knowing this.', ru: 'Сцена окончательного расчёта вознаграждает за это знание.' } },
  { id: 'tenant-notice', topic: 'life', who: 'all', law: 'Civil Code art. 687',
    en: 'A tenant may end a residential tenancy at any time with three months\' written notice and the consent of those who live with them; a landlord normally needs a court to end it. Private contracts and short-term rentals have their own terms, so read yours.',
    ru: 'Наниматель может расторгнуть договор найма жилья в любое время, письменно предупредив наймодателя за три месяца и с согласия проживающих с ним; наймодателю для расторжения обычно нужен суд. У частных договоров и краткосрочного найма свои условия, поэтому читайте свой.',
    game: { en: 'The moving-out scene uses the notice.', ru: 'Сцена съезда использует уведомление.' } },
];

/* The online check of 4 November 2026. NOT a person's check against the official text (platform/citations.ts keeps `verifiedOn` null for that): it
   records what public sources said. 'confirmed' = several sources agree; 'partly' = one source or the details differ; 'open' = not found. */
export interface Check { s: 'confirmed' | 'partly' | 'open'; en: string; ru: string; url: string }
export const CHECKED_ON = '2026-11-04';
const C = (s: Check['s'], en: string, ru: string, url: string): Check => ({ s, en, ru, url });
export const CHECKS: Record<string, Check> = {
  'register-controlled': C('confirmed', 'Restrictions and listing grounds confirmed by several outlets; the exact departure deadline was not found.', 'Ограничения и основания подтверждены несколькими изданиями; точный срок выезда не найден.', 'https://www.gw2ru.com/basic-facts/249475-russias-register-of-controlled-persons-what-it-is'),
  'fees-2026': C('confirmed', 'Matches a law-firm summary of 189-FZ and 190-FZ.', 'Совпадает с юридическим обзором 189-ФЗ и 190-ФЗ.', 'https://www.lidings.com/media/legalupdates/migrationlaw2026/'),
  'citizen-record': C('partly', 'One law-firm summary of Decree 379; the in-force date was not stated.', 'Один юридический обзор указа № 379; дата вступления в силу не указана.', 'https://www.lidings.com/media/legalupdates/migrationlaw2026/'),
  'income-test': C('partly', 'Passed by the Duma on 8 July 2026 and reported signed in late July; the final text and figures were not checked.', 'Принят Думой 8 июля 2026 года и, по сообщениям, подписан в конце июля; итоговый текст и цифры не проверены.', 'https://www.themoscowtimes.com/2026/07/08/migration-a93201'),
  'dependants': C('partly', 'Reported with the income-test law; the deadlines differ between outlets.', 'Сообщалось вместе с законом о проверке дохода; сроки в изданиях различаются.', 'https://www.themoscowtimes.com/2026/07/08/migration-a93201'),
  'digital-reg': C('partly', 'A university page and an amendment list say so; details were not found.', 'Об этом говорят страница вуза и перечень поправок; подробности не найдены.', 'https://international.rudn.ru/migration_registration/'),
  'sim-biometrics': C('confirmed', 'Several guides and university notices agree: Gosuslugi plus biometrics at a listed bank.', 'Несколько руководств и объявлений вузов сходятся: Госуслуги и биометрия в банке из списка.', 'https://www.vanrhijnlegal.com/biometric-registration-russian-sim-card'),
  'internet-life': C('partly', 'Press reports (Zona Media, CS Monitor); the rules change often.', 'Сообщения прессы (Зона Медиа, CS Monitor); правила часто меняются.', 'https://en.zona.media/article/2026/04/07/russian_internet_censorship_2026'),
  'reg-7': C('confirmed', '7 working days from arrival (109-FZ art. 20 part 3) is stated in legal commentary; highly qualified specialists staying up to 90 days are exempt.', '7 рабочих дней со дня прибытия (ч. 3 ст. 20 109-ФЗ) указаны в юридических комментариях; высококвалифицированные специалисты на срок до 90 суток освобождены.', 'https://harant.ru/blog/migracionnoe-pravo/sroki-podachi-uvedomleniya-o-pribytii-inostrannogo-grazhdanina-v-rossii/'),
  'reg-workers': C('open', 'The longer terms (15, 30 and 90 days for particular countries) were not confirmed in this check; treat them as unverified.', 'Более длинные сроки (15, 30 и 90 дней для отдельных стран) в этой проверке не подтвердились; считайте их непроверенными.', 'https://harant.ru/blog/migracionnoe-pravo/sroki-podachi-uvedomleniya-o-pribytii-inostrannogo-grazhdanina-v-rossii/'),
  'stay-90-180': C('confirmed', '90 days in each 180 (115-FZ art. 5, in force since 2014) is confirmed by court decisions and legal sites; a claim of 90/365 elsewhere is not supported.', '90 суток из каждых 180 (ст. 5 115-ФЗ, с 2014 года) подтверждены судебными решениями и юридическими сайтами; утверждение о 90/365 в другом источнике не подтверждается.', 'https://sudact.ru/regular/doc/6noUtWYyDGUg/'),
  'entry-ban': C('partly', 'Article 27 belongs to 114-FZ. The terms (3, 5 and up to 10 years) come from legal websites, not from the official text.', 'Статья 27 относится к 114-ФЗ. Сроки (3, 5 и до 10 лет) взяты с юридических сайтов, а не из официального текста.', 'https://pravo.ppt.ru/fz/224-fz-409'),
  'employer-notice': C('confirmed', '3 working days (115-FZ art. 13 para 8), the 400,000–800,000 ₽ fine (KoAP 18.15 part 3) and the new forms from 1 Sep 2026 (order 290) agree across sources.', '3 рабочих дня (п. 8 ст. 13 115-ФЗ), штраф 400 000–800 000 ₽ (ч. 3 ст. 18.15 КоАП) и новые формы с 1 сентября 2026 (приказ № 290) совпадают в источниках.', 'https://www.v2b.ru/articles/uvedomlenie-o-prieme-na-rabotu-inostrannogo-grazhdanina/'),
  'student-work': C('partly', 'Sources say full-time students may work in free time without a permit, but a bill to require one was reported. The game now follows the current rule; recheck if the bill passes.', 'Источники говорят, что студенты очной формы могут работать в свободное время без разрешения, но сообщалось о законопроекте об обязательном разрешении. Игра теперь следует действующему правилу; перепроверьте, если законопроект примут.', 'https://kontur.ru/articles/5843'),
  'koap-stay': C('partly', 'The base fine of 2,000–5,000 ₽ (KoAP 18.8) and court-ordered expulsion in practice are confirmed; the Moscow and St Petersburg amount was not.', 'Базовый штраф 2 000–5 000 ₽ (ст. 18.8 КоАП) и выдворение по решению суда подтверждены; сумма для Москвы и Санкт-Петербурга — нет.', 'https://ppt.ru/news/inostrannye-grazhdane/shtrafy-za-narusheniya-vezda-v-rf-mogut-vyrasti-do-50-000-rubley'),
  'koap-work': C('open', 'The KoAP 18.10 fine amount was not found in this check.', 'Размер штрафа по ст. 18.10 КоАП в этой проверке не найден.', 'https://www.kontur-extern.ru/info/normativ/document/1/506886-kodeks-rossiyskoy-federatsii-ob-administrativnykh-pravonarusheniyakh?pieceId=a18.8'),
  'rvp': C('partly', 'Up to 3 years, not extendable, within a quota with exemptions (115-FZ art. 6) agrees across blogs; no official text was read.', 'До 3 лет без продления, в пределах квоты с исключениями (ст. 6 115-ФЗ) совпадает в блогах; официальный текст не читался.', 'https://harant.ru/blog/migracionnoe-pravo/vnzh-rvp-i-grazhdanstvo-rf-polnyj-poryadok-oformleniya/'),
  'vnzh': C('open', 'Sources conflict on the permit term (five years or open-ended) and on who must confirm residence each year. Treat as unverified.', 'Источники расходятся по сроку ВНЖ (пять лет или бессрочно) и по тому, кто обязан ежегодно подтверждать проживание. Считайте непроверенным.', 'https://harant.ru/blog/migracionnoe-pravo/usloviya-polucheniya-vida-na-zhitelstvo-v-rossii/'),
  'citizenship': C('partly', 'General route (62-FZ art. 13, about five years) and simplified route (art. 14, for example 3+ years of marriage) agree across sources.', 'Общий порядок (ст. 13 62-ФЗ, около пяти лет) и упрощённый (ст. 14, например брак от 3 лет) совпадают в источниках.', 'https://harant.ru/blog/migracionnoe-pravo/vnzh-rvp-i-grazhdanstvo-rf-polnyj-poryadok-oformleniya/'),
  'medical': C('partly', 'Emergency care for all and the reported five-year OMS rule for labour migrants come from press reports; the final law was not read.', 'Неотложная помощь для всех и сообщаемое правило пяти лет для ОМС у трудовых мигрантов — из сообщений прессы; итоговый закон не читался.', 'https://en.fergana.agency/news/143033/'),
  'patent': C('partly', 'A Moscow patent payment of 10,000 ₽ a month from 2026 was reported; the 3-working-day employer notice is confirmed, but the patent holder own deadlines were not.', 'Платёж за патент в Москве 10 000 ₽ в месяц с 2026 года подтверждён сообщениями; трёхдневный срок уведомления работодателем подтверждён, но собственные сроки обладателя патента — нет.', 'https://en.fergana.agency/news/143033/'),
  'tax': C('open', 'Not checked in this round: 13% for residents, 30% for non-residents, patent advance payment instead.', 'В этом раунде не проверялось: 13% для резидентов, 30% для нерезидентов, у патентных — авансовый платёж.', 'https://www.nalog.gov.ru/'),
  'consumer-14': C('confirmed', 'The 14 days, the unused condition and the list of exceptions agree across consumer-agency and law-firm sources; the numbering of the list differs between them.', 'Четырнадцать дней, условие неиспользования и перечень исключений совпадают в источниках Роспотребнадзора и юристов; нумерация перечня различается.', 'https://harant.ru/blog/zashchita-prav-potrebitelej/vozvratu-ne-podlezhit-perechen-tovarov-nadlezhashhego-kachestva-ne-podlezhashhih-vozvratu/'),
  'consumer-distance': C('partly', 'The consumer agency says distance sales are separate; the details were not read.', 'Роспотребнадзор говорит, что дистанционные продажи регулируются отдельно; подробности не читались.', 'https://www.13.rospotrebnadzor.ru/sites/default/files/pamyatka_obmen_tovara_nadlezhashchego_kachesva.doc'),
  'resign-2weeks': C('confirmed', 'Two weeks\' written notice (art. 80) agrees across sources.', 'Двухнедельное письменное предупреждение (ст. 80) совпадает в источниках.', 'https://ppt.ru/amp/art/uvolnenie/skolko-otrabativat'),
  'probation-3days': C('confirmed', 'Three days\' notice during probation (art. 71 part 4) agrees across sources; the three-month maximum was named but not read in the text.', 'Три дня на испытательном сроке (ч. 4 ст. 71) совпадают в источниках; максимум в три месяца назван, но в тексте не читался.', 'https://spmag.ru/articles/uvolnenie-na-ispytatelnom-sroke-po-sobstvennomu-zhelaniyu'),
  'final-pay': C('confirmed', 'Payment on the last day (art. 140, 84.1) agrees across sources.', 'Выплата в последний день (ст. 140, 84.1) совпадает в источниках.', 'https://ppt.ru/amp/art/uvolnenie/skolko-otrabativat'),
  'tenant-notice': C('partly', 'The three-month notice (art. 687) is confirmed; the rules for short-term rental and for a landlord who ends it were not fully read.', 'Трёхмесячное предупреждение (ст. 687) подтверждено; правила краткосрочного найма и расторжения по инициативе наймодателя не прочитаны полностью.', 'https://pravo.ppt.ru/kodeks/gk/st-687'),
};

export const ruleById = (id: string): Rule | undefined => RULES.find(r => r.id === id);

/** Which of the rule groups concern this player: everyone's, plus their own status's. */
export function whoOf(s: State): Who {
  if (s.status === 'student') return 'student';
  if (s.status === 'eaeu') return 'eaeu';
  if (s.status === 'migrant') return 'migrant';
  return 'all';
}
export const appliesTo = (r: Rule, s: State): boolean => r.who === 'all' || r.who === whoOf(s);

/** The rules for this player (their own first), by topic order. */
export function rulesFor(s: State, topic?: Topic): Rule[] {
  const order = Object.keys(TOPICS) as Topic[];
  return RULES.filter(r => (!topic || r.topic === topic) && appliesTo(r, s))
    .sort((a, b) => Number(b.who !== 'all') - Number(a.who !== 'all') || order.indexOf(a.topic) - order.indexOf(b.topic));
}

/** The rules the player is breaking right now, named from the engine's own check of papers (so the screen and the raids agree). */
export function breaches(s: State): Rule[] {
  const ids = new Set<string>();
  for (const p of G.problems(s)) {
    if (/registration/.test(p)) { ids.add('reg-7'); ids.add('koap-stay'); }
    if (/patent/.test(p)) { ids.add('patent'); ids.add('koap-work'); }
    if (/student visa/.test(p)) { ids.add('student-visa'); ids.add('koap-stay'); }
  }
  return [...ids].map(id => ruleById(id)).filter((r): r is Rule => !!r);
}
