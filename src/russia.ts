/* Each city of the game as it really is (round 151): six real streets where people live in flats, four real districts, and what its ordinary houses are like
   (how many khrushchyovkas, nine-storey panel blocks, tall panel blocks, stalinkas, new towers, pre-revolutionary houses, wooden houses and private houses).
   Used by the 3D city (which kinds of houses stand where) and for the player's address. The streets and districts are well-known public names; the house and
   flat numbers given to players are invented. Loaded only with the 3D world, the Home app and the online home card, never in the first download. */

/** The kinds of ordinary houses of a Russian city. */
export type Series = 'khrush' | 'panel9' | 'panel16' | 'stalinka' | 'newbuild' | 'prerev' | 'wooden' | 'private';
export interface CityProfile { streets: [ru: string, en: string][]; districts: [ru: string, en: string][]; mix: Partial<Record<Series, number>>; note: string }

const st = (list: string): [string, string][] => list.split(';').map(x => x.split('|').map(y => y.trim()) as [string, string]);
// the usual Soviet-era mix of a big regional city; cities differ from it where their housing is known to differ
const USUAL: Partial<Record<Series, number>> = { khrush: 3, panel9: 4, panel16: 2, stalinka: 1, newbuild: 2, wooden: 0.5, private: 0.5 };
const P = (streets: string, districts: string, note: string, mix: Partial<Record<Series, number>> = USUAL): CityProfile => ({ streets: st(streets), districts: st(districts), mix, note });

