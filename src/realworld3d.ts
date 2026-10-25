/* The real city in 3D (round 153): the player walks the real streets of their city at real scale. The map loads around them as they go (OpenStreetMap
   tiles from OpenFreeMap, only after the player agreed, the same consent as the real houses). Buildings with their real heights and windows, streets by
   their width, water and parks, and every named place (metro, churches, mosques, shops, cafés, banks, clinics, schools, offices...) as a coloured pin.
   Tapping a place opens its card (realworld-ui.ts); "Go here" walks the player along the streets with a glowing route line. Map data
   © OpenStreetMap contributors. Loaded only when opened (a separate download). */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { State } from './engine';
import { normalizeLook } from './avatar';
import { buildCharacter, setPose } from './characters3d';
import { extrudeOutline, paintWindows, paintFacade, roofOf, FACADES, STOREY } from './scenery3d';
import type { Facade } from './scenery3d';
import { sprite, pinSprite } from './sprites3d';
import { TILEJSON_URL } from './osm';
import { readTile, tilesAround, tileOfLL, toLL, buildGraph, route, KIND, ZOOM } from './realworld';
import type { LatLon, XZ, Chunk, Poi, Graph, Road } from './realworld';

export interface RealDeps {
  host: HTMLElement; s: State; origin: LatLon;
  /** The player tapped a place. */
  onPoi: (p: Poi) => void;
  /** The player arrived where they were walking to. */
  onArrive: (p: Poi | null) => void;
  onFail: (message: string) => void;
  /** The map loaded more of the city (for the search list). */
  onData?: () => void;
  /** A test or the dev page supplies the tiles; the game fetches them from OpenFreeMap. */
  fetchTile?: (z: number, x: number, y: number) => Promise<ArrayBuffer | null>;
  rendererFactory?: (canvas: HTMLCanvasElement) => Pick<THREE.WebGLRenderer, 'setSize' | 'setPixelRatio' | 'render' | 'dispose' | 'domElement' | 'shadowMap'>;
}
export interface RealHandle {
  destroy: () => void;
  /** Walk to a place along the streets; false when there is no way yet (the map is still loading). */
  goTo: (p: Poi) => { ok: boolean; path: number[] };
  pois: () => Poi[];
  graph: () => Graph | null;
  player: () => XZ;
  /** Jump to where the walk would end (the game time is charged by the caller). */
  skip: () => void;
  tick: (dt: number) => void;
  scene: THREE.Scene;
  pick: (cx: number, cy: number) => Poi | null;
  chunks: () => number;
}

const ROAD_W: Record<Road['cls'], number> = { major: 14, street: 10, minor: 6, path: 2.4, rail: 3 };
const ROAD_C: Record<Road['cls'], string> = { major: '#585f6b', street: '#6b7280', minor: '#8a8f98', path: '#c9b99a', rail: '#7d6e63' };
let tileTemplate: Promise<string> | null = null;
async function defaultFetch(z: number, x: number, y: number): Promise<ArrayBuffer | null> {
  tileTemplate ??= fetch(TILEJSON_URL).then(r => r.json()).then((j: { tiles: string[] }) => j.tiles[0]);
  const url = (await tileTemplate).replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
  const r = await fetch(url); return r.ok ? r.arrayBuffer() : null;
}

