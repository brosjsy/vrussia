/* The grounded guide: ask a question in plain words, get an answer taken only from a short list of vetted entries, each with its sources.
   It is search, not text generation: it can only repeat what a person wrote and checked, so it cannot invent a rule. When nothing fits well enough
   it says so and points to the official sources. It runs on the device (nothing you type is sent anywhere). The entries describe the GAME's rules;
   the answer always ends with the reminder to check the official source, because the real rules change. */
export interface Entry { id: string; keys: string; q: { en: string; ru: string }; a: { en: string; ru: string }; src: string[] }
export interface Answer { found: boolean; entry?: Entry; others: Entry[]; score: number }

export const ENTRIES: readonly Entry[] = [
  { id: 'registration', keys: 'registration register migration record address notify landlord учет учёт регистрация встать на учет миграционный адрес',
    q: { en: 'What is migration registration and how long do I have?', ru: 'Что такое миграционный учёт и сколько у меня времени?' },
    a: { en: 'Registration tells the migration authority where you live. In the game most visitors have 7 working days after arrival; workers from some countries have 15 or 30 days. Without it you risk fines and police checks. In real life the time depends on your nationality and purpose of stay.', ru: 'Учёт сообщает миграционным органам, где вы живёте. В игре у большинства приезжих есть 7 рабочих дней после въезда, у работников из некоторых стран — 15 или 30 дней. Без него грозят штрафы и проверки полиции. В жизни срок зависит от гражданства и цели приезда.' }, src: ['fz109', 'koap'] },
  { id: 'patent', keys: 'patent work permit pay monthly advance payment receipt fee тариф патент разрешение работа оплата аванс ндфл',
    q: { en: 'How does the work patent work?', ru: 'Как работает патент на работу?' },
    a: { en: 'A patent lets a foreign worker from a visa-free country work legally. You need registration, a medical exam, health insurance and the language test first, then you pay a fixed advance payment every month and keep the receipts. In the game it is about ₽10,000 a month in Moscow from 2026; the amount differs by region and changes every year.', ru: 'Патент даёт право легально работать иностранцу из безвизовой страны. Сначала нужны учёт, медосмотр, страховка и экзамен по языку, затем каждый месяц вносится фиксированный авансовый платёж, квитанции нужно хранить. В игре это около 10 000 ₽ в месяц в Москве с 2026 года; в регионах сумма другая и меняется каждый год.' }, src: ['fz115', 'tax2271'] },
  { id: 'medical', keys: 'medical exam health insurance dms oms doctor clinic медосмотр медицинский страховка полис дмс омс врач',
    q: { en: 'Do I need a medical exam and insurance?', ru: 'Нужны ли медосмотр и страховка?' },
    a: { en: 'Workers on a patent need a medical examination and voluntary health insurance (DMS). Citizens use the compulsory insurance (OMS) and a clinic near home. Keep the papers with you.', ru: 'Работникам по патенту нужны медицинское освидетельствование и полис ДМС. Граждане пользуются полисом ОМС и поликлиникой по месту жительства. Носите документы с собой.' }, src: ['fz115'] },
  { id: 'language', keys: 'language test exam russian history law certificate экзамен русский язык история законодательство сертификат тест',
    q: { en: 'What is the Russian language test?', ru: 'Что за экзамен по русскому языку?' },
    a: { en: 'Most foreign workers must pass an exam in Russian, history and the basics of law before they get a patent, and a similar test is needed later for residence permits. Pass it early: other steps depend on it.', ru: 'Большинству иностранных работников нужно сдать экзамен по русскому языку, истории и основам законодательства до получения патента; похожий тест нужен позже для вида на жительство. Сдайте его рано: от него зависят другие шаги.' }, src: ['fz115'] },
  { id: 'ladder', keys: 'rvp vnzh residence permit citizenship passport naturalization fee duty ladder рвп внж гражданство пошлина разрешение временное проживание вид на жительство',
    q: { en: 'How do I go from patent to RVP, VNZh and citizenship?', ru: 'Как перейти от патента к РВП, ВНЖ и гражданству?' },
    a: { en: 'The ladder is: temporary residence permit (RVP), then a residence permit (VNZh), then citizenship. Each step needs a legal ground, a clean record, the language test and a state fee (in the game: RVP ₽15,000, VNZh ₽30,000, citizenship ₽50,000). Waiting times in the game are shorter than in real life.', ru: 'Лестница такая: разрешение на временное проживание (РВП), затем вид на жительство (ВНЖ), затем гражданство. На каждом шаге нужны основание, чистая история, экзамен и госпошлина (в игре: РВП 15 000 ₽, ВНЖ 30 000 ₽, гражданство 50 000 ₽). Сроки ожидания в игре короче, чем в жизни.' }, src: ['fz115', 'fz62', 'duty'] },
  { id: 'strikes', keys: 'strike strikes deportation deported police fine check record expel предупреждение депортация полиция штраф проверка выдворение',
    q: { en: 'What are legal strikes and when am I deported?', ru: 'Что такое предупреждения и когда депортируют?' },
    a: { en: 'Expired papers and offences bring fines, police checks and legal strikes. Three strikes can mean deportation. A clean record slowly clears strikes. Fix your papers first when the game warns you.', ru: 'Просроченные бумаги и нарушения приводят к штрафам, проверкам и предупреждениям. Три предупреждения могут закончиться депортацией. Чистая история постепенно снимает предупреждения. Когда игра предупреждает, сначала приведите бумаги в порядок.' }, src: ['koap', 'fz115'] },
  { id: 'eaeu', keys: 'eaeu eurasian union kyrgyzstan kazakhstan armenia belarus no patent еаэс киргизия казахстан армения беларусь без патента',
    q: { en: 'I come from an EAEU country. Do I need a patent?', ru: 'Я из страны ЕАЭС. Нужен ли мне патент?' },
    a: { en: 'Citizens of Eurasian Economic Union countries need no patent or work permit. They work under a contract and register under the rules for their country.', ru: 'Гражданам стран Евразийского экономического союза патент и разрешение на работу не нужны. Они работают по договору и встают на учёт по правилам своей страны.' }, src: ['eaeu'] },
  { id: 'student', keys: 'student university study admission scholarship work permission expelled gpa студент университет учёба поступление стипендия отчислен разрешение на работу',
    q: { en: 'What do foreign students need to know?', ru: 'Что нужно знать иностранным студентам?' },
    a: { en: 'Your stay depends on your enrolment: keep up with exams and registration through the university. Students need a work permission before working legally. Failing exams can lead to expulsion and the loss of your status.', ru: 'Ваше пребывание зависит от зачисления: сдавайте сессию и встаньте на учёт через университет. Чтобы работать легально, студенту нужно разрешение на работу. Провал на экзаменах ведёт к отчислению и потере статуса.' }, src: ['fz273', 'fz115'] },
  { id: 'rent', keys: 'rent saturday flat room landlord contract lease money аренда суббота квартира комната договор жильё деньги',
    q: { en: 'When do I pay rent and why use a contract?', ru: 'Когда платить за жильё и зачем договор?' },
    a: { en: 'Rent is paid on Saturdays. Rent only with a written contract and pay through a bank so there is a record; it also helps with registration. Beware of rooms offered too cheaply.', ru: 'Аренда оплачивается по субботам. Снимайте жильё только по письменному договору и платите через банк, чтобы остался след; это помогает и с учётом. Остерегайтесь слишком дешёвых комнат.' }, src: ['sk', 'fz109'] },
  { id: 'meters', keys: 'energy health stress reputation knowledge meters burnout hospital rest sleep энергия здоровье стресс репутация знания усталость больница отдых сон',
    q: { en: 'What do energy, health and stress do?', ru: 'Что делают энергия, здоровье и стресс?' },
    a: { en: 'Actions cost energy; rest and food bring it back. High stress hurts health, and if health runs out the game can end in hospital. Rest before burnout.', ru: 'Действия тратят энергию; отдых и еда возвращают её. Высокий стресс вредит здоровью, а если здоровье кончится, игра может закончиться больницей. Отдыхайте до выгорания.' }, src: [] },
  { id: 'score', keys: 'score points leaderboard result goals очки счёт рейтинг результат цели',
    q: { en: 'How is my score counted?', ru: 'Как считаются очки?' },
    a: { en: 'Score is money in thousands, plus knowledge ×5, reputation ×2, 400 for each goal reached, minus 150 for each strike, plus the days you lasted.', ru: 'Очки — это деньги в тысячах, плюс знания ×5, репутация ×2, по 400 за каждую достигнутую цель, минус 150 за каждое предупреждение, плюс прожитые дни.' }, src: [] },
  { id: 'difficulty', keys: 'difficulty easy normal hard realistic level сложность лёгкий нормальный реалистичный уровень',
    q: { en: 'What do the difficulty levels change?', ru: 'Что меняют уровни сложности?' },
    a: { en: 'Easy gives more starting money and fewer police checks. Normal is balanced. Realistic gives less money, more checks and faster expiry of violations.', ru: 'Лёгкий даёт больше стартовых денег и меньше проверок. Нормальный сбалансирован. Реалистичный даёт меньше денег, больше проверок и быстрее «сгорающие» нарушения.' }, src: [] },
  { id: 'account', keys: 'account login save cloud sync device e-mail email аккаунт войти сохранение облако устройство почта',
    q: { en: 'How do I keep my game on another device?', ru: 'Как перенести игру на другое устройство?' },
    a: { en: 'Create an account under Online: your game is saved to the server and follows you to any device. You can also export the save as a file and import it elsewhere.', ru: 'Создайте аккаунт в разделе «Онлайн»: игра сохранится на сервере и появится на любом устройстве. Ещё можно экспортировать сохранение в файл и загрузить его на другом устройстве.' }, src: ['fz152'] },
  { id: 'privacy', keys: 'privacy data delete erase export personal statistics анонимная конфиденциальность данные удалить стереть скачать персональные',
    q: { en: 'What data do you keep and can I delete it?', ru: 'Какие данные вы храните и можно ли их удалить?' },
    a: { en: 'Without an account everything stays on your device. With an account we keep your e-mail, name, save and scores. Under More, then Privacy and my data, you can download everything, erase the device data, and turn anonymous statistics on or off.', ru: 'Без аккаунта всё остаётся на вашем устройстве. С аккаунтом мы храним почту, имя, сохранение и результаты. В меню «Ещё» → «Конфиденциальность и мои данные» можно скачать всё, стереть данные устройства и включить или выключить анонимную статистику.' }, src: ['fz152'] },
  { id: 'class', keys: 'class teacher school ngo code pupils classroom класс учитель школа нко код ученики',
    q: { en: 'How does class mode work?', ru: 'Как работает режим класса?' },
    a: { en: 'A teacher with an account creates a class and gets a 6-character code. Pupils enter the code and a nickname (not a real name); their results and what they learned go to the teacher.', ru: 'Учитель с аккаунтом создаёт класс и получает код из 6 символов. Ученики вводят код и псевдоним (не настоящее имя); их результаты и изученное попадают к учителю.' }, src: [] },
  { id: 'daily', keys: 'daily challenge streak season event ежедневная игра дня серия сезон событие',
    q: { en: 'What is the daily game?', ru: 'Что такое игра дня?' },
    a: { en: 'Everyone gets the same character, difficulty and city on the same day, so results can be compared. Playing on consecutive days builds a streak.', ru: 'В один день все получают одного героя, сложность и город, поэтому результаты можно сравнивать. Игра несколько дней подряд увеличивает серию.' }, src: [] },
  { id: 'packs', keys: 'pack packs scenario custom json moderator write пакет сценарии свои json модератор',
    q: { en: 'Can I add my own scenarios?', ru: 'Можно ли добавить свои сценарии?' },
    a: { en: 'Yes: More, then Community scenario packs. A pack is a JSON file. It is checked first, can only change the numbers of the game in small steps, and stays on your device.', ru: 'Да: «Ещё» → «Пакеты сценариев от сообщества». Пакет — это JSON-файл. Его сначала проверяют, он может лишь немного менять числа игры и остаётся на вашем устройстве.' }, src: [] },
  { id: 'access', keys: 'accessibility keyboard screen reader text size colour blind contrast motion lite доступность клавиатура размер текста дальтоник контраст движение',
    q: { en: 'How do I make the game easier to see and use?', ru: 'Как сделать игру удобнее для глаз и рук?' },
    a: { en: 'Settings has text size, colour-blind colours, less motion and graphics. More, then Accessibility, has high contrast and Lite mode. Keys 1 to 9 choose, Enter continues, Escape closes pop-ups.', ru: 'В настройках есть размер текста, цвета для дальтоников, меньше движения и графика. В «Ещё» → «Доступность» есть высокая контрастность и лёгкий режим. Клавиши 1–9 выбирают, Enter продолжает, Esc закрывает окна.' }, src: [] },
  { id: 'help', keys: 'lawyer help legal advice official site mvd gosuslugi real life lawyer юрист помощь консультация официальный сайт мвд госуслуги',
    q: { en: 'Where do I get real help?', ru: 'Где получить настоящую помощь?' },
    a: { en: 'This game is not legal advice. For real questions use the official sites (the Ministry of the Interior for migration, Gosuslugi for services) or a qualified lawyer or an NGO that helps migrants.', ru: 'Игра — не юридическая консультация. С настоящими вопросами обращайтесь на официальные сайты (МВД по вопросам миграции, Госуслуги) или к юристу и в НКО, которые помогают мигрантам.' }, src: ['fz115'] },
];

