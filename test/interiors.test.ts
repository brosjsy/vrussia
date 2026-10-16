// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import * as G from '../src/engine';
import '../src/content';
import { interiorFor, KNOWN_ACTIONS, SPECIAL, doorOf, NO_INTERIOR } from '../src/interiors';
import { buildRoom } from '../src/rooms3d';
import { mountWorld3d } from '../src/world3d';
import type { World3dDeps } from '../src/world3d';

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
  (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).setPointerCapture = () => undefined;
  (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).releasePointerCapture = () => undefined;
});

const fresh = (): G.State => { const s = G.newState('Walker', 'moscow'); s.queue = []; s.day = 4; s.slot = 0; return s; };
const ALL = G.PLACES.map(p => p.id);

describe('the rooms (data)', () => {
  it('every place has a room except the open city centre, and each is a sensible size', () => {
    const s = fresh();
    const missing = ALL.filter(id => !interiorFor(id, s) && !NO_INTERIOR.has(id));
    expect(missing, `no room for ${missing.join(', ')}`).toEqual([]);
    for (const id of ALL) { const r = interiorFor(id, s); if (!r) continue; expect(r.w).toBeGreaterThanOrEqual(12); expect(r.w).toBeLessThanOrEqual(22); expect(r.d).toBeGreaterThanOrEqual(9); expect(r.d).toBeLessThanOrEqual(14); expect(r.props.length).toBeGreaterThan(5); }
    expect(interiorFor('center', s)).toBeNull(); expect(interiorFor('nowhere', s)).toBeNull();
  });
  it('every thing that can be used points at a real game action (or a known special one)', () => {
    const real = new Set(G.actions.map(a => a.id));
    for (const k of KNOWN_ACTIONS) expect(real.has(k), k).toBe(true);
    const s = fresh();
    for (const id of ALL) for (const p of interiorFor(id, s)?.props ?? []) if (p.action) { expect(real.has(p.action) || (SPECIAL as readonly string[]).includes(p.action) || p.action.startsWith('act:'), `${id} ${p.kind} ${p.action}`).toBe(true); expect(p.label, `${id} ${p.kind}`).toBeTruthy(); }
  });
  it('furniture stays inside the walls and out of the doorway, and the flat has what a home needs', () => {
    const s = fresh();
    for (const id of ALL) {
      const r = interiorFor(id, s); if (!r) continue;
      for (const p of r.props) {
        if (p.kind === 'window') continue;
        expect(Math.abs(p.x) + p.w / 2, `${id} ${p.kind} x`).toBeLessThanOrEqual(r.w / 2 + 0.01);
        expect(Math.abs(p.z) + p.d / 2, `${id} ${p.kind} z`).toBeLessThanOrEqual(r.d / 2 + 0.3);
        if (p.kind !== 'rug') { const door = doorOf(r); expect(Math.abs(p.x - door.x) < 1.3 + p.w / 2 && Math.abs(p.z - door.z) < 0.6 + p.d / 2, `${id} ${p.kind} blocks the door`).toBe(false); }
      }
    }
    const home = interiorFor('home', s)!;
    const kinds = new Set(home.props.map(p => p.kind));
    for (const k of ['bed', 'fridge', 'stove', 'sofa', 'tv', 'desk', 'wardrobe']) expect(kinds.has(k as never), k).toBe(true);
    expect(home.props.find(p => p.kind === 'fridge')?.action).toBe('food');
    expect(home.props.find(p => p.kind === 'desk')?.action).toBe('online');
  });
  it('the flat has a partner in it only when the player has one', () => {
    const a = fresh(), b = fresh(); b.partner = { name: 'Anna' } as never;
    expect(interiorFor('home', a)!.occupants).toBe(0); expect(interiorFor('home', b)!.occupants).toBe(1);
  });
});

