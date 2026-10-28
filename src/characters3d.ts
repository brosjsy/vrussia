/* People in 3D, in the game's design (round 147: the rigged figure of the "City Life" design): rounded boxes and tapered limbs on a skeleton of groups
   (hips -> abdomen -> chest -> neck -> head; shoulder -> upper arm -> forearm -> wrist with fingers; hip -> thigh -> knee -> shin -> ankle -> foot), a face
   with eyes that blink (white, iris and a glint), brows, a nose, a mouth and ears, and clothes from the same Look and Worn choices as the 2D portraits.
   The skin is the look's own: the fair tones come first and are the default, as befits a game set in Russia; the crowds of a city follow its own mix.
   Passers-by are built in a lighter detail (no fingers, glints or lashes) so that a crowd stays light; the player is built in full.
   Feet stand on y = 0, the face looks along +z. The joints are the ones setPose has always moved, so every pose and gesture stays as it was. */
import * as THREE from 'three';
import { EYE_COLORS, SKINS, HAIR_COLORS, ACCENTS, BOTTOM_COLORS, SHOE_COLORS, normalizeLook } from './avatar';
import type { Worn } from './avatar';
import { rbox, limb, sphere, cylinder, torus, plainBox, kitMat, disposeKit, fabricTex, shade } from './kit3d';
import type { Fabric } from './kit3d';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/** One continuous body for the waist and chest together (the player only; built fresh each time, so it is never cached), instead of two separate
   rounded boxes stacked on top of each other. A profile of (radius, height) points, revolved around the vertical axis and flattened front-to-back
   to the torso's own proportions, so the ribcage tapers smoothly from the waist up to the shoulders instead of showing a seam at the waistline. */
function torsoShape(waistW: number, chestW: number, waistD: number, chestD: number, seg: number): THREE.BufferGeometry {
  const wr = waistW / 2, cr = chestW / 2;
  const pts = [
    new THREE.Vector2(wr * 0.94, -0.02), new THREE.Vector2(wr, 0.04), new THREE.Vector2((wr + cr) / 2 * 1.03, 0.16),
    new THREE.Vector2(cr, 0.3), new THREE.Vector2(cr * 0.84, 0.4), new THREE.Vector2(cr * 0.5, 0.43),
  ];
  const g = new THREE.LatheGeometry(pts, seg);
  g.scale(1, 1, (waistD / waistW + chestD / chestW) / 2);
  g.computeVertexNormals();
  return g;
}

export interface Character {
  root: THREE.Group;
  // setPose only ever sets .rotation / .position / .scale on these, so a skinned mesh's armature bones
  // (THREE.Bone, not THREE.Group) can stand in for them just as well as the procedural rig's groups.
  body: THREE.Object3D; head: THREE.Object3D; torso: THREE.Object3D;
  legL: THREE.Object3D; legR: THREE.Object3D; armL: THREE.Object3D; armR: THREE.Object3D;
  kneeL: THREE.Object3D; kneeR: THREE.Object3D; elbowL: THREE.Object3D; elbowR: THREE.Object3D;
  height: number;       // the chosen height factor (0.93, 1 or 1.07), before CHAR_SCALE
  bw?: number;          // how wide the body is for its build (1 average); the poses keep it
  eyes?: THREE.Group[]; // they blink
}
export type Pose = 'idle' | 'walk' | 'talk' | 'sit' | 'wash' | 'wave' | 'laugh' | 'dance' | 'shrug' | 'brr' | 'thumbs' | 'clap' | 'phone' | 'stretch';
/** The gestures a player can make on purpose (the emote wheel), with a picture for the button. */
export const EMOTES: { id: Pose; icon: string; label: string }[] = [{ id: 'wave', icon: '👋', label: 'Wave' }, { id: 'laugh', icon: '😂', label: 'Laugh' }, { id: 'dance', icon: '💃', label: 'Dance' }, { id: 'shrug', icon: '🤷', label: 'Shrug' }, { id: 'brr', icon: '🥶', label: 'Brr' }, { id: 'thumbs', icon: '👍', label: 'Thumbs up' }, { id: 'clap', icon: '👏', label: 'Clap' }];

/** Frees the shared shapes and colours (call when the whole 3D world is closed). */
export function disposeCharacterMaterials(): void { disposeKit(); }

const HEIGHTS = [0.93, 1, 1.07];
/** People are drawn bigger than life so that they can be seen next to the buildings from the camera's distance. */
export const CHAR_SCALE = 1.7;
/** Detail: the player in full; passers-by lighter (no fingers, glints or lashes) so a crowd stays light. */
export type Detail = 'full' | 'lite';

/* our 22 hair styles in the design's way of building hair */
type Hair = 'low' | 'long' | 'curls' | 'bun' | 'buzz' | 'bald' | 'braid' | 'wavy' | 'coily' | 'undercut' | 'bob' | 'afro' | 'locs' | 'plait' | 'ponytail' | 'pixie' | 'sidepart' | 'mohawk' | 'buns' | 'cornrows' | 'shag' | 'hat';
const HAIR: Hair[] = ['low', 'long', 'curls', 'bun', 'buzz', 'bald', 'braid', 'wavy', 'coily', 'undercut', 'bob', 'afro', 'locs', 'plait', 'ponytail', 'pixie', 'sidepart', 'mohawk', 'buns', 'cornrows', 'shag', 'hat'];

