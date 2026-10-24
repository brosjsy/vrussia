// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import * as G from '../src/engine';
import '../src/content';
import { partsFor, MODELLED } from '../src/furniture3d';
import { interiorFor } from '../src/interiors';
import { buildRoom } from '../src/rooms3d';

const SIZE: Record<string, [number, number, number]> = { bed: [2.6, 3.4, 0.7], chair: [0.9, 0.9, 0.5], table: [2.4, 1.6, 0.85], desk: [2.4, 1.2, 0.8], sofa: [3.2, 1.6, 0.5], wardrobe: [2.6, 1.0, 2.4], fridge: [1.2, 1.2, 2.1], stove: [1.2, 1.2, 0.95], tv: [2.2, 0.5, 1.2], plant: [0.8, 0.8, 1.5], shelf: [2.0, 1.0, 2.2], lamp: [0.6, 0.6, 1.7], bedside: [1.0, 0.9, 0.6], bench: [3.4, 0.7, 0.5], counter: [3.0, 1.3, 1.1], round: [0.8, 0.8, 0.45], rug: [3.4, 2.4, 0.04], laptop: [0.8, 0.6, 0.06], item: [1.2, 1.2, 0.9],
  bath: [1.3, 3.0, 0.6], toilet: [0.7, 0.8, 0.45], sink: [0.8, 0.5, 0.85], washer: [0.8, 0.8, 0.85], hanger: [1.2, 0.5, 1.9], stenka: [2.8, 0.7, 2.2], pech: [2.6, 2.4, 2.3], door: [1.0, 0.1, 2.1], bunk: [1.6, 3.4, 1.8] };

