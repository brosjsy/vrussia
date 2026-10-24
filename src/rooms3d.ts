/* Builds a 3D room from the data in interiors.ts: a floor, three walls (the front is left open so the camera can look in), and low-poly furniture.
   Every piece that does something carries `userData.action`, which the 3D world turns into a click. */
import * as THREE from 'three';
import type { Interior, Prop, PropKind, FloorStyle, RoomLook } from './interiors';
import { sprite, pinSprite } from './sprites3d';
import { roomL } from './i18n-rooms';
import { partsFor } from './furniture3d';
import { furnitureModel, kitFloorTexture } from './kit3d';
import type { KitKind } from './kit3d';

/** The design's model for a piece, where it has one (round 147): a bed or a double bed, a sofa or an armchair, the TV, fridge, cooker, table, chair, desk,
   bookshelf, palm, floor lamp, rug and the dog's bed. */
export function kitKindFor(p: Pick<Prop, 'kind' | 'w' | 'd' | 'wallItem'>): KitKind | null {
  if (p.wallItem) return null;
  switch (p.kind) {
    case 'bed': return Math.min(p.w, p.d) >= 1.8 ? 'kingbed' : 'bed';
    case 'sofa': return Math.max(p.w, p.d) <= 1.2 ? 'armchair' : 'sofa';
    case 'tv': return 'tv'; case 'fridge': return 'fridge'; case 'stove': return 'cooker'; case 'table': return 'table'; case 'chair': return 'chair';
    case 'desk': return 'desk'; case 'shelf': return 'bookshelf'; case 'plant': return 'plant'; case 'lamp': return 'lamp'; case 'rug': return 'rug'; case 'kennel': return 'dogbed';
    default: return null;
  }
}
/** The design's model fitted into a piece's floor space: turned to lie the same way, and scaled to fill it. */
function fitted(kind: KitKind, w: number, d: number, color: string | undefined, lights: { light: THREE.PointLight; bulb: THREE.Mesh }[]): THREE.Group {
  const inner = furnitureModel(kind, color, lights), outer = new THREE.Group(); outer.add(inner);
  const bb = new THREE.Box3().setFromObject(inner), sz = bb.getSize(new THREE.Vector3());
  if (sz.x > 0.01 && sz.z > 0.01 && (sz.x > sz.z * 1.15) !== (w > d * 1.15) && Math.abs(sz.x - sz.z) > 0.15) { inner.rotation.y = Math.PI / 2; [sz.x, sz.z] = [sz.z, sz.x]; }
  const k = Math.max(0.5, Math.min(1.8, Math.min(w / Math.max(0.01, sz.x), d / Math.max(0.01, sz.z))));
  outer.scale.setScalar(k); return outer;
}

const HEIGHT: Record<PropKind, number> = {
  bed: 0.7, sofa: 0.5, tv: 1.2, fridge: 2.1, stove: 0.95, table: 0.85, chair: 0.5, desk: 0.8, laptop: 0.06, wardrobe: 2.4, plant: 1.5, window: 1.5, rug: 0.04,
  counter: 1.1, shelf: 2.2, bench: 0.5, atm: 1.7, ticket: 1.3, board: 1.6, kennel: 1.0, car: 1.4, coffee: 1.3, stall: 1.2, lamp: 1.7, phone: 0.1, bedside: 0.6, item: 0.8, round: 0.8,
  bath: 0.6, toilet: 0.45, sink: 0.85, washer: 0.85, hanger: 1.9, stenka: 2.2, pech: 2.3, door: 2.1, bunk: 1.8,
};
const COLOR: Partial<Record<PropKind, string>> = {
  bed: '#e0735a', sofa: '#3b8f6e', tv: '#15171c', fridge: '#e9eef2', stove: '#c9ced3', table: '#a8754a', chair: '#7a5a3a', desk: '#b98a5c', laptop: '#2a2f3a', wardrobe: '#8c6a47',
  plant: '#3c8f4a', window: '#9fd4ff', rug: '#a56be0', counter: '#8b6b4a', shelf: '#7a5a3a', bench: '#6b7fa8', atm: '#4a5568', ticket: '#d6a53a', board: '#2f6fd6',
  kennel: '#b9a27a', car: '#e0373f', coffee: '#6b4a3a', stall: '#d6a53a', lamp: '#f0d890', phone: '#222', bedside: '#8c6a47',
  hanger: '#8c6a47', door: '#8a5a3a', bunk: '#3b6fe0',
};

