/* Two small games on the phone: a memory game with pairs of cards, and a word scramble with the names of Russian cities.
   The rules are plain functions, so they are tested without a screen. A game gives a small reward only once per day, so playing
   for fun is unlimited but cannot be used to farm the game. */
import * as G from './engine';
import type { State, Effects } from './engine';

const hash = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };
/** A shuffle that gives the same result for the same seed. */
export function shuffled<T>(items: T[], seed: string): T[] {
  const a = items.slice();
  let h = hash(seed);
  for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ---------- memory ---------- */
export const MEMORY_FACES = ['🧸', '🥟', '🚇', '🐻', '🍯', '❄️', '🎻', '🏰'];
export interface Memory { cards: string[]; open: number[]; done: boolean[]; moves: number }

export function newMemory(seed: string, pairs = 6): Memory {
  const faces = shuffled(MEMORY_FACES, seed + 'f').slice(0, pairs);
  return { cards: shuffled([...faces, ...faces], seed + 'c'), open: [], done: new Array(pairs * 2).fill(false), moves: 0 };
}
export const memoryWon = (m: Memory): boolean => m.done.every(Boolean);

/** Turns a card over. Two open cards that match stay; a third card first hides two that did not match. Returns a new state. */
export function flip(m: Memory, i: number): Memory {
  if (i < 0 || i >= m.cards.length || m.done[i] || m.open.includes(i)) return m;
  let open = m.open.slice();
  if (open.length === 2) open = [];
  open.push(i);
  const done = m.done.slice();
  let moves = m.moves;
  if (open.length === 2) {
    moves++;
    if (m.cards[open[0]] === m.cards[open[1]]) { done[open[0]] = true; done[open[1]] = true; open = []; }
  }
  return { cards: m.cards, open, done, moves };
}

/* ---------- word scramble ---------- */
const WORDS = (): string[] => G.CITIES.filter(c => /^[A-Za-z]{5,9}$/.test(c));

export interface Scramble { word: string; letters: string }
/** A city name with its letters mixed up (never in the original order). */
export function newScramble(seed: string): Scramble {
  const words = WORDS();
  const word = words[hash(seed) % words.length];
  let letters = shuffled(word.split(''), seed + 'w').join('');
  for (let k = 0; letters.toLowerCase() === word.toLowerCase() && k < 5; k++) letters = shuffled(word.split(''), seed + 'w' + k).join('');
  return { word, letters };
}
export const checkScramble = (sc: Scramble, guess: string): boolean => guess.trim().toLowerCase() === sc.word.toLowerCase();

/* ---------- rewards ---------- */
export interface Reward { given: boolean; message: string; fx: Effects }

/** The prize for a finished game: once a day for each game; later wins are just for fun. */
export function reward(s: State, game: 'memory' | 'scramble'): Reward {
  if (!G.firstToday(s, 'game:' + game)) return { given: false, message: 'Well played! The daily prize for this game was already taken today.', fx: {} };
  return game === 'memory'
    ? { given: true, message: 'You won! A relaxing break: stress −4.', fx: { stress: -4 } }
    : { given: true, message: 'Correct! You learned something about Russian geography: knowledge +1.', fx: { know: 1 } };
}
