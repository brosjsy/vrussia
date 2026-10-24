/* The 3D look of the game's design ("City Life", round 147): the rounded shapes it builds everything from (a box with soft edges, a limb that hangs
   from its top), its furniture models (a red plastic chair, a sofa with cushions, a bed with a blanket and pillow, a gas cooker with rings, a fridge with
   handles, a flat TV with a glowing screen, a bookshelf of coloured books, a palm in a pot, a floor lamp that lights up in the evening, a rug, a dog in its
   bed...) and fabric patterns drawn on a small canvas. The design's African prints (Ankara, Adire, Aso-oke) are replaced by Russian ones: Gzhel (blue on
   white) and Khokhloma (red and gold on black). Everything is procedural: no files to download. three.js r186 (colours are given as sRGB hex). */
import * as THREE from 'three';

const clamp = (v: number, a = 0, b = 1): number => Math.max(a, Math.min(b, v));
/** A colour made lighter (amt > 0) or darker, as the design does it (in HSL). */
export function shade(hex: string, amt: number): string {
  const c = new THREE.Color(hex), h = { h: 0, s: 0, l: 0 }; c.getHSL(h); c.setHSL(h.h, h.s, clamp(h.l + amt)); return '#' + c.getHexString();
}

/* geometry: shared by everybody, made once per size */
const geos = new Map<string, THREE.BufferGeometry>();
const once = <T extends THREE.BufferGeometry>(key: string, make: () => T): T => { let g = geos.get(key) as T | undefined; if (!g) { g = make(); geos.set(key, g); } return g; };
/** A box with rounded edges and corners (radius r). */
export function rbox(w: number, h: number, d: number, r: number, seg = 3): THREE.BufferGeometry {
  return once(`rb${w},${h},${d},${r},${seg}`, () => {
    const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position, n = g.attributes.normal; const rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
    const lim = new THREE.Vector3(w / 2 - rr, h / 2 - rr, d / 2 - rr), v = new THREE.Vector3(), c = new THREE.Vector3(), lo = lim.clone().negate();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); c.copy(v).clamp(lo, lim); const o = v.clone().sub(c).normalize(); p.setXYZ(i, c.x + o.x * rr, c.y + o.y * rr, c.z + o.z * rr); n.setXYZ(i, o.x, o.y, o.z); }
    return g;
  });
}
/** A limb: a tapered cylinder that hangs down from its top (so it turns at the joint). */
export const limb = (len: number, r1: number, r2: number, seg = 12): THREE.BufferGeometry => once(`lb${len},${r1},${r2},${seg}`, () => { const g = new THREE.CylinderGeometry(r1, r2, len, seg, 1); g.translate(0, -len / 2, 0); return g; });
export const sphere = (r: number, ws = 14, hs = 10, phiLen = Math.PI * 2, thetaLen = Math.PI): THREE.BufferGeometry => once(`sp${r},${ws},${hs},${phiLen},${thetaLen}`, () => new THREE.SphereGeometry(r, ws, hs, 0, phiLen, 0, thetaLen));
export const cylinder = (rt: number, rb: number, h: number, seg = 16): THREE.BufferGeometry => once(`cy${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
export const torus = (r: number, tube: number, rs = 8, ts = 20, arc = Math.PI * 2): THREE.BufferGeometry => once(`to${r},${tube},${rs},${ts},${arc}`, () => new THREE.TorusGeometry(r, tube, rs, ts, arc));
export const plainBox = (w: number, h: number, d: number): THREE.BufferGeometry => once(`bx${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));

