import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const ids = (opts: { bank?: boolean; phone?: number }): string[] => {
  const s = G.newState('T', 'moscow'); s.queue = []; s.phone = opts.phone ?? 1; s.bank = opts.bank ? { sber: true } : {};
  return G.eligible(s, ['shop']).map(x => x.id).filter(i => i.startsWith('parcel-'));
};

describe('the parcels pack', () => {
  it('has 8 scenes with two choices and finite outcomes; refund scenes pay back, orders cost money', () => {
    const list = G.scenarios.filter(x => x.id.startsWith('parcel-'));
    expect(list.length).toBe(8);
    for (const sc of list) {
      expect(sc.choices.length).toBe(2);
      for (let i = 0; i < 2; i++) { const s = G.newState('T', 'moscow'); const m = s.money; G.choose(s, sc, i); expect(Number.isFinite(s.money + s.stress)).toBe(true); expect(m - s.money).toBeLessThanOrEqual(4000); }
    }
    const fx = (id: string, i: number): G.Effects => ((G.scenarios.find(x => x.id === id) as G.Scenario).choices[i].r as (s: G.State) => G.Outcome)(G.newState('T', 'moscow')).fx;
    expect(fx('parcel-return', 0).money).toBeGreaterThan(0);
    expect(fx('parcel-order', 1).money).toBeLessThan(fx('parcel-order', 0).money as number);
  });
  it('needs a phone; app payment and refund scenes need a bank account', () => {
    expect(ids({ phone: 0 })).toEqual([]);
    const without = ids({ bank: false });
    for (const id of ['parcel-order', 'parcel-return', 'parcel-fake-tracking']) expect(without).not.toContain(id);
    expect(ids({ bank: true }).length).toBe(8);
    expect(without.length).toBe(5);
  });
});
