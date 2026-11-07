# Story texts in Russian

The interface is fully translated. The stories are not: **4286 of 4359 scenes (98.3%)** have a Russian version; the rest show in English.

How to add more: see the top of `src/scenes-ru-more.ts`. Run `RU_REPORT=1 npx vitest run test/ru-coverage.test.ts` to refresh this file.

| Category | Scenes | In Russian | Share |
|---|---|---|---|
| culture | 664 | 664 | 100% |
| life | 611 | 611 | 100% |
| work | 586 | 586 | 100% |
| home | 394 | 394 | 100% |
| food | 380 | 380 | 100% |
| social | 363 | 363 | 100% |
| edu | 282 | 282 | 100% |
| police | 249 | 249 | 100% |
| paper | 166 | 166 | 100% |
| shop | 158 | 158 | 100% |
| love | 111 | 111 | 100% |
| bank | 73 | 73 | 100% |
| pets | 72 | 72 | 100% |
| family | 70 | 70 | 100% |
| arc | 70 | 0 | 0% |
| health | 31 | 31 | 100% |
| cal | 27 | 24 | 89% |
| biz | 15 | 15 | 100% |
| family_decision | 13 | 13 | 100% |
| car | 12 | 12 | 100% |
| intro | 4 | 4 | 100% |
| hospital | 3 | 3 | 100% |
| estate | 2 | 2 | 100% |
| air | 2 | 2 | 100% |
| phone | 1 | 1 | 100% |

## How it was done and what is left

- 98.3% of the scenes are in Russian. The 73 left (`arc` storylines and three `cal` scenes) are **built from the player's state**, so their text and results differ in every game; a fixed Russian version would say things that did not happen. They need a translation of their building blocks (a change in the scene code), not of fixed text.
- The scenes made from templates (jobs, cities, dishes, quizzes, proverbs, universities and so on) are translated by the phrase list `docs/translate/dict.json` (about 6,200 phrases), the rule files `rules.cjs`, `rules-city.cjs` and the tables `dishes-ru.json`, `attrs-ru.json`, `prov-ru.json`, `ents-ru.json`. `node docs/translate/gen.cjs` writes `src/scenes-ru-gen-*.ts`.
- **The Russian was written by the assistant, not by a native editor.** Please have a Russian reader skim the phrase list. A result line that differs from game to game is left to the game's own (English) line on purpose; a test (`test/ru-coverage.test.ts`) refuses a Russian result line where the English one varies.
- Workflow for new scenes: `RU_FULL=1 RU_EXPORT=all npx vitest run test/ru-coverage.test.ts` (all scenes, `all-full.json`), `RU_EXPORT=all ...` (the ones still in English, `all.json`), `node docs/translate/_pieces.cjs all` (the phrases still missing, `todo.json`), translate them, add them with `node docs/translate/merge.cjs`, then `node docs/translate/gen.cjs`.
