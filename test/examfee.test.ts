import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

describe('the language exam when the player cannot pay', () => {
  it('is refused with at most 1 stress and no money or flag change', () => {
    const s = G.newState('T', 'student'); s.day = 40; s.money = 1000; s.stress = 50;
    const sc = G.get('rutest', s) as G.Scenario;
    expect(sc).toBeTruthy();
    const r = (sc.choices[0].r as (x: G.State) => G.Outcome)(s);
    expect(r.fx.money ?? 0).toBe(0);
    expect(r.fx.stress ?? 0).toBeLessThanOrEqual(1);
    expect(r.fx.flag).toBeUndefined();
  });
});
