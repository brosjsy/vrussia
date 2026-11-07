# What the ML engineers can do in this repository

Who sets the assignment (the teacher, the client or the team lead) decides the exact task. This page only says what the repository offers, so that the question to that person can be precise.

## Short answer

"Finish the bots" is **one possible** task, not the only one. Today there are no trained models in the game. Everything that looks like intelligence is written by hand (rules and chance). The ML work is to replace or add to these parts with learned ones, and to measure that it is better.

## What "bots" mean here

| Where | What it is | How it works now |
|---|---|---|
| `test/balance.test.ts`, `npm run balance` | Bot players that play whole games, write `docs/BALANCE.md` | Hand-written strategies plus dice |
| `test/players20.test.ts`, `npm run playtest`, `scripts/playtest50.mjs` | 20 to 50 bot "players" with different styles that use every part of the game | Random choices with a style (`STYLES`) |
| `dev/playtest/` | Saved results of those runs | JSON files |
| `src/dating.ts` | Characters in the meeting app and their replies | Rules and fixed phrases |
| `src/platform/telemetry.ts` | Events the game can report | Counters, no model |

## Tasks that fit an ML engineer (pick with the team)

1. **A better playtest bot** (the most direct reading of "finish the bots"). Make the bot choose actions from the game state (`G.State` in `src/engine.ts`) with imitation learning or reinforcement learning, where the reward is the game's own score (`G.score`). Goal: find dead ends, impossible scenes and exploits faster than random bots do. Success measure: more distinct scenes reached and more bugs found per 1,000 games. Start from `test/players20.test.ts`.
2. **Difficulty and balance tuning.** The balance runs show how many players reach each ending. A model (or a plain optimiser) can tune money and cost numbers so that the three difficulty levels give the wanted win rates. Data: `docs/BALANCE.md` and the `BALANCE_DIFF` runs.
3. **Smarter characters.** Replace fixed replies in the dating app and in scenes with a small language model, with a safety filter (no politics, no content that Russian law forbids, no real people). It must work offline or through the server in `server/`.
4. **A recommender for "what next".** The game now shows the next checklist step (`src/nextstep.ts`). A model can rank the steps for a particular player from their state and past choices.
5. **Quality checks on text.** A classifier that finds scenes with wrong or banned content, or Russian lines that are still in English (see `test/hygiene.test.ts` for the rules written by hand today).

## What they need to start

- The repository (they have access) and Node 20+: `npm install`, then `npm run local` to play and `npm test` to check.
- The state and the scenes: `src/engine.ts`, `src/content/`, `src/scenes-ru-*.ts`.
- The existing bot code and its output files listed above.
- A written definition of "better" from the person who gave the task (which number should go up).

## Rules for any model that goes into the game

- It must not break the tests (`npm test`) or the size budgets (`test/perf.test.ts`): big model files are loaded on demand, never in the first download.
- No personal data in the training data. The playtest files contain only invented players.
- Content for Russia must follow Russian law (for example, no same-sex relationships and no forbidden topics); a model that writes text needs a filter and tests for that.

## More tasks for learning and a strong portfolio

The same list is in [ML_TASKS.xlsx](ML_TASKS.xlsx), where each task has an owner, a status and notes to fill in.

**Starter tasks (weeks 1 to 2)**
1. Play the game for 30 minutes and write 10 observations, as the first tester did.
2. Run `npm run balance` and `npm run playtest`, then write a one-page summary: rare endings, places where players get stuck.
3. Make a dashboard of the bot results (`docs/BALANCE.md`, `dev/playtest/`): money over days, ending rates.

**Data and analysis**
4. Group the bot players by behaviour (rich, broke, studious, law-breaking) and describe each group.
5. Find the hardest days or scenes (most health or money lost) and suggest fixes.
6. Plan what the game should record about players (`src/platform/telemetry.ts`), with no personal data.

**Model building**
7. Predict the ending from the first 10 days (a good first real ML project).
8. Imitation bot: copy the choices of good players.
9. Reinforcement learning bot: maximise the game score (needs a clear reward).
10. Choice recommender: suggest the best action for the current state, feeding the Next step card (`src/nextstep.ts`).

**Language (Russian and English)**
11. A script that finds English text still shown in Russian mode.
12. Safe text generation with a filter for banned topics and Russian law.
13. Dialogue quality tests: polite, on topic, legal.

**Engineering habits**
14. Write tests for every model.
15. Respect the size limits: load models on demand (`test/perf.test.ts`).
16. Review each other's code in pull requests.
17. Write a short report for each task: what was tried, what worked, one number that proves it.

**Suggested plan:** weeks 1 to 3 tasks 1 to 7; weeks 4 to 6 tasks 8 to 10 with the habits from 14 to 17.
