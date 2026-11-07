// @vitest-environment jsdom
/* Nobody walks through a wall. For a number of cities and every kind of start, the whole crowd and the player walk for a long time (by themselves, by hand in every
   direction, and to every place of the city) and we check two things at every step: nobody stands inside a house, a tree, a board or the water, and nobody
   crosses one between two steps (the "tunnel" case: a big step over a thin wall). */
import { describe, it, expect, beforeEach } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { mountWorld3d } from '../src/world3d';
import type { World3dDeps } from '../src/world3d';
import { interiorFor, blocked as roomBlocked, findPath as roomPath, doorOf } from '../src/interiors';
import { homeInterior } from '../src/furniture';
import { standPoint } from '../src/world-logic';
import type { RealBuilding } from '../src/osm';

beforeEach(() => { HTMLCanvasElement.prototype.getContext = (() => null) as never; });
const stub = (): NonNullable<World3dDeps['rendererFactory']> => canvas => { canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 380, right: 600, bottom: 380, x: 0, y: 0, toJSON() { return {}; } }); return { domElement: canvas, setSize() { /* nothing */ }, setPixelRatio() { /* nothing */ }, render() { /* nothing */ }, dispose() { /* nothing */ }, shadowMap: { enabled: false, type: 0 } } as never; };
const mount = async (s: G.State): ReturnType<typeof mountWorld3d> => mountWorld3d({ host: document.body.appendChild(document.createElement('div')), s, onPlace: () => undefined, onNpc: () => undefined, onFail: () => undefined, rendererFactory: stub() });

interface Pt { x: number; z: number }
type H = Awaited<ReturnType<typeof mount>>;
/** Does the straight step from a to b pass through something solid (checked every 10 cm) although neither end is inside it? */
const crosses = (h: H, a: Pt, b: Pt, r: number): boolean => {
  const d = Math.hypot(b.x - a.x, b.z - a.z); if (d > 6) return false;            // a longer jump is a teleport (a person moved out of a new house), not a step
  const n = Math.max(1, Math.ceil(d / 0.1));
  for (let i = 1; i < n; i++) { const t = i / n; if (h.blockedAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, r)) return true; }
  return false;
};

function watch(h: H, s: G.State, ticks: number, dt: number, each?: (i: number) => void): { inside: string[]; tunnel: string[] } {
  const inside: string[] = [], tunnel: string[] = [];
  let prev = new Map<string, Pt>();
  for (let i = 0; i < ticks; i++) {
    h.tick(dt); each?.(i);
    const now = new Map<string, Pt>(); for (const p of h.people()) now.set(p.id, { x: p.x, z: p.z }); const me = h.player(); now.set('player', { x: me.x, z: me.z });
    for (const [id, p] of now) {
      if (h.blockedAt(p.x, p.z, 0.1)) inside.push(`${s.city} ${id} inside at ${p.x.toFixed(1)},${p.z.toFixed(1)} (tick ${i})`);
      const q = prev.get(id); if (q && crosses(h, q, p, 0.1)) tunnel.push(`${s.city} ${id} crossed a wall near ${p.x.toFixed(1)},${p.z.toFixed(1)} (tick ${i})`);
    }
    prev = now;
  }
  return { inside, tunnel };
}

const CITIES = ['Moscow', 'Saint Petersburg', 'Kazan', 'Yekaterinburg', 'Novosibirsk', 'Sochi', 'Vladivostok', 'Grozny', 'Kaliningrad', 'Saratov', 'Makhachkala', 'Pskov'];

describe('walls', () => {
  for (const city of CITIES) {
    it(`${city}: the crowd and the player never stand in or pass through anything solid, walking alone, by hand and to every place`, async () => {
      const s = G.newState('W', city === 'Saratov' ? 'region' : 'tajik', city); s.queue = []; s.slot = 1;
      const h = await mount(s);
      const bad: string[] = [];
      // right after the start (this is the moment after logging in) and a long walk of everyone
      let r = watch(h, s, 150, 0.1); bad.push(...r.inside, ...r.tunnel);
      // by hand: eight directions, each for a few seconds, including with long frames (a slow phone)
      for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]]) { h.walk({ x: dx, z: dz }); r = watch(h, s, 60, 0.25); bad.push(...r.inside, ...r.tunnel); }
      h.walk(null);
      // to every place
      for (const p of G.PLACES) { s.loc = p.id; h.update(s); r = watch(h, s, 120, 0.1); bad.push(...r.inside, ...r.tunnel); }
      h.destroy();
      expect(bad.slice(0, 8), `${bad.length} problems`).toEqual([]);
    }, 120000);
  }
});

