/* Real houses for the 3D city: the outlines of the buildings around the centre of the player's city, from OpenStreetMap data served as map tiles by
   OpenFreeMap (the same free service as the optional real map), turned into boxes with the right shape and height, and the game's places set on
   real buildings of that city.
   Yandex Maps and Google Maps are not used: their terms do not allow taking their map data into another game. OpenStreetMap data does, with credit.
   The tiles are asked for only after the player agrees, once per city, and the finished city is kept on the device so that it is not asked for again.
   Everything except the download is pure and is tested without a network. */
import { VectorTile, classifyRings } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import * as G from './engine';
import type { KV } from './store';
import { CITY_CENTERS } from './realmap';
import { waterRects, parksFor, FIELD_HALF } from './city-geo';
import { toWorld, standPoint, HUB, roadSegments } from './world-logic';

/** One metre of the real city is this many metres in the 3D world (the choice is made again for every city, see layoutCity). */
export const REAL_SCALE = 0.35;
export const SCALES = [0.35, 0.45];
export const M_PER_DEG = 111_320;
export const TILEJSON_URL = 'https://tiles.openfreemap.org/planet';
export const TILE_ZOOM = 14;
export const OSM_CONSENT_KEY = 'vrussia_osm_ok';
/** The area looked at around the city centre is a square of this half-width in real metres. */
export const SEARCH_HALF_M = 650;
/** How far from the middle the real houses reach: the playing field and a ring of streets around it (the water, where there is any, stops them). */
export const REAL_REACH = FIELD_HALF + 70;
export const MAX_BUILDINGS = 1400;

export type RealKind = 'house' | 'block' | 'tower' | 'shop';
/** A building in the 3D world (metres from the middle of the world). `place` is set on the building that a place of the game stands on. */
export interface RealBuilding { pts: [number, number][]; h: number; kind: RealKind; color: string; place?: string }
/** A building as the map has it: real metres from the city centre (x east, z south), real height. */
export interface RawBuilding { pts: [number, number][]; height: number; area: number; key: number }
/** The real houses of a city, ready to draw, and the real building that each place stands on (a place that found none is missing). */
export interface RealCity { buildings: RealBuilding[]; anchors: Record<string, RealBuilding> }

const centreOf = (city: string): [number, number] => CITY_CENTERS[city] ?? CITY_CENTERS.Moscow;

/** Where a point of the real map (latitude, longitude) lies, in real metres from the city centre: x east, z south. */
export function toRealXZ(city: string, lat: number, lon: number): { x: number; z: number } {
  const [lat0, lon0] = centreOf(city);
  return { x: (lon - lon0) * M_PER_DEG * Math.cos((lat0 * Math.PI) / 180), z: -(lat - lat0) * M_PER_DEG };
}
/** The same point in the 3D world at the standard scale. */
export function toWorldXZ(city: string, lat: number, lon: number): { x: number; z: number } {
  const p = toRealXZ(city, lat, lon); return { x: p.x * REAL_SCALE, z: p.z * REAL_SCALE };
}

/** The south, west, north and east edges of the area looked at. */
export function bboxFor(city: string): { s: number; w: number; n: number; e: number } {
  const [lat0, lon0] = centreOf(city), half = SEARCH_HALF_M;
  const dLat = half / M_PER_DEG, dLon = half / (M_PER_DEG * Math.cos((lat0 * Math.PI) / 180));
  return { s: lat0 - dLat, w: lon0 - dLon, n: lat0 + dLat, e: lon0 + dLon };
}

/* ---------- map tiles ---------- */
const n2 = (z: number): number => 2 ** z;
/** The tile (x, y) that holds a point, at zoom z. */
export function tileOf(lat: number, lon: number, z = TILE_ZOOM): { x: number; y: number } {
  const r = (lat * Math.PI) / 180;
  return { x: Math.floor(((lon + 180) / 360) * n2(z)), y: Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n2(z)) };
}
/** Latitude and longitude of a point inside a tile (px, py in 0..extent). */
export function tilePointToLatLon(z: number, x: number, y: number, px: number, py: number, extent: number): { lat: number; lon: number } {
  const lon = ((x + px / extent) / n2(z)) * 360 - 180;
  const k = Math.PI - (2 * Math.PI * (y + py / extent)) / n2(z);
  return { lat: (180 / Math.PI) * Math.atan(Math.sinh(k)), lon };
}
/** Every tile that touches the area looked at (usually one to four). */
export function tilesFor(city: string, z = TILE_ZOOM): { x: number; y: number }[] {
  const b = bboxFor(city), a = tileOf(b.n, b.w, z), c = tileOf(b.s, b.e, z), out: { x: number; y: number }[] = [];
  for (let x = a.x; x <= c.x; x++) for (let y = a.y; y <= c.y; y++) out.push({ x, y });
  return out;
}

