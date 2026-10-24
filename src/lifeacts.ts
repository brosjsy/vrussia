/* City life: the many ordinary things people do, as data. Each activity is one line: where it is done, what it costs, the energy, how often it can be
   done, what is needed, what it gives (the needs, stress, health, knowledge, reputation), sometimes a thing that can go wrong, and whether it takes a
   part of the day. Some are courses of several steps with an exam at the end (the driving school). New activities are added by adding lines; the
   City life app lists them by category with a search, and counts how many different things the player has done: the player builds the life they
   choose. Prices and effects are game values; where a real rule matters it is named (the licence exam at the traffic police, the consumer law).
   Pure rules over the game state. */
import type { State } from './engine';
import { advance, dateOf } from './engine';
import * as G from './engine';
import { turnHooks } from './turn';
import { MORE, NEEDS } from './lifeacts-more';

export type Cat = 'health' | 'food' | 'leisure' | 'culture' | 'faith' | 'social' | 'family' | 'transport' | 'money' | 'papers' | 'home' | 'pets' | 'community'
  | 'work' | 'kids' | 'study' | 'sport' | 'shopping' | 'repair' | 'travel' | 'beauty' | 'digital' | 'nature' | 'celebrate';
export const CATS: { id: Cat; name: string; ru: string; icon: string }[] = [
  { id: 'health', name: 'Health and body', ru: 'Здоровье и тело', icon: '🩺' }, { id: 'food', name: 'Food', ru: 'Еда', icon: '🍲' }, { id: 'leisure', name: 'Free time', ru: 'Досуг', icon: '🎳' },
  { id: 'culture', name: 'Culture', ru: 'Культура', icon: '🎭' }, { id: 'faith', name: 'Faith', ru: 'Вера', icon: '🕯️' }, { id: 'social', name: 'Friends', ru: 'Друзья', icon: '👥' },
  { id: 'family', name: 'Family and love', ru: 'Семья и любовь', icon: '💞' }, { id: 'transport', name: 'Getting around', ru: 'Транспорт', icon: '🛴' }, { id: 'money', name: 'Money', ru: 'Деньги', icon: '💳' },
  { id: 'papers', name: 'Papers and law', ru: 'Документы и право', icon: '📄' }, { id: 'home', name: 'Home and property', ru: 'Жильё', icon: '🏠' }, { id: 'pets', name: 'Pets', ru: 'Питомцы', icon: '🐾' },
  { id: 'community', name: 'Community', ru: 'Общество', icon: '🤝' },
  { id: 'work', name: 'Work day', ru: 'Рабочий день', icon: '💼' }, { id: 'kids', name: 'Children', ru: 'Дети', icon: '🧒' }, { id: 'study', name: 'Study', ru: 'Учёба', icon: '🎓' },
  { id: 'sport', name: 'Sport', ru: 'Спорт', icon: '🏃' }, { id: 'shopping', name: 'Shopping', ru: 'Покупки', icon: '🛍️' }, { id: 'repair', name: 'Repairs and the building', ru: 'Ремонт и дом', icon: '🔨' },
  { id: 'travel', name: 'Travel', ru: 'Путешествия', icon: '🧳' }, { id: 'beauty', name: 'Care and beauty', ru: 'Уход и красота', icon: '💅' }, { id: 'digital', name: 'Phone and online', ru: 'Телефон и интернет', icon: '📱' },
  { id: 'nature', name: 'Nature and outdoors', ru: 'Природа', icon: '🌲' }, { id: 'celebrate', name: 'Holidays and traditions', ru: 'Праздники и традиции', icon: '🎊' },
];
type Need = 'hunger' | 'hygiene' | 'social' | 'fun' | 'bladder';
export interface Fx { stress?: number; health?: number; know?: number; rep?: number; energy?: number; money?: number; love?: number; bond?: number; need?: Partial<Record<Need, number>> }
export interface Act {
  id: string; cat: Cat; icon: string; name: string; ru: string; where: 'home' | 'out' | 'any'; cost: number; energy: number;
  /** days before it can be done again (0: once a day) */ every: number;
  /** takes a part of the day (the clock moves on) */ time: boolean;
  fx: Fx; msg: string;
  need?: (s: State) => string | null;
  risk?: { p: number; msg: string; fx: Fx };
  /** a course of several steps (each a visit), with an exam at the last one */ steps?: { n: number; exam: (s: State) => number; pass: string; fail: string; done: (s: State) => void };
  /** the catalogue entry it fulfils (src/catalog.ts) */ cat2?: string;
}
const months = (s: State): number => dateOf(s).getMonth() + 1;
const warm = (s: State): string | null => (months(s) >= 4 && months(s) <= 10 ? null : 'Not in this season (April to October).');
const winter = (s: State): string | null => ([12, 1, 2, 3].includes(months(s)) ? null : 'Only in winter (December to March).');
const owner = (s: State): string | null => (s.housing === 'flat' || s.housing === 'house' ? null : 'You need a flat or house of your own.');
const hasPet = (kind?: RegExp) => (s: State): string | null => (!s.pet ? 'You have no pet.' : kind && !kind.test(s.pet.kind) ? 'This is for a dog.' : null);
const partner = (s: State): string | null => (s.partner ? null : 'You have no partner.');
const licence = (s: State): string | null => (s.flags.licence ? null : 'You need a driving licence (the driving school).');
const working = (s: State): string | null => (s.job || (s as State & { service?: { role: string | null } }).service?.role ? null : 'You have no job to take leave from.');
const big = (s: State): string | null => (['Moscow', 'Saint Petersburg', 'Kazan', 'Yekaterinburg', 'Novosibirsk', 'Nizhny Novgorod', 'Samara', 'Krasnodar', 'Sochi', 'Rostov-on-Don', 'Ufa', 'Perm', 'Voronezh', 'Chelyabinsk', 'Krasnoyarsk'].includes(s.city) ? null : `Not in ${s.city} yet: only in the big cities.`);
const lawRecent = (s: State): string | null => { const r = (s as State & { law?: { record: { day: number; kind: string }[] } }).law?.record?.[0]; return r && s.day - r.day <= 10 ? null : 'There is no court decision of the last ten days to appeal.'; };
const N = (n: Partial<Record<Need, number>>): Fx['need'] => n;

