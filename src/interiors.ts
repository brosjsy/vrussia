/* What is inside the places: the flat, the workplace, the bank, the clinic and so on, as rooms with furniture.
   Each piece of furniture can be an activity: the fridge is "eat", the bed is "rest", the desk is "work", and so on. They are the game's own
   actions, so using something in a room does exactly what the same button elsewhere does.
   Rooms are described as data (sizes in metres, positions from the middle of the floor; the door is on the front wall, at positive z). */
import type { State } from './engine';
import { viewOf } from './career';
import { thingFor, keyFor } from './activities';
import { designOf } from './homes';

export type PropKind =
  | 'bed' | 'sofa' | 'tv' | 'fridge' | 'stove' | 'table' | 'chair' | 'desk' | 'laptop' | 'wardrobe' | 'plant' | 'window' | 'rug' | 'counter'
  | 'shelf' | 'bench' | 'atm' | 'ticket' | 'board' | 'kennel' | 'car' | 'coffee' | 'stall' | 'lamp' | 'phone' | 'bedside' | 'item' | 'round'
  // the fittings of a Russian flat (round 151): the bath, the toilet, the basin, the washing machine, the coat hooks of the hallway, the Soviet wall unit (stenka),
  // the Russian stove of the izba, a closed door (a neighbour's room in the kommunalka) and a bunk bed
  | 'bath' | 'toilet' | 'sink' | 'washer' | 'hanger' | 'stenka' | 'pech' | 'door' | 'bunk';

export interface Prop {
  kind: PropKind; x: number; z: number; ry?: number;
  w: number; d: number;                       // the floor space it takes, in metres
  color?: string;
  action?: string;                            // a game action (see actions in engine.ts) or one of SPECIAL
  label?: string;                             // shown over it when it can be used
  h?: number;                                 // height in metres (otherwise by kind)
  icon?: string;                              // a small picture floating over it (the player's furniture)
  uid?: number;                               // the player's own piece: its number
  wallItem?: boolean;                         // hangs on the back wall and covers no floor
  fid?: string;                               // the id of the catalogue piece this is (the player's furniture)
}

/** Things to do that are not one of the game's actions. */
export const SPECIAL = ['wardrobe', 'phone', 'online', 'exit', 'wash', 'vote', 'cook', 'tv', 'tea', 'samovar', 'sit'] as const;      // handled by the screen: changing clothes, the phone, cooking, the television, tea, sitting down

export type FloorStyle = 'lino' | 'checker' | 'plank' | 'parquet';
export type LightStyle = 'bare' | 'shade' | 'chandelier';
export type WindowStyle = 'plain' | 'blinds' | 'curtains';
/** How a room looks beyond the plain colours: the pattern of the floor, the skirting, what hangs in the windows, the lamps and what hangs on the walls. */
export interface RoomLook { floorStyle: FloorStyle; floorA: string; floorB: string; trim: string; windows: WindowStyle; lights: LightStyle; deco: string[] }
/** A low inner wall (round 151): the rooms of a flat are cut by walls about waist high, so the camera sees the whole flat at once. A gap between two walls is a doorway. */
export interface InnerWall { x: number; z: number; w: number; d: number }
/** A part of the floor with a name (the hallway, the kitchen, the bathroom...) and, where it differs, its own floor colour (tiles in the bathroom). */
export interface Zone { x: number; z: number; w: number; d: number; name: string; floor?: string }
export interface Interior {
  id: string; title: string; w: number; d: number; floor: string; wall: string; props: Prop[]; occupants: number; look?: RoomLook;
  /** The inner walls and named parts of a flat, and the height of its outer walls (a stalinka's ceilings are higher). All optional: places have none. */
  walls?: InnerWall[]; zones?: Zone[]; wallH?: number;
  /** The address shown over the flat (round 151), e.g. "ul. Profsoyuznaya, 43, flat 112". */
  address?: string;
}

const P = (kind: PropKind, x: number, z: number, w: number, d: number, extra: Partial<Prop> = {}): Prop => ({ kind, x, z, w, d, ...extra });

/** A row of things (chairs, desks, stalls...) along x. */
const row = (kind: PropKind, n: number, x0: number, dx: number, z: number, w: number, d: number, extra: Partial<Prop> = {}): Prop[] => Array.from({ length: n }, (_, i) => P(kind, x0 + i * dx, z, w, d, extra));

export const NO_INTERIOR = new Set(['center']);

