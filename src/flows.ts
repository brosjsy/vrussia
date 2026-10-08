/* Ten "fill in the website" services: jobs, doctor, marketplace, rentals, banking, university portal,
   marriage application, kindergarten queue, train tickets and the immigration portal. */
import { dyn, O, gamble, FEE, money, absentDays, CITIES, isForeigner, jobs, dateOf } from './engine';
import type { State, Outcome, Effects } from './engine';
import { addFlow, digits } from './forms';

const opt = (list: [string, string][]): [string, string][] => list;
const hasBank = (s: State): boolean => Object.values(s.bank).some(Boolean);

/* ---------- 1. HeadHunter-style job application ---------- */
const auth: [string, string][] = [['citizen', 'I am a Russian citizen'], ['patent', 'I have a valid work patent'], ['eaeu', 'I am an EAEU citizen (contract)'], ['rvp', 'I hold RVP / VNZh'], ['student', 'I have a student work permission'], ['none', 'I do not have work authorization yet']];
addFlow({
  id: 'hh', icon: '💼', title: 'Job application', site: 'HeadHunter-style job site', blurb: 'Write a resume, choose a vacancy and wait for an interview.',
  available: () => null,
  steps: [
    { title: 'Resume', fields: s => [
      { id: 'job', label: 'Vacancy', type: 'select', options: jobs.filter(j => !j.cit || s.status === 'citizen' || s.flags.rvp).map(j => [j.id, `${j.name} — about ${money(j.pay)}/shift`]) },
      { id: 'exp', label: 'Years of experience', type: 'select', options: opt([['0', 'No experience'], ['1', '1 year'], ['3', '3 years'], ['5', '5+ years']]) },
      { id: 'pay', label: 'Expected pay per shift (₽)', type: 'text', init: '2500', check: v => (Number(v) > 0 ? null : 'Enter a number above zero.') },
    ] },
    { title: 'Work authorization', fields: () => [
      { id: 'auth', label: 'My right to work', type: 'select', options: auth },
      { id: 'truth', label: 'I confirm that the information is true.', type: 'checkbox', required: true },
    ] },
    { title: 'Interview slot', fields: () => [
      { id: 'slot', label: 'Choose an interview time', type: 'radio', options: opt([['am', 'Tomorrow 10:00'], ['pm', 'Tomorrow 15:00'], ['eve', 'In three days 18:00']]) },
    ] },
  ],
  finish: (s, d): Outcome => {
    const job = jobs.find(j => j.id === d.job)!;
    const wants = Number(d.pay);
    const fit = 0.3 + s.know / 200 + Number(d.exp) * 0.05 - (wants > job.pay * 1.4 ? 0.2 : 0) - (d.auth === 'none' ? 0.35 : 0) + s.rep / 400;
    const lied = (d.auth === 'citizen' && s.status !== 'citizen') || (d.auth === 'patent' && s.status === 'migrant' && s.docs.patent <= 0) || (d.auth === 'rvp' && !s.flags.rvp && s.status !== 'citizen');
    if (Math.random() < fit) return O(`${job.name}: "Welcome aboard!" You start on Monday.${lied ? ' (You declared a status you do not have; the paperwork will not hold.)' : ''}`, { job: job.id, stress: lied ? 8 : -6, ...(lied ? { strike: 0 } : {}) });
    return O('"We will keep your resume on file." (That is a no.) Try another vacancy or build more skills.', { stress: 6, know: 1 });
  },
});

