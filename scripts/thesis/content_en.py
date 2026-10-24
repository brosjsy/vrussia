# -*- coding: utf-8 -*-
"""English version of the business thesis «В России» ("In Russia"). Same structure and layout as content.py (GOST 7.32-2017).
Sources stay in their original (Russian) form, as GOST R 7.0.100-2018 requires the language of the source."""
from content import AUTHOR_RU, AUTHOR_EN, ISU, GROUP, SUPERVISOR, YEAR, FIG, SCR, SOURCES

TITLE = '«В России» ("In Russia"): an educational life simulator of Russia with a cyber-hygiene module for the adaptation of foreign citizens and young people'

KEYWORDS = ('EDUCATIONAL GAME, LIFE SIMULATOR, ADAPTATION OF FOREIGN CITIZENS, CYBER HYGIENE, SOCIAL ENGINEERING, REMOTE FRAUD, INFORMATION SECURITY, '
            'PERSONAL DATA PROTECTION, 3D CITY MODEL, BUSINESS THESIS, STATE SUPPORT')

ABSTRACT = [
    'Object of the work: the social, legal and digital adaptation of foreign students, labour migrants and Russian young people to life in the Russian Federation. Subject: the «В России» platform and the business model for introducing it.',
    'Aim: to justify and build a browser life simulator of Russia that teaches the rules of stay, everyday life and protection against fraud, and to write its business plan.',
    'The work analyses the adaptation problem (422.2 thousand foreign students in 2025/26; 5.7 million foreign citizens in Russia) and the scale of cyber fraud (29.3 billion roubles stolen from bank clients in 2025). '
    'A working product was built: a 3D model of 37 Russian cities with their landmarks and typical housing, 10 types of flats with real layouts, 4,341 life situations, the "Cyber life" module with 18 scenes, a daily quiz and protection tools, and a secured server; quality is confirmed by 976 automated tests.',
    'A business model (free for the player; B2G/B2B licensing for universities and adaptation centres), a first-year budget of 1 million roubles under the "Student Startup" programme, a roadmap and a risk analysis were developed. '
    'The project is shown to support the national development goals (Presidential Decree No. 309) and the State Migration Policy Concept for 2026–2030.',
]

TERMS = [
    ('VNZh', 'residence permit (вид на жительство)'), ('ESIA', 'the Unified Identification and Authentication System (Gosuslugi login)'), ('FASIE (ФСИ)', 'the Foundation for Assistance to Small Innovative Enterprises'),
    ('FADN (ФАДН)', 'the Federal Agency for Ethnic Affairs'), ('ICT', 'information and communication technologies'), ('IRI (ИРИ)', 'the Internet Development Institute'),
    ('IS', 'information security'), ('MFC', 'multifunctional centre of state and municipal services'), ('PD', 'personal data'),
    ('RVP', 'temporary residence permit (разрешение на временное проживание)'), ('DBMS', 'database management system'), ('CSRF', 'cross-site request forgery'),
    ('SOC', 'security operations centre'), ('WebGL', 'the browser programming interface for 3D graphics'), ('152-FZ', 'Federal Law No. 152-FZ "On Personal Data"'),
]

