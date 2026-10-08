/* Ordinary workdays: twenty-one small scenes that can happen in any job, so that long careers do not repeat the same few incidents.
   (Found by a variety measurement: one job-specific incident appeared 29 times in a single two-year game.) */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
const W = (id: string, title: string, text: string, a: Pick2, b: Pick2, o: { req?: (s: State) => unknown; months?: number[]; who?: string[] } = {}): void => {
  S({
    id: `wd-${id}`, cat: 'work', w: 1.1, title, text, months: o.months, who: o.who,
    req: (s: State) => !!s.job && (!o.req || !!o.req(s)),
    choices: [{ t: a[0], r: () => O(a[1], a[2]) }, { t: b[0], r: () => O(b[1], b[2]) }],
  });
};

W('canteen', 'Lunch in the canteen', 'The canteen offers soup, a cutlet with buckwheat and compote for ₽250. Colleagues wave you over to their table.',
  ['Join them', 'You hear who is getting married and whose boss is leaving. Information is the real dessert.', { money: -250, stress: -6, friends: 1, energy: 6 }],
  ['Eat alone with a book', 'A quiet half hour.', { money: -250, stress: -4, energy: 6, know: 1 }]);
W('cake', 'A birthday cake', 'A colleague brings a cake for her birthday and a card goes around for signatures.',
  ['Sign the card and add ₽300 to the gift', 'You are thanked by name. Cake tastes better with a good conscience.', { money: -300, rep: 3, stress: -4 }],
  ['Take a slice and say congratulations', 'She smiles. It is enough.', { stress: -3, rep: 1 }]);
W('payday', 'Payday', 'The accountant puts the envelope (or the transfer) through. The mood in the workshop improves by about forty percent.',
  ['Treat the team to tea and sweets', 'A tradition: the first to say "payday" buys the cookies.', { money: -400, rep: 3, friends: 1 }],
  ['Go straight home', 'You count it twice and relax.', { stress: -4 }]);
W('briefing', 'Safety briefing', 'Every quarter the supervisor reads the safety rules aloud for twenty minutes. Half of the room is asleep.',
  ['Listen and ask one real question', 'The supervisor brightens: "At last, a question." The answer might save you one day.', { know: 2, rep: 2 }],
  ['Sign the sheet and wait', 'Twenty minutes, one signature.', { stress: 1 }]);
W('training', 'A training afternoon', 'Management organises a half-day course on customer service and teamwork, with a slide show and free tea.',
  ['Take notes and take part', 'You pick up two useful ideas and one terrible joke.', { know: 3, energy: -4, rep: 2 }],
  ['Sit at the back', 'You absorb about ten percent.', { know: 1 }]);
W('swap', 'Shift swap', 'A colleague asks you to swap shifts so he can attend his daughter\'s concert on Saturday.',
  ['Agree', 'He owes you one, and says so three times.', { energy: -8, rep: 4, friends: 1 }],
  ['Say you already have plans', 'He finds someone else. You feel a little small.', { stress: 2 }]);
W('commute', 'Late because of the snow', 'Buses are delayed by snow and you arrive twenty minutes after your shift starts.',
  ['Apologise and make up the time', 'Your supervisor nods; you stay late and nobody mentions it again.', { energy: -6, rep: 2 }],
  ['Blame the weather', 'It is true, and the supervisor sighs: "Everybody is late today."', { stress: 3 }], { req: s => ['snow', 'frost'].includes(s.weather) });
W('heat', 'A very hot day at work', 'It is thirty-four degrees and the ventilation is broken. Water bottles disappear by 11 a.m.',
  ['Bring ice and water for the team', 'Cold bottles are passed around. You are the hero of the afternoon.', { money: -300, rep: 4, stress: -3 }],
  ['Work slowly and drink water', 'You survive.', { energy: -8, health: -1 }], { months: [7, 8] });
W('praise', 'Praise from the manager', 'At the morning meeting the manager says, unexpectedly, that your work has been "reliable and neat".',
  ['Thank him and credit the team', 'Colleagues smile. Credit shared is credit doubled.', { rep: 4, stress: -6 }],
  ['Just nod', 'You feel warm all day.', { rep: 2, stress: -4 }]);
