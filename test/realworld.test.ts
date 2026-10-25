// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { readTile, buildGraph, route, directions, pathLength, realFor, searchPois, kindOf, llOfTilePoint, toXZ, toLL, tileOfLL, KIND } from '../src/realworld';
import type { LatLon } from '../src/realworld';
import { mountRealWorld } from '../src/realworld3d';
import { openRealCity } from '../src/realworld-ui';
import { setLang } from '../src/i18n';

/* Round 153: the real city — streets, places, routes and directions read from OpenStreetMap tiles, tested on a hand-made tile. */

/* ---- a small encoder for map tiles with several layers ---- */
const varint = (n: number): number[] => { const o: number[] = []; let v = n >>> 0; while (v > 127) { o.push((v & 127) | 128); v >>>= 7; } o.push(v); return o; };
const zig = (n: number): number => (n << 1) ^ (n >> 31);
const bytes = (tag: number, b: number[]): number[] => [...varint((tag << 3) | 2), ...varint(b.length), ...b];
const vfield = (tag: number, n: number): number[] => [...varint(tag << 3), ...varint(n)];
const str = (tag: number, s: string): number[] => bytes(tag, Array.from(new TextEncoder().encode(s)));
interface Feat { type: 1 | 2 | 3; geom: [number, number][][]; props: Record<string, string | number> }
function layer(name: string, feats: Feat[], extent = 4096): number[] {
  const keys: string[] = [], vals: (string | number)[] = [];
  const ki = (k: string): number => { let i = keys.indexOf(k); if (i < 0) { i = keys.length; keys.push(k); } return i; };
  const vi = (v: string | number): number => { let i = vals.indexOf(v); if (i < 0) { i = vals.length; vals.push(v); } return i; };
  const geometry = (f: Feat): number[] => {
    const g: number[] = []; let px = 0, py = 0;
    for (const part of f.geom) {
      const [first, ...rest] = part; g.push(9, zig(first[0] - px), zig(first[1] - py)); px = first[0]; py = first[1];
      if (rest.length) { g.push(2 | (rest.length << 3)); for (const [x, y] of rest) { g.push(zig(x - px), zig(y - py)); px = x; py = y; } }
      if (f.type === 3) g.push(15);
    }
    return g;
  };
  const featBytes = feats.flatMap((f, n) => {
    const tags = Object.entries(f.props).flatMap(([k, v]) => [ki(k), vi(v)]);
    return bytes(2, [...vfield(1, n + 1), ...bytes(2, tags.flatMap(t => varint(t))), ...vfield(3, f.type), ...bytes(4, geometry(f).flatMap(t => varint(t >>> 0)))]);
  });
  const valBytes = vals.flatMap(v => bytes(4, typeof v === 'string' ? str(1, v) : (() => { const b = new DataView(new ArrayBuffer(8)); b.setFloat64(0, v, true); return [(3 << 3) | 1, ...Array.from(new Uint8Array(b.buffer))]; })()));
  return bytes(3, [...vfield(15, 2), ...str(1, name), ...featBytes, ...keys.flatMap(k => str(3, k)), ...valBytes, ...vfield(5, extent)]);
}
const TX = 9906, TY = 5122, Z = 14;
const ORIGIN: LatLon = llOfTilePoint(Z, TX, TY, 2048, 2048, 4096);
function testTile(): Uint8Array {
  const street1: [number, number][] = [[200, 2048], [1200, 2048], [2048, 2048], [3000, 2048], [3900, 2048]], street2: [number, number][] = [[2048, 200], [2048, 1200], [2048, 2048], [2048, 3000], [2048, 3900]];
  return new Uint8Array([
    ...layer('transportation', [{ type: 2, geom: [street1], props: { class: 'secondary' } }, { type: 2, geom: [street2], props: { class: 'minor' } }]),
    ...layer('transportation_name', [{ type: 2, geom: [street1], props: { name: 'Тестовая улица', 'name:en': 'Test Street', class: 'secondary' } }, { type: 2, geom: [street2], props: { name: 'Вторая улица', 'name:en': 'Second Street', class: 'minor' } }]),
    ...layer('poi', [
      { type: 1, geom: [[[300, 2070]]], props: { class: 'railway', subclass: 'subway', name: 'Тестовая', 'name:en': 'Testovaya' } },
      { type: 1, geom: [[[2070, 3800]]], props: { class: 'place_of_worship', subclass: 'christian', name: 'Храм Тестовый' } },
      { type: 1, geom: [[[3800, 2070]]], props: { class: 'office', subclass: 'government', name: 'МФЦ района Тестовый' } },
      { type: 1, geom: [[[3000, 3000]]], props: { class: 'place_of_worship', subclass: 'muslim', name: 'Мечеть' } },
      { type: 1, geom: [[[500, 500]]], props: { class: 'gate', subclass: 'gate', name: 'Ворота' } },
    ]),
    ...layer('building', [{ type: 3, geom: [[[1000, 1000], [1200, 1000], [1200, 1200], [1000, 1200], [1000, 1000]]], props: { render_height: 30, render_min_height: 0 } }]),
  ]);
}

