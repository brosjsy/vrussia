# V Russia — overnight iteration report

Rules I follow while the owner sleeps: **no git commits or pushes** (the owner commits), every change must pass
`npm run typecheck`, `npm test` and `npm run build`, and anything factual is checked or flagged.

## How to read this
- Newest work is at the bottom. Each round says what I looked for, what I found, and what I changed.
- Numbers come from automated bot playthroughs (`npm run balance`, output in `docs/BALANCE.md`).

---

## Round 1 — robustness: try every choice of every scenario

**Method.** New test `test/exhaustive.test.ts` executes every choice of all ~3,700 scenarios against 28 different
states (every origin; rich, broke and sick variants; a married-with-kids variant with pet, car and booking),
more than 20,000 executions, plus every dynamic scene, plus a scan of all text for `undefined`, `NaN`, `[object Object]`
and un-filled `{name}`/`{city}` placeholders.

**Found.** One real crash: the marriage-proposal scene read `partner.love` after a breakup had removed the partner.
**Fixed** with a null-safe read. Everything else passed.

Run it any time: `npm run test:exhaustive` (about 2 minutes).

## Round 2 — balance: can a person actually win?

**Method.** `test/balance.test.ts` plays 30 games per origin with two bots: a *random* player and a *cautious* player
(takes the straightforward option, fixes papers first, rests before burning out, only accepts legal jobs).

**What the first numbers said (before changes):**
- Every citizen died of "hospital" around day 100 (stress sat at 85–96 all the time, and the burnout penalty hit health every day).
- Migrants were deported in about 3 weeks, even careful ones.
- Citizens piled up millions, which made money meaningless.

**Root causes found by tracing individual games, and fixes:**

| Problem | Cause | Fix |
|---|---|---|
| Citizens dying | Night recovery of stress was only −4; burnout −4 health/day | Night recovery −8, "stay home" −10, burnout −3 (−1 from stress 75) |
| **Dead-end progression** | `once: true` on medical exam, language test, driving exam, citizenship, quota, student work permission: one failed attempt removed them for ever | Removed `once` (they already hide themselves with flags once you succeed) |
| Urgent paperwork buried | Registration/patent/medical renewals had weight 5 among 150 generic paperwork scenarios | Urgent scenarios now weigh 40–60 and are shown 85% of the time when due |
| Migrants could not afford the legal route | Registration + medical + patent costs about ₽20k, start money was ₽15–20k | Start money ₽30k–48k; student stipend ₽5k/week; migrant living cost lower |
| "Safe" option was the trap | In the fixer and "fictitious registration" scenarios the first choice was the risky one | Safe option now comes first (a regex bug in my first attempt, caught by a check, fixed) |
| Strikes never expired | — | One violation expires every 30 days of clean record |
| Police too frequent | — | Fewer checks for the first 10 days; lower weights; milder penalties when you are new |
| Random "move to another city" | 37 move scenarios at weight 0.4 reset registration | Weight 0.06 |
| Money had no sink | — | Weekly living costs (₽2.2–4.2k) |

**Result after changes (cautious player, 2 game years):**

| Origin | Finishes the 2 years | Citizenship | Deported |
|---|---|---|---|
| Moscow Baby / Regional Kid / Dagestani | 100% | n/a | 0% |
| Tajik migrant | 57% | 57% | 0% |
| Uzbek migrant | 60% | 60% | 0% |
| Kyrgyz (EAEU) | 97% | 97% | 0% |
| Foreign student | 67% | 67% | 0% |

The remaining failures for migrants are debt (about 40% for Tajik and Uzbek), which makes them the hard modes — intentional, but worth
a human playtest. A *random* player is still deported within about 50 days, which I consider correct: careless handling of papers should hurt.

Full table: `docs/BALANCE.md`.

## Faster tests
`npm test` now runs only the quick suites (about 40 s). `npm run test:full` runs everything, `npm run balance` regenerates the balance report.


## Round 3 — research: checking the real rules behind the game

I searched current sources for the rules the game simplifies. What I verified and what changed:

