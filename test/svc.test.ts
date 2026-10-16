import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const ids = (phone: number): string[] => {
  const s = G.newState('T', 'moscow'); s.queue = []; s.phone = phone;
  return G.eligible(s, ['life']).map(x => x.id).filter(i => i.startsWith('svc-'));
};

describe('the neighbourhood services pack', () => {
  it('has 8 scenes with two choices, finite outcomes and costs under 5,000; repairs improve clothing', () => {
    const list = G.scenarios.filter(x => x.id.startsWith('svc-'));
    expect(list.length).toBe(8);
    for (const sc of list) {
      expect(sc.choices.length).toBe(2);
      for (let i = 0; i < 2; i++) { const s = G.newState('T', 'moscow'); const m = s.money; G.choose(s, sc, i); expect(Number.isFinite(s.money + s.clothes)).toBe(true); expect(m - s.money).toBeLessThanOrEqual(5000); }
    }
    const fx = (id: string, i: number): G.Effects => ((G.scenarios.find(x => x.id === id) as G.Scenario).choices[i].r as (s: G.State) => G.Outcome)(G.newState('T', 'moscow')).fx;
    expect(fx('svc-shoes', 0).clothes).toBeGreaterThan(0);
    expect(fx('svc-tailor', 0).clothes).toBeGreaterThan(0);
  });
  it('the phone-screen kiosk needs a phone to repair; the rest do not', () => {
    expect(ids(0)).not.toContain('svc-screen');
    expect(ids(1)).toContain('svc-screen');
    expect(ids(0).length).toBe(7);
  });
});
