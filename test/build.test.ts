import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { STAGES, TOTAL_COST, viewOf, startNext, tickBuild } from '../src/build';
import { dwellingOf, designOf } from '../src/homes';

const citizen = (): G.State => { const s = G.newState('B', 'region'); s.queue = []; s.money = 5_000_000; s.rent = 1500; return s; };
const pass = (s: G.State, days: number): string[] => { const out: string[] = []; for (let i = 0; i < days; i++) out.push(...G.endDay(s)); return out; };

describe('the stages', () => {
  it('five stages with prices and days, the plot first and instant, and a total that is a real sum of money', () => {
    expect(STAGES.map(s => s.id)).toEqual(['plot', 'foundation', 'walls', 'roof', 'finish']); expect(STAGES[0].days).toBe(0); for (const s of STAGES.slice(1)) expect(s.days).toBeGreaterThanOrEqual(3);
    for (const s of STAGES) { expect(s.cost).toBeGreaterThan(100000); expect(s.name.length).toBeGreaterThan(8); expect(s.blurb.length).toBeGreaterThan(20); }
    expect(TOTAL_COST).toBe(1600000);
  });
});

describe('building', () => {
  it('pays for each stage in turn, the plot at once and the others after their days, and does not start two at a time', () => {
    const s = citizen(); const m0 = s.money; expect(viewOf(s)).toMatchObject({ done: 0, working: false, finished: false, percent: 0 }); expect(viewOf(s).next?.id).toBe('plot');
    expect(startNext(s).ok).toBe(true); expect(s.money).toBe(m0 - STAGES[0].cost); expect(viewOf(s)).toMatchObject({ done: 1, working: false, percent: 20 }); expect(viewOf(s).next?.id).toBe('foundation');
    expect(startNext(s).ok).toBe(true); expect(viewOf(s)).toMatchObject({ done: 1, working: true, daysLeft: 3 }); const m1 = s.money;
    const again = startNext(s); expect(again.ok).toBe(false); expect(again.msg).toMatch(/3 days/); expect(s.money).toBe(m1);
    const notes = pass(s, 2); expect(viewOf(s)).toMatchObject({ done: 1, working: true, daysLeft: 1 }); expect(notes.join(' ')).not.toMatch(/finished/);
    const last = pass(s, 1); expect(last.join(' ')).toMatch(/Pour the foundation: finished/); expect(viewOf(s)).toMatchObject({ done: 2, working: false, percent: 40 });
  });
  it('a finished house changes where the player lives: no rent, a big house, less stress and more respect', () => {
    const s = citizen(); s.stress = 50; s.rep = 40; expect(dwellingOf(s)).toBe('panelka'); const small = designOf(s);
    for (let i = 0; i < STAGES.length; i++) { expect(startNext(s).ok, STAGES[i].id).toBe(true); pass(s, STAGES[i].days); }
    const v = viewOf(s); expect(v).toMatchObject({ done: 5, finished: true, percent: 100, working: false }); expect(v.next).toBeNull();
    expect(s.housing).toBe('house'); expect(s.rent).toBe(0); expect(s.stress).toBeLessThan(50); expect(s.rep).toBe(48); expect(dwellingOf(s)).toBe('house');
    const big = designOf(s); expect(big.w * big.d).toBeGreaterThan(small.w * small.d * 1.8); expect(big.title).toMatch(/built/);
    expect(startNext(s).ok).toBe(false); expect(startNext(s).msg).toMatch(/finished/); expect(tickBuild(s)).toBe('');
  });
  it('the finished house is announced once, in the report of the day it is done', () => {
    const s = citizen(); const said: string[] = [];
    for (let i = 0; i < STAGES.length; i++) { startNext(s); said.push(...pass(s, STAGES[i].days + 1)); }
    expect(said.filter(x => /house is finished/.test(x)).length).toBe(1); expect(said.filter(x => /finished[.]/.test(x)).length).toBe(3);
  });
  it('is only for citizens and only with enough money, and a refusal changes nothing', () => {
    const m = G.newState('B', 'tajik'); m.queue = []; m.money = 5_000_000; const before = JSON.stringify(m);
    expect(startNext(m).ok).toBe(false); expect(startNext(m).msg).toMatch(/citizen/); expect(JSON.stringify(m)).toBe(before); expect((m as unknown as { build?: unknown }).build).toBeUndefined();
    const poor = citizen(); poor.money = 1000; const b2 = JSON.stringify(poor); expect(startNext(poor).ok).toBe(false); expect(startNext(poor).msg).toMatch(/Not enough/); expect(JSON.stringify(poor)).toBe(b2);
  });
  it('reading never changes the state, and damaged saved data is ignored', () => {
    const s = citizen(); const before = JSON.stringify(s); viewOf(s); tickBuild(s); expect(JSON.stringify(s)).toBe(before);
    (s as unknown as { build: unknown }).build = { done: 99, working: true, readyDay: 'x' }; expect(viewOf(s)).toMatchObject({ done: 0, working: false }); expect(tickBuild(s)).toBe('');
    (s as unknown as { build: unknown }).build = 'oops'; expect(viewOf(s).done).toBe(0); expect(startNext(s).ok).toBe(true); expect(viewOf(s).done).toBe(1);
  });
  it('survives being saved and loaded in the middle of a stage', () => {
    const s = citizen(); startNext(s); startNext(s); const copy = JSON.parse(JSON.stringify(s)) as G.State; pass(copy, 3); expect(viewOf(copy).done).toBe(2);
  });
});
