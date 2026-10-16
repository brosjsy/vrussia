// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { steer, placeNear, mustWait, newAgent, standPoint, seeded, PLAYER_SPEED } from '../src/world-logic';
import { keyDir, stickDir, mountWalk } from '../src/walk-ui';
import { mountWorld3d } from '../src/world3d';
import { HOTKEYS } from '../src/settings';
import { EN, RU } from '../src/i18n';

vi.setConfig({ testTimeout: 30000 });
const stub = () => () => ({ domElement: document.createElement('canvas'), setPixelRatio() {}, setSize() {}, render() {}, dispose() {}, shadowMap: { enabled: false, type: 0 } }) as never;
const fresh = (): G.State => { const s = G.newState('Walker', 'moscow'); s.queue = []; s.slot = 0; s.weather = 'clear'; return s; };

describe('walking by hand: the rules', () => {
  it('a step goes the way asked at the player\'s pace, drops any trip under way, and a stop leaves them standing', () => {
    const a = newAgent('player', 'home', seeded(1), false); a.speed = PLAYER_SPEED; a.path = [{ x: 99, z: 99 }]; a.state = 'walk';
    const x0 = a.pos.x, z0 = a.pos.z;
    for (let i = 0; i < 10; i++) steer(a, { x: 1, z: 0 }, 0.1);
    expect(a.pos.x - x0).toBeCloseTo(PLAYER_SPEED, 5); expect(a.pos.z).toBeCloseTo(z0, 9); expect(a.path).toEqual([]); expect(a.state).toBe('walk'); expect(a.heading).toBeCloseTo(Math.PI / 2, 9);
    const x1 = a.pos.x; steer(a, { x: 0.5, z: 0 }, 1); expect(a.pos.x - x1).toBeCloseTo(PLAYER_SPEED / 2, 5);             // the stick half-way: a slower walk
    steer(a, { x: 0, z: 0 }, 0.1); expect(a.state).toBe('idle'); const x2 = a.pos.x; steer(a, { x: 0.05, z: 0 }, 1); expect(a.pos.x).toBe(x2);
    const wall = (_f: { x: number; z: number }, to: { x: number; z: number }) => ({ x: Math.min(to.x, x2 + 0.5), z: to.z });   // something solid half a metre ahead
    steer(a, { x: 1, z: 0 }, 1, wall); expect(a.pos.x).toBeCloseTo(x2 + 0.5, 9);
  });
  it('the door the player stands at, the nearest first; nowhere in between', () => {
    const b = standPoint('bank'); expect(placeNear(b)).toBe('bank'); expect(placeNear({ x: b.x + 3, z: b.z })).toBe('bank');
    expect(placeNear({ x: 400, z: 400 })).toBeNull();
    for (const p of G.PLACES) expect(placeNear(standPoint(p.id))).toBe(p.id);
  });
  it('at the kerb: wait while a car is close to the spot about to be stepped on; walk on when it has gone, and never wait on the pavement', () => {
    const road = (p: { x: number; z: number }) => p.x > 0;           // the roadway is everything to the right of x = 0
    expect(mustWait({ x: -1, z: 0 }, { x: 0.5, z: 0 }, [{ x: 3, z: 4 }], road)).toBe(true);
    expect(mustWait({ x: -1, z: 0 }, { x: 0.5, z: 0 }, [{ x: 3, z: 40 }], road)).toBe(false);
    expect(mustWait({ x: -3, z: 0 }, { x: -2, z: 0 }, [{ x: -1, z: 0 }], road)).toBe(false);         // still on the pavement
    expect(mustWait({ x: 1, z: 0 }, { x: 2, z: 0 }, [{ x: 3, z: 0 }], road)).toBe(false);            // already crossing: keep going
  });
  it('the keys and the stick give a direction: W forward, D right, two keys a diagonal; the stick by how far it is pushed', () => {
    expect(keyDir(['w'])).toEqual({ x: 0, z: 1 }); expect(keyDir(['arrowleft'])).toEqual({ x: -1, z: 0 }); expect(keyDir([])).toBeNull(); expect(keyDir(['w', 's'])).toBeNull();
    const d = keyDir(['w', 'd'])!; expect(d.x).toBeCloseTo(Math.SQRT1_2, 9); expect(d.z).toBeCloseTo(Math.SQRT1_2, 9);
    expect(stickDir(0, -55, 55)).toEqual({ x: 0, z: 1 }); expect(stickDir(2, 2, 55)).toBeNull(); expect(stickDir(0, 200, 55)!.z).toBeCloseTo(-1, 9);
    const half = stickDir(27.5, 0, 55)!; expect(half.x).toBeCloseTo(0.5, 9);
  });
});

