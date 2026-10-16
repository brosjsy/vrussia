/* Furnishing the home: a catalogue of furniture, and the rules for buying it and putting it in the flat. Pure functions over the game state, so they are
   tested without a screen. The idea of a buy mode with a catalogue of tabs, footprints on a grid and comfort stars came from watching another life game's
   home screen; the items, the Russian flavour, the prices and the rules are ours. All prices are invented game values.
   The flat is a grid of one-metre cells. An item covers w x d cells (turned a quarter, it covers d x w); wall items hang on the back wall and cover no floor.
   Furniture is for looks and a good home: it changes nothing but money, so the game's balance is untouched. */
import type { State } from './engine';
import { interiorFor, findPath, blocked, doorOf } from './interiors';
import { keyFor, thingFor } from './activities';
import type { Interior, Prop, PropKind } from './interiors';

export type FurnCat = 'design' | 'sleep' | 'kitchen' | 'bath' | 'comfort' | 'fun' | 'skills' | 'light' | 'decor' | 'pets' | 'luxury';
export type Model = PropKind | 'item' | 'round';
export interface Furn {
  id: string; cat: FurnCat; name: string; icon: string; w: number; d: number; h: number; price: number;
  stars?: 1 | 2 | 3 | 4; colors?: number; model: Model; color: string; wall?: boolean; action?: string;
}
export interface PlacedItem { uid: number; id: string; i: number; j: number; rot: 0 | 1 }
export interface FurnState { placed: PlacedItem[]; stock: Record<string, number>; next: number; wish?: string[]; last?: { id: string; price: number; at: number } }

export const FURN_CATS: { id: FurnCat; label: string; icon: string }[] = [
  { id: 'design', label: 'Design', icon: '🎨' }, { id: 'sleep', label: 'Sleep', icon: '🛏️' }, { id: 'kitchen', label: 'Kitchen', icon: '🍳' }, { id: 'bath', label: 'Bath', icon: '🚿' },
  { id: 'comfort', label: 'Comfort', icon: '🛋️' }, { id: 'fun', label: 'Fun', icon: '📺' }, { id: 'skills', label: 'Skills', icon: '🎸' }, { id: 'light', label: 'Light', icon: '💡' },
  { id: 'decor', label: 'Decor', icon: '🌿' }, { id: 'pets', label: 'Pets', icon: '🐶' }, { id: 'luxury', label: 'Luxury', icon: '💎' },
];

const F = (id: string, cat: FurnCat, name: string, icon: string, w: number, d: number, h: number, price: number, model: Model, color: string, extra: Partial<Furn> = {}): Furn => ({ id, cat, name, icon, w, d, h, price, model, color, ...extra });

