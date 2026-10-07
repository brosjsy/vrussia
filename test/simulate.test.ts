import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import { countStats } from '../src/content';

describe('content', () => {
  it('has 1,000+ scenarios with unique ids', () => {
    const { total } = countStats();
    expect(total).toBeGreaterThan(1000);
    expect(new Set(G.scenarios.map(s => s.id)).size).toBe(total);
  });

  it('every static scenario has choices', () => {
    for (const sc of G.scenarios) expect(sc.choices.length, sc.id).toBeGreaterThan(0);
  });
});

describe('simulation', () => {
  it('plays random games for every origin without crashing or leaving valid ranges', () => {
    for (const o of G.origins) {
      for (let game = 0; game < 20; game++) {
        const s = G.newState('T', o.id);
        let steps = 0;
        while (!s.over && steps++ < 6000) {
          if (s.queue.length) {
            const sc = G.get(s.queue.shift() as string, s);
            if (sc) G.choose(s, sc, Math.floor(Math.random() * sc.choices.length));
            continue;
          }
          const r = G.perform(s, G.pick(G.actions).id);
          if (!r.sc) continue;
          G.choose(s, r.sc, Math.floor(Math.random() * r.sc.choices.length));
          for (const k of ['energy', 'health', 'stress', 'rep', 'know'] as const) {
            expect(s[k], `${o.id}:${k}`).toBeGreaterThanOrEqual(0);
            expect(s[k], `${o.id}:${k}`).toBeLessThanOrEqual(100);
          }
          expect(Number.isNaN(s.money)).toBe(false);
        }
        expect(s.over, `${o.id} game ended`).not.toBeNull();
      }
    }
  });

  it('migrant starts with a registration clock and no patent', () => {
    const s = G.newState('T', 'tajik');
    expect(s.docs.reg).toBe(7);
    expect(G.problems(s)).not.toContain('working without a valid patent');
    s.job = 'courier';
    expect(G.problems(s)).toContain('working without a valid patent');
  });
});
