/* The lay of each city for the 3D world: where the water is, what it is called, and where the ordinary houses, towers and parks stand.
   Pure data and rules, no graphics, so it is tested without a screen.
   The playable square (the game's 100 x 100 map, 130 x 130 metres) is land with roads to the places. Water lies beyond one or more edges of
   the square, so it never crosses a building. Names of rivers and seas are well-known general knowledge and are only labels. */
import * as G from './engine';
import { toWorld, HUB, WORLD } from './world-logic';
import { network, along, streetSegments, STREET_HALF, RING_R, RING_WALK } from './street';
import type { Edge } from './street';
import type { V2 } from './world-logic';

export type Side = 'n' | 'e' | 's' | 'w';
export interface Water { kind: 'river' | 'sea' | 'lake'; name: string; sides: Side[] }

/** The main water of each city. Where a city has none inside the game's square, the nearest river or sea is shown beyond one edge. */
export const WATER: Record<string, Water> = {
  Moscow: { kind: 'river', name: 'Moskva River', sides: ['e'] },
  'Saint Petersburg': { kind: 'river', name: 'Neva River', sides: ['n', 'w'] },
  Kazan: { kind: 'river', name: 'Kazanka River', sides: ['s'] },
  Yekaterinburg: { kind: 'lake', name: 'Iset Pond', sides: ['w'] },
  Novosibirsk: { kind: 'river', name: 'Ob River', sides: ['s'] },
  Krasnodar: { kind: 'river', name: 'Kuban River', sides: ['n'] },
  Sochi: { kind: 'sea', name: 'Black Sea', sides: ['s'] },
  Vladivostok: { kind: 'sea', name: 'Golden Horn Bay', sides: ['s', 'e'] },
  Grozny: { kind: 'river', name: 'Sunzha River', sides: ['w'] },
  'Nizhny Novgorod': { kind: 'river', name: 'Volga and Oka', sides: ['n', 'e'] },
  Samara: { kind: 'river', name: 'Volga River', sides: ['w'] },
  Kaliningrad: { kind: 'river', name: 'Pregolya River', sides: ['n'] },
  Saratov: { kind: 'river', name: 'Volga River', sides: ['e'] },
  Omsk: { kind: 'river', name: 'Irtysh River', sides: ['s'] },
  Chelyabinsk: { kind: 'river', name: 'Miass River', sides: ['n'] },
  'Rostov-on-Don': { kind: 'river', name: 'Don River', sides: ['s'] },
  Ufa: { kind: 'river', name: 'Belaya River', sides: ['e'] },
  Krasnoyarsk: { kind: 'river', name: 'Yenisei River', sides: ['w'] },
  Perm: { kind: 'river', name: 'Kama River', sides: ['n'] },
  Voronezh: { kind: 'lake', name: 'Voronezh Reservoir', sides: ['w'] },
  Volgograd: { kind: 'river', name: 'Volga River', sides: ['e'] },
  Tyumen: { kind: 'river', name: 'Tura River', sides: ['s'] },
  Tolyatti: { kind: 'lake', name: 'Zhiguli Sea (Volga)', sides: ['n'] },
  Izhevsk: { kind: 'lake', name: 'Izhevsk Pond', sides: ['e'] },
  Barnaul: { kind: 'river', name: 'Ob River', sides: ['w'] },
  Irkutsk: { kind: 'river', name: 'Angara River', sides: ['n'] },
  Ulyanovsk: { kind: 'river', name: 'Volga River', sides: ['s'] },
  Khabarovsk: { kind: 'river', name: 'Amur River', sides: ['e'] },
  Yakutsk: { kind: 'river', name: 'Lena River', sides: ['w'] },
  Murmansk: { kind: 'sea', name: 'Kola Bay', sides: ['e'] },
  Arkhangelsk: { kind: 'river', name: 'Northern Dvina', sides: ['n'] },
  Makhachkala: { kind: 'sea', name: 'Caspian Sea', sides: ['e'] },
  Tula: { kind: 'river', name: 'Upa River', sides: ['s'] },
  Yaroslavl: { kind: 'river', name: 'Volga River', sides: ['w'] },
  Vladimir: { kind: 'river', name: 'Klyazma River', sides: ['n'] },
  Pskov: { kind: 'river', name: 'Velikaya River', sides: ['w'] },
  'Veliky Novgorod': { kind: 'river', name: 'Volkhov River', sides: ['e'] },
};

