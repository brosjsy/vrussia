/* The shapes of the famous sights (round 151): each sight of landmarks.ts is drawn from simple parts — walls with swallowtail merlons, square towers with
   green tent roofs and a star, onion domes, minarets, a Stalinist stepped tower, a glass tower, cable-stayed and arch bridges, a statue with a sword, a rocket...
   They stand beyond the playing field (or across the water), at a smaller scale than real life, like a model of the city; clicking one tells what it is.
   Everything is tagged with `userData.landmark` for the click, and every geometry and material goes through `track` so it is freed with the world. */
import * as THREE from 'three';
import type { Landmark } from './landmarks';

type Track = <T extends { dispose: () => void }>(o: T) => T;

/** How tall a sight is drawn: real heights are squeezed so that a 462 m tower and a 14 m monument both fit the model city. */
export const drawnHeight = (realH: number): number => Math.min(58, Math.max(7, 6 + realH * 0.3));

export function buildLandmark(l: Landmark, track: Track): THREE.Group {
  const g = new THREE.Group(); g.name = 'landmark'; g.userData.landmark = l.id;
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (c: string, glow = false): THREE.MeshStandardMaterial => { const k = c + glow; let m = mats.get(k); if (!m) { m = track(new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: c === '#e0c050' ? 0.5 : 0.05, emissive: glow ? new THREE.Color(c) : undefined, emissiveIntensity: glow ? 0.4 : 0 })); mats.set(k, m); } return m; };
  const put = (geo: THREE.BufferGeometry, c: string, x: number, y: number, z: number, ry = 0, glow = false): THREE.Mesh => { const m = new THREE.Mesh(track(geo), mat(c, glow)); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; m.userData.landmark = l.id; g.add(m); return m; };
  const box = (w: number, h: number, d: number, c: string, x: number, y: number, z: number, ry = 0): THREE.Mesh => put(new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z, ry);
  const cyl = (r: number, h: number, c: string, x: number, y: number, z: number, seg = 16, rTop = r): THREE.Mesh => put(new THREE.CylinderGeometry(rTop, r, h, seg), c, x, y + h / 2, z);
  const cone = (r: number, h: number, c: string, x: number, y: number, z: number, seg = 8): THREE.Mesh => put(new THREE.ConeGeometry(r, h, seg), c, x, y + h / 2, z);
  /** An onion dome of radius r sitting at height y, with a thin cross or spike. */
  const onion = (r: number, c: string, x: number, y: number, z: number, top = '#e0c050'): void => {
    const pts = [[0, 0], [r * 0.75, 0.1 * r], [r, 0.6 * r], [r * 0.85, 1.15 * r], [r * 0.4, 1.6 * r], [r * 0.08, 2.0 * r], [0, 2.25 * r]].map(([a, b]) => new THREE.Vector2(a, b));
    put(new THREE.LatheGeometry(pts, 16), c, x, y, z); box(0.08 * r + 0.06, 0.9 * r, 0.08 * r + 0.06, top, x, y + 2.2 * r, z); box(0.5 * r, 0.06 * r + 0.05, 0.08 * r + 0.05, top, x, y + 2.75 * r, z);
  };
  /** A helmet dome (a half sphere on a drum). */
  const helmet = (r: number, c: string, x: number, y: number, z: number): void => { put(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), c, x, y, z); box(0.12, r * 0.7, 0.12, '#e0c050', x, y + r, z); };
  /** A wall with swallowtail merlons along x, centred on (x, z). */
  const wall = (len: number, h: number, c: string, x: number, z: number, ry = 0): void => {
    const w = new THREE.Group(); w.position.set(x, 0, z); w.rotation.y = ry; g.add(w);
    const m1 = new THREE.Mesh(track(new THREE.BoxGeometry(len, h, 1.4)), mat(c)); m1.position.y = h / 2; m1.castShadow = true; m1.userData.landmark = l.id; w.add(m1);
    const n = Math.max(3, Math.floor(len / 1.4)), mg = track(new THREE.BoxGeometry(0.7, 0.9, 1.2)), cut = track(new THREE.BoxGeometry(0.22, 0.4, 1.25));
    for (let i = 0; i < n; i++) { const mx = -len / 2 + (i + 0.5) * (len / n); const a = new THREE.Mesh(mg, mat(c)); a.position.set(mx, h + 0.45, 0); a.userData.landmark = l.id; w.add(a); const b = new THREE.Mesh(cut, mat('#00000000' === c ? c : shade(c, -40))); b.position.set(mx, h + 0.72, 0); b.userData.landmark = l.id; w.add(b); }
  };
  const tower = (s: number, h: number, wallC: string, roofC: string, x: number, z: number, top: 'star' | 'cross' | 'crescent' | 'none' = 'none', tiers = 2): number => {
    box(s, h * 0.55, s, wallC, x, 0, z); let y = h * 0.55, w = s;
    for (let i = 0; i < tiers; i++) { w *= 0.78; const th = h * 0.12; box(w, th, w, i % 2 ? shade(wallC, 20) : wallC, x, y, z); y += th; }
    cone(w * 0.62, h * 0.3, roofC, x, y, z, 8); y += h * 0.3;
    if (top === 'star') { const st = put(new THREE.OctahedronGeometry(0.9 + s * 0.05), '#c0102a', x, y + 0.9, z, 0, true); st.scale.set(1, 1.2, 0.35); }
    else if (top === 'cross') { box(0.12, 1.2, 0.12, '#e0c050', x, y, z); box(0.7, 0.12, 0.12, '#e0c050', x, y + 0.8, z); }
    else if (top === 'crescent') { const t = put(new THREE.TorusGeometry(0.6, 0.12, 6, 12, Math.PI * 1.3), '#e0c050', x, y + 0.8, z); t.rotation.z = Math.PI * 0.85; }
    return y;
  };
  const D = drawnHeight(l.h), [c1, c2, c3] = l.c, n = l.n ?? 0;

  switch (l.kind) {
    case 'kremlin': {                                           // a stretch of wall between towers, the main tower in the middle (and a cathedral behind it in Pskov)
      const len = 34, wh = Math.max(5, D * 0.22);
      wall(len, wh, c1, 0, 0); tower(4.5, D, c1, c2, -len / 2, 0, 'none', 1); tower(4.5, D * 0.7, c1, c2, len / 2, 0, 'none', 1);
      tower(6, D, c1, c2, 0, 0.5, l.style === 'star' ? 'star' : 'none', 3);
      if (l.style === 'star') { put(new THREE.CylinderGeometry(1.4, 1.4, 0.2, 20), '#f4f1ea', 0, D * 0.62, 3.6).rotation.x = Math.PI / 2; }      // the clock
      if (l.style === 'cathedral') { box(8, 10, 8, '#f2efe6', 0, 0, -10); onion(2.2, c3, 0, 10, -10); for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) onion(1.1, '#8a96a0', dx, 10, -10 + dz); }
      break;
    }
    case 'basil': {                                             // the central tent among eight chapels with patterned onion domes
      box(16, 4, 16, c2, 0, 0, 0); cyl(3, 10, c1, 0, 4, 0, 8); cone(2.6, 9, c1, 0, 14, 0, 8); onion(0.9, '#e0c050', 0, 23, 0);
      const cols = ['#3f8f5a', '#c0392b', '#e0c050', '#2f6fd6', '#e07a3a', '#5aa5df', '#9a2a2e', '#3f7a52'];
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r = i % 2 ? 6.4 : 5.2, x = Math.cos(a) * r, z = Math.sin(a) * r, hh = i % 2 ? 7 : 9; cyl(1.5, hh, c1, x, 4, z, 8); onion(i % 2 ? 1.6 : 1.9, cols[i], x, 4 + hh, z); }
      break;
    }
    case 'church': {                                            // a white body, a drum, one or five domes, and a bell tower in front where it has one
      const s = Math.max(8, D * 0.36); box(s, D * 0.42, s, c1, 0, 0, 0); box(s * 0.5, D * 0.42, s * 1.25, c1, 0, 0, 0);
      cyl(s * 0.2, D * 0.18, c1, 0, D * 0.42, 0, 12); onion(s * 0.18, c2, 0, D * 0.6, 0);
      if (n >= 5) for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { cyl(s * 0.1, D * 0.1, c1, dx * s * 0.3, D * 0.42, dz * s * 0.3, 10); onion(s * 0.1, c2, dx * s * 0.3, D * 0.52, dz * s * 0.3); }
      if (l.style === 'bell') { tower(s * 0.4, D * 0.95, c1, c3, 0, s * 1.0, 'cross', 3); }
      break;
    }
    case 'spire': {                                             // a long hall with a tall bell tower and a gilded needle (Peter and Paul) or a port building with a spire
      const hall = l.style === 'port' ? 10 : 22; box(hall, 8, 9, c1, 0, 0, 0); box(hall * 0.9, 1, 9.4, shade(c1, -25), 0, 8, 0);
      box(5, 16, 5, c1, -hall / 2 + 3, 0, 0); box(3.6, 5, 3.6, c1, -hall / 2 + 3, 16, 0); cone(1.8, D - 20, c2, -hall / 2 + 3, 21, 0, 4);
      if (l.style !== 'port') { box(0.25, 1.8, 0.25, c2, -hall / 2 + 3, D + 1, 0); } else { for (let i = -1; i <= 1; i++) box(1, 6, 1, '#f4f1ea', i * 3.5, 0, 4.8); }
      break;
    }
    case 'highrise': {
      if (l.style === 'stalin') {                               // the stepped tower with wings and a star on the spire
        box(30, 10, 14, c1, 0, 0, 0); box(16, 22, 12, c1, 0, 0, 0); box(11, 12, 9, c1, 0, 22, 0); box(7, 8, 6, c2, 0, 34, 0); cone(1.6, D - 42, c3, 0, 42, 0, 8);
        const st = put(new THREE.OctahedronGeometry(1.4), '#e0c050', 0, D + 0.6, 0); st.scale.set(1, 1.2, 0.35);
        for (const x of [-12, 12]) { box(6, 16, 8, c1, x, 0, 0); cone(1.2, 6, c3, x, 16, 0, 4); }
      } else if (l.style === 'twist') {                         // five-sided, twisting and tapering to a needle
        for (let i = 0; i < 12; i++) { const k = 1 - i / 13, m = put(new THREE.CylinderGeometry(6 * (k - 0.07), 6 * k, D / 12, 5), i % 2 ? c1 : c2, 0, (i + 0.5) * (D / 12), 0); m.rotation.y = i * 0.13; }
        cone(0.6, 6, c3, 0, D, 0, 5);
      } else { box(9, D, 7, c1, 0, 0, 0); for (let y = 3; y < D; y += 3) box(9.1, 0.25, 7.1, c2, 0, y, 0); box(5, 3, 4, c2, 0, D, 0); }
      break;
    }
    case 'mosque': {                                            // a hall with a pointed dome and slender minarets
      box(16, 8, 16, c1, 0, 0, 0); cyl(5, 3, c1, 0, 8, 0, 16); const dome = put(new THREE.SphereGeometry(5.4, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), c2, 0, 11, 0); dome.scale.y = 1.4; cone(0.6, 3, c3, 0, 18.5, 0, 8);
      const k = Math.max(2, n), r = 11;
      for (let i = 0; i < k; i++) { const a = (i / k) * Math.PI * 2 + Math.PI / 4, x = Math.cos(a) * r, z = Math.sin(a) * r; cyl(0.9, D * 0.85, c1, x, 0, z, 8, 0.75); cyl(1.2, 0.6, c1, x, D * 0.6, z, 8); cone(0.85, D * 0.15, c2, x, D * 0.85, z, 8); }
      break;
    }
    case 'tent': {                                              // a tiered tower with a tall tent roof (Söyembikä) or the small octagonal chapel on its hill
      if (l.style === 'cross') { cyl(4, 1.5, '#7d8a6a', 0, 0, 0, 12); cyl(2.6, 6, c1, 0, 1.5, 0, 8); cone(2.4, 8, c2, 0, 7.5, 0, 8); onion(0.8, c3, 0, 15.5, 0); }
      else { const top = tower(6, D, c1, c2, 0, 0, l.style === 'crescent' ? 'crescent' : 'cross', Math.min(5, n || 3)); void top; }
      break;
    }
    case 'theatre': {
      if (l.style === 'tractor') { box(14, 12, 18, c1, 0, 0, 0); for (const x of [-10, 10]) { box(6, 7, 26, c2, x, 0, 0); for (let z = -11; z <= 11; z += 2.2) box(6.2, 5, 1.2, c1, x, 1, z); } break; }
      box(26, 14, 20, c1, 0, 0, 0); box(27, 1.2, 21, shade(c1, -20), 0, 14, 0);
      const cols = Math.max(6, n); for (let i = 0; i < cols; i++) cyl(0.55, 11, c3, -10 + (20 * i) / (cols - 1), 0, 11.2, 10);
      put(new THREE.CylinderGeometry(0.2, 12.5, 3.5, 3, 1, false, Math.PI / 2), c1, 0, 13.2, 11.4).rotation.set(0, 0, 0);        // the pediment over the columns
      if (l.style === 'dome') { const dm = put(new THREE.SphereGeometry(10, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), c2, 0, 15, -1); dm.scale.y = 0.6; }
      if (l.style === 'colonnade') for (const z of [-9, 9]) for (let i = 0; i < 7; i++) cyl(0.5, 11, c3, -13.6, 0, -6 + i * 2 + (z > 0 ? 0 : 0), 8);
      break;
    }
    case 'gothic': {                                            // a brick hall with a square tower and a pointed spire (or turrets with spires)
      box(26, 12, 11, c1, 0, 0, 0); put(new THREE.CylinderGeometry(0.1, 7.6, 7, 4, 1), shade(c1, -30), 0, 15.5, 0).rotation.y = Math.PI / 4;
      if (l.style === 'turrets') { for (const x of [-12, -4, 4, 12]) { box(2, 16, 2, c1, x, 0, 5.8); cone(1.4, 5, c2, x, 16, 5.8, 4); } }
      else { box(7, D * 0.7, 7, c1, -13, 0, 0); cone(4, D * 0.3, c2, -13, D * 0.7, 0, 4); }
      break;
    }
    case 'bridge': {                                            // drawn over the city's water by the caller: pylons, a deck and cables, or arches
      const span = 70, deck = 6;
      box(span, 1.2, 7, c2, 0, deck, 0);
      if (l.style === 'cable') {
        for (const x of [-span / 4, span / 4]) { box(1.6, D, 1.6, c1, x, 0, -3.2); box(1.6, D, 1.6, c1, x, 0, 3.2); box(1.6, 1.6, 8, c1, x, D - 1.6, 0);
          for (let i = 1; i <= 6; i++) for (const s of [-1, 1]) { const a = new THREE.Vector3(x, D - 2, 0), b = new THREE.Vector3(x + s * i * (span / 4 / 6), deck + 1.2, 0); const len = a.distanceTo(b); const cbl = put(new THREE.CylinderGeometry(0.07, 0.07, len, 4), c3, (a.x + b.x) / 2, (a.y + b.y) / 2 - len / 2, 0); cbl.position.y = (a.y + b.y) / 2; cbl.lookAt(b); cbl.rotateX(Math.PI / 2); } }
      } else if (l.style === 'arch') { const arch = put(new THREE.TorusGeometry(span * 0.32, 0.8, 8, 40, Math.PI), c1, 0, deck, 0); arch.scale.y = D / (span * 0.32); }
      else if (l.style === 'arches') { for (let i = -2; i <= 2; i++) { const a = put(new THREE.TorusGeometry(6.5, 0.9, 6, 20, Math.PI), c1, i * 13.5, 0, 0); a.scale.y = 0.9; } }
      else for (let i = -3; i <= 3; i++) box(2, deck, 4, c1, i * 10, 0, 0);
      break;
    }
    case 'statue': {                                            // a pedestal and a figure: with a raised sword, on a rearing horse, standing in a cape, or holding wings on a pillar
      const ped = l.style === 'wings' ? D * 0.72 : D * 0.18; box(5, ped, 5, c2, 0, 0, 0); const y0 = ped, fh = D - ped;
      if (l.style === 'rider') { box(2, 2.4, 5, c1, 0, y0 + 2, 0); box(1.2, 2.4, 1.2, c1, 0, y0 + 0.2, 1.8); box(1.2, 3, 1.2, c1, 0, y0 + 3.8, -0.6); box(0.8, 1, 1.2, c1, 0, y0 + 4.6, 2.6); break; }
      cyl(fh * 0.12, fh * 0.55, c1, 0, y0, 0, 10, fh * 0.07); box(fh * 0.16, fh * 0.28, fh * 0.12, c1, 0, y0 + fh * 0.55, 0); put(new THREE.SphereGeometry(fh * 0.06, 10, 8), c1, 0, y0 + fh * 0.88, 0);
      if (l.style === 'sword') { const arm = put(new THREE.BoxGeometry(fh * 0.06, fh * 0.32, fh * 0.06), c1, fh * 0.12, y0 + fh * 0.9, 0); arm.rotation.z = -0.5; const sw = put(new THREE.BoxGeometry(fh * 0.03, fh * 0.42, fh * 0.03), c3, fh * 0.26, y0 + fh * 1.12, 0); sw.rotation.z = -0.3; const cape = put(new THREE.BoxGeometry(fh * 0.4, fh * 0.03, fh * 0.2), c1, -fh * 0.22, y0 + fh * 0.75, 0); cape.rotation.z = 0.6; }
      if (l.style === 'wings') { for (const s of [-1, 1]) { const wg = put(new THREE.BoxGeometry(fh * 0.7, fh * 0.12, 0.3), c1, s * fh * 0.4, y0 + fh * 0.95, 0); wg.rotation.z = s * 0.5; } }
      break;
    }
    case 'rocket': {                                            // the museum drum and the R-7 rocket: a core and four boosters
      cyl(7, 8, '#c8ccd0', 0, 0, 0, 20); cyl(1.6, D - 8, c1, 0, 8, 0, 12); cone(1.6, 4, c1, 0, D - 4, 0, 12);
      for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) { cyl(1.0, D * 0.35, c1, dx, 8, dz, 10); cone(1.0, 3, c2, dx, 8 + D * 0.35, dz, 10); }
      box(3.4, 0.6, 3.4, c2, 0, 8 + D * 0.5, 0);
      break;
    }
    case 'stadium': { const ring = put(new THREE.CylinderGeometry(24, 26, 14, 32, 1, true), c1, 0, 7, 0); ring.scale.z = 0.75; const fld = put(new THREE.CylinderGeometry(20, 20, 0.3, 32), c3, 0, 0.15, 0); fld.scale.z = 0.75; const scr = put(new THREE.CylinderGeometry(26.2, 26.2, 3, 32, 1, true), c2, 0, 12, 0, 0, true); scr.scale.z = 0.75; break; }
    case 'obelisk': {
      box(6, 1.2, 6, c2, 0, 0, 0);
      if (l.style === 'bell') { const b = put(new THREE.CylinderGeometry(2, 4, D * 0.55, 18), c1, 0, 1.2 + D * 0.27, 0); void b; put(new THREE.SphereGeometry(1.8, 14, 10), c3, 0, 1.2 + D * 0.62, 0); box(0.3, 2.5, 0.3, c3, 0, 1.2 + D * 0.68, 0); }
      else { cyl(1.4, D - 1.2, c1, 0, 1.2, 0, 4, 0.5); }
      break;
    }
    case 'gate': { box(14, D * 0.75, 7, c1, 0, 0, 0); box(5, D * 0.5, 7.4, '#3a3a3a', 0, 0, 0); if (l.style === 'church') { box(5, 3, 5, c1, 0, D * 0.75, 0); helmet(2.2, c2, 0, D * 0.75 + 3, 0); } else box(15, 1.5, 7.5, shade(c1, -15), 0, D * 0.75, 0); break; }
    case 'wooden': case 'halftimber': {                         // a short street of two-storey houses with pitched roofs (log houses with white window frames, or half-timbering)
      for (let i = 0; i < 5; i++) { const x = -16 + i * 8, hh = 6 + (i % 2) * 2; box(6.5, hh, 7, l.kind === 'halftimber' ? ['#e8d8b8', '#d9b98a', '#c9d6c0', '#e6c4bd', '#d8e0ea'][i] : c1, x, 0, 0);
        const roof = put(new THREE.ConeGeometry(5.2, 4, 4), c3, x, hh + 2, 0, Math.PI / 4); roof.scale.set(1, 1, 1.1);
        for (const wx of [-1.6, 1.6]) for (const wy of [2, hh - 2]) box(1.2, 1.3, 0.2, l.kind === 'halftimber' ? '#5a3a24' : c2, x + wx, wy - 0.6, 3.55); }
      if (l.kind === 'halftimber') { cyl(2.4, D, '#e8d8b8', 22, 0, 0, 10); cone(2.8, 4, c2, 22, D, 0, 10); }
      break;
    }
    case 'ship': {
      const hull = put(new THREE.BoxGeometry(34, 5, 8), c1, 0, 2.5, 0); void hull; box(36, 0.5, 8.4, c2 === '#e0c050' ? '#c0392b' : c3, 0, 0.3, 0);
      if (l.style === 'sail') { for (const x of [-10, 0, 10]) { box(0.5, 22, 0.5, '#5a3a24', x, 5, 0); for (const y of [10, 17]) box(0.2, 6, 7, c3, x, y, 0); } }
      else { box(18, 6, 6.5, c2, -2, 5, 0); box(10, 3, 5, c2, -2, 11, 0); for (let i = 0; i < Math.max(1, n); i++) cyl(1.1, 5, i % 2 ? '#c0392b' : '#3a3f4a', 4 - i * 4, 11, 0, 12); }
      break;
    }
    case 'mammoth': { box(7, 4, 3.4, c1, 0, 3, 0); for (const [x, z] of [[-2.5, -1.2], [2.5, -1.2], [-2.5, 1.2], [2.5, 1.2]]) cyl(0.7, 3, c1, x, 0, z, 8); box(2.6, 2.6, 2.6, c1, 4.6, 4.4, 0); const tusk = put(new THREE.TorusGeometry(1.4, 0.18, 6, 10, Math.PI), c2, 6.2, 3.4, 0.9); tusk.rotation.y = Math.PI / 2; box(1.2, 12, 10, '#e8e2d2', -10, 0, 0); break; }
    case 'letters': { box(30, 1.2, 1.4, '#8a8a7a', 0, 0, 0); for (let i = 0; i < 22; i++) if (i % 6 !== 5) box(0.9, 1.6, 0.3, c1, -13.5 + i * 1.3, 1.2, 0); break; }
    case 'block': {
      if (l.style === 'stairs') { for (let i = 0; i < 10; i++) box(14 - i * 0.6, 0.9, 3, i % 3 ? c1 : c2, 0, i * 0.9, -i * 2.4); break; }
      if (l.style === 'rotunda') { box(30, 8, 16, c1, 0, 0, 0); cyl(9, 14, c2, 0, 0, 0, 24); break; }
      box(36, 10, 18, c1, 0, 0, 0); box(37, 1.2, 19, shade(c1, -20), 0, 10, 0); if (l.style === 'towered') tower(5, D + 10, c1, c2, -14, 4, 'none', 1);
      break;
    }
    default: break;
  }
  return g;
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1, 7), 16), c = (v: number): number => Math.max(0, Math.min(255, v + amt));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => c(v).toString(16).padStart(2, '0')).join('');
}