export const ACTS: Act[] = [
  // health and body
  { id: 'pharmacy', cat: 'health', icon: '💊', name: 'Buy medicine at the pharmacy', ru: 'Купить лекарства в аптеке', where: 'out', cost: 650, energy: 3, every: 0, time: false, fx: { health: 6 }, msg: 'The pharmacist suggests something cheaper with the same active ingredient.', cat2: 'pharmacy' },
  { id: 'dentist', cat: 'health', icon: '🦷', name: 'See the dentist', ru: 'Сходить к стоматологу', where: 'out', cost: 3500, energy: 6, every: 30, time: true, fx: { health: 5, stress: 4 }, msg: 'A filling, a lecture about flossing, and a numb cheek for an hour.', cat2: 'dentist' },
  { id: 'gym', cat: 'health', icon: '🏋️', name: 'Work out at the gym', ru: 'Тренировка в спортзале', where: 'out', cost: 500, energy: 18, every: 0, time: true, fx: { health: 3, stress: -6 }, msg: 'Squats, a mirror and a man who grunts.', risk: { p: 0.04, msg: 'You pulled a muscle in your back.', fx: { health: -6 } }, cat2: 'gym' },
  { id: 'run', cat: 'health', icon: '🏃', name: 'Go for a run in the park', ru: 'Пробежка в парке', where: 'out', cost: 0, energy: 14, every: 0, time: false, fx: { health: 3, stress: -5 }, msg: 'Five kilometres and a dog that ran with you for a while.', need: s => (s.weather === 'frost' ? 'Too cold to run today.' : null), cat2: 'run' },
  { id: 'yoga', cat: 'health', icon: '🧘', name: 'Yoga and stretching', ru: 'Йога и растяжка', where: 'any', cost: 0, energy: 6, every: 0, time: false, fx: { stress: -6, health: 1 }, msg: 'Twenty minutes on the floor with a video. Your back says thank you.', cat2: 'yoga' },
  { id: 'banya', cat: 'health', icon: '🧖', name: 'Go to the banya', ru: 'Сходить в баню', where: 'out', cost: 1200, energy: 8, every: 0, time: true, fx: { stress: -12, health: 2, need: N({ hygiene: 50, social: 15 }) }, msg: 'Steam, a birch broom, a cold plunge and tea with strangers who are now friends.', cat2: 'banya' },
  { id: 'haircut', cat: 'health', icon: '💇', name: 'A haircut at the barber\'s', ru: 'Стрижка в парикмахерской', where: 'out', cost: 900, energy: 2, every: 14, time: false, fx: { rep: 1, stress: -2 }, msg: 'Shorter on the sides. The barber tells you about his cousin in Samara.', cat2: 'haircut' },
  { id: 'vaccine', cat: 'health', icon: '💉', name: 'Get the flu jab (free with OMS)', ru: 'Прививка от гриппа (бесплатно по ОМС)', where: 'out', cost: 0, energy: 4, every: 300, time: false, fx: { health: 4 }, msg: 'A sore arm for a day; a winter without the flu, most likely.', cat2: 'vaccine' },
  { id: 'therapy', cat: 'health', icon: '🛋️', name: 'See a psychologist', ru: 'Сходить к психологу', where: 'out', cost: 3500, energy: 6, every: 7, time: true, fx: { stress: -18 }, msg: 'You talked for an hour. Some of it was about your mother.', cat2: 'therapy' },
  { id: 'blood', cat: 'health', icon: '🩸', name: 'Donate blood', ru: 'Сдать кровь', where: 'out', cost: 0, energy: 12, every: 60, time: true, fx: { rep: 3, stress: -3, money: 1000 }, msg: 'Half a litre, a chocolate, a day off by law (art. 186 of the Labour Code) and a small payment for lunch.', need: s => (s.health < 60 ? 'The doctor will not take blood from you today: health 60 is needed.' : null), cat2: 'blood' },
  { id: 'sickleave', cat: 'health', icon: '🤒', name: 'Take sick leave (a doctor\'s certificate)', ru: 'Взять больничный', where: 'any', cost: 0, energy: 0, every: 7, time: true, fx: { health: 12, stress: -8, energy: 25 }, msg: 'The doctor opens an electronic sick note; the employer pays most of your wage while you rest (the Social Fund pays the rest).', need: s => working(s) ?? (s.health >= 70 ? 'You are not ill enough for a sick note.' : null), cat2: 'sickleave' },
  // food
  { id: 'delivery', cat: 'food', icon: '🛵', name: 'Order food delivery', ru: 'Заказать доставку еды', where: 'home', cost: 750, energy: 0, every: 0, time: false, fx: { need: N({ hunger: 45 }), stress: -2 }, msg: 'A courier in an orange jacket, forty minutes, still warm.', cat2: 'delivery' },
  { id: 'shawarma', cat: 'food', icon: '🌯', name: 'Shawarma from the stall', ru: 'Шаурма в ларьке', where: 'out', cost: 280, energy: 0, every: 0, time: false, fx: { need: N({ hunger: 35 }) }, msg: 'Garlic sauce down your sleeve. Worth it.', risk: { p: 0.05, msg: 'Your stomach disagrees with that stall.', fx: { health: -5 } }, cat2: 'shawarma' },
  { id: 'marketfood', cat: 'food', icon: '🥕', name: 'Buy fresh food at the market, haggle', ru: 'Купить свежее на рынке, поторговаться', where: 'out', cost: 600, energy: 4, every: 0, time: false, fx: { need: N({ hunger: 25, social: 6 }), health: 1 }, msg: 'The aunt at the stall gives you an extra apple "for your smile".', cat2: 'market_food' },
  { id: 'diet', cat: 'food', icon: '🥗', name: 'Eat healthy today, count calories', ru: 'Правильно питаться, считать калории', where: 'any', cost: 300, energy: 2, every: 0, time: false, fx: { health: 2, need: N({ hunger: 20, fun: -5 }) }, msg: 'Buckwheat, chicken breast, a salad. Virtuous and a bit sad.', cat2: 'diet' },
  { id: 'fast', cat: 'food', icon: '🌙', name: 'Fast today (Ramadan or Lent), break the fast with others', ru: 'Держать пост, разговляться вместе', where: 'any', cost: 200, energy: 6, every: 0, time: false, fx: { stress: -4, need: N({ hunger: -10, social: 15 }) }, msg: 'A long day, then dates or lenten soup at a shared table.', cat2: 'fasting' },
  { id: 'teafriends', cat: 'food', icon: '🍵', name: 'Tea with friends in the kitchen', ru: 'Чай с друзьями на кухне', where: 'home', cost: 250, energy: 2, every: 0, time: false, fx: { stress: -5, need: N({ social: 20, hunger: 8 }) }, msg: 'Three hours, two cakes, all of life discussed.', cat2: 'tea' },
  // free time
  { id: 'cinema', cat: 'leisure', icon: '🎬', name: 'Go to the cinema', ru: 'Сходить в кино', where: 'out', cost: 450, energy: 4, every: 0, time: true, fx: { stress: -6, need: N({ fun: 30 }) }, msg: 'A Russian comedy, popcorn, a phone lighting up two rows ahead.', cat2: 'cinema' },
  { id: 'skating', cat: 'leisure', icon: '⛸️', name: 'Ice skating at the rink', ru: 'Покататься на катке', where: 'out', cost: 500, energy: 12, every: 0, time: true, fx: { stress: -8, need: N({ fun: 30, social: 10 }) }, msg: 'Music, lights and you holding the barrier.', need: winter, risk: { p: 0.06, msg: 'You fell on the ice: a bruised wrist.', fx: { health: -5 } }, cat2: 'skating' },
  { id: 'fishing', cat: 'leisure', icon: '🎣', name: 'Go fishing on the river', ru: 'Порыбачить на реке', where: 'out', cost: 300, energy: 10, every: 0, time: true, fx: { stress: -12, need: N({ fun: 15, hunger: 10 }) }, msg: 'Four hours, two small perches, total peace.', cat2: 'fishing' },
  { id: 'football', cat: 'leisure', icon: '⚽', name: 'Watch football at a sports bar', ru: 'Смотреть футбол в спорт-баре', where: 'out', cost: 900, energy: 4, every: 0, time: true, fx: { stress: -5, need: N({ social: 20, fun: 20, hunger: 15 }) }, msg: 'Spartak against Zenit, and the whole bar shouting at the referee.', cat2: 'sport_watch' },
  { id: 'hobby', cat: 'leisure', icon: '🎸', name: 'A club: music, drawing or a sports section', ru: 'Кружок: музыка, рисование или секция', where: 'out', cost: 700, energy: 8, every: 3, time: true, fx: { stress: -7, know: 1, need: N({ social: 15, fun: 20 }) }, msg: 'The teacher says you have "something". Probably kind words.', cat2: 'hobby' },
  { id: 'dacha', cat: 'leisure', icon: '🏡', name: 'A weekend at a friend\'s dacha', ru: 'Выходные на даче у друзей', where: 'out', cost: 600, energy: 10, every: 6, time: true, fx: { stress: -14, need: N({ social: 20, hunger: 20, fun: 15 }) }, msg: 'Shashlik, potatoes to dig and a banya at night.', need: warm, cat2: 'dacha' },
  { id: 'scooter', cat: 'transport', icon: '🛴', name: 'Ride a rented scooter', ru: 'Прокатиться на самокате', where: 'out', cost: 180, energy: 2, every: 0, time: false, fx: { need: N({ fun: 15 }) }, msg: 'Twenty minutes through the boulevards at the speed limit of the zone.', need: s => warm(s) ?? big(s), risk: { p: 0.05, msg: 'A kerb and a scraped knee.', fx: { health: -6 } }, cat2: 'scooter' },
  { id: 'carshare', cat: 'transport', icon: '🚙', name: 'Carsharing for errands', ru: 'Каршеринг по делам', where: 'out', cost: 650, energy: 2, every: 0, time: false, fx: { stress: -3 }, msg: 'Open it with the app, an hour of errands, leave it on the street.', need: s => licence(s) ?? big(s), cat2: 'carsharing' },
  { id: 'drivingschool', cat: 'transport', icon: '🚗', name: 'Driving school (category B)', ru: 'Автошкола (категория B)', where: 'out', cost: 4500, energy: 12, every: 0, time: true, fx: { know: 1, stress: 3 }, msg: 'A lesson: the rules of the road, then the training ground.', need: s => (s.flags.licence ? 'You have your licence.' : null),
    steps: { n: 10, exam: s => Math.min(0.9, 0.35 + s.know / 150), pass: 'The traffic police exam: 20 theory questions and the city route. Passed: your licence in an hour.', fail: 'The exam inspector stopped you on the route for a missed sign. Take the exam again.', done: s => { s.flags.licence = true; } }, cat2: 'drivingschool' },
  // culture and faith
  { id: 'theatre', cat: 'culture', icon: '🎭', name: 'The theatre or the ballet', ru: 'Театр или балет', where: 'out', cost: 2500, energy: 4, every: 0, time: true, fx: { stress: -8, know: 1, rep: 1, need: N({ fun: 25 }) }, msg: 'A buffet with champagne in the interval, as tradition says.', cat2: 'theatre' },
  { id: 'concert', cat: 'culture', icon: '🎤', name: 'A concert', ru: 'Концерт', where: 'out', cost: 3000, energy: 10, every: 0, time: true, fx: { stress: -10, need: N({ fun: 40, social: 15 }) }, msg: 'Ten thousand people singing the same chorus.', cat2: 'concert' },
  { id: 'library', cat: 'culture', icon: '📚', name: 'Read at the library (free)', ru: 'Почитать в библиотеке (бесплатно)', where: 'out', cost: 0, energy: 4, every: 0, time: true, fx: { know: 2, stress: -3 }, msg: 'Quiet, Wi-Fi, and a librarian who recommends a book you will actually like.', cat2: 'library' },
  { id: 'faith', cat: 'faith', icon: '🕯️', name: 'Go to church, the mosque or the synagogue', ru: 'Сходить в церковь, мечеть или синагогу', where: 'out', cost: 100, energy: 4, every: 0, time: false, fx: { stress: -8, need: N({ social: 10 }) }, msg: 'A candle, a prayer, an hour of quiet among people.', cat2: 'church' },
  // friends and family
  { id: 'guests', cat: 'social', icon: '🥂', name: 'Invite friends home', ru: 'Позвать друзей в гости', where: 'home', cost: 2500, energy: 10, every: 3, time: true, fx: { stress: -8, rep: 1, need: N({ social: 35, hunger: 20, fun: 20 }) }, msg: 'Salads in big bowls, a toast for everybody and dishes until midnight.', cat2: 'guests' },
  { id: 'neighbours', cat: 'social', icon: '🚪', name: 'Talk to the neighbours, borrow some salt', ru: 'Поговорить с соседями, одолжить соли', where: 'home', cost: 0, energy: 2, every: 0, time: false, fx: { rep: 1, need: N({ social: 10 }) }, msg: 'You now know who the noise upstairs is, and her name is Galina Petrovna.', cat2: 'neighbours' },
  { id: 'birthday', cat: 'social', icon: '🎂', name: 'Celebrate your birthday', ru: 'Отметить день рождения', where: 'any', cost: 4000, energy: 10, every: 365, time: true, fx: { stress: -12, rep: 2, need: N({ social: 40, fun: 40 }) }, msg: 'A cake, candles, a song in two languages and presents you did not expect.', cat2: 'birthday' },
  { id: 'zags', cat: 'family', icon: '💍', name: 'Register the marriage at the ZAGS', ru: 'Зарегистрировать брак в ЗАГСе', where: 'out', cost: 5000, energy: 8, every: 9999, time: true, fx: { stress: -5, rep: 3, love: 15 }, msg: 'A stamp in the passports, rings, rose petals on the steps. Married.', need: s => partner(s) ?? (s.flags.married ? 'You are married already.' : (s as State & { law?: { register?: boolean } }).law?.register ? 'People on the register of controlled persons cannot marry.' : null), cat2: 'marriage_reg' },
  { id: 'wedding', cat: 'family', icon: '💒', name: 'A wedding party', ru: 'Свадьба', where: 'out', cost: 60000, energy: 20, every: 9999, time: true, fx: { stress: -15, rep: 4, love: 10, need: N({ social: 60, fun: 50 }) }, msg: 'A toastmaster, a bride kidnapping game and an uncle who dances on the table.', need: s => (s.flags.married ? (s.flags.weddingParty ? 'You had your wedding.' : null) : 'Register the marriage first.'), cat2: 'wedding' },
  { id: 'date', cat: 'family', icon: '🌹', name: 'An evening out with your partner', ru: 'Вечер вдвоём', where: 'out', cost: 2500, energy: 6, every: 0, time: true, fx: { stress: -8, love: 8, need: N({ social: 20, fun: 20 }) }, msg: 'A walk on the embankment and dinner where nobody looks at the phone.', need: partner },
  { id: 'breakup', cat: 'family', icon: '💔', name: 'Break up (or divorce)', ru: 'Расстаться (или развестись)', where: 'any', cost: 0, energy: 10, every: 9999, time: false, fx: { stress: 15 }, msg: 'It is over. Your friends bring wine and say it is for the best.', need: partner, cat2: 'breakup' },
  // pets
  { id: 'walkdog', cat: 'pets', icon: '🐕', name: 'Walk the dog', ru: 'Погулять с собакой', where: 'out', cost: 0, energy: 5, every: 0, time: false, fx: { stress: -5, bond: 6, need: N({ social: 8 }) }, msg: 'Two other dog owners, a wet nose and a lot of sniffing.', need: hasPet(/dog/i), cat2: 'walkdog' },
  { id: 'vet', cat: 'pets', icon: '🩺', name: 'Take the pet to the vet', ru: 'Сводить питомца к ветеринару', where: 'out', cost: 1800, energy: 4, every: 30, time: false, fx: { bond: 10 }, msg: 'Vaccinations, a check-up and a treat for being brave.', need: hasPet(), cat2: 'vet' },
  // money
  { id: 'lottery', cat: 'money', icon: '🎟️', name: 'Buy a lottery ticket', ru: 'Купить лотерейный билет', where: 'out', cost: 100, energy: 0, every: 0, time: false, fx: {}, msg: 'No luck this time.', risk: { p: 0.03, msg: 'You won 5,000 ₽!', fx: { money: 5000 } }, cat2: 'lottery' },
  { id: 'freelance', cat: 'money', icon: '💻', name: 'A freelance job online', ru: 'Фриланс-заказ онлайн', where: 'home', cost: 0, energy: 12, every: 0, time: true, fx: { money: 1800, stress: 3 }, msg: 'A small translation for a client who answers at two in the morning.', need: s => (s.know < 30 ? 'Knowledge 30 is needed for clients to trust you.' : null), cat2: 'freelance' },
  { id: 'selfemployed', cat: 'money', icon: '🧾', name: 'Register as self-employed in the "My Tax" app', ru: 'Стать самозанятым в «Мой налог»', where: 'any', cost: 0, energy: 1, every: 9999, time: false, fx: { rep: 1 }, msg: 'Ten minutes on the phone. Freelance income is now legal: 4% from people, 6% from companies.', need: s => (s.status !== 'citizen' && s.status !== 'eaeu' && !s.flags.naturalized ? 'Self-employment is for citizens of Russia and of the EAEU.' : s.flags.selfEmployed ? 'You are registered.' : null), cat2: 'selfemployed' },
  { id: 'donate', cat: 'community', icon: '❤️', name: 'Donate to a charity', ru: 'Пожертвовать на благотворительность', where: 'any', cost: 500, energy: 0, every: 7, time: false, fx: { rep: 2, stress: -3 }, msg: 'For children\'s surgery. A thank-you message with a photo comes a week later.', cat2: 'donate' },
  { id: 'volunteer', cat: 'community', icon: '🙌', name: 'Volunteer (a food bank, a park clean-up)', ru: 'Волонтёрство (фудбанк, уборка парка)', where: 'out', cost: 0, energy: 12, every: 2, time: true, fx: { rep: 3, stress: -4, need: N({ social: 20 }) }, msg: 'Bags of food for pensioners, and tea with the team after.', cat2: 'volunteer' },
  // papers and law
  { id: 'appeal', cat: 'papers', icon: '⚖️', name: 'Appeal the last court decision (within 10 days)', ru: 'Обжаловать решение суда (в течение 10 дней)', where: 'out', cost: 5000, energy: 10, every: 9999, time: true, fx: { stress: 6 }, msg: 'The higher court left the decision as it was.', need: lawRecent,
    risk: { p: 0.3, msg: 'The higher court cancelled the decision: the violation is taken off your record.', fx: {} }, cat2: 'appeal' },
  { id: 'lostpassport', cat: 'papers', icon: '🛂', name: 'Restore a lost passport', ru: 'Восстановить утерянный паспорт', where: 'out', cost: 1500, energy: 10, every: 0, time: true, fx: { stress: -6 }, msg: 'A police certificate of loss, the state duty, a temporary ID at the MFC, the new passport in ten days.', need: s => (s.flags.passportLost ? null : 'Your passport is safe.'), cat2: 'lostpassport' },
  { id: 'consulate', cat: 'papers', icon: '🏳️', name: 'Go to your country\'s consulate', ru: 'Сходить в консульство своей страны', where: 'out', cost: 1000, energy: 8, every: 7, time: true, fx: { stress: -5 }, msg: 'A notarised translation, advice in your language, and a queue of people from home.', need: s => (s.status === 'citizen' && !s.flags.naturalized ? 'You are a Russian citizen.' : null), cat2: 'consulate' },
  // home and property
  { id: 'letout', cat: 'home', icon: '🔑', name: 'Let out a room (a contract, taxes paid)', ru: 'Сдать комнату (договор, с налогом)', where: 'any', cost: 0, energy: 4, every: 30, time: false, fx: { money: 18000 }, msg: 'A student pays for the month by contract; you declare it as self-employed income.', need: owner, risk: { p: 0.1, msg: 'The tenant left without paying and broke the tap.', fx: { money: -18000, stress: 8 } }, cat2: 'let_out' },
  { id: 'sellflat', cat: 'home', icon: '🏷️', name: 'Sell your flat (through an agency)', ru: 'Продать квартиру (через агентство)', where: 'any', cost: 0, energy: 10, every: 9999, time: true, fx: { money: 4200000, stress: 8 }, msg: 'Viewings, a deposit, the deal at the bank and the registration at Rosreestr. The money is in your account; you rent again.', need: s => (s.housing === 'flat' ? null : 'You need a flat of your own to sell.'), cat2: 'sell_flat' },
  { id: 'parcels', cat: 'home', icon: '📦', name: 'Order online and collect at the pick-up point', ru: 'Заказать онлайн и забрать в пункте выдачи', where: 'out', cost: 1500, energy: 3, every: 0, time: false, fx: { need: N({ fun: 15 }), stress: -2 }, msg: 'A QR code, a queue of three, and the box is smaller than in the photo.', cat2: 'parcels' },
  { id: 'market', cat: 'home', icon: '🧺', name: 'Walk round the clothes market', ru: 'Пройтись по вещевому рынку', where: 'out', cost: 1200, energy: 6, every: 0, time: true, fx: { need: N({ fun: 10, social: 8 }) }, msg: 'A warm hat and gloves for half the shop price, after some haggling.', cat2: 'market' },
  { id: 'ambulance', cat: 'health', icon: '🚑', name: 'Call an ambulance (103, free)', ru: 'Вызвать скорую (103, бесплатно)', where: 'any', cost: 0, energy: 0, every: 3, time: true, fx: { health: 18, stress: -5 }, msg: 'The crew came in twenty minutes, gave you a drip and left a list for the polyclinic.', need: s => (s.health > 40 ? 'Call 103 only when it is serious (health 40 or less).' : null), cat2: 'ambulance' },
  { id: 'dms', cat: 'health', icon: '🛡️', name: 'Buy private health insurance (DMS) for a year', ru: 'Купить полис ДМС на год', where: 'any', cost: 15000, energy: 1, every: 365, time: false, fx: { health: 4, stress: -4 }, msg: 'A private clinic without queues, and a dentist included.', cat2: 'insurance' },
  { id: 'labour', cat: 'papers', icon: '📨', name: 'Complain to the labour inspectorate about unpaid wages', ru: 'Пожаловаться в трудовую инспекцию на невыплату', where: 'any', cost: 0, energy: 4, every: 30, time: false, fx: { stress: 4 }, msg: 'The complaint is registered online; the inspectorate will check the employer. No answer yet.', need: s => (s.job ? null : 'You need a job (and an employer who owes you).'), risk: { p: 0.45, msg: 'After the inspectorate\'s visit the employer paid what he owed, with interest for the delay.', fx: { money: 12000, stress: -6 } }, cat2: 'union' },
  { id: 'proptax', cat: 'money', icon: '🏛️', name: 'Pay the property tax (on the state services portal)', ru: 'Заплатить налог на имущество (на Госуслугах)', where: 'any', cost: 2400, energy: 0, every: 365, time: false, fx: { stress: -2 }, msg: 'Paid before 1 December: no penalty, no letters.', need: owner, cat2: 'tax' },
  { id: 'returnthing', cat: 'home', icon: '↩️', name: 'Return a faulty thing to the shop', ru: 'Вернуть бракованный товар', where: 'out', cost: 0, energy: 5, every: 30, time: false, fx: { money: 2500, stress: -2 }, msg: 'With the receipt and a reference to the consumer protection law, the money comes back.', risk: { p: 0.3, msg: 'The shop says it was "used wrongly" and sends it for an expert check. Two weeks.', fx: { money: -2500, stress: 5 } }, cat2: 'returns' },
];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** "m5" is May, "m12-1" December to January: null in those months, else when it is. */
function inMonths(w: string, m: number): string | null {
  const [a, b] = w.slice(1).split('-').map(Number), to = b ?? a, ok = a <= to ? m >= a && m <= to : m >= a || m <= to;
  return ok ? null : `Only in ${MONTH[a - 1]}${to !== a ? ` to ${MONTH[to - 1]}` : ''}.`;
}
/** The short lines of lifeacts-more.ts made into activities: "s-5 so10" into effects, "job warm" into what is needed. */
const KEYS: Record<string, keyof Fx | Need> = { s: 'stress', h: 'health', k: 'know', r: 'rep', e: 'energy', m: 'money', l: 'love', b: 'bond', hu: 'hunger', hy: 'hygiene', so: 'social', fu: 'fun' };
const NEED_KEYS: string[] = ['hunger', 'hygiene', 'social', 'fun', 'bladder'];
export function parseFx(t: string): Fx {
  const fx: Fx = {};
  for (const tok of t.split(/\s+/).filter(Boolean)) {
    const m = tok.match(/^([a-z]+)(-?\d+)$/); const k = m ? KEYS[m[1]] : undefined; if (!m || !k) throw new Error('bad effect: ' + tok);
    if (NEED_KEYS.includes(k)) (fx.need ??= {})[k as Need] = Number(m[2]); else (fx as Record<string, number>)[k] = Number(m[2]);
  }
  return fx;
}
for (const [id, cat, icon, name, ru, where, cost, energy, every, time, fx, needs, msg] of MORE) {
  const words = needs.split(/\s+/).filter(Boolean); for (const w of words) if (!NEEDS[w] && !/^m\d+(-\d+)?$/.test(w)) throw new Error('bad need: ' + w);
  ACTS.push({ id, cat: cat as Cat, icon, name, ru, where: where === 'h' ? 'home' : where === 'o' ? 'out' : 'any', cost, energy, every, time: time === 1, fx: parseFx(fx), msg,
    need: words.length ? s => { for (const w of words) { const why = NEEDS[w] ? NEEDS[w](s as never, months(s)) : inMonths(w, months(s)); if (why) return why; } return null; } : undefined });
}
export const actOf = (id: string): Act | undefined => ACTS.find(a => a.id === id);

