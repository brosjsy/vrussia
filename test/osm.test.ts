// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import * as G from '../src/engine';
import '../src/content';
import { tileOf, tilePointToLatLon, tilesFor, bboxFor, toWorldXZ, toRealXZ, decodeTile, shapeOf, layoutCity, fitsPlace, fitToField, distToPolygon, nearestOnPolygon, loadBuildings, cachedBuildings, cacheKey, osmConsentGiven, giveOsmConsent, withdrawOsmConsent, REAL_SCALE, REAL_REACH, TILE_ZOOM } from '../src/osm';
import type { RealBuilding, RawBuilding, RealCity } from '../src/osm';
import { toWorld, HUB, standPoint } from '../src/world-logic';
import { waterRects } from '../src/city-geo';
import { mountWorld3d } from '../src/world3d';
import type { World3dDeps } from '../src/world3d';

/* ---- a tiny encoder for map tiles, so that the reader is tested on real bytes ---- */
const varint = (n: number): number[] => { const o: number[] = []; let v = n >>> 0; while (v > 127) { o.push((v & 127) | 128); v >>>= 7; } o.push(v); return o; };
const zig = (n: number): number => (n << 1) ^ (n >> 31);
const bytes = (tag: number, b: number[]): number[] => [...varint((tag << 3) | 2), ...varint(b.length), ...b];
const vfield = (tag: number, n: number): number[] => [...varint(tag << 3), ...varint(n)];
const str = (tag: number, s: string): number[] => bytes(tag, Array.from(new TextEncoder().encode(s)));
interface F { id: number; ring: [number, number][]; height?: number; minHeight?: number }
/** One layer called "building" with polygon features; ring points in tile units; keys render_height and render_min_height; values are doubles. */
function tileBytes(features: F[], extent = 4096): Uint8Array {
  const geometry = (f: F): number[] => {
    const g: number[] = []; const [first, ...rest] = f.ring; g.push(9, zig(first[0]), zig(first[1]));
    let px = first[0], py = first[1]; g.push((2 & 7) | (rest.length << 3));
    for (const [x, y] of rest) { g.push(zig(x - px), zig(y - py)); px = x; py = y; }
    g.push(15); return g;
  };
  const dbl = (x: number): number[] => { const b = new DataView(new ArrayBuffer(8)); b.setFloat64(0, x, true); return [(3 << 3) | 1, ...Array.from(new Uint8Array(b.buffer))]; };
  const keys = ['render_height', 'render_min_height'];
  const values: number[] = []; const valueIndex = new Map<number, number>();
  const valueOf = (x: number): number => { let i = valueIndex.get(x); if (i === undefined) { i = valueIndex.size; valueIndex.set(x, i); values.push(...bytes(4, dbl(x))); } return i; };
  const featBytes = features.flatMap(f => {
    const g = geometry(f), tags: number[] = [];
    if (f.height !== undefined) tags.push(0, valueOf(f.height));
    if (f.minHeight !== undefined) tags.push(1, valueOf(f.minHeight));
    return bytes(2, [...vfield(1, f.id), ...bytes(2, tags.flatMap(t => varint(t))), ...vfield(3, 3), ...bytes(4, g.flatMap(t => varint(t >>> 0)))]);
  });
  const layer = [...vfield(15, 2), ...str(1, 'building'), ...featBytes, ...keys.flatMap(k => str(3, k)), ...values, ...vfield(5, extent)];
  return new Uint8Array(bytes(3, layer));
}

const CITY = 'Moscow';
/** A square of side `side` metres of real ground whose middle is the tile point (cx, cy), as ring points in tile units at zoom 14 (about 0.30 real metres per unit at this latitude). */
const square = (cx: number, cy: number, side: number): [number, number][] => { const u = side / 0.3 / 2; return [[cx - u, cy - u], [cx + u, cy - u], [cx + u, cy + u], [cx - u, cy + u]].map(([x, y]) => [Math.round(x), Math.round(y)] as [number, number]); };
const c0 = tileOf(55.7558, 37.6173, TILE_ZOOM);

