import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const ids = (bank: boolean, phone = 1): string[] => {
  const s = G.newState('T', 'moscow'); s.queue = []; s.phone = phone; s.bank = bank ? { sber: true } : {};
  return G.eligible(s, ['shop']).map(x => x.id).filter(i => i.startsWith('shopping-'));
};

describe('the shopping pack', () => {
  it('has 10 scenes with two choices, finite outcomes and costs under 1,000', () => {
    const list = G.scenarios.filter(x => x.id.startsWith('shopping-'));
    expect(list.length).toBe(10);
    for (const sc of list) {
      expect(sc.choices.length).toBe(2);
      for (let i = 0; i < 2; i++) { const s = G.newState('T', 'moscow'); const m = s.money; G.choose(s, sc, i); expect(Number.isFinite(s.money + s.stress)).toBe(true); expect(m - s.money).toBeLessThanOrEqual(1000); }
    }
  });
  it('the return-and-exchange scenes state the 14-day rule and the non-returnable list in general terms', () => {
    const text = (id: string): string => (G.scenarios.find(x => x.id === id) as G.Scenario).text;
    expect(text('shopping-exchange')).toContain('14 days');
    expect(text('shopping-no-return')).toMatch(/medicines.*underwear/);
  });
  it('QR payments need a bank account, and a phone-based scene needs a working phone', () => {
    expect(ids(false)).not.toContain('shopping-sbp-qr');
    expect(ids(true)).toContain('shopping-sbp-qr');
    expect(ids(true, 0)).not.toContain('shopping-sbp-qr');
    expect(ids(true, 0)).not.toContain('shopping-loyalty');
    expect(ids(false).length).toBe(9);   // all but the QR scene
  });
});
