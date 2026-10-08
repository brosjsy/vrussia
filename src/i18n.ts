/* English / Russian interface. Only the interface is translated (menus, buttons, labels, dates, weather, stat names,
   the seven starting characters). The thousands of story texts are still in English. */
export type Lang = 'en' | 'ru';

const KEY = 'vrussia_lang';
let current: Lang = 'en';
try { if (localStorage.getItem(KEY) === 'ru') current = 'ru'; } catch { /* storage may be blocked */ }

export const lang = (): Lang => current;
export function setLang(l: Lang): void {
  current = l;
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  document.documentElement.lang = l;
}

/** Interface strings. Every key must exist in both languages (tested). */
export const EN: Record<string, string> = {
  tag: 'A free browser life simulator of Russia: <b id="tagCount">{n}</b> across culture, history, traditions, study, work and everyday life — for citizens and newcomers alike.',
  scenarios: 'scenarios',
  note: '',
  name: 'Your name', namePh: 'e.g. Rustam, Aisha, Ivan',
  startCity: 'Starting city (optional — migrants default to Moscow)', cityDefault: 'Default for your character',
  chooseLife: 'Choose your life', random: '🎲 Random', start: 'Start', continue: 'Continue saved game',
  export: '⬇ Export save', exportTip: 'Download your saved game as a file', import: '⬆ Import save',
  profile: '👤 My profile & awards', cityMap: 'City map', documents: 'Documents', checklist: 'First-month checklist', goals: 'Goals',
  help: '❓ How to play', journal: '📜 Journal', newGame: '⟲ New game', close: 'Close', langBtn: 'RU',
  whatNow: 'What now?', pick: 'Pick how to spend this part of the day.', warning: 'Warning', result: 'Result', next: 'Continue',
  strikes: 'Legal strikes', startsIn: 'Starts in', unemployed: 'unemployed',
  difficulty: 'Difficulty', 'diff.easy': 'Easy: more money, fewer checks', 'diff.normal': 'Normal', 'diff.hard': 'Realistic: less money, more checks',
  dialogLabel: 'Details', playAgain: 'Play again', finalScore: 'final score', dayWord: 'Day', strikesWord: 'strikes', achievementsWord: 'Achievements', journalTitle: 'Journal', nothingYet: 'Nothing yet.', recent: 'Lately',
  'stat.energy': 'Energy', 'stat.health': 'Health', 'stat.stress': 'Stress', 'stat.rep': 'Reputation', 'stat.know': 'Knowledge', 'stat.clothes': 'Clothing', 'stat.famLove': 'Family bond',
  'slot.0': 'Morning', 'slot.1': 'Afternoon', 'slot.2': 'Evening',
  'weather.snow': '❄️ Snow', 'weather.frost': '🥶 Hard frost', 'weather.rain': '🌧️ Rain', 'weather.heat': '☀️ Heat', 'weather.clear': '⛅ Clear',
  award: '«Patriot» Award', awardMore: 'Earn it in the game by learning, taking part and helping others.',
  awardText: 'The National «Patriot» Award is a public award for those who do not stand aside: people and organisations who develop and improve everyday life in Russia — through culture, knowledge, volunteering and care for their neighbours.',
};