export const FURNITURE: Furn[] = [
  // design: the basics of a room
  F('stool', 'design', 'Wooden stool (taburet)', '💺', 1, 1, 0.5, 600, 'chair', '#b98a5c', { colors: 4 }),
  F('table-kitchen', 'design', 'Kitchen table', '🍽️', 2, 1, 0.8, 4200, 'table', '#a8754a', { stars: 1 }),
  F('table-dining', 'design', 'Dining table', '🍽️', 2, 2, 0.85, 7800, 'table', '#8c5a34', { stars: 2 }),
  F('shelf-book', 'design', 'Bookcase', '📚', 2, 1, 2.0, 5600, 'shelf', '#7a5a3a', { stars: 1 }),
  F('wardrobe-2', 'design', 'Wardrobe (shkaf)', '🚪', 2, 1, 2.2, 9800, 'wardrobe', '#8c6a47', { stars: 2 }),
  F('sideboard', 'design', 'Sideboard with crystal (servant)', '🥂', 2, 1, 1.7, 12500, 'shelf', '#6a3f24', { stars: 2 }),
  // sleep
  F('mattress', 'sleep', 'Mattress on the floor', '🛏️', 2, 1, 0.3, 3500, 'bed', '#9fb6c9', { action: 'home' }),
  F('bed-single', 'sleep', 'Single bed', '🛏️', 2, 1, 0.6, 9500, 'bed', '#e0735a', { stars: 1, colors: 6, action: 'home' }),
  F('bed-double', 'sleep', 'Double bed', '🛏️', 2, 2, 0.65, 21000, 'bed', '#c9506b', { stars: 2, colors: 6, action: 'home' }),
  F('cot', 'sleep', 'Child\'s cot', '🧸', 1, 2, 0.8, 8800, 'bed', '#f0b43c', { stars: 1 }),
  F('bedside-2', 'sleep', 'Bedside table', '🛏️', 1, 1, 0.55, 2400, 'bedside', '#8c6a47'),
  // kitchen
  F('kettle-stand', 'kitchen', 'Electric kettle', '☕', 1, 1, 0.3, 1500, 'item', '#cfd3d8', { action: 'tea' }),
  F('samovar', 'kitchen', 'Samovar', '☕', 1, 1, 0.9, 7500, 'round', '#d6a53a', { stars: 2, action: 'samovar' }),
  F('fridge-2', 'kitchen', 'Refrigerator', '🧊', 1, 1, 2.0, 24000, 'fridge', '#e9eef2', { stars: 1, action: 'food' }),
  F('stove-2', 'kitchen', 'Gas stove', '🍳', 1, 1, 0.95, 16500, 'stove', '#c9ced3', { stars: 1, action: 'cook' }),
  F('washer', 'kitchen', 'Washing machine', '🧺', 1, 1, 0.9, 19500, 'item', '#f4f6f8', { stars: 1 }),
  // bath
  F('bucket', 'bath', 'Bucket and ladle', '🛁', 1, 1, 0.4, 400, 'round', '#3b6fe0'),
  F('shower-cab', 'bath', 'Shower cabin', '🚿', 1, 1, 2.1, 28000, 'item', '#bfe3f4', { stars: 2, action: 'wash' }),
  F('bath-tub', 'bath', 'Bathtub', '🛁', 2, 1, 0.6, 26000, 'item', '#ffffff', { stars: 2 }),
  F('sauna-barrel', 'bath', 'Banya barrel', '🧖', 2, 2, 1.2, 64000, 'round', '#a8743a', { stars: 3 }),
  // comfort
  F('armchair', 'comfort', 'Armchair', '💺', 1, 1, 0.9, 8500, 'sofa', '#3b8f6e', { stars: 2, colors: 8, action: 'sit' }),
  F('sofa-2', 'comfort', 'Folding sofa (divan)', '🛋️', 2, 1, 0.9, 14500, 'sofa', '#3b6fe0', { stars: 2, colors: 8 }),
  F('pouf', 'comfort', 'Bean bag', '🔴', 1, 1, 0.5, 5200, 'round', '#e07bb0', { stars: 1, colors: 10 }),
  F('sofa-3', 'comfort', 'Family sofa (3 seats)', '🛋️', 3, 1, 0.9, 38000, 'sofa', '#a56be0', { stars: 3, colors: 8 }),
  F('rug-wall', 'comfort', 'Wall carpet (kovyor)', '🧶', 3, 1, 0.0, 6800, 'rug', '#b3262e', { stars: 1, wall: true }),
  F('heater', 'comfort', 'Electric heater', '🔥', 1, 1, 0.7, 4800, 'item', '#e07b2a'),
  // fun
  F('tv-2', 'fun', 'Television', '📺', 2, 1, 1.0, 21000, 'tv', '#15171c', { stars: 1, action: 'tv' }),
  F('console', 'fun', 'Games console', '🎮', 1, 1, 0.3, 36000, 'item', '#222a3a', { stars: 2 }),
  F('chess', 'fun', 'Chess table', '♟️', 1, 1, 0.8, 5400, 'table', '#6a3f24', { stars: 1 }),
  F('aquarium', 'fun', 'Aquarium', '🐠', 2, 1, 1.0, 17500, 'item', '#7fd0ff', { stars: 2 }),
  // skills
  F('desk-2', 'skills', 'Writing desk', '🖥️', 2, 1, 0.8, 11500, 'desk', '#b98a5c', { stars: 1, action: 'online' }),
  F('guitar', 'skills', 'Guitar on a stand', '🎸', 1, 1, 1.0, 9000, 'item', '#a8743a', { stars: 2 }),
  F('piano', 'skills', 'Upright piano', '🎹', 2, 1, 1.3, 78000, 'item', '#1c1410', { stars: 3 }),
  F('easel', 'skills', 'Easel', '🎨', 1, 1, 1.6, 4600, 'item', '#d9b45a', { stars: 1 }),
  // light
  F('lamp-floor', 'light', 'Floor lamp', '💡', 1, 1, 1.7, 3200, 'lamp', '#f0d890'),
  F('lamp-table', 'light', 'Table lamp', '🔦', 1, 1, 0.5, 1200, 'lamp', '#f0b43c'),
  F('chandelier', 'light', 'Chandelier', '🕯️', 1, 1, 0.4, 14500, 'lamp', '#ffe9a8', { stars: 2 }),
  // decor
  F('plant-2', 'decor', 'Rubber plant', '🌿', 1, 1, 1.4, 1400, 'plant', '#3c8f4a'),
  F('plant-big', 'decor', 'Palm in a tub', '🌴', 1, 1, 2.0, 5200, 'plant', '#2b7a3a', { stars: 1 }),
  F('rug-floor', 'decor', 'Floor rug', '🟫', 2, 2, 0.04, 6200, 'rug', '#a56be0', { stars: 1, colors: 8 }),
  F('icon-corner', 'decor', 'Icon shelf (krasny ugol)', '🖼️', 1, 1, 1.9, 5900, 'shelf', '#8a5a2e', { stars: 1, wall: true }),
  // pets
  F('cat-bed', 'pets', 'Cat basket', '🐱', 1, 1, 0.3, 1900, 'round', '#c9a27a'),
  F('dog-bed', 'pets', 'Dog bed', '🐶', 1, 1, 0.3, 3100, 'round', '#9a7a52'),
  F('scratch-post', 'pets', 'Cat tree', '🐈', 1, 1, 1.5, 6400, 'item', '#c9b79c', { stars: 1 }),
  // luxury
  F('sofa-gold', 'luxury', 'Gilded sofa', '👑', 2, 1, 1.0, 120000, 'sofa', '#d6a53a', { stars: 4, colors: 8 }),
  F('fireplace', 'luxury', 'Electric fireplace', '🔥', 2, 1, 1.1, 85000, 'item', '#3a3f4a', { stars: 3 }),
  F('ac-wall', 'luxury', 'Split air conditioner', '❄️', 2, 1, 0.5, 52000, 'item', '#f4f6f8', { stars: 1, wall: true }),
  F('globe-bar', 'luxury', 'Globe bar', '🌍', 1, 1, 1.2, 46000, 'round', '#3b6fe0', { stars: 3 }),
];

