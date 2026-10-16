/* The optional real map: the streets and 3D buildings of the player's city from OpenStreetMap, drawn with the MapLibre library from the free
   OpenFreeMap tile service. The game's places and people are placed on top of it.
   It is OFF by default and the offline illustrated map stays the normal one. Nothing is loaded from the internet until the player says yes
   in a notice: opening it sends the player's address to the tile service, which is why it asks first. The MapLibre library itself is loaded
   only at that moment (it is a separate download), so players who never open it pay nothing.
   Credits that must stay visible: OpenFreeMap, OpenMapTiles and OpenStreetMap contributors (shown in the map's corner).
   City-centre coordinates below are approximate and come from general knowledge; they are only used to centre the map. */
import * as G from './engine';
import type { State } from './engine';
import type { KV } from './store';
import { bustHtml } from './figure';
import { crowdFor, PLACE_LOOK } from './city';

export const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
export const SPAN_M = 1500;                       // the 100 x 100 game map covers about this many metres on the real map
export const CONSENT_KEY = 'vrussia_realmap_ok';

/** City centres as [latitude, longitude]. */
export const CITY_CENTERS: Record<string, [number, number]> = {
  Moscow: [55.7558, 37.6173], 'Saint Petersburg': [59.9343, 30.3351], Kazan: [55.7887, 49.1221], Yekaterinburg: [56.8389, 60.6057], Novosibirsk: [55.0084, 82.9357],
  Krasnodar: [45.0355, 38.9753], Sochi: [43.5855, 39.7231], Vladivostok: [43.1155, 131.8855], Grozny: [43.318, 45.6949], 'Nizhny Novgorod': [56.2965, 43.9361],
  Samara: [53.1959, 50.1002], Kaliningrad: [54.7104, 20.4522], Saratov: [51.5336, 46.0343], Omsk: [54.9885, 73.3242], Chelyabinsk: [55.1644, 61.4368],
  'Rostov-on-Don': [47.2357, 39.7015], Ufa: [54.7388, 55.9721], Krasnoyarsk: [56.0153, 92.8932], Perm: [58.0105, 56.2502], Voronezh: [51.672, 39.1843],
  Volgograd: [48.708, 44.5133], Tyumen: [57.1522, 65.5272], Tolyatti: [53.5078, 49.4204], Izhevsk: [56.8498, 53.2045], Barnaul: [53.3548, 83.7698],
  Irkutsk: [52.287, 104.305], Ulyanovsk: [54.3282, 48.3866], Khabarovsk: [48.4827, 135.0838], Yakutsk: [62.0355, 129.6755], Murmansk: [68.9585, 33.0827],
  Arkhangelsk: [64.5401, 40.5433], Makhachkala: [42.9849, 47.5047], Tula: [54.1961, 37.6182], Yaroslavl: [57.6261, 39.8845], Vladimir: [56.129, 40.407],
  Pskov: [57.8136, 28.3496], 'Veliky Novgorod': [58.5215, 31.2755],
};

/** Where a place of the game's 100 x 100 map lies on the real map, as [longitude, latitude]. North is up. */
export function placeLngLat(city: string, p: { x: number; y: number }): [number, number] {
  const [lat0, lng0] = CITY_CENTERS[city] ?? CITY_CENTERS.Moscow;
  const dLat = SPAN_M / 111_320;
  const dLng = SPAN_M / (111_320 * Math.cos((lat0 * Math.PI) / 180));
  return [lng0 + ((p.x - 50) / 100) * dLng, lat0 - ((p.y - 50) / 100) * dLat];
}

const defaultKV = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
export const consentGiven = (kv: KV | null = defaultKV()): boolean => { try { return kv?.getItem(CONSENT_KEY) === 'yes'; } catch { return false; } };
export function giveConsent(kv: KV | null = defaultKV()): void { try { kv?.setItem(CONSENT_KEY, 'yes'); } catch { /* ignore */ } }
export function withdrawConsent(kv: KV | null = defaultKV()): void { try { kv?.removeItem(CONSENT_KEY); } catch { /* ignore */ } }

