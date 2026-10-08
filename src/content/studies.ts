/* University life after admission: exam sessions (January and June), grades on the Russian 5-point scale,
   scholarships, warnings and expulsion. Non-students just see the cramming around them. */
import { S, O, CAL, clamp, rnd, gamble } from '../engine';
import type { State, Choice, Effects } from '../engine';

CAL.push({ m: 1, d: 15, id: 'cal_session_w' }, { m: 6, d: 10, id: 'cal_session_s' });

const gpa = (s: State): number => Number(s.tmp.gpa || 0);
const sessions = (s: State): number => Number(s.tmp.sessions || 0);
const fails = (s: State): number => Number(s.tmp.fails || 0);

/** Records a grade (2 = fail, 3–5 = pass) and returns the effects of the session. */
function record(s: State, grade: number, label: string): { msg: string; fx: Effects } {
  const n = sessions(s);
  const fx: Effects = { run: st => {
    st.tmp.gpa = Math.round(((Number(st.tmp.gpa || 0) * n + grade) / (n + 1)) * 100) / 100;
    st.tmp.sessions = n + 1;
    if (grade < 3) st.tmp.fails = Number(st.tmp.fails || 0) + 1;
    if (Number(st.tmp.fails || 0) >= 3) { st.flags.admitted = false; st.flags.expelled = true; }
    if (st.tmp.sessions >= 4) st.flags.studied2y = true;
    if (Number(st.tmp.gpa) >= 4.5 && Number(st.tmp.sessions) >= 2 && !st.flags.honoursStipend) { st.flags.honoursStipend = true; st.allow += 1500; }
  } };
  if (grade >= 5) Object.assign(fx, { know: 4, stress: -10, rep: 3 });
  else if (grade === 4) Object.assign(fx, { know: 3, stress: -4 });
  else if (grade === 3) Object.assign(fx, { know: 1, stress: 2 });
  else Object.assign(fx, { know: 0, stress: 14, money: -3000 });
  const word = ['', '', 'FAIL (2)', 'satisfactory (3)', 'good (4)', 'excellent (5)'][grade];
  return { msg: `${label} Result: ${word}. ${grade < 3 ? 'You must retake it and pay a fee.' : ''}`, fx };
}

const mk = (id: string, season: string): void => {
  S({
    id, cat: 'cal', free: true, title: `${season} exam session`, text: '',
    build: (s: State) => {
      if (!s.flags.admitted) {
        return {
          text: s.flags.expelled
            ? `Exam session at the university where you used to study. A friend writes: "They are handing out the schedule. I miss you here." You think about the year that was.`
            : 'The exam session starts. Students around you carry notebooks, energy drinks and the glassy look of the sleepless. You are glad (or sorry) it is not your turn.',
          choices: [{ t: 'Wish your friends luck', r: () => O('You send a message and a sticker of a cat. Someone replies with three stars.', { stress: -2, rep: 1 }) }],
        };
      }
      const mkChoice = (t: string, label: string, energy: number, stress: number, bonus: number, spread: number, risky = false): Choice => ({
        t,
        r: () => {
          if (risky && Math.random() < 0.4) {
            const warn = Number(s.tmp.warn || 0) + 1;
            const msg = warn >= 2 ? 'The proctor spots the sheet. A report goes to the dean: this is your second warning — you are expelled.' : 'The proctor spots the cheat sheet. The exam is cancelled and you receive a warning.';
            return O(msg, { stress: 18, rep: -6, run: st => { st.tmp.warn = warn; st.tmp.fails = Number(st.tmp.fails || 0) + 1; if (warn >= 2) { st.flags.admitted = false; st.flags.expelled = true; } } });
          }
          const grade = clamp(Math.round((s.know + bonus + rnd(-spread, spread)) / 20), 2, 5);
          const r = record(s, grade, label);
          return O(r.msg, { energy, ...r.fx, stress: (r.fx.stress ?? 0) + stress });
        },
      });
      return {
        text: `${season} exam session at the university. Four exams in three weeks. Your average so far: ${sessions(s) ? gpa(s).toFixed(2) : 'no grades yet'}. ${fails(s) ? `You already have ${fails(s)} failed attempt(s) on record.` : ''}`,
        choices: [
          mkChoice('Study hard for a week', 'You prepared properly.', -25, 6, 30, 10),
          mkChoice('Study as usual', 'A normal level of preparation.', -12, 3, 12, 16),
          mkChoice('Cram the night before', 'You crammed through the night.', -22, 12, 0, 28),
          mkChoice('Use a cheat sheet', 'You smuggled a cheat sheet.', -8, 8, 15, 14, true),
        ],
      };
    },
    choices: [],
  });
};
mk('cal_session_w', 'Winter');
mk('cal_session_s', 'Summer');

S({
  id: 'study_scholarship', cat: 'edu', w: 2, req: (s: State) => !!s.flags.admitted && !s.flags.scholarship, title: 'Apply for a scholarship',
  text: 'The dean\'s office announces: students with good grades may apply for an academic scholarship. A form, a transcript and a signature.',
  choices: [
    { t: 'Apply with your transcript', r: (s: State) => gamble(0.35 + gpa(s) / 10, O('Approved! A monthly payment appears on your card.', { flag: 'scholarship', run: st => { st.allow += 700; }, stress: -6, rep: 2 }), O('Declined this time: too many students with higher averages.', { stress: 4 })) },
    { t: 'Skip it', r: () => O('You focus on lectures instead.', {}) },
  ],
});
S({
  id: 'study_dorm_night', cat: 'edu', w: 1.2, req: (s: State) => !!s.flags.admitted, title: 'A night in the library',
  text: 'The library stays open until 23:00 during session. The desk lamps hum, someone eats noodles, and a whisper fight breaks out over a missing textbook.',
  choices: [
    { t: 'Study until closing', r: () => O('You leave with a headache and a plan.', { know: 3, energy: -12, stress: 3 }) },
    { t: 'Form a study circle with strangers', r: () => O('Four hours later you know three new people and one new formula.', { know: 2, friends: 1, energy: -8 }) },
  ],
});
S({
  id: 'study_expelled_appeal', cat: 'edu', w: 30, req: (s: State) => !!s.flags.expelled && !s.flags.reinstated, title: 'Appeal your expulsion',
  text: 'You may submit a request for reinstatement. The commission meets next week: you need a good reason and a plan.',
  choices: [
    { t: 'Submit the appeal with a study plan', r: (s: State) => gamble(0.5, O('Reinstated on probation. The dean says: "Do not waste it."', { flag: 'reinstated', run: st => { st.flags.admitted = true; st.flags.expelled = false; st.tmp.fails = 1; st.tmp.warn = 0; }, stress: -10, rep: 2 }), O('Appeal rejected. You may try again next year in the admission campaign.', { stress: 12, flag: 'reinstated' })) },
    { t: 'Let it go', r: () => O('You close the chapter and look for another way.', { stress: 4 }) },
  ],
});