BODY = [
    ('h1', 'INTRODUCTION'),
    ('p', 'Russia is receiving more and more foreign students while facing mass remote fraud. According to the Ministry of Science and Higher Education, 422.2 thousand foreign students from 182 countries studied at Russian universities in 2025/26 [1], and Presidential Decree No. 309 sets the goal of raising this number to at least 500 thousand by 2030 [2]. '
            'Altogether about 5.7 million foreign citizens were in the country in 2025 [3]. In their first weeks each of them must solve dozens of tasks: migration registration, the medical examination, a work patent or a student visa, a SIM card and a bank account, housing, transport, the language and everyday habits.'),
    ('p', 'At the same time the damage from crimes committed with ICT is growing. In 2025, 29.3 billion roubles were stolen from bank clients without their voluntary consent, and only 5.9 % was returned [4]. In 2024 the Interior Ministry registered 765.4 thousand IT crimes, about 40 % of all crimes [5]. '
            'The most vulnerable groups are newcomers and young people: according to the Financial Literacy Strategy, 53 % of young people aged 14–35 lack the knowledge to protect themselves from fraudsters [6]. Migrants and students are also recruited as "droppers" (money mules), which has been a criminal offence since 5 July 2025 [7].'),
    ('p', 'Existing adaptation tools — brochures, portals, FADN courses, the ruID mobile app — tell people the rules but do not let them "live" them. Banks\' anti-fraud trainers teach people to spot tricks, but outside the context of everyday life. No product on the market combines in one game a 3D model of Russian cities, migration procedures, the Russian language in context and training against fraud (section 1.4).'),
    ('p', 'The relevance of the work follows from state priorities: the national goals "realising the potential of every person" and "digital transformation" [2], the State Migration Policy Concept for 2026–2030 [8], the National Security Strategy [9] and the Information Security Doctrine, which calls for "forming a culture of personal information security" of citizens [10].'),
    ('p', 'Aim of the work: to create the educational game platform «В России» and to write a business plan for its development sufficient to obtain state and university support.'),
    ('p', 'To achieve the aim, the following tasks were solved:'),
    ('list', ['analyse the adaptation problem, the landscape of cyber fraud in Russia, the market and the analogues;',
              'design and build the game platform: the 3D model of cities and housing, life scenarios, the cyber-hygiene module and the online features;',
              'build a threat model of the platform and implement information-security measures, including the protection of users\' personal data;',
              'verify product quality with automated tests and simulated play-testing;',
              'develop the business model, budget, roadmap, performance indicators and the plan for attracting state support.']),
    ('p', 'Object of research: the adaptation of foreign citizens and young people to life in Russia. Subject: the educational game platform and its business model. '
            'Methods: analysis of legal acts and official statistics, comparative analysis of analogues, object-oriented design, threat modelling under the FSTEC methodology, unit and simulation testing, financial planning.'),
    ('p', 'The novelty lies in the proposed model of "learning by living", in which legal procedures, everyday situations and social-engineering scenarios are built into one game loop that remembers the player\'s decisions, and the state\'s protection tools (the self-ban on loans, the trusted person) are modelled as game mechanics that reduce the consequences of attacks. '
            'The practical value is a working product ready for pilot use at universities and adaptation centres. The work is done in the "business thesis" format provided for by the ITMO University regulation [11] and formatted according to the ITMO requirements for final theses [37] and GOST 7.32-2017 [38].'),

    ('h1', '1 Analysis of the problem, the market and analogues'),
    ('h2', '1.1 Adaptation of foreign citizens to life in Russia'),
    ('p', 'A foreign student or worker faces strict deadlines: migration registration, the medical examination, the work patent and its monthly payment, visa extensions. Since 5 February 2025 a register of controlled persons has been in force: foreigners without legal grounds to stay cannot open a bank account, and operations on existing accounts are limited to 30 thousand roubles a month [12]. '
            'Since 1 January 2025 a foreign citizen\'s SIM-card contract is concluded only in person and confirmed through ESIA and the Unified Biometric System, and the number of SIM cards is limited to ten [13]. A mistake at any step leads to fines, expulsion or loss of communication.'),
    ('p', 'The state recognises the problem. The Migration Policy Concept for 2026–2030 names as tasks "creating conditions for the adaptation of foreign citizens to the legal, socio-economic, cultural and other conditions of life", "raising the awareness of foreign citizens of the conditions of life in Russia" and "increasing the interest of active foreign young people in Russian education and the study of the Russian language" [8]. '
            'Since 2025 FADN has run pilot adaptation centres in five regions, covering 99,336 foreigners [14]; its course covers law and culture but not the language [15]. The existing tools remain informational: people are told the rules but cannot safely make a mistake and try again.'),
    ('h2', '1.2 Remote fraud and social engineering'),
    ('p', 'Bank of Russia statistics show a persistently high level of theft (table 1). The criminals\' main tool is social engineering: the victim is persuaded to transfer money, tell a code or install malware [4]. In the second quarter of 2026 alone banks detected 28,678 social-engineering attacks [16].'),
    ('table', 'Table 1 — Operations without the client\'s voluntary consent (Bank of Russia)',
     [['Period', 'Volume, bn roubles', 'Returned to clients, %', 'Prevented, trn roubles'],
      ['2023', '15.8', '8.7', '5.8'], ['2024', '27.5', '9.9', '13.5'], ['2025', '29.3', '5.9', '13.9'], ['Q1 2026', '7.40', '5.7', '—'], ['Q2 2026', '7.35', '7.0', '1.89']],
     [3.5, 4.0, 4.5, 4.5]),
    ('p', 'The state responds with systemic measures. Federal Law No. 41-FZ of 01.04.2025 created the GIS "Antifraud", introduced the labelling of calls from organisations, a ban on passing a number to third parties, the self-ban on SIM contracts and the "trusted person" ("second hand") who confirms a client\'s large operations [17]. '
            'Since 1 March 2025 the self-ban on loans has been available on Gosuslugi [18]; since 1 September 2025 a cooling-off period applies: loans of 50–200 thousand roubles are paid out after 4 hours, over 200 thousand after 48 hours [19]. The second package (Federal Law No. 210-FZ of 26.06.2026) obliges banks and operators from 2027 to compensate the damage if they fail their anti-fraud duties [20].'),
    ('p', 'Technical measures do not replace a person\'s own knowledge: the scripts change constantly — "your mobile contract expires", "confirm your doctor\'s appointment", "vote for my niece", the "fake boss", a relative\'s voice cloned by AI, the recruitment of "walking couriers" [21]. '
            'The national project "Data Economy and Digital Transformation of the State" includes the federal project "Cybersecurity Infrastructure" worth 73.7 billion roubles [22], and the school subject OBZR contains the module "Safety in the information space" [23]. There is no mass interactive trainer for adult newcomers built into the context of everyday life.'),
    ('h2', '1.3 Market analysis'),
    ('p', 'The Russian video-game market was estimated at 176 billion roubles in 2023, and user spending exceeded 175 billion roubles in 2025; 106–110 million Russians over 7 play games, 62 % on smartphones [24]. The revenue of the top 100 online-education companies grew by 12 % in 2025 [25]. '
            'The world market of serious games is estimated at 10.5–15 billion dollars in 2024, with growth forecast to 52 billion dollars by 2035 [26]. The target segments are shown in table 2.'),
    ('table', 'Table 2 — Target segments',
     [['Segment', 'Size', 'Need', 'Who pays'],
      ['Foreign students at Russian universities', '422.2 thousand [1]', 'adaptation before and after arrival, language, cyber hygiene', 'universities (international offices), the Ministry of Science'],
      ['Labour migrants', 'part of the 5.7 million foreigners [3]', 'papers, rights, protection from fraud', 'FADN adaptation centres, employers'],
      ['Russian young people aged 14–35', 'tens of millions', 'financial and cyber literacy', 'Ministry of Education, universities, Rosmolodezh'],
      ['General audience', '106–110 million players [24]', 'an engaging game about life in Russia', 'free (social effect)']],
     [4.0, 3.6, 4.6, 4.0]),
    ('h2', '1.4 Analysis of analogues'),
    ('p', 'Analogues fall into three groups: life simulators, adaptation tools for migrants and anti-fraud trainers (table 3). Simulators (BitLife, BLACK RUSSIA) earn from advertising and paid "cases", and Russian role-play projects are built around a "criminal" aesthetic. '
            'Adaptation tools (the ruID app, the FADN course) solve procedural tasks but are not games. Bank trainers ("Vizhu podvokh", "Stop! Moshennik!") are limited to fraud scenarios [27].'),
    ('table', 'Table 3 — Comparison with analogues',
     [['Product', '3D Russian city', 'Migration procedures', 'Anti-fraud', 'No donations or ads'],
      ['BitLife', '—', '—', '—', '—'], ['BLACK RUSSIA', '+', '—', '—', '—'], ['Russian Life Simulator', '—', '—', '—', '+'],
      ['ruID (Ministry of Digital Development)', '—', '+', '—', '+'], ['FADN course', '—', '+', '—', '+'], ['"Vizhu podvokh" (Sber)', '—', '—', '+', '+'],
      ['«В России»', '+', '+', '+', '+']],
     [4.6, 2.8, 2.9, 2.4, 3.5]),
    ('h2', '1.5 Conclusions of the section'),
    ('p', 'The problems of adaptation and of cyber fraud overlap: a newcomer is the most vulnerable victim, and not knowing the rules also makes him a potential "dropper". The state sets the corresponding tasks in decrees and national projects, but there is no interactive product that teaches by "living". This defines the niche of «В России».'),

    ('h1', '2 Product description'),
    ('h2', '2.1 Concept and game loop'),
    ('p', 'The player chooses who starts a life in Russia: a foreign student from Lagos in Kazan, a labour migrant from Tajikistan, Uzbekistan or Kyrgyzstan in Moscow, a student from Dagestan, a young person from Saratov or a wealthy Muscovite; chooses the difficulty and creates the character\'s appearance. '
            'A foreigner can start at home: the invitation, tests, the visa form, a consulate appointment, the interview, the ticket and the migration card at the border. The aim is to live two game years (730 days) and become who the player wants: a doctor, a civil servant, an entrepreneur, a cook, a security specialist.'),
    ('p', 'Each day has three parts (morning, afternoon, evening), and every action takes one. Needs (hunger, hygiene, social contact, rest) fall during the day; energy, stress, health, money, reputation and knowledge change with the decisions. '
            'The game has 4,341 life situations with choices, and characters remember the player\'s decisions. Document deadlines are tracked: an expired registration leads to checks, fines and, after three violations, expulsion.'),
    ('fig', SCR + 'r146-design-title.jpg', 'Figure 1 — The start screen: choosing a character and the difficulty'),
    ('h2', '2.2 The 3D model of Russian cities and housing'),
    ('p', 'The game world is a 3D model of the city where the player lives (figure 2). There are 37 Russian cities, each with its river or sea, real streets and districts and its housing stock: the shares of khrushchyovkas, nine-storey and high-rise panel blocks, stalinkas, new builds, pre-revolutionary and wooden houses. '
            'In St Petersburg pre-revolutionary houses with courtyard-wells dominate, in Arkhangelsk wooden houses, in Volgograd the Stalin-era ensemble of the centre. Facades are painted by the graphics card according to the type of house: panel seams and balconies, the cornice and dark ground floor of a stalinka, the two-tone storeys of a new build, the pilasters of old houses.'),
    ('fig', SCR + 'r151-moscow3d.png', 'Figure 2 — Moscow in 3D: the Kremlin wall with the Spasskaya Tower and St Basil\'s Cathedral beyond the game city'),
    ('p', 'Each city has its landmarks — 61 objects in total: the Kremlin and St Basil\'s in Moscow, the Peter and Paul Cathedral and the Lakhta Center in St Petersburg, the Kul Sharif Mosque and the Söyembikä Tower in Kazan (figure 3), The Motherland Calls in Volgograd, the Golden and Russky bridges in Vladivostok and others. '
            'Clicking an object shows its name, year and a verified fact in Russian or English. Military and critical-infrastructure sites are deliberately excluded.'),
    ('fig', SCR + 'r151-kazan3d.png', 'Figure 3 — Kazan: the Kul Sharif Mosque and the Söyembikä Tower'),
    ('p', 'Flats reproduce the real layouts of Russian housing (table 4): a hallway, kitchen, bathroom and rooms divided by walls, with typical furnishings — a carpet on the wall and the "stenka" with crystal, a gas stove in the khrushchyovka, a combined bathroom, the shared kitchen of a kommunalka with a stove for each family, the Russian stove and the red corner of an izba (figures 4 and 5). '
            'Every player gets an address: a real street and district of the city with an invented house and flat number, floor and entrance that match the type of building; it is shown on the plate at the entrance, in the flat and on the home card that other players see.'),
    ('table', 'Table 4 — Types of housing in the game',
     [['Type', 'Prototype', 'Who lives there'],
      ['A bunk in a shared room', 'a panel-block flat rented out by the bed', 'labour migrants'],
      ['A dormitory room', 'a block-type dormitory', 'students'],
      ['A room in a kommunalka', 'a communal flat in a pre-revolutionary house', 'rent, cheap start'],
      ['A one-room khrushchyovka', 'a five-storey block of the 1960s', 'rent'],
      ['A flat in a panel block', 'a nine-storey "brezhnevka"', 'a family from the regions'],
      ['A flat in a stalinka', 'a 1930s–1950s house, ceilings over 3 m', 'a wealthy family'],
      ['Studio, euro-two', 'a new build', 'purchase, rent'],
      ['Village house, own house', 'an izba with a Russian stove; a house built by the player', 'purchase, construction']],
     [4.8, 6.4, 4.8]),
    ('fig', SCR + 'r151-khrush.png', 'Figure 4 — A one-room khrushchyovka: hallway, combined bathroom, kitchen with a gas stove, room with the "stenka"'),
    ('fig', SCR + 'r151-kommunal.png', 'Figure 5 — A room in a kommunalka: the neighbours\' doors, the shared kitchen with a stove for each family, the shared bathroom'),
    ('h2', '2.3 The "Cyber life" module'),
    ('p', 'The module teaches people to recognise social engineering and to use the protection tools of the state and the banks. Its content is based only on confirmed sources — the Bank of Russia, the Interior Ministry and the texts of laws (section 1.2). It has three components.'),
    ('p', 'The first is 18 life scenes that come up in the ordinary course of the game: a call about "renewing your mobile contract", "confirming a doctor\'s appointment", a "vote for my niece" link, a "walking courier" vacancy, a request to "lend your card", a cloned voice of a relative, a "viewing fee" for a non-existent flat, a QR code on a parking meter, a password leak, a phishing letter at work, a loan taken under pressure, a SIM card "without papers" for a foreigner. '
            'Each scene explains why the trick works and how to act correctly, with a reference to the real rule: for example, since 5 July 2025 handing over a card for gain is a crime under Article 187 of the Criminal Code [7], and couriers of fraudsters are charged as accomplices under Article 159.'),
    ('p', 'The second is the daily quiz "Scam or not?" in the "Cyber safety" app of the player\'s phone (figure 6). Each day the player gets five messages from a bank of 24 samples (SMS, calls, messengers, e-mails, websites, QR codes), including genuine messages from banks and Gosuslugi. '
            'After each answer the sign that gives the trick away is shown; experience raises the level from "Beginner" to "Cyber defender".'),
    ('fig', SCR + 'r151-cyber-ru.png', 'Figure 6 — The "Cyber safety" app (Russian interface): the quiz and the protection tools'),
    ('p', 'The third is six protection tools: the self-ban on loans, the trusted person, two-step login on Gosuslugi, the self-ban on SIM contracts, different passwords and updates from official stores. A protection that is switched on changes the outcome of attacks in the scenes: two-step login makes a stolen code useless, and the trusted person stops a transfer to a "relative", so the player sees their value from experience. '
            'For those who want a career in the field there is the profession of IS analyst (SOC) with work situations (a night incident, personal data in an open spreadsheet), student CTF competitions and a bug-bounty programme with responsible disclosure.'),
    ('h2', '2.4 Educational modules'),
    ('p', 'Besides cyber hygiene the platform teaches: legal procedures (registration, the patent, RVP, VNZh and citizenship with the real state fees; the police and courts), financial literacy (banks, transfers, loans, self-employment taxes), employment (56 professions, the civil service with work cases), study (courses including Russian from A1 to C1 and cybersecurity), everyday skills (437 kinds of city activities, 1,039 dishes of the cuisines of the peoples of Russia and the world with the rules of safe cooking), transport (the metro of seven cities, trains, flights) and culture (holidays, traditions, family life). '
            'The interface is fully translated into Russian, so the game can be used for language practice.'),
    ('fig', SCR + 'r131-kitchen-result.jpg', 'Figure 7 — The "Kitchen" module: the result of cooking a dish with the mistakes explained'),
    ('h2', '2.5 Online features'),
    ('p', 'A registered player gets a cloud save, the leaderboard, chat at game places and private messages (adults only, with reporting and blocking), friends, home pages with a guest book, a city vote, adverts on the billboards of the 3D city and weekly co-op challenges. '
            'Texts are filtered: insults, phone numbers and messenger names are not allowed, so that communication does not move outside the moderated platform.'),

    ('h1', '3 Architecture and information security of the platform'),
    ('h2', '3.1 Architecture'),
    ('p', 'The platform consists of a client application and its own server (figure 8). The client is written in TypeScript, built with Vite and runs in any modern browser without installation; the 3D graphics use the three.js library (WebGL). '
            'So that the game opens quickly on weak devices and slow networks, the first download is limited to 250 KB compressed, and the other modules — the 3D world, the phone, the kitchen, "Cyber life" — load on demand. The size limits are checked by an automated test at every build.'),
    ('fig', FIG + 'architecture_en.png', 'Figure 8 — Architecture of the platform'),
    ('p', 'The server is built on Node.js and Fastify, the data are stored in PostgreSQL. Business rules (message limits, advert checks, scoring) are implemented as functions on the DBMS side; the schema changes by numbered migrations. '
            'To meet the requirement to localise personal data (Part 5 of Article 18 of 152-FZ) [28], the server and the database are hosted in a data centre in Russia. External map services are not used without the player\'s consent.'),
    ('h2', '3.2 Threat model'),
    ('p', 'The threat model follows the FSTEC Methodology for assessing threats to information security [29]. The protected objects are user accounts and sessions, personal data (e-mail address, user name, messages), game saves and the availability of the service. '
            'The violators considered are an external violator with low and medium potential (an attacker on the internet, automated bots) and an internal violator — a registered user trying to obtain other people\'s data. The relevant threats and the protection measures are summarised in table 5.'),
    ('table', 'Table 5 — Relevant threats and implemented protection measures',
     [['Threat', 'Protection measure', 'Verified by'],
      ['Password guessing', 'Argon2id (19 MiB, 2 passes); 10 log-in attempts per minute per IP and 10 per 15 minutes per address; passwords of at least 10 characters', 'auth.test, security.test'],
      ['Session theft', '256-bit token in an HttpOnly, Secure, SameSite=Lax cookie with the __Host- prefix; only its SHA-256 is stored; limited lifetime', 'auth.test'],
      ['Cross-site request forgery (CSRF)', 'changing requests are accepted only with an allowed Origin and in JSON', 'security.test'],
      ['Access to other people\'s data', 'the player id is taken only from the session; filtering in every query and DBMS function', 'game.test'],
      ['SQL injection', 'parameterised queries only; input validated with zod schemas', 'security.test'],
      ['Account enumeration', 'identical answers and timing for known and unknown addresses', 'auth.test'],
      ['Compromise of the server process', 'a DBMS role without rights to change the schema; 15 s query timeout; process isolation', 'db.test'],
      ['Denial of service', 'request rate limiting; daily limits in DBMS functions', 'game.test'],
      ['Leaking details in errors', 'only known error codes go out; cookies are removed from logs', 'security.test'],
      ['Social engineering through chat', 'no contacts or links in messages and adverts; blocking and reports; chat for adults only', 'game.test, social.test']],
     [3.8, 8.2, 4.0]),
    ('h2', '3.3 Secure development'),
    ('p', 'Development follows the practices of GOST R 56939-2024 "Secure software development" [30]: every change passes static type checking and automated tests; the security measures have their own tests, and for the key checks it was confirmed that weakening the protection makes the test fail. '
            'There are few dependencies, all pinned by a lock file; secrets (test account passwords, keys) are kept outside the repository.'),
    ('h2', '3.4 Compliance with the law'),
    ('p', 'Personal data are processed in accordance with 152-FZ [28]: a minimal set of data (e-mail and user name), consent at registration, the right to delete the account with all its data, localisation in Russia and notification of Roskomnadzor before launch. '
            'The requirements for protecting personal data are implemented with regard to FSTEC Order No. 21 [31]. Content is age-labelled under Federal Law No. 436-FZ "On the protection of children from information harmful to their health and development"; chats are available only to adults.'),
    ('h2', '3.5 Testing and quality'),
    ('p', 'Product quality is confirmed by 913 automated client tests in 130 files and 63 server tests. The tests check game rules and balance, the reachability of every scene, interface accessibility (labels of buttons and fields), the Russian translation, 3D scenes without a graphics card, flat layouts (nothing blocks the way), download size budgets and online scenarios against a real server. '
            'In addition, simulated play-testing was carried out: 50 automated players with different strategies played on a local server, which found balance errors and failures before manual testing; manual testing with ten accounts found 25 problems, all fixed. This is simulation and manual checking by the developer, not a study with real users; such a study is planned for the pilot (section 4.4).'),

    ('h1', '4 Business model and implementation plan'),
    ('h2', '4.1 Value proposition'),
    ('p', 'For the player, «В России» is a free game without advertising or paid "cases" in which one can safely live the first years in a new country, make mistakes and try again. For a university it is a tool for the pre-arrival and first adaptation of foreign students that reduces the load on the international office. '
            'For adaptation centres and employers it is a clear and measurable course in the rules of stay and protection from fraud. For the state it contributes to the national goals of attracting foreign students and fighting IT crime.'),
    ('h2', '4.2 Business model'),
    ('p', 'The model is "free for the player, funding of the social effect" (table 6). At the development stage it rests on grants; then comes licensing for organisations: a branded version with reports on module completion for universities and adaptation centres, and custom scenarios for a particular region or university.'),
    ('table', 'Table 6 — Business model (Business Model Canvas)',
     [['Element', 'Content'],
      ['Customers', 'foreign students and migrants; Russian young people; universities, FADN adaptation centres, employers'],
      ['Value', 'safely "living" the rules of life in Russia and protection from fraud; a measurable learning result'],
      ['Channels', 'universities\' international offices, preparatory faculties, adaptation centres, schools (OBZR), student communities'],
      ['Revenue streams', 'grants (FASIE, IRI, Rosmolodezh); licences for organisations; custom scenarios; no ads or donations for the player'],
      ['Key resources', 'the platform source code, the scenario base, verified facts, a server in Russia'],
      ['Key partners', 'ITMO University (FBIT, Technopark, accelerator), universities with foreign students, FADN, NGOs'],
      ['Cost structure', 'development and maintenance, servers, translation into migrants\' languages, legal support, effectiveness studies']],
     [4.0, 12.0]),
    ('h2', '4.3 Promotion'),
    ('p', 'The first channel is a pilot at ITMO University with foreign students of FBIT and the preparatory department: the game is given before arrival as part of the applicant\'s package. The second is universities in the Priority-2030 programme interested in the "500 thousand foreign students" goal. '
            'The third is FADN adaptation centres; the fourth is schools and colleges, where the "Cyber life" module complements the OBZR module "Safety in the information space". For the general audience, publications on game platforms and in student communities are used.'),
    ('h2', '4.4 Roadmap'),
    ('p', 'The plan covers 24 months (figure 9). The first 12 months are funded by the "Student Startup" grant [32]: hosting in Russia, translating the interface into Uzbek, Tajik, Kyrgyz and English, and a pilot at ITMO University with a measured result (a test before and after the "Cyber life" module with a control group). '
            'The next 12 months are scaling at universities and adaptation centres, an application to the IRI competition for independent game developers [33] and a mobile version.'),
    ('fig', FIG + 'roadmap_en.png', 'Figure 9 — Project roadmap'),
    ('h2', '4.5 Team'),
    ('p', f'The author of the project is {AUTHOR_EN} ({AUTHOR_RU}), a master\'s student of the Faculty of Secure Information Technologies of ITMO University (programme 10.04.01 "Information Security"), responsible for the product, architecture, information security and scenarios. '
            'The ITMO regulation allows a business thesis to be defended alone [11]. For the pilot it is planned to bring in a teacher of Russian as a foreign language and translators into migrants\' languages, and to find a mentor through the ITMO Technopark accelerator.'),

    ('h1', '5 Financial plan and the case for state support'),
    ('h2', '5.1 First-year budget'),
    ('p', 'The budget follows the parameters of the "Student Startup" programme of the Foundation for Assistance to Innovation: 1 million roubles for 12 months, with a company in which the grantee owns more than 51 % and is the general director [32] (table 7, figure 10). The amounts are the author\'s planned estimates.'),
    ('table', 'Table 7 — First-year budget (plan)',
     [['Item', 'Amount, roubles', 'Share, %'],
      ['Founder\'s salary (12 months × 50,000)', '600,000', '60.0'],
      ['Translation of the interface and scenarios into migrants\' languages', '120,000', '12.0'],
      ['Legal support (152-FZ, 436-FZ), registration and accounting', '100,000', '10.0'],
      ['Pilot and effectiveness study (test before and after)', '60,000', '6.0'],
      ['Promotion at universities and in communities', '60,000', '6.0'],
      ['Servers and data storage in Russia, domain, e-mail', '60,000', '6.0'],
      ['Total', '1,000,000', '100.0']],
     [10.0, 3.0, 3.0]),
    ('fig', FIG + 'budget_en.png', 'Figure 10 — Structure of the first-year budget'),
    ('h2', '5.2 Sources of funding'),
    ('p', 'The sources of funding are summarised in table 8. At the first stage the key ones are the FASIE grant, ITMO University support (defence as a business thesis, the accelerator, the pilot) and the Priority-2030 programme, in which ITMO has taken part since 2021 [34]. '
            'The IRI competition for independent developers includes the themes "Multinationality: unity in diversity" and "Qualitative changes of life in Russia", which match the content of the game directly [33].'),
    ('table', 'Table 8 — Sources of funding',
     [['Source', 'Conditions', 'When'],
      ['FASIE "Student Startup"', '1 million roubles, 12 months, students of accredited programmes; the 2026 winners included citizens of 8 friendly countries [32]', 'first year'],
      ['ITMO University', 'business thesis, Technopark and accelerator, a pilot at the university [11]', 'first year'],
      ['FASIE "Start-1"', 'up to 5 million roubles without co-financing [35]', 'second year'],
      ['IRI indie-game competition', 'vertical slice up to 7.5 million roubles, demo up to 15 million; applicant must be a sole proprietor [33]', 'second year'],
      ['Rosmolodezh.Grants', 'up to 1 million roubles, Russian citizens aged 14–35 [36]', 'if a Russian citizen joins the team'],
      ['Licences for organisations', 'universities, adaptation centres, employers', 'from the second year']],
     [4.2, 8.6, 3.2]),
    ('h2', '5.3 Performance indicators'),
    ('p', 'Since the project is social, the main indicators are educational and social (table 9). The financial aim of the second year is to cover operating costs from licences and the next grant.'),
    ('table', 'Table 9 — Target indicators',
     [['Indicator', 'After 12 months', 'After 24 months'],
      ['Registered players', '5,000', '30,000'],
      ['Partner universities and adaptation centres', '1 (ITMO)', '10'],
      ['Improvement in the cyber-hygiene test after the module', '≥ 30 %', '≥ 30 %'],
      ['Share of players who switched on at least one protection', '≥ 50 %', '≥ 60 %'],
      ['Interface languages', '5', '7']],
     [9.0, 3.5, 3.5]),
    ('h2', '5.4 Alignment with state priorities'),
    ('p', 'The alignment of the project with state documents is shown in table 10: the project supports goals in education, migration policy and information security at once, which widens the circle of possible customers and partners.'),
    ('table', 'Table 10 — Alignment with state priorities',
     [['Document', 'Provision', 'Contribution of the project'],
      ['Decree No. 309 of 07.05.2024 [2]', 'at least 500 thousand foreign students by 2030', 'adaptation of students before and after arrival'],
      ['Decree No. 309 of 07.05.2024 [2]', 'a system for countering IT crimes and reducing the damage', 'mass training in recognising social engineering'],
      ['Migration Policy Concept 2026–2030 [8]', 'adaptation; awareness of life in Russia; interest in the Russian language', 'game-based "living" of the rules, language in context'],
      ['National Security Strategy [9]', 'social and cultural adaptation of migrants; prevention of ICT crimes', 'both directions in one product'],
      ['Information Security Doctrine [10]', 'a culture of personal information security', 'the "Cyber life" module'],
      ['National project "Data Economy" [22]', 'federal project "Cybersecurity Infrastructure"', 'fraud prevention'],
      ['Financial Literacy Strategy [6]', 'financial cyber literacy', 'financial and anti-fraud scenarios']],
     [4.6, 6.0, 5.4]),
    ('h2', '5.5 Risks'),
    ('table', 'Table 11 — Risks and mitigation',
     [['Risk', 'Probability', 'Mitigation'],
      ['Changes in the law make scenarios outdated', 'high', 'facts are kept separately with sources and dates; quarterly review'],
      ['Insufficient player engagement', 'medium', 'the game loop, daily tasks, online features; a pilot with measurement'],
      ['The game taken as official "instructions"', 'medium', 'a clear note: the game does not replace advice; links to official sources'],
      ['Abuse in chats', 'medium', 'adults-only chat, filters, reports, blocking'],
      ['A security incident on the server', 'low', 'the measures of section 3; backups; an incident response plan'],
      ['Insufficient funding', 'medium', 'several sources (table 8); low operating costs']],
     [5.6, 2.8, 7.6]),

    ('h1', 'CONCLUSION'),
    ('p', 'The work justifies and implements the educational game platform «В России». The analysis showed that the problems of adapting foreign citizens and of remote fraud overlap, that the state sets the corresponding tasks at the level of national goals and concepts, and that there is no interactive product on the market that teaches by "living".'),
    ('p', 'A working product was created: a 3D model of 37 Russian cities with 61 landmarks and typical housing, 10 types of flats with real layouts, an address for every player, 4,341 life situations, the "Cyber life" module with 18 scenes, a daily quiz and six protection tools, and online features on the project\'s own server. '
            'A threat model was built and protection measures, including those for personal data, were implemented; quality is confirmed by 913 client tests and 63 server tests.'),
    ('p', 'A business model, a first-year budget of 1 million roubles, a roadmap, performance indicators and a plan for attracting support from FASIE, ITMO University, IRI and partner organisations were developed. The project is shown to support Presidential Decree No. 309, the Migration Policy Concept for 2026–2030, the National Security Strategy and the Information Security Doctrine. '
            'The next step is a pilot at ITMO University measuring the effectiveness of the cyber-hygiene module with real users.'),
]

