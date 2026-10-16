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
| `phone` (inside `current_game`) | `State.ph` | 1 | `engine.phoneOf` and related | Optional part of the saved game: your phone number, chats per contact (30 messages each), recent calls (20) and the money history (40 rows). Old saves without it get a new one when the phone is first used. |
| `look`, `worn`, `inv`, `dream` (inside `current_game`) | `State.look` and others | 1 | `avatar.ts`, `shop.ts`, `dreams.ts` | The portrait choices, what you wear, what you own and your chosen dream. All optional; every read goes through `normalizeLook`, so a damaged save cannot break the drawing. |
| `dating` (inside the phone data) | `State.ph.dating` | 1 | `dating.ts` | The profiles you answered (like or pass) and your matches. |
| `lifetime` | `vrussia_lifetime` | 1 | `store.lifetime` (updated by `recordRun`) | Totals across every finished game: games, citizens, best score, total days, count per ending. Kept even for runs too weak for the hall of fame; cleared together with it. |
| `realmap_consent` | `vrussia_realmap_ok` | 1 | `realmap.ts` | Set to "yes" once the player has agreed to load the real map from the internet. Removing it makes the game ask again. |
| `ui_prefs` | `vrussia_lang`, `vrussia_help_seen` | few | `i18n.ts`, `ui.ts` | Language and "help shown once". |

`RunRow`: `id, name, origin, label, ending, score, days, citizen, diff, achievements, savedAt`. It holds plain data only, so it can be sent to a database as is.

Design rules for local data: every read is wrapped in try/catch; every write failure is ignored (private windows, full storage); a schema number guards every stored document so that future changes can migrate it.

## 3. Optional cloud design (NOT built, NOT created)

> **Update (round 110):** the online part has since been written and tested in the repository (still switched off, nothing created online). The real tables, rules and steps are in [BACKEND.md](BACKEND.md) and `supabase/migrations/0001_init.sql`; where the plan below differs, those files are right.

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

## 4. What a hosted platform would need (design notes, NOT built)

These notes come from looking at what the screens of an online life game *do* from the outside (round 86), not from any knowledge of how that game is actually built. The network traffic and private data of other products were deliberately not inspected. They are requirements for a possible online version of V Russia.

**What the screens imply**

| Visible behaviour | Needed on the server |
|---|---|
| Sign up, log in, "Continue" or "New life", "Signed in as @name", log out | accounts, sessions, a public `username` |
| A notice "loaded your latest saved game" | cloud saves per account (see `saves` above) |
| Players online counter, other players standing in the same place with name tags | presence per place (who is where, last seen) and a realtime channel per place |
| Chat with the players in a place; private chats; group chats | conversations, participants, messages |
| "Message requests" from people you have not chatted with; a bell with a count | a request state on first contact, notifications with read marks |
| An official channel with a vote | announcements and polls |
| A daily collectible with a global counter | a per-day token and a counter |
| Money, mood and needs in the top bar | part of the saved state, plus a server-side check so values cannot be edited |
| A sound switch, a saver mode for slow networks | client preferences only |

**Tables to add to section 3 if this is ever built** (all PostgreSQL, same style as above)

```sql
create table profiles (player_id uuid primary key, username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'), created_at timestamptz default now());
create table conversations (id uuid primary key default gen_random_uuid(), kind text check (kind in ('direct','group','official')), title text);
create table participants (conversation_id uuid references conversations, player_id uuid, state text check (state in ('active','request','blocked')) default 'active', last_read_at timestamptz, primary key (conversation_id, player_id));
create table messages (id bigserial primary key, conversation_id uuid references conversations, sender uuid, body text check (char_length(body) <= 280), created_at timestamptz default now());
create table notifications (id bigserial primary key, player_id uuid, kind text, body text, read_at timestamptz, created_at timestamptz default now());
create table presence (player_id uuid primary key, place text, seen_at timestamptz);
```

**Rules that must come with it:** row-level security so people read only their own conversations; a rate limit and a length limit on messages; block and report for every conversation; no storing of anything beyond the username and the saved game; an adult-friendly moderation plan for chat before any chat between real people is switched on; and the server, not the browser, deciding money and scores for any shared leaderboard.

**Not decided:** the hosting service, the cost, and whether real-player chat should exist at all. That is the owner's decision.

## 5. Network use (the only part of the game that is not offline)

If the owner switches the online part on (two build settings, see [BACKEND.md](BACKEND.md)), the page also talks to the owner's Supabase project: one visit count when it opens, and accounts, saves, scores, presence and chat for players who sign in. In a build without those settings none of this code makes a request.

Everything works offline except the optional real map. When the player agrees (a notice explains it), the game downloads the MapLibre library (a separate file of about 300 KB gzipped plus a 500 KB worker file) and then map tiles and the style from `https://tiles.openfreemap.org`. That service sees the player's internet address and the area of the map being looked at. Nothing else is sent: no name, no save and no game data. A failure to load (no network, blocked, no 3D support) closes the real map and brings back the offline map with a note.