describe('the 3D room', () => {
  it('is built with a floor, three walls, an exit and its furniture, and frees everything it made', () => {
    const it = interiorFor('home', fresh())!;
    const r = buildRoom(it);
    const meshes: THREE.Mesh[] = []; r.group.traverse(o => { if (o instanceof THREE.Mesh) meshes.push(o); });
    expect(meshes.length).toBeGreaterThan(it.props.length + 4);
    expect(r.usable.some(o => o.userData.action === 'exit')).toBe(true);
    const acts = new Set(r.usable.map(o => o.userData.action)); for (const p of it.props) if (p.action) expect(acts.has(p.action)).toBe(true);
    r.dispose();
  });
});

function stub(): NonNullable<World3dDeps['rendererFactory']> {
  return canvas => {
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 380, right: 600, bottom: 380, x: 0, y: 0, toJSON() { return {}; } });
    return { domElement: canvas, setSize() { /* nothing */ }, setPixelRatio() { /* nothing */ }, render() { /* nothing */ }, dispose() { /* nothing */ }, shadowMap: { enabled: false, type: 0 } } as never;
  };
}
async function mount(s: G.State, actions: string[] = []): ReturnType<typeof mountWorld3d> {
  const host = document.createElement('div'); document.body.appendChild(host);
  return mountWorld3d({ host, s, onPlace: () => undefined, onNpc: () => undefined, onFail: () => undefined, onAction: a => actions.push(a), rendererFactory: stub() });
}
const settle = (h: Awaited<ReturnType<typeof mountWorld3d>>): void => { for (let i = 0; i < 400; i++) h.tick(0.05); };

describe('going inside in the 3D world', () => {
  it('enters the place the player is at, shows the room, and leaves again with the city back', async () => {
    const s = fresh(); const h = await mount(s); settle(h);
    const before = h.scene.children.length;
    expect(h.inside()).toBeNull();
    expect(h.enter()).toBe(true); expect(h.inside()).toBe(s.loc);
    expect(h.scene.children.length).toBeGreaterThan(before);
    expect(h.roomActions()).toContain('exit'); expect(h.roomActions()).toContain('food');
    expect(h.enter()).toBe(false);                                  // already inside
    h.leave(); expect(h.inside()).toBeNull(); expect(h.scene.children.length).toBe(before);
    h.leave();                                                      // leaving twice does no harm
    h.enter(); h.leave();
    expect(h.scene.children.length).toBe(before);                   // nothing is left behind
  });
  it('has no inside for the open city centre, and cannot be entered while the player is walking', async () => {
    const s = fresh(); const h = await mount(s); settle(h);
    expect(h.enter('center')).toBe(false); expect(h.inside()).toBeNull();
    s.loc = 'bank'; h.update(s); h.tick(0.05);
    expect(h.player().state).toBe('walk'); expect(h.enter()).toBe(false);
    settle(h); expect(h.enter()).toBe(true); expect(h.inside()).toBe('bank');
  });
  it('using the fridge walks the player there and then runs the game action; the exit leaves', async () => {
    const s = fresh(); const done: string[] = []; const h = await mount(s, done); settle(h);
    h.enter(); h.tick(0.05); h.scene.updateMatrixWorld(true); h.camera.updateMatrixWorld();
    const fridge = h.scene.children.flatMap(o => { const f: THREE.Object3D[] = []; o.traverse(x => { if (x.userData.action === 'food' && !(x instanceof THREE.Sprite)) f.push(x); }); return f; })[0];
    expect(fridge).toBeTruthy();
    const p = h.project(fridge.getWorldPosition(new THREE.Vector3()).x, 1, fridge.getWorldPosition(new THREE.Vector3()).z);
    const canvas = Array.from(document.querySelectorAll('canvas')).pop() as HTMLCanvasElement;
    const fire = (type: string, x: number, y: number): void => { const e = new Event(type, { bubbles: true }) as Event & Record<string, number>; e.clientX = x; e.clientY = y; canvas.dispatchEvent(e); };
    const hit = h.pick(p.x, p.y);
    expect(hit.kind).toBe('prop'); expect(hit.id).toBe('food');
    fire('pointerdown', p.x, p.y); fire('pointerup', p.x, p.y);
    expect(done).toEqual([]);                                       // the player first has to walk there
    settle(h); expect(done).toEqual(['food']);
    // the exit
    const exit = h.scene.children.flatMap(o => { const f: THREE.Object3D[] = []; o.traverse(x => { if (x.userData.action === 'exit' && !(x instanceof THREE.Sprite)) f.push(x); }); return f; })[0];
    const w = exit.getWorldPosition(new THREE.Vector3()); const q = h.project(w.x, 0.05, w.z);
    const top = h.pick(q.x, q.y);
    expect(top).toEqual({ kind: 'prop', id: 'exit' });
    fire('pointerdown', q.x, q.y); fire('pointerup', q.x, q.y);
    expect(h.inside()).toBeNull();
  });
  it('is destroyed cleanly even while inside', async () => {
    const s = fresh(); const h = await mount(s); settle(h); h.enter();
    expect(() => h.tick(0.05)).not.toThrow();
    expect(() => (h as unknown as { destroy: () => void }).destroy()).not.toThrow();
  });
});

