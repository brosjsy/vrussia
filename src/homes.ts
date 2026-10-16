/* Where the player lives. Every kind of person starts in a different kind of home, and the home grows with their life and their money:
   a bunk in a shared room for a worker who has just arrived, a dormitory room for a student, a panel-block flat for a family from the regions, a
   roomy flat in the capital for the rich, then (bought) a studio, a village house, or a house the player builds themself on a plot of land.
   Each home is a room with its own size, floor, walls, windows, lamps and furniture; the player can also renovate it (floor, walls, light, windows)
   for money. The look of a small home with a chequered floor, wall lamps and blinds was inspired by the other life game's starting room; the homes, the
   Russian life in them, the prices and the rules are ours. Pure data and functions over the game state (no graphics), tested without a screen. */
import type { State } from './engine';
import type { Interior, Prop, PropKind, RoomLook, FloorStyle, LightStyle, WindowStyle } from './interiors';

export type Dwelling = 'shared' | 'dorm' | 'panelka' | 'family' | 'studio' | 'village' | 'house';
export interface HomeInfo { id: Dwelling; name: string; blurb: string; tier: number }

export const HOMES: HomeInfo[] = [
  { id: 'shared', tier: 1, name: 'A bunk in a shared room', blurb: 'Four beds in one room, a kettle, bags under the bunks. Everyone came for the same work, and everyone is saving.' },
  { id: 'dorm', tier: 2, name: 'A dormitory room', blurb: 'Two beds, two desks, a shared kitchen down the corridor and a vahta at the door.' },
  { id: 'panelka', tier: 3, name: 'A flat in a panel block', blurb: 'Two rooms in a grey nine-storey block: linoleum, a carpet on the wall, a sideboard with the good cups.' },
  { id: 'family', tier: 5, name: 'A roomy family flat', blurb: 'High ceilings, parquet, a chandelier and a kitchen where the whole family fits.' },
  { id: 'studio', tier: 4, name: 'Your own studio', blurb: 'One bright room that is entirely yours: a kitchenette, a sofa bed and a big window.' },
  { id: 'village', tier: 4, name: 'A village house', blurb: 'Log walls, a big Russian stove, an icon corner and an orchard outside.' },
  { id: 'house', tier: 6, name: 'The house you built', blurb: 'Your own walls, your own roof and a yard. Every plank was paid for by you.' },
];
export const homeInfo = (id: Dwelling): HomeInfo => HOMES.find(h => h.id === id) as HomeInfo;

