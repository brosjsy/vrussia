// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import * as G from '../src/engine';
import '../src/content';
import { mountWorld3d } from '../src/world3d';
import type { World3dDeps, World3dHandle } from '../src/world3d';
import { crowdFor } from '../src/city';
import { standPoint, dist } from '../src/world-logic';

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
  (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).setPointerCapture = () => undefined;       // jsdom has no pointer capture
  (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).releasePointerCapture = () => undefined;
});

/** A stand-in for the graphics card: it counts what it is asked to do. */
function stub(): { factory: NonNullable<World3dDeps['rendererFactory']>; stats: { renders: number; disposed: boolean; sizes: number[][] } } {
  const stats = { renders: 0, disposed: false, sizes: [] as number[][] };
  const factory: NonNullable<World3dDeps['rendererFactory']> = canvas => {
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 380, right: 600, bottom: 380, x: 0, y: 0, toJSON() { return {}; } });
    return { domElement: canvas, setSize: (w: number, h: number) => { stats.sizes.push([w, h]); }, setPixelRatio() { /* nothing to do */ }, render() { stats.renders++; }, dispose() { stats.disposed = true; }, shadowMap: { enabled: false, type: 0 } } as never;
  };
  return { factory, stats };
}

const fresh = (): G.State => { const s = G.newState('Walker', 'moscow'); s.queue = []; s.day = 4; s.slot = 0; return s; };
async function mount(s: G.State, extra: Partial<World3dDeps> = {}): Promise<{ h: World3dHandle; host: HTMLElement; picked: string[]; talked: string[]; fails: string[]; st: ReturnType<typeof stub> }> {
  const st = stub(); const host = document.createElement('div'); document.body.appendChild(host);
  const picked: string[] = [], talked: string[] = [], fails: string[] = [];
  const h = await mountWorld3d({ host, s, onPlace: id => picked.push(id), onNpc: id => talked.push(id), onFail: m => fails.push(m), rendererFactory: st.factory, ...extra });
  return { h, host, picked, talked, fails, st };
}
const places = (h: World3dHandle): THREE.Group[] => h.scene.children.filter(o => o.userData.place && o instanceof THREE.Group) as THREE.Group[];

describe('the 3D scene', () => {
  it('has a building for every place, trees, roads, the people of the crowd and the player standing in front of their place', async () => {
    const s = fresh(); const { h, host } = await mount(s);
    expect(places(h).map(g => g.userData.place).sort()).toEqual(G.PLACES.map(p => p.id).sort());
    for (const g of places(h)) { expect(g.children.length).toBeGreaterThanOrEqual(4); expect(g.children.some(c => c instanceof THREE.Sprite)).toBe(true); }
    expect(h.scene.children.some(c => c instanceof THREE.InstancedMesh)).toBe(true);
    expect(h.people().length).toBe(crowdFor(s).length);
    expect(dist(h.player(), standPoint('home'))).toBeLessThan(5);
    expect(host.querySelector('canvas')).toBeTruthy();
    expect(h.scene.children.filter(c => c instanceof THREE.Light).length).toBeGreaterThanOrEqual(2);
    h.destroy();
  });
  it('people walk: after half a minute most have moved, some are walking, and none has left the map', async () => {
    const { h } = await mount(fresh());
    const start = h.people();
    for (let i = 0; i < 600; i++) h.tick(0.05);
    const now = h.people();
    const moved = now.filter((p, i) => dist(p, start[i]) > 1).length;
    expect(moved).toBeGreaterThan(now.length * 0.4);
    for (const p of now) { expect(Math.abs(p.x)).toBeLessThan(80); expect(Math.abs(p.z)).toBeLessThan(80); }
    let sawWalk = false, sawTalk = false;
    for (let i = 0; i < 4000 && !(sawWalk && sawTalk); i++) { h.tick(0.05); const st = h.people().map(p => p.state); sawWalk ||= st.includes('walk'); sawTalk ||= st.includes('talk'); }
    expect(sawWalk && sawTalk).toBe(true);
    h.destroy();
  });
  it('the player walks to the new place when the game moves them, along the roads, and stops in front of it', async () => {
    const s = fresh(); const { h } = await mount(s);
    s.loc = 'uni'; h.update(s);
    expect(h.player().state).toBe('walk'); expect(h.player().node).toBe('uni');
    let t = 0; while (h.player().state === 'walk' && t < 300) { h.tick(0.05); t += 0.05; }
    expect(t).toBeLessThan(120); expect(t).toBeGreaterThan(5);
    expect(dist(h.player(), standPoint('uni'))).toBeLessThan(1e-6);
    s.loc = 'uni'; h.update(s); expect(h.player().state).toBe('idle');
    h.destroy();
  });
  it('a new part of the day brings a new crowd and new light; rain and snow switch the weather on; changed clothes rebuild the player', async () => {
    const s = fresh(); s.weather = 'clear'; const { h } = await mount(s);
    const weather = h.scene.children.find(c => c instanceof THREE.Points) as THREE.Points; expect(weather.visible).toBe(false);
    const ids = h.people().map(p => p.id); const bg = (h.scene.background as THREE.Color).getHexString();
    s.slot = 2; s.weather = 'rain'; h.update(s);
    expect(h.people().map(p => p.id)).not.toEqual(ids); expect((h.scene.background as THREE.Color).getHexString()).not.toBe(bg); expect(weather.visible).toBe(true);
    s.weather = 'snow'; h.update(s); expect(weather.visible).toBe(true); s.weather = 'clear'; h.update(s); expect(weather.visible).toBe(false);
    const before = h.scene.children.length; s.worn = { outer: 'coat-winter' }; h.update(s); expect(h.scene.children.length).toBe(before);   // replaced, not added
    expect(dist(h.player(), standPoint(s.loc))).toBeLessThan(6);
    h.destroy();
  });
});