const WALLS = ['#e8d9c4', '#d9c8b4', '#c9d6c0', '#d8c3c3', '#c7d3e0', '#e5dcb8', '#d6c9a8'];
const TOWERS = ['#d8c9a0', '#e3cf9a', '#c9b79c', '#b8c4cf', '#d9b8a8', '#a9b6a0', '#cfcfd4', '#c7a98f'];
const hashOf = (n: number): number => { let h = 2166136261 ^ n; h = Math.imul(h ^ (h >>> 13), 16777619) >>> 0; return h; };
const areaOf = (pts: [number, number][]): number => { let a = 0; for (let i = 0; i < pts.length; i++) { const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length]; a += x1 * z2 - x2 * z1; } return Math.abs(a) / 2; };
const centroid = (pts: [number, number][]): { x: number; z: number } => ({ x: pts.reduce((s, p) => s + p[0], 0) / pts.length, z: pts.reduce((s, p) => s + p[1], 0) / pts.length });
const r1 = (v: number): number => Math.round(v * 10) / 10;

/** The world height of a building of `real` metres, and what kind it looks like. */
export function shapeOf(real: number, area_m2: number): { h: number; kind: RealKind } {
  const h = Math.min(40, Math.max(2.4, real * REAL_SCALE * 2));
  return { h, kind: real >= 26 ? 'tower' : real >= 11 ? 'block' : area_m2 > 600 && real < 14 ? 'shop' : 'house' };
}

/** Reads the buildings out of one map tile (the data of the tile as bytes), in real metres. Parts that float above the ground, specks and giants are left out; each building is kept only by the tile that holds its middle, so the edges of tiles show no doubles. */
export function decodeTile(data: ArrayBuffer | Uint8Array, z: number, x: number, y: number, city: string): RawBuilding[] {
  const tile = new VectorTile(new PbfReader(data instanceof Uint8Array ? data : new Uint8Array(data)));
  const layer = tile.layers.building; if (!layer) return [];
  const out: RawBuilding[] = [];
  for (let i = 0; i < layer.length; i++) {
    const f = layer.feature(i);
    if (f.type !== 3) continue;
    const props = f.properties, minH = Number(props.render_min_height ?? 0);
    if (minH > 0.5) continue;
    for (const poly of classifyRings(f.loadGeometry())) {
      const ring = poly[0]; if (!ring || ring.length < 4) continue;
      const mx = ring.reduce((s, p) => s + p.x, 0) / ring.length, my = ring.reduce((s, p) => s + p.y, 0) / ring.length;
      if (mx < 0 || my < 0 || mx >= f.extent || my >= f.extent) continue;
      let pts = ring.map((p): [number, number] => { const ll = tilePointToLatLon(z, x, y, p.x, p.y, f.extent), w = toRealXZ(city, ll.lat, ll.lon); return [r1(w.x), r1(w.z)]; });
      if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts = pts.slice(0, -1);
      if (pts.length < 3 || pts.length > 40) continue;
      const area = areaOf(pts); if (area < 12 || area > 15000) continue;                    // specks and giants (a whole industrial site) are left out
      const real = Number(props.render_height);
      out.push({ pts, height: Number.isFinite(real) && real > 0 ? Math.min(real, 300) : 9, area, key: hashOf(Math.round(pts[0][0] * 7 + pts[0][1] * 13) + (f.id ?? 0)) });
    }
  }
  return out;
}

