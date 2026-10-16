/* The rules of the 3D world, with no graphics: where things are, which way people walk and how they behave.
   The 3D picture (world3d.ts) only draws what is decided here, so all of it is tested without a screen.
   Units are metres. The game's 100 x 100 map becomes a square of 130 x 130 metres; roads run from the home (the hub) to every place. */
import * as G from './engine';
import { SAY } from './city';

export const WORLD = 1.3;                                  // metres per map unit
export interface V2 { x: number; z: number }

export const toWorld = (p: { x: number; y: number }): V2 => ({ x: (p.x - 50) * WORLD, z: (p.y - 50) * WORLD });
export const dist = (a: V2, b: V2): number => Math.hypot(a.x - b.x, a.z - b.z);
export const HUB: V2 = toWorld(G.placeById('home'));
export const WALK_SPEED = 1.4;                             // an ordinary walking pace, metres per second
export const PLAYER_SPEED = 3.2;                           // the player hurries a little so trips do not take long
export const FRONT = 8.5;                                  // how far in front of a building people stand

/** The point where people stand in front of a place: on the road from the hub, just before the building. */
export function standPoint(placeId: string): V2 {
  const c = toWorld(G.placeById(placeId));
  if (placeId === 'home') return { x: c.x, z: c.z + FRONT };
  const dx = HUB.x - c.x, dz = HUB.z - c.z, d = Math.hypot(dx, dz) || 1;
  return { x: c.x + (dx / d) * FRONT, z: c.z + (dz / d) * FRONT };
}

/** Where the roads are: the point of each place's road nearest to the hub, and the hub itself. */
export const roadSegments = (): { from: V2; to: V2; place: string }[] => G.PLACES.filter(p => p.id !== 'home').map(p => ({ from: HUB, to: standPoint(p.id), place: p.id }));

/** The way to a place from where someone is: to the hub along the road, then out along the road to the place. */
export function routeTo(from: V2, placeId: string): V2[] {
  const stand = standPoint(placeId);
  if (dist(from, stand) < 1) return [];
  return dist(from, HUB) < 1.5 ? [stand] : [HUB, stand];
}

export type AgentState = 'idle' | 'walk' | 'talk';
export interface Agent {
  id: string; pos: V2; path: V2[]; speed: number; node: string; state: AgentState; timer: number;
  heading: number;        // direction faced, in radians (0 faces +z)
  phase: number;          // walking cycle, grows while walking
  say?: string; partner?: string; wander: boolean;
  stuck?: number;         // seconds spent pressed against something solid
}

export const newAgent = (id: string, placeId: string, rng: () => number, wander = true): Agent => {
  const s = standPoint(placeId);
  return { id, pos: { x: s.x + (rng() - 0.5) * 5, z: s.z + (rng() - 0.2) * 4 }, path: [], speed: WALK_SPEED * (0.85 + rng() * 0.3), node: placeId, state: 'idle', timer: rng() * 5, heading: rng() * Math.PI * 2, phase: 0, wander };
};

/** Where an agent would like to go next: any place, with busy places more likely. The workplace only exists for people who have a job. */
export function pickDestination(from: string, rng: () => number, hasJob: boolean): string {
  const ids = G.PLACES.map(p => p.id).filter(id => id !== from && (id !== 'work' || hasJob));
  const busy = new Set(['center', 'market', 'mall', 'station', 'uni', 'mfc', 'bank']);
  const weights = ids.map(id => (busy.has(id) ? 2.2 : 1));
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ids.length; i++) { r -= weights[i]; if (r <= 0) return ids[i]; }
  return ids[ids.length - 1];
}

/** Moves an agent on by `dt` seconds. It never moves faster than its speed. */
/** What the world can tell a walker: how far one can go towards a point without touching anything solid, and a way to a place round everything solid. */
export interface Nav { slide?: (from: V2, to: V2) => V2; route?: (from: V2, placeId: string) => V2[] }
export function stepAgent(a: Agent, dt: number, rng: () => number, hasJob: boolean, nav?: Nav): void {
  const slide = nav?.slide;
  if (a.state === 'walk') {
    let left = a.speed * dt;
    while (left > 1e-9 && a.path.length) {
      const t = a.path[0], d = dist(a.pos, t), step = Math.min(d, left);
      const target = d <= left ? { x: t.x, z: t.z } : { x: a.pos.x + ((t.x - a.pos.x) / d) * step, z: a.pos.z + ((t.z - a.pos.z) / d) * step };
      const p = slide ? slide(a.pos, target) : target, moved = dist(a.pos, p);
      if (d > 1e-9 && moved > 1e-9) a.heading = Math.atan2(t.x - a.pos.x, t.z - a.pos.z);
      a.pos = p;
      if (dist(a.pos, t) < 1e-6) { a.path.shift(); a.stuck = 0; }
      else if (moved < 1e-7) { a.stuck = (a.stuck ?? 0) + dt; if (a.stuck > 0.8) { a.path.shift(); a.stuck = 0; } break; }   // pressed against something: after a moment give up that waypoint
      else a.stuck = 0;
      left -= step;
    }
    a.phase += dt * a.speed * 2.4;
    if (!a.path.length) { a.state = 'idle'; a.timer = 2 + rng() * 6; }
    return;
  }
  if (a.state === 'talk') { a.timer -= dt; if (a.timer <= 0) { a.state = 'idle'; a.timer = 1 + rng() * 3; a.say = undefined; a.partner = undefined; } return; }
  a.timer -= dt;
  if (a.timer <= 0 && a.wander) {
    const dest = pickDestination(a.node, rng, hasJob);
    a.path = nav?.route ? nav.route(a.pos, dest) : routeTo(a.pos, dest); a.node = dest;
    if (a.path.length) { a.state = 'walk'; a.heading = Math.atan2(a.path[0].x - a.pos.x, a.path[0].z - a.pos.z); } else a.timer = 2;
  }
}

