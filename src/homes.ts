/* Where the player lives. Every kind of person starts in a different kind of home, and the home grows with their life and their money:
   a bunk in a shared room for a worker who has just arrived, a dormitory room for a student, a panel-block flat for a family from the regions, a
   roomy flat in the capital for the rich, then (bought) a studio, a village house, or a house the player builds themself on a plot of land.
   Each home is a room with its own size, floor, walls, windows, lamps and furniture; the player can also renovate it (floor, walls, light, windows)
   for money. The look of a small home with a chequered floor, wall lamps and blinds was inspired by the other life game's starting room; the homes, the
   Russian life in them, the prices and the rules are ours. Pure data and functions over the game state (no graphics), tested without a screen. */
import type { State } from './engine';
import type { Interior, Prop, PropKind, RoomLook, FloorStyle, LightStyle, WindowStyle, InnerWall, Zone } from './interiors';
import { RENTALS } from './housing';
import { addressFor } from './address';
import type { Address } from './address';
import { lang } from './i18n';
import { cityName } from './i18n-words';

export type Dwelling = 'shared' | 'dorm' | 'panelka' | 'family' | 'studio' | 'village' | 'house' | 'kommunal' | 'khrush' | 'eurotwo';
/** The kind of building a home is in (round 151): it decides how the house looks in the 3D city and how many storeys it has. */
export type Building = 'khrush' | 'panel9' | 'panel16' | 'stalinka' | 'newbuild' | 'prerev' | 'dorm' | 'izba' | 'cottage';
export interface HomeInfo { id: Dwelling; name: string; blurb: string; tier: number; series: Building }

export const HOMES: HomeInfo[] = [
  { id: 'shared', tier: 1, series: 'panel9', name: 'A bunk in a shared room', blurb: 'Two bunks in one room of a rented flat, one bathroom with a queue and one gas stove. Everyone came for the same work, and everyone is saving.' },
  { id: 'dorm', tier: 2, series: 'dorm', name: 'A dormitory room', blurb: 'A block-type dormitory: two beds and two desks, a shower shared by the block, the kitchen down the corridor and a vahta at the door.' },
  { id: 'kommunal', tier: 2, series: 'prerev', name: 'A room in a kommunalka', blurb: "One room of an old flat shared by several families: the neighbours' doors along the corridor, a stove for each family in one kitchen, one bathroom for all." },
  { id: 'khrush', tier: 3, series: 'khrush', name: 'A one-room khrushchyovka', blurb: 'A five-storey block from the sixties without a lift: a tiny hallway, a combined bathroom, a six-metre kitchen with a gas stove and one room with a carpet on the wall.' },
  { id: 'panelka', tier: 3, series: 'panel9', name: 'A flat in a panel block', blurb: 'Two rooms in a grey nine-storey block: linoleum, a carpet on the wall, the stenka with the good cups and a separate kitchen.' },
  { id: 'family', tier: 5, series: 'stalinka', name: 'A roomy flat in a stalinka', blurb: 'A Stalin-era building: ceilings over three metres, thick walls, parquet, a chandelier and a kitchen where the whole family fits.' },
  { id: 'studio', tier: 4, series: 'newbuild', name: 'Your own studio', blurb: 'One bright room in a new block that is entirely yours: a kitchen along the wall, a sofa bed and a glazed loggia.' },
  { id: 'eurotwo', tier: 4, series: 'newbuild', name: 'A euro-two in a new block', blurb: 'The modern Russian layout: a kitchen-living room, one bedroom, a bathroom with a washing machine and a small wardrobe room.' },
  { id: 'village', tier: 4, series: 'izba', name: 'A village house', blurb: 'Log walls, the seni at the door, a big Russian stove, the red corner with the icons and an orchard outside.' },
  { id: 'house', tier: 6, series: 'cottage', name: 'The house you built', blurb: 'Your own walls, your own roof and a yard. Every plank was paid for by you.' },
];
export const homeInfo = (id: Dwelling): HomeInfo => HOMES.find(h => h.id === id) as HomeInfo;

/** Which home the player lives in now: what they own comes first, then what their life gave them (where they came from). */
export function dwellingOf(s: State): Dwelling {
  if (s.housing === 'house') return 'house';
  const moved = (s as State & { home2?: { rental?: string } }).home2?.rental;      // a rented home chosen in the phone's Home app (housing.ts)
  if (s.housing === 'rented' && moved) return RENTALS.find(r => r.id === moved)?.dwelling ?? dwellingOf({ ...s, home2: undefined } as State);
  if (s.housing === 'village') return 'village';
  if (s.housing === 'flat') return 'studio';
  switch (s.o) {
    case 'moscow': return 'family';
    case 'region': return 'panelka';
    case 'student': case 'dagestan': return 'dorm';
    case 'tajik': case 'uzbek': case 'kyrgyz': return 'shared';
    default: return 'panelka';
  }
}