describe('tiles and places on the map', () => {
  it('the tile of a point and the point of a tile agree, and the tile list for a city covers its area', () => {
    const t = tileOf(55.7558, 37.6173); const p = tilePointToLatLon(TILE_ZOOM, t.x, t.y, 2048, 2048, 4096);
    expect(Math.abs(p.lat - 55.7558)).toBeLessThan(0.06); expect(Math.abs(p.lon - 37.6173)).toBeLessThan(0.02);
    expect(tileOf(p.lat, p.lon)).toEqual(t);
    const tl = tilesFor(CITY); expect(tl.length).toBeGreaterThanOrEqual(1); expect(tl.length).toBeLessThanOrEqual(4);
    for (const c of G.CITIES) { const n = tilesFor(c).length; expect(n, c).toBeGreaterThanOrEqual(1); expect(n, c).toBeLessThanOrEqual(6); }
  });
  it('the middle of the area is the middle of the world, north is up the screen, and the scale is the stated one', () => {
    const b = bboxFor(CITY), mid = toRealXZ(CITY, (b.s + b.n) / 2, (b.w + b.e) / 2);
    expect(Math.abs(mid.x)).toBeLessThan(0.01); expect(Math.abs(mid.z)).toBeLessThan(0.01);
    expect(toWorldXZ(CITY, 55.7658, 37.6173).z).toBeLessThan(0); expect(toWorldXZ(CITY, 55.7558, 37.6273).x).toBeGreaterThan(0);
    expect(Math.abs(toRealXZ(CITY, 55.7558 + 100 / 111320, 37.6173).z)).toBeCloseTo(100, 1);
    expect(Math.abs(toWorldXZ(CITY, 55.7558 + 100 / 111320, 37.6173).z)).toBeCloseTo(100 * REAL_SCALE, 1);
  });
});

describe('reading a map tile', () => {
  it('turns polygons into buildings in real metres with the height from the data', () => {
    const data = tileBytes([{ id: 1, ring: square(2048, 2048, 20), height: 15 }, { id: 2, ring: square(2300, 2100, 12), height: 6 }, { id: 3, ring: square(1800, 2000, 25), height: 60 }]);
    const out = decodeTile(data, TILE_ZOOM, c0.x, c0.y, CITY);
    expect(out.length).toBe(3);
    expect(out.map(b => Math.round(b.height)).sort((a, b) => a - b)).toEqual([6, 15, 60]);
    for (const b of out) { expect(b.pts.length).toBe(4); expect(b.pts.flat().every(Number.isFinite)).toBe(true); expect(b.area).toBeGreaterThan(100); expect(b.area).toBeLessThan(900); }
    const big = out.find(b => b.height === 60)!; expect(Math.sqrt(big.area)).toBeGreaterThan(20); expect(Math.sqrt(big.area)).toBeLessThan(34);       // a 25 m square, in real metres
  });
  it('leaves out floating parts, specks, giants and buildings that belong to the next tile', () => {
    const data = tileBytes([
      { id: 1, ring: square(2048, 2048, 20), height: 10 },
      { id: 2, ring: square(2048, 2400, 20), height: 10, minHeight: 20 },     // a part high above the ground
      { id: 3, ring: square(2048, 2600, 2), height: 5 },                       // a speck
      { id: 4, ring: square(2000, 3000, 300), height: 5 },                      // a whole industrial site
      { id: 5, ring: square(4300, 2000, 20), height: 8 },                       // the middle is outside this tile
    ]);
    expect(decodeTile(data, TILE_ZOOM, c0.x, c0.y, CITY).length).toBe(1);
  });
  it('a tile with no building layer or empty bytes gives nothing, and garbage is an error that the loader skips', () => {
    expect(decodeTile(new Uint8Array([]), TILE_ZOOM, 0, 0, CITY)).toEqual([]);
    expect(() => decodeTile(new Uint8Array([255, 255, 255, 1, 2, 3]), TILE_ZOOM, 0, 0, CITY)).toThrow();
  });
  it('kinds and heights: a house, a block, a tower, a shop; towers are capped', () => {
    expect(shapeOf(9, 100).kind).toBe('house'); expect(shapeOf(12, 100).kind).toBe('block'); expect(shapeOf(30, 100).kind).toBe('tower'); expect(shapeOf(8, 2000).kind).toBe('shop');
    expect(shapeOf(500, 100).h).toBe(40); expect(shapeOf(0.5, 100).h).toBe(2.4); expect(shapeOf(10, 100).h).toBeCloseTo(10 * REAL_SCALE * 2, 5);
  });
});