/** Sends an agent (the player) to a place now. */
export function sendTo(a: Agent, placeId: string, nav?: Nav): void {
  a.path = nav?.route ? nav.route(a.pos, placeId) : routeTo(a.pos, placeId); a.node = placeId;
  a.state = a.path.length ? 'walk' : 'idle'; a.say = undefined; a.partner = undefined;
}

/** Two people who stand close to each other and are not busy now and then start to talk: they face each other and one speaks. */
export function pairTalk(agents: Agent[], rng: () => number, chance = 0.03): void {
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    if (a.state !== 'idle' || !a.wander) continue;
    for (let j = i + 1; j < agents.length; j++) {
      const b = agents[j];
      if (b.state !== 'idle' || !b.wander || dist(a.pos, b.pos) > 3.6 || rng() > chance) continue;
      const t = 4 + rng() * 5;
      a.state = b.state = 'talk'; a.timer = b.timer = t; a.partner = b.id; b.partner = a.id;
      a.heading = Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z); b.heading = Math.atan2(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
      a.say = SAY[Math.floor(rng() * SAY.length)]; b.say = undefined;
      break;
    }
  }
}

/** A small deterministic random number generator, so a scene can be repeated in a test. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => { s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return (s >>> 8) / 16777216; };
}

/** People keep out of the way of one another. Two who would overlap are moved apart (somebody who stands talking stays put and the other goes round), and
    two who walk towards each other each step a little to their own right before they meet. `slide` keeps anybody from being pushed into a wall. */
export function separate(agents: Agent[], dt: number, slide?: Nav['slide'], min = 0.9): void {
  const move = (a: Agent, x: number, z: number): void => { const to = { x: a.pos.x + x, z: a.pos.z + z }; a.pos = slide ? slide(a.pos, to) : to; };
  for (let i = 0; i < agents.length; i++) for (let j = i + 1; j < agents.length; j++) {
    const a = agents[i], b = agents[j]; let dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
    if (Math.abs(dx) > 2.8 || Math.abs(dz) > 2.8) continue;
    let d = Math.hypot(dx, dz);
    if (d < min) {
      if (d < 1e-6) { const t = (i * 2.399963 + j) % (Math.PI * 2); dx = Math.sin(t); dz = Math.cos(t); d = 1; }      // exactly on top of each other: apart in some fixed direction
      const fa = a.state !== 'talk', fb = b.state !== 'talk'; if (!fa && !fb) continue;
      const push = Math.min(min - Math.min(Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z), min), 4 * dt + 0.02), ux = dx / d, uz = dz / d, sa = fa && fb ? 0.5 : fa ? 1 : 0, sb = fa && fb ? 0.5 : fb ? 1 : 0;
      if (sa) move(a, -ux * push * sa, -uz * push * sa);
      if (sb) move(b, ux * push * sb, uz * push * sb);
    } else if (a.state === 'walk' && b.state === 'walk' && d < 2.8) {
      const ax = Math.sin(a.heading), az = Math.cos(a.heading), bx = Math.sin(b.heading), bz = Math.cos(b.heading);
      if (ax * bx + az * bz > -0.5 || (dx * ax + dz * az) / d < 0.6) continue;                // only two who come at each other, nearly head on
      const step = 0.9 * dt; move(a, -az * step, ax * step); move(b, -bz * step, bx * step);
    }
  }
}

/** The player walks by themselves (the keys or the stick on the screen): one step in a direction of the ground at the player's pace.
    A direction shorter than 1 is a slower walk; (almost) none leaves them standing. Walking by hand drops any trip that was under way. */
export function steer(a: Agent, dir: V2, dt: number, slide?: Nav['slide']): void {
  const len = Math.hypot(dir.x, dir.z);
  if (len < 0.15) { if (a.state === 'walk' && !a.path.length) { a.state = 'idle'; a.timer = 1e9; } return; }
  const k = Math.min(1, len), ux = dir.x / len, uz = dir.z / len, step = a.speed * k * dt;
  a.path = []; a.state = 'walk'; a.say = undefined; a.partner = undefined; a.timer = 1e9;
  a.heading = Math.atan2(ux, uz);
  const to = { x: a.pos.x + ux * step, z: a.pos.z + uz * step };
  a.pos = slide ? slide(a.pos, to) : to;
  a.phase += dt * a.speed * k * 2.4;
}

/** The place whose door somebody standing here is at (within `reach` metres of where people stand in front of it), the nearest first; null if none. */
export function placeNear(p: V2, reach = 5): string | null {
  let best: string | null = null, bd = reach;
  for (const pl of G.PLACES) { const d = dist(p, standPoint(pl.id)); if (d < bd) { bd = d; best = pl.id; } }
  return best;
}

/** At the kerb: somebody about to step from the pavement onto the roadway waits while a car or a bicycle is within `gap` metres of that spot. */
export function mustWait(from: V2, ahead: V2, vehicles: V2[], onRoad: (p: V2) => boolean, gap = 9): boolean {
  return !onRoad(from) && onRoad(ahead) && vehicles.some(v => dist(v, ahead) < gap);
}
