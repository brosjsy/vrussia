import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { QUESTIONS, paper, grade, cannotSit, EXAM_LEN, MAX_WRONG, RETAKE_DAYS, RETAKE_FEE } from '../src/drivingexam';

const learner = (): G.State => { const s = G.newState('T', 'moscow'); s.queue = []; s.money = 50000; s.flags.enrolled = true; s.docs.reg = 100; return s; };
const seeded = (n: number) => () => { n = (n * 1664525 + 1013904223) % 4294967296; return n / 4294967296; };
const allRight = (p: ReturnType<typeof paper>): number[] => p.map(i => i.ok);

describe('the driving theory exam on the portal', () => {
  it('has a good bank: three answers each, one right, a reason, in both languages', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(30);
    for (const [q, a, ok, why] of QUESTIONS) { expect(q[0] && q[1] && why[0] && why[1]).toBeTruthy(); expect(a.length).toBe(3); expect(ok).toBeGreaterThanOrEqual(0); expect(ok).toBeLessThan(3); for (const x of a) expect(x[0] && x[1]).toBeTruthy(); }
  });
  it('a paper has 20 different questions and the right answer is findable', () => {
    const p = paper(seeded(7)); expect(p.length).toBe(EXAM_LEN);
    expect(new Set(p.map(i => i.q[0])).size).toBe(EXAM_LEN);
    for (const i of p) { expect(i.options.length).toBe(3); expect(i.ok).toBeGreaterThanOrEqual(0); expect(i.ok).toBeLessThan(3); }
  });
  it('you must be in a driving school first (a foreigner with registration may go straight to it)', () => {
    const s = G.newState('T', 'moscow'); s.queue = []; expect(cannotSit(s)).toMatch(/driving school/);
    const f = G.newState('T', 'tajik'); f.queue = []; f.docs.reg = 100; expect(cannotSit(f)).toBeNull();
    expect(cannotSit(learner())).toBeNull();
  });
  it('a pass (up to two mistakes) sets the theory flag but does not give a licence', () => {
    const s = learner(), p = paper(seeded(1)), a = allRight(p); a[0] = (a[0] + 1) % 3; a[1] = (a[1] + 1) % 3;
    const r = grade(s, p, a); expect(r.passed).toBe(true); expect(r.wrong).toBe(MAX_WRONG);
    expect(s.flags.theory).toBe(true); expect(s.flags.license).toBeFalsy();
  });
  it('three mistakes fail; a week must pass; the retake costs a fee', () => {
    const s = learner(), p = paper(seeded(2)), a = allRight(p); for (let i = 0; i < 3; i++) a[i] = (a[i] + 1) % 3;
    const r = grade(s, p, a); expect(r.passed).toBe(false); expect(s.flags.theory).toBeFalsy(); expect(r.mistakes.length).toBe(3);
    expect(cannotSit(s)).toMatch(/try again/);
    s.day += RETAKE_DAYS; expect(cannotSit(s)).toBeNull();
    const before = s.money; const p2 = paper(seeded(3)); expect(grade(s, p2, allRight(p2)).passed).toBe(true);
    expect(s.money).toBe(before - RETAKE_FEE);
  });
  it('without the pass there is no practical exam, and no car dealer or driving without the licence', () => {
    const s = learner(); s.day = 100; s.marks.enrolled = 0;
    expect(G.eligible(s, ['car']).map(x => x.id)).not.toContain('driving_exam');
    const p = paper(seeded(4)); grade(s, p, allRight(p));
    expect(G.eligible(s, ['car']).map(x => x.id)).toContain('driving_exam');
    expect(G.eligible(s, ['car']).map(x => x.id)).not.toContain('car_dealer');
  });
});

import { practicePaper, gradePractice, cannotPractise, HAZARDS, PRACTICE_LEN, PRACTICE_MAX_WRONG, PRACTICE_RETRY_DAYS, PRACTICE_FEE } from '../src/drivingexam';

describe('the practical exam on the portal', () => {
  const ready = (): G.State => { const s = learner(); s.flags.theory = true; s.marks.enrolled = 0; s.day = 20; return s; };
  it('has bilingual situations with one right answer each', () => {
    expect(HAZARDS.length).toBeGreaterThanOrEqual(PRACTICE_LEN);
    for (const [q, a, ok, why] of HAZARDS) { expect(q[0] && q[1] && why[0] && why[1]).toBeTruthy(); expect(a.length).toBe(3); expect(ok).toBeLessThan(3); }
  });
  it('needs the theory, a school course and the two weeks of lessons', () => {
    const s = learner(); expect(cannotPractise(s)).toMatch(/theory/);
    s.flags.theory = true; s.marks.enrolled = 5; s.day = 10; expect(cannotPractise(s)).toMatch(/opens in/);
    s.day = 25; expect(cannotPractise(s)).toBeNull();
  });
  it('a pass gives the licence; one mistake is allowed', () => {
    const s = ready(), p = practicePaper(seeded(5)), a = allRight(p); expect(p.length).toBe(PRACTICE_LEN); a[0] = (a[0] + 1) % 3;
    const r = gradePractice(s, p, a); expect(r.passed).toBe(true); expect(r.wrong).toBe(PRACTICE_MAX_WRONG);
    expect(s.flags.license).toBe(true); expect(s.flags.practical).toBe(true);
    expect(G.eligible(s, ['car']).map(x => x.id)).toContain('car_dealer');
  });
  it('a fail gives no licence, costs days, and the retake costs a fee', () => {
    const s = ready(), p = practicePaper(seeded(6)), a = allRight(p); a[0] = (a[0] + 1) % 3; a[1] = (a[1] + 1) % 3;
    expect(gradePractice(s, p, a).passed).toBe(false); expect(s.flags.license).toBeFalsy();
    expect(cannotPractise(s)).toMatch(/try again/);
    s.day += PRACTICE_RETRY_DAYS; expect(cannotPractise(s)).toBeNull();
    const before = s.money, p2 = practicePaper(seeded(7)); expect(gradePractice(s, p2, allRight(p2)).passed).toBe(true); expect(s.money).toBe(before - PRACTICE_FEE);
  });
  it('the random traffic-police scene can no longer hand out a licence by itself', () => {
    const s = ready(); const sc = G.get('driving_exam', s) as G.Scenario;
    G.choose(s, sc, 0); expect(s.flags.license).toBeFalsy();
  });
});

import * as V from '../src/service';

describe('the licence and the car', () => {
  it('a licensed player can buy a used car at the dealer; an unlicensed one cannot even see the dealer', () => {
    const s = learner(); s.money = 600000;
    expect(G.eligible(s, ['car']).map(x => x.id)).not.toContain('car_dealer');
    s.flags.license = true;
    expect(G.eligible(s, ['car']).map(x => x.id)).toContain('car_dealer');
    const sc = G.get('car_used', s) as G.Scenario; expect(sc).toBeTruthy();
    const orig = Math.random; Math.random = () => 0.01;
    try { G.choose(s, sc, 1); } finally { Math.random = orig; }
    expect(s.car).toBeTruthy(); expect(s.money).toBeLessThan(600000);
  });
  it('a car without a licence cannot be used to travel', () => {
    const s = learner(); s.car = { model: 'x', value: 1 };
    expect(V.modesFor(s)).not.toContain('car');
    s.flags.license = true; expect(V.modesFor(s)).toContain('car');
  });
});