/* ---------- 2. Doctor appointment ---------- */
addFlow({
  id: 'doctor', icon: '🩺', title: 'Book a doctor', site: 'Gosuslugi health portal', blurb: 'Choose a specialist, a polyclinic and a time.',
  available: () => null,
  steps: [
    { title: 'Specialist', fields: () => [
      { id: 'spec', label: 'Doctor', type: 'select', options: opt([['therapist', 'Therapist (GP)'], ['dentist', 'Dentist'], ['eye', 'Ophthalmologist'], ['cardio', 'Cardiologist'], ['psy', 'Psychologist'], ['neuro', 'Neurologist']]) },
      { id: 'date', label: 'When?', type: 'radio', options: opt([['tomorrow', 'Tomorrow (limited slots)'], ['week', 'In a week'], ['month', 'In a month']]) },
    ] },
    { title: 'Insurance', fields: () => [
      { id: 'pay', label: 'Payment', type: 'radio', options: opt([['oms', 'State insurance (OMS policy)'], ['dms', 'Voluntary insurance (DMS)'], ['paid', 'Pay yourself (₽3,000)']]) },
    ] },
  ],
  finish: (s, d): Outcome => {
    const hasOms = s.status === 'citizen' || !!s.flags.rvp;
    if (d.pay === 'oms' && !hasOms) return O('The system says: "OMS policy not found". Without it you must pay or use DMS.', { stress: 6 });
    if (d.pay === 'dms' && !s.flags.insured) return O('You do not have a DMS policy. Buy one at a clinic (₽5,000) or choose another option.', { stress: 4 });
    const cost = d.pay === 'paid' ? 3000 : 0;
    if (s.money < cost) return O('You cannot pay for the visit.', { stress: 4 });
    const gain: Record<string, Effects> = { therapist: { health: 8 }, dentist: { health: 3, stress: -6 }, eye: { health: 2, know: 1 }, cardio: { health: 6, stress: -4 }, psy: { stress: -18, know: 1 }, neuro: { health: 5, stress: -4 } };
    const wait = d.date === 'tomorrow' ? 0 : d.date === 'week' ? 2 : 4;
    return O(`The ${d.spec} sees you ${d.date === 'tomorrow' ? 'tomorrow' : 'after a wait'}. A prescription, a certificate and a kind word.`, { money: -cost, ...gain[d.spec], stress: (gain[d.spec].stress || 0) + wait });
  },
});

/* ---------- 3. Marketplace checkout ---------- */
const goods: [string, string, number, number][] = [
  ['coat', 'Winter coat', 6000, 40], ['boots', 'Winter boots', 4500, 22], ['jacket', 'Down jacket', 8000, 36], ['hat', 'Ushanka hat', 1200, 8],
  ['jeans', 'Jeans', 2500, 10], ['sneakers', 'Sneakers', 3200, 10], ['kettle', 'Electric kettle', 1500, 0], ['bedding', 'Bedding set', 2200, 0],
];
addFlow({
  id: 'shop', icon: '🛍️', title: 'Order online', site: 'Marketplace app (Wildberries / Ozon style)', blurb: 'Pick an item, size, delivery point and payment.',
  available: () => null,
  steps: [
    { title: 'Item', fields: () => [
      { id: 'item', label: 'Item', type: 'select', options: goods.map(g => [g[0], `${g[1]} — ${money(g[2])}`] as [string, string]) },
      { id: 'size', label: 'Size', type: 'select', options: opt([['S', 'S / 38'], ['M', 'M / 40'], ['L', 'L / 42'], ['XL', 'XL / 44']]) },
    ] },
    { title: 'Delivery', fields: () => [
      { id: 'deliv', label: 'Delivery', type: 'radio', options: opt([['pvz', 'Pick-up point (free)'], ['courier', 'Courier (+₽300)']]) },
      { id: 'payment', label: 'Payment', type: 'radio', options: opt([['card', 'Card online'], ['cash', 'Cash at the pick-up point']]) },
    ] },
  ],
  finish: (s, d): Outcome => {
    const g = goods.find(x => x[0] === d.item)!;
    const total = g[2] + (d.deliv === 'courier' ? 300 : 0);
    if (d.payment === 'card' && !hasBank(s)) return O('Card payment failed: you have no bank card yet.', { stress: 4 });
    if (s.money < total) return O('Not enough money for the order.', { stress: 3 });
    if (Math.random() < 0.15) return O(`The ${g[1].toLowerCase()} arrives too small. You start a return and wait for a refund.`, { money: -300, stress: 5 });
    return O(`Your ${g[1].toLowerCase()} is ready at the pick-up point. You scan the QR code and unpack it right there.`, { money: -total, clothes: g[3], stress: -3 });
  },
});

