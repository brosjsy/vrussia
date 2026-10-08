import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

describe('refusals for lack of money', () => {
  it('cap the stress of a plain refusal at 3', () => {
    const r = G.softenRefusal(G.RU.util.O('You do not have the money. The clerk shrugs.', { stress: 8 }));
    expect(r.fx.stress).toBe(G.REFUSAL_STRESS);
  });
  it('leave other outcomes alone: real consequences, small stress, other effects, other messages', () => {
    const O = G.RU.util.O;
    expect(G.softenRefusal(O('You cannot afford a lawyer; the hearing is brief.', { stress: 18, strike: 1 })).fx.stress).toBe(18);
    expect(G.softenRefusal(O('You do not have the money.', { stress: 2 })).fx.stress).toBe(2);
    expect(G.softenRefusal(O('You lose your temper in the queue.', { stress: 9 })).fx.stress).toBe(9);
    expect(G.softenRefusal(O('Not enough money, so you pay by instalments.', { stress: 6, money: -100 })).fx.stress).toBe(6);
  });
  it('a broke player trying to pay for a patent gets at most 3 stress per attempt', () => {
    const s = G.newState('T', 'tajik'); s.day = 60; s.money = 0; s.stress = 10;
    const sc = G.get('patent_buy', s) as G.Scenario;
    expect(sc).toBeTruthy();
    const before = s.stress;
    G.choose(s, sc, 0);
    expect(s.stress - before).toBeLessThanOrEqual(3 + 1);   // + a little for the day that passes
  });
});
