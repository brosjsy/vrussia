/* The Russian word lists (round 149): the creator, the dreams, the cities, the places, the checklist and the decrees, keyed by the English text.
   Its own small download, loaded when the game is in Russian (i18n-words.ts). */

import { ACH_MORE_RU } from './i18n-ach-more';

export const WORDS_RU: Record<string, string> = {
  // ready-made characters and starting looks
  'International student in a puffer jacket': 'Иностранный студент в пуховике', 'Local office worker in a wool coat': 'Офисный работник в шерстяном пальто', 'Babushka (a character of the city)': 'Бабушка (персонаж города)',
  'Slavic / Russian': 'Славянская / русская', 'Central Asian (Tajik, Uzbek, Kyrgyz)': 'Среднеазиатская (таджики, узбеки, киргизы)', 'Caucasus (Dagestani, Chechen, Armenian)': 'Кавказ (дагестанцы, чеченцы, армяне)',
  'Tatar / Bashkir': 'Татарская / башкирская', 'East Asian / Siberian': 'Восточноазиатская / сибирская', African: 'Африканская',
  'Grandmother on the bench': 'Бабушка на лавочке', 'Metro worker': 'Работник метро', 'Office worker': 'Офисный работник', 'Security guard': 'Охранник', 'Shop cashier': 'Кассир в магазине',
  'Street musician': 'Уличный музыкант', Student: 'Студент', 'Taxi driver': 'Таксист',
  // body and face
  Slim: 'Худощавое', Average: 'Среднее', Broad: 'Крепкое', Heavy: 'Полное', Oval: 'Овальное', Round: 'Круглое', Square: 'Квадратное', Heart: 'Сердечком', Long: 'Длинное', Diamond: 'Ромбом',
  Soft: 'Мягкие', Straight: 'Прямые', Thick: 'Густые', Arched: 'Дугой', Small: 'Маленький', Wide: 'Широкий', Thin: 'Тонкие', Medium: 'Средние', Full: 'Полные',
  None: 'Нет', Stubble: 'Щетина', Moustache: 'Усы', Beard: 'Борода', Goatee: 'Бородка',
  Almond: 'Миндалевидные', Narrow: 'Узкие', Hooded: 'С нависшим веком', Upturned: 'Приподнятые', Downturned: 'Опущенные', Monolid: 'Без складки',
  Short: 'Невысокий', Tall: 'Высокий',
  // hair
  Curly: 'Кудрявые', Bun: 'Пучок', Buzz: 'Ёжик', Bald: 'Лысый', Braid: 'Коса набок', Wavy: 'Волнистые', Coily: 'Мелкие кудри', Undercut: 'Андеркат', Bob: 'Каре', Afro: 'Афро', Locs: 'Дреды',
  'Long plait': 'Длинная коса', Ponytail: 'Хвост', Pixie: 'Пикси', 'Side part': 'Пробор набок', Mohawk: 'Ирокез', 'Twin buns': 'Два пучка', Cornrows: 'Косички', Shag: 'Шегги', 'Hat hair': 'Под шапкой',
  Black: 'Чёрные', 'Dark brown': 'Тёмно-каштановые', Brown: 'Каштановые', 'Light brown': 'Светло-русые', Blond: 'Светлые', 'Very fair': 'Платиновые', Red: 'Рыжие', Grey: 'Седые', White: 'Белые',
  // clothes and shoes
  'T-shirt': 'Футболка', Sweater: 'Свитер', Shirt: 'Рубашка', Hoodie: 'Худи', Dress: 'Платье', Tracksuit: 'Спортивный костюм', 'Folk blouse': 'Народная блуза',
  Jeans: 'Джинсы', Trousers: 'Брюки', Shorts: 'Шорты', Skirt: 'Юбка', Sneakers: 'Кроссовки', Boots: 'Ботинки', Shoes: 'Туфли', Sandals: 'Сандалии', Valenki: 'Валенки', Slippers: 'Тапочки',
  // dreams
  Doctor: 'Врач', 'Study medicine and heal people.': 'Изучать медицину и лечить людей.', Engineer: 'Инженер', 'Build things that work.': 'Строить то, что работает.',
  Entrepreneur: 'Предприниматель', 'Start your own company.': 'Открыть свою компанию.', Teacher: 'Учитель', 'Pass knowledge on.': 'Передавать знания.',
  Artist: 'Художник', 'Live for culture and beauty.': 'Жить культурой и красотой.', Athlete: 'Спортсмен', 'Strong body, strong mind.': 'Сильное тело, сильный дух.',
  Driver: 'Водитель', 'Own a car and the open road.': 'Своя машина и дорога.', 'Russian citizen': 'Гражданин России', 'Make Russia home for good (for newcomers).': 'Сделать Россию своим домом навсегда (для приезжих).',
};
/** The eye colours: "Grey" means a different word for eyes than for hair. */
export const EYE_RU: Record<string, string> = { Grey: 'Серые', Blue: 'Голубые', Green: 'Зелёные', Hazel: 'Карие (светлые)', Brown: 'Карие' };

