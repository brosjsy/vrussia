## The learning rounds (round 124): what each play-test taught, and what was changed

| # | Run | What it showed | What was changed |
|---|---|---|---|
| 1 | 20 players, 100 days, every feature (seed 1) | No crash, no server error. The ice rink worked for nobody (winter only: correct). Online services and flight booking were never reached by any player; "send money" failed 48 times for want of a bank account. A text bug: "Needs 1 portions". | Grammar fixed. Submitting a website form and booking a flight moved out of the page into the game's rules (`submitFlow` in forms.ts, `book` in flights.ts) so every client plays by the same rules. |
| 2 | + all 14 online services, flights (seed 2) | Many forms failed: the bots filled a field whose default is empty with that empty default (a bot mistake). The other refusals were correct rules (no fines, no children, the June window). | The bots fill forms like a player. |
| 3 | (seed 3) | Every reachable form completes. University, kindergarten, fines, residency and marriage were still reached by nobody: the bots only used features in the first 100 days (September to December). | The bots keep using features for the whole two-year life. |
| 4 | (seed 4) | Every one of 96 features worked for at least one player. | — |
| 5 | + new daily chores (seed 5) | The new laundry, mobile plan, home internet and transport card were used by 19-20 of 20 players. | **Added** chores.ts and the phone's Daily life app (Быт). |
| 6 | (seed 6) | "Post an advert" was refused 68 times ("enough ads up") and "like a home" 94 times ("already voted"): the screen let players try without saying. The per-player table showed the new life instead of the finished one (a report bug). | The Online screen now says "3 adverts up, the most" and "you liked a home this week" before the player tries (two new server routes). Report fixed. |
| 7 | **Played by hand in a browser** against the real server | Sign-up, the e-mail link, log-in (the session cookie is invisible to the page), the Daily life app all work. Found: the password label said 8 characters (the server needs 10); "Wash at home" was greyed out without a reason; the game had TWO transport cards (an old shop scene and the new app); an e-mail link opened in a tab where the game was already running did nothing. | All four fixed; one card for the whole game; e-mail links work in an open tab too (checked again in the browser: the reset link opened the new-password form). |
| 8 | Full test suite + seed 8 | 793 tests, 111 files, all pass; play-test clean. | — |
| 9 | **40 players** (seed 9) | Clean at twice the players: no crash, no server error, no world problem. | — |
| 10 | A hostile player | Markup and a script typed into an advert and a chat line reach other players as plain text; nothing runs. Switching the screen's escaping off makes the test fail (the test really guards it). | New test kept in the suite. |

After round 10: a soak of 100 more runs with different seeds (docs/SOAK.md).
