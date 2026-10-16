/* The streets of the 3D city. One network for everybody: a roundabout round the home block and streets that go out from it and branch, bending round the
   places instead of passing under them. Every street has the same cross-section: a lane each way for cars (driving on the right), a cycle strip beside
   each lane, then a pavement on each side. Cars keep to their lane and keep a gap to the one in front; bicycles keep to the cycle strip; people walk on
   the pavement, on the right-hand side of the street for the way they are going, so two people going opposite ways use opposite pavements.
   Pure and deterministic (no screen), so all of it is tested. */
import * as G from './engine';
import { Field } from './collide';
import { HUB, toWorld } from './world-logic';
import type { V2 } from './world-logic';

export const RING_R = 11;          // the car lane of the roundabout, metres from the middle of the home block
export const LANE = 1.5;           // the middle of a car lane, metres from the middle of the street
export const BIKE = 3.6;           // the middle of the cycle strip
export const WALK = 5.2;           // the middle of the pavement
export const STREET_HALF = 6.0;    // the outer edge of the pavement
export const RING_BIKE = 1.4;      // on the roundabout the cycle strip is this far outside the car lane
export const RING_WALK = 3.2;      // and the pavement this far outside it
export const END_GAP = 15;         // a street stops this far before the middle of its place

export interface Node { x: number; z: number; ring: boolean; angle: number; place?: string }
export interface Edge { a: number; b: number; pts: V2[]; cum: number[]; len: number; ring: boolean }
export interface Net { nodes: Node[]; edges: Edge[]; at: number[][]; endOf: Record<string, number> }

const TAU = Math.PI * 2;
const norm = (a: number): number => ((a % TAU) + TAU) % TAU;
const gap = (a: number, b: number): number => { const d = Math.abs(norm(a) - norm(b)); return Math.min(d, TAU - d); };
const angleOf = (p: V2): number => norm(Math.atan2(p.x - HUB.x, p.z - HUB.z));
const onRing = (a: number, r = RING_R): V2 => ({ x: HUB.x + Math.sin(a) * r, z: HUB.z + Math.cos(a) * r });
const d2 = (a: V2, b: V2): number => Math.hypot(a.x - b.x, a.z - b.z);

function makeEdge(a: number, b: number, pts: V2[], ring: boolean): Edge {
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + d2(pts[i - 1], pts[i]));
  return { a, b, pts, cum, len: cum[cum.length - 1], ring };
}
const cross = (a: V2, b: V2, c: V2, d: V2): boolean => {
  const o = (p: V2, q: V2, r: V2): number => (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
};
const segPoint = (p: V2, a: V2, b: V2): number => { const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2)); return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz)); };

