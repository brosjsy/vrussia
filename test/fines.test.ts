import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { fineDue } from '../src/content/fines';

const withFine = (amount = 4000): G.State => { const s = G.newState('T', 'moscow'); s.queue = []; s.tmp.fines = amount; s.tmp.fineDay = s.day; s.money = 100000; return s; };

describe('fines', () => {
  it('cost half in the first 20 days, full until day 60, double after', () => {
    const s = withFine(4000);
    expect(fineDue(s)).toBe(2000);
    s.day += 21; expect(fineDue(s)).toBe(4000);
    s.day += 40; expect(fineDue(s)).toBe(8000);
  });

  it('the doubled fine is never below 1,000 roubles (Article 20.25)', () => {
    const s = withFine(300);
    s.day += 61;
    expect(fineDue(s)).toBe(1000);
    const big = withFine(2000); big.day += 61;
    expect(fineDue(big)).toBe(4000);
    const half = withFine(300); expect(fineDue(half)).toBe(150);          // the early discount has no minimum
  });

  it('the enforcement scene explains the real alternatives', () => {
    const s = withFine(1000); s.day += 61;
    const sc = G.get('fine-enforcement', s) as G.Scenario;
    for (const w of ['1,000', '15 days', '50 hours']) expect(sc.text).toContain(w);
  });

  it('a notice can be paid at once with the discount', () => {
    const s = G.newState('T', 'moscow'); s.queue = []; s.money = 5000; s.bank.sber = true;
    G.choose(s, G.get('fine-notice-3', s) as G.Scenario, 0);        // litter: 1000 → 500
    expect(s.money).toBe(4500);
    expect(Number(s.tmp.fines || 0)).toBe(0);
  });

  it('putting it off records the fine and the date', () => {
    const s = G.newState('T', 'moscow'); s.queue = []; s.day = 12;
    G.choose(s, G.get('fine-notice-3', s) as G.Scenario, 1);
    expect(s.tmp.fines).toBe(1000);
    expect(s.tmp.fineDay).toBe(12);
  });

  it('a reminder appears after 15 days and enforcement after 60', () => {
    const s = withFine(1000);
    const ids = (): string[] => G.eligible(s, ['paper']).map(x => x.id);
    expect(ids()).not.toContain('fine-reminder');
    s.day += 16; expect(ids()).toContain('fine-reminder');
    s.day += 50; expect(ids()).toContain('fine-enforcement');
    expect(ids()).not.toContain('fine-reminder');
    const before = s.money;
    G.choose(s, G.get('fine-enforcement', s) as G.Scenario, 0);
    expect(s.money).toBe(before - 2500 - 1);   // doubled fine 2000 + 500 fee + the 1 in the choice effect
    expect(Number(s.tmp.fines)).toBe(0);
  });

  it('notices respect who they apply to', () => {
    const walker = G.newState('T', 'moscow'); walker.queue = [];
    const ids = G.eligible(walker, ['paper']).map(x => x.id);
    expect(ids).not.toContain('fine-notice-0');   // speed camera needs a car
    expect(ids).not.toContain('fine-notice-5');   // address notice is for newcomers
    expect(ids).toContain('fine-notice-2');       // tram inspector
  });
});