export const RU: Record<string, string> = {
  tag: 'Бесплатный браузерный симулятор жизни в России: <b id="tagCount">{n}</b> о культуре, истории, традициях, учёбе, работе и повседневной жизни — для граждан и новичков.',
  scenarios: 'ситуаций',
  note: 'Интерфейс переведён на русский. Тексты самих ситуаций пока остаются на английском.',
  name: 'Ваше имя', namePh: 'например: Рустам, Айша, Иван',
  startCity: 'Город старта (необязательно — мигранты по умолчанию начинают в Москве)', cityDefault: 'По умолчанию для героя',
  chooseLife: 'Выберите жизнь', random: '🎲 Случайно', start: 'Начать', continue: 'Продолжить сохранённую игру',
  export: '⬇ Экспорт сохранения', exportTip: 'Скачать сохранённую игру файлом', import: '⬆ Импорт сохранения',
  profile: '👤 Мой профиль и награды', cityMap: 'Карта города', documents: 'Документы', checklist: 'Список на первый месяц', goals: 'Цели',
  help: '❓ Как играть', journal: '📜 Дневник', newGame: '⟲ Новая игра', close: 'Закрыть', langBtn: 'EN',
  whatNow: 'Что дальше?', pick: 'Выберите, как провести эту часть дня.', warning: 'Внимание', result: 'Итог', next: 'Дальше',
  strikes: 'Нарушения', startsIn: 'Старт', unemployed: 'без работы',
  difficulty: 'Сложность', 'diff.easy': 'Лёгкая: больше денег, меньше проверок', 'diff.normal': 'Обычная', 'diff.hard': 'Реалистичная: меньше денег, больше проверок',
  dialogLabel: 'Подробности', playAgain: 'Играть снова', finalScore: 'итоговый счёт', dayWord: 'День', strikesWord: 'нарушений', achievementsWord: 'Достижения', journalTitle: 'Дневник', nothingYet: 'Пока пусто.', recent: 'Недавно',
  'stat.energy': 'Энергия', 'stat.health': 'Здоровье', 'stat.stress': 'Стресс', 'stat.rep': 'Репутация', 'stat.know': 'Знания', 'stat.clothes': 'Одежда', 'stat.famLove': 'Связь с семьёй',
  'slot.0': 'Утро', 'slot.1': 'День', 'slot.2': 'Вечер',
  'weather.snow': '❄️ Снег', 'weather.frost': '🥶 Сильный мороз', 'weather.rain': '🌧️ Дождь', 'weather.heat': '☀️ Жара', 'weather.clear': '⛅ Ясно',
  award: 'Премия «Патриот»', awardMore: 'Заслужите её в игре: учитесь, участвуйте в жизни города и помогайте другим.',
  awardText: 'Национальная премия «Патриот» — общественная награда для тех, кто не стоит в стороне: для людей и организаций, которые развивают и улучшают повседневную жизнь в России — через культуру, знания, волонтёрство и заботу о соседях.',
};

export const t = (key: string): string => (current === 'ru' ? RU[key] : undefined) ?? EN[key] ?? key;

/** Names and hints of the action buttons, by action id. */
export const ACTIONS_RU: Record<string, [string, string]> = {
  work: ['Смена на работе', 'Заработок (нужна работа)'],
  food: ['Поесть', 'Восстановить энергию'],
  travel: ['Поездка (карта)', 'Куда-нибудь в городе'],
  out: ['Выйти в город', 'Люди, город, проверки'],
  paper: ['Документы', 'МФЦ, миграция, бумаги'],
  money: ['Банки и магазины', 'Банки, телефоны, машины, жильё'],
  people: ['Люди и любовь', 'Друзья, партнёр, дети'],
  edu: ['Учёба и экзамены', 'Знания, поступление'],
  home: ['Остаться дома', 'Отдых и жильё'],
  family: ['Позвонить семье', 'Переводы, дом'],
  culture: ['Культура и общество', 'История, традиции, волонтёрство'],
  online: ['Онлайн-сервисы', 'Работа, врач, жильё, банк, билеты'],
  flight: ['Купить авиабилет', 'Сайт авиакомпании'],
  pets: ['Питомцы и бродячие собаки', 'Объявления о приюте, бездомные собаки'],
  biz: ['Мой бизнес', 'Клиенты, сотрудники, налоги, рост'],
};

export const ORIGINS_RU: Record<string, [string, string]> = {
  moscow: ['Золотая молодёжь Москвы', 'Состоятельные родители, квартира у Патриарших. Ваша проблема — скука и отец, который «знает нужного человека».'],
  region: ['Выходец из провинции', 'Панельный дом, мама работает на двух работах. Мечта — бюджетное место в московском вузе.'],
  tajik: ['Мигрант из Таджикистана', 'Только с поезда на Казанском. Пятнадцать дней на регистрацию, патент впереди, семья ждёт переводов.'],
  uzbek: ['Мигрант из Узбекистана', 'У двоюродного брата есть жильё в Подмосковье. Нужны регистрация, медосмотр и патент — именно в таком порядке.'],
  kyrgyz: ['Работник из Киргизии (ЕАЭС)', 'Гражданин страны ЕАЭС: патент не нужен, но регистрация и трудовой договор по-прежнему важны.'],
  student: ['Иностранный студент', 'Квотное место в Казани. Общежитие, зима, продление визы и борщ.'],
  dagestan: ['Студент из Дагестана', 'Гражданин с Кавказа, большая семья, первый раз в столице. Готовьтесь к вопросу «а вы откуда на самом деле?».'],
};