let cached: Net | null = null;
/** The street network of the city (the same for every city: the places stand in the same spots). Built once. */
export function network(): Net {
  if (cached) return cached;
  const places = G.PLACES.filter(p => p.id !== 'home').map(p => { const c = toWorld(p), dx = HUB.x - c.x, dz = HUB.z - c.z, d = Math.hypot(dx, dz) || 1; return { id: p.id, c, d, end: { x: c.x + (dx / d) * END_GAP, z: c.z + (dz / d) * END_GAP } }; }).sort((a, b) => a.d - b.d);
  const solid = new Field(); for (const p of places) solid.addRect(p.c.x, p.c.z, 5.7, 5.7);
  const nodes: Node[] = [], roads: Edge[] = [], endOf: Record<string, number> = {};
  const hubDist: number[] = [];                       // how far a node is from the roundabout along the streets
  const ringNode = (angle: number): number => { const p = onRing(angle); nodes.push({ ...p, ring: true, angle: norm(angle) }); hubDist.push(0); return nodes.length - 1; };
  const dirAt = (e: Edge, n: number): number => { const [p, q] = e.a === n ? [e.pts[0], e.pts[1]] : [e.pts[e.pts.length - 1], e.pts[e.pts.length - 2]]; return Math.atan2(q.x - p.x, q.z - p.z); };
  // places that stand right beside the roundabout have no street of their own: their door opens onto it
  for (const p of places) if (d2(p.end, HUB) < RING_R + 9) { endOf[p.id] = ringNode(angleOf(p.end)); nodes[endOf[p.id]].place = p.id; }
  for (const p of places) {
    if (endOf[p.id] !== undefined) continue;
    const ringAngles = nodes.filter(n => n.ring).map(n => n.angle), myAngle = angleOf(p.end);
    type Try = { from: number | null; pts: V2[]; score: number };
    const tries: Try[] = [];
    const plan = (start: V2): V2[] => [start, ...solid.path(start, p.end, STREET_HALF - 0.4)];
    const fits = (from: number | null, pts: V2[]): boolean => {
      if (pts.some((q, i) => i > 0 && d2(q, HUB) < RING_R + 1)) return false;
      for (let i = 1; i < pts.length; i++) for (const e of roads) for (let j = 1; j < e.pts.length; j++) if (cross(pts[i - 1], pts[i], e.pts[j - 1], e.pts[j])) return false;
      // not along another street: every point of the new street keeps a street's width from the others, except close to where it starts
      for (let i = 1; i < pts.length; i++) for (let k = 1; k <= 4; k++) { const t = k / 4, q = { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, z: pts[i - 1].z + (pts[i].z - pts[i - 1].z) * t }; if (d2(q, pts[0]) < 16) continue; for (const e of roads) if (from === null || (e.a !== from && e.b !== from)) for (let j = 1; j < e.pts.length; j++) if (segPoint(q, e.pts[j - 1], e.pts[j]) < STREET_HALF * 2) return false; }
      if (from !== null) { const h = Math.atan2(pts[1].x - pts[0].x, pts[1].z - pts[0].z); for (const e of roads) if ((e.a === from || e.b === from) && gap(h, dirAt(e, from)) < 0.7) return false; }
      return true;
    };
    if (ringAngles.every(a => gap(a, myAngle) > 0.9)) { const pts = plan(onRing(myAngle)); if (fits(null, pts)) tries.push({ from: null, pts, score: makeEdge(0, 0, pts, false).len }); }
    nodes.forEach((n, i) => { if (d2(n, HUB) > p.d) return; const pts = plan(n); if (fits(i, pts)) tries.push({ from: i, pts, score: hubDist[i] + makeEdge(0, 0, pts, false).len + (n.ring ? 0 : 4) }); });
    let best = tries.sort((a, b) => a.score - b.score)[0];
    if (!best) best = { from: null, pts: plan(onRing(myAngle)), score: 0 };          // nothing fits cleanly: a street of its own from the roundabout
    const from = best.from ?? ringNode(myAngle);
    const end = best.pts[best.pts.length - 1]; nodes.push({ x: end.x, z: end.z, ring: false, angle: angleOf(end), place: p.id });
    const e = makeEdge(from, nodes.length - 1, best.pts, false); roads.push(e); hubDist.push(hubDist[from] + e.len); endOf[p.id] = nodes.length - 1;
  }
  // home opens onto the roundabout at its front; extra points keep the roundabout round
  const ring = (): number[] => nodes.map((n, i) => (n.ring ? i : -1)).filter(i => i >= 0).sort((a, b) => nodes[a].angle - nodes[b].angle);
  if (ring().every(i => gap(nodes[i].angle, 0) > 0.25)) ringNode(0);
  endOf.home = ring().reduce((b, i) => (gap(nodes[i].angle, 0) < gap(nodes[b].angle, 0) ? i : b));
  for (let guard = 0; guard < 40; guard++) {
    const r = ring(); let added = false;
    for (let i = 0; i < r.length; i++) { const a = nodes[r[i]].angle, b = nodes[r[(i + 1) % r.length]].angle, span = norm(b - a) || TAU; if (span > 0.8) { ringNode(a + span / 2); added = true; break; } }
    if (!added) break;
  }
  const r = ring(), edges: Edge[] = [];
  for (let i = 0; i < r.length; i++) {
    const a = nodes[r[i]].angle, b = nodes[r[(i + 1) % r.length]].angle, span = norm(b - a) || TAU, n = Math.max(2, Math.ceil(span / 0.17));
    edges.push(makeEdge(r[i], r[(i + 1) % r.length], Array.from({ length: n + 1 }, (_, k) => onRing(a + (span * k) / n)), true));
  }
  edges.push(...roads);
  const at: number[][] = nodes.map(() => []); edges.forEach((e, i) => { at[e.a].push(i); at[e.b].push(i); });
  cached = { nodes, edges, at, endOf };
  return cached;
}