/** The room of a place, or null for places that are outdoors (the city centre). In the flat, things that offer little activities (a chair, a plant, a television) become things to use. */
export function interiorFor(placeId: string, s: State): Interior | null {
  const it = rawInterior(placeId, s);
  if (it && placeId === 'home') for (const p of it.props) if (!p.action) { const k = keyFor(p.kind, p.fid); const th = k ? thingFor(k) : undefined; if (k && th) { p.action = 'act:' + k; p.label = `${th.icon} ${th.name}`; } }
  return it;
}
function rawInterior(placeId: string, s: State): Interior | null {
  switch (placeId) {
    case 'home': return designOf(s);
    case 'work': return {
      id: 'work', title: s.job ? 'Your workplace' : 'A workplace', w: 18, d: 13, floor: '#c8c2b6', wall: '#e8e4da', occupants: 3,
      props: [
        ...row('desk', 3, -5, 5, -3.2, 3.2, 1.6, { action: 'work', label: s.job ? `Desk: work a shift (${viewOf(s).rank})` : 'Desk: work a shift' }), ...row('laptop', 3, -5, 5, -3.2, 0.9, 0.6),
        ...row('chair', 3, -5, 5, -1.7, 0.9, 0.9), ...row('desk', 2, -3, 6, 1.2, 3.2, 1.6, { action: 'work', label: s.job ? `Desk: work a shift (${viewOf(s).rank})` : 'Desk: work a shift' }), ...row('chair', 2, -3, 6, 2.7, 0.9, 0.9),
        P('coffee', 7.6, -5.4, 1.2, 1, { action: 'food', label: 'Coffee machine: a break' }), P('board', 0, -6.25, 5, 0.2, { label: 'Notice board' }),
        P('shelf', -7.8, -3, 0.8, 5), P('plant', 7.8, 4.4, 0.8, 0.8), P('plant', -7.8, 4.4, 0.8, 0.8), P('window', 7.5, -2, 0.2, 3), P('rug', 0, 4.2, 6, 2.4, { color: '#3b6fe0' }),
      ],
    };
    case 'bank': return {
      id: 'bank', title: 'Bank branch', w: 16, d: 12, floor: '#cfd4d9', wall: '#dfe8ee', occupants: 3,
      props: [
        P('counter', 0, -4.6, 11, 1.4, { action: 'money', label: 'Counter: banking' }), ...row('chair', 4, -4.5, 3, -2.6, 0.9, 0.9, { ry: Math.PI }),
        P('ticket', 6.2, 0.4, 1, 1, { action: 'money', label: 'Queue ticket' }), P('atm', 7, -3, 1.4, 1.2, { action: 'money', label: 'Cash machine' }),
        ...row('bench', 3, -5, 5, 2.8, 3.6, 1.1), P('plant', -7, 4.5, 0.8, 0.8), P('plant', 7, 4.5, 0.8, 0.8), P('rug', 0, 0.4, 7, 2.4, { color: '#2bb5c9' }),
      ],
    };
    case 'mfc': case 'guvm': return {
      id: placeId, title: placeId === 'mfc' ? 'The multifunctional centre (MFC)' : 'The migration department', w: 18, d: 12, floor: '#cfd0d3', wall: '#d8e0ea', occupants: 5,
      props: [
        ...row('counter', 4, -6, 4, -4.6, 3, 1.3, { action: 'paper', label: 'Window: paperwork' }), P('ticket', -7.4, 2.8, 1, 1, { action: 'paper', label: 'Queue ticket machine' }),
        ...row('bench', 3, -4, 4.4, 1.6, 3.6, 1.1), ...row('bench', 3, -4, 4.4, 3.8, 3.6, 1.1), P('board', 5.8, 4.5, 3.4, 0.2, { label: 'Forms and rules' }), P('desk', 6, -0.2, 3, 1.4, { label: 'Forms desk' }),
        P('plant', 8, -5, 0.8, 0.8), P('plant', -8, 4.8, 0.8, 0.8),
        ...(placeId === 'mfc' ? [P('item', -7.2, -0.4, 1.2, 1.2, { action: 'vote', label: 'Ballot box: polling station', color: '#b3262e', h: 1.1 })] : []),
      ],
    };
    case 'clinic': case 'hospital': return {
      id: placeId, title: placeId === 'clinic' ? 'The polyclinic' : 'The city hospital', w: 16, d: 12, floor: '#dfe6e6', wall: '#e8f1f1', occupants: 4,
      props: [
        P('counter', -3, -4.6, 5, 1.3, { action: 'home', label: 'Reception: health' }), ...row(placeId === 'hospital' ? 'bed' : 'chair', 2, 3, 3.4, -4, placeId === 'hospital' ? 2.6 : 0.9, placeId === 'hospital' ? 3.4 : 0.9, { action: 'home', label: placeId === 'hospital' ? 'Bed: rest and recover' : 'Doctor\'s waiting chair' }),
        ...row('bench', 3, -5, 4.6, 2.6, 3.6, 1.1), P('plant', 7, 4.4, 0.8, 0.8), P('plant', -7, 4.4, 0.8, 0.8), P('board', -3, -5.9, 3, 0.2, { label: 'Opening hours' }),
      ],
    };
    case 'uni': return {
      id: 'uni', title: 'A lecture hall', w: 18, d: 13, floor: '#c9b896', wall: '#e5dfd0', occupants: 6,
      props: [
        P('board', 0, -6.2, 8, 0.2, { action: 'edu', label: 'Board: study' }), P('desk', 0, -4.6, 3.6, 1.4, { action: 'edu', label: 'Lecturer\'s desk' }),
        ...row('desk', 4, -6, 4, -1.4, 3, 1.1, { action: 'edu', label: 'Desk: study' }), ...row('desk', 4, -6, 4, 1.4, 3, 1.1, { action: 'edu', label: 'Desk: study' }), ...row('desk', 4, -6, 4, 4.2, 3, 1.1, { action: 'edu', label: 'Desk: study' }),
        P('plant', 8, -5.4, 0.8, 0.8), P('window', 8.8, 0, 0.2, 4),
      ],
    };
    case 'market': case 'mall': return {
      id: placeId, title: placeId === 'market' ? 'The market' : 'The electronics mall', w: 18, d: 12, floor: '#cdbfa8', wall: '#e6dcc8', occupants: 5,
      props: [
        ...row('stall', 4, -6, 4, -3.4, 3, 1.8, { action: 'money', label: placeId === 'market' ? 'Stall: shop' : 'Shop: phones and gadgets' }), ...row('stall', 3, -4, 4, 1, 3, 1.8, { action: 'money', label: 'Stall: shop' }),
        P('plant', 8, 4.5, 0.8, 0.8), P('lamp', -8, 4.5, 0.6, 0.6),
      ],
    };
    case 'dealer': return {
      id: 'dealer', title: 'The car showroom', w: 18, d: 13, floor: '#e1e4e8', wall: '#f0f2f5', occupants: 3,
      props: [
        P('car', -5, -2, 2.4, 4.8, { action: 'money', label: 'Car: look and buy', color: '#e0373f' }), P('car', 0, -2, 2.4, 4.8, { action: 'money', label: 'Car: look and buy', color: '#3b6fe0' }), P('car', 5, -2, 2.4, 4.8, { action: 'money', label: 'Car: look and buy', color: '#f0b43c' }),
        P('counter', 0, -5.6, 6, 1.3, { action: 'money', label: 'Sales desk' }), P('sofa', -6.5, 3.5, 3, 1.6, { color: '#3b8f6e' }), P('plant', 7.5, 4.5, 0.8, 0.8),
      ],
    };
    case 'agency': return {
      id: 'agency', title: 'The estate agency', w: 14, d: 11, floor: '#d3c9b6', wall: '#e9e4d6', occupants: 2,
      props: [
        ...row('desk', 2, -3, 6, -3, 3, 1.5, { action: 'money', label: 'Desk: flats and homes' }), ...row('chair', 2, -3, 6, -1.4, 0.9, 0.9), P('board', 0, -5.2, 6, 0.2, { label: 'Flats for rent' }),
        P('sofa', -4, 3, 3, 1.6, { color: '#a56be0' }), P('plant', 5.8, 3.8, 0.8, 0.8),
      ],
    };
    case 'airport': return {
      id: 'airport', title: 'The airport terminal', w: 20, d: 13, floor: '#dadde2', wall: '#e7eef6', occupants: 5,
      props: [
        ...row('counter', 4, -6.6, 4.4, -4.8, 3.4, 1.3, { action: 'flight', label: 'Check-in desk: flights' }), P('board', 0, -6.3, 8, 0.2, { label: 'Departures' }),
        ...row('bench', 3, -5, 5, 2, 3.6, 1.1), ...row('bench', 3, -5, 5, 4.4, 3.6, 1.1), P('plant', 9, 5, 0.8, 0.8), P('plant', -9, 5, 0.8, 0.8),
      ],
    };
    case 'station': return {
      id: 'station', title: 'The railway station', w: 20, d: 12, floor: '#cfc9bd', wall: '#e2ddd0', occupants: 5,
      props: [
        ...row('counter', 3, -5, 5, -4.6, 3.4, 1.3, { action: 'travel', label: 'Ticket window: travel' }), P('board', 6.5, -5.9, 5, 0.2, { label: 'Timetable' }),
        ...row('bench', 4, -7.5, 5, 1.6, 3.6, 1.1), ...row('bench', 4, -7.5, 5, 3.8, 3.6, 1.1), P('plant', 9, 4.6, 0.8, 0.8),
      ],
    };
    case 'shelter': return {
      id: 'shelter', title: 'The animal shelter', w: 14, d: 10, floor: '#d8cdb4', wall: '#ede6d3', occupants: 2,
      props: [
        ...row('kennel', 4, -4.5, 3, -3.4, 2, 1.8, { action: 'family', label: 'Kennel: meet the dogs' }), P('counter', 4.2, 2.6, 3.4, 1.2, { label: 'Volunteers\' table' }), P('plant', -6, 3.8, 0.8, 0.8),
      ],
    };
    default: return null;
  }
}

