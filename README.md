# V Russia — Life Simulator

A free, browser-based life sim (inspired by *Lagos Life*) set in Russia. Pick a life, then survive two years
(730 days) of bureaucracy, work, study, police checks, rent day and holidays.

## Play

Open `index.html` in any browser. No build step, no dependencies. Progress autosaves to `localStorage`.

## Characters

| Origin | Status | Key challenge |
|---|---|---|
| Moscow Baby | citizen | money, boredom, "dad knows a guy" |
| Regional Kid | citizen | budget place at university |
| Tajik / Uzbek Migrant | migrant | registration → medical → patent → work |
| Kyrgyz (EAEU) Worker | EAEU | no patent, but registration still counts |
| Foreign Student | student | visa extensions, work permission, dorm |

## Systems

- 3 time slots per day, 7 actions (work, eat, go out, paperwork, study, home, call family)
- Stats: energy, health, stress, reputation, knowledge, money
- Document clocks: registration, patent, visa — expiry makes police/inspection events far harsher
- 3 legal strikes = deportation (foreigners). Health 0, debt below −₽30,000 also end the game
- Goals: university admission, ₽500k, language test → RVP → citizenship, zero strikes
- Calendar events: Sept 1, New Year, Navruz, Victory Day, ЕГЭ (June 20), admission lists (July 25)...

## Life systems (v2)

- **Immigration ladder:** registration → medical → patent → language test → RVP ground (quota / marriage to a citizen / Russian child) → RVP → VNZh → citizenship
- **Banking:** Sber, VTB, T-Bank accounts, card blocks, SBP, microloans, remittance corridors (Tajikistan, Uzbekistan, Kyrgyzstan, Nigeria...)
- **Map:** 🗺️ Travel action with a city map; snow, frost and rain make you lose your way; maps app vs. asking locals vs. taxi
- **Weather & clothing:** underdressed in frost costs health; shops sell coats, boots, ushanka...
- **People:** dating, partner, ZAGS wedding, pregnancy, birth, kindergarten queue; parents, siblings, friends
- **Health:** polyclinic vs. private; voluntary insurance for foreigners
- Starting city picker (12 cities) and 6+ origins incl. Dagestani student

## Scenarios (1,700+)

About 50 hand-written set pieces (`js/content-core.js`) plus template families in `js/content-generated.js`:

| Family | Count |
|---|---|
| Police / raids (30 places × 8 situations) | 240 |
| Work incidents (25 jobs × 9) | 225 |
| University admission (20 universities × 8) | 160 |
| Food (20 dishes × 8) | 160 |
| Paperwork (15 documents × 8) | 120 |
| Housing (12 cities × 9 + moves) | 120 |
| Social (12 people × 8) | 96 |
| ЕГЭ prep (11 subjects × 6) | 66 |
| Family (6 relatives × 8) | 48 |

Add more by pushing to `RU.scenarios` with `RU.S({id, cat, who, req, title, text, choices})`.

## Test

```
node test/simulate.js
```
Plays 1,200 random games headlessly and checks for crashes, duplicate IDs and out-of-range stats.

## Disclaimer

Fiction and satire for a project demo. Rules, prices and procedures are simplified approximations and are **not legal advice**.
