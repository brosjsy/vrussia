import { describe, it, expect, afterEach, vi } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { RANKS, THRESHOLDS, BOOST, careerOf, levelFor, viewOf, boostOf, recordShift } from '../src/career';
import { interiorFor } from '../src/interiors';

const withJob = (): G.State => { const s = G.newState('C', 'moscow'); s.queue = []; s.job = G.jobs[0].id; s.energy = 90; return s; };
afterEach(() => { vi.restoreAllMocks(); });

describe('ranks', () => {
  it('five ranks with rising thresholds and raises, the top paying a quarter more', () => {
    expect(RANKS.length).toBe(5); expect(THRESHOLDS.length).toBe(5); expect(BOOST.length).toBe(5); expect(THRESHOLDS[0]).toBe(0); expect(BOOST[0]).toBe(1); expect(BOOST[4]).toBe(1.25);
    for (let i = 1; i < 5; i++) { expect(THRESHOLDS[i]).toBeGreaterThan(THRESHOLDS[i - 1]); expect(BOOST[i]).toBeGreaterThan(BOOST[i - 1]); }
    expect([0, 7, 8, 23, 24, 55, 56, 109, 110, 999].map(levelFor)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
  it('the career is made on first use, belongs to one job, and starts again with another job or damaged data', () => {
    const s = withJob(); expect(careerOf(s)).toEqual({ job: s.job, shifts: 0 });
    recordShift(s); recordShift(s); expect(viewOf(s)).toMatchObject({ level: 0, rank: 'Trainee', shifts: 2, next: 8, left: 6, boost: 1 });
    s.job = G.jobs[1].id; expect(careerOf(s)).toEqual({ job: s.job, shifts: 0 });                 // a new job starts at the bottom
    s.job = null; expect(careerOf(s).job).toBe(''); expect(boostOf(s)).toBe(1); expect(recordShift(s)).toBe('');
    s.job = G.jobs[0].id; (s as unknown as { career: unknown }).career = { job: s.job, shifts: -5 }; expect(careerOf(s).shifts).toBe(0);
    (s as unknown as { career: unknown }).career = { job: s.job, shifts: 'many' }; expect(careerOf(s).shifts).toBe(0); (s as unknown as { career: unknown }).career = 7; expect(careerOf(s).shifts).toBe(0);
  });
  it('a promotion is announced once, at the shift that earns it, and the top has nothing left to climb', () => {
    const s = withJob(); const said: string[] = [];
    for (let i = 0; i < 120; i++) { const m = recordShift(s); if (m) said.push(`${careerOf(s).shifts}:${m}`); }
    expect(said.length).toBe(4); expect(said.map(x => x.split(':')[0])).toEqual(['8', '24', '56', '110']); expect(said[0]).toMatch(/junior/); expect(said[3]).toMatch(/lead/);
    expect(viewOf(s)).toMatchObject({ level: 4, rank: 'Lead', next: null, left: null, boost: 1.25 });
  });
});

describe('in the game', () => {
  it('a shift is counted, the promotion shows in the report of the shift, and the pay follows the rank', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const s = withJob(); const first = G.perform(s, 'work'); expect(careerOf(s).shifts).toBe(1); expect(first.pre).not.toMatch(/Promotion/);
    const base = first.notes.find(n => n.k === 'money')!.v;
    const t = withJob(); (t as unknown as { career: unknown }).career = { job: t.job, shifts: 7 }; const promoted = G.perform(t, 'work'); expect(promoted.pre).toMatch(/Promotion/);
    const u = withJob(); (u as unknown as { career: unknown }).career = { job: u.job, shifts: 110 }; const top = G.perform(u, 'work'); const topPay = top.notes.find(n => n.k === 'money')!.v;
    expect(topPay / base).toBeGreaterThan(1.2); expect(topPay / base).toBeLessThan(1.3);
  });
  it('without a job a work action counts no shift, and other actions do not count', () => {
    const s = G.newState('C', 'moscow'); s.queue = []; G.perform(s, 'work'); expect((s as unknown as { career?: unknown }).career).toBeUndefined();
    const t = withJob(); G.perform(t, 'food'); G.perform(t, 'home'); expect((t as unknown as { career?: unknown }).career).toBeUndefined();
  });
  it('the desk at the workplace shows the rank', () => {
    const s = withJob(); const desk = interiorFor('work', s)!.props.find(p => p.action === 'work')!; expect(desk.label).toBe('Desk: work a shift (Trainee)');
    (s as unknown as { career: unknown }).career = { job: s.job, shifts: 60 }; expect(interiorFor('work', s)!.props.find(p => p.action === 'work')!.label).toContain('Senior');
    s.job = null; expect(interiorFor('work', s)!.props.find(p => p.action === 'work')!.label).toBe('Desk: work a shift');
  });
});
