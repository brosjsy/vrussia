import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const dayIn = (month: number): number => { const s = G.newState('T', 'moscow'); for (let d = 0; d < 400; d++) { s.day = d; if (G.dateOf(s).getMonth() + 1 === month) return d; } throw new Error('no such month'); };
const at = (month: number): string[] => {
  const s = G.newState('T', 'moscow'); s.queue = []; s.day = dayIn(month);
  return G.eligible(s, ['social']).map(x => x.id).filter(i => i.startsWith('building-'));
};

describe('the apartment block pack', () => {
  it('has 10 scenes, each with two choices that return finite outcomes', () => {
    const list = G.scenarios.filter(x => x.id.startsWith('building-'));
    expect(list.length).toBe(10);
    for (const sc of list) {
      expect(sc.choices.length).toBe(2);
      for (let i = 0; i < 2; i++) {
        const s = G.newState('T', 'moscow'); const before = s.money;
        G.choose(s, sc, i);
        expect(Number.isFinite(s.money) && Number.isFinite(s.stress)).toBe(true);
        expect(s.money).toBeGreaterThan(before - 1000);
      }
    }
  });
  it('seasonal scenes follow their months and year-round ones are always there', () => {
    expect(at(7)).toEqual(expect.arrayContaining(['building-intercom', 'building-lift', 'building-chat', 'building-leak']));
    expect(at(10)).toEqual(expect.arrayContaining(['building-meeting', 'building-subbotnik']));
    expect(at(7)).not.toContain('building-subbotnik');
    expect(at(1)).not.toContain('building-meeting');
  });
});
