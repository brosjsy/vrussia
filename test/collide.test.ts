// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { Field, clearLine } from '../src/collide';
import { stepAgent, seeded, standPoint, roadSegments } from '../src/world-logic';
import type { Agent } from '../src/world-logic';
import { stepCar } from '../src/traffic';
import { mountWorld3d } from '../src/world3d';
import type { World3dDeps } from '../src/world3d';
import type { RealBuilding } from '../src/osm';

describe('solid shapes', () => {
  it('a box blocks anything that touches it, by the size of the person, and leaves free ground free', () => {
    const f = new Field(); f.addRect(0, 0, 5, 5);
    expect(f.blocked(0, 0)).toBe(true); expect(f.blocked(4.9, 0)).toBe(true); expect(f.blocked(5.3, 0, 0.4)).toBe(true); expect(f.blocked(5.5, 0, 0.4)).toBe(false); expect(f.blocked(5.3, 0, 0.1)).toBe(false);
    expect(f.blocked(5.2, 5.2, 0.4)).toBe(true); expect(f.blocked(5.4, 5.4, 0.4)).toBe(false);
    expect(f.blocked(20, 20)).toBe(false); expect(f.size).toBe(1);
  });
  it('the outline of a building, including a bent one with a notch, blocks inside and near the walls only', () => {
    const f = new Field(); f.addPoly([[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]]);
    expect(f.blocked(2, 2)).toBe(true); expect(f.blocked(2, 8)).toBe(true); expect(f.blocked(8, 2)).toBe(true);
    expect(f.blocked(8, 8)).toBe(false);
    expect(f.blocked(10.3, 2, 0.4)).toBe(true); expect(f.blocked(11, 2, 0.4)).toBe(false); expect(f.blocked(-0.3, 5, 0.4)).toBe(true); expect(f.blocked(-1, 5, 0.4)).toBe(false);
    f.addPoly([[0, 0], [1, 1]]); expect(f.size).toBe(1);
  });
  it('a round thing like a tree blocks by its radius plus the size of the person', () => {
    const f = new Field(); f.addCircle(3, 3, 0.8); expect(f.blocked(3, 3.9, 0.4)).toBe(true); expect(f.blocked(3, 4.3, 0.4)).toBe(false);
  });
  it('finds the right shapes among a thousand, and keeps a quick answer', () => {
    const f = new Field(); for (let i = 0; i < 1000; i++) f.addRect((i % 40) * 10, Math.floor(i / 40) * 10, 2, 2);
    expect(f.blocked(0, 0)).toBe(true); expect(f.blocked(5, 5)).toBe(false); expect(f.blocked(390, 240)).toBe(true); expect(f.blocked(395, 245)).toBe(false);
    const t0 = performance.now(); let n = 0; for (let i = 0; i < 20000; i++) if (f.blocked((i * 7) % 400, (i * 13) % 250)) n++;
    expect(performance.now() - t0).toBeLessThan(800); expect(n).toBeGreaterThan(100);
    f.clear(); expect(f.size).toBe(0); expect(f.blocked(0, 0)).toBe(false);
  });
});

