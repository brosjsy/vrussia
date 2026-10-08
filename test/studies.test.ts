import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

function student(know = 90): G.State {
  const s = G.newState('S', 'moscow'); s.queue = []; s.know = know; s.flags.admitted = true; s.money = 50000;
  return s;
}
const session = (s: G.State, choice = 0, id = 'cal_session_w'): G.Chosen => G.choose(s, G.get(id, s) as G.Scenario, choice);

describe('university life', () => {
  it('exam sessions are in the calendar', () => {
    const dates = G.CAL.map(c => `${c.m}-${c.d}:${c.id}`);
    expect(dates).toContain('1-15:cal_session_w');
    expect(dates).toContain('6-10:cal_session_s');
  });

  it('non-students only see a small scene', () => {
    const s = G.newState('N', 'moscow'); s.queue = [];
    const sc = G.get('cal_session_w', s) as G.Scenario;
    expect(sc.choices.length).toBe(1);
    expect(sc.text.toLowerCase()).toContain('exam session');
  });

  it('studying hard gives a good grade and records the average', () => {
    const s = student(90);
    session(s, 0);
    expect(s.tmp.sessions).toBe(1);
    expect(Number(s.tmp.gpa)).toBeGreaterThanOrEqual(4);
  });

  it('a student with no knowledge who crams fails and pays a fee', () => {
    const s = student(0);
    const before = s.money;
    let failed = false;
    for (let i = 0; i < 20 && !failed; i++) { const t = structuredClone(s); session(t, 2); if (Number(t.tmp.fails) > 0) { failed = true; expect(t.money).toBeLessThan(before); } }
    expect(failed).toBe(true);
  });

  it('three failures mean expulsion, and an appeal can restore the place', () => {
    const s = student(0);
    s.tmp.fails = 2; s.tmp.sessions = 2; s.tmp.gpa = 2;
    for (let i = 0; i < 30 && s.flags.admitted; i++) { session(s, 2); }
    expect(s.flags.expelled).toBe(true);
    expect(s.flags.admitted).toBeFalsy();
    expect(G.eligible(s, ['edu']).map(x => x.id)).toContain('study_expelled_appeal');
    for (let i = 0; i < 30 && s.flags.expelled; i++) { const t = structuredClone(s); G.choose(t, G.get('study_expelled_appeal', t) as G.Scenario, 0); if (t.flags.admitted) { expect(t.flags.expelled).toBeFalsy(); return; } }
  });

  it('honours students get a stipend and four sessions complete two years', () => {
    const s = student(100);
    const allowBefore = s.allow;
    for (let i = 0; i < 4; i++) session(s, 0, i % 2 ? 'cal_session_s' : 'cal_session_w');
    expect(s.flags.studied2y).toBe(true);
    expect(s.flags.honoursStipend).toBe(true);
    expect(s.allow).toBe(allowBefore + 1500);
    expect(s.ach).toEqual(expect.arrayContaining(['honours', 'studied2y']));
  });

  it('every choice of both session scenes runs for admitted and non-admitted players', () => {
    for (const adm of [true, false]) for (const id of ['cal_session_w', 'cal_session_s']) {
      const s = student(); s.flags.admitted = adm;
      const sc = G.get(id, s) as G.Scenario;
      for (let i = 0; i < sc.choices.length; i++) expect(() => G.choose(structuredClone(s), G.get(id, s) as G.Scenario, i)).not.toThrow();
    }
  });
});

describe('student origins', () => {
  it('start as admitted students and meet all four exam sessions in two game years', () => {
    for (const o of ['student', 'dagestan']) {
      const s = G.newState('S', o); s.queue = [];
      expect(s.flags.admitted, o).toBe(true);
      let seen = 0;
      for (let d = 0; d < G.MAXDAY; d++) { G.endDay(s); const q = s.queue.filter(id => id.startsWith('cal_session')); seen += q.length; s.queue = []; }
      expect(seen, o).toBe(4);
    }
  });
});