APPENDIX = [
    ('A', 'Screens of the platform', [
        ('fig', SCR + 'r148-brand-ru.jpg', 'Figure A.1 — The main screen in Russian'),
        ('fig', SCR + 'r151-stalinka.png', 'Figure A.2 — A flat in a stalinka: high ceilings, parquet, separate rooms'),
        ('fig', SCR + 'r151-spb3d.png', 'Figure A.3 — St Petersburg in 3D'),
        ('fig', SCR + 'r126-visa-interview.jpg', 'Figure A.4 — Preparing to come: the consulate interview'),
        ('fig', SCR + 'r146-design-phone.jpg', 'Figure A.5 — The player\'s phone with its apps'),
    ]),
    ('B', 'Scenes of the "Cyber life" module', [
        ('table', 'Table B.1 — Scenes of the module and their legal basis',
         [['Scene', 'Scheme or tool', 'Basis'],
          ['"Your mobile contract expires"', 'stealing the Gosuslugi code', 'Bank of Russia review [4]'],
          ['"Confirm your doctor\'s appointment"', 'Gosuslugi account takeover', 'Interior Ministry, Ministry of Digital Development [21]'],
          ['"Vote for my niece"', 'messenger hijack', 'Interior Ministry [21]'],
          ['"Walking courier"', 'courier of fraudsters', 'Art. 159 Criminal Code'],
          ['"Lend me your card"', 'dropper', 'Art. 187 parts 3–6 Criminal Code [7]'],
          ['A relative\'s voice', 'voice deepfake', '[21]'],
          ['A flat at half price', 'fake rental', '[21]'],
          ['QR code on a parking meter', 'fake payment page', '[21]'],
          ['A password in a leak', 'password reuse', 'IS practice'],
          ['A letter about a bonus', 'phishing with a malicious attachment', 'IS practice'],
          ['Self-ban on loans', 'protection', '[18]'],
          ['"Second hand"', 'trusted person', '41-FZ [17]'],
          ['A SIM card "without papers"', 'rules for foreigners', '126-FZ, Art. 45.1 [13]'],
          ['A loan under pressure', 'cooling-off period', '[19]'],
          ['CTF competition', 'a career in IS', '—'],
          ['A hole in a shop\'s website', 'responsible disclosure; Art. 272.1 Criminal Code', 'IS practice'],
          ['Night alert; PD in a spreadsheet', 'the work of a SOC analyst; 152-FZ', '[28]']],
         [4.8, 5.8, 5.4]),
    ]),
    ('C', 'Results of automated testing', [
        ('table', 'Table C.1 — Test results',
         [['Test suite', 'Files', 'Tests', 'Result'],
          ['Client (game rules, interface, 3D, translation, sizes)', '130', '913', 'passed'],
          ['Server (accounts, security, game features, DBMS)', '7', '63', 'passed'],
          ['Simulated testing on a local server', '—', '50 players', 'no crashes or server errors']],
         [8.6, 2.2, 2.4, 2.8]),
    ]),
]