/* ---------- geometry of one outline ---------- */
type P = [number, number];
const inside = (pts: P[], x: number, z: number): boolean => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) if ((pts[i][1] > z) !== (pts[j][1] > z) && x < ((pts[j][0] - pts[i][0]) * (z - pts[i][1])) / (pts[j][1] - pts[i][1]) + pts[i][0]) c = !c;
  return c;
};
const segDist = (px: number, pz: number, ax: number, az: number, bx: number, bz: number): number => {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
};
/** How far a point is from an outline (0 when it is inside). */
export function distToPolygon(pts: P[], x: number, z: number): number {
  if (inside(pts, x, z)) return 0;
  let d = Infinity; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; d = Math.min(d, segDist(x, z, a[0], a[1], b[0], b[1])); }
  return d;
}
/** The point of an outline nearest to a point outside it. */
export function nearestOnPolygon(pts: P[], x: number, z: number): { x: number; z: number } {
  let best = { x: pts[0][0], z: pts[0][1] }, bd = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2));
    const qx = a[0] + t * dx, qz = a[1] + t * dz, d = Math.hypot(x - qx, z - qz); if (d < bd) { bd = d; best = { x: qx, z: qz }; }
  }
  return best;
}

/* ---------- setting the places on real buildings ---------- */
const PLACE_MIN_AREA = 28, PLACE_MAX_AREA = 800;       // world square metres: big enough to read as a building of its own, small enough to look like one place
const REACH = 16;                                       // a place may stand on a building whose middle is this near to its spot on the game's map
const STAND_MIN = 1.4, STAND_MAX = 11;                   // the door side must be clear of the walls by this much, and not further away than this

/** Can a place whose people stand at `sp` use this building? The point where people stand must be outside the walls but near them, and the road from the hub to it must not cross the building. */
export function fitsPlace(pts: P[], sp: { x: number; z: number }): boolean {
  const d = distToPolygon(pts, sp.x, sp.z);
  if (d < STAND_MIN || d > STAND_MAX) return false;
  for (let k = 0; k <= 10; k++) { const t = k / 10, x = HUB.x + (sp.x - HUB.x) * t, z = HUB.z + (sp.z - HUB.z) * t; if (inside(pts, x, z) || (k > 0 && k < 10 && distToPolygon(pts, x, z) < 1.6)) return false; }
  return true;
}

interface Cand { i: number; cx: number; cz: number; pts: P[] }
interface Placed { raw: RawBuilding; pts: P[]; cx: number; cz: number; area: number }
const place = (raw: RawBuilding, cos: number, sin: number, s: number, ox: number, oz: number): Placed => {
  const pts = raw.pts.map((p): P => [r1((p[0] * cos - p[1] * sin) * s + ox), r1((p[0] * sin + p[1] * cos) * s + oz)]);
  const c = centroid(pts); return { raw, pts, cx: c.x, cz: c.z, area: raw.area * s * s };
};

/** Looks for the turn, the scale and the shift of the real city that put the most places on real buildings; returns that choice and the buildings chosen for the places. Pure and the same every time. */
export function layoutCity(raw: RawBuilding[], city: string): RealCity {
  const places = G.PLACES.map(p => ({ id: p.id, c: toWorld(p), sp: standPoint(p.id) }));
  const plain = (): RealCity => ({ buildings: fitToField(raw.map(b => toBuilding(place(b, 1, 0, REAL_SCALE, 0, 0))), city), anchors: {} });
  if (raw.length < 4) return plain();
  let best: { score: number; anchors: Map<string, Placed>; cos: number; sin: number; s: number; ox: number; oz: number } | null = null;
  const stepA = 15 * Math.PI / 180, seeds = pickSeeds(raw);
  for (let a = 0; a < Math.PI * 2 - 1e-6; a += stepA) {
    const cos = Math.cos(a), sin = Math.sin(a);
    for (const s of SCALES) {
      const moved = raw.map(b => place(b, cos, sin, s, 0, 0));
      const cand: Cand[] = []; moved.forEach((m, i) => { if (m.area >= PLACE_MIN_AREA && m.area <= PLACE_MAX_AREA && m.pts.length >= 4) cand.push({ i, cx: m.cx, cz: m.cz, pts: m.pts }); });
      if (cand.length < places.length) continue;
      const grid = new Map<string, Cand[]>(); const key = (gx: number, gz: number): string => gx + ',' + gz;
      for (const c of cand) { const k = key(Math.floor(c.cx / 12), Math.floor(c.cz / 12)); (grid.get(k) ?? grid.set(k, []).get(k)!).push(c); }
      for (const seed of seeds) {
        const m0 = moved[seed]; const ox = HUB.x - m0.cx, oz = HUB.z - m0.cz;       // the home is set on the seed building (its middle at the home's spot)
        const used = new Set<number>(); const got = new Map<string, Placed>(); let score = 0;
        for (const p of places) {
          let pick: { c: Cand; q: number } | null = null;
          const gx0 = Math.floor((p.c.x - ox - REACH) / 12), gx1 = Math.floor((p.c.x - ox + REACH) / 12), gz0 = Math.floor((p.c.z - oz - REACH) / 12), gz1 = Math.floor((p.c.z - oz + REACH) / 12);
          for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) for (const c of grid.get(key(gx, gz)) ?? []) {
            if (used.has(c.i)) continue;
            const dd = Math.hypot(c.cx + ox - p.c.x, c.cz + oz - p.c.z); if (dd > REACH) continue;
            const q = 1 - dd / (REACH * 2); if (pick && q <= pick.q) continue;
            const shifted = c.pts.map((v): P => [v[0] + ox, v[1] + oz]);
            if (fitsPlace(shifted, p.sp)) pick = { c, q };
          }
          if (pick) { used.add(pick.c.i); score += 1 + pick.q; got.set(p.id, place(raw[pick.c.i], cos, sin, s, ox, oz)); }
        }
        if (!best || score > best.score) best = { score, anchors: got, cos, sin, s, ox, oz };
      }
    }
  }
  if (!best || best.anchors.size === 0) return plain();
  const anchors: Record<string, RealBuilding> = {}; const anchored = new Set<RawBuilding>();
  for (const [id, pl] of best.anchors) { anchors[id] = { ...toBuilding(pl), place: id }; anchored.add(pl.raw); }
  const rest = raw.filter(b => !anchored.has(b)).map(b => toBuilding(place(b, best!.cos, best!.sin, best!.s, best!.ox, best!.oz)));
  return { buildings: fitToField(rest, city), anchors };
}