/** How high the inner walls of a flat are: waist high, so that the camera sees every room. */
export const INNER_H = 1.25;
/** Square tiles of one colour with light joints (the floor of a Russian bathroom or kitchen). Null where there is no canvas. */
export function tileTexture(hex: string): THREE.CanvasTexture | null {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); if (!g) return null;
  g.fillStyle = hex; g.fillRect(0, 0, 64, 64); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.strokeRect(1, 1, 62, 62); g.beginPath(); g.moveTo(32, 0); g.lineTo(32, 64); g.moveTo(0, 32); g.lineTo(64, 32); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** The pattern of a floor drawn on a small canvas that repeats: chequered tiles, parquet, planks or linoleum. Null where there is no canvas (then the floor is one colour). */
export function floorTexture(style: FloorStyle, a: string, b: string): THREE.CanvasTexture | null {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); if (!g) return null;
  g.fillStyle = a; g.fillRect(0, 0, 256, 256);
  if (style === 'checker') { g.fillStyle = b; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) g.fillRect(i * 64, j * 64, 64, 64); }
  else if (style === 'parquet') { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * 32, 0, 32, 256); g.strokeStyle = 'rgba(0,0,0,.18)'; g.strokeRect(i * 32, 0, 32, 256); for (let j = 0; j < 4; j++) { g.beginPath(); g.moveTo(i * 32, j * 64 + (i % 2) * 32); g.lineTo(i * 32 + 32, j * 64 + (i % 2) * 32); g.stroke(); } } }
  else if (style === 'plank') { for (let j = 0; j < 8; j++) { g.fillStyle = j % 3 === 0 ? b : a; g.fillRect(0, j * 32, 256, 32); g.strokeStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.moveTo(0, j * 32); g.lineTo(256, j * 32); g.stroke(); g.beginPath(); g.moveTo(((j * 97) % 200) + 20, j * 32); g.lineTo(((j * 97) % 200) + 20, j * 32 + 32); g.stroke(); } }
  else { g.fillStyle = b; for (let i = 0; i < 90; i++) g.fillRect((i * 53) % 256, (i * 97) % 256, 3, 2); g.strokeStyle = 'rgba(0,0,0,.08)'; g.strokeRect(0, 0, 256, 256); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** The small picture shown over a thing that can be used (the words appear when the pointer is on it). */
export const ACTION_ICON: Record<string, string> = { cook: '🍳', tv: '📺', tea: '🍵', samovar: '☕', sit: '💺', home: '🛏️', food: '🍲', online: '💻', wardrobe: '👕', phone: '📱', wash: '🧼', vote: '🗳️', work: '💼', money: '💳', paper: '📄', edu: '📚', travel: '🚆', flight: '✈️', family: '🐕', people: '💬' };
export function iconOf(action: string, label = ''): string {
  if (action.startsWith('act:')) { const first = label.split(' ')[0]; return first && !/^[A-Za-z]/.test(first) ? first : '✨'; }
  return ACTION_ICON[action] ?? '❔';
}

export interface RoomHandle { group: THREE.Group; interior: Interior; usable: THREE.Object3D[]; dispose: () => void }

/** Builds the room with its centre at (0,0,0); the caller moves the group where it wants it. `slot` is the part of the day (0 morning, 1 afternoon, 2 evening): in the evening the windows are dark and the lamps light the room. */
export function buildRoom(it: Interior, slot = 1): RoomHandle {
  const evening = slot === 2;
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [];
  const box = (w: number, h: number, d: number): THREE.BoxGeometry => { const g = new THREE.BoxGeometry(w, h, d); geos.push(g); return g; };
  const mat = (c: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...extra }); mats.push(m); return m; };
  const usable: THREE.Object3D[] = [];

  const look: RoomLook | undefined = it.look;
  const tex = look ? (look.floorStyle === 'checker' ? kitFloorTexture(look.floorA, look.floorB) ?? floorTexture(look.floorStyle, look.floorA, look.floorB) : floorTexture(look.floorStyle, look.floorA, look.floorB)) : null;   // the design's wooden chequer for chequered floors
  if (tex) { tex.repeat.set(it.w / 4, it.d / 4); }
  const floor = new THREE.Mesh(box(it.w, 0.2, it.d), tex ? mat('#ffffff', { map: tex }) : mat(look?.floorA ?? it.floor)); floor.position.y = -0.1; floor.receiveShadow = true; group.add(floor); if (tex) mats.push(tex as unknown as THREE.Material);
  const wallMat = mat(it.wall), WALL_H = it.wallH ?? 3.6;
  const back = new THREE.Mesh(box(it.w, WALL_H, 0.3), wallMat); back.position.set(0, WALL_H / 2, -it.d / 2 - 0.15); group.add(back);
  const left = new THREE.Mesh(box(0.3, WALL_H, it.d), wallMat); left.position.set(-it.w / 2 - 0.15, WALL_H / 2, 0); group.add(left);
  const right = new THREE.Mesh(box(0.3, WALL_H, it.d), wallMat); right.position.set(it.w / 2 + 0.15, WALL_H / 2, 0); group.add(right);
  // the rooms of a flat (round 151): low inner walls with a darker top, the floor of each part (tiles in the bathroom and the kitchen) and its name on the floor
  if (it.walls?.length) {
    const cap = mat(look?.trim ?? '#6a5a48');
    for (const w of it.walls) { const m = new THREE.Mesh(box(w.w, INNER_H, w.d), wallMat); m.position.set(w.x, INNER_H / 2, w.z); m.castShadow = true; m.receiveShadow = true; m.name = 'inner-wall'; group.add(m); const top = new THREE.Mesh(box(w.w + 0.04, 0.06, w.d + 0.04), cap); top.position.set(w.x, INNER_H + 0.03, w.z); group.add(top); }
  }
  for (const z of it.zones ?? []) {
    if (z.floor) { const t = tileTexture(z.floor); if (t) { t.repeat.set(z.w / 1.2, z.d / 1.2); mats.push(t as unknown as THREE.Material); } const m = new THREE.Mesh(box(z.w, 0.02, z.d), t ? mat('#ffffff', { map: t }) : mat(z.floor)); m.position.set(z.x, 0.011, z.z); m.receiveShadow = true; m.name = 'zone-floor'; group.add(m); }
    const tag = sprite(roomL(z.name), '#ffffff00', '#16203aaa', 0.62); tag.position.set(z.x, 0.25, z.z + z.d / 2 - 0.55); tag.name = 'zone-name'; group.add(tag);
  }
  // skirting boards, wall lamps and what hangs on the walls
  if (look) {
    const tm = mat(look.trim);
    for (const [w, d, x, z] of [[it.w, 0.12, 0, -it.d / 2 + 0.06], [0.12, it.d, -it.w / 2 + 0.06, 0], [0.12, it.d, it.w / 2 - 0.06, 0]] as const) { const m = new THREE.Mesh(box(w, 0.28, d), tm); m.position.set(x, 0.14, z); group.add(m); }
    const bulb = mat('#fff3c4', { emissive: new THREE.Color('#ffd27a'), emissiveIntensity: evening ? 1.6 : 0.2 });       // the design's warm bulbs
    const ball = new THREE.SphereGeometry(0.13, 14, 10); geos.push(ball);
    if (evening) { const glow = new THREE.PointLight('#ffd9a0', 1.4, Math.max(it.w, it.d) * 1.6, 1.2); glow.position.set(0, WALL_H - 0.6, 0); glow.name = 'evening-light'; group.add(glow); }
    if (look.lights === 'chandelier') { const rod = new THREE.Mesh(box(0.06, 0.9, 0.06), tm); rod.position.set(0, WALL_H - 0.2, 0); group.add(rod); for (const dx of [-0.5, 0, 0.5]) { const b = new THREE.Mesh(box(0.3, 0.3, 0.3), bulb); b.position.set(dx, WALL_H - 0.75, 0); group.add(b); } }
    else for (const x of [-it.w * 0.28, it.w * 0.28]) { const arm = new THREE.Mesh(box(0.08, 0.08, 0.35), tm); arm.position.set(x, 2.6, -it.d / 2 + 0.2); group.add(arm); const b = new THREE.Mesh(ball, bulb); b.position.set(x, 2.5, -it.d / 2 + 0.45); group.add(b); if (evening) { const pl = new THREE.PointLight('#ffc977', 0.9, 6, 2); pl.position.set(x, 2.3, -it.d / 2 + 0.9); group.add(pl); } if (look.lights === 'shade') { const sh = new THREE.Mesh(box(0.5, 0.18, 0.5), mat('#f0e0b8')); sh.position.set(x, 2.78, -it.d / 2 + 0.45); group.add(sh); } }
    let k = 0;
    for (const dcc of look.deco) {
      const x = -it.w / 2 + 1.4 + k * 2.6; k++;
      if (dcc === 'calendar') { const m = new THREE.Mesh(box(0.6, 0.8, 0.05), mat('#ffffff')); m.position.set(x, 2.0, -it.d / 2 + 0.03); group.add(m); const top = new THREE.Mesh(box(0.6, 0.18, 0.06), mat('#c0282f')); top.position.set(x, 2.3, -it.d / 2 + 0.04); group.add(top); }
      else if (dcc === 'poster') { const m = new THREE.Mesh(box(1.0, 1.3, 0.05), mat('#6b8fb8')); m.position.set(x, 1.9, -it.d / 2 + 0.03); group.add(m); const m2 = new THREE.Mesh(box(0.7, 0.5, 0.06), mat('#f0b43c')); m2.position.set(x, 1.8, -it.d / 2 + 0.04); group.add(m2); }
      else if (dcc === 'carpet') { const m = new THREE.Mesh(box(2.6, 1.7, 0.05), mat('#9a2a2e')); m.position.set(x + 0.8, 1.7, -it.d / 2 + 0.03); group.add(m); const f = new THREE.Mesh(box(2.0, 1.1, 0.06), mat('#d9b45a')); f.position.set(x + 0.8, 1.7, -it.d / 2 + 0.04); group.add(f); }
      else if (dcc === 'icons') { for (const dx of [0, 0.5, 1.0]) { const m = new THREE.Mesh(box(0.4, 0.55, 0.05), mat('#d6a53a')); m.position.set(x + dx, 2.3 - dx * 0.1, -it.d / 2 + 0.03); group.add(m); } }
    }
  }
  // the doorway: a mat on the floor at the front, the exit
  const door = new THREE.Mesh(box(2.6, 0.06, 1.2), mat('#5a3a24')); door.position.set(0, 0.03, it.d / 2 - 0.4); door.userData.action = 'exit'; group.add(door); usable.push(door);
  const exitTag = sprite(roomL('Exit'), '#16203a', '#ffffff', 0.8); exitTag.position.set(0, 1.2, it.d / 2 - 0.4); exitTag.userData.action = 'exit'; group.add(exitTag); usable.push(exitTag);

  const title = sprite(roomL(it.title), '#ffffffee', '#16203a', 1.1); title.position.set(0, WALL_H + 0.9, -it.d / 2); group.add(title);
  if (it.address) { const plate = sprite(it.address, '#1f4fa8ee', '#ffffff', 0.8); plate.position.set(0, WALL_H - 0.55, -it.d / 2 + 0.05); plate.name = 'address'; group.add(plate); }

  const lamps: { light: THREE.PointLight; bulb: THREE.Mesh }[] = [];
  for (const p of it.props) {
    const h = p.h ?? HEIGHT[p.kind], g = new THREE.Group();
    const kk = kitKindFor(p);
    if (kk) g.add(fitted(kk, p.w, p.d, p.uid !== undefined || ['sofa', 'chair', 'bed', 'rug'].includes(p.kind) ? p.color : undefined, lamps));
    else {
    let shape: THREE.BufferGeometry;
    if (p.kind === 'round') { shape = new THREE.CylinderGeometry(Math.min(p.w, p.d) / 2 * 0.9, Math.min(p.w, p.d) / 2 * 0.9, h, 20); geos.push(shape); } else shape = box(p.w, h, p.d);
const baseColor = p.color ?? COLOR[p.kind] ?? '#999';
    const parts = p.wallItem || p.kind === 'window' ? [] : partsFor(p, h, baseColor);
    if (parts.length) {
      void shape;
      for (const q of parts) {
        let geo: THREE.BufferGeometry; if (q.s === 'cyl') { geo = new THREE.CylinderGeometry(q.w / 2, q.w / 2, q.h, 16); geos.push(geo); } else geo = box(q.w, q.h, q.d);
        const m = new THREE.Mesh(geo, mat(q.c, q.glow ? { emissive: new THREE.Color(q.c), emissiveIntensity: evening ? 1.2 : 0.45 } : {})); m.position.set(q.x, q.y, q.z); m.castShadow = p.kind !== 'rug'; m.receiveShadow = true; g.add(m);
      }
    } else {
      const glass = evening ? '#26345c' : slot === 0 ? '#bfe3ff' : '#9fd4ff';
      const body = new THREE.Mesh(shape, mat(p.kind === 'window' ? glass : baseColor, p.kind === 'window' ? { emissive: new THREE.Color(glass), emissiveIntensity: evening ? 0.25 : 0.6 } : {}));
      body.position.y = p.wallItem ? 1.5 : p.kind === 'window' ? 1.9 : h / 2; body.castShadow = p.kind !== 'window'; body.receiveShadow = true; g.add(body);
      detail(p, g, box, mat, look);
    }
    }
    g.position.set(p.x, 0, p.z); g.rotation.y = p.ry ?? 0;
    if (p.uid !== undefined) { g.traverse(o => { o.userData.furn = p.uid; }); g.userData.furn = p.uid; }
    if (p.icon && p.uid !== undefined) { const pin = pinSprite(p.icon, '#ffffff', 0.9); pin.position.set(0, (p.wallItem ? 1.5 + h / 2 : h) + 0.6, 0); pin.userData.furn = p.uid; g.add(pin); }
    if (p.action) {
      g.traverse(o => { o.userData.action = p.action; o.userData.label = p.label; });
      usable.push(g);
      const tag = pinSprite(iconOf(p.action, p.label), p.action.startsWith('act:') ? '#3ec27a' : '#2f6fd6', 0.95); tag.position.set(0, Math.max(h, 0.5) + 0.75, 0); tag.userData.action = p.action; tag.userData.label = p.label; g.add(tag);
    }
    group.add(g);
  }
  for (const l of lamps) { if (!evening) l.light.parent?.remove(l.light); l.light.intensity = evening ? 1.4 : 0; (l.bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = evening ? 1.4 : 0.3; mats.push(l.bulb.material as THREE.Material); }      // the floor lamps glow in the evening
  return {
    group, interior: it, usable,
    dispose: () => { geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); group.traverse(o => { if (o instanceof THREE.Sprite) { o.material.map?.dispose(); o.material.dispose(); } }); },
  };
}

