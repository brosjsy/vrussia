# V Russia — Life Simulator

A free, browser-based life simulation set in Russia, in the spirit of the viral *Lagos Life*.
Pick a life — a Moscow "nepo baby", a regional kid, a Tajik, Uzbek or Kyrgyz labour migrant, a foreign student, a Dagestani student —
and live two years (730 days) of work, study, paperwork, family, culture and everyday surprises.

**Over 4,000 scenarios**, 14 online services you fill in step by step, a live city map, weather, banking, flights, businesses, storylines with memory, and a path from newcomer to citizen.

## Quick start

```bash
npm install
npm run dev          # local server (usually http://localhost:5173)
```

It is a static site: `npm run build` produces `dist/`, which can be hosted anywhere. Pushing to `main` deploys to GitHub Pages
through `.github/workflows/deploy.yml` (set Settings → Pages → Source: GitHub Actions). The game is also an installable offline app (PWA).

| Command | What it does |
|---|---|
| `npm run dev` | development server |
| `npm run build` | production build into `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | fast test suite (about a minute) |
| `npm run test:full` | everything, including the slow tests |
| `npm run test:exhaustive` | plays every choice of every scenario against many states |
| `npm run balance` | bot playthroughs, writes `docs/BALANCE.md` (set `BALANCE_DIFF=easy` or `hard` for the other levels) |

See also: [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) (a 5-minute walkthrough for a presentation) and
[`docs/ITERATION_REPORT.md`](docs/ITERATION_REPORT.md) (what was built and fixed, round by round).

## How it works

Each day has three parts (morning, afternoon, evening); every action uses one. Rent is paid on Saturdays. Keyboard: **1–9** choose, **Enter** continues, **Esc** closes pop-ups.

**Characters.** Citizens, labour migrants (patent route), EAEU workers (no patent), foreign students — each with different rules, money and risks.

**Papers.** Registration (7 working days for most visitors; for workers 15 days for Tajik and Uzbek citizens and 30 for Kyrgyz, Kazakh and Armenian citizens, as reported in 2024), medical exam, health insurance, patent (about ₽10,000/month in Moscow from 1 January 2026, up from ₽8,900 in 2025) with the two-month notification rule, language test, a ground for RVP (quota / marriage / child), RVP, VNZh, citizenship. State duties follow the law in force from 26 July 2026 (RVP ₽15,000, VNZh ₽30,000, citizenship ₽50,000; exemptions for some groups are not modelled) and cannot be filed without the money. Expired papers lead to police checks, fines and legal strikes; three strikes mean deportation; a clean record slowly clears strikes. Waiting times that take years in real life are shortened to months and the game says so.

**Systems.**
- 🗺️ a map-first home screen: a small isometric city (16 places) you click to travel, with a news ticker, quest cards, a place card with shortcuts, a bottom menu and a phone whose apps are the online services; snow, frost and rain make you lose your way; a good phone helps
- 💻 **14 online services** on one form engine: job application, doctor, marketplace, flat rental, bank account, university portal, marriage application, kindergarten queue, train tickets, residence/citizenship portal, register a business, health insurance, pay fines, mobile identification
- ✈️ a full flight booking site (search → fare → passenger → extras → payment → SMS code → e-ticket), then the airport day and the border
- 🏪 build a company: 7 kinds of business, self-employed or individual entrepreneur, weekly accounts, hiring, inspections, expansion
- 🎓 admission → exam sessions → GPA → scholarship or expulsion
- 🏦 Sber, VTB, T-Bank, remittances, loans and mortgages; phone, car (driving school, dealer), flats
- 🏥 hospital, 🐕 stray dogs and adoption, 💞 dating, marriage, children, family decisions
- 🏛️ culture, history, traditions, volunteering, the in-game community «Patriot» Award
- 👥 14 recurring characters whose storylines remember your choices
- 🎚️ three difficulty levels (Easy, Normal, Realistic) that change starting money, how often police checks come, living costs and how fast violations expire
- 🌐 English / Russian interface toggle (menus and labels; story texts are still English)
- 🏆 39 achievements, a first-month checklist, goals, a journal, export/import of saves
- 📱 a working phone: your own Russian mobile number (newcomers need a SIM card first, a broken phone blocks everything), contacts that depend on your life, text chats with replies and small effects, calls, and a bank app with balance, cards, history and transfers to family and friends
- 🧊 a **3D world** (the default when your device can draw 3D): people walk the roads, talk and work, your city has its river or sea, a bridge, parks and notice boards, and **Go inside** opens a furnished room for the place you are at (flat, workplace, bank, MFC, clinic, lecture hall and more). Click the fridge, desk or counter and your character walks there and does the same thing as the matching button. Low-poly, not photoreal; loaded only when opened.
- 🏠 **A home that fits your life**: a worker who has just arrived sleeps on a bunk in a shared room, a student in a dormitory room, a family from the regions in a panel-block flat, a rich family in a roomy flat with parquet and a chandelier; what you buy (a studio, a village house) changes it. In **Buy mode**, the **Home** tab lets you renovate (floor, walls, light, windows) and, if you are a citizen, **build your own house** stage by stage (plot, foundation, walls, roof, finish): the plot appears in the 3D city and grows, and when it is done you live in it rent free.
- 🪑 **Furniture with real shapes**: a bed has a frame, a mattress, a blanket, a pillow and a headboard; a chair has legs and a back; the wardrobe has doors and handles, the stove has rings, the sideboard has books and cups. In the evening the windows go dark and the lamps light the room. Things you can use carry a small round picture, and their words appear when you point at them or tap them.
- 🧱 **Solid city**: nobody walks through a house, a tree, a notice board or into the water; people find a way round, and cars wait for people.
- 🚗 **Traffic**: cars drive on the roads of the 3D city, more of them and slower in the morning and evening rush and in snow, rain or frost (a chip says when it is a go-slow). The **Traffic** button hides them.
- 🧩 **Little things to do with things**: tap a chair, a table, a plant, the television, the window, the rug, or a guitar, a piano, a bathtub, a samovar, an aquarium, a cat basket you have bought, and a card lists what you can do (seconds, price, what it gives: a little company, calm, a bite to eat, a wash). They take no part of the day, so you can do three in each part of the day.
- 🏛️ **City hall and the weekly election** (the **City hall** button in the 3D view): every week the city chooses next week's decree among the platforms of six invented candidates. Vote once a week, in person, at the ballot box in the MFC hall; or pay a campaign fee and stand yourself: if you are liked enough (reputation, community merit, friends) your platform becomes the decree and you are paid a deputy's allowance for the week. Decrees are announcements only. All names are invented.
- 💼 **Careers**: every shift counts, and after 8, 24, 56 and 110 shifts in the same job you are promoted (Trainee, Junior, Specialist, Senior, Lead) with a raise of up to a quarter. Your profile shows the ladder; changing the job starts again at Trainee.
- 🍲 **Everyday needs**: hunger, hygiene and social contact fall a little in every part of the day. Eat, wash up (the **bucket** in your flat, or a shower cabin if you buy one: it takes no time, once in each part of the day) and spend time with people to keep them up. A very low need adds a little stress, and in the worst case costs a little health. Meters show in the stats and in the corner of the 3D view, and a chip over your head names the most urgent one.
- 🛋️ **Furnish your flat**: inside your home in the 3D view, **Buy mode** opens a catalogue of about 50 pieces in eleven tabs (Design, Sleep, Kitchen, Bath, Comfort, Fun, Skills, Light, Decor, Pets, Luxury) with sizes, comfort stars and prices. Buy a piece and put it on the floor grid or on the wall; tap it to pick it up. Pieces never block the door or the way to the bed, fridge or desk. It only costs money: nothing else in the game changes.
- 🌐 an **online part, written but switched off**: accounts, a cloud save, a leaderboard, who is online, a chat room for each place (adults only, with report and block) and news. It needs the owner to create a Supabase project and set two values; until then the Online button only says so and nothing is sent. See [docs/BACKEND.md](docs/BACKEND.md). Never run against a real server yet.
- 🚲 **streets**: a roundabout and branching streets with two car lanes (driving on the right), cycle strips with cyclists, pavements and zebra crossings; cars keep a gap and give way, people keep to the pavement and step round each other
- 📌 an **adverts board**: eight small ads a day (odd work, rooms, things for sale, services, lost and found), and your own ads with replies over the next days
- 🗺️ a plan of 150 features with what is built and what is not: [docs/FEATURES_150.md](docs/FEATURES_150.md)
- 🛰️ an optional **real map**: the streets and 3D buildings of your city from OpenStreetMap, with the game's places, people and you on top. It is off by default; the first time, the game explains that it will load map data from openfreemap.org (which sees your internet address) and asks. The offline illustrated map stays the normal one
- 🌍 people who look like the many peoples of Russia and its neighbours: 8 skin tones, 9 hair colours (black to blond, red, grey and white), 9 hair styles including braids and coily hair, round or almond eyes, starting looks (Slavic, Central Asian, Caucasian, Tatar-Bashkir, East Asian, African), traditional clothes anyone can wear (skullcap, headscarf, striped robe), and city crowds whose mix follows the city (more Tatar people in Kazan, more people from the Caucasus in Makhachkala, more Siberian faces in Yakutsk); looks never change how the game treats a person
- 🧑 a character creator with a full-body preview (skin, height, hair, beard, top, trousers or skirt and shoes, each with colours, and what you want to become), a wardrobe, and a crowd of invented people on the city map who stand in groups, wear name tags and speech bubbles, and answer when you click them, illustrated portraits for you and for everyone you meet, a shop with clothes that appear on your portrait, phones, food and gifts, a meeting app with invented adults, and two small games
- 🔊 sound effects (taps, coins, chimes, a ringing phone; one switch to turn them off), a mood pill, a keyboard-shortcut button, group chats and a message-requests box where scam texts can be blocked or (at a cost) opened
- 🧸 a daily hidden matryoshka (one place per day, a prize for every fifth find), map layers, small talk with invented neighbours at each place, and a Messages app on the phone that reads your own situation (rent, fines, papers, family, and scam texts labelled as scams)
- 🥇 a local hall of fame and lifetime totals on the title screen (kept in your browser only), a "Copy my result" button on the ending screen, and an **Aa** button for three text sizes
- 🗄️ no server: all data lives in the code or in your browser; the data model and an optional cloud design (not built) are in `docs/DATABASE.md`

## Content

About 4,000 scenarios: a mix of hand-written set pieces and template families (for example 37 cities × 12 local scenarios, 60 dishes × 4 situations,
55 jobs with 9–11 workplace incidents each, ~100 culture quizzes, 40 proverbs). Add more with `S({ id, cat, who, req, title, text, choices })` in `src/content/`.

```
src/engine.ts          game state, rules, time, scoring (no DOM; runs in Node tests)
src/content/*.ts       scenarios, grouped by theme; packs/ holds the large data tables
src/forms.ts           reusable "fill in the website" engine; src/flows.ts has the services
src/booking-ui.ts      the airline website; src/flights.ts the airport-day scenes
src/ui.ts              interface
src/realmap.ts         the optional real map (OpenStreetMap, 3D buildings), loaded only when the player agrees
src/world3d.ts         the 3D world (loaded on demand); rooms: interiors.ts (data), rooms3d.ts (drawing); also world-logic, characters3d, city-geo, scenery3d
src/city.ts            the isometric home map, news ticker, quests, place card
src/social.ts          phone notifications, small talk at a place, map layers
src/phone.ts           the phone as a game system: number, contacts, chats, calls, transfers
src/phone-ui.ts        the phone screens
src/avatar.ts          illustrated portraits drawn from a few choices (skin, hair, clothes)
src/shop.ts, shop-ui.ts the shop: catalogue, buying rules, screen
src/dating.ts, games.ts the meeting app and the two phone games
src/dreams.ts          the life dreams chosen when creating a character
src/sound.ts           sound effects made in the browser (no files), with an on/off switch
src/store.ts           local data layer: hall of fame and lifetime totals (see docs/DATABASE.md)
src/prefs.ts           text-size preference
src/share.ts           the copy-my-result text
test/                  unit, UI (jsdom), stress and balance tests
```

## About accuracy

Fiction for a project demo. Rules, prices and procedures are simplified models of real ones (checked against public sources in
`docs/ITERATION_REPORT.md`) and change often in real life, so please verify before relying on any number.

## Credits and licences

- Map data: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL). Vector tiles and style: [OpenFreeMap](https://openfreemap.org) and © [OpenMapTiles](https://openmaptiles.org). They are shown in the corner of the real map, as their terms ask.
- Real houses in the 3D city (the **Real houses** button): building outlines and heights from the same OpenStreetMap data and OpenFreeMap tiles, read with [@mapbox/vector-tile](https://github.com/mapbox/vector-tile-js) and [pbf](https://github.com/mapbox/pbf) (BSD-3-Clause). It is asked for only after you agree, and kept on your device. Yandex Maps and Google Maps are not used, because their terms do not allow it.
- Map drawing: [MapLibre GL JS](https://maplibre.org) (BSD-3-Clause), downloaded only when the real map is opened.
- Everything else (portraits, characters, city drawings, sounds) is drawn or generated in this project.
