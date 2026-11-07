// @vitest-environment jsdom
/* Round 154: the player is seen doing things. When the place changes the avatar walks there on its own, can then go in, and comes out again. */
import { describe, it, expect, beforeEach } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { mountWorld3d } from '../src/world3d';
import type { World3dDeps } from '../src/world3d';

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
  (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).setPointerCapture = () => undefined;
  (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).releasePointerCapture = () => undefined;
});
const stub = (): NonNullable<World3dDeps['rendererFactory']> => canvas => {
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 380, right: 600, bottom: 380, x: 0, y: 0, toJSON() { return {}; } });
  return { domElement: canvas, setSize() { /* nothing */ }, setPixelRatio() { /* nothing */ }, render() { /* nothing */ }, dispose() { /* nothing */ }, shadowMap: { enabled: false, type: 0 } } as never;
};

describe('seeing the player travel', () => {
  it('walks from the house to the station, goes in, and comes out', async () => {
    const s = G.newState('Cine', 'moscow'); s.queue = []; s.day = 4; s.slot = 0; s.loc = 'home';
    const host = document.body.appendChild(document.createElement('div'));
    const h = await mountWorld3d({ host, s, onPlace: () => undefined, onNpc: () => undefined, onFail: () => undefined, rendererFactory: stub() });
    for (let i = 0; i < 100; i++) h.tick(0.05);
    expect(h.enter('home')).toBe(true); h.tick(0.05); expect(h.inside()).toBe('home');
    h.leave(); expect(h.inside()).toBeNull();                                  // first they come out of the house
    const from = h.player(); s.loc = 'station'; h.update(s);                   // the trip is chosen
    h.tick(0.05); expect(h.player().state).toBe('walk');                       // and they start to walk
    let steps = 0; while (h.player().state === 'walk' && steps++ < 20000) h.tick(0.05);
    const to = h.player(); expect(Math.hypot(to.x - from.x, to.z - from.z)).toBeGreaterThan(10);   // they really moved across the city
    expect(h.enter()).toBe(true); h.tick(0.05); expect(h.inside()).toBe('station');               // they go in
    h.leave(); expect(h.inside()).toBeNull();                                  // and come out
    h.destroy();
  });
});