const sq = (x: number, z: number, s = 5, h = 6): RealBuilding => ({ pts: [[x - s, z - s], [x + s, z - s], [x + s, z + s], [x - s, z + s]], h, kind: 'house', color: '#d9c8b4' });
describe('outlines', () => {
  const box: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]];
  it('distance to an outline, and its nearest point', () => {
    expect(distToPolygon(box, 5, 5)).toBe(0); expect(distToPolygon(box, 13, 5)).toBeCloseTo(3, 5); expect(distToPolygon(box, 13, 14)).toBeCloseTo(5, 5);
    const q = nearestOnPolygon(box, 15, 4); expect(q.x).toBeCloseTo(10, 5); expect(q.z).toBeCloseTo(4, 5);
  });
  it('a building suits a place when the standing point is outside but near and the road to it does not cross the building', () => {
    const sp = standPoint('mfc'), dx = sp.x - HUB.x, dz = sp.z - HUB.z, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l;
    const at = (d: number): [number, number][] => [-1, 1].flatMap(sx => [-1, 1].map(sz => [sp.x + ux * d + sx * 6 * -uz + sz * 3 * ux, sp.z + uz * d + sx * 6 * ux + sz * 3 * uz] as [number, number]));
    const ring = (d: number): [number, number][] => { const a = at(d); return [a[0], a[1], a[3], a[2]]; };
    expect(fitsPlace(ring(6), sp)).toBe(true);                                       // a wall 3 m beyond the standing point
    expect(fitsPlace(ring(2), sp)).toBe(false);                                      // it would swallow the standing point
    expect(fitsPlace(ring(25), sp)).toBe(false);                                     // too far away
    expect(fitsPlace(ring(-8), sp)).toBe(false);                                     // in the way of the road
  });
});

describe('setting the places on real buildings', () => {
  /** A city of long blocks on a regular street grid, in real metres. */
  const gridCity = (): RawBuilding[] => { const out: RawBuilding[] = []; let k = 1; for (let gx = -10; gx <= 10; gx++) for (let gz = -10; gz <= 10; gz++) { const x = gx * 62, z = gz * 46, w = 40, d = 26; out.push({ pts: [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2]], height: 12 + ((gx + gz) & 3) * 6, area: w * d, key: k++ }); } return out; };
  it('puts most places on a real building that suits them, each on its own', () => {
    const c = layoutCity(gridCity(), CITY); const ids = Object.keys(c.anchors);
    expect(ids.length).toBeGreaterThanOrEqual(Math.floor(G.PLACES.length * 0.5));
    for (const id of ids) {
      const a = c.anchors[id]; expect(a.place).toBe(id); expect(fitsPlace(a.pts, standPoint(id)), id).toBe(true);
      const mid = { x: a.pts.reduce((t, p) => t + p[0], 0) / a.pts.length, z: a.pts.reduce((t, p) => t + p[1], 0) / a.pts.length }, at = toWorld(G.placeById(id));
      expect(Math.hypot(mid.x - at.x, mid.z - at.z), id).toBeLessThanOrEqual(16.01);
    }
    const keys = ids.map(id => JSON.stringify(c.anchors[id].pts)); expect(new Set(keys).size).toBe(keys.length);
    const homeAt = c.anchors.home; if (homeAt) expect(Math.hypot(homeAt.pts[0][0] - HUB.x, homeAt.pts[0][1] - HUB.z)).toBeLessThan(40);
  });
  it('the other houses keep off the places and roads and do not repeat a building that a place uses', () => {
    const c = layoutCity(gridCity(), CITY); expect(c.buildings.length).toBeGreaterThan(40); expect(c.buildings.length).toBeLessThanOrEqual(1400);
    const anchored = new Set(Object.values(c.anchors).map(a => JSON.stringify(a.pts)));
    for (const b of c.buildings) { expect(anchored.has(JSON.stringify(b.pts))).toBe(false); expect(b.place).toBeUndefined(); expect(b.h).toBeGreaterThan(2); expect(b.h).toBeLessThanOrEqual(40); }
  });
  it('is the same every time, and copes with a nearly empty or empty map', () => {
    expect(JSON.stringify(layoutCity(gridCity(), CITY))).toBe(JSON.stringify(layoutCity(gridCity(), CITY)));
    expect(layoutCity([], CITY)).toEqual({ buildings: [], anchors: {} });
    const few = gridCity().slice(0, 3); const c = layoutCity(few, CITY); expect(Object.keys(c.anchors)).toEqual([]); expect(Array.isArray(c.buildings)).toBe(true);
    const tiny = gridCity().map(b => ({ ...b, area: 15, pts: b.pts.map(p => [p[0] / 5, p[1] / 5] as [number, number]) })); expect(Object.keys(layoutCity(tiny, CITY).anchors)).toEqual([]);
  });
});

