import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

/** First game day that falls in the given calendar month. */
const dayIn = (month: number): number => { const s = G.newState('T', 'moscow'); for (let d = 0; d < 400; d++) { s.day = d; if (G.dateOf(s).getMonth() + 1 === month) return d; } throw new Error('no such month'); };
const at = (month: number, owner = false): string[] => {
  const s = G.newState('T', 'moscow'); s.queue = []; s.day = dayIn(month);
  if (owner) s.housing = 'village';
  return G.eligible(s, ['social']).map(x => x.id).filter(i => i.startsWith('dacha-'));
};

describe('the dacha pack', () => {
  it('has 14 scenes', () => { expect(G.scenarios.filter(x => x.id.startsWith('dacha-')).length).toBe(14); });

  it('follows the dacha season (May to September) with an autumn closing and a winter woodpile for owners', () => {
    expect(at(1)).toEqual([]);                                   // January: nothing for non-owners
    expect(at(5)).toEqual(expect.arrayContaining(['dacha-opening', 'dacha-potatoes', 'dacha-elektrichka', 'dacha-banya', 'dacha-shashlik']));
    expect(at(7)).toEqual(expect.arrayContaining(['dacha-greenhouse', 'dacha-mosquitoes', 'dacha-berries', 'dacha-fence']));
    expect(at(8)).toContain('dacha-harvest');
    expect(at(10)).toContain('dacha-closing');
    expect(at(10)).not.toContain('dacha-elektrichka');           // the season is over
    expect(at(12)).not.toContain('dacha-potatoes');
  });

  it('the roof and the firewood are only for people who own a village house', () => {
    expect(at(7)).not.toContain('dacha-roof');
    expect(at(7, true)).toContain('dacha-roof');
    expect(at(11)).not.toContain('dacha-firewood');
    expect(at(11, true)).toContain('dacha-firewood');
    const inherited = G.newState('T', 'moscow'); inherited.queue = []; inherited.day = dayIn(11); inherited.flags.villageFlat = true;
    expect(G.eligible(inherited, ['social']).map(x => x.id)).toContain('dacha-firewood');
  });

  it('paying for a carpenter costs money and fixing it yourself costs energy', () => {
    const a = G.newState('T', 'moscow'), b = G.newState('T', 'moscow');
    for (const s of [a, b]) { s.queue = []; s.money = 10000; s.energy = 100; }
    G.choose(a, G.get('dacha-roof', a) as G.Scenario, 0);
    G.choose(b, G.get('dacha-roof', b) as G.Scenario, 1);
    expect(b.money).toBeLessThan(a.money);
    expect(a.energy).toBeLessThan(b.energy);
  });

  it('every choice runs', () => {
    const s = G.newState('T', 'moscow'); s.queue = [];
    for (const sc of G.scenarios.filter(x => x.id.startsWith('dacha-'))) for (let i = 0; i < sc.choices.length; i++) expect(() => G.choose(structuredClone(s), sc, i), sc.id).not.toThrow();
  });
});