describe('moving among solid things', () => {
  it('walks on in the open, stops at a wall, slides along it, and stops in a corner', () => {
    const f = new Field(); f.addRect(10, 0, 2, 20);
    expect(f.slide({ x: 0, z: 0 }, { x: 1, z: 0 })).toEqual({ x: 1, z: 0 });
    const near = f.slide({ x: 7, z: 0 }, { x: 9, z: 0 }); expect(near.x).toBeGreaterThanOrEqual(7); expect(near.x).toBeLessThan(7.7); expect(near.z).toBe(0);                                   // it goes as far as it can and no further
    const s = f.slide({ x: 7, z: 0 }, { x: 8, z: 1 }); expect(s.x).toBe(7); expect(s.z).toBe(1);
    f.addRect(0, 10, 20, 2); const c = f.slide({ x: 7, z: 7.5 }, { x: 8, z: 8.5 }); expect(c.x).toBeLessThan(8); expect(c.z).toBeLessThan(8.5);
  });
  it('lets a person who is already inside something walk out of it, and finds the nearest free spot', () => {
    const f = new Field(); f.addRect(0, 0, 5, 5); expect(f.slide({ x: 0, z: 0 }, { x: 1, z: 0 })).toEqual({ x: 1, z: 0 });
    const p = f.free(1, 1); expect(f.blocked(p.x, p.z)).toBe(false); expect(Math.hypot(p.x - 1, p.z - 1)).toBeLessThan(7); expect(f.free(20, 20)).toEqual({ x: 20, z: 20 });
    const q = f.free(4.5, 0); expect(q.x).toBeGreaterThan(5);
  });
  it('an agent walking into a wall stops, then gives up that waypoint, and without a field nothing changes', () => {
    const f = new Field(); f.addRect(10, 0, 1, 10); const rng = seeded(1);
    const a: Agent = { id: 'x', pos: { x: 0, z: 0 }, path: [{ x: 20, z: 0 }], speed: 2, node: 'home', state: 'walk', timer: 0, heading: 0, phase: 0, wander: false };
    for (let i = 0; i < 20; i++) stepAgent(a, 0.5, rng, false, { slide: (p, q) => f.slide(p, q, 0.4) });
    expect(a.pos.x).toBeLessThan(9); expect(a.pos.x).toBeGreaterThan(8.3); expect(a.state).toBe('idle');
    const b: Agent = { ...a, pos: { x: 0, z: 0 }, path: [{ x: 20, z: 0 }], state: 'walk' }; for (let i = 0; i < 20; i++) stepAgent(b, 0.5, rng, false); expect(b.pos.x).toBe(20);
  });
  it('a car waits while somebody stands in its way, and goes on when they have gone', () => {
    const segs = [{ from: { x: 0, z: 0 }, to: { x: 40, z: 0 } }]; const c = { seg: 0, t: 10, dir: 1 as const, speed: 6, color: '#fff', wait: 0 }; const rng = seeded(2);
    stepCar(c, 1, segs, 1, rng, () => true); expect(c.t).toBe(10); stepCar(c, 1, segs, 1, rng, (x, z) => Math.hypot(x - 100, z) < 1); expect(c.t).toBeGreaterThan(10);
  });
});

describe('finding a way round', () => {
  const walk = (f: Field, pts: { x: number; z: number }[], from: { x: number; z: number }): number => { let len = 0, cur = from; for (const p of pts) { expect(clearLine(f, cur, p, 0.3), 'each leg is clear').toBe(true); len += Math.hypot(p.x - cur.x, p.z - cur.z); cur = p; } return len; };
  it('goes straight when the way is clear and says nothing when already there', () => {
    const f = new Field(); expect(f.path({ x: 0, z: 0 }, { x: 10, z: 0 })).toEqual([{ x: 10, z: 0 }]); expect(f.path({ x: 3, z: 3 }, { x: 3.1, z: 3 })).toEqual([]);
  });
  it('goes round a wall, with every leg clear, and not much longer than it must', () => {
    const f = new Field(); f.addRect(10, 0, 1, 15); const p = f.path({ x: 0, z: 0 }, { x: 20, z: 0 });
    expect(p.length).toBeGreaterThanOrEqual(2); expect(p[p.length - 1]).toEqual({ x: 20, z: 0 }); const len = walk(f, p, { x: 0, z: 0 }); expect(len).toBeGreaterThan(20); expect(len).toBeLessThan(46);
  });
  it('winds through a maze of houses with a street between them, and never leaves a leg through a wall', () => {
    const f = new Field(); for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) if (i !== 0 && j !== 0) f.addRect(i * 12, j * 12, 4, 4);
    const p = f.path({ x: -60, z: -60 }, { x: 60, z: 60 }); expect(p.length).toBeGreaterThan(1); const len = walk(f, p, { x: -60, z: -60 }); expect(len).toBeLessThan(260);
  });
  it('ends at the nearest free spot when the target is inside a building, and copes with a start inside one', () => {
    const f = new Field(); f.addRect(0, 0, 5, 5); const p = f.path({ x: 20, z: 0 }, { x: 0, z: 0 }); const end = p[p.length - 1]; expect(f.blocked(end.x, end.z, 0.45)).toBe(false); expect(Math.hypot(end.x, end.z)).toBeLessThan(8);
    const q = f.path({ x: 1, z: 1 }, { x: 20, z: 20 }); expect(q.length).toBeGreaterThan(0); expect(q[q.length - 1]).toEqual({ x: 20, z: 20 });
  });
  it('when a target is walled in, it still gives an answer instead of searching for ever', () => {
    const f = new Field(); for (const [x, z, w, d] of [[0, 8, 9, 1], [0, -8, 9, 1], [8, 0, 1, 9], [-8, 0, 1, 9]]) f.addRect(x, z, w, d);
    const t0 = performance.now(); const p = f.path({ x: 30, z: 30 }, { x: 0, z: 0 }); expect(performance.now() - t0).toBeLessThan(3000); expect(p.length).toBeGreaterThanOrEqual(1);
  });
  it('is quick on a whole city of houses', () => {
    const f = new Field(); for (let i = 0; i < 700; i++) f.addRect(((i * 37) % 200) - 100, ((i * 91) % 200) - 100, 3 + (i % 3), 3 + (i % 4));
    const t0 = performance.now(); for (let k = 0; k < 30; k++) f.path({ x: -90 + k, z: -90 }, { x: 90 - k, z: 90 }); expect(performance.now() - t0).toBeLessThan(4000);
  });
});