/** The water of a city (unknown cities get a river to the east). */
export const waterFor = (city: string): Water => WATER[city] ?? { kind: 'river', name: 'River', sides: ['e'] };

/** The field: the land the game is played on is a square of this half-width (metres) around the centre, with a margin. */
export const FIELD_HALF = (WORLD * 100) / 2 + 12;
/** Water starts at the edge of the field; this is how wide it is before the far bank. */
export const WATER_WIDTH: Record<Water['kind'], number> = { river: 34, lake: 48, sea: 70 };

/** A rectangle of water beyond one edge of the field: its centre and size on the ground plane. */
export interface Rect { x: number; z: number; w: number; d: number }
export function waterRects(city: string): Rect[] {
  const w = waterFor(city), width = WATER_WIDTH[w.kind], long = FIELD_HALF * 2 + 70;
  return w.sides.map((side): Rect => {
    const off = FIELD_HALF + width / 2;
    return side === 'n' ? { x: 0, z: -off, w: long, d: width } : side === 's' ? { x: 0, z: off, w: long, d: width } : side === 'e' ? { x: off, z: 0, w: width, d: long } : { x: -off, z: 0, w: width, d: long };
  });
}

/** A bridge from the field across the first water side to the far bank: the deck's centre, direction and length. */
export function bridgeFor(city: string): { x: number; z: number; w: number; d: number; side: Side } {
  const w = waterFor(city), side = w.sides[0], width = WATER_WIDTH[w.kind], len = width + 14;
  const off = FIELD_HALF + width / 2 - 2;
  const b = side === 'n' ? { x: 12, z: -off, w: 5, d: len } : side === 's' ? { x: -12, z: off, w: 5, d: len } : side === 'e' ? { x: off, z: 12, w: len, d: 5 } : { x: -off, z: -12, w: len, d: 5 };
  return { ...b, side };
}

/* ---------- ordinary buildings and parks ---------- */
export type FillerKind = 'house' | 'tower' | 'shop';
export interface Filler { kind: FillerKind; x: number; z: number; w: number; d: number; h: number; color: string }
export interface Park { x: number; z: number; w: number; d: number; pitch: boolean }

const hashOf = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };
const rng = (seed: number): (() => number) => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return (s >>> 8) / 16777216; }; };

const distToSegment = (p: V2, a: V2, b: V2): number => {
  const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
};
/** Is this point clear of the places, the roads and the hub, with `margin` metres of room around a thing of half-size `half`? */
export function clearOfThings(p: V2, half: number, margin = 3): boolean {
  if (G.PLACES.some(pl => Math.hypot(toWorld(pl).x - p.x, toWorld(pl).z - p.z) < 9 + half + margin)) return false;
  if (Math.hypot(HUB.x - p.x, HUB.z - p.z) < RING_R + RING_WALK + 1.5 + half) return false;
  return streetSegments().every(seg => distToSegment(p, seg.from, seg.to) > STREET_HALF + half + Math.max(margin - 2, 0.5));
}

const WALLS = ['#e8d9c4', '#d9c8b4', '#c9d6c0', '#d8c3c3', '#c7d3e0', '#e5dcb8'];
const TOWERS = ['#9fb6c9', '#a9b8c2', '#8fa8b8', '#b3c2cc'];

