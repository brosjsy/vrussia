// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { CITY_CENTERS, placeLngLat, SPAN_M, STYLE_URL, consentGiven, giveConsent, withdrawConsent, CONSENT_KEY, ensureBuildings3d, mountRealMap, setRealMapLoader } from '../src/realmap';
import { crowdFor } from '../src/city';
import type { KV } from '../src/store';

const fakeKV = (): KV & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; }, removeItem: k => { delete data[k]; } };
};

/** A stand-in for the map library: records what the game asks for and lets a test raise events. */
function fakeLibrary() {
  const log = { maps: [] as { opts: Record<string, unknown>; handlers: Record<string, (e?: unknown) => void>; removed: boolean; layers: unknown[]; style: { sources: Record<string, { type: string }>; layers: { type: string }[] } }[], markers: [] as { el: HTMLElement; lngLat: number[]; removed: boolean }[] };
  class FakeMap {
    rec: (typeof log.maps)[number];
    constructor(opts: Record<string, unknown>) { this.rec = { opts, handlers: {}, removed: false, layers: [], style: { sources: { openmaptiles: { type: 'vector' } }, layers: [{ type: 'fill' }] } }; log.maps.push(this.rec); }
    on(ev: string, cb: (e?: unknown) => void) { this.rec.handlers[ev] = cb; }
    remove() { this.rec.removed = true; }
    getStyle() { return this.rec.style; }
    addLayer(l: unknown) { this.rec.layers.push(l); }
  }
  class FakeMarker {
    rec: (typeof log.markers)[number];
    constructor(o: { element: HTMLElement }) { this.rec = { el: o.element, lngLat: [], removed: false }; log.markers.push(this.rec); }
    setLngLat(l: number[]) { this.rec.lngLat = l; return this; }
    addTo() { return this; }
    remove() { this.rec.removed = true; }
  }
  return { log, lib: { Map: FakeMap, Marker: FakeMarker } as never };
}

afterEach(() => { setRealMapLoader(null); vi.restoreAllMocks(); });

describe('places on the real map', () => {
  it('every city of the game has a centre inside Russia, and Moscow and Saint Petersburg are where they should be', () => {
    for (const c of G.CITIES) { const v = CITY_CENTERS[c]; expect(v, c).toBeTruthy(); expect(v[0], c).toBeGreaterThan(41); expect(v[0], c).toBeLessThan(70); expect(v[1], c).toBeGreaterThan(19); expect(v[1], c).toBeLessThan(140); }
    expect(CITY_CENTERS.Moscow[0]).toBeCloseTo(55.75, 1); expect(CITY_CENTERS.Moscow[1]).toBeCloseTo(37.62, 1);
    expect(CITY_CENTERS['Saint Petersburg'][0]).toBeGreaterThan(CITY_CENTERS.Moscow[0]);      // Saint Petersburg is north of Moscow
    expect(CITY_CENTERS.Vladivostok[1]).toBeGreaterThan(CITY_CENTERS.Moscow[1] + 80);          // and Vladivostok is far to the east
  });
  it('the game map covers about 1.5 km, north is up, and the middle of the map is the middle of the city', () => {
    const km = (a: number[], b: number[]): number => { const R = 6371000, r = Math.PI / 180; const dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
    for (const city of ['Moscow', 'Murmansk', 'Sochi']) {
      const w = km(placeLngLat(city, { x: 0, y: 50 }), placeLngLat(city, { x: 100, y: 50 })), n = km(placeLngLat(city, { x: 50, y: 0 }), placeLngLat(city, { x: 50, y: 100 }));
      expect(Math.abs(w - SPAN_M), city).toBeLessThan(15); expect(Math.abs(n - SPAN_M), city).toBeLessThan(15);
    }
    expect(placeLngLat('Moscow', { x: 50, y: 10 })[1]).toBeGreaterThan(placeLngLat('Moscow', { x: 50, y: 90 })[1]);
    const mid = placeLngLat('Kazan', { x: 50, y: 50 }); expect(mid[1]).toBeCloseTo(CITY_CENTERS.Kazan[0], 6); expect(mid[0]).toBeCloseTo(CITY_CENTERS.Kazan[1], 6);
    expect(new Set(G.PLACES.map(p => placeLngLat('Moscow', p).join())).size).toBe(G.PLACES.length);
    expect(placeLngLat('Nowhere', { x: 50, y: 50 })).toEqual(placeLngLat('Moscow', { x: 50, y: 50 }));
  });
});

describe('consent', () => {
  it('is asked once, remembered, can be withdrawn, and survives blocked storage', () => {
    const kv = fakeKV();
    expect(consentGiven(kv)).toBe(false); giveConsent(kv); expect(kv.data[CONSENT_KEY]).toBe('yes'); expect(consentGiven(kv)).toBe(true);
    withdrawConsent(kv); expect(consentGiven(kv)).toBe(false);
    const blocked: KV = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); }, removeItem: () => { throw new Error('no'); } };
    expect(consentGiven(blocked)).toBe(false); expect(() => giveConsent(blocked)).not.toThrow(); expect(consentGiven(null)).toBe(false);
  });
});

