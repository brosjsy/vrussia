// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { readTile, buildGraph, route, directions, pathLength, realFor, searchPois, kindOf, llOfTilePoint, toXZ, toLL, tileOfLL, KIND } from '../src/realworld';
import type { LatLon } from '../src/realworld';
import { mountRealWorld } from '../src/realworld3d';
import { doorOf, inOutline } from '../src/collide';
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

/* Nobody walks into a house through its wall: a place on the map is a point inside a building, and the walk to it must end at the building's edge (its door),
   not carry the player through the wall to the middle of it. */
describe('the real city: walking up to a house', () => {
  const withHouses = (): Uint8Array => new Uint8Array([...testTile(), ...layer('building', [
    { type: 3, geom: [[[2060, 3770], [2140, 3770], [2140, 3830], [2060, 3830], [2060, 3770]]], props: { render_height: 20, render_min_height: 0 } },
    { type: 3, geom: [[[3760, 2060], [3840, 2060], [3840, 2100], [3760, 2100], [3760, 2060]]], props: { render_height: 20, render_min_height: 0 } },
    { type: 3, geom: [[[2960, 2960], [3040, 2960], [3040, 3040], [2960, 3040], [2960, 2960]]], props: { render_height: 20, render_min_height: 0 } },
  ])]);
  const inside = (b: { x: number; z: number }[], x: number, z: number): boolean => { let c = false; for (let i = 0, j = b.length - 1; i < b.length; j = i++) if ((b[i].z > z) !== (b[j].z > z) && x < ((b[j].x - b[i].x) * (z - b[i].z)) / (b[j].z - b[i].z) + b[i].x) c = !c; return c; };
  const houseTiles = async (z: number, x: number, y: number): Promise<ArrayBuffer | null> => (x === TX && y === TY ? withHouses().buffer as ArrayBuffer : null);

  it('stops at the wall of the house of every place, and never stands or steps inside any house on the way', async () => {
    const houses = readTile(withHouses(), Z, TX, TY, ORIGIN).buildings.filter(b => b.pts.length >= 3);
    expect(houses.length).toBeGreaterThanOrEqual(3);
    const s = G.newState('Walker', 'moscow'); let arrived = false;
    const h = await mountRealWorld({ host: document.body.appendChild(document.createElement('div')), s, origin: ORIGIN, onPoi: () => undefined, onArrive: () => { arrived = true; }, onFail: () => undefined, rendererFactory: stub(), fetchTile: houseTiles } as never);
    let last = h.player();
    for (const kind of ['church', 'gov', 'metro', 'mosque']) {
      const poi = h.pois().find(p => p.kind === kind)!; arrived = false;
      expect(h.goTo(poi).ok, kind).toBe(true);
      for (let i = 0; i < 4000 && !arrived; i++) {
        h.tick(0.1); const me = h.player();
        for (const b of houses) {
          expect(inside(b.pts, me.x, me.z), `${kind}: inside a house at ${me.x.toFixed(1)},${me.z.toFixed(1)}`).toBe(false);
          const n = Math.max(1, Math.ceil(Math.hypot(me.x - last.x, me.z - last.z) / 0.1));
          for (let k = 1; k < n; k++) expect(inside(b.pts, last.x + ((me.x - last.x) * k) / n, last.z + ((me.z - last.z) * k) / n), `${kind}: walked through a wall`).toBe(false);
        }
        last = me;
      }
      expect(arrived, kind).toBe(true);
      const here = h.player(), near = Math.hypot(here.x - poi.at.x, here.z - poi.at.z); expect(near, `${kind} is close to the player at the end`).toBeLessThan(25);
    }
    h.destroy();
  });

  it('a player who is standing inside a house when the map loads is put outside it, and a door is on the outside of the wall', async () => {
    const big = new Uint8Array([...testTile(), ...layer('building', [{ type: 3, geom: [[[1990, 1990], [2106, 1990], [2106, 2106], [1990, 2106], [1990, 1990]]], props: { render_height: 20, render_min_height: 0 } }])]);
    const h = await mountRealWorld({ host: document.body.appendChild(document.createElement('div')), s: G.newState('Walker', 'moscow'), origin: ORIGIN, onPoi: () => undefined, onArrive: () => undefined, onFail: () => undefined, rendererFactory: stub(), fetchTile: async (z: number, x: number, y: number) => (x === TX && y === TY ? big.buffer as ArrayBuffer : null) } as never);
    const me = h.player(), houses = readTile(big, Z, TX, TY, ORIGIN).buildings;
    for (const b of houses) expect(inside(b.pts, me.x, me.z)).toBe(false);
    h.destroy();
    const sq: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]], d = doorOf(sq, { x: 30, z: 5 });
    expect(d.x).toBeCloseTo(10.7, 5); expect(d.z).toBeCloseTo(5, 5); expect(inOutline(sq, d)).toBe(false);
    const w = doorOf(sq, { x: -9, z: 3 }); expect(w.x).toBeCloseTo(-0.7, 5); expect(inOutline(sq, w)).toBe(false);
  });
});

