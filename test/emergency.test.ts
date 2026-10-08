import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const ids = (origin: string): string[] => {
  const s = G.newState('T', origin); s.queue = [];
  return G.eligible(s, ['health']).map(x => x.id).filter(i => i.startsWith('emerg-'));
};

describe('the emergency pack', () => {
  it('has 8 scenes with two choices and finite outcomes', () => {
    const list = G.scenarios.filter(x => x.id.startsWith('emerg-'));
    expect(list.length).toBe(8);
    for (const sc of list) {
      expect(sc.choices.length).toBe(2);
      for (let i = 0; i < 2; i++) { const s = G.newState('T', 'moscow'); G.choose(s, sc, i); expect(Number.isFinite(s.health + s.stress + s.money)).toBe(true); }
    }
  });
  it('the first choice (the right call) never gives less knowledge or health than the second in the safety scenes', () => {
    for (const id of ['numbers', 'operator', 'fire', 'gas', 'collapse']) {
      const sc = G.scenarios.find(x => x.id === 'emerg-' + id) as G.Scenario;
      const fx = (i: number): G.Effects => (sc.choices[i].r as (s: G.State) => G.Outcome)(G.newState('T', 'tajik')).fx;
      expect(fx(0).know ?? 0).toBeGreaterThanOrEqual(fx(1).know ?? 0);
      expect(fx(0).health ?? 0).toBeGreaterThanOrEqual(fx(1).health ?? 0);
    }
  });
  it('the call-with-little-Russian scene is only for non-citizens', () => {
    expect(ids('moscow')).not.toContain('emerg-operator');
    expect(ids('tajik')).toContain('emerg-operator');
    expect(ids('moscow').length).toBe(7);
  });
});