export const CITY_RU: Record<string, string> = {
  Moscow: 'Москва', 'Saint Petersburg': 'Санкт-Петербург', Kazan: 'Казань', Yekaterinburg: 'Екатеринбург', Novosibirsk: 'Новосибирск', Krasnodar: 'Краснодар', Sochi: 'Сочи', Vladivostok: 'Владивосток',
  Grozny: 'Грозный', 'Nizhny Novgorod': 'Нижний Новгород', Samara: 'Самара', Kaliningrad: 'Калининград', Saratov: 'Саратов', Omsk: 'Омск', Chelyabinsk: 'Челябинск', 'Rostov-on-Don': 'Ростов-на-Дону',
  Ufa: 'Уфа', Krasnoyarsk: 'Красноярск', Perm: 'Пермь', Voronezh: 'Воронеж', Volgograd: 'Волгоград', Tyumen: 'Тюмень', Tolyatti: 'Тольятти', Izhevsk: 'Ижевск', Barnaul: 'Барнаул', Irkutsk: 'Иркутск',
  Ulyanovsk: 'Ульяновск', Khabarovsk: 'Хабаровск', Yakutsk: 'Якутск', Murmansk: 'Мурманск', Arkhangelsk: 'Архангельск', Makhachkala: 'Махачкала', Tula: 'Тула', Yaroslavl: 'Ярославль', Vladimir: 'Владимир',
  Pskov: 'Псков', 'Veliky Novgorod': 'Великий Новгород',
};
/** Where Russian needs another form of the word (a straight nose, but straight brows; short hair, but a short person). */
export const GROUP_RU: Record<string, Record<string, string>> = {
  height: { Short: 'Невысокий', Average: 'Средний', Tall: 'Высокий' },
  nose: { Small: 'Маленький', Straight: 'Прямой', Wide: 'Широкий', Long: 'Длинный' },
  hairStyle: { Short: 'Короткие', Long: 'Длинные' },
  eyes: { Round: 'Круглые', Wide: 'Широко посаженные' },
  lips: { Thin: 'Тонкие', Medium: 'Средние', Full: 'Полные', Wide: 'Широкие' },
  face: { Long: 'Вытянутое', Round: 'Круглое' },
  build: { Average: 'Среднее' },
};

/* the places of the city, their one-line descriptions, the first-month checklist and the city's decrees (round 149) */
export const PLACE_RU: Record<string, string> = { Home: 'Дом', 'Railway station': 'Вокзал', MFC: 'МФЦ', 'Migration dept.': 'Миграционная служба', University: 'Университет', Market: 'Рынок', Polyclinic: 'Поликлиника',
  Workplace: 'Работа', 'Bank branch': 'Отделение банка', 'City centre': 'Центр города', 'Electronics mall': 'Торговый центр электроники', Airport: 'Аэропорт', 'Car dealership': 'Автосалон',
  'Real estate agency': 'Агентство недвижимости', 'City hospital': 'Городская больница', 'Animal shelter': 'Приют для животных' };
export const FLAVOUR_RU: Record<string, string> = {
  home: 'Ваша квартира. Чайник уже горячий.', station: 'Поезда, пирожки и люди с очень большими сумками.', mfc: 'Многофункциональный центр: аппарат с талонами и долгое ожидание.',
  guvm: 'Миграционная служба. Каждую бумагу приносите в двух экземплярах.', uni: 'Коридоры, запах столовой и списки экзаменов на стене.', market: 'Мёд, соленья, торг и очень много мнений.',
  clinic: 'Поликлиника. Регистратура видела всё.', work: 'Ваша работа. Кто-нибудь всегда ставит чайник.', bank: 'Отделение банка с номерком в очереди и цветком в горшке.',
  center: 'Центр города: площади, памятники и голуби.', mall: 'Телефоны, провода и бодрый продавец-консультант.', airport: 'Стойки регистрации и запах кофе в четыре утра.',
  dealer: 'Блестящий пол и менеджер с очень широкой улыбкой.', agency: 'Фотографии квартир, которые выглядят больше, чем они есть.', hospital: 'Городская больница. Тихие коридоры и добрые медсёстры.',
  shelter: 'Виляющие хвосты и волонтёр с чайником.' };
