/* The real city (round 153): the streets, buildings, water, parks and places (metro stations, churches, mosques, shops, cafés, banks, clinics, schools,
   government offices...) of any Russian city, read from OpenStreetMap map tiles (OpenFreeMap, the same free service and the same consent as the real
   buildings), at real scale around a point. Also the walking network built from the streets, the shortest route between two points along it, and
   directions in words ("Walk 120 m along Tverskaya St, turn left onto ..."). Pure: no graphics and no network here (realworld3d.ts draws, the caller
   fetches), so it is tested on hand-made tiles. Map data © OpenStreetMap contributors (ODbL); the credit is shown wherever the map is shown. */
import { VectorTile, classifyRings } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { M_PER_DEG } from './osm';

export const ZOOM = 14;
export interface LatLon { lat: number; lon: number }
/** A point in metres from the origin of the real world: x east, z south. */
export interface XZ { x: number; z: number }

export type RoadClass = 'major' | 'street' | 'minor' | 'path' | 'rail';
export interface Road { pts: XZ[]; cls: RoadClass; name?: string; nameEn?: string }
export interface Building { pts: XZ[]; h: number; base: number }
export interface Area { pts: XZ[]; kind: 'water' | 'park' }
export type PoiKind = 'metro' | 'worship' | 'mosque' | 'church' | 'food' | 'shop' | 'grocery' | 'bank' | 'health' | 'pharmacy' | 'school' | 'uni' | 'gov' | 'police' | 'post' | 'culture' | 'park' | 'sport' | 'hotel' | 'transport' | 'other';
export interface Poi { id: string; name: string; nameEn?: string; kind: PoiKind; sub: string; at: XZ }
export interface Chunk { key: string; buildings: Building[]; roads: Road[]; areas: Area[]; pois: Poi[] }

/* ---------- tiles and coordinates ---------- */
export const tileOfLL = (p: LatLon, z = ZOOM): { x: number; y: number } => {
  const n = 2 ** z, r = (p.lat * Math.PI) / 180;
  return { x: Math.floor(((p.lon + 180) / 360) * n), y: Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n) };
};
export const llOfTilePoint = (z: number, tx: number, ty: number, px: number, py: number, extent: number): LatLon => {
  const n = 2 ** z, x = tx + px / extent, y = ty + py / extent;
  return { lon: (x / n) * 360 - 180, lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI };
};
/** Metres from `origin` (x east, z south): flat-earth, good to a few metres over a city. */
export const toXZ = (origin: LatLon, p: LatLon): XZ => ({ x: (p.lon - origin.lon) * M_PER_DEG * Math.cos((origin.lat * Math.PI) / 180), z: -(p.lat - origin.lat) * M_PER_DEG });
export const toLL = (origin: LatLon, p: XZ): LatLon => ({ lat: origin.lat - p.z / M_PER_DEG, lon: origin.lon + p.x / (M_PER_DEG * Math.cos((origin.lat * Math.PI) / 180)) });
/** The tiles to have around a point: the one it is in and its neighbours (3 x 3). */
export function tilesAround(p: LatLon, radius = 1, z = ZOOM): { x: number; y: number }[] {
  const c = tileOfLL(p, z), out: { x: number; y: number }[] = [];
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) out.push({ x: c.x + dx, y: c.y + dy });
  return out;
}