/* Round 154, phase 1 of the Russia-wide map: house numbers from the tiles, the address of a spot, the address search and starting anywhere. */
import { geocode, clearGeoCache, inRussia, geoConsent, giveGeoConsent, CONSENT_KEY } from '../src/geocode';
import { addressNear } from '../src/realworld';

describe('house numbers and the address of a spot', () => {
  const tile = (): Uint8Array => new Uint8Array([...testTile(), ...layer('housenumber', [
    { type: 1, geom: [[[2070, 2200]]], props: { housenumber: '10' } }, { type: 1, geom: [[[2070, 2400]]], props: { housenumber: '12к1' } }, { type: 1, geom: [[[900, 900]]], props: { housenumber: '' } },
  ])]);
  it('reads the numbers (and drops empty ones) and says "street, number" for a spot beside the street', () => {
    const c = readTile(tile(), Z, TX, TY, ORIGIN);
    expect(c.addresses.map(a => a.num).sort()).toEqual(['10', '12к1']);
    const a = c.addresses.find(x => x.num === '10')!;
    const here = addressNear({ x: a.at.x - 3, z: a.at.z }, c.addresses, c.roads);
    expect(here.num).toBe('10'); expect(here.street).toBe('Вторая улица');
    expect(addressNear({ x: 5000, z: 5000 }, c.addresses, c.roads)).toEqual({ street: undefined, streetEn: undefined, num: undefined });      // far from anything: no address
  });
});

describe('the address search', () => {
  const ok = (rows: unknown) => async () => ({ ok: true, json: async () => rows });
  const row = (name: string, lat: string, lon: string): Record<string, string> => ({ display_name: name, lat, lon, type: 'house' });
  beforeEach(() => clearGeoCache());
  it('keeps to Russia, to short text and to six answers, ignores rubbish, and refuses short questions', async () => {
    const rows = [row('Тверская улица, 10, Москва', '55.76', '37.61'), row('Paris, France', '48.85', '2.35'), row('<b>x</b>', 'nope', '37'), { nothing: 1 }, row('Анадырь', '64.73', '177.5'), row('Уэлен', '66.16', '-169.8')];
    const hits = await geocode('  Тверская   10 ', { fetch: ok(rows), wait: async () => undefined });
    expect(hits.map(h => h.name)).toEqual(['Тверская улица, 10, Москва', 'Анадырь', 'Уэлен']);       // the far east crosses the 180th meridian
    expect(await geocode('ab', { fetch: ok(rows) })).toEqual([]);
    expect(await geocode('Moscow x', { fetch: ok({ not: 'a list' }), wait: async () => undefined })).toEqual([]);
    expect(inRussia(55, 37)).toBe(true); expect(inRussia(0, 0)).toBe(false); expect(inRussia(NaN, 37)).toBe(false);
  });
  it('asks at most once every 1.2 seconds, remembers answers, and fails clearly when the service does', async () => {
    let calls = 0, t = 1000; const waits: number[] = [];
    const deps = { fetch: async (url: string) => { calls++; expect(url).toContain('countrycodes=ru'); expect(url).toContain('q='); return { ok: true, json: async () => [row('Казань', '55.79', '49.12')] }; }, now: () => t, wait: async (ms: number) => { waits.push(ms); t += ms; } };
    await geocode('Казань', deps); await geocode('Казань', deps);                    // the second answer comes from memory
    expect(calls).toBe(1);
    t += 100; await geocode('Самара', deps); expect(calls).toBe(2); expect(waits.length).toBeGreaterThan(0); expect(waits[waits.length - 1]).toBeLessThanOrEqual(1200);
    await expect(geocode('Омск', { fetch: async () => ({ ok: false, json: async () => [] }), wait: async () => undefined })).rejects.toThrow(/not available/);
  });
  it('remembers the players agreement', () => {
    const mem: Record<string, string> = {}, kv = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; } };
    expect(geoConsent(kv)).toBe(false); giveGeoConsent(kv); expect(mem[CONSENT_KEY]).toBe('yes'); expect(geoConsent(kv)).toBe(true);
  });
});