/* materials: one per colour and finish, shared */
export interface Finish { r?: number; m?: number; map?: THREE.Texture | null; em?: string; ei?: number; op?: number }
const mats = new Map<string, THREE.MeshStandardMaterial>();
export function kitMat(hex: string, o: Finish = {}): THREE.MeshStandardMaterial {
  const key = `${hex}|${o.r ?? 0.75}|${o.m ?? 0}|${o.map?.uuid ?? ''}|${o.em ?? ''}|${o.ei ?? ''}|${o.op ?? ''}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hex, roughness: o.r ?? 0.75, metalness: o.m ?? 0, map: o.map ?? null, emissive: o.em ? new THREE.Color(o.em) : new THREE.Color(0x000000), emissiveIntensity: o.ei ?? 1, transparent: !!o.op, opacity: o.op ?? 1 });
    mats.set(key, m);
  }
  return m;
}
/** Frees the shared shapes, colours and patterns (when the 3D world closes). */
export function disposeKit(): void { mats.forEach(m => m.dispose()); mats.clear(); geos.forEach(g => g.dispose()); geos.clear(); texs.forEach(t => t.dispose()); texs.clear(); }

export const add = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, shadow = true): THREE.Mesh => {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; parent.add(o); return o;
};

/* fabric patterns */
export type Fabric = 'Plain' | 'Gzhel' | 'Khokhloma';
const texs = new Map<string, THREE.CanvasTexture>();
/** A fabric drawn on a canvas, in the base colour; null where there is no canvas (tests in Node). */
export function fabricTex(kind: Fabric, base: string): THREE.CanvasTexture | null {
  const k = kind + base; const have = texs.get(k); if (have) return have;
  if (typeof document === 'undefined') return null;
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d'); if (!x) return null;
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  if (kind === 'Gzhel') {                    // cobalt flowers and curls on white
    x.fillStyle = '#f6f8fb'; x.fillRect(0, 0, S, S); x.strokeStyle = '#1f4fb5'; x.fillStyle = '#1f4fb5'; x.lineWidth = 3;
    for (const [cx, cy] of [[32, 32], [96, 96], [96, 32], [32, 96]]) { for (let a = 0; a < 5; a++) { x.beginPath(); x.ellipse(cx + Math.cos(a * 1.26) * 9, cy + Math.sin(a * 1.26) * 9, 7, 4, a * 1.26, 0, 7); x.fill(); } x.beginPath(); x.arc(cx, cy, 4, 0, 7); x.fillStyle = '#f6f8fb'; x.fill(); x.fillStyle = '#1f4fb5'; }
    x.beginPath(); x.moveTo(0, 64); x.bezierCurveTo(32, 40, 64, 88, 128, 64); x.stroke();
  } else if (kind === 'Khokhloma') {        // red and gold berries and leaves on black
    x.fillStyle = '#16120e'; x.fillRect(0, 0, S, S);
    for (const [cx, cy] of [[30, 34], [94, 98], [96, 30], [28, 96]]) { x.fillStyle = '#c8261e'; for (let a = 0; a < 3; a++) { x.beginPath(); x.arc(cx + a * 8 - 8, cy + (a % 2) * 6, 6, 0, 7); x.fill(); }
      x.fillStyle = '#d9a52a'; for (let a = 0; a < 4; a++) { x.beginPath(); x.ellipse(cx + Math.cos(a * 1.6) * 14, cy + Math.sin(a * 1.6) * 14, 8, 3, a * 1.6, 0, 7); x.fill(); } }
    x.strokeStyle = '#d9a52a'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(40, 30, 80, 60, 128, 128); x.stroke();
  } else { const d = x.getImageData(0, 0, S, S); for (let i = 0; i < d.data.length; i += 4) { const n = ((i * 7919) % 11) - 5; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; } x.putImageData(d, 0, 0); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(kind === 'Plain' ? 1 : 1.6, kind === 'Plain' ? 1 : 1.6); t.colorSpace = THREE.SRGBColorSpace;
  texs.set(k, t); return t;
}

/* ---------- furniture ---------- */
export type KitKind = 'chair' | 'table' | 'armchair' | 'sofa' | 'beanbag' | 'bed' | 'kingbed' | 'cooker' | 'fridge' | 'toilet' | 'bucket' | 'shower' | 'tv' | 'console' | 'radio' | 'guitar' | 'bookshelf' | 'desk' | 'lamp' | 'plant' | 'rug' | 'dogbed' | 'safe' | 'fan';
export const KIT_KINDS: KitKind[] = ['chair', 'table', 'armchair', 'sofa', 'beanbag', 'bed', 'kingbed', 'cooker', 'fridge', 'toilet', 'bucket', 'shower', 'tv', 'console', 'radio', 'guitar', 'bookshelf', 'desk', 'lamp', 'plant', 'rug', 'dogbed', 'safe', 'fan'];
/** A piece of the design's furniture, its back towards -z, standing on y = 0. `main` recolours its main part (the seat, the blanket, the cushions).
   `lights` collects the lamps that glow in the evening. */
export function furnitureModel(kind: KitKind, main?: string, lights?: { light: THREE.PointLight; bulb: THREE.Mesh }[]): THREE.Group {
  const g = new THREE.Group(), DK = '#3b2a1e', WD = '#9a6a3c', MT = '#9aa3ad';
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: string, r = 0.03, o: Finish = {}): THREE.Mesh => add(g, rbox(w, h, d, r, 2), kitMat(c, o), x, y, z);
  const cyl = (rt: number, rb: number, h: number, x: number, y: number, z: number, c: string, o: Finish = {}, seg = 16): THREE.Mesh => add(g, cylinder(rt, rb, h, seg), kitMat(c, o), x, y, z);
  const legs4 = (w: number, d: number, h: number, c: string, t = 0.06): void => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(t, h, t, sx * (w / 2 - t), h / 2, sz * (d / 2 - t), c, 0.01); };
  switch (kind) {
    case 'chair': { const c = main ?? '#d9473f'; box(0.5, 0.06, 0.5, 0, 0.45, 0, c); box(0.5, 0.5, 0.06, 0, 0.72, -0.22, c); legs4(0.48, 0.48, 0.45, shade(c, -0.08), 0.05); break; }
    case 'fan': { cyl(0.18, 0.22, 0.04, 0, 0.02, 0, '#e8eef3'); cyl(0.025, 0.025, 1.1, 0, 0.57, 0, MT); const h = new THREE.Group(); h.position.set(0, 1.15, 0.05); g.add(h); const disc = add(h, cylinder(0.2, 0.2, 0.04, 20), kitMat('#7fb6e8')); disc.rotation.x = Math.PI / 2; add(h, torus(0.2, 0.012, 6, 24), kitMat('#e8eef3'), 0, 0, 0.03); g.userData.spin = h; break; }
    case 'table': box(1.7, 0.08, 1.7, 0, 0.75, 0, main ?? WD); legs4(1.6, 1.6, 0.75, DK, 0.08); box(0.5, 0.03, 0.5, 0, 0.8, 0, '#f3efe6', 0.01); cyl(0.1, 0.1, 0.03, 0.3, 0.8, 0.3, '#ffffff'); cyl(0.1, 0.1, 0.03, -0.3, 0.8, -0.3, '#ffffff'); break;
    case 'armchair': { const c = main ?? '#4a6a96', s = shade(c, -0.05); box(0.8, 0.4, 0.75, 0, 0.3, 0, c, 0.1); box(0.8, 0.55, 0.2, 0, 0.7, -0.28, c, 0.08); box(0.15, 0.3, 0.75, 0.33, 0.6, 0, s, 0.06); box(0.15, 0.3, 0.75, -0.33, 0.6, 0, s, 0.06); break; }
    case 'sofa': { const c = main ?? '#6b2f8c'; box(1.8, 0.4, 0.8, 0, 0.3, 0, c, 0.1); box(1.8, 0.55, 0.22, 0, 0.72, -0.3, c, 0.08); for (const s of [-1, 1]) box(0.18, 0.35, 0.8, s * 0.82, 0.6, 0, shade(c, -0.06), 0.07); for (const s of [-1, 1]) box(0.75, 0.12, 0.6, s * 0.39, 0.55, 0.04, shade(c, 0.06), 0.05); break; }
    case 'beanbag': { const m = add(g, sphere(0.42, 20, 14), kitMat(main ?? '#f59e42', { r: 0.9 }), 0, 0.3, 0); m.scale.set(1, 0.7, 1); break; }
    case 'bed': box(0.95, 0.3, 1.95, 0, 0.2, 0, WD, 0.04); box(0.88, 0.18, 1.85, 0, 0.42, 0, '#f7f2e6', 0.06); box(0.85, 0.08, 1.3, 0, 0.52, 0.25, main ?? '#d9473f', 0.04); box(0.6, 0.12, 0.3, 0, 0.56, -0.72, '#ffffff', 0.06); box(0.95, 0.8, 0.08, 0, 0.45, -0.98, WD, 0.03); break;
    case 'kingbed': box(1.9, 0.3, 1.95, 0, 0.2, 0, DK, 0.04); box(1.82, 0.2, 1.85, 0, 0.43, 0, '#f7f2e6', 0.06); box(1.8, 0.08, 1.25, 0, 0.54, 0.28, main ?? '#2f7de1', 0.04); for (const s of [-1, 1]) box(0.7, 0.14, 0.32, s * 0.45, 0.58, -0.72, '#ffffff', 0.07); box(1.95, 1.1, 0.1, 0, 0.6, -0.98, DK, 0.04); box(1.7, 0.7, 0.06, 0, 0.75, -0.93, '#c9a227', 0.04); break;
    case 'cooker': box(0.7, 0.85, 0.65, 0, 0.43, 0, '#e8eef3', 0.04); box(0.5, 0.35, 0.02, 0, 0.38, 0.33, '#2a2f38', 0.02); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.09, 0.09, 0.03, sx * 0.17, 0.87, sz * 0.15, '#2a2f38'); box(0.7, 0.15, 0.05, 0, 0.95, -0.3, '#cfd6de', 0.02); break;
    case 'fridge': box(0.75, 1.8, 0.7, 0, 0.9, 0, '#dfe6ee', 0.06); box(0.73, 0.02, 0.02, 0, 1.15, 0.36, '#aab3bd', 0.005); box(0.04, 0.35, 0.04, 0.28, 1.45, 0.37, MT, 0.02); box(0.04, 0.35, 0.04, 0.28, 0.8, 0.37, MT, 0.02); break;
    case 'toilet': box(0.42, 0.4, 0.55, 0, 0.2, 0.05, '#ffffff', 0.12); box(0.45, 0.06, 0.55, 0, 0.43, 0.06, '#f0f0f0', 0.06); box(0.45, 0.4, 0.18, 0, 0.62, -0.24, '#ffffff', 0.05); break;
    case 'bucket': { cyl(0.2, 0.16, 0.35, -0.12, 0.18, 0, main ?? '#2f7de1', { r: 0.4 }); add(g, torus(0.19, 0.012, 6, 20, Math.PI), kitMat(MT), -0.12, 0.36, 0); cyl(0.22, 0.15, 0.12, 0.2, 0.06, 0.1, '#e5484d', { r: 0.4 }); cyl(0.06, 0.06, 0.18, 0.2, 0.2, -0.2, '#f59e42'); break; }
    case 'shower': box(0.9, 0.08, 0.9, 0, 0.04, 0, '#e8eef3', 0.03); cyl(0.02, 0.02, 2.1, -0.38, 1.05, -0.38, MT, { m: 0.6, r: 0.3 }); cyl(0.12, 0.12, 0.04, -0.2, 2.05, -0.2, MT, { m: 0.6, r: 0.3 }); box(0.02, 1.9, 0.9, 0.44, 1.0, 0, '#bfe3ff', 0.005, { op: 0.35, r: 0.1 }); break;
    case 'tv': { box(1.6, 0.5, 0.45, 0, 0.25, 0, DK, 0.03); box(1.5, 0.85, 0.06, 0, 1.0, -0.1, '#111111', 0.02); const sc = add(g, plainBox(1.42, 0.77, 0.005), kitMat('#1d6fd8', { em: '#3a8df0', ei: 0.5 }), 0, 1.0, -0.065); sc.name = 'screen'; break; }
    case 'console': box(0.5, 0.4, 0.4, 0, 0.2, 0, '#ffffff', 0.03); box(0.35, 0.06, 0.25, 0, 0.43, 0, '#111111', 0.02); box(0.18, 0.04, 0.1, 0.12, 0.48, 0.08, '#2a2f38', 0.02); break;
    case 'radio': { box(0.5, 0.5, 0.5, 0, 0.25, 0, WD); box(0.45, 0.25, 0.2, 0, 0.62, 0, '#2a2f38', 0.04); for (const x of [-0.1, 0.1]) cyl(0.06, 0.06, 0.02, x, 0.62, 0.1, '#cfd6de').rotation.x = Math.PI / 2; cyl(0.005, 0.005, 0.3, 0.18, 0.88, 0, MT); break; }
    case 'guitar': { box(0.5, 0.08, 0.4, 0, 0.04, 0, DK); const gg = new THREE.Group(); gg.position.set(0, 0.08, 0); gg.rotation.z = 0.15; g.add(gg); const b = add(gg, sphere(0.2, 16, 12), kitMat('#c4772f', { r: 0.4 }), 0, 0.3, 0); b.scale.set(1, 1.2, 0.35); add(gg, rbox(0.06, 0.6, 0.04, 0.01, 2), kitMat(DK), 0, 0.85, 0); add(gg, rbox(0.1, 0.12, 0.04, 0.01, 2), kitMat(DK), 0, 1.18, 0); break; }
    case 'bookshelf': box(0.9, 1.8, 0.35, 0, 0.9, 0, main ?? WD, 0.02); for (let i = 0; i < 4; i++) { box(0.84, 0.03, 0.3, 0, 0.3 + i * 0.42, 0.02, DK, 0.01); for (let k = 0; k < 6; k++) box(0.1, 0.3, 0.22, -0.33 + k * 0.13, 0.47 + i * 0.42, 0.03, ['#e5484d', '#2f7de1', '#22b573', '#f59e42', '#8b5cf6', '#f4efe6'][(k + i) % 6], 0.01); } break;
    case 'desk': box(1.6, 0.06, 0.7, 0, 0.75, 0, main ?? '#f3efe6'); legs4(1.5, 0.62, 0.75, '#2a2f38', 0.05); box(0.7, 0.42, 0.04, 0, 1.05, -0.2, '#111111', 0.02); add(g, plainBox(0.64, 0.36, 0.005), kitMat('#0f172a', { em: '#22b573', ei: 0.35 }), 0, 1.05, -0.177); box(0.45, 0.02, 0.15, 0, 0.79, 0.1, '#2a2f38', 0.01); box(0.5, 0.08, 0.5, 0, 0.48, 0.55, '#1d2433'); box(0.5, 0.5, 0.06, 0, 0.75, 0.78, '#1d2433'); break;
    case 'lamp': { cyl(0.18, 0.2, 0.04, 0, 0.02, 0, '#2a2f38'); cyl(0.02, 0.02, 1.4, 0, 0.72, 0, '#2a2f38'); const shadeM = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0.3, roughness: 0.75 }); const sh = add(g, cylinder(0.15, 0.25, 0.3), shadeM, 0, 1.45, 0); const pl = new THREE.PointLight(0xffc977, 0, 5, 2); pl.position.set(0, 1.3, 0); g.add(pl); lights?.push({ light: pl, bulb: sh }); break; }
    case 'plant': { cyl(0.18, 0.14, 0.35, 0, 0.18, 0, '#c4772f'); for (let i = 0; i < 7; i++) { const l = add(g, once('cone.06.9', () => new THREE.ConeGeometry(0.06, 0.9, 5)), kitMat('#2f8f4e', { r: 0.8 }), 0, 0.75, 0); l.rotation.set(Math.cos(i) * 0.5, i, Math.sin(i * 1.7) * 0.5); l.position.x = Math.cos(i * 0.9) * 0.06; } break; }
    case 'rug': { const c = main ?? '#c9a227'; const r = add(g, plainBox(1.8, 0.02, 1.8), kitMat(c, { r: 1 }), 0, 0.01, 0, false); void r; add(g, rbox(1.4, 0.022, 1.4, 0.005, 2), kitMat('#e5484d', { r: 1 }), 0, 0.012, 0, false); add(g, rbox(0.9, 0.024, 0.9, 0.005, 2), kitMat('#1d2433', { r: 1 }), 0, 0.013, 0, false); break; }
    case 'dogbed': { const t = add(g, torus(0.32, 0.12, 10, 20), kitMat('#7a4a2a', { r: 0.9 }), 0, 0.12, 0); t.rotation.x = Math.PI / 2; cyl(0.3, 0.3, 0.06, 0, 0.05, 0, '#f4efe6');
      const dog = new THREE.Group(); dog.position.set(0, 0.2, 0); g.add(dog); const fur = kitMat('#c68a62'); add(dog, sphere(0.15, 12, 10), fur).scale.set(1, 0.8, 1.4); add(dog, sphere(0.1, 12, 10), fur, 0, 0.1, 0.2);
      for (const s of [-1, 1]) add(dog, sphere(0.04, 8, 6), kitMat('#7a4a2a'), s * 0.07, 0.17, 0.2).scale.set(0.6, 1.4, 0.6); add(dog, sphere(0.02, 8, 6), kitMat('#111111'), 0, 0.1, 0.3); break; }
    case 'safe': { box(0.7, 0.8, 0.7, 0, 0.4, 0, '#3a3f47', 0.05); cyl(0.12, 0.12, 0.04, 0, 0.45, 0.36, '#c9a227', { m: 0.9, r: 0.2 }).rotation.x = Math.PI / 2; const gem = add(g, once('oct.16', () => new THREE.OctahedronGeometry(0.16)), kitMat('#9be7ff', { m: 0.3, r: 0.05, em: '#5ad1ff', ei: 0.4 }), 0, 1.0, 0); gem.name = 'spin'; break; }
  }
  return g;
}

/** The design's wooden floor: a chequer of two woods with a fine grain, drawn on a canvas (null without one). */
export function kitFloorTexture(a = '#b98552', b = '#a8743f'): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'); if (!x) return null;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? b : a; x.fillRect(i * 64, j * 64, 64, 64); x.strokeStyle = 'rgba(0,0,0,.08)'; x.strokeRect(i * 64 + 0.5, j * 64 + 0.5, 63, 63);
    x.globalAlpha = 0.07; for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? '#fff' : '#000'; x.fillRect(i * 64, j * 64 + k * 11, 64, 2); } x.globalAlpha = 1; }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