export const CHECK_RU: Record<string, string> = { 'Register your address': 'Встать на учёт по адресу', 'Pass the medical exam (needed for a patent)': 'Пройти медосвидетельствование (нужно для патента)',
  'Buy a work patent': 'Купить патент на работу', 'Get a Russian SIM card': 'Купить российскую SIM-карту', 'Open a bank account': 'Открыть счёт в банке', 'Buy a transport card': 'Купить транспортную карту',
  'Buy warm clothes (clothing 50+)': 'Купить тёплую одежду (одежда 50+)', 'Health insurance': 'Медицинская страховка', 'Find a job or a university place': 'Найти работу или место в университете' };
export const DECREE_RU: Record<string, string> = {
  'Queue numbers at the MFC are now handed out from 8:00': 'Талоны в МФЦ теперь выдают с 8:00', 'Radiators go on when it stays cold for five days': 'Отопление включают, когда холод держится пять дней',
  'Free vaccination day for pets at the shelter this Saturday': 'В субботу в приюте бесплатная вакцинация питомцев', 'Roadworks: allow extra time on buses this week': 'Ремонт дорог: на этой неделе закладывайте больше времени на автобус',
  'Quiet hours in the courtyards from 23:00 to 7:00': 'Тишина во дворах с 23:00 до 7:00', 'Free tea in the polyclinic waiting hall on weekday mornings': 'По будним утрам в поликлинике бесплатный чай в зале ожидания',
  'Subbotnik: courtyard clean-up day, gloves provided': 'Субботник: уборка дворов, перчатки выдадут', 'Libraries stay open until 20:00 during exam season': 'В сессию библиотеки работают до 20:00',
  'New bicycle lanes open along the main street': 'Вдоль главной улицы открылись велодорожки', 'Free Russian conversation clubs for newcomers in the library': 'В библиотеке бесплатные разговорные клубы русского языка для приезжих',
  'Street lights are being replaced: some evenings are darker': 'Меняют фонари: некоторыми вечерами будет темнее', 'Snow clearing starts at 5:00, move your car off the kerb': 'Уборка снега с 5:00 — уберите машину с обочины',
  'Parking rules are checked with cameras again': 'Правила парковки снова проверяют камеры', 'Extra evening appointments at the polyclinic': 'В поликлинике дополнительный вечерний приём',
  'Open-air concert in the park on Sunday evening': 'В воскресенье вечером концерт под открытым небом в парке' };

/** The title screen's headline and cards in Russian (their English is in index.html). */
export const HERO_RU: Record<string, string> = {
  heroSub: 'Кем ты станешь в России?',
  heroP1: '🎯 Выбери старт: москвич, студент из Лагоса, поступающий в вуз, рабочий из Самарканда или Оша. У каждой жизни свои трудности.',
  heroP2: '🏆 Поднимайся: от первой съёмной комнаты до своей квартиры, от курьера до своего бизнеса, от новичка до гражданина. Или будь депортирован по дороге.',
  heroP3: '⚖️ Каждый выбор на счету: документы, деньги, закон, любовь и семья. Игра запоминает всё.',
  heroP4: '🌍 Соревнуйся онлайн: задание дня, таблица лидеров, блюдо дня. А по ходу узнай, как на самом деле устроена жизнь в России: регистрация, патент, госуслуги, язык и традиции.',
};

/* The goals of the game and the rest of the first-month checklist (round 159: they were shown in English in Russian). */
Object.assign(CHECK_RU, {
  'Get into a university': 'Поступить в университет', 'Save ₽500,000': 'Накопить ₽500 000', 'Pass the Russian language & history test': 'Сдать тест по русскому языку и истории',
  'Get temporary residence (RVP)': 'Получить разрешение на временное проживание (РВП)', 'Get permanent residence (VNZh)': 'Получить вид на жительство (ВНЖ)', 'Become a Russian citizen': 'Стать гражданином России',
  'Open a bank account': 'Открыть банковский счёт', 'Build a family (partner or child)': 'Создать семью (партнёр или ребёнок)', 'Earn the community «Patriot» Award': 'Получить награду общества «Патриот»',
  'Own a home': 'Купить жильё', 'Buy a car': 'Купить машину', 'Adopt an abandoned dog': 'Взять бездомную собаку', 'Run a business that earns ₽100,000 in profit': 'Вести бизнес с прибылью ₽100 000',
  'Make 5 friends': 'Найти 5 друзей', 'Finish with zero legal strikes': 'Дойти до конца без нарушений закона', 'Buy a work patent': 'Купить патент на работу', 'Get a Russian SIM card': 'Купить российскую SIM-карту',
  'Buy a transport card': 'Купить транспортную карту', 'Buy warm clothes (clothing 50+)': 'Купить тёплую одежду (одежда 50+)', 'Health insurance': 'Оформить медицинскую страховку', 'Find a job or a university place': 'Найти работу или место в университете',
});

