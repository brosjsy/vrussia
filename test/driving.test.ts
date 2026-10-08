import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const person = (origin: string, money = 50000): G.State => { const s = G.newState('T', origin); s.queue = []; s.money = money; s.docs.reg = 100; return s; };
const roll = (value: number, fn: () => void): void => { const orig = Math.random; Math.random = () => value; try { fn(); } finally { Math.random = orig; } };
const carIds = (s: G.State): string[] => G.eligible(s, ['car']).map(x => x.id);

describe('driving licence', () => {
  it('the driving-school scene no longer states an unverified number of hours and describes the exam order', () => {
    const t = (G.get('driving_school', person('moscow')) as G.Scenario).text;
    expect(t).not.toContain('56 hours');
    for (const part of ['March 2026', 'theory', 'practical']) expect(t).toContain(part);
  });

  it('the exchange route is only for foreigners without a Russian licence', () => {
    expect(carIds(person('tajik'))).toContain('driving_exchange');
    expect(carIds(person('moscow'))).not.toContain('driving_exchange');
    const done = person('tajik'); done.flags.license = true;
    expect(carIds(done)).not.toContain('driving_exchange');
  });

  it('passing the theory exam gives a licence for 5,500; failing costs 2,500 and can be retried', () => {
    const ok = person('tajik'); ok.know = 60;
    roll(0.1, () => G.choose(ok, G.get('driving_exchange', ok) as G.Scenario, 0));
    expect(ok.flags.license).toBe(true); expect(ok.money).toBe(50000 - 5500);
    const bad = person('tajik'); bad.know = 60;
    roll(0.99, () => G.choose(bad, G.get('driving_exchange', bad) as G.Scenario, 0));
    expect(bad.flags.license).toBeFalsy(); expect(bad.money).toBe(50000 - 2500);
    expect(carIds(bad)).toContain('driving_exchange');
  });

  it('it needs the money and a valid registration', () => {
    const poor = person('tajik', 1000);
    G.choose(poor, G.get('driving_exchange', poor) as G.Scenario, 0);
    expect(poor.money).toBe(1000); expect(poor.flags.license).toBeFalsy();
    const unregistered = person('tajik'); unregistered.docs.reg = 0;
    G.choose(unregistered, G.get('driving_exchange', unregistered) as G.Scenario, 0);
    expect(unregistered.money).toBe(50000); expect(unregistered.flags.license).toBeFalsy();
  });

  it('once licensed, the dealership route opens as before', () => {
    const s = person('tajik'); s.flags.license = true;
    expect(carIds(s)).toContain('car_dealer');
  });
});