describe('reading the real city', () => {
  it('reads the streets with their names, the places with their kinds, and drops street furniture', () => {
    const c = readTile(testTile(), Z, TX, TY, ORIGIN);
    expect(c.roads.map(r => r.name).sort()).toEqual(['Вторая улица', 'Тестовая улица']);
    expect(c.roads.find(r => r.name === 'Тестовая улица')!.nameEn).toBe('Test Street');
    expect(c.pois.map(p => p.kind).sort()).toEqual(['church', 'gov', 'metro', 'mosque']);
    expect(c.buildings).toHaveLength(1); expect(c.buildings[0].h).toBe(30);
    const centre = c.roads[0].pts[2]; expect(Math.abs(centre.x) + Math.abs(centre.z)).toBeLessThan(1);         // the origin is the middle of the tile
    expect(kindOf('town_hall', 'community_centre', 'Клуб')).toBe('other'); expect(kindOf('shop', 'florist', 'Цветы')).toBe('shop'); expect(kindOf('bollard', 'bollard')).toBeNull();
    for (const k of Object.values(KIND)) expect(k.ru).toMatch(/[А-Яа-я]/);
    const back = toLL(ORIGIN, toXZ(ORIGIN, { lat: ORIGIN.lat + 0.001, lon: ORIGIN.lon + 0.002 })); expect(back.lat).toBeCloseTo(ORIGIN.lat + 0.001, 6); expect(tileOfLL(ORIGIN)).toEqual({ x: TX, y: TY });
  });
  it('walks along the streets from the metro to the church and says the way in Russian and English', () => {
    const c = readTile(testTile(), Z, TX, TY, ORIGIN), g = buildGraph(c.roads);
    const metro = c.pois.find(p => p.kind === 'metro')!, church = c.pois.find(p => p.kind === 'church')!;
    const path = route(g, metro.at, church.at); expect(path.length).toBeGreaterThan(2);
    const straight = Math.hypot(metro.at.x - church.at.x, metro.at.z - church.at.z); expect(pathLength(g, path)).toBeGreaterThan(straight);   // round the corner, not through the houses
    const ru = directions(g, path, church.name, true).map(s => s.text), en = directions(g, path, church.name, false).map(s => s.text);
    expect(ru[0]).toMatch(/^Идите прямо \d+ м — Тестовая улица$/); expect(ru.some(t => /Вторая улица/.test(t))).toBe(true); expect(ru[ru.length - 1]).toBe('Вы на месте: Храм Тестовый.');
    expect(en[0]).toMatch(/along Test Street/); expect(en.some(t => /onto Second Street/.test(t))).toBe(true);
    expect(directions(g, [], 'X', false)[0].text).toMatch(/No walking way/);
  });
  it('finds places by name or kind, and maps the game\'s MFC to a real one', () => {
    const c = readTile(testTile(), Z, TX, TY, ORIGIN);
    expect(searchPois(c.pois, 'храм', { x: 0, z: 0 })[0].name).toBe('Храм Тестовый'); expect(searchPois(c.pois, 'metro', { x: 0, z: 0 })[0].kind).toBe('metro');
    expect(realFor('mfc', c.pois, { x: 0, z: 0 })!.name).toBe('МФЦ района Тестовый'); expect(realFor('nowhere', c.pois, { x: 0, z: 0 })).toBeNull();
  });
});