const STOP = new Set('the a an is are do does did i my me you your to of in on for and or how what when why can it be with at as by from this that что как я мы вы мне мой моя мои ли и в на с по для не из к у о а но'.split(' '));
/** Lower-case words, with a plain stem so “registering”, “registered” and “registration” meet. Letters of any alphabet count. */
export function words(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(w => w.length > 1 && !STOP.has(w)).map(stem);
}
export function stem(w: string): string {
  if (/[а-яё]/.test(w)) return w.length > 5 ? w.slice(0, w.length - 2) : w.length > 4 ? w.slice(0, -1) : w;
  let x = w;
  for (const suf of ['ations', 'ation', 'ings', 'ing', 'ies', 'ed', 'es', 'er', 's']) if (x.length > suf.length + 3 && x.endsWith(suf)) { x = x.slice(0, -suf.length); break; }
  if (x.endsWith('e')) x = x.slice(0, -1);
  return x.slice(0, 6);
}

const INDEX = ENTRIES.map(e => {
  const toks = [...words(e.keys), ...words(e.q.en), ...words(e.q.ru), ...words(e.a.en), ...words(e.a.ru)];
  const tf = new Map<string, number>(); for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
  const keySet = new Set([...words(e.keys), ...words(e.q.en), ...words(e.q.ru)]);
  return { e, tf, keySet, len: toks.length };
});
const DF = new Map<string, number>(); for (const d of INDEX) for (const t of d.tf.keys()) DF.set(t, (DF.get(t) ?? 0) + 1);
const AVG = INDEX.reduce((a, d) => a + d.len, 0) / INDEX.length;
export const MIN_SCORE = 2.2;

/** BM25-style search over the vetted entries. Words from the title and keywords count double. */
export function ask(question: string): Answer {
  const qs = [...new Set(words(question))];
  const scored = INDEX.map(d => {
    let s = 0;
    for (const t of qs) {
      const f = d.tf.get(t) ?? 0; if (!f) continue;
      const idf = Math.log(1 + (INDEX.length - (DF.get(t) ?? 0) + 0.5) / ((DF.get(t) ?? 0) + 0.5));
      s += idf * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * d.len / AVG))) * (d.keySet.has(t) ? 2 : 1);
    }
    return { e: d.e, s };
  }).sort((a, b) => b.s - a.s);
  const top = scored[0];
  if (!top || top.s < MIN_SCORE) return { found: false, others: scored.slice(0, 3).map(x => x.e), score: top?.s ?? 0 };
  return { found: true, entry: top.e, others: scored.slice(1, 3).filter(x => x.s >= MIN_SCORE * 0.6).map(x => x.e), score: top.s };
}