export interface LifeState { done: Record<string, number>; count: Record<string, number>; step: Record<string, number> }
type S = State & { lifeacts?: LifeState };
export const lifeOf = (s: State): LifeState => { const x = s as S; if (!x.lifeacts) x.lifeacts = { done: {}, count: {}, step: {} }; return x.lifeacts; };
const clamp = (v: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, v));
const hash = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };

/** Why an activity cannot be done now (null when it can). */
export function cannotDo(s: State, id: string): string | null {
  const a = actOf(id); if (!a) return 'No such thing.';
  const why = a.need?.(s); if (why) return why;                 // what is needed comes first: it says more than a cooldown
  const L = lifeOf(s), last = L.done[id];
  if (last !== undefined && (a.every === 0 ? last === s.day : s.day - last < a.every)) return a.every >= 9999 ? 'Done already.' : a.every === 0 ? 'Done today already.' : `Again in ${a.every - (s.day - last)} days.`;
  if (a.where === 'home' && s.loc !== 'home') return 'Only at home.';
  if (a.time && s.slot >= 2 && a.id !== 'sickleave') return 'Too late in the day for that.';
  if (s.money < a.cost) return `It costs ${a.cost.toLocaleString('en-US')} ₽.`;
  if (s.energy < a.energy + 3) return 'You are too tired.';
  return null;
}
function apply(s: State, fx: Fx): void {
  if (fx.stress) s.stress = clamp(s.stress + fx.stress); if (fx.health) s.health = clamp(s.health + fx.health); if (fx.know) s.know = clamp(s.know + fx.know);
  if (fx.rep) s.rep = clamp(s.rep + fx.rep); if (fx.energy) s.energy = clamp(s.energy + fx.energy); if (fx.money) s.money += fx.money;
  if (fx.love && s.partner) s.partner.love = clamp(s.partner.love + fx.love); if (fx.bond && s.pet) s.pet.bond = clamp(s.pet.bond + fx.bond);
  const n = (s as State & { needs?: Record<Need, number> }).needs; if (fx.need && n) for (const [k, v] of Object.entries(fx.need)) n[k as Need] = clamp((n[k as Need] ?? 50) + (v ?? 0));
}
/** Does an activity: pays, spends energy, gives its effects (or the thing that went wrong), counts it, and moves the clock if it takes time. */
export function doAct(s: State, id: string): { ok: boolean; msg: string } {
  const why = cannotDo(s, id); if (why) return { ok: false, msg: why };
  const a = actOf(id)!, L = lifeOf(s);
  s.money -= a.cost; s.energy = clamp(s.energy - a.energy); L.done[id] = s.day; L.count[id] = (L.count[id] ?? 0) + 1;
  let msg = a.msg;
  if (a.steps) {
    const k = (L.step[id] ?? 0) + 1; L.step[id] = k; apply(s, a.fx);
    if (k < a.steps.n) msg = `${a.msg} (${k} of ${a.steps.n}; the exam after the last.)`;
    else if ((hash(`${s.name}|${s.day}|${id}`) % 100) / 100 < a.steps.exam(s)) { a.steps.done(s); msg = a.steps.pass; }
    else { L.step[id] = a.steps.n - 1; msg = a.steps.fail; }
  } else if (a.risk && (hash(`${s.name}|${s.day}|${id}|risk`) % 1000) / 1000 < a.risk.p) { apply(s, a.risk.fx); msg = a.risk.msg; if (id === 'appeal') appealWon(s); }
  else apply(s, a.fx);
  if (id === 'zags') s.flags.married = true;
  if (id === 'wedding') s.flags.weddingParty = true;
  if (id === 'breakup') { s.partner = null; s.flags.married = false; }
  if (id === 'selfemployed') s.flags.selfEmployed = true;
  if (id === 'lostpassport') s.flags.passportLost = false;
  if (id === 'sellflat') { s.housing = 'rented'; s.rent = Math.max(s.rent, 6000); }
  if (a.time && !s.over) advance(s);
  return { ok: true, msg };
}
/** A won appeal takes the last offence off the record and one violation away. */
function appealWon(s: State): void { const law = (s as State & { law?: { record: unknown[] } }).law; if (law?.record?.length) { law.record.shift(); s.strikes = Math.max(0, s.strikes - 1); } }
/** How many different activities the player has done, of all there are. */
export const variety = (s: State): { done: number; all: number } => ({ done: Object.keys(lifeOf(s).count).length, all: ACTS.length });

