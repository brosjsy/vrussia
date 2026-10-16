/* The look of the streets in the 3D city (the rules are in street.ts): pavements, cycle strips, the roadway with its centre line, the roundabout round the
   home block, zebra crossings where a street meets the roundabout, and the cars and bicycles that use them. Everything is made of a few shared shapes. */
import * as THREE from 'three';
import { HUB } from './world-logic';
import type { V2 } from './world-logic';
import { network, along, RING_R, RING_BIKE, RING_WALK, BIKE, STREET_HALF } from './street';

type Track = <T extends { dispose: () => void }>(x: T) => T;
const ASPHALT = '#565b66', CYCLE = '#b9624a', PAVING = '#d8d2c4', LINE = '#f4f1e6';

/** Lays every street on the ground. Returns the group so that it can be found (and counted) again. */
export function buildStreets(scene: THREE.Scene, track: Track): THREE.Group {
  const g = new THREE.Group(); g.userData.streets = true;
  const mat = (hex: string): THREE.MeshStandardMaterial => track(new THREE.MeshStandardMaterial({ color: hex, roughness: 1 }));
  const paving = mat(PAVING), cycle = mat(CYCLE), asphalt = mat(ASPHALT), line = mat(LINE);
  const joint = new Map<number, THREE.CylinderGeometry>();
  const strip = (pts: V2[], width: number, y: number, m: THREE.Material): void => {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], len = Math.hypot(b.x - a.x, b.z - a.z); if (len < 0.01) continue;
      const box = new THREE.Mesh(track(new THREE.BoxGeometry(width, 0.04, len)), m); box.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2); box.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); box.receiveShadow = true; g.add(box);
    }
    let geo = joint.get(width); if (!geo) { geo = track(new THREE.CylinderGeometry(width / 2, width / 2, 0.04, 20)); joint.set(width, geo); }
    for (const p of pts) { const c = new THREE.Mesh(geo, m); c.position.set(p.x, y, p.z); c.receiveShadow = true; g.add(c); }      // round corners and round ends
  };
  const net = network(), roads = net.edges.filter(e => !e.ring);
  // from the bottom up: pavement, cycle strip, roadway, paint. The roundabout is laid last so that it covers the ends of the streets that reach it.
  for (const e of roads) strip(e.pts, STREET_HALF * 2, 0.05, paving);
  for (const e of roads) strip(e.pts, (BIKE + 0.7) * 2, 0.07, cycle);
  for (const e of roads) strip(e.pts, 6, 0.09, asphalt);
  const dash = track(new THREE.BoxGeometry(0.16, 0.02, 1.8));
  for (const e of roads) for (let s = 9; s < e.len - 2; s += 5) { const p = along(e, s, 0); const d = new THREE.Mesh(dash, line); d.position.set(p.x, 0.12, p.z); d.rotation.y = p.heading; g.add(d); }
  const disc = (r: number, y: number, m: THREE.Material): void => { const c = new THREE.Mesh(track(new THREE.CylinderGeometry(r, r, 0.04, 48)), m); c.position.set(HUB.x, y, HUB.z); c.receiveShadow = true; g.add(c); };
  disc(RING_R + RING_WALK + 1.2, 0.11, paving); disc(RING_R + RING_BIKE + 0.6, 0.13, cycle); disc(RING_R + RING_BIKE - 0.45, 0.15, asphalt); disc(RING_R - 1.8, 0.17, paving);
  // zebra crossings: where a street leaves the roundabout, and across the roundabout in front of the home door
  const bar = track(new THREE.BoxGeometry(0.55, 0.02, 2.6));
  for (const e of roads) if (net.nodes[e.a].ring && e.len > 12) for (let k = -3; k <= 3; k++) { const p = along(e, RING_WALK + 3.4, k * 1.15); const z = new THREE.Mesh(bar, line); z.position.set(p.x, 0.125, p.z); z.rotation.y = p.heading; g.add(z); }
  const home = net.nodes[net.endOf.home].angle;
  for (let k = -2; k <= 2; k++) { const a = home + (k * 0.62) / RING_R, z = new THREE.Mesh(bar, line); z.position.set(HUB.x + Math.sin(a) * (RING_R + 0.25), 0.18, HUB.z + Math.cos(a) * (RING_R + 0.25)); z.rotation.y = a; z.scale.z = 1.25; g.add(z); }
  scene.add(g);
  return g;
}