/** Builds a person. `rawLook` and `worn` are the same values the 2D portraits use. */
export function buildCharacter(rawLook: unknown, worn: Worn = {}, detail: Detail = 'lite'): Character {
  const look = normalizeLook(rawLook), full = detail === 'full';
  const skinHex = SKINS[look.skin], hairHex = HAIR_COLORS[look.hairColor], topHex = ACCENTS[look.accent], botHex = BOTTOM_COLORS[look.bottomColor], shoeHex = SHOE_COLORS[look.shoeColor];
  const F = look.style === 'dress' || look.bottom === 'skirt', dress = look.style === 'dress', shorts = look.bottom === 'shorts';
  const outerId = worn.outer ?? '', puffer = outerId === 'coat-puffer', longCoat = outerId === 'coat-wool' || outerId === 'coat-dublyonka' || outerId === 'chapan', dublyonka = outerId === 'coat-dublyonka';
  const coatHex = outerId ? (outerId.includes('chapan') ? '#2f6b4a' : puffer ? '#2b4a7a' : outerId === 'coat-wool' ? '#4a4038' : dublyonka ? '#7a5232' : outerId.includes('coat') ? '#3a3f4f' : outerId.includes('jacket') ? '#6b4a2e' : '#7a1f2b') : '';
  const longSleeve = !!coatHex || ['smart', 'sporty', 'sweater', 'tracksuit', 'folk'].includes(look.style);
  const BW = [0.86, 1, 1.12, 1.24][look.build] ?? 1;
  const fabric: Fabric = look.style === 'folk' ? 'Khokhloma' : 'Plain';
  const tex = fabric === 'Plain' ? null : fabricTex(fabric, topHex);

  const skin = kitMat(skinHex, { r: 0.52 }), skinDark = kitMat(shade(skinHex, -0.08), { r: 0.52 }), hairM = kitMat(hairHex, { r: 0.85 }), browM = kitMat(shade(hairHex, -0.05), { r: 0.85 });
  const topM = tex ? kitMat('#ffffff', { map: tex, r: 0.85 }) : kitMat(topHex, { r: 0.85 }), botM = kitMat(botHex, { r: 0.85 });
  const sleeveM = coatHex ? kitMat(coatHex, { r: 0.8 }) : topM, white = kitMat('#f3f3f3', { r: 0.5 }), black = kitMat('#141414', { r: 0.6 });
  const eyeW = kitMat('#fbfbf8', { r: 0.3 }), iris = kitMat(EYE_COLORS[look.eyeColor] ?? '#4a2e1c', { r: 0.2 });
  const P = { shoulderW: F ? 0.165 : 0.2, hipW: F ? 0.105 : 0.095, chestW: F ? 0.34 : 0.4, waistW: F ? 0.26 : 0.32 };
  const mk = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  // A crowd of passers-by stays cheap (boxy, low-poly); the player (and anyone built in full detail) gets a rounder, smoother body
  // and limbs, closer to an actual human silhouette than the stylised block figure the lighter detail keeps.
  const BSEG = full ? 6 : 3;                 // rounding segments on the torso, hips and head
  const LSEG = full ? 22 : 12;                // segments on arms and legs
  const JS = full ? 22 : 14, JH = full ? 16 : 10;   // sphere segments at joints, the head and the eyes

  const root = new THREE.Group(); root.name = 'person';
  const body = new THREE.Group(); root.add(body);                                   // setPose moves it up and down (sitting, bobbing)
  const hips = new THREE.Group(); hips.position.y = 0.945; body.add(hips);
  mk(hips, rbox(F ? 0.36 : 0.34, 0.17, 0.21, 0.045, BSEG), dress ? topM : botM, 0, -0.02, 0);
  if (!F && look.style === 'smart') { mk(hips, rbox(0.345, 0.035, 0.215, 0.015), kitMat('#2a211b', { r: 0.5 }), 0, 0.06, 0); if (full) mk(hips, plainBox(0.045, 0.03, 0.01), kitMat('#d4af37', { r: 0.3, m: 0.8 }), 0, 0.06, 0.11); }
  if (look.bottom === 'skirt' && !dress) mk(hips, cylinder(0.18, 0.27, 0.38, 18), botM, 0, -0.2, 0);
  if (dress) mk(hips, cylinder(0.17, 0.32, 0.62, 18), topM, 0, -0.25, 0);

  const torso = new THREE.Group(); torso.name = 'Abdomen'; torso.position.y = 0.07; hips.add(torso);        // setPose bends and turns it
  const chest = new THREE.Group(); chest.position.y = 0.16; torso.add(chest);
  if (full) mk(torso, torsoShape(P.waistW, P.chestW, 0.19, 0.22, JS), topM);
  else { mk(torso, rbox(P.waistW, 0.2, 0.19, 0.035, BSEG), topM, 0, 0.08, 0); mk(chest, rbox(P.chestW, 0.3, 0.22, 0.045, BSEG), topM, 0, 0.12, 0); }
  if (F) for (const s of [-1, 1]) mk(chest, sphere(0.072, 16, 12), topM, s * 0.068, 0.12, 0.085).scale.set(1, 0.85, 0.7);
  if (look.style === 'smart') {
    for (const s of [-1, 1]) { const w = mk(chest, plainBox(0.07, 0.05, 0.012), kitMat('#ffffff', { r: 0.6 }), s * 0.04, 0.265, 0.1); w.rotation.z = s * 0.6; w.rotation.x = -0.3; }
    if (!F) { const tm = kitMat(shade(topHex, -0.35), { r: 0.5 }); const tie = mk(chest, cylinder(0.02, 0.033, 0.2, 4), tm, 0, 0.15, 0.115); tie.rotation.y = Math.PI / 4; tie.scale.z = 0.35; }
  } else if (look.style === 'sporty' || look.style === 'tracksuit') {
    const hood = mk(chest, torus(0.1, 0.045, 10, 20, Math.PI * 1.2), topM, 0, 0.29, -0.04); hood.rotation.set(-1.2, 0, Math.PI + 0.94);
    for (const s of [-1, 1]) mk(chest, cylinder(0.005, 0.005, 0.13, 6), white, s * 0.035, 0.19, 0.115);
  } else if (look.style === 'sweater') { const r = mk(chest, torus(0.07, 0.022, 8, 20), kitMat(shade(topHex, -0.12)), 0, 0.27, 0); r.rotation.x = Math.PI / 2; }
  else { const ring = mk(chest, torus(0.06, 0.01, 8, 20), kitMat(shade(topHex, -0.12)), 0, 0.27, 0); ring.rotation.x = Math.PI / 2; }
  if (look.style === 'folk') mk(chest, torus(0.07, 0.006, 6, 24, Math.PI), kitMat('#d4af37', { r: 0.3, m: 0.8 }), 0, 0.24, 0.11).rotation.z = Math.PI;
  // a coat or jacket over everything, with its own details
  if (coatHex) {
    const cm = kitMat(coatHex, { r: 0.8 });
    mk(chest, rbox(P.chestW + 0.05, 0.32, 0.26, 0.09), cm, 0, 0.12, 0); mk(torso, rbox(P.waistW + 0.06, 0.22, 0.23, 0.08), cm, 0, 0.08, 0);
    mk(hips, cylinder(0.2 * BW, (longCoat ? 0.27 : 0.23) * BW, longCoat ? 0.78 : 0.34, 16), cm, 0, longCoat ? -0.3 : -0.1, 0);
    mk(chest, plainBox(0.02, 0.3, 0.02), kitMat(shade(coatHex, -0.15)), 0, 0.12, 0.13);
    if (puffer) for (const y of [0.04, 0.14, 0.24]) { const ring = mk(chest, torus(0.21, 0.025, 6, 20), kitMat(shade(coatHex, -0.08)), 0, y, 0); ring.rotation.x = Math.PI / 2; ring.scale.set(1.05 * BW, 0.62, 1); }
    if (dublyonka) { const fur = mk(chest, torus(0.11, 0.04, 8, 20), kitMat('#f1e6cf', { r: 1 }), 0, 0.28, 0.01); fur.rotation.x = Math.PI / 2; mk(hips, plainBox(0.05, 0.7, 0.02), kitMat('#f1e6cf', { r: 1 }), 0, -0.25, 0.26 * BW); }
    if (outerId.includes('chapan')) for (const x of [-0.12, -0.04, 0.04, 0.12]) mk(hips, plainBox(0.02, 0.62, 0.015), kitMat('#e0b43c'), x, -0.22, 0.255);
  }
  if (worn.scarf) { const sc = mk(chest, torus(0.085, 0.035, 8, 20), kitMat('#e0373f'), 0, 0.29, 0); sc.rotation.x = Math.PI / 2; mk(chest, plainBox(0.05, 0.2, 0.03), kitMat('#c0282f'), 0.07, 0.17, 0.125); }
  if (worn.bag) { mk(hips, plainBox(0.06, 0.2, 0.22), kitMat('#3a2a1e'), -0.24 * BW, -0.02, 0); const strap = mk(chest, plainBox(0.02, 0.6, 0.02), kitMat('#3a2a1e'), -0.04, 0.1, 0.12); strap.rotation.z = -0.65; }

  /* neck and head */
  const neck = new THREE.Group(); neck.position.y = 0.28; chest.add(neck); mk(neck, limb(0.09, 0.045, 0.05, LSEG), skin, 0, 0.09, 0);
  const head = new THREE.Group(); head.position.y = 0.085; neck.add(head);
  const FACE = [[1, 1, 1], [1.05, 0.97, 1.08], [1.04, 1, 1.15], [1, 1.02, 0.88], [0.96, 1.07, 0.96], [0.98, 1.04, 0.92]][look.face] ?? [1, 1, 1];
  mk(head, rbox(0.2 * FACE[0], 0.25 * FACE[1], 0.22, full ? 0.105 : 0.085, BSEG), skin, 0, 0.125, 0); mk(head, rbox((F ? 0.15 : 0.165) * FACE[2], 0.07, 0.16, full ? 0.058 : 0.04, BSEG), skin, 0, 0.03, 0.025);
  if (full) { mk(head, sphere(0.085, JS, JH), skin, 0, 0.02, 0.02).scale.set(1.08, 0.78, 1.0); mk(head, sphere(0.072, JS, JH), skin, 0, 0.165, -0.02).scale.set(1.05, 0.95, 0.95); }   // a rounder jaw and crown blended under the box, so the head reads as an ellipsoid, not a brick
  // the ears are left out of a crowd: too small to see there
  for (const s of [-1, 1]) { if (full) mk(head, sphere(0.03, JS, JH), skin, s * 0.103, 0.12, 0).scale.set(0.45, 1, 0.75); if (F && full) mk(head, torus(0.012, 0.003, 6, 14), kitMat('#d4af37', { r: 0.3, m: 0.8 }), s * 0.108, 0.075, 0.005).rotation.y = Math.PI / 2; }
  const EYE = [[0.85, 0], [0.62, 0.22], [1.0, 0], [0.5, 0.05], [0.58, 0], [0.7, 0.32], [0.7, -0.25], [0.48, 0.12]][look.eyes] ?? [0.85, 0];
  const eyes: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(s * 0.045, 0.14, 0.105); eg.rotation.z = -s * EYE[1]; head.add(eg);
    mk(eg, sphere(0.022, JS, JH), eyeW).scale.set(1, 0.85 * Math.min(1.15, EYE[0] + 0.25), 0.5);
    mk(eg, sphere(0.0125, full ? 18 : 14, full ? 14 : 10), iris, 0, 0, 0.008).scale.set(1, 1, 0.6);
    if (full) mk(eg, sphere(0.004, 8, 6), white, 0.005, 0.005, 0.016);
    if (F && full) for (let k = -1; k <= 1; k++) { const l = mk(eg, plainBox(0.004, 0.012, 0.002), black, k * 0.01 + s * 0.012, 0.02, 0.01); l.rotation.z = -s * (0.4 + k * 0.2); }
    eyes.push(eg);
    const BR = [[0.012, 0.12], [0.012, 0], [0.018, 0.06], [0.01, 0.25]][look.brows] ?? [0.012, 0.12];
    mk(head, rbox(0.05, BR[0], 0.014, 0.005), browM, s * 0.047, 0.178, 0.106).rotation.z = s * -BR[1];
    if (look.freckles) for (const [fx, fy] of [[0.055, 0.105], [0.07, 0.1], [0.05, 0.095]]) mk(head, sphere(0.004, 4, 3), kitMat(shade(skinHex, -0.25)), s * fx, fy, 0.112);
    if (look.rosy) mk(head, sphere(0.024, 8, 6), kitMat('#e8737a', { r: 0.7 }), s * 0.065, 0.09, 0.1).scale.set(1, 0.7, 0.35);
  }
  const NOSE = [[0.85, 1], [0.95, 1.2], [1.25, 1.05], [0.95, 1.45]][look.nose] ?? [0.95, 1.2];
  mk(head, rbox(0.04 * NOSE[0], 0.05 * NOSE[1], 0.04, full ? 0.018 : 0.016, BSEG), skinDark, 0, 0.105, 0.118);
  if (full) for (const s of [-1, 1]) mk(head, sphere(0.009, JS, JH), skinDark, s * 0.014, 0.085, 0.124);
  // fuller lips get their own small upper and lower ridge instead of a bare outline, so a mouth reads as flesh, not a wire
  const LIP = [0.6, 0.85, 1.15, 1.3][look.lips] ?? 0.85, lipHex = shade(skinHex, -0.14), lipM = kitMat(lipHex, { r: 0.45 });
  if (full && LIP > 0.7) {
    mk(head, rbox(0.03 * LIP, 0.013, 0.012, 0.006, BSEG), lipM, 0, 0.068, 0.115);
    mk(head, rbox(0.027 * LIP, 0.016, 0.013, 0.007, BSEG), lipM, 0, 0.052, 0.116);
  } else { const mouth = mk(head, torus(0.024 * LIP, 0.0055, 6, 16, Math.PI), kitMat('#5a2420', { r: 0.4 }), 0, 0.062, 0.113); mouth.rotation.z = Math.PI; }
  if (F) mk(head, rbox(0.05, 0.012, 0.012, 0.005), kitMat(shade(skinHex, -0.18), { r: 0.5 }), 0, 0.054, 0.112);
  // beards and moustaches
  const facial = look.beard && !look.facial ? 3 : look.facial;
  if (facial === 1) mk(head, rbox(0.17, 0.08, 0.16, 0.05), kitMat(shade(skinHex, -0.2), { r: 1 }), 0, 0.03, 0.03);
  else if (facial === 2) mk(head, rbox(0.06, 0.014, 0.02, 0.006), hairM, 0, 0.078, 0.118);
  else if (facial === 3) mk(head, rbox(0.18, 0.11, 0.17, 0.06), hairM, 0, 0.02, 0.035);
  else if (facial === 4) { mk(head, rbox(0.05, 0.05, 0.04, 0.015), hairM, 0, 0.0, 0.1); mk(head, rbox(0.05, 0.012, 0.018, 0.005), hairM, 0, 0.078, 0.118); }

  /* hair and hats */
  const hair = new THREE.Group(); hair.position.y = 0.125; head.add(hair);
  const cap = (sc: number, yo: number): THREE.Mesh => { const m = mk(hair, rbox(0.2, 0.25, 0.22, 0.085, 4), hairM, 0, yo, -0.008); m.scale.set(sc, 0.82, sc); return m; };
  const headscarf = worn.hat === 'hat-headscarf', hatOn = !!worn.hat;
  const style = hatOn ? 'hat' : HAIR[look.hairStyle] ?? 'low';
  if (!headscarf) switch (style) {
    case 'low': cap(1.03, 0.03); break;
    case 'pixie': cap(1.0, 0.025); mk(hair, rbox(0.17, 0.04, 0.05, 0.02), hairM, 0.02, 0.085, 0.1).rotation.z = -0.25; break;
    case 'buzz': cap(1.01, 0.02); break;
    case 'bald': break;
    case 'undercut': mk(hair, rbox(0.19, 0.07, 0.21, 0.03), hairM, 0, 0.12, 0); cap(0.99, 0.0); break;
    case 'sidepart': cap(1.04, 0.04); mk(hair, rbox(0.12, 0.05, 0.2, 0.025), hairM, -0.05, 0.12, 0.005).rotation.z = 0.3; break;
    case 'coily': mk(hair, sphere(0.16, 16, 12), hairM, 0, 0.07, -0.02).scale.set(1, 0.85, 0.95); break;
    case 'mohawk': cap(1.0, 0.0); mk(hair, rbox(0.04, 0.09, 0.22, 0.015), hairM, 0, 0.16, -0.01); break;
    case 'curls': case 'shag': { if (style === 'shag') mk(hair, rbox(0.19, 0.05, 0.06, 0.02), hairM, 0, 0.07, 0.1); cap(1.03, 0.03); const n = full ? 40 : 14; for (let i = 0; i < n; i++) { const a = (i * 2.4) % (Math.PI * 2), b = (i * 0.37) % 1.1; mk(hair, sphere(0.03 + (i % 3) * 0.004, 6, 5), hairM, Math.cos(a) * Math.sin(b) * 0.115, 0.05 + Math.cos(b) * 0.11, Math.sin(a) * Math.sin(b) * 0.115 - 0.01); } break; }
    case 'afro': mk(hair, sphere(0.19, 16, 12), hairM, 0, 0.08, -0.03).scale.set(1, 0.9, 0.95); break;
    case 'locs': { cap(1.06, 0.035); const n = full ? 20 : 10; for (let i = 0; i < n; i++) { const a = Math.PI * 0.15 + i / (n - 1) * Math.PI * 1.7 + Math.PI / 2, len = 0.24 + (i % 4) * 0.025; const l = mk(hair, cylinder(0.013, 0.011, len, 6), hairM, Math.cos(a) * 0.105, 0.04 - len / 2, Math.sin(a) * 0.1 - 0.015); l.rotation.z = Math.cos(a) * 0.12; } break; }
    case 'cornrows': { cap(1.04, 0.03); const n = full ? 6 : 3; for (let r = 0; r < n; r++) { const row = mk(hair, torus(0.112, 0.01, 6, 20, Math.PI), hairM, -0.05 + r * (0.1 / n), 0.02, -0.01); row.rotation.y = Math.PI / 2; row.rotation.x = 0.2; } break; }
    case 'long': case 'wavy': cap(1.05, 0.035); mk(hair, rbox(0.22, 0.34, 0.08, 0.04), hairM, 0, -0.1, -0.09); for (const s of [-1, 1]) mk(hair, rbox(0.04, 0.22, 0.1, 0.02), hairM, s * 0.1, -0.06, -0.01);
      if (style === 'wavy') for (const y of [-0.06, -0.16, -0.25]) mk(hair, sphere(0.045, 8, 6), hairM, (y * 3) % 0.08, y, -0.12); break;
    case 'bob': cap(1.07, 0.03); mk(hair, rbox(0.23, 0.17, 0.2, 0.06), hairM, 0, -0.04, -0.03); break;
    case 'bun': cap(1.04, 0.03); mk(hair, sphere(0.06, 14, 10), hairM, 0, 0.12, -0.1); break;
    case 'buns': cap(1.04, 0.03); for (const s of [-1, 1]) mk(hair, sphere(0.05, 12, 8), hairM, s * 0.09, 0.13, -0.03); break;
    case 'ponytail': cap(1.04, 0.03); mk(hair, sphere(0.045, 10, 8), hairM, 0, 0.06, -0.12); mk(hair, cylinder(0.035, 0.02, 0.24, 8), hairM, 0, -0.07, -0.14); break;
    case 'braid': case 'plait': { cap(1.04, 0.03); const n = full ? 8 : 5, side = style === 'braid' ? 0.07 : 0; for (let k = 0; k < n; k++) mk(hair, sphere(0.04 - k * 0.002, 8, 6), hairM, side, -0.05 - k * 0.06, -0.12 - k * 0.004); mk(hair, sphere(0.022, 8, 6), kitMat(style === 'braid' ? '#e0373f' : '#3b6fe0'), side, -0.06 - n * 0.06, -0.12); break; }
    case 'hat': cap(1.02, 0.0); break;
  }
  if (worn.hat === 'hat-ushanka') { mk(hair, cylinder(0.135, 0.14, 0.11, 18), kitMat('#6b4a2e', { r: 1 }), 0, 0.11, 0); for (const s of [-1, 1]) mk(hair, rbox(0.04, 0.12, 0.11, 0.02), kitMat('#8a6a46', { r: 1 }), s * 0.125, -0.01, 0); mk(hair, rbox(0.24, 0.05, 0.04, 0.02), kitMat('#8a6a46', { r: 1 }), 0, 0.07, 0.125); }
  else if (worn.hat === 'hat-cap') { mk(hair, sphere(0.13, 20, 12, Math.PI * 2, Math.PI / 2), kitMat('#16203a'), 0, 0.03, 0).scale.set(1, 0.85, 1.1); mk(hair, rbox(0.16, 0.012, 0.1, 0.005), kitMat('#16203a'), 0, 0.04, 0.13); }
  else if (worn.hat === 'hat-beanie') mk(hair, sphere(0.135, 20, 12, Math.PI * 2, Math.PI * 0.55), kitMat('#e0373f', { r: 1 }), 0, 0.01, 0).scale.set(1, 1.05, 1.1);
  else if (worn.hat === 'hat-doppi') { mk(hair, cylinder(0.09, 0.115, 0.065, 18), kitMat('#16203a'), 0, 0.13, 0); mk(hair, cylinder(0.117, 0.117, 0.016, 18), kitMat('#ffffff'), 0, 0.105, 0); }
  else if (headscarf) { const sm = kitMat('#a56be0', { r: 0.9 }); mk(hair, sphere(0.14, 20, 12, Math.PI * 2, Math.PI * 0.62), sm, 0, 0.0, -0.005).scale.set(1, 1.05, 1.1); mk(hair, sphere(0.12, 14, 10), sm, 0, -0.1, -0.07).scale.set(1, 1.4, 0.55); mk(hair, rbox(0.2, 0.025, 0.04, 0.01), kitMat('#8a4fc9'), 0, 0.075, 0.115); }
  if (worn.sunglasses) { for (const s of [-1, 1]) mk(head, rbox(0.05, 0.03, 0.01, 0.006), kitMat('#101318', { r: 0.2 }), s * 0.046, 0.14, 0.12); mk(head, plainBox(0.03, 0.006, 0.006), kitMat('#101318'), 0, 0.148, 0.12); }
  else if (worn.glasses) { for (const s of [-1, 1]) mk(head, torus(0.03, 0.005, 6, 16), kitMat('#16203a'), s * 0.046, 0.14, 0.118); mk(head, plainBox(0.03, 0.006, 0.006), kitMat('#16203a'), 0, 0.146, 0.12); }

  /* arms */
  const arm = (s: number): { up: THREE.Group; lo: THREE.Group } => {
    const sh = new THREE.Group(); sh.position.set(s * P.shoulderW, 0.23, 0); chest.add(sh); mk(sh, sphere(0.058, JS, JH), sleeveM).scale.set(1, 0.9, 1);
    const up = new THREE.Group(); sh.add(up); mk(up, limb(0.15, 0.05, 0.046, LSEG), sleeveM); mk(up, limb(0.13, 0.04, 0.036, LSEG), longSleeve ? sleeveM : skin, 0, -0.14, 0);
    const lo = new THREE.Group(); lo.position.y = -0.27; up.add(lo); mk(lo, sphere(0.037, JS, JH), longSleeve ? sleeveM : skin); mk(lo, limb(0.25, 0.036, 0.03, LSEG), longSleeve ? sleeveM : skin);
    const wr = new THREE.Group(); wr.position.y = -0.26; lo.add(wr);
    const hand = worn.gloves ? kitMat('#c0282f', { r: 0.9 }) : skin;
    if (full) { mk(wr, rbox(0.06, 0.075, 0.03, 0.012), hand, 0, -0.04, 0); for (let f = 0; f < 4; f++) { const fg = mk(wr, rbox(0.012, 0.045, 0.014, 0.005), hand, -0.021 + f * 0.014, -0.095, 0.002); fg.scale.y = [0.85, 1, 0.95, 0.8][f]; fg.rotation.x = 0.25; } mk(wr, rbox(0.014, 0.038, 0.014, 0.005), hand, s * -0.035, -0.045, 0.012).rotation.z = s * 0.6; }
    else mk(wr, rbox(0.06, 0.11, 0.035, 0.016), hand, 0, -0.05, 0);
    return { up, lo };
  };
  // our left/right as setPose has always used them: the "L" side is at -x, the "R" side at +x
  const aL = arm(-1), aR = arm(1);

  /* legs */
  const leg = (s: number): { ul: THREE.Group; ll: THREE.Group } => {
    const bare = dress || look.bottom === 'skirt';
    const ul = new THREE.Group(); ul.position.set(s * P.hipW, -0.06, 0); hips.add(ul); mk(ul, limb(0.24, F ? 0.075 : 0.07, 0.058, LSEG), bare ? skin : botM); mk(ul, limb(0.22, 0.058, 0.052, LSEG), bare || shorts ? skin : botM, 0, -0.22, 0); if (shorts) mk(ul, limb(0.05, 0.068, 0.066, LSEG), botM, 0, -0.2, 0);
    const ll = new THREE.Group(); ll.position.y = -0.44; ul.add(ll); mk(ll, sphere(0.053, JS, JH), bare || shorts ? skin : botM); mk(ll, limb(0.42, 0.052, 0.04, LSEG), bare || shorts ? skin : botM);
    if (look.style === 'tracksuit' && !bare && !shorts) mk(ll, plainBox(0.012, 0.36, 0.012), white, s * 0.045, -0.19, 0.01);
    const ft = new THREE.Group(); ft.position.y = -0.43; ll.add(ft);
    const sm = kitMat(shoeHex, { r: 0.6 });
    switch (look.shoes) {
      case 'valenki': { const v = kitMat(shoeHex === '#ffffff' ? '#8a8f99' : shade(shoeHex, 0.04), { r: 1 }); mk(ll, cylinder(0.06, 0.065, 0.3, 12), v, 0, -0.3, 0); mk(ft, rbox(0.1, 0.08, 0.24, 0.035), v, 0, 0, 0.045); break; }
      case 'slippers': mk(ft, rbox(0.1, 0.05, 0.24, 0.025), kitMat('#c0566b', { r: 1 }), 0, -0.01, 0.045); mk(ft, rbox(0.104, 0.018, 0.245, 0.008), kitMat('#f4e7d2'), 0, -0.035, 0.045); break;
      case 'boots': mk(ll, cylinder(0.055, 0.06, 0.2, 12), sm, 0, -0.33, 0); mk(ft, rbox(0.1, 0.1, 0.24, 0.035), sm, 0, 0, 0.045); mk(ft, rbox(0.104, 0.022, 0.245, 0.01), black, 0, -0.035, 0.045); break;
      case 'shoes': mk(ft, rbox(0.1, 0.07, 0.24, 0.035), kitMat(shoeHex, { r: 0.3 }), 0, 0, 0.045); mk(ft, rbox(0.104, 0.02, 0.245, 0.01), black, 0, -0.035, 0.045); break;
      case 'sandals': mk(ft, rbox(0.085, 0.035, 0.2, 0.016), skin, 0, 0, 0.04); mk(ft, rbox(0.1, 0.025, 0.25, 0.012), sm, 0, -0.035, 0.04); mk(ft, rbox(0.105, 0.02, 0.06, 0.01), sm, 0, -0.005, 0.07); break;
      default: mk(ft, rbox(0.1, 0.075, 0.24, 0.035), sm, 0, 0, 0.045); mk(ft, rbox(0.104, 0.022, 0.245, 0.01), kitMat('#ffffff'), 0, -0.035, 0.045); if (full) for (let k = 0; k < 3; k++) mk(ft, plainBox(0.05, 0.006, 0.008), kitMat('#2f7de1'), 0, 0.03, 0.08 + k * 0.025);
    }
    return { ul, ll };
  };
  const lL = leg(-1), lR = leg(1);

  torso.scale.set(BW, 1, BW);
  const height = HEIGHTS[look.height];
  root.scale.setScalar(height * CHAR_SCALE * 1.03);
  return { root, body, head, torso, legL: lL.ul, legR: lR.ul, armL: aL.up, armR: aR.up, kneeL: lL.ll, kneeR: lR.ll, elbowL: aL.lo, elbowR: aR.lo, height, bw: BW, eyes };
}