describe('3D buildings', () => {
  it('are added from the vector tiles when the style has none, and left alone when it has them or has no vector source', () => {
    const f = fakeLibrary(); const m = new (f.lib as { Map: new (o: object) => { rec: { layers: unknown[]; style: { layers: { type: string }[]; sources: Record<string, { type: string }> } }; getStyle: () => never; addLayer: (l: unknown) => void } }).Map({});
    expect(ensureBuildings3d(m as never)).toBe(true);
    expect(m.rec.layers).toHaveLength(1);
    expect(m.rec.layers[0]).toMatchObject({ type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building' });
    m.rec.style.layers.push({ type: 'fill-extrusion' }); expect(ensureBuildings3d(m as never)).toBe(false); expect(m.rec.layers).toHaveLength(1);
    const n = new (f.lib as { Map: new (o: object) => never }).Map({}) as { rec: { style: { layers: unknown[]; sources: Record<string, unknown> } } };
    n.rec.style.sources = { raster: { type: 'raster' } }; expect(ensureBuildings3d(n as never)).toBe(false);
  });
});

describe('mounting the real map', () => {
  it('creates a tilted map of the player\'s city with the open tile style, a pin for every place, the people and the player; and cleans up', async () => {
    const f = fakeLibrary(); setRealMapLoader(async () => f.lib);
    const s = G.newState('Mapper', 'moscow'); s.queue = []; s.day = 5; s.slot = 1;
    const host = document.createElement('div'); document.body.appendChild(host);
    const picked: string[] = [], talked: string[] = [];
    const h = await mountRealMap({ host, s, onPlace: id => picked.push(id), onNpc: id => talked.push(id), onFail: () => undefined });
    const opts = f.log.maps[0].opts;
    expect(opts.style).toBe(STYLE_URL); expect(opts.pitch).toBe(62); expect(opts.center).toEqual(placeLngLat('Moscow', { x: 50, y: 50 }));
    expect(host.querySelector('.realmapCanvas')).toBeTruthy();
    const pins = f.log.markers.filter(m => m.el.classList.contains('pin')), people = f.log.markers.filter(m => m.el.classList.contains('person') && !m.el.classList.contains('me'));
    expect(pins.length).toBe(G.PLACES.length - 1);                                       // no workplace without a job
    expect(people.length).toBe(crowdFor(s).length);
    expect(f.log.markers.some(m => m.el.classList.contains('me') && m.el.textContent!.includes('Mapper'))).toBe(true);
    expect(pins.filter(p => p.el.classList.contains('here')).length).toBe(1);
    (pins.find(p => p.el.dataset.place === 'bank') as typeof pins[number]).el.click(); expect(picked).toEqual(['bank']);
    people[0].el.click(); expect(talked.length).toBe(1);
    // an update replaces every marker
    const before = f.log.markers.length; s.slot = 2; s.job = 'courier'; h.update(s);
    expect(f.log.markers.slice(0, before).every(m => m.removed)).toBe(true);
    expect(f.log.markers.slice(before).filter(m => m.el.classList.contains('pin')).length).toBe(G.PLACES.length);
    h.destroy();
    expect(f.log.maps[0].removed).toBe(true); expect(host.querySelector('.realmapCanvas')).toBeNull(); expect(f.log.markers.every(m => m.removed)).toBe(true);
  });
  it('reports a map that cannot load exactly once, and a library that cannot load at all', async () => {
    const f = fakeLibrary(); setRealMapLoader(async () => f.lib);
    const s = G.newState('M', 'moscow'); const fails: string[] = [];
    await mountRealMap({ host: document.createElement('div'), s, onPlace: () => undefined, onNpc: () => undefined, onFail: m => fails.push(m) });
    f.log.maps[0].handlers.error({ error: { message: 'offline' } }); f.log.maps[0].handlers.error({ error: { message: 'again' } });
    expect(fails).toEqual(['offline']);
    f.log.maps[0].handlers.load();                                                       // the style loaded: 3D buildings are added
    expect(f.log.maps[0].layers.length).toBe(1);
    setRealMapLoader(async () => { throw new Error('chunk failed'); });
    await expect(mountRealMap({ host: document.createElement('div'), s, onPlace: () => undefined, onNpc: () => undefined, onFail: () => undefined })).rejects.toThrow('chunk failed');
  });
});

describe('the real map in the page', () => {
  it('asks first, loads nothing before the player says yes, remembers the answer, shows pins that start trips, falls back when it fails, and closes when the game is left', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    localStorage.removeItem(CONSENT_KEY);
    window.confirm = () => true;
    const f = fakeLibrary(); let loads = 0;
    setRealMapLoader(async () => { loads++; return f.lib; });
    const { boot } = await import('../src/ui');
    boot();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Real';
    document.getElementById('startBtn')!.click();
    for (let i = 0; i < 40 && !document.querySelector('#actions button'); i++) (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();
    const btn = (): HTMLButtonElement => document.getElementById('realBtn') as HTMLButtonElement;
    expect(btn().getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById('realmap')!.hidden).toBe(true);

    btn().click();                                                                       // first time: a notice, nothing loaded
    expect(document.getElementById('realmap')!.hidden).toBe(false); expect(document.getElementById('city')!.hidden).toBe(true);
    expect(document.querySelector('#realmap .realNotice')!.textContent).toContain('openfreemap.org'); expect(loads).toBe(0); expect(consentGiven()).toBe(false);
    (document.getElementById('realNo') as HTMLButtonElement).click();                    // "not now": back to the offline map
    expect(document.getElementById('city')!.hidden).toBe(false); expect(document.getElementById('realmap')!.hidden).toBe(true); expect(loads).toBe(0);

    btn().click(); (document.getElementById('realYes') as HTMLButtonElement).click();    // yes
    await vi.waitFor(() => expect(f.log.markers.length).toBeGreaterThan(10));
    expect(loads).toBe(1); expect(consentGiven()).toBe(true); expect(btn().getAttribute('aria-pressed')).toBe('true');
    const bank = f.log.markers.find(m => m.el.dataset.place === 'bank') as (typeof f.log.markers)[number];
    const stageBefore = document.getElementById('stage')!.innerHTML;
    bank.el.click();                                                                     // a pin starts a trip, like the offline map
    expect(document.getElementById('stage')!.innerHTML).not.toBe(stageBefore);

    btn().click();                                                                       // back to the offline map: the real map is closed
    expect(f.log.maps[0].removed).toBe(true); expect(document.getElementById('city')!.hidden).toBe(false);
    btn().click();                                                                       // second time: no notice, loads at once
    await vi.waitFor(() => expect(loads).toBe(2));
    expect(document.querySelector('#realmap .realNotice')).toBeNull();

    f.log.maps[1].handlers.error({ error: { message: 'no network' } });                  // a failure: back to the offline map with a note
    expect(document.getElementById('city')!.hidden).toBe(false); expect(document.getElementById('toasts')!.textContent).toContain('could not be shown');

    setRealMapLoader(async () => { throw new Error('library missing'); });
    btn().click();
    await vi.waitFor(() => expect(document.getElementById('city')!.hidden).toBe(false));
    expect(document.getElementById('toasts')!.textContent).toContain('library missing');

    setRealMapLoader(async () => f.lib);
    btn().click(); await vi.waitFor(() => expect(f.log.maps.length).toBe(3));
    document.getElementById('menuBtn')!.click();                                         // leaving the game closes the real map
    expect(f.log.maps[2].removed).toBe(true);
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  });
});
