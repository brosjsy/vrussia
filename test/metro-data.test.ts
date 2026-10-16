import { describe, it, expect } from 'vitest';
import { METRO, metroOf, metroRoute } from '../src/metro-data';
import { METRO_CITIES } from '../src/venues';

describe('the real metro lines (researched, round 124)', () => {
  it('the seven cities with a metro, and only those', () => {
    expect(METRO.map(m => m.city).sort()).toEqual([...METRO_CITIES].sort());
  });
  it('the number of open stations on every line matches the sources', () => {
    const count = (city: string): Record<string, number> => Object.fromEntries(metroOf(city)!.lines.map(l => [l.num, l.stations.length]));
    expect(count('Moscow')).toEqual({ 1: 27, 2: 24, 3: 22, 4: 13, 5: 12, 6: 24, 7: 23, 8: 8, '8A': 13, 9: 25, 10: 26, 11: 29, 12: 7, 15: 8, 16: 11 });
    expect(count('Saint Petersburg')).toEqual({ 1: 19, 2: 18, 3: 12, 4: 9, 5: 15, 6: 2 });
    expect(count('Nizhny Novgorod')).toEqual({ 1: 11, 2: 5 });
    expect(count('Novosibirsk')).toEqual({ 1: 9, 2: 5 });
    expect(count('Kazan')).toEqual({ 1: 11 }); expect(count('Samara')).toEqual({ 1: 10 }); expect(count('Yekaterinburg')).toEqual({ 1: 9 });
  });
  it('corrections to the list the owner pasted: real stations in, invented or unopened ones out', () => {
    const all = (city: string): string[] => metroOf(city)!.lines.flatMap(l => l.stations);
    expect(all('Nizhny Novgorod')).toEqual(expect.arrayContaining(['Gorkovskaya', 'Strelka', 'Chkalovskaya']));
    for (const fake of ['Yarmarka', 'Meshcherskoye Ozero', 'Varya', 'Sormovskaya']) expect(all('Nizhny Novgorod')).not.toContain(fake);
    expect(all('Novosibirsk')).toContain('Sportivnaya'); expect(all('Samara')).not.toContain('Samarskaya'); expect(all('Yekaterinburg')).not.toContain('Bazhovskaya');
    expect(all('Saint Petersburg')).toEqual(expect.arrayContaining(['Devyatkino', 'Gorny Institut', 'Putilovskaya', 'Yugo-Zapadnaya']));
    expect(metroOf('Moscow')!.lines.map(l => l.num)).toEqual(expect.arrayContaining(['9', '10', '12']));       // lines missing from the pasted list
  });
  it('no station twice on one line; every interchange names real stations', () => {
    for (const m of METRO) {
      for (const l of m.lines) expect(new Set(l.stations).size, `${m.city} ${l.num}`).toBe(l.stations.length);
      const names = new Set(m.lines.flatMap(l => l.stations));
      for (const [a, b] of m.links) { expect(names.has(a), `${m.city}: ${a}`).toBe(true); expect(names.has(b), `${m.city}: ${b}`).toBe(true); }
    }
  });
  it('the route planner: straight rides, changes, the circle lines both ways', () => {
    const nn = metroRoute('Nizhny Novgorod', 'Gorkovskaya', 'Burevestnik')!; expect(nn.legs.map(g => g.line.num)).toEqual(['1', '2']); expect(nn.legs[1].stops[0]).toBe('Moskovskaya');
    const ns = metroRoute('Novosibirsk', 'Zayeltsovskaya', 'Zolotaya Niva')!; expect(ns.legs).toHaveLength(2);
    const spb = metroRoute('Saint Petersburg', 'Devyatkino', 'Shushary')!; expect(spb.legs.length).toBeGreaterThanOrEqual(2); expect(spb.minutes).toBeLessThan(90);
    const ring = metroRoute('Moscow', 'Kiyevskaya', 'Park Kultury')!;                       // neighbours on the Circle line, across the end of the list
    expect(ring.legs).toHaveLength(1); expect(ring.minutes).toBe(2);
    const m = metroRoute('Moscow', 'Tverskaya', 'Kiyevskaya')!; expect(m.minutes).toBeLessThan(25); expect(m.legs.length).toBeLessThanOrEqual(3);
    expect(metroRoute('Kazan', 'Aviastroitelnaya', 'Dubravnaya')!.minutes).toBe(20);
    expect(metroRoute('Kazan', 'Nowhere', 'Dubravnaya')).toBeNull(); expect(metroRoute('Omsk', 'A', 'B')).toBeNull();
  });
});
