# Platform features (round 154)

Everything is under `src/platform/` (browser) and `server/src/routes-platform.ts` (server). The game calls it through one lazy-loaded module, so the first download stays under 262 KB gzipped. Tests: `test/platform*.test.ts`, `test/owasp-client.test.ts`, `test/ru-coverage.test.ts`, `server/test/platform.test.ts`, `server/test/owasp.test.ts`, `e2e/flows.spec.ts`.

| Feature | Where | Notes |
|---|---|---|
| Accounts and cloud saves | already there (`cloud*.ts`, `api-client.ts`, server auth) | Platform adds “download my account data” (`GET /api/account/export`) next to the existing delete |
| First-run tutorial | `onboarding.ts` | 7 steps, Esc skips, back, replay from More |
| Languages: Uzbek, Tajik, Kyrgyz | `locale.ts`, `locale-data.ts`, `pf-text.ts` | Interface only; falls back to Russian. **Not reviewed by native speakers**: see `docs/LOCALES.md` |
| Story texts in Russian | `scenes-ru.ts`, `scenes-ru-more.ts`, `scenes-ru-gen-*.ts`, `docs/translate/`, `test/ru-coverage.test.ts` | **4,286 of 4,359 scenes (98.3%) are in Russian.** The 73 left are storylines (`arc`) and calendar scenes that the game builds from the player's state, so a fixed translation would be wrong for them. Written by the assistant, not reviewed by a native editor; see `docs/RU_COVERAGE.md` |
| Accessibility | `a11y.ts`, `platform.css`, settings (already: colour-safe, less motion, text size) | Added: skip link, focus outlines, high contrast, Lite mode |
| Performance | `scripts/check-bundle.mjs`, `bundle-budget.json`, `lighthouserc.json`, `.github/workflows/quality.yml` | Lite mode keeps the flat map; Lighthouse was run by hand once (performance 92, accessibility 95, best practices 100, SEO 92); the CI job itself has not run on a server yet |
| Privacy and legal | `consent.ts`, `policy.ts` | Banner (no analytics until “yes”), policy, terms, download and erase. Set `VITE_CONTACT` to the operator's name and address: until then the pages say no operator is named. Have a lawyer read both before launch |
| Source citations | `citations.ts` | 14 laws with official portal links. **`verifiedOn` is null for all of them: a person must check each against the law and set the date with `node scripts/verify-source.mjs <id> --confirm "Name"`** (the screens say “not yet checked by a person” until then) |
| Learning report, checklist, PDF | `report.ts`, `platform-ui.ts` | Print or save as PDF from the browser's print dialog; no PDF library |
| Teacher and NGO mode | `classroom.ts`, server `/api/classes*` | Teacher needs an account; pupils use a code and nickname; CSV export; a task (character, difficulty, city, note) |
| Daily game, seasons | `daily.ts` | Same character and city for everyone each UTC day; local streak; five seasons. A per-day global board is not built: results also go to the normal leaderboard |
| Shareable card | `card.ts` | 1200×630 PNG drawn in the browser |
| Community packs | `packs.ts`, `docs/PACKS.md` | Validated JSON; bounded effects; no code |
| Analytics, error reports | `telemetry.ts`, server `/api/telemetry`, `/api/admin/stats` | Consent first; no IP, user agent or account; 90-day retention |
| Feature flags, admin | `telemetry.ts` (`Flags`), `/api/flags`, `/api/admin/*` | Admin = listed in the server setting `ADMIN_EMAILS`. There is no admin web page yet: use the API |
| Grounded guide | `guide.ts` | 19 vetted answers, search not generation; says “no answer” when nothing fits |
| Personalised scenarios | `personalise.ts` + `weightHook` in `engine.ts` | Learns on the device; never touches police or law scenarios; can be switched off |
| All CIS countries | `engine.ts` (origins), `prearrival.ts` (`ORIGIN_COUNTRY`), `flights.ts`, `content/packs/homeculture-cis.ts`, `docs/CIS.md` | 9 worker characters, one per CIS country except Russia; see `docs/CIS.md` |
| Sound and music | `audio.ts`, `src/sound.ts` | See `docs/UX_RESEARCH.md` |
| First-minutes helpers | `ftue.ts` | Next-step bar, one-time tips, win celebrations |
| RL balancing | `test/rl-balance.test.ts`, `docs/RL_BALANCE.md` | Q-learning agent; see the notes in the report |

## Settings

Browser build (`.env` or the build environment): `VITE_API_URL` (the game server; without it the game is fully offline and no platform call is made), `VITE_CONTACT` (operator name and address for the privacy page), `VITE_BUILD` (a version label sent with error reports).

Server: `ADMIN_EMAILS` (comma-separated confirmed addresses allowed to use `/api/admin/*`), plus the existing settings. Run the new migration `0010_platform.sql`.

## Commands

```bash
npm test                         # fast suite, includes the platform and OWASP client tests
npm run test:server              # server suite, includes the OWASP server tests
npm run build && npm run check:bundle
npm run e2e                      # real-browser tests (PW_CHANNEL=chrome to use installed Chrome)
RL_EPISODES=60 RL_REPORT=1 npx vitest run test/rl-balance.test.ts
RU_REPORT=1 npx vitest run test/ru-coverage.test.ts
```
