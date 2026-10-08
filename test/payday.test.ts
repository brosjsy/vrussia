import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const ids = (job: string | null): string[] => {
  const s = G.newState('T', 'moscow'); s.queue = []; s.job = job;
  return G.eligible(s, ['work']).map(x => x.id).filter(i => i.startsWith('pay-'));
};

describe('the payday pack', () => {
  it('has 9 scenes with two choices, finite outcomes and small costs', () => {
    const list = G.scenarios.filter(x => x.id.startsWith('pay-'));
    expect(list.length).toBe(9);
    for (const sc of list) {
      expect(sc.choices.length).toBe(2);
      for (let i = 0; i < 2; i++) { const s = G.newState('T', 'moscow'); const m = s.money; G.choose(s, sc, i); expect(Number.isFinite(s.money + s.stress)).toBe(true); expect(m - s.money).toBeLessThanOrEqual(1000); }
    }
  });
  it('only people with a job see wage scenes', () => {
    expect(ids(null)).toEqual([]);
    const job = G.jobs[0].id;
    expect(ids(job).length).toBeGreaterThanOrEqual(8);
    expect(ids(job)).toContain('pay-advance');
  });
});
