// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import * as G from '../src/engine';
import '../src/content';
import { mountWorld3d } from '../src/world3d';
import type { World3dDeps, World3dHandle } from '../src/world3d';
import { buyFurn, placeFurn, canPlace, furnById, furnOf, centreOf, gridOf, homeInterior } from '../src/furniture';
import { interiorFor } from '../src/interiors';
import { drawFurnPanel } from '../src/furn-ui';

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
  (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).setPointerCapture = () => undefined;
  (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).releasePointerCapture = () => undefined;
});
function stub(): NonNullable<World3dDeps['rendererFactory']> {
  return canvas => {
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 380, right: 600, bottom: 380, x: 0, y: 0, toJSON() { return {}; } });
    return { domElement: canvas, setSize() { /* nothing */ }, setPixelRatio() { /* nothing */ }, render() { /* nothing */ }, dispose() { /* nothing */ }, shadowMap: { enabled: false, type: 0 } } as never;
  };
}
const fresh = (): G.State => { const s = G.newState('F', 'moscow'); s.queue = []; s.day = 4; s.slot = 0; s.money = 1_000_000; s.loc = 'home'; return s; };
async function mount(s: G.State): Promise<{ h: World3dHandle; placed: unknown[][]; picked: number[]; fails: string[]; canvas: HTMLCanvasElement }> {
  const placed: unknown[][] = [], picked: number[] = [], fails: string[] = [];
  const host = document.body.appendChild(document.createElement('div'));
  const h = await mountWorld3d({ host, s, onPlace: () => undefined, onNpc: () => undefined, onFail: () => undefined, rendererFactory: stub(), onFurnish: (...a) => { placed.push(a); }, onPickUp: u => picked.push(u), onFurnishFail: w => fails.push(w) });
  return { h, placed, picked, fails, canvas: host.querySelector('canvas') as HTMLCanvasElement };
}
const fire = (c: HTMLCanvasElement, type: string, x: number, y: number): void => { const e = new Event(type, { bubbles: true }) as Event & Record<string, number>; e.clientX = x; e.clientY = y; c.dispatchEvent(e); };
const click = (c: HTMLCanvasElement, x: number, y: number): void => { fire(c, 'pointerdown', x, y); fire(c, 'pointerup', x, y); };
const settle = (h: World3dHandle): void => { for (let i = 0; i < 100; i++) h.tick(0.05); };
const cellOf = (s: G.State, id: string): { i: number; j: number } => { const f = furnById(id)!, g = gridOf(interiorFor('home', s)!); for (let j = 0; j < g.rows; j++) for (let i = 0; i < g.cols; i++) if (canPlace(s, f, i, j, 0).ok) return { i, j }; throw new Error('no free cell'); };
/** The last free cell for a piece (the far corner), so it does not stand between the camera and another piece. */
const lastCell = (s: G.State, id: string): { i: number; j: number } => { const f = furnById(id)!, g = gridOf(interiorFor('home', s)!); for (let j = g.rows - 1; j >= 0; j--) for (let i = g.cols - 1; i >= 0; i--) if (canPlace(s, f, i, j, 0).ok) return { i, j }; throw new Error('no free cell'); };
const floorClient = (h: World3dHandle, s: G.State, id: string, i: number, j: number): { x: number; y: number } => { const c = centreOf(interiorFor('home', s)!, furnById(id)!, i, j, 0); h.camera.updateMatrixWorld(true); return h.project(1000 + c.x, 0, c.z); };

