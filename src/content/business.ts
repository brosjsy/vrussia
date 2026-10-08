/* Small business: register a company (online form), then run it week by week with events.
   Rules are simplified: NPD (self-employed) pays 4–6% and has a ₽2.4M yearly limit; an individual entrepreneur (IP) can hire staff. */
import { S, O, BIZ_KINDS, money } from '../engine';
import type { State, Choice, Effects, Biz } from '../engine';
import { addFlow, oneOf } from '../forms';

const C = (t: string, msg: string, fx: Effects): Choice => ({ t, msg, fx });
const kindOf = (b: Biz) => BIZ_KINDS.find(k => k.id === b.kind) as typeof BIZ_KINDS[number];
const has = (s: State): boolean => !!s.biz;

S({ id: 'biz_none', cat: 'biz', free: true, req: () => false, title: 'You do not have a business yet',
  text: 'You daydream about a stand of your own. Starting one takes money, a tax registration and nerves. Use 💻 Online services → "Register a business" to open the registration form.',
  choices: [C('Think about it', 'You open a notebook and start listing costs.', { know: 1, stress: -2 })] });

/* ---------- registration form ---------- */
const eligibleBiz = (s: State): string | null => {
  if (s.biz) return 'You already run a business.';
  if (s.status === 'migrant' && !s.flags.rvp) return 'A patent holder cannot register as self-employed. You need RVP / VNZh, EAEU citizenship or citizenship.';
  if (s.status === 'student' && !s.flags.workPermit) return 'Students need a work permission before registering a business.';
  return null;
};
addFlow({
  id: 'biz', icon: '🏪', title: 'Register a business', site: 'Tax service portal', blurb: 'Choose a type of business, a tax regime and a name.',
  available: eligibleBiz,
  steps: [
    { title: 'Type of business', fields: () => [
      { id: 'kind', label: 'Business', type: 'select', options: BIZ_KINDS.map(k => [k.id, `${k.name} — start-up ${money(k.cost)} — ${k.blurb}`] as [string, string]),
        check: (v, s) => { const k = BIZ_KINDS.find(x => x.id === v); return k && s.know < k.minKnow ? `This business needs more experience (knowledge ${k.minKnow}+).` : null; } },
      { id: 'name', label: 'Name of your business', type: 'text', init: '' },
    ] },
    { title: 'Tax regime', fields: () => [
      { id: 'regime', label: 'Registration', type: 'radio', options: [['npd', 'Self-employed (NPD): 4–6% tax, no employees, income limit ₽2.4M/year'], ['ip', 'Individual entrepreneur (IP): can hire staff, more paperwork']], check: oneOf(['npd', 'ip']) },
      { id: 'place', label: 'Where do you work?', type: 'select', options: [['home', 'From home (free)'], ['stall', 'A market stall (+₽8,000)'], ['mall', 'A spot in a mall (+₽25,000, more customers)']] },
    ] },
    { title: 'Funding', fields: s => [
      { id: 'fund', label: 'How do you pay for the start-up?', type: 'radio', options: [['cash', 'My savings'], ...(Object.values(s.bank).some(Boolean) ? [['loan', 'A bank loan (70% borrowed, paid weekly with interest)'] as [string, string]] : [])] },
      { id: 'agree', label: 'I confirm the data is true.', type: 'checkbox', required: true },
    ] },
    { title: 'Confirm', fields: () => [{ id: 'code', label: 'Enter the SMS code', type: 'code' }] },
  ],
  finish: (s, d) => {
    const k = BIZ_KINDS.find(x => x.id === d.kind) as typeof BIZ_KINDS[number];
    const extra = d.place === 'mall' ? 25000 : d.place === 'stall' ? 8000 : 0;
    const total = k.cost + extra;
    const cash = d.fund === 'loan' ? Math.round(total * 0.3) : total;
    if (s.money < cash) return O(`You need ${money(cash)} to open, but you have ${money(s.money)}.`, { stress: 6 });
    if (d.fund === 'loan' && !(s.status === 'citizen' || s.flags.rvp || s.flags.vnzh || s.status === 'eaeu')) return O('The bank declines the loan: no long-term status.', { stress: 8 });
    return O(`${d.name || k.name} is registered. ${d.regime === 'ip' ? 'You are now an individual entrepreneur.' : 'You are registered as self-employed.'} The first customers are waiting.`, {
      money: -cash, stress: 4, rep: 2, flag: 'bizOpened',
      run: st => {
        st.biz = { kind: k.id, name: d.name || k.name, level: d.place === 'mall' ? 2 : 1, staff: 0, rep: 40, regime: d.regime as 'npd' | 'ip', profit: 0, weeks: 0, revenueYear: 0 };
        if (d.fund === 'loan') { const debt = Math.round(total * 0.7 * 1.2); st.tmp.debt = Number(st.tmp.debt || 0) + debt; st.tmp.debtPay = Number(st.tmp.debtPay || 0) + Math.max(2000, Math.round(debt / 52)); }
      },
    });
  },
});

