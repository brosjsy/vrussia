# V Russia: a plan of 150 features

**Read this first.** The owner asked for 150 new features, researched, designed, coded and reported. This file is the research, the design and the full list of 150. **36 of the 150 are built and tested in this round (marked BUILT). The other 114 are designed here but not built (marked NEXT or LATER).** Nothing in this file is claimed as working unless it is marked BUILT, and the BUILT ones name the test that checks them. Building all 150 properly is many rounds of work; doing it in one go would mean untested code, which this project does not ship.

## 1. What the research says

Sources are at the end. They are mostly press articles and blogs, not measured data, so they are used as hints, not proof.

- **Why people stay in a life simulator** (writing about BitLife): a different start every time, open choices, surprises, many careers, several endings, family and relationships, easy to start and deep later. What drives people away: heavy adverts, paying to reach the core of the game, crashes that lose progress. *For us:* keep the game free of real adverts and payments, keep saves safe (local save, export file, cloud save), and add depth in careers, family and endings.
- **Where social life games are going** (EA's Project Rene, The Sims Labs "Life Together", Palia, indie titles): play with friends in the same town, share a home with roommates, housing as a reward for progress, calm low-pressure play. *For us:* real players in the same city, friends, visiting homes, shared flats.
- **The Lagos game the owner compares with** (press coverage): a browser link with no install, real players at the same time, real named places of the city, a rich or poor start, messages between players (including players asking each other for money), and an exploit in which hacked accounts gave themselves huge balances, after which the team wiped the fake money and announced income tax. *For us:* this confirms the rule already used in the backend: anything that matters (scores, messages, later money between players) is checked on the server, never trusted from the browser. It is also why **sending money between players is in the LATER group**: it needs the economy to run on the server first.
- **Seen directly earlier in this project** (the owner's signed-in screens, layout ideas only): need meters, a buy catalogue, careers with skill locks, elections, activity cards on objects, map layers, a continuous clock.

## 2. Design rules for everything below

1. Opt-in and additive: a new feature never changes the numbers of a game that does not use it (the balance bots do not use them).
2. Offline first: the game works with no server. Online features appear only when the owner switches the backend on.
3. Checked on the server: anything shared between players is written through a function that checks it.
4. Small files on demand: a feature the player has not opened is not downloaded (the main script has a 250 KB budget).
5. Tested before it is called done; honest limits written down.

## 3. The 150 features

Status: **BUILT** = coded and tested this round. **NEXT** = designed, small enough for the next few rounds. **LATER** = needs something bigger first (named in the line).

### A. Streets, traffic and movement (24)

| # | Feature | Status |
|---|---|---|
| 1 | One street network: a roundabout round the home block with streets going out from it | BUILT (`street.test.ts`) |
| 2 | Streets branch and bend round buildings; none passes under a place | BUILT |
| 3 | Two car lanes, driving on the right | BUILT |
| 4 | A cycle strip beside each lane | BUILT |
| 5 | A pavement on each side of every street | BUILT |
| 6 | Zebra crossings where streets meet the roundabout and at the home door | BUILT (drawn; seen in the page) |
| 7 | Cars keep a gap and slow down smoothly behind the car in front | BUILT |
| 8 | Giving way at junctions; the roundabout has priority and is never packed full | BUILT |
| 9 | At the end of a street a vehicle stops a moment and turns back | BUILT |
| 10 | Bicycles with riders who pedal | BUILT (logic tested; rider pose only seen from far) |
| 11 | A car model with wheels, lights, bumpers and a cabin | BUILT (seen in the page) |
| 12 | Vehicles glide through turns and lane changes instead of jumping | BUILT |
| 13 | People walk on the pavements and keep to the right-hand side | BUILT |
| 14 | People move out of each other's way and never stand inside each other | BUILT |
| 15 | Two people walking head-on each step to their own right | BUILT |
| 16 | Few cyclists in snow and frost | BUILT |
| 17 | Houses, parks and notice boards are placed clear of the streets | BUILT (`city-geo.test.ts`) |
| 18 | Traffic lights at the larger junctions | NEXT |
| 19 | Buses on fixed routes with stops; the player can ride one | NEXT |
| 20 | Trams in the cities that have them | NEXT |
| 21 | Parked cars along the streets and in yards | NEXT |
| 22 | The player's own car and bicycle shown and used in the 3D city | NEXT |
| 23 | Taxis that can be hailed in the street | NEXT |
| 24 | Street lamps that light up in the evening | NEXT |

### B. Adverts and the local economy (20)

| # | Feature | Status |
|---|---|---|
| 25 | A daily adverts board: eight small ads in five kinds | BUILT (`ads.test.ts`) |
| 26 | Answering a "day of work" ad: paid in cash, costs energy | BUILT |
| 27 | Buying second-hand things from ads | BUILT |
| 28 | Services from ads: lessons, help with documents, massage, repair | BUILT |
| 29 | Room viewings from ads | BUILT |
| 30 | Lost and found ads | BUILT |
| 31 | Putting up your own ad (sell, look for work, offer help, look for a room) for a fee, with limits | BUILT |
| 32 | Replies to your ad arrive over the next days; accept or decline | BUILT |
| 33 | The board screen in English and Russian, opened from the pin button | BUILT (tested; not looked at in the page) |
| 34 | Ads shown on the 3D notice boards and readable by walking up | NEXT |
| 35 | A flea market at weekends with haggling | NEXT |
| 36 | Selling real items from the player's inventory and furniture | NEXT |
| 37 | Prices that follow the season (winter clothes, summer fruit) | NEXT |
| 38 | Inflation over a long game | NEXT |
| 39 | A pawn shop | NEXT |
| 40 | Courier and delivery shifts through the phone | NEXT |
| 41 | Renting out a spare room when the player owns a flat | NEXT |
| 42 | Paid shop advertising on billboards for the player's business | NEXT |
| 43 | A second-hand car market between players | LATER (server economy) |
| 44 | Sending money or gifts to another player | LATER (server economy) |

### C. Talking to and finding other players (26)

| # | Feature | Status |
|---|---|---|
| 45 | Adverts from real players, by city | BUILT (`backend2.test.ts`, `cloud-ui.test.ts`) |
| 46 | Taking down your own advert; reporting somebody else's | BUILT |
| 47 | An advert reported by three players is hidden | BUILT |
| 48 | Private talks between two players, opened from chat or from an advert | BUILT |
| 49 | A list of your private talks | BUILT |
| 50 | A message reported by three players is hidden for everybody | BUILT |
| 51 | A cap of 300 messages a day for each player | BUILT |
| 52 | Following other players (server and client code; no screen yet) | BUILT (server and client only) |
| 53 | Deleting your own account with everything stored for it | BUILT |
| 54 | A daily clean-up job for old presence, messages and adverts (for the owner) | BUILT |
| 55 | A friends screen: who you follow, who follows you, who is online | NEXT |
| 56 | Seeing real players as people in the 3D city, at the place where they are | NEXT |
| 57 | A speech bubble over a real player when they write in the place's room | NEXT |
| 58 | Quick reactions and waves without typing | NEXT |
| 59 | A word filter and a "mute for a day" tool for the owner | NEXT |
| 60 | A moderator screen that lists reports | NEXT |
| 61 | Live chat (pushed, not fetched every 8 seconds) | NEXT |
| 62 | A city-wide room and a newcomers' help room | NEXT |
| 63 | Unread marks and a notification dot | NEXT |
| 64 | Password reset from the game | NEXT |
| 65 | Real votes in the weekly election (the server side already exists) | NEXT |
| 66 | A leaderboard by city, by origin and by week | NEXT |
| 67 | Player profiles with achievements and best lives | NEXT |
| 68 | Visiting another player's home | LATER (homes stored on the server) |
| 69 | Sharing a flat with another player | LATER (homes stored on the server) |
| 70 | Clubs and guilds with a shared room | LATER (moderation tools first) |

### D. People and how they look (16)

The owner said plainly that the present character model is not liked. **Nothing in this group is built yet**; it is the first thing planned after this round.

| # | Feature | Status |
|---|---|---|
| 71 | A new body: rounded limbs, hands, feet and shoulders instead of boxes | NEXT (first) |
| 72 | Faces with eyes that blink and a mouth that moves when talking | NEXT (first) |
| 73 | Hair styles as shapes, not a cap | NEXT (first) |
| 74 | Clothes as layers: coat over shirt, scarf, hat, bag | NEXT |
| 75 | Winter and summer clothes that follow the weather | NEXT |
| 76 | Body types and ages: child, teenager, adult, older person | NEXT |
| 77 | Smooth walking with turning of the body and a run | NEXT |
| 78 | Sitting on benches, waiting at stops, queuing at doors | NEXT |
| 79 | Carrying things: a bag, a phone, an umbrella in rain | NEXT |
| 80 | Children with parents, prams, people with dogs | NEXT |
| 81 | Work uniforms that show the job | NEXT |
| 82 | Feelings shown in posture: tired, happy, cold | NEXT |
| 83 | Animals: cats in yards, pigeons, dogs on leads | NEXT |
| 84 | A photo mode for the player's character | NEXT |
| 85 | A richer character creator with sliders | NEXT |
| 86 | Characters made from a real 3D model file | LATER (a licensed or self-made model) |

### E. Houses, buildings and the city (20)

The owner also said the house model is not liked. **Nothing in this group is built yet.**

| # | Feature | Status |
|---|---|---|
| 87 | New building shapes: entrances with steps, balconies, pitched and flat roofs, chimneys | NEXT (first) |
| 88 | Russian building types: panel blocks, Stalin-era blocks, wooden houses, new towers | NEXT (first) |
| 89 | Each place with its own recognisable shape (a station with a clock, a market with stalls) | NEXT (first) |
| 90 | Windows that light up in the evening | NEXT |
| 91 | Yards: playground, benches, clothes lines, garages | NEXT |
| 92 | Shop fronts with signs and awnings | NEXT |
| 93 | Fences, kerbs, flower beds, bus shelters | NEXT |
| 94 | Snow on roofs and ground in winter; puddles after rain | NEXT |
| 95 | Seasons that change the trees | NEXT |
| 96 | A day and night sky with a moving sun | NEXT |
| 97 | City landmarks for each city (a kremlin, a bridge, a tower) | NEXT |
| 98 | A metro entrance and a metro map in the big cities | NEXT |
| 99 | A river with boats and an embankment walk | NEXT |
| 100 | A bigger map with districts to unlock | LATER (performance work) |
| 101 | The two-wall corner view for rooms | NEXT |
| 102 | More rooms in a home: kitchen, bathroom, balcony | NEXT |
| 103 | A home that can be extended after building | NEXT |
| 104 | Neighbours who live next door and visit | NEXT |
| 105 | Housework that keeps a home tidy | NEXT |
| 106 | Utility bills that depend on what stands in the home | NEXT |

### F. Life, work and family (24)

| # | Feature | Status |
|---|---|---|
| 107 | Careers gated by skills, with exams and promotions | NEXT |
| 108 | A continuous clock instead of three parts of the day | NEXT |
| 109 | Activities in public rooms (library, gym, cafe), not only at home | NEXT |
| 110 | Skills: cooking, driving, languages, craft, sport | NEXT |
| 111 | Hobbies that give friends and small income | NEXT |
| 112 | Cooking at home with recipes of Russian and Central Asian food | NEXT |
| 113 | A weekly shop and a fridge that empties | NEXT |
| 114 | Health in more detail: colds in winter, a dentist, a yearly check-up | NEXT |
| 115 | Sending money home to family and news from home | NEXT |
| 116 | Children growing up: nursery, school, homework | NEXT |
| 117 | Older parents who need care | NEXT |
| 118 | Pets with needs | NEXT |
| 119 | Holidays of the year with their own events | NEXT |
| 120 | Travel between cities by train with a platform scene | NEXT |
| 121 | A summer house season: planting, harvest, preserves | NEXT |
| 122 | Volunteering and neighbourhood clean-up days | NEXT |
| 123 | A small business with staff and customers | NEXT |
| 124 | Savings goals and a pension | NEXT |
| 125 | Insurance for health, home and car | NEXT |
| 126 | Courts and appeals for fines and refusals | NEXT |
| 127 | More endings and a "life story" page at the end | NEXT |
| 128 | A second generation: play on as your child | LATER (long-game balance) |
| 129 | Random life events with choices that come back later | NEXT |
| 130 | A weekly newspaper with the city's news | NEXT |

### G. Play, goals and comfort (20)

| # | Feature | Status |
|---|---|---|
| 131 | Daily and weekly tasks | NEXT |
| 132 | A collection book: places seen, foods tried, cities visited | NEXT |
| 133 | Seasonal events shared by all players | LATER (server events) |
| 134 | A tutorial that walks through the first three days | NEXT |
| 135 | A guide character who answers "what do I do now?" | NEXT |
| 136 | More mini-games (market bargaining, a language quiz, a driving test) | NEXT |
| 137 | Ways to play a short game (30 days) and a long one | NEXT |
| 138 | A challenge mode with a fixed start shared by everybody that day | NEXT |
| 139 | Music and street sound that follow the place and the weather | NEXT |
| 140 | A full Russian translation of the scenario texts | LATER (thousands of texts) |
| 141 | More languages: Tajik, Uzbek, Kyrgyz interface | LATER (translators) |
| 142 | Screen reader pass for the new screens | NEXT |
| 143 | A larger-text and high-contrast mode for the 3D labels | NEXT |
| 144 | Controller and keyboard movement in the 3D city | NEXT |
| 145 | A lighter 3D mode for weak phones | NEXT |
| 146 | Automatic cloud save and a "last saved" note | NEXT |
| 147 | Playing the same life on two devices with a clear "which is newer" choice | NEXT |
| 148 | An in-game feedback form that reaches the owner | NEXT |
| 149 | A public changelog inside the game | NEXT |
| 150 | A privacy page and the rules of the chat inside the game | NEXT |

**Count:** 36 BUILT, 105 NEXT, 9 LATER.

## 4. What to build next, in order

1. **The look the owner asked for** (71 to 73 and 87 to 89): a new character body and face, and new building shapes. These are visual and must be judged by eye, so they should be done with the owner looking at each step.
2. **Being together** (55 to 58, 61): friends screen, real players visible in the city, bubbles, live chat. This needs the backend switched on to be seen at all.
3. **Moderation before growth** (59, 60, 64): the tools the owner needs before the chat is opened to many people.
4. **Depth** (107 to 110, 127): careers by skill, the clock, public activities, more endings.

## 5. Sources

- [BitLife and why it became a global phenomenon](https://talents.ouishare.net/en/listings/2074912-bitlife-and-why-it-became-a-global-phenomenon)
- [BitLife market report (automated analysis, numbers unverified)](https://marlvel.ai/intel-report/games/bitlife-life-simulator)
- [Project Rene is now a mobile-first social life sim](https://www.screenhub.com.au/news/games/project-rene-mobile-game-2690544/)
- [The future of The Sims (EA)](https://www.ea.com/games/the-sims/news/future-of-the-sims)
- [The Sims Online (history)](https://giantbomb.com/wiki/Games/The_Sims_Online)
- [How the Lagos Life game works](https://thecondia.com/lagos-life-game/)
- [Lagos Life: Nigerian browser games](https://www.techloy.com/lagos-life-nigerian-browser-games/)
- [Lagos Life attracts over 1 million players](https://brandspurng.com/2026/10/08/nigerian-made-lagos-life-game-attracts-over-1-million-players-after-launch/)