/** Puts the person into a pose. `phase` is the walking cycle, `time` is the clock in seconds. The eyes blink now and then (the design's touch). */
export function setPose(c: Character, mode: Pose, phase: number, time: number): void {
  const reset = (): void => {
    c.legL.rotation.x = c.legR.rotation.x = 0; c.armL.rotation.set(0, 0, 0); c.armR.rotation.set(0, 0, 0); c.body.position.y = 0; c.head.rotation.set(0, 0, 0);
    c.kneeL.rotation.x = c.kneeR.rotation.x = 0; c.elbowL.rotation.set(0, 0, 0); c.elbowR.rotation.set(0, 0, 0); c.torso.rotation.set(0, 0, 0); c.torso.scale.set(c.bw ?? 1, 1, c.bw ?? 1);
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
    c.armR.rotation.z = 2.5; c.elbowR.rotation.z = 0.5 - Math.sin(time * 9) * 0.45; c.head.rotation.z = -0.08;               // the design's wave: the arm up and out, the hand waving
  } else if (mode === 'laugh') {
    c.torso.rotation.x = -0.18 + Math.abs(Math.sin(time * 9)) * 0.12; c.head.rotation.x = -0.25; c.armL.rotation.x = c.armR.rotation.x = -0.4; c.elbowL.rotation.x = c.elbowR.rotation.x = -1.3; c.body.position.y = Math.abs(Math.sin(time * 9)) * 0.03;
  } else if (mode === 'dance') {
    const p = time * 7, b = Math.sin(p); c.body.position.y = Math.abs(b) * 0.04; c.torso.rotation.y = Math.sin(p / 2) * 0.3; c.torso.rotation.z = -b * 0.12;          // the design's dance
    c.armL.rotation.z = -1.2 - b * 0.6; c.armR.rotation.z = 1.2 - b * 0.6; c.elbowL.rotation.z = -1; c.elbowR.rotation.z = 1;
    c.legL.rotation.x = -Math.max(0, b) * 0.3; c.legR.rotation.x = -Math.max(0, -b) * 0.3; c.kneeL.rotation.x = Math.max(0, b) * 0.5; c.kneeR.rotation.x = Math.max(0, -b) * 0.5; c.head.rotation.z = b * 0.12;
  } else if (mode === 'shrug') {
    c.armL.rotation.z = -0.5; c.armR.rotation.z = 0.5; c.elbowL.rotation.x = c.elbowR.rotation.x = -1.4; c.torso.scale.y = 1.03; c.head.rotation.z = 0.15;
  } else if (mode === 'brr') {
    const sh = Math.sin(time * 40) * 0.03; c.armL.rotation.x = c.armR.rotation.x = -0.9; c.armL.rotation.z = 0.55; c.armR.rotation.z = -0.55; c.elbowL.rotation.x = c.elbowR.rotation.x = -1.6;
    c.torso.rotation.z = sh; c.head.rotation.z = -sh; c.head.rotation.x = 0.15; c.torso.scale.set((c.bw ?? 1) * 0.97, 0.97, (c.bw ?? 1) * 0.97);                   // hunched, rubbing the hands
  } else if (mode === 'thumbs') {
    c.armR.rotation.x = -1.3; c.elbowR.rotation.x = -0.6; c.head.rotation.x = -0.05;
  } else if (mode === 'clap') {
    const k = Math.abs(Math.sin(time * 12)); c.armL.rotation.x = c.armR.rotation.x = -1.1; c.armL.rotation.z = 0.35 * k + 0.2; c.armR.rotation.z = -0.35 * k - 0.2; c.elbowL.rotation.x = c.elbowR.rotation.x = -0.7;
  } else if (mode === 'phone') {
    c.armR.rotation.x = -1.0; c.elbowR.rotation.x = -1.3; c.head.rotation.x = 0.35; c.body.position.y = Math.sin(time * 1.6) * 0.008;
  } else if (mode === 'stretch') {
    const k = (Math.sin(time * 1.4) + 1) / 2; c.armL.rotation.z = -2.8 * k; c.armR.rotation.z = 2.8 * k; c.torso.scale.y = 1 + 0.03 * k; c.head.rotation.x = -0.2 * k;
  } else if (mode === 'talk') {
    c.armR.rotation.x = -1.05 + Math.sin(time * 5) * 0.3; c.armR.rotation.z = 0.15; c.elbowR.rotation.x = -1.0 + Math.sin(time * 5.5) * 0.25;
    c.armL.rotation.x = -0.25 + Math.sin(time * 3.2) * 0.1; c.elbowL.rotation.x = -0.4;
    c.torso.rotation.y = Math.sin(time * 1.3) * 0.08;
    c.head.rotation.x = Math.sin(time * 3) * 0.06; c.head.rotation.y = Math.sin(time * 1.3) * 0.12;
  } else {
    c.armL.rotation.z = -0.08 - Math.sin(time * 1.4) * 0.02; c.armR.rotation.z = 0.08 + Math.sin(time * 1.4) * 0.02;              // the design's idle: arms a little out, breathing
    c.elbowL.rotation.x = c.elbowR.rotation.x = -0.12;
    c.torso.scale.y = 1 + Math.sin(time * 2.2) * 0.012; c.torso.rotation.z = Math.sin(time * 0.8) * 0.015;
    c.body.position.y = Math.sin(time * 1.6) * 0.008;
    c.head.rotation.y = Math.sin(time * 0.6) * 0.15;
  }
  // blinking: a short closing of the lids every few seconds (each person at their own moment)
  if (c.eyes) { const off = (c.root.id % 7) * 0.53, t = (time + off) % 3.4, lid = t < 0.14 ? Math.max(0.08, Math.abs(t / 0.07 - 1)) : 1; for (const e of c.eyes) e.scale.y = lid; }
}

