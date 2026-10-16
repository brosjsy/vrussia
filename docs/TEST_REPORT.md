# V Russia — the testing report (everything so far)

Updated 16 October 2026 (round 124). Kept in the repository next to the code; the screenshots are in `docs/screens/`.
The full history of every round (1–124) is in `docs/ITERATION_REPORT.md`; this page is the summary of what was tested and how it went.

## 1. Where things stand

| Check | Result |
|---|---|
| The game's automatic tests (`npm test`) | **793 passed of 793**, 111 test files |
| The server's tests (`cd server && npm test`) | **51 passed of 51** (database 7, accounts 17, security 14, game 13) |
| The built server end to end (`cd server && npm run smoke`) | passes: migrations, real HTTP, the PostgreSQL driver, sign-up, e-mail link, log-in, save, load, a forged request refused |
| The game's own client against the real server | 6 tests, including a hostile player |
| Play-test: 20 players, 100 days, every feature (`npm run playtest`) | 10 learning rounds; the last runs: **0 crashes, 0 server errors, 0 world problems, every feature worked for some player** |
| Play-test: 40 players | clean |
| Soak: 100 runs with different seeds | running — results in `docs/SOAK.md` |
| Played by hand in a browser against the real server | sign-up, e-mail link, log-in, reset link, Daily life app: all work (screenshots below) |
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