export async function mountRealWorld(d: RealDeps): Promise<RealHandle> {
  const canvas = document.createElement('canvas'); canvas.className = 'realCanvas'; d.host.appendChild(canvas);
  let renderer: ReturnType<NonNullable<RealDeps['rendererFactory']>>;
  try { renderer = d.rendererFactory ? d.rendererFactory(canvas) : new THREE.WebGLRenderer({ canvas, antialias: true }); }
  catch { canvas.remove(); d.onFail('3D is not available on this device.'); throw new Error('no webgl'); }
  renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1)); renderer.shadowMap.enabled = false;
  const size = (): void => { const r = d.host.getBoundingClientRect(); const w = Math.max(320, r.width || 960), h = Math.max(240, r.height || 600); renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#c4ddf0'); scene.fog = new THREE.FogExp2('#c4ddf0', 0.0008);
  const camera = new THREE.PerspectiveCamera(50, 1.6, 1, 3000); camera.position.set(60, 90, 120);
  scene.add(new THREE.HemisphereLight('#e8f0ff', '#b8a680', 1.1)); const sun = new THREE.DirectionalLight('#fff3d8', 1.2); sun.position.set(300, 500, 200); scene.add(sun);
  const fill = new THREE.DirectionalLight('#b0c8e8', 0.3); fill.position.set(-200, 200, -300); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.MeshStandardMaterial({ color: '#e7e1d3', roughness: 1 })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.maxPolarAngle = 1.35; controls.minDistance = 20; controls.maxDistance = 900;
  size();

  /* ----- the player ----- */
  const me = buildCharacter(normalizeLook(d.s.look), d.s.worn ?? {}, 'full'); me.root.scale.setScalar(2.2); scene.add(me.root);
  let pos: XZ = { x: 0, z: 0 }, walk: XZ[] = [], target: Poi | null = null;
  const ringGeo = new THREE.RingGeometry(3, 4.2, 32), ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#1f4fa8' })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.3; scene.add(ring);

  /* ----- the map, a chunk (tile) at a time ----- */
  const fetchTile = d.fetchTile ?? defaultFetch;
  const chunks = new Map<string, { data: Chunk; group: THREE.Group }>(), loading = new Set<string>();
  const poiMeta: Poi[] = []; let pinMesh: THREE.InstancedMesh | null = null, graph: Graph | null = null, labels: THREE.Sprite[] = [], poiModels: THREE.Group[] = [];
  const buildPoiModel = (p: Poi): THREE.Group | null => {
    const g = new THREE.Group(); g.name = 'poi3d';
    const mat = (hex: string): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5 });
    switch (p.kind) {
      case 'metro': {
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(3, 3.2, 1.2, 16), mat('#d6332e')));
        g.children[0].position.y = 0.6;
        const roof = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#b8221e'));
        roof.position.y = 1.2; g.add(roof);
        const sp = sprite('M', '#d6332e', '#ffffff', 2); sp.position.y = 4.5; g.add(sp);
        break;
      }
      case 'church': {
        g.add(new THREE.Mesh(new THREE.BoxGeometry(5, 8, 5), mat('#e8dcc0')));
        g.children[0].position.y = 4;
        const dome = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), mat('#c9a24a'));
        dome.position.y = 9; g.add(dome);
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.5, 0.3), mat('#c9a24a'));
        cross.position.y = 12; g.add(cross);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.3), mat('#c9a24a'));
        bar.position.y = 11.5; g.add(bar);
        break;
      }
      case 'mosque': {
        g.add(new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), mat('#e0ddd0')));
        g.children[0].position.y = 3;
        const dome = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), mat('#2a9d8f'));
        dome.position.y = 7; g.add(dome);
        const minaret = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 12, 8), mat('#e0ddd0'));
        minaret.position.set(4.5, 6, 0); g.add(minaret);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(1, 2, 8), mat('#2a9d8f'));
        cap.position.set(4.5, 13, 0); g.add(cap);
        break;
      }
      case 'gov': {
        g.add(new THREE.Mesh(new THREE.BoxGeometry(7, 7, 5), mat('#c8ccd8')));
        g.children[0].position.y = 3.5;
        for (let i = -2; i <= 2; i += 2) {
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 7, 8), mat('#d0d4dc'));
          col.position.set(i, 3.5, 2.8); g.add(col);
        }
        const pediment = new THREE.Mesh(new THREE.ConeGeometry(4.5, 2, 3), mat('#d0d4dc'));
        pediment.rotation.y = Math.PI; pediment.scale.set(1, 1, 0.3); pediment.position.y = 8.5; g.add(pediment);
        break;
      }
      case 'bank': {
        g.add(new THREE.Mesh(new THREE.BoxGeometry(5, 6, 4), mat('#0f766e')));
        g.children[0].position.y = 3;
        const sp = sprite('₽', '#0f766e', '#ffffff', 2.5); sp.position.y = 8; g.add(sp);
        break;
      }
      case 'uni': {
        g.add(new THREE.Mesh(new THREE.BoxGeometry(8, 8, 6), mat('#d5cdb8')));
        g.children[0].position.y = 4;
        const sp = sprite('🎓', '#7048c0', '#ffffff', 2.5); sp.position.y = 10; g.add(sp);
        break;
      }
      default: return null;
    }
    return g;
  };
  const facadeOf = (h: number): Facade => h <= 9 ? 'private' : h <= 15 ? 'khrush' : h <= 28 ? 'panel9' : h <= 50 ? 'panel16' : 'newbuild';
  const WALL_C: Record<Facade, string> = { private: '#ddd5c0', khrush: '#d4c9b0', panel9: '#c9c2b4', panel16: '#b8c4cf', newbuild: '#c4d2dc', stalinka: '#ddd0b6', prerev: '#d5c3b3', wooden: '#c4a86e', shop: '#d9d2c4' };
  const hashXZ = (x: number, z: number): number => { let h = 2166136261; h = Math.imul(h ^ (Math.round(x * 7) >>> 0), 16777619) >>> 0; h = Math.imul(h ^ (Math.round(z * 7) >>> 0), 16777619) >>> 0; return h; };
  const buildChunk = (c: Chunk): THREE.Group => {
    const g = new THREE.Group(); g.name = 'chunk:' + c.key;
    if (c.buildings.length) {
      const parts: THREE.BufferGeometry[] = [], roofParts: THREE.BufferGeometry[] = [];
      for (const b of c.buildings) {
        const h = b.h - b.base, cx = b.pts.reduce((s, p) => s + p.x, 0) / b.pts.length, cz = b.pts.reduce((s, p) => s + p.z, 0) / b.pts.length;
        const fc = facadeOf(h), wall = WALL_C[fc], pts2 = b.pts.map(p => [p.x, p.z] as [number, number]);
        const geo = extrudeOutline(pts2, h, wall, roofOf(wall, fc === 'private' || fc === 'khrush' ? 'house' : 'block'));
        geo.translate(0, b.base, 0); parts.push(geo);
        if ((fc === 'private' || fc === 'khrush') && h < 18) {
          const minX = Math.min(...b.pts.map(p => p.x)), maxX = Math.max(...b.pts.map(p => p.x));
          const minZ = Math.min(...b.pts.map(p => p.z)), maxZ = Math.max(...b.pts.map(p => p.z));
          const w = maxX - minX, d = maxZ - minZ, roofH = Math.min(3, Math.max(1.5, Math.min(w, d) * 0.25));
          const r = new THREE.ConeGeometry(Math.max(w, d) * 0.56, roofH, 4);
          r.rotateY(Math.PI / 4); r.translate(cx, b.h + roofH * 0.5, cz); roofParts.push(r);
        }
      }
      const merged = mergeGeometries(parts, false); parts.forEach(p => p.dispose());
      if (merged) { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }); paintWindows(m); g.add(new THREE.Mesh(merged, m)); }
      if (roofParts.length) {
        const rm = mergeGeometries(roofParts, false); roofParts.forEach(p => p.dispose());
        if (rm) g.add(new THREE.Mesh(rm, new THREE.MeshStandardMaterial({ color: '#b4553a', roughness: 0.9 })));
      }
    }
    for (const kind of ['water', 'park'] as const) {
      const shapes = c.areas.filter(a => a.kind === kind).map(a => new THREE.ShapeGeometry(new THREE.Shape(a.pts.map(p => new THREE.Vector2(p.x, -p.z)))));
      if (!shapes.length) continue; const merged = mergeGeometries(shapes, false); shapes.forEach(s => s.dispose()); if (!merged) continue;
      merged.rotateX(-Math.PI / 2); const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ color: kind === 'water' ? '#5aa5df' : '#8fcf7a', roughness: 1 })); mesh.position.y = kind === 'water' ? 0.05 : 0.04; g.add(mesh);
      if (kind === 'park') {
        const treeParts: THREE.BufferGeometry[] = [], trunkParts: THREE.BufferGeometry[] = [];
        for (const a of c.areas.filter(x => x.kind === 'park')) {
          const minX = Math.min(...a.pts.map(p => p.x)), maxX = Math.max(...a.pts.map(p => p.x));
          const minZ = Math.min(...a.pts.map(p => p.z)), maxZ = Math.max(...a.pts.map(p => p.z));
          const area = (maxX - minX) * (maxZ - minZ), count = Math.min(60, Math.max(2, Math.floor(area / 200)));
          for (let i = 0; i < count; i++) {
            const seed = hashXZ(minX + i * 13.7, minZ + i * 7.3);
            const tx = minX + ((seed & 0xfff) / 0xfff) * (maxX - minX), tz = minZ + (((seed >> 12) & 0xfff) / 0xfff) * (maxZ - minZ);
            const th = 4 + ((seed >> 24) & 7); const tr = 1.8 + ((seed >> 8) & 3) * 0.4;
            const crown = new THREE.ConeGeometry(tr, th * 0.6, 6); crown.translate(tx, th * 0.8, tz); treeParts.push(crown);
            const trunk = new THREE.CylinderGeometry(0.3, 0.4, th * 0.5, 5); trunk.translate(tx, th * 0.25, tz); trunkParts.push(trunk);
          }
        }
        if (treeParts.length) { const tm = mergeGeometries(treeParts, false); treeParts.forEach(t => t.dispose()); if (tm) g.add(new THREE.Mesh(tm, new THREE.MeshStandardMaterial({ color: '#5a9a4a', roughness: 1 }))); }
        if (trunkParts.length) { const tm = mergeGeometries(trunkParts, false); trunkParts.forEach(t => t.dispose()); if (tm) g.add(new THREE.Mesh(tm, new THREE.MeshStandardMaterial({ color: '#7a5c3a', roughness: 1 }))); }
      }
    }
    for (const cls of Object.keys(ROAD_W) as Road['cls'][]) {
      const quads: THREE.BufferGeometry[] = [], sideQuads: THREE.BufferGeometry[] = [];
      for (const r of c.roads) if (r.cls === cls) for (let i = 1; i < r.pts.length; i++) {
        const a = r.pts[i - 1], b = r.pts[i], len = Math.hypot(b.x - a.x, b.z - a.z); if (len < 0.1) continue;
        const angle = -Math.atan2(b.z - a.z, b.x - a.x), mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
        const q = new THREE.PlaneGeometry(len + ROAD_W[cls] * 0.5, ROAD_W[cls]); q.rotateX(-Math.PI / 2); q.rotateY(angle); q.translate(mx, 0, mz); quads.push(q);
        if (cls === 'major' || cls === 'street') {
          const sw = ROAD_W[cls] * 0.5 + 1.5, nx = Math.sin(angle), nz = Math.cos(angle);
          for (const side of [-1, 1]) {
            const sq = new THREE.PlaneGeometry(len + 2, 1.8); sq.rotateX(-Math.PI / 2); sq.rotateY(angle); sq.translate(mx + nx * sw * side, 0, mz + nz * sw * side); sideQuads.push(sq);
          }
        }
      }
      if (quads.length) { const merged = mergeGeometries(quads, false); quads.forEach(q => q.dispose()); if (merged) { const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ color: ROAD_C[cls], roughness: 1 })); mesh.position.y = cls === 'path' ? 0.08 : 0.1 + (cls === 'major' ? 0.02 : 0); g.add(mesh); } }
      if (sideQuads.length) { const merged = mergeGeometries(sideQuads, false); sideQuads.forEach(q => q.dispose()); if (merged) { const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ color: '#d0cbc0', roughness: 1 })); mesh.position.y = 0.07; g.add(mesh); } }
    }
    return g;
  };
  const disposeGroup = (g: THREE.Object3D): void => g.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; if (Array.isArray(mt)) mt.forEach(x => x.dispose()); else mt?.dispose(); if (o instanceof THREE.Sprite) { o.material.map?.dispose(); o.material.dispose(); } });
  const rebuildIndex = (): void => {
    poiMeta.length = 0; const roads: Road[] = [];
    for (const { data } of chunks.values()) { poiMeta.push(...data.pois); roads.push(...data.roads); }
    graph = roads.length ? buildGraph(roads) : null;
    if (pinMesh) { scene.remove(pinMesh); pinMesh.geometry.dispose(); (pinMesh.material as THREE.Material).dispose(); pinMesh = null; }
    for (const m of poiModels) { scene.remove(m); m.traverse(o => { const x = o as THREE.Mesh; x.geometry?.dispose(); const mt = x.material; if (Array.isArray(mt)) mt.forEach(y => y.dispose()); else (mt as THREE.Material)?.dispose(); }); }
    poiModels = [];
    if (poiMeta.length) {
      const geo = new THREE.CylinderGeometry(1.6, 0.4, 7, 8); geo.translate(0, 3.5, 0);
      pinMesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.6 }), poiMeta.length); pinMesh.name = 'pois';
      const m4 = new THREE.Matrix4(), col = new THREE.Color();
      poiMeta.forEach((p, i) => { const big = p.kind === 'metro' || p.kind === 'church' || p.kind === 'mosque' || p.kind === 'gov'; m4.makeScale(big ? 1.6 : 1, big ? 1.8 : 1, big ? 1.6 : 1); m4.setPosition(p.at.x, 0, p.at.z); pinMesh!.setMatrixAt(i, m4); pinMesh!.setColorAt(i, col.set(KIND[p.kind].color)); });
      scene.add(pinMesh);
      const near = poiMeta.filter(p => Math.hypot(p.at.x - pos.x, p.at.z - pos.z) < 500);
      for (const p of near.slice(0, 80)) {
        const model = buildPoiModel(p);
        if (model) { model.position.set(p.at.x, 0, p.at.z); model.userData.poi = p.id; scene.add(model); poiModels.push(model); }
      }
    }
    refreshLabels(); d.onData?.();
  };
  /** Names over the nearest important places (at most 30, so the view stays clear). */
  const refreshLabels = (): void => {
    labels.forEach(l => { scene.remove(l); l.material.map?.dispose(); l.material.dispose(); }); labels = [];
    const ru = /ru/i.test(document.documentElement.lang || '');
    const near = poiMeta.filter(p => p.kind !== 'transport' && p.kind !== 'other').map(p => ({ p, d: Math.hypot(p.at.x - pos.x, p.at.z - pos.z) })).filter(x => x.d < 450).sort((a, b) => a.d - b.d).slice(0, 30);
    for (const { p } of near) { const sp = sprite(`${KIND[p.kind].icon} ${ru ? p.name : p.nameEn ?? p.name}`, '#ffffffee', '#16203a', 1.4); sp.position.set(p.at.x, 13, p.at.z); sp.scale.multiplyScalar(4); sp.userData.poi = p.id; scene.add(sp); labels.push(sp); }
  };
  const ensureTiles = async (): Promise<void> => {
    const here = toLL(d.origin, pos), want = tilesAround(here, 1, ZOOM), keys = new Set(want.map(t => `${ZOOM}/${t.x}/${t.y}`));
    let changed = false;
    for (const [k, v] of chunks) if (!keys.has(k)) { const c = tileOfLL(here); const [, x, y] = k.split('/').map(Number); if (Math.abs(x - c.x) > 2 || Math.abs(y - c.y) > 2) { scene.remove(v.group); disposeGroup(v.group); chunks.delete(k); changed = true; } }
    await Promise.all(want.map(async t => {
      const k = `${ZOOM}/${t.x}/${t.y}`; if (chunks.has(k) || loading.has(k)) return; loading.add(k);
      try { const buf = await fetchTile(ZOOM, t.x, t.y); if (!buf || dead) return; const data = readTile(buf, ZOOM, t.x, t.y, d.origin); const group = buildChunk(data); scene.add(group); chunks.set(k, { data, group }); changed = true; }
      catch (e) { d.onFail(String((e as Error)?.message ?? e)); }
      finally { loading.delete(k); }
    }));
    if (changed && !dead) rebuildIndex();
  };

  /* ----- route line ----- */
  let routeMesh: THREE.Mesh | null = null;
  const drawRoute = (pts: XZ[]): void => {
    if (routeMesh) { scene.remove(routeMesh); routeMesh.geometry.dispose(); (routeMesh.material as THREE.Material).dispose(); routeMesh = null; }
    if (pts.length < 2) return;
    const quads: THREE.BufferGeometry[] = [];
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], len = Math.hypot(b.x - a.x, b.z - a.z); if (len < 0.1) continue; const q = new THREE.PlaneGeometry(len + 2, 3); q.rotateX(-Math.PI / 2); q.rotateY(-Math.atan2(b.z - a.z, b.x - a.x)); q.translate((a.x + b.x) / 2, 0, (a.z + b.z) / 2); quads.push(q); }
    const merged = mergeGeometries(quads, false); quads.forEach(q => q.dispose()); if (!merged) return;
    routeMesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ color: '#2f7cf6', transparent: true, opacity: 0.85 })); routeMesh.position.y = 0.25; routeMesh.name = 'route'; scene.add(routeMesh);
  };

  /* ----- walking and the camera ----- */
  const SPEED = 14;                     // metres a second: a brisk game walk, so a kilometre takes about a minute
  let dead = false, lastTileCheck = 0, labelAt: XZ = { x: 0, z: 0 }, phase = 0, clock = 0;
  const tick = (dt: number): void => {
    clock += dt; phase += dt * 9;
    if (walk.length) {
      const next = walk[0], dx = next.x - pos.x, dz = next.z - pos.z, dist = Math.hypot(dx, dz), step = SPEED * dt;
      if (dist <= step) { pos = { ...next }; walk.shift(); if (!walk.length) { setPose(me, 'idle', 0, clock); drawRoute([]); d.onArrive(target); } }
      else { pos = { x: pos.x + (dx / dist) * step, z: pos.z + (dz / dist) * step }; me.root.rotation.y = Math.atan2(dx, dz); }
      setPose(me, walk.length ? 'walk' : 'idle', phase, clock);
    }
    me.root.position.set(pos.x, 0, pos.z); ring.position.set(pos.x, 0.3, pos.z);
    const off = camera.position.clone().sub(controls.target); controls.target.set(pos.x, 2, pos.z); camera.position.copy(controls.target).add(off);
    controls.update();
    lastTileCheck += dt; if (lastTileCheck > 1.5) { lastTileCheck = 0; void ensureTiles(); }
    if (Math.hypot(pos.x - labelAt.x, pos.z - labelAt.z) > 120) { labelAt = { ...pos }; refreshLabels(); }
    renderer.render(scene, camera);
  };
  let raf = 0, last = performance.now();
  const loop = (): void => { if (dead) return; const now = performance.now(); tick(Math.min(0.1, (now - last) / 1000)); last = now; raf = requestAnimationFrame(loop); };
  if (!d.rendererFactory) raf = requestAnimationFrame(loop);

  /* ----- picking ----- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = (cx: number, cy: number): Poi | null => {
    const r = renderer.domElement.getBoundingClientRect(); ndc.set(((cx - r.left) / (r.width || 1)) * 2 - 1, -(((cy - r.top) / (r.height || 1)) * 2 - 1)); ray.setFromCamera(ndc, camera);
    for (const h of ray.intersectObjects([...(pinMesh ? [pinMesh] : []), ...labels], false)) {
      if (h.object === pinMesh && h.instanceId !== undefined) return poiMeta[h.instanceId] ?? null;
      const id = h.object.userData.poi as string | undefined; if (id) return poiMeta.find(p => p.id === id) ?? null;
    }
    return null;
  };
  let downAt: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent): void => { downAt = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: PointerEvent): void => { if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return; downAt = null; const p = pick(e.clientX, e.clientY); if (p) d.onPoi(p); };
  renderer.domElement.addEventListener('pointerdown', onDown); renderer.domElement.addEventListener('pointerup', onUp);
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(size) : null; ro?.observe(d.host);

  const goTo = (p: Poi): { ok: boolean; path: number[] } => {
    if (!graph) return { ok: false, path: [] };
    const path = route(graph, pos, p.at); if (!path.length) return { ok: false, path };
    const g = graph; walk = [...path.map(i => g.nodes[i]), p.at]; target = p; drawRoute([pos, ...walk]); setPose(me, 'walk', 0, clock);
    return { ok: true, path };
  };
  await ensureTiles();
  return {
    destroy: () => { dead = true; cancelAnimationFrame(raf); ro?.disconnect(); controls.dispose(); renderer.domElement.removeEventListener('pointerdown', onDown); renderer.domElement.removeEventListener('pointerup', onUp);
      for (const v of chunks.values()) disposeGroup(v.group); chunks.clear(); if (pinMesh) disposeGroup(pinMesh); labels.forEach(l => disposeGroup(l)); poiModels.forEach(m => disposeGroup(m)); poiModels = []; drawRoute([]); disposeGroup(ground); ringGeo.dispose(); renderer.dispose(); canvas.remove(); },
    goTo, pois: () => poiMeta.slice(), graph: () => graph, player: () => ({ ...pos }),
    skip: () => { if (!walk.length) return; pos = { ...walk[walk.length - 1] }; walk = []; drawRoute([]); setPose(me, 'idle', 0, clock); d.onArrive(target); },
    tick, scene, pick, chunks: () => chunks.size,
  };
}
