/* The setting of the 3D city: the water with its name, a bridge and the far bank, ordinary houses and towers, parks, a pitch, the notice boards
   and the decorations that make each kind of place look like itself (a cross on the hospital, rails at the station, a runway at the airport...).
   What is where comes from city-geo.ts; this file only turns it into shapes. */
import * as THREE from 'three';
import type { State } from './engine';
import { waterFor, waterRects, bridgeFor, fillerFor, parksFor, billboardSpots, FIELD_HALF, WATER_WIDTH } from './city-geo';
import { sprite, drawBoard } from './sprites3d';
import { boardsFor, megaScreen } from './billboards';

type Track = <T extends { dispose: () => void }>(o: T) => T;
const hashOf = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };
const rng = (seed: number): (() => number) => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return (s >>> 8) / 16777216; }; };

const WATER_COLOR = { river: '#4f95d6', lake: '#5aa5df', sea: '#3a7fc6' };

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { RealBuilding } from './osm';

/** The colour of a roof for a wall colour: darker, and redder on small houses. */
export const roofOf = (wallHex: string, kind: string): string => '#' + new THREE.Color(wallHex).multiplyScalar(0.62).lerp(new THREE.Color('#8a4a3a'), kind === 'house' ? 0.45 : 0.1).getHexString();

/** A building drawn from its outline (points on the ground: x, z), `h` metres tall, with vertex colours for walls and roof and a mark on the walls for the window painter. */
export function extrudeOutline(pts: [number, number][], h: number, wallHex: string, roofHex: string): THREE.BufferGeometry {
  const shape = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], -p[1])));
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
  const n = g.getAttribute('normal'), pos = g.getAttribute('position'), col = new Float32Array(pos.count * 3), wallf = new Float32Array(pos.count);
  const wall = new THREE.Color(wallHex), roof = new THREE.Color(roofHex);
  for (let i = 0; i < pos.count; i++) { const top = n.getY(i) > 0.5; wallf[i] = top || n.getY(i) < -0.5 ? 0 : 1; const k = top ? roof : wall; col[i * 3] = k.r; col[i * 3 + 1] = k.g; col[i * 3 + 2] = k.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('wallf', new THREE.BufferAttribute(wallf, 1)); g.deleteAttribute('uv');
  return g;
}