export interface VehicleParts { car: (hex: string) => THREE.Group; bike: (hex: string) => { node: THREE.Group; seat: THREE.Group; wheels: THREE.Object3D[] } }
/** The makers of cars and bicycles. Their shapes are shared, so fifteen cars cost little more than one. A vehicle faces +z. */
export function vehicleParts(track: Track): VehicleParts {
  const body = track(new THREE.BoxGeometry(1.8, 0.55, 4.2)), cabin = track(new THREE.BoxGeometry(1.56, 0.5, 2.2)), roof = track(new THREE.BoxGeometry(1.5, 0.08, 1.9)), wheel = track(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 14)), lamp = track(new THREE.BoxGeometry(0.34, 0.16, 0.08)), bumper = track(new THREE.BoxGeometry(1.84, 0.16, 0.14));
  const glass = track(new THREE.MeshStandardMaterial({ color: '#27313f', roughness: 0.25, metalness: 0.3 })), tyre = track(new THREE.MeshStandardMaterial({ color: '#1c1d21', roughness: 0.9 })), dark = track(new THREE.MeshStandardMaterial({ color: '#2b2e35', roughness: 0.8 }));
  const head = track(new THREE.MeshStandardMaterial({ color: '#fff6cf', emissive: '#fff0a8', emissiveIntensity: 0.9 })), tail = track(new THREE.MeshStandardMaterial({ color: '#d5262d', emissive: '#c01820', emissiveIntensity: 0.7 }));
  const paints = new Map<string, THREE.MeshStandardMaterial>();
  const paint = (hex: string): THREE.MeshStandardMaterial => { let m = paints.get(hex); if (!m) { m = track(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45, metalness: 0.2 })); paints.set(hex, m); } return m; };
  const add = (g: THREE.Group, geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, shadow = false): THREE.Mesh => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = shadow; g.add(o); return o; };
  const car = (hex: string): THREE.Group => {
    const g = new THREE.Group(), p = paint(hex);
    add(g, body, p, 0, 0.66, 0, true); add(g, cabin, glass, 0, 1.18, -0.25); add(g, roof, p, 0, 1.46, -0.25);
    for (const [x, z] of [[-0.9, 1.35], [0.9, 1.35], [-0.9, -1.35], [0.9, -1.35]]) { const w = add(g, wheel, tyre, x, 0.34, z); w.rotation.z = Math.PI / 2; }
    for (const x of [-0.6, 0.6]) { add(g, lamp, head, x, 0.74, 2.11); add(g, lamp, tail, x, 0.74, -2.11); }
    add(g, bumper, dark, 0, 0.44, 2.08); add(g, bumper, dark, 0, 0.44, -2.08);
    return g;
  };
  const rim = track(new THREE.TorusGeometry(0.33, 0.045, 6, 18)), tube = track(new THREE.CylinderGeometry(0.035, 0.035, 1, 6)), saddle = track(new THREE.BoxGeometry(0.16, 0.06, 0.3));
  const bike = (hex: string): { node: THREE.Group; seat: THREE.Group; wheels: THREE.Object3D[] } => {
    const g = new THREE.Group(), p = paint(hex), wheels: THREE.Object3D[] = [];
    for (const z of [0.55, -0.55]) { const w = add(g, rim, tyre, 0, 0.38, z); w.rotation.y = Math.PI / 2; wheels.push(w); }
    const bar = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, m: THREE.Material): void => {
      const o = new THREE.Mesh(tube, m), a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2); o.position.copy(a).add(b).multiplyScalar(0.5); o.scale.y = a.distanceTo(b);
      o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); g.add(o);
    };
    bar(0, 0.38, -0.55, 0, 0.92, -0.2, p); bar(0, 0.92, -0.2, 0, 0.9, 0.4, p); bar(0, 0.9, 0.4, 0, 0.38, 0.55, p); bar(0, 0.38, -0.55, 0, 0.45, 0.02, p); bar(0, 0.45, 0.02, 0, 0.92, -0.2, p); bar(0, 0.45, 0.02, 0, 0.9, 0.4, p);
    bar(0, 0.9, 0.4, 0, 1.12, 0.36, dark); bar(-0.26, 1.12, 0.36, 0.26, 1.12, 0.36, dark);      // the stem and the handlebar
    add(g, saddle, dark, 0, 0.98, -0.22);
    const seat = new THREE.Group(); seat.position.set(0, 0.98, -0.22); g.add(seat);
    return { node: g, seat, wheels };
  };
  return { car, bike };
}
