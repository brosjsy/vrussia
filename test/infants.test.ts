import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const baby = (): G.State => { const s = G.newState('T', 'moscow'); s.queue = []; s.kids = 1; s.job = 'courier'; return s; };
const ids = (s: G.State): string[] => G.eligible(s, ['love']).map(x => x.id).filter(i => i.startsWith('baby-'));

describe('the first year with a baby', () => {
  it('has 14 scenes, none for people without a child', () => {
    expect(G.scenarios.filter(x => x.id.startsWith('baby-')).length).toBe(14);
    const s = G.newState('T', 'moscow'); s.queue = [];
    expect(ids(s).length).toBe(0);
  });

  it('seasonal scenes respect the season', () => {
    const s = baby();
    s.day = 120;                                   // late December
    expect(ids(s)).toContain('baby-stroller'); expect(ids(s)).toContain('baby-winterwear');
    s.day = 300;                                   // late June
    expect(ids(s)).not.toContain('baby-stroller'); expect(ids(s)).not.toContain('baby-winterwear');
  });

  it('the childcare allowance is for working citizens, once, and adds weekly income', () => {
    const s = baby();
    expect(ids(s)).toContain('baby-allowance');
    const before = s.allow;
    G.choose(s, G.get('baby-allowance', s) as G.Scenario, 0);
    expect(s.allow).toBe(before + 1800);
    expect(ids(s)).not.toContain('baby-allowance');
    const jobless = baby(); jobless.job = null;
    expect(ids(jobless)).not.toContain('baby-allowance');
    const migrant = G.newState('T', 'tajik'); migrant.queue = []; migrant.kids = 1; migrant.job = 'courier';
    expect(ids(migrant)).not.toContain('baby-allowance');
  });

  it('the nurse and vaccination scenes describe the real schedule', () => {
    const s = baby();
    expect((G.get('baby-nurse', s) as G.Scenario).text).toContain('three days');
    expect((G.get('baby-vaccine', s) as G.Scenario).text).toContain('4.5');
  });

  it('every choice runs', () => {
    const s = baby();
    for (const sc of G.scenarios.filter(x => x.id.startsWith('baby-'))) for (let i = 0; i < sc.choices.length; i++) expect(() => G.choose(structuredClone(s), sc, i), sc.id).not.toThrow();
  });
});
