import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const ARCS = ['timur', 'valya', 'aigul', 'petrov', 'rustam', 'sergey', 'olga', 'ginger', 'vladimir', 'zarina', 'professor', 'connections', 'mum'];

function ready(origin: string): G.State {
  const s = G.newState('T', origin); s.queue = []; s.day = 60; s.know = 40; s.money = 50000;
  return s;
}
const stepId = (arc: string, i: number): string => `arc_${arc}_${i}`;
const eligibleArcs = (s: G.State): string[] => G.eligible(s, ['arc']).map(x => x.id);

describe('storylines', () => {
  for (const arc of ARCS) {
    it(`${arc}: five steps appear in order, each only after the previous one and a pause`, () => {
      const s = ready(arc === 'timur' || arc === 'olga' ? 'tajik' : arc === 'mum' ? 'region' : 'moscow');
      s.know = arc === 'olga' ? 20 : 40;
      if (['petrov', 'rustam', 'ginger'].includes(arc)) s.rent = 3000;
      if (arc === 'sergey' || arc === 'zarina') s.job = 'courier';
      if (arc === 'professor') s.flags.admitted = true;
      for (let i = 0; i < 5; i++) {
        expect(eligibleArcs(s), `${arc} step ${i}`).toContain(stepId(arc, i));
        for (let j = i + 1; j < 5; j++) expect(eligibleArcs(s)).not.toContain(stepId(arc, j));
        const sc = G.get(stepId(arc, i), s) as G.Scenario;
        expect(sc.choices.length).toBeGreaterThan(0);
        G.choose(s, sc, 0);
        expect(s.flags[stepId(arc, i)]).toBe(true);
        expect(eligibleArcs(s)).not.toContain(stepId(arc, i));   // never repeats
        if (i < 4) expect(eligibleArcs(s)).not.toContain(stepId(arc, i + 1));   // pause before the next step
        s.day += 15;
      }
    });
  }

  it('earlier choices change later scenes (Timur remembers a loan)', () => {
    const lent = ready('tajik'), cold = ready('tajik');
    for (const [s, pick] of [[lent, 0], [cold, 2]] as [G.State, number][]) {
      for (let i = 0; i < 3; i++) { G.choose(s, G.get(stepId('timur', i), s) as G.Scenario, i === 2 ? pick : 0); s.day += 15; }
    }
    const a = G.get(stepId('timur', 3), lent) as G.Scenario, b = G.get(stepId('timur', 3), cold) as G.Scenario;
    expect(a.text).not.toBe(b.text);
    const before = lent.money;
    G.choose(lent, a, 0);
    expect(lent.money).toBe(before + 5200);          // the loan comes back with thanks
  });

  it('the landlord arc changes the rent', () => {
    const s = ready('moscow'); s.rent = 4000;
    G.choose(s, G.get(stepId('petrov', 0), s) as G.Scenario, 0); s.day += 15;
    G.choose(s, G.get(stepId('petrov', 1), s) as G.Scenario, 0);   // negotiate: +250
    expect(s.rent).toBe(4250);
    s.day += 15;
    G.choose(s, G.get(stepId('petrov', 2), s) as G.Scenario, 0); s.day += 15;
    G.choose(s, G.get(stepId('petrov', 3), s) as G.Scenario, 0);   // trusted tenant gets a discount
    expect(s.rent).toBe(3950);
  });

  it('storyline scenes are reachable through the People action', () => {
    const s = ready('moscow'); let seen = false;
    for (let i = 0; i < 60 && !seen; i++) { const r = G.perform(s, 'people'); if (r.sc?.cat === 'arc') seen = true; }
    expect(seen).toBe(true);
  });
});

describe('Olga Petrovna really helps with the language test', () => {
  it('a mock exam raises the chance of passing', () => {
    const run = (prep: boolean): boolean => {
      const s = G.newState('T', 'tajik'); s.queue = []; s.day = 60; s.know = 20; s.money = 50000;
      if (prep) s.flags.olga_prep = true;
      const orig = Math.random; Math.random = () => 0.7;     // base chance 0.50, with prep 0.75
      try { G.choose(s, G.get('rutest', s) as G.Scenario, 0); } finally { Math.random = orig; }
      return !!s.flags.rutest;
    };
    expect(run(false)).toBe(false);
    expect(run(true)).toBe(true);
  });

  it('the language test can be retaken after a failure', () => {
    const s = G.newState('T', 'tajik'); s.queue = []; s.day = 60; s.know = 0; s.money = 50000;
    const orig = Math.random; Math.random = () => 0.99;
    try { G.choose(s, G.get('rutest', s) as G.Scenario, 0); } finally { Math.random = orig; }
    expect(s.flags.rutest).toBeFalsy();
    expect(G.eligible(s, ['paper']).map(x => x.id)).toContain('rutest');
  });
});

