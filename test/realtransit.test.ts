import { describe, it, expect } from 'vitest';
import { metroPlan } from '../src/realtransit';
import { METRO } from '../src/metro-data';
import type { Poi } from '../src/realworld';

const line = METRO.find(m => m.city === 'Moscow')!.lines[0];
const st = (name: string, x: number, id = name): Poi => ({ id, name: `РУ ${name}`, nameEn: name, kind: 'metro', sub: 'subway', at: { x, z: 0 } });
const A = line.stations[2], B = line.stations[9];

describe('metro in real-city routes', () => {
  it('suggests a ride when two game stations are near the ends and walking is long', () => {
    const pois = [st(A, 0), st(B, 6000)];
    const p = metroPlan(pois, { x: 100, z: 0 }, { x: 5900, z: 0 }, 90, false)!;
    expect(p).toBeTruthy();
    expect(p.minutes).toBeLessThan(90);
    expect(p.steps[0]).toMatch(/Quicker by metro/);
    expect(p.steps.some(s => s.includes(`${A} → ${B}`) && /7 stops/.test(s))).toBe(true);
  });
  it('speaks Russian, with the Russian station names of the map and the right plural', () => {
    const p = metroPlan([st(A, 0), st(B, 6000)], { x: 100, z: 0 }, { x: 5900, z: 0 }, 90, true)!;
    expect(p.steps[0]).toMatch(/Быстрее на метро/);
    expect(p.steps[1]).toContain(`«РУ ${A}»`);
    expect(p.steps.some(s => /7 остановок/.test(s))).toBe(true);
  });
  it('says nothing when walking is as quick, when the stations are too far, or when a name is not a game station', () => {
    const pois = [st(A, 0), st(B, 6000)];
    expect(metroPlan(pois, { x: 100, z: 0 }, { x: 5900, z: 0 }, 12, false)).toBeNull();                 // walking is short
    expect(metroPlan(pois, { x: 4000, z: 0 }, { x: 5900, z: 0 }, 90, false)).toBeNull();                // no station within walking range of the start
    expect(metroPlan([st('Nowhere Street', 0), st(B, 6000)], { x: 100, z: 0 }, { x: 5900, z: 0 }, 90, false)).toBeNull();
    expect(metroPlan([st(A, 0), st(A, 5950, 'second entrance')], { x: 100, z: 0 }, { x: 5900, z: 0 }, 90, false)).toBeNull();   // same station at both ends
  });
  it('reads spelling variants of a name as one station', () => {
    const p = metroPlan([st(A, 0), st(B.replace('ny ', 'nyy '), 6000)], { x: 100, z: 0 }, { x: 5900, z: 0 }, 90, false);    // Okhotny Ryad / Okhotnyy Ryad
    expect(p?.minutes).toBeLessThan(90);
  });
});

describe('interchanges', () => {
  it('names the change between two differently named stations of one interchange, in both languages', () => {
    const m = METRO.find(x => x.city === 'Moscow')!, [x, y] = m.links[0];
    const lx = m.lines.find(l => l.stations.includes(x))!, ly = m.lines.find(l => l.stations.includes(y))!;
    const ix = lx.stations.indexOf(x), iy = ly.stations.indexOf(y);
    const far = ly.stations[Math.min(ly.stations.length - 1, iy + 6)] === y ? ly.stations[Math.max(0, iy - 6)] : ly.stations[Math.min(ly.stations.length - 1, iy + 6)];
    const pois = [st(x, 0), st(far, 7000)];
    for (const ru of [false, true]) {
      const p = metroPlan(pois, { x: 50, z: 0 }, { x: 6950, z: 0 }, 120, ru);
      expect(p, `${x} → ${far}`).toBeTruthy();
      expect(p!.steps.some(s => /^(Change|Переход):/.test(s))).toBe(true);
    }
    expect(ix).toBeGreaterThanOrEqual(0);
  });
});