/* ---------- 4. Flat rental site ---------- */
interface Listing { id: string; price: number; text: string; scam: boolean; reg: boolean; pets: boolean }
const listings = (s: State, price: number, wantReg: boolean, wantPets: boolean): Listing[] => {
  const seed = (s.day * 7 + price) % 5;
  return [
    { id: 'a', price: Math.round(price * 0.95), text: `Studio, ${['quiet street', 'near the metro', 'above a bakery', 'by the park', 'new building'][seed]}. Owner lives nearby.`, scam: false, reg: wantReg || seed % 2 === 0, pets: wantPets || seed === 3 },
    { id: 'b', price, text: 'One-room flat, renovated. "No registration, cash only."', scam: false, reg: false, pets: true },
    { id: 'c', price: Math.round(price * 0.5), text: 'Great flat in the centre at half price. "Owner is abroad, send the deposit and I mail you the keys."', scam: true, reg: true, pets: true },
  ];
};
addFlow({
  id: 'rent', icon: '🏠', title: 'Find a flat to rent', site: 'Classifieds (Avito / CIAN style)', blurb: 'Filter listings, spot scams, sign a lease.',
  available: () => null,
  steps: [
    { title: 'Search filters', fields: s => [
      { id: 'budget', label: 'Weekly budget', type: 'select', options: opt([['3000', 'up to ₽3,000 (room)'], ['8000', 'up to ₽8,000 (studio)'], ['13000', 'up to ₽13,000 (one-room)'], ['20000', 'up to ₽20,000 (two-room)']]) },
      { id: 'pets', label: 'Pets allowed', type: 'checkbox' },
      { id: 'reg', label: 'Landlord provides registration', type: 'checkbox', init: isForeigner(s) ? 'yes' : '' },
    ] },
    { title: 'Listings', fields: (s, d) => [
      { id: 'pick', label: 'Choose a listing to view', type: 'radio', options: listings(s, Number(d.budget), !!d.reg, !!d.pets).map(l => [l.id, `${money(l.price)}/week · ${l.text}${l.reg ? ' · registration ✓' : ''}${l.pets ? ' · pets ✓' : ''}`] as [string, string]) },
    ] },
    { title: 'Viewing and lease', fields: () => [
      { id: 'note', label: 'You will sign a lease and pay a deposit of two weeks. Never pay before seeing the flat.', type: 'note' },
      { id: 'sign', label: 'I have read the lease and want to sign.', type: 'checkbox', required: true },
    ] },
  ],
  finish: (s, d): Outcome => {
    const l = listings(s, Number(d.budget), !!d.reg, !!d.pets).find(x => x.id === d.pick)!;
    const deposit = l.price * 2;
    if (s.money < deposit) return O('You cannot pay the deposit.', { stress: 5 });
    if (l.scam) return O('The "owner" disappears with your deposit. A classic fake listing.', { money: -deposit, stress: 20 });
    const fx: Effects = { money: -deposit, setRent: l.price, stress: -8, setDocs: { reg: l.reg ? 90 : 0 } };
    return O(`You sign the lease at ${money(l.price)} per week. ${l.reg ? 'The landlord files your registration.' : 'There is no registration — a risk for you.'}`, fx);
  },
});

/* ---------- 5. Open a bank account online ---------- */
addFlow({
  id: 'bank', icon: '🏦', title: 'Open a bank account', site: 'Bank app (Sber / VTB / T-Bank)', blurb: 'Application, ID checks, SMS code.',
  available: s => (s.bank.sber && s.bank.vtb && s.bank.tbank ? 'You already have all three banks.' : null),
  steps: [
    { title: 'Choose a bank', fields: s => [{ id: 'bank', label: 'Bank', type: 'select', options: (['sber', 'vtb', 'tbank'] as const).filter(b => !s.bank[b]).map(b => [b, { sber: 'Sber', vtb: 'VTB', tbank: 'T-Bank' }[b]] as [string, string]) }] },
    { title: 'Your data', fields: () => [
      { id: 'phone', label: 'Mobile number (10 digits after +7)', type: 'text', check: digits(10) },
      { id: 'inn', label: 'Tax ID (INN, 12 digits)', type: 'text', hint: 'In the game any 12 digits work.', check: digits(12) },
      { id: 'addr', label: 'Address of residence', type: 'text', init: '' },
      { id: 'consent', label: 'I agree to the processing of personal data.', type: 'checkbox', required: true },
    ] },
    { title: 'Confirm', fields: () => [{ id: 'code', label: 'Enter the SMS code', type: 'code' }] },
  ],
  finish: (s, d): Outcome => {
    const p = s.status === 'citizen' || s.flags.rvp ? 0.95 : s.docs.reg > 0 ? 0.75 : 0.25;
    if (Math.random() < p) return O(`${d.bank.toUpperCase()}: account approved. Your virtual card is ready in the app.`, { bank: d.bank, stress: -5, money: -150 });
    return O('The bank asks you to visit a branch with originals. "The system could not verify your documents."', { stress: 8, energy: -4 });
  },
});

