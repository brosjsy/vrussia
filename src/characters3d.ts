/* People in 3D: a person with human proportions (about 1.8 m tall, head about a seventh of the height) built from smooth rounded shapes, dressed from
   the same Look and Worn choices as the 2D portraits, with jointed limbs (hip, knee, shoulder, elbow), a face (eyes with irises, brows, nose, mouth,
   ears), a neck, hands and shoes, and poses (standing and breathing, walking with bent knees and elbows, talking with a gesture).
   Feet stand on y = 0, the face looks along +z. Only a few dozen simple shapes per person and shared colours keep a crowd light enough for the screen. */
import * as THREE from 'three';
import { EYE_COLORS, SKINS, HAIR_COLORS, ACCENTS, BOTTOM_COLORS, SHOE_COLORS, normalizeLook } from './avatar';
import type { Worn } from './avatar';

export interface Character {
  root: THREE.Group; body: THREE.Group; head: THREE.Group; torso: THREE.Group;
  legL: THREE.Group; legR: THREE.Group; armL: THREE.Group; armR: THREE.Group;
  kneeL: THREE.Group; kneeR: THREE.Group; elbowL: THREE.Group; elbowR: THREE.Group;
  height: number;       // the chosen height factor (0.93, 1 or 1.07), before CHAR_SCALE
  bw?: number;          // how wide the body is for its build (1 average); the poses keep it
}
export type Pose = 'idle' | 'walk' | 'talk' | 'sit' | 'wash' | 'wave' | 'laugh' | 'dance' | 'shrug' | 'brr' | 'thumbs' | 'clap' | 'phone' | 'stretch';
/** The gestures a player can make on purpose (the emote wheel), with a picture for the button. */
export const EMOTES: { id: Pose; icon: string; label: string }[] = [{ id: 'wave', icon: '👋', label: 'Wave' }, { id: 'laugh', icon: '😂', label: 'Laugh' }, { id: 'dance', icon: '💃', label: 'Dance' }, { id: 'shrug', icon: '🤷', label: 'Shrug' }, { id: 'brr', icon: '🥶', label: 'Brr' }, { id: 'thumbs', icon: '👍', label: 'Thumbs up' }, { id: 'clap', icon: '👏', label: 'Clap' }];

/* one material per colour, shared by everybody */
const materials = new Map<string, THREE.MeshStandardMaterial>();
const mat = (hex: string, rough = 0.8): THREE.MeshStandardMaterial => {
  const key = hex + rough;
  let m = materials.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough }); materials.set(key, m); }
  return m;
};
/** Frees the shared colours (call when the whole 3D world is closed). */
export function disposeCharacterMaterials(): void { materials.forEach(m => m.dispose()); materials.clear(); }