/* ---------- a real rigged mesh for the player (round 2026), instead of the procedural kit above ---------- */

/** A stand-in for a bone that keeps setPose's convention -- rotation.set(...)/.rotation.x = ... is "the pose",
   starting from nothing (rotation 0,0,0 is the rest/standing pose) -- true by construction for the procedural
   rig (every joint's local axes are simply its parent's, so "no rotation" already means "hanging straight"),
   but not for a modelled skeleton: Blender gave each bone whatever rest orientation its own shape needed, which
   is usually not the identity. The handle remembers that rest orientation and composes it with whatever setPose
   writes to the handle's own .rotation, so the bone ends up at rest-plus-pose instead of the pose alone (which
   would twist it off in whatever direction its rest orientation happened to be, not the one setPose intended). */
function poseHandle(bone: THREE.Bone): THREE.Object3D {
  const rest = bone.quaternion.clone();
  const q = new THREE.Quaternion();
  const handle = new THREE.Object3D();
  // torso's breathing/shrug scale pokes the real bone directly (no rest offset applies to scale); Object3D
  // defines `scale` as a non-writable own property, so it is replaced with one that reads through to the
  // bone's own Vector3 -- setPose only ever calls .scale.set(...) / .scale.y = ... on it, never reassigns
  // the property itself, so a getter handing back that same Vector3 instance is all mutation needs.
  Object.defineProperty(handle, 'scale', { get: () => bone.scale, configurable: true });
  handle.rotation._onChange(() => { bone.quaternion.copy(rest).multiply(q.setFromEuler(handle.rotation)); });
  return handle;
}

