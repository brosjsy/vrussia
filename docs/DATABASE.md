# V Russia: data architecture

V Russia is a static site (Vite build served from GitHub Pages). There is **no server and no database today**. All data lives either in the code or in the player's browser. This page describes what exists, and the optional cloud design that can be added later without changing the game rules.

## 1. Content (read-only, shipped with the game)

| What | Where | Shape |
|---|---|---|
| Scenarios (4,000+) | `src/content/**` | `Scenario { id, cat, title, text, choices[], who?, req?, months?, w?, once? }`, registered with `S()` |
| Storylines | `src/content/arcs*.ts` | `addArc(...)`, steps with gaps and flags |
| Online services | `src/flows.ts`, `src/content/services.ts` | `Flow { id, steps[], finish(state, data) }` |
| Origins, jobs, cities, achievements, goals | `src/engine.ts` | typed constant arrays |
| Interface text | `src/i18n.ts` | EN and RU dictionaries |

Rule: content is code. It is type-checked, tested (reachability, exhaustive, balance) and never edited at run time.

## 2. Player data (local, in the browser)

All access goes through two modules: `src/engine.ts` (the current game) and `src/store.ts` (everything else).

| Table | Key | Rows | Module | Notes |
|---|---|---|---|---|
| `current_game` | `vrussia_save` | 1 | `engine.save/load/clear` | The whole `State` as JSON. `version: 7`; version 6 is migrated on load. Export and import as a file are in the title screen. |
| `runs` (hall of fame) | `vrussia_runs` | up to 20 | `store.recordRun/hallOfFame/clearHall` | One `RunRow` per finished game, best score first. Wrapped as `{ schema: 1, rows: [...] }`; corrupt, foreign or blocked storage is treated as empty and never throws. |
| `lifetime` | `vrussia_lifetime` | 1 | `store.lifetime` (updated by `recordRun`) | Totals across every finished game: games, citizens, best score, total days, count per ending. Kept even for runs too weak for the hall of fame; cleared together with it. |
| `ui_prefs` | `vrussia_lang`, `vrussia_help_seen` | few | `i18n.ts`, `ui.ts` | Language and "help shown once". |

`RunRow`: `id, name, origin, label, ending, score, days, citizen, diff, achievements, savedAt`. It holds plain data only, so it can be sent to a database as is.

Design rules for local data: every read is wrapped in try/catch; every write failure is ignored (private windows, full storage); a schema number guards every stored document so that future changes can migrate it.

## 3. Optional cloud design (NOT built, NOT created)

Nothing below exists. It is a plan for a future round, to be built only if the owner wants online features (cloud saves, a shared leaderboard). It needs an account and a project on a hosting service (for example Supabase) and a decision on privacy; none of that has been done or paid for.

### Tables (PostgreSQL)

```sql
-- one row per finished game; mirrors RunRow
create table runs (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null,              -- anonymous id generated in the browser, or auth.uid()
  name         text not null check (char_length(name) <= 20),
  origin       text not null,
  label        text not null,
  ending       text not null check (ending in ('time','hospital','deported','debt')),
  score        integer not null check (score between 0 and 1000000),
  days         integer not null check (days between 0 and 2000),
  citizen      boolean not null default false,
  diff         text not null check (diff in ('easy','normal','hard')),
  achievements integer not null default 0,
  game_version integer not null,           -- State.version at the time
  created_at   timestamptz not null default now()
);
create index runs_score_idx on runs (score desc, created_at desc);

-- one row per player and slot; the save file as JSON
create table saves (
  player_id  uuid not null,
  slot       smallint not null check (slot between 0 and 2),
  version    integer not null,
  state      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (player_id, slot)
);
```

### Security rules (Row Level Security)

- `runs`: anyone may `select` (public leaderboard); only the owner (`player_id = auth.uid()`) may `insert`; nobody may `update` or `delete`.
- `saves`: owner only, for every operation.
- Scores sent by a browser can be forged. A public leaderboard therefore needs either server-side validation (replaying the run) or an honest label "unverified". The plan is to start with "unverified" and cap values by the CHECK constraints above.

### Integration point

`src/store.ts` already isolates the data layer. A cloud version adds an optional `RemoteStore` with the same functions (`recordRun`, `hallOfFame`) and falls back to the local store when offline. The game rules in `engine.ts` stay untouched and the game must keep working with no network at all.

### Privacy

The game stores a name the player types. A cloud version must not collect anything else, must say so on the title screen, and must offer deletion of the player's rows.