const stub = () => (canvas: HTMLCanvasElement) => { canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500, right: 800, bottom: 500, x: 0, y: 0, toJSON() { return {}; } }); return { domElement: canvas, setSize() { /* */ }, setPixelRatio() { /* */ }, render() { /* */ }, dispose() { /* */ }, shadowMap: { enabled: false, type: 0 } } as never; };
const tiles = async (z: number, x: number, y: number): Promise<ArrayBuffer | null> => (x === TX && y === TY ? testTile().buffer as ArrayBuffer : null);
beforeEach(() => { HTMLCanvasElement.prototype.getContext = (() => null) as never; });

describe('the real city in 3D', () => {
  it('loads the tiles around the player, walks the route and arrives', async () => {
    const s = G.newState('Walker', 'moscow'); let arrived = '';
    const h = await mountRealWorld({ host: document.body.appendChild(document.createElement('div')), s, origin: ORIGIN, onPoi: () => undefined, onArrive: p => { arrived = p?.name ?? '?'; }, onFail: () => undefined, rendererFactory: stub(), fetchTile: tiles });
    expect(h.chunks()).toBe(1); expect(h.pois().length).toBe(4); expect(h.scene.getObjectByName('pois')).toBeTruthy();
    const church = h.pois().find(p => p.kind === 'church')!;
    expect(h.goTo(church).ok).toBe(true); expect(h.scene.getObjectByName('route')).toBeTruthy();
    for (let i = 0; i < 3000 && !arrived; i++) h.tick(0.1);
    expect(arrived).toBe('Храм Тестовый'); expect(Math.hypot(h.player().x - church.at.x, h.player().z - church.at.z)).toBeLessThan(1); expect(h.scene.getObjectByName('route')).toBeFalsy();
    h.destroy();
  });
});

describe('the real city screen', () => {
  it('searches, opens a card, gives directions, skips to the place and does the game action there', async () => {
    setLang('ru');
    try {
      const s = G.newState('Walker', 'moscow'), host = document.body.appendChild(document.createElement('div')), acts: string[] = [], notes: string[] = [];
      const close = await openRealCity(host, s, ORIGIN, { notify: m => notes.push(m), act: a => acts.push(a), close: () => undefined, onFail: m => notes.push(m), world: { rendererFactory: stub(), fetchTile: tiles } });
      expect(host.textContent).toContain('4 мест на карте'); expect(host.querySelector('[data-realgo]')?.textContent).toBe('МФЦ');
      const q = host.querySelector<HTMLInputElement>('#realQ')!; q.value = 'Храм'; q.dispatchEvent(new Event('input'));
      host.querySelector<HTMLButtonElement>('[data-realpoi]')!.click(); expect(host.querySelector('.realCard')?.textContent).toContain('Храм Тестовый');
      host.querySelector<HTMLButtonElement>('#realGo')!.click(); expect(host.querySelector('.realSteps')?.textContent).toContain('Вторая улица');
      host.querySelector<HTMLButtonElement>('#realSkip')!.click(); expect(notes.some(n => /Вы на месте: Храм Тестовый/.test(n))).toBe(true);
      host.querySelector<HTMLButtonElement>('#realDo')!.click(); expect(acts).toEqual(['culture']);
      expect(host.textContent).toContain('OpenStreetMap');
      close(); expect(host.innerHTML).toBe('');
    } finally { setLang('en'); }
  });
});