/* ---------- events ---------- */
type Opt = [string, string, Effects | ((s: State) => Effects)];
const E = (id: string, title: string, text: string, a: Opt, b: Opt, w = 1, req?: (s: State) => unknown): void => {
  const mk = ([t, msg, fx]: Opt): Choice => ({ t, r: s => (s.biz ? O(msg, typeof fx === 'function' ? fx(s) : fx) : O('You no longer run a business.', {})) });
  S({ id: `biz-${id}`, cat: 'biz', title, text, w, req: s => has(s) && (!req || req(s)), choices: [mk(a), mk(b)] });
};

E('inspect', 'A health & safety inspection', 'Two inspectors in grey jackets walk in: "Documents, sanitary book, receipts."',
  ['Show everything in order', 'Everything checks out. They leave a leaflet and a polite nod.', { rep: 3, stress: 4 }],
  ['Say the paperwork is "at home"', 'They write a fine and come back next week.', { money: -8000, stress: 12, rep: -2 }], 1.5);
E('supplier', 'The supplier raises prices', 'Your main supplier sends a message: "Prices go up 15% from Monday."',
  ['Negotiate and switch part of the order', 'You find a cheaper supplier for the basics and keep the best one for the rest.', { money: -1500, know: 2, rep: 1 }],
  ['Accept the new prices', 'Margins shrink this month.', { money: -6000, stress: 4 }]);
E('review', 'A bad review goes viral', 'A customer posts: "Never again!" with a blurry photo. Fifty people share it.',
  ['Reply politely and offer to fix the problem', 'The customer edits the review: "They took responsibility. Thank you."', { rep: 3, stress: 4, energy: -4 }],
  ['Ignore it', 'Footfall drops for a week.', (s) => ({ money: -4000, stress: 6, run: st => { if (st.biz) st.biz.rep = Math.max(0, st.biz.rep - 5); } })]);
E('hire', 'You need help: hire someone?', 'Orders are piling up. A friend recommends a worker looking for a job.',
  ['Hire him with a proper contract', 'Contract, insurance and notification to the authorities — you do it by the book. Wages ₽9,000 a week.', (s) => ({ stress: 3, rep: 2, run: st => { if (st.biz) st.biz.staff += 1; } })],
  ['Hire him informally, cash in hand', 'Quick and cheap — until someone asks for his papers.', (s) => ({ money: 0, stress: 6, run: st => { if (st.biz) st.biz.staff += 1; }, ...(Math.random() < 0.4 ? { money: -50000, strike: 1, stress: 18 } : {}) })], 1.4,
  s => s.biz!.regime === 'ip' && s.biz!.staff < 4);
E('hire-npd', 'You cannot hire as self-employed', 'A customer offers to send his nephew to help you. As self-employed you may not employ staff.',
  ['Register as an individual entrepreneur', 'A form, a fee and a new status: you can now hire.', (s) => ({ money: -800, stress: 4, know: 2, run: st => { if (st.biz) st.biz.regime = 'ip'; } })],
  ['Stay as you are', 'You keep working alone.', { stress: 2 }], 1.2, s => s.biz!.regime === 'npd');