let riggedAsset: Promise<THREE.Group> | null = null;
function loadRiggedAsset(): Promise<THREE.Group> {
  if (!riggedAsset) riggedAsset = new Promise((resolve, reject) => new GLTFLoader().load('/models/player.glb', gltf => resolve(gltf.scene), undefined, reject));
  return riggedAsset;
}

/** A player built from a real rigged mesh: one continuous skinned human body, not stacked primitives. See
   tools/build_rigged_human.py, which modelled and exported it (a Blender "skin" skeleton, auto-rigged and
   skinned, with its bones renamed to the joints setPose already knows how to move: torso, head, armL/R,
   elbowL/R, legL/R, kneeL/R). Loaded once and cloned per call with SkeletonUtils (a plain .clone() does not
   copy a skinned mesh's binding to its own skeleton correctly, so two characters would fight over one set
   of bones). Resolves to null if the asset cannot be fetched or does not have the bones expected (offline
   on the very first visit, or a build where the model failed to ship), so a caller can keep the procedural
   character as a fallback instead of showing nothing. Only the skin tone is coloured from the Look yet:
   this mesh has no clothing of its own, so it is not a full replacement for buildCharacter until it does. */
export async function buildRiggedCharacter(rawLook: unknown): Promise<Character | null> {
  let scene: THREE.Group;
  try { scene = await loadRiggedAsset(); } catch { return null; }
  const clone = cloneSkinned(scene) as THREE.Group;
  const bones: Record<string, THREE.Object3D> = {};
  clone.traverse(o => { if ((o as THREE.Bone).isBone) bones[o.name] = o; });
  const need = ['torso', 'head', 'armL', 'armR', 'elbowL', 'elbowR', 'legL', 'legR', 'kneeL', 'kneeR'];
  if (need.some(n => !bones[n])) return null;

  const look = normalizeLook(rawLook);
  clone.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const cloned = Array.isArray(mesh.material) ? mesh.material.map(m => m.clone()) : mesh.material.clone();
    mesh.material = cloned;
    const first = (Array.isArray(cloned) ? cloned[0] : cloned) as THREE.MeshStandardMaterial;
    if (first.color) first.color.set(SKINS[look.skin]);
  });

  const root = new THREE.Group(); root.name = 'person';
  const body = new THREE.Group(); root.add(body); body.add(clone);
  const height = HEIGHTS[look.height];
  root.scale.setScalar(height);          // the mesh is already built in real metres, so CHAR_SCALE does not apply here
  const handle = (n: string): THREE.Object3D => poseHandle(bones[n] as THREE.Bone);
  return {
    root, body, head: handle('head'), torso: handle('torso'),
    legL: handle('legL'), legR: handle('legR'), armL: handle('armL'), armR: handle('armR'),
    kneeL: handle('kneeL'), kneeR: handle('kneeR'), elbowL: handle('elbowL'), elbowR: handle('elbowR'),
    height, bw: 1,
  };
}
