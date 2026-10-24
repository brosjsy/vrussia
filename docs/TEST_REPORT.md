# V Russia — the testing report (everything so far)

Updated 17 October 2026 (round 141). Kept in the repository next to the code; the screenshots are in `docs/screens/`.
The full history of every round (1–141) is in `docs/ITERATION_REPORT.md`; this page is the summary of what was tested and how it went.

## 1. Where things stand

| Check | Result |
|---|---|
| The game's automatic tests (`npm test`) | **830 passed of 830**, 116 test files |
| The server's tests (`cd server && npm test`) | **61 passed of 61** (database, accounts, security, game, challenges 8, adverts 4) |
| The built server end to end (`cd server && npm run smoke`) | passes: migrations, real HTTP, the PostgreSQL driver, sign-up, e-mail link, log-in, save, load, a forged request refused |
| The game's own client against the real server | 6 tests, including a hostile player |
| Play-test: 20 players, 100 days, every feature (`npm run playtest`) | 10 learning rounds; the last runs: **0 crashes, 0 server errors, 0 world problems, every feature worked for some player** |
| Play-test: 40 players | clean |
| Soak: 100 runs with different seeds (10 players, 60 days each) | **100 of 100 passed**: 0 crashes, 0 server errors, 0 world problems, 67 minutes (`docs/SOAK.md`) |
| Played by hand in a browser against the real server | sign-up, e-mail link, log-in, reset link, Daily life app: all work (screenshots below) |
| Advertising agency (round 125), played by hand against the real server | mounting, the law check, the report, two real players seeing each other's adverts, real views counted, taking down online: all work (screenshots below) |
| Before Russia (round 126), played by hand | a student from Nigeria from 23 June to arrival in Kazan on 1 September: invitation, documents, a wrong form sent back, the appointment calendar, the interview, a misspelt visa caught at the counter, the ticket, the migration card; a reload keeps the preparation; the Tajik worker's way shown (screenshots below) |
| State service jobs (round 127), played by hand | a citizen applied for patrol police, was called on day 3, passed the interview and the week of checks, accepted (badge, colleagues), went to work by metro at 07:00 (in at 07:36), decided three cases, had lunch, left at 20:00 with 3,400 ₽; the game clock moved to the evening; the header shows the job (screenshots below) |
| Law and order, household life (round 128), played by hand | shoplifting got away with (police attention 12, everything else closed for the day); an undocumented Tajik worker at a raid: KoAP 18.8, a 6,000 ₽ fine, expulsion, the "Deported" ending; the Household app: a plant, an episode, the alarm (screenshots below) |
| City life (round 129), played by hand | the app lists 56 activities in 13 categories with a search; yoga done, counted 1 of 56 (screenshot below) |
| City life with 309 activities (round 130), played by hand | 25 category chips, holidays listed, "pelmeni" found by the search, done and counted 1 of 309 |
| The Kitchen (round 131), played by hand | BBQ ribs: the shelf picked, the raw pork rinsed on purpose (explained as wrong), cooked to the end: one star, 1,040 ₽ paid, the clock moved to the evening, every mistake listed; the list shows 1,039 dishes with suggestions |
| The Kitchen in Russian (round 134), played by hand | pot roast (жаркое в горшочках): the shelf, the raw pork question and its lesson all in Russian |
| The Kitchen: "what I have" (round 132), played by hand | potato, egg, onion, smetana: boiled eggs (all at home), potato babka (buy bacon), frittata (buy cheese) |
| The Kitchen online (round 139), on the local stack | a score sent with the local test account came back first on today's table, shown in the Kitchen (`docs/screens/r139-online-challenge.jpg`); sending from inside the game while logged in not yet played by hand |
| The Kitchen guests (round 138), played by hand | this week's four friends with an egg allergy and a halal guest, the "only dishes all can eat" box |
| Build and download size | build passes; first download 249 KB of the 250 KB budget |
| `npm audit` (server) | 0 vulnerabilities |
| Never tested | a real PostgreSQL server, real e-mail delivery, Docker, the backup scripts, a real VPS (none available here) |

## 2. The 20-player play-test

Each of 20 players (4 styles: careful, social, hustler, random; 7 origins; every 7th under 18) signs up, confirms the e-mail, logs in and
lives 100 game days on the real server, using **every feature** in turn: the game's 13 actions, trips, needs, food and cooking, home life,
study, two jobs, 11 places, the shop and clothes, furniture and renovation, renting, bills, building a house, savings, the phone (calls,
transfers, scam messages, dating, two games), the 14 online services, flights, the city election, holidays, the new daily chores, and on the
server: presence, chat, private messages, reports, blocks, follows, friends, finding players, adverts, homes, the guest book, likes, news,
the leaderboard, saves; plus logging out and in, a forgotten password, a password change, one account deleted. Then every life is played to its
end (up to two years) and goes on the leaderboard. Every 10 days the whole world is checked.

The latest report: `docs/PLAYTEST_20.md` (every feature, how many players it worked for, why it was refused; every player; every check).

### What the ten learning rounds found and fixed

1. **Rules that lived only in the page.** Rent bills, holiday progress, the dream's reward, achievements, sending a website form and booking a
   flight ran only in the browser page, so a game played any other way skipped them. All moved into the game's rules (`turn.ts`, `forms.ts`,
   `flights.ts`); the page and the bots now share them.