import { blocked, findPath, nearestFree, wanderSpot } from '../src/interiors';

describe('walls and furniture stop people', () => {
  it('walls and solid furniture are blocked, floor, rugs and the middle of an empty spot are not', () => {
    const home = interiorFor('home', fresh())!;
    expect(blocked(home, home.w / 2 - 0.1, 0)).toBe(true); expect(blocked(home, 0, -home.d / 2 + 0.1)).toBe(true);
    const bed = home.props.find(p => p.kind === 'bed')!; expect(blocked(home, bed.x, bed.z)).toBe(true);
    const rug = home.props.find(p => p.kind === 'rug')!; expect(blocked(home, rug.x, rug.z)).toBe(false);
    const sofa = home.props.find(p => p.kind === 'sofa')!; expect(sofa.ry).toBeTruthy(); expect(blocked(home, sofa.x, sofa.z + sofa.w / 2 - 0.2)).toBe(true);   // a turned sofa is long in z
    expect(blocked(home, 0, home.d / 2 - 1.4)).toBe(false);
  });
  it('a path from the door to the front of everything usable exists in every room and never touches furniture or a wall', () => {
    const s = fresh();
    for (const id of ALL) {
      const it = interiorFor(id, s); if (!it) continue;
      const door = { x: doorOf(it).x, z: doorOf(it).z - 1 };
      for (const p of it.props.filter(q => q.action && !q.action.startsWith('act:'))) {
        const goal = { x: p.x, z: Math.min(doorOf(it).z, p.z + 1.6) };
        const path = findPath(it, door, goal);
        expect(path.length, `${id} ${p.kind}`).toBeGreaterThan(0);
        for (const w of path) expect(blocked(it, w.x, w.z), `${id} ${p.kind} at ${w.x},${w.z}`).toBe(false);
        const end = path[path.length - 1], near = nearestFree(it, goal);
        expect(Math.hypot(end.x - near.x, end.z - near.z), `${id} ${p.kind}`).toBeLessThan(0.51);
        for (let i = 1; i < path.length; i++) expect(Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z)).toBeLessThan(0.75);
      }
    }
  });
  it('goes round a thing in the way instead of through it, and has no path when already there', () => {
    const home = interiorFor('home', fresh())!;
    const path = findPath(home, { x: -1, z: 4 }, { x: 5.2, z: -3 });
    expect(path.length).toBeGreaterThan(Math.hypot(6.2, 7) / 0.5 - 2);          // longer than a straight line would need
    expect(findPath(home, { x: 0, z: 4 }, { x: 0, z: 4 })).toEqual([]);
    expect(blocked(home, ...(Object.values(nearestFree(home, { x: 4.2, z: -0.6 })) as [number, number]))).toBe(false);   // asked for a table: gets floor
  });
  it('wander spots are free', () => {
    let n = 1; const r = (): number => { n = (n * 16807) % 2147483647; return n / 2147483647; };
    for (const id of ALL) { const it = interiorFor(id, fresh()); if (!it) continue; for (let i = 0; i < 20; i++) { const p = wanderSpot(it, r); expect(blocked(it, p.x, p.z)).toBe(false); } }
  });
  it('people inside move around over time, and the player never ends up inside furniture', async () => {
    const s = fresh(); s.partner = { name: 'Anna' } as never; const h = await mount(s); settle(h); h.enter();
    const roomPeople = (): THREE.Object3D[] => { const out: THREE.Object3D[] = []; h.scene.children.forEach(o => { if (o.position.x > 500 && o.type === 'Group' && o.userData.place === undefined && o.children.length > 0 && o.position.y === 0 && o.userData.action === undefined) out.push(o); }); return out; };
    const before = roomPeople().map(o => o.position.clone());
    for (let i = 0; i < 600; i++) h.tick(0.05);
    const after = roomPeople().map(o => o.position);
    expect(before.length).toBeGreaterThan(1);
    expect(after.some((p, i) => p.distanceTo(before[i]) > 0.5)).toBe(true);
    const it = interiorFor(h.inside()!, s)!;
    for (const p of after) if (p !== undefined) expect(Math.abs(p.x - 1000)).toBeLessThan(it.w / 2);
  });
});

