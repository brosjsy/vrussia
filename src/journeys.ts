/* Journeys: the road a player takes to get something done, as steps in order, each at a place on the map or online in the phone. For example
   buying a SIM card: mobile identification online, then the electronics mall, then the operator shop. The same data draws a flowchart and a route on
   the map (journeys-ui.ts) and tells a player which step is next. Pure: it only reads the state. */
import type { State } from './engine';

export type Bi = [en: string, ru: string];
export interface Step {
  icon: string; title: Bi; note: Bi;
  /** A place on the map (a PLACES id) where this step happens; absent for a step done online or in the phone. */
  place?: string;
  /** True when the step is finished. A step with a place and no `done` is finished when the player stands at the place. */
  done?: (s: State) => boolean;
  /** Steps that do not apply to this player (a citizen does not need mobile identification) are left out. */
  skip?: (s: State) => boolean;
}
export interface Journey { id: string; icon: string; title: Bi; steps: Step[] }

const foreigner = (s: State): boolean => s.status !== 'citizen';

export const JOURNEYS: Journey[] = [
  { id: 'sim', icon: '📱', title: ['Buy a SIM card', 'Купить SIM-карту'], steps: [
    { icon: '📲', title: ['Mobile identification', 'Мобильная идентификация'], note: ['Phone, Online services, Mobile identification (₽2,500). Foreigners only.', 'Телефон, «Онлайн-услуги», «Мобильная идентификация» (₽2 500). Только для иностранцев.'], done: s => !!s.flags.simId || !!s.flags.sim, skip: s => !foreigner(s) },
    { icon: '🏬', title: ['Go to the Electronics mall', 'Идти в торговый центр электроники'], note: ['The operator shop is in the mall. Walk there in the 3D city, or use the map.', 'Салон оператора находится в торговом центре. Идите пешком по 3D-городу или выберите место на карте.'], place: 'mall' },
    { icon: '🛒', title: ['Buy the SIM in the operator shop', 'Купить SIM в салоне оператора'], note: ['Show your passport. The SIM costs about ₽400.', 'Покажите паспорт. SIM стоит около ₽400.'], place: 'mall', done: s => !!s.flags.sim },
  ] },
  { id: 'reg', icon: '🏠', title: ['Register your address', 'Встать на учёт по адресу'], steps: [
    { icon: '🏛️', title: ['Go to the MFC', 'Идти в МФЦ'], note: ['The MFC (multifunctional centre) takes the papers.', 'МФЦ (многофункциональный центр) принимает документы.'], place: 'mfc' },
    { icon: '📝', title: ['File the registration', 'Подать регистрацию'], note: ['You need a passport and the landlord\'s consent.', 'Нужны паспорт и согласие владельца жилья.'], place: 'mfc', done: s => !!s.flags.registered || s.docs.reg > 0 || !!s.flags.rvp },
  ], },
  { id: 'patent', icon: '🧾', title: ['Get a work patent', 'Оформить патент на работу'], steps: [
    { icon: '🏠', title: ['Register your address first', 'Сначала регистрация по адресу'], note: ['The patent needs a valid registration. See the route "Register your address".', 'Для патента нужна действующая регистрация. Смотрите маршрут «Встать на учёт по адресу».'], done: s => !!s.flags.registered || s.docs.reg > 0 || !!s.flags.rvp },
    { icon: '🩺', title: ['Pass the medical exam', 'Пройти медосмотр'], note: ['Done in the paperwork centre; it is needed for the patent.', 'Проходится через центр документов; нужен для патента.'], place: 'mfc', done: s => !!s.flags.med || !!s.flags.rvp },
    { icon: '🛡️', title: ['Get health insurance', 'Оформить медицинскую страховку'], note: ['Phone, Online services, or the bank.', 'Телефон, «Онлайн-услуги» или банк.'], done: s => !!s.flags.insured || !!s.flags.rvp },
    { icon: '🧾', title: ['Buy the patent at the MFC', 'Купить патент в МФЦ'], note: ['Pay the monthly fee. Keep the receipt.', 'Оплатите месячный взнос. Сохраните чек.'], place: 'mfc', done: s => s.docs.patent > 0 || !!s.flags.rvp },
  ], },
  { id: 'bank', icon: '🏦', title: ['Open a bank account', 'Открыть счёт в банке'], steps: [
    { icon: '🏦', title: ['Go to the bank branch', 'Идти в отделение банка'], note: ['Take your passport and registration.', 'Возьмите паспорт и регистрацию.'], place: 'bank' },
    { icon: '💳', title: ['Open the account', 'Открыть счёт'], note: ['Or use the bank form in the phone.', 'Или воспользуйтесь формой банка в телефоне.'], place: 'bank', done: s => Object.values(s.bank).some(Boolean) },
  ] },
  { id: 'card', icon: '🚇', title: ['Buy a transport card', 'Купить транспортную карту'], steps: [
    { icon: '🛒', title: ['Go to the market or the mall', 'Идти на рынок или в торговый центр'], note: ['The card is sold at a kiosk there.', 'Карту продают в киоске.'], place: 'market' },
    { icon: '🚇', title: ['Buy the card', 'Купить карту'], note: ['A small refundable deposit; trips get cheaper.', 'Небольшой возвращаемый залог; поездки дешевле.'], place: 'market', done: s => !!s.flags.troika },
  ] },
  { id: 'licence', icon: '🚘', title: ['Get a driving licence', 'Получить водительские права'], steps: [
    { icon: '🏫', title: ['Enrol in a driving school', 'Записаться в автошколу'], note: ['Phone, Driving exam, Enrol (₽35,000). Foreigners with a licence can exchange it instead.', 'Телефон, «Экзамен на права», «Записаться» (₽35 000). Иностранцы с правами могут обменять их.'], done: s => !!s.flags.enrolled || !!s.flags.license },
    { icon: '📝', title: ['Pass the theory exam on the portal', 'Сдать теорию на портале'], note: ['20 questions, 2 mistakes at most.', '20 вопросов, не более 2 ошибок.'], done: s => !!s.flags.theory || !!s.flags.license },
    { icon: '🚦', title: ['Pass the practical exam', 'Сдать практический экзамен'], note: ['5 road situations, after two weeks of lessons.', '5 дорожных ситуаций, после двух недель занятий.'], done: s => !!s.flags.license },
    { icon: '🚗', title: ['Visit the car dealership', 'Зайти в автосалон'], note: ['With a licence you may buy a car.', 'С правами можно покупать машину.'], place: 'dealer', done: s => !!s.car },
  ] },
];

