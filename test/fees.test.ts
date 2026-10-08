import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const mk = (flags: Record<string, boolean>, money: number): G.State => {
  const s = G.newState('T', 'tajikistan');
  Object.assign(s.flags, flags); s.money = money; s.day = 1000;
  return s;
};

describe('immigration state duties (law in force 26 July 2026)', () => {
  it('constants match the verified amounts', () => {
    expect(G.FEE).toEqual({ rvp: 15000, vnzh: 30000, citizen: 50000 });
  });
  for (const [id, fee, flags] of [
    ['rvp_apply', 15000, { rutest: true, rvpGround: true }],
    ['vnzh_apply', 30000, { rvp: true }],
    ['citizenship', 50000, { rvp: true, vnzh: true }],
  ] as [string, number, Record<string, boolean>][]) {
    it(`${id}: refuses when poor, charges ${fee} when rich`, () => {
      const poor = mk(flags, fee - 1);
      const sc = G.get(id, poor) as G.Scenario;
      const r0 = (sc.choices[0].r as (x: G.State) => G.Outcome)(poor);
      expect(r0.fx.money ?? 0).toBe(0);
      const rich = mk(flags, fee + 1);
      const r1 = (sc.choices[0].r as (x: G.State) => G.Outcome)(rich);
      expect(r1.fx.money).toBe(-fee);
    });
  }
});