/* ---------- renovation ---------- */
export interface RenoItem<T> { id: T; name: string; price: number; stars: number }
export const FLOORS: RenoItem<FloorStyle>[] = [
  { id: 'lino', name: 'Linoleum', price: 4000, stars: 0 }, { id: 'checker', name: 'Chequered tiles', price: 9000, stars: 1 },
  { id: 'plank', name: 'Wooden planks', price: 14000, stars: 1 }, { id: 'parquet', name: 'Parquet', price: 26000, stars: 2 },
];
export const WALLS: RenoItem<string>[] = [
  { id: '#e7d9a8', name: 'Cream', price: 3500, stars: 0 }, { id: '#f3f3ee', name: 'White', price: 3500, stars: 0 }, { id: '#bfd6c4', name: 'Sage green', price: 3500, stars: 0 },
  { id: '#c9d7ea', name: 'Sky blue', price: 3500, stars: 0 }, { id: '#e6c4bd', name: 'Rose', price: 3500, stars: 0 }, { id: '#d6b97a', name: 'Honey', price: 3500, stars: 0 },
  { id: '#9fb0c4', name: 'Slate', price: 3500, stars: 1 }, { id: '#e9c46a', name: 'Sun yellow', price: 3500, stars: 0 },
];
export const LIGHTS: RenoItem<LightStyle>[] = [
  { id: 'bare', name: 'A bare bulb', price: 0, stars: 0 }, { id: 'shade', name: 'Lamps with shades', price: 2000, stars: 1 }, { id: 'chandelier', name: 'A chandelier', price: 15000, stars: 2 },
];
export const WINDOWS: RenoItem<WindowStyle>[] = [
  { id: 'blinds', name: 'Blinds', price: 2000, stars: 0 }, { id: 'curtains', name: 'Curtains', price: 4000, stars: 1 }, { id: 'plain', name: 'Bare glass', price: 0, stars: 0 },
];
export interface Reno { floor?: FloorStyle; wall?: string; light?: LightStyle; windows?: WindowStyle }
export type RenoKind = 'floor' | 'wall' | 'light' | 'windows';

/** The renovations of the player (the book is made on first use; reading it never changes the state). */
export function renoOf(s: State): Reno { return ((s as State & { reno?: Reno }).reno) ?? {}; }
function renoBook(s: State): Reno { const x = s as State & { reno?: Reno }; if (!x.reno || typeof x.reno !== 'object') x.reno = {}; return x.reno; }

const listFor = (k: RenoKind): RenoItem<string>[] => (k === 'floor' ? FLOORS : k === 'wall' ? WALLS : k === 'light' ? LIGHTS : WINDOWS) as RenoItem<string>[];
export interface Done { ok: boolean; msg: string }
/** Pays for one renovation and records it (one change of one kind replaces the earlier one). Choosing what is already there costs nothing and changes nothing. */
export function renovate(s: State, kind: RenoKind, value: string): Done {
  const it = listFor(kind).find(x => x.id === value); if (!it) return { ok: false, msg: 'There is no such choice.' };
  const cur = currentLook(s), have = kind === 'floor' ? cur.floorStyle : kind === 'wall' ? designOf(s).wall : kind === 'light' ? cur.lights : cur.windows;
  if (have === value) return { ok: false, msg: 'It is already like that.' };
  if (s.money < it.price) return { ok: false, msg: 'Not enough money.' };
  s.money -= it.price; renoBook(s)[kind === 'windows' ? 'windows' : kind === 'light' ? 'light' : kind] = value as never;
  return { ok: true, msg: `${it.name}: done.` };
}
/** Stars of comfort from the renovations (they add to the furniture's). */
export function renoStars(s: State): number {
  const r = renoOf(s); const d = designOf(s);
  const f = FLOORS.find(x => x.id === (r.floor ?? d.look!.floorStyle))?.stars ?? 0, l = LIGHTS.find(x => x.id === (r.light ?? d.look!.lights))?.stars ?? 0, w = WINDOWS.find(x => x.id === (r.windows ?? d.look!.windows))?.stars ?? 0;
  return f + l + w;
}

/* ---------- the rooms ---------- */
const P = (kind: PropKind, x: number, z: number, w: number, d: number, extra: Partial<Prop> = {}): Prop => ({ kind, x, z, w, d, ...extra });
/** An inner wall along x at depth z (from x1 to x2), and one along z at x (from z1 to z2). A gap between two of them is a doorway. */
const T = 0.2;
const wx = (z: number, x1: number, x2: number): InnerWall => ({ x: (x1 + x2) / 2, z, w: x2 - x1, d: T });
const wz = (x: number, z1: number, z2: number): InnerWall => ({ x, z: (z1 + z2) / 2, w: T, d: z2 - z1 });
/** A named part of the flat (the floor between x1..x2 and z1..z2), with its own floor colour where it has tiles. */
const zone = (x1: number, z1: number, x2: number, z2: number, name: string, floor?: string): Zone => ({ x: (x1 + x2) / 2, z: (z1 + z2) / 2, w: x2 - x1, d: z2 - z1, name, floor });
const TILE = '#c9d6dc', KTILE = '#d8cdb8';

