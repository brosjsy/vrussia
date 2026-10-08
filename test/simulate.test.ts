import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import { countStats } from '../src/content';

describe('content', () => {
  it('has 1,000+ scenarios with unique ids', () => {
    const { total } = countStats();
    expect(total).toBeGreaterThan(1000);
    expect(new Set(G.scenarios.map(s => s.id)).size).toBe(total);
  });

  it('every static scenario has choices', () => {
    const s = G.newState('T', 'tajik');
    for (const raw of G.scenarios) { const sc = G.materialize(raw, s); expect(sc.choices.length, sc.id).toBeGreaterThan(0); }
  });
});

describe('simulation', () => {
  it('plays random games for every origin without crashing or leaving valid ranges', () => {
    for (const o of G.origins) {
      for (let game = 0; game < 10; game++) {
        const s = G.newState('T', o.id);
        let steps = 0;
        while (!s.over && steps++ < 6000) {
          if (s.queue.length) {
            const sc = G.get(s.queue.shift() as string, s);
            if (sc) G.choose(s, sc, Math.floor(Math.random() * sc.choices.length));
            continue;
          }
          const r = G.perform(s, G.pick(G.actions.filter(a => a.id !== 'flight')).id);
          if (!r.sc) continue;
          G.choose(s, r.sc, Math.floor(Math.random() * r.sc.choices.length));
          for (const k of ['energy', 'health', 'stress', 'rep', 'know'] as const) {
            expect(s[k], `${o.id}:${k}`).toBeGreaterThanOrEqual(0);
            expect(s[k], `${o.id}:${k}`).toBeLessThanOrEqual(100);
          }
          expect(Number.isNaN(s.money)).toBe(false);
        }
        expect(s.over, `${o.id} game ended`).not.toBeNull();
      }
    }
  });

  it('migrant starts with a registration clock and no patent', () => {
    const s = G.newState('T', 'tajik');
    expect(s.docs.reg).toBe(15);
    expect(G.problems(s)).not.toContain('working without a valid patent');
    s.job = 'courier';
    expect(G.problems(s)).toContain('working without a valid patent');
  });
});

describe('life chains', () => {
  const runQueue = (s: G.State, pickIdx = 0): void => {
    let guard = 0;
    while (s.queue.length && guard++ < 50) {
      const sc = G.get(s.queue.shift() as string, s);
      if (sc) G.choose(s, sc, Math.min(pickIdx, sc.choices.length - 1));
    }
  };

  it('a booked international flight runs from departure to return', () => {
    const s = G.newState('Rustam', 'tajik');
    s.queue = []; s.docs.reg = 500; s.money = 300000;
    s.booking = { dest: 'dushanbe', intl: true, dep: s.day + 2, stay: 7, price: 20000, pnr: 'ABC123', passenger: 'RUSTAM RAHIMOV', passport: 'AB1234567', baggage: false, done: false };
    G.endDay(s); G.endDay(s);
    expect(s.queue).toContain('fl_airport');
    const dayBefore = s.day;
    runQueue(s);
    expect(s.booking).toBeNull();
    expect(s.day).toBeGreaterThanOrEqual(dayBefore + 7);
    expect(s.over).toBeNull();
  });

  it('a wrong passport name costs a correction fee at check-in', () => {
    const s = G.newState('Rustam', 'tajik');
    s.queue = []; s.docs.reg = 500; s.money = 100000;
    s.booking = { dest: 'dushanbe', intl: true, dep: s.day, stay: 3, price: 20000, pnr: 'XYZ999', passenger: 'ROSTAM RAHIMOV', passport: 'AB1234567', baggage: false, done: false };
    const sc = G.get('fl_security', s) as G.Scenario;
    const before = s.money;
    G.choose(s, sc, 0);
    expect(s.money).toBe(before - 3500);
  });

  it('collapsing sends you to hospital and you come out healthier', () => {
    const s = G.newState('T', 'moscow');
    s.queue = []; s.health = 10; s.money = 100000;
    G.endDay(s);
    expect(s.queue).toContain('hosp_admit');
    runQueue(s);
    expect(s.health).toBeGreaterThan(30);
  });

  it('adopting a dog sets a pet', () => {
    const s = G.newState('T', 'moscow');
    s.queue = []; s.money = 100000; s.rent = 0; s.tmp.dog = 'Belka'; s.tmp.dogKind = 'mixed breed';
    s.queue.push('pet_check');
    runQueue(s);
    expect(s.pet?.name).toBe('Belka');
  });

  it('buying a village house makes you a homeowner', () => {
    const s = G.newState('T', 'moscow');
    s.queue = []; s.money = 900000;
    const sc = G.get('estate_buy', s) as G.Scenario;
    G.choose(s, sc, 0);
    expect(s.housing).toBe('village');
    expect(s.rent).toBe(0);
  });
});
