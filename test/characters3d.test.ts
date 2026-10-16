import { describe, it, expect, afterAll } from 'vitest';
import * as THREE from 'three';
import { buildCharacter, setPose, disposeCharacterMaterials, CHAR_SCALE } from '../src/characters3d';
import { STYLES, BOTTOMS, SHOES, HAIR_STYLES, SKINS, HAIR_COLORS, ACCENTS } from '../src/avatar';

afterAll(() => disposeCharacterMaterials());

const countMeshes = (o: THREE.Object3D): number => { let n = 0; o.traverse(x => { if ((x as THREE.Mesh).isMesh) n++; }); return n; };
const cylinders = (o: THREE.Object3D): number => { let n = 0; o.traverse(x => { if ((x as THREE.Mesh).geometry instanceof THREE.CylinderGeometry) n++; }); return n; };
const box = (o: THREE.Object3D): THREE.Box3 => new THREE.Box3().setFromObject(o);
const hexes = (o: THREE.Object3D): Set<string> => { const s = new Set<string>(); o.traverse(x => { const m = (x as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && m.color) s.add('#' + m.color.getHexString()); }); return s; };

describe('building a person', () => {
  it('every top, bottom, shoe, hair style and eye shape builds a sound person: finite sizes, standing on the ground, about two metres tall', () => {
    for (const st of STYLES) for (const b of BOTTOMS) for (const sh of SHOES) for (let hs = 0; hs < HAIR_STYLES.length; hs++) for (const eyes of [0, 1]) {
      const c = buildCharacter({ style: st.id, bottom: b.id, shoes: sh.id, hairStyle: hs, eyes, beard: hs % 3 === 0, height: hs % 3 });
      const bb = box(c.root); const size = bb.getSize(new THREE.Vector3());
      expect([size.x, size.y, size.z].every(Number.isFinite), `${st.id}-${b.id}-${sh.id}-${hs}`).toBe(true);
      expect(bb.min.y).toBeGreaterThan(-0.05 * CHAR_SCALE); expect(bb.min.y).toBeLessThan(0.06 * CHAR_SCALE);
      expect(size.y).toBeGreaterThan(1.7 * CHAR_SCALE * 0.9); expect(size.y).toBeLessThan(2.45 * CHAR_SCALE * 1.1);
      expect(c.legL && c.legR && c.armL && c.armR && c.head && c.body).toBeTruthy();
    }
  });
  it('the chosen height changes the size: short, average and tall in order', () => {
    const h = (n: number): number => box(buildCharacter({ height: n, hairStyle: 5 }).root).getSize(new THREE.Vector3()).y;
    expect(h(0)).toBeLessThan(h(1)); expect(h(1)).toBeLessThan(h(2));
    expect(h(2) / h(0)).toBeCloseTo(1.07 / 0.93, 1);
    expect(buildCharacter({ height: 2 }).height).toBe(1.07);
  });
  it('colours come from the look: skin, hair, top, and the shoes and trousers', () => {
    const c = buildCharacter({ skin: 6, hairColor: 6, accent: 2, bottomColor: 3, shoeColor: 3, hairStyle: 0, style: 'casual', bottom: 'jeans', shoes: 'sneakers' });
    const got = hexes(c.root);
    expect(got.has(SKINS[6])).toBe(true); expect(got.has(HAIR_COLORS[6])).toBe(true); expect(got.has(ACCENTS[2])).toBe(true);
    expect(got.has('#6b4a2e')).toBe(true);                                                 // the fourth trouser colour
    const bald = hexes(buildCharacter({ skin: 0, hairColor: 8, hairStyle: 5 }).root); expect(bald.has(HAIR_COLORS[8])).toBe(false);
  });
  it('every choice changes the shape: hair styles, beard, glasses, hats, a coat, a scarf, a skirt and a dress', () => {
    const base = countMeshes(buildCharacter({ hairStyle: 5 }).root);
    const counts = HAIR_STYLES.map((_, i) => countMeshes(buildCharacter({ hairStyle: i }).root));
    expect(new Set(counts).size).toBeGreaterThan(4); expect(counts[5]).toBeLessThan(counts[1]);
    expect(countMeshes(buildCharacter({ hairStyle: 5, beard: true }).root)).toBeGreaterThan(base);
    expect(countMeshes(buildCharacter({ hairStyle: 5 }, { glasses: true }).root)).toBeGreaterThan(base);
    for (const hat of ['hat-ushanka', 'hat-beanie', 'hat-doppi', 'hat-headscarf']) expect(countMeshes(buildCharacter({ hairStyle: 5 }, { hat }).root), hat).toBeGreaterThan(base);
    expect(hexes(buildCharacter({ hairStyle: 5 }, { outer: 'coat-winter' }).root).has('#3a3f4f')).toBe(true);        // a coat replaces the short sleeves, so it is the colour that shows it
    expect(hexes(buildCharacter({ hairStyle: 5 }).root).has('#3a3f4f')).toBe(false);
    expect(countMeshes(buildCharacter({ hairStyle: 5 }, { outer: 'chapan' }).root)).toBeGreaterThan(countMeshes(buildCharacter({ hairStyle: 5 }, { outer: 'coat-winter' }).root));
    expect(countMeshes(buildCharacter({ hairStyle: 5 }, { scarf: 'scarf-wool' }).root)).toBeGreaterThan(base);
    const plain = cylinders(buildCharacter({ hairStyle: 5 }).root);
    expect(cylinders(buildCharacter({ hairStyle: 5, bottom: 'skirt' }).root)).toBeGreaterThan(plain);      // a skirt and a dress are cones around the hips
    expect(cylinders(buildCharacter({ hairStyle: 5, style: 'dress' }).root)).toBeGreaterThan(plain);
    expect(box(buildCharacter({ hairStyle: 5, style: 'dress' }).root).getSize(new THREE.Vector3()).x).toBeGreaterThan(box(buildCharacter({ hairStyle: 5 }).root).getSize(new THREE.Vector3()).x * 0.95);
    expect(hexes(buildCharacter({}, { outer: 'chapan' }).root).has('#e0b43c')).toBe(true);        // the stripes of the robe
    expect(hexes(buildCharacter({}, { hat: 'hat-headscarf' }).root).has('#a56be0')).toBe(true);
  });
  it('is light enough to put a crowd on the screen: a few dozen shapes each, and colours are shared between people', () => {
    const many = Array.from({ length: 30 }, (_, i) => buildCharacter({ hairStyle: i % 9, skin: i % 8, accent: i % 7, style: STYLES[i % 6].id }));
    for (const c of many) expect(countMeshes(c.root)).toBeLessThan(60);
    const a = buildCharacter({ skin: 3, accent: 1 }), b = buildCharacter({ skin: 3, accent: 1 });
    const mats = (o: THREE.Object3D): Set<THREE.Material> => { const s = new Set<THREE.Material>(); o.traverse(x => { const m = (x as THREE.Mesh).material as THREE.Material | undefined; if (m) s.add(m); }); return s; };
    const shared = Array.from(mats(a.root)).filter(m => mats(b.root).has(m));
    expect(shared.length).toBe(mats(a.root).size);
  });
});