export function actionText(a: { id: string; label: string; hint: string }): { label: string; hint: string } {
  const r = current === 'ru' ? ACTIONS_RU[a.id] : undefined;
  return r ? { label: r[0], hint: r[1] } : { label: a.label, hint: a.hint };
}
export function originText(o: { id: string; label: string; blurb: string }): { label: string; blurb: string } {
  const r = current === 'ru' ? ORIGINS_RU[o.id] : undefined;
  return r ? { label: r[0], blurb: r[1] } : { label: o.label, blurb: o.blurb };
}
export const locale = (): string => (current === 'ru' ? 'ru-RU' : 'en-GB');

/** Applies the current language to every element marked with data-i18n (text), data-i18n-ph (placeholder) or data-i18n-tip (title). */
export function applyStatic(root: ParentNode = document, count = ''): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n as string;
    if (key === 'tag') el.innerHTML = t('tag').replace('{n}', count || '4,000+ ' + t('scenarios'));
    else if (key === 'awardText') el.textContent = t('awardText');
    else el.textContent = t(key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-ph]').forEach(el => { (el as HTMLInputElement).placeholder = t(el.dataset.i18nPh as string); });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria as string)); });
  root.querySelectorAll<HTMLElement>('[data-i18n-tip]').forEach(el => { el.title = t(el.dataset.i18nTip as string); });
}

/* ---------- longer texts: how to play, endings ---------- */
export const HELP_RU = `<h3>Как играть</h3><ul class="help">
  <li><b>Время.</b> День состоит из трёх частей: утро, день и вечер. Каждое действие занимает одну часть. Аренда оплачивается по субботам.</li>
  <li><b>Действия.</b> Работа, еда, прогулки, документы, учёба, звонки семье, банки и магазины, общение, свой бизнес, уход за питомцем. Клавиши <b>1–9</b> выбирают вариант, <b>Enter</b> продолжает.</li>
  <li><b>Карта.</b> Нажмите на место на карте, чтобы отправиться туда. В снег и мороз легко заблудиться; хороший телефон и знакомый маршрут помогают.</li>
  <li><b>Онлайн-сервисы.</b> Кнопка 💻 открывает сайты, которые заполняются по шагам: работа, врач, жильё, банковский счёт, билеты на поезд, портал вуза и другое. Кнопка ✈️ — авиабилеты.</li>
  <li><b>Документы (для приезжих).</b> Следите за сроком регистрации, патента или визы. Просроченные документы ведут к проверкам, штрафам и нарушениям. Три нарушения — депортация. Чистая история постепенно снимает нарушения.</li>
  <li><b>Цели.</b> Учитесь, делайте карьеру или создайте компанию, получите РВП, затем ВНЖ и гражданство, создайте семью, возьмите собаку из приюта, заслужите премию «Патриот» и собирайте достижения.</li>
  <li><b>Деньги.</b> Зарплаты, аренда, расходы, кредиты и налоги упрощены. Это игровая модель, а не юридический или финансовый совет.</li>
  <li><b>Сохранение.</b> Игра сохраняется сама. Файл сохранения можно экспортировать и импортировать на первом экране.</li>
</ul>`;

export const ENDINGS_RU: Record<string, [string, string]> = {
  hospital: ['🏥 Больница', 'Вы взяли на себя слишком много. Врачи городской больницы говорят, что единственное лекарство — сон.'],
  deported: ['✈️ Депортация', 'Три нарушения в учёте. Пограничная служба, запрет на въезд, билет в один конец.'],
  debt: ['💸 Долговая яма', 'Коллекторы, займы, телефон, который не замолкает. Пора начинать заново.'],
  time: ['📅 Два года в России', 'Вы пережили две зимы. Вот чем закончилась ваша история.'],
};
export function endingText(id: string, en: [string, string]): [string, string] {
  return (current === 'ru' ? ENDINGS_RU[id] : undefined) ?? en;
}