export const furnById = (id: string): Furn | undefined => FURNITURE.find(f => f.id === id);
export const inCat = (cat: FurnCat): Furn[] => FURNITURE.filter(f => f.cat === cat).sort((a, b) => a.price - b.price);

/** The furniture book of the player (made on first use; saves from before it simply have none). */
export function furnOf(s: State): FurnState {
  const x = s as State & { furn?: FurnState };
  if (!x.furn || !Array.isArray(x.furn.placed) || typeof x.furn.stock !== 'object') x.furn = { placed: [], stock: {}, next: 1 };
  return x.furn;
}
export const totalStars = (s: State): number => furnOf(s).placed.reduce((t, p) => t + (furnById(p.id)?.stars ?? 0), 0);

/** The floor space an item covers, in cells, for its turn. */
export const sizeOf = (f: Furn, rot: 0 | 1): { w: number; d: number } => (rot ? { w: f.d, d: f.w } : { w: f.w, d: f.d });

/** The room of the flat as a grid: the number of cells across and deep (the flat is 14 x 11 metres). */
export function gridOf(it: Interior): { cols: number; rows: number } { return { cols: Math.round(it.w), rows: Math.round(it.d) }; }
/** The middle of an item in room coordinates (metres from the middle of the floor; the door is at positive z). */
export function centreOf(it: Interior, f: Furn, i: number, j: number, rot: 0 | 1): { x: number; z: number } {
  const { w, d } = sizeOf(f, rot);
  return f.wall ? { x: -it.w / 2 + i + w / 2, z: -it.d / 2 + 0.15 } : { x: -it.w / 2 + i + w / 2, z: -it.d / 2 + j + d / 2 };
}