LABELS = {
    'docTitle': 'Business thesis «В России» ("In Russia")', 'file': 'Business-thesis_V_Rossii_GOST_EN.pdf',
    'head': ['Ministry of Science and Higher Education of the Russian Federation', 'Federal State Autonomous Educational Institution of Higher Education', '<b>"ITMO NATIONAL RESEARCH UNIVERSITY"</b>', '(ITMO University)'],
    'faculty': 'Faculty of Secure Information Technologies', 'kind1': 'FINAL QUALIFYING WORK', 'kind2': 'in the form of a business thesis',
    'fields': ['Field of study: 10.04.01 Information Security', 'Educational programme: Information Security', 'Qualification: Master',
               f'Student: {AUTHOR_EN} ({AUTHOR_RU}), ISU {ISU}, group {GROUP}', f'Supervisor: {SUPERVISOR}', 'Business consultant: ______________________'],
    'city': 'Saint Petersburg', 'abstract': 'ABSTRACT', 'contents': 'CONTENTS', 'terms': 'ABBREVIATIONS', 'sources': 'REFERENCES', 'appendix': 'APPENDIX',
    'count': 'The business thesis has {p} pages, {f} figures, {t} tables, {s} sources, 3 appendices.',
    'tabRe': r'Table (\S+) —', 'refRe': r'(table|Table) (X?\d+)',
}

