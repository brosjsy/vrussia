import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const ids = (money: number): string[] => {
  const s = G.newState('T', 'moscow'); s.queue = []; s.money = money;
  return G.eligible(s, ['life']).map(x => x.id).filter(i => i.startsWith('rail-'));
};

describe('the rail pack', () => {
  it('has 9 scenes with two choices, finite outcomes, and the dearest choice is gated by money', () => {
    const list = G.scenarios.filter(x => x.id.startsWith('rail-'));
    expect(list.length).toBe(9);
    for (const sc of list) {
      expect(sc.choices.length).toBe(2);
      for (let i = 0; i < 2; i++) { const s = G.newState('T', 'moscow'); const m = s.money; G.choose(s, sc, i); expect(Number.isFinite(s.money + s.energy)).toBe(true); expect(m - s.money).toBeLessThanOrEqual(6000); }
    }
  });
  it('the platzkart-or-kupe choice appears only for players who can afford a kupe ticket', () => {
    expect(ids(1000)).not.toContain('rail-platzkart');
    expect(ids(20000)).toContain('rail-platzkart');
    expect(ids(20000).length).toBe(9);
  });
  it('the "left on the platform" scene is rare', () => {
    const w = (id: string): number => (G.scenarios.find(x => x.id === id) as G.Scenario).w ?? 1;
    expect(w('rail-missed-train')).toBeLessThan(w('rail-tea'));
  });
});
