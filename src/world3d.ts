/* The 3D world: the player's city as a small 3D scene with buildings, roads, trees, weather and time of day, and people who walk the roads,
   stop to talk and answer when clicked. The player walks to a place when they travel there.
   What people do is decided in world-logic.ts and how they look is built in characters3d.ts; this file draws the scene and connects it to the page.
   It is loaded only when the 3D view is opened (a separate download). If the browser cannot do 3D, it reports that and the flat map stays. */
import * as THREE from 'three';
import { placeL } from './i18n-words';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as G from './engine';
import type { State } from './engine';
import { crowdFor, treeSpots, PLACE_LOOK } from './city';
import type { Npc } from './city';
import { buildCharacter, buildRiggedCharacter, setPose, disposeCharacterMaterials } from './characters3d';
import type { Pose } from './characters3d';
import { warmthMeter } from './warmth';
import { seasonLook } from './season3d';
import type { SeasonLook } from './season3d';
import { activeEvent } from './events';
import type { Character } from './characters3d';
import { toWorld, standPoint, HUB, newAgent, sendTo, stepAgent, pairTalk, separate, seeded, PLAYER_SPEED, WORLD, steer, placeNear, mustWait } from './world-logic';
import type { Agent } from './world-logic';
import { normalizeLook } from './avatar';
import { sprite, pinSprite } from './sprites3d';
import { buildScenery, extrudeOutline, paintWindows, paintFacade } from './scenery3d';
import type { Facade } from './scenery3d';
import { dwellingOf, homeInfo, addressOf } from './homes';
import type { Building } from './homes';
import { plateOf } from './address';
import { lang } from './i18n';
import { nearestOnPolygon } from './osm';
import type { RealCity, RealBuilding } from './osm';
import { statusFor } from './billboards';
import { levelFor } from './traffic';
import { footRoute, newVehicles, stepVehicle, poseOf, streetDistance, STREET_HALF, onRoadway } from './street';
import type { Vehicle } from './street';
import { buildStreets, vehicleParts } from './streets3d';
import { clearLine } from './collide';
import { Field } from './collide';
import { buildSite, disposeSite, SITE_W, SITE_D } from './site3d';
import type { Nav } from './world-logic';
import { fillerFor, billboardSpots, waterRects } from './city-geo';
import { interiorFor, doorOf, findPath, wanderSpot, seatsOf, nearestFree, useSpot } from './interiors';
import { homeInterior, furnById, canPlace, sizeOf, centreOf, gridOf } from './furniture';
import type { P2 } from './interiors';
import { buildRoom } from './rooms3d';
import { roomL } from './i18n-rooms';
import type { RoomHandle } from './rooms3d';

import { getTestRendererFactory } from './world3d-support';
export { supportsWebGL } from './world3d-support';

export interface World3dDeps {
  host: HTMLElement; s: State;
  onPlace: (id: string) => void; onNpc: (id: string) => void; onFail: (message: string) => void;
  /** The player used something inside a room (a game action, or 'wardrobe' / 'phone'). */
  onAction?: (action: string) => void;
  /** The device drew the world too slowly, so saver mode was switched on by itself. */
  onSaver?: () => void;
  /** The pointer is over a thing that can be used in a room (its words), or over nothing (null). */
  onHover?: (label: string | null) => void;
  /** Furnishing the flat: a piece was put down, a piece was picked up, or a piece does not fit (with the reason). */
  onFurnish?: (id: string, i: number, j: number, rot: 0 | 1) => void;
  onPickUp?: (uid: number) => void;
  onFurnishFail?: (why: string) => void;
  /** The player clicked one of the city's famous sights (round 151). */
  onLandmark?: (id: string) => void;
  /** Lets a test supply a stand-in for the graphics card. */
  rendererFactory?: (canvas: HTMLCanvasElement) => Pick<THREE.WebGLRenderer, 'setSize' | 'setPixelRatio' | 'render' | 'dispose' | 'domElement' | 'shadowMap'>;
}
export interface World3dHandle {
  update: (s: State) => void; destroy: () => void;
  /** Advances the world by `dt` seconds (the page does this by itself; tests call it by hand). */
  tick: (dt: number) => void;
  scene: THREE.Scene; camera: THREE.PerspectiveCamera;
  /** What is under a point of the screen (client pixels). */
  pick: (clientX: number, clientY: number) => { kind: 'place' | 'npc' | 'prop' | 'furn' | 'landmark' | 'none'; id?: string };
  /** Goes inside the place the player is at. False if that place has no inside (or the player is on the way). */
  enter: (placeId?: string) => boolean;
  leave: () => void;
  inside: () => string | null;
  /** The things in the room that can be used, by action. */
  roomActions: () => string[];
  /** Buy mode in the flat: pieces can be picked up by a click, and a piece being placed follows the pointer over the floor. */
  setFurnish: (on: boolean) => void;
  setPlacing: (id: string | null) => void;
  rotatePlacing: () => void;
  placing: () => { id: string; rot: 0 | 1; i: number; j: number; ok: boolean } | null;
  /** The words of the thing under a point of the screen, in a room (null when there is none). */
  labelAt: (clientX: number, clientY: number) => string | null;
  /** Plays a short animation of the player in the room (washing up, talking, sitting), for `secs` seconds; false if the player is not in a room. */
  playPose: (mode: Pose, secs: number) => boolean;
  /** Walks the player by hand: x to the right of the screen, z away from the viewer (both -1 to 1); null stops. Cars are waited for at the kerb. */
  walk: (dir: { x: number; z: number } | null) => void;
  /** The door the player stands at (null when none), and whether they are waiting at the kerb for a car to pass. */
  walkInfo: () => { near: string | null; waiting: boolean };
  /** The free camera of photo mode: it can be dragged sideways, brought close and lowered nearly to the ground, and stops following the player. */
  setFreeCam: (on: boolean) => void;
  /** What the season and the holiday look like now (for tests and the screen). */
  seasonInfo: () => { season: string; aurora: boolean; whiteNight: boolean; decor: string; fireworks: boolean };
  /** Draws at most this many frames a second (30 or 60; 0 for no limit). */
  setFpsCap: (fps: number) => void;
  /** The player makes a gesture (wave, laugh, dance...) for a few seconds, in the street or in a room. */
  emote: (mode: Pose, secs?: number) => void;
  /** A picture of the view as it is now (a PNG data address), or null if the browser refuses. */
  snapshot: () => string | null;
  /** Turns the camera a quarter round the player (or the room). */
  rotateView: (dir?: 1 | -1) => void;
  /** Is a person of this size touching a solid thing (a house, a tree, a board, the water) at this point of the city? */
  blockedAt: (x: number, z: number, r?: number) => boolean;
  /** Shows the plot of the house the player is building at its stage (null removes it). */
  setBuild: (v: { done: number; working: boolean } | null) => void;
  /** Where the plot is (null when there is none). */
  buildSpot: () => { x: number; z: number } | null;
  /** How many solid things the city has. */
  solids: () => number;
  /** Draws the flat again from the game state (after something was bought, placed or picked up). */
  refreshRoom: () => void;
  /** Moves the piece being placed to the floor point under the pointer (client pixels). */
  hoverFloor: (clientX: number, clientY: number) => void;
  /** Shows or hides the name tags and the notice boards. */
  setLayer: (name: 'names' | 'boards' | 'traffic', on: boolean) => void;
  /** The cars on the roads now: how many, and how slowly they go (1 is free-flowing). */
  traffic: () => { count: number; factor: number; jam: boolean };
  /** Every car and bicycle: what it is, where it is, which way it faces and how long it has been standing behind something. */
  vehicles: () => { kind: 'car' | 'bike'; x: number; z: number; heading: number; halt: number }[];
  /** Pulls the camera up to look over the whole city (the Map button), or back down to the player. */
  setOverview: (on: boolean) => void;
  /** Saver mode: no shadows, a smaller picture and no rain or snow, for slow devices. */
  setSaver: (on: boolean) => void;
  saver: () => boolean;
  /** The measured frames per second (0 until measured). */
  fps: () => number;
  /** Puts real houses (from the map) into the city in place of the invented ones; null brings the invented ones back. */
  setRealBuildings: (city: RealCity | null) => void;
  /** The places that stand on a real building now. */
  anchoredPlaces: () => string[];
  realBuildings: () => number;
  /** What the other people in the room are doing (for tests and for the page's descriptions). */
  dwellers: () => { sitting: boolean; talking: boolean; x: number; z: number }[];
  /** Where a point of the world appears on the screen, in client pixels. */
  project: (x: number, y: number, z: number) => { x: number; y: number };
  people: () => { id: string; x: number; z: number; state: string; place: string }[];
  /** The chip over the player's head (null when all is well). */
  status: () => string | null;
  player: () => { x: number; z: number; state: string; node: string };
}