const cache = new Map<string, THREE.BufferGeometry>();
const get = <T extends THREE.BufferGeometry>(key: string, make: () => T): T => { let g = cache.get(key) as T | undefined; if (!g) { g = make(); cache.set(key, g); } return g; };
const box = (w: number, h: number, d: number): THREE.BoxGeometry => get(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const sphere = (r: number, ws = 16, hs = 12, thetaLen = Math.PI): THREE.SphereGeometry => get(`s${r},${ws},${hs},${thetaLen}`, () => new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, thetaLen));
const cyl = (rt: number, rb: number, h: number, seg = 18): THREE.CylinderGeometry => get(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
const torus = (r: number, tube: number): THREE.TorusGeometry => get(`t${r},${tube}`, () => new THREE.TorusGeometry(r, tube, 8, 20));
const capsule = (r: number, len: number): THREE.CapsuleGeometry => get(`k${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 6, 14));

const mesh = (g: THREE.BufferGeometry, hex: string, x = 0, y = 0, z = 0, castShadow = true, sc?: [number, number, number]): THREE.Mesh => {
  const m = new THREE.Mesh(g, mat(hex));
  m.position.set(x, y, z); m.castShadow = castShadow;
  if (sc) m.scale.set(sc[0], sc[1], sc[2]);
  return m;
};
const shade = (hex: string, amt: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number): number => Math.max(0, Math.min(255, v + amt));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => c(v).toString(16).padStart(2, '0')).join('');
};

const HEIGHTS = [0.93, 1, 1.07];
/** People are drawn bigger than life so that they can be seen next to the buildings from the camera's distance. */
export const CHAR_SCALE = 1.7;

/** Builds a person. `rawLook` and `worn` are the same values the 2D portraits use. */
export function buildCharacter(rawLook: unknown, worn: Worn = {}): Character {
  const look = normalizeLook(rawLook);
  const skin = SKINS[look.skin], hair = HAIR_COLORS[look.hairColor], top = ACCENTS[look.accent], pants = BOTTOM_COLORS[look.bottomColor], shoe = SHOE_COLORS[look.shoeColor];
  const root = new THREE.Group(); root.name = 'person';
  const body = new THREE.Group(); root.add(body);
  const torso = new THREE.Group(); torso.position.y = 0.95; body.add(torso);           // turns and breathes; everything above the hips hangs from it
  const T = (m: THREE.Mesh): THREE.Mesh => { m.position.y -= 0.95; torso.add(m); return m; };   // helper: place by world height, add to the torso
  const dress = look.style === 'dress';
  const longSleeve = look.style !== 'casual' && look.style !== 'dress';
  const outerId = worn.outer ?? '', puffer = outerId === 'coat-puffer', longCoat = outerId === 'coat-wool' || outerId === 'coat-dublyonka' || outerId === 'chapan', dublyonka = outerId === 'coat-dublyonka';
  const coatColor = outerId ? (outerId.includes('chapan') ? '#2f6b4a' : puffer ? '#2b4a7a' : outerId === 'coat-wool' ? '#4a4038' : dublyonka ? '#7a5232' : outerId.includes('coat') ? '#3a3f4f' : outerId.includes('jacket') ? '#6b4a2e' : '#7a1f2b') : '';
  const BW = [0.86, 1, 1.12, 1.24][look.build] ?? 1, LW = [0.88, 1, 1.1, 1.22][look.build] ?? 1;
  const tracksuit = look.style === 'tracksuit';
  const sleeve = coatColor || top;

  /* ----- legs: hip -> thigh -> knee -> shin -> ankle -> foot ----- */
  const knees: THREE.Group[] = [];
  const leg = (side: number): THREE.Group => {
    const g = new THREE.Group(); g.position.set(side * 0.095 * BW, 0.92, 0); g.scale.set(LW, 1, LW);
    const bare = dress || look.bottom === 'skirt';
    g.add(mesh(capsule(0.09, 0.26), bare ? skin : pants, 0, -0.215, 0));
    const knee = new THREE.Group(); knee.position.y = -0.43; g.add(knee); knees.push(knee);
    knee.add(mesh(sphere(0.07, 14, 10), bare || look.bottom === 'shorts' ? skin : pants, 0, 0, 0.004));
    knee.add(mesh(capsule(0.063, 0.33), bare || look.bottom === 'shorts' ? skin : pants, 0, -0.19, 0));
    if (look.bottom === 'shorts') g.add(mesh(capsule(0.092, 0.2), pants, 0, -0.17, 0));
    if (tracksuit && !bare && look.bottom !== 'shorts') { g.add(mesh(box(0.014, 0.4, 0.014), '#ffffff', side * 0.085, -0.2, 0.01)); knee.add(mesh(box(0.014, 0.36, 0.014), '#ffffff', side * 0.06, -0.19, 0.01)); }
    // the foot
    if (look.shoes === 'valenki') { knee.add(mesh(cyl(0.074, 0.08, 0.34, 14), shoe === '#ffffff' ? '#8a8f99' : shade(shoe, 10), 0, -0.3, 0)); knee.add(mesh(sphere(0.074), shoe === '#ffffff' ? '#8a8f99' : shade(shoe, 10), 0, -0.45, 0.04, true, [1.05, 0.7, 1.8])); }
    else if (look.shoes === 'slippers') { knee.add(mesh(sphere(0.066), '#c0566b', 0, -0.462, 0.05, true, [1.1, 0.5, 2.0])); knee.add(mesh(box(0.14, 0.018, 0.26), '#f4e7d2', 0, -0.492, 0.05)); }
    else if (look.shoes === 'boots') { knee.add(mesh(cyl(0.068, 0.074, 0.22, 14), shoe, 0, -0.27, 0)); knee.add(mesh(sphere(0.07), shoe, 0, -0.45, 0.045, true, [1.05, 0.7, 2.0])); knee.add(mesh(box(0.15, 0.025, 0.27), '#16203a', 0, -0.495, 0.045)); }
    else if (look.shoes === 'shoes') { knee.add(mesh(sphere(0.07), shoe, 0, -0.44, 0.05, true, [1.0, 0.6, 2.0])); knee.add(mesh(box(0.14, 0.025, 0.26), '#16203a', 0, -0.488, 0.05)); }
    else if (look.shoes === 'sandals') { knee.add(mesh(sphere(0.062), skin, 0, -0.455, 0.05, true, [1.0, 0.45, 2.0])); knee.add(mesh(box(0.14, 0.02, 0.26), shoe, 0, -0.49, 0.05)); knee.add(mesh(box(0.13, 0.02, 0.05), shoe, 0, -0.45, 0.08)); }
    else { knee.add(mesh(sphere(0.07), shoe, 0, -0.445, 0.05, true, [1.05, 0.65, 2.05])); knee.add(mesh(box(0.15, 0.03, 0.27), '#ffffff', 0, -0.49, 0.05)); }
    return g;
  };
  const legL = leg(-1), legR = leg(1);
  body.add(legL, legR);
  const [kneeL, kneeR] = knees;

  /* ----- hips, waist and chest ----- */
  body.add(mesh(sphere(0.15), dress ? top : pants, 0, 0.95, 0, true, [1.15 * BW, 0.78, 0.85 * BW]));
  if (look.bottom === 'skirt' && !dress) body.add(mesh(cyl(0.15, 0.27, 0.4), pants, 0, 0.8, 0));
  if (dress) body.add(mesh(cyl(0.15, 0.3, 0.72), top, 0, 0.84, 0));
  T(mesh(cyl(0.135, 0.125, 0.26, 18), top, 0, 1.12, 0, true, [1.2, 1, 0.8]));
  T(mesh(sphere(0.15), top, 0, 1.37, 0, true, [1.2, 1.15, 0.66]));
  if (look.style === 'smart') { T(mesh(box(0.12, 0.035, 0.04), '#ffffff', 0, 1.52, 0.085)); T(mesh(box(0.04, 0.24, 0.02), shade(top, -50), 0, 1.4, 0.118)); }
  else if (look.style === 'sporty') { T(mesh(box(0.025, 0.34, 0.02), '#ffffff', -0.1, 1.36, 0.104)); T(mesh(box(0.025, 0.34, 0.02), '#ffffff', 0.1, 1.36, 0.104)); }
  else if (look.style === 'sweater') { const r = T(mesh(torus(0.085, 0.032), shade(top, -30), 0, 1.57, 0)); r.rotation.x = Math.PI / 2; }
  else if (look.style === 'folk') { const a = T(mesh(torus(0.155, 0.012), shade(top, 40), 0, 1.47, 0, true, [1, 1, 0.6])); a.rotation.x = Math.PI / 2; const b = T(mesh(torus(0.14, 0.012), shade(top, 40), 0, 1.2, 0, true, [1, 1, 0.72])); b.rotation.x = Math.PI / 2; }
  if (coatColor) {
    T(mesh(sphere(0.2), coatColor, 0, 1.36, 0, true, [1.22, 1.08, 0.88]));
    if (longCoat) body.add(mesh(cyl(0.17 * BW, 0.27 * BW, 0.86), coatColor, 0, 0.78, 0)); else body.add(mesh(cyl(0.17 * BW, 0.25 * BW, 0.62), coatColor, 0, 0.88, 0));
    if (puffer) for (const y of [1.18, 1.32, 1.46]) { const ring = T(mesh(torus(0.2, 0.03), shade(coatColor, -18), 0, y, 0, true, [1.22 * BW, 1, 0.9 * BW])); ring.rotation.x = Math.PI / 2; }
    if (dublyonka) { const fur = T(mesh(torus(0.13, 0.045), '#f1e6cf', 0, 1.56, 0.01)); fur.rotation.x = Math.PI / 2; body.add(mesh(box(0.05, 0.84, 0.02), '#f1e6cf', 0, 0.8, 0.27 * BW)); }
    body.add(mesh(box(0.025, 0.66, 0.02), shade(coatColor, -40), 0, 0.88, 0.245));
    if (worn.outer!.includes('chapan')) for (const x of [-0.12, -0.04, 0.04, 0.12]) body.add(mesh(box(0.02, 0.62, 0.015), '#e0b43c', x, 0.88, 0.235));
  }

  /* ----- arms: shoulder -> upper arm -> elbow -> forearm -> hand ----- */
  const elbows: THREE.Group[] = [];
  const arm = (side: number): THREE.Group => {
    const g = new THREE.Group(); g.position.set(side * 0.235, 1.46 - 0.95, 0);
    g.add(mesh(sphere(0.056), sleeve, 0, 0, 0));
    g.add(mesh(capsule(0.055, 0.2), sleeve, 0, -0.16, 0));
    const elbow = new THREE.Group(); elbow.position.y = -0.31; g.add(elbow); elbows.push(elbow);
    elbow.add(mesh(sphere(0.052, 12, 8), longSleeve || coatColor ? sleeve : skin, 0, 0, 0));
    elbow.add(mesh(capsule(0.047, 0.23), longSleeve || coatColor ? sleeve : skin, 0, -0.14, 0));
    elbow.add(mesh(sphere(0.052), worn.gloves ? '#c0282f' : skin, 0, -0.3, 0.005, true, worn.gloves ? [1.0, 1.25, 0.8] : [0.8, 1.1, 0.65]));
    if (tracksuit && !coatColor) { g.add(mesh(box(0.012, 0.26, 0.012), '#ffffff', side * 0.05, -0.16, 0.02)); elbow.add(mesh(box(0.012, 0.24, 0.012), '#ffffff', side * 0.04, -0.14, 0.02)); }
    return g;
  };
  const armL = arm(-1), armR = arm(1);
  torso.add(armL, armR); torso.scale.set(BW, 1, BW);
  if (worn.bag) { body.add(mesh(box(0.06, 0.2, 0.22), '#3a2a1e', -0.27 * BW, 0.9, 0)); const strap = mesh(box(0.02, 0.62, 0.02), '#3a2a1e', -0.05, 1.22, 0.12); strap.rotation.z = -0.65; body.add(strap); }
  const [elbowL, elbowR] = elbows;
  body.add(mesh(cyl(0.06, 0.068, 0.12, 14), shade(skin, -10), 0, 1.6, 0));

  /* ----- head: skull, jaw, ears, face ----- */
  const head = new THREE.Group(); head.position.set(0, 1.8, 0); head.scale.setScalar(1.18); body.add(head);
  const FACE = [[1, 1, 1, 1], [1.06, 0.96, 1.03, 1.08], [1.05, 1, 1, 1.18], [1, 1.02, 1, 0.86], [0.95, 1.09, 1, 0.96], [0.97, 1.04, 1, 0.9]][look.face] ?? [1, 1, 1, 1];
  head.add(mesh(sphere(0.115, 20, 16), skin, 0, 0, 0, true, [0.95 * FACE[0], 1.15 * FACE[1], 1.05 * FACE[2]]));
  head.add(mesh(sphere(0.08, 16, 12), skin, 0, -0.065, 0.025, true, [1.05 * FACE[3], 0.92 * FACE[1], 1.0]));
  for (const side of [-1, 1]) head.add(mesh(sphere(0.026, 8, 6), shade(skin, -10), side * 0.112, -0.005, 0, true, [0.5, 1.0, 0.8]));
  const NOSE = [[0.85, 1, 1], [0.95, 1.25, 1.1], [1.3, 1.1, 1.1], [0.95, 1.5, 1.2]][look.nose] ?? [0.95, 1.2, 1.1];
  head.add(mesh(sphere(0.02, 8, 6), shade(skin, -14), 0, -0.027, 0.124, false, NOSE as [number, number, number]));
  const EYE = [[0.85, 0], [0.62, 0.22], [1.0, 0], [0.5, 0.05], [0.58, 0], [0.7, 0.32], [0.7, -0.25], [0.48, 0.12]][look.eyes] ?? [0.85, 0];
  const almond = EYE[1] !== 0, iris = EYE_COLORS[look.eyeColor] ?? '#4a2e1c';
  for (const side of [-1, 1]) {
    const w = mesh(sphere(0.024, 10, 8), '#f4f2ee', side * 0.044, 0.016, 0.098, false, [1.15, EYE[0], 0.55]); w.rotation.z = -side * EYE[1]; head.add(w);
    head.add(mesh(sphere(0.0135, 8, 6), iris, side * 0.044, 0.016, 0.106, false, [1, Math.min(1, EYE[0] + 0.15), 0.6]));
    head.add(mesh(sphere(0.0065, 6, 4), '#0b0806', side * 0.044, 0.016, 0.113, false));
    if (look.eyes === 4) head.add(mesh(box(0.05, 0.008, 0.012), shade(skin, -22), side * 0.044, 0.03, 0.104, false));
    if (look.rosy) head.add(mesh(sphere(0.026, 8, 6), '#e8737a', side * 0.07, -0.035, 0.088, false, [1, 0.7, 0.4]));
    if (look.freckles) for (const [fx, fy] of [[0.06, -0.012], [0.075, -0.024], [0.052, -0.03]]) head.add(mesh(sphere(0.0045, 4, 3), shade(skin, -55), side * fx, fy, 0.105, false));
    const BR = [[0.011, 0.05], [0.011, 0], [0.018, 0.02], [0.01, 0.2]][look.brows] ?? [0.011, 0.05];
    const br = mesh(box(0.05, BR[0], 0.014), shade(hair, -10), side * 0.046, 0.052, 0.104, false); br.rotation.z = almond ? -side * 0.16 : side * BR[1]; head.add(br);
  }
  const LIP = [[0.036, 0.006], [0.042, 0.008], [0.044, 0.013], [0.054, 0.009]][look.lips] ?? [0.042, 0.008];
  head.add(mesh(box(LIP[0], LIP[1], 0.012), look.facial >= 3 ? '#f3f3f3' : shade('#a23a3a', look.skin > 5 ? -30 : 0), 0, -0.07, 0.113, false));
  if (look.facial === 1) head.add(mesh(sphere(0.082, 14, 10), shade(skin, -38), 0, -0.07, 0.03, false, [1.06, 0.85, 1.02]));
  else if (look.facial === 2) head.add(mesh(box(0.058, 0.014, 0.02), hair, 0, -0.056, 0.116, false));
  else if (look.facial === 3) head.add(mesh(sphere(0.1, 14, 10), hair, 0, -0.085, 0.03, true, [1.02, 0.7, 0.95]));
  else if (look.facial === 4) { head.add(mesh(sphere(0.03, 10, 8), hair, 0, -0.118, 0.095, true, [1, 1.2, 0.8])); head.add(mesh(box(0.05, 0.012, 0.018), hair, 0, -0.056, 0.116, false)); }

  const scarfOn = worn.hat === 'hat-headscarf';
  const cap = (r: number, theta = 0.5): THREE.Mesh => { const m = mesh(sphere(r, 20, 12, Math.PI * theta), hair, 0, 0.004, 0, true, [1, 1.17, 1.1]); m.rotation.x = -0.4; return m; };
  const nape = (): THREE.Mesh => mesh(sphere(0.112, 16, 12), hair, 0, -0.02, -0.035, true, [0.98, 1.0, 1.0]);
  if (!scarfOn) {
    switch (look.hairStyle) {
      case 0: head.add(cap(0.124), nape()); break;
      case 1: head.add(cap(0.124, 0.52), mesh(sphere(0.12), hair, 0, -0.12, -0.075, true, [1.02, 1.9, 0.55]), mesh(sphere(0.05), hair, -0.105, -0.07, 0.0, true, [0.5, 1.6, 0.7]), mesh(sphere(0.05), hair, 0.105, -0.07, 0.0, true, [0.5, 1.6, 0.7])); break;
      case 2: for (const [x, y, z] of [[-0.085, 0.07, 0], [0.085, 0.07, 0], [0, 0.12, 0], [-0.05, 0.1, -0.07], [0.05, 0.1, -0.07], [0, 0.03, -0.1], [-0.105, -0.01, -0.03], [0.105, -0.01, -0.03]]) head.add(mesh(sphere(0.06, 10, 8), hair, x, y, z)); break;
      case 3: head.add(cap(0.124), nape(), mesh(sphere(0.055, 12, 10), hair, 0, 0.14, -0.04)); break;
      case 4: head.add(cap(0.119), nape()); break;
      case 5: break;
      case 6: head.add(cap(0.124), nape(), mesh(sphere(0.04, 8, 6), hair, 0.08, -0.1, -0.09), mesh(sphere(0.034, 8, 6), hair, 0.095, -0.2, -0.065), mesh(sphere(0.032, 8, 6), hair, 0.1, -0.27, -0.06), mesh(sphere(0.026, 8, 6), '#e0373f', 0.1, -0.33, -0.06)); break;
      case 7: head.add(cap(0.124, 0.52), mesh(sphere(0.12), hair, 0, -0.13, -0.075, true, [1.05, 2.0, 0.55]), mesh(sphere(0.05, 10, 8), hair, -0.11, -0.28, -0.04), mesh(sphere(0.05, 10, 8), hair, 0.11, -0.28, -0.04)); break;
      case 8: head.add(mesh(sphere(0.2, 16, 12), hair, 0, 0.04, -0.03, true, [1, 0.95, 1]), cap(0.126)); break;
      case 9: head.add(mesh(sphere(0.125, 20, 12, Math.PI * 0.32), hair, 0, 0.01, 0.0, true, [0.95, 1.2, 1.1])); break;                                   // undercut: long on top only
      case 10: head.add(cap(0.126, 0.55), mesh(sphere(0.125), hair, 0, -0.06, -0.03, true, [1.1, 0.75, 1.0])); break;                                    // bob
      case 11: head.add(mesh(sphere(0.23, 16, 12), hair, 0, 0.06, -0.03, true, [1.05, 1.0, 1.0])); break;                                                   // afro
      case 12: { head.add(cap(0.126)); for (let k = 0; k < 9; k++) { const a = -1.3 + k * 0.33; head.add(mesh(cyl(0.017, 0.015, 0.26, 6), hair, Math.sin(a) * 0.11, -0.12, -Math.cos(a) * 0.09)); } break; }   // locs
      case 13: head.add(cap(0.124), nape(), mesh(sphere(0.045, 8, 6), hair, 0, -0.1, -0.12), mesh(sphere(0.04, 8, 6), hair, 0, -0.2, -0.13), mesh(sphere(0.036, 8, 6), hair, 0, -0.29, -0.13), mesh(sphere(0.032, 8, 6), hair, 0, -0.37, -0.13), mesh(sphere(0.022, 8, 6), '#3b6fe0', 0, -0.43, -0.13)); break;   // long plait down the back
      case 14: head.add(cap(0.124), nape(), mesh(sphere(0.045, 10, 8), hair, 0, 0.06, -0.13), mesh(cyl(0.035, 0.02, 0.22, 8), hair, 0, -0.07, -0.15)); break;   // ponytail
      case 15: head.add(cap(0.121, 0.48)); break;                                                                                                          // pixie
      case 16: { const c = cap(0.125); c.rotation.z = 0.15; head.add(c, nape()); break; }                                                                  // side part
      case 17: head.add(mesh(box(0.04, 0.09, 0.22), hair, 0, 0.12, -0.01)); break;                                                                      // mohawk
      case 18: head.add(cap(0.124), nape(), mesh(sphere(0.045, 10, 8), hair, -0.09, 0.1, -0.03), mesh(sphere(0.045, 10, 8), hair, 0.09, 0.1, -0.03)); break;   // twin buns
      case 19: { head.add(cap(0.119)); for (let k = -2; k <= 2; k++) head.add(mesh(box(0.012, 0.012, 0.2), shade(hair, 25), k * 0.035, 0.11, -0.02)); break; }   // cornrows
      case 20: head.add(cap(0.128, 0.56), mesh(sphere(0.12), hair, 0, -0.08, -0.06, true, [1.08, 1.2, 0.8])); for (const x of [-0.1, 0.1]) head.add(mesh(sphere(0.04, 8, 6), hair, x, -0.04, 0.05)); break;   // shag
      default: head.add(mesh(sphere(0.124, 20, 12, Math.PI * 0.45), hair, 0, -0.01, 0, true, [1.02, 0.9, 1.08]), nape());                                 // flattened by a hat
    }
  }
  if (worn.hat === 'hat-ushanka') head.add(mesh(cyl(0.128, 0.135, 0.09, 18), '#6b4a2e', 0, 0.115, 0), mesh(box(0.04, 0.11, 0.11), '#8a6a46', -0.135, -0.01, 0), mesh(box(0.04, 0.11, 0.11), '#8a6a46', 0.135, -0.01, 0));
  else if (worn.hat === 'hat-cap') { head.add(mesh(sphere(0.13, 20, 12, Math.PI * 0.5), '#16203a', 0, 0.01, 0, true, [1, 1.05, 1.08])); head.add(mesh(box(0.16, 0.012, 0.1), '#16203a', 0, 0.06, 0.13)); }
  else if (worn.hat === 'hat-beanie') head.add(mesh(sphere(0.133, 20, 12, Math.PI * 0.55), '#e0373f', 0, 0.01, 0, true, [1, 1.12, 1.08]));
  else if (worn.hat === 'hat-doppi') head.add(mesh(cyl(0.09, 0.115, 0.065, 18), '#16203a', 0, 0.13, 0), mesh(cyl(0.117, 0.117, 0.016, 18), '#ffffff', 0, 0.105, 0));
  else if (scarfOn) head.add(mesh(sphere(0.132, 20, 12, Math.PI * 0.6), '#a56be0', 0, 0, -0.005, true, [1, 1.17, 1.1]), mesh(sphere(0.12), '#a56be0', 0, -0.1, -0.07, true, [1.02, 1.5, 0.55]), mesh(box(0.2, 0.025, 0.04), '#8a4fc9', 0, 0.075, 0.11));
  if (worn.sunglasses) { for (const side of [-1, 1]) head.add(mesh(box(0.05, 0.03, 0.01), '#101318', side * 0.046, 0.018, 0.116, false)); head.add(mesh(box(0.03, 0.006, 0.006), '#101318', 0, 0.024, 0.116, false)); }
  else if (worn.glasses) { for (const side of [-1, 1]) head.add(mesh(torus(0.032, 0.005), '#16203a', side * 0.046, 0.016, 0.112, false)); head.add(mesh(box(0.03, 0.006, 0.006), '#16203a', 0, 0.02, 0.114, false)); }
  if (worn.scarf) { body.add(mesh(torus(0.085, 0.035), '#e0373f', 0, 1.58, 0)); body.add(mesh(box(0.05, 0.22, 0.03), '#c0282f', 0.07, 1.46, 0.115)); }

  const height = HEIGHTS[look.height];
  root.scale.setScalar(height * CHAR_SCALE * 0.94);
  return { root, body, head, torso, legL, legR, armL, armR, kneeL, kneeR, elbowL, elbowR, height, bw: BW };
}

/** Puts the person into a pose. `phase` is the walking cycle, `time` is the clock in seconds. */
export function setPose(c: Character, mode: Pose, phase: number, time: number): void {
  const reset = (): void => {
    c.legL.rotation.x = c.legR.rotation.x = 0; c.armL.rotation.set(0, 0, 0); c.armR.rotation.set(0, 0, 0); c.body.position.y = 0; c.head.rotation.set(0, 0, 0);
    c.kneeL.rotation.x = c.kneeR.rotation.x = 0; c.elbowL.rotation.x = c.elbowR.rotation.x = 0; c.torso.rotation.set(0, 0, 0); c.torso.scale.set(c.bw ?? 1, 1, c.bw ?? 1);
  };
  reset();
  if (mode === 'walk') {
    const swing = Math.sin(phase) * 0.7;
    c.legL.rotation.x = swing; c.legR.rotation.x = -swing;
    c.kneeL.rotation.x = Math.max(0, -Math.cos(phase)) * 0.95; c.kneeR.rotation.x = Math.max(0, Math.cos(phase)) * 0.95;      // the knee bends while the leg swings forward
    c.armL.rotation.x = -swing * 0.8; c.armR.rotation.x = swing * 0.8;
    c.elbowL.rotation.x = -0.3 - Math.max(0, swing) * 0.5; c.elbowR.rotation.x = -0.3 - Math.max(0, -swing) * 0.5;
    c.body.position.y = Math.abs(Math.cos(phase)) * 0.045;
    c.torso.rotation.y = swing * 0.1; c.torso.rotation.z = Math.cos(phase) * 0.02;
    c.head.rotation.y = -swing * 0.1 + Math.sin(phase * 0.5) * 0.04;
  } else if (mode === 'wash') {
    c.torso.rotation.x = 0.5; c.head.rotation.x = 0.35;                                                // leaning over the bucket
    c.legL.rotation.x = c.legR.rotation.x = 0.08; c.kneeL.rotation.x = c.kneeR.rotation.x = 0.2;
    c.armL.rotation.x = -1.15 + Math.sin(time * 9) * 0.3; c.armR.rotation.x = -1.15 - Math.sin(time * 9) * 0.3; c.elbowL.rotation.x = c.elbowR.rotation.x = -1.0;
    c.body.position.y = -0.05;
  } else if (mode === 'sit') {
    c.legL.rotation.x = c.legR.rotation.x = -1.5; c.kneeL.rotation.x = c.kneeR.rotation.x = 1.5;        // thighs forward, shins down
    c.body.position.y = -0.42;
    c.armL.rotation.x = c.armR.rotation.x = -0.45; c.elbowL.rotation.x = c.elbowR.rotation.x = -0.7;
    c.torso.scale.y = 1 + Math.sin(time * 1.6) * 0.012; c.head.rotation.y = Math.sin(time * 0.5) * 0.15;
  } else if (mode === 'wave') {
    c.armR.rotation.z = -2.6; c.elbowR.rotation.z = Math.sin(time * 10) * 0.45; c.head.rotation.z = -0.08;
  } else if (mode === 'laugh') {
    c.torso.rotation.x = -0.18 + Math.abs(Math.sin(time * 9)) * 0.12; c.head.rotation.x = -0.25; c.armL.rotation.x = c.armR.rotation.x = -0.4; c.elbowL.rotation.x = c.elbowR.rotation.x = -1.3; c.body.position.y = Math.abs(Math.sin(time * 9)) * 0.03;
  } else if (mode === 'dance') {
    const b = Math.sin(time * 7); c.body.position.y = Math.abs(b) * 0.06; c.torso.rotation.y = b * 0.35; c.armL.rotation.z = 1.2 + b * 0.5; c.armR.rotation.z = -1.2 + b * 0.5; c.elbowL.rotation.x = c.elbowR.rotation.x = -0.9;
    c.legL.rotation.x = Math.max(0, b) * 0.5; c.legR.rotation.x = Math.max(0, -b) * 0.5; c.kneeL.rotation.x = Math.max(0, b) * 0.8; c.kneeR.rotation.x = Math.max(0, -b) * 0.8; c.head.rotation.z = b * 0.12;
  } else if (mode === 'shrug') {
    c.armL.rotation.z = 0.5; c.armR.rotation.z = -0.5; c.elbowL.rotation.x = c.elbowR.rotation.x = -1.4; c.torso.scale.y = 1.03; c.head.rotation.z = 0.15;
  } else if (mode === 'brr') {
    const sh = Math.sin(time * 40) * 0.03; c.armL.rotation.x = c.armR.rotation.x = -0.9; c.armL.rotation.z = -0.55; c.armR.rotation.z = 0.55; c.elbowL.rotation.x = c.elbowR.rotation.x = -1.6;
    c.torso.rotation.z = sh; c.head.rotation.z = -sh; c.head.rotation.x = 0.15; c.torso.scale.set((c.bw ?? 1) * 0.97, 0.97, (c.bw ?? 1) * 0.97);                   // hunched, rubbing the hands
  } else if (mode === 'thumbs') {
    c.armR.rotation.x = -1.3; c.elbowR.rotation.x = -0.6; c.head.rotation.x = -0.05;
  } else if (mode === 'clap') {
    const k = Math.abs(Math.sin(time * 12)); c.armL.rotation.x = c.armR.rotation.x = -1.1; c.armL.rotation.z = -0.35 * k - 0.2; c.armR.rotation.z = 0.35 * k + 0.2; c.elbowL.rotation.x = c.elbowR.rotation.x = -0.7;
  } else if (mode === 'phone') {
    c.armR.rotation.x = -1.0; c.elbowR.rotation.x = -1.3; c.head.rotation.x = 0.35; c.body.position.y = Math.sin(time * 1.6) * 0.008;
  } else if (mode === 'stretch') {
    const k = (Math.sin(time * 1.4) + 1) / 2; c.armL.rotation.z = 2.8 * k; c.armR.rotation.z = -2.8 * k; c.torso.scale.y = 1 + 0.03 * k; c.head.rotation.x = -0.2 * k;
  } else if (mode === 'talk') {
    c.armR.rotation.x = -1.05 + Math.sin(time * 5) * 0.3; c.armR.rotation.z = -0.15; c.elbowR.rotation.x = -1.0 + Math.sin(time * 5.5) * 0.25;
    c.armL.rotation.x = -0.25 + Math.sin(time * 3.2) * 0.1; c.elbowL.rotation.x = -0.4;
    c.torso.rotation.y = Math.sin(time * 1.3) * 0.08;
    c.head.rotation.x = Math.sin(time * 3) * 0.06; c.head.rotation.y = Math.sin(time * 1.3) * 0.12;
  } else {
    c.armL.rotation.z = 0.05 + Math.sin(time * 1.4) * 0.025; c.armR.rotation.z = -0.05 - Math.sin(time * 1.4) * 0.025;
    c.elbowL.rotation.x = c.elbowR.rotation.x = -0.12;
    c.torso.scale.y = 1 + Math.sin(time * 1.6) * 0.012; c.torso.rotation.z = Math.sin(time * 0.5) * 0.012;      // breathing and a slight shift of weight
    c.body.position.y = Math.sin(time * 1.6) * 0.008;
    c.head.rotation.y = Math.sin(time * 0.6) * 0.1;
  }
}
