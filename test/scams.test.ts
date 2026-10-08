import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const list = (): G.Scenario[] => G.scenarios.filter(x => x.id.startsWith('scam-'));
const poorGame = (money: number, know: number): G.State => { const s = G.newState('T', 'moscow'); s.money = money; s.know = know; s.bank = { sber: true }; s.job = 'courier'; return s; };

describe('the scams pack', () => {
  it('has 8 scenes with two choices; the safe choice never costs money', () => {
    expect(list().length).toBe(8);
    for (const sc of list()) {
      expect(sc.choices.length).toBe(2);
      const s = poorGame(5000, 10); const before = s.money;
      G.choose(s, sc, 1);
      expect(s.money).toBeGreaterThanOrEqual(before);
    }
  });
  it('a loss never takes more than 60% of the money, and knowledge makes the trap safer', () => {
    for (const sc of list()) {
      let worst = 0;
      for (let i = 0; i < 40; i++) { const s = poorGame(1000, 0); G.choose(s, sc, 0); worst = Math.max(worst, 1000 - s.money); }
      expect(worst).toBeLessThanOrEqual(600);
    }
    const trapRate = (know: number): number => {
      const sc = G.scenarios.find(x => x.id === 'scam-bank-call') as G.Scenario; let lost = 0;
      for (let i = 0; i < 400; i++) { const s = poorGame(50000, know); G.choose(s, sc, 0); if (s.money < 50000) lost++; }
      return lost / 400;
    };
    expect(trapRate(100)).toBeLessThan(trapRate(0) - 0.2);
  });
  it('bank scams only appear for people who have a bank account', () => {
    const s = G.newState('T', 'moscow'); s.queue = []; s.bank = {};
    expect(G.eligible(s, ['life']).map(x => x.id)).not.toContain('scam-bank-call');
    s.bank = { sber: true };
    expect(G.eligible(s, ['life']).map(x => x.id)).toContain('scam-bank-call');
  });
});
