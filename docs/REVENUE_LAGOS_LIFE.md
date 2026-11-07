# What Lagos Life teaches us about earning from a life game

Research on 2026-11-01. Lagos Life is a free browser life game set in Nigerian cities (played at lagoslife.app, no app-store listing found), made by Vatar and launched on 1 October 2026. It is the closest case to ours: a city life simulator, in a browser, with accounts, a phone, chat and a 3D city. **Almost every number below is the company's own claim, repeated by news sites; none is audited.** Where sources disagree I say so.

## 1. How it made money

**Money in this plan is in roubles only** (the owner's rule). Dollar and naira figures below are the sources' own; I add roubles at an **assumed ₽85 to the dollar**: $188 is about ₽16,000, $170,000 about ₽14.5 million, $46,900 about ₽4.0 million, $6,500 a month about ₽550,000.

| Stream | What was reported | How firm |
|---|---|---|
| **Adverts on virtual billboards and landmarks** (the main one) | Real businesses rent places in the game city. On 9 October: 244 ads on 40 billboards in Lagos, Port Harcourt and Abuja, plus about 715 on the Lagos Lagoon (about 959 in all). Floor price at least ₦250,000 (about $188) a week per advert; airport signposts ₦500,000 for seven days. Several adverts share one board in turn, 15 seconds each. At the floor price, one week of the 244 board adverts is about ₦61 million (about $45,870). | Reported by TechCabal (read through a summary on EdgeX); prices are the floor, so the real mix is unknown |
| Cheap early prices | At launch roadside billboards were reported at ₦5,000 a week (about $3.77) and a larger lagoon plot ₦18,000; no advertiser account was needed. A week later the floor was ₦250,000. Different slots may explain part of the gap. | WeeTracker, Innovation Village |
| Music promotion | Artists pay ₦50,000 (about $37.74) to have a song played in the game's clubs. | WeeTracker |
| Brand partnerships | Chowdeck (food delivery) appears as an app on every character's phone. Terms not published. | news reports |
| Football streaming | Listed as a stream; no details found. | Innovation Village |
| Game money bought with real money | Players buy "Game Naira" through Flutterwave. The terms say it is "a fictional digital game unit" that "cannot be redeemed" for real naira, purchases are generally final, and the company controls how much exists. The price of a top-up was **not found**. | Innovation Village |

Totals: $46,900 in the first four days "mostly from advertising"; "more than $170,000 earned and contracted" by 9 October (the report does not split money received from bookings for later weeks). Players, self-reported: 1 million in three days, 4.3 million on 8 October, 9.3 million on 11 October; about 90,000 online on one morning. Running cost estimated by TechCabal at about $6,500 a month (hosting about $2,000, Cloudflare about $4,000). $500,000 raised from angels at a $10 million valuation; the founder said the game is worth $1 billion and declined a $100,000 offer. Sources disagree on the founder's name (Rayhamen or Mathew).

## 2. What it really tells us

1. **The player is not the customer.** The money came from businesses paying to be seen by a huge crowd. The crowd was free to play.
2. **Scale was everything.** $170,000 over about 9 days, at 4.3 to 9.3 million players, is roughly **$0.02 to $0.04 per registered player** (my division of the reported figures). It also came from a burst of novelty and press.
3. **Price follows audience.** The same kind of place went from a few thousand naira to a quarter of a million in about a week as the player count rose.
4. **Sharing inventory raises income.** Selling many adverts on one board in rotation earns more per board, and gives each advertiser a smaller share of the screen.
5. **It worked in a browser with no store.** Nothing to install, no store fee, a link anyone can share. Same as ours.
6. **Selling game money is a trap.** The company reset balances after an exploit that let some players mint "trillions", then added expensive items for richer players ("we have created a class"). Fewer than 4 in 100 Nigerians have a credit card, which also limits what players can pay.
7. **Trust costs came fast.** Press scrutiny on player data (device fingerprints, chat kept, no named advertiser data rules), a payment provider switch within the first week, doubts about unverified sign-ups inflating the player count, and copies within days.
8. **The novelty may fade.** The founder says the day it stops feeling new works in their favour; no retention figures were published.

## 3. What this would mean for us

We already have the same machine, without real money in it: [src/adspace.ts](../src/adspace.ts) lets a player rent a bus stop, a metro car panel, a billboard, a wall or the city-centre screen for game roubles, the server shows those adverts to other players in the same city, checks them against a simplified advertising law and caps the frames per place (migration `0006_adspace.sql`).

At our size the Lagos Life income does not transfer:

| Players | At $0.02 | At $0.04 |
|---|---|---|
| 30,000 (the thesis target for 24 months) | $600 (about ₽51,000) | $1,200 (about ₽102,000) |
| 200,000 | $4,000 (about ₽340,000) | $8,000 (about ₽680,000) |

At about ₽85 to the dollar (an assumed rate) 30,000 players would be roughly ₽50,000 to ₽100,000. Our players are worth more to a few advertisers than a general Nigerian crowd (a newcomer who needs a SIM card, a bank, a flat, a language school), but the extra is a guess until a real advertiser names a price.

**Where it does work for us: our organisations.** The people who most want to be in front of newcomers are the ones already in the plan in [REVENUE.md](REVENUE.md): a university, an adaptation centre, an employer, a licensed language school. Their "advert" should be a place in the game city (their real building, a stand in the metro hall, a counter in the phone's Services app) bundled **inside the licence**, not sold by the week to anyone with a card.

## 4. Copy, change, refuse

| Lagos Life move | Our version |
|---|---|
| Real advertisers rent billboards | **Change.** Only verified partners (see below). Priced with the licence, or a fixed price per city per month, never a bidding market. |
| A brand's app on the in-game phone | **Copy, carefully.** A "Services" entry for a verified partner: a SIM operator, a state service centre, a university. |
| Music or events paid for | **Maybe later.** Sponsored cultural events, only from the verified list. |
| Selling game money for real money | **Refuse.** It creates "classes", invites cheating, and the thesis bans paid advantage. Our paid offers stay visual and practice (see [REVENUE_PLAYERS.md](REVENUE_PLAYERS.md)). |
| Cheap anonymous ad slots (no account) | **Refuse.** Our players are fraud targets. |
| Collect device fingerprints, keep chat | **Refuse.** Our policy already keeps less (texts 30 days, call set-up deleted when read). |

Rules for a sponsored place, if the owner chooses to open this:

- **Verified partners only**: a registered company with a tax number and any licence the trade needs, checked by a person before the first day. A written record of who paid.
- **Allowed categories**, short list: universities and colleges, state and municipal services, licensed language and exam centres, mobile operators, banks for ordinary accounts and cards, licensed clinics, employers with a registered recruiting licence, shops and cafés.
- **Banned**: loans and quick credit, money transfers and "remittance" offers, "papers without an exam", lawyers or agents who promise a result, gambling, alcohol and tobacco, anything the existing advert checker already refuses.
- **Marked as advertising** as the Russian law asks (the "Реклама" label and a token from an advertising data operator). I did not find how this works for adverts inside games, so check it with a lawyer first.
- **No player data goes to a partner**, only counts of views.
- **Never inside a scam, rights or exam lesson.**
- Players can hide partner places in the settings.

## 5. Plan

1. Do not open the street to outside advertisers before the weekly players are in the tens of thousands: until then it earns pennies and costs trust.
2. Add "a place in the city" to the licence offer to universities and adaptation centres now (the mechanism exists; the work is the real-partner flag, the label and a review step). It is the cheapest thing to sell them and gives them something to show.
3. After 10,000 weekly players (assumed trigger), ask five verified partners what they would pay for a month in one city; set a fixed price from the answers, not from Lagos prices.
4. Write the sponsored-place rules in the terms and the privacy policy before the first partner.
5. Keep the game money closed: never sold, never cashed out.

## Sources (read 2026-11-01)

- TechCabal's figures through a summary: https://pro.edgex.exchange/en-US/news/article/lagos-life-game-170000-revenue
- Streams, payments, terms, players, privacy, cash-out: https://innovation-village.com/lagos-life-game-draws-scrutiny-over-virtual-currency-payments-and-player-data/
- Early prices, music promotion, costs, exploit, card use: https://weetracker.com/2026/10/06/lagos-life-game-nigeria-browser-gaming-explodes/
- Funding: https://www.techloy.com/lagos-life-game-vatar-funding-business/
- Platform and store listings: https://thecondia.com/lagos-life-game/ and https://aiidelist.com/blog/lagos-life-game-guide-2026
- Founder profile (paywalled after the first lines): https://thecondia.com/shalom-mathew-lagos-life

**Not found:** the price of Game Naira top-ups, a split of income by stream, how much of the $170,000 was paid, retention, the names of advertisers, football streaming details, and the original TechCabal article (only a summary was readable).