| Fact | Source (checked this session) | Change in the game |
|---|---|---|
| Moscow work patent rises from ₽8,900 to **₽10,000 a month on 1 Jan 2026** (other regions differ: St Petersburg ₽8,000, Novosibirsk ₽10,860, Kamchatka ₽13,800) | [Fergana Agency report](https://en.fergana.agency/news/142395/) | Patent price now ₽10,000 / ₽30,000 for three months (was ₽9,000) |
| After you receive a patent you must **notify the Interior Ministry within two months**, otherwise the patent is suspended / revoked | [Uzbekistan Migration Agency notice](https://gov.uz/en/migration/news/view/64759), [law-firm summary](https://eiglaw.com/new-notice-required-for-foreign-workers-in-russia/) | New scenarios: *patent_notice* (urgent reminder), *patent_suspended* (a one-year ban, patent set to zero). Covered by `test/rules.test.ts` |
| Applicants are checked against the register of "controlled persons" and unpaid-fines databases; biometrics, medical exam and language test needed | same Uzbekistan notice | New scenarios *imm_controlled_registry* and *imm_fssp_check* |
| Registration within **7 working days** for most nationalities; EAEU citizens get 30 days | [HSE](https://ifaculty.hse.ru/en/migrationreg) and others | Already matched (7 days / EAEU 30). One source claimed 15 days for Tajik and Uzbek citizens; sources conflicted so I left it at 7 and note it here for a human to confirm |
| Employers must notify the Interior Ministry of hiring/firing within **three working days** | [BAL summary](https://www.bal.com/bal-news/notification-rules-for-employers-of-foreign-workers-to-change-jan-1/) | Already matched in the employer-notice scene |
| Self-employed (NPD) tax: **4%** from individuals, **6%** from companies, income limit **₽2.4M a year**; foreigners may register under conditions | [Cleverence summary](https://www.cleverence.ru/articles/finansy/-nalogi-i-obyazatelnye-platezhi-samozanyatogo-v-2025-godu/), [Jobbers guide](https://www.jobbers.io/freelancing-in-russia-2025-self-employment-vs-individual-entrepreneurship-complete-guide/) | Basis of the new business system (below) |

**Caveat.** Migration rules in Russia change often. Everything in the game is a simplified teaching model, which the in-game text says;
please double-check any figure before presenting it as current law.

## Round 4 — new system: build a company (the Lagos Life "build companies" loop)

- **Register a business** — 11th online service on the form engine: pick a business (7 kinds from a ₽15k tutoring studio to a ₽600k taxi fleet), tax regime (self-employed or IP), place, funding (savings or a bank loan) and confirm with an SMS code. Eligibility follows the rules above: patent holders cannot register; you need RVP/VNZh, EAEU citizenship or citizenship.
- **Weekly accounting.** Every Saturday: sales − wages (₽9,000 per worker) − 6% tax = profit, shown in the day summary. Reputation moves with results; an NPD owner is warned when approaching the ₽2.4M limit.
- **🏪 My business action** with 14 events: health inspection, supplier price jump, viral bad review, hiring (formal vs cash-in-hand with fine risk), NPD cannot hire (upgrade to IP), equipment failure, customer rush, competitor, tax reminder, scam order, press interview, expansion (levels 1–3), sale of the business, checking a worker's papers.
- New goal "Run a business that earns ₽100,000 in profit". Save format bumped to version 5 (old saves are ignored).
- Tests: `test/business.test.ts` (accounting, losses, owner-only events, goal) and the registration form is covered by the generic form test.
- One bug found by those tests: the "you have no business" scene could appear for owners; fixed.

## Round 5 — player experience: achievements, keyboard, saves

- **30 achievements** (e.g. *Papers in order*, *Survived a Russian winter*, *Citizen*, *Entrepreneur*, *Does not stand aside* for the Patriot Award, *Frequent flyer*, *Explorer*, *Gourmet*). A toast appears when one is unlocked; the profile shows a locked/unlocked grid and the end screen lists the ones you earned. Engine: `ACHIEVEMENTS`, `checkAchievements()`, `choose()` now returns `unlocked`.
- **Keyboard play.** Keys **1–9** pick the numbered option or action, **Enter** continues, **Esc** closes pop-ups; shortcuts are ignored while typing in a form field. Numbers are drawn with CSS counters.
- **Export / import saves** (title screen) as a JSON file, with validation of the file version. Save format is now version 6.
- Small-screen CSS tweaks (two-column action grid, smaller scene, stacked header).
- Tests: `achievements.test.ts` (4) and `keys.test.ts` (1, runs the real UI in jsdom).

## Round 6 — storylines with memory (recurring characters)

Five people, five steps each (25 scenes) that return over weeks and **remember what you chose**:

| Character | Who sees it | Arc |
|---|---|---|
| Timur, the roommate | foreigners | moves in → calls to his mother → loses his job (lend / help find work / refuse) → finds work (repays you if you lent) → moves on |
| Babushka Valya | everyone | pie → medicine → she falls (you call 103) → comes home → leaves you her recipe notebook |
| Aigul, study partner | everyone with some knowledge | meet → exam night → she nearly drops out (help with a grant) → family weekend → graduation |
| Mr. Petrov, the landlord | renters | inspection → rent rise (negotiate: +₽250, accept: +₽500) → burst pipe at midnight → a six-month lease with a discount if he trusts you → selling the flat |
| Rustam, the caretaker | renters | city advice → snow shovel → job tip → his daughter's wedding → retirement |

Engine support: scenarios may now define `build(state)` so their text and choices depend on earlier decisions (`materialize()`).
`test/arcs.test.ts` (8 tests) checks order, pauses between steps, no repeats, memory (Timur repays a loan), the landlord's rent changes, and that the scenes are reachable from the People action.
The exhaustive test now materializes such scenes too.

## Round 7 — research-driven: the "first month" checklist

Student and newcomer guides ([HSE handbook and others found by search](https://istudents.hse.ru/mirror/pubs/share/208302597),
[a first-month checklist for students in Russia](https://sber.bank.in/media/faq/your-first-month-in-russia-a-checklist-for-indian-students)) all list the same first steps:
registration within seven working days, a Russian SIM card, a bank account (which usually needs passport, migration card and registration),
a transport card, warm clothes and boots, and cash for taxis. The game covered most of this but never told the player.

- New sidebar panel **First-month checklist** (hidden once finished or after day 120), different for migrants (adds *medical exam* and *patent*), students/EAEU workers and citizens.
- SIM card and transport card scenes now actually set flags (before they changed nothing), are much more likely to be offered, and — a bug found on the way — **are no longer "once only"**, so choosing the risky stranger's SIM no longer removes the option for ever.
- New achievement *Settled in*.
- Note: I could not find any public description of the reference game "Lagos Life" (searches returned nothing), so I did not copy its features beyond what you described.

## Round 8 — the admission → graduation arc you asked for at the start

- **Exam sessions** every 15 January and 10 June: choose *study hard / as usual / cram / cheat sheet*; the grade (2–5 scale) depends on knowledge and your choice, and feeds a running average (GPA).
- **Consequences:** a fail costs a retake fee; three failed attempts or a second cheating warning means expulsion, with an appeal that can restore your place on probation; an average of 4.5+ earns an increased stipend (+₽1,500/week) and the *Honours student* achievement; four sessions give *Two years of study*.
- **Academic scholarship** application and library-night scenes.
- **Bug found by the tests' design check:** the two student origins never had a university place, so sessions would never have applied; they now start admitted and meet exactly four sessions in the two game years (tested).
- Non-students see a short "friends are cramming" scene instead.
- `test/studies.test.ts`: 8 tests.

## Round 9 — installable offline app (PWA) and accessibility

- Web app manifest, icon, **service worker** (assets cached after the first visit so the game works offline; the page itself is network-first so a new deploy is picked up — a first draft cached the page and would have kept serving stale versions, caught on review).
- Registered only in the production build on https or localhost.
- After each screen change keyboard focus moves to the first choice, so keyboard and screen-reader users are not lost.
- `test/pwa.test.ts`: manifest fields, icons exist, service-worker behaviour.

## Round 10 — verification of the residence ladder, and three more storylines

**Research.** The game teaches RVP → VNZh → citizenship. Sources checked ([GW2RU guide to the 2026 temporary residence permit](https://www.gw2ru.com/plan-your-trip/246769-temporary-residence-permit-russia-2026), [naturalization timeline](https://wehrle.de/wp-content/pgs/russian-golden-visa-to-citizenship-complete-naturalization-timeline-2026.html), [marriage route](https://www.gw2ru.com/lifestyle/2020-russian-passport-marriage)):
RVP normally needs the language, history and law exam and a quota (exemptions exist); VNZh can be requested after a year on RVP; citizenship normally needs five years of residence, or three if married to a citizen.
The game's structure matches; its waiting times are far shorter on purpose, so the in-game text of the VNZh and citizenship scenes now says that explicitly.

**New storylines (arcs 6–8, 15 more scenes):**
- *Sergey*, a rival colleague: credit-stealing, a promotion that depends on whether you made a friend or an enemy, a banya outing.
- *Olga Petrovna*, a retired teacher who runs free Russian lessons: her mock exam **raises your chance of passing the language test** (tested by controlling the random number), and the language test is now retakeable after a failure (it was a one-shot — a dead-end bug fixed in Round 2, re-checked here).
- *Ginger*, a stray cat: feeding, the vet, naming, a dog scare, and whether the cat moves in.

## Round 11 — home culture for the origins you named

Twelve scenes for each of **Tajikistan, Uzbekistan, Kyrgyzstan and Nigeria** (48 scenes): your culture meeting life in Russia, with pride, homesickness and curious colleagues — Rudaki and Shashmaqom, qurutob and the Pamir; Registan, Ulugh Beg, plov and the mahalla; the Manas epic, Issyk-Kul, the yurt's tunduk and kok-boru; jollof, Nollywood, Fela Kuti, owambe and the Harmattan versus a Russian winter.
Each scene rests on a widely documented fact; scenes only appear for the matching origin (tested: exactly 12 each, none for others, reachable from the *Culture & community* action).

## Round 12 — usability pass

- **How-to-play** pop-up, shown on the first game and available from a sidebar button; keyboard **Esc** closes it (tested).
- **Mobile layout:** the game now comes before the sidebar on phones, pop-ups slide up from the bottom, toasts span the width.
- No-JavaScript message; unhandled promise rejections now show in the red error bar too.

## Round 13 — a balance finding that was really a design gap

A late balance run looked worse than earlier ones (careful Tajik and Uzbek migrants: only 40–50% reached citizenship, about half ended in debt). Tracing the money showed the cause: the "cautious" bot **never worked a single shift**.
Every job offer was illegal because it had no patent yet, so it kept searching for jobs while rent and living costs drained its money.

That is a bot flaw, but also a game flaw — a real player could get stuck in the same loop — so I fixed both:
- The job-search screen now says what is missing: *"Tip: legal employers ask for a valid patent. Register, pass the medical exam and buy a patent first (Paperwork)…"* (students are told they need a work permission).
- The cautious bot now finishes the legal route (registration, medical exam, patent, notification) before it looks for work, which is exactly what the first-month checklist tells a human.

**New result (30 games per origin, cautious bot):** Tajik 93%, Uzbek 90%, Kyrgyz 100%, foreign student 90% become citizens within two years; no deportations. The random bot still ends in deportation about 90% of the time. The game is winnable by following its own guidance and punishing otherwise, which was the goal.

## Where things stand

| | |
|---|---|
| Scenarios | about 4,100 (plus 28 dynamic scenes and 11 form flows) |
| Cities / jobs / achievements | 37 / 55 / 33 |
| Tests | `npm test`: 12 files, about 70 tests (≈ 45 s). `npm run test:exhaustive`: ~25,000 choice executions |
| Careful player outcomes | no deportations; **90–100%** of migrants and students who finish the legal route first reach citizenship in two years (`docs/BALANCE.md`) |

## Things I deliberately did **not** do

- No git commits or pushes; the working tree has uncommitted changes for the owner to review and commit.
- No full Russian translation: all text is data, so it is possible, but a half-translated UI would be worse than none.
- No sound: it needs assets and licensing decisions.
- Facts that I could not confirm are marked above (for example, one source's claim of a 15-day registration window for Tajik and Uzbek citizens, which conflicted with the others and was left out).

## Suggestions for the next session

1. A human playtest of the migrant modes: the numbers say they are winnable if you follow the checklist, but only a person can say whether they are *fun*.
2. A Russian-language mode, starting with the interface and the 30 most important scenes.
3. More storylines with memory (the framework makes each one about 60 lines).
4. Screenshots for the submission; I could not open a browser in this environment, so everything visual was tested only through jsdom.

---
## Automatic rounds (scheduled every 15 minutes)

At the owner's request a recurring job now runs every 15 minutes (at :07, :22, :37, :52) and adds one more improvement per run. It lives only in the Claude session and auto-expires after 7 days. Each run appends a round below.

### Round 14 — fines and the "Pay fines" online service (12th service)
- **Research:** paying an administrative fine within 20 days earns a 50% discount in Russia ([Izvestia on the Duma restoring the 50% discount](https://iz.ru/en/1914757/2025-07-03/state-duma-decided-return-50-discount-payment-fines-traffic-violations)); the same coverage shows these rules were changed back and forth in recent years, so the game calls it a simplified model. I did **not** find a source in this session for the "doubles after 60 days" rule I used, so treat that part as a game simplification until someone checks the law.
- **Added:** six ways a fine arrives (speed camera, parking, tram inspector, litter, noise, late address notice), each with "pay now with discount / deal with it later / ignore"; a reminder after 15 days; bailiff enforcement after 60 days; a **Pay fines** form (review, choose payment, SMS code); an on-screen chip with the unpaid amount.
- **Tests:** `test/fines.test.ts` (5) — discount tiers, paying with discount, recording a fine, reminder/enforcement timing, who gets which notice; the generic form test now covers 12 services.

### Round 15 - three more storylines (arcs 9-11), 15 scenes
- **Vladimir, the taxi driver:** city tips, a courtyard shortcut, a forgotten card reader, a midnight call to help a lost passenger, and a job offer from his taxi company.
- **Zarina, a possible partner:** a recurring meeting, a coffee, a misunderstanding (explain honestly / long excuses / let it pass), meeting her friends, and "what are we?". It can create a partner (warmth 60 if you were open and never went cold, otherwise 45) and never replaces a partner you already have.
- **Professor Belova (students only):** office hours, a research project, a hard conversation about your grades, a student conference, a letter of recommendation.
- **Found by the tests:** the first version let "cold" choices be cancelled out by earlier "open" ones, so the romance warmth never dropped. Fixed. I also removed an unnecessary type cast I had written for the partner effect.
- **Tests:** arcs.test.ts now covers 11 storylines in order and with pauses, plus 3 romance tests (open vs cold, single ending, no overwriting a partner). Full quick suite: 84 passing. Typecheck and build clean. No exhaustive run this round (due next round).

### Round 16 - researched fact fix: the real university admission calendar
- **Verified** ([Izvestia on the 2026 campaign](https://iz.ru/en/2118737/2026-06-20/university-admission-campaign-2026-has-been-launched-russia) and university pages found by search): documents are accepted from 20 June; applications for budget places on Unified State Exam results close on 25 July (paid places up to 20 September); ranked lists appear on 27 July; enrolment orders come on 3 August (special quotas) and 7 August (main competition). A new "day of silence" rule applies on order days.
- **Changed:** the game announced results on 25 July. Results now arrive on **7 August** (the enrolment order) and the scene text lists the three real dates; the university portal confirmation message says the same. The portal still opens in June and July.
- **Tests:** two new tests in rules.test.ts (calendar date and text; players who never applied are not admitted, strong applicants are). The suite is at 86 passing; typecheck and build clean.
- **Exhaustive stress test run this round (due every third round):** all 3 tests pass, no crashes, no leaked placeholders.
- **Not changed on purpose:** the "day of silence" and paid-place deadlines are not modelled.

### Round 17 - researched rule: health insurance is required for a patent (13th online service)
- **Verified** ([Konsu Group: voluntary medical insurance requirements for foreign employees](https://konsugroup.com/en/news/voluntary-medical-insurance-requirements-foreign-employees/) and a Bank of Russia summary found by search): a labour migrant must hold a voluntary health insurance (DMS) policy to get a patent; the minimum coverage is 100,000 roubles and the term should match the patent. **Not verified:** a 2026 price. The game keeps its own approximate prices (3 months 5,000; 6 months 9,000; 12 months 16,000) and says they are approximations.
- **Changed:** the migrant route is now medical exam, then insurance, then patent (the patent cannot be bought without a policy). A new urgent paperwork scene *dms_policy* appears at the right moment; the old insurance scene can now be retried after a failure (it was a one-shot); a new online service *Buy health insurance* (plan, name check, SMS code) makes 13 services. Citizens and residents are told they use the state insurance (OMS).
- **Balance re-checked** because a required step was added: careful bots still reach citizenship 93-97% (Tajik 97, Uzbek 93, Kyrgyz 97, student 93), no deportations.
- **Tests:** 5 new rules tests (patent blocked without a policy, policy unlocks it, the online form, who is told they do not need it, retry after failure); the generic form test now covers 13 services. Suite: 92 passing; typecheck and build clean.
- **Skipped:** policy expiry (insurance never lapses in the game) and the exhaustive test (next due in round 19).

### Round 18 - new theme pack: getting around (22 scenes)
- **Verified** ([Wikipedia on the Moscow Central Diameters](https://en.wikipedia.org/wiki/Moscow_Central_Diameters), [GW2RU on metro etiquette](https://www.gw2ru.com/lifestyle/253259-unwritten-rules-moscow-metro), [mos.ru](https://www.mos.ru/en/mayor/themes/15812050/)): the Moscow Central Circle (ring railway, 54 km) was launched on 10 September 2016; the Central Diameters began on 21 November 2019; the escalator rule is stand on the right and walk on the left, with rush-hour announcements asking people to stand on both sides.
- **Added** (src/content/packs/transport.ts): metro etiquette (escalators, rush-hour announcement, offering a seat, a large backpack, the wrong direction, which exit, closing doors, station art), the Moscow ring and diameter trains and the airport express (Moscow only), the shared minibus, a tram in the snow (snow or frost only), card reader trouble, the last bus, scooters and city bikes (fair weather only), a tram conductor, taxi surge pricing in bad weather, a suburban train and a timetable you cannot read. Scenes use the city: metro scenes only appear in the seven cities that have a metro, rail scenes only in Moscow.
- **Tests:** test/transport.test.ts (4): scene count and unique ids, city rules (Moscow rails; Kazan has a metro, Tula does not), weather rules, every choice runs and polite behaviour raises reputation. My first draft claimed 25 scenes; the real number is 22, so the test was corrected, not the code.
- **Skipped:** the exhaustive test (due in round 19); no balance run needed (no rules changed).

### Round 19 - researched fact fix: maternity capital replaces an invented payment
- **Verified** ([Mail.ru Finance on the 2026 first-child amount](https://finance.mail.ru/article/razmer-matkapitala-na-pervogo-rebenka-67865934/), [RBC](https://www.rbc.ru/rbcfreenews/696a7a3a9a7947fe1b409a34), [GPA summary in English](https://gpa.net/blogs/emea-1/russia-minimum-wage-and-maternity-pay-increases-in-2026)): maternity capital for a first child is about 729,000 roubles in 2026 (indexed by 5.6% on 1 February; another source says about 737,000), and it can be spent on housing (purchase, building, repairs, mortgage down payment or principal), children's education or the mother's pension, not taken as cash. **Not verified:** the exact amount (sources differ) and the second-child amount, so the game uses a round 730,000 for the first child only and labels it an approximation.
- **Replaced** my invented "one-time payment of 30,000" at the birth of a citizen's first child. Now a certificate of 730,000 is issued once (to a citizen, or a foreigner married to a citizen); it is shown as a chip, explained in a new scene, and **spent first** when you buy a home (village house, regional studio or Moscow studio), with cash covering the rest. A second child issues nothing; a foreigner whose child is not a citizen gets nothing and pays fees.
- **Tests:** test/matcap.test.ts (8): certificate for a citizen, no second certificate, none for a non-citizen child, one for a foreigner married to a citizen, a village house paid wholly from the certificate, a mortgage down payment split between certificate and cash, a failed purchase spends nothing, the info scene only for holders. Suite: 104 passing; typecheck and build clean.
- **Exhaustive stress test (due this round): 3 of 3 pass.**
- **Skipped:** using the capital for education or a pension in-game (only housing is modelled).

### Round 20 - robustness: saving and loading in the middle of a game
- **Why:** the game autosaves after every screen, and a player may close the tab at any moment. Saved state holds queued scenes (some built dynamically), temporary data and nested objects; a mistake there would show up as a crash or a lost game on the next visit.
- **Added** test/saveload.test.ts (5 tests, about 10 s): a fresh game of every origin survives a save/load round trip unchanged; 28 complete random games (4 per origin) are saved and reloaded every 37 steps and continue from the reloaded copy until the end without errors; queued scenes including dynamic ones (trip, rent, hospital, flight, phone, pet, flat, calendar, storyline) can all be rebuilt after a reload; saves from another version and broken JSON are refused; the stored JSON contains no "undefined" or "NaN".
- **Result:** all passed on the first run, so **no bug was found** in this area. I am recording that as a verified finding, not as a fix. The tests use an in-memory stand-in for the browser storage, so real browser storage limits (private mode, a full disk) are covered only by the try/catch already in the code.
- **Suite:** about 110 tests in the quick run; typecheck and build clean. The exhaustive test is not due until round 22.

### Round 21 - variety measurement, and a fix for repetitive workdays
- **Measured** (temporary simulation, not kept in the suite): in 6 simulated games per character the player met about 2,400 distinct scenes out of roughly 4,100, so overall variety is good. The weak spot was **work**: one job-specific incident appeared 29 times in a single game (a taxi driver's "learn a skill"), and a stray-dog scene 21 times, because each job has only 9-11 incidents and players work constantly.
- **Fixed two ways:** (1) the repeat penalty is now stronger: a scene's weight divides by (1 + times seen) squared instead of (1 + 2 x times seen), so seen scenes fade faster; (2) a new pack of **21 generic workday scenes** (src/content/packs/workdays.ts) that can happen in any job: canteen lunch, a colleague's cake, payday tea, safety briefing, a training afternoon, a shift-swap request, late because of snow (snow or frost only), a hot day (July-August only), praise, layoff rumours, a missing tool, tea on the night shift, a new uniform, a medical-book check, a thank-you from a customer, a language debate, the workshop radio, the smoking corner, a staff photo, a form about a form, a visit from head office. The stray-dog scene's weight was halved.
- **Tests:** test/workdays.test.ts (4): 21 scenes and none for the unemployed; employed players of four different jobs get at least 18 of them with weather and season respected; 330 simulated shifts show at least 24 distinct scenes with no scene repeated more than 22 times; all choices run. Suite: 113 passing; typecheck and build clean.
- **Balance re-checked** because the damping change touches every draw: careful bots still reach citizenship 97-100% (Tajik 100, Uzbek 97, Kyrgyz 97, student 97), no deportations.
- **Limit to be honest about:** repetition cannot go below (number of shifts) / (number of possible scenes); a player who works about a thousand shifts will still see some scenes more than once. More work content would lower it further. I did not re-run the full-game measurement after the fix, only the work-specific test above.
- **Skipped:** the exhaustive test (next due in round 22).

### Round 22 - English / Russian interface toggle
- **Added** src/i18n.ts and a language button (RU/EN) on the title screen and in the game sidebar. The choice is remembered (browser storage) and the page language attribute is updated.
- **What is translated:** the title screen and its tagline, the seven starting characters (names and blurbs), all menu buttons, sidebar headings, the "what now?" prompt, the 15 action buttons with their hints, stat names, parts of the day, weather names, "Result" and "Continue", dates (Russian month and weekday names) and the award text. Switching mid-game changes the screen without touching any game state (day and money are unchanged, tested).
- **What is NOT translated, on purpose:** the thousands of story texts, choices, online-service forms and the help and profile pop-ups remain English. In Russian mode the title screen says so ("the texts of the situations are still in English"). Translating them is a larger project and a half-measure there would be worse than being clear about the limit. The Russian strings were written by me; a native speaker should proofread them before a public release.
- **Tests:** test/i18n.test.ts (6): both languages have exactly the same keys; Russian values are not copies of English; every engine action and every starting character has a Russian text; the English award text equals the one in the culture pack; fallbacks; and a full page test in jsdom that clicks the language button, checks the Russian page, starts a game, checks the Russian action grid, switches back and checks that money and day are unchanged and the choice is stored. Suite: 119 passing; typecheck and build clean.
- **Exhaustive stress test (due this round): 3 of 3 pass.**

### Round 23 - Russian mode: how-to-play guide, journal and ending screens
- **Why:** round 22 left the first-run guide, the journal and the four ending screens in English even in Russian mode; those are the most visible leftovers.
- **Added** to src/i18n.ts: a Russian how-to-play guide (same eight points as the English one), Russian titles and texts for the four endings (hospital, deported, debt, two years in Russia), and interface strings for "Play again", "final score", "Day", "strikes", "Achievements", the journal title and its empty message. The guide, journal, end screen and the first-run pop-up all follow the language.
- **Correction to round 22:** that round's report said the help pop-up stays English; it no longer does. Still English by design: story texts and choices, the online-service forms, the airline site, the profile pop-up's goal and achievement names.
- **Tests (i18n.test.ts, now 7):** every engine ending has a Russian version and the fallback keeps English for unknown ones; in the page test the Russian guide and the English guide have the **same number of points** (a guard against one language getting out of date), and the journal title switches. Suite: all quick tests pass; typecheck and build clean.
- **As before:** the Russian text was written by me and should be read by a native speaker before any public release. Exhaustive test not due (next: round 25).

### Round 24 - two personal stories for the citizen characters (arcs 12-13) and seasonal story steps
- **Why:** the Moscow "nepo baby" and the regional kid had no story of their own; the earlier ones favoured newcomers and students.
- **Added** (src/content/arcs4.ts, 10 scenes): *Connections* (Moscow Baby only): a job through dad's friend, a favour asked in return, the call after a traffic stop, helping a talented friend by merit or by connection, and a choice about your own path. *Mum* (Regional Kid only): Sunday calls, money for a broken boiler, New Year at home or working the holiday, a health scare whose scene depends on how close you stayed, and what Mum really wants. Both are choices between comfort and integrity or between money and family, with different effects on reputation, family bond and the Patriot Award merit.
- **Framework change:** storyline steps can now be tied to months. *New Year at home* only appears in November or December (before this it could appear in July, because steps were paced only by days).
- **Tests (arcs.test.ts, now 31 tests):** only the matching origin sees each story; refusing connections earns more reputation than using them; the last scene of the story remembers your path; going home for New Year raises the family bond more than working; the scare scene reacts to how close you stayed; the seasonal step is absent in June and present in December. Suite: 128 passing; typecheck and build clean.
- **Skipped:** exhaustive test (next due in round 25); no real-world facts were used this round (pure fiction), so no web search was needed.

### Round 25 - researched fact fix: the language, history and law exam
- **Verified** ([a university testing centre page for the integration exam](https://testingcenter.spbu.ru/en/exams/russian/integration-exam.html) and similar centre pages found by search): the exam has three modules (Russian language, history of Russia, basics of legislation); the patent version is shorter (90 minutes) than the residence-permit version (135 minutes); one centre lists 4,900 roubles for the patent exam and 5,300 for the residence exam; fail one module and you can retake just that one for half price, fail two or more and you retake all modules at full price; a certificate is issued within about ten working days. **Not verified:** a single national price (centres set their own prices) and the exact pass marks, so the game uses 5,300 and a pass chance based on your knowledge.
- **Changed:** the exam scene now explains the three modules and the real price; the fee is 5,300 (was an invented 3,500); failing can mean "one module missed, retake at half price (2,650)" or "start over at full price"; failing the half-price retake sends you back to the full exam; you cannot sit it without the fee; the "guaranteed result" is still a scam that costs a strike. The scene is built from your state (it knows whether you are on a half-price retake).
- **Tests (rules.test.ts, +6):** scripted dice rolls check the description and price, a pass, the half-price retake path (cost 2,650, then the flag clears), the start-over path, a failed retake, no fee, and the scam. Older storyline tests that depend on the exam still pass. Suite: 134 passing; typecheck and build clean.
- **Exhaustive stress test (due this round): 3 of 3 pass.**
- **Balance re-checked** because the exam is on the migrant route and now costs more: careful bots reach citizenship 90-100% (Tajik 90, Uzbek 97, Kyrgyz 100, student 93), no deportations.
- **Not modelled:** the separate patent-level exam as a requirement for the patent (it is a real requirement; adding it would change the migrant route and was left out on purpose), and certificate expiry.

### Round 26 - the first year with a baby (14 scenes) and the childcare allowance
- **Verified** (search results, including [Izvestia on childcare benefits](https://iz.ru/en/node/1935079) and a children's-health overview): the first home visit by the clinic's patronage nurse is within three days of discharge; the monthly childcare allowance until the child is 1.5 years is 40% of the parent's average earnings and is paid to one parent; the national vaccination calendar gives hepatitis B at birth, BCG at 3-7 days and DTP at 3, 4.5 and 6 months, and stayed unchanged for 2026. **Not verified:** exact allowance amounts for a given salary, so the game uses a flat simplified +1,800 a week.
- **Added** (src/content/packs/infants.ts): the nurse's first visit, the 3-month vaccination, sleepless nights, the childcare allowance, the first smile, first solid foods, a stroller in the snow (winter months only), the first winter clothes (autumn and winter), nursery or nanny or grandparents, the first tooth, a grandmother's visit, first steps, the parents' chat, the playground. All appear only for players with a child. The allowance scene is for working citizens, once, and adds weekly income.
- **Tests (test/infants.test.ts, 5):** 14 scenes and none for childless players; seasonal scenes in December but not in June; the allowance (citizens with a job only, once, +1,800 weekly, not for migrants or the unemployed); the nurse and vaccination scenes mention the real schedule; all choices run. A first version of the test assumed 15 scenes; the pack has 14, so the test was corrected. Suite: all quick tests pass; typecheck and build clean.
- **Skipped:** the allowance does not end at 1.5 years in the game (children stay babies for the two game years); exhaustive test next due in round 28.

### Round 27 - student life pack (14 scenes)
- **Verified** (HSE "Pocket Dictionary" and other student-slang sources found by search): *avtomat* is a pass grade without taking the exam (usually for attending everything), *zachetka* is the gradebook, *zapara* is a stretch with a lot of deadlines. **Not confirmed in this session:** *kursovaya* (coursework), *khvost* (an exam debt), *propusk* (dormitory pass), *starosta* (group leader), *studsovet* (student council). They are standard words and the scenes explain them loosely, but they were not looked up.
- **Added** (src/content/packs/studentlife.ts): the gradebook, a pass without the exam, a week of deadlines, the pass at the dormitory door, the shared kitchen, quiet hours, coursework, a "tail" from a failed exam, electing a group leader, the student council, a work placement, scholarship day, choosing a thesis topic, and (foreign students only) the international office's migration-registration check, which can extend your registration by 5 days. All scenes are for admitted students and disappear if you are expelled.
- **Tests (test/studentlife.test.ts, 6):** 14 scenes and 13 for a citizen student; the registration check only for foreign students and it extends the registration; expelled students see none; hard work gives more knowledge than cramming but costs energy the other way round; the automatic pass lowers stress and adds reputation; all choices run. Suite: 145 passing; typecheck and build clean.
- **A process note:** I miscounted the number of scenes in a test three rounds in a row (they were corrected, not hidden). From now on counts in tests and in this report are taken from the file with grep first.
- **Skipped:** exhaustive test (next due in round 28).

### Round 28 - "One year in Russia": an anniversary summary scene
- **Why:** nothing marked the halfway point of the game. A summary is useful for a player and for a demo audience.
- **Added** (src/content/year.ts): on 1 September 2027 (day 365) a free scene (it takes no time) summarises your first year in plain language, built only from your state: goals reached out of the total, your status (citizen, naturalised citizen, VNZh, RVP, foreign student, EAEU worker, labour migrant), money and any debt, friends, partner and children, job, business and its profit, university average, your dog, the Patriot Award, legal strikes, achievements and what is still open on the first-month checklist. You choose how to mark the day: think it over with tea, celebrate with friends, or make a plan for the second year.
- **Tests (test/year.test.ts, 4):** it fires exactly once in a full two-year game, on day 365, for a citizen, a migrant and a student; the summary reflects the state (status, money, family, debt, strikes, dog, award); a citizen and a foreign student read differently; the scene is free, has three choices and all run. Counts were taken from the code first this time. Suite: 149 passing; typecheck and build clean.
- **Exhaustive stress test (due this round): 3 of 3 pass.**
- **No real-world facts were used** (pure game summary), so no web search was needed. The summary is in English only.

### Round 29 - "Know your rights": seven educational scenes that change the odds in police checks
- **Verified** ([HSE "Guide on Encounters with the Police" for international students](https://istudents.hse.ru/data/2019/10/15/1527055916/Guide%20on%20Encounters%20with%20the%20Police.pdf), [Sechenov university guide to document checks](https://welcome.sechenov.ru/en/your-guide-to-russia/document-verification), [MGUTU list of documents to carry](https://mgutm.ru/for-students/documents-you-must-always-have-with-you/)): foreign citizens should carry the original passport, migration card and registration slip; police may check documents when they have grounds and you may ask what the grounds are; you may ask for an interpreter; you may refuse to sign what you do not understand or agree with and refuse to give explanations; you may tell a family member or friend about a detention within three hours; a personal search is recorded and done with two witnesses. **Not used on purpose:** fine amounts and the 2024 law about police powers (not checked in detail; the game's fines remain approximate).
- **Added** (src/content/packs/rights.ts, 7 scenes): a leaflet from the university legal clinic (reading it sets "you know your rights", once), only a photo of the passport, "why are you asking?", a protocol in fast Russian, a paper to sign, detained for a few hours, a search of your bag. Informed choices avoid legal strikes and cost less; uninformed ones can cause strikes or fines.
- **Gameplay link:** after the leaflet, the polite "ask the officer's name, rank and reason, mention a lawyer or consulate" option in the 240 generic police scenes works 15 percentage points more often (45% to 60% at zero knowledge). Tested with a fixed dice roll.
- **Found by the test:** the three-hour rule was only in an outcome message; an educational scene should show the rule before the decision, so it is now in the scene text.
- **Tests (test/rights.test.ts, 6):** 7 scenes (counted from the file: 6 plus the leaflet), police group, foreigners only; the leaflet works once and a lazy reading does not count; informed vs uninformed outcomes (grounds, interpreter, signing); the dice-roll effect on the polite option; the text mentions original, interpreter, witnesses, three hours, refuse to sign, grounds; all choices run. Suite: 155 passing; typecheck and build clean.
- **Balance re-checked** (police checks changed): careful bots still 93-100% to citizenship, no deportations.
- **Disclaimer kept in the code:** this is a game summary of university guides, not legal advice. Skipped: exhaustive test (next due in round 31).

### Round 30 - the dacha (14 seasonal scenes)
- **Verified** (search results from several dacha-culture sources, for example [Peter's Food Adventures on the Russian dacha](https://petersfoodadventures.com/russian-dacha/)): the dacha season is May to September; a typical plot is about 600 square metres (six sotok); typical crops are potatoes, cucumbers, tomatoes, carrots, dill, berries; the banya is a dacha staple; the suburban train (elektrichka) fills up at weekends. **Left out on purpose:** a statistic about how much of Russia's produce is home-grown, because the only source was from 1999.
- **Added** (src/content/packs/dacha.ts, 14 scenes, counted from the file): opening the season, planting potatoes, the Friday elektrichka, a tour of "six sotok", the greenhouse, mosquitoes at dusk, the dacha banya, a fence dispute over apples, berries and jam, shashlik, harvest and pickling, closing the dacha in October, and two scenes for owners of a village house or inherited flat: a leaking roof and firewood for winter.
- **Tests (test/dacha.test.ts, 5):** the count; scene availability by real calendar month (nothing in January for non-owners; May, July, August and October scenes appear as intended; the season scenes vanish after October); the roof and firewood are for owners (bought a village house, or inherited a village flat); paying a carpenter costs money while fixing it yourself costs energy; all choices run. Suite: all quick tests pass; typecheck and build clean.
- **Skipped:** exhaustive test (next due in round 31); no balance run (no rules changed).

### Round 31 - accessibility audit (a bug-hunt for keyboard and screen-reader users)
- **Why:** all earlier tests checked game logic; none checked whether the interface can be used without a mouse or sight.
- **Method** (test/a11y.test.ts, jsdom): an automatic audit of the title screen, the game screen, the action grid, the online-services menu, **every one of the 13 online services at every step**, and the airline site. It checks that every button has a name, every input and select has a label, SVG and canvas elements are labelled, no id is used twice, the page has a language and a title.
- **Result:** the forms, the airline site and the main screens already passed (they were built with wrapped labels). **One real problem found:** the pop-up (guide, profile, journal) was a plain element, so a screen reader would not announce it as a dialog, and keyboard focus stayed behind it.
- **Fixed:** the pop-up is now a dialog (role, modal flag, a label that follows the language: Details / Подробности); when it opens keyboard focus moves to its Close button, and when it closes (button or Esc) focus returns to where it was.
- **Tests:** the audit (2 tests) and one behaviour test (focus moves in, returns on Escape, label changes with the language). Suite: 163 passing; typecheck and build clean.
- **Exhaustive stress test (due this round): 3 of 3 pass.**
- **Not covered:** an automatic check cannot judge colour contrast, reading order or how a real screen reader sounds. The game also relies on colour for some chips (green/amber/red), which always come with text. A human test with a screen reader would still be worthwhile.

### Round 32 - performance and size budgets
- **Measured first** (temporary test, then turned into guards): picking a scene takes about 0.55 ms on average (2,000 draws in about 1.1 s); a complete two-year save is about 28 KB (1,214 scenes seen, journal capped at 60 entries); the built script is 452 KB raw, **173 KB gzipped** (it was 145 KB a few rounds ago, so content has added about 28 KB).
- **Added guards** (test/perf.test.ts, 4 tests, about 2 s): average scene draw under 3 ms; a full two-year save under 120 KB and a journal never longer than 60; the built script under 250 KB gzipped (only checked when a build exists); the scenario count between 4,000 and 9,000 (a sudden jump or drop means something broke). The limits leave room for several times more content.
- **Result:** no problem found; the game is fast and light. **Honest limit:** the timings are from this machine in a test environment, not from a phone; a slow phone could be several times slower. The test thresholds are generous for that reason. A real device test is still advisable.
- Mistake caught on the way: the comment I first wrote in the test quoted the old size (145 KB); it now states the measured 173 KB.
- Suite: all quick tests pass; typecheck and build clean. Exhaustive test not due (next: round 34). No real-world facts used.

### Round 33 - researched rule: buying a SIM card as a foreigner (14th online service)
- **Verified** (several results found by search, for example [Van Rhijn Legal on the 2025 SIM rules](https://www.vanrhijnlegal.com/biometric-registration-russian-sim-card), [a university guide](https://ksuae.kgasu.ru/index.php/news/612-how-to-buy-a-sim-card-in-russia-as-a-foreign-visitor-starting-from-2025), [ALRUD](https://alrud.com/publications/67e54dc3def5a629e90528d0)): since 2025 foreigners who want a Russian SIM card need a notarised Russian translation of the passport, a SNILS number, a confirmed Gosuslugi account and biometric identification (in a bank or through the ruID app), the SIM must be bought in a physical operator shop, and foreigners may hold up to 10 SIM cards. **Caveats:** some of these sources are travel blogs and law-firm notes rather than official pages, and details differ between operators and change; the game presents this as a simplified model and says so on the form.
- **Added:** a new online service *Mobile identification* (documents checklist, biometric method, SMS code, costs the translation, about 2,500) that sets "identified". The existing SIM-card shop scene now sends a foreigner away until they are identified, and still lets them try again; citizens only need a passport, as before. Services are now 14.
- **Tests:** two new rules tests (a foreigner is turned away then succeeds after identifying; the service costs 2,500, unlocks the SIM, is not available to citizens or to the broke) and the older checklist test was **updated, not weakened** to follow the new rule (the foreigner must identify first). The generic form test covers 14 services. Suite: 170 passing; typecheck and build clean.
- **Balance re-checked** (the SIM is only on the checklist and an achievement, so no effect expected): careful bots 93-100% to citizenship, no deportations.
- **Skipped:** the 10-SIM limit is only mentioned in the form text, not enforced; exhaustive test next due in round 34.

### Round 34 - closing an open question from round 14: do unpaid fines really double?
- **Question left open in round 14:** "I did not find a source for the doubling after 60 days."
- **Verified now** (search results quoting [Part 1 of Article 20.25 of the Code of Administrative Offences](https://en.nbpublish.com/library_read_article.php?id=68782) and a [Federal Antimonopoly Service explainer, "What happens if fines are not paid?"](https://en.fas.gov.ru/press-center/news/detail.html?id=54364)): not paying an administrative fine within the legal period is punished by a fine of **twice the unpaid amount but not less than 1,000 roubles, or arrest for up to 15 days, or compulsory labour for up to 50 hours**. The early-payment discount (half within 20 days) is also described in a [law-firm alert](https://www.pgplaw.com/analytics-and-brochures/alerts/an-administrative-fine-can-be-reduced-in-2-times-if-you-pay-it-within-20-days/).
- **Fixed in the game:** the doubled amount now has the real **1,000-rouble minimum** (a 300-rouble fine becomes 1,000, not 600), and the enforcement scene tells the player that a court can instead choose up to 15 days of arrest or 50 hours of labour, while the game uses the doubled fine. The early discount has no minimum. Round 14's note that the doubling was unverified is hereby resolved.
- **Not modelled:** the arrest and labour alternatives, and the exact moment the 60 days start (the game counts from the notice).
- **Tests (fines.test.ts, now 7):** the 1,000 minimum for small fines, normal doubling for large ones, the unchanged early discount, and the scene text naming the real alternatives. Suite: 172 passing; typecheck and build clean.
- **Exhaustive stress test (due this round): 3 of 3 pass.**

### Round 35 - closing another open question: how long do Tajik and Uzbek citizens have to register?
- **Question left open in round 3:** one source said 15 days for Tajik and Uzbek citizens, others said 7, so the game kept 7.
- **Verified** ([RBC explainer on migration registration, 26 September 2025](https://www.rbc.ru/base/26/09/2025/68d265589a79479e3e20fa7e), plus several Russian legal and reference pages such as [Kontur](https://support.kontur.ru/fms/50589-sroki) that agree): the general period is 7 days; citizens of **Tajikistan and Uzbekistan have 15 days**; EAEU workers have 30 days; citizens of Armenia, Kazakhstan and Kyrgyzstan 30; Belarusians and highly qualified specialists 90. **Still disputed:** whether the 7 days are calendar days (RBC) or working days (other sources, and the law's wording as summarised earlier), and whether the clock starts at the border or at arrival at the address. The game keeps its wording loose ("the game simplifies how the days are counted").
- **Changed:** the Tajik and Uzbek characters now start with a 15-day registration clock (it was 7); the Tajik character card ("15 days to register", also in Russian), the migrant intro scene and the registration scene state the periods (7 for most, 15 for Tajik and Uzbek citizens, 30 for EAEU). Kyrgyz (EAEU) already had 30. The demo script was updated.
- **Tests:** an older test that expected 7 days was updated to 15; three new rules tests (starting clocks 15/15/30; the intro and registration scenes name the periods; the card promises 15 days). Suite: 175 passing; typecheck and build clean.
- **Balance re-checked** (this makes the first weeks slightly easier for two characters): careful bots reach citizenship 100% for Tajik and Uzbek; no deportations.
- **Note on the history of this report:** the round 3 table still says "left at 7"; this round supersedes it.
- Skipped: exhaustive test (next due in round 37).

### Round 36 - documentation accuracy, with a test that keeps it honest
- **Problem found by measuring the code** (scenarios 4,208; 14 online services; 13 storylines; 33 achievements; 37 cities; 55 jobs; 16 map places; 7 characters; 15 goals; 15 actions): the README had fallen behind. It said **11** online services (there are 14), **eight** recurring characters (there are 13), and "70 tests" (there are about 180). It also did not mention health insurance, the three registration periods, fines or mobile identification.
- **Fixed** the README to the measured numbers and replaced the test count with "about a minute" (a number that goes stale every round).
- **Added test/docs.test.ts (7 tests):** the README's numbers for online services, map places, achievements, cities, kinds of business and recurring characters must equal the numbers computed from the code; "Over N scenarios" must be true and not more than 50% below the real count; the demo script's "seven starting lives" must match; every `npm run X` mentioned in the README or the demo script must be a real script; every test file listed in the quick-test script must exist.
- **Checked that the guard can fail:** I deliberately changed the README to "13 online services" and "8 recurring characters"; the tests failed as intended and passed again after I restored the file.
- Suite: all quick tests pass; typecheck and build clean. No real-world facts used. Exhaustive test next due in round 37.

### Round 37 - difficulty levels (Easy, Normal, Realistic)
- **Added:** a difficulty selector on the title screen (translated into Russian) with three levels. **Easy:** 40% more starting money, police checks 40% less likely, living costs 20% lower, violations expire after 20 clean days. **Normal:** as before (violations expire after 30 days). **Realistic:** 30% less starting money, police checks 40% more likely, living costs 20% higher, violations expire after 45 days. The level is stored in the saved game and shown in the profile.
- **Old saves still work:** the save format moved to version 7; a version-6 save is upgraded to Normal difficulty when loaded, older ones are still refused (tested).
- **Tests (test/difficulty.test.ts, 7):** starting money per level (63,000 / 45,000 / 31,500 for the Tajik character); weekly living cost ordering with the Normal figure unchanged (2,200); violation expiry days for each level; police scenes drawn less often on Easy and more often on Realistic (3,000 draws each); migration of a version-6 save and refusal of version 5; a new save keeps its level; the page selector (three options, Russian text, starts with the chosen level: the Realistic Tajik character begins with 31,500). A type error in my first version of the test was fixed.
- **Balance, measured at each level** (docs/BALANCE.md, BALANCE-easy.md, BALANCE-hard.md; run `BALANCE_DIFF=hard npm run balance`): a **careful** player still reaches citizenship 90-100% on all three levels, so Realistic is hard but winnable. A **careless** player is separated clearly: the median number of days survived before deportation for the migrant characters is **162-315 on Easy, 64-89 on Normal, 46-77 on Realistic**. Honest reading: the levels mostly change how forgiving the game is of mistakes; they do not make careful play much harder.
- **A mistake I made and fixed:** my first attempt to make the balance test write to a different file for each level did not apply, so a Realistic run overwrote the normal report under a Normal title. I fixed the test, regenerated all three reports separately, and checked their titles.
- **Exhaustive stress test (due this round): 3 of 3 pass.** Suite: 189 passing; typecheck and build clean. README updated. No real-world facts used.

### Round 38 - dead-content audit: can every scene actually appear?
- **Question:** with 4,200+ scenes behind conditions (origin, city, month, weather, job, flags, story progress) is any scene impossible to see because of a mistake?
- **First audit** (states varied only a little): 1,751 scenes looked unreachable. Inspection showed they were all artifacts of the audit (it never varied the city, the job or the story progress). **Second audit:** 37 left; again all artifacts (weather types, a loan flag, a licence without a car, a specific profit level, immigration stages). Several of these are also proven reachable in real play, because the balance bots complete residence permit, VNZh and citizenship.
- **Added test/reachability.test.ts (1 test, about 3 s):** a state generator that explores every city and season, every job, every storyline step (with the previous steps done, for four origins and two knowledge levels), 25 special situations (merit levels, immigration stages, fines of different ages, patent suspension, family, banks, businesses, a pregnancy, expulsion, poor health, a booked flight) in four months and all five kinds of weather. The test fails if any scenario is never eligible. The only intentional exception is the "you have no business" scene, which is shown directly to non-owners.
- **Result:** **no dead content.** All scenes can appear in some realistic state.
- **Checked that the test can fail:** I injected a scene with an impossible condition into a temporary copy; the test failed naming it, and the file was deleted.
- **What this does not prove:** that a scene is *likely* to be seen, only that it *can* be. Suite: all quick tests pass; typecheck and build clean. Exhaustive test next due in round 40. No real-world facts used.

### Round 39 - researched fact fix: emergency hospital care is free for everyone
- **Verified** ([Sechenov University guide to emergency medical care](https://welcome.sechenov.ru/en/your-guide-to-russia/emergency-medical-care), [HSE emergency care page](https://ifaculty.hse.ru/emergency), [GW2RU: what should a foreigner do if sick in Russia](https://www.gw2ru.com/travel/234553-what-should-a-foreigner-do-if-he-gets-sick-in-russia)): emergency care, including the ambulance (103 or 112) and specialised emergency treatment, is free for everyone, including foreigners with no insurance, until the patient is out of immediate danger; further treatment is then paid, and planned care for foreigners is paid under a contract. **Not verified:** real prices of a paid stay; the game's 12,000 for the rest of a stay is an approximation.
- **The error in the game:** after an ambulance admission, an uninsured foreigner was charged 25,000 at the ward. That contradicted the rule above.
- **Fixed:** the ward now says emergency care is free for everyone and charges nothing; at discharge an uninsured foreigner chooses between *staying for paid treatment (12,000, full recovery)* and *leaving now with a prescription (no fee, smaller recovery, three days shorter)*. If they cannot pay, they are not robbed: they leave when stable and a debt of 12,000 is recorded (paid back at 2,000 a week). Citizens, residents and the insured see the old single option and a text saying their policy covers the stay.
- **Observation while testing:** rent and living costs keep being charged during days in hospital; that is intended, but my first test forgot it and was corrected to check the fee itself.
- **Tests (test/hospital.test.ts, 5):** the free emergency stage; covered patients' text and single option; the two options and the 12,000 fee; the debt instead of confiscation; the full chain from collapse to discharge for a citizen and a foreigner. Suite: 195 passing; typecheck and build clean.
- **Balance re-checked** (a hospital cost for uninsured migrants fell): careful bots still reach citizenship at the same high rates as before, with no deportations. Exhaustive test not due (next: round 40).

### Round 40 - researched fact fix: driving school and the licence exchange for foreigners
- **Verified** (search results including [auto.ru on training and exams in 2026](https://auto.ru/mag/article/obuchenie-i-sdacha-na-prava-v-2026-godu-novye-pravila-ekzameny-i-reytingi/), [Infullbroker's guide to the new 2026 rules](https://www.infullbroker.ru/articles/prava-2026-gid-po-novym-pravilam-obucheniya-v-avtoshkolakh/) and a car-rental blog): from 1 March 2026 category B training follows a new national programme (theory about 92 hours; the practical hours differ by transmission type); a course typically costs 30,000 to 80,000 roubles; the licence exam is first theory, then practical driving at the traffic police; a foreigner with a valid foreign licence can get a Russian one by passing the theory exam with a medical certificate, without going to a driving school. **Not verified:** the exact practical hours (the sources I found contradicted each other) and the exact fees.
- **Fixed:** the driving-school scene said "56 hours of driving", which I had written from memory and which the 2026 sources do not support. It now says "practical driving lessons (the national programme changed in March 2026)", gives the real price range, and describes the order of the exam.
- **Added:** a scene *Your licence from home* for foreigners without a Russian licence: theory exam plus medical certificate for 5,500 (simplified; the scene says to check current rules); success depends on knowledge; failure costs 2,500 and can be retried; it needs money and valid registration; once licensed, the car dealership opens as before.
- **Tests (test/driving.test.ts, 5):** the text no longer says 56 hours and describes theory and practical exams; the exchange scene is for foreigners only; pass and fail costs with scripted dice and retry after failure; money and registration requirements; the dealership opens after licensing. A dead condition I had left in the scene (a flag nothing set) was removed. Suite: 200 passing; typecheck and build clean; the reachability test confirms the new scene can appear.
- **Exhaustive stress test (due this round): 3 of 3 pass.**

### Round 41 - researched fact fix: marriage registration rules
- **Verified** ([ppt.ru on the marriage state fee](https://ppt.ru/amp/art/plateji/gosposhlina-za-registratsiyu-braka-razmer-i-poryadok-oplaty), [HSE guide to marriage registration for foreigners](https://ifaculty.hse.ru/en/marriage), [Translayte's overview](https://translayte.com/blog/marriage-in-russian-federation-for-united-states-citizens)): the state fee for registering a marriage is **350 roubles** (unchanged since 2015; a bill to abolish it was introduced in 2026 but the government did not support it); a marriage is registered **no earlier than one month and no later than 12 months after the application**, and the one-month wait may be waived for special reasons such as pregnancy or the birth of a child; a foreigner must provide a **legalised document confirming that they are free to marry** (a marital status certificate, valid for a limited time) with a **notarised Russian translation**. **Not verified:** the price of those documents (the game uses 4,000 in total), any change of fees for foreigners from 26 July 2026 (a headline I saw but did not read), and the cost of a solemn hall (the game's 5,000 is invented).
- **Fixed in the marriage form:** it now prints the one-month and 12-month rule; a foreign applicant must tick that they have the legalised certificate and its translation (and pays about 4,000 more, 4,350 in total); a pregnant applicant gets the extra option "on the day of the application", and the result message says the wait was waived; everyone else is told the date is at least a month away.
- **Tests (test/marriage.test.ts, 4):** the printed rule; a citizen sees no extra boxes and pays 350; a foreigner cannot submit without the boxes, pays 4,350, and is refused with a clear message when poor; the same-day option appears only for pregnancy. The generic form test (which ticks every box) still passes. Suite: 204 passing; typecheck and build clean.
- Skipped: exhaustive test (next due in round 43); no balance run (marriage does not affect the migrant route unless married to a citizen, which is unchanged in effect).

## Round 42 - Immigration state duties updated to the 2026 law

- **Verified (web search, several legal-news sites):** Federal Law of 26.06.2026 No. 190-FZ, in force from 26 July 2026: RVP duty 15,000 (was 1,920), residence permit (VNZh) 30,000 (was 6,000), citizenship 50,000 (was 4,200), invitation 8,000 (was 960). Exemptions exist for former USSR citizens, compatriot-programme participants and persons recognised as of interest to Russia.
- **Not verified / not modelled:** how EAEU citizens are treated, and whether the exemptions would cover the game's characters; the game charges everyone. The 4,200 patent-issue duty is not modelled.
- **Change:** new `FEE` constant in `src/engine.ts`; the RVP, VNZh and citizenship scenes (`src/content/core.ts`) and the migration online-service form (`src/flows.ts`) now charge 15,000 / 30,000 / 50,000 on filing (both outcomes) and refuse with a clear message when the player cannot pay.
- **Tests:** new `test/fees.test.ts` (4): constants, refusal when one rouble short, exact charge when affordable, for all three steps. Full suite: 205+ tests passing before/after (31 files plus the new one); typecheck and build clean.
- **Balance rerun (normal, 30 games per origin):** careful bots still become citizens 93-100% for the migrant and student origins, so the higher fees do not stall the ladder.
- Skipped: exhaustive test (due round 43); hard/easy balance reports not regenerated this round.

## Round 43 - Exhaustive test and balance regeneration (no new content)

- **Exhaustive test (every choice x 28 variants):** passed (3 tests, 73 s), including the new fee gates.
- **Balance reports regenerated** for hard and easy with the 2026 state duties (30 games per origin, cautious bot): citizenship reached 83-100% on hard and 97-100% on easy for migrant and student origins. Hard Tajik Migrant is the weakest (83% citizen, 7% hospital, 10% debt), which is plausible for hard mode; no tuning done.
- Not done: no new scenarios this round; fee exemptions for former USSR citizens still not modelled (unverified for the game's characters).

## Round 44 - Apartment block pack and a test-list fix

- **Added:** `src/content/packs/building.ts` (10 hand-written two-choice social scenes, ids `building-*`): intercom code and a courier, broken lift, residents' group chat, house meeting (spring/autumn), management company receipt, drilling neighbour, the bench by the entrance, a leak from above, clean-up day (April and October), a neighbour's parcel. Registered in `src/content/index.ts`. Only general features are used; exact quiet hours and fees are deliberately not stated (they differ by region), so no web check was needed.
- **Bug found:** the `npm test` script listed test files by name, so `test/fees.test.ts` (round 42) was never in the quick suite. Fixed by adding `fees.test.ts` and the new `building.test.ts` to the script.
- **Tests:** `test/building.test.ts` (2): 10 scenes, both choices return finite state and no large money loss; seasonal scenes appear in the right months.
- **Run:** `tsc --noEmit` clean; build clean; the new tests plus docs, reachability and perf tests pass (18 tests). The full `npm test` was run before the script edit (204 passing, without the two new files) and not re-run after it.
- Not done: scenario totals in README were not updated (docs test passes, so the README numbers are not exact-count claims it checks).

## Round 45 - UI overhaul (requested: better integration than Lagos Life)

- **Research:** a web search found only press coverage of Lagos Life (real-time day, Nepo/Lapo start, work-spend-energy loop), no interface details, so no layout was copied; the changes below follow general good practice for a stat-driven browser game.
- **Added (src/ui.ts, src/style.css, index.html):**
  - Sticky glass header with a money pill that flashes green/red when money changes.
  - A HUD under it with four always-visible condition bars (energy, health, stress, reputation): colour-coded by danger, smooth width transitions, a green/red flash and a floating +/- number when a value changes. On phones it is a 2x2 grid.
  - Scene cards now carry a category icon and accent colour (24 categories mapped, fallback for unknown ones), a rise-in animation, and choices that slide on hover.
  - Action buttons became icon tiles with shadows and hover lift; on phones the action dock sticks to the bottom of the screen.
  - Background gradients, gradient title, visible keyboard focus rings; all animations switch off under reduced-motion.
- **Tests:** new `test/hud.test.ts` (jsdom): four HUD bars with percentage widths, icon tiles, a category accent on a scene card, and a floating delta during play, with no error bar. Added to `npm test`. Result: tsc clean, 34 files / 211 tests passing, build clean (CSS 13.5 kB, JS 465 kB).
- **Not verified:** the Browser pane started the dev server but refused to navigate to localhost, so the new look was never seen in a real browser; only the DOM structure was tested in jsdom. Colours, spacing and the sticky behaviour on phones need a human look. Exhaustive test not run (due round 46).

## Round 46 - "Lately" strip on the idle screen, exhaustive test

- **Exhaustive test:** passed (3 tests). It ran while the UI edit below was being made, but it exercises only the engine and content, which that edit does not touch.
- **Added:** the "what now?" screen shows the last three journal entries under the prompt (EN "Lately" / RU "Недавно", entries truncated to 140 characters), so a returning player remembers what just happened. Code: `recentHtml()` in `src/ui.ts`, two i18n keys, a few CSS lines. Story texts stay English, as elsewhere.
- **Tests:** `test/hud.test.ts` extended to require the strip to appear during play. Full suite: 34 files / 211 tests passing; tsc and build clean.
- **Not verified:** still not seen in a real browser (the Browser pane refused localhost in round 45; not retried).

## Round 47 - Scams and digital safety pack

- **Added:** `src/content/packs/scams.ts`, 8 hand-written scenes (`scam-*`, category life), registered in `src/content/index.ts`: fake "bank security" call, fake courier link, a request for a Gosuslugi code, the "safe account" call, a buyer's link, a fake "director" in a messenger, a "number expires" call, an investment chat. Each has a trap choice (the better the player's knowledge, the higher the chance to see through it) and a safe choice that never costs money. Losses are capped at 60% of the player's money (minimum 300) so one bad call cannot end the game. Bank-related scams need a bank account; the fake director needs a job.
- **Verified:** no web check; the pack uses only widely repeated scam patterns and quotes no laws, limits or amounts. The in-game claim that banks never ask for SMS codes is a general public-warning message, not checked against a specific source this round.
- **Tests:** `test/scams.test.ts` (3): 8 scenes with a safe second choice; loss cap holds over 40 trials per scene; knowledge 100 loses clearly less often than knowledge 0 in the bank-call scene (400 trials each); bank scams are gated on having an account. Added to `npm test`. Result: tsc clean, 35 files / 214 tests passing, build clean.
- Skipped: exhaustive test (next due round 49); no balance rerun (the pack is rare and capped).

## Round 48 - Sport pack

- **Added:** `src/content/packs/sport.ts`, 10 hand-written two-choice scenes (`sport-*`, category life), registered in `src/content/index.ts`: the GTO badge, yard football (summer), hockey on a rink (Dec-Mar), cross-country skiing (Dec-Feb), a gym membership (needs spare money), chess in the courtyard, volleyball by the river (summer), morning exercises, the office match debate (needs a job), the public pool.
- **Verified (web search):** the GTO complex was revived by a presidential decree of 24 March 2014 and introduced from 1 September 2014; it has bronze, silver and gold badges and eleven age groups from six years up. The scene text says only that.
- **Not verified:** the claim that public pools ask for a medical certificate, a cap and slippers is common knowledge but I did not check a source; treat it as flavour.
- **Tests:** `test/sport.test.ts` (3): 10 scenes, two choices each, finite outcomes, cost at most 3,000; seasons gate the right scenes; the gym needs spare money. Added to `npm test`. tsc clean, 36 files / 217 tests passing, build clean.
- Skipped: exhaustive test (due round 49); no balance rerun.

## Round 49 - Exhaustive test; README states the 2026 duties

- **Exhaustive test:** passed (3 tests) with the scams, sport, building and fee changes included.
- **Fact/documentation fix:** the README did not mention the immigration state duties added in round 42. It now states RVP 15,000, VNZh 30,000 and citizenship 50,000 (law in force from 26 July 2026, verified in round 42), says exemptions are not modelled, and that filing needs the money.
- **Guard test:** `test/docs.test.ts` gained a test that the README contains every amount in `G.FEE`, so the README fails the suite if the game's fees change.
- **Run:** tsc clean; docs tests 8 passing; full quick suite and build re-run at the end of this round (see numbers below).
- **Result:** 36 files / 218 tests passing; build clean.

## Round 50 - Russian language in daily life pack

- **Added:** `src/content/packs/language.ts`, 10 hand-written two-choice social scenes (`lang-*`), registered in `src/content/index.ts`. Five are for everyone (patronymic address, "ty" or "vy", "How are you?", an unknown regional word, a taxi driver quoting Pushkin) and five are for foreigners only (reading Cyrillic signs, "bring a certificate and a certified copy", an accent, a hand-written Cyrillic form, a free language club).
- **Verified:** no web check; only general, well-known features of the language and office life are described, with no laws or amounts. The details of the clerk's wording are flavour.
- **Tests:** `test/language.test.ts` (2): 10 scenes, finite outcomes, costs at most 500; a citizen sees the five general scenes and none of the foreigner-only ones, a migrant sees all ten. Added to `npm test`. tsc clean, 37 files / 220 tests passing, build clean.
- Skipped: exhaustive test (next due round 52); no balance rerun.

## Round 51 - Patent price wording checked and softened

- **Researched:** Moscow patent price. Sources (snob.ru, ppt.ru, klerk-type news): in 2025 it was 8,900 a month; on 31 October 2025 a draft with regional coefficient 2.9323 was reviewed, which would raise it to about 10,000 for 2026, "proposed, not yet approved". Further searches (deflator 1.253 for 2026 federally) did not confirm that the Moscow increase was adopted.
- **Fix:** the game charged 10,000 and said "from 1 January 2026 it is 10,000". That was stated as settled fact. The patent scene text (`src/content/core.ts`) and the README now say 8,900 in 2025, an increase to about 10,000 proposed for 2026, the game uses 10,000, and the real rate should be checked. Game mechanics and numbers unchanged.
- **Run:** tsc clean; 37 files / 220 tests passing; build clean. No new tests (text only).
- **Open:** if a later round can find the adopted Moscow law (Mosgorduma, December 2025), update the wording to the confirmed figure.

## Round 52 - Moscow patent price confirmed; exhaustive test

- **Exhaustive test:** passed (3 tests).
- **Researched (closes the open item of round 51):** a Garant news article reports that the Moscow price rises from 8,900 to 10,000 rubles a month from 1 January 2026 (regional coefficient 2.9323, via the annual indexation mechanism); a Moscow-region law with the same coefficient was also found. I read only the news summary, not the text of the Moscow law itself.
- **Change:** the patent scene (`src/content/core.ts`) and README wording restored to a plain statement (8,900 in 2025, about 10,000 from 1 January 2026). Mechanics unchanged.
- **Run:** tsc clean; quick suite and build re-run (numbers below).
- **Result:** 37 files / 220 tests passing; build clean.

## Round 53 - Flat and utilities pack

- **Added:** `src/content/packs/flat.ts`, 10 hand-written two-choice scenes (`flat-*`, category home), registered in `src/content/index.ts`: heating switch-on (Sep-Oct), heating switch-off (Apr-May), planned summer hot-water shut-off (Jun-Aug), meter readings, the single payment receipt, viewing a flat, the deposit, the landlord's visit (these three only for renters), a cold flat in winter (Dec-Feb), a leak from the flat above.
- **Verified (web search):** under the utilities rules (Government Decree No. 354 of 6 May 2011) the heating period must start no later than the day after five days in a row below +8 C average daily temperature and may end after five days in a row above it; local authorities may start earlier. Press mentions discussion of changing the rule, so the scene says "under the rules in force when the game was written". Not verified: the planned summer hot-water shut-off and the "single payment document" are general knowledge, described without dates or numbers.
- **Tests:** `test/flat.test.ts` (3): 10 scenes, finite outcomes and cost at most 1,500; seasonal gating; renter-only scenes. Added to `npm test`. tsc clean, build clean; suite numbers in the next line.
- **Result:** 38 files / 223 tests passing. Skipped: exhaustive test (next due round 55); no balance rerun.

## Round 54 - Wages and payday pack

- **Added:** `src/content/packs/payday.ts`, 9 hand-written two-choice scenes (`pay-*`, category work, only for players with a job), registered in `src/content/index.ts`: advance and salary, payday on a weekend, the pay slip, an offer "in an envelope", a late salary, the labour inspection, holiday pay, a sick note, asking for a raise.
- **Verified (web search):** Article 136 of the Labour Code: wages are paid at least every half month on days set by internal rules or contract; the first half-month is paid from the 16th to the end of the current month, the second from the 1st to the 15th of the next; if payday falls on a day off it is paid the day before. The scenes use only that. Not verified: holiday pay "before it begins, from average earnings" and that sick pay is lower than wages are well-known general rules, stated without numbers; tax rates and delay-compensation formulas are deliberately not quoted.
- **Tests:** `test/payday.test.ts` (2): 9 scenes, two choices each, finite outcomes, cost at most 1,000; scenes appear only with a job. Added to `npm test`.
- **Result:** tsc clean; 39 files / 225 tests passing; build clean. Skipped: exhaustive test (due round 55); no balance rerun.

## Round 55 - Exhaustive test and balance check after the new packs (no new content)

- **Exhaustive test:** passed (3 tests) with the scams, sport, language, flat and payday packs in.
- **Balance rerun (normal, 30 games per origin, regenerated `docs/BALANCE.md`):** cautious bots: citizenship 97% Tajik, 100% Uzbek, 97% Kyrgyz (EAEU), 90% foreign student (with 7% ending in debt and 3% in hospital, the weakest origin); Moscow and Regional keep 100% survival. Random play: 80-93% deported for the foreign origins, 3-13% survive two years, so careless play is still punished. Median money of cautious migrants rose to about 1.1-1.3 million (from 0.7-0.8 million in round 42); the cause is not isolated (new wage and flat scenes add small gains, run-to-run noise on 30 games is large), so nothing was tuned.
- Not done: hard and easy balance reports not regenerated; no new scenarios this round.

## Round 56 - Long-distance train pack

- **Added:** `src/content/packs/rail.ts`, 9 hand-written two-choice scenes (`rail-*`, category life), registered in `src/content/index.ts`: platzkart or kupe (needs spare money), the carriage attendant, tea in a glass holder, platform sellers, the neighbour on the lower berth, time zones, being left on the platform (rare), a night in the carriage, arrival.
- **Verified (web search):** the Trans-Siberian line from Moscow to Vladivostok is about 9,300 km (sources give 9,288 or 9,289) and crosses many time zones (one source says eight); the full ride takes about a week. The scene says "about nine thousand three hundred kilometres" and does not name a number of zones. Not verified: the game ticket costs (2,500 / 5,500) are invented, not real prices, and the platzkart/kupe/attendant/platform-seller culture is general knowledge.
- **Tests:** `test/rail.test.ts` (3): 9 scenes, finite outcomes, costs up to 6,000; the platzkart/kupe scene needs money; the "left on the platform" scene is rarer than a calm one. Added to `npm test`.
- **Result:** tsc clean; 40 files / 228 tests passing; build clean. Skipped: exhaustive test (due round 58); no balance rerun.

## Round 57 - School and kindergarten pack

- **Added:** `src/content/packs/school.ts`, 9 hand-written two-choice scenes (`school-*`, category family, only for players with children), registered in `src/content/index.ts`: first-grade enrolment (Apr-Jun), the 1 September "Day of Knowledge" (September), the parents' chat, late homework, the parents' meeting, school clothes, the last bell (May), the kindergarten queue, a sick child.
- **Verified (web search, 2026 rules):** applications for children of a school's catchment area run from 1 April to 30 June, via Gosuslugi, registered post or in person; for other children from 6 July until places run out; the child must be at least 6 years 6 months and not older than 8 on 1 September. The scene says "in 2026" because these dates change from year to year and by region. Not verified: school uniform rules, the parents' chat and meeting customs and the kindergarten online queue are general knowledge, described without prices or rules.
- **Tests:** `test/school.test.ts` (3): 9 scenes, finite outcomes, costs up to 4,000; only parents see them; the seasonal scenes follow their months. Added to `npm test`. tsc clean; 41 files / 231 tests passing; build clean.
- Skipped: exhaustive test (due round 58); no balance rerun.

## Round 58 - Exhaustive test and hard/easy balance refresh (no new content)

- **Exhaustive test:** passed (3 tests) with all packs from rounds 44-57 in (building, scams, sport, language, flat, payday, rail, school).
- **Balance regenerated for hard and easy (30 games per origin, cautious bot):** hard: citizenship 93% Tajik, 93% Uzbek, 100% Kyrgyz, 87% foreign student (10% of students end in hospital, the weakest case); easy: 97-100% everywhere. These are in line with rounds 43 and 55, so no tuning.
- Not done: no new scenarios; the foreign student on hard remains the least safe route and is a candidate for a future look (student work-permit rules).

## Round 59 - Cold-weather nudge; looking into the student hospital endings

- **Investigated:** the foreign student on hard ends in hospital 10-13% of balanced-bot games. A cause found in the code: students start with clothing 35, and on every frost or snow day a player with clothing under 40 loses 3 health; the shop warning scene existed but was only drawn if the player happened to open the shop.
- **Added (`src/engine.ts`, `endDay`):** on a cold day with clothing under 40 the game now queues the existing `shop_winter_warning` scene, at most once every 25 days (mark `frostWarn`), so a player is told what to do instead of silently losing health. No new text; buying the winter set from that scene sets clothing to 70 when affordable.
- **Tests:** `test/frostwarn.test.ts` (3): the first cold day queues the warning, then not again for 3 days; a well-dressed player gets none; the warning scene's first choice raises clothing to at least 40. Added to `npm test`. tsc clean; 42 files / 234 tests passing; build clean.
- **Result on balance (hard, 30 games, regenerated `docs/BALANCE-hard.md`):** foreign student hospital endings were 13% (before: 10%), so the nudge did NOT fix the figure; within the noise of 30 games, no improvement is claimed. The balanced bot always takes choice 0 and may not be affected by the warning at all.
- **Diagnosis attempt:** a throwaway diagnostic (deleted) played students badly and showed that spamming the language test at stress 100 kills a character in about five days through the burnout rule (health -3/day at stress 90+). That is a bad-play pattern, not proof of the cause of the balance figure. Still open: find what actually drives the balanced bot's student hospital endings (stress management during the exam and quota phase is the leading suspect).

## Round 60 - Root cause of the student hospital endings found and fixed

- **Diagnosis:** a throwaway diagnostic (deleted) replayed the balance bot's own policy for the hard-difficulty foreign student and printed the last 14 events of every hospital ending. All six showed the same pattern: the bot kept choosing "Prepare properly and take the exam" in the language-exam scene without money for the fee; each refusal added +5 stress, stress sat at 90-100, and the burnout rule (health -3 per day at stress 90+) killed the character in about five days.
- **Fix (`src/content/core.ts`):** a refused exam (no money for the fee) now adds 1 stress instead of 5. Nothing else changed; an unaffordable fee is a refusal, not a punishment.
- **Test:** `test/examfee.test.ts` (1): refusal gives no money or flag change and at most 1 stress. Added to `npm test`. tsc clean; 43 files / 235 tests passing; build clean.
- **Result (hard balance regenerated, 30 games per origin, cautious bot):** foreign student hospital endings 13% -> 0%, citizenship 87% -> 100%. Tajik 90%, Uzbek 93%, Kyrgyz 100%; the 90-93% migrant rows are within noise of earlier runs.
- **Caveat:** a human can still spam an unaffordable action at high stress; the burnout rule is deliberate and the game does warn. Not changed.
- Skipped: exhaustive test (due round 61); the normal and easy balance reports were not regenerated.

## Round 61 - Exhaustive test; one rule for all "you cannot pay" refusals

- **Exhaustive test:** passed (3 tests) before the change below.
- **Audit:** a throwaway audit (deleted) played every scene's every choice with an empty wallet for a student, a migrant and a Muscovite and listed outcomes whose only effect is stress of 4 or more and whose message says the player lacks money. Dozens of scenes do this (patent payment, insurance, remittances, family help, lost-item scenes: 5-8 stress each). Round 60 showed that repeating one of these can burn a character out.
- **Change (`src/engine.ts`):** `softenRefusal` (called in `choose`) caps the stress of a plain refusal at `REFUSAL_STRESS` = 3. An outcome counts as a refusal only when its message matches "do not have / cannot afford / not enough / you need ..." and its only effect is stress. Outcomes with any other effect (a strike, money, a flag) are never touched, so real consequences such as the lawyer scene (+18 and more) are unchanged.
- **Tests:** `test/refusal.test.ts` (3): the cap; consequences, small stress, other messages and mixed effects stay the same; a broke player paying for a patent gets at most about 3 stress. Added to `npm test`. tsc clean; 44 files / 238 tests passing; build clean.
- **Balance (normal, regenerated):** cautious bots 97-100% citizens for migrants and students, 0% hospital endings; random play 90-97% deported for foreign origins, so careless play is still punished.
- **Not verified:** the exhaustive test was not re-run after the change; it is due in round 64 (rounds counted from 61). The change only reduces a stress value, but this is a stated gap.

## Round 62 - Data layer, hall of fame and database architecture (requested)

- **Request:** continue with features, design and database architecture. The game has no server, so "database" was handled in three parts: a clean local data layer (built), documentation of the full data model (written), and an optional cloud design (documented only; nothing was created, no account or paid service touched, no external call made).
- **Added:**
  - `src/store.ts`: the local data layer with a typed `RunRow` table and `recordRun / hallOfFame / clearHall` over a small `KV` interface (the real `localStorage` or a fake in tests). It caps the list at 20, sorts best first, sanitises every row (lengths, numbers, negative scores stored as 0), and treats corrupt, foreign-schema or blocked storage as empty without throwing. The interface is written so a cloud store can sit behind the same functions later.
  - Hall of fame on the title screen (best five finished games in this browser, with a Clear button; EN and RU text), and every finished game is recorded when the ending screen is shown (`src/ui.ts`, `index.html`, `src/i18n.ts`, small CSS).
  - `docs/DATABASE.md`: the content/local tables as they are today, plus a proposed PostgreSQL schema (`runs`, `saves`), row-level-security rules, the integration point and privacy notes for an optional cloud version. Explicitly marked as NOT built.
- **Tests (new, all in `npm test`):** `test/store.test.ts` (5: ordering, cap of 20 and the "kept" flag, corrupt/foreign/blocked storage, negative score, clear), `test/hall.test.ts` (title screen shows seeded runs best-first and Clear works), `test/hallrecord.test.ts` (plays a whole game through the page and checks the run was stored with name, ending and a score of at least 0). tsc clean; 47 files / 245 tests passing; build clean.
- **Found by a test:** the game's score can be negative (a run scored -148), which would break the planned database constraint; the store now clamps to 0.
- **Not verified:** the SQL in `docs/DATABASE.md` was never run on a database; it is a design. The hall of fame was not seen in a real browser (jsdom only).
- **Decision for the owner:** a real cloud leaderboard or cloud saves need a hosted database project, which is outside the repository and may cost money or collect player data. I did not create one. Say so if you want it built.
- Skipped: exhaustive test (due round 64); no balance rerun (the data layer does not touch game rules).

## Round 63 - Exhaustive test; lifetime totals

- **Exhaustive test:** passed (3 tests), run after the round-61 refusal cap and the round-62 data layer, closing the gap noted in round 61.
- **Added:** a `lifetime` table in `src/store.ts` (key `vrussia_lifetime`, schema 1): games played, games ending in citizenship, best score, total days and a count per ending. `recordRun` updates it on every finished game, so it counts runs that are too weak to enter the top-20 hall of fame; clearing the hall clears it too. The title screen shows one line under the hall of fame title (EN and RU: games, became citizens, best score). Corrupt or negative stored numbers are read as 0.
- **Docs:** `docs/DATABASE.md` lists the new table.
- **Tests:** `test/store.test.ts` grew by 2 (totals counted beyond the cap; corrupt data ignored and cleared together with the list); `test/hall.test.ts` also checks the totals line on the page. tsc clean; build clean; the quick suite result is in the next line.
- **Result:** 47 files / 247 tests passing. Skipped: balance rerun (rules untouched); next exhaustive test due round 66.

## Round 64 - Emergencies and first help pack

- **Added:** `src/content/packs/emergency.ts`, 8 hand-written two-choice scenes (`emerg-*`, category health), registered in `src/content/index.ts`: which number to call, calling with little Russian (non-citizens only), smoke in the stairwell, a smell of gas, someone collapsing in the metro, a slip on the ice, the pharmacy counter, a blackout. The first choice is always the sensible one (it gives equal or more knowledge and health than the second, which is the common mistake).
- **Verified (web search):** 112 is Russia's single emergency number, free from mobile and fixed phones; it does not replace 101 (fire), 102 (police), 103 (ambulance) and 104 (gas), which are free from a mobile (01-04 from an old landline). The advice not to use the lift in a fire and not to switch lights on when you smell gas is standard rescuer guidance, stated briefly; the first-aid scenes are general and are not medical advice.
- **Tests:** `test/emergency.test.ts` (3): 8 scenes with finite outcomes; the right choice never gives less knowledge or health in the five safety scenes; the operator scene is only for non-citizens. Added to `npm test`. tsc clean; build clean; suite numbers in the next line.
- **Result:** 48 files / 250 tests passing. Skipped: exhaustive test (next due round 66); no balance rerun.
