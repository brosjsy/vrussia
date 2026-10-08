import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

describe('achievements', () => {
  it('have unique ids and never throw on any starting state', () => {
    expect(new Set(G.ACHIEVEMENTS.map(a => a.id)).size).toBe(G.ACHIEVEMENTS.length);
    for (const o of G.origins) {
      const s = G.newState('T', o.id);
      for (const a of G.ACHIEVEMENTS) expect(() => a.done(s), a.id).not.toThrow();
    }
  });

  it('unlock once and only once', () => {
    const s = G.newState('T', 'moscow'); s.queue = [];
    expect(G.checkAchievements(s).map(a => a.id)).not.toContain('bank');
    s.bank.sber = true;
    expect(G.checkAchievements(s).map(a => a.id)).toContain('bank');
    expect(G.checkAchievements(s).map(a => a.id)).not.toContain('bank');
    expect(s.ach).toContain('bank');
  });

  it('are reported by choose()', () => {
    const s = G.newState('T', 'moscow'); s.queue = []; s.money = 900000;
    const out = G.choose(s, G.get('estate_buy', s) as G.Scenario, 0);   // buys a village house
    expect(out.unlocked.map(a => a.id)).toContain('homeowner');
  });

  it('a long game unlocks several of them', () => {
    const s = G.newState('T', 'moscow'); s.queue = [];
    s.day = 400; s.money = 2_000_000; s.flags.license = true; s.friends = 6; s.strikes = 0;
    const got = G.checkAchievements(s).map(a => a.id);
    for (const id of ['week', 'winter', 'millionaire', 'driver', 'friends', 'clean']) expect(got).toContain(id);
  });
});
