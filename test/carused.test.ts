import { describe, it, expect, vi, afterEach } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

afterEach(() => { vi.restoreAllMocks(); });

const buy = (money: number, roll: number): { s: G.State; res: G.Outcome } => {
  const s = G.newState('T', 'moscow'); s.queue = []; s.day = 100; s.flags.license = true; s.money = money;
  const sc = G.get('car_used', s) as G.Scenario;
  vi.spyOn(Math, 'random').mockReturnValue(roll);
  const res = (sc.choices[0].r as (x: G.State) => G.Outcome)(s);
  G.apply(s, res.fx);
  return { s, res };
};

describe('buying the 2009 hatchback', () => {
  it('a breakdown after the purchase never pushes a buyer with just enough money into debt', () => {
    for (const money of [250000, 256000, 290000, 309999]) {
      const { s } = buy(money, 0.99);            // 0.99: the unlucky branch
      expect(s.money, `with ${money}`).toBeGreaterThanOrEqual(0);
      expect(s.car).toBeTruthy();
    }
  });
  it('a richer buyer still pays the full 60,000 repair', () => {
    const { s, res } = buy(400000, 0.99);
    expect(s.money).toBe(400000 - 310000);
    expect(res.msg).toContain('60,000');
  });
  it('the lucky branch costs exactly the price, and a poor buyer is refused', () => {
    expect(buy(300000, 0).s.money).toBe(50000);
    const { s, res } = buy(100000, 0);
    expect(s.money).toBe(100000); expect(res.msg).toContain('cannot afford');
  });
});