2. **A text bug:** "Needs 1 portions of groceries".
3. **Missing daily life:** no laundry, no mobile plan, no home internet, no transport card. **Added** (`chores.ts`, the phone's Daily life app).
4. **Two transport cards** (an old shop scene and the new app): made into one; the first-month checklist counts both.
5. **The Online screen let players try what would be refused** (a 4th advert, a second like in a week): it now says so first (two new server routes).
6. **The password label said 8 characters**; the own server needs 10. Fixed.
7. **"Wash at home" was greyed out without a reason.** It now says why (no washing machine, or not at home).
8. **An e-mail link opened in a tab where the game was already running did nothing.** Fixed and checked in the browser.
9. **Markup typed by a hostile player** (an advert, a chat line) is shown as plain text to others; a new test guards it.
10. **Mistakes of the test itself** (wrong expectations, clumsy bots, a misleading table) were found and corrected; they are listed in
    `docs/PLAYTEST_LOG.md` so the difference between "the game is wrong" and "the test was wrong" stays visible.

## 3. Screenshots

### Played by hand, round 129: City life

![City life](screens/r129-city-life-app.jpg)

### Played by hand, round 131: the Kitchen

![Suggestions](screens/r131-kitchen-suggestions.jpg)
![The raw meat question](screens/r131-kitchen-raw-meat-question.jpg)
![The result](screens/r131-kitchen-result.jpg)

### Played by hand, round 128: the police and the law; life at home

The Police & law app: offences with their articles and the chance of being caught:

![Police and law](screens/r128-police-and-law-app.jpg)

The Household app: the flat, the chores, the alarm, quiet time:

![Household](screens/r128-household-app.jpg)

### Played by hand, round 127: working for the state (police and other services)

The vacancy board of state jobs (citizens only for the police and the civil service):

![Vacancies](screens/r127-service-vacancies.jpg)

The interview after the personnel department's call:

![Interview](screens/r127-service-interview.jpg)

A patrol officer's day: the cases on the desk, lunch with colleagues, leaving work:

![Workday](screens/r127-service-workday-cases.jpg)

The service profile: badge, rank, merit, colleagues:

![Profile](screens/r127-service-profile.jpg)

### Played by hand, round 126: before Russia (a foreigner starts at home)

The start at home: the steps of a study visa as a timeline, with the date and the days left before classes:

![Before Russia](screens/r126-before-russia-start.jpg)

Booking the appointment at the visa centre (working days only; some days full):

![The appointment calendar](screens/r126-visa-appointment-calendar.jpg)

At the visa centre: the officer's questions (the answer must agree with the documents):

![The interview](screens/r126-visa-interview.jpg)

The ticket after the visa, and the migration card's purpose at the border:

![Ticket and migration card](screens/r126-ticket-and-migration-card.jpg)

### Played by hand, round 125: the advertising agency

Mounting an advert on a roadside billboard in Moscow, with the live preview and the law check:

![Mount an advert](screens/r125-agency-mount-advert.jpg)

The campaign report three game days later (views, answers, cost per answer):

![Campaign report](screens/r125-agency-campaign-report.jpg)

Signed in as one test player: another real player's advert in the same city, with how many real players saw it:

![Adverts of players in the city](screens/r125-agency-players-in-city.jpg)

### Played by hand, round 124 (real game in a browser, real server on this computer)

The phone with the new Daily life app (Быт):

![The phone with the Daily life app](screens/r124-phone-daily-life-app.jpg)

The Daily life app after buying a Troika card, putting 500 ₽ on it and washing clothes at a laundromat:

![Daily life used](screens/r124-daily-life-used.jpg)

Creating an account on the game's own server:

![Sign up](screens/r124-online-signup.jpg)

Signed in after confirming the e-mail (the session cookie is invisible to the page's scripts):

![Signed in](screens/r124-online-signed-in.jpg)

A password-reset link opened in a tab where the game was already running: after the new password, back at the log-in form (every device logged out):

![Reset link in an open tab](screens/r124-reset-link-in-open-tab.jpg)

### The design (round 123)

![Design: the city screen](screens/r123-design-city-hud.jpg)

![Design: foundations](screens/r123-design-foundations.jpg)

### Earlier phases

| | |
|---|---|
| ![Phase 1: the room](screens/phase1-room.jpg) | ![Phase 1: the city HUD](screens/phase1-city-hud.jpg) |
| ![Phase 1: a need explained](screens/phase1-need-explained.jpg) | ![Phase 1: moods in Russian](screens/phase1-moodlets-ru.jpg) |
| ![Phase 3: the courier job](screens/phase3-courier.jpg) | ![Phase 4: the metro map](screens/phase4-metro.jpg) |
| ![Phase 5: studying](screens/phase5-study.jpg) | |

## 4. Earlier testing, in short (rounds 1–123)

- **Rounds 1–109:** every choice of every one of 1,000+ scenarios tried; balance measured by thousands of bot lives per origin and difficulty
  (`docs/BALANCE*.md`); real rules researched (registration, patents, the residence ladder); accessibility, performance, saving and loading,
  Russian and English, the 3D city (traffic without collisions, walking people, rooms, furniture).
- **Rounds 110–122:** the online part (first for Supabase, then the game's own server): security tests (forged requests, sessions, rate
  limits, privacy between players, SQL injection, least-privileged database roles), two deliberate breakages caught by the tests.
- **Phases 1–8** of the "В России" brief, each with its own test file (`test/phase1.test.ts` … `test/phase8.test.ts`).

## 5. How to run all of it again

```bash
npm test
npm run playtest
node scripts/soak.mjs 100 10 60
cd server && npm test && npm run smoke && npm audit --omit=dev
```

Nothing has been committed or pushed.
