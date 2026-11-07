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

  it('the exchange route is only for foreigners without a Russian licence who passed the theory exam on the portal', () => {
    const f = person('tajik'); expect(carIds(f)).not.toContain('driving_exchange');
    f.flags.theory = true; expect(carIds(f)).toContain('driving_exchange');
    expect(carIds(person('moscow'))).not.toContain('driving_exchange');
    const done = person('tajik'); done.flags.theory = true; done.flags.license = true;
    expect(carIds(done)).not.toContain('driving_exchange');
  });

  it('with the theory passed on the portal, the exchange gives the licence for 5,500', () => {
    const ok = person('tajik'); ok.flags.theory = true;
    G.choose(ok, G.get('driving_exchange', ok) as G.Scenario, 0);
    expect(ok.flags.license).toBe(true); expect(ok.money).toBe(50000 - 5500);
  });

  it('it needs the money and a valid registration', () => {
    const poor = person('tajik', 1000); poor.flags.theory = true;
    G.choose(poor, G.get('driving_exchange', poor) as G.Scenario, 0);
    expect(poor.money).toBe(1000); expect(poor.flags.license).toBeFalsy();
    const unregistered = person('tajik'); unregistered.docs.reg = 0; unregistered.flags.theory = true;
    G.choose(unregistered, G.get('driving_exchange', unregistered) as G.Scenario, 0);
    expect(unregistered.money).toBe(50000); expect(unregistered.flags.license).toBeFalsy();
  });

  it('once licensed, the dealership route opens as before', () => {
    const s = person('tajik'); s.flags.license = true;
    expect(carIds(s)).toContain('car_dealer');
  });
});
