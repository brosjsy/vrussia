/* Every country, for the profile: ISO 3166-1 two-letter code, the English and the Russian name, and the group the sign-up form shows it in.
   The groups: the CIS (the members and Turkmenistan, an associate; Russia is listed first), then the continents. The 193 UN members plus
   Palestine, Kosovo and Taiwan, as most forms list them. Names are the usual short forms. */
export type Region = 'CIS' | 'Europe' | 'Asia' | 'Africa' | 'Americas' | 'Oceania';
export interface Country { code: string; en: string; ru: string; region: Region }
export const REGIONS: { id: Region; en: string; ru: string }[] = [
  { id: 'CIS', en: 'CIS', ru: 'СНГ' }, { id: 'Europe', en: 'Europe', ru: 'Европа' }, { id: 'Asia', en: 'Asia', ru: 'Азия' },
  { id: 'Africa', en: 'Africa', ru: 'Африка' }, { id: 'Americas', en: 'Americas', ru: 'Америка' }, { id: 'Oceania', en: 'Oceania', ru: 'Океания' },
];
const L = (region: Region, rows: [string, string, string][]): Country[] => rows.map(([code, en, ru]) => ({ code, en, ru, region }));
export const COUNTRIES: Country[] = [
  ...L('CIS', [['RU', 'Russia', 'Россия'], ['AM', 'Armenia', 'Армения'], ['AZ', 'Azerbaijan', 'Азербайджан'], ['BY', 'Belarus', 'Беларусь'], ['KZ', 'Kazakhstan', 'Казахстан'],
    ['KG', 'Kyrgyzstan', 'Киргизия'], ['MD', 'Moldova', 'Молдова'], ['TJ', 'Tajikistan', 'Таджикистан'], ['TM', 'Turkmenistan', 'Туркменистан'], ['UZ', 'Uzbekistan', 'Узбекистан']]),
  ...L('Europe', [['AL', 'Albania', 'Албания'], ['AD', 'Andorra', 'Андорра'], ['AT', 'Austria', 'Австрия'], ['BE', 'Belgium', 'Бельгия'], ['BA', 'Bosnia and Herzegovina', 'Босния и Герцеговина'],
    ['BG', 'Bulgaria', 'Болгария'], ['HR', 'Croatia', 'Хорватия'], ['CY', 'Cyprus', 'Кипр'], ['CZ', 'Czechia', 'Чехия'], ['DK', 'Denmark', 'Дания'], ['EE', 'Estonia', 'Эстония'],
    ['FI', 'Finland', 'Финляндия'], ['FR', 'France', 'Франция'], ['GE', 'Georgia', 'Грузия'], ['DE', 'Germany', 'Германия'], ['GR', 'Greece', 'Греция'], ['HU', 'Hungary', 'Венгрия'],
    ['IS', 'Iceland', 'Исландия'], ['IE', 'Ireland', 'Ирландия'], ['IT', 'Italy', 'Италия'], ['XK', 'Kosovo', 'Косово'], ['LV', 'Latvia', 'Латвия'], ['LI', 'Liechtenstein', 'Лихтенштейн'],
    ['LT', 'Lithuania', 'Литва'], ['LU', 'Luxembourg', 'Люксембург'], ['MT', 'Malta', 'Мальта'], ['MC', 'Monaco', 'Монако'], ['ME', 'Montenegro', 'Черногория'], ['NL', 'Netherlands', 'Нидерланды'],
    ['MK', 'North Macedonia', 'Северная Македония'], ['NO', 'Norway', 'Норвегия'], ['PL', 'Poland', 'Польша'], ['PT', 'Portugal', 'Португалия'], ['RO', 'Romania', 'Румыния'], ['SM', 'San Marino', 'Сан-Марино'],
    ['RS', 'Serbia', 'Сербия'], ['SK', 'Slovakia', 'Словакия'], ['SI', 'Slovenia', 'Словения'], ['ES', 'Spain', 'Испания'], ['SE', 'Sweden', 'Швеция'], ['CH', 'Switzerland', 'Швейцария'],
    ['UA', 'Ukraine', 'Украина'], ['GB', 'United Kingdom', 'Великобритания'], ['VA', 'Vatican City', 'Ватикан']]),
  ...L('Asia', [['AF', 'Afghanistan', 'Афганистан'], ['BH', 'Bahrain', 'Бахрейн'], ['BD', 'Bangladesh', 'Бангладеш'], ['BT', 'Bhutan', 'Бутан'], ['BN', 'Brunei', 'Бруней'], ['KH', 'Cambodia', 'Камбоджа'],
    ['CN', 'China', 'Китай'], ['IN', 'India', 'Индия'], ['ID', 'Indonesia', 'Индонезия'], ['IR', 'Iran', 'Иран'], ['IQ', 'Iraq', 'Ирак'], ['IL', 'Israel', 'Израиль'], ['JP', 'Japan', 'Япония'],
    ['JO', 'Jordan', 'Иордания'], ['KW', 'Kuwait', 'Кувейт'], ['LA', 'Laos', 'Лаос'], ['LB', 'Lebanon', 'Ливан'], ['MY', 'Malaysia', 'Малайзия'], ['MV', 'Maldives', 'Мальдивы'],
    ['MN', 'Mongolia', 'Монголия'], ['MM', 'Myanmar', 'Мьянма'], ['NP', 'Nepal', 'Непал'], ['KP', 'North Korea', 'КНДР'], ['OM', 'Oman', 'Оман'], ['PK', 'Pakistan', 'Пакистан'],
    ['PS', 'Palestine', 'Палестина'], ['PH', 'Philippines', 'Филиппины'], ['QA', 'Qatar', 'Катар'], ['SA', 'Saudi Arabia', 'Саудовская Аравия'], ['SG', 'Singapore', 'Сингапур'],
    ['KR', 'South Korea', 'Республика Корея'], ['LK', 'Sri Lanka', 'Шри-Ланка'], ['SY', 'Syria', 'Сирия'], ['TW', 'Taiwan', 'Тайвань'], ['TH', 'Thailand', 'Таиланд'], ['TL', 'Timor-Leste', 'Восточный Тимор'],
    ['TR', 'Türkiye', 'Турция'], ['AE', 'United Arab Emirates', 'ОАЭ'], ['VN', 'Vietnam', 'Вьетнам'], ['YE', 'Yemen', 'Йемен']]),
  ...L('Africa', [['DZ', 'Algeria', 'Алжир'], ['AO', 'Angola', 'Ангола'], ['BJ', 'Benin', 'Бенин'], ['BW', 'Botswana', 'Ботсвана'], ['BF', 'Burkina Faso', 'Буркина-Фасо'], ['BI', 'Burundi', 'Бурунди'],
    ['CV', 'Cabo Verde', 'Кабо-Верде'], ['CM', 'Cameroon', 'Камерун'], ['CF', 'Central African Republic', 'ЦАР'], ['TD', 'Chad', 'Чад'], ['KM', 'Comoros', 'Коморы'], ['CG', 'Congo', 'Республика Конго'],
    ['CD', 'DR Congo', 'ДР Конго'], ['CI', "Côte d'Ivoire", "Кот-д'Ивуар"], ['DJ', 'Djibouti', 'Джибути'], ['EG', 'Egypt', 'Египет'], ['GQ', 'Equatorial Guinea', 'Экваториальная Гвинея'],
    ['ER', 'Eritrea', 'Эритрея'], ['SZ', 'Eswatini', 'Эсватини'], ['ET', 'Ethiopia', 'Эфиопия'], ['GA', 'Gabon', 'Габон'], ['GM', 'Gambia', 'Гамбия'], ['GH', 'Ghana', 'Гана'], ['GN', 'Guinea', 'Гвинея'],
    ['GW', 'Guinea-Bissau', 'Гвинея-Бисау'], ['KE', 'Kenya', 'Кения'], ['LS', 'Lesotho', 'Лесото'], ['LR', 'Liberia', 'Либерия'], ['LY', 'Libya', 'Ливия'], ['MG', 'Madagascar', 'Мадагаскар'],
    ['MW', 'Malawi', 'Малави'], ['ML', 'Mali', 'Мали'], ['MR', 'Mauritania', 'Мавритания'], ['MU', 'Mauritius', 'Маврикий'], ['MA', 'Morocco', 'Марокко'], ['MZ', 'Mozambique', 'Мозамбик'],
    ['NA', 'Namibia', 'Намибия'], ['NE', 'Niger', 'Нигер'], ['NG', 'Nigeria', 'Нигерия'], ['RW', 'Rwanda', 'Руанда'], ['ST', 'São Tomé and Príncipe', 'Сан-Томе и Принсипи'], ['SN', 'Senegal', 'Сенегал'],
    ['SC', 'Seychelles', 'Сейшелы'], ['SL', 'Sierra Leone', 'Сьерра-Леоне'], ['SO', 'Somalia', 'Сомали'], ['ZA', 'South Africa', 'ЮАР'], ['SS', 'South Sudan', 'Южный Судан'], ['SD', 'Sudan', 'Судан'],
    ['TZ', 'Tanzania', 'Танзания'], ['TG', 'Togo', 'Того'], ['TN', 'Tunisia', 'Тунис'], ['UG', 'Uganda', 'Уганда'], ['ZM', 'Zambia', 'Замбия'], ['ZW', 'Zimbabwe', 'Зимбабве']]),
  ...L('Americas', [['AG', 'Antigua and Barbuda', 'Антигуа и Барбуда'], ['AR', 'Argentina', 'Аргентина'], ['BS', 'Bahamas', 'Багамы'], ['BB', 'Barbados', 'Барбадос'], ['BZ', 'Belize', 'Белиз'],
    ['BO', 'Bolivia', 'Боливия'], ['BR', 'Brazil', 'Бразилия'], ['CA', 'Canada', 'Канада'], ['CL', 'Chile', 'Чили'], ['CO', 'Colombia', 'Колумбия'], ['CR', 'Costa Rica', 'Коста-Рика'], ['CU', 'Cuba', 'Куба'],
    ['DM', 'Dominica', 'Доминика'], ['DO', 'Dominican Republic', 'Доминиканская Республика'], ['EC', 'Ecuador', 'Эквадор'], ['SV', 'El Salvador', 'Сальвадор'], ['GD', 'Grenada', 'Гренада'],
    ['GT', 'Guatemala', 'Гватемала'], ['GY', 'Guyana', 'Гайана'], ['HT', 'Haiti', 'Гаити'], ['HN', 'Honduras', 'Гондурас'], ['JM', 'Jamaica', 'Ямайка'], ['MX', 'Mexico', 'Мексика'], ['NI', 'Nicaragua', 'Никарагуа'],
    ['PA', 'Panama', 'Панама'], ['PY', 'Paraguay', 'Парагвай'], ['PE', 'Peru', 'Перу'], ['KN', 'Saint Kitts and Nevis', 'Сент-Китс и Невис'], ['LC', 'Saint Lucia', 'Сент-Люсия'],
    ['VC', 'Saint Vincent and the Grenadines', 'Сент-Винсент и Гренадины'], ['SR', 'Suriname', 'Суринам'], ['TT', 'Trinidad and Tobago', 'Тринидад и Тобаго'], ['US', 'United States', 'США'],
    ['UY', 'Uruguay', 'Уругвай'], ['VE', 'Venezuela', 'Венесуэла']]),
  ...L('Oceania', [['AU', 'Australia', 'Австралия'], ['FJ', 'Fiji', 'Фиджи'], ['KI', 'Kiribati', 'Кирибати'], ['MH', 'Marshall Islands', 'Маршалловы Острова'], ['FM', 'Micronesia', 'Микронезия'],
    ['NR', 'Nauru', 'Науру'], ['NZ', 'New Zealand', 'Новая Зеландия'], ['PW', 'Palau', 'Палау'], ['PG', 'Papua New Guinea', 'Папуа — Новая Гвинея'], ['WS', 'Samoa', 'Самоа'],
    ['SB', 'Solomon Islands', 'Соломоновы Острова'], ['TO', 'Tonga', 'Тонга'], ['TV', 'Tuvalu', 'Тувалу'], ['VU', 'Vanuatu', 'Вануату']]),
];
export const countryByCode = (code: string | null | undefined): Country | undefined => COUNTRIES.find(c => c.code === (code ?? '').toUpperCase());
/** A flag from the two letters (regional indicator symbols); systems without flag emoji show the two letters. */
export const flagOf = (code: string): string => (/^[A-Z]{2}$/.test(code) && code !== 'XK' ? String.fromCodePoint(...[...code].map(ch => 0x1f1e6 + ch.charCodeAt(0) - 65)) : code);