const SOFT = new Set<PropKind>(['rug', 'window', 'laptop', 'phone', 'board']);
const overlap = (a: { x: number; z: number; w: number; d: number }, b: { x: number; z: number; w: number; d: number }): boolean => Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 0.01 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 0.01;

/** The flat as it is with the furniture placed in it: the fixed furniture of the room and then the player's pieces. */
export function homeInterior(s: State): Interior {
  const base = interiorFor('home', s) as Interior;
  const props: Prop[] = [...base.props];
  for (const p of furnOf(s).placed) {
    const f = furnById(p.id); if (!f) continue;
    const { w, d } = sizeOf(f, p.rot), c = centreOf(base, f, p.i, p.j, p.rot);
    props.push({ kind: f.model as PropKind, x: c.x, z: c.z, ry: f.wall ? 0 : p.rot ? Math.PI / 2 : 0, w: f.wall ? w : p.rot ? d : w, d: f.wall ? 0.4 : p.rot ? w : d, color: f.color, h: f.wall ? f.h : f.h, icon: f.icon, fid: f.id, action: f.action, label: f.action ? f.name : undefined, uid: p.uid, wallItem: f.wall } as Prop);
    const last = props[props.length - 1], k = keyFor(f.model, f.id), th = k ? thingFor(k) : undefined;
    if (!last.action && k && th) { last.action = 'act:' + k; last.label = `${th.icon} ${th.name}`; }
  }
  return { ...base, props };
}

export interface PlaceCheck { ok: boolean; why?: string }
/** Can this item be put here? It must be inside the flat, clear of the fixed furniture, the door and other pieces, and every usable thing must still be reachable from the door. */
export function canPlace(s: State, f: Furn, i: number, j: number, rot: 0 | 1, ignoreUid?: number): PlaceCheck {
  const fs = furnOf(s), base = interiorFor('home', s) as Interior, g = gridOf(base), { w, d } = sizeOf(f, rot);
  if (f.wall) {
    if (i < 0 || i + w > g.cols) return { ok: false, why: 'off the wall' };
    for (const p of fs.placed) { const o = furnById(p.id); if (p.uid === ignoreUid || !o?.wall) continue; if (i < p.i + sizeOf(o, p.rot).w && p.i < i + w) return { ok: false, why: 'taken' }; }
    return { ok: true };
  }
  if (i < 0 || j < 0 || i + w > g.cols || j + d > g.rows) return { ok: false, why: 'outside the room' };
  const me = { x: -base.w / 2 + i + w / 2, z: -base.d / 2 + j + d / 2, w, d };
  const door = doorOf(base);
  if (overlap(me, { x: door.x, z: door.z + 0.2, w: 3.4, d: 2.6 })) return { ok: false, why: 'blocks the door' };
  for (const p of base.props) {
    if (SOFT.has(p.kind)) continue;
    const turned = Math.abs(Math.sin(p.ry ?? 0)) > 0.5;
    if (overlap(me, { x: p.x, z: p.z, w: turned ? p.d : p.w, d: turned ? p.w : p.d })) return { ok: false, why: 'something is there' };
  }
  for (const p of fs.placed) {
    const o = furnById(p.id); if (!o || o.wall || p.uid === ignoreUid) continue;
    const sz = sizeOf(o, p.rot); if (overlap(me, { x: -base.w / 2 + p.i + sz.w / 2, z: -base.d / 2 + p.j + sz.d / 2, w: sz.w, d: sz.d })) return { ok: false, why: 'something is there' };
  }
  // everything that can be used must still be reachable from the door
  const trial = homeWith(s, f, i, j, rot, ignoreUid);
  const start = { x: door.x, z: door.z - 1 };
  for (const p of trial.props) {
    if (!p.action || p.action.startsWith('act:')) continue;                 // little activities are done from wherever one can reach
    const goal = { x: p.x, z: Math.min(door.z, p.z + 1.6) };
    if (blocked(trial, goal.x, goal.z) && findPath(trial, start, goal).length === 0) return { ok: false, why: 'would block the way' };
    if (findPath(trial, start, goal).length === 0 && Math.hypot(start.x - goal.x, start.z - goal.z) > 1) return { ok: false, why: 'would block the way' };
  }
  return { ok: true };
}
function homeWith(s: State, f: Furn, i: number, j: number, rot: 0 | 1, ignoreUid?: number): Interior {
  const fs = furnOf(s), keep = fs.placed.filter(p => p.uid !== ignoreUid), saved = fs.placed;
  fs.placed = [...keep, { uid: -1, id: f.id, i, j, rot }];
  try { return homeInterior(s); } finally { fs.placed = saved; }
}