export const CITY_PROFILE: Record<string, CityProfile> = {
  Moscow: P('ул. Тверская|Tverskaya St; Комсомольский пр-т|Komsomolsky Ave; ул. Профсоюзная|Profsoyuznaya St; ул. Новочерёмушкинская|Novocheryomushkinskaya St; ул. Братиславская|Bratislavskaya St; ул. Марьинский Парк|Maryinsky Park St',
    'Тверской|Tverskoy; Хамовники|Khamovniki; Черёмушки|Cheryomushki; Марьино|Maryino', 'Pre-revolutionary houses and stalinkas in the centre, khrushchyovkas from 1956 in Cheryomushki, then P-44 panel towers and today tall new blocks.',
    { prerev: 1, stalinka: 2, khrush: 2, panel9: 2, panel16: 3, newbuild: 3 }),
  'Saint Petersburg': P('Невский пр-т|Nevsky Ave; 6-я линия В.О.|6th Line V.O.; ул. Савушкина|Savushkina St; Комендантский пр-т|Komendantsky Ave; пр-т Большевиков|Bolshevikov Ave; ул. Дыбенко|Dybenko St',
    'Центральный|Tsentralny; Василеостровский|Vasileostrovsky; Приморский|Primorsky; Невский|Nevsky', 'Four-to-six-storey houses of the 19th century with courtyard-wells and many kommunalkas in the centre; khrushchyovkas and panel blocks further out.',
    { prerev: 4, stalinka: 1, khrush: 2, panel9: 2, panel16: 2, newbuild: 2 }),
  Kazan: P('ул. Баумана|Bauman St; ул. Пушкина|Pushkin St; пр-т Победы|Pobedy Ave; ул. Чистопольская|Chistopolskaya St; пр-т Ямашева|Yamashev Ave; ул. Декабристов|Dekabristov St',
    'Вахитовский|Vakhitovsky; Приволжский|Privolzhsky; Ново-Савиновский|Novo-Savinovsky; Московский|Moskovsky', 'Two-to-four-storey merchant houses and the Old Tatar Quarter, khrushchyovkas, nine-storey panel blocks and new towers by the Kazanka.',
    { prerev: 2, wooden: 1, khrush: 3, panel9: 3, panel16: 1, newbuild: 2 }),
  Yekaterinburg: P('пр-т Ленина|Lenin Ave; ул. Малышева|Malysheva St; ул. Сыромолотова|Syromolotova St; ул. Викулова|Vikulova St; ул. Металлургов|Metallurgov St; ул. Шварца|Shvartsa St',
    'Ленинский|Leninsky; Кировский|Kirovsky; Верх-Исетский|Verkh-Isetsky; Чкаловский|Chkalovsky', 'Merchant houses, constructivism and the stalinkas of Uralmash, then panel blocks of nine to sixteen storeys and glass towers.',
    { stalinka: 2, khrush: 3, panel9: 3, panel16: 2, newbuild: 2 }),
  Novosibirsk: P('Красный пр-т|Krasny Ave; ул. Кирова|Kirova St; ул. Высоцкого|Vysotskogo St; ул. Титова|Titova St; ул. Блюхера|Blyukhera St; Морской пр-т|Morskoy Ave',
    'Центральный|Tsentralny; Ленинский|Leninsky; Октябрьский|Oktyabrsky; Советский|Sovetsky', 'Stalinkas on Krasny Avenue with wooden houses still in the centre, khrushchyovkas and panel blocks, Akademgorodok in the forest.',
    { stalinka: 2, wooden: 1, khrush: 3, panel9: 3, panel16: 2, newbuild: 2 }),
  Krasnodar: P('ул. Красная|Krasnaya St; ул. Ставропольская|Stavropolskaya St; ул. Гидростроителей|Gidrostroiteley St; ул. Тургенева|Turgeneva St; ул. Московская|Moskovskaya St; ул. Красных Партизан|Krasnykh Partizan St',
    'Центральный|Tsentralny; Западный|Zapadny; Карасунский|Karasunsky; Прикубанский|Prikubansky', 'Low brick houses and Kuban private houses, five- and nine-storey panel blocks, then dense new blocks of 16 to 25 storeys.',
    { private: 2, prerev: 1, khrush: 2, panel9: 2, panel16: 2, newbuild: 3 }),
  Sochi: P('Курортный пр-т|Kurortny Ave; ул. Навагинская|Navaginskaya St; ул. Пластунская|Plastunskaya St; ул. Ворошиловская|Voroshilovskaya St; ул. Ленина|Lenina St; ул. Победы|Pobedy St',
    'Центральный|Tsentralny; Хостинский|Khostinsky; Адлерский|Adlersky; Лазаревский|Lazarevsky', 'Stalin-era sanatoriums and low resort buildings among palms, Soviet blocks of five to nine storeys, new towers on the hills.',
    { stalinka: 2, private: 2, khrush: 1, panel9: 2, newbuild: 3 }),
  Vladivostok: P('ул. Светланская|Svetlanskaya St; ул. Алеутская|Aleutskaya St; ул. Калинина|Kalinina St; ул. Борисенко|Borisenko St; пр-т 100-летия Владивостока|100-letiya Vladivostoka Ave; ул. Русская|Russkaya St',
    'Ленинский|Leninsky; Фрунзенский|Frunzensky; Первомайский|Pervomaysky; Советский|Sovetsky', 'Pre-revolutionary brick on Svetlanskaya, panel blocks stepping up the hills, towers on the slopes.',
    { prerev: 1, stalinka: 1, khrush: 2, panel9: 3, panel16: 2, newbuild: 2 }),
  Grozny: P('пр-т Путина|Putin Ave; пр-т А.-Х. Кадырова|A.-Kh. Kadyrov Ave; пр-т Х. Исаева|Kh. Isaev Ave; б-р С. Дудаева|S. Dudayev Blvd; ул. А. Шерипова|A. Sheripov St; ул. Ш. А. Митаева|Sh. A. Mitayev St',
    'Ахматовский|Akhmatovsky; Байсангуровский|Baysangurovsky; Висаитовский|Visaitovsky; Шейх-Мансуровский|Sheikh-Mansurovsky', 'Rebuilt in the 2000s: a centre in the style of the 1950s, new towers, Soviet blocks of five to nine storeys.',
    { stalinka: 2, panel9: 2, newbuild: 4, private: 1 }),
  'Nizhny Novgorod': P('ул. Большая Покровская|Bolshaya Pokrovskaya St; ул. Белинского|Belinskogo St; ул. Ванеева|Vaneyeva St; пр-т Гагарина|Gagarin Ave; пр-т Ленина|Lenin Ave; ул. Коминтерна|Kominterna St',
    'Нижегородский|Nizhegorodsky; Советский|Sovetsky; Автозаводский|Avtozavodsky; Сормовский|Sormovsky', 'Merchant brick and wooden houses in the centre, the stalinkas of Avtozavod, khrushchyovkas and panel blocks.',
    { prerev: 2, wooden: 1, stalinka: 2, khrush: 3, panel9: 3, newbuild: 1 }),
  Samara: P('ул. Куйбышева|Kuibysheva St; ул. Ленинградская|Leningradskaya St; ул. Ново-Садовая|Novo-Sadovaya St; Московское ш.|Moskovskoye Hwy; пр-т Кирова|Kirov Ave; ул. Стара-Загора|Stara-Zagora St',
    'Самарский|Samarsky; Ленинский|Leninsky; Октябрьский|Oktyabrsky; Промышленный|Promyshlenny', 'Old Samara of wooden and brick houses with Art Nouveau mansions, khrushchyovkas, panel blocks and tall new blocks.',
    { prerev: 2, wooden: 2, khrush: 3, panel9: 3, newbuild: 2 }),
  Kaliningrad: P('Ленинский пр-т|Leninsky Ave; пр-т Мира|Mira Ave; ул. Космонавта Леонова|Kosmonavta Leonova St; ул. Невского|Nevskogo St; ул. Гайдара|Gaydara St; ул. Батальная|Batalnaya St',
    'Ленинградский|Leningradsky; Московский|Moskovsky; Центральный|Tsentralny', 'German pre-war brick houses with steep roofs and villas, Soviet panel blocks, new blocks.',
    { prerev: 3, private: 1, khrush: 2, panel9: 3, newbuild: 2 }),
  Saratov: P('пр-т Кирова|Kirov Ave; ул. Московская|Moskovskaya St; ул. Чернышевского|Chernyshevskogo St; ул. Чапаева|Chapayeva St; ул. Тархова|Tarkhova St; пр-т 50 лет Октября|50 let Oktyabrya Ave',
    'Волжский|Volzhsky; Кировский|Kirovsky; Ленинский|Leninsky; Фрунзенский|Frunzensky', 'Two- and three-storey merchant houses, five- and nine-storey panel blocks, new building in Solnechny.', { prerev: 2, ...USUAL }),
  Omsk: P('ул. Ленина|Lenina St; пр-т Карла Маркса|Karl Marx Ave; ул. Лукашевича|Lukashevicha St; ул. 70 лет Октября|70 let Oktyabrya St; пр-т Мира|Mira Ave; ул. 22 Апреля|22 Aprelya St',
    'Центральный|Tsentralny; Кировский|Kirovsky; Советский|Sovetsky; Октябрьский|Oktyabrsky', 'Merchant houses and Siberian wooden houses, khrushchyovkas, nine- and ten-storey panel blocks on the left bank.', { wooden: 1.5, ...USUAL }),
  Chelyabinsk: P('ул. Кирова|Kirova St; пр-т Ленина|Lenin Ave; Комсомольский пр-т|Komsomolsky Ave; ул. Чичерина|Chicherina St; ул. Братьев Кашириных|Bratyev Kashirinykh St; ул. Героев Танкограда|Geroyev Tankograda St',
    'Центральный|Tsentralny; Калининский|Kalininsky; Курчатовский|Kurchatovsky; Тракторозаводский|Traktorozavodsky', 'Constructivism and the stalinkas of the tractor works, khrushchyovkas, panel blocks and new towers.', { stalinka: 2, ...USUAL }),
  'Rostov-on-Don': P('ул. Большая Садовая|Bolshaya Sadovaya St; Будённовский пр-т|Budyonnovsky Ave; Ворошиловский пр-т|Voroshilovsky Ave; пр-т Стачки|Stachki Ave; Коммунистический пр-т|Kommunistichesky Ave; ул. Зорге|Zorge St',
    'Ленинский|Leninsky; Кировский|Kirovsky; Октябрьский|Oktyabrsky; Советский|Sovetsky', 'Eclectic merchant houses in the centre, khrushchyovkas and panel blocks of nine to sixteen storeys, new towers.', { prerev: 2, ...USUAL }),
  Ufa: P('ул. Ленина|Lenina St; ул. Менделеева|Mendeleyeva St; ул. Комсомольская|Komsomolskaya St; пр-т Октября|Oktyabrya Ave; ул. 50 лет СССР|50 let SSSR St; ул. Пушкина|Pushkina St',
    'Кировский|Kirovsky; Ленинский|Leninsky; Советский|Sovetsky; Октябрьский|Oktyabrsky', 'Wooden houses and the stalinkas of Lenina Street on a hilly peninsula, khrushchyovkas, panel blocks and new towers.', { wooden: 1.5, stalinka: 1.5, ...USUAL }),
  Krasnoyarsk: P('пр-т Мира|Mira Ave; ул. Карла Маркса|Karl Marx St; ул. Взлётная|Vzlyotnaya St; ул. 9 Мая|9 Maya St; Свободный пр-т|Svobodny Ave; ул. Ладо Кецховели|Lado Ketskhoveli St',
    'Центральный|Tsentralny; Железнодорожный|Zheleznodorozhny; Советский|Sovetsky; Октябрьский|Oktyabrsky', 'Wooden and brick merchant houses by the Yenisei, khrushchyovkas, panel blocks and towers of 25 storeys.', { wooden: 1, ...USUAL }),
  Perm: P('Комсомольский пр-т|Komsomolsky Ave; ул. Ленина|Lenina St; ул. Куйбышева|Kuibysheva St; ул. Чкалова|Chkalova St; ул. Уральская|Uralskaya St; ул. Мира|Mira St',
    'Ленинский|Leninsky; Свердловский|Sverdlovsky; Мотовилихинский|Motovilikhinsky; Индустриальный|Industrialny', 'Wooden and merchant houses, the stalinkas of Komsomolsky Avenue, khrushchyovkas and panel blocks.', { wooden: 1, stalinka: 1.5, ...USUAL }),
  Voronezh: P('пр-т Революции|Revolyutsii Ave; ул. Плехановская|Plekhanovskaya St; Московский пр-т|Moskovsky Ave; ул. Хользунова|Kholzunova St; ул. Димитрова|Dimitrova St; ул. Ворошилова|Voroshilova St',
    'Центральный|Tsentralny; Ленинский|Leninsky; Коминтерновский|Kominternovsky; Советский|Sovetsky', 'A centre rebuilt after the war in the Stalin style, khrushchyovkas, panel blocks and new towers of 25 storeys.', { stalinka: 2.5, ...USUAL }),
  Volgograd: P('пр-т Ленина|Lenin Ave; ул. Аллея Героев|Alleya Geroyev St; ул. Землячки|Zemlyachki St; ул. Хользунова|Kholzunova St; пр-т Героев Сталинграда|Geroyev Stalingrada Ave; ул. Дзержинского|Dzerzhinskogo St',
    'Центральный|Tsentralny; Дзержинский|Dzerzhinsky; Красноармейский|Krasnoarmeysky; Тракторозаводский|Traktorozavodsky', 'A centre rebuilt after 1943 as one Stalin-era ensemble, khrushchyovkas and nine-storey panel blocks along the Volga.', { stalinka: 3, khrush: 3, panel9: 3, panel16: 1, newbuild: 1 }),
  Tyumen: P('ул. Республики|Respubliki St; ул. Мельникайте|Melnikayte St; ул. Широтная|Shirotnaya St; ул. Пермякова|Permyakova St; ул. Федюнинского|Fedyuninskogo St; ул. 50 лет Октября|50 let Oktyabrya St',
    'Центральный|Tsentralny; Ленинский|Leninsky; Калининский|Kalininsky; Восточный|Vostochny', 'Carved wooden houses, khrushchyovkas, nine-storey panel blocks and large new districts.', { wooden: 1.5, khrush: 2, panel9: 3, panel16: 2, newbuild: 3 }),
  Tolyatti: P('ул. Мира|Mira St; ул. Победы|Pobedy St; Ленинский пр-т|Leninsky Ave; б-р Королёва|Korolyov Blvd; ул. 70 лет Октября|70 let Oktyabrya St; ул. Матросова|Matrosova St',
    'Автозаводский|Avtozavodsky; Центральный|Tsentralny; Комсомольский|Komsomolsky', 'The stalinkas of the 1950s Central district and the planned 1970s Avtozavodsky district of nine- to sixteen-storey panel blocks.', { stalinka: 2, khrush: 1, panel9: 4, panel16: 3, newbuild: 1 }),
  Izhevsk: P('ул. Пушкинская|Pushkinskaya St; ул. Карла Маркса|Karl Marx St; ул. Удмуртская|Udmurtskaya St; ул. 10 лет Октября|10 let Oktyabrya St; ул. Буммашевская|Bummashevskaya St; ул. Клубная|Klubnaya St',
    'Октябрьский|Oktyabrsky; Первомайский|Pervomaysky; Устиновский|Ustinovsky; Ленинский|Leninsky', 'Wooden and Stalin-era houses, khrushchyovkas and nine-storey panel blocks.', { wooden: 1.5, ...USUAL }),
  Barnaul: P('пр-т Ленина|Lenin Ave; пр-т Строителей|Stroiteley Ave; Комсомольский пр-т|Komsomolsky Ave; пр-т Космонавтов|Kosmonavtov Ave; ул. Попова|Popova St; ул. Малахова|Malakhova St',
    'Центральный|Tsentralny; Железнодорожный|Zheleznodorozhny; Октябрьский|Oktyabrsky; Индустриальный|Industrialny', 'Low merchant houses, khrushchyovkas and nine- and ten-storey panel blocks.', { wooden: 1.5, private: 1, ...USUAL }),
  Irkutsk: P('ул. Карла Маркса|Karl Marx St; ул. Ленина|Lenina St; ул. Байкальская|Baikalskaya St; ул. Ширямова|Shiryamova St; ул. Лермонтова|Lermontova St; ул. Розы Люксембург|Rozy Lyuksemburg St',
    'Правобережный|Pravoberezhny; Октябрьский|Oktyabrsky; Свердловский|Sverdlovsky; Ленинский|Leninsky', 'Wooden houses with carved window frames, khrushchyovkas and nine-storey panel blocks.', { wooden: 3, khrush: 3, panel9: 3, panel16: 1, newbuild: 1 }),
  Ulyanovsk: P('ул. Гончарова|Goncharova St; ул. Камышинская|Kamyshinskaya St; ул. Рябикова|Ryabikova St; пр-т Ленинского Комсомола|Leninskogo Komsomola Ave; Ульяновский пр-т|Ulyanovsky Ave; ул. Локомотивная|Lokomotivnaya St',
    'Ленинский|Leninsky; Засвияжский|Zasviyazhsky; Заволжский|Zavolzhsky; Железнодорожный|Zheleznodorozhny', 'Merchant and wooden houses, khrushchyovkas and the panel blocks of the New Town.', { wooden: 1, ...USUAL }),
  Khabarovsk: P('ул. Муравьёва-Амурского|Muravyova-Amurskogo St; ул. Ленина|Lenina St; ул. Карла Маркса|Karl Marx St; ул. Краснореченская|Krasnorechenskaya St; ул. Ворошилова|Voroshilova St; ул. Тихоокеанская|Tikhookeanskaya St',
    'Центральный|Tsentralny; Железнодорожный|Zheleznodorozhny; Индустриальный|Industrialny; Краснофлотский|Krasnoflotsky', 'A red-brick pre-revolutionary centre, khrushchyovkas, nine-storey panel blocks and new towers.', { prerev: 1.5, ...USUAL }),
  Yakutsk: P('пр-т Ленина|Lenin Ave; ул. Петровского|Petrovskogo St; ул. Кирова|Kirova St; ул. Дзержинского|Dzerzhinskogo St; ул. Лермонтова|Lermontova St; ул. Каландаришвили|Kalandarishvili St',
    'Центральный|Tsentralny; Октябрьский|Oktyabrsky; Строительный|Stroitelny; Гагаринский|Gagarinsky', 'On permafrost: every block stands on piles over an air gap, with the heating pipes above ground; panel blocks of five to nine storeys and wooden houses.', { wooden: 2, khrush: 2, panel9: 4, newbuild: 1 }),
  Murmansk: P('пр-т Ленина|Lenin Ave; Кольский пр-т|Kolsky Ave; ул. Беринга|Beringa St; ул. Героев Североморцев|Geroyev Severomortsev St; ул. Шабалина|Shabalina St; ул. Полярные Зори|Polyarnye Zori St',
    'Ленинский|Leninsky; Октябрьский|Oktyabrsky; Первомайский|Pervomaysky', 'Stalin-era centre, then panel and brick blocks of five to nine storeys on the hills, often painted in bright colours for the polar night.', { stalinka: 2, khrush: 3, panel9: 4, newbuild: 0.5 }),
  Arkhangelsk: P('пр-т Чумбарова-Лучинского|Chumbarova-Luchinskogo Ave; Троицкий пр-т|Troitsky Ave; пр-т Ломоносова|Lomonosov Ave; ул. Воскресенская|Voskresenskaya St; ул. Ленина|Lenina St; ул. Красных Партизан|Krasnykh Partizan St',
    'Ломоносовский|Lomonosovsky; Октябрьский|Oktyabrsky; Соломбальский|Solombalsky; Майская Горка|Mayskaya Gorka', 'The largest city of wooden houses: thousands of wooden two-storey blocks and barracks, then Soviet panel blocks.', { wooden: 5, khrush: 2, panel9: 3, newbuild: 0.5 }),
  Makhachkala: P('пр-т Расула Гамзатова|Rasul Gamzatov Ave; пр-т Имама Шамиля|Imam Shamil Ave; пр-т Акушинского|Akushinsky Ave; пр-т Петра I|Petra I Ave; ул. Ярагского|Yaragskogo St; ул. Магомеда Гаджиева|Magomeda Gadzhiyeva St',
    'Кировский|Kirovsky; Ленинский|Leninsky; Советский|Sovetsky', 'Soviet blocks of five to nine storeys and much new private high-rise building.', { khrush: 2, panel9: 2, newbuild: 4, private: 2 }),
  Tula: P('пр-т Ленина|Lenin Ave; ул. Советская|Sovetskaya St; Красноармейский пр-т|Krasnoarmeysky Ave; ул. Пузакова|Puzakova St; ул. Металлургов|Metallurgov St; ул. Октябрьская|Oktyabrskaya St',
    'Центральный|Tsentralny; Пролетарский|Proletarsky; Советский|Sovetsky; Зареченский|Zarechensky', 'Merchant and wooden houses by the kremlin, khrushchyovkas, nine- and ten-storey panel blocks and new towers.', { prerev: 1, wooden: 1, ...USUAL }),
  Yaroslavl: P('ул. Кирова|Kirova St; ул. Свободы|Svobody St; Ленинский пр-т|Leninsky Ave; Ленинградский пр-т|Leningradsky Ave; ул. Труфанова|Trufanova St; пр-т Фрунзе|Frunze Ave',
    'Кировский|Kirovsky; Ленинский|Leninsky; Дзержинский|Dzerzhinsky; Фрунзенский|Frunzensky', 'A UNESCO-listed classical centre of two- and three-storey houses and 17th-century churches, then khrushchyovkas and the panel blocks of Bragino.', { prerev: 2, ...USUAL }),
  Vladimir: P('ул. Большая Московская|Bolshaya Moskovskaya St; ул. Горького|Gorkogo St; пр-т Ленина|Lenin Ave; ул. Мира|Mira St; ул. Верхняя Дуброва|Verkhnyaya Dubrova St; ул. Добросельская|Dobroselskaya St',
    'Ленинский|Leninsky; Октябрьский|Oktyabrsky; Фрунзенский|Frunzensky', 'White-stone churches with low merchant and wooden houses, then khrushchyovkas and nine-storey panel blocks.', { prerev: 1.5, wooden: 1.5, khrush: 3, panel9: 3, newbuild: 1 }),
  Pskov: P('Октябрьский пр-т|Oktyabrsky Ave; ул. Советская|Sovetskaya St; Рижский пр-т|Rizhsky Ave; ул. Юбилейная|Yubileynaya St; ул. Народная|Narodnaya St; Ленинградское ш.|Leningradskoye Hwy',
    'Окольный город|Okolny Town; Запсковье|Zapskovye; Завеличье|Zavelichye; Средний город|Middle Town', 'A low historic centre with medieval churches and height limits, five-storey brick and panel blocks and nine-storey blocks at the edges.', { prerev: 1, wooden: 1.5, khrush: 4, panel9: 2, newbuild: 0.5 }),
  'Veliky Novgorod': P('ул. Большая Санкт-Петербургская|Bolshaya Sankt-Peterburgskaya St; ул. Ломоносова|Lomonosova St; пр-т Мира|Mira Ave; ул. Псковская|Pskovskaya St; ул. Большая Московская|Bolshaya Moskovskaya St; ул. Кочетова|Kochetova St',
    'Софийская сторона|Sofia Side; Торговая сторона|Trade Side; Западный|Zapadny; Деревяницы|Derevyanitsy', 'The kremlin and medieval churches with low houses around them, then five- and nine-storey blocks.', { prerev: 1, wooden: 1, khrush: 4, panel9: 3, newbuild: 0.5 }),
};

