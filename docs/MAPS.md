# The maps of the game, and how to reach all of Russia

## What there is

| Map | What it shows | Needs |
|---|---|---|
| The city of the game (default 3D and flat) | The game's 16 places and invented houses | nothing, works offline |
| The real city (`src/realworld*.ts`) | Real streets, buildings and named places (about 20 kinds: metro, churches, mosques, MFC, police, schools, universities, banks, cafés, shops, museums, parks, hotels, clinics and so on) from OpenStreetMap through the free OpenFreeMap tiles | internet and the player's agreement |

## Phase 1 (done in round 154)

- **Start anywhere in Russia:** the real city opens in the player's city, and the player can jump to any of the 37 cities of the game, or type an address or a town.
- **Address search** (`src/geocode.ts`): sent to the public OpenStreetMap geocoder (Nominatim) only after the player agrees (`vrussia_geo_ok`); at most one question every 1.2 seconds, answers remembered, only places inside Russia, text escaped on the screen. The privacy policy says what is sent.
- **House numbers** come from the map tiles (from zoom 14): the numbers of the houses near the player float over them, and the screen shows "street, house number" for where the player stands.
- **Lists by kind:** one tap shows every school, pharmacy, mosque and so on near the player.

Limits to remember: the tiles hold the more important places, so a small shop may be missing; the walking routes use only the streets of the loaded tiles (a few kilometres around the player); the public geocoder is fine for a pilot but not for thousands of players.

## Phase 2 (not built): our own map for all of Russia

1. **Data:** the Russia extract from Geofabrik (about 3.9 GB, according to a package record that may be out of date), refreshed every week.
2. **Tiles:** our own vector tiles of Russia (OpenMapTiles layout, so the game's reader keeps working), served from Russian hosting.
3. **Addresses:** our own Photon or Nominatim; a Photon database for the whole planet needs about 95 GB of disk and 64 GB of RAM, so a Russia-only one is smaller (to be measured).
4. **Routes:** a walking router (Valhalla, OSRM or GraphHopper) so that a walk can be a few kilometres, not only the loaded tiles.
5. **Why:** control, no dependence on donation-funded services, player addresses stay in Russia.

## Is 2GIS or Yandex Maps open source? (checked 2026-11-01)

**Decision: the game stays on OpenStreetMap data, with MapLibre and OpenMapTiles/OpenFreeMap tiles. We do not use 2GIS or Yandex Maps data, tiles or search results, and we never copy ("scrape") them.**

| | Open? | What the game may do |
|---|---|---|
| **OpenStreetMap** (our data) | Yes: the data is under the Open Database License (ODbL), free to use commercially with the credit, and derived data must stay open | Use it. Keep the credit on screen (section below). |
| **MapLibre GL** (our map engine) | Yes: open source | Use it (already in the build). |
| **2GIS** | No: the apps, city data and map engine are proprietary. 2GIS publishes some tools and libraries on its GitHub profile, and its API can show 2GIS tiles in open tools such as Leaflet, but that is a commercial service: access is by request, prices depend on the number of requests, and it is bound by 2GIS's licence agreement (law.2gis.ru), which I could not read. A forum answer says it forbids scraping; unverified. I found no evidence that 2GIS publishes its data as open data. | Nothing without a written licence. |
| **Yandex Maps** | No: closed. The API has a free tier with limits (an API key and Yandex's terms) and paid commercial tiers. Under the **standard** commercial licence you may **not save or edit** what the API returns; the **extended** licence allows saving. Satellite layers are not offered to third-party commercial projects. Its SDKs on GitHub are open; the map data is not. The crowd-edited "People's Map" data belongs to Yandex. | Nothing without a licence; saving results (a cache, our own tiles) needs the extended licence. |

What this means for the game:

- **Do not** put 2GIS or Yandex tiles, addresses, shop lists or opening hours into the game, our tiles or the server. A game that stores and reshapes map data cannot sit on a standard licence, and scraping is a breach.
- **If one day we need their richer shops and opening hours**, it is a paid licence to negotiate, in roubles, with the right to store and show the data in a game; ask both companies in writing before any build. Until then, Phase 2 below (our own OpenStreetMap-based map) is the plan.
- **A link out is allowed and costs nothing:** a button "open this place in Yandex Maps" using the documented address `https://yandex.ru/maps/?pt=LON,LAT&z=17&l=map` (longitude first). The page of the other company opens only when the player presses it, so the policy must say that the place's coordinates then go to that company. I could not confirm an official address format for a 2GIS link (look at the address in the browser after placing a point on 2GIS, or use its Share button), so none is planned until it is confirmed. **Not built.**
- The two search answers that started this note came from a chat tool; the Yandex storage rule and the 2GIS commercial terms come from the companies' own pages (found by search), the rest from general knowledge. The 2GIS licence text itself and the Yandex price list are **not read**.

Sources: https://dev.2gis.com/api (commercial access on request), https://law.2gis.ru/en/platform-id (2GIS licence pages), https://tech.yandex.com/dev/commercial/doc/en/concepts/jsapi-geocoder (standard and extended licence), https://yandex.ru/dev/yandex-apps-launch/maps/doc/concepts/yandexmaps-web.html (link format), https://www.openstreetmap.org/copyright (ODbL).

## Credits that must stay on screen

Map data © OpenStreetMap contributors; tiles OpenFreeMap and OpenMapTiles.