W('rumour', 'Layoff rumours', 'Whispers say the company will cut staff after New Year. Everyone looks at the management corridor.',
  ['Ask the supervisor directly', 'He says: "Nothing is decided. Do good work." It is more honest than reassuring.', { stress: 4, know: 1 }],
  ['Update your resume quietly', 'Just in case. You feel better having a plan.', { stress: -2, know: 1, energy: -3 }]);
W('tool', 'A missing tool', 'The tool (or the key, or the scanner) you need has disappeared from its place.',
  ['Search methodically and ask who used it last', 'It is found in a jacket pocket. Fifteen minutes lost, a lesson gained.', { energy: -3, know: 1 }],
  ['Borrow from the next team and say nothing', 'Quick, but they notice.', { rep: -1, stress: 2 }]);
W('nightshift', 'Tea on the night shift', 'At 3 a.m. the building is quiet. Someone boils a kettle and a half-circle of tired faces gathers.',
  ['Join them and listen to the stories', 'Two hours of dry jokes and good advice. You learn more than in the day.', { stress: -8, friends: 1, know: 1 }],
  ['Keep working to finish early', 'You finish on time and are the first to leave.', { energy: -4 }]);
W('uniform', 'A new uniform', 'Management hands out new uniforms and hats with the company logo. Nobody asked for the hat.',
  ['Wear it with a smile', 'The hat is surprisingly warm. Customers are impressed by the logo.', { rep: 2, clothes: 3 }],
  ['Wear your old clothes under it', 'You are the only one.', { clothes: 3, stress: 1 }]);
W('sanitary', 'A medical book check', 'The employer asks every employee to renew their medical book (sanitary book), which takes a day and some money.',
  ['Do it this week', 'Queues and stamps, but you have the paper before the inspection.', { money: -1800, energy: -8, stress: -2, rep: 2 }],
  ['Postpone it', 'The inspector arrives sooner than expected.', { money: -3000, stress: 8 }]);
W('compliment', 'A customer says thank you', 'A customer returns just to say that your help yesterday made her day.',
  ['Smile and say it was nothing', 'She leaves a small chocolate. You carry the smile for hours.', { stress: -8, rep: 3 }],
  ['Tell the manager', 'He writes it on the notice board with a star.', { rep: 5, stress: -4 }]);
W('language', 'Two words that mean the same', 'Your colleagues argue over whether the word you used is "correct" Russian or only used in some regions.',
  ['Join the debate with a local example', 'Half the room learns a new word and half teaches you one back.', { know: 2, friends: 1, stress: -3 }],
  ['Stay out of it', 'Wisdom of the quiet colleague.', {}]);
W('radio', 'The radio in the workshop', 'The radio plays the same eight songs, and you now know all the words.',
  ['Sing along quietly', 'By lunch the whole room is humming. Productivity goes up or down, depending on who you ask.', { stress: -6, rep: 1 }],
  ['Put in your own earphones', 'Your own playlist for your own thoughts.', { stress: -4 }]);
W('smoke', 'The corner by the door', 'Colleagues gather in the cold corner behind the building for a break, whether they smoke or not.',
  ['Join them with a cup of tea', 'It is where the real decisions are made.', { stress: -4, friends: 1, know: 1 }],
  ['Stay inside', 'You miss one rumour.', {}]);
W('photo', 'The staff photograph', 'The company is making a poster with employee portraits and asks for volunteers.',
  ['Volunteer', 'You look like a stranger in a tie. Your mother will love it.', { rep: 3, stress: 2, famLove: 1 }],
  ['Decline politely', 'Others take the slot.', {}]);
W('paperwork', 'The form for the form', 'HR asks you to fill in a form about the form you filled in last month. Rewrite, sign and return.',
  ['Fill it in carefully', 'It takes twenty minutes and saves you a longer conversation later.', { energy: -3, know: 1 }],
  ['Leave it until the deadline', 'HR sends a polite reminder every day.', { stress: 4 }]);
W('visitor', 'The boss\'s boss arrives', 'A director from head office tours the site. Everything is suddenly very clean.',
  ['Stay calm and do your usual work', 'He nods at your corner and moves on. No drama.', { rep: 2, stress: -2 }],
  ['Rush to tidy the area', 'It looks good, until you find the broom behind the door.', { energy: -5, rep: 1 }]);