/** A point of a street: `s` metres along it from its first end and `lat` metres to the right of that direction. Also the direction of the street there. */
export function along(e: Edge, s: number, lat: number): { x: number; z: number; heading: number } {
  const t = Math.max(0, Math.min(e.len, s)); let i = 1; while (i < e.cum.length - 1 && e.cum[i] < t) i++;
  const p = e.pts[i - 1], q = e.pts[i], l = e.cum[i] - e.cum[i - 1] || 1, ux = (q.x - p.x) / l, uz = (q.z - p.z) / l, f = t - e.cum[i - 1];
  return { x: p.x + ux * f - uz * lat, z: p.z + uz * f + ux * lat, heading: Math.atan2(ux, uz) };
}
/** Every straight piece of every street (for things that must keep clear of the streets). */
let segs: { from: V2; to: V2; ring: boolean }[] | null = null;
export const streetSegments = (): { from: V2; to: V2; ring: boolean }[] => (segs ??= network().edges.flatMap(e => e.pts.slice(1).map((q, i) => ({ from: e.pts[i], to: q, ring: e.ring }))));
/** How far a point is from the middle line of the nearest street. */
export const streetDistance = (p: V2): number => streetSegments().reduce((m, s) => Math.min(m, segPoint(p, s.from, s.to)), Infinity);

/* ---------- vehicles ---------- */
export type Kind = 'car' | 'bike';
export interface Vehicle { kind: Kind; edge: number; dir: 1 | -1; s: number; speed: number; color: string; wait: number; len: number; halt: number; next?: number }
const COLORS = ['#e0373f', '#3b6fe0', '#f0b43c', '#f4f6f8', '#16203a', '#3ec27a', '#a56be0', '#8a8f99', '#e07b2a'];
const BIKE_COLORS = ['#e0373f', '#2f6fd6', '#1f9d55', '#f0b43c', '#16203a'];

/** Where a vehicle is and which way it faces: a car in the right-hand lane, a bicycle on the cycle strip. */
export function poseOf(v: Vehicle, net: Net = network()): { x: number; z: number; heading: number } {
  const e = net.edges[v.edge], lat = e.ring ? (v.kind === 'bike' ? RING_BIKE : 0) : v.dir * (v.kind === 'bike' ? BIKE : LANE);
  const p = along(e, v.s, lat);
  return v.dir === 1 ? p : { x: p.x, z: p.z, heading: p.heading + Math.PI };
}
/** How much free lane a vehicle has in front of it, in metres (bumper to bumper); Infinity when its lane is empty ahead. Cars and bicycles have lanes of
    their own, so only a vehicle of the same kind, on the same street and going the same way, can be in front. */
export function roomAhead(v: Vehicle, all: Vehicle[]): number {
  let room = Infinity;
  for (const u of all) { if (u === v || u.kind !== v.kind || u.edge !== v.edge || u.dir !== v.dir) continue; const fwd = (u.s - v.s) * v.dir; if (fwd > 0) room = Math.min(room, fwd - (v.len + u.len) / 2); }
  return room;
}
/** How far before a junction a vehicle stops (and how far past it it joins the next street), so that the junction itself stays empty: more before the
    roundabout, where the cycle strip and the pavement also pass; nothing at the end of a street. */
export function stopBack(node: number, kind: Kind, e: Edge, net: Net = network()): number {
  if (e.ring) return 0;
  const back = net.nodes[node].ring ? (kind === 'car' ? 4.4 : 3.0) : net.at[node].length >= 2 ? 3.5 : 0;
  return Math.min(back, e.len / 2 - 0.5);
}
/** The vehicles of a scene, spread over the streets with room between them; the same for the same random source. */
export function newVehicles(cars: number, bikes: number, rng: () => number, net: Net = network()): Vehicle[] {
  const out: Vehicle[] = [];
  for (let i = 0, tries = 0; i < cars + bikes && tries < 600; tries++) {
    const kind: Kind = i < cars ? 'car' : 'bike', edge = Math.floor(rng() * net.edges.length), e = net.edges[edge];
    const v: Vehicle = { kind, edge, dir: e.ring || rng() < 0.5 ? 1 : -1, s: stopBack(e.a, kind, e, net) + rng() * (e.len - stopBack(e.a, kind, e, net) - stopBack(e.b, kind, e, net)), speed: kind === 'car' ? 6 + rng() * 3 : 3.2 + rng() * 1.6, color: (kind === 'car' ? COLORS : BIKE_COLORS)[Math.floor(rng() * (kind === 'car' ? COLORS.length : BIKE_COLORS.length))], wait: 0, len: kind === 'car' ? 4.2 : 1.8, halt: 0 };
    const p = poseOf(v, net);
    if (out.some(u => { const q = poseOf(u, net); return Math.hypot(q.x - p.x, q.z - p.z) < 7; })) continue;
    out.push(v); i++;
  }
  return out;
}
/** Moves a vehicle on by `dt` seconds. It slows and stops behind the vehicle in front of it in its lane, and for a person in its way (`personAhead`). At a
    junction it gives way: it joins the next lane only when there is room there, and the roundabout only when nobody on it is about to pass. It takes one
    of the streets that leave the junction, never the one it came by unless the street ends there, where it waits a moment and turns round. */