/** The achievements: title and text, by id. */
export const ACH_RU: Record<string, [string, string]> = {
  ...ACH_MORE_RU,
  week: ['Первая неделя', 'Проживите семь дней.'], winter: ['Пережили русскую зиму', 'Дойдите до 200-го дня (полная зима позади).'], twoyears: ['Два года в России', 'Дойдите до конца игры.'],
  papers: ['Документы в порядке', 'Иметь действующую регистрацию и патент одновременно (или быть гражданином).'], bank: ['С банковским счётом', 'Откройте банковский счёт.'],
  language: ['Язык подтверждён', 'Сдайте тест по русскому языку и истории.'], rvp: ['Временный житель', 'Получите РВП.'], vnzh: ['Постоянный житель', 'Получите вид на жительство.'],
  citizen: ['Гражданин', 'Станьте гражданином Российской Федерации.'], student: ['Студент', 'Поступите в университет.'], entrepreneur: ['Предприниматель', 'Зарегистрируйте бизнес.'],
  profitable: ['Прибыльное дело', 'Заработайте ₽100 000 прибыли в бизнесе.'], driver: ['Водитель', 'Сдайте экзамен по вождению.'], carowner: ['Владелец машины', 'Купите машину.'],
  homeowner: ['Свой дом', 'Купите жильё.'], dog: ['Спасатель', 'Возьмите бездомную собаку.'], married: ['В браке', 'Поженитесь в ЗАГСе.'], parent: ['Родитель', 'Встречайте ребёнка.'],
  friends: ['Круг друзей', 'Найдите пятерых друзей.'], patriot: ['Не стоит в стороне', 'Получите награду общества «Патриот».'], flew: ['Частый пассажир', 'Слетайте туда и обратно на самолёте.'],
  millionaire: ['Миллионер', 'Накопите ₽1 000 000.'], clean: ['Чистая репутация', 'Проведите год без нарушений закона.'], hospital: ['Подлечились', 'Поправьтесь после больницы.'],
  gourmet: ['Гурман', 'Попробуйте 25 разных блюд.'], quiz: ['Знаток культуры', 'Ответьте на 20 вопросов о культуре.'], festival: ['Любитель праздников', 'Побывайте на 5 городских праздниках.'],
  explorer: ['Исследователь', 'Побывайте в каждом месте на карте.'], proverb: ['Мудрые слова', 'Услышьте 10 русских пословиц.'], honours: ['Отличник', 'Держите средний балл 4,5 и выше две сессии подряд.'],
  studied2y: ['Два года учёбы', 'Сдайте четыре экзаменационные сессии.'], settled: ['Обжились', 'Выполните список первого месяца.'], move: ['Новый город', 'Переедьте в другой город.'],
  chef: ['Домашний повар', 'Достигните навыка готовки 45 (хватит на борщ).'], tourist: ['Турист дома', 'Сфотографируйтесь у всех четырёх достопримечательностей.'], graduate: ['С дипломом', 'Пройдите курс в университете.'],
  russianb1: ['Говорит по-русски', 'Сдайте русский язык на уровне B1.'], saver: ['Цель достигнута', 'Достигните цели накоплений в банковском приложении.'], festive: ['В праздничном духе', 'Выполните все задания праздничного события.'],
  cook1: ['Первое блюдо', 'Приготовьте блюдо на кухне.'], cook3star: ['Три звезды', 'Приготовьте блюдо без единой ошибки.'], cook25: ['Книга рецептов', 'Приготовьте 25 разных блюд.'],
  cookworld: ['Вокруг света на кухне', 'Приготовьте блюда 10 разных кухонь.'], cooksafe: ['Безопасная кухня', 'Приготовьте 10 блюд подряд без опасных ошибок.'], cookhost: ['Хозяин стола', 'Позовите друзей на хорошее блюдо, которое смогут есть все гости.'],
};

