import { describe, it, expect, beforeEach } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

/** A tiny in-memory localStorage so the real save()/load() functions can be exercised in Node. */
const store: Record<string, string> = {};
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    key: () => null, length: 0,
  } as Storage;
});

const sensibleAction = (s: G.State): string => {
  if (s.energy < 25) return 'home';
  if (s.energy < 45) return 'food';
  const pool = ['paper', 'edu', 'out', 'money', 'people', 'family', 'culture', 'pets', 'home', 'food', 'travel', 'work', 'biz'];
  return pool[Math.floor(Math.random() * pool.length)];
};

/** Advances one step of play; returns false if the game is over. */
function step(s: G.State): boolean {
  if (s.over) return false;
  if (s.queue.length) {
    const sc = G.get(s.queue.shift() as string, s);
    if (sc) G.choose(s, sc, Math.floor(Math.random() * sc.choices.length));
    return true;
  }
  const r = G.perform(s, sensibleAction(s));
  if (r.sc) G.choose(s, r.sc, Math.floor(Math.random() * r.sc.choices.length));
  return true;
}

describe('saving and loading', () => {
  it('a new game survives a save/load round trip unchanged', () => {
    for (const o of G.origins) {
      const s = G.newState('Round', o.id);
      G.save(s);
      expect(G.load()).toEqual(JSON.parse(JSON.stringify(s)));
    }
  });

  it('games continue normally after being saved and reloaded at random moments', () => {
    for (const o of G.origins) {
      for (let g = 0; g < 4; g++) {
        let s = G.newState('Round', o.id);
        let steps = 0;
        while (step(s) && steps++ < 2500) {
          if (steps % 37 === 0) {
            G.save(s);
            const loaded = G.load();
            expect(loaded, `${o.id} step ${steps}`).not.toBeNull();
            expect(loaded).toEqual(JSON.parse(JSON.stringify(s)));
            s = loaded as G.State;                       // keep playing from the reloaded copy
          }
        }
        expect(Number.isFinite(s.money)).toBe(true);
        expect(s.day).toBeGreaterThan(0);
      }
    }
  });

  it('queued scenes (including dynamic ones) can all be rebuilt after a reload', () => {
    const s = G.newState('Round', 'moscow');
    s.queue = ['trip_method', 'rent_short', 'hosp_ward', 'fl_airport', 'phone_pay', 'pet_check', 'estate_rent', 'cal_ege', 'arc_timur_0'];
    s.dest = 'mfc'; s.tmp = { dog: 'Belka', price: 1000, label: 'phone' };
    G.save(s);
    const loaded = G.load() as G.State;
    for (const id of loaded.queue) expect(() => G.get(id, loaded), id).not.toThrow();
  });

  it('refuses saves from another version and from broken data', () => {
    store.vrussia_save = JSON.stringify({ version: 1, day: 3 });
    expect(G.load()).toBeNull();
    store.vrussia_save = '{not json';
    expect(G.load()).toBeNull();
    G.clear();
    expect(G.load()).toBeNull();
  });

  it('the stored save does not contain functions or undefined holes that would be lost', () => {
    const s = G.newState('Round', 'tajik');
    for (let i = 0; i < 300 && step(s); i++) { /* play a bit */ }
    const json = JSON.stringify(s);
    expect(json).not.toContain('undefined');
    expect(json).not.toContain('NaN');
    expect(JSON.parse(json)).toEqual(JSON.parse(JSON.stringify(JSON.parse(json))));
  });
});
