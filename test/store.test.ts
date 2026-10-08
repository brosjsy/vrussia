import { describe, it, expect } from 'vitest';
import { hallOfFame, recordRun, clearHall, lifetime, LIFE_KEY, RUNS_KEY, RUNS_MAX } from '../src/store';
import type { KV } from '../src/store';

const fakeKV = (): KV & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; }, removeItem: k => { delete data[k]; } };
};
const row = (score: number, name = 'A') => ({ name, origin: 'tajik', label: 'Tajik Migrant', ending: 'time', score, days: 730, citizen: true, diff: 'normal', achievements: 3 });

describe('the local data layer (hall of fame)', () => {
  it('starts empty and keeps runs best-first', () => {
    const kv = fakeKV();
    expect(hallOfFame(kv)).toEqual([]);
    recordRun(row(100), kv, 1); recordRun(row(900), kv, 2); recordRun(row(500), kv, 3);
    expect(hallOfFame(kv).map(r => r.score)).toEqual([900, 500, 100]);
  });
  it('keeps only the best 20 and reports whether a run made the list', () => {
    const kv = fakeKV();
    for (let i = 0; i < RUNS_MAX; i++) recordRun(row(1000 + i), kv, i);
    const low = recordRun(row(5), kv, 99);
    expect(low.kept).toBe(false);
    expect(hallOfFame(kv).length).toBe(RUNS_MAX);
    const high = recordRun(row(99999), kv, 100);
    expect(high.kept).toBe(true);
    expect(hallOfFame(kv)[0].score).toBe(99999);
    expect(hallOfFame(kv).length).toBe(RUNS_MAX);
  });
  it('survives corrupt, foreign and blocked storage without throwing', () => {
    const kv = fakeKV();
    kv.data[RUNS_KEY] = '{not json';
    expect(hallOfFame(kv)).toEqual([]);
    kv.data[RUNS_KEY] = JSON.stringify({ schema: 99, rows: [row(1)] });
    expect(hallOfFame(kv)).toEqual([]);
    kv.data[RUNS_KEY] = JSON.stringify({ schema: 1, rows: [null, 5, { id: 'x', score: 'big', days: 1 }, { id: 'ok', score: 7, days: 3, name: 'N'.repeat(99) }] });
    const rows = hallOfFame(kv);
    expect(rows.length).toBe(1);
    expect(rows[0].name.length).toBe(20);
    const blocked: KV = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); }, removeItem: () => { throw new Error('no'); } };
    expect(hallOfFame(blocked)).toEqual([]);
    expect(() => recordRun(row(1), blocked)).not.toThrow();
    expect(() => clearHall(blocked)).not.toThrow();
    expect(hallOfFame(null)).toEqual([]);
  });
  it('stores a negative game score as 0 (the cloud table design allows only 0 and above)', () => {
    const kv = fakeKV(); recordRun(row(-148), kv, 5);
    expect(hallOfFame(kv)[0].score).toBe(0);
  });
  it('lifetime totals count every run, even ones too weak for the hall of fame', () => {
    const kv = fakeKV();
    for (let i = 0; i < RUNS_MAX; i++) recordRun(row(1000 + i), kv, i);
    recordRun({ ...row(5), citizen: false, ending: 'deported', days: 40 }, kv, 99);
    const L = lifetime(kv);
    expect(L.games).toBe(RUNS_MAX + 1);
    expect(L.citizens).toBe(RUNS_MAX);
    expect(L.bestScore).toBe(1000 + RUNS_MAX - 1);
    expect(L.endings.deported).toBe(1);
    expect(L.totalDays).toBe(RUNS_MAX * 730 + 40);
    expect(hallOfFame(kv).length).toBe(RUNS_MAX);
  });
  it('lifetime ignores corrupt data and is cleared with the list', () => {
    const kv = fakeKV();
    kv.data[LIFE_KEY] = JSON.stringify({ schema: 1, v: { games: 'many', citizens: -4, bestScore: 10, endings: { time: 'x' } } });
    expect(lifetime(kv)).toEqual({ games: 0, citizens: 0, bestScore: 10, totalDays: 0, endings: { time: 0 } });
    kv.data[LIFE_KEY] = 'garbage';
    expect(lifetime(kv).games).toBe(0);
    recordRun(row(1), kv, 1); clearHall(kv);
    expect(lifetime(kv).games).toBe(0);
    expect(lifetime(null).games).toBe(0);
  });
  it('clearing empties the list', () => {
    const kv = fakeKV(); recordRun(row(1), kv); clearHall(kv);
    expect(hallOfFame(kv)).toEqual([]);
  });
});