describe('poses', () => {
  const c = buildCharacter({});
  it('walking swings the legs against each other and the arms against the legs, and the body bobs', () => {
    setPose(c, 'walk', Math.PI / 2, 0);
    expect(c.legL.rotation.x).toBeCloseTo(-c.legR.rotation.x, 6); expect(Math.abs(c.legL.rotation.x)).toBeGreaterThan(0.5); expect(Math.abs(c.legL.rotation.x)).toBeLessThanOrEqual(0.71);
    expect(Math.sign(c.armL.rotation.x)).toBe(-Math.sign(c.legL.rotation.x)); expect(c.armR.rotation.x).toBeCloseTo(-c.armL.rotation.x, 6);
    setPose(c, 'walk', 0, 0); expect(c.legL.rotation.x).toBeCloseTo(0, 6); expect(c.body.position.y).toBeGreaterThan(0.03);
    let maxBob = 0; for (let p = 0; p < 7; p += 0.1) { setPose(c, 'walk', p, 0); maxBob = Math.max(maxBob, c.body.position.y); }
    expect(maxBob).toBeLessThan(0.06);
  });
  it('talking raises one arm and moves it, nods the head, and does not move the legs', () => {
    const arms = new Set<string>(); for (let t = 0; t < 2; t += 0.1) { setPose(c, 'talk', 0, t); arms.add(c.armR.rotation.x.toFixed(3)); }
    expect(arms.size).toBeGreaterThan(5);
    setPose(c, 'talk', 0, 0.3); expect(c.armR.rotation.x).toBeLessThan(-0.5); expect(c.legL.rotation.x).toBe(0); expect(c.legR.rotation.x).toBe(0);
  });
  it('standing is almost still, and every pose starts from a clean position (no leftover from the one before)', () => {
    setPose(c, 'talk', 0, 0.3); setPose(c, 'idle', 0, 0.3);
    expect(c.armR.rotation.x).toBe(0); expect(Math.abs(c.armL.rotation.z)).toBeLessThan(0.1); expect(Math.abs(c.body.position.y)).toBeLessThan(0.01);
    setPose(c, 'walk', 1, 0); setPose(c, 'idle', 0, 0); expect(c.legL.rotation.x).toBe(0);
    for (const mode of ['idle', 'walk', 'talk'] as const) for (let t = 0; t < 20; t += 1.3) { setPose(c, mode, t, t); expect([c.legL.rotation.x, c.armR.rotation.x, c.head.rotation.y, c.body.position.y].every(Number.isFinite)).toBe(true); }
  });
  it('the shared colours can be freed', () => {
    disposeCharacterMaterials();
    expect(countMeshes(buildCharacter({}).root)).toBeGreaterThan(10);                    // and building again afterwards still works
  });
});