describe('fitting the houses to the city', () => {
  it('drops anything on a place, the hub, a road, in the water or too far, keeps free ground, and keeps the nearest ones first', () => {
    const free = { x: -60, z: 60 };
    const onPlace = sq(toWorld(G.PLACES[3]).x + 1, toWorld(G.PLACES[3]).z + 1), onHub = sq(HUB.x + 2, HUB.z + 2);
    const far = sq(REAL_REACH + 50, 0), near = sq(free.x, free.z), nearer = sq(free.x + 20, free.z - 20, 4);
    const out = fitToField([far, onPlace, onHub, near, nearer], CITY);
    expect(out.length).toBeLessThanOrEqual(2); expect(out.some(b => b === far || b === onPlace || b === onHub)).toBe(false);
    const rect = waterRects('Kazan')[0]; expect(fitToField([sq(rect.x, rect.z)], 'Kazan')).toEqual([]);
    expect(fitToField(Array.from({ length: 50 }, (_, i) => sq(-60 + (i % 10) * 12, 90 + Math.floor(i / 10) * 6, 2)), CITY, 7).length).toBeLessThanOrEqual(7);
  });
  it('keeps a good many houses in a regular city in several cities', () => {
    const list: RealBuilding[] = []; for (let x = -100; x <= 100; x += 9) for (let z = -100; z <= 100; z += 9) list.push(sq(x, z, 3));
    for (const c of ['Moscow', 'Kazan', 'Sochi']) { const out = fitToField(list, c, 5000); expect(out.length, c).toBeGreaterThan(40); expect(out.length, c).toBeLessThan(list.length); }
  });
});