/** Which home the player lives in now: what they own comes first, then what their life gave them (where they came from). */
export function dwellingOf(s: State): Dwelling {
  if (s.housing === 'house') return 'house';
  const moved = (s as State & { home2?: { rental?: string } }).home2?.rental;      // a rented home chosen in the phone's Home app (housing.ts)
  if (s.housing === 'rented' && moved) return moved === 'kommunalka' ? 'panelka' : moved === 'studio' ? 'studio' : moved === 'tworoom' ? 'family' : dwellingOf({ ...s, home2: undefined } as State);
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

const LOOK = {
  shared: { floorStyle: 'lino', floorA: '#8e9a86', floorB: '#7d8a76', trim: '#4a5a48', windows: 'plain', lights: 'bare', deco: ['calendar'] },
  dorm: { floorStyle: 'lino', floorA: '#9aa7b8', floorB: '#8896a8', trim: '#4f5d70', windows: 'curtains', lights: 'bare', deco: ['poster', 'calendar'] },
  panelka: { floorStyle: 'lino', floorA: '#b0865a', floorB: '#a37a50', trim: '#5a3a24', windows: 'curtains', lights: 'shade', deco: ['carpet', 'calendar'] },
  family: { floorStyle: 'parquet', floorA: '#d9b98a', floorB: '#c9a574', trim: '#6a4a2c', windows: 'curtains', lights: 'chandelier', deco: ['poster'] },
  studio: { floorStyle: 'plank', floorA: '#e0cfae', floorB: '#d3bf9a', trim: '#8c7a5a', windows: 'blinds', lights: 'shade', deco: ['poster'] },
  village: { floorStyle: 'plank', floorA: '#b98a5c', floorB: '#a67a50', trim: '#5a3a24', windows: 'curtains', lights: 'bare', deco: ['icons', 'calendar'] },
  house: { floorStyle: 'parquet', floorA: '#d0a878', floorB: '#bf9566', trim: '#5a3a24', windows: 'curtains', lights: 'chandelier', deco: ['poster'] },
} as const satisfies Record<Dwelling, { floorStyle: FloorStyle; floorA: string; floorB: string; trim: string; windows: WindowStyle; lights: LightStyle; deco: readonly string[] }>;
const WALL: Record<Dwelling, string> = { shared: '#cfd8c6', dorm: '#e6e0cc', panelka: '#e8dcc0', family: '#e7d9a8', studio: '#f3f3ee', village: '#c9a574', house: '#eadcb8' };

/** The room of each home. The door is in the middle of the front wall (positive z); the things a player can use (bed, wardrobe, fridge, desk, bucket) are in every home. */
function rooms(s: State): Record<Dwelling, { w: number; d: number; props: Prop[]; occ: number }> {
  const bed = (x: number, z: number, own: boolean, color = '#e0735a'): Prop => (own ? P('bed', x, z, 2.2, 3.6, { action: 'home', label: 'Bed: rest at home', color }) : P('bed', x, z, 2.2, 3.6, { color: '#9aa7b8' }));
  const bucket = (x: number, z: number): Prop => P('round', x, z, 0.8, 0.8, { action: 'wash', label: 'Bucket: wash up', color: '#3b6fe0', h: 0.45 });
  return {
    shared: { w: 12, d: 9, occ: 2, props: [
      bed(-4.6, -2.2, true), bed(-2.2, -2.2, false), bed(0.2, -2.2, false), bed(2.6, -2.2, false),
      P('bedside', -4.6, -4.3, 1.0, 0.8, { action: 'phone', label: 'Phone' }), P('wardrobe', 5.0, -3.6, 1.2, 1.0, { action: 'wardrobe', label: 'Your locker: change clothes' }),
      P('fridge', -4.6, 0.6, 1.0, 1.0, { action: 'food', label: 'Shared fridge: eat something' }), bucket(-4.6, 2.2), P('stove', -3.2, 0.6, 0.9, 0.8, { action: 'cook', label: 'Shared hot plate: cook', h: 0.85 }),
      P('table', 0, 0.2, 2.0, 1.2), P('chair', -1.3, 0.2, 0.9, 0.9, { ry: Math.PI / 2 }), P('chair', 1.3, 0.2, 0.9, 0.9, { ry: -Math.PI / 2 }),
      P('desk', 3.6, 1.2, 1.8, 1.0, { action: 'online', label: 'Small table: online services' }), P('window', 0, -4.4, 2.6, 0.2), P('plant', 4.6, 3.2, 0.7, 0.7),
    ] },
    dorm: { w: 12, d: 9, occ: 1, props: [
      bed(-4.4, -2.4, true, '#6b8fb8'), bed(4.4, -2.4, false), P('bedside', -2.6, -4.2, 1.0, 0.8, { action: 'phone', label: 'Phone' }),
      P('wardrobe', 0, -4.0, 2.4, 1.0, { action: 'wardrobe', label: 'Wardrobe: change clothes' }), P('fridge', -5.2, 0.8, 1.0, 1.0, { action: 'food', label: 'Small fridge: eat something' }), bucket(0.6, -1.6), P('stove', 0.9, 0.9, 0.9, 0.8, { action: 'cook', label: 'Hot plate: cook', h: 0.85 }),
      P('desk', -3.2, 2.6, 2.2, 1.0, { action: 'online', label: 'Desk: online services' }), P('laptop', -3.2, 2.6, 0.8, 0.6), P('desk', 4.0, 2.6, 2.2, 1.0), P('chair', -3.2, 1.5, 0.9, 0.9, { ry: Math.PI }),
      P('table', 2.6, 0.2, 1.6, 1.2), P('chair', 2.6, -1.0, 0.9, 0.9), P('window', -2.6, -4.4, 2.4, 0.2), P('window', 3.4, -4.4, 2.4, 0.2), P('plant', 5.4, 0.8, 0.7, 0.7), P('rug', 0, 0.6, 2.6, 1.8, { color: '#6b8fb8' }),
    ] },
    panelka: { w: 12, d: 10, occ: 1, props: [
      P('bed', -4.2, -3.0, 2.8, 3.6, { action: 'home', label: 'Bed: rest at home', color: '#c9506b' }), P('bedside', -2.2, -4.3, 1.0, 0.9, { action: 'phone', label: 'Phone' }),
      P('wardrobe', 0.2, -4.4, 2.6, 1.0, { action: 'wardrobe', label: 'Wardrobe (shkaf): change clothes' }), P('shelf', 2.6, -4.4, 2.0, 1.0, { color: '#6a3f24' }),
      P('fridge', 4.8, -3.6, 1.2, 1.2, { action: 'food', label: 'Fridge: eat something' }), P('stove', 4.8, -2.0, 1.2, 1.2, { action: 'cook', label: 'Stove: cook' }), bucket(2.6, -2.6),
      P('table', 3.6, 0.6, 2.2, 1.6), P('chair', 2.2, 0.6, 0.9, 0.9, { ry: Math.PI / 2 }), P('chair', 5.0, 0.6, 0.9, 0.9, { ry: -Math.PI / 2 }),
      P('sofa', -4.4, 2.4, 3.2, 1.6, { ry: Math.PI / 2, action: 'home', label: 'Sofa: stay in', color: '#8a5a3a' }), P('tv', -5.6, 2.4, 0.5, 2.0, { ry: Math.PI / 2 }),
      P('desk', 3.6, 3.2, 2.4, 1.2, { action: 'online', label: 'Desk: online services' }), P('laptop', 3.6, 3.2, 0.8, 0.6), P('window', -1.0, -4.9, 2.6, 0.2), P('plant', -5.5, -0.3, 0.7, 0.7), P('rug', -1.0, 1.0, 3.4, 2.4, { color: '#a5402e' }),
    ] },
    family: { w: 14, d: 11, occ: s.partner ? 1 : 0, props: [
      P('bed', -4.6, -3.4, 3.6, 4.4, { action: 'home', label: 'Bed: rest at home', color: '#e0735a' }), P('bedside', -2.2, -4.6, 1.2, 1.2, { label: 'Phone', action: 'phone' }),
      P('wardrobe', 0.4, -5, 3, 1.2, { action: 'wardrobe', label: 'Wardrobe: change clothes' }),
      bucket(1.6, -3.3), P('fridge', 5.2, -4.8, 1.6, 1.4, { action: 'food', label: 'Fridge: eat something' }), P('stove', 3.4, -4.8, 1.8, 1.4, { action: 'cook', label: 'Stove: cook' }),
      P('table', 4.2, -0.6, 2.6, 2.2), P('chair', 2.6, -0.6, 0.9, 0.9, { ry: Math.PI / 2 }), P('chair', 5.8, -0.6, 0.9, 0.9, { ry: -Math.PI / 2 }),
      P('sofa', -4.4, 2.8, 4, 1.8, { ry: Math.PI / 2, label: 'Sofa: stay in', action: 'home', color: '#3b8f6e' }), P('tv', -6.4, 2.8, 0.5, 2.4, { ry: Math.PI / 2 }),
      P('desk', 4.4, 3.4, 3, 1.4, { action: 'online', label: 'Desk: online services' }), P('laptop', 4.4, 3.4, 0.8, 0.6, {}),
      P('plant', -6.4, 0.6, 0.8, 0.8), P('window', 0, -5.45, 3.4, 0.2), P('lamp', 1.4, 3.8, 0.6, 0.6), P('rug', -1.2, 0.4, 5, 3.4, { color: '#a56be0' }),
    ] },
    studio: { w: 12, d: 9, occ: s.partner ? 1 : 0, props: [
      P('bed', -4.2, -2.6, 2.6, 3.2, { action: 'home', label: 'Sofa bed: rest at home', color: '#3b6fe0' }), P('bedside', -2.4, -3.9, 1.0, 0.8, { action: 'phone', label: 'Phone' }),
      P('wardrobe', 0.4, -3.9, 2.4, 1.0, { action: 'wardrobe', label: 'Wardrobe: change clothes' }), P('fridge', 3.4, -3.8, 1.2, 1.2, { action: 'food', label: 'Fridge: eat something' }), P('stove', 4.9, -3.8, 1.2, 1.2, { action: 'food', label: 'Hob: cook' }), bucket(2.2, -2.2),
      P('table', 4.0, 0.0, 1.8, 1.4), P('chair', 2.8, 0.0, 0.9, 0.9, { ry: Math.PI / 2 }), P('chair', 5.0, 0.0, 0.9, 0.9, { ry: -Math.PI / 2 }),
      P('sofa', -3.4, 2.2, 3.0, 1.4, { action: 'home', label: 'Sofa: stay in', color: '#a56be0' }), P('tv', -3.4, 3.4, 2.2, 0.5, { ry: Math.PI }),
      P('desk', 3.8, 2.8, 2.2, 1.2, { action: 'online', label: 'Desk: online services' }), P('laptop', 3.8, 2.8, 0.8, 0.6), P('window', -2.0, -4.4, 3.0, 0.2), P('window', 3.4, -4.4, 3.0, 0.2), P('plant', -5.4, 0.2, 0.7, 0.7), P('lamp', -5.4, 3.4, 0.6, 0.6),
    ] },
    village: { w: 16, d: 12, occ: s.partner ? 1 : 0, props: [
      P('item', 5.6, -4.2, 3.0, 2.2, { action: 'food', label: 'Russian stove (pech): cook', color: '#f0ece4', h: 2.3 }),
      P('bed', -5.6, -3.6, 3.0, 3.8, { action: 'home', label: 'Bed with a quilt: rest at home', color: '#b3262e' }), P('bedside', -3.4, -5.0, 1.0, 0.9, { action: 'phone', label: 'Phone' }),
      P('wardrobe', -1.0, -5.2, 2.6, 1.0, { action: 'wardrobe', label: 'Wardrobe: change clothes' }), bucket(2.4, -4.4), P('shelf', 1.6, -5.2, 1.6, 0.8, { color: '#5a3a24' }),
      P('table', 1.0, 0.0, 3.4, 1.8), P('bench', 1.0, 1.6, 3.4, 0.7), P('chair', -1.2, 0.0, 0.9, 0.9, { ry: Math.PI / 2 }), P('chair', 3.2, 0.0, 0.9, 0.9, { ry: -Math.PI / 2 }),
      P('desk', 5.8, 2.6, 2.2, 1.2, { action: 'online', label: 'Table: online services' }), P('laptop', 5.8, 2.6, 0.8, 0.6),
      P('sofa', -5.6, 2.8, 3.2, 1.6, { ry: Math.PI / 2, action: 'home', label: 'Settle: stay in', color: '#8a5a3a' }), P('tv', -7.0, 2.8, 0.5, 2.0, { ry: Math.PI / 2 }),
      P('window', -2.6, -5.9, 2.0, 0.2), P('window', 4.0, -5.9, 2.0, 0.2), P('window', -7.9, 0, 0.2, 2.2), P('plant', 7.0, 4.2, 0.8, 0.8), P('rug', -2.4, 1.0, 3.6, 2.4, { color: '#9a5a3a' }),
    ] },
    house: { w: 20, d: 14, occ: s.partner ? 1 : 0, props: [
      P('bed', -7.4, -4.6, 3.6, 4.4, { action: 'home', label: 'Bed: rest at home', color: '#c9506b' }), P('bedside', -4.8, -6.0, 1.2, 1.0, { action: 'phone', label: 'Phone' }),
      P('wardrobe', -1.6, -6.2, 3.4, 1.2, { action: 'wardrobe', label: 'Wardrobe: change clothes' }), bucket(1.4, -4.6),
      P('fridge', 7.0, -6.0, 1.6, 1.4, { action: 'food', label: 'Fridge: eat something' }), P('stove', 4.8, -6.0, 1.8, 1.4, { action: 'cook', label: 'Stove: cook' }),
      P('table', 6.0, -1.8, 3.4, 2.4), P('chair', 3.8, -1.8, 0.9, 0.9, { ry: Math.PI / 2 }), P('chair', 8.2, -1.8, 0.9, 0.9, { ry: -Math.PI / 2 }), P('chair', 6.0, -3.4, 0.9, 0.9),
      P('sofa', -6.4, 2.4, 4.6, 1.8, { ry: Math.PI / 2, action: 'home', label: 'Sofa: stay in', color: '#3b8f6e' }), P('sofa', -2.4, 4.6, 3.6, 1.4, { color: '#3b6fe0' }), P('tv', -8.6, 2.4, 0.5, 3.2, { ry: Math.PI / 2 }),
      P('desk', 7.0, 4.6, 3.4, 1.4, { action: 'online', label: 'Desk: online services' }), P('laptop', 7.0, 4.6, 0.8, 0.6), P('item', 0.4, -0.2, 2.8, 1.0, { color: '#3a3f4a', h: 1.1 }),
      P('window', -4.0, -6.9, 3.4, 0.2), P('window', 6.0, -6.9, 3.4, 0.2), P('window', 9.9, 1.0, 0.2, 3.0), P('plant', -9.3, -0.8, 0.8, 0.8), P('plant', 9.0, 6.0, 0.8, 0.8), P('lamp', 2.6, 5.4, 0.6, 0.6), P('rug', -3.0, 2.6, 5.6, 3.8, { color: '#a56be0' }),
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
export function designOf(s: State): Interior {
  const id = dwellingOf(s), r = rooms(s)[id], info = homeInfo(id), reno = renoOf(s), look = currentLook(s);
  const wall = reno.wall ?? WALL[id];
  const floorA = FLOORS.some(f => f.id === reno.floor) ? floorColors(reno.floor as FloorStyle)[0] : look.floorA, floorB = FLOORS.some(f => f.id === reno.floor) ? floorColors(reno.floor as FloorStyle)[1] : look.floorB;
  return { id: 'home', title: info.name, w: r.w, d: r.d, floor: floorA, wall, occupants: r.occ, look: { ...look, floorA, floorB }, props: r.props };
}
function floorColors(f: FloorStyle): [string, string] { return f === 'parquet' ? ['#d9b98a', '#c9a574'] : f === 'plank' ? ['#d6b886', '#c4a470'] : f === 'checker' ? ['#c9a06a', '#a9784a'] : ['#b8b0a0', '#a89f8e']; }