describe('walking in the 3D city', () => {
  it('the player walks where the keys point, stays clear of houses, the camera follows close, and stands still when let go', async () => {
    const h = await mountWorld3d({ host: document.body.appendChild(document.createElement('div')), s: fresh(), onPlace: () => undefined, onNpc: () => undefined, onFail: () => undefined, rendererFactory: stub() });
    for (let i = 0; i < 60; i++) h.tick(0.05);                                                       // let the player settle at home
    expect(h.walkInfo().near).toBe('home');
    const p0 = h.player(); h.walk({ x: 0, z: 1 });
    for (let i = 0; i < 40; i++) { h.tick(0.05); expect(h.blockedAt(h.player().x, h.player().z, 0.3)).toBe(false); }
    const p1 = h.player(); expect(Math.hypot(p1.x - p0.x, p1.z - p0.z)).toBeGreaterThan(1); expect(p1.state).toBe('walk');
    expect(h.camera.position.distanceTo({ x: p1.x, y: 4, z: p1.z } as never)).toBeLessThan(55);       // no rising over the city as on a trip
    h.walk(null); h.tick(0.05); expect(h.player().state).toBe('idle'); const p2 = h.player(); for (let i = 0; i < 10; i++) h.tick(0.05); expect(h.player().x).toBeCloseTo(p2.x, 1);
    h.destroy();
  });
  it('photo mode\'s free camera stops following the player; leaving it brings the camera back to them', async () => {
    const h = await mountWorld3d({ host: document.body.appendChild(document.createElement('div')), s: fresh(), onPlace: () => undefined, onNpc: () => undefined, onFail: () => undefined, rendererFactory: stub() });
    for (let i = 0; i < 40; i++) h.tick(0.05);
    h.setFreeCam(true); const c0 = h.camera.position.clone();
    h.walk({ x: 1, z: 0 }); for (let i = 0; i < 30; i++) h.tick(0.05); h.walk(null);
    expect(h.camera.position.distanceTo(c0)).toBeLessThan(0.5);
    h.setFreeCam(false); for (let i = 0; i < 60; i++) h.tick(0.05);
    expect(h.camera.position.distanceTo(c0)).toBeGreaterThan(1);
    h.destroy();
  });
});

describe('the walking controls on the page', () => {
  it('keys walk and stop; typing in a box does not walk; the stick walks while pressed; the door chip goes in or waits for a car', () => {
    const calls: ({ x: number; z: number } | null)[] = []; let info = { near: 'bank' as string | null, waiting: false }; const went: string[] = [];
    const host = document.body.appendChild(document.createElement('div')); vi.useFakeTimers();             // the chip looks every 0.3 s
    const stop = mountWalk(host, { walk: d => calls.push(d), walkInfo: () => info }, { here: () => 'home', go: id => went.push(id), stick: true });
    const key = (type: string, k: string, target: EventTarget = document) => target.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
    key('keydown', 'w'); expect(calls.at(-1)).toEqual({ x: 0, z: 1 });
    key('keydown', 'D'); expect(calls.at(-1)!.x).toBeCloseTo(Math.SQRT1_2, 9);
    key('keyup', 'w'); key('keyup', 'D'); expect(calls.at(-1)).toBeNull();
    const box = document.body.appendChild(document.createElement('input')); const n = calls.length; key('keydown', 'a', box); expect(calls.length).toBe(n);
    const pad = host.querySelector<HTMLElement>('.walkStick')!; expect(pad).toBeTruthy();
    pad.dispatchEvent(new MouseEvent('pointerdown', { clientX: 55, clientY: 0, bubbles: true })); expect(calls.at(-1)).toEqual({ x: 0, z: 1 });
    pad.dispatchEvent(new MouseEvent('pointerup', { bubbles: true })); expect(calls.at(-1)).toBeNull();
    const chip = host.querySelector<HTMLButtonElement>('.walkNear')!; expect(chip.hidden).toBe(false); expect(chip.textContent).toContain(G.placeById('bank').n);
    chip.click(); expect(went).toEqual(['bank']);
    info = { near: 'bank', waiting: true }; vi.advanceTimersByTime(350); expect(chip.disabled).toBe(true); chip.click(); expect(went).toEqual(['bank']);
    info = { near: null, waiting: false }; vi.advanceTimersByTime(350); expect(chip.hidden).toBe(true); vi.useRealTimers();
    stop(); expect(host.querySelector('.walkStick')).toBeNull(); expect(calls.at(-1)).toBeNull();
    key('keydown', 'w'); expect(calls.at(-1)).toBeNull();                                                // stopped: the keys do nothing any more
    for (const k of ['walkStick', 'walkWait', 'walkIn', 'walkGo']) { expect(EN[k]).toBeTruthy(); expect(RU[k]).toMatch(/[А-Яа-я]/); }
    expect(HOTKEYS[0][0]).toBe('W A S D');
  });
  it('in the game: the 3D view gets the controls, and at the home door the chip takes the player inside', async () => {
    (window as unknown as Record<string, unknown>).WebGLRenderingContext = function () { /* a stand-in */ };
    HTMLCanvasElement.prototype.getContext = ((kind: string) => (kind === 'webgl2' || kind === 'webgl' ? ({} as never) : null)) as never;
    (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).setPointerCapture = () => undefined;
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    localStorage.clear(); vi.resetModules();
    (await import('../src/world3d-support')).setTestRendererFactory(canvas => ({ domElement: canvas, setSize() {}, setPixelRatio() {}, render() {}, dispose() {}, shadowMap: { enabled: false, type: 0 } }) as never);
    const ui = await import('../src/ui'); ui.boot(); await ui.uiReady();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Walker';
    document.getElementById('startBtn')!.click();
    for (let i = 0; i < 40 && !document.querySelector('#actions button'); i++) (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();
    document.getElementById('modal')!.hidden = true;
    await vi.waitFor(() => expect(document.querySelector('#world3d .walkNear')).toBeTruthy(), { timeout: 15000 });
    const chip = document.querySelector<HTMLButtonElement>('#world3d .walkNear')!;
    await vi.waitFor(() => expect(chip.textContent).toContain(EN.walkIn), { timeout: 5000 });
    chip.click();
    await vi.waitFor(() => expect(document.querySelector('#world3d [data-tool="door"]')!.textContent).toBe(EN.goOutside), { timeout: 5000 });
  }, 60000);
});