import { seatsOf } from '../src/interiors';
import { buildCharacter, setPose } from '../src/characters3d';

describe('sitting and talking inside', () => {
  it('rooms have seats, a bench or sofa has two, and each faces the middle of the room', () => {
    const s = fresh();
    expect(seatsOf(interiorFor('home', s)!).length).toBeGreaterThanOrEqual(3);
    const bank = interiorFor('bank', s)!; expect(seatsOf(bank).length).toBe(bank.props.filter(p => p.kind === 'chair').length + 2 * bank.props.filter(p => p.kind === 'bench').length);
    for (const id of ALL) for (const st of seatsOf(interiorFor(id, s) ?? { props: [] } as never)) { expect(Number.isFinite(st.ry)).toBe(true); expect(Math.abs(st.x)).toBeLessThan(10); }
    expect(interiorFor('center', s)).toBeNull();
  });
  it('the sitting pose folds the hips and knees and lowers the body, and standing again restores it', () => {
    const c = buildCharacter({});
    setPose(c, 'sit', 0, 1); expect(c.legL.rotation.x).toBeLessThan(-1.2); expect(c.kneeL.rotation.x).toBeGreaterThan(1.2); expect(c.body.position.y).toBeLessThan(-0.3);
    setPose(c, 'idle', 0, 1); expect(c.legL.rotation.x).toBe(0); expect(c.kneeL.rotation.x).toBe(0); expect(Math.abs(c.body.position.y)).toBeLessThan(0.01);
  });
  it('over time some people in a busy room sit down and some stand talking, and nobody shares a seat', async () => {
    const s = fresh(); s.day = 4; let best = '', most = 0;
    for (const id of ['station', 'mfc', 'bank', 'work', 'clinic', 'market', 'airport', 'uni']) { const n = (await import('../src/city')).crowdFor(s).filter(x => x.place === id).length * (seatsOf(interiorFor(id, s)!).length > 1 ? 1 : 0); if (n > most) { most = n; best = id; } }
    expect(most).toBeGreaterThan(1);
    const h = await mount(s); settle(h);
    s.loc = best; h.update(s); settle(h); expect(h.enter()).toBe(true);
    let sat = false, talked = false;
    for (let i = 0; i < 4000; i++) {
      h.tick(0.05); const d = h.dwellers();
      if (d.some(x => x.sitting)) sat = true; if (d.some(x => x.talking)) talked = true;
      const seatsTaken = d.filter(x => x.sitting).map(x => x.x.toFixed(1) + ',' + x.z.toFixed(1)); expect(new Set(seatsTaken).size).toBe(seatsTaken.length);
    }
    expect(sat).toBe(true); expect(talked).toBe(true);
  });
});