export function stepVehicle(v: Vehicle, dt: number, all: Vehicle[], factor: number, rng: () => number, personAhead?: (x: number, z: number) => boolean, net: Net = network()): void {
  if (v.wait > 0) { v.wait = Math.max(0, v.wait - dt); return; }
  const p = poseOf(v, net), fx = Math.sin(p.heading), fz = Math.cos(p.heading), nose = v.len / 2;
  if (personAhead && (personAhead(p.x + fx * (nose + 0.9), p.z + fz * (nose + 0.9)) || personAhead(p.x + fx * (nose + 2.4), p.z + fz * (nose + 2.4)))) { v.halt += dt; return; }
  const ease = Math.max(0, Math.min(1, (roomAhead(v, all) - 1.4) / 4));
  if (ease <= 0) { v.halt += dt; return; }
  const e = net.edges[v.edge], lo = stopBack(e.a, v.kind, e, net), hi = e.len - stopBack(e.b, v.kind, e, net);
  v.s += v.dir * v.speed * (v.kind === 'car' ? factor : Math.max(0.75, factor)) * ease * dt;
  if (v.s < hi && v.s > lo) { v.halt = 0; return; }
  const node = v.dir === 1 ? e.b : e.a, over = v.dir === 1 ? v.s - hi : lo - v.s;
  v.s = v.dir === 1 ? hi : lo;                                      // at the junction: it stands at the end of its lane until the way on is free
  const free = (edge: number, dir: 1 | -1, s: number, reach = 1.2): boolean => all.every(u => u === v || u.kind !== v.kind || u.edge !== edge || u.dir !== dir || Math.abs(u.s - s) > (v.len + u.len) / 2 + reach);
  const ways: { edge: number; dir: 1 | -1 }[] = [];
  for (const i of net.at[node]) { if (i === v.edge) continue; const n = net.edges[i]; if (n.a === node) ways.push({ edge: i, dir: 1 }); else if (!n.ring) ways.push({ edge: i, dir: -1 }); }
  if (!ways.length) {                                               // the end of the street: stop a moment, then back the other way
    const back: 1 | -1 = v.dir === 1 ? -1 : 1;
    if (!free(v.edge, back, v.s)) { v.halt += dt; return; }
    v.dir = back; v.wait = 1 + rng() * 2.5; v.halt = 0; return;
  }
  if (v.halt > 2.5 && ways.length > 1) { v.next = undefined; v.halt = 0.5; }                 // the way it wanted stays shut: it thinks again
  if (v.next === undefined || !ways.some(w => w.edge === v.next)) v.next = ways[Math.floor(rng() * ways.length)].edge;
  const w = ways.find(x => x.edge === v.next) as { edge: number; dir: 1 | -1 }, n = net.edges[w.edge], nlo = stopBack(n.a, v.kind, n, net), nhi = n.len - stopBack(n.b, v.kind, n, net), s2 = w.dir === 1 ? Math.min(nlo + over, nhi) : Math.max(nlo, nhi - over);
  let ok = free(w.edge, w.dir, s2);
  if (ok && n.ring && !e.ring) {                                    // joining the roundabout: whoever is on it goes first, and it is never packed full
    const before = net.at[node].find(i => net.edges[i].ring && net.edges[i].b === node);
    if (before !== undefined && all.some(u => u !== v && u.kind === v.kind && u.edge === before && net.edges[before].len - u.s < (v.len + u.len) / 2 + 3)) ok = false;
    if (all.filter(u => u.kind === v.kind && net.edges[u.edge].ring).length >= 5) ok = false;
  }
  if (!ok) { v.halt += dt; return; }
  v.edge = w.edge; v.dir = w.dir; v.s = s2; v.next = undefined; v.halt = 0;
}

