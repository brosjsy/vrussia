/* Fines: how they arrive, why paying early matters, and the online service that pays them.
   Model (simplified): pay within 20 days of the decision for half price; after 60 days the amount doubles.
   Discount rules in Russia have changed over the years, so the game presents them as a simplified model. */
import { S, O, money } from '../engine';
import type { State, Choice, Effects } from '../engine';
import { addFlow } from '../forms';

const owed = (s: State): number => Number(s.tmp.fines || 0);
const age = (s: State): number => s.day - Number(s.tmp.fineDay ?? s.day);

/** What the player must pay today: 50% in the first 20 days, 100% to day 60, then double. */
export function fineDue(s: State): number {
  const a = age(s);
  const f = owed(s);
  return a <= 20 ? Math.round(f / 2) : a <= 60 ? f : Math.max(f * 2, 1000);   // Article 20.25: twice the amount, at least 1,000
}
const addFine = (amount: number): Effects['run'] => st => {
  if (!Number(st.tmp.fines)) st.tmp.fineDay = st.day;
  st.tmp.fines = Number(st.tmp.fines || 0) + amount;
};

const C = (t: string, msg: string, fx: Effects): Choice => ({ t, msg, fx });

const notices: [string, string, number, (s: State) => unknown][] = [
  ['A speed camera', 'A notification in the Gosuslugi app: your car was recorded doing 71 km/h in a 60 zone.', 500, s => !!s.car],
  ['A parking violation', 'A photo of your car on a pavement, taken by a parking patrol car. A fine has been issued.', 3000, s => !!s.car],
  ['A ticket inspector', 'On the tram an inspector writes you a protocol for travelling without a valid ticket.', 800, s => !s.car],
  ['Litter on the pavement', 'A police officer says you dropped a cigarette butt next to the bin and writes a protocol.', 1000, () => true],
  ['A noisy party', 'Neighbours called the police after 23:00. An officer arrives and issues a fine for noise.', 2000, () => true],
  ['Registration late', 'A letter says you were late to submit a notice about your new address.', 2000, s => s.status !== 'citizen'],
];
notices.forEach(([title, text, amount, req], i) => S({
  id: `fine-notice-${i}`, cat: 'paper', w: 1.1, req, title: `Fine: ${title.toLowerCase()}`,
  text: `${text} The amount is ${money(amount)}. Paying within 20 days gets you a discount (a simplified rule in the game); ignoring it makes it grow.`,
  choices: [
    { t: 'Pay it now with the early discount', r: (s: State) => (Object.values(s.bank).some(Boolean) || s.money >= amount / 2)
      ? O(`You pay ${money(amount / 2)} in the app at once. Receipt saved.`, { money: -Math.round(amount / 2), stress: -2, know: 1 })
      : O('You cannot pay it right now: no money.', { stress: 4, run: addFine(amount) }) },
    C('Deal with it later (use Online services → Pay fines)', 'You leave it in the app. The clock ticks.', { stress: 3, run: addFine(amount) }),
    C('Ignore it', 'You close the app. The amount stays in the system.', { stress: 2, run: addFine(amount) }),
  ],
}));

S({
  id: 'fine-reminder', cat: 'paper', w: 30, req: (s: State) => owed(s) > 0 && age(s) > 15 && age(s) < 60, title: 'A reminder about your unpaid fines',
  text: 'A message from the bailiffs\' service: "You have unpaid fines. After 60 days the amount doubles and enforcement begins."',
  choices: [
    C('Open Online services and pay them', 'You switch to the payment screen straight away.', { stress: 2 }),
    C('Pay later', 'You promise yourself.', { stress: 4 }),
  ],
});
S({
  id: 'fine-enforcement', cat: 'paper', w: 80, req: (s: State) => owed(s) > 0 && age(s) >= 60, title: 'Bailiffs and a blocked card',
  text: 'The bailiffs have taken the money for the fines (now doubled, with a minimum of ₽1,000) from your card, plus a fee. A note says: "Debt closed. Please read your notifications." In real life a court can also choose up to 15 days of arrest or up to 50 hours of compulsory labour instead; the game uses the doubled fine.',
  choices: [C('Sigh and move on', 'It is an expensive lesson in paying on time.', { money: -1, stress: 12, run: st => { st.money -= fineDue(st) + 500; st.tmp.fines = 0; st.tmp.fineDay = 0; } })],
});

addFlow({
  id: 'fines', icon: '🧾', title: 'Pay fines', site: 'Gosuslugi (fines)', blurb: 'Pay what you owe, with a discount if you are quick.',
  available: s => (owed(s) > 0 ? null : 'You have no unpaid fines.'),
  steps: [
    { title: 'Your fines', fields: s => [
      { id: 'info', type: 'note', label: `Unpaid: ${money(owed(s))}. Age of the decision: ${age(s)} days. ${age(s) <= 20 ? 'You get 50% off today.' : age(s) <= 60 ? 'The early discount has expired.' : 'The amount has doubled.'} To pay today: ${money(fineDue(s))}.` },
      { id: 'agree', type: 'checkbox', label: 'I confirm that I want to pay the fines listed above.', required: true },
    ] },
    { title: 'Payment', fields: s => [
      { id: 'pay', type: 'radio', label: 'Pay from', options: Object.values(s.bank).some(Boolean) ? [['card', 'My bank card'], ['cash', 'Cash at a bank branch (takes time)']] : [['cash', 'Cash at a bank branch (takes time)']] },
    ] },
    { title: 'Confirm', fields: () => [{ id: 'code', type: 'code', label: 'Enter the SMS code' }] },
  ],
  finish: (s, d) => {
    const due = fineDue(s);
    if (s.money < due) return O(`You need ${money(due)} but you have ${money(s.money)}.`, { stress: 6 });
    return O(`Paid ${money(due)}. The fines are closed and the receipt is saved to your account.`, {
      money: -due, stress: -8, know: 1, energy: d.pay === 'cash' ? -8 : 0,
      run: st => { st.tmp.fines = 0; st.tmp.fineDay = 0; },
    });
  },
});
