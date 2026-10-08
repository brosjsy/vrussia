import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const dayIn = (month: number): number => { const s = G.newState('T', 'moscow'); for (let d = 0; d < 400; d++) { s.day = d; if (G.dateOf(s).getMonth() + 1 === month) return d; } throw new Error('no such month'); };
const at = (month: number, kids: number): string[] => {
  const s = G.newState('T', 'moscow'); s.queue = []; s.day = dayIn(month); s.kids = kids;
  return G.eligible(s, ['family']).map(x => x.id).filter(i => i.startsWith('school-'));
};

describe('the school pack', () => {
  it('has 9 scenes with two choices, finite outcomes and small costs', () => {
    const list = G.scenarios.filter(x => x.id.startsWith('school-'));
    expect(list.length).toBe(9);
    for (const sc of list) {
      expect(sc.choices.length).toBe(2);
      for (let i = 0; i < 2; i++) { const s = G.newState('T', 'moscow'); const m = s.money; G.choose(s, sc, i); expect(Number.isFinite(s.money + s.famLove)).toBe(true); expect(m - s.money).toBeLessThanOrEqual(4000); }
    }
  });
  it('only parents see school scenes', () => {
    expect(at(9, 0)).toEqual([]);
    expect(at(9, 1)).toContain('school-chat');
  });
  it('enrolment is in spring, the first of September in September, the last bell in May', () => {
    expect(at(4, 1)).toContain('school-enrol');
    expect(at(9, 1)).toContain('school-day-of-knowledge');
    expect(at(9, 1)).not.toContain('school-enrol');
    expect(at(5, 1)).toContain('school-last-bell');
    expect(at(1, 1)).not.toContain('school-last-bell');
  });
});
