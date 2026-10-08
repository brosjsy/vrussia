import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

/** Runs days until the weather is cold (frost or snow) and returns the state after that day. */
function intoWinter(clothes: number): G.State {
  const s = G.newState('T', 'student');
  s.clothes = clothes; s.queue = [];
  for (let i = 0; i < 400; i++) { G.endDay(s); s.clothes = clothes; if (s.weather === 'frost' || s.weather === 'snow') return s; }
  throw new Error('no cold day found');
}

describe('the first cold days', () => {
  it('an underdressed player is pointed to the shop, once, and only once per 25 days', () => {
    const s = intoWinter(10);
    expect(s.queue).toContain('shop_winter_warning');
    s.queue = [];
    for (let i = 0; i < 3; i++) { G.endDay(s); s.clothes = 10; }
    expect(s.queue).not.toContain('shop_winter_warning');
  });
  it('a well-dressed player gets no warning', () => {
    const s = intoWinter(80);
    expect(s.queue).not.toContain('shop_winter_warning');
  });
  it('buying the winter set from the warning scene fixes clothing', () => {
    const s = intoWinter(10); s.money = 50000;
    const sc = G.get('shop_winter_warning', s) as G.Scenario;
    expect(sc).toBeTruthy();
    G.choose(s, sc, 0);
    expect(s.clothes).toBeGreaterThanOrEqual(40);
  });
});
