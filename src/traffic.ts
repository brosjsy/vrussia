/* Cars on the roads of the 3D city. They drive between the hub and the places, one lane each way, more of them and slower at the rush hours (the
   morning and the evening) and slower still in snow, rain or frost: a "go-slow", as the other life game's map calls its traffic layer. Cars are only
   scenery: they never touch the people or the game's numbers. Pure and deterministic, so it is tested without a screen. The idea of a traffic layer came from
   watching that game's map; the rules and numbers are ours. */
import type { V2 } from './world-logic';

export interface Car { seg: number; t: number; dir: 1 | -1; speed: number; color: string; wait: number }
export interface Level { count: number; factor: number; jam: boolean }
export interface Seg { from: V2; to: V2 }

const COLORS = ['#e0373f', '#3b6fe0', '#f0b43c', '#f4f6f8', '#16203a', '#3ec27a', '#a56be0', '#8a8f99', '#e07b2a'];
/** How many cars and how fast, for a part of the day (0 morning, 1 afternoon, 2 evening) and the weather. Rush hours are crowded and slow. */
export function levelFor(slot: number, weather: string, saver = false): Level {
  const base = slot === 0 ? 11 : slot === 2 ? 10 : 6;
  const slow = weather === 'snow' ? 0.55 : weather === 'rain' ? 0.7 : weather === 'frost' ? 0.8 : 1;
  const rush = slot === 0 || slot === 2;
  const factor = (rush ? 0.62 : 1) * slow;
  return { count: saver ? Math.min(4, base) : base, factor, jam: factor < 0.65 };
}

export const segLength = (s: Seg): number => Math.hypot(s.to.x - s.from.x, s.to.z - s.from.z);

/** The cars of a scene: spread over the roads, the same for the same random source. */
export function newCars(count: number, segs: Seg[], rng: () => number): Car[] {
  const out: Car[] = [];
  for (let i = 0; i < count && segs.length; i++) {
    const seg = Math.floor(rng() * segs.length), dir: 1 | -1 = rng() < 0.5 ? 1 : -1;
    out.push({ seg, t: rng() * segLength(segs[seg]), dir, speed: 5 + rng() * 3, color: COLORS[Math.floor(rng() * COLORS.length)], wait: 0 });
  }
  return out;
}

/** Moves a car on by `dt` seconds. At the end of a road it waits a moment and turns round, or, at the hub, goes on to another road. */
export function stepCar(c: Car, dt: number, segs: Seg[], factor: number, rng: () => number, blockedAhead?: (x: number, z: number) => boolean): void {
  if (!segs.length) return;
  if (c.wait > 0) { c.wait = Math.max(0, c.wait - dt); return; }
  if (blockedAhead) { const p = carPose(c, segs), ax = p.x + Math.sin(p.heading) * 3.4, az = p.z + Math.cos(p.heading) * 3.4; if (blockedAhead(ax, az) || blockedAhead(p.x + Math.sin(p.heading) * 1.8, p.z + Math.cos(p.heading) * 1.8)) return; }   // a person in the way: the car waits
  c.t += c.dir * c.speed * factor * dt;
  const len = segLength(segs[c.seg]);
  if (c.t >= len) { c.t = len; c.dir = -1; c.wait = 0.8 + rng() * 1.5; }
  else if (c.t <= 0) { c.t = 0; c.dir = 1; c.wait = 0.3; c.seg = Math.floor(rng() * segs.length); }
}

/** Where a car is and which way it faces, in the right-hand lane. */
export function carPose(c: Car, segs: Seg[]): { x: number; z: number; heading: number } {
  const s = segs[c.seg], len = segLength(s) || 1, ux = (s.to.x - s.from.x) / len, uz = (s.to.z - s.from.z) / len;
  const lane = 1.0 * c.dir;                                   // the car going out keeps to one side, the one coming back to the other
  return { x: s.from.x + ux * c.t + -uz * lane, z: s.from.z + uz * c.t + ux * lane, heading: Math.atan2(ux * c.dir, uz * c.dir) };
}