/** The ordinary houses, towers and shops of a city, the same every time for the same city. Never on a road, a place or the hub. */
const fillerMemo = new Map<string, Filler[]>();
export function fillerFor(city: string): Filler[] { let f = fillerMemo.get(city); if (!f) { f = fillersOf(city); fillerMemo.set(city, f); } return f.map(x => ({ ...x })); }
function fillersOf(city: string): Filler[] {
  const r = rng(hashOf('filler|' + city));
  const out: Filler[] = [];
  const edge = (WORLD * 100) / 2 + 4;
  const wet = new Set(waterFor(city).sides);
  for (let i = 0; i < 260 && out.length < 46; i++) {
    const x = (r() * 2 - 1) * edge, z = (r() * 2 - 1) * edge;
    const kind: FillerKind = r() < 0.5 ? 'house' : r() < 0.6 ? 'tower' : 'shop';
    const w = kind === 'tower' ? 7 : kind === 'shop' ? 9 : 6, d = kind === 'tower' ? 7 : kind === 'shop' ? 7 : 6;
    const h = kind === 'tower' ? 14 + Math.floor(r() * 16) : kind === 'shop' ? 4 : 4.5 + Math.floor(r() * 2);
    const half = Math.max(w, d) / 2 + 1;
    const p = { x, z };
    if (!clearOfThings(p, half)) continue;
    if (out.some(o => Math.hypot(o.x - x, o.z - z) < (Math.max(o.w, o.d) + Math.max(w, d)) / 2 + 3)) continue;
    // keep a strip beside the water free for the bank
    if ((wet.has('e') && x > edge - 6) || (wet.has('w') && x < -edge + 6) || (wet.has('n') && z < -edge + 6) || (wet.has('s') && z > edge - 6)) continue;
    out.push({ kind, x, z, w, d, h, color: kind === 'tower' ? TOWERS[Math.floor(r() * TOWERS.length)] : WALLS[Math.floor(r() * WALLS.length)] });
  }
  return out;
}

/** A park may touch a road but not a building: its margin is smaller than the one for houses. */
export const PARK_MARGIN = -2.5;

/** Two parks, one with a pitch, in free spaces. */
export function parksFor(city: string): Park[] {
  const r = rng(hashOf('parks|' + city));
  const out: Park[] = [];
  const houses = fillerFor(city);
  for (let i = 0; i < 6000 && out.length < 2; i++) {
    const w = 14 + Math.floor(r() * 6), d = 12 + Math.floor(r() * 5);
    const p = { x: (r() * 2 - 1) * 58, z: (r() * 2 - 1) * 58 };
    if (!clearOfThings(p, Math.max(w, d) / 2, PARK_MARGIN)) continue;
    if (out.some(o => Math.hypot(o.x - p.x, o.z - p.z) < 24)) continue;
    if (houses.some(f => Math.abs(f.x - p.x) < (f.w + w) / 2 + 1 && Math.abs(f.z - p.z) < (f.d + d) / 2 + 1)) continue;
    out.push({ ...p, w, d, pitch: out.length === 1 });
  }
  return out;
}

/** Where the billboards stand: beside five of the roads, at spots found to be at least 13 metres from every building, facing the road. */
const BOARD_SPOTS: { place: string; t: number; side: 1 | -1 }[] = [{ place: 'shelter', t: 0.5, side: -1 }, { place: 'market', t: 0.6, side: -1 }, { place: 'center', t: 0.5, side: 1 }, { place: 'airport', t: 0.55, side: 1 }, { place: 'station', t: 0.6, side: 1 }];
export function billboardSpots(): { x: number; z: number; ry: number }[] {
  const net = network();
  return BOARD_SPOTS.map(b => {
    const e = net.edges.find(x => !x.ring && net.nodes[x.b].place === b.place) as Edge;
    // just outside the pavement, at the first spot along the street that is well away from every place and from the other streets
    for (const side of [b.side, -b.side]) for (const t of [b.t, 0.5, 0.4, 0.7, 0.3, 0.8, 0.2]) {
      const p = along(e, e.len * t, side * (STREET_HALF + 1.6)), nx = -Math.cos(p.heading), nz = Math.sin(p.heading);
      if (G.PLACES.every(pl => Math.hypot(toWorld(pl).x - p.x, toWorld(pl).z - p.z) > 13.5) && streetSegments().every(sg => distToSegment(p, sg.from, sg.to) > STREET_HALF + 1)) return { x: p.x, z: p.z, ry: Math.atan2(-nx * side, -nz * side) };
    }
    const p = along(e, e.len * b.t, b.side * (STREET_HALF + 1.6)); return { x: p.x, z: p.z, ry: 0 };
  });
}