describe('clicking in the 3D world', () => {
  it('a place is found under a point of its roof, and a person under their head', async () => {
    const s = fresh(); const { h } = await mount(s);
    for (let i = 0; i < 20; i++) h.tick(0.05);
    h.scene.updateMatrixWorld(true); h.camera.updateMatrixWorld(true);
    let ok = 0;
    for (const g of places(h)) { const body = g.children[0] as THREE.Mesh; const top = (body.geometry as THREE.BoxGeometry).parameters.height; const pt = h.project(g.position.x, top + 0.4, g.position.z); const hit = h.pick(pt.x, pt.y); if (hit.kind === 'place' && hit.id === g.userData.place) ok++; }
    expect(ok).toBeGreaterThanOrEqual(9);                                                // some roofs are hidden behind taller buildings or round pins, most are not
    let npcOk = 0; const people = h.scene.children.filter(c => c.name === 'person' && c.userData.npc);
    for (const p of people) { const pt = h.project(p.position.x, 2.6, p.position.z); const hit = h.pick(pt.x, pt.y); if (hit.kind === 'npc' && hit.id === p.userData.npc) npcOk++; }
    expect(people.length).toBeGreaterThan(5); expect(npcOk).toBeGreaterThanOrEqual(people.length * 0.4);                         // some people are hidden behind buildings or each other
    expect(['place', 'npc', 'none']).toContain(h.pick(1, 1).kind);
    h.destroy();
  });
  it('a click (not a drag) on a place or a person calls the page; a drag only turns the camera', async () => {
    const s = fresh(); const { h, host, picked, talked } = await mount(s);
    for (let i = 0; i < 20; i++) h.tick(0.05);
    h.scene.updateMatrixWorld(true); h.camera.updateMatrixWorld(true);
    const canvas = host.querySelector('canvas') as HTMLCanvasElement;
    const click = (x: number, y: number, dx = 0): void => { canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: x, clientY: y, bubbles: true })); canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: x + dx, clientY: y, bubbles: true })); };
    const person = h.scene.children.find(c => c.name === 'person' && c.userData.npc) as THREE.Object3D;
    const pp = h.project(person.position.x, 2.6, person.position.z);
    click(pp.x, pp.y); expect(talked).toEqual([person.userData.npc]);
    click(pp.x, pp.y, 40); expect(talked.length).toBe(1);                                  // a drag is not a click
    const g = places(h).find(x => { const body = x.children[0] as THREE.Mesh; const top = (body.geometry as THREE.BoxGeometry).parameters.height; const pt = h.project(x.position.x, top + 0.4, x.position.z); return h.pick(pt.x, pt.y).id === x.userData.place; }) as THREE.Group;
    const body = g.children[0] as THREE.Mesh; const pt = h.project(g.position.x, (body.geometry as THREE.BoxGeometry).parameters.height + 0.4, g.position.z);
    click(pt.x, pt.y); expect(picked).toEqual([g.userData.place]);
    h.destroy();
  });
});

describe('closing and failing', () => {
  it('closing stops the world: the canvas goes, the graphics are freed, and there is nothing left to draw', async () => {
    const { h, host, st } = await mount(fresh());
    h.destroy();
    expect(host.querySelector('canvas')).toBeNull(); expect(st.stats.disposed).toBe(true);
  });
  it('a graphics card that cannot start is reported, and mounting fails instead of leaving a broken picture', async () => {
    const fails: string[] = [];
    await expect(mountWorld3d({ host: document.createElement('div'), s: fresh(), onPlace: () => undefined, onNpc: () => undefined, onFail: m => fails.push(m), rendererFactory: () => { throw new Error('no WebGL'); } })).rejects.toThrow('no WebGL');
    expect(fails).toEqual(['no WebGL']);
  });
  it('the size follows the box it is in, with sensible minimums', async () => {
    const { h, st } = await mount(fresh());
    expect(st.stats.sizes[0][0]).toBeGreaterThanOrEqual(200); expect(st.stats.sizes[0][1]).toBeGreaterThanOrEqual(200);
    expect(h.camera.aspect).toBeGreaterThan(0.5); h.destroy();
  });
});