/** Where to try setting the home: an even spread of the buildings with four or more corners, at most 90 of them (the index into the list). */
function pickSeeds(list: RawBuilding[]): number[] {
  const idx = list.map((b, i) => (b.pts.length >= 4 ? i : -1)).filter(i => i >= 0), step = Math.max(1, Math.floor(idx.length / 90)), out: number[] = [];
  for (let k = 0; k < idx.length && out.length < 90; k += step) out.push(idx[k]);
  return out;
}

const toBuilding = (pl: Placed): RealBuilding => {
  const { h, kind } = shapeOf(pl.raw.height, pl.raw.area);
  const pal = kind === 'tower' || kind === 'block' ? TOWERS : WALLS;
  return { pts: pl.pts, h, kind, color: pal[pl.raw.key % pal.length] };
};

/* ---------- which houses may stand where ---------- */
/** Does any corner or the middle of this outline lie on a place, the hub or a road (with the width of the road and a little room)? */
function touchesThings(pts: [number, number][], c: { x: number; z: number }): boolean {
  const places = G.PLACES.map(toWorld), roads = roadSegments();
  for (const p of [c, ...pts.map(q => ({ x: q[0], z: q[1] }))]) {
    if (places.some(pl => Math.abs(pl.x - p.x) < 8 && Math.abs(pl.z - p.z) < 8)) return true;
    if (Math.hypot(HUB.x - p.x, HUB.z - p.z) < 9) return true;
    if (roads.some(r => segDist(p.x, p.z, r.from.x, r.from.z, r.to.x, r.to.z) < 4.4)) return true;
  }
  return false;
}

/** Keeps the buildings that fit the city: not on a place, the hub or a road, not in a park or the water, within REAL_REACH of the middle; the nearest MAX_BUILDINGS of them. */
export function fitToField(list: RealBuilding[], city: string, limit = MAX_BUILDINGS): RealBuilding[] {
  const parks = parksFor(city), water = waterRects(city);
  const keep = list.filter(b => {
    const c = centroid(b.pts), half = Math.max(...b.pts.map(p => Math.hypot(p[0] - c.x, p[1] - c.z)));
    if (Math.abs(c.x) > REAL_REACH || Math.abs(c.z) > REAL_REACH) return false;
    if (touchesThings(b.pts, c)) return false;
    if (parks.some(p => Math.abs(c.x - p.x) < p.w / 2 + half && Math.abs(c.z - p.z) < p.d / 2 + half)) return false;
    if (water.some(r => Math.abs(c.x - r.x) < r.w / 2 + half + 2 && Math.abs(c.z - r.z) < r.d / 2 + half + 2)) return false;
    return true;
  });
  return keep.sort((a, b) => { const ca = centroid(a.pts), cb = centroid(b.pts); return Math.hypot(ca.x, ca.z) - Math.hypot(cb.x, cb.z); }).slice(0, limit);
}

