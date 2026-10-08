/* School and kindergarten: nine scenes for players with children.
   Fact checked (web search, round 57, for 2026): first-grade applications for children of the school's catchment area are accepted
   from 1 April to 30 June, through Gosuslugi, by registered post or in person; for other children from 6 July until the places run out;
   the child must be at least 6 years 6 months and not older than 8 on 1 September. Regions may differ slightly and the rules can change
   from year to year, so the scene says "in 2026". Everything else (the 1 September "Day of Knowledge", the last bell in May,
   the parents' chat and meetings, school uniform and lunch) is everyday school life, described without prices. */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
const K = (id: string, title: string, text: string, a: Pick2, b: Pick2, o: { months?: number[]; w?: number } = {}): void => {
  S({
    id: `school-${id}`, cat: 'family', w: o.w ?? 1, months: o.months, title, text,
    req: (s: State) => s.kids > 0,
    choices: [{ t: a[0], r: () => O(a[1], a[2]) }, { t: b[0], r: () => O(b[1], b[2]) }],
  });
};

K('enrol', 'Enrolling in the first grade', 'Your child turns six and a half this year. In 2026 the applications for the nearest school opened on 1 April and for children of its catchment area they close on 30 June; the child must be at least 6 years 6 months and not older than 8 on 1 September.',
  ['Apply online at the start of April', 'A few clicks, a date and a confirmation. The school is a ten-minute walk away.', { know: 2, stress: -3, energy: -4 }],
  ['Wait until June', 'You get a place, but the school you wanted fills up.', { stress: 6, know: 1 }], { months: [4, 5, 6], w: 1.8 });
K('day-of-knowledge', 'The first of September', 'The "Day of Knowledge": children in white shirts, huge bouquets, a ceremony in the school yard and a first-grader carried on the shoulders of an older boy with a bell.',
  ['Join the ceremony with flowers', 'You cry a little and pretend it was the wind. The bell rings and your child is a schoolchild.', { famLove: 4, stress: -6, money: -400 }],
  ['Watch from the fence', 'A small proud shape in the crowd.', { famLove: 2, stress: -3 }], { months: [9], w: 2 });
K('chat', 'The parents\' chat', 'You are added to the class parents\' chat. By evening there are 143 messages about a lost glove, a collection for a teacher\'s gift and the correct way to write a date.',
  ['Join in cheerfully', 'You become the unofficial organiser of the class tea party.', { friends: 2, stress: 4, rep: 1, energy: -4 }],
  ['Mute it for a week', 'Peace. You will find out about the gift on the last day.', { stress: -3 }], { w: 1.2 });
K('homework', 'Homework at ten at night', 'Your child has a problem about a train and a pool. Neither of you can remember how to solve it.',
  ['Search for the method together', 'It takes an hour and a notebook of crossed-out lines. The answer is correct and you are both proud.', { know: 1, famLove: 3, energy: -8, stress: 2 }],
  ['Ask an older neighbour', 'She solves it in two minutes and gives a short lecture about ways of thinking.', { know: 2, friends: 1, energy: -3 }]);
K('meeting', 'The parents\' meeting', 'The teacher calls a meeting. The agenda: behaviour, repairs of the classroom and "voluntary" contributions. Thirty parents sit on small chairs.',
  ['Go and listen', 'The meeting lasts two hours. You make friends with another parent over a shared sigh.', { energy: -8, friends: 1, know: 1, stress: 3 }],
  ['Send an apology message', 'The teacher replies with a thumbs-up and a list of tasks.', { stress: 2 }], { w: 0.9 });
K('uniform', 'The school clothes', 'The school asks for a uniform or at least "business style": dark trousers or a skirt, a white shirt, indoor shoes. Children grow out of everything by January.',
  ['Buy a full set', 'Neat, but it is soon too small.', { money: -3500, stress: -2, famLove: 1 }],
  ['Buy second-hand from the class chat', 'A parent hands over a bag with a smile. Not new but perfectly fine.', { money: -800, friends: 1, stress: -1 }]);
K('last-bell', 'The last bell', 'The "last bell" rings at the end of May and the school year ends with a festive assembly, songs and a speech from the head teacher.',
  ['Attend with the family', 'A ribbon, a ringing bell, a speech. Summer begins.', { famLove: 3, stress: -6, energy: -4 }],
  ['Let the grandparents go', 'They return with photos and a long story.', { famLove: 2, stress: -2 }], { months: [5], w: 1.8 });
K('kindergarten', 'The kindergarten queue', 'You need a place in the kindergarten. The queue is online, and the system tells you your number in a long list, which does not move.',
  ['Visit the department and ask in person', 'A kind employee finds a way to offer a different kindergarten across the park.', { energy: -8, know: 2, stress: 2 }],
  ['Wait and ask a grandmother to help', 'The grandmother takes over with pleasure. Everyone is tired, everyone is happy.', { famLove: 3, energy: -4, stress: 2 }], { w: 1.1 });
K('sick-child', 'The child has a temperature', 'In the morning your child has a fever and a cough. The school says to keep the child at home and bring a note from the doctor.',
  ['Stay home and call the clinic', 'You read stories under a blanket, make tea with lemon and book an appointment. The child recovers in a few days.', { famLove: 3, energy: -6, money: -300, stress: 3 }],
  ['Ask a grandmother to come over', 'She arrives with soup in a jar and a firm opinion about medicine.', { famLove: 2, stress: -2, money: -100 }], { w: 1.2 });
