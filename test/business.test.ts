import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

function owner(): G.State {
  const s = G.newState('Owner', 'moscow');
  s.queue = []; s.money = 500000; s.know = 80;
  s.biz = { kind: 'bakery', name: 'Bread & Co', level: 1, staff: 0, rep: 60, regime: 'npd', profit: 0, weeks: 0, revenueYear: 0 };
  return s;
}

describe('small business', () => {
  it('has a weekly profit-and-loss every Saturday', () => {
    const s = owner();
    let report = '';
    for (let i = 0; i < 14; i++) { const lines = G.endDay(s); report += lines.join('\n'); }
    expect(report).toContain('Bread & Co: sales');
    expect(s.biz!.weeks).toBeGreaterThanOrEqual(2);
  });

  it('wages reduce profit and a loss is possible', () => {
    const s = owner();
    s.biz!.staff = 6;       // ₽54,000 wages against ~₽28,000 sales
    G.bizWeek(s);
    expect(s.biz!.profit).toBeLessThan(0);
  });

  it('the business action without a business explains how to start', () => {
    const s = G.newState('T', 'moscow'); s.queue = [];
    const r = G.perform(s, 'biz');
    expect(r.sc?.id).toBe('biz_none');
  });

  it('business events only appear for owners and can all be played', () => {
    const none = G.newState('T', 'moscow'); none.queue = [];
    expect(G.eligible(none, ['biz']).length).toBe(0);
    const s = owner(); s.biz!.staff = 1; s.biz!.profit = 999999; s.biz!.weeks = 20;
    const events = G.eligible(s, ['biz']);
    expect(events.length).toBeGreaterThan(8);
    for (const e of events) for (let i = 0; i < e.choices.length; i++) {
      const t = structuredClone(s);
      expect(() => G.choose(t, e, i), e.id).not.toThrow();
    }
  });

  it('winning goal needs ₽100,000 profit', () => {
    const s = owner();
    const goal = G.goals.find(g => g.id === 'biz')!;
    expect(goal.done(s)).toBe(false);
    s.biz!.profit = 100000;
    expect(goal.done(s)).toBe(true);
  });
});
