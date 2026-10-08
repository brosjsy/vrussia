import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const wd = (): G.Scenario[] => G.scenarios.filter(x => x.id.startsWith('wd-'));

describe('ordinary workdays', () => {
  it('has 21 generic scenes, none for the unemployed', () => {
    expect(wd().length).toBe(21);
    const s = G.newState('T', 'moscow'); s.queue = [];
    expect(G.eligible(s, ['work']).filter(x => x.id.startsWith('wd-')).length).toBe(0);
  });

  it('employed players of any job can get them, with weather and season respected', () => {
    for (const job of ['courier', 'dev', 'miner', 'baker']) {
      const s = G.newState('T', 'moscow'); s.queue = []; s.job = job; s.weather = 'clear'; s.day = 30;   // early October
      const ids = G.eligible(s, ['work']).map(x => x.id);
      expect(ids.filter(i => i.startsWith('wd-')).length, job).toBeGreaterThanOrEqual(18);
      expect(ids).not.toContain('wd-commute');       // needs snow or frost
      expect(ids).not.toContain('wd-heat');          // needs July or August
    }
    const w = G.newState('T', 'moscow'); w.queue = []; w.job = 'courier'; w.weather = 'snow';
    expect(G.eligible(w, ['work']).map(x => x.id)).toContain('wd-commute');
  });

  it('a long career shows much more variety than before and no scene dominates', () => {
    const s = G.newState('T', 'moscow'); s.queue = []; s.job = 'courier'; s.energy = 100;
    const seen: Record<string, number> = {};
    for (let i = 0; i < 330; i++) {
      s.energy = 100; s.stress = 10; s.health = 100;        // keep the player healthy: this measures variety only
      const r = G.perform(s, 'work');
      if (r.sc) { seen[r.sc.id] = (seen[r.sc.id] || 0) + 1; G.choose(s, r.sc, 0); }
      s.queue = [];
    }
    const counts = Object.values(seen);
    expect(Object.keys(seen).length, 'distinct scenes').toBeGreaterThanOrEqual(24);
    expect(Math.max(...counts), 'most repeated scene').toBeLessThanOrEqual(22);
  });

  it('all choices run', () => {
    const s = G.newState('T', 'moscow'); s.queue = []; s.job = 'courier';
    for (const sc of wd()) for (let i = 0; i < sc.choices.length; i++) expect(() => G.choose(structuredClone(s), sc, i), sc.id).not.toThrow();
  });
});
