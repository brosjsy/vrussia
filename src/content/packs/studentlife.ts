/* Daily life of a student: the gradebook, the "automatic" pass, dorm rules, coursework, the group leader, a week of deadlines.
   Terms checked in a student dictionary: avtomat (pass without the exam), zachetka (gradebook), zapara (a rush of deadlines).
   Others (kursovaya = coursework, khvost = an exam debt, propusk = entrance pass, starosta = group leader) are standard words explained loosely. */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
const U = (id: string, title: string, text: string, a: Pick2, b: Pick2, o: { w?: number; req?: (s: State) => unknown; months?: number[] } = {}): void => {
  S({
    id: `stu-${id}`, cat: 'edu', w: o.w ?? 1.3, months: o.months, title, text,
    req: (s: State) => !!s.flags.admitted && (!o.req || !!o.req(s)),
    choices: [{ t: a[0], r: () => O(a[1], a[2]) }, { t: b[0], r: () => O(b[1], b[2]) }],
  });
};

U('zachetka', 'The gradebook (zachetka)', 'The dean\'s office hands you a small booklet, your zachetka. Every credit and every exam grade goes into it, signed by the teacher.',
  ['Keep it carefully and bring it to every exam', 'A tidy booklet means no panic at the dean\'s office. You are a person of order.', { know: 1, stress: -3, rep: 1 }],
  ['Leave it in a drawer', 'A week before the session you find it under a pile of notes, a bit crumpled.', { stress: 3 }]);
U('avtomat', 'A pass without an exam: the "avtomat"', 'The professor announces: "Those who attended every lecture and handed in all assignments get the grade automatically."',
  ['Show your notes and attendance', 'You get the grade at once. A whole week free of cramming.', { know: 2, stress: -8, energy: 8, rep: 2 }],
  ['Say you would rather sit the exam to improve the grade', 'The professor is surprised, then pleased. You do the exam and score higher.', { know: 4, energy: -10, stress: 4, rep: 3 }], { w: 2 });
U('zapara', 'A week of deadlines (zapara)', 'Three assignments, a presentation and a laboratory report are due in the same week. The corridor smells of instant noodles and panic.',
  ['Plan every day by the hour and sleep in shifts', 'It hurts, but everything is handed in. You discover the power of a to-do list.', { know: 3, energy: -22, stress: 10 }],
  ['Ask for an extension on one of them', 'The teacher grants two days. One less knot in your stomach.', { know: 1, stress: 4, energy: -10 }], { w: 1.8 });
U('propusk', 'The pass at the dormitory door', 'The dormitory guard asks for your pass at the entrance every evening. "No pass, no entry," she says, not unkindly.',
  ['Show it with a smile and say good evening', 'She nods. Within a month she lets you in even when you forget it, and asks how the exam went.', { rep: 2, stress: -3 }],
  ['Argue that you live here', 'She looks over her glasses. It takes ten minutes and a phone call to the warden.', { stress: 5, energy: -4 }]);
U('kitchen', 'The shared kitchen', 'One kitchen per floor, one rota, one fridge with names written on tape. Someone has been eating other people\'s dumplings.',
  ['Propose a cleaning rota and name labels', 'The floor meeting is stormy, then peaceful. The rota survives for three weeks, a record.', { merit: 3, rep: 3, friends: 1 }],
  ['Cook late at night when nobody is there', 'Quiet and efficient, if a little lonely.', { stress: -2, energy: -4 }]);
U('quiet', 'Quiet hours', 'It is midnight and somebody is playing the guitar loudly in the next room before an exam.',
  ['Knock politely and ask them to stop', 'The guitar falls silent. The next day a note appears: "Sorry. Good luck on the exam!"', { rep: 2, stress: -3 }],
  ['Put on earphones and endure', 'You study to a distant chorus of "Kino". You learn a new song.', { stress: 3, energy: -4, know: 1 }]);
U('kursovaya', 'Coursework', 'Your coursework (kursovaya) is due: twenty pages, a bibliography and a supervisor who answers messages only on Tuesdays.',
  ['Start early and book supervision slots', 'You hand in on time and the supervisor writes "good work" in the margin.', { know: 5, energy: -12, stress: 2, rep: 2 }],
  ['Write it all in the last two nights', 'A grey dawn, strong tea and a text that you hope nobody reads too closely.', { know: 2, energy: -24, stress: 12 }], { w: 1.6 });
U('khvost', 'A "tail" (khvost)', 'You failed one exam in the session. In student speech this is a khvost, a tail: a debt that follows you until you retake it.',
  ['Prepare properly and retake it this week', 'You pass at the second attempt and feel the tail drop off.', { know: 4, energy: -14, stress: -4 }],
  ['Put it off until next term', 'The tail grows heavier. The dean\'s office sends a polite warning.', { stress: 8, rep: -2 }], { w: 1.2 });
U('starosta', 'The group leader (starosta)', 'The group elects a starosta, a student who passes messages between the group and the dean\'s office. Nobody wants the job, and everyone looks at you.',
  ['Accept the job', 'You get the schedule first, the blame second and a small respect from the dean\'s office.', { rep: 4, merit: 2, stress: 5, energy: -4 }],
  ['Propose a colleague who is good with messages', 'A relieved classmate says yes. You owe each other a coffee.', { friends: 1, stress: -2 }], { w: 1.2 });
U('council', 'The student council', 'The student council organises a trip, a concert and a clean-up day. They need volunteers with a free weekend.',
  ['Volunteer for the clean-up day', 'Gloves, bags and tea at noon. A dozen new friends.', { merit: 5, friends: 2, energy: -12, stress: -6 }],
  ['Buy a ticket for the concert instead', 'Loud, crowded, lovely. Your voice is gone by Monday.', { money: -500, stress: -10, friends: 1 }]);
U('praktika', 'Work placement (praktika)', 'The programme requires a two-week placement at a company. A list of partner firms is on the notice board.',
  ['Choose a firm in your field and apply', 'You learn more in two weeks than in two terms. The supervisor writes you a kind reference.', { know: 6, energy: -10, rep: 3, stress: 2 }],
  ['Pick the nearest one, whatever it does', 'You file papers and learn how an office coffee machine works.', { know: 1, energy: -6, stress: -2 }], { w: 1.2 });
U('stipend', 'Scholarship day', 'On the 25th the scholarship arrives: a modest sum, welcome as rain after a drought. Students joke that it is enough for tea.',
  ['Budget it for the month in an app', 'You track every rouble. You are surprised how far it goes.', { know: 1, stress: -4, money: 600 }],
  ['Spend half of it on a pizza evening', 'Twelve people, three pizzas and a rule: nobody mentions the exam.', { money: 200, stress: -10, friends: 2 }], { w: 1.2 });
U('diploma', 'Choosing a thesis topic', 'The department publishes a list of topics for final theses and supervisors. Some of them are famous and strict.',
  ['Pick a topic that excites you, even if it is hard', 'The supervisor smiles: "At last, somebody who wants to work."', { know: 4, rep: 3, stress: 3 }],
  ['Pick the easiest one', 'You will finish early and be a little bored.', { know: 1, stress: -3 }], { w: 1.1 });
U('registration', 'Dorm registration check', 'The university\'s international office checks that every foreign student\'s migration registration is valid before the term continues.',
  ['Bring your passport, card and registration copies', 'The officer stamps a list and smiles. Everything is in order.', { stress: -6, rep: 2 }],
  ['Realise your registration is about to expire', 'She walks you to the right window and helps you start the renewal at once.', { stress: 6, docs: { reg: 5 } }], { w: 2.2, req: s => s.status === 'student' });
