// @vitest-environment jsdom
import { streetDistance, LANE } from '../src/street';
import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import * as G from '../src/engine';
import '../src/content';
import { levelFor, newCars, stepCar, carPose, segLength } from '../src/traffic';
import type { Seg } from '../src/traffic';
import { roadSegments, seeded } from '../src/world-logic';
import { mountWorld3d } from '../src/world3d';
import type { World3dDeps } from '../src/world3d';

const segs: Seg[] = [{ from: { x: 0, z: 0 }, to: { x: 30, z: 0 } }, { from: { x: 0, z: 0 }, to: { x: 0, z: 40 } }];

describe('how crowded the roads are', () => {
  it('the rush hours have more cars and slower ones, bad weather slows everything, and a heavy jam is flagged', () => {
    const noon = levelFor(1, 'clear'), morning = levelFor(0, 'clear'), evening = levelFor(2, 'clear');
    expect(morning.count).toBeGreaterThan(noon.count); expect(evening.count).toBeGreaterThan(noon.count); expect(morning.factor).toBeLessThan(noon.factor); expect(noon.factor).toBe(1); expect(noon.jam).toBe(false); expect(morning.jam).toBe(true);
    expect(levelFor(1, 'snow').factor).toBeLessThan(levelFor(1, 'rain').factor); expect(levelFor(1, 'rain').factor).toBeLessThan(levelFor(1, 'frost').factor); expect(levelFor(1, 'frost').factor).toBeLessThan(1);
    expect(levelFor(0, 'snow').factor).toBeLessThan(morning.factor); expect(levelFor(1, 'rain').jam).toBe(false); expect(levelFor(1, 'snow').jam).toBe(true);
    for (const slot of [0, 1, 2]) for (const w of ['clear', 'snow', 'rain', 'frost', 'heat']) { const l = levelFor(slot, w); expect(l.count).toBeGreaterThan(3); expect(l.count).toBeLessThan(15); expect(l.factor).toBeGreaterThan(0.2); }
  });
  it('saver mode keeps at most four cars', () => { for (const slot of [0, 1, 2]) expect(levelFor(slot, 'clear', true).count).toBeLessThanOrEqual(4); });
});

describe('cars', () => {
  it('are spread over the roads, the same for the same random source, with their own colours and speeds', () => {
    const a = newCars(10, segs, seeded(5)), b = newCars(10, segs, seeded(5)); expect(a).toEqual(b); expect(newCars(10, segs, seeded(6))).not.toEqual(a);
    for (const c of a) { expect(c.seg).toBeGreaterThanOrEqual(0); expect(c.seg).toBeLessThan(2); expect(c.t).toBeGreaterThanOrEqual(0); expect(c.t).toBeLessThanOrEqual(segLength(segs[c.seg])); expect(c.speed).toBeGreaterThanOrEqual(5); expect(c.speed).toBeLessThanOrEqual(8); expect(c.color).toMatch(/^#[0-9a-f]{6}$/); }
    expect(new Set(a.map(c => c.color)).size).toBeGreaterThan(2); expect(newCars(5, [], seeded(1))).toEqual([]);
  });
  it('drive at their speed, slower when it is crowded, turn round at the end and never leave the road', () => {
    const rng = seeded(9), c = { seg: 0, t: 5, dir: 1 as const, speed: 6, color: '#ffffff', wait: 0 };
    stepCar(c, 1, segs, 1, rng); expect(c.t).toBeCloseTo(11, 5);
    const slow = { ...c, t: 5 }; stepCar(slow, 1, segs, 0.5, rng); expect(slow.t).toBeCloseTo(8, 5);
    const d = { seg: 0, t: 29, dir: 1 as const, speed: 6, color: '#fff', wait: 0 }; stepCar(d, 1, segs, 1, rng); expect(d.t).toBe(30); expect(d.dir).toBe(-1); expect(d.wait).toBeGreaterThan(0);
    const t0 = d.t; stepCar(d, 0.1, segs, 1, rng); expect(d.t).toBe(t0);                                // it waits first
    for (let i = 0; i < 4000; i++) { stepCar(d, 0.05, segs, 1, rng); expect(d.t).toBeGreaterThanOrEqual(0); expect(d.t).toBeLessThanOrEqual(segLength(segs[d.seg])); }
  });
  it('keep to the right-hand lane and face the way they go', () => {
    const out = carPose({ seg: 0, t: 10, dir: 1, speed: 6, color: '#fff', wait: 0 }, segs), back = carPose({ seg: 0, t: 10, dir: -1, speed: 6, color: '#fff', wait: 0 }, segs);
    expect(out.x).toBeCloseTo(10, 5); expect(back.x).toBeCloseTo(10, 5); expect(Math.sign(out.z)).toBe(-Math.sign(back.z)); expect(Math.abs(out.z)).toBeCloseTo(1, 5);
    expect(out.heading).toBeCloseTo(Math.PI / 2, 5); expect(back.heading).toBeCloseTo(-Math.PI / 2, 5);
  });
});

beforeEach(() => { HTMLCanvasElement.prototype.getContext = (() => null) as never; });
function stub(): NonNullable<World3dDeps['rendererFactory']> {
  return canvas => { canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 380, right: 600, bottom: 380, x: 0, y: 0, toJSON() { return {}; } }); return { domElement: canvas, setSize() { /* nothing */ }, setPixelRatio() { /* nothing */ }, render() { /* nothing */ }, dispose() { /* nothing */ }, shadowMap: { enabled: false, type: 0 } } as never; };
}
describe('cars in the 3D city', () => {
  const cars = (h: { scene: THREE.Scene }): THREE.Group[] => h.scene.children.filter(o => o.userData.vehicle === 'car') as THREE.Group[];
  it('drive on the roads, change with the part of the day and the weather, can be hidden, and are removed with the world', async () => {
    const s = G.newState('T', 'moscow'); s.queue = []; s.slot = 1; s.weather = 'clear';
    const h = await mountWorld3d({ host: document.body.appendChild(document.createElement('div')), s, onPlace: () => undefined, onNpc: () => undefined, onFail: () => undefined, rendererFactory: stub() });
    expect(cars(h).length).toBe(levelFor(1, 'clear').count); expect(h.traffic()).toEqual({ count: levelFor(1, 'clear').count, factor: 1, jam: false });
    const before = cars(h).map(c => c.position.clone()); for (let i = 0; i < 100; i++) h.tick(0.05); expect(cars(h).some((c, i) => c.position.distanceTo(before[i]) > 3)).toBe(true);
    for (const c of cars(h)) expect(streetDistance({ x: c.position.x, z: c.position.z })).toBeLessThan(LANE + 1.2);      // in a lane (the model glides after the car, so a little slack)
    s.slot = 0; h.update(s); expect(cars(h).length).toBe(levelFor(0, 'clear').count); expect(h.traffic().jam).toBe(true);
    s.weather = 'snow'; h.update(s); expect(h.traffic().factor).toBeCloseTo(levelFor(0, 'snow').factor, 5);
    h.setLayer('traffic', false); expect(cars(h).every(c => !c.visible)).toBe(true); h.setLayer('traffic', true); expect(cars(h).every(c => c.visible)).toBe(true);
    h.setSaver(true); expect(cars(h).length).toBeLessThanOrEqual(4);
    h.destroy(); expect(cars(h).length).toBe(0);
  });
});