/* ---------- asking for the data, and keeping it ---------- */
const defaultKV = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
export const osmConsentGiven = (kv: KV | null = defaultKV()): boolean => { try { return kv?.getItem(OSM_CONSENT_KEY) === 'yes'; } catch { return false; } };
export function giveOsmConsent(kv: KV | null = defaultKV()): void { try { kv?.setItem(OSM_CONSENT_KEY, 'yes'); } catch { /* ignore */ } }
export function withdrawOsmConsent(kv: KV | null = defaultKV()): void { try { kv?.removeItem(OSM_CONSENT_KEY); } catch { /* ignore */ } }
export const cacheKey = (city: string): string => 'vrussia_osm_' + city;
const CACHE_MAX = 900_000, CACHE_VERSION = 8;

const validBuilding = (b: unknown): b is RealBuilding => { const x = b as RealBuilding; return Array.isArray(x?.pts) && x.pts.length >= 3 && Number.isFinite(x.h) && typeof x.color === 'string' && ['house', 'block', 'tower', 'shop'].includes(x.kind); };
/** What was kept on the device for this city, if it is whole and readable; otherwise null. */
export function cachedBuildings(city: string, kv: KV | null = defaultKV()): RealCity | null {
  try {
    const v = JSON.parse(kv?.getItem(cacheKey(city)) ?? 'null') as { v?: number; b?: unknown[]; a?: Record<string, unknown> } | null;
    if (!v || v.v !== CACHE_VERSION || !Array.isArray(v.b) || typeof v.a !== 'object' || !v.a) return null;
    const anchors: Record<string, RealBuilding> = {};
    for (const [id, b] of Object.entries(v.a)) if (G.PLACES.some(p => p.id === id) && validBuilding(b)) anchors[id] = b;
    return { buildings: v.b.filter(validBuilding), anchors };
  } catch { return null; }
}

export interface FetchDeps { fetch?: typeof fetch; kv?: KV | null; signal?: AbortSignal }
/** The real city: from the device if kept, otherwise one request for the tile list and a few for tiles. Throws a plain message on failure. */
export async function loadBuildings(city: string, d: FetchDeps = {}): Promise<RealCity> {
  const kv = d.kv === undefined ? defaultKV() : d.kv;
  const have = cachedBuildings(city, kv); if (have && have.buildings.length) return have;
  const f = d.fetch ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
  if (!f) throw new Error('This browser cannot load map data.');
  let template: string;
  try {
    const r = await f(TILEJSON_URL, { signal: d.signal }); if (!r.ok) throw new Error('bad');
    const tj = (await r.json()) as { tiles?: string[] }; template = tj.tiles?.[0] ?? ''; if (!template.includes('{z}')) throw new Error('bad');
  } catch (e) { if ((e as Error)?.name === 'AbortError') throw e; throw new Error('Could not reach the map service. Check the connection.'); }
  const tiles = tilesFor(city), all: RawBuilding[] = [];
  const results = await Promise.all(tiles.map(async t => {
    try { const r = await f(template.replace('{z}', String(TILE_ZOOM)).replace('{x}', String(t.x)).replace('{y}', String(t.y)), { signal: d.signal }); return r.ok ? { t, data: await r.arrayBuffer() } : null; }
    catch (e) { if ((e as Error)?.name === 'AbortError') throw e; return null; }
  }));
  if (!results.some(Boolean)) throw new Error('The map service did not answer. Try again in a minute.');
  for (const r of results) if (r) { try { all.push(...decodeTile(r.data, TILE_ZOOM, r.t.x, r.t.y, city)); } catch { /* a damaged tile is skipped */ } }
  const city3d = layoutCity(all, city);
  if (!city3d.buildings.length && !Object.keys(city3d.anchors).length) throw new Error('No buildings were found around the centre of this city.');
  try { const s = JSON.stringify({ v: CACHE_VERSION, b: city3d.buildings, a: city3d.anchors }); if (s.length <= CACHE_MAX) kv?.setItem(cacheKey(city), s); } catch { /* storage full: it will be asked for again next time */ }
  return city3d;
}
