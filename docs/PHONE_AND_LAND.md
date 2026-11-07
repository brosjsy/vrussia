# The phone (calls and texts inside the game) and land, shops and building

Decisions of 1 November 2026, and the plan. Everything below happens **only inside the game**: nothing reaches a real phone network.

## 1. Numbers (done)

- **13 digits** with the 7 of Russia, written `+7 0XXX XXXX-XX-XX` (`src/phonenumber.ts`).
- A real Russian number has 11 digits and never a 0 right after the +7, so a number of the game can never be a real person's number.
- The twelve digits after the 7: `0`, a range digit (1 to 8: players; 9: the game's own characters and services), nine digits, and a check digit (Luhn). The check digit catches any single mistyped digit.
- The server gives a player's number once, at the first login, and it never changes (built). Without an account the number is made from the player's name and origin, so a newcomer has one at once.
- **A SIM card is needed by everybody** (to build on this): until the player has bought a SIM card, the phone cannot call or text. A newcomer must first complete identification (Online services, Mobile identification); a citizen needs only a passport. The phone says so and the task list has "Get a Russian SIM card". Saves from before this change must buy a SIM card as well.

## 2. Texts between players (built, round 155)

- `server/migrations/0011_phone.sql` and `server/src/routes-phone.ts`; the browser side is `src/phone-online.ts` and the Players app in `src/phone-ui.ts`.
- Adults only (18+), the bad-language filter, no phone numbers or contacts in a text, the block list (shared with the chat), a report button (two reports hide a text), 6 texts per 30 seconds and 200 a day, 160 characters, kept 30 days, erasable in the Players app (`DELETE /api/phone/data`).
- A text to a character of the game keeps working offline as before.

## 3. Calls between players (built, round 155)

- Audio only (WebRTC). `src/calls.ts` is the whole call: the microphone is asked for only in `place()` and `answer()`; decline never opens it. The server passes `offer`, `answer`, `ice`, `hangup`, `decline` (table `app.call_signals`, deleted when read, pruned after two minutes) and never sees sound.
- The other side hears of a call by polling every 2.5 seconds **while the phone is open**. A game with the phone closed is not reachable: a deliberate choice for privacy and battery.
- Helper servers: build setting `VITE_ICE_URLS` (comma separated `stun:` / `turn:` addresses). Without it a public STUN server is used, which sees the player's internet address (the privacy policy says so). **Not measured yet:** how many home and mobile networks need a TURN relay. Host one in Russia (coturn) and put it in `VITE_ICE_URLS` before a public launch.
- Never recorded; the only metadata is the short-lived signal rows.

## 4. Phone looks (built)

Eight generic skins, no brand names: notch, island, punch-hole, compact, foldable, budget, keypad, tablet (`src/phone-skins.ts`, `.skin-*` in `style.css`). Chosen from the device the first time, changeable on the phone's home screen, kept on this device only.

## 5. Land, shops and building (built, round 155)

`src/land.ts` (rules, pure) and `src/land-ui.ts` (the Land & shop app).

1. **Land:** six plots for sale in the player's city each month, housing or shop, priced per square metre by city size; anyone with the money can buy (a foreigner too: city land only, never farmland). Registration duty ₽2,000; land tax once a year at 0.3% (housing) or 1.5% (shop) of 80% of the price.
2. **Permit:** a housing plot needs a notification of planned building (1 day in the game), a shop plot a building permit (3 days). Walls, doors and windows are refused without it.
3. **Materials:** bricks, boards, timber, glass, doors, paint; ordered, paid, delivered after a wait.
4. **Designer:** a grid of 2 m squares; choose a piece, tap a square to drop; tap a placed piece to pick it up (its materials come back). A check says whether the building is closed and has a door.
5. **Shop:** needs a closed building, a door, a counter, a shelf and a sign, a registered owner and an online cash register (₽25,000); becomes the player's business (`kind: 'shop'`, now also in the ordinary business list as a rented unit).
6. Sources: `land`, `landtax`, `grk`, `fz54` in `src/platform/citations.ts`, each with the online check of 1 November 2026; **none is checked by a person yet**, and the land tax rates were not confirmed online.

## Not done, honestly

- The game does not charge the land tax automatically; the player pays it in the app (no penalties).
- No building 3D view of the designed shop in the street yet (the designer is a 2D grid).
- Calls and texts were tested with fakes and with the real server routes, but a call between two real browsers has not been tried here.
- Shops are a business of the existing weekly model; stock, prices and customers are not simulated separately.
- Old saves have no land record; the app makes an empty one.