export interface Result { ok: boolean; msg: string }
/** Buys one piece. It goes to the stock (not into the room yet). Only the money changes. */
export function buyFurn(s: State, id: string): Result {
  const f = furnById(id); if (!f) return { ok: false, msg: 'There is no such thing.' };
  if (s.money < f.price) return { ok: false, msg: 'Not enough money.' };
  s.money -= f.price; const fs = furnOf(s); fs.stock[id] = (fs.stock[id] ?? 0) + 1;
  fs.last = { id, price: f.price, at: Date.now() };
  return { ok: true, msg: `${f.name} bought.` };
}
/** Puts a piece from the stock into the flat. */
export function placeFurn(s: State, id: string, i: number, j: number, rot: 0 | 1): Result {
  const f = furnById(id), fs = furnOf(s); if (!f) return { ok: false, msg: 'There is no such thing.' };
  if ((fs.stock[id] ?? 0) < 1) return { ok: false, msg: 'You do not have one.' };
  const c = canPlace(s, f, i, j, rot); if (!c.ok) return { ok: false, msg: `It does not fit here: ${c.why}.` };
  fs.stock[id]--; if (fs.stock[id] === 0) delete fs.stock[id];
  fs.placed.push({ uid: fs.next++, id, i, j, rot });
  return { ok: true, msg: `${f.name} placed.` };
}
/** Takes a piece out of the flat back into the stock. */
export function pickUp(s: State, uid: number): Result {
  const fs = furnOf(s), k = fs.placed.findIndex(p => p.uid === uid); if (k < 0) return { ok: false, msg: 'It is not there.' };
  const p = fs.placed.splice(k, 1)[0]; fs.stock[p.id] = (fs.stock[p.id] ?? 0) + 1;
  return { ok: true, msg: `${furnById(p.id)?.name ?? 'It'} is back in your stock.` };
}
/** Reads a saved furniture book safely: unknown pieces are dropped and pieces that no longer fit are moved back to the stock. */
export function repairFurn(s: State): void {
  const fs = furnOf(s); const placed = fs.placed; fs.placed = [];
  for (const p of placed) {
    const f = furnById(p?.id); if (!f || !Number.isInteger(p.i) || !Number.isInteger(p.j) || (p.rot !== 0 && p.rot !== 1)) { continue; }
    if (canPlace(s, f, p.i, p.j, p.rot).ok) fs.placed.push({ uid: Number.isInteger(p.uid) ? p.uid : fs.next++, id: p.id, i: p.i, j: p.j, rot: p.rot }); else fs.stock[p.id] = (fs.stock[p.id] ?? 0) + 1;
  }
  fs.next = Math.max(fs.next, ...fs.placed.map(p => p.uid + 1), 1);
  for (const k of Object.keys(fs.stock)) if (!furnById(k) || !(fs.stock[k] > 0)) delete fs.stock[k];
}