/* ---------- what the places are ---------- */
const DROP = new Set(['gate', 'lift_gate', 'bollard', 'waste_basket', 'bicycle_parking', 'parking', 'information', 'playground', 'pitch', 'toilets', 'bench', 'post_box', 'recycling', 'drinking_water', 'telephone', 'shelter', 'brownfield', 'entrance', 'atm', 'office', 'car', 'fuel', 'laundry', 'dog_park', 'running']);
/** The kind of a place in the game from its OpenStreetMap class and subclass; null for street furniture the game does not show. */
export function kindOf(cls: string, sub: string, name = ''): PoiKind | null {
  const n = name.toLowerCase();
  if (cls === 'railway' && (sub === 'subway' || sub === 'station' || sub === 'halt')) return sub === 'subway' ? 'metro' : 'transport';
  if (cls === 'entrance' && sub === 'subway_entrance') return 'metro';
  if (cls === 'place_of_worship') return sub === 'muslim' ? 'mosque' : sub === 'christian' ? 'church' : 'worship';
  if (cls === 'office' && (sub === 'government' || /мфц|мои документы|многофункциональн/.test(n))) return 'gov';
  if (cls === 'town_hall') return sub === 'townhall' || sub === 'courthouse' ? 'gov' : 'other';
  if (cls === 'police') return 'police';
  if (cls === 'post' && sub === 'post_office') return 'post';
  if (cls === 'hospital' || cls === 'doctors' || cls === 'dentist') return 'health';
  if (cls === 'pharmacy') return 'pharmacy';
  if (cls === 'school') return 'school';
  if (cls === 'college') return sub === 'university' ? 'uni' : 'school';
  if (cls === 'bank') return 'bank';
  if (['cafe', 'restaurant', 'fast_food', 'bar', 'beer', 'bakery', 'ice_cream'].includes(cls)) return 'food';
  if (cls === 'grocery' || cls === 'butcher') return 'grocery';
  if (['shop', 'clothing_store', 'alcohol_shop', 'music', 'bicycle'].includes(cls)) return 'shop';
  if (['museum', 'theatre', 'art_gallery', 'library', 'cinema', 'castle', 'attraction', 'zoo', 'monument'].includes(cls)) return 'culture';
  if (cls === 'park' || cls === 'garden') return 'park';
  if (['sports_centre', 'stadium', 'swimming_pool', 'yoga', 'fitness'].includes(cls)) return 'sport';
  if (cls === 'lodging') return 'hotel';
  if ((cls === 'bus' && sub === 'bus_stop') || (cls === 'railway' && sub === 'tram_stop')) return 'transport';
  if (DROP.has(cls)) return null;
  return name ? 'other' : null;
}
/** How each kind looks and what the player can do there: an action of the game (engine.ts actions), and words in both languages. */
export const KIND: Record<PoiKind, { icon: string; color: string; en: string; ru: string; action: string }> = {
  metro: { icon: 'M', color: '#d6332e', en: 'Metro', ru: 'Метро', action: 'travel' },
  transport: { icon: 'T', color: '#3b6fe0', en: 'Stop or station', ru: 'Остановка или станция', action: 'travel' },
  church: { icon: '✝', color: '#c9a24a', en: 'Church', ru: 'Храм', action: 'culture' },
  mosque: { icon: '☪', color: '#2a9d8f', en: 'Mosque', ru: 'Мечеть', action: 'culture' },
  worship: { icon: '✦', color: '#8a6ac9', en: 'Place of worship', ru: 'Место богослужения', action: 'culture' },
  gov: { icon: '§', color: '#1f4fa8', en: 'Government office', ru: 'Госучреждение', action: 'paper' },
  police: { icon: '★', color: '#1e2430', en: 'Police', ru: 'Полиция', action: 'paper' },
  post: { icon: '✉', color: '#2b6cb0', en: 'Post office', ru: 'Почта', action: 'out' },
  health: { icon: '+', color: '#e0373f', en: 'Clinic or hospital', ru: 'Поликлиника или больница', action: 'food' },
  pharmacy: { icon: '+', color: '#2f9e44', en: 'Pharmacy', ru: 'Аптека', action: 'out' },
  school: { icon: 'S', color: '#a56be0', en: 'School', ru: 'Школа', action: 'edu' },
  uni: { icon: 'U', color: '#7048c0', en: 'University', ru: 'Университет', action: 'edu' },
  bank: { icon: '₽', color: '#0f766e', en: 'Bank', ru: 'Банк', action: 'money' },
  food: { icon: '☕', color: '#c2410c', en: 'Café or restaurant', ru: 'Кафе или ресторан', action: 'food' },
  grocery: { icon: '◍', color: '#65a30d', en: 'Shop for food', ru: 'Продуктовый магазин', action: 'food' },
  shop: { icon: '◆', color: '#db2777', en: 'Shop', ru: 'Магазин', action: 'out' },
  culture: { icon: '♜', color: '#9e3626', en: 'Museum, theatre or sight', ru: 'Музей, театр или достопримечательность', action: 'culture' },
  park: { icon: '♣', color: '#3f7a52', en: 'Park', ru: 'Парк', action: 'out' },
  sport: { icon: '●', color: '#0e7490', en: 'Sport', ru: 'Спорт', action: 'out' },
  hotel: { icon: 'H', color: '#57534e', en: 'Hotel or hostel', ru: 'Гостиница или хостел', action: 'out' },
  other: { icon: '•', color: '#6b7280', en: 'Place', ru: 'Место', action: 'out' },
};
/** Which real kinds a place of the game is: going to the game's MFC looks for the nearest real government office, and so on. */
export const GAME_PLACE: Record<string, PoiKind[]> = { mfc: ['gov'], guvm: ['gov', 'police'], uni: ['uni', 'school'], market: ['grocery'], clinic: ['health'], hospital: ['health'], bank: ['bank'], center: ['culture'], mall: ['shop'], station: ['transport', 'metro'], shelter: ['other'] };

