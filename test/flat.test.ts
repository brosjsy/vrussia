import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const dayIn = (month: number): number => { const s = G.newState('T', 'moscow'); for (let d = 0; d < 400; d++) { s.day = d; if (G.dateOf(s).getMonth() + 1 === month) return d; } throw new Error('no such month'); };
const at = (month: number, housing = 'rented'): string[] => {
  const s = G.newState('T', 'moscow'); s.queue = []; s.day = dayIn(month); s.housing = housing;
  return G.eligible(s, ['home']).map(x => x.id).filter(i => i.startsWith('flat-'));
};

describe('the flat pack', () => {
  it('has 10 scenes with two choices, finite outcomes and small costs', () => {
    const list = G.scenarios.filter(x => x.id.startsWith('flat-'));
    expect(list.length).toBe(10);
    for (const sc of list) {
      expect(sc.choices.length).toBe(2);
      for (let i = 0; i < 2; i++) { const s = G.newState('T', 'moscow'); const m = s.money; G.choose(s, sc, i); expect(Number.isFinite(s.money)).toBe(true); expect(m - s.money).toBeLessThanOrEqual(1500); }
    }
  });
  it('heating scenes follow the seasons', () => {
    expect(at(10)).toContain('flat-heating-on');
    expect(at(4)).toContain('flat-heating-off');
    expect(at(1)).toContain('flat-cold-flat');
    expect(at(7)).toContain('flat-hot-water');
    expect(at(7)).not.toContain('flat-heating-on');
    expect(at(10)).not.toContain('flat-hot-water');
  });
  it('deposit, viewing and landlord scenes are only for renters', () => {
    for (const id of ['flat-deposit', 'flat-viewing', 'flat-landlord-visit']) {
      expect(at(6, 'rented')).toContain(id);
      expect(at(6, 'owned')).not.toContain(id);
    }
  });
});