const LOOK = {
  shared: { floorStyle: 'lino', floorA: '#8e9a86', floorB: '#7d8a76', trim: '#4a5a48', windows: 'plain', lights: 'bare', deco: ['calendar'] },
  dorm: { floorStyle: 'lino', floorA: '#9aa7b8', floorB: '#8896a8', trim: '#4f5d70', windows: 'curtains', lights: 'bare', deco: ['poster', 'calendar'] },
  panelka: { floorStyle: 'lino', floorA: '#b0865a', floorB: '#a37a50', trim: '#5a3a24', windows: 'curtains', lights: 'shade', deco: ['carpet', 'calendar'] },
  family: { floorStyle: 'parquet', floorA: '#d9b98a', floorB: '#c9a574', trim: '#6a4a2c', windows: 'curtains', lights: 'chandelier', deco: ['poster'] },
  studio: { floorStyle: 'plank', floorA: '#e0cfae', floorB: '#d3bf9a', trim: '#8c7a5a', windows: 'blinds', lights: 'shade', deco: ['poster'] },
  village: { floorStyle: 'plank', floorA: '#b98a5c', floorB: '#a67a50', trim: '#5a3a24', windows: 'curtains', lights: 'bare', deco: ['icons', 'calendar'] },
  house: { floorStyle: 'parquet', floorA: '#d0a878', floorB: '#bf9566', trim: '#5a3a24', windows: 'curtains', lights: 'chandelier', deco: ['poster'] },
  kommunal: { floorStyle: 'parquet', floorA: '#b48a5a', floorB: '#a07a4c', trim: '#5a3a24', windows: 'curtains', lights: 'bare', deco: ['calendar', 'poster'] },
  khrush: { floorStyle: 'lino', floorA: '#b8916a', floorB: '#a8825c', trim: '#5a3a24', windows: 'curtains', lights: 'shade', deco: ['carpet', 'calendar'] },
  eurotwo: { floorStyle: 'plank', floorA: '#e4d6bc', floorB: '#d8c8aa', trim: '#9a8a6a', windows: 'blinds', lights: 'shade', deco: ['poster'] },
} as const satisfies Record<Dwelling, { floorStyle: FloorStyle; floorA: string; floorB: string; trim: string; windows: WindowStyle; lights: LightStyle; deco: readonly string[] }>;
const WALL: Record<Dwelling, string> = { shared: '#cfd8c6', dorm: '#e6e0cc', panelka: '#e8dcc0', family: '#e7d9a8', studio: '#f3f3ee', village: '#c9a574', house: '#eadcb8', kommunal: '#d9c9a8', khrush: '#e3d6b4', eurotwo: '#f2f0ea' };

interface Plan { w: number; d: number; props: Prop[]; occ: number; walls?: InnerWall[]; zones?: Zone[]; wallH?: number }
const bath = (x: number, z: number, w: number, d: number, label = 'Bath: wash up'): Prop => P('bath', x, z, w, d, { action: 'wash', label });
const shower = (x: number, z: number, w: number, d: number): Prop => P('bath', x, z, w, d, { action: 'wash', label: 'Shower: wash up', h: 0.3 });

/** The flat of each kind of home, laid out the way Russian flats are (round 151): a hallway at the front door, the bathroom and the kitchen off it, the rooms
   behind. Inner walls are waist high so that the whole flat is seen at once; a doorway is a gap between two walls. The door to the stairs is in the middle of the
   front (positive z); the things a player uses (bed, wardrobe, fridge, desk, bath, phone) are in every home. */