/** The actions the game knows (so a test can check that every prop points at a real one). */
export const KNOWN_ACTIONS = ['work', 'food', 'travel', 'out', 'paper', 'money', 'people', 'edu', 'home', 'online', 'flight', 'family', 'pets', 'culture', 'biz'];

/** The door of a room: the middle of the front wall. */
export const doorOf = (i: Interior): { x: number; z: number } => ({ x: 0, z: i.d / 2 - 0.4 });

/* ---------- walking inside: solid furniture, walls and paths (pure, so it is tested without graphics) ---------- */
const PASS = new Set<PropKind>(['rug', 'window', 'laptop', 'phone', 'board', 'door']);
const WALL_GAP = 0.45;
const CELL = 0.5;
export interface P2 { x: number; z: number }

/** Can a person (a disc of radius r) not stand here? True inside a wall margin or on a piece of solid furniture. */
export function blocked(it: Interior, x: number, z: number, r = 0.3): boolean {
  if (Math.abs(x) > it.w / 2 - WALL_GAP || Math.abs(z) > it.d / 2 - WALL_GAP) return true;
  if (it.walls) for (const w of it.walls) if (Math.abs(x - w.x) < w.w / 2 + r && Math.abs(z - w.z) < w.d / 2 + r) return true;
  for (const p of it.props) {
    if (PASS.has(p.kind) || p.wallItem) continue;
    const turned = Math.abs(Math.sin(p.ry ?? 0)) > 0.5, w = turned ? p.d : p.w, d = turned ? p.w : p.d;
    if (Math.abs(x - p.x) < w / 2 + r && Math.abs(z - p.z) < d / 2 + r) return true;
  }
  return false;
}