/** The background talk of the places and the neighbours' answers (src/social.ts), by their English text; anything not here (what the player types) stays as it is. */
export const CHAT_RU: Record<string, string> = {
  'Who is making tea?': 'Кто ставит чайник?', 'The neighbours are drilling again.': 'Соседи опять сверлят.', 'Has anyone seen the courier?': 'Курьера кто-нибудь видел?',
  'Is the 14:20 train on time?': 'Поезд в 14:20 не опаздывает?', 'Careful with your bags here.': 'Следите здесь за сумками.', 'The pies at the kiosk are still warm.': 'Пирожки в киоске ещё тёплые.',
  'The queue number machine is broken again.': 'Автомат с талонами опять сломан.', 'Always bring the original and a copy.': 'Берите оригинал и копию.', 'Window 7 is the friendly one.': 'В седьмом окне работают приветливо.',
  'Take a number and a book.': 'Возьмите талон и книжку.', 'Check your papers twice.': 'Проверьте документы дважды.', 'They close for lunch at one.': 'В час у них обед.',
  'Anyone know where room 214 is?': 'Кто знает, где аудитория 214?', 'The canteen has cheap pies.': 'В столовой дешёвые пирожки.', 'Exam lists are on the third floor.': 'Списки на экзамен — на третьем этаже.',
  'Fresh honey! Taste it first.': 'Свежий мёд! Сначала попробуйте.', 'Those tomatoes are from the south.': 'Эти помидоры с юга.', 'Bargain politely and they smile.': 'Торгуйтесь вежливо — и вам улыбнутся.',
  'Take a ticket from the machine.': 'Возьмите талон в автомате.', 'The doctor is running late.': 'Врач задерживается.', 'Bring your passport and your policy.': 'Возьмите паспорт и полис.',
  'Break in ten minutes?': 'Перерыв через десять минут?', 'The boss is in a good mood.': 'У начальника хорошее настроение.', 'Who ate my yoghurt?': 'Кто съел мой йогурт?',
  'The app is faster than the queue.': 'В приложении быстрее, чем в очереди.', 'Never tell anyone your SMS code.': 'Никому не сообщайте код из СМС.', 'Take a number and a seat.': 'Возьмите талон и садитесь.',
  'Lovely evening for a walk.': 'Чудесный вечер для прогулки.', 'There is a concert in the square.': 'На площади концерт.', 'Pigeons own this place.': 'Здесь хозяева — голуби.',
  'Do not buy the cheapest cable.': 'Не берите самый дешёвый кабель.', 'Warranty first, colour second.': 'Сначала гарантия, потом цвет.', 'Sale on the third floor.': 'Распродажа на третьем этаже.',
  'Gate changed again.': 'Выход на посадку опять поменяли.', 'Have you checked in online?': 'Вы зарегистрировались онлайн?', 'Coffee here is a crime.': 'Кофе здесь — преступление.',
  'The manager says this price is final.': 'Менеджер говорит, что цена окончательная.', 'Ask about the service history.': 'Спросите про историю обслуживания.', 'Try the heated seats!': 'Попробуйте подогрев сидений!',
  'Look at the flat before you pay.': 'Посмотрите квартиру, прежде чем платить.', 'The deposit should be written down.': 'Залог нужно записать в договор.', 'Is the landlord at the viewing?': 'Хозяин будет на показе?',
  'Visiting hours end at six.': 'Часы посещений заканчиваются в шесть.', 'Be kind to the nurses.': 'Будьте добры к медсёстрам.', 'Bring slippers.': 'Возьмите тапочки.',
  'That one loves cuddles.': 'Этот обожает ласку.', 'We need volunteers on Saturday.': 'В субботу нужны волонтёры.', 'Please bring a towel.': 'Принесите, пожалуйста, полотенце.',
  'Hello, everyone!': 'Всем привет!', 'Nice weather today.': 'Сегодня хорошая погода.', "Quiet here, isn't it?": 'Тихо здесь, правда?',
  'Good question. Ask at the desk, they know.': 'Хороший вопрос. Спросите на стойке, там знают.', 'Try the official website first.': 'Сначала загляните на официальный сайт.',
  'I think it is on the left, past the stairs.': 'Кажется, слева, за лестницей.', 'Hello! Welcome.': 'Здравствуйте! Добро пожаловать.', 'Privet! First time here?': 'Привет! Вы здесь впервые?',
  'Good to see a friendly face.': 'Приятно видеть дружелюбное лицо.', 'Not at all. Everybody helps here.': 'Не за что. Здесь все помогают друг другу.',
  'Check the jobs app on your phone. Careful with offers that sound too good.': 'Загляните в приложение с работой в телефоне. Осторожно с предложениями, которые звучат слишком заманчиво.',
  You: 'Вы', 'Hello!': 'Привет!',
};