/* ---------- buying with second thoughts ---------- */
/** How long a purchase can be taken back for the full price, in milliseconds. */
export const UNDO_MS = 10_000;
/** Takes back the last purchase within ten seconds: the piece leaves the stock (or the flat, if it was already put down) and the full price comes back. */
export function undoBuy(s: State, now = Date.now()): Result {
  const fs = furnOf(s), l = fs.last;
  if (!l || now - l.at > UNDO_MS) return { ok: false, msg: 'Too late to take it back. You can still sell it for half.' };
  if ((fs.stock[l.id] ?? 0) > 0) { fs.stock[l.id]--; if (!fs.stock[l.id]) delete fs.stock[l.id]; }
  else { const k = fs.placed.map(p => p.id).lastIndexOf(l.id); if (k < 0) { fs.last = undefined; return { ok: false, msg: 'It is not there any more.' }; } fs.placed.splice(k, 1); }
  s.money += l.price; fs.last = undefined;
  return { ok: true, msg: `Purchase cancelled: ${furnById(l.id)?.name ?? 'it'} went back to the shop and the money is back.` };
}
/** Sells a piece from the stock back to the shop for half of what it cost. */
export function sellBack(s: State, id: string): Result {
  const fs = furnOf(s), f = furnById(id); if (!f) return { ok: false, msg: 'There is no such thing.' };
  if ((fs.stock[id] ?? 0) < 1) return { ok: false, msg: 'Pick it up from the flat first: only things in your stock can be sold.' };
  fs.stock[id]--; if (!fs.stock[id]) delete fs.stock[id];
  const back = Math.floor(f.price / 2); s.money += back; if (fs.last?.id === id) fs.last = undefined;
  return { ok: true, msg: `Sold ${f.name} for ${back} roubles.` };
}
/** Puts a piece on the wishlist, or takes it off. Returns whether it is on the list now. */
export function toggleWish(s: State, id: string): boolean {
  const fs = furnOf(s), w = fs.wish ?? (fs.wish = []), k = w.indexOf(id);
  if (k >= 0) { w.splice(k, 1); return false; }
  if (furnById(id)) w.push(id); return w.includes(id);
}
export const onWishlist = (s: State, id: string): boolean => !!furnOf(s).wish?.includes(id);
export type Sort = 'cheap' | 'dear' | 'stars';
/** The catalogue as the screen shows it: a category (or every one when searching), a search word, a sort order, and only owned things or the wishlist if asked. */
export function catalogue(s: State, o: { cat?: FurnCat | 'all'; q?: string; sort?: Sort; owned?: boolean; wish?: boolean } = {}): Furn[] {
  const fs = furnOf(s), q = (o.q ?? '').trim().toLowerCase(), have = new Set([...Object.keys(fs.stock), ...fs.placed.map(p => p.id)]);
  let list = FURNITURE.filter(f => (!o.cat || o.cat === 'all' || q ? true : f.cat === o.cat));
  if (q) list = list.filter(f => f.name.toLowerCase().includes(q) || f.cat.includes(q));
  if (o.owned) list = list.filter(f => have.has(f.id));
  if (o.wish) list = list.filter(f => fs.wish?.includes(f.id));
  const sort = o.sort ?? 'cheap';
  return list.slice().sort((a, b) => (sort === 'dear' ? b.price - a.price : sort === 'stars' ? (b.stars ?? 0) - (a.stars ?? 0) || a.price - b.price : a.price - b.price));
}
