/* Sport and the body: ten scenes about keeping fit, Russian-style.
   Fact checked (web search, round 48): the GTO complex ("Ready for Labour and Defence") was revived by a presidential
   decree of 24 March 2014 and introduced from 1 September 2014; it has bronze, silver and gold badges and eleven age groups
   from six years old upwards. Everything else (yard football, hockey, cross-country skiing, chess, volleyball, gym) is general life. */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
const P = (id: string, title: string, text: string, a: Pick2, b: Pick2, o: { months?: number[]; w?: number; req?: (s: State) => boolean } = {}): void => {
  S({
    id: `sport-${id}`, cat: 'life', w: o.w ?? 1, months: o.months, req: o.req, title, text,
    choices: [{ t: a[0], r: () => O(a[1], a[2]) }, { t: b[0], r: () => O(b[1], b[2]) }],
  });
};

P('gto', 'The GTO badge', 'A colleague shows you a badge on his lapel: GTO, "Ready for Labour and Defence". The complex was revived in 2014, with bronze, silver and gold badges and tests for every age from six years up.',
  ['Sign up for the tests', 'Pull-ups, a run and a swim later, you are tired, sore and strangely proud. The paperwork says "silver".', { energy: -20, health: 3, stress: -6, merit: 1, know: 1 }],
  ['Say you will think about it', 'He smiles. Everyone says that.', { stress: 1 }]);
P('yard-football', 'Football in the yard', 'On a summer evening the lads in the yard are one player short. "You! Come on!"',
  ['Join the game', 'Two goals, one scraped knee and a lot of new friends.', { energy: -16, health: 1, stress: -10, friends: 2 }],
  ['Watch from the bench', 'You shout advice and are mostly ignored. It is still fun.', { stress: -4, friends: 1 }], { months: [5, 6, 7, 8, 9], w: 1.4 });
P('hockey', 'Hockey on the rink', 'A friend invites you to a pick-up game at an outdoor rink: borrowed skates, borrowed stick, a lot of steam.',
  ['Play, however badly', 'You fall eleven times and score once by accident. The team applauds.', { energy: -18, health: 1, stress: -10, friends: 2 }],
  ['Skate alone at the edge', 'A calmer evening, a few laps, a hot tea from a thermos.', { energy: -8, stress: -6 }], { months: [12, 1, 2, 3], w: 1.4 });
P('skiing', 'Cross-country skiing', 'There is a trail in the nearby park. Skis can be rented by the hour; the forest under snow is quiet and white.',
  ['Rent skis and go', 'An hour in, you stop noticing the cold. You come back red-faced and happy.', { energy: -15, health: 3, stress: -10, clothes: -2 }],
  ['Walk along the trail instead', 'The pace is slower but the air is just as good.', { energy: -6, health: 1, stress: -6 }], { months: [12, 1, 2], w: 1.3 });
P('gym', 'A gym membership', 'A gym near the metro offers a first month at a discount. The trainer smiles. The treadmill looks unfriendly.',
  ['Buy the month', 'You go four times, then life interferes. You feel better anyway.', { money: -2500, energy: -10, health: 2, stress: -5 }],
  ['Run outside for free', 'Cheap, honest and windier than you expected.', { energy: -9, health: 1, stress: -4 }], { req: s => s.money > 4000 });
P('chess', 'Chess in the courtyard', 'Two men play chess at a table in the courtyard, a small crowd watching. One of them looks up: "Play?"',
  ['Sit down and play', 'You lose in eleven moves and win a lesson on the Sicilian. You are asked to come again.', { know: 2, friends: 1, stress: -3, energy: -4 }],
  ['Stand and watch', 'You learn more from the crowd\'s whispered advice than from the game.', { know: 1, stress: -2 }]);
P('volleyball', 'Volleyball by the river', 'A group of students has put up a net on the sand by the river. A ball lands at your feet.',
  ['Throw it back and join in', 'You learn the rules from shouting. The evening ends with a shared watermelon.', { energy: -12, health: 1, stress: -8, friends: 2 }],
  ['Return the ball and keep walking', 'A polite wave. A normal evening.', { stress: -1 }], { months: [6, 7, 8], w: 1.3 });
P('morning-exercise', 'Morning exercises', 'A neighbour does her morning exercises on the balcony in all weather and invites you to try "just ten minutes".',
  ['Try it for a week', 'The first days hurt, then you feel lighter. She nods: "Of course."', { energy: -6, health: 2, stress: -4, friends: 1 }],
  ['Sleep a little longer', 'The most comfortable decision of the day.', { energy: 6, stress: -2 }]);
P('match', 'The match on TV', 'Everyone at work is talking about last night\'s match. The office is split into two camps and a friendly bet is going.',
  ['Join the debate and bet a small amount', 'Whichever side wins, the coffee machine becomes a place of shared opinion.', { money: -300, friends: 2, stress: -5, rep: 1 }],
  ['Stay out of it', 'You nod at the right moments and keep the peace.', { stress: -1 }], { req: s => !!s.job });
P('swim', 'The public pool', 'A public pool offers a lane for beginners. You need a cap, a medical certificate and slippers; the staff are strict about all three.',
  ['Get the certificate and swim', 'Visits to the clinic, a stamp, then forty slow lengths. A good habit starts.', { money: -800, energy: -14, health: 3, stress: -8, know: 1 }],
  ['Skip the pool', 'The cap stays unbought.', { stress: 1 }], { w: 0.9 });