/* ---------- reading a tile ---------- */
const ROAD: Record<string, RoadClass> = { motorway: 'major', trunk: 'major', primary: 'major', secondary: 'street', tertiary: 'street', minor: 'minor', service: 'minor', track: 'path', path: 'path', rail: 'rail', transit: 'rail' };
type GP = { x: number; y: number };
export function readTile(data: ArrayBuffer | Uint8Array, z: number, tx: number, ty: number, origin: LatLon): Chunk {
  const t = new VectorTile(new PbfReader(data instanceof Uint8Array ? data : new Uint8Array(data)));
  const key = `${z}/${tx}/${ty}`, conv = (ext: number) => (p: GP): XZ => toXZ(origin, llOfTilePoint(z, tx, ty, p.x, p.y, ext));
  const out: Chunk = { key, buildings: [], roads: [], areas: [], pois: [] };
  const b = t.layers.building;
  if (b) for (let i = 0; i < b.length; i++) {
    const f = b.feature(i), c = conv(b.extent), pr = f.properties as Record<string, unknown>;
    const h = Math.max(3, Math.min(400, Number(pr.render_height) || 10)), base = Math.max(0, Number(pr.render_min_height) || 0);
    for (const poly of classifyRings(f.loadGeometry())) { const ring = poly[0]; if (ring && ring.length >= 4) out.buildings.push({ pts: ring.slice(0, -1).map(c), h, base }); }
  }
  for (const name of ['water', 'park'] as const) {
    const l = t.layers[name]; if (!l) continue;
    for (let i = 0; i < l.length; i++) { const f = l.feature(i); if (f.type !== 3) continue; const c = conv(l.extent); for (const poly of classifyRings(f.loadGeometry())) if (poly[0]?.length >= 4) out.areas.push({ pts: poly[0].map(c), kind: name }); }
  }
  const tr = t.layers.transportation, names = t.layers.transportation_name;
  // street names come as their own lines; each name is matched to the road lines that run along it
  const named: { pts: XZ[]; name: string; en?: string }[] = [];
  if (names) for (let i = 0; i < names.length; i++) { const f = names.feature(i), pr = f.properties as Record<string, string>; if (f.type !== 2 || !pr.name) continue; const c = conv(names.extent); for (const line of f.loadGeometry()) named.push({ pts: line.map(c), name: pr.name, en: pr['name:en'] || pr.name_en || undefined }); }
  if (tr) for (let i = 0; i < tr.length; i++) {
    const f = tr.feature(i), pr = f.properties as Record<string, string>, cls = ROAD[pr.class]; if (!cls || f.type !== 2 || pr.brunnel === 'tunnel') continue;
    const c = conv(tr.extent);
    for (const line of f.loadGeometry()) { const pts = line.map(c); if (pts.length < 2) continue; const nm = nameFor(pts, named); out.roads.push({ pts, cls, name: nm?.name, nameEn: nm?.en }); }
  }
  const p = t.layers.poi;
  if (p) for (let i = 0; i < p.length; i++) {
    const f = p.feature(i), pr = f.properties as Record<string, string>; if (f.type !== 1) continue;
    const name = pr['name:ru'] || pr.name || '', kind = kindOf(pr.class, pr.subclass, name); if (!kind || (!name && kind !== 'metro')) continue;
    const pt = f.loadGeometry()[0]?.[0]; if (!pt) continue;
    out.pois.push({ id: `${key}/${f.id ?? i}`, name: name || KIND[kind].ru, nameEn: pr['name:en'] || pr.name_en || undefined, kind, sub: pr.subclass || pr.class, at: conv(p.extent)(pt) });
  }
  return out;
}
/** The name line that runs along a road: the middles of the road's segments must all lie close to it (a single point can sit where two streets cross). */
function nameFor(pts: XZ[], named: { pts: XZ[]; name: string; en?: string }[]): { name: string; en?: string } | null {
  const probe: XZ[] = []; for (let i = 1; i < pts.length; i++) probe.push({ x: (pts[i - 1].x + pts[i].x) / 2, z: (pts[i - 1].z + pts[i].z) / 2 });
  let best: { name: string; en?: string } | null = null, bd = 6;
  for (const n of named) {
    let worst = 0;
    for (const q of probe) { let d = Infinity; for (let i = 1; i < n.pts.length; i++) d = Math.min(d, segDist(q, n.pts[i - 1], n.pts[i])); worst = Math.max(worst, d); if (worst >= bd) break; }
    if (worst < bd) { bd = worst; best = n; }
  }
  return best;
}
export function segDist(p: XZ, a: XZ, b: XZ): number {
  const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

/* ---------- the walking network ---------- */
export interface Graph { nodes: XZ[]; edges: { to: number; d: number; road: number }[][]; roads: Road[]; /** the connected piece each node belongs to, and the biggest piece (the city's street network) */ comp: Int32Array; main: number }
/** Everyone can walk every street except motorways and railways; nearby loose ends (where tiles meet) are joined. */
export function buildGraph(roads: Road[]): Graph {
  const g: Graph = { nodes: [], edges: [], roads, comp: new Int32Array(0), main: -1 }, index = new Map<string, number>();
  const node = (p: XZ): number => { const k = `${Math.round(p.x * 2)},${Math.round(p.z * 2)}`; let i = index.get(k); if (i === undefined) { i = g.nodes.length; index.set(k, i); g.nodes.push({ x: p.x, z: p.z }); g.edges.push([]); } return i; };
  roads.forEach((r, ri) => {
    if (r.cls === 'rail') return;
    for (let i = 1; i < r.pts.length; i++) { const a = node(r.pts[i - 1]), b = node(r.pts[i]); if (a === b) continue; const d = Math.hypot(g.nodes[a].x - g.nodes[b].x, g.nodes[a].z - g.nodes[b].z); g.edges[a].push({ to: b, d, road: ri }); g.edges[b].push({ to: a, d, road: ri }); }
  });
  // join dead ends that almost touch another node (lines cut at tile edges)
  const grid = new Map<string, number[]>(), cell = (p: XZ): string => `${Math.floor(p.x / 8)},${Math.floor(p.z / 8)}`;
  g.nodes.forEach((p, i) => { const k = cell(p); const l = grid.get(k); if (l) l.push(i); else grid.set(k, [i]); });
  g.nodes.forEach((p, i) => {
    if (g.edges[i].length !== 1) return;
    const cx = Math.floor(p.x / 8), cz = Math.floor(p.z / 8); let best = -1, bd = 6;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (const j of grid.get(`${cx + dx},${cz + dz}`) ?? []) { if (j === i || g.edges[i].some(e => e.to === j)) continue; const d = Math.hypot(g.nodes[j].x - p.x, g.nodes[j].z - p.z); if (d < bd) { bd = d; best = j; } }
    if (best >= 0) { const road = g.edges[i][0].road; g.edges[i].push({ to: best, d: bd, road }); g.edges[best].push({ to: i, d: bd, road }); }
  });
  // connected pieces: routes start and end on the biggest one, so a path inside a churchyard does not trap the walker
  g.comp = new Int32Array(g.nodes.length).fill(-1); let bestSize = 0;
  for (let i = 0, id = 0; i < g.nodes.length; i++) {
    if (g.comp[i] >= 0 || !g.edges[i].length) continue; let n = 0; const st = [i]; g.comp[i] = id;
    while (st.length) { const u = st.pop() as number; n++; for (const e of g.edges[u]) if (g.comp[e.to] < 0) { g.comp[e.to] = id; st.push(e.to); } }
    if (n > bestSize) { bestSize = n; g.main = id; } id++;
  }
  return g;
}
export function nearestNode(g: Graph, p: XZ): number {
  let best = -1, bd = Infinity;
  for (let i = 0; i < g.nodes.length; i++) { if (!g.edges[i].length || (g.main >= 0 && g.comp[i] !== g.main)) continue; const d = (g.nodes[i].x - p.x) ** 2 + (g.nodes[i].z - p.z) ** 2; if (d < bd) { bd = d; best = i; } }
  return best;
}
/** The shortest walk from one point to another along the streets (A*), as the list of node numbers; [] when there is no way. */
export function route(g: Graph, from: XZ, to: XZ): number[] {
  const s = nearestNode(g, from), t = nearestNode(g, to); if (s < 0 || t < 0) return [];
  if (s === t) return [s];
  const n = g.nodes.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n);
  const h = (i: number): number => Math.hypot(g.nodes[i].x - g.nodes[t].x, g.nodes[i].z - g.nodes[t].z);
  const heap: [number, number][] = []; const push = (f: number, i: number): void => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = (): [number, number] => { const top = heap[0], last = heap.pop() as [number, number]; if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  dist[s] = 0; push(h(s), s);
  while (heap.length) {
    const [, u] = pop(); if (done[u]) continue; done[u] = 1; if (u === t) break;
    for (const e of g.edges[u]) { const nd = dist[u] + e.d; if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = u; push(nd + h(e.to), e.to); } }
  }
  if (!done[t]) return [];
  const path: number[] = []; for (let k = t; k !== -1; k = prev[k]) path.push(k);
  return path.reverse();
}
export const pathLength = (g: Graph, path: number[]): number => path.slice(1).reduce((t, k, i) => t + Math.hypot(g.nodes[k].x - g.nodes[path[i]].x, g.nodes[k].z - g.nodes[path[i]].z), 0);

