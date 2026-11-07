# How the code fits together

Read this first, then `docs/MODULES.md` (one line for every file) and the comment at the top of the file you want to change.

## The shape of it

```
index.html ── src/main.ts ── src/ui.ts (screens) ──► src/engine.ts (rules and state)
                                  │                          ▲
                                  │ lazy imports             │ S({...}) adds scenarios
                                  ▼                          │
        src/platform/*  (tutorial, privacy, reports,     src/content/*  (the stories)
        classes, daily game, packs, guide, sound)
                                  │ HTTP, only if VITE_API_URL is set
                                  ▼
                       server/  (Fastify + PostgreSQL)
```

- **The game is a plain TypeScript program with no framework.** `engine.ts` holds the state and the rules; `ui.ts` draws the state with the DOM and passes clicks back. Keep rules out of `ui.ts` and drawing out of `engine.ts`.
- **Everything works offline.** The server is optional: without `VITE_API_URL` no network call is made and the platform features keep their data in the browser (`localStorage`).
- **The first download is small on purpose** (under 262 KB gzipped, checked by `test/perf.test.ts`). Heavy things (3D, the phone, the real map, the platform features, the Russian texts) are loaded with `import('./...')` when the player opens them. Do not import them statically from `ui.ts` or `main.ts`.

## The state and the rules (`src/engine.ts`)

- `State` is one object that holds the whole game (day, money, papers, flags, the scenario queue, the log). It is saved as JSON, so it must stay plain data: no functions, no class instances.
- A **scenario** is a story card: `S({ id, cat, title, text, req?, w?, choices })`. `req(state)` says when it may appear, `w` is its weight in the random draw, each choice is `{ t, msg, fx }` (a fixed result) or `{ t, r: state => O(message, effects) }` (a computed result). Scenarios register themselves with `S()`; `index()` builds the lookup table.
- **Effects** (`fx`) change numbers and flags in one place (`apply`, section "effects"). Add a new effect there, never ad hoc in a scenario.
- **Time** moves in `advance()`: days pass, papers run out, fines grow, events are drawn.
- **Origins** (the starting characters) are the `origins` array. Adding one touches a few places: see "Add a character" in `CONTRIBUTING.md`.

## Where things live

| You want to change | Look at |
|---|---|
| A rule of the game (fees, deadlines, effects) | `src/engine.ts`, then the scenarios that mention it in `src/content/` |
| A story or a group of stories | `src/content/` (one file per theme; `content/packs/` for newer ones); register in `content/index.ts` |
| A screen or a button | `src/ui.ts` (main screens) or the `*-ui.ts` file of that feature |
| English or Russian interface text | `src/i18n.ts`; story text in Russian: `src/scenes-ru*.ts` and `docs/translate/` |
| Uzbek, Tajik, Kyrgyz | `src/platform/locale-data.ts`, `pf-text.ts`; review status: `locale-review.ts` |
| The 3D city | `src/world3d.ts` and its neighbours (`world3d-*.ts`, `osm.ts`, `realmap.ts`) |
| A legal source | `src/platform/citations.ts` |
| Server routes | `server/src/routes-*.ts`; the database: `server/migrations/*.sql` |

## Conventions

- **Header comment on every file**: what it is for, in one or two sentences (the module map is built from it). Explain *why*, not *what* the next line does.
- **Text for the player** goes through `t()` (interface) or the scene files (stories). Never put text from a player or a server into the page without `esc()`.
- **Money** is in roubles; amounts are game values, simplified from real life. A rule taken from a law must have its source in `citations.ts`.
- **Safety scenes** (police, law) are never changed by personalisation; keep it that way.
- **Privacy**: nothing is sent without consent; events contain no name, address or account.
- **Tests are part of the change.** A change that touches a rule, a scenario or a screen adds or updates a test in `test/`.