const fakeKV = (): { m: Map<string, string>; getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } => { const m = new Map<string, string>(); return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); } }; };
const goodTile = (): Uint8Array => tileBytes(Array.from({ length: 40 }, (_, i) => ({ id: i + 1, ring: square(300 + (i % 8) * 450, 300 + Math.floor(i / 8) * 700, 30), height: 9 + (i % 5) * 4 })));
function fakeFetch(opts: { tile?: Uint8Array | null; tilejson?: unknown; tileStatus?: number; netFail?: boolean } = {}): { f: typeof fetch; calls: string[] } {
  const calls: string[] = [];
  const f = (async (url: string) => {
    calls.push(String(url));
    if (opts.netFail) throw new TypeError('network');
    if (String(url).endsWith('/planet')) return new Response(JSON.stringify(opts.tilejson ?? { tiles: ['https://tiles.example/planet/v1/{z}/{x}/{y}.pbf'] }), { status: 200 });
    if (opts.tileStatus && opts.tileStatus !== 200) return new Response('', { status: opts.tileStatus });
    return new Response((opts.tile ?? goodTile()) as BlobPart, { status: 200 });
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe('loading the houses of a city', () => {
  it('asks for the tile list and the tiles, builds the city, keeps it on the device and does not ask again', async () => {
    const kv = fakeKV(), net = fakeFetch();
    const city = await loadBuildings(CITY, { fetch: net.f, kv });
    expect(city.buildings.length + Object.keys(city.anchors).length).toBeGreaterThan(5); expect(net.calls[0]).toContain('tiles.openfreemap.org'); expect(net.calls.length).toBe(1 + tilesFor(CITY).length);
    expect(net.calls.slice(1).every(u => u.startsWith('https://tiles.example/planet/v1/14/'))).toBe(true);
    const kept = cachedBuildings(CITY, kv); expect(kept?.buildings.length).toBe(city.buildings.length); expect(Object.keys(kept?.anchors ?? {})).toEqual(Object.keys(city.anchors));
    const again = fakeFetch(); const second = await loadBuildings(CITY, { fetch: again.f, kv }); expect(again.calls.length).toBe(0); expect(second.buildings.length).toBe(city.buildings.length);
  });
  it('says what went wrong in plain words and keeps nothing when it fails', async () => {
    const kv = fakeKV();
    await expect(loadBuildings(CITY, { fetch: fakeFetch({ netFail: true }).f, kv })).rejects.toThrow(/reach the map service/);
    await expect(loadBuildings(CITY, { fetch: fakeFetch({ tilejson: { nope: 1 } }).f, kv })).rejects.toThrow(/reach the map service/);
    await expect(loadBuildings(CITY, { fetch: fakeFetch({ tileStatus: 503 }).f, kv })).rejects.toThrow(/did not answer/);
    await expect(loadBuildings(CITY, { fetch: fakeFetch({ tile: tileBytes([]) }).f, kv })).rejects.toThrow(/No buildings/);
    await expect(loadBuildings(CITY, { fetch: fakeFetch({ tile: new Uint8Array([1, 2, 3]) }).f, kv })).rejects.toThrow();
    expect(kv.m.size).toBe(0);
  });
  it('a damaged or old copy kept on the device is ignored', () => {
    const kv = fakeKV(); expect(cachedBuildings(CITY, kv)).toBeNull();
    kv.m.set(cacheKey(CITY), '{oops'); expect(cachedBuildings(CITY, kv)).toBeNull();
    kv.m.set(cacheKey(CITY), JSON.stringify({ v: 1, b: [], a: {} })); expect(cachedBuildings(CITY, kv)).toBeNull();
    kv.m.set(cacheKey(CITY), JSON.stringify({ v: 8, b: [{ pts: [[0, 0]], h: 1, color: 'x', kind: 'house' }], a: { bank: { pts: [[0, 0]], h: 1, color: 'x', kind: 'house' }, nowhere: sq(0, 0) } }));
    const c = cachedBuildings(CITY, kv); expect(c?.buildings).toEqual([]); expect(c?.anchors).toEqual({});             // broken pieces and unknown places are dropped
    expect(cachedBuildings(CITY, null)).toBeNull();
  });
  it('the player\'s agreement is its own setting, off by default, and can be taken back', () => {
    const kv = fakeKV(); expect(osmConsentGiven(kv)).toBe(false); giveOsmConsent(kv); expect(osmConsentGiven(kv)).toBe(true); withdrawOsmConsent(kv); expect(osmConsentGiven(kv)).toBe(false);
    expect(osmConsentGiven(null)).toBe(false);
  });
});

/* ---- in the 3D world ---- */
function stub(): NonNullable<World3dDeps['rendererFactory']> {
  return canvas => {
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 380, right: 600, bottom: 380, x: 0, y: 0, toJSON() { return {}; } });
    return { domElement: canvas, setSize() { /* nothing */ }, setPixelRatio() { /* nothing */ }, render() { /* nothing */ }, dispose() { /* nothing */ }, shadowMap: { enabled: false, type: 0 } } as never;
  };
}
/** A building 4 m beyond the standing point of a place, away from the hub. */
const behind = (id: string): RealBuilding => {
  const sp = standPoint(id), dx = sp.x - HUB.x, dz = sp.z - HUB.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l, cx = sp.x + ux * 7, cz = sp.z + uz * 7;
  const p = (a: number, b: number): [number, number] => [cx + a * -uz + b * ux, cz + a * ux + b * uz];
  return { pts: [p(-5, -3), p(5, -3), p(5, 3), p(-5, 3)], h: 9, kind: 'block', color: '#d8c9a0', place: id };
};
const mountW = async (): ReturnType<typeof mountWorld3d> => { HTMLCanvasElement.prototype.getContext = (() => null) as never; const s = G.newState('W', 'moscow'); s.queue = []; return mountWorld3d({ host: document.body.appendChild(document.createElement('div')), s, onPlace: () => undefined, onNpc: () => undefined, onFail: () => undefined, rendererFactory: stub() }); };

describe('real houses in the 3D world', () => {
  it('replace the invented houses with one mesh, and bringing the invented ones back removes it', async () => {
    const h = await mountW();
    const real = (): THREE.Mesh[] => h.scene.children.filter(o => o.name === 'real-buildings') as THREE.Mesh[];
    const filler = (): THREE.InstancedMesh[] => h.scene.children.filter(o => (o as THREE.InstancedMesh).isInstancedMesh && (o as THREE.InstancedMesh).geometry.type === 'BoxGeometry') as THREE.InstancedMesh[];
    expect(filler().length).toBe(1); expect(filler()[0].visible).toBe(true); expect(real().length).toBe(0); expect(h.realBuildings()).toBe(0);
    const city: RealCity = { buildings: [sq(-60, 60), sq(-50, 70, 4, 12), { ...sq(-70, 75, 6, 30), kind: 'tower' as const }], anchors: {} };
    h.setRealBuildings(city);
    expect(real().length).toBe(1); expect(h.realBuildings()).toBe(3); expect(filler()[0].visible).toBe(false);
    const geo = real()[0].geometry; expect(geo.getAttribute('color')).toBeTruthy(); expect(geo.getAttribute('wallf')).toBeTruthy(); expect(geo.getAttribute('position').count).toBeGreaterThan(30);
    const box = new THREE.Box3().setFromObject(real()[0]); expect(box.max.y).toBeCloseTo(30, 0); expect(box.min.y).toBeGreaterThan(-0.01);
    h.setRealBuildings({ buildings: [sq(-60, 60)], anchors: {} }); expect(real().length).toBe(1); expect(h.realBuildings()).toBe(1);
    h.setRealBuildings(null); expect(real().length).toBe(0); expect(h.realBuildings()).toBe(0); expect(filler()[0].visible).toBe(true);
    h.setRealBuildings({ buildings: [], anchors: {} }); expect(real().length).toBe(0); expect(filler()[0].visible).toBe(true);
    h.setRealBuildings(city); h.destroy(); expect(h.scene.children.filter(o => o.name === 'real-buildings').length).toBe(0);
  });
  it('a place set on a real building takes its shape, its door faces the road, and the invented box comes back afterwards', async () => {
    const h = await mountW();
    const group = (id: string): THREE.Group => h.scene.children.find(o => o.userData.place === id && o instanceof THREE.Group) as THREE.Group;
    const bank = group('bank'), before = bank.children.length, sign = bank.children.find(o => o instanceof THREE.Sprite && o.userData.place === 'bank') as THREE.Sprite;
    const signBefore = sign.position.clone();
    h.setRealBuildings({ buildings: [], anchors: { bank: behind('bank'), mfc: behind('mfc'), nowhere: behind('bank') } });
    expect(h.anchoredPlaces().sort()).toEqual(['bank', 'mfc', 'nowhere'].filter(p => p !== 'nowhere'));
    expect(bank.children.length).toBe(before + 2);
    const shown = bank.children.filter(o => o.visible && (o as THREE.Mesh).isMesh && o.userData.place === 'bank');
    expect(shown.length).toBe(2);                                           // the real shape and its door
    const body = shown.find(o => (o as THREE.Mesh).geometry.type === 'ExtrudeGeometry') as THREE.Mesh; expect(body).toBeTruthy();
    const bb = new THREE.Box3().setFromObject(body); const sz = bb.getSize(new THREE.Vector3()); expect(sz.x).toBeLessThan(14); expect(sz.z).toBeLessThan(14); expect(sz.y).toBeGreaterThan(5);
    expect(sign.position.distanceTo(signBefore)).toBeGreaterThan(1);       // the name sign moved over the real roof
    expect(h.pick(0, 0).kind).toBeDefined();
    h.setRealBuildings(null); expect(h.anchoredPlaces()).toEqual([]); expect(bank.children.length).toBe(before);
    expect(bank.children.filter(o => !o.visible).length).toBe(0); expect(sign.position.distanceTo(signBefore)).toBeLessThan(0.001);
    h.setRealBuildings({ buildings: [], anchors: { bank: behind('bank') } }); h.setRealBuildings({ buildings: [], anchors: { bank: behind('bank') } });
    expect(bank.children.length).toBe(before + 2);                         // setting twice does not pile up
    h.destroy();
  });
});
