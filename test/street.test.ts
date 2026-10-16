// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import * as G from '../src/engine';
import '../src/content';
import { network, along, newVehicles, stepVehicle, poseOf, roomAhead, footRoute, nodeRoute, onRoadway, streetDistance, RING_R, LANE, BIKE, WALK } from '../src/street';
import { seeded, standPoint, toWorld, HUB, newAgent, stepAgent, separate } from '../src/world-logic';
import type { Agent } from '../src/world-logic';
import { mountWorld3d } from '../src/world3d';

const stub = () => () => ({ domElement: document.createElement('canvas'), setPixelRatio() {}, setSize() {}, render() {}, dispose() {}, shadowMap: { enabled: false, type: 0 }, outputColorSpace: '', toneMapping: 0, toneMappingExposure: 1 }) as never;
const segDist = (p: { x: number; z: number }, a: { x: number; z: number }, b: { x: number; z: number }): number => { const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2)); return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz)); };

describe('the street network', () => {
  const net = network();
  it('reaches every place, and every place can be reached from every other', () => {
    for (const p of G.PLACES) expect(net.endOf[p.id], p.id).toBeGreaterThanOrEqual(0);
    for (const a of G.PLACES) for (const b of G.PLACES) if (net.endOf[a.id] !== net.endOf[b.id]) expect(nodeRoute(net.endOf[a.id], net.endOf[b.id]).length, `${a.id} to ${b.id}`).toBeGreaterThan(0);
  });
  it('has a round roundabout round the home block', () => {
    const ring = net.edges.filter(e => e.ring); expect(ring.length).toBeGreaterThanOrEqual(8);
    for (const e of ring) for (const p of e.pts) expect(Math.hypot(p.x - HUB.x, p.z - HUB.z)).toBeCloseTo(RING_R, 5);
    expect(ring.reduce((n, e) => n + e.len, 0)).toBeGreaterThan(2 * Math.PI * RING_R * 0.97);
  });
  it('no street passes through a place: the middle of every street keeps at least 5 metres from every building', () => {
    for (const e of net.edges) for (let s = 0; s <= e.len; s += 1) { const p = along(e, s, 0); for (const pl of G.PLACES) { if (pl.id === 'home') continue; const c = toWorld(pl), dx = Math.max(Math.abs(p.x - c.x) - 5.7, 0), dz = Math.max(Math.abs(p.z - c.z) - 5.7, 0); expect(Math.hypot(dx, dz), `${pl.id} at ${s}`).toBeGreaterThan(5); } }
  });
  it('streets do not cross each other except where they meet', () => {
    const roads = net.edges.filter(e => !e.ring);
    const cross = (a: { x: number; z: number }, b: { x: number; z: number }, c: { x: number; z: number }, d: { x: number; z: number }): boolean => { const o = (p: typeof a, q: typeof a, r: typeof a): number => (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; };
    for (let i = 0; i < roads.length; i++) for (let j = i + 1; j < roads.length; j++) for (let a = 1; a < roads[i].pts.length; a++) for (let b = 1; b < roads[j].pts.length; b++) expect(cross(roads[i].pts[a - 1], roads[i].pts[a], roads[j].pts[b - 1], roads[j].pts[b])).toBe(false);
  });
  it('a point on a street is found again by its distance along it and to the right of it', () => {
    const e = net.edges.find(x => !x.ring)!; const mid = along(e, e.len / 2, 0), right = along(e, e.len / 2, 2);
    expect(Math.hypot(mid.x - right.x, mid.z - right.z)).toBeCloseTo(2, 5); expect(streetDistance(mid)).toBeLessThan(0.01);
    const fx = Math.sin(mid.heading), fz = Math.cos(mid.heading); expect((right.x - mid.x) * fz - (right.z - mid.z) * fx).toBeLessThan(0);   // to the right of the way it runs
  });
});

describe('cars and bicycles', () => {
  const net = network();
  const run = (seed: number, cars = 11, bikes = 5, secs = 300) => {
    const rng = seeded(seed), vs = newVehicles(cars, bikes, rng), gone = vs.map(() => 0); let last = vs.map(v => poseOf(v)), minSame = Infinity, maxHalt = 0, offLane = 0;
    for (let i = 0; i < secs * 20; i++) {
      for (const v of vs) stepVehicle(v, 0.05, vs, 1, rng);
      const ps = vs.map(v => poseOf(v));
      ps.forEach((p, k) => { const d = Math.hypot(p.x - last[k].x, p.z - last[k].z); if (d < 2) gone[k] += d; maxHalt = Math.max(maxHalt, vs[k].halt); const e = net.edges[vs[k].edge], most = e.ring ? (vs[k].kind === 'bike' ? 1.4 : 0) : vs[k].kind === 'bike' ? BIKE : LANE; const off = Math.min(...e.pts.slice(1).map((q, j) => segDist(p, e.pts[j], q))); if (off > most + 0.15) offLane++; });      // never further out than its own lane: a car never on the cycle strip, a bicycle never on the pavement
      for (let a = 0; a < vs.length; a++) for (let b = a + 1; b < vs.length; b++) if (vs[a].kind === vs[b].kind && vs[a].edge === vs[b].edge && vs[a].dir === vs[b].dir) minSame = Math.min(minSame, Math.abs(vs[a].s - vs[b].s) - (vs[a].len + vs[b].len) / 2);
      last = ps;
    }
    return { vs, gone, minSame, maxHalt, offLane };
  };
  it('start spread out, the asked number of each', () => {
    const vs = newVehicles(11, 5, seeded(4)); expect(vs.filter(v => v.kind === 'car').length).toBe(11); expect(vs.filter(v => v.kind === 'bike').length).toBe(5);
    for (let a = 0; a < vs.length; a++) for (let b = a + 1; b < vs.length; b++) { const p = poseOf(vs[a]), q = poseOf(vs[b]); expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeGreaterThanOrEqual(7); }
    expect(newVehicles(11, 5, seeded(4))).toEqual(vs);
  });
  it('for five minutes of a rush hour, with five different starts: nobody runs into the one in front, everybody keeps to their lane, nobody is stuck, and everybody gets somewhere', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const r = run(seed);
      expect(r.minSame, `seed ${seed}: gap`).toBeGreaterThan(0.5);          // bumper to bumper, in the same lane
      expect(r.offLane, `seed ${seed}: off the lane`).toBe(0);
      expect(r.maxHalt, `seed ${seed}: longest stand`).toBeLessThan(40);
      expect(Math.min(...r.gone), `seed ${seed}: least distance`).toBeGreaterThan(250);
    }
  }, 60000);
  it('drive on the right: a car has the middle of the street on its left, a bicycle is further out on the same side', () => {
    const rng = seeded(9), vs = newVehicles(8, 4, rng);
    for (const v of vs) { const e = net.edges[v.edge]; if (e.ring) continue; const p = poseOf(v), mid = along(e, v.s, 0), fx = Math.sin(p.heading), fz = Math.cos(p.heading), side = (mid.x - p.x) * fz - (mid.z - p.z) * fx; expect(side).toBeGreaterThan(0); expect(Math.hypot(mid.x - p.x, mid.z - p.z)).toBeCloseTo(v.kind === 'car' ? LANE : BIKE, 4); }
  });
  it('a vehicle waits for a person in front of it and for the vehicle in front; an empty lane ahead is unlimited room', () => {
    const v = newVehicles(1, 0, seeded(2))[0], s0 = v.s; stepVehicle(v, 0.5, [v], 1, seeded(1), () => true); expect(v.s).toBe(s0); expect(v.halt).toBeGreaterThan(0);
    expect(roomAhead(v, [v])).toBe(Infinity);
    const front = { ...v, s: v.s + v.dir * 5 }; expect(roomAhead(v, [v, front])).toBeCloseTo(5 - v.len, 5); stepVehicle(v, 0.5, [v, front], 1, seeded(1)); expect(v.s).toBe(s0);
    const oncoming = { ...v, dir: (v.dir === 1 ? -1 : 1) as 1 | -1, s: v.s + v.dir * 5 }; expect(roomAhead(v, [v, oncoming])).toBe(Infinity);
    const bike = { ...front, kind: 'bike' as const }; expect(roomAhead(v, [v, bike])).toBe(Infinity);
  });
  it('snow and the rush hour slow the cars', () => {
    const go = (factor: number): number => { const rng = seeded(6), vs = newVehicles(3, 0, rng), s = vs.map(v => poseOf(v)); let d = 0; for (let i = 0; i < 100; i++) { vs.forEach(v => stepVehicle(v, 0.05, vs, factor, rng)); } vs.forEach((v, k) => { const p = poseOf(v); d += Math.hypot(p.x - s[k].x, p.z - s[k].z); }); return d; };
    expect(go(0.4)).toBeLessThan(go(1));
  });
});

