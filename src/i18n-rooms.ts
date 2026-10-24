/* The words inside the 3D rooms in Russian (round 151): the names of the rooms and of the parts of a flat, the things that can be used, and why a piece of
   furniture does not fit. Loaded only with the 3D world (rooms3d.ts, world3d.ts) and the furnishing panel, so the first download does not grow.
   Before this, the rooms showed English words to a player who had chosen Russian. */
import { lang } from './i18n';

const RU: Record<string, string> = {
  // the homes
  'A bunk in a shared room': 'Койка в общей комнате', 'A dormitory room': 'Комната в общежитии', 'A euro-two in a new block': 'Евродвушка в новостройке',
  'A flat in a panel block': 'Квартира в панельном доме', 'A one-room khrushchyovka': 'Однушка в хрущёвке', 'A room in a kommunalka': 'Комната в коммуналке',
  'A roomy flat in a stalinka': 'Просторная квартира в сталинке', 'A village house': 'Деревенский дом', 'The house you built': 'Дом, который вы построили', 'Your own studio': 'Ваша студия',
  // the parts of a flat
  Bathroom: 'Ванная', Bedroom: 'Спальня', Corridor: 'Коридор', Hallway: 'Прихожая', Izba: 'Изба', Kitchen: 'Кухня', 'Kitchen-diner': 'Кухня-столовая',
  'Kitchen-living room': 'Кухня-гостиная', 'Living room': 'Гостиная', Loggia: 'Лоджия', Neighbours: 'Соседи', Room: 'Комната', 'Seni (entrance hall)': 'Сени',
  'Shared bathroom': 'Общая ванная', 'Shared kitchen': 'Общая кухня', 'Shower and toilet': 'Душ и туалет', Study: 'Кабинет', 'The block corridor': 'Коридор блока',
  'Wardrobe room': 'Гардеробная', 'Your room': 'Ваша комната',
  // the things at home
  'Bath: wash up': 'Ванна: помыться', 'Bath: wash up (there is a queue every morning)': 'Ванна: помыться (по утрам очередь)', 'Bed with a quilt: rest at home': 'Кровать с лоскутным одеялом: отдохнуть дома',
  'Bed: rest and recover': 'Кровать: отдохнуть и поправиться', 'Bed: rest at home': 'Кровать: отдохнуть дома', 'Built-in cupboard: change clothes': 'Встроенный шкаф: переодеться',
  'Desk: online services': 'Стол: онлайн-сервисы', 'Fridge: eat something': 'Холодильник: перекусить', 'Gas stove: cook': 'Газовая плита: готовить', 'Hob: cook': 'Варочная панель: готовить',
  'Hot plate (officially not allowed): cook': 'Плитка (вообще-то запрещена): готовить', 'Induction hob: cook': 'Индукционная плита: готовить', Phone: 'Телефон',
  'Russian stove (pech): cook': 'Русская печь: готовить', 'Settle: stay in': 'Лавка: побыть дома', 'Shared bath (mind the queue): wash up': 'Общая ванна (следите за очередью): помыться',
  'Shared fridge: eat something': 'Общий холодильник: перекусить', 'Shower: wash up': 'Душ: помыться', 'Small fridge: eat something': 'Маленький холодильник: перекусить',
  'Small table: online services': 'Столик: онлайн-сервисы', 'Sofa bed: rest at home': 'Диван-кровать: отдохнуть дома', 'Sofa: stay in': 'Диван: побыть дома', 'Stove: cook': 'Плита: готовить',
  'Table: online services': 'Стол: онлайн-сервисы', 'Wardrobe (shkaf): change clothes': 'Шкаф: переодеться', 'Wardrobe room: change clothes': 'Гардеробная: переодеться',
  'Wardrobe: change clothes': 'Шкаф: переодеться', 'Washstand: wash up': 'Рукомойник: умыться', 'Your bunk: rest at home': 'Ваша койка: отдохнуть дома',
  'Your fridge (it has a lock): eat something': 'Ваш холодильник (с замком): перекусить', 'Your locker: change clothes': 'Ваш шкафчик: переодеться', 'Your stove: cook': 'Ваша плита: готовить',
  // the places
  'A lecture hall': 'Аудитория', 'A workplace': 'Рабочее место', 'Your workplace': 'Ваша работа', 'Bank branch': 'Отделение банка', 'The airport terminal': 'Терминал аэропорта',
  'The animal shelter': 'Приют для животных', 'The car showroom': 'Автосалон', 'The city hospital': 'Городская больница', 'The electronics mall': 'Магазин электроники',
  'The estate agency': 'Агентство недвижимости', 'The market': 'Рынок', 'The migration department': 'Отдел по вопросам миграции', 'The multifunctional centre (MFC)': 'МФЦ «Мои документы»',
  'The polyclinic': 'Поликлиника', 'The railway station': 'Вокзал',
  'Ballot box: polling station': 'Урна: избирательный участок', 'Board: study': 'Доска: учиться', 'Car: look and buy': 'Машина: посмотреть и купить', 'Cash machine': 'Банкомат',
  'Check-in desk: flights': 'Стойка регистрации: рейсы', 'Coffee machine: a break': 'Кофемашина: перерыв', 'Counter: banking': 'Окно: банковские услуги', Departures: 'Вылет',
  'Desk: flats and homes': 'Стол: квартиры и дома', 'Desk: study': 'Парта: учиться', 'Desk: work a shift': 'Рабочий стол: отработать смену', "Doctor's waiting chair": 'Кресло у кабинета врача',
  'Flats for rent': 'Квартиры в аренду', 'Forms and rules': 'Бланки и правила', 'Forms desk': 'Стол для заполнения бланков', 'Kennel: meet the dogs': 'Вольер: познакомиться с собаками',
  "Lecturer's desk": 'Стол преподавателя', 'Notice board': 'Доска объявлений', 'Opening hours': 'Часы работы', 'Queue ticket': 'Талон электронной очереди',
  'Queue ticket machine': 'Терминал электронной очереди', 'Reception: health': 'Регистратура: здоровье', 'Sales desk': 'Отдел продаж', 'Shop: phones and gadgets': 'Магазин: телефоны и гаджеты',
  'Stall: shop': 'Прилавок: купить', 'Ticket window: travel': 'Касса: поездки', Timetable: 'Расписание', "Volunteers' table": 'Стол волонтёров', 'Window: paperwork': 'Окно: документы',
  Exit: 'Выход',
  // why a piece does not fit
  'off the wall': 'не помещается на стене', taken: 'место занято', 'outside the room': 'за пределами комнаты', 'blocks the door': 'загораживает дверь',
  'something is there': 'здесь уже что-то стоит', 'a wall is there': 'здесь стена', 'would block the way': 'перегородит проход', 'It does not fit.': 'Не помещается.',
};

/** A word of the 3D rooms in the player's language (English stays as it is). "Desk: work a shift (Trainee)" keeps the rank in brackets. */
export function roomL(en: string): string {
  if (lang() !== 'ru') return en;
  const hit = RU[en]; if (hit) return hit;
  const m = /^(.*) \((.+)\)$/.exec(en); if (m && RU[m[1]]) return `${RU[m[1]]} (${m[2]})`;
  return en;
}
/** For the tests: every word that has a Russian form. */
export const ROOM_WORDS = Object.keys(RU);