function rooms(s: State): Record<Dwelling, Plan> {
  const occ = s.partner ? 1 : 0;
  return {
    /* A two-room flat rented out by the bed: bunks, a shared bathroom with a queue and one gas stove for everyone. */
    shared: { w: 12, d: 10, occ: 2,
      walls: [wx(0.8, -6, -1.4), wx(0.8, 1.4, 6), wz(-2.6, 0.8, 2.2), wz(-2.6, 3.6, 5), wz(2.6, 0.8, 2.6)],
      zones: [zone(-6, -5, 6, 0.8, 'Room'), zone(-6, 0.8, -2.6, 5, 'Bathroom', TILE), zone(2.6, 0.8, 6, 5, 'Kitchen', KTILE), zone(-2.6, 0.8, 2.6, 5, 'Hallway')],
      props: [
        P('bunk', -4.8, -3.2, 1.6, 3.4, { action: 'home', label: 'Your bunk: rest at home', color: '#c9506b' }), P('bunk', -2.6, -3.2, 1.6, 3.4, { color: '#9aa7b8' }),
        P('bedside', -0.9, -4.4, 0.9, 0.8, { action: 'phone', label: 'Phone' }), P('wardrobe', 1.6, -4.4, 2.4, 0.9, { action: 'wardrobe', label: 'Your locker: change clothes' }),
        P('desk', 4.4, -4.2, 2.0, 1.0, { action: 'online', label: 'Small table: online services' }), P('table', 3.6, -1.8, 2.0, 1.2), P('chair', 2.3, -1.8, 0.9, 0.9, { ry: Math.PI / 2 }), P('chair', 4.9, -1.8, 0.9, 0.9, { ry: -Math.PI / 2 }),
        P('window', -1.0, -4.9, 2.6, 0.2), P('rug', -1.4, -1.0, 2.4, 1.4, { color: '#7a5a3a' }),
        bath(-5.2, 2.9, 1.4, 2.8, 'Bath: wash up (there is a queue every morning)'), P('toilet', -3.3, 4.3, 0.7, 0.8), P('sink', -3.3, 1.4, 0.8, 0.5),
        P('fridge', 5.3, 1.6, 1.0, 1.0, { action: 'food', label: 'Shared fridge: eat something' }), P('stove', 4.1, 1.6, 1.0, 0.8, { action: 'cook', label: 'Gas stove: cook' }),
      ] },
    /* A block-type dormitory: your room for two, and a shower and toilet shared by the block. */
    dorm: { w: 12, d: 9, occ: 1,
      walls: [wx(1.0, -6, -1.2), wx(1.0, 1.2, 6), wz(-2.6, 1.0, 2.0), wz(-2.6, 3.4, 4.5)],
      zones: [zone(-6, -4.5, 6, 1.0, 'Room'), zone(-6, 1.0, -2.6, 4.5, 'Shower and toilet', TILE), zone(-2.6, 1.0, 6, 4.5, 'The block corridor')],
      props: [
        P('bed', -4.6, -2.4, 2.0, 3.4, { action: 'home', label: 'Bed: rest at home', color: '#6b8fb8' }), P('bed', 4.6, -2.4, 2.0, 3.4, { color: '#9aa7b8' }),
        P('bedside', -2.9, -4.0, 0.9, 0.8, { action: 'phone', label: 'Phone' }), P('stove', -1.8, -4.0, 0.9, 0.8, { action: 'cook', label: 'Hot plate (officially not allowed): cook', h: 0.85 }),
        P('wardrobe', 0, -4.0, 2.4, 0.9, { action: 'wardrobe', label: 'Wardrobe: change clothes' }), P('fridge', 1.8, -4.0, 1.0, 0.9, { action: 'food', label: 'Small fridge: eat something' }),
        P('desk', -3.4, 0.1, 2.2, 1.0, { action: 'online', label: 'Desk: online services' }), P('laptop', -3.4, 0.1, 0.8, 0.6), P('chair', -3.0, -0.6, 0.9, 0.9, { ry: Math.PI }),
        P('desk', 3.4, 0.1, 2.2, 1.0), P('chair', 3.0, -0.6, 0.9, 0.9, { ry: Math.PI }), P('window', -2.6, -4.4, 2.4, 0.2), P('window', 3.4, -4.4, 2.4, 0.2), P('rug', 0, -1.6, 2.6, 1.8, { color: '#6b8fb8' }),
        shower(-5.0, 2.7, 1.6, 1.6), P('toilet', -3.3, 4.0, 0.7, 0.8), P('sink', -3.3, 1.5, 0.8, 0.5), P('hanger', 4.4, 1.4, 2.0, 0.5),
      ] },
    /* A two-room flat in a nine-storey panel block (a "brezhnevka"): the living room with the carpet on the wall and the stenka, a bedroom, a separate kitchen. */
    panelka: { w: 13, d: 11, occ: 1,
      walls: [wx(1.5, -6.5, -1.1), wx(1.5, 0.5, 1.2), wx(1.5, 2.5, 6.5), wz(1.0, -5.5, 1.5), wz(-2.5, 1.5, 2.6), wz(-2.5, 4.0, 5.5), wz(2.5, 1.5, 2.6), wz(2.5, 4.0, 5.5)],
      zones: [zone(-6.5, -5.5, 1.0, 1.5, 'Living room'), zone(1.0, -5.5, 6.5, 1.5, 'Bedroom'), zone(-6.5, 1.5, -2.5, 5.5, 'Bathroom', TILE), zone(2.5, 1.5, 6.5, 5.5, 'Kitchen', KTILE), zone(-2.5, 1.5, 2.5, 5.5, 'Hallway')],
      props: [
        P('sofa', -4.9, -1.6, 3.2, 1.4, { ry: Math.PI / 2, action: 'home', label: 'Sofa: stay in', color: '#8a5a3a' }), P('tv', -0.4, -4.35, 1.6, 0.4), P('stenka', -0.4, -5.1, 2.2, 0.7),
        P('table', -2.6, -2.0, 2.0, 1.4), P('chair', -2.6, -3.0, 0.9, 0.9), P('rug', -3.0, -1.4, 3.4, 2.4, { color: '#a5402e' }), P('window', -3.0, -5.4, 2.6, 0.2), P('plant', -6.0, 0.8, 0.7, 0.7),
        P('bed', 4.6, -3.4, 2.8, 3.4, { action: 'home', label: 'Bed: rest at home', color: '#c9506b' }), P('bedside', 2.6, -4.9, 0.9, 0.8, { action: 'phone', label: 'Phone' }),
        P('wardrobe', 5.9, -0.2, 1.0, 2.4, { action: 'wardrobe', label: 'Wardrobe (shkaf): change clothes' }), P('desk', 3.0, -0.6, 1.6, 0.9, { action: 'online', label: 'Desk: online services' }), P('laptop', 3.0, -0.6, 0.8, 0.6),
        P('window', 4.6, -5.4, 2.4, 0.2),
        P('fridge', 6.0, 2.1, 0.9, 0.9, { action: 'food', label: 'Fridge: eat something' }), P('stove', 4.9, 2.0, 1.0, 0.8, { action: 'cook', label: 'Gas stove: cook' }), P('counter', 3.6, 2.0, 1.1, 0.8),
        P('table', 5.0, 4.6, 1.6, 1.0), P('chair', 3.8, 4.6, 0.9, 0.9, { ry: Math.PI / 2 }),
        bath(-5.7, 3.4, 1.3, 3.0), P('sink', -3.4, 1.95, 0.8, 0.5), P('toilet', -3.3, 5.0, 0.7, 0.8), P('washer', -4.3, 5.05, 0.8, 0.8), P('hanger', -1.75, 1.85, 1.2, 0.5),
      ] },
    /* A big flat in a Stalin-era building (a "stalinka"): ceilings over three metres, parquet, a chandelier and a kitchen where the whole family fits. */
    family: { w: 16, d: 12, occ, wallH: 4.2,
      walls: [wx(1.6, -8, -1.4), wx(1.6, 0.4, 1.6), wx(1.6, 2.9, 8), wz(1.5, -6, 1.6), wz(-3.0, 1.6, 2.8), wz(-3.0, 4.4, 6), wz(3.0, 1.6, 2.8), wz(3.0, 4.4, 6)],
      zones: [zone(-8, -6, 1.5, 1.6, 'Living room'), zone(1.5, -6, 8, 1.6, 'Bedroom'), zone(-8, 1.6, -3, 6, 'Bathroom', TILE), zone(3, 1.6, 8, 6, 'Kitchen', KTILE), zone(-3, 1.6, 3, 6, 'Hallway')],
      props: [
        P('sofa', -6.0, -5.2, 3.0, 1.4, { action: 'home', label: 'Sofa: stay in', color: '#3b8f6e' }), P('tv', 0.4, -2.2, 0.5, 2.4), P('stenka', -2.6, -5.6, 3.0, 0.7), P('shelf', 0.3, -5.5, 1.8, 0.8),
        P('rug', -3.2, -2.2, 4.0, 3.0, { color: '#a56be0' }), P('plant', -7.4, 1.0, 0.8, 0.8), P('window', -3.6, -5.9, 3.0, 0.2), P('lamp', -1.0, 0.8, 0.6, 0.6),
        P('bed', 5.6, -3.6, 3.6, 4.2, { action: 'home', label: 'Bed: rest at home', color: '#e0735a' }), P('bedside', 3.2, -5.4, 1.0, 0.9, { action: 'phone', label: 'Phone' }),
        P('wardrobe', 7.4, 0.2, 1.0, 2.6, { action: 'wardrobe', label: 'Wardrobe: change clothes' }), P('desk', 4.4, 0.6, 2.2, 1.0, { action: 'online', label: 'Desk: online services' }), P('laptop', 4.4, 0.6, 0.8, 0.6),
        P('window', 5.6, -5.9, 2.6, 0.2),
        P('fridge', 7.4, 2.2, 1.0, 1.0, { action: 'food', label: 'Fridge: eat something' }), P('stove', 6.1, 2.25, 1.2, 0.9, { action: 'cook', label: 'Stove: cook' }), P('counter', 4.4, 2.25, 1.6, 0.9),
        P('table', 6.0, 4.6, 2.2, 1.4), P('chair', 4.6, 4.6, 0.9, 0.9, { ry: Math.PI / 2 }), P('chair', 7.4, 4.6, 0.9, 0.9, { ry: -Math.PI / 2 }),
        bath(-7.1, 3.8, 1.5, 3.2), P('sink', -4.0, 2.0, 0.9, 0.5), P('toilet', -3.9, 5.4, 0.7, 0.8), P('washer', -5.0, 5.5, 0.8, 0.8), P('hanger', -2.0, 2.0, 1.2, 0.5),
      ] },
    /* A studio in a new block: one bright room with the kitchen along the wall, a glazed loggia and a small bathroom by the door. */
    studio: { w: 12, d: 9, occ,
      walls: [wx(-3.3, -6, -1.0), wx(-3.3, 0.6, 6), wx(0.9, -6, -2.6), wz(-2.6, 0.9, 2.0), wz(-2.6, 3.4, 4.5)],
      zones: [zone(-6, -3.3, 6, 0.9, 'Room'), zone(-6, -4.5, 6, -3.3, 'Loggia'), zone(-6, 0.9, -2.6, 4.5, 'Bathroom', TILE), zone(-2.6, 0.9, 6, 4.5, 'Hallway')],
      props: [
        P('bed', -4.3, -1.4, 2.6, 3.0, { action: 'home', label: 'Sofa bed: rest at home', color: '#3b6fe0' }), P('bedside', -2.4, -2.7, 0.9, 0.8, { action: 'phone', label: 'Phone' }),
        P('fridge', 5.4, -2.6, 1.0, 1.0, { action: 'food', label: 'Fridge: eat something' }), P('stove', 5.4, -1.3, 1.0, 0.9, { action: 'cook', label: 'Hob: cook' }), P('counter', 5.4, -0.1, 1.0, 1.2),
        P('table', 2.8, -1.2, 1.6, 1.2), P('chair', 2.8, -2.3, 0.9, 0.9), P('chair', 2.8, -0.1, 0.9, 0.9, { ry: Math.PI }),
        P('wardrobe', 3.2, 3.9, 2.2, 0.8, { action: 'wardrobe', label: 'Wardrobe: change clothes' }), P('desk', 4.6, 2.2, 2.0, 1.0, { action: 'online', label: 'Desk: online services' }), P('laptop', 4.6, 2.2, 0.8, 0.6),
        P('plant', -4.5, -3.9, 0.7, 0.7), P('plant', 4.5, -3.9, 0.7, 0.7), P('item', 2.4, -3.9, 1.6, 0.6, { color: '#c9ced3', h: 1.0 }), P('window', -3.0, -4.4, 3.0, 0.2), P('window', 3.0, -4.4, 3.0, 0.2),
        shower(-5.1, 2.6, 1.4, 1.4), P('toilet', -3.3, 4.0, 0.7, 0.8), P('sink', -3.4, 1.35, 0.8, 0.5), P('washer', -5.2, 4.0, 0.8, 0.8),
      ] },
    /* An izba: the entrance hall (seni), the big Russian stove, the red corner with the icons and the table under them. */
    village: { w: 16, d: 12, occ,
      walls: [wz(-2.5, 2.4, 6), wz(2.5, 2.4, 6), wx(2.4, -2.5, -0.8), wx(2.4, 0.8, 2.5)],
      zones: [zone(-8, -6, 8, 2.4, 'Izba'), zone(-2.5, 2.4, 2.5, 6, 'Seni (entrance hall)')],
      props: [
        P('pech', 5.4, -3.4, 2.6, 2.4, { action: 'food', label: 'Russian stove (pech): cook' }),
        P('table', -5.4, -3.2, 3.0, 1.6), P('bench', -5.4, -4.6, 3.0, 0.6), P('wardrobe', -1.0, -5.4, 2.4, 1.0, { action: 'wardrobe', label: 'Wardrobe: change clothes' }),
        P('round', 1.6, -5.3, 0.8, 0.8, { action: 'wash', label: 'Washstand: wash up', color: '#3b6fe0', h: 0.45 }), P('rug', -1.0, -1.0, 3.6, 2.4, { color: '#9a5a3a' }),
        P('bed', -5.6, 4.1, 3.2, 3.4, { action: 'home', label: 'Bed with a quilt: rest at home', color: '#b3262e' }), P('bedside', -3.3, 5.4, 0.9, 0.8, { action: 'phone', label: 'Phone' }),
        P('desk', 5.6, 3.4, 2.2, 1.2, { action: 'online', label: 'Table: online services' }), P('laptop', 5.6, 3.4, 0.8, 0.6), P('sofa', 5.4, 5.3, 3.0, 1.2, { action: 'home', label: 'Settle: stay in', color: '#8a5a3a' }),
        P('tv', 7.6, 1.0, 0.5, 1.6), P('plant', 7.2, -0.6, 0.8, 0.8), P('hanger', 1.9, 2.75, 1.0, 0.5),
        P('window', -5.4, -5.9, 2.0, 0.2), P('window', 2.0, -5.9, 2.0, 0.2), P('window', -7.9, 0, 0.2, 2.2),
      ] },
    /* The house the player built: hallway, living room, bedroom, bathroom, kitchen-diner and a study. */
    house: { w: 20, d: 14, occ,
      walls: [wx(0, -10, -6.6), wx(0, -5.0, -1.6), wx(0, 0, 1.0), wx(0, 2.6, 10), wz(-3, -7, 0), wz(1, -7, 0), wz(-2.5, 0, 1.6), wz(-2.5, 3.2, 7), wz(2.5, 0, 1.6), wz(2.5, 3.2, 7)],
      zones: [zone(-10, -7, -3, 0, 'Bedroom'), zone(-3, -7, 1, 0, 'Bathroom', TILE), zone(1, -7, 10, 0, 'Kitchen-diner', KTILE), zone(-10, 0, -2.5, 7, 'Living room'), zone(-2.5, 0, 2.5, 7, 'Hallway'), zone(2.5, 0, 10, 7, 'Study')],
      props: [
        P('bed', -7.0, -4.4, 3.6, 4.2, { action: 'home', label: 'Bed: rest at home', color: '#c9506b' }), P('bedside', -4.6, -6.3, 1.0, 0.9, { action: 'phone', label: 'Phone' }),
        P('wardrobe', -9.4, -1.4, 1.0, 2.4, { action: 'wardrobe', label: 'Wardrobe: change clothes' }), P('window', -7.0, -6.9, 3.0, 0.2),
        bath(-2.1, -4.6, 1.3, 3.2), P('toilet', 0.4, -4.4, 0.7, 0.8), P('sink', 0.3, -6.4, 0.8, 0.5),
        P('stove', 5.0, -6.3, 1.6, 1.2, { action: 'cook', label: 'Stove: cook' }), P('fridge', 7.0, -6.3, 1.4, 1.2, { action: 'food', label: 'Fridge: eat something' }), P('counter', 3.0, -6.3, 1.8, 1.0),
        P('table', 6.4, -2.6, 3.2, 2.0), P('chair', 4.4, -2.6, 0.9, 0.9, { ry: Math.PI / 2 }), P('chair', 8.4, -2.6, 0.9, 0.9, { ry: -Math.PI / 2 }), P('chair', 6.4, -4.2, 0.9, 0.9), P('window', 6.0, -6.9, 3.0, 0.2),
        P('sofa', -8.0, 3.6, 4.0, 1.8, { ry: Math.PI / 2, action: 'home', label: 'Sofa: stay in', color: '#3b8f6e' }), P('tv', -3.4, 5.0, 0.5, 2.0), P('rug', -5.6, 3.6, 4.0, 3.0, { color: '#a56be0' }),
        P('item', -5.6, 6.2, 2.8, 1.0, { color: '#3a3f4a', h: 1.1 }), P('window', -9.9, 3.6, 0.2, 2.6),
        P('desk', 7.0, 4.6, 3.4, 1.4, { action: 'online', label: 'Desk: online services' }), P('laptop', 7.0, 4.6, 0.8, 0.6), P('chair', 7.0, 3.4, 0.9, 0.9, { ry: Math.PI }),
        P('shelf', 9.4, 2.0, 0.9, 2.4), P('lamp', 4.2, 5.8, 0.6, 0.6), P('plant', 9.2, 6.2, 0.8, 0.8), P('window', 9.9, 5.2, 0.2, 2.0), P('hanger', 1.85, 6.2, 1.0, 0.5),
      ] },
    /* A room in a kommunalka in an old house: your room, the neighbours' doors along the corridor, one kitchen with a stove for every family, one bathroom for all. */
    kommunal: { w: 14, d: 11, occ: 1, wallH: 4.0,
      walls: [wx(0.6, -7, -2.0), wx(0.6, -0.5, 0.3), wx(0.6, 1.9, 7), wz(-0.5, -5.5, 0.6), wz(-2.0, 0.6, 3.2), wz(-4.5, 0.6, 3.2), wx(3.2, -7, -2.0), wz(2.0, 0.6, 3.2), wx(3.2, 2.0, 3.6), wx(3.2, 5.2, 7)],
      zones: [zone(-7, -5.5, -0.5, 0.6, 'Your room'), zone(-0.5, -5.5, 7, 0.6, 'Shared kitchen', KTILE), zone(-7, 0.6, -2, 3.2, 'Neighbours'), zone(2, 0.6, 7, 3.2, 'Shared bathroom', TILE), zone(-7, 3.2, 7, 5.5, 'Corridor')],
      props: [
        P('bed', -5.4, -3.2, 2.6, 3.4, { action: 'home', label: 'Bed: rest at home', color: '#8a4a6a' }), P('bedside', -3.6, -5.0, 0.9, 0.8, { action: 'phone', label: 'Phone' }),
        P('wardrobe', -1.4, -4.9, 1.4, 0.9, { action: 'wardrobe', label: 'Wardrobe: change clothes' }), P('desk', -2.6, -1.0, 2.0, 0.9, { action: 'online', label: 'Desk: online services' }), P('laptop', -2.6, -1.0, 0.8, 0.6),
        P('tv', -6.6, -0.4, 0.5, 1.4), P('window', -4.0, -5.4, 2.6, 0.2), P('rug', -4.4, -1.0, 2.4, 1.6, { color: '#7a3a2e' }),
        P('counter', 0.6, -5.0, 1.4, 0.8), P('stove', 2.0, -5.0, 1.0, 0.8, { action: 'cook', label: 'Your stove: cook' }), P('stove', 3.4, -5.0, 1.0, 0.8), P('stove', 4.8, -5.0, 1.0, 0.8),
        P('fridge', 6.3, -4.9, 0.9, 0.9, { action: 'food', label: 'Your fridge (it has a lock): eat something' }),
        P('table', 1.0, -2.2, 1.4, 1.0), P('table', 3.2, -2.2, 1.4, 1.0), P('table', 5.4, -2.2, 1.4, 1.0), P('window', 3.4, -5.4, 2.6, 0.2),
        P('door', -5.75, 3.36, 1.0, 0.1, { color: '#7a4a2e' }), P('door', -3.25, 3.36, 1.0, 0.1, { color: '#6a5a3a' }),
        bath(6.1, 1.9, 1.4, 2.2, 'Shared bath (mind the queue): wash up'), P('toilet', 2.6, 1.2, 0.7, 0.8), P('sink', 4.2, 0.95, 0.8, 0.5),
        P('item', -6.2, 4.6, 1.6, 0.5, { color: '#3b6fe0', h: 1.0 }), P('hanger', 5.9, 3.55, 1.2, 0.5),
      ] },
    /* A one-room flat in a five-storey khrushchyovka: a small hallway, a combined bathroom, a six-metre kitchen with a gas stove, one room with the carpet. */
    khrush: { w: 12, d: 9, occ,
      walls: [wx(0.7, -6, -1.6), wx(0.7, 0, 3.2), wx(0.7, 4.8, 6), wz(2.4, -4.5, 0.7), wz(-2.6, 0.7, 1.6), wz(-2.6, 3.2, 4.5)],
      zones: [zone(-6, -4.5, 2.4, 0.7, 'Room'), zone(2.4, -4.5, 6, 0.7, 'Kitchen', KTILE), zone(-6, 0.7, -2.6, 4.5, 'Bathroom', TILE), zone(-2.6, 0.7, 6, 4.5, 'Hallway')],
      props: [
        P('bed', -4.4, -2.7, 2.6, 3.2, { action: 'home', label: 'Sofa bed: rest at home', color: '#a5402e' }), P('bedside', -2.5, -4.0, 0.9, 0.8, { action: 'phone', label: 'Phone' }),
        P('stenka', 0.3, -4.1, 2.8, 0.7), P('tv', 1.95, -2.0, 0.4, 1.6), P('desk', 0.9, -0.3, 2.0, 0.9, { action: 'online', label: 'Desk: online services' }), P('laptop', 0.9, -0.3, 0.8, 0.6),
        P('chair', 0.9, -1.2, 0.9, 0.9, { ry: Math.PI }), P('rug', -2.0, -1.6, 3.0, 2.0, { color: '#9a2a2e' }), P('window', -2.0, -4.4, 2.6, 0.2),
        P('fridge', 5.3, -3.9, 1.0, 1.0, { action: 'food', label: 'Fridge: eat something' }), P('stove', 4.1, -4.0, 1.0, 0.8, { action: 'cook', label: 'Gas stove: cook' }), P('counter', 3.05, -4.0, 1.1, 0.8),
        P('table', 5.4, -1.2, 1.0, 1.4), P('window', 4.2, -4.4, 1.8, 0.2),
        bath(-5.2, 2.6, 1.3, 2.8), P('toilet', -3.3, 4.0, 0.7, 0.8), P('sink', -3.4, 1.2, 0.8, 0.5),
        P('wardrobe', 5.3, 2.6, 1.0, 2.2, { action: 'wardrobe', label: 'Built-in cupboard: change clothes' }), P('hanger', 1.4, 1.05, 1.2, 0.5),
      ] },
    /* A "euro-two" in a new block: a kitchen-living room, one bedroom, a bathroom and a small wardrobe room. */
    eurotwo: { w: 13, d: 10, occ,
      walls: [wz(0.8, -5, 1.8), wx(1.8, -6.5, -1.6), wx(1.8, 0.0, 1.2), wx(1.8, 2.6, 6.5), wz(-2.4, 1.8, 2.6), wz(-2.4, 4.0, 5)],
      zones: [zone(-6.5, -5, 0.8, 1.8, 'Kitchen-living room'), zone(-6.5, -5, -2.4, -3.6, 'Kitchen', KTILE), zone(0.8, -5, 6.5, 1.8, 'Bedroom'), zone(-6.5, 1.8, -2.4, 5, 'Bathroom', TILE), zone(-2.4, 1.8, 2.4, 5, 'Hallway'), zone(2.4, 1.8, 6.5, 5, 'Wardrobe room')],
      props: [
        P('fridge', -5.9, -4.4, 1.0, 1.0, { action: 'food', label: 'Fridge: eat something' }), P('stove', -4.6, -4.5, 1.2, 0.8, { action: 'cook', label: 'Induction hob: cook' }), P('counter', -3.2, -4.5, 1.6, 0.8),
        P('table', -4.0, -1.8, 2.2, 1.2), P('chair', -5.5, -1.8, 0.9, 0.9, { ry: Math.PI / 2 }), P('sofa', -0.4, -2.0, 3.0, 1.4, { ry: Math.PI / 2, action: 'home', label: 'Sofa: stay in', color: '#5a6b8c' }), P('tv', -6.2, -1.0, 0.4, 1.8),
        P('rug', -2.6, 0.2, 2.6, 1.6, { color: '#5a6b8c' }), P('window', -3.4, -4.9, 3.0, 0.2),
        P('bed', 3.9, -3.0, 2.8, 3.4, { action: 'home', label: 'Bed: rest at home', color: '#3b6fe0' }), P('bedside', 1.6, -4.4, 0.9, 0.8, { action: 'phone', label: 'Phone' }),
        P('desk', 4.9, 0.9, 2.2, 1.0, { action: 'online', label: 'Desk: online services' }), P('laptop', 4.9, 0.9, 0.8, 0.6), P('chair', 4.9, 0.0, 0.9, 0.9, { ry: Math.PI }), P('window', 3.9, -4.9, 2.6, 0.2),
        bath(-5.6, 3.3, 1.3, 2.8), P('toilet', -3.0, 4.5, 0.7, 0.8), P('sink', -3.2, 2.2, 0.8, 0.5), P('washer', -4.1, 4.55, 0.8, 0.8),
        P('wardrobe', 4.6, 2.4, 3.0, 0.9, { action: 'wardrobe', label: 'Wardrobe room: change clothes' }),
      ] },
  };
}