/** Rows of windows are painted on the walls by the graphics card from the position in the world, so no pictures are needed. The geometry needs the "wallf" mark (see extrudeOutline). */
export function paintWindows(m: THREE.MeshStandardMaterial): void {
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute float wallf; varying float vWall; varying vec3 vWPos;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vWall = wallf; vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vWall; varying vec3 vWPos;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ float fy = fract(vWPos.y / 3.0), fh = fract((vWPos.x + vWPos.z) / 2.6); float win = step(0.28, fy) * step(fy, 0.72) * step(0.18, fh) * step(fh, 0.7) * step(2.2, vWPos.y); diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.3, 0.42, 0.58), win * vWall); }`);
  };
}

export interface Scenery { setReal: (list: RealBuilding[] | null) => void; real: () => number; boards: THREE.Mesh[]; updateBoards: (s: State, date: string) => void; mega: THREE.Mesh | null; attachMega: (centre: THREE.Group, roofY: number) => void; decorate: (g: THREE.Group, placeId: string, h: number) => void }

export function buildScenery(scene: THREE.Scene, track: Track, city: string): Scenery {
  const lit = (hex: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial => track(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9, ...extra }));
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, cast = true): THREE.Mesh => { const mesh = new THREE.Mesh(track(g), m); mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true; scene.add(mesh); return mesh; };

  /* ----- water, shore, far bank, name, bridge ----- */
  const w = waterFor(city), width = WATER_WIDTH[w.kind];
  const waterMat = lit(WATER_COLOR[w.kind], { roughness: 0.25, metalness: 0.1 });
  const sand = lit('#e6d8a8'), grass = lit('#7fbf6a'), wall = lit('#cfc7b8');
  const rects = waterRects(city);
  for (const r of rects) {
    const water = add(new THREE.PlaneGeometry(r.w, r.d), waterMat, r.x, 0.03, r.z, false); water.rotation.x = -Math.PI / 2;
    const ns = r.w > r.d;                                   // a strip along the north or south edge
    const inner = ns ? { x: r.x, z: r.z + Math.sign(-r.z) * (r.d / 2 - 2) } : { x: r.x + Math.sign(-r.x) * (r.w / 2 - 2), z: r.z };
    const shore = add(new THREE.PlaneGeometry(ns ? r.w : 4, ns ? 4 : r.d), sand, inner.x, 0.05, inner.z, false); shore.rotation.x = -Math.PI / 2;
    const out = ns ? { x: r.x, z: r.z + Math.sign(r.z) * (r.d / 2 + 11) } : { x: r.x + Math.sign(r.x) * (r.w / 2 + 11), z: r.z };
    const bank = add(new THREE.PlaneGeometry(ns ? r.w : 22, ns ? 22 : r.d), grass, out.x, 0.02, out.z, false); bank.rotation.x = -Math.PI / 2;
    // low buildings on the far bank
    const rr = rng(hashOf('bank|' + city + r.x + r.z));
    for (let i = 0; i < 14; i++) {
      const along = (rr() - 0.5) * (ns ? r.w : r.d) * 0.9, bh = 6 + rr() * 16, bw = 6 + rr() * 6;
      const px = ns ? r.x + along : out.x + (rr() - 0.5) * 6, pz = ns ? out.z + (rr() - 0.5) * 6 : r.z + along;
      add(new THREE.BoxGeometry(bw, bh, bw), lit(['#c9c2b4', '#b8c4cf', '#d5c3b3', '#aebdb0'][Math.floor(rr() * 4)]), px, bh / 2, pz);
    }
  }
  // the name of the water, large, floating on it
  const label = sprite(w.name.toUpperCase(), '#ffffff00', '#ffffffcc', 6);
  const r0 = rects[0]; label.position.set(r0.x, 3.2, r0.z); label.scale.multiplyScalar(2.2); scene.add(label);
  const br = bridgeFor(city), vertical = br.side === 'n' || br.side === 's';
  add(new THREE.BoxGeometry(br.w, 0.6, br.d), lit('#9aa3ad'), br.x, 0.95, br.z);
  const rail = lit('#6b7480');
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(vertical ? 0.3 : br.w, 0.9, vertical ? br.d : 0.3), rail, br.x + (vertical ? s * (br.w / 2 - 0.15) : 0), 1.7, br.z + (vertical ? 0 : s * (br.d / 2 - 0.15)));
  for (let i = 0; i <= 4; i++) { const t = (i / 4 - 0.5) * (vertical ? br.d : br.w) * 0.8; add(new THREE.CylinderGeometry(0.8, 1, 1.6, 8), lit('#7d8793'), br.x + (vertical ? 0 : t), 0.4, br.z + (vertical ? t : 0)); }

  /* ----- ordinary houses, towers and shops (one batch of boxes per kind) ----- */
  const filler = fillerFor(city);
  const boxes = new THREE.InstancedMesh(track(new THREE.BoxGeometry(1, 1, 1)), track(new THREE.MeshStandardMaterial({ roughness: 0.9 })), filler.length);
  const roofs = new THREE.InstancedMesh(track(new THREE.ConeGeometry(0.78, 1, 4)), track(new THREE.MeshStandardMaterial({ color: '#b4553a', roughness: 0.9 })), filler.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), roofQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
  let nRoofs = 0;
  filler.forEach((f, i) => {
    m.compose(new THREE.Vector3(f.x, f.h / 2, f.z), q, new THREE.Vector3(f.w, f.h, f.d)); boxes.setMatrixAt(i, m); boxes.setColorAt(i, new THREE.Color(f.color));
    if (f.kind === 'house') { m.compose(new THREE.Vector3(f.x, f.h + 1.1, f.z), roofQ, new THREE.Vector3(f.w * 1.15, 2.4, f.d * 1.15)); roofs.setMatrixAt(nRoofs++, m); }
  });
  roofs.count = nRoofs; boxes.castShadow = roofs.castShadow = true; boxes.receiveShadow = true; scene.add(boxes, roofs);

  /* ----- real houses from the map (when the player has chosen them): they replace the invented ones ----- */
  let realMesh: THREE.Mesh | null = null, realCount = 0;
  const dropReal = (): void => { realCount = 0; if (!realMesh) return; scene.remove(realMesh); realMesh.geometry.dispose(); (realMesh.material as THREE.Material).dispose(); realMesh = null; };
  const setReal = (list: RealBuilding[] | null): void => {
    dropReal();
    boxes.visible = roofs.visible = !list || !list.length;
    if (!list || !list.length) return;
    const parts = list.map(b => extrudeOutline(b.pts, b.h, b.color, roofOf(b.color, b.kind)));
    const merged = mergeGeometries(parts, false); parts.forEach(p => p.dispose());
    if (!merged) { boxes.visible = roofs.visible = true; return; }
    const rm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }); paintWindows(rm);
    realMesh = new THREE.Mesh(merged, rm); realMesh.castShadow = true; realMesh.receiveShadow = true; realMesh.name = 'real-buildings'; scene.add(realMesh); realCount = list.length;
  };

  /* ----- parks and the pitch ----- */
  const trunkGeo = track(new THREE.CylinderGeometry(0.3, 0.4, 1.8, 6)), crownGeo = track(new THREE.ConeGeometry(1.9, 4.4, 7));
  const trunkMat = lit('#7a5a3a'), crownMat = lit('#3c8f4a', { flatShading: true }), path = lit('#d9cfb8');
  for (const p of parksFor(city)) {
    const lawn = add(new THREE.PlaneGeometry(p.w, p.d), lit(p.pitch ? '#4fa85a' : '#6fbf62'), p.x, 0.08, p.z, false); lawn.rotation.x = -Math.PI / 2;
    if (p.pitch) {
      const line = lit('#ffffff');
      add(new THREE.BoxGeometry(p.w - 3, 0.04, 0.25), line, p.x, 0.12, p.z - (p.d - 3) / 2, false); add(new THREE.BoxGeometry(p.w - 3, 0.04, 0.25), line, p.x, 0.12, p.z + (p.d - 3) / 2, false);
      add(new THREE.BoxGeometry(0.25, 0.04, p.d - 3), line, p.x - (p.w - 3) / 2, 0.12, p.z, false); add(new THREE.BoxGeometry(0.25, 0.04, p.d - 3), line, p.x + (p.w - 3) / 2, 0.12, p.z, false);
      add(new THREE.BoxGeometry(0.25, 0.04, p.d - 3), line, p.x, 0.12, p.z, false);
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.4, 2.2, 3.2), lit('#f2f2f2'), p.x + s * (p.w / 2 - 1), 1.1, p.z, true);
    } else {
      add(new THREE.BoxGeometry(p.w * 0.9, 0.04, 1.6), path, p.x, 0.12, p.z, false);
      const r = rng(hashOf('trees|' + city + p.x));
      for (let i = 0; i < 9; i++) { const tx = p.x + (r() - 0.5) * (p.w - 3), tz = p.z + (r() - 0.5) * (p.d - 3); if (Math.abs(tz - p.z) < 1.8) continue; add(trunkGeo, trunkMat, tx, 0.9, tz); add(crownGeo, crownMat, tx, 3.7, tz); }
      add(new THREE.BoxGeometry(2.4, 0.5, 0.8), lit('#8a5a34'), p.x + 3, 0.5, p.z + 2.2); add(new THREE.BoxGeometry(2.4, 0.5, 0.8), lit('#8a5a34'), p.x - 3, 0.5, p.z + 2.2);
    }
  }

  /* ----- notice boards: not advertisements, but things worth knowing ----- */
  const boards: THREE.Mesh[] = []; const faces: { canvas: HTMLCanvasElement | null; tex: THREE.CanvasTexture | null }[] = [];
  billboardSpots().forEach(spot => {
    const g = new THREE.Group(); g.position.set(spot.x, 0, spot.z); g.rotation.y = spot.ry; scene.add(g);
    for (const x of [-2.6, 2.6]) { const post = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.2, 4, 6)), lit('#4a4f58')); post.position.set(x, 2, 0); post.castShadow = true; g.add(post); }
    const frame = new THREE.Mesh(track(new THREE.BoxGeometry(7.4, 3.7, 0.3)), lit('#222733')); frame.position.set(0, 5.2, 0); frame.castShadow = true; g.add(frame);
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
    const ok = drawBoard(canvas, 'NOTICE', '...', '#2f6fd6');
    const tex = ok ? new THREE.CanvasTexture(canvas) : null; if (tex) { tex.colorSpace = THREE.SRGBColorSpace; track(tex); }
    const face = new THREE.Mesh(track(new THREE.PlaneGeometry(7, 3.3)), track(new THREE.MeshBasicMaterial({ color: tex ? '#ffffff' : '#2f6fd6', map: tex ?? undefined })));
    face.position.set(0, 5.2, 0.17); g.add(face); boards.push(face); faces.push({ canvas: ok ? canvas : null, tex });
    const back = face.clone(); back.rotation.y = Math.PI; back.position.z = -0.17; g.add(back);
  });
  let lastKey = '';
  const updateBoards = (s: State, date: string): void => {
    const key = `${s.day}|${s.slot}|${s.city}|${s.tmp.fines}|${s.docs.reg}`;
    if (key === lastKey) return; lastKey = key;
    boardsFor(s, boards.length).forEach((b, i) => { const f = faces[i]; if (f.canvas) { drawBoard(f.canvas, b.title, b.text, b.color); if (f.tex) f.tex.needsUpdate = true; } });
    if (mega?.userData.canvas) { const c = mega.userData.canvas as HTMLCanvasElement; drawBoard(c, 'CITY', megaScreen(s, date), '#e0373f'); (mega.userData.tex as THREE.CanvasTexture).needsUpdate = true; }
  };

  /* ----- the screen on the roof of the city centre ----- */
  let mega: THREE.Mesh | null = null;
  const attachMega = (centre: THREE.Group, roofY: number): void => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 192;
    const ok = drawBoard(canvas, 'CITY', '...', '#e0373f');
    const tex = ok ? new THREE.CanvasTexture(canvas) : null; if (tex) { tex.colorSpace = THREE.SRGBColorSpace; track(tex); }
    const m2 = new THREE.Mesh(track(new THREE.PlaneGeometry(9, 3.4)), track(new THREE.MeshBasicMaterial({ color: tex ? '#ffffff' : '#e0373f', map: tex ?? undefined })));
    m2.position.set(0, roofY + 2.6, 5.4); m2.userData.canvas = ok ? canvas : null; m2.userData.tex = tex; centre.add(m2);
    const frame = new THREE.Mesh(track(new THREE.BoxGeometry(9.4, 3.8, 0.3)), lit('#222733')); frame.position.set(0, roofY + 2.6, 5.25); centre.add(frame);
    mega = m2;
  };

  /* ----- what makes each kind of place look like itself ----- */
  const decorate = (g: THREE.Group, id: string, h: number): void => {
    const put = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, cast = true): THREE.Mesh => { const mesh = new THREE.Mesh(track(geo), mat); mesh.position.set(x, y, z); mesh.castShadow = cast; g.add(mesh); return mesh; };
    switch (id) {
      case 'hospital': { const red = lit('#e0373f'); put(new THREE.BoxGeometry(4, 1, 0.4), red, 0, h + 3.4, 5.3); put(new THREE.BoxGeometry(1, 4, 0.4), red, 0, h + 3.4, 5.3); break; }
      case 'clinic': { const green = lit('#2bb5c9'); put(new THREE.BoxGeometry(3, 0.8, 0.4), green, 0, h + 2.2, 5.3); put(new THREE.BoxGeometry(0.8, 3, 0.4), green, 0, h + 2.2, 5.3); break; }
      case 'station': { const rail = lit('#555b66'); for (const z of [-3, 3]) put(new THREE.BoxGeometry(60, 0.2, 0.3), rail, 0, 0.2, 14 + z, false); put(new THREE.BoxGeometry(30, 0.5, 4), lit('#bfb8a8'), 0, 0.3, 9.5, false); break; }
      case 'airport': { put(new THREE.BoxGeometry(70, 0.1, 9), lit('#3a3f4a'), 0, 0.14, 16, false); for (let i = -3; i <= 3; i++) put(new THREE.BoxGeometry(4, 0.12, 0.5), lit('#ffffff'), i * 9, 0.16, 16, false); break; }
      case 'market': { const cols = ['#e0373f', '#f0b43c', '#3ec27a', '#3b6fe0']; cols.forEach((c, i) => { put(new THREE.BoxGeometry(3.4, 0.25, 2.6), lit(c), -7 + i * 4.6, 2.6, 8.6); put(new THREE.BoxGeometry(3, 1.6, 1.6), lit('#b59a7a'), -7 + i * 4.6, 0.8, 8.8); }); break; }
      case 'dealer': { const cols = ['#e0373f', '#3b6fe0', '#f0b43c']; cols.forEach((c, i) => { put(new THREE.BoxGeometry(2.2, 0.9, 4.4), lit(c), -4.5 + i * 4.5, 0.6, 8.8); put(new THREE.BoxGeometry(1.8, 0.7, 2.2), lit('#9fc4e8'), -4.5 + i * 4.5, 1.3, 8.6); }); break; }
      case 'center': { put(new THREE.CylinderGeometry(3, 3.4, 0.8, 18), wall, 8, 0.4, 10); put(new THREE.CylinderGeometry(2.4, 2.4, 0.9, 18), waterMat, 8, 0.7, 10, false); put(new THREE.CylinderGeometry(0.3, 0.3, 3, 8), wall, 8, 2, 10); break; }
      case 'uni': { for (let i = -2; i <= 2; i++) put(new THREE.CylinderGeometry(0.4, 0.4, h * 0.85, 8), lit('#f2efe8'), i * 1.9, h * 0.42, 5.5); break; }
      case 'shelter': { for (let i = 0; i < 3; i++) put(new THREE.BoxGeometry(1.6, 1.2, 1.6), lit('#a8814f'), -3 + i * 3, 0.6, 8.2); break; }
      case 'bank': { put(new THREE.BoxGeometry(2.2, 2.6, 0.5), lit('#2bb5c9'), 5.6, 1.5, 3, true); break; }
      default: break;
    }
  };

  return { setReal, real: () => realCount, boards, updateBoards, get mega() { return mega; }, attachMega, decorate };
}

export { FIELD_HALF };