describe('the shapes of furniture', () => {
  it('every modelled kind is made of several parts that stay inside its floor space, stand on the floor and are not absurdly tall', () => {
    for (const k of MODELLED) {
      const [w, d, h] = SIZE[k]; const parts = partsFor({ kind: k, w, d }, h, '#b98a5c');
      expect(parts.length, k).toBeGreaterThanOrEqual(3);
      for (const q of parts) {
        expect([q.w, q.h, q.d, q.x, q.y, q.z].every(Number.isFinite), k).toBe(true); expect(q.w, k).toBeGreaterThan(0); expect(q.h, k).toBeGreaterThan(0); expect(q.c, k).toMatch(/^#[0-9a-f]{6}$/);
        expect(Math.abs(q.x) + q.w / 2, `${k} x`).toBeLessThanOrEqual(w / 2 + 0.16); expect(Math.abs(q.z) + q.d / 2, `${k} z`).toBeLessThanOrEqual(d / 2 + 0.16);
        expect(q.y - q.h / 2, `${k} floor`).toBeGreaterThanOrEqual(-0.001); expect(q.y + q.h / 2, `${k} top`).toBeLessThanOrEqual(Math.max(h, 1.3) + 0.45);
      }
    }
  });
  it('a chair has four legs, a seat and a back; a bed has a white pillow and a headboard; a long sofa has more cushions than a short one', () => {
    const chair = partsFor({ kind: 'chair', w: 0.9, d: 0.9 }, 0.5, '#7a5a3a'); expect(chair.filter(q => q.h > 0.4 && q.w < 0.1 && q.y < 0.3).length).toBe(4); expect(chair.some(q => q.y > 0.9)).toBe(true);
    const bed = partsFor({ kind: 'bed', w: 2.6, d: 3.4 }, 0.7, '#e0735a'); expect(bed.some(q => q.c === '#ffffff' && q.z < 0)).toBe(true); expect(bed.some(q => q.h >= 1 && q.z < -1.5)).toBe(true); expect(bed.some(q => q.c === '#e0735a')).toBe(true);
    expect(partsFor({ kind: 'sofa', w: 4.2, d: 1.8 }, 0.5, '#3b8f6e').length).toBeGreaterThan(partsFor({ kind: 'sofa', w: 1.2, d: 1.2 }, 0.5, '#3b8f6e').length);
    expect(partsFor({ kind: 'wardrobe', w: 3, d: 1.2 }, 2.4, '#8c6a47').length).toBeGreaterThan(partsFor({ kind: 'wardrobe', w: 1.2, d: 1 }, 2.4, '#8c6a47').length);
    expect(partsFor({ kind: 'stove', w: 1.2, d: 1.2 }, 0.95, '#c9ced3').filter(q => q.s === 'cyl').length).toBeGreaterThanOrEqual(8);       // four rings and four knobs
  });
  it('a television shows its screen whichever way round it is given, and things that give light are marked', () => {
    const a = partsFor({ kind: 'tv', w: 2.2, d: 0.5 }, 1.2, '#15171c'), b = partsFor({ kind: 'tv', w: 0.5, d: 2.4 }, 1.2, '#15171c');
    expect(a.some(q => q.glow && q.w > 1.5)).toBe(true); expect(b.some(q => q.glow && q.d > 1.5)).toBe(true);
    expect(partsFor({ kind: 'lamp', w: 0.6, d: 0.6 }, 1.7, '#f0d890').some(q => q.glow)).toBe(true); expect(partsFor({ kind: 'laptop', w: 0.8, d: 0.6 }, 0.06, '#2a2f3a').some(q => q.glow)).toBe(true);
  });
  it('a kind without a shape of its own gives nothing, and the colour of the piece is used', () => {
    expect(partsFor({ kind: 'atm', w: 1, d: 1 }, 1.7, '#4a5568')).toEqual([]); expect(partsFor({ kind: 'window', w: 2, d: 0.2 }, 1.5, '#9fd4ff')).toEqual([]);
    expect(partsFor({ kind: 'table', w: 2, d: 1 }, 0.85, '#123456').some(q => q.c === '#123456')).toBe(true);
  });
});

describe('the room with shaped furniture', () => {
  const home = (): ReturnType<typeof interiorFor> => { const s = G.newState('M', 'moscow'); s.queue = []; return interiorFor('home', s); };
  const meshes = (g: THREE.Object3D): number => { let n = 0; g.traverse(x => { if ((x as THREE.Mesh).isMesh) n++; }); return n; };
  it('has many more shapes than pieces of furniture, and every usable piece is still usable', () => {
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    const it2 = home()!; const r = buildRoom(it2); expect(meshes(r.group)).toBeGreaterThan(it2.props.length * 4);
    for (const p of it2.props) if (p.action) expect(r.usable.some(u => u.userData.action === p.action), p.action).toBe(true);
    let marked = 0; r.group.traverse(x => { if ((x as THREE.Mesh).isMesh && (x.userData.action === 'food' || x.userData.action === 'cook')) marked++; }); expect(marked).toBeGreaterThan(6);    // every part of the fridge (eat) and the stove (cook) answers a click
    r.dispose();
  });
  it('in the evening the windows are dark, a warm light is on and the lamps glow more', () => {
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    const day = buildRoom(home()!, 1), night = buildRoom(home()!, 2);
    const light = (g: THREE.Object3D): number => { let n = 0; g.traverse(x => { if (x instanceof THREE.PointLight) n++; }); return n; };
    expect(light(day.group)).toBe(0); expect(light(night.group)).toBeGreaterThanOrEqual(1);          // the design (round 147): a light for each wall lamp in the evening
    const glass = (g: THREE.Object3D): string[] => { const out: string[] = []; g.traverse(x => { const m = (x as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && m.emissive && x.position.y === 1.9) out.push('#' + m.color.getHexString()); }); return out; };
    expect(glass(day.group)).toContain('#9fd4ff'); expect(glass(night.group)).toContain('#26345c'); expect(glass(buildRoom(home()!, 0).group)).toContain('#bfe3ff');
    day.dispose(); night.dispose();
  });
});

import { iconOf } from '../src/rooms3d';
describe('small pictures instead of words over the things', () => {
  it('every action has its picture, an activity uses the picture of its thing, and an unknown one a question mark', () => {
    expect(iconOf('food')).toBe('🍲'); expect(iconOf('wash')).toBe('🧼'); expect(iconOf('act:tv', '📺 Television')).toBe('📺'); expect(iconOf('act:x', 'Plain words')).toBe('✨'); expect(iconOf('whatever')).toBe('❔');
  });
  it('the things in a room carry a round picture and keep their words for the pointer', () => {
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    const s = G.newState('M', 'moscow'); s.queue = []; const r = buildRoom(interiorFor('home', s)!);
    const pins: THREE.Sprite[] = []; r.group.traverse(x => { if (x instanceof THREE.Sprite && x.userData.action && x.userData.action !== 'exit') pins.push(x); });
    expect(pins.length).toBeGreaterThan(8); for (const p of pins) { expect(p.userData.label, String(p.userData.action)).toBeTruthy(); expect(p.scale.x).toBeCloseTo(p.scale.y, 5); }      // round, not a long pill of text
    r.dispose();
  });
});
