# Partner places: a verified organisation's place in the game city

Status: the **first slice is built** (section 4); the rest is plan. It follows from [REVENUE_LAGOS_LIFE.md](REVENUE_LAGOS_LIFE.md): the owner chose to offer a place in the city to **organisation customers inside the licence**, and not to open the street to outside advertisers.

## 0. Money is in roubles only

Decided by the owner. Every price the player, a partner or a funder pays is in **real roubles (₽)**, paid to a Russian provider by a Russian card or by the Faster Payments System. No dollars, no other currency, no Telegram Stars, no Uzbek or other wallets. Consequences:

- A relative or employer **abroad** cannot pay with a foreign card on a Russian provider. They pay through someone in Russia, or buy a gift code from a Russian-side seller. Players abroad before arrival get access through codes, partners (a university gives the code) or the free game.
- The "Uzbek wallets" route in [REVENUE_PLAYERS.md](REVENUE_PLAYERS.md) is out unless the owner changes this rule.
- Figures from other countries are converted to roubles at an **assumed ₽85 to the dollar** and are marked as such.

**A trap to avoid: the game also has "roubles".** Inside the game, money is invented (the phone, shops, adverts and land use game roubles). Real money must never look like it. Rules: the game money is shown as "game ₽" or with its own sign wherever a purchase could be near; any screen that takes real money says "real money, RUB" in plain words; game money can never be bought, sold or cashed out (this also keeps us clear of the "class" and exploit problems Lagos Life had).

## 1. The product

A **partner place** is a real organisation's visible spot in the game city, shown to every player in that city, labelled as advertising, with a link to the organisation's own official page.

| Part | What the player sees |
|---|---|
| **The building** | A named building or stand in the partner's real city (a university entrance, an adaptation centre office, a service counter), drawn in the 3D city. |
| **The screen turn** | One slot in the rotation on the city-centre screen and the metro panels (the mechanism that exists today in `src/adspace.ts`, 4 frames on the screen, 6 in the metro). |
| **The Services entry** | A line in the phone's list of services: what the organisation does for newcomers, what it costs (if it says so), and a link to its official page. |
| **The label** | "Реклама" plus the advertiser's name and tax number, as the Russian advertising law asks for adverts online. |

What a partner does **not** get: any player's name, number, texts, calls, location or choices. Only counts: how many players saw the place, opened the entry and followed the link.

## 2. Who may buy it

Checked by a person before day one: a registered company, school or institution with a tax number, and the licence its trade needs.

- **Allowed:** universities and colleges; state and municipal services and centres for migrants; licensed language and exam centres; mobile operators; banks, for ordinary accounts and cards; licensed clinics; employers with a registered recruiting right; shops and cafes.
- **Banned:** loans and quick credit, money transfers and "remittance" offers, "papers without an exam", agents or lawyers who promise a result, gambling, alcohol, tobacco, anything the existing advert checker already refuses (`lawCheck` in `src/adspace.ts`, `app.advert_banned` on the server).
- **Never** placed in, or beside, a scam, rights or exam lesson. A player can hide partner places in the settings.

## 3. Prices, in roubles (all assumed until a partner says yes)

| Package | Who | Price a year | Notes |
|---|---|---|---|
| **Licence with a place** | universities, adaptation centres | ₽150,000 (the licence from [REVENUE.md](REVENUE.md)); the building in one city, one screen turn and the Services entry are **included** | the cheapest thing to sell: something to show the rector |
| Extra city | same | ₽20,000 each | |
| Services entry alone | a verified service that is not a licensee | ₽30,000 | |
| **Employer package** | employers that hire from abroad | ₽250,000 (as in REVENUE.md), place included | |
| Standalone place | a mobile operator, a bank | fixed price per city per month, set after five conversations | not before 10,000 weekly players (assumed) |

The yardstick from Lagos Life for what is possible is **about ₽16,000 a week for one shared advert on a board with tens of thousands of players online** (₦250,000, about $188, at the assumed rate). At our size the weekly price per advert would be far smaller, so partner places are a **sweetener for the licence**, not a stream of their own.

What it adds, honestly: ten partners each taking one extra city or a Services entry is about ₽200,000 to ₽300,000 a year on top of the licences. Worth doing because it makes the licence easier to sell; not worth building a separate sales team for.

## 4. What exists, what is missing

| Need | State |
|---|---|
| Places in the 3D city, a screen, metro panels, frames per place, views counted once a day per player | **Exists** for players' own adverts (`src/adspace.ts`, `server/migrations/0006_adspace.sql`); not used for partners yet |
| The partner record with the tax number, category, cities, dates, **real price in roubles**, and who checked it, when and under which agreement | **Built** (`src/partners.ts`) |
| The review step | **Built as a reviewed change**: the list is a file, `src/content/partners.ts`, **empty on purpose**; an entry is added only after a person checked the organisation; `test/partners.test.ts` fails the build if any entry breaks the rules (tax number, https link, dates, allowed category, banned offers, no phone numbers) |
| The "Реклама" label with the advertiser and tax number | **Built** on every card (`label` in `src/partners.ts`); a lawyer must still read it, and I did not find how marking works inside games |
| The Services entry in the phone | **Built**: the app "Partner services / Партнёры города" (`src/partners-ui.ts`) appears **only when the player's city has an active partner**, lists each with its price marked "real price, RUB, not game money", and a link that opens the organisation's own page after a plain warning that the game never asks for money or documents |
| The hide switch for the player | **Built**: a checkbox on the phone home screen (shown only when some partner is active), kept on this device |
| Partner data | **Nothing is recorded**: no views, no clicks, nothing about the player |
| An advertiser/partner record and review in the **server** (instead of a file) | Not built; the file is enough for the first few partners |
| A building or stand drawn on the 3D map; a screen turn for partners | Not built |
| A report for the partner (counts only) | Not built (would need the server) |
| Terms, the privacy text for partners, an invoice with closing documents | Not built; needs a lawyer |

Next in order: (1) the lawyer reads the label and the terms, (2) the first real partner is added to `src/content/partners.ts`, (3) the building in the 3D city, (4) counts for the partner report, (5) the terms.

## 5. Steps

1. **Now:** offer the place inside the licence in every talk with a university or centre; note what they ask for. No code needed for the first talks: use a picture of the city.
2. **Before the first paid pilot:** a lawyer reads the label and the terms; build steps 1 to 3 above.
3. **First partner:** one university, one city, a written agreement, review by the owner.
4. **After 10,000 weekly players (assumed):** ask five verified partners what a month in one city is worth to them; set the standalone price from the answers.
5. **Always:** game money stays closed; real money only in roubles; partner data never leaves the game.

## 6. Risks

- **Trust:** an advert beside newcomers who are targets of fraud. Defence: the allowed list, the review by a person, the label, the hide switch, and a public note of the rules.
- **Law:** how advertising is marked inside a game, the rules on data, and the terms of sale. A lawyer before launch.
- **Little money:** this is a helper for the licence (section 3). If no partner cares about the place, drop it; nothing else depends on it.
- **Two kinds of roubles confusing players:** section 0.