const cells = (it: Interior): { nx: number; nz: number } => ({ nx: Math.floor(it.w / CELL) + 1, nz: Math.floor(it.d / CELL) + 1 });
const toCell = (it: Interior, p: P2): { i: number; j: number } => ({ i: Math.round((p.x + it.w / 2) / CELL), j: Math.round((p.z + it.d / 2) / CELL) });
const toPoint = (it: Interior, i: number, j: number): P2 => ({ x: -it.w / 2 + i * CELL, z: -it.d / 2 + j * CELL });

/** The nearest spot a person can stand on, searching outwards from `p`. */
export function nearestFree(it: Interior, p: P2): P2 {
  const c = toCell(it, p), { nx, nz } = cells(it);
  for (let k = 0; k < Math.max(nx, nz); k++) {
    let best: P2 | null = null, bd = Infinity;
    for (let di = -k; di <= k; di++) for (let dj = -k; dj <= k; dj++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== k) continue;
      const i = c.i + di, j = c.j + dj; if (i < 0 || j < 0 || i >= nx || j >= nz) continue;
      const q = toPoint(it, i, j); if (blocked(it, q.x, q.z)) continue;
      const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; best = q; }
    }
    if (best) return best;
  }
  return { x: 0, z: it.d / 2 - 1 };
}

