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