beforeEach(() => { HTMLCanvasElement.prototype.getContext = (() => null) as never; });
function stub(): NonNullable<World3dDeps['rendererFactory']> {
  return canvas => { canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 380, right: 600, bottom: 380, x: 0, y: 0, toJSON() { return {}; } }); return { domElement: canvas, setSize() { /* nothing */ }, setPixelRatio() { /* nothing */ }, render() { /* nothing */ }, dispose() { /* nothing */ }, shadowMap: { enabled: false, type: 0 } } as never; };
}
const house = (x: number, z: number, s = 4): RealBuilding => ({ pts: [[x - s, z - s], [x + s, z - s], [x + s, z + s], [x - s, z + s]], h: 8, kind: 'block', color: '#d8c9a0' });
const mount = async (s: G.State): ReturnType<typeof mountWorld3d> => mountWorld3d({ host: document.body.appendChild(document.createElement('div')), s, onPlace: () => undefined, onNpc: () => undefined, onFail: () => undefined, rendererFactory: stub() });

describe('the 3D city', () => {
  it('has solid things (the places, the invented houses, the trees, the boards and the water) and people stand clear of all of them', async () => {
    const s = G.newState('C', 'moscow'); s.queue = []; s.slot = 1; const h = await mount(s);
    expect(h.solids()).toBeGreaterThan(G.PLACES.length + 20); for (const p of h.people()) expect(h.blockedAt(p.x, p.z, 0.3), p.id).toBe(false); expect(h.blockedAt(h.player().x, h.player().z, 0.3)).toBe(false);
    h.destroy();
  });
  it('nobody walks into a house, even one built right across a road, for a long walk of the whole crowd and the player', async () => {
    const s = G.newState('C', 'moscow'); s.queue = []; s.slot = 1; const h = await mount(s);
    const roads = roadSegments(); const across = roads.map(r => house((r.from.x + r.to.x) / 2, (r.from.z + r.to.z) / 2, 3.5));
    h.setRealBuildings({ buildings: across, anchors: {} });
    expect(h.solids()).toBeGreaterThan(across.length);
    for (const b of across) expect(h.blockedAt((b.pts[0][0] + b.pts[2][0]) / 2, (b.pts[0][1] + b.pts[2][1]) / 2, 0.3)).toBe(true);
    let inside = 0, moving = 0;
    for (let i = 0; i < 1500; i++) {
      h.tick(0.1);
      for (const p of h.people()) { if (h.blockedAt(p.x, p.z, 0.2)) inside++; if (p.state === 'walk') moving++; }
      const me = h.player(); if (h.blockedAt(me.x, me.z, 0.2)) inside++;
      if (i === 100) { s.loc = 'bank'; h.update(s); }
      if (i === 700) { s.loc = 'market'; h.update(s); }
    }
    expect(inside).toBe(0); expect(moving).toBeGreaterThan(200);
    h.setRealBuildings(null); h.destroy();
  });
  it('the player still gets to a place when the houses are in order, and people put inside a new house are moved out of it', async () => {
    const s = G.newState('C', 'moscow'); s.queue = []; s.slot = 1; const h = await mount(s);
    for (let i = 0; i < 100; i++) h.tick(0.1);
    const me = h.player(); h.setRealBuildings({ buildings: [house(me.x, me.z, 6)], anchors: {} });
    const after = h.player(); expect(h.blockedAt(after.x, after.z, 0.3)).toBe(false);
    s.loc = 'clinic'; h.update(s); for (let i = 0; i < 1200; i++) h.tick(0.1);
    const sp = standPoint('clinic'), end = h.player(); expect(Math.hypot(end.x - sp.x, end.z - sp.z)).toBeLessThan(6);
    h.destroy();
  });
});