/** Once in a long while a passport is lost (the City life app then offers to restore it). */
export function tickLife(s: State): string[] {
  const L = lifeOf(s) as LifeState & { ticked?: number }; if ((L.ticked ?? -1) >= s.day || s.over) return []; L.ticked = s.day;
  if (s.job && !s.queue.includes('life_funeral') && (hash(`${s.name}|${s.day}|funeral`) % 1000) < 2) s.queue.push('life_funeral');
  if (!s.flags.passportLost && (hash(`${s.name}|${s.day}|passport`) % 1000) < 2) { s.flags.passportLost = true; return ['🛂 Your passport is gone: dropped somewhere or stolen. Restore it (City life, Papers).']; }
  return [];
}
G.dyn.life_funeral = () => ({ id: 'life_funeral', cat: 'life', title: 'Sad news', text: 'A colleague\'s father has died. The funeral is tomorrow, and the wake (pominki) after it, at the family\'s flat.', free: true, choices: [
  { t: 'Go to the funeral and the wake', r: x => { x.money -= 1500; x.stress = clamp(x.stress + 4); x.rep = clamp(x.rep + 3); const n = (x as State & { needs?: Record<Need, number> }).needs; if (n) n.social = clamp(n.social + 15); return { msg: 'Flowers in an even number, a quiet hour at the cemetery, kutya and stories about him at the table. The family will remember you came.', fx: {} }; } },
  { t: 'Send condolences and some money', r: x => { x.money -= 2000; x.rep = clamp(x.rep + 1); return { msg: 'A message and 2,000 ₽ for the family. They thank you.', fx: {} }; } },
  { t: 'Call and say a few words', r: x => { x.stress = clamp(x.stress + 2); return { msg: 'A short, awkward, kind call.', fx: {} }; } },
] });
turnHooks.push(tickLife);
