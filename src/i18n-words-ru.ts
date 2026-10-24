/* The Russian word lists (round 149): the creator, the dreams, the cities, the places, the checklist and the decrees, keyed by the English text.
   Its own small download, loaded when the game is in Russian (i18n-words.ts). */

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
  heroP1: '🎯 Выбери старт: москвич, студент из Лагоса, рабочий из Самарканда или Оша — у каждой жизни свои трудности.',
  heroP2: '🏆 Поднимайся: от первой съёмной комнаты до своей квартиры, от курьера до своего бизнеса, от новичка до гражданина. Или будь депортирован по дороге.',
  heroP3: '⚖️ Каждый выбор на счету: документы, деньги, закон, любовь и семья — игра запоминает всё.',
  heroP4: '🌍 Соревнуйся онлайн: задание дня, таблица лидеров, блюдо дня. А по ходу узнай, как на самом деле устроена жизнь в России: регистрация, патент, госуслуги, язык и традиции.',
};
