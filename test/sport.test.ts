import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const dayIn = (month: number): number => { const s = G.newState('T', 'moscow'); for (let d = 0; d < 400; d++) { s.day = d; if (G.dateOf(s).getMonth() + 1 === month) return d; } throw new Error('no such month'); };
const at = (month: number, money = 20000): string[] => {
  const s = G.newState('T', 'moscow'); s.queue = []; s.day = dayIn(month); s.money = money;
  return G.eligible(s, ['life']).map(x => x.id).filter(i => i.startsWith('sport-'));
};

describe('the sport pack', () => {
  it('has 10 scenes with two choices, finite outcomes and no huge costs', () => {
    const list = G.scenarios.filter(x => x.id.startsWith('sport-'));
    expect(list.length).toBe(10);
    for (const sc of list) {
      expect(sc.choices.length).toBe(2);
      for (let i = 0; i < 2; i++) {
        const s = G.newState('T', 'moscow'); const m = s.money; G.choose(s, sc, i);
        expect(Number.isFinite(s.energy + s.health + s.stress + s.money)).toBe(true);
        expect(m - s.money).toBeLessThanOrEqual(3000);
      }
    }
  });
  it('follows the seasons: winter sports in winter, yard football and volleyball in summer', () => {
    expect(at(1)).toEqual(expect.arrayContaining(['sport-hockey', 'sport-skiing', 'sport-gto']));
    expect(at(1)).not.toContain('sport-yard-football');
    expect(at(7)).toEqual(expect.arrayContaining(['sport-yard-football', 'sport-volleyball']));
    expect(at(7)).not.toContain('sport-skiing');
    expect(at(4)).not.toContain('sport-hockey');
  });
  it('the gym needs spare money', () => {
    expect(at(7, 1000)).not.toContain('sport-gym');
    expect(at(7, 20000)).toContain('sport-gym');
  });
});
