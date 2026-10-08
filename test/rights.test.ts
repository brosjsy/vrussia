import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const newcomer = (): G.State => { const s = G.newState('T', 'tajik'); s.queue = []; s.day = 30; s.docs.reg = 0; return s; };   // no valid registration
const rights = (): G.Scenario[] => G.scenarios.filter(x => x.id.startsWith('right-'));

describe('know your rights', () => {
  it('has 7 scenes, all in the police group and for foreigners only', () => {
    expect(rights().length).toBe(7);
    for (const sc of rights()) { expect(sc.cat).toBe('police'); expect(sc.who).toEqual(['foreigner']); }
    const c = G.newState('T', 'moscow'); c.queue = [];
    expect(G.eligible(c, ['police']).filter(x => x.id.startsWith('right-')).length).toBe(0);
    expect(G.eligible(newcomer(), ['police']).filter(x => x.id.startsWith('right-')).length).toBe(7);
  });

  it('the leaflet teaches the rights once', () => {
    const s = newcomer();
    G.choose(s, G.get('right-leaflet', s) as G.Scenario, 0);
    expect(s.flags.knowsRights).toBe(true);
    expect(G.eligible(s, ['police']).map(x => x.id)).not.toContain('right-leaflet');
    const lazy = newcomer();
    G.choose(lazy, G.get('right-leaflet', lazy) as G.Scenario, 1);
    expect(lazy.flags.knowsRights).toBeFalsy();
  });

  it('informed choices avoid legal strikes, uninformed ones can cause them', () => {
    const asked = newcomer(), refused = newcomer(), signed = newcomer(), objected = newcomer();
    G.choose(asked, G.get('right-grounds', asked) as G.Scenario, 0);
    G.choose(refused, G.get('right-grounds', refused) as G.Scenario, 1);
    expect(asked.strikes).toBe(0); expect(refused.strikes).toBe(1);
    G.choose(objected, G.get('right-sign', objected) as G.Scenario, 0);
    G.choose(signed, G.get('right-sign', signed) as G.Scenario, 1);
    expect(objected.money).toBeGreaterThan(signed.money);
    const noInterp = newcomer(); G.choose(noInterp, G.get('right-interpreter', noInterp) as G.Scenario, 1);
    expect(noInterp.strikes).toBe(1);
  });

  it('knowing your rights makes the polite option in a police check more likely to work', () => {
    const roll = (knows: boolean): number => {
      const s = newcomer(); s.queue = []; if (knows) s.flags.knowsRights = true;
      const orig = Math.random; Math.random = () => 0.5;       // base chance 0.45, with the leaflet 0.60
      try { G.choose(s, G.get('pol-0-0', s) as G.Scenario, 1); } finally { Math.random = orig; }
      return s.strikes;
    };
    expect(roll(false)).toBe(1);
    expect(roll(true)).toBe(0);
  });

  it('the text mentions the real duties and rights', () => {
    const s = newcomer();
    const all = rights().map(sc => G.materialize(sc, s)).map(sc => sc.text + sc.choices.map(c => c.t).join(' ')).join(' ');
    for (const word of ['original', 'interpreter', 'witnesses', 'three hours', 'refuse to sign', 'grounds']) expect(all.toLowerCase(), word).toContain(word.toLowerCase());
  });

  it('every choice runs', () => {
    const s = newcomer();
    for (const sc of rights()) for (let i = 0; i < sc.choices.length; i++) expect(() => G.choose(structuredClone(s), sc, i), sc.id).not.toThrow();
  });
});