E('equip', 'Your equipment breaks', 'The oven (or the printer, or the soldering iron) dies with a puff of smoke.',
  ['Repair it properly (₽6,000)', 'A technician fixes it in a day. Back to normal.', { money: -6000, stress: 2 }],
  ['Patch it yourself', 'It works. For three days.', { money: -1500, stress: 8, energy: -8 }]);
E('rush', 'A rush of customers', 'A local festival brings crowds to your door.',
  ['Work flat out for two days', 'Tired but rich: the till is full.', { money: 9000, energy: -22, stress: 6, rep: 3 }],
  ['Keep the usual hours', 'Customers queue and some leave.', { money: 2500, rep: -1 }], 1.2);
E('competitor', 'A competitor opens next door', 'A bigger brand opens across the street with banners and discounts.',
  ['Compete on service and loyalty cards', 'Regulars stay. You win by being friendly.', (s) => ({ money: -1500, rep: 2, run: st => { if (st.biz) st.biz.rep = Math.min(100, st.biz.rep + 3); } })],
  ['Cut your prices', 'Margins vanish, but customers stay.', { money: -5000, stress: 6 }]);
E('tax', 'Tax reminder', 'A push notification: "Your tax payment is ready. Pay by the 28th." Receipts, apps and a deadline.',
  ['Pay immediately in the app', 'Done in two minutes. Peace of mind.', { stress: -4, know: 1 }],
  ['Pay on the 28th', 'You pay at the last minute with sweaty palms.', { stress: 4 }], 1.2);
E('scam', 'A suspicious bulk order', 'A "customer from abroad" wants a large order and asks you to pay "a transfer fee" first.',
  ['Refuse and report it', 'You block the number. Experience gained.', { know: 2, rep: 1 }],
  ['Pay the fee', 'The customer disappears. So does the money.', { money: -12000, stress: 14 }], 0.8);
E('press', 'A local journalist visits', 'A reporter from the district paper is writing about small businesses.',
  ['Give an honest interview', 'The article is warm. New customers arrive with the page folded in their pockets.', (s) => ({ merit: 3, rep: 4, run: st => { if (st.biz) st.biz.rep = Math.min(100, st.biz.rep + 6); } })],
  ['Decline politely', 'You prefer to keep your head down.', { stress: -2 }], 0.7);
E('expand', 'Expand the business?', 'A bigger place opens up on the same street. Double the space, double the rent.',
  ['Upgrade (cost depends on your business)', 'You move to the bigger place. Sales rise, and so do worries.', (s) => { const k = kindOf(s.biz!); const c = Math.round(k.cost * 0.8 * s.biz!.level); return s.money < c ? { stress: 4 } : { money: -c, stress: 6, rep: 3, run: st => { if (st.biz) st.biz.level += 1; } }; }],
  ['Stay small', 'Safe, steady and slightly dull.', { stress: -2 }], 1.3, s => s.biz!.level < 3 && s.biz!.profit > kindOf(s.biz!).cost * 0.5);
E('close', 'Close the business?', 'Weeks of thin profits make you doubt. A buyer offers a fair price.',
  ['Sell the business', 'You sell it and walk away with a lump sum and lessons.', (s) => ({ money: Math.round(kindOf(s.biz!).cost * 0.4 * s.biz!.level), stress: -6, run: st => { st.biz = null; } })],
  ['Keep going', 'You decide to give it another season.', { stress: 3 }], 0.7, s => s.biz!.weeks > 8 && s.biz!.profit < 0);
E('foreign-staff', 'Checking a worker\'s papers', 'A new worker hands you a passport and a patent. They look in order, but the date has passed.',
  ['Check the patent dates and ask for a valid one', 'He fixes the papers in a week and thanks you for being fair.', { rep: 3, know: 2 }],
  ['Ignore it, you need the hands', 'An inspection could cost you dearly.', (s) => (Math.random() < 0.35 ? { money: -80000, strike: 1, stress: 16 } : { stress: 6 })], 1.0, s => s.biz!.staff > 0);