/* ---------- 6. University admission portal ---------- */
const UNIS = ['Lomonosov Moscow State University', 'HSE', 'MGIMO', 'Bauman MSTU', 'Saint Petersburg State University', 'ITMO', 'RUDN', 'Kazan Federal University', 'Ural Federal University', 'Novosibirsk State University', 'MEPhI', 'Sechenov University'];
const uniOpts = UNIS.map(u => [u, u] as [string, string]);
addFlow({
  id: 'uni', icon: '🎓', title: 'University application', site: 'Admission portal (Gosuslugi / university site)', blurb: 'Choose up to three programmes. Open June–July.',
  available: s => (s.flags.applied ? 'You have already applied this year.' : [6, 7].includes(dateOf(s).getMonth() + 1) ? null : 'The application window is June and July.'),
  steps: [
    { title: 'Programmes', fields: () => [
      { id: 'u1', label: 'First priority', type: 'select', options: uniOpts },
      { id: 'u2', label: 'Second priority', type: 'select', options: uniOpts, init: UNIS[1] },
      { id: 'u3', label: 'Third priority', type: 'select', options: uniOpts, init: UNIS[7] },
    ] },
    { title: 'Documents', fields: () => [
      { id: 'orig', label: 'I will submit original documents before the deadline.', type: 'checkbox', required: true },
      { id: 'consent', label: 'I consent to the processing of my personal data.', type: 'checkbox', required: true },
    ] },
  ],
  finish: (s, d): Outcome => O(`Application sent: ${d.u1}, ${d.u2}, ${d.u3}. Budget applications close on 25 July, the ranked lists appear on 27 July and the enrolment order on 7 August.`, { flag: 'applied', stress: 4, know: 1, run: st => { st.tmp.uni = d.u1; } }),
});

/* ---------- 7. ZAGS marriage application ---------- */
addFlow({
  id: 'zags', icon: '💍', title: 'Marriage application', site: 'Gosuslugi (ZAGS)', blurb: 'Choose a date and a hall. You and your partner submit together.',
  available: s => (!s.partner ? 'You need a partner first.' : s.partner.love < 50 ? 'Your relationship is not ready yet.' : s.flags.married ? 'You are already married.' : s.flags.proposed ? 'Your application is already filed.' : null),
  steps: [
    { title: 'Ceremony', fields: s => [
      { id: 'type', label: 'Ceremony', type: 'radio', options: opt([['std', 'Standard registration (state fee ₽350)'], ['solemn', 'Solemn hall with music (₽5,000)']]) },
      { id: 'when', label: 'Date', type: 'select', options: opt([...(s.flags.pregnant ? [['0', 'On the day of the application (the one-month wait can be waived for pregnancy)'] as [string, string]] : []), ['30', 'In about a month'], ['60', 'In about two months'], ['90', 'In about three months']]) },
      { id: 'rule', label: 'A marriage is registered no earlier than one month after the application (unless there are special grounds such as pregnancy) and within 12 months of it.', type: 'note' },
      ...(isForeigner(s) ? [
        { id: 'noimp', label: 'I have a legalised document confirming that I am free to marry (a marital status certificate, valid for a limited time).', type: 'checkbox' as const, required: true },
        { id: 'transl', label: 'It has been translated into Russian by a notary (about ₽4,000 for the documents together, in the game).', type: 'checkbox' as const, required: true },
      ] : []),
    ] },
    { title: 'Witnesses', fields: () => [
      { id: 'w', label: 'Witness name', type: 'text', init: '' },
      { id: 'both', label: 'Both of us confirm the application voluntarily.', type: 'checkbox', required: true },
    ] },
  ],
  finish: (s, d): Outcome => {
    const fee = (d.type === 'solemn' ? 5000 : 350) + (isForeigner(s) ? 4000 : 0);
    if (s.money < fee) return O(`You need ${money(fee)} for the state fee${isForeigner(s) ? ' and the legalised, translated documents' : ''}.`, { stress: 4 });
    return O(`${d.when === '0' ? 'The waiting period is waived (pregnancy): the registrar can marry you on the day of the application.' : 'The registrar sets your date, at least a month away.'} Witness: ${d.w}. Now to prepare the ceremony.`, { money: -fee, flag: 'proposed', love: 8, stress: -6, queue: 'love_wedding' });
  },
});

