/* "What to do next": the first thing on the newcomer's checklist that is not done yet, in plain words, with where in the game it is done.
   Shown on the main screen so that a new player is never left asking what the game wants from them. Pure; ui.ts draws it. */
import type { State } from './engine';
import { checklistFor } from './engine';

/** For each checklist id: [title in English, title in Russian, how in English, how in Russian]. */
const HOW: Record<string, [string, string, string, string]> = {
  reg: ['Register your address', 'Встать на миграционный учёт', 'Open the phone, then Online services, and fill in the registration form. Or visit the MFC (Multifunctional centre) on the map.', 'Откройте телефон, раздел «Онлайн-услуги», и заполните форму регистрации. Или сходите в МФЦ на карте.'],
  med: ['Pass the medical exam', 'Пройти медосмотр для патента', 'Go to the hospital on the map and choose the migrant medical examination.', 'Идите в больницу на карте и выберите медосмотр для мигрантов.'],
  patent: ['Buy a work patent', 'Купить патент на работу', 'Needs registration and the medical exam first. Then the MFC on the map, or Online services in the phone.', 'Сначала нужны регистрация и медосмотр. Потом МФЦ на карте или «Онлайн-услуги» в телефоне.'],
  sim: ['Get a Russian SIM card', 'Купить российскую SIM-карту', 'Foreigners first need mobile identification: phone, Online services, Mobile identification. After that the shop sells you the SIM at once. Citizens only need a passport at an operator shop.', 'Иностранцу сначала нужна идентификация: телефон, «Онлайн-услуги», «Мобильная идентификация». После неё магазин сразу продаёт SIM. Гражданину хватает паспорта в салоне оператора.'],
  bank: ['Open a bank account', 'Открыть счёт в банке', 'Go to the bank branch on the map, or use the bank form in the phone.', 'Идите в отделение банка на карте или используйте форму банка в телефоне.'],
  card: ['Buy a transport card', 'Купить транспортную карту', 'It is sold at the station or the metro. It makes trips cheaper than single tickets.', 'Её продают на вокзале и в метро. Поездки по ней дешевле разовых билетов.'],
  coat: ['Buy warm clothes', 'Купить тёплую одежду', 'Use the Shop action or visit the market. Winter is cold: below 40 clothing you lose health.', 'Действие «Магазин» или рынок. Зимой холодно: при одежде ниже 40 здоровье падает.'],
  ins: ['Get health insurance', 'Оформить медицинскую страховку', 'Look in the phone, Online services, or at the bank. Without it a hospital visit is expensive.', 'Смотрите в телефоне, «Онлайн-услуги», или в банке. Без неё визит в больницу дорогой.'],
  work: ['Find a job or a university place', 'Найти работу или место в вузе', 'Open Jobs on the phone, or pick the Work action. Students: the university is on the map.', 'Откройте «Работа» в телефоне или действие «Работа». Студентам: университет есть на карте.'],
};

export interface NextStep { id: string; title: string; how: string; left: number }
/** The first open item, or null when the checklist is done. */
export function nextStep(s: State, ru: boolean): NextStep | null {
  const open = checklistFor(s).filter(c => !c.done);
  const first = open[0]; if (!first) return null;
  const h = HOW[first.item.id];
  return { id: first.item.id, title: h ? h[ru ? 1 : 0] : first.item.label, how: h ? h[ru ? 3 : 2] : '', left: open.length };
}
