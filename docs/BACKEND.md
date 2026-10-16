# The online part (backend)

**State: written and tested in this repository, switched off, and never run against a real server.** Nothing has been created online. Until the owner does the steps below, the game is exactly as offline as before: the Online button opens a screen that says there is no online part, and no request is made.

## What it does

| Part | For the player | On the server |
|---|---|---|
| Accounts | Sign up with e-mail and password, choose a public name | Supabase Auth; `profiles` |
| Cloud save | "Save to the server" / "Load from the server", one game per account | `saves` (only the owner of a row can read or write it) |
| Leaderboard | Finished lives, best first | `scores`, written only by `submit_score()` |
| Who is online | A count of players seen in the last 3 minutes | `presence`, written only by `heartbeat()` |
| Chat | A room for each place of each city; adults only; report and block | `messages`, `blocks`, `reports`; written only by `send_message()` |
| News | Announcements and the number of visits | `announcements`, `counters` |
| Players' adverts | Put up an advert in your city; write to its owner; report it | `ads`, `ad_reports`, written only by `post_ad()` and `report_ad()` |
| Private talks | Open a talk with one player from chat or an advert; a list of your talks | `messages` (rooms `direct:...`), `my_talks()` |
| Following | (server and client only, no screen yet) | `follows` |
| Delete account | "Delete my account", two presses | `delete_my_account()` |
| Friends | Find players by name, follow them (friends when it is mutual), see who is online and where | `follows`, `my_friends()` |
| Visiting homes | Visit a friend's home (a plan of their furniture), leave a note and a gift in the guest book, like one home a week | `homes`, `guestbook`, `home_votes`, `publish_home()`, `sign_guestbook()`, `vote_home()`, `best_homes()` |
| Language filter | Bad words are refused in chat, notes and adverts | `is_rude()` and three triggers |
| Automatic save | The save goes up every 30 seconds when it changed, when the tab is hidden, and when the connection comes back | `saves` (src/cloud-sync.ts) |
| Votes | One real vote a week per city (the client code exists; the game does not use it yet) | `votes`, `cast_vote()`, `vote_tally()` |

## Files

- `supabase/migrations/0001_init.sql`: the first tables, security rules and functions.
- `supabase/migrations/0002_community.sql`: adverts, following, private talks, hiding reported messages and adverts, the daily message cap, account deletion, the clean-up job. Apply it after the first.
- `src/cloud.ts`: the client. Plain `fetch` to the Supabase REST and Auth addresses; no extra library.
- `src/cloud-ui.ts`: the Online screen.
- `test/backend.test.ts`: runs the migration in a real PostgreSQL inside the test (PGlite) and checks the rules as different players.
- `test/cloud.test.ts`, `test/cloud-ui.test.ts`: the client and the screen against a stand-in server.

## Switching it on (the owner does this; about 15 minutes)

1. In the Supabase dashboard create a **new** project for this game. Do not reuse a project that belongs to another app.
2. Open **SQL Editor**, paste the whole of `supabase/migrations/0001_init.sql`, run it once. Then do the same with `supabase/migrations/0002_community.sql` and then `supabase/migrations/0003_homes_and_friends.sql`.
3. **Authentication → Providers → Email**: keep "Confirm email" on. **Authentication → URL Configuration**: set the Site URL to the address of the game.
4. **Project Settings → API**: copy the Project URL and the `anon` (publishable) key.
5. Copy `.env.example` to `.env` and fill in the two values. Build and deploy as usual (`npm run build`). On a host such as Vercel or Netlify, set the same two names as environment variables instead.
6. Open the game, press **Online**, make an account, save, finish a life, and look at the tables in the dashboard.

The `anon` key is meant to be public: it is in the page that every visitor downloads. All protection is in the security rules. **Never put the `service_role` key in `.env`, in the code or in the site.**

## What protects what

- Row level security is on for every table. A test fails if a table is added without it.
- Scores, messages, presence, votes and profiles have **no insert rule**: they are written only through functions that check the caller on the server. A changed copy of the game cannot write rows directly.
- `submit_score`: signed in, has a profile, at most 10 a day, and the score cannot be larger than a life of that many days could earn. **This stops absurd numbers, not a careful cheat**: the game runs in the browser, so a score is always a claim.
- `send_message`: signed in, said they are 18 or older, 1 to 280 characters, at most 6 messages in 30 seconds, a valid room, and not blocked by the other person in a private talk.
- A saved game can be read and written only by its owner and is limited to about 400 KB.

## Before opening chat to the public

Chat between real people needs a person who looks after it. The code gives the tools, not the moderation:

- A message or an advert that three different players report is hidden automatically. That stops the worst quickly, but three friends can also hide something harmless: somebody still has to look.
- Run `select * from public.cleanup();` once a day (for example with the `pg_cron` extension): it removes presence older than a day, messages older than 30 days and adverts a week past their end.
- Reports go to the `reports` table. Nobody but the owner can read it (in the dashboard). **Somebody has to read it.**
- There is no word filter and no automatic ban. A player can delete their own account from the game; to remove somebody else's message or account, use the dashboard.
- The "I am 18 or older" box is a statement by the player, not a check.
- If nobody can moderate yet, leave chat out: run `revoke execute on function public.send_message(text, text) from authenticated;` and the chat tab will only show an error when somebody tries to send.

## Privacy (say this on the site before switching on)

The server stores: the e-mail address and a hash of the password (Supabase Auth), the public name, the saved game, finished scores, the last place and time seen (kept visible for 3 minutes), chat messages, blocks, reports and votes. Other players see only the public name, scores, the place in presence and chat messages. The browser keeps the session tokens under `vrussia_session`; the password is never stored by the game. With the online part on, the page also adds one to a visit counter when it opens (no cookie, no identifier). Depending on where the players live, the owner may need a privacy notice and a way to delete an account on request (deleting the user in the dashboard removes all their rows).

## Honest limits

- Never run against a real Supabase project. The SQL is tested on PostgreSQL through PGlite with a stand-in for the `auth` schema; the client is tested against a stand-in server. The first real run may show differences (for example in e-mail confirmation or error texts).
- Chat is fetched every 8 seconds while the tab is open; it is not live.
- Old rows are cleaned only if the owner schedules `cleanup()`.
- `delete_my_account()` deletes the row in `auth.users`; this was tested on a stand-in for that table, not on Supabase's real one.
- Adverts between players are words only: nothing is bought or paid through the server.
- The cloud save is manual (two buttons); there is no automatic sync and no merge: the last save wins.
- The weekly election in the game still uses invented voters; real votes are not wired in.
- Passwords cannot be reset from inside the game yet.