/* ---------- directions in words ---------- */
export interface Step { text: string; metres: number; at: XZ }
const roadOf = (g: Graph, a: number, b: number): Road | undefined => { const e = g.edges[a].find(x => x.to === b); return e ? g.roads[e.road] : undefined; };
const heading = (a: XZ, b: XZ): number => Math.atan2(b.x - a.x, -(b.z - a.z));
/** Turn the route into a few steps: a new step where the street changes or the way turns by more than 40 degrees. */
export function directions(g: Graph, path: number[], dest: string, ru: boolean): Step[] {
  if (!path.length) return [{ text: ru ? `Пешеходный путь до места «${dest}» не найден.` : `No walking way to ${dest} was found.`, metres: 0, at: { x: 0, z: 0 } }];
  if (path.length < 2) return [{ text: ru ? `Вы уже на месте: ${dest}.` : `You are already there: ${dest}.`, metres: 0, at: g.nodes[path[0]] }];
  const nameOf = (r?: Road): string => (r ? (ru ? r.name : r.nameEn || r.name) ?? '' : '');
  const legs: { name: string; metres: number; start: number; turn: number }[] = [];
  for (let i = 1; i < path.length; i++) {
    const a = g.nodes[path[i - 1]], b = g.nodes[path[i]], r = roadOf(g, path[i - 1], path[i]), nm = nameOf(r), m = Math.hypot(b.x - a.x, b.z - a.z);
    const last = legs[legs.length - 1];
    let turn = 0;
    if (i > 1) { const p = g.nodes[path[i - 2]]; turn = ((heading(a, b) - heading(p, a) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI; }
    if (last && (last.name === nm || !nm) && Math.abs(turn) < (40 * Math.PI) / 180) last.metres += m;
    else legs.push({ name: nm || last?.name || '', metres: m, start: i - 1, turn });
  }
  // keep the list readable: one step per named street, short unnamed bits (courtyards, paths) folded into the step before them
  const merged: typeof legs = [];
  for (const l of legs) {
    const prev = merged[merged.length - 1];
    if (prev && ((l.name && l.name === prev.name) || (!l.name && l.metres < 80))) prev.metres += l.metres;
    else merged.push({ ...l });
  }
  const round = (m: number): number => (m < 100 ? Math.round(m / 10) * 10 : Math.round(m / 50) * 50) || 10;
  // the street name stands on its own after a colon or a dash, so Russian names never have to be declined
  const steps: Step[] = merged.map((l, i) => {
    const side = l.turn > 0 ? (ru ? 'Направо' : 'right') : (ru ? 'Налево' : 'left'), m = round(l.metres);
    const text = i === 0
      ? (ru ? `Идите прямо ${m} м${l.name ? ` — ${l.name}` : ''}` : `Walk straight for ${m} m${l.name ? ` along ${l.name}` : ''}`)
      : l.name ? (ru ? `${side}: ${l.name}, ${m} м` : `Turn ${side} onto ${l.name}, ${m} m`) : (ru ? `${side}, затем прямо ${m} м` : `Turn ${side}, then straight for ${m} m`);
    return { text, metres: l.metres, at: g.nodes[path[l.start]] };
  });
  steps.push({ text: ru ? `Вы на месте: ${dest}.` : `You have arrived: ${dest}.`, metres: 0, at: g.nodes[path[path.length - 1]] });
  return steps;
}
/** Walking time at an ordinary pace (5 km/h), in whole minutes. */
export const walkMinutes = (metres: number): number => Math.max(1, Math.round(metres / 83));
/** Places whose name contains the words typed (Russian or English), nearest first. */
export function searchPois(pois: Poi[], q: string, near: XZ, limit = 12): Poi[] {
  const w = q.trim().toLowerCase(); if (!w) return [];
  // what people type is often a short name the map does not use: an MFC is "Многофункциональный центр..." or "Мои документы"
  const alias = /^(мфц|mfc)$/.test(w) ? /многофункциональн|мои документы|мфц/ : null;
  return pois.filter(p => (alias && alias.test(p.name.toLowerCase())) || p.name.toLowerCase().includes(w) || (p.nameEn ?? '').toLowerCase().includes(w) || KIND[p.kind].ru.toLowerCase().includes(w) || KIND[p.kind].en.toLowerCase().includes(w))
    .sort((a, b) => Math.hypot(a.at.x - near.x, a.at.z - near.z) - Math.hypot(b.at.x - near.x, b.at.z - near.z)).slice(0, limit);
}
/** The nearest real place of the kinds a place of the game stands for (the game's MFC → the nearest government office...). */
export function realFor(placeId: string, pois: Poi[], near: XZ): Poi | null {
  const kinds = GAME_PLACE[placeId]; if (!kinds) return null;
  const mfc = placeId === 'mfc' ? pois.filter(p => /мфц|мои документы|многофункциональн/i.test(p.name)) : [];
  const pool = mfc.length ? mfc : pois.filter(p => kinds.includes(p.kind));
  let best: Poi | null = null, bd = Infinity;
  for (const p of pool) { const d = Math.hypot(p.at.x - near.x, p.at.z - near.z); if (d < bd) { bd = d; best = p; } }
  return best;
}
