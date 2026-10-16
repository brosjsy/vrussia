import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { WATER, waterFor, waterRects, bridgeFor, fillerFor, parksFor, PARK_MARGIN, billboardSpots, clearOfThings, FIELD_HALF, WATER_WIDTH } from '../src/city-geo';
import { toWorld, standPoint, HUB, roadSegments } from '../src/world-logic';
import { boardsFor, megaScreen, statusFor } from '../src/billboards';

const inside = (p: { x: number; z: number }, r: { x: number; z: number; w: number; d: number }): boolean => Math.abs(p.x - r.x) < r.w / 2 && Math.abs(p.z - r.z) < r.d / 2;

describe('water', () => {
  it('every city has a named river, lake or sea on at least one side', () => {
    for (const c of G.CITIES) { const w = WATER[c]; expect(w, c).toBeTruthy(); expect(w.name.length).toBeGreaterThan(4); expect(w.sides.length).toBeGreaterThanOrEqual(1); expect(new Set(w.sides).size).toBe(w.sides.length); }
    expect(waterFor('Moscow').name).toBe('Moskva River'); expect(waterFor('Sochi').kind).toBe('sea'); expect(waterFor('Makhachkala').name).toBe('Caspian Sea');
    expect(waterFor('Nowhere').kind).toBe('river');
    expect(Object.keys(WATER).filter(c => !G.CITIES.includes(c))).toEqual([]);
  });
  it('lies beyond the edge of the playable field, so it never touches a place, a road or the hub', () => {
    for (const c of G.CITIES) for (const r of waterRects(c)) {
      for (const p of G.PLACES) expect(inside(toWorld(p), r), `${c} ${p.id}`).toBe(false);
      expect(inside(HUB, r)).toBe(false);
      for (const seg of roadSegments()) { expect(inside(seg.to, r)).toBe(false); }
      const nearest = r.w < r.d ? Math.abs(r.x) - r.w / 2 : Math.abs(r.z) - r.d / 2; expect(Math.abs(nearest - FIELD_HALF)).toBeLessThan(0.01);
    }
    expect(waterRects('Moscow').length).toBe(1); expect(waterRects('Saint Petersburg').length).toBe(2);
    expect(WATER_WIDTH.sea).toBeGreaterThan(WATER_WIDTH.river);
  });
  it('a bridge runs from the field across the first water side to the far bank', () => {
    for (const c of G.CITIES) {
      const b = bridgeFor(c), w = waterFor(c);
      expect(b.side).toBe(w.sides[0]);
      const span = b.side === 'n' || b.side === 's' ? b.d : b.w; expect(span).toBeGreaterThan(WATER_WIDTH[w.kind]);
      const reach = b.side === 'n' ? -b.z - b.d / 2 : b.side === 's' ? b.z - b.d / 2 : b.side === 'w' ? -b.x - b.w / 2 : b.x - b.w / 2;
      expect(reach, c).toBeLessThan(FIELD_HALF);                                       // it starts on the land
    }
  });
});

describe('ordinary buildings and parks', () => {
  it('are the same for the same city, differ between cities, and are plentiful but not crowded', () => {
    expect(fillerFor('Kazan')).toEqual(fillerFor('Kazan')); expect(fillerFor('Kazan')).not.toEqual(fillerFor('Perm'));
    for (const c of ['Moscow', 'Sochi', 'Yakutsk', 'Tula']) { const f = fillerFor(c); expect(f.length, c).toBeGreaterThan(18); expect(f.length).toBeLessThanOrEqual(46); }
    const kinds = new Set(fillerFor('Moscow').map(f => f.kind)); expect(kinds.size).toBe(3);
  });
  it('never stand on a place, a road or the hub, never overlap each other, and keep clear of the water', () => {
    for (const c of ['Moscow', 'Saint Petersburg', 'Makhachkala', 'Irkutsk']) {
      const f = fillerFor(c);
      for (const b of f) {
        expect(clearOfThings({ x: b.x, z: b.z }, Math.max(b.w, b.d) / 2, 0), `${c} ${b.kind}`).toBe(true);
        expect(b.h).toBeGreaterThan(3); expect(b.h).toBeLessThan(35);
        for (const r of waterRects(c)) expect(inside({ x: b.x, z: b.z }, r)).toBe(false);
      }
      for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) expect(Math.hypot(f[i].x - f[j].x, f[i].z - f[j].z)).toBeGreaterThan(Math.max(f[i].w, f[i].d) / 2 + Math.max(f[j].w, f[j].d) / 2);
    }
  });
  it('towers are tall and shops are low; two parks, one with a pitch, in free space', () => {
    const f = fillerFor('Moscow');
    expect(Math.min(...f.filter(b => b.kind === 'tower').map(b => b.h))).toBeGreaterThanOrEqual(14); expect(Math.max(...f.filter(b => b.kind === 'shop').map(b => b.h))).toBeLessThanOrEqual(4);
    for (const c of G.CITIES) {
      const p = parksFor(c); expect(p.length, c).toBe(2); expect(p.filter(x => x.pitch).length).toBe(1);
      for (const park of p) { expect(clearOfThings({ x: park.x, z: park.z }, Math.max(park.w, park.d) / 2, PARK_MARGIN), c).toBe(true); for (const b of fillerFor(c)) expect(Math.abs(b.x - park.x) < (b.w + park.w) / 2 && Math.abs(b.z - park.z) < (b.d + park.d) / 2).toBe(false); }
    }
  });
  it('billboards stand beside the roads, away from every place, and turn toward the road', () => {
    const spots = billboardSpots();
    expect(spots.length).toBe(5);
    for (const s of spots) { expect(Math.min(...G.PLACES.map(p => Math.hypot(toWorld(p).x - s.x, toWorld(p).z - s.z)))).toBeGreaterThan(13); expect(Number.isFinite(s.ry)).toBe(true); }
    expect(standPoint('home').z).toBeGreaterThan(0);
  });
});

