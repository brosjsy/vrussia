import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const stu = (origin = 'dagestan'): G.State => { const s = G.newState('T', origin); s.queue = []; return s; };
const ids = (s: G.State): string[] => G.eligible(s, ['edu']).map(x => x.id).filter(i => i.startsWith('stu-'));

describe('student life pack', () => {
  it('has 14 scenes, only for admitted students', () => {
    expect(G.scenarios.filter(x => x.id.startsWith('stu-')).length).toBe(14);
    const s = G.newState('T', 'moscow'); s.queue = [];
    expect(ids(s).length).toBe(0);
    s.flags.admitted = true;
    expect(ids(s).length).toBe(13);                 // the registration check is for foreign students only
  });

  it('the registration check is for foreign students and can extend the registration', () => {
    expect(ids(stu('dagestan'))).not.toContain('stu-registration');
    const f = stu('student');
    expect(ids(f)).toContain('stu-registration');
    const before = f.docs.reg;
    G.choose(f, G.get('stu-registration', f) as G.Scenario, 1);
    expect(f.docs.reg).toBe(before + 5);
  });

  it('an expelled student no longer sees them', () => {
    const s = stu(); s.flags.admitted = false; s.flags.expelled = true;
    expect(ids(s).length).toBe(0);
  });

  it('studying hard is rewarded with knowledge, cramming costs energy', () => {
    const a = stu(), b = stu(); a.energy = b.energy = 100; a.know = b.know = 20;
    G.choose(a, G.get('stu-kursovaya', a) as G.Scenario, 0);
    G.choose(b, G.get('stu-kursovaya', b) as G.Scenario, 1);
    expect(a.know).toBeGreaterThan(b.know);
    expect(b.energy).toBeLessThan(a.energy);
  });

  it('the automatic pass gives rest and reputation', () => {
    const s = stu(); s.stress = 50; s.rep = 40;
    G.choose(s, G.get('stu-avtomat', s) as G.Scenario, 0);
    expect(s.stress).toBeLessThan(50); expect(s.rep).toBe(42);
  });

  it('every choice runs', () => {
    const s = stu('student');
    for (const sc of G.scenarios.filter(x => x.id.startsWith('stu-'))) for (let i = 0; i < sc.choices.length; i++) expect(() => G.choose(structuredClone(s), sc, i), sc.id).not.toThrow();
  });
});