/* ---------- 8. Kindergarten queue ---------- */
addFlow({
  id: 'kg', icon: '🧸', title: 'Kindergarten queue', site: 'Gosuslugi (education)', blurb: 'Register your child in the queue for a public kindergarten.',
  available: s => (s.kids < 1 ? 'You do not have children yet.' : s.flags.kgQueue ? 'You are already in the queue.' : null),
  steps: [
    { title: 'Child', fields: () => [
      { id: 'cn', label: 'Child\'s name', type: 'text' },
      { id: 'dob', label: 'Date of birth', type: 'date', init: '2026-09-01' },
    ] },
    { title: 'Preferences', fields: () => [
      { id: 'k1', label: 'First choice', type: 'select', options: opt([['1', 'Garden No. 12 "Rodnichok"'], ['2', 'Garden No. 54 "Solnyshko"'], ['3', 'Garden No. 7 "Teremok"']]) },
      { id: 'benefit', label: 'We have a priority benefit (large family / working in the health sector).', type: 'checkbox' },
    ] },
  ],
  finish: (s, d): Outcome => O(`${d.cn} is in the queue: place ${d.benefit ? 12 : 214}. You will get a message when it is your turn.`, { flag: 'kgQueue', stress: -5, famLove: 2 }),
});

/* ---------- 9. Train ticket (move city / visit) ---------- */
const classes: [string, string, number][] = [['plats', 'Platzkart (open carriage)', 3500], ['coupe', 'Coupé (4-berth)', 6500], ['sv', 'SV (2-berth, luxury)', 12000]];
addFlow({
  id: 'rzd', icon: '🚆', title: 'Buy a train ticket', site: 'Railways booking site', blurb: 'Visit another city or move there for good.',
  available: () => null,
  steps: [
    { title: 'Route', fields: s => [
      { id: 'dest', label: 'Destination', type: 'select', options: CITIES.filter(c => c !== s.city).map(c => [c, c] as [string, string]) },
      { id: 'trip', label: 'Trip type', type: 'radio', options: opt([['visit', 'Return trip (5 days)'], ['move', 'One-way (I am moving there)']]) },
    ] },
    { title: 'Carriage', fields: () => [
      { id: 'cls', label: 'Class', type: 'radio', options: classes.map(c => [c[0], `${c[1]} — ${money(c[2])}`] as [string, string]) },
      { id: 'pname', label: 'Passenger name (as in passport)', type: 'text', init: '' , check: (v, s) => (v.trim().toLowerCase() === s.name.trim().toLowerCase() ? null : 'The name must match your passport.') },
    ] },
  ],
  finish: (s, d): Outcome => {
    const price = classes.find(c => c[0] === d.cls)![2] * (d.trip === 'visit' ? 2 : 1);
    if (s.money < price) return O('You cannot afford this ticket.', { stress: 4 });
    s.tmp.trainDest = d.dest; s.tmp.trainTrip = d.trip;
    if (d.trip === 'move') {
      return O(`You pack and leave for ${d.dest}. A new city, a new rhythm.${isForeigner(s) && !s.flags.rvp ? ' Remember: you need registration at the new address.' : ''}`, { money: -price, city: d.dest, loc: 'station', job: null, stress: 6, setDocs: { reg: 0 }, queue: 'train_night' });
    }
    return O(`You spend five days in ${d.dest} and come back with photos and stories.`, { money: -price, stress: -12, know: 2, queue: 'train_night', run: st => { absentDays(st, 5); } });
  },
});
dyn.train_night = s => ({
  id: 'train_night', cat: 'life', free: true, dynamic: true, title: 'Overnight on the train',
  text: 'The carriage rocks, tea glasses clink in metal holders, and the provodnitsa sells biscuits. Someone shares boiled eggs, someone else snores like a tractor.',
  choices: [
    { t: 'Talk with the neighbours', r: () => O('A retired teacher tells you the history of every town you pass. You swap numbers.', { friends: 1, stress: -8, know: 2 }) },
    { t: 'Sleep with headphones', r: () => O('You wake at dawn with a stiff neck and a clear head.', { energy: 15 }) },
    { t: 'Watch the landscape and read', r: () => O('Birch forests, villages, rivers. Russia unrolls in the window.', { stress: -10, merit: 1 }) },
  ],
});