describe('furnishing the flat in 3D', () => {
  it('a piece follows the pointer over the floor, turns green where it fits and red where it does not, and a click puts it down', async () => {
    const s = fresh(); buyFurn(s, 'stool'); const { h, placed, fails, canvas } = await mount(s);
    settle(h); expect(h.enter('home')).toBe(true); h.tick(0.05); h.setFurnish(true); h.setPlacing('stool');
    expect(h.placing()?.id).toBe('stool'); const ghosts = (): THREE.Mesh[] => h.scene.children.filter(o => (o as THREE.Mesh).isMesh && (o as THREE.Mesh).material instanceof THREE.MeshBasicMaterial && (o as THREE.Mesh).geometry.type === 'BoxGeometry') as THREE.Mesh[];
    expect(ghosts().length).toBe(1);
    const c = cellOf(s, 'stool'), at = floorClient(h, s, 'stool', c.i, c.j);
    fire(canvas, 'pointermove', at.x, at.y); expect(h.placing()).toMatchObject({ i: c.i, j: c.j, ok: true }); expect((ghosts()[0].material as THREE.MeshBasicMaterial).color.getHexString()).toBe('2bb55a');
    click(canvas, at.x, at.y); expect(placed.length).toBe(1); expect(placed[0].slice(0, 4)).toEqual(['stool', c.i, c.j, 0]); expect(fails.length).toBe(0);
    // on the bed: it does not fit
    const bed = interiorFor('home', s)!.props.find(p => p.kind === 'bed')!; h.camera.updateMatrixWorld(true); const on = h.project(1000 + bed.x, 0, bed.z);
    fire(canvas, 'pointermove', on.x, on.y); expect(h.placing()?.ok).toBe(false); expect((ghosts()[0].material as THREE.MeshBasicMaterial).color.getHexString()).toBe('e0373f');
    click(canvas, on.x, on.y); expect(placed.length).toBe(1); expect(fails.length).toBe(1);
    h.setPlacing(null); expect(h.placing()).toBeNull(); expect(ghosts().length).toBe(0);
    h.destroy();
  });
  it('turning changes the shape of the piece; only the flat can be furnished', async () => {
    const s = fresh(); buyFurn(s, 'sofa-3'); const { h } = await mount(s); settle(h);
    h.setPlacing('sofa-3'); expect(h.placing()).toBeNull();                                         // outside, nothing happens
    h.enter('home'); h.tick(0.05); h.setPlacing('sofa-3'); const a = h.placing()!; expect(a.rot).toBe(0); h.rotatePlacing(); expect(h.placing()!.rot).toBe(1); h.rotatePlacing(); expect(h.placing()!.rot).toBe(0);
    h.setPlacing('no-such-thing'); expect(h.placing()).toBeNull(); h.leave(); h.enter('bank'); h.setPlacing('sofa-3'); expect(h.placing()).toBeNull();
    h.destroy();
  });
  it('after a piece is placed in the state the room is drawn with it, and a click on it picks it up in buy mode only', async () => {
    const s = fresh(); buyFurn(s, 'armchair'); const c = cellOf(s, 'armchair'); placeFurn(s, 'armchair', c.i, c.j, 0);
    const uid = furnOf(s).placed[0].uid; const { h, picked, canvas } = await mount(s); settle(h); h.enter('home'); h.tick(0.05);
    const mine = (): THREE.Object3D[] => { const out: THREE.Object3D[] = []; h.scene.traverse(o => { if (o.userData.furn === uid && !(o instanceof THREE.Sprite) && (o as THREE.Mesh).isMesh) out.push(o); }); return out; };
    expect(mine().length).toBeGreaterThan(0);
    // a second piece placed later appears after refreshRoom
    buyFurn(s, 'lamp-floor'); const c2 = lastCell(s, 'lamp-floor'); placeFurn(s, 'lamp-floor', c2.i, c2.j, 0); const uid2 = furnOf(s).placed[1].uid;
    h.update(s); h.refreshRoom(); h.tick(0.05); let n2 = 0; h.scene.traverse(o => { if (o.userData.furn === uid2 && (o as THREE.Mesh).isMesh) n2++; }); expect(n2).toBeGreaterThan(0);
    const centre = centreOf(homeInterior(s), furnById('armchair')!, c.i, c.j, 0); h.scene.updateMatrixWorld(true); h.camera.updateMatrixWorld(true); const pt = h.project(1000 + centre.x, 0.45, centre.z);
    click(canvas, pt.x, pt.y); expect(picked).toEqual([]);                                          // not in buy mode: a click does not pick it up
    h.setFurnish(true); expect(h.pick(pt.x, pt.y)).toEqual({ kind: 'furn', id: String(uid) });
    click(canvas, pt.x, pt.y); expect(picked).toEqual([uid]);
    h.setFurnish(false); expect(h.pick(pt.x, pt.y).kind).not.toBe('furn');
    h.destroy();
  });
  it('things with an action are not used while furnishing', async () => {
    const s = fresh(); const { h } = await mount(s); settle(h); h.enter('home'); h.tick(0.05);
    expect(h.roomActions()).toContain('food'); h.setFurnish(true); const fridge = interiorFor('home', s)!.props.find(p => p.kind === 'fridge')!; h.scene.updateMatrixWorld(true); h.camera.updateMatrixWorld(true);
    const pt = h.project(1000 + fridge.x, 1, fridge.z); expect(h.pick(pt.x, pt.y).kind).toBe('prop');   // it is still there to be seen; the click is just ignored while furnishing
    h.destroy();
  });
});

describe('the catalogue panel', () => {
  it('shows the tabs and cards, asks before buying a piece, then starts placing it, and refuses when poor', async () => {
    const s = fresh(); const { h } = await mount(s); settle(h); h.enter('home'); h.tick(0.05); h.setFurnish(true);
    const box = document.body.appendChild(document.createElement('div')); const notes: string[] = []; let changed = 0, hidden = 0;
    const ui = { notify: (m: string) => notes.push(m), changed: () => { changed++; }, hide: () => { hidden++; } };
    drawFurnPanel(box, s, h, ui);
    expect(box.querySelectorAll('[data-cat]').length).toBe(12);                                 // eleven kinds of furniture and the Home tab expect(box.querySelectorAll('.furnCard').length).toBeGreaterThan(3);
    const m0 = s.money; (box.querySelector('.furnCard[data-id="stool"]') as HTMLButtonElement).click();
    expect(s.money).toBe(m0); expect(box.querySelector('.furnAsk')).toBeTruthy(); (box.querySelector('#fuYes') as HTMLButtonElement).click();      // since Phase 2 the price is confirmed first
    expect(s.money).toBe(m0 - furnById('stool')!.price); expect(changed).toBe(1); expect(h.placing()?.id).toBe('stool'); expect(box.querySelector('#fuCancel')).toBeTruthy(); expect(box.querySelector('#fuRot')).toBeTruthy();
    (box.querySelector('#fuRot') as HTMLButtonElement).click(); expect(h.placing()?.rot).toBe(1);
    (box.querySelector('#fuCancel') as HTMLButtonElement).click(); expect(h.placing()).toBeNull(); expect(furnOf(s).stock.stool).toBe(1);
    (box.querySelector('.furnCard[data-id="stool"]') as HTMLButtonElement).click(); expect(s.money).toBe(m0 - furnById('stool')!.price);   // from the stock: no second payment
    (box.querySelector('[data-cat="luxury"]') as HTMLButtonElement).click(); expect(box.querySelector('.furnCard[data-id="sofa-gold"]')).toBeTruthy();
    s.money = 50; (box.querySelector('.furnCard[data-id="sofa-gold"]') as HTMLButtonElement).click(); expect(notes[notes.length - 1]).toMatch(/Not enough/); expect(furnOf(s).stock['sofa-gold']).toBeUndefined();
    (box.querySelector('#fuHide') as HTMLButtonElement).click(); expect(hidden).toBe(1);
    h.destroy();
  });
});