export type StepState = 'done' | 'now' | 'later';
export interface Shown { step: Step; n: number; state: StepState }
export const journeyById = (id: string): Journey | undefined => JOURNEYS.find(j => j.id === id);

/** The steps that apply to this player, each marked done, now (the first open one) or later. A step counts as done when any later step is done. */
export function walkThrough(s: State, j: Journey): Shown[] {
  const list = j.steps.filter(x => !x.skip?.(s));
  const own = list.map(x => (x.done ? x.done(s) : !!x.place && s.loc === x.place));
  const last = own.lastIndexOf(true);
  let now = -1;
  const out = list.map((step, i): Shown => {
    const done = i <= last || own[i];
    if (!done && now < 0) now = i;
    return { step, n: i + 1, state: done ? 'done' : i === now ? 'now' : 'later' };
  });
  return out;
}
/** True when every step of the journey is done. */
export const finished = (s: State, j: Journey): boolean => walkThrough(s, j).every(x => x.state === 'done');
/** The places of the route in order (a place is listed once in a row), starting where the player stands. */
export function routePlaces(s: State, j: Journey): string[] {
  const out: string[] = [s.loc];
  for (const x of walkThrough(s, j)) if (x.step.place && out[out.length - 1] !== x.step.place) out.push(x.step.place);
  return out;
}
/** The journey that fits the first open item of the newcomer's checklist, if any. */
export const journeyForChecklist = (id: string): string | null => ({ sim: 'sim', reg: 'reg', med: 'patent', patent: 'patent', bank: 'bank', card: 'card' } as Record<string, string>)[id] ?? null;