/* ---------- 10. Immigration portal (RVP / VNZh / citizenship) ---------- */
const stage = (s: State): 'rvp' | 'vnzh' | 'cit' | null => {
  if (!isForeigner(s) || s.flags.naturalized) return null;
  if (!s.flags.rvp && s.flags.rutest && s.flags.rvpGround) return 'rvp';
  if (s.flags.rvp && !s.flags.vnzh && s.day >= (s.marks.rvp ?? 0) + 120) return 'vnzh';
  if (s.flags.vnzh && s.day >= (s.marks.vnzh ?? 0) + (s.flags.marriedCitizen ? 60 : 150)) return 'cit';
  return null;
};
addFlow({
  id: 'migr', icon: '🛂', title: 'Residence & citizenship', site: 'Gosuslugi (migration)', blurb: 'Apply for RVP, VNZh or citizenship once you qualify.',
  available: s => (stage(s) ? null : 'No application is possible yet: check the language test, a ground for RVP, and waiting periods.'),
  steps: [
    { title: 'Documents', fields: s => [
      { id: 'note', label: `Application type: ${{ rvp: 'temporary residence (RVP)', vnzh: 'permanent residence (VNZh)', cit: 'citizenship' }[stage(s) ?? 'rvp']}. Tick every document you have prepared.`, type: 'note' },
      { id: 'd1', label: 'Passport with certified translation', type: 'checkbox', required: true },
      { id: 'd2', label: 'Language and history test certificate', type: 'checkbox', required: true },
      { id: 'd3', label: 'Proof of income and tax payments', type: 'checkbox', required: true },
      { id: 'd4', label: 'Medical certificate and fingerprints', type: 'checkbox', required: true },
      { id: 'd5', label: 'Photos and fee receipt', type: 'checkbox', required: true },
    ] },
    { title: 'Confirm', fields: () => [
      { id: 'fee', label: 'State fee', type: 'radio', options: opt([['online', 'Pay online with a card'], ['bank', 'Pay at a bank branch']]) },
      { id: 'code', label: 'Enter the SMS code', type: 'code' },
    ] },
  ],
  finish: (s): Outcome => {
    const st = stage(s);
    const fee = FEE[st === 'rvp' ? 'rvp' : st === 'vnzh' ? 'vnzh' : 'citizen'];
    if (s.money < fee) return O(`You cannot pay the state duty of ${money(fee)} yet.`, { stress: 3 });
    const base = 0.55 + s.rep / 300 - s.strikes * 0.15;
    if (st === 'rvp') return gamble(base, O('RVP approved. A stamp in your passport and a very long exhale.', { flag: 'rvp', mark: 'rvp', docs: { reg: 9000 }, money: -FEE.rvp, stress: -10, rep: 3 }), O('Rejected: documents incomplete. You can re-apply.', { money: -FEE.rvp, stress: 10 }));
    if (st === 'vnzh') return gamble(base + 0.05, O('VNZh approved. A green card valid for five years.', { flag: 'vnzh', mark: 'vnzh', money: -FEE.vnzh, stress: -15, rep: 4 }), O('Rejected: tax certificate missing. Gather it and retry.', { money: -FEE.vnzh, stress: 10 }));
    return gamble(base + 0.05, O('Citizenship granted. "Congratulations, citizen of the Russian Federation."', { status: 'citizen', flag: 'naturalized', stress: -25, rep: 8, money: -FEE.citizen }), O('Rejected without detailed reasons. You may retry.', { money: -FEE.citizen, stress: 12 }));
  },
});