/** A city's profile; a city the game does not know gets the usual mix and generic street names. */
export function profileOf(city: string): CityProfile {
  return CITY_PROFILE[city] ?? P('ул. Ленина|Lenina St; ул. Мира|Mira St; ул. Советская|Sovetskaya St; ул. Гагарина|Gagarina St; ул. Молодёжная|Molodyozhnaya St; ул. Садовая|Sadovaya St', 'Центральный|Tsentralny; Ленинский|Leninsky; Октябрьский|Oktyabrsky; Советский|Sovetsky', 'An ordinary Russian city.');
}

/** How each kind of house looks and how tall it is (storeys, the height of one storey in metres, the wall colours). */
export const SERIES_LOOK: Record<Series, { floors: [number, number]; storey: number; walls: string[]; roof: 'flat' | 'pitched' }> = {
  khrush: { floors: [5, 5], storey: 2.7, walls: ['#d9c9b0', '#c8b8a0', '#d4b49a', '#e0d6c4'], roof: 'flat' },
  panel9: { floors: [9, 9], storey: 2.8, walls: ['#d8d8d2', '#cfd6dc', '#e2dccd', '#c9d1c4'], roof: 'flat' },
  panel16: { floors: [12, 16], storey: 2.8, walls: ['#e6e6e0', '#d5dde6', '#e8e0d0'], roof: 'flat' },
  stalinka: { floors: [6, 8], storey: 3.4, walls: ['#e3c89a', '#d9b98c', '#e8d4b0', '#d6a878'], roof: 'flat' },
  newbuild: { floors: [14, 20], storey: 3.0, walls: ['#eef0f2', '#c8d6e6', '#e9d8c4', '#d4e2d8'], roof: 'flat' },
  prerev: { floors: [4, 6], storey: 3.8, walls: ['#e8c87a', '#d9a58c', '#c9b8d6', '#e6d2a8', '#b8cbbf'], roof: 'pitched' },
  wooden: { floors: [2, 2], storey: 3.0, walls: ['#8a6a4a', '#9c7a52', '#7a5e44'], roof: 'pitched' },
  private: { floors: [1, 2], storey: 3.0, walls: ['#e6dcc4', '#d4b896', '#c9d6c0', '#e8c8b0'], roof: 'pitched' },
};
/** A number from 0 to 1 for a word, the same every time. */
export const hash01 = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h / 4294967296; };
/** The kind of an ordinary house of the city, chosen by the city's mix from a number between 0 and 1. Tall houses come from the tall kinds. */
export function seriesFor(city: string, r: number, tall: boolean): Series {
  const mix = profileOf(city).mix, kinds = (Object.keys(mix) as Series[]).filter(k => (tall ? ['panel9', 'panel16', 'newbuild', 'stalinka'] : ['khrush', 'prerev', 'wooden', 'private', 'stalinka', 'panel9']).includes(k) && (mix[k] ?? 0) > 0);
  if (!kinds.length) return tall ? 'panel9' : 'khrush';
  const total = kinds.reduce((t, k) => t + (mix[k] ?? 0), 0); let x = r * total;
  for (const k of kinds) { x -= mix[k] ?? 0; if (x <= 0) return k; }
  return kinds[kinds.length - 1];
}