describe('walls of the rooms', () => {
  it('in every room (every place and every kind of home) a walk from the door to any spot, round the furniture, never touches a wall or a piece of furniture', () => {
    let rooms = 0, bad: string[] = [];
    const states: G.State[] = [];
    for (const o of G.origins) for (const housing of ['rented', 'flat', 'house', 'village'] as const) { const s = G.newState('R', o.id); s.housing = housing; states.push(s); }
    const list: { name: string; it: NonNullable<ReturnType<typeof interiorFor>> }[] = [];
    for (const s of states) { list.push({ name: `home ${s.o} ${s.housing}`, it: homeInterior(s) }); }
    for (const p of G.PLACES) { const it = interiorFor(p.id, states[0]); if (it) list.push({ name: p.id, it }); }
    for (const { name, it } of list) {
      rooms++;
      const door = doorOf(it); let seed = 7;
      const rnd = (): number => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let k = 0; k < 25; k++) {
        const to = { x: (rnd() * 2 - 1) * (it.w / 2 + 3), z: (rnd() * 2 - 1) * (it.d / 2 + 3) };        // also points outside the room, as a click beyond the wall would give
        let cur = { x: door.x, z: door.z - 1 };
        for (const q of roomPath(it, cur, to)) {
          const n = Math.max(1, Math.ceil(Math.hypot(q.x - cur.x, q.z - cur.z) / 0.1));
          for (let i = 1; i <= n; i++) { const x = cur.x + ((q.x - cur.x) * i) / n, z = cur.z + ((q.z - cur.z) * i) / n; if (roomBlocked(it, x, z, 0.12)) { bad.push(`${name}: touches something at ${x.toFixed(2)},${z.toFixed(2)} on the way to ${to.x.toFixed(1)},${to.z.toFixed(1)}`); break; } }
          cur = q;
        }
      }
    }
    expect(rooms).toBeGreaterThan(20);
    expect(bad.slice(0, 8), `${bad.length} problems`).toEqual([]);
  });
});

describe('walls of the real houses in the 3D city', () => {
  it('when the real houses arrive after the start (as they do after logging in), nobody is left inside one, and the walk to every place stops at its door', async () => {
    const s = G.newState('W', 'tajik', 'Kazan'); s.queue = []; s.slot = 1; const h = await mount(s);
    watch(h, s, 50, 0.1);
    // a real house around the stand point of every place (the stand point is inside it, as a point on a map is), with the house of the place anchored to it
    const anchors: Record<string, RealBuilding> = {}, buildings: RealBuilding[] = [];
    G.PLACES.forEach((p, i) => { const sp = standPoint(p.id), w = 5 + (i % 4) * 1.5, d = 4 + (i % 3) * 2, b: RealBuilding = { pts: [[sp.x - w, sp.z - d], [sp.x + w, sp.z - d], [sp.x + w, sp.z + d], [sp.x - w, sp.z + d]], h: 12, kind: 'block', color: '#d8c9a0' }; anchors[p.id] = b; buildings.push(b); });
    h.setRealBuildings({ buildings, anchors });
    const bad: string[] = [];
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { h.walk({ x: dx, z: dz }); const r = watch(h, s, 80, 0.2); bad.push(...r.inside, ...r.tunnel); }
    h.walk(null);
    for (const p of G.PLACES) { s.loc = p.id; h.update(s); const r = watch(h, s, 150, 0.1); bad.push(...r.inside, ...r.tunnel); }
    h.setRealBuildings(null); h.destroy();
    expect(bad.slice(0, 8), `${bad.length} problems`).toEqual([]);
  }, 120000);
});
