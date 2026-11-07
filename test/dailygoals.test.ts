import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { POOL, goalsFor, track, progress, isDone, settle, goalById } from '../src/dailygoals';
import { quests } from '../src/city';

const fresh = (origin = 'tajik'): G.State => { const s = G.newState('T', origin); s.queue = []; return s; };

describe('the pool of daily goals', () => {
  it('has about a hundred goals with unique ids, two languages and small non-money rewards', () => {
    expect(POOL.length).toBeGreaterThanOrEqual(95);
    expect(new Set(POOL.map(g => g.id)).size).toBe(POOL.length);
    for (const g of POOL) {
      expect(g.en.length, g.id).toBeGreaterThan(3); expect(g.ru, g.id).toMatch(/[а-яё]/i); expect(g.icon).toBeTruthy(); expect([1, 2, 3]).toContain(g.tier); expect(g.need).toBeGreaterThanOrEqual(1);
      expect(Object.keys(g.reward).length, g.id).toBeGreaterThan(0); expect(g.reward.money ?? 0, `${g.id} pays money`).toBe(0);
      for (const v of Object.values(g.reward)) expect(Math.abs(v as number), g.id).toBeLessThanOrEqual(6);
    }
  });
});

describe('the three goals of a day', () => {
  it('are the same for the same player and day, three different ones, and change from day to day', () => {
    const s = fresh(); s.day = 10; const a = goalsFor(s).map(g => g.id);
    expect(a).toHaveLength(3); expect(new Set(a).size).toBe(3); expect(goalsFor(s).map(g => g.id)).toEqual(a);
    s.day = 11; expect(goalsFor(s).map(g => g.id)).not.toEqual(a);
    const other = fresh('moscow'); other.day = 10; other.name = 'Anna'; expect(goalsFor(other).map(g => g.id)).not.toEqual(a);
  });
  it('make about two thousand goal days over a game and use most of the pool', () => {
    const s = fresh(); const seen = new Set<string>(); let total = 0;
    for (let d = 0; d < 730; d++) { s.day = d; const g = goalsFor(s); total += g.length; g.forEach(x => seen.add(x.id)); }
    expect(total).toBe(2190); expect(seen.size).toBeGreaterThanOrEqual(POOL.length * 0.8);
  });
  it('never ask for a shift of a player with no job', () => {
    const s = fresh(); s.job = null;
    for (let d = 0; d < 400; d++) { s.day = d; expect(goalsFor(s).some(g => g.id.startsWith('act-work')), `day ${d}`).toBe(false); }
  });
});

describe('meeting a goal', () => {
  it('counts actions, scenes and places during the day and starts again the next day', () => {
    const s = fresh(); s.day = 3; s.loc = 'market';
    track(s, { action: 'out' }); track(s, { action: 'out' }); track(s, { cat: 'shop' });
    expect(progress(s, goalById('act-out-2')!)).toBe(2); expect(isDone(s, goalById('act-out-2')!)).toBe(true); expect(isDone(s, goalById('act-out-3')!)).toBe(false);
    expect(progress(s, goalById('cat-shop-1')!)).toBe(1); expect(progress(s, goalById('place-market-2')!)).toBe(2);
    s.day = 4; expect(progress(s, goalById('act-out-2')!)).toBe(0);
  });
  it('reads the end-of-day goals from the state', () => {
    const s = fresh(); s.stress = 20; s.energy = 80; s.health = 95; s.rep = 50; s.strikes = 0; s.money = 100;
    for (const id of ['end-calm', 'end-serene', 'end-rested', 'end-fresh', 'end-healthy', 'end-strong', 'end-liked', 'end-clean', 'end-solvent']) expect(isDone(s, goalById(id)!), id).toBe(true);
    s.stress = 70; s.energy = 10; expect(isDone(s, goalById('end-calm')!)).toBe(false); expect(isDone(s, goalById('end-rested')!)).toBe(false);
  });
  it('pays the goals met, once, and the report of the day names them', () => {
    const mk = (): G.State => {
      const s = fresh(); s.day = 20; s.job = 'cleaner'; s.stress = 10; s.energy = 90; s.health = 99; s.rep = 90; s.strikes = 0; s.money = 5000; s.docs.reg = 200;
      for (const g of POOL) for (let i = 0; i < 3; i++) { const [kind, key] = g.id.split('-') as [string, string]; if (kind === 'act') track(s, { action: key }); if (kind === 'cat') track(s, { cat: key }); }
      for (const p of G.PLACES) { s.loc = p.id; track(s, { action: 'out' }); track(s, { action: 'out' }); }
      return s;
    };
    const s = mk(); const first = settle(s); expect(first.lines.length).toBe(3); expect(first.fx).toHaveLength(3); expect(settle(s).lines).toEqual([]);
    for (const f of first.fx) expect(f.money ?? 0).toBe(0);
    const s2 = mk(); const out = G.endDay(s2); expect(out.filter(l => l.startsWith('Daily goal done')).length).toBe(3);
  });
});

describe('the goals in the game', () => {
  it('count what the player really does: an action when it is taken, a kind of scene when a choice is made', () => {
    const s = fresh(); s.day = 5; s.loc = 'center'; s.energy = 90;
    G.perform(s, 'out'); expect(progress(s, goalById('act-out-1')!)).toBe(1); expect(progress(s, goalById('place-center-1')!)).toBe(1);
    const sc = G.scenarios.find(x => x.cat === 'shop' && x.choices.length > 0)!; G.choose(s, sc, 0);
    expect(progress(s, goalById('cat-shop-1')!)).toBe(1);
  });
  it('show the first unfinished goal of the day among the quests', () => {
    const s = fresh(); s.day = 7; const first = goalsFor(s)[0]!;
    const q = quests(s); expect(q.length).toBeLessThanOrEqual(3); expect(q.some(x => x.title === first.en || x.sub.includes('/'))).toBe(true);
  });
});