LABELS['dg'] = {
    'Браузер игрока\nTypeScript, three.js (WebGL)\nпервая загрузка ≤ 250 КБ\nмодули по требованию': "Player's browser\nTypeScript, three.js (WebGL)\nfirst download ≤ 250 KB\nmodules on demand",
    'Сервер игры\nNode.js, Fastify\nсессии, лимиты, CSRF,\nпроверка входных данных': 'Game server\nNode.js, Fastify\nsessions, limits, CSRF,\ninput validation',
    'PostgreSQL\nфункции СУБД, миграции,\nроль с минимальными правами': 'PostgreSQL\nDBMS functions, migrations,\nleast-privilege role',
    'Внешние сервисы\n(только с согласия игрока):\nкарта OpenStreetMap': "External services\n(only with the player's consent):\nOpenStreetMap map",
    'HTTPS, JSON, cookie HttpOnly': 'HTTPS, JSON, HttpOnly cookie', 'SQL\n(параметры)': 'SQL\n(parameters)', 'ЦОД на территории РФ (152-ФЗ)': 'Data centre in Russia (152-FZ)',
    'Сервер в РФ, юридическое оформление, ООО': 'Server in Russia, legal set-up, company', 'Перевод на языки мигрантов': "Translation into migrants' languages",
    'Пилот в Университете ИТМО': 'Pilot at ITMO University', 'Исследование эффективности (до/после)': 'Effectiveness study (before/after)', 'Защита бизнес-тезиса': 'Business thesis defence',
    'Заявка ИРИ, «Старт-1»': 'IRI and "Start-1" applications', 'Партнёрства с вузами и центрами адаптации': 'Partnerships with universities and adaptation centres', 'Мобильная версия': 'Mobile version',
    'Лицензии для организаций': 'Licences for organisations', 'Месяцы от начала проекта': 'Months from the start of the project', 'грант ФСИ': 'FASIE grant',
    'Оплата труда': 'Salary', 'Переводы': 'Translations', 'Юридическое сопровождение': 'Legal support', 'Пилот и исследование': 'Pilot and study', 'Продвижение': 'Promotion', 'Серверы в РФ': 'Servers in Russia',
    'тыс. руб.': 'thousand roubles',
}
