/* Wages and payday: nine scenes for people with a job.
   Fact checked (web search, round 54): under Article 136 of the Labour Code wages are paid at least every half month,
   on days set in the employer's internal rules or the contract; the first half of the month is paid between the 16th and
   the end of the current month, the second from the 1st to the 15th of the next, and when payday falls on a day off
   it is paid on the day before. No tax rates or compensation formulas are quoted. */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
const W = (id: string, title: string, text: string, a: Pick2, b: Pick2, o: { w?: number; req?: (s: State) => boolean } = {}): void => {
  S({
    id: `pay-${id}`, cat: 'work', w: o.w ?? 1, title, text,
    req: (s: State) => !!s.job && (!o.req || o.req(s)),
    choices: [{ t: a[0], r: () => O(a[1], a[2]) }, { t: b[0], r: () => O(b[1], b[2]) }],
  });
};

W('advance', 'The advance and the salary', 'Your company pays twice a month: the "advance" in the second half of the month and the "salary" at the start of the next. The advance is smaller and arrives first.',
  ['Plan the month around both payments', 'Rent from the salary, food from the advance. It works, and for once you know where the money is.', { money: 400, stress: -4, know: 1 }],
  ['Spend the advance at once', 'A good dinner, a bad week.', { money: -600, stress: 3 }], { w: 1.3 });
W('weekend-payday', 'Payday on a Sunday', 'Payday falls on a Sunday. A colleague says the company must pay it on the day before, and the accountant, to your surprise, agrees.',
  ['Wait for Friday and keep your plans', 'On Friday evening the notification arrives. The rule works.', { money: 800, stress: -3, know: 1 }],
  ['Ask for an advance anyway', 'The accountant says no gently; you come back on Friday.', { stress: 2 }]);
W('slip', 'The pay slip', 'You receive a pay slip with eleven lines and several abbreviations. The sum is not what you thought.',
  ['Ask the accountant to explain', 'She goes through every line. You leave knowing what a deduction is.', { know: 3, stress: -2, energy: -3 }],
  ['Look only at the bottom line', 'It matches the card balance. That will do for now.', { stress: 1 }]);
W('grey', 'An offer "in an envelope"', 'A small employer offers more than the market, "but part of it in an envelope, unofficial". No pension, no sick pay and no proof of income.',
  ['Insist on an official contract', 'The offer falls through. The next one is honest and slightly lower.', { money: -300, rep: 1, know: 2, stress: 3 }],
  ['Take the envelope', 'Good money until the first illness. You have no receipts for anything.', { money: 1500, stress: 5, rep: -2 }], { w: 0.9 });
W('delay', 'The salary is late again', 'Payday passes. The manager says "next week" for the second time. Colleagues whisper about complaining.',
  ['Write a formal request to the employer', 'It arrives in a document, so it cannot be forgotten. The money comes within days.', { money: 1200, stress: 4, know: 2, rep: 1 }],
  ['Wait quietly', 'It arrives, a week late, and nobody says sorry.', { stress: 8 }], { w: 1.1 });
W('inspection', 'The labour inspection', 'A colleague says you can complain online to the labour inspectorate if the employer ignores your rights. Nobody has done it yet.',
  ['Find out how to complain', 'You read the instructions and keep them for later. You feel less alone.', { know: 3, stress: -3, energy: -4 }],
  ['Keep your head down', 'Safe for now, and a bit uneasy.', { stress: 2 }], { w: 0.8 });
W('vacation', 'Holiday pay', 'Your holiday starts next week. The accountant says holiday pay is paid before it begins, and that it is calculated from your average earnings.',
  ['Take the holiday and plan a trip', 'The pay arrives in time. A few days by water; the world feels slow.', { money: -800, stress: -14, energy: 15, health: 1 }],
  ['Keep working', 'The boss is pleased, your body is not.', { money: 600, stress: 6, energy: -8 }], { w: 0.9 });
W('sick-leave', 'A sick note', 'You have a high temperature. The doctor opens an electronic sick note and tells you to stay home.',
  ['Stay home and recover', 'A few days under blankets. The payment for sick days comes later and is less than your pay.', { health: 4, energy: 12, stress: -6, money: -300 }],
  ['Go to work anyway', 'You infect half the office. The boss says nothing and everyone knows.', { health: -3, stress: 6, rep: -2 }], { w: 1 });
W('raise', 'Asking for a raise', 'You have worked well for a year. The boss is a person who says "we will think about it".',
  ['Ask politely with a list of what you did', 'He is surprised by the list. A raise comes in the next pay.', { money: 1000, rep: 2, stress: 3, know: 1 }],
  ['Wait for him to notice', 'He notices, in a year or two.', { stress: 2 }], { w: 0.9 });
