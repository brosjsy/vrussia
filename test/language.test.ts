import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const ids = (origin: string): string[] => {
  const s = G.newState('T', origin); s.queue = [];
  return G.eligible(s, ['social']).map(x => x.id).filter(i => i.startsWith('lang-'));
};

describe('the language pack', () => {
  it('has 10 scenes with two choices, finite outcomes and small costs', () => {
    const list = G.scenarios.filter(x => x.id.startsWith('lang-'));
    expect(list.length).toBe(10);
    for (const sc of list) {
      expect(sc.choices.length).toBe(2);
      for (let i = 0; i < 2; i++) {
        const s = G.newState('T', 'tajik'); const m = s.money; G.choose(s, sc, i);
        expect(Number.isFinite(s.know + s.stress + s.energy)).toBe(true);
        expect(m - s.money).toBeLessThanOrEqual(500);
      }
    }
  });
  it('citizens do not get the foreigner-only scenes, foreigners get all ten', () => {
    const origin = G.origins.find(o => o.status === 'migrant')!.id;
    const native = ids('moscow');
    expect(native).toEqual(expect.arrayContaining(['lang-patronymic', 'lang-ty-vy', 'lang-poem']));
    for (const f of ['lang-cyrillic', 'lang-spravka', 'lang-accent', 'lang-forms-cyrillic', 'lang-lesson']) expect(native).not.toContain(f);
    expect(ids(origin).length).toBe(10);
  });
});