/* ---------- people on the pavements ---------- */
/** The nearest point of the network to a spot: which node. */
export function nearestNode(p: V2, net: Net = network()): number { let best = 0, bd = Infinity; net.nodes.forEach((n, i) => { const d = d2(n, p); if (d < bd) { bd = d; best = i; } }); return best; }
/** The streets to take from one junction to another, the shortest way (people may walk either way round the roundabout). */
export function nodeRoute(from: number, to: number, net: Net = network()): { edge: number; dir: 1 | -1 }[] {
  const dist = net.nodes.map(() => Infinity), prev: ({ node: number; edge: number; dir: 1 | -1 } | null)[] = net.nodes.map(() => null), done = new Set<number>(); dist[from] = 0;
  for (;;) {
    let n = -1; for (let i = 0; i < dist.length; i++) if (!done.has(i) && dist[i] < Infinity && (n < 0 || dist[i] < dist[n])) n = i;
    if (n < 0 || n === to) break; done.add(n);
    for (const i of net.at[n]) { const e = net.edges[i], m = e.a === n ? e.b : e.a; if (dist[n] + e.len < dist[m]) { dist[m] = dist[n] + e.len; prev[m] = { node: n, edge: i, dir: e.a === n ? 1 : -1 }; } }
  }
  const out: { edge: number; dir: 1 | -1 }[] = []; for (let n = to; n !== from; ) { const p = prev[n]; if (!p) return []; out.unshift({ edge: p.edge, dir: p.dir }); n = p.node; }
  return out;
}
/** The way on foot from where somebody stands to the front of a place: along the pavements, on the right-hand side of each street for the way they go, round the outside of the roundabout, and at the end across to the door (`stand`). */
export function footRoute(from: V2, place: string, stand: V2, net: Net = network()): V2[] {
  const goal = net.endOf[place]; if (goal === undefined) return [stand];
  if (d2(from, stand) < 1) return [];
  const out: V2[] = [], push = (p: V2): void => { const l = out[out.length - 1]; if (!l || d2(l, p) > 0.6) out.push(p); };
  const edgeOfRing = RING_R + RING_WALK + 0.8;
  for (const leg of nodeRoute(nearestNode(from, net), goal, net)) {
    const e = net.edges[leg.edge], lat = e.ring ? RING_WALK : leg.dir * WALK, idx = e.pts.map((_, i) => i); if (leg.dir === -1) idx.reverse();
    for (let k = 0; k < idx.length; k++) {
      const i = idx[k], first = i === 0, seg = first ? 1 : i;                       // the piece of street this corner belongs to
      const p = e.pts[seg - 1], q = e.pts[seg], l = d2(p, q) || 1, ux = (q.x - p.x) / l, uz = (q.z - p.z) / l, c = e.pts[i];
      const w = { x: c.x - uz * lat, z: c.z + ux * lat };
      if (!e.ring && d2(w, HUB) < edgeOfRing) continue;
      if (!e.ring && onRoadway(w, net)) continue;                                   // at a junction a corner of one pavement can lie on the next street: there the walker crosses straight over                             // not onto the roundabout's roadway: the pavement of the roundabout takes over there
      push(w);
    }
  }
  // somebody who is already further along than the first corner does not walk back to it
  while (out.length > 1 && d2(from, out[1]) < d2(out[0], out[1])) out.shift();
  push(stand);
  return out;
}

/** Is a point on the part of a street where vehicles drive (the lanes and the cycle strips, or the roadway of the roundabout)? */
export function onRoadway(p: V2, net: Net = network()): boolean {
  const r = d2(p, HUB); if (r > RING_R - 1.7 && r < RING_R + RING_BIKE + 0.6) return true;
  return r > RING_R + RING_WALK + 1.2 && net.edges.some(e => !e.ring && e.pts.some((q, i) => i > 0 && segPoint(p, e.pts[i - 1], q) < BIKE + 0.6));
}
/** For tests: forget the network so that it is built again. */
export const resetNetwork = (): void => { cached = null; segs = null; };