describe('the status chip over the player', () => {
  it('appears when the player is in trouble, follows the state, and disappears when it is over', async () => {
    const s = fresh(); s.health = 80; s.stress = 10; s.energy = 80; s.tmp.fines = 0;
    const { h } = await mount(s);
    const chips = (): number => { let n = 0; h.scene.traverse(o => { if (o.userData.status) n++; }); return n; };
    expect(h.status()).toBeNull(); expect(chips()).toBe(0);
    s.health = 20; h.update(s); expect(h.status()).toContain('Sick'); expect(chips()).toBe(1);
    h.update(s); expect(chips()).toBe(1);                         // not added twice
    s.health = 80; h.update(s); expect(h.status()).toBeNull(); expect(chips()).toBe(0);
  });
});

describe('layers and saver mode', () => {
  const sprites = (h: World3dHandle): THREE.Sprite[] => { const out: THREE.Sprite[] = []; h.scene.traverse(o => { if (o instanceof THREE.Sprite && o.parent?.name === 'person' && o.position.y === 2.6) out.push(o); }); return out; };
  it('name tags can be hidden and shown, and stay hidden for people drawn later', async () => {
    const s = fresh(); const { h } = await mount(s);
    expect(sprites(h).length).toBeGreaterThan(3); expect(sprites(h).every(x => x.visible)).toBe(true);
    h.setLayer('names', false); expect(sprites(h).every(x => !x.visible)).toBe(true);
    s.slot = (s.slot + 1) % 3; if (s.slot === 0) s.day++; h.update(s);                          // a new crowd is made
    expect(sprites(h).length).toBeGreaterThan(3); expect(sprites(h).every(x => !x.visible)).toBe(true);
    h.setLayer('names', true); expect(sprites(h).every(x => x.visible)).toBe(true);
  });
  it('the notice boards can be hidden and shown', async () => {
    const { h } = await mount(fresh());
    const faces = (): boolean[] => { const v: boolean[] = []; h.scene.traverse(o => { if (o.parent && (o as THREE.Mesh).isMesh && o.position.y === 5.2 && o.position.z === 0.17) v.push(o.parent.visible); }); return v; };
    expect(faces().length).toBe(5); expect(faces().every(Boolean)).toBe(true);
    h.setLayer('boards', false); expect(faces().every(x => !x)).toBe(true); h.setLayer('boards', true); expect(faces().every(Boolean)).toBe(true);
  });
  it('saver mode turns off rain and snow and can be turned off again', async () => {
    const s = fresh(); s.weather = 'rain'; const { h } = await mount(s);
    const rain = (): boolean => { let v = false; h.scene.traverse(o => { if (o instanceof THREE.Points && o.name === 'rain') v = o.visible; }); return v; };
    expect(h.saver()).toBe(false); expect(rain()).toBe(true);
    h.setSaver(true); expect(h.saver()).toBe(true); expect(rain()).toBe(false);
    h.setSaver(false); expect(h.saver()).toBe(false); expect(rain()).toBe(true);
    expect(h.fps()).toBe(0);
  });
});

describe('map pins and the overview', () => {
  it('every place has a round pin and a name; hiding names hides the name but keeps the pin', async () => {
    const { h } = await mount(fresh());
    const gs = h.scene.children.filter(o => o.userData.place && o instanceof THREE.Group) as THREE.Group[];
    for (const g of gs) { expect(g.userData.pin).toBeInstanceOf(THREE.Sprite); expect(g.userData.sign).toBeInstanceOf(THREE.Sprite); expect(g.userData.pin.position.y).toBeGreaterThan(g.userData.sign.position.y); }
    h.setLayer('names', false); expect(gs.every(g => !g.userData.sign.visible && g.userData.pin.visible)).toBe(true);
    h.setLayer('names', true); expect(gs.every(g => g.userData.sign.visible)).toBe(true);
  });
  it('the overview lifts the camera over the city and brings it back down afterwards', async () => {
    const { h } = await mount(fresh());
    const dist = (): number => h.camera.position.distanceTo(new THREE.Vector3(h.player().x, 4, h.player().z));
    for (let i = 0; i < 60; i++) h.tick(0.05); const start = dist();
    h.setOverview(true); for (let i = 0; i < 200; i++) h.tick(0.05); const high = dist();
    expect(high).toBeGreaterThan(start * 1.8); expect(high).toBeLessThanOrEqual(121);
    h.setOverview(false); for (let i = 0; i < 200; i++) h.tick(0.05); expect(dist()).toBeLessThan(high * 0.6);
  });
});
