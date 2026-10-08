import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const homeIds = (s: G.State): string[] => G.eligible(s, ['culture']).map(x => x.id).filter(id => id.startsWith('home-'));

describe('home-culture scenes', () => {
  for (const origin of ['tajik', 'uzbek', 'kyrgyz', 'student']) {
    it(`${origin}: twelve scenes, all and only their own`, () => {
      const s = G.newState('T', origin); s.queue = [];
      const ids = homeIds(s);
      expect(ids.length).toBe(12);
      for (const id of ids) expect(id.startsWith(`home-${origin}-`), id).toBe(true);
    });
  }

  it('other origins see none and the culture action can reach them', () => {
    const m = G.newState('T', 'moscow'); m.queue = [];
    expect(homeIds(m).length).toBe(0);
    const s = G.newState('T', 'uzbek'); s.queue = [];
    let found = false;
    for (let i = 0; i < 400 && !found; i++) { const r = G.perform(s, 'culture'); if (r.sc?.id.startsWith('home-uzbek-')) found = true; s.seen = {}; }
    expect(found).toBe(true);
  });

  it('every scene runs for its origin', () => {
    for (const origin of ['tajik', 'uzbek', 'kyrgyz', 'student']) {
      const s = G.newState('T', origin); s.queue = [];
      for (const sc of G.eligible(s, ['culture']).filter(x => x.id.startsWith('home-'))) {
        for (let i = 0; i < sc.choices.length; i++) expect(() => G.choose(structuredClone(s), sc, i), sc.id).not.toThrow();
      }
    }
  });
});