describe('the Zarina romance', () => {
  const play = (choices: number[]): G.State => {
    const s = ready('moscow'); s.job = 'courier';
    choices.forEach((c, i) => { G.choose(s, G.get(stepId('zarina', i), s) as G.Scenario, c); s.day += 15; });
    return s;
  };
  it('can end in a partnership, with more warmth if you were open', () => {
    const open = play([0, 0, 0, 0, 0]);
    expect(open.partner?.name).toBe('Zarina');
    expect(open.partner?.love).toBe(60);
    const cold = play([1 - 1, 0, 2, 0, 0]);          // choosing "let it pass" at the misunderstanding
    expect(cold.partner?.love).toBeLessThan(60);
  });
  it('asking for time leaves you single and does not crash', () => {
    const s = play([0, 0, 0, 0, 1]);
    expect(s.partner).toBeNull();
  });
  it('does not replace an existing partner', () => {
    const s = ready('moscow'); s.job = 'courier';
    for (let i = 0; i < 4; i++) { G.choose(s, G.get(stepId('zarina', i), s) as G.Scenario, 0); s.day += 15; }
    s.partner = { name: 'Anna', kind: 'citizen', love: 70 };
    G.choose(s, G.get(stepId('zarina', 4), s) as G.Scenario, 0);
    expect(s.partner.name).toBe('Anna');
  });
});

describe('stories for the two citizen origins', () => {
  it('only the matching origin sees each story', () => {
    const m = ready('moscow'), r = ready('region'), d = ready('dagestan');
    expect(eligibleArcs(m)).toContain(stepId('connections', 0)); expect(eligibleArcs(m)).not.toContain(stepId('mum', 0));
    expect(eligibleArcs(r)).toContain(stepId('mum', 0)); expect(eligibleArcs(r)).not.toContain(stepId('connections', 0));
    expect(eligibleArcs(d)).not.toContain(stepId('mum', 0)); expect(eligibleArcs(d)).not.toContain(stepId('connections', 0));
  });

  it('refusing connections costs comfort but earns reputation, using them costs reputation', () => {
    const own = ready('moscow'), used = ready('moscow'); own.rep = used.rep = 50;
    G.choose(own, G.get(stepId('connections', 0), own) as G.Scenario, 1);
    G.choose(used, G.get(stepId('connections', 0), used) as G.Scenario, 0);
    expect(own.rep).toBeGreaterThan(used.rep);
    expect(own.flags.conn_own).toBe(true); expect(used.flags.conn_used).toBe(true);
  });

  it('the final scene of the connections story remembers whether you went your own way', () => {
    const own = ready('moscow'), used = ready('moscow');
    for (let i = 0; i < 4; i++) { G.choose(own, G.get(stepId('connections', i), own) as G.Scenario, 1); own.day += 15; G.choose(used, G.get(stepId('connections', i), used) as G.Scenario, 0); used.day += 15; }
    expect((G.get(stepId('connections', 4), own) as G.Scenario).text).not.toBe((G.get(stepId('connections', 4), used) as G.Scenario).text);
  });

  it('visiting Mum for New Year raises the family bond more than staying to work', () => {
    const home = ready('region'), work = ready('region'); home.money = work.money = 50000; home.famLove = work.famLove = 50;
    for (const [s, pick] of [[home, 0], [work, 1]] as [G.State, number][]) {
      G.choose(s, G.get(stepId('mum', 0), s) as G.Scenario, 0); s.day += 15;
      G.choose(s, G.get(stepId('mum', 1), s) as G.Scenario, 0); s.day += 15;
      G.choose(s, G.get(stepId('mum', 2), s) as G.Scenario, pick);
    }
    expect(home.famLove).toBeGreaterThan(work.famLove);
    expect(home.money).toBeLessThan(work.money);
  });

  it('the scare reacts to how close you stayed', () => {
    const close = ready('region'), far = ready('region'); close.money = far.money = 50000;
    G.choose(close, G.get(stepId('mum', 0), close) as G.Scenario, 0); far.day = close.day;
    G.choose(far, G.get(stepId('mum', 0), far) as G.Scenario, 1);
    for (const s of [close, far]) { s.day += 15; G.choose(s, G.get(stepId('mum', 1), s) as G.Scenario, 2); s.day += 15; G.choose(s, G.get(stepId('mum', 2), s) as G.Scenario, 1); s.day += 15; }
    const a = G.get(stepId('mum', 3), close) as G.Scenario, b = G.get(stepId('mum', 3), far) as G.Scenario;
    expect(a.choices[0].t).not.toBe(b.choices[0].t);
  });
});

describe('seasonal storyline steps', () => {
  it('New Year at home only appears in November or December', () => {
    const s = ready('region');
    G.choose(s, G.get(stepId('mum', 0), s) as G.Scenario, 0); s.day += 15;
    G.choose(s, G.get(stepId('mum', 1), s) as G.Scenario, 0); s.day += 15;
    const at = (day: number): string[] => { const t = structuredClone(s); t.day = day; return eligibleArcs(t); };
    const month = (day: number): number => G.dateOf({ ...s, day } as G.State).getMonth() + 1;
    const summer = 300, december = 105;                        // days counted from 1 September 2026
    expect(month(summer)).toBe(6); expect(month(december)).toBe(12);
    expect(at(summer)).not.toContain(stepId('mum', 2));
    expect(at(december)).toContain(stepId('mum', 2));
  });
});