/** The look of the home as it is now: the home's own, changed by whatever the player has renovated. */
export function currentLook(s: State): RoomLook {
  const id = dwellingOf(s), base: RoomLook = { ...LOOK[id], deco: [...LOOK[id].deco] }, r = renoOf(s);
  if (r.floor) base.floorStyle = r.floor; if (r.light) base.lights = r.light; if (r.windows) base.windows = r.windows;
  return base;
}

/** The whole room of the player's home, ready to draw and to walk in. */
/** Where the player lives: the address of the home they have now (round 151). */
export function addressOf(s: State): Address { const id = dwellingOf(s); return addressFor(s, id, homeInfo(id).series, cityName(s.city)); }

export function designOf(s: State): Interior {
  const id = dwellingOf(s), r = rooms(s)[id], info = homeInfo(id), reno = renoOf(s), look = currentLook(s);
  const wall = reno.wall ?? WALL[id];
  const floorA = FLOORS.some(f => f.id === reno.floor) ? floorColors(reno.floor as FloorStyle)[0] : look.floorA, floorB = FLOORS.some(f => f.id === reno.floor) ? floorColors(reno.floor as FloorStyle)[1] : look.floorB;
  return { id: 'home', title: info.name, w: r.w, d: r.d, floor: floorA, wall, occupants: r.occ, look: { ...look, floorA, floorB }, props: r.props, walls: r.walls, zones: r.zones, wallH: r.wallH, address: lang() === 'ru' ? addressOf(s).ru : addressOf(s).en };
}
function floorColors(f: FloorStyle): [string, string] { return f === 'parquet' ? ['#d9b98a', '#c9a574'] : f === 'plank' ? ['#d6b886', '#c4a470'] : f === 'checker' ? ['#c9a06a', '#a9784a'] : ['#b8b0a0', '#a89f8e']; }