describe('people on the pavements', () => {
  it('the way on foot keeps to the pavements: no corner of any walk between two places is on a lane or a cycle strip', () => {
    let n = 0;
    for (const a of G.PLACES) for (const b of G.PLACES) { if (a.id === b.id) continue; const r = footRoute(standPoint(a.id), b.id, standPoint(b.id)); expect(r.length).toBeGreaterThan(0); const last = r[r.length - 1]; expect(Math.hypot(last.x - standPoint(b.id).x, last.z - standPoint(b.id).z)).toBeLessThan(0.01); r.slice(0, -1).forEach(p => { n++; expect(onRoadway(p), `${a.id} to ${b.id}`).toBe(false); }); }
    expect(n).toBeGreaterThan(500);
  });
  it('people keep to the right: the walk there and the walk back use opposite pavements of the same street', () => {
    const net = network(), e = net.edges.find(x => !x.ring && net.nodes[x.a].ring && net.nodes[x.b].place === 'center')!;
    const out = footRoute(standPoint('home'), 'center', standPoint('center')), back = footRoute(standPoint('center'), 'home', standPoint('home'));
    const side = (p: { x: number; z: number }): number => { const m = along(e, e.len * 0.6, 0), fx = Math.sin(m.heading), fz = Math.cos(m.heading); return (p.x - m.x) * fz - (p.z - m.z) * fx; };
    const far = (r: { x: number; z: number }[]) => r.filter(p => Math.hypot(p.x - HUB.x, p.z - HUB.z) > RING_R + 8 && segDist(p, e.pts[0], e.pts[e.pts.length - 1]) < WALK + 1);
    expect(far(out).length).toBeGreaterThan(0); expect(far(back).length).toBeGreaterThan(0);
    expect(Math.sign(side(far(out)[0]))).toBe(-Math.sign(side(far(back)[0])));
  });
  it('two people who would stand in each other are moved apart; one who is talking stays where they are', () => {
    const rng = seeded(1), a = newAgent('a', 'market', rng), b = newAgent('b', 'market', rng); a.pos = { x: 10, z: 10 }; b.pos = { x: 10.2, z: 10 };
    for (let i = 0; i < 40; i++) separate([a, b], 0.05); expect(Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z)).toBeGreaterThanOrEqual(0.89);
    a.pos = { x: 10, z: 10 }; b.pos = { x: 10, z: 10 }; for (let i = 0; i < 40; i++) separate([a, b], 0.05); expect(Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z)).toBeGreaterThanOrEqual(0.89);
    a.pos = { x: 10, z: 10 }; b.pos = { x: 10.3, z: 10 }; a.state = 'talk'; for (let i = 0; i < 40; i++) separate([a, b], 0.05); expect(a.pos).toEqual({ x: 10, z: 10 }); expect(b.pos.x).toBeGreaterThan(10.85);
    const wall = (from: { x: number; z: number }): { x: number; z: number } => from; a.state = 'idle'; a.pos = { x: 0, z: 0 }; b.pos = { x: 0.1, z: 0 }; separate([a, b], 0.05, wall); expect(a.pos).toEqual({ x: 0, z: 0 });      // a wall on every side: nobody is pushed into it
  });
  it('two people who walk straight at each other pass without touching and both arrive', () => {
    const rng = seeded(3), mk = (id: string, x: number, to: number): Agent => { const a = newAgent(id, 'market', rng, false); a.pos = { x, z: 0 }; a.path = [{ x: to, z: 0 }]; a.state = 'walk'; a.heading = Math.atan2(to - x, 0); a.speed = 1.4; return a; };
    const a = mk('a', -6, 6), b = mk('b', 6, -6); let min = Infinity;
    for (let i = 0; i < 400; i++) { stepAgent(a, 0.05, rng, false); stepAgent(b, 0.05, rng, false); separate([a, b], 0.05); min = Math.min(min, Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z)); }
    expect(min).toBeGreaterThan(0.8); expect(a.pos.x).toBeCloseTo(6, 1); expect(b.pos.x).toBeCloseTo(-6, 1);
  });
});