/** Waypoints from `from` to (the free spot nearest to) `to`, round the furniture; [] if already there. Eight directions, no cutting corners. */
export function findPath(it: Interior, from: P2, to: P2): P2[] {
  const { nx, nz } = cells(it);
  const goalP = blocked(it, to.x, to.z) ? nearestFree(it, to) : to;
  const s = toCell(it, nearestFree(it, from)), g = toCell(it, goalP);
  const id = (i: number, j: number): number => j * nx + i;
  const gScore = new Float64Array(nx * nz).fill(Infinity), came = new Int32Array(nx * nz).fill(-1), closed = new Uint8Array(nx * nz);
  const open: { k: number; f: number }[] = [];
  gScore[id(s.i, s.j)] = 0; open.push({ k: id(s.i, s.j), f: 0 });
  const free = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < nx && j < nz && !blocked(it, toPoint(it, i, j).x, toPoint(it, i, j).z);
  let reached = false;
  while (open.length) {
    let bi = 0; for (let n = 1; n < open.length; n++) if (open[n].f < open[bi].f) bi = n;
    const cur = open.splice(bi, 1)[0].k; if (closed[cur]) continue; closed[cur] = 1;
    const ci = cur % nx, cj = (cur - ci) / nx;
    if (ci === g.i && cj === g.j) { reached = true; break; }
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj; if (!free(ni, nj)) continue;
      if (di && dj && (!free(ci + di, cj) || !free(ci, cj + dj))) continue;
      const k = id(ni, nj), t = gScore[cur] + (di && dj ? 1.414 : 1);
      if (t < gScore[k]) { gScore[k] = t; came[k] = cur; open.push({ k, f: t + Math.hypot(ni - g.i, nj - g.j) }); }
    }
  }
  if (!reached) return [];
  const out: P2[] = []; for (let k = id(g.i, g.j); k !== -1 && k !== id(s.i, s.j); k = came[k]) out.push(toPoint(it, k % nx, Math.floor(k / nx)));
  out.reverse();
  return out;
}

/** Where a person stands to use a thing: in front of it (towards the door) if that spot is free and can be walked to from the door, otherwise beside or behind it.
   In a flat with inner walls the spot in front can be on the other side of a wall, so the sides are tried too (round 151). */
export function useSpot(it: Interior, p: Prop): P2 {
  const door = doorOf(it), start = { x: door.x, z: door.z - 1 };
  const turned = Math.abs(Math.sin(p.ry ?? 0)) > 0.5, w = turned ? p.d : p.w, d = turned ? p.w : p.d;
  const tries: P2[] = [{ x: p.x, z: Math.min(door.z, p.z + d / 2 + 0.8) }, { x: p.x - w / 2 - 0.7, z: p.z }, { x: p.x + w / 2 + 0.7, z: p.z }, { x: p.x, z: p.z - d / 2 - 0.7 }];
  for (const q of tries) if (!blocked(it, q.x, q.z) && (Math.hypot(q.x - start.x, q.z - start.z) < 0.6 || findPath(it, start, q).length > 0)) return q;
  return { x: p.x, z: Math.min(door.z, p.z + 1.6) };
}

/** Where people can sit: one place on each chair, two on a sofa or a bench. Each faces towards the middle of the room. */
export interface Seat { x: number; z: number; ry: number }
export function seatsOf(it: Interior): Seat[] {
  const out: Seat[] = [];
  for (const p of it.props) {
    if (p.kind !== 'chair' && p.kind !== 'bench' && p.kind !== 'sofa') continue;
    const turned = Math.abs(Math.sin(p.ry ?? 0)) > 0.5, along = turned ? p.d : p.w;
    const n = p.kind === 'chair' ? 1 : along > 2.8 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const off = n === 1 ? 0 : (k === 0 ? -1 : 1) * along / 4;
      const x = p.x + (turned ? 0 : off), z = p.z + (turned ? off : 0);
      out.push({ x, z, ry: Math.atan2(-x, -z) });
    }
  }
  return out;
}

/** A random place a person might wander to: free, and not in the doorway. */
export function wanderSpot(it: Interior, r: () => number): P2 {
  for (let n = 0; n < 40; n++) { const p = { x: (r() * 2 - 1) * (it.w / 2 - 1), z: (r() * 2 - 1) * (it.d / 2 - 2) }; if (!blocked(it, p.x, p.z, 0.45)) return p; }
  return { x: 0, z: 0 };
}