/** The small things that make a box read as a bed, a TV or a plant. */
function detail(p: Prop, g: THREE.Group, box: (w: number, h: number, d: number) => THREE.BoxGeometry, mat: (c: string) => THREE.MeshStandardMaterial, look?: RoomLook): void {
  const add = (w: number, h: number, d: number, x: number, y: number, z: number, c: string): void => { const m = new THREE.Mesh(box(w, h, d), mat(c)); m.position.set(x, y, z); m.castShadow = true; g.add(m); };
  switch (p.kind) {
    case 'chair': add(p.w, 0.5, 0.08, 0, 0.75, -p.d / 2 + 0.05, '#6a4a2c'); break;
    case 'window': {
      const along = p.w >= p.d, n = Math.max(3, Math.round((along ? p.w : p.d) * 2.5));
      if (look?.windows === 'blinds') for (let i = 0; i < n; i++) { const o = ((i + 0.5) / n - 0.5) * (along ? p.w : p.d); add(along ? 0.05 : 0.16, 0.05, along ? 0.16 : 0.05, along ? o : 0, 1.9 + 0.5 - (i % 2) * 0.0, along ? 0.12 : 0, '#3a3f4a'); }
      if (look?.windows === 'blinds') for (let i = 0; i < 7; i++) add(along ? p.w : 0.18, 0.04, along ? 0.18 : p.d, 0, 1.2 + i * 0.22, 0, '#e8efe6');
      // a Russian window: tall white frames with a cross bar and a sill, and a ribbed radiator under it
      { const L = along ? p.w : p.d; add(along ? L + 0.12 : 0.12, 0.08, along ? 0.14 : L + 0.12, 0, 1.02, 0, '#f4f4f0'); add(along ? L + 0.12 : 0.1, 0.08, along ? 0.1 : L + 0.12, 0, 2.82, 0, '#f4f4f0'); add(along ? 0.07 : 0.1, 1.8, along ? 0.1 : 0.07, 0, 1.92, 0, '#f4f4f0'); add(along ? L : 0.1, 0.06, along ? 0.1 : L, 0, 2.3, 0, '#f4f4f0');
        if (along) { const fins = Math.max(5, Math.round(L * 5)); for (let i = 0; i < fins; i++) add(0.07, 0.55, 0.09, (i / (fins - 1) - 0.5) * (L * 0.7), 0.5, 0.16, '#e9ebee'); add(L * 0.72, 0.05, 0.05, 0, 0.8, 0.16, '#d5d8dc'); } }
      if (look?.windows === 'curtains') { const wcur = along ? p.w * 0.28 : 0.2, dcur = along ? 0.2 : p.d * 0.28; add(wcur, 1.8, dcur, along ? -p.w * 0.36 : 0, 1.9, along ? 0.14 : -p.d * 0.36, '#b3262e'); add(wcur, 1.8, dcur, along ? p.w * 0.36 : 0, 1.9, along ? 0.14 : p.d * 0.36, '#b3262e'); }
      break;
    }
    case 'bed': add(p.w * 0.9, 0.2, 0.9, 0, 0.8, -p.d / 2 + 0.7, '#ffffff'); break;
    case 'sofa': add(p.w, 0.8, 0.4, 0, 0.9, -p.d / 2 + 0.2, '#2e725a'); break;
    case 'tv': add(p.w * 0.9, 0.9, p.d * 0.8, 0, 1.0, 0, '#222a3a'); break;
    case 'plant': add(0.8, 0.5, 0.8, 0, 0.25, 0, '#a05a3a'); break;
    case 'fridge': add(0.1, 0.5, 0.1, p.w / 2 - 0.15, 1.3, p.d / 2 + 0.02, '#888'); break;
    case 'laptop': add(0.8, 0.5, 0.05, 0, 0.9, -0.2, '#2a2f3a'); break;
    case 'car': add(p.w * 0.9, 0.5, p.d * 0.5, 0, 1.0, 0, '#9fd4ff'); break;
    case 'atm': add(p.w * 0.7, 0.4, 0.05, 0, 1.4, p.d / 2, '#7fd0ff'); break;
    default: break;
  }
}