/* ---------- loading the library ---------- */
type MapLibre = typeof import('maplibre-gl');
export type Loader = () => Promise<MapLibre>;
/** The real loader: the style sheet, the library, and the address of the library's worker file (the map does its heavy work in a background worker). */
const defaultLoader: Loader = async () => {
  await import('maplibre-gl/dist/maplibre-gl.css');
  const ml = await import('maplibre-gl');
  const worker = (await import('maplibre-gl/dist/maplibre-gl-worker.mjs?url')).default;
  ml.setWorkerUrl(worker);
  return ml;
};
let loader: Loader = defaultLoader;
/** Lets a test replace the library with a stand-in. */
export function setRealMapLoader(l: Loader | null): void { loader = l ?? defaultLoader; }

export interface RealMapDeps {
  host: HTMLElement; s: State;
  onPlace: (id: string) => void;
  onNpc: (id: string) => void;
  onFail: (message: string) => void;
}
export interface RealMapHandle { update: (s: State) => void; destroy: () => void }

const esc = (x: string): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** Adds 3D buildings if the map style does not already have them: extruded footprints from the vector tiles' building layer. */
export function ensureBuildings3d(map: { getStyle: () => { sources?: Record<string, { type?: string }>; layers?: { type?: string }[] }; addLayer: (l: unknown) => void }): boolean {
  const style = map.getStyle();
  if ((style.layers ?? []).some(l => l.type === 'fill-extrusion')) return false;
  const source = Object.keys(style.sources ?? {}).find(k => style.sources?.[k]?.type === 'vector');
  if (!source) return false;
  map.addLayer({
    id: 'buildings-3d', type: 'fill-extrusion', source, 'source-layer': 'building', minzoom: 14,
    paint: {
      'fill-extrusion-color': '#d8d4cc',
      'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
      'fill-extrusion-opacity': 0.85,
    },
  });
  return true;
}

/** Shows the real map in `host`. Resolves with a handle, or reports a failure (no network, blocked, no 3D support) through `onFail` and rejects. */
export async function mountRealMap(d: RealMapDeps): Promise<RealMapHandle> {
  const ml = await loader();
  const box = document.createElement('div');
  box.className = 'realmapCanvas';
  d.host.appendChild(box);
  const center = placeLngLat(d.s.city, { x: 50, y: 50 });
  const map = new ml.Map({ container: box, style: STYLE_URL, center, zoom: 15.4, pitch: 62, bearing: -17, maxPitch: 75, minZoom: 11, attributionControl: { compact: true } });
  let failed = false;
  map.on('error', (e: { error?: { message?: string } }) => { if (!failed) { failed = true; d.onFail(e?.error?.message || 'The map could not be loaded.'); } });
  map.on('load', () => { try { ensureBuildings3d(map as never); } catch { /* the style has its own buildings or none: the map still works */ } });

  let markers: { remove: () => void }[] = [];
  const add = (el: HTMLElement, lngLat: [number, number], anchor: 'bottom' | 'center' = 'bottom'): void => {
    markers.push(new ml.Marker({ element: el, anchor }).setLngLat(lngLat).addTo(map));
  };
  const draw = (s: State): void => {
    markers.forEach(m => m.remove()); markers = [];
    for (const p of G.PLACES) {
      if (p.id === 'work' && !s.job) continue;
      const look = PLACE_LOOK[p.id];
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'pin' + (p.id === s.loc ? ' here' : ''); el.dataset.place = p.id;
      el.setAttribute('aria-label', p.n); el.title = p.n; el.textContent = look ? look.icon : '📍';
      el.onclick = () => d.onPlace(p.id);
      add(el, placeLngLat(s.city, p), 'center');
    }
    for (const n of crowdFor(s)) {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'person'; el.dataset.npc = n.id; el.setAttribute('aria-label', n.handle); el.title = n.handle;
      el.innerHTML = bustHtml(n.look, n.worn, '');
      el.onclick = () => d.onNpc(n.id);
      add(el, placeLngLat(s.city, { x: n.x, y: n.y }));
    }
    const me = document.createElement('div');
    me.className = 'person me'; me.title = s.name; me.innerHTML = `${bustHtml(s.look, s.worn, s.name)}<span class="meTag">${esc(s.name.slice(0, 14))}</span>`;
    const here = G.placeById(s.loc);
    add(me, placeLngLat(s.city, { x: here.x - 2, y: here.y + 3 }));
  };
  draw(d.s);
  return { update: (s: State) => draw(s), destroy: () => { markers.forEach(m => m.remove()); markers = []; map.remove(); box.remove(); } };
}