/* ---------- 11. Voluntary health insurance (DMS) ---------- */
const PLANS: [string, string, number][] = [['3', '3 months', 5000], ['6', '6 months', 9000], ['12', '12 months', 16000]];
addFlow({
  id: 'dms', icon: '🛡️', title: 'Buy health insurance', site: 'Insurer website (DMS policy)', blurb: 'A voluntary medical policy: required for a labour-migrant patent.',
  available: s => (s.status === 'citizen' ? 'Citizens use the state insurance (OMS) policy.' : s.flags.rvp ? 'With residence you use the state insurance (OMS) policy.' : s.flags.insured ? 'You already hold a policy.' : null),
  steps: [
    { title: 'Choose a plan', fields: () => [
      { id: 'plan', label: 'Term (prices are game approximations)', type: 'radio', options: PLANS.map(p => [p[0], `${p[1]} — ${money(p[2])}`] as [string, string]) },
      { id: 'note', label: 'Coverage of at least ₽100,000 is included, as the rules for labour migrants require.', type: 'note' },
    ] },
    { title: 'Policyholder', fields: s => [
      { id: 'who', label: 'Name (as in passport)', type: 'text', init: s.name, check: (v, st) => (v.trim().toLowerCase() === st.name.trim().toLowerCase() ? null : 'The name must match your passport.') },
      { id: 'pass', label: 'Passport number', type: 'text', init: '' },
      { id: 'agree', label: 'I have read the policy terms.', type: 'checkbox', required: true },
    ] },
    { title: 'Payment', fields: () => [
      { id: 'code', label: 'Enter the SMS code', type: 'code' },
    ] },
  ],
  finish: (s, d): Outcome => {
    const plan = PLANS.find(p => p[0] === d.plan)!;
    if (s.money < plan[2]) return O(`The policy costs ${money(plan[2])} and you have ${money(s.money)}.`, { stress: 5 });
    return O(`Your ${plan[1]} policy is issued and sent by email. ${s.status === 'migrant' ? 'You can now buy a patent.' : 'You are covered.'}`, { money: -plan[2], flag: 'insured', stress: -6, know: 1 });
  },
});

/* ---------- 12. Mobile identification (foreigners buying a Russian SIM card) ---------- */
addFlow({
  id: 'simid', icon: '📱', title: 'Mobile identification', site: 'Gosuslugi / bank app', blurb: 'Since 2025 foreigners need more than a passport to buy a SIM card.',
  available: s => (s.status === 'citizen' ? 'Citizens only need a passport at the operator shop.' : s.flags.simId ? 'You are already identified. Now buy the SIM card at an operator shop (Bank & shops).' : null),
  steps: [
    { title: 'Prepare your documents', fields: () => [
      { id: 'note', type: 'note', label: 'Simplified from 2025 rules reported by universities and law firms: a notarised Russian translation of the passport, a SNILS number, an active Gosuslugi account and biometric identification. The SIM itself is bought in a physical operator shop, and foreigners may hold at most 10 SIM cards. Details differ between operators.' },
      { id: 'tr', type: 'checkbox', label: 'My passport has been translated into Russian and notarised (about ₽2,500).', required: true },
      { id: 'snils', type: 'checkbox', label: 'I have a SNILS number.', required: true },
      { id: 'gos', type: 'checkbox', label: 'I have a confirmed Gosuslugi account.', required: true },
    ] },
    { title: 'Biometrics', fields: () => [
      { id: 'bio', type: 'radio', label: 'Biometric identification', options: [['bank', 'In a bank branch'], ['ruid', 'With the ruID app (if you submitted data in advance)']] },
    ] },
    { title: 'Confirm', fields: () => [{ id: 'code', type: 'code', label: 'Enter the SMS code' }] },
  ],
  finish: (s, d): Outcome => {
    if (s.money < 2500) return O('You cannot pay for the notarised translation yet.', { stress: 4 });
    return O(`Your identification is complete (${d.bio === 'bank' ? 'at a bank branch' : 'with ruID'}). You can now buy a SIM card at an operator shop.`, { money: -2500, flag: 'simId', stress: -4, know: 2 });
  },
});
