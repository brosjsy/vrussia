# Uzbek, Tajik and Kyrgyz interface

Texts: `src/platform/locale-data.ts` (menus, buttons, meters, difficulty names, about 35 keys) and the tutorial and main labels in `src/platform/pf-text.ts`. Everything else falls back to Russian, then English. Story texts follow the Russian game (which is itself mostly English, see `docs/RU_COVERAGE.md`).

**Status: written without a native-speaker review, and the language list says so** (`src/platform/locale-review.ts`; the notice disappears for a language only when a named reader and a date are set there). Uzbek is in Latin script (oʻ and gʻ with the modifier letter), Tajik and Kyrgyz in Cyrillic. Please have one native reader per language check the tutorial and the privacy-related labels before a public launch, and fix them in place; the tests only check that keys exist, differ from English and are in the right script.

Choosing a language reloads the page. A browser whose language is `uz`, `tg` or `ky` gets that language the first time, and the choice is kept under `vrussia_locale`.

## How a native reader reviews

1. `LOCALE_EXPORT=1 npx vitest run test/locale-review.test.ts` writes `docs/translate/locale-review.csv` (English, Russian and the three languages side by side; columns for the verdict, the correction and the reviewer).
2. The reader fills the sheet; corrections go into `locale-data.ts` (interface) and `pf-text.ts` (platform texts).
3. Set the language in `REVIEWED` with the reader's name and the date. Never before a person has read it.

## Fourteen more languages

Kazakh, Ukrainian, Azerbaijani, Armenian, Georgian, Turkish, Chinese, Hindi, Arabic (right to left), Vietnamese, Spanish, French, German and Portuguese live in `src/platform/locale-more.ts`: the menus, meters, difficulty names, tutorial and privacy banner (38 interface keys and 27 platform keys each). Texts not translated show in Russian for the post-Soviet languages (uz, tg, ky, kk, uk, az, hy, ka) and in English for the others. The browser language picks the language the first time. None of them has been read by a native speaker: they are all listed as unreviewed. To add a language, add its id to `Locale` and `LOCALES` in `locale.ts`, and its two lists to `locale-more.ts`; the tests check every key.
