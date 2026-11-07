import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { settleAttendance, attend, absences, WARN_AT, STIPEND_AT, EXPEL_AT, onRoll } from '../src/attendance';

const student = (): G.State => { const s = G.newState('Stu', 'student'); s.queue = []; s.day = 10; return s; };

describe('attendance at the university', () => {
  it('a weekday without class is a truancy; a weekend is not; a day with class is not', () => {
    const s = student();
    expect(settleAttendance(s, 0)).toEqual([]); expect(absences(s)).toBe(0);
    expect(settleAttendance(s, 2).length).toBe(1); expect(absences(s)).toBe(1);
    attend(s); expect(settleAttendance(s, 3)).toEqual([]); expect(absences(s)).toBe(1);
  });
  it('warns, cuts the stipend, calls the dean and finally expels', () => {
    const s = student(); s.allow = 5000; const rep = s.rep;
    for (let i = 1; i <= EXPEL_AT; i++) { s.day = 10 + i; settleAttendance(s, 2); if (i === WARN_AT) expect(s.rep).toBeLessThan(rep); if (i === STIPEND_AT) expect(s.allow).toBeLessThan(5000); }
    expect(s.flags.expelled).toBe(true); expect(s.flags.admitted).toBe(false); expect(onRoll(s)).toBe(false);
    expect(settleAttendance(s, 2)).toEqual([]);                      // no longer on the roll: nothing more to count
  });
  it('is part of a real day: a student who never goes to class is counted by endDay', () => {
    const s = student(); let n = 0;
    for (let i = 0; i < 14; i++) { n += G.endDay(s).filter(l => /skipped class|Прогул/.test(l)).length; }
    expect(n).toBeGreaterThanOrEqual(8);
  });
  it('people who are not students are never counted', () => {
    const s = G.newState('Worker', 'moscow'); s.flags.admitted = false;
    for (let i = 0; i < 10; i++) G.endDay(s);
    expect(absences(s)).toBe(0);
  });
});