describe('the real city screen: starting anywhere', () => {
  beforeEach(() => { clearGeoCache(); localStorage.clear(); });
  const mk = async (geoRows: unknown): Promise<{ host: HTMLElement; fetched: string[]; close: () => void }> => {
    const host = document.body.appendChild(document.createElement('div')), fetched: string[] = [];
    const close = await openRealCity(host, G.newState('Walker', 'moscow'), ORIGIN, { notify: () => undefined, act: () => undefined, close: () => undefined, onFail: () => undefined,
      world: { rendererFactory: stub(), fetchTile: async (z: number, x: number, y: number) => { fetched.push(`${x}/${y}`); return x === TX && y === TY ? testTile().buffer as ArrayBuffer : null; } },
      geo: { fetch: async () => ({ ok: true, json: async () => geoRows }), wait: async () => undefined } });
    return { host, fetched, close };
  };
  const type = (host: HTMLElement, text: string): void => { const i = host.querySelector<HTMLInputElement>('#realAddr')!; i.value = text; i.dispatchEvent(new Event('input')); host.querySelector<HTMLFormElement>('#realAddrForm')!.dispatchEvent(new Event('submit', { cancelable: true })); };
  it('asks before the first address search, then lists the answers and builds the map around the one chosen', async () => {
    const { host, fetched, close } = await mk([{ display_name: 'Невский проспект, 1, Санкт-Петербург', lat: '59.9386', lon: '30.3141', type: 'house' }]);
    type(host, 'Невский 1');
    expect(host.querySelector('#realAllow')).toBeTruthy(); expect(host.textContent).toContain('nominatim.openstreetmap.org');
    host.querySelector<HTMLButtonElement>('#realAllow')!.click();
    await vi.waitFor(() => expect(host.querySelector('[data-realhit]')).toBeTruthy());
    expect(localStorage.getItem(CONSENT_KEY)).toBe('yes');
    const before = fetched.length; host.querySelector<HTMLButtonElement>('[data-realhit]')!.click();
    await vi.waitFor(() => expect(host.textContent).toContain('You are looking at: Невский проспект, 1'));
    expect(fetched.length).toBeGreaterThan(before); expect(fetched.some(f => f !== `${TX}/${TY}`)).toBe(true);        // tiles of another place were asked for
    expect(host.textContent).toContain('The game stays in');
    close(); expect(host.innerHTML).toBe('');
  });
  it('jumps to a city from the list, lists every place of a kind, and says nothing found politely', async () => {
    localStorage.setItem(CONSENT_KEY, 'yes');
    const { host, fetched, close } = await mk([]);
    expect(host.querySelectorAll('#realCity option').length).toBeGreaterThan(30);
    const sel = host.querySelector<HTMLSelectElement>('#realCity')!; sel.value = 'Kazan'; sel.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(host.textContent).toContain('You are looking at: Kazan'));
    expect(fetched.length).toBeGreaterThan(9);
    host.querySelector<HTMLButtonElement>('[data-realkind="school"]')!.click(); expect(host.querySelector('[data-realkind="school"]')!.getAttribute('aria-pressed')).toBe('true');
    type(host, 'zzzzzz'); await vi.waitFor(() => expect(host.textContent).toContain('Nothing found'));
    close();
  });
});

describe('the address search shows what it finds only as text', () => {
  it('a hostile place name from the geocoder is shown as plain text and runs nothing', async () => {
    clearGeoCache(); localStorage.clear(); localStorage.setItem(CONSENT_KEY, 'yes');
    const host = document.body.appendChild(document.createElement('div'));
    const close = await openRealCity(host, G.newState('Walker', 'moscow'), ORIGIN, { notify: () => undefined, act: () => undefined, close: () => undefined, onFail: () => undefined,
      world: { rendererFactory: stub(), fetchTile: tiles }, geo: { fetch: async () => ({ ok: true, json: async () => [{ display_name: '<img src=x onerror="window.__pwned=1">Улица', lat: '55.7', lon: '37.6', type: 'x' }] }), wait: async () => undefined } });
    const i = host.querySelector<HTMLInputElement>('#realAddr')!; i.value = 'Улица тест'; i.dispatchEvent(new Event('input')); host.querySelector<HTMLFormElement>('#realAddrForm')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(host.querySelector('[data-realhit]')).toBeTruthy());
    expect(host.querySelector('img')).toBeNull(); expect(host.querySelector('[data-realhit]')!.textContent).toContain('<img src=x'); expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
    close();
  });
});

describe('a found place in a few words', () => {
  it('puts the street before the house number', async () => {
    const { shortName } = await import('../src/realworld-ui');
    expect(shortName('1, улица Баумана, Старо-Татарская слобода, Казань, Россия')).toBe('улица Баумана, 1, Старо-Татарская слобода');
    expect(shortName('Казань, городской округ Казань, Татарстан')).toBe('Казань, городской округ Казань, Татарстан');
    expect(shortName('')).toBe('');
  });
});