describe('the notice boards', () => {
  const fresh = (): G.State => { const s = G.newState('T', 'tajik'); s.day = 3; return s; };
  it('always show five boards with a title, a text and a colour, and they are not paid advertisements', () => {
    const b = boardsFor(fresh());
    expect(b.length).toBe(5); for (const x of b) { expect(x.title.length).toBeGreaterThan(2); expect(x.text.length).toBeGreaterThan(8); expect(x.color).toMatch(/^#[0-9a-f]{6}$/); expect(x.text.toLowerCase()).not.toMatch(/buy now|sale|discount|promo/); }
  });
  it('start with what is happening in the player\'s own life and change with the part of the day', () => {
    const s = fresh(); s.tmp.fines = 3000; s.docs.reg = 4;
    const b = boardsFor(s); expect(b.some(x => x.text.includes('Unpaid fines'))).toBe(true); expect(b[0].title).toBe('THIS WEEK');
    const c = fresh(), d = fresh(); d.slot = 2;
    expect(boardsFor(c).map(x => x.text)).not.toEqual(boardsFor(d).map(x => x.text));
    expect(boardsFor(c, 3).length).toBe(3);
  });
  it('the big screen names the city, the date and the weather', () => {
    const s = fresh(); s.weather = 'snow';
    expect(megaScreen(s, 'Sat 10 Oct')).toBe(`${s.city} · Sat 10 Oct · Snow`);
  });
});

describe('the status chip', () => {
  const fresh = (): G.State => { const s = G.newState('T', 'tajik'); s.health = 80; s.stress = 10; s.energy = 80; s.tmp.fines = 0; return s; };
  it('is empty when all is well and names the most urgent trouble first', () => {
    const s = fresh(); expect(statusFor(s)).toBeNull();
    s.tmp.fines = 500; expect(statusFor(s)?.text).toBe('Unpaid fines');
    s.energy = 35; expect(statusFor(s)?.text).toBe('Unpaid fines'); s.tmp.fines = 0; expect(statusFor(s)?.text).toContain('Tired'); s.energy = 15; expect(statusFor(s)?.text).toContain('Exhausted');
    s.stress = 80; expect(statusFor(s)?.text).toContain('Burned out'); s.health = 20; expect(statusFor(s)?.text).toContain('Sick');
    for (const x of [statusFor(s)]) expect(x?.color).toMatch(/^#[0-9a-f]{6}$/);
  });
});

import { DECREES, weekOf } from '../src/decrees';
import { decreeFor } from '../src/election';
describe('the city decree of the week', () => {
  const at = (city: string, day: number): G.State => { const s = G.newState('T', 'tajik'); s.city = city; s.day = day; return s; };
  it('is the same all week in a city, changes with the week, and differs between cities', () => {
    for (let d = 0; d < 7; d++) expect(decreeFor(at('Kazan', d))).toBe(decreeFor(at('Kazan', 0)));
    expect(weekOf(at('Kazan', 6))).toBe(0); expect(weekOf(at('Kazan', 7))).toBe(1); expect(weekOf(at('Kazan', -3))).toBe(0);
    const weeks = new Set(Array.from({ length: 30 }, (_, w) => decreeFor(at('Kazan', w * 7)).id)); expect(weeks.size).toBeGreaterThan(8);
    const cities = new Set(G.CITIES.map(c => decreeFor(at(c, 14)).id)); expect(cities.size).toBeGreaterThan(5);
  });
  it('every decree is a plain announcement (no promise of money, health or any number), unique, and short enough for a board', () => {
    expect(new Set(DECREES.map(d => d.id)).size).toBe(DECREES.length); expect(DECREES.length).toBeGreaterThanOrEqual(16);
    for (const d of DECREES) { expect(d.text.length).toBeGreaterThan(20); expect(d.text.length).toBeLessThan(80); expect(d.text.toLowerCase()).not.toMatch(/₽|rub|\+\d|free money|bonus|health|energy/); }
  });
  it('shows on the notice boards as the second board, still five boards, and keeps the player own news first', () => {
    const s = at('Kazan', 9); s.tmp.fines = 3000; s.docs.reg = 4;
    const b = boardsFor(s); expect(b.length).toBe(5); expect(b[0].title).toBe('THIS WEEK'); expect(b[1].title).toBe('CITY DECREE'); expect(b[1].text).toBe(decreeFor(s).text);
    expect(boardsFor(s, 3).length).toBe(3);
  });
  it('does not change the state: a decree is only read', () => {
    const s = at('Kazan', 9); const before = JSON.stringify(s); decreeFor(s); boardsFor(s); expect(JSON.stringify(s)).toBe(before);
  });
});