describe('the streets in the 3D city', () => {
  it('are laid on the ground; cars and bicycles are on them, each in its lane; walkers stay off the roadway most of the time and do not stand in each other', async () => {
    const s = G.newState('T', 'moscow'); s.queue = []; s.slot = 0; s.weather = 'clear';
    const h = await mountWorld3d({ host: document.body.appendChild(document.createElement('div')), s, onPlace: () => undefined, onNpc: () => undefined, onFail: () => undefined, rendererFactory: stub() });
    const streets = h.scene.children.find(o => o.userData.streets) as THREE.Group; expect(streets.children.length).toBeGreaterThan(60);
    const v0 = h.vehicles(); expect(v0.filter(v => v.kind === 'car').length).toBe(h.traffic().count); expect(v0.filter(v => v.kind === 'bike').length).toBe(5);
    expect(h.scene.children.filter(o => o.userData.vehicle).length).toBe(v0.length);
    let onRoad = 0, samples = 0, close = 0, pairs = 0;
    for (let i = 0; i < 1800; i++) {
      h.tick(0.05);
      if (i < 200 || i % 10) continue;                                          // after the crowd has sorted itself out
      const ps = h.people();
      for (const p of ps) { if (p.state !== 'walk') continue; samples++; if (onRoadway(p)) onRoad++; }
      for (let a = 0; a < ps.length; a++) for (let b = a + 1; b < ps.length; b++) { pairs++; if (Math.hypot(ps[a].x - ps[b].x, ps[a].z - ps[b].z) < 0.6) close++; }
      for (const v of h.vehicles()) expect(streetDistance(v)).toBeLessThan(BIKE + 0.4);
    }
    expect(samples).toBeGreaterThan(100); expect(onRoad / samples, 'share of walking time on the roadway').toBeLessThan(0.2);
    expect(close / pairs, 'share of pairs closer than 0.6 m').toBeLessThan(0.002);
    const v1 = h.vehicles(); expect(v1.some((v, i) => Math.hypot(v.x - v0[i].x, v.z - v0[i].z) > 10)).toBe(true);
    h.setLayer('traffic', false); expect(h.scene.children.filter(o => o.userData.vehicle).every(o => !o.visible)).toBe(true);
    s.weather = 'snow'; h.update(s); expect(h.vehicles().filter(v => v.kind === 'bike').length).toBe(1);        // few cycle in the snow
    h.destroy(); expect(h.scene.children.filter(o => o.userData.vehicle).length).toBe(0);
  }, 60000);
});
