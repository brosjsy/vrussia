import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { shuffled, newMemory, flip, memoryWon, newScramble, checkScramble, reward, MEMORY_FACES } from '../src/games';
import type { Memory } from '../src/games';

describe('shuffling', () => {
  it('is the same for the same seed, a permutation of the input, and different for other seeds', () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffled(a, 'x')).toEqual(shuffled(a, 'x'));
    expect(shuffled(a, 'x').slice().sort()).toEqual(a);
    expect(a).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);                       // the input is not changed
    expect(new Set(Array.from({ length: 20 }, (_, i) => shuffled(a, 's' + i).join())).size).toBeGreaterThan(10);
  });
});

describe('memory pairs', () => {
  it('has twelve cards, six faces twice each, none turned over', () => {
    const m = newMemory('t');
    expect(m.cards.length).toBe(12);
    const counts: Record<string, number> = {};
    for (const c of m.cards) { counts[c] = (counts[c] || 0) + 1; expect(MEMORY_FACES.includes(c)).toBe(true); }
    expect(Object.values(counts)).toEqual([2, 2, 2, 2, 2, 2]);
    expect(m.open).toEqual([]); expect(memoryWon(m)).toBe(false);
  });
  it('a matching pair stays, a wrong pair closes on the next flip, flipping the same card or a finished card does nothing', () => {
    let m: Memory = newMemory('abc');
    const first = 0; const mate = m.cards.findIndex((c, i) => i !== first && c === m.cards[first]);
    const other = m.cards.findIndex(c => c !== m.cards[first]);
    m = flip(m, first); expect(flip(m, first)).toBe(m);
    m = flip(m, other); expect(m.moves).toBe(1); expect(m.done.some(Boolean)).toBe(false);
    m = flip(m, mate);                                                  // the wrong pair is hidden first, then this card opens
    expect(m.open).toEqual([mate]);
    m = flip(m, first); expect(m.done[first]).toBe(true); expect(m.done[mate]).toBe(true); expect(m.open).toEqual([]);
    expect(flip(m, first)).toBe(m);
    expect(flip(m, -1)).toBe(m); expect(flip(m, 99)).toBe(m);
  });
  it('can be won by someone who remembers the cards, in six moves at best', () => {
    let m = newMemory('win');
    for (const face of Array.from(new Set(m.cards))) { const [i, j] = m.cards.map((c, k) => (c === face ? k : -1)).filter(k => k >= 0); m = flip(m, i); m = flip(m, j); }
    expect(memoryWon(m)).toBe(true); expect(m.moves).toBe(6);
  });
});

describe('city letters', () => {
  it('mixes the letters of a real city, never leaving them in order, the same each time for a seed', () => {
    for (let i = 0; i < 40; i++) {
      const sc = newScramble('seed' + i);
      expect(G.CITIES).toContain(sc.word);
      expect(sc.letters.toLowerCase().split('').sort().join('')).toBe(sc.word.toLowerCase().split('').sort().join(''));
      expect(sc.letters.toLowerCase()).not.toBe(sc.word.toLowerCase());
    }
    expect(newScramble('q')).toEqual(newScramble('q'));
  });
  it('accepts the right answer in any case with spaces, and nothing else', () => {
    const sc = newScramble('z');
    expect(checkScramble(sc, '  ' + sc.word.toUpperCase() + ' ')).toBe(true);
    expect(checkScramble(sc, sc.letters + 'x')).toBe(false); expect(checkScramble(sc, '')).toBe(false);
  });
});

describe('prizes', () => {
  it('each game pays once a day, the memory game with calm and the scramble with knowledge', () => {
    const s = G.newState('T', 'moscow');
    expect(reward(s, 'memory')).toMatchObject({ given: true, fx: { stress: -4 } });
    expect(reward(s, 'memory')).toMatchObject({ given: false, fx: {} });
    expect(reward(s, 'scramble')).toMatchObject({ given: true, fx: { know: 1 } });
    s.day++; expect(reward(s, 'memory').given).toBe(true);
  });
});
