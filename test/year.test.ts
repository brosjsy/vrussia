import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { yearSummary } from '../src/content/year';

describe('one year in Russia', () => {
  it('fires exactly once in a full two-year game', () => {
    for (const o of ['moscow', 'tajik', 'student']) {
      const s = G.newState('T', o); s.queue = [];
      let count = 0, dayOfFire = -1;
      for (let d = 0; d < G.MAXDAY; d++) {
        G.endDay(s);
        if (s.queue.includes('cal_year1')) { count++; dayOfFire = s.day; }
        s.queue = []; s.health = 100;
      }
      expect(count, o).toBe(1);
      expect(dayOfFire, o).toBe(365);
    }
  });

  it('the summary reflects the state: status, money, family, goals', () => {
    const s = G.newState('T', 'tajik'); s.queue = [];
    s.flags.rvp = true; s.money = 123456; s.friends = 4; s.partner = { name: 'Zarina', kind: 'compatriot', love: 70 }; s.flags.married = true; s.kids = 1;
    s.tmp.debt = 50000; s.strikes = 1; s.pet = { name: 'Belka', kind: 'mix', bond: 40 }; s.flags.award = true;
    const text = yearSummary(s).join(' ');
    for (const part of ['temporary resident (RVP)', '123,456', 'Friends: 4', 'Married to Zarina', '1 child', '50,000 of debt', 'Legal strikes on record: 1', 'Belka', 'Patriot']) expect(text, part).toContain(part);
  });

  it('a citizen and a student read differently', () => {
    const c = G.newState('T', 'moscow'); const f = G.newState('T', 'student');
    expect(yearSummary(c).join(' ')).toContain('a Russian citizen');
    expect(yearSummary(f).join(' ')).toContain('a foreign student');
    expect(yearSummary(f).join(' ')).toContain('You are a student');
  });

  it('the scene is free (takes no time), has three choices and all of them run', () => {
    const s = G.newState('T', 'moscow'); s.queue = [];
    const sc = G.get('cal_year1', s) as G.Scenario;
    expect(sc.free).toBe(true);
    expect(sc.choices.length).toBe(3);
    expect(sc.text).toContain('a year since you arrived');
    for (let i = 0; i < 3; i++) expect(() => G.choose(structuredClone(s), G.get('cal_year1', s) as G.Scenario, i)).not.toThrow();
  });
});