const DAY = [{ sky: '#bfe3ff', sun: 1.0, hemi: 0.9, color: '#fff6e0' }, { sky: '#a9d8ff', sun: 1.1, hemi: 1.0, color: '#ffffff' }, { sky: '#3a4a7a', sun: 0.45, hemi: 0.55, color: '#ffb877' }];

/* ---------- small drawing helpers ---------- */
function windowTexture(): THREE.CanvasTexture | null {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d'); if (!ctx) return null;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#7fa9d6';
  for (const [x, y] of [[8, 10], [36, 10], [8, 38], [36, 38]]) ctx.fillRect(x, y, 20, 16);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const shade = (hex: string, amt: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number): number => Math.max(0, Math.min(255, v + amt));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('');
};

interface Person { agent: Agent; char: Character; tag: THREE.Sprite; bubble: THREE.Sprite | null; bubbleText: string; npc?: Npc }

export async function mountWorld3d(d: World3dDeps): Promise<World3dHandle> {
  const canvas = document.createElement('canvas');
  canvas.className = 'world3dCanvas';
  let renderer: ReturnType<NonNullable<World3dDeps['rendererFactory']>>;
  const factory = d.rendererFactory ?? getTestRendererFactory();
  try { renderer = factory ? (factory(canvas) as typeof renderer) : new THREE.WebGLRenderer({ canvas, antialias: true }); }
  catch (e) { const m = String((e as Error)?.message || '3D is not available in this browser.'); d.onFail(m); throw e; }
  d.host.appendChild(renderer.domElement);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const lowPower = (navigator.hardwareConcurrency || 4) <= 2;
  if (!lowPower && renderer.shadowMap) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(DAY[0].sky);
  scene.fog = new THREE.Fog(DAY[0].sky, 200, 420);
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 1, 900);
  const hemi = new THREE.HemisphereLight('#ffffff', '#7a9a6a', 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff6e0', 1.0);
  sun.position.set(60, 90, 40); sun.castShadow = !lowPower;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 10, far: 260 });
  scene.add(sun);

  const owned: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(o: T): T => { owned.push(o); return o; };

  /* ----- ground, river, roads ----- */
  const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(520, 520)), track(new THREE.MeshStandardMaterial({ color: '#8fcf7a', roughness: 1 })));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const field = new THREE.Mesh(track(new THREE.PlaneGeometry(WORLD * 100 + 24, WORLD * 100 + 24)), track(new THREE.MeshStandardMaterial({ color: '#7fbf6a', roughness: 1 })));
  field.rotation.x = -Math.PI / 2; field.position.y = 0.01; field.receiveShadow = true; scene.add(field);
  buildStreets(scene, track);                                  // pavements, cycle strips, lanes and the roundabout (see street.ts)

  /* ----- buildings (each is a group that knows which place it is) ----- */
  const winTex = windowTexture(); if (winTex) track(winTex);
  const buildings: THREE.Group[] = [];
  /** The house the player lives in (round 151): its kind (khrushchyovka, panel block, stalinka, new tower, old house, dormitory, izba, cottage), its height and colour. */
  const HOME_FACADE: Record<Building, Facade> = { khrush: 'khrush', panel9: 'panel9', panel16: 'panel16', stalinka: 'stalinka', newbuild: 'newbuild', prerev: 'prerev', dorm: 'panel9', izba: 'wooden', cottage: 'private' };
  const HOME_WALL: Record<Building, string> = { khrush: '#d4b49a', panel9: '#d8d8d2', panel16: '#e6e6e0', stalinka: '#e3c89a', newbuild: '#d5dde6', prerev: '#e8c87a', dorm: '#c9b8a0', izba: '#8a6a4a', cottage: '#e6dcc4' };
  const homeLook = (s: State): { facade: Facade; h: number; wall: string; floor: number; floors: number; key: string; plate: string } => {
    const b = homeInfo(dwellingOf(s)).series, a = addressOf(s), facade = HOME_FACADE[b], floors = Math.min(a.floors, facade === 'newbuild' ? 11 : 12);
    const storey = facade === 'stalinka' ? 3.4 : facade === 'prerev' ? 3.8 : facade === 'wooden' ? 3.2 : 2.8, h = Math.max(4.5, floors * storey);
    return { facade, h, wall: HOME_WALL[b], floor: Math.min(a.floor, floors), floors, key: dwellingOf(s) + '|' + s.city, plate: plateOf(a, lang() === 'ru') };
  };
  for (const p of G.PLACES) {
    const look = PLACE_LOOK[p.id] ?? { icon: '📍', color: '#6b7bd6', h: 8, flavour: '' };
    const hl = p.id === 'home' ? homeLook(d.s) : null;
    const c = toWorld(p), h = hl ? hl.h : look.h * 0.75 + 3;
    const g = new THREE.Group(); g.position.set(c.x, 0, c.z); g.userData.place = p.id;
    const wallMat = track(new THREE.MeshStandardMaterial({ color: hl ? hl.wall : shade(look.color, 70), roughness: 0.9, map: hl ? undefined : winTex ?? undefined }));
    if (hl) g.userData.facade = paintFacade(wallMat, { facade: hl.facade, top: h });
    if (winTex) { /* the window pattern repeats once per storey */ }
    const roofMat = track(new THREE.MeshStandardMaterial({ color: look.color, roughness: 0.8 }));
    const bodyGeo = track(new THREE.BoxGeometry(10, h, 10));
    const body = new THREE.Mesh(bodyGeo, [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat]); body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; body.userData.place = p.id; g.add(body);
    const slab = new THREE.Mesh(track(new THREE.BoxGeometry(11, 0.6, 11)), roofMat); slab.position.y = h + 0.35; slab.castShadow = true; slab.userData.place = p.id; g.add(slab);
    // the door faces the road
    const toHub = { x: HUB.x - c.x, z: HUB.z - c.z };
    const alongX = Math.abs(toHub.x) > Math.abs(toHub.z) && p.id !== 'home';
    const sx = alongX ? Math.sign(toHub.x) : 0, sz = alongX ? 0 : (p.id === 'home' ? 1 : Math.sign(toHub.z) || 1);
    const door = new THREE.Mesh(track(new THREE.BoxGeometry(alongX ? 0.4 : 2.2, 3.4, alongX ? 2.2 : 0.4)), track(new THREE.MeshStandardMaterial({ color: '#5a3a24' })));
    door.position.set(sx * 5.1, 1.7, sz * 5.1); door.userData.place = p.id; g.add(door);
    const sign = sprite(placeL(p.n), '#ffffffee', '#16203a', 2.0); sign.position.set(0, h + 2.4, 0); sign.userData.place = p.id; g.add(sign);
    const pin = pinSprite(look.icon, look.color, 4.2); pin.position.set(0, h + 5.4, 0); pin.userData.place = p.id; g.add(pin);
    g.userData.parts = [body, slab, door]; g.userData.sign = sign; g.userData.pin = pin; g.userData.h = h; g.userData.look = look;
    if (hl) {                                                    // the blue address plate by the entrance and the player's own window, lit in the evening
      const plate = sprite(hl.plate, '#1f4fa8ee', '#ffffff', 1.0); plate.position.set(2.6, 3.4, 5.4); plate.name = 'address-plate'; plate.userData.place = 'home'; g.add(plate);
      const myWin = new THREE.Mesh(track(new THREE.PlaneGeometry(1.4, 1.2)), track(new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: new THREE.Color('#ffb84a'), emissiveIntensity: 0.2 })));
      myWin.position.set(-2.2, (hl.floor - 0.5) * (h / hl.floors), 5.06); myWin.name = 'my-window'; myWin.userData.place = 'home'; g.add(myWin);
      const canopy = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 0.2, 1.4)), track(new THREE.MeshStandardMaterial({ color: '#8a8f99' }))); canopy.position.set(0, 3.6, 5.6); canopy.userData.place = 'home'; g.add(canopy);
      g.userData.homeKey = hl.key; g.userData.myWin = myWin; g.userData.plate = plate;
    }
    scene.add(g); buildings.push(g);
  }

  /** After a move (another kind of home, another flat) the house is redrawn: height, facade, plate, the lit window (round 151). In the evening the window glows. */
  const refreshHome = (s: State): void => {
    const g = buildings.find(b => b.userData.place === 'home'); if (!g) return;
    const win = g.userData.myWin as THREE.Mesh | undefined; if (win) (win.material as THREE.MeshStandardMaterial).emissiveIntensity = s.slot === 2 ? 1.6 : 0.2;
    const hl = homeLook(s); if (hl.key === g.userData.homeKey) return;
    const body = g.children[0] as THREE.Mesh, slab = g.children[1] as THREE.Mesh, h = hl.h;
    body.geometry.dispose(); body.geometry = new THREE.BoxGeometry(10, h, 10); body.position.y = h / 2; slab.position.y = h + 0.35;
    const mats = body.material as THREE.MeshStandardMaterial[]; mats[0].color.set(hl.wall); (g.userData.facade as { set: (f: Facade, t: number) => void } | undefined)?.set(hl.facade, h);
    (g.userData.sign as THREE.Sprite).position.y = h + 2.4; (g.userData.pin as THREE.Sprite).position.y = h + 5.4; g.userData.h = h;
    if (win) win.position.y = (hl.floor - 0.5) * (h / hl.floors);
    const old = g.userData.plate as THREE.Sprite | undefined; if (old) { g.remove(old); old.material.map?.dispose(); old.material.dispose(); }
    const plate = sprite(hl.plate, '#1f4fa8ee', '#ffffff', 1.0); plate.position.set(2.6, 3.4, 5.4); plate.name = 'address-plate'; plate.userData.place = 'home'; g.add(plate); g.userData.plate = plate;
    g.userData.homeKey = hl.key;
  };

  /* ----- trees ----- */
  const spots = treeSpots();
  const trunks = new THREE.InstancedMesh(track(new THREE.CylinderGeometry(0.35, 0.45, 2, 6)), track(new THREE.MeshStandardMaterial({ color: '#7a5a3a' })), spots.length);
  const crowns = new THREE.InstancedMesh(track(new THREE.ConeGeometry(2.3, 5.2, 7)), track(new THREE.MeshStandardMaterial({ color: '#3c8f4a', flatShading: true })), spots.length);
  const m4 = new THREE.Matrix4();
  spots.forEach(([x, y], i) => { const w = toWorld({ x, y }); m4.makeTranslation(w.x, 1, w.z); trunks.setMatrixAt(i, m4); m4.makeTranslation(w.x, 4.4, w.z); crowns.setMatrixAt(i, m4); });
  trunks.castShadow = crowns.castShadow = true; scene.add(trunks, crowns);

  /* ----- water, a bridge, ordinary buildings, parks and the notice boards ----- */
  const scenery = buildScenery(scene, track, d.s.city);
  for (const b of buildings) { const body = b.children[0] as THREE.Mesh; const hh = (body.geometry as THREE.BoxGeometry).parameters.height; scenery.decorate(b, b.userData.place as string, hh); if (b.userData.place === 'center') scenery.attachMega(b, hh + 0.6); }

  /* ----- places set on real buildings (when the real houses are on) ----- */
  const anchorObjs: { g: THREE.Group; objs: THREE.Object3D[]; hidden: THREE.Object3D[] }[] = [];
  const unanchor = (): void => {
    for (const a of anchorObjs) {
      a.objs.forEach(o => { a.g.remove(o); (o as THREE.Mesh).geometry?.dispose(); const m = (o as THREE.Mesh).material; if (m && !Array.isArray(m)) m.dispose(); });
      a.hidden.forEach(o => { o.visible = true; });
      const sign = a.g.userData.sign as THREE.Sprite, pin = a.g.userData.pin as THREE.Sprite; sign.position.set(0, (a.g.userData.h as number) + 2.4, 0); pin.position.set(0, (a.g.userData.h as number) + 5.4, 0);
    }
    anchorObjs.length = 0;
  };
  const anchorPlaces = (anchors: Record<string, RealBuilding> | null): void => {
    unanchor();
    if (!anchors) return;
    for (const g of buildings) {
      const id = g.userData.place as string, a = anchors[id]; if (!a) continue;
      const look = g.userData.look as { color: string }, h = g.userData.h as number, c = g.position;
      const local = a.pts.map((p): [number, number] => [p[0] - c.x, p[1] - c.z]);
      const hidden: THREE.Object3D[] = [...(g.userData.parts as THREE.Object3D[])];
      if (id === 'hospital' || id === 'clinic' || id === 'bank') hidden.push(...g.children.slice(4).filter(o => !(o instanceof THREE.Sprite)));
      hidden.forEach(o => { o.visible = false; });
      const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }); paintWindows(m);
      const body = new THREE.Mesh(extrudeOutline(local, h, shade(look.color, 70), look.color), m); body.castShadow = true; body.receiveShadow = true; body.userData.place = id; g.add(body);
      const sp = standPoint(id), q = nearestOnPolygon(a.pts, sp.x, sp.z), dx = sp.x - q.x, dz = sp.z - q.z, dl = Math.hypot(dx, dz) || 1;
      const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.4, 0.4), new THREE.MeshStandardMaterial({ color: '#5a3a24' }));
      door.position.set(q.x - c.x + (dx / dl) * 0.15, 1.7, q.z - c.z + (dz / dl) * 0.15); door.rotation.y = Math.atan2(dx, dz); door.userData.place = id; g.add(door);
      const cx = local.reduce((t, p) => t + p[0], 0) / local.length, cz = local.reduce((t, p) => t + p[1], 0) / local.length;
      (g.userData.sign as THREE.Sprite).position.set(cx, h + 2.4, cz); (g.userData.pin as THREE.Sprite).position.set(cx, h + 5.4, cz);
      anchorObjs.push({ g, objs: [body, door], hidden });
    }
  };

  /* ----- solid things: nobody walks through a house, a tree, a notice board or into the water ----- */
  const solid = new Field();
  let realCity: RealCity | null = null;
  let site: THREE.Group | null = null;
  const buildField = (): void => {
    solid.clear();
    if (site) solid.addRect(site.position.x, site.position.z, SITE_W / 2 + 0.8, SITE_D / 2 + 0.8);
    for (const g of buildings) { const a = realCity?.anchors[g.userData.place as string]; if (a) solid.addPoly(a.pts); else solid.addRect(g.position.x, g.position.z, 5.7, 5.7); }
    if (realCity && realCity.buildings.length) for (const b of realCity.buildings) solid.addPoly(b.pts);
    else for (const f of fillerFor(d.s.city)) solid.addRect(f.x, f.z, f.w / 2, f.d / 2);
    for (const [x, y] of treeSpots()) { const w = toWorld({ x, y }); solid.addCircle(w.x, w.z, 0.8); }
    for (const b of billboardSpots()) solid.addCircle(b.x, b.z, 0.9);
    for (const r of waterRects(d.s.city)) solid.addRect(r.x, r.z, r.w / 2, r.d / 2);
  };
  buildField();
  const nav: Nav = {
    slide: (from, to) => solid.slide(from, to, 0.4),
    // along the pavements; a stretch that something solid stands in (a real house, a building site) is walked round
    route: (from, placeId) => {
      const out: { x: number; z: number }[] = []; let cur = from;
      for (const p of footRoute(from, placeId, standPoint(placeId))) { const q = solid.free(p.x, p.z, 0.45); if (clearLine(solid, cur, q, 0.45)) out.push(q); else out.push(...solid.path(cur, q, 0.45)); cur = out[out.length - 1] ?? cur; }
      return out;
    },
  };
  const fixAgent = (a: Agent): void => { const p = solid.free(a.pos.x, a.pos.z, 0.4); a.pos = { x: p.x, z: p.z }; };
  const nearPerson = (x: number, z: number): boolean => Math.hypot(playerPerson.agent.pos.x - x, playerPerson.agent.pos.z - z) < 1.3 || people.some(p => Math.hypot(p.agent.pos.x - x, p.agent.pos.z - z) < 1.3);

  /* ----- the plot where the player builds their house ----- */
  const siteSpot = (): { x: number; z: number } => {
    const home = toWorld(G.placeById('home'));
    for (const [dx, dz] of [[-24, 8], [24, 10], [-26, -12], [0, 36], [32, -8], [-32, 26], [20, -24], [-40, 0]]) {
      const x = home.x + dx, z = home.z + dz;
      const free = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]].every(([a, b]) => !solid.blocked(x + a * (SITE_W / 2 + 1), z + b * (SITE_D / 2 + 1), 0.5));
      if (free && streetDistance({ x, z }) > STREET_HALF + 7) return { x, z };
    }
    return { x: home.x - 30, z: home.z + 30 };
  };
  const setBuild = (v: { done: number; working: boolean } | null): void => {
    if (site) { scene.remove(site); disposeSite(site); site = null; }
    if (v && v.done >= 1) { const sp = siteSpot(); site = buildSite(v.done, v.working); site.position.set(sp.x, 0, sp.z); scene.add(site); }
    buildField(); for (const p of people) fixAgent(p.agent); fixAgent(playerPerson.agent);
  };

  /* ----- cars and bicycles on the streets ----- */
  let clock = 0;
  let playerFx: { mode: Pose; until: number } | null = null;
  let steerDir: { x: number; z: number } | null = null, waiting = false, freeCam = false;
  let coldOut = (warmthMeter(d.s) ?? 100) < 30;
  const parts = vehicleParts(track);
  const carRng = seeded(d.s.day * 5 + 3);
  interface Ride { v: Vehicle; node: THREE.Group; rider?: ReturnType<typeof buildCharacter>; wheels?: THREE.Object3D[] }
  let cars: Ride[] = [], showTraffic = true, trafficKey = '', level = levelFor(d.s.slot, d.s.weather);
  const clearCars = (): void => { cars.forEach(c => scene.remove(c.node)); cars = []; };
  const buildCars = (): void => {
    clearCars(); level = levelFor(state.slot, state.weather, saver);
    const looks = crowdFor(state), cyclists = saver ? 2 : state.weather === 'snow' || state.weather === 'frost' ? 1 : 5;
    newVehicles(level.count, cyclists, carRng).forEach((v, i) => {
      let ride: Ride;
      if (v.kind === 'car') ride = { v, node: parts.car(v.color) };
      else { const bk = parts.bike(v.color), rider = buildCharacter(looks.length ? looks[i % looks.length].look : normalizeLook(undefined)); rider.root.position.set(0, 0.62, -0.3); bk.node.add(rider.root); ride = { v, node: bk.node, rider, wheels: bk.wheels }; }
      const p = poseOf(v); ride.node.position.set(p.x, 0, p.z); ride.node.rotation.y = p.heading; ride.node.userData.vehicle = v.kind; ride.node.visible = showTraffic; scene.add(ride.node); cars.push(ride);
    });
    trafficKey = `${state.slot}|${state.weather}|${saver}`;
  };
  const moveCars = (dt: number): void => {
    const list = cars.map(c => c.v), k = 1 - Math.exp(-dt * 9);
    for (const c of cars) {
      stepVehicle(c.v, dt, list, level.factor, carRng, nearPerson);
      // the model follows the vehicle smoothly, so a change of lane or a turn at a junction is a curve and not a jump
      const p = poseOf(c.v), n = c.node; n.position.x += (p.x - n.position.x) * k; n.position.z += (p.z - n.position.z) * k;
      let turn = p.heading - n.rotation.y; turn = Math.atan2(Math.sin(turn), Math.cos(turn)); n.rotation.y += turn * k;
      if (c.rider) {
        const moving = c.v.halt === 0 && c.v.wait === 0, ph = clock * 7; setPose(c.rider, 'sit', 0, clock);
        c.rider.torso.rotation.x = 0.35; c.rider.armL.rotation.x = c.rider.armR.rotation.x = -1.0; c.rider.elbowL.rotation.x = c.rider.elbowR.rotation.x = -0.25;
        if (moving) { c.rider.legL.rotation.x = -1.1 + Math.sin(ph) * 0.45; c.rider.legR.rotation.x = -1.1 - Math.sin(ph) * 0.45; c.rider.kneeL.rotation.x = 1.2 - Math.sin(ph) * 0.4; c.rider.kneeR.rotation.x = 1.2 + Math.sin(ph) * 0.4; c.wheels?.forEach(w => { w.rotation.x += dt * c.v.speed * 3; }); }
      }
    }
  };

  /* ----- weather ----- */
  const PARTS = 360;
  const partPos = new Float32Array(PARTS * 3);
  const rnd = seeded(7);
  for (let i = 0; i < PARTS; i++) { partPos[i * 3] = (rnd() - 0.5) * 120; partPos[i * 3 + 1] = rnd() * 50; partPos[i * 3 + 2] = (rnd() - 0.5) * 120; }
  const partGeo = track(new THREE.BufferGeometry()); partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
  const partMat = track(new THREE.PointsMaterial({ color: '#ffffff', size: 0.5, transparent: true, opacity: 0.85 }));
  const weather = new THREE.Points(partGeo, partMat); weather.visible = false; weather.frustumCulled = false; weather.name = 'rain'; weather.raycast = () => undefined; scene.add(weather);

  /* ----- people ----- */
  let state = d.s;
  let showNames = true, showBoards = true, saver = false, overview = false;
  const people: Person[] = [];
  const addTag = (p: Person, text: string, bg: string): void => { p.tag = sprite(text, bg, '#ffffff', 0.85); p.tag.position.set(0, 2.6, 0); p.char.root.add(p.tag); };
  const makePerson = (agent: Agent, look: unknown, worn: unknown, tagText: string, tagBg: string, npc?: Npc): Person => {
    const char = buildCharacter(look, worn as never, npc ? 'lite' : 'full');          // the player in full detail, passers-by lighter
    const p: Person = { agent, char, tag: undefined as unknown as THREE.Sprite, bubble: null, bubbleText: '', npc };
    addTag(p, tagText, tagBg);
    char.root.userData.npc = npc?.id;
    char.root.traverse(o => { o.userData.npc = npc?.id; });
    scene.add(char.root);
    return p;
  };
  const removePerson = (p: Person): void => { scene.remove(p.char.root); p.char.root.traverse(o => { if (o.userData.status && o instanceof THREE.Sprite) { o.material.map?.dispose(); o.material.dispose(); } }); p.tag.material.map?.dispose(); p.tag.material.dispose(); p.bubble?.material.map?.dispose(); p.bubble?.material.dispose(); };

  let playerPerson!: Person;
  let playerKey = '';
  let lastLoc = state.loc;
  let moment = -1;
  const rng = seeded(state.day * 7 + 1);

  // Swaps the player's procedural body for the real rigged mesh once it has loaded, carrying the name tag,
  // status chip and speech bubble over to the new root so nothing above this has to know it happened.
  let playerMeshGen = 0;
  const swapPlayerMesh = (next: Character): void => {
    const old = playerPerson.char, chip = old.root.children.find(c => c.userData.status);
    old.root.remove(playerPerson.tag); next.root.add(playerPerson.tag);
    if (chip) { old.root.remove(chip); next.root.add(chip); }
    if (playerPerson.bubble) { old.root.remove(playerPerson.bubble); next.root.add(playerPerson.bubble); }
    next.root.position.copy(old.root.position); next.root.rotation.copy(old.root.rotation); next.root.visible = old.root.visible;
    scene.remove(old.root); scene.add(next.root); playerPerson.char = next;
  };
  const buildPlayer = (): void => {
    const keep = playerPerson?.agent;
    if (playerPerson) removePerson(playerPerson);
    const agent = keep ?? newAgent('player', state.loc, rng, false);
    if (!keep) { const sp = standPoint(state.loc); agent.pos = { x: sp.x + 2.4, z: sp.z + 1.2 }; agent.speed = PLAYER_SPEED; fixAgent(agent); }
    playerPerson = makePerson(agent, normalizeLook(state.look), state.worn ?? {}, state.name.slice(0, 14), '#e0373f');
    const st = statusFor(state);
    if (st) { const chip = sprite(st.text, st.color, '#ffffff', 0.8); chip.position.set(0, 4.4, 0); chip.userData.status = true; playerPerson.char.root.add(chip); }
    playerKey = JSON.stringify([state.look, state.worn, statusFor(state)?.text]);
    // the rigged mesh has no clothing yet, so it only replaces the body; the procedural one stays as the
    // instant, always-available character while it loads (or forever, if the asset cannot be fetched)
    const gen = ++playerMeshGen;
    void buildRiggedCharacter(state.look).then(rigged => { if (rigged && gen === playerMeshGen) swapPlayerMesh(rigged); });
  };
  const buildCrowd = (): void => {
    people.forEach(removePerson); people.length = 0;
    for (const n of crowdFor(state)) {
      const a = newAgent(n.id, n.place, rng, true); fixAgent(a);
      people.push(makePerson(a, n.look, n.worn, n.handle, '#2f6fd6', n));
    }
  };
  const dateText = (): string => G.dateOf(state).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  /* ----- seasons and holidays: the colours of the ground and the trees, the White Nights, the northern lights, the tree and the fireworks ----- */
  const groundMat = ground.material as THREE.MeshStandardMaterial, fieldMat = field.material as THREE.MeshStandardMaterial, crownMat = crowns.material as THREE.MeshStandardMaterial;
  const aurora = new THREE.Group(); aurora.visible = false; scene.add(aurora);
  for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(track(new THREE.PlaneGeometry(260, 34)), track(new THREE.MeshBasicMaterial({ color: k === 1 ? '#7bf0c6' : '#3ee08f', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, fog: false }))); m.position.set(HUB.x - 40 + k * 30, 70 + k * 9, HUB.z - 150 - k * 20); m.rotation.set(-0.15, 0.2 * k, 0.08 * (k - 1)); aurora.add(m); }
  const decor = new THREE.Group(); scene.add(decor); let decorKey = '';
  const sparks = new THREE.Points(track(new THREE.BufferGeometry()), track(new THREE.PointsMaterial({ size: 1.4, vertexColors: true, transparent: true, depthWrite: false }))); sparks.visible = false; sparks.name = 'fireworks'; sparks.raycast = () => undefined; scene.add(sparks);   // nothing to click in the sky (and an empty cloud of points cannot be tested for a click)
  let look: SeasonLook = seasonLook(G.dateOf(state).getMonth() + 1, state.city, state.slot, state.weather, state.day);
  const buildDecor = (id: string | null): void => {
    decor.clear(); decorKey = id ?? '';
    if (id === 'newyear') {                                                   // a tall tree with coloured balls and a star in the middle of the roundabout
      const tree = new THREE.Mesh(track(new THREE.ConeGeometry(3.4, 11, 9)), track(new THREE.MeshStandardMaterial({ color: '#1f6b3c', flatShading: true }))); tree.position.set(HUB.x, 5.6, HUB.z - 7.5); decor.add(tree);
      const star = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.8)), track(new THREE.MeshStandardMaterial({ color: '#ffd84d', emissive: '#ffcc33', emissiveIntensity: 0.8 }))); star.position.set(HUB.x, 11.6, HUB.z - 7.5); decor.add(star);
      const ball = track(new THREE.SphereGeometry(0.32, 10, 8)); ['#e0373f', '#2f6fd6', '#ffd84d', '#ffffff', '#a56be0'].forEach((c, k) => { const mm = track(new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35 })); for (let q = 0; q < 4; q++) { const h = 1.5 + (k * 4 + q) * 0.45, r = 3.2 * (1 - (h - 0.5) / 11) + 0.15, a = (k * 4 + q) * 2.4; const b = new THREE.Mesh(ball, mm); b.position.set(HUB.x + Math.sin(a) * r, h, HUB.z - 7.5 + Math.cos(a) * r); decor.add(b); } });
    } else if (id === 'cityday' || id === 'maslenitsa' || id === 'tatiana' || id === 'whitenights') {   // bunting round the roundabout
      const flag = track(new THREE.ConeGeometry(0.35, 0.8, 3)); const cols = ['#e0373f', '#2f6fd6', '#ffd84d', '#1f9d55', '#ffffff'];
      for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2, f = new THREE.Mesh(flag, track(new THREE.MeshStandardMaterial({ color: cols[k % cols.length] }))); f.position.set(HUB.x + Math.sin(a) * 16.5, 4.2 + Math.sin(k * 1.7) * 0.15, HUB.z + Math.cos(a) * 16.5); f.rotation.x = Math.PI; decor.add(f); }
    }
  };
  const fireworks = (on: boolean): void => {
    sparks.visible = on; if (!on) return;
    const n = 420, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) { const burst = i % 6, cx = HUB.x - 30 + burst * 12, cy = 38 + (burst % 3) * 6, cz = HUB.z - 40, u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 4 + Math.random() * 3, rr = Math.sqrt(1 - u * u);
      pos.set([cx + r * rr * Math.cos(th), cy + r * u, cz + r * rr * Math.sin(th)], i * 3); c.set(['#ff5a5f', '#ffd84d', '#7bf0c6', '#a56be0', '#ffffff', '#4ea1ff'][burst]); col.set([c.r, c.g, c.b], i * 3); }
    sparks.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sparks.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  };
  const daylight = (): void => {
    scenery.updateBoards(state, dateText());
    const t = DAY[Math.min(2, Math.max(0, state.slot))];
    look = seasonLook(G.dateOf(state).getMonth() + 1, state.city, state.slot, state.weather, state.day);
    groundMat.color.set(look.ground); fieldMat.color.set(look.field); crownMat.color.set(look.crown);
    const sky = state.slot === 2 && look.whiteNight ? look.eveningSky : t.sky;
    (scene.background as THREE.Color).set(sky); (scene.fog as THREE.Fog).color.set(sky);
    aurora.visible = look.aurora && !saver;
    const ev = activeEvent(state); if ((ev?.id ?? '') !== decorKey) buildDecor(ev?.id ?? null);
    fireworks(!saver && state.slot === 2 && (ev?.id === 'newyear' || ev?.id === 'cityday'));
    sun.intensity = t.sun; sun.color.set(t.color); hemi.intensity = t.hemi;
    weather.visible = !saver && (state.weather === 'rain' || state.weather === 'snow');
    partMat.color.set(state.weather === 'rain' ? '#7aa8e8' : '#ffffff'); partMat.size = state.weather === 'rain' ? 0.35 : 0.7;
  };
  function applyLayers(): void {
    if (playerPerson) playerPerson.tag.visible = showNames;
    people.forEach(p => { p.tag.visible = showNames; });
    buildings.forEach(b => { (b.userData.sign as THREE.Sprite).visible = showNames; });
    scenery.boards.forEach(b => { if (b.parent) b.parent.visible = showBoards; });
  }
  buildPlayer(); buildCrowd(); buildCars(); moveCars(0); daylight(); applyLayers(); moment = state.day * 3 + state.slot;

  /* ----- camera ----- */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 10; controls.maxDistance = 120; controls.maxPolarAngle = 1.38; controls.minPolarAngle = 0.35;
  const focus = new THREE.Vector3(playerPerson.agent.pos.x, 4, playerPerson.agent.pos.z);
  controls.target.copy(focus);
  camera.position.set(focus.x + 13, focus.y + 14, focus.z + 21);

  const size = (): void => {
    const w = Math.max(200, d.host.clientWidth || 600), h = Math.max(200, d.host.clientHeight || 380);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  size();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null; ro?.observe(d.host);

  /* ----- one step of the world ----- */

  let travelling = false, settle = 0;
  const hasJob = (): boolean => !!state.job;
  const place = (p: Person): void => {
    const a = p.agent;
    p.char.root.position.set(a.pos.x, 0, a.pos.z);
    p.char.root.rotation.y = a.heading;
    // the player's gesture wins while it lasts; standing in the cold people rub their hands, and some passers-by look at their phones
    const k = p.npc ? p.npc.id.length + p.npc.id.charCodeAt(p.npc.id.length - 1) : 0;
    const idle: Pose = p === playerPerson ? (playerFx && clock < playerFx.until ? playerFx.mode : coldOut && Math.sin(clock * 0.4) > 0.55 ? 'brr' : 'idle') : coldOut && k % 3 === 0 ? 'brr' : k % 4 === 1 ? 'phone' : 'idle';
    setPose(p.char, a.state === 'walk' ? 'walk' : a.state === 'talk' ? 'talk' : idle, a.phase, clock + (p.npc ? p.npc.id.length : 0));
    const want = a.say ?? '';
    if (want !== p.bubbleText) {
      if (p.bubble) { p.char.root.remove(p.bubble); p.bubble.material.map?.dispose(); p.bubble.material.dispose(); p.bubble = null; }
      p.bubbleText = want;
      if (want) { p.bubble = sprite(want, '#ffffff', '#16203a', 0.9); p.bubble.position.set(0, 3.5, 0); p.char.root.add(p.bubble); }
    }
  };
  const tick = (dt: number): void => {
    const slow = Math.min(0.25, Math.max(0, dt));                   // inside a room a slow device still gets the walk done in a sensible time
    dt = Math.min(0.05, Math.max(0, dt)); clock += dt;
    if (room) { stepRoom(slow); return; }
    if (steerDir) walkBy(dt); else stepAgent(playerPerson.agent, dt, rng, hasJob(), nav);
    for (const p of people) stepAgent(p.agent, dt, rng, hasJob(), nav);
    pairTalk(people.map(p => p.agent), rng, 0.02);
    separate([playerPerson.agent, ...people.map(p => p.agent)], dt, nav.slide);
    place(playerPerson); people.forEach(place); moveCars(dt);
    const wasTravelling = travelling;
    travelling = playerPerson.agent.state === 'walk' && !steerDir;           // walking by hand keeps the camera close
    if (wasTravelling && !travelling) settle = 2.5;                  // the trip is over: come back down for a moment, then leave the camera to the player
    if (!freeCam) {
      focus.lerp(new THREE.Vector3(playerPerson.agent.pos.x, 4, playerPerson.agent.pos.z), Math.min(1, dt * 2.2));
      const delta = focus.clone().sub(controls.target); controls.target.add(delta); camera.position.add(delta);
    }
    // while the player is on the way the camera rises to show the city, then comes back down
    const off = camera.position.clone().sub(controls.target), want = travelling ? 78 : overview ? 105 : 36;
    if (travelling || settle > 0 || overview) { settle = Math.max(0, settle - dt); off.setLength(off.length() + (want - off.length()) * Math.min(1, dt * 1.2)); camera.position.copy(controls.target).add(off); }
    controls.update();
    if (weather.visible) {
      const fall = state.weather === 'rain' ? 38 : 5;
      for (let i = 0; i < PARTS; i++) { partPos[i * 3 + 1] -= fall * dt; if (partPos[i * 3 + 1] < 0) partPos[i * 3 + 1] = 50; }
      partGeo.attributes.position.needsUpdate = true; weather.position.set(controls.target.x, 0, controls.target.z);
    }
  };

  /* ----- walking by hand: the direction is taken from the camera, and at the kerb the player waits while a car or a bicycle is close ----- */
  function walkBy(dt: number): void {
    const a = playerPerson.agent, f = controls.target.clone().sub(camera.position); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, -1); f.normalize();
    const dir = { x: -f.z * steerDir!.x + f.x * steerDir!.z, z: f.x * steerDir!.x + f.z * steerDir!.z };
    const len = Math.hypot(dir.x, dir.z) || 1, ahead = { x: a.pos.x + (dir.x / len) * 1.2, z: a.pos.z + (dir.z / len) * 1.2 };
    waiting = showTraffic && mustWait(a.pos, ahead, cars.map(c => poseOf(c.v)), p => onRoadway(p));
    if (waiting) { a.heading = Math.atan2(dir.x, dir.z); a.state = 'idle'; a.timer = 1e9; return; }
    steer(a, dir, dt, nav.slide);
  }

  /* ----- inside a place ----- */
  const ROOM_AT = new THREE.Vector3(1000, 0, 0);
  interface Dweller { c: Character; path: P2[]; wait: number; seat: number; sitting: boolean; chat: Dweller | null; tryTo: 'sit' | 'chat' | null }
  interface Inside { fx: { mode: Pose; until: number } | null; seats: { x: number; z: number; ry: number; taken: boolean }[]; h: RoomHandle; people: Dweller[]; me: Character; path: P2[]; goal: { action: string } | null; rr: () => number; place: string; saved: { min: number; max: number } }
  let room: Inside | null = null;
  const propSpot = (id: string): { x: number; z: number } | null => {
    if (!room) return null;
    const t = room.h.usable.find(o => o.userData.action === id && !(o instanceof THREE.Sprite));
    return t ? { x: t.position.x, z: t.position.z } : null;
  };
  /* ----- furnishing the flat ----- */
  let furnishing = false;
  let placing: { id: string; rot: 0 | 1; i: number; j: number; ok: boolean; moved: boolean; ghost: THREE.Mesh | null } | null = null;
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const floorAt = (cx: number, cy: number): { x: number; z: number } | null => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / (r.width || 1)) * 2 - 1, -(((cy - r.top) / (r.height || 1)) * 2 - 1)); ray.setFromCamera(ndc, camera);
    const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(floorPlane, p)) return null;
    return { x: p.x - ROOM_AT.x, z: p.z - ROOM_AT.z };
  };
  const killGhost = (): void => { if (placing?.ghost) { scene.remove(placing.ghost); placing.ghost.geometry.dispose(); (placing.ghost.material as THREE.Material).dispose(); placing.ghost = null; } };
  const updateGhost = (): void => {
    if (!placing || !room) return;
    const f = furnById(placing.id); if (!f) return;
    const sz = sizeOf(f, placing.rot), it = room.h.interior, c = centreOf(it, f, placing.i, placing.j, placing.rot);
    placing.ok = canPlace(state, f, placing.i, placing.j, placing.rot).ok;
    if (!placing.ghost) { placing.ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false })); scene.add(placing.ghost); }
    const h = Math.max(0.2, f.wall ? 0.6 : f.h);
    placing.ghost.scale.set(f.wall ? sz.w : sz.w, h, f.wall ? 0.4 : sz.d);
    placing.ghost.position.set(ROOM_AT.x + c.x, f.wall ? 1.5 : h / 2, ROOM_AT.z + c.z);
    (placing.ghost.material as THREE.MeshBasicMaterial).color.set(placing.ok ? '#2bb55a' : '#e0373f');
  };
  const setPlacing = (id: string | null): void => {
    killGhost();
    if (!id || !room || room.place !== 'home' || !furnById(id)) { placing = null; return; }
    const it = room.h.interior, f = furnById(id) as NonNullable<ReturnType<typeof furnById>>, g = gridOf(it);
    placing = { id, rot: 0, i: Math.max(0, Math.round(g.cols / 2 - f.w / 2)), j: Math.max(0, Math.round(g.rows / 2 - f.d / 2)), ok: false, moved: false, ghost: null };
    updateGhost();
  };
  function hoverFloor(cx: number, cy: number): void {
    if (!placing || !room) return;
    const f = furnById(placing.id); if (!f) return;
    const at = floorAt(cx, cy); if (!at) return;
    const it = room.h.interior, sz = sizeOf(f, placing.rot);
    placing.i = Math.round(at.x + it.w / 2 - sz.w / 2); placing.j = Math.round(at.z + it.d / 2 - sz.d / 2); placing.moved = true; updateGhost();
  }
  const dropAt = (cx: number, cy: number): void => {
    if (!placing) return;
    hoverFloor(cx, cy);
    const f = furnById(placing.id);
    if (!f) return;
    if (placing.ok) d.onFurnish?.(placing.id, placing.i, placing.j, placing.rot);
    else d.onFurnishFail?.(roomL(canPlace(state, f, placing.i, placing.j, placing.rot).why ?? 'It does not fit.'));
  };
  const refreshRoom = (): void => {
    if (!room || room.place !== 'home') return;
    const r = room, it = homeInterior(state), h = buildRoom(it, state.slot);
    h.group.position.copy(ROOM_AT); scene.add(h.group); scene.remove(r.h.group); r.h.dispose(); r.h = h;
    r.seats = seatsOf(it).map(s => ({ ...s, taken: false })); r.people.forEach(p => { p.sitting = false; p.seat = -1; p.path = []; });
    if (placing) updateGhost();
  };
  const useProp = (action: string): void => {
    if (!room) return;
    if (action === 'exit') { leave(); return; }
    const at = propSpot(action) ?? { x: 0, z: 0 };
    const door = doorOf(room.h.interior);
    // stand in front of the thing, or beside it when a wall is in front (round 151)
    const prop = room.h.interior.props.find(p => p.action === action && Math.abs(p.x - at.x) < 0.05 && Math.abs(p.z - at.z) < 0.05);
    const spot = prop ? useSpot(room.h.interior, prop) : { x: at.x, z: Math.min(door.z, at.z + 1.6) }, x = spot.x, z = spot.z;
    const me = room.me.root;
    room.path = findPath(room.h.interior, { x: me.position.x - ROOM_AT.x, z: me.position.z - ROOM_AT.z }, { x, z });
    room.goal = { action };
  };
  const enter = (placeId?: string): boolean => {
    const id = placeId ?? state.loc;
    if (room || playerPerson.agent.state === 'walk') return false;
    const it = id === 'home' ? homeInterior(state) : interiorFor(id, state); if (!it) return false;
    const h = buildRoom(it, state.slot); h.group.position.copy(ROOM_AT); scene.add(h.group);
    const door = doorOf(it);
    // at home the shoes come off at the door and the coat goes on the hook: the player wears house slippers inside
    const home = state.loc === 'home', w0 = state.worn ?? {};
    const me = buildCharacter(home ? { ...normalizeLook(state.look), shoes: 'slippers' } : normalizeLook(state.look), home ? { ...w0, outer: undefined, hat: undefined, gloves: undefined, scarf: undefined } : w0, 'full'); me.root.position.set(ROOM_AT.x + door.x, 0, ROOM_AT.z + door.z - 1); scene.add(me.root);
    const crowd = crowdFor(state).filter(n => n.place === id).slice(0, it.occupants);
    const rr = seeded(state.day * 13 + state.slot + id.length);
    const people: Dweller[] = crowd.map((n, i) => {
      const c = buildCharacter(n.look, n.worn); const a = (i + 1) / (crowd.length + 1);
      const spot = wanderSpot(it, rr); void a;
      c.root.position.set(ROOM_AT.x + spot.x, 0, ROOM_AT.z + spot.z); scene.add(c.root); return { c, path: [], wait: rr() * 3, seat: -1, sitting: false, chat: null, tryTo: null };
    });
    const saved = { min: controls.minDistance, max: controls.maxDistance };
    controls.minDistance = 6; controls.maxDistance = 34; controls.maxPolarAngle = 1.45;
    playerPerson.char.root.visible = false; people_hide(true);
    room = { fx: null, seats: seatsOf(it).map(s => ({ ...s, taken: false })), h, people, me, path: [], goal: null, rr, place: id, saved };
    focus.set(ROOM_AT.x, 1.5, ROOM_AT.z);
    controls.target.copy(focus); camera.position.set(ROOM_AT.x + 2, 13, ROOM_AT.z + it.d * 0.95);
    return true;
  };
  const people_hide = (hide: boolean): void => { for (const p of people) p.char.root.visible = !hide; };
  const leave = (): void => {
    if (!room) return;
    if (hovered !== null) { hovered = null; d.onHover?.(null); }
    furnishing = false; setPlacing(null);
    const r = room; room = null;
    scene.remove(r.h.group); r.h.dispose(); scene.remove(r.me.root); r.people.forEach(p => scene.remove(p.c.root));
    controls.minDistance = r.saved.min; controls.maxDistance = r.saved.max; controls.maxPolarAngle = 1.38;
    playerPerson.char.root.visible = true; people_hide(false);
    focus.set(playerPerson.agent.pos.x, 4, playerPerson.agent.pos.z); controls.target.copy(focus); camera.position.set(focus.x + 13, focus.y + 14, focus.z + 21);
  };
  /** Moves a person along their waypoints; true while still walking. */
  const follow = (c: Character, path: P2[], speed: number, dt: number): boolean => {
    const root = c.root;
    let left = speed * dt;
    while (path.length && left > 0) {
      const gx = ROOM_AT.x + path[0].x, gz = ROOM_AT.z + path[0].z, dx = gx - root.position.x, dz = gz - root.position.z, dist = Math.hypot(dx, dz);
      root.rotation.y = Math.atan2(dx, dz);
      if (dist <= left) { root.position.x = gx; root.position.z = gz; left -= dist; path.shift(); }
      else { root.position.x += (dx / dist) * left; root.position.z += (dz / dist) * left; left = 0; }
    }
    return path.length > 0;
  };
  const stepRoom = (dt: number): void => {
    if (!room) return;
    const r = room, it = r.h.interior;
    const walking = follow(r.me, r.path, 4.2, dt);
    if (walking) setPose(r.me, 'walk', clock * 6, clock);
    else if (r.fx && clock < r.fx.until) setPose(r.me, r.fx.mode, 0, clock);
    else { r.fx = null; setPose(r.me, 'idle', 0, clock); if (r.goal) { const a = r.goal.action; r.goal = null; if (a !== 'exit') d.onAction?.(a); } }
    const posOf = (p: Dweller): P2 => ({ x: p.c.root.position.x - ROOM_AT.x, z: p.c.root.position.z - ROOM_AT.z });
    r.people.forEach((p, i) => {
      if (p.sitting) {                                                       // sitting for a while, then getting up
        setPose(p.c, 'sit', 0, clock + i); p.wait -= dt;
        if (p.wait <= 0) { p.sitting = false; if (p.seat >= 0) r.seats[p.seat].taken = false; const up = nearestFree(it, posOf(p)); p.c.root.position.set(ROOM_AT.x + up.x, 0, ROOM_AT.z + up.z); p.seat = -1; p.wait = 1 + r.rr() * 2; }
        return;
      }
      if (follow(p.c, p.path, 1.2, dt)) { setPose(p.c, 'walk', clock * 4 + i, clock); return; }
      if (p.tryTo === 'sit' && p.seat >= 0) {                                // arrived next to the seat: sit down on it
        const st = r.seats[p.seat]; p.c.root.position.set(ROOM_AT.x + st.x, 0, ROOM_AT.z + st.z); p.c.root.rotation.y = st.ry; p.sitting = true; p.tryTo = null; p.wait = 6 + r.rr() * 8; return;
      }
      if (p.tryTo === 'chat' && p.chat) { p.tryTo = null; p.wait = 4 + r.rr() * 4; }   // arrived beside somebody: talk
      if (p.chat && p.wait > 0) {
        const o = posOf(p.chat), me2 = posOf(p); p.c.root.rotation.y = Math.atan2(o.x - me2.x, o.z - me2.z);
        setPose(p.c, 'talk', 0, clock + i * 1.3); p.wait -= dt; if (p.wait <= 0) p.chat = null; return;
      }
      p.chat = null;
      setPose(p.c, 'idle', 0, clock + i * 1.7);
      p.wait -= dt;
      if (p.wait > 0) return;
      const here = posOf(p), roll = r.rr(), free = r.seats.map((st, k) => (st.taken ? -1 : k)).filter(k => k >= 0);
      if (roll < 0.35 && free.length) {                                      // go and sit
        const k = free[Math.floor(r.rr() * free.length)]; r.seats[k].taken = true; p.seat = k; p.tryTo = 'sit';
        p.path = findPath(it, here, r.seats[k]); p.wait = 1;
      } else if (roll < 0.65 && r.people.length > 1) {                        // go and stand next to somebody
        const others = r.people.filter(o => o !== p && !o.sitting); const o = others[Math.floor(r.rr() * others.length)];
        if (o) { p.chat = o; p.tryTo = 'chat'; p.path = findPath(it, here, { x: posOf(o).x + 0.9, z: posOf(o).z + 0.3 }); p.wait = 1; o.chat = p; o.wait = Math.max(o.wait, 6); }
        else p.wait = 2;
      } else { p.path = findPath(it, here, wanderSpot(it, r.rr)); p.wait = 2 + r.rr() * 5; }
    });
    focus.set(ROOM_AT.x, 1.5, ROOM_AT.z);
    const delta = focus.clone().sub(controls.target); controls.target.add(delta); camera.position.add(delta);
    controls.update();
  };

  /* ----- the loop: it stops when the page is hidden or the world is off screen ----- */
  let raf = 0, last = 0, onScreen = true, dead = false;
  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(es => { onScreen = es.some(e => e.isIntersecting); }) : null; io?.observe(d.host);
  /* a slow device is noticed after a few seconds of drawing, and saver mode is switched on for it */
  let meterT = 0, meterN = 0, measured = 0, metered = false;
  const setSaver = (on: boolean): void => {
    saver = on; sun.castShadow = !on && !lowPower; buildCars();
    renderer.setPixelRatio(on ? 0.7 : Math.min(window.devicePixelRatio || 1, 1.5)); size(); daylight();
  };
  let minFrame = 0;                                                          // milliseconds between drawn frames (0 = as often as the screen allows)
  const loop = (t: number): void => {
    if (dead) return;
    raf = requestAnimationFrame(loop);
    if (minFrame && last && t - last < minFrame - 1) return;
    const dt = last ? (t - last) / 1000 : 0; last = t;
    if (document.hidden || !onScreen) return;
    tick(dt); renderer.render(scene, camera);
    if (!metered && dt > 0 && dt < 2) {
      meterT += dt; if (meterT > 1.5) meterN++;                                 // the first moments are not counted
      if (meterT > 5.5) { measured = meterN / (meterT - 1.5); metered = true; if (measured < 18 && !saver) { setSaver(true); d.onSaver?.(); } }
    }
  };
  if (!factory) raf = requestAnimationFrame(loop);

  /* ----- clicking ----- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = (cx: number, cy: number): { kind: 'place' | 'npc' | 'prop' | 'furn' | 'landmark' | 'none'; id?: string } => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / (r.width || 1)) * 2 - 1, -(((cy - r.top) / (r.height || 1)) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(room ? [room.h.group, ...room.people.map(p => p.c.root)] : scene.children, true).filter(h => (h.object as THREE.Object3D).visible && !(h.object instanceof THREE.Points));
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o) {
        if (room && furnishing && o.userData.furn !== undefined) return { kind: 'furn', id: String(o.userData.furn) };
        if (room && o.userData.action) return { kind: 'prop', id: o.userData.action as string };
        if (o.userData.npc) return { kind: 'npc', id: o.userData.npc as string };
        if (o.userData.place) return { kind: 'place', id: o.userData.place as string };
        if (!room && o.userData.landmark) return { kind: 'landmark', id: o.userData.landmark as string };
        o = o.parent;
      }
    }
    return { kind: 'none' };
  };
  let down: { x: number; y: number } | null = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  let hovered: string | null = null;
  const labelAt = (cx: number, cy: number): string | null => {
    if (!room) return null;
    const r = renderer.domElement.getBoundingClientRect(); ndc.set(((cx - r.left) / (r.width || 1)) * 2 - 1, -(((cy - r.top) / (r.height || 1)) * 2 - 1)); ray.setFromCamera(ndc, camera);
    for (const h of ray.intersectObject(room.h.group, true)) { let o: THREE.Object3D | null = h.object; while (o) { if (o.userData.label) return roomL(o.userData.label as string); o = o.parent; } }
    return null;
  };
  renderer.domElement.addEventListener('pointermove', e => {
    if (placing && !down) { hoverFloor(e.clientX, e.clientY); return; }
    if (!room || down) return;
    const l = labelAt(e.clientX, e.clientY); if (l !== hovered) { hovered = l; d.onHover?.(l); }
  });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
    down = null;
    const hit = pick(e.clientX, e.clientY);
    if (placing && room) { dropAt(e.clientX, e.clientY); return; }
    if (hit.kind === 'furn') { d.onPickUp?.(Number(hit.id)); return; }
    if (hit.kind === 'prop') { const l = labelAt(e.clientX, e.clientY); if (l) { hovered = l; d.onHover?.(l); } if (!furnishing) useProp(hit.id as string); return; }      // a tap also says what the thing is (there is no hovering on a phone)
    if (room) return;
    if (hit.kind === 'place') d.onPlace(hit.id as string); else if (hit.kind === 'npc') d.onNpc(hit.id as string); else if (hit.kind === 'landmark') d.onLandmark?.(hit.id as string);
  });

  const project = (x: number, y: number, z: number): { x: number; y: number } => {
    const v = new THREE.Vector3(x, y, z).project(camera); const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  };

  return {
    setFurnish: on => { furnishing = on; if (!on) setPlacing(null); }, setPlacing, rotatePlacing: () => { if (placing) { placing.rot = placing.rot ? 0 : 1; placing.moved = false; updateGhost(); } },
    placing: () => (placing ? { id: placing.id, rot: placing.rot, i: placing.i, j: placing.j, ok: placing.ok } : null), refreshRoom, hoverFloor,
    labelAt,
    playPose: (mode, secs) => { if (!room) return false; room.fx = { mode, until: clock + secs }; return true; },
    snapshot: () => { try { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); } catch { return null; } },
    rotateView: (dir = 1) => { const off = camera.position.clone().sub(controls.target); off.applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.PI / 2) * dir); camera.position.copy(controls.target).add(off); controls.update(); },
    seasonInfo: () => ({ season: look.name, aurora: aurora.visible, whiteNight: look.whiteNight, decor: decorKey, fireworks: sparks.visible }),
    setFpsCap: fps => { minFrame = fps > 0 ? 1000 / fps : 0; },
    walk: dir => { steerDir = dir && Math.hypot(dir.x, dir.z) >= 0.15 && !room ? dir : null; if (!steerDir) { waiting = false; steer(playerPerson.agent, { x: 0, z: 0 }, 0); } },
    walkInfo: () => ({ near: room ? null : placeNear(playerPerson.agent.pos), waiting }),
    setFreeCam: on => { freeCam = on; controls.enablePan = on; controls.minDistance = on ? 3 : room ? 6 : 10; controls.maxPolarAngle = on ? 1.52 : room ? 1.45 : 1.38; if (!on) focus.copy(controls.target); },
    emote: (mode, secs = 3) => { if (room) room.fx = { mode, until: clock + secs }; else playerFx = { mode, until: clock + secs }; },
    scene, camera, tick, pick, project, setSaver, setOverview: on => { if (overview && !on) settle = 2.5; overview = on; }, setRealBuildings: c => { scenery.setReal(c ? c.buildings : null); anchorPlaces(c ? c.anchors : null); realCity = c; buildField(); fixAgent(playerPerson.agent); people.forEach(p => fixAgent(p.agent)); }, blockedAt: (x, z, r = 0.4) => solid.blocked(x, z, r), solids: () => solid.size, realBuildings: () => scenery.real(), anchoredPlaces: () => anchorObjs.map(a => a.g.userData.place as string), saver: () => saver, fps: () => measured,
    setBuild, buildSpot: () => (site ? { x: site.position.x, z: site.position.z } : null), setLayer: (name, on) => { if (name === 'names') showNames = on; else if (name === 'boards') showBoards = on; else { showTraffic = on; cars.forEach(c => { c.node.visible = on; }); } applyLayers(); }, traffic: () => ({ count: cars.filter(c => c.v.kind === 'car').length, factor: level.factor, jam: level.jam }), vehicles: () => cars.map(c => ({ kind: c.v.kind, ...poseOf(c.v), halt: c.v.halt })), dwellers: () => (room ? room.people.map(p => ({ sitting: p.sitting, talking: !!p.chat && !p.sitting && p.wait > 0 && p.tryTo === null, x: p.c.root.position.x - ROOM_AT.x, z: p.c.root.position.z - ROOM_AT.z })) : []), enter, leave, inside: () => room?.place ?? null, roomActions: () => (room ? Array.from(new Set(room.h.usable.map(o => o.userData.action as string))) : []),
    status: () => statusFor(state)?.text ?? null,
    people: () => people.map(p => ({ id: p.agent.id, x: p.agent.pos.x, z: p.agent.pos.z, state: p.agent.state, place: p.agent.node })),
    player: () => ({ x: playerPerson.agent.pos.x, z: playerPerson.agent.pos.z, state: playerPerson.agent.state, node: playerPerson.agent.node }),
    update: (s: State) => {
      state = s;
      if (s.loc !== lastLoc) { lastLoc = s.loc; sendTo(playerPerson.agent, s.loc, nav); }
      const key = JSON.stringify([s.look, s.worn, statusFor(s)?.text]);
      if (key !== playerKey) buildPlayer();
      const mm = s.day * 3 + s.slot;
      if (mm !== moment) { moment = mm; buildCrowd(); }
      if (trafficKey !== `${s.slot}|${s.weather}|${saver}`) buildCars();
      coldOut = (warmthMeter(s) ?? 100) < 30;
      refreshHome(s);
      daylight(); applyLayers();
    },
    destroy: () => {
      dead = true; cancelAnimationFrame(raf); setPlacing(null); clearCars(); if (site) { scene.remove(site); disposeSite(site); site = null; } leave(); scenery.setReal(null); unanchor(); ro?.disconnect(); io?.disconnect(); controls.dispose();
      people.forEach(removePerson); people.length = 0; removePerson(playerPerson);
      trunks.dispose(); crowns.dispose();
      owned.forEach(o => o.dispose());
      buildings.forEach(b => b.traverse(o => { if (o instanceof THREE.Sprite) { o.material.map?.dispose(); o.material.dispose(); } }));
      disposeCharacterMaterials();
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
