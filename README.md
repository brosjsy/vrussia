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

**Papers.** Registration (7 days for most nationalities, 15 for Tajik and Uzbek citizens, 30 for EAEU workers), medical exam, health insurance, patent (₽10,000/month in Moscow, 2026) with the two-month notification rule, language test, a ground for RVP (quota / marriage / child), RVP, VNZh, citizenship. Expired papers lead to police checks, fines and legal strikes; three strikes mean deportation; a clean record slowly clears strikes. Waiting times that take years in real life are shortened to months and the game says so.

**Systems.**
- 🗺️ a live city map (16 places) you click to travel; snow, frost and rain make you lose your way; a good phone helps
- 💻 **14 online services** on one form engine: job application, doctor, marketplace, flat rental, bank account, university portal, marriage application, kindergarten queue, train tickets, residence/citizenship portal, register a business, health insurance, pay fines, mobile identification
- ✈️ a full flight booking site (search → fare → passenger → extras → payment → SMS code → e-ticket), then the airport day and the border
- 🏪 build a company: 7 kinds of business, self-employed or individual entrepreneur, weekly accounts, hiring, inspections, expansion
- 🎓 admission → exam sessions → GPA → scholarship or expulsion
- 🏦 Sber, VTB, T-Bank, remittances, loans and mortgages; phone, car (driving school, dealer), flats
- 🏥 hospital, 🐕 stray dogs and adoption, 💞 dating, marriage, children, family decisions
- 🏛️ culture, history, traditions, volunteering, the in-game community «Patriot» Award
- 👥 13 recurring characters whose storylines remember your choices
- 🎚️ three difficulty levels (Easy, Normal, Realistic) that change starting money, how often police checks come, living costs and how fast violations expire
- 🌐 English / Russian interface toggle (menus and labels; story texts are still English)
- 🏆 33 achievements, a first-month checklist, goals, a journal, export/import of saves

## Content

About 4,000 scenarios: a mix of hand-written set pieces and template families (for example 37 cities × 12 local scenarios, 60 dishes × 4 situations,
55 jobs with 9–11 workplace incidents each, ~100 culture quizzes, 40 proverbs). Add more with `S({ id, cat, who, req, title, text, choices })` in `src/content/`.

```
src/engine.ts          game state, rules, time, scoring (no DOM; runs in Node tests)
src/content/*.ts       scenarios, grouped by theme; packs/ holds the large data tables
src/forms.ts           reusable "fill in the website" engine; src/flows.ts has the services
src/booking-ui.ts      the airline website; src/flights.ts the airport-day scenes
src/ui.ts, scene.ts    interface, animated city scene
test/                  unit, UI (jsdom), stress and balance tests
```

## About accuracy

Fiction for a project demo. Rules, prices and procedures are simplified models of real ones (checked against public sources in
`docs/ITERATION_REPORT.md`) and change often in real life, so please verify before relying on any number.
