import { RU } from '../engine';
import type { State, Outcome, Partner, Choice } from '../engine';
type Fn = (s: State) => Outcome;
/* Life systems: banking, map/weather, clothes, relationships, children, health, immigration extras */
  const { O, gamble, rnd, pick } = RU.util;
  const S = RU.S;
  const C = (t, msg, fx) => ({ t, msg, fx });
  const F = (t, r) => ({ t, r });
  const foreign = s => s.status !== 'citizen';
  const NAMES = {
    citizen: ['Anna', 'Dmitry', 'Katya', 'Ivan', 'Sofia', 'Artem', 'Olga', 'Maxim'],
    compatriot: ['Madina', 'Rustam', 'Farida', 'Jamshed', 'Aisha', 'Bakhtiyor', 'Zarina', 'Timur'],
    foreigner: ['Li', 'Maria', 'Joao', 'Amara', 'Hiro', 'Selin', 'Daniel', 'Nia'],
  };
  const newPartner = (kind: Partner['kind']): Partner => ({ name: pick(NAMES[kind]), kind, love: 25 });
  const cap = t => t[0].toUpperCase() + t.slice(1);

  /* =================== IMMIGRATION EXTRAS =================== */
  S({ id: 'imm_passport_embassy', cat: 'paper', who: ['foreigner'], once: true, req: s => s.day > 40, w: 3,
    title: 'Your home passport is expiring', text: 'The embassy of your country in Moscow has a long queue and strict rules. A valid national passport is needed for registration, patent and every later step.',
    choices: [
      F('Renew at the embassy (₽8,000 with fees)', s => gamble(0.8, O('New passport in six weeks. Documents stay in order.', { money: -8000, energy: -12, stress: -4 }), O('The embassy says the system is down until next month.', { stress: 10, energy: -10 }))),
      C('Delay it', 'The expiry date does not move.', { stress: 6 })] });
  S({ id: 'imm_consulate_reg', cat: 'paper', who: ['foreigner'], once: true, w: 2, title: 'Register with your consulate',
    text: 'Your country\'s consulate asks citizens abroad to register. It helps if you lose documents or need an emergency passport.',
    choices: [C('Register', 'A small card goes into your wallet. It feels reassuring.', { stress: -4, rep: 1 }), C('Skip it', 'You skip it. Famous last words.', {})] });
  S({ id: 'imm_entry_ban_check', cat: 'paper', who: ['foreigner'], w: 1.5, title: 'Check your entry ban status',
    text: 'A friend says a violation can put you on a list that bans entry for years. You can check your status through official channels.',
    choices: [
      F('Check status at the migration service', s => s.strikes >= 2 ? O('A clerk says: "There are violations. Be careful from now on."', { stress: 12, know: 1 }) : O('Clean status. You exhale.', { stress: -6, know: 1 })),
      C('Ignore it', 'Not knowing is not safer.', { stress: 3 })] });
  S({ id: 'imm_lost_passport', cat: 'paper', who: ['foreigner'], w: 1, title: 'Lost passport',
    text: 'Your wallet and passport are gone. Without it you cannot prove status, register, or work.',
    choices: [
      F('Report to police and go to the embassy', s => O('Report, embassy form, new passport in three weeks. The delay costs you.', { money: -9000, stress: 14, docs: { reg: -10 }, energy: -15 })),
      C('Look for it everywhere first', 'You retrace your route. Nothing.', { stress: 10, energy: -10 })] });
  S({ id: 'imm_travel_home', cat: 'family', who: ['foreigner'], w: 1.2, req: s => s.money > 25000, title: 'Flight home',
    text: 'A close relative is getting married at home. You can fly out for two weeks. Returning means passing border control again; any violation on your record becomes a risk.',
    choices: [
      F('Fly home', s => {
        if (s.strikes >= 2) return O('At the border they check the system and refuse entry for violations. Your Russian life ends at the airport.', { strike: 2, stress: 25 });
        return O('The wedding is loud, warm and sleepless. Return entry is smooth.', { money: -25000, stress: -20, famLove: 8 });
      }),
      C('Send a gift and stay', 'You watch the wedding on a video call.', { money: -3000, stress: 6, famLove: 2 })] });
  S({ id: 'imm_funeral', cat: 'family', who: ['foreigner'], once: true, req: s => s.day > 100, w: 0.8, title: 'A death in the family',
    text: 'Your grandfather has passed away. The family asks you to come home.',
    choices: [
      F('Go to the funeral', s => O('You stand with the family. The return trip costs money and time.', { money: -22000, stress: 14, famLove: 10, energy: -20 })),
      C('Stay for work reasons', 'The guilt walks with you for weeks.', { stress: 16, famLove: -6 })] });
  S({ id: 'imm_employer_notice', cat: 'paper', who: ['foreigner'], req: s => s.job && s.status !== 'student', w: 1.5, title: 'Employer must notify authorities',
    text: 'Your employer must notify the migration service about hiring you. A careless employer forgets; a fair one files in three days.',
    choices: [
      F('Remind the HR manager politely', s => gamble(0.7, O('Notification sent. Papers in order.', { stress: -3, rep: 1 }), O('HR says "we will get to it" and does not.', { stress: 6 }))),
      C('Trust them', 'Nothing happens. For now.', {})] });
  S({ id: 'imm_marriage_ground', cat: 'paper', who: ['foreigner'], req: s => s.flags.marriedCitizen && s.flags.rutest && !s.flags.rvpGround, w: 8, title: 'RVP outside quota (marriage)',
    text: 'Marriage to a Russian citizen gives you the right to apply for temporary residence without the quota. The ZAGS certificate, your partner\'s passport and a joint photo list are needed.',
    choices: [F('Submit the file', s => O('Accepted for review. The ground for RVP is confirmed.', { flag: 'rvpGround', money: -3000, stress: -6 }))] });
  S({ id: 'imm_child_ground', cat: 'paper', who: ['foreigner'], req: s => s.flags.childCitizen && s.flags.rutest && !s.flags.rvpGround, w: 8, title: 'RVP outside quota (Russian child)',
    text: 'Having a child who is a Russian citizen gives you a ground for RVP without the quota.',
    choices: [F('Submit the file', s => O('The migration office accepts the application as a family ground.', { flag: 'rvpGround', money: -3000, stress: -6 }))] });
  S({ id: 'imm_patent_to_rvp', cat: 'paper', who: ['migrant'], req: s => s.flags.rvp, w: 0.5, title: 'You no longer need a patent',
    text: 'The patent offices send you a farewell leaflet. RVP lets you work without it. One small paper gone.',
    choices: [C('Celebrate with a pastry', 'It tastes better than any patent receipt.', { money: -150, stress: -5 })] });
  S({ id: 'imm_rvp_notify', cat: 'paper', who: ['foreigner'], req: s => s.flags.rvp && !s.flags.vnzh, w: 1, title: 'Residence notification',
    text: 'Residents on RVP must notify the migration service about their address and job every year.',
    choices: [F('File the notice', s => O('Done in one visit. A small win.', { stress: -3, energy: -6 })), C('Forget', 'Forgetting costs fines later.', { strike: 1, stress: 6 })] });
  S({ id: 'imm_oath', cat: 'paper', who: ['foreigner'], req: s => s.flags.vnzh, w: 0.7, title: 'Language and history refresh',
    text: 'The citizenship interview includes questions about Russian history, law and daily life. A colleague offers to quiz you.',
    choices: [C('Study with a colleague', 'You learn why Pushkin is in every textbook.', { know: 4, rep: 2 }), C('Wing it', 'You hope for good luck.', {})] });

  /* =================== BANKING =================== */
  const banks = [['sber', 'Sber'], ['vtb', 'VTB'], ['tbank', 'T-Bank']];
  const bankSits: [string, (s: State, k: string, n: string) => Outcome][] = [
    ['Open an account', (s, k, n) => {
      const p = foreign(s) && !s.flags.rvp ? (s.docs.reg > 0 ? 0.7 : 0.2) : 0.95;
      return gamble(p, O(`${n} opens your account and issues a card. First salary has a place to land.`, { bank: k, stress: -4, money: -200 }), O(`${n} asks for extra papers and tells you to come back.`, { stress: 6, energy: -6 }));
    }],
    ['Card blocked for "suspicious transactions"', (s, k, n) => gamble(0.6, O(`A call to ${n} support and an explanation about the source of funds unblocks it.`, { stress: 6, energy: -6 }), O('The block stays for a week while compliance reviews.', { stress: 14, money: -300 }))],
    ['App glitch', (s, k, n) => O(`${n} app crashes at the shop counter. You pay cash and sigh.`, { stress: 4, money: -50 })],
    ['Cashback', (s, k, n) => O(`${n} adds a small cashback for groceries.`, { money: rnd(80, 400), stress: -2 })],
    ['Card reissue', (s, k, n) => O(`Your card expires. ${n} sends you a new one.`, { money: -200, energy: -4 })],
    ['Branch queue', (s, k, n) => O(`Number 53 at the ${n} branch; you wait two hours for a stamp.`, { energy: -10, stress: 5 })],
    ['SMS impersonation', (s, k, n) => gamble(0.5, O(`A fake "${n} security" SMS arrives. You ignore it.`, { rep: 1 }), O('You tap the link and your balance falls.', { money: -Math.min(Math.max(s.money, 0), 8000), stress: 15 }))],
    ['Transfer limit', (s, k, n) => O(`${n} caps your daily transfer. A friend says use SBP instead.`, { stress: 4, know: 1 })],
    ['Document verification', (s, k, n) => gamble(foreign(s) && s.docs.reg <= 0 ? 0.2 : 0.8, O(`${n} confirms your documents. Account stays active.`, { stress: -2 }), O('Your registration has expired; the bank freezes services until you renew.', { stress: 12, strike: 0 }))],
    ['Savings deposit', (s, k, n) => s.money < 5000 ? O('You do not have enough money to open a deposit.', { stress: 3 }) : O(`You put ₽5,000 into a ${n} savings account. A little interest each week.`, { money: 400, know: 1 })],
  ];
  banks.forEach(([k, n]) => bankSits.forEach(([t, fn], i) => S({
    id: `bank-${k}-${i}`, cat: 'bank', title: `${n}: ${t}`, text: `${n}. ${t}.`,
    req: i === 0 ? (s => !s.bank[k]) : (s => !!s.bank[k]), w: i === 0 ? 3 : 1,
    choices: [{ t: 'Handle it', r: s => fn(s, k, n) }, { t: 'Put it off', r: () => O('It can wait. Probably.', { stress: 2 }) }],
  })));

  const corridors = ['Tajikistan', 'Uzbekistan', 'Kyrgyzstan', 'Nigeria', 'Armenia', 'Kazakhstan'];
  const remitSits: [string, Fn][] = [
    ['Compare transfer fees', s => O('Bank 3%, transfer app 1.5%, courier 5%. You choose the middle one.', { know: 2, money: -200 })],
    ['Exchange rate drops', s => O('The rate worsens overnight. Your family receives less.', { stress: 6 })],
    ['Transfer delayed', s => O('Money is "in processing" for three days. Your mother calls twice.', { stress: 8 })],
    ['Family asks for more', s => s.money < 6000 ? O('You do not have it this month.', { stress: 8, famLove: -3 }) : O('You send ₽6,000.', { money: -6000, stress: -4, famLove: 6 })],
    ['Cash via a courier', s => gamble(0.5, O('The courier delivers the cash. Fee is low.', { money: -3000, stress: -2, famLove: 3 }), O('The courier disappears with the money.', { money: -3000, stress: 14 }))],
  ];
  corridors.forEach((c, i) => remitSits.forEach(([t, fn], j) => S({
    id: `remit-${i}-${j}`, cat: 'bank', who: ['foreigner'], w: 0.6, title: `Money home to ${c}: ${t}`, text: `You are sending money to ${c}. ${t}.`,
    choices: [{ t: 'Do it', r: fn }, { t: 'Wait until payday', r: () => O('Waiting costs peace of mind.', { stress: 3, famLove: -1 }) }],
  })));

  S({ id: 'bank_microloan', cat: 'bank', w: 1.2, req: s => s.money < 4000, title: 'Microloan offer', text: 'An SMS: "Cash in 5 minutes, no documents, 0.8% a day." The monthly rate is not 0.8%.',
    choices: [
      F('Take ₽15,000', s => O('Money in hand. A week later the debt is ₽21,000 and growing.', { money: 15000, stress: 12, flag: 'microloan' })),
      C('Refuse', 'You close the app.', { stress: -2 })] });
  S({ id: 'bank_repay_loan', cat: 'bank', req: s => s.flags.microloan && s.money > 15000, w: 5, once: true, title: 'Repay the microloan', text: 'The collectors have your number memorised.',
    choices: [F('Pay ₽21,000', s => O('Clean slate.', { money: -21000, unflag: 'microloan', stress: -14 })), C('Pay later', 'The debt keeps growing.', { stress: 8, money: -3000 })] });
  S({ id: 'bank_atm_eats_card', cat: 'bank', w: 1, req: s => Object.values(s.bank).some(Boolean), title: 'ATM eats your card', text: 'The ATM beeps and keeps your card. It is Friday evening.',
    choices: [C('Call the hotline', 'A new card by Tuesday.', { stress: 6, money: -150 }), C('Wait by the ATM', 'A technician arrives and returns it. Lucky.', { stress: 3, energy: -6 })] });
  S({ id: 'bank_salary_card', cat: 'bank', req: s => s.job && Object.values(s.bank).some(Boolean), w: 1.5, title: 'Salary to card', text: 'Your employer offers to pay wages to a bank card, with an official payslip.',
    choices: [C('Yes', 'Paper trail, tax, and proof of income for the RVP file.', { rep: 2, know: 1 }), C('Keep cash', 'No receipts, no paper.', { rep: -1 })] });
  S({ id: 'bank_sbp', cat: 'bank', req: s => Object.values(s.bank).some(Boolean), w: 1.2, title: 'SBP transfer by phone number', text: 'Your friend asks for ₽2,000 via SBP. The app asks for a number and the bank.',
    choices: [F('Send it', s => O('Instant transfer, free below the limit.', { money: -2000, rep: 2, friends: 0 })), C('Say you will send later', 'He sighs.', { rep: -1 })] });
  S({ id: 'bank_tax_npd', cat: 'bank', req: s => s.status === 'citizen' || s.flags.rvp, w: 0.8, title: 'Self-employment tax (NPD)', text: 'A neighbour recommends registering as self-employed: 4–6% tax and legal invoices.',
    choices: [C('Register', 'It takes eight minutes in the app.', { rep: 2, know: 1 }), C('Skip it', 'Under the table for now.', {})] });

  /* =================== MAP / SNOW / LOST =================== */
  const lostSits: [string, Fn][] = [
    ['Wrong metro exit', s => O('Exit 4 and exit 5 are two kilometres apart. You find out the hard way.', { energy: -12, stress: 6 })],
    ['Map shows a closed road', s => O('The maps app leads you to a closed bridge. You make a detour.', { energy: -10, stress: 6 })],
    ['Courtyard maze', s => O('Building 2, building 2 "stroenie 1": a nine-minute walk through courtyards.', { energy: -8, stress: 5 })],
    ['Bus stop has moved', s => O('The bus stop moved 300 metres "for construction".', { energy: -6, stress: 4 })],
    ['GPS jitter between towers', s => O('The blue dot jumps across the river twice.', { stress: 7, energy: -6 })],
    ['Similar street names', s => O('You mix Sadovaya with Sadovnicheskaya and lose half an hour.', { stress: 6, energy: -8 })],
    ['House numbering mystery', s => O('The door to number 14 is in the rear courtyard. The sign says nothing.', { energy: -6, stress: 4 })],
    ['Intercom code', s => O('You cannot find the entrance code. A courier lets you in.', { stress: 5, rep: 1 })],
  ];
  RU.CITIES.forEach((c, i) => lostSits.forEach(([t, fn], j) => S({
    id: `lost-${i}-${j}`, cat: 'life', req: s => s.city === c, title: `${c}: ${t}`, text: `Somewhere in ${c}. ${t}.`,
    choices: [{ t: 'Check the map and sort it out', r: fn }, { t: 'Ask a passer-by', r: () => gamble(0.6, O('A stranger points you the right way.', { stress: -2, rep: 1 }), O('The stranger is also lost.', { stress: 6, energy: -6 })) }, { t: 'Take a taxi from here', r: s => s.money < 500 ? O('You cannot afford it.', { stress: 6, energy: -8 }) : O('A ₽500 ride rescues the day.', { money: -500 }) }],
  })));

  const wSits: [string, Fn][] = [
    ['The map freezes', s => O('Your phone dies in the cold when you most need it.', { stress: 8, energy: -10 })],
    ['Unploughed pavement', s => O('You wade through knee-high snow.', { energy: -12, stress: 5 })],
    ['Lost in a snowy courtyard', s => O('Everything looks the same under snow. The map shows the wrong side.', { stress: 8, energy: -12 })],
    ['Bus not coming', s => O('The bus is "delayed due to weather". Forty minutes at the stop.', { stress: 7, energy: -8 })],
    ['You slip on ice', s => gamble(0.5, O('You land on your feet. Phew.', { stress: 3 }), O('You land on your wrist. A bruise at least.', { health: -6, stress: 6 }))],
    ['Taxi surge', s => O('Surge pricing: ₽1,400 for a 3 km ride.', { money: -1400, stress: 5 })],
    ['A kind stranger', s => O('A stranger shares an umbrella and directions.', { stress: -5, rep: 1 })],
    ['Wrong direction on the map', s => O('The compass is misleading; you walk 500 m the wrong way.', { energy: -8, stress: 6 })],
  ];
  [['snow', 'Snow'], ['frost', 'Frost'], ['rain', 'Rain'], ['heat', 'Heat']].forEach(([w, wn], i) => wSits.forEach(([t, fn], j) => S({
    id: `wx-${w}-${j}`, cat: 'life', req: s => s.weather === w, w: w === 'snow' ? 2 : 1.2, title: `${wn}: ${t}`, text: `${RU.WEATHER[w]} in {city}. ${t}.`,
    choices: [{ t: 'Check the map and push on', r: fn }, { t: 'Go back home', r: () => O('You give up for today.', { energy: 4, stress: 3 }) }],
  })));

  /* =================== SHOPPING / CLOTHES =================== */
  const clothes: [string, number, number][] = [['winter coat', 6000, 40], ['ushanka hat', 1200, 8], ['winter boots', 4500, 22], ['jeans', 2500, 10], ['sneakers', 3200, 10], ['thermal underwear', 1800, 12], ['scarf', 700, 4], ['mittens', 600, 4], ['interview suit', 7000, 8], ['sportswear', 2200, 6], ['raincoat', 1900, 8], ['sweater', 2300, 10], ['work overalls', 1500, 6], ['down jacket', 8000, 36], ['felt boots (valenki)', 3500, 20]];
  const shopSits: [string, (s: State, n: string, p: number, c: number) => Outcome][] = [
    ['Bargain at Sadovod', (s, n, p, c) => gamble(0.7, O(`You haggle a ${n} down to ${RU.money(Math.round(p * 0.6))}.`, { money: -Math.round(p * 0.6), clothes: c }), O(`The ${n} falls apart after a week.`, { money: -Math.round(p * 0.6), clothes: Math.round(c / 3), stress: 4 }))],
    ['Second-hand from Avito', (s, n, p, c) => O(`A ${n} at half price from a seller in a Khrushchyovka.`, { money: -Math.round(p * 0.5), clothes: Math.round(c * 0.8) })],
    ['Wildberries: wrong size', (s, n, p, c) => O(`The ${n} arrives two sizes too small. Returns take a week.`, { money: -Math.round(p * 0.1), stress: 5, clothes: 0 })],
    ['Lamoda, with a return slip', (s, n, p, c) => s.money < p ? O('Not enough money.', { stress: 3 }) : O(`A ${n} from Lamoda. Right size, fair price.`, { money: -p, clothes: c })],
    ['Mall sale', (s, n, p, c) => s.money < p * 0.8 ? O('Even on sale it is too much.', { stress: 3 }) : O(`A ${n} on sale at 20% off. The cashier asks for the loyalty card.`, { money: -Math.round(p * 0.8), clothes: c, stress: -2 })],
    ['Scam: fake brand', (s, n, p, c) => O(`The label says "Adidas". The ${n} says otherwise.`, { money: -Math.round(p * 0.7), clothes: Math.round(c / 2), stress: 5 })],
  ];
  clothes.forEach(([n, p, c], i) => shopSits.forEach(([t, fn], j) => S({
    id: `shop-${i}-${j}`, cat: 'shop', title: `${cap(n)}: ${t}`, text: `You need a ${n}. ${t}.`, w: (n.includes('coat') || n.includes('boots') || n.includes('jacket')) && ['snow', 'frost'].includes('snow') ? 1.5 : 1,
    choices: [{ t: `Buy the ${n}`, r: s => fn(s, n, p, c) }, { t: 'Keep looking', r: () => O('Nothing right today.', { energy: -4 }) }],
  })));
  S({ id: 'shop_winter_warning', cat: 'shop', req: s => s.clothes < 40, w: 4, title: 'You are underdressed for winter', text: 'Your reflection in the shop window confirms it: thin jacket, thin shoes. The forecast says −20 °C.',
    choices: [F('Buy a full winter set (₽12,000)', s => s.money < 12000 ? O('You do not have enough. You buy only a hat and mittens.', { money: -1800, clothes: 12 }) : O('Coat, boots, hat. You can finally walk outside.', { money: -12000, clothes: 70, stress: -6 })), C('Wait for the sale', 'The sale is in January. Winter is now.', { stress: 3 })] });
  S({ id: 'shop_sim', cat: 'shop', w: 6, req: (s: State) => !s.flags.sim, title: 'A Russian SIM card', text: 'Your mobile plan needs a Russian number with an identity check. Operators ask for passport and sometimes registration.',
    choices: [F('Buy a SIM at the operator shop', s => (s.status !== 'citizen' && !s.flags.simId ? O('The seller asks for a SNILS number, a Gosuslugi account and biometric identification. You are told to complete the identification first (Online services → Mobile identification).', { stress: 5 }) : O('Passport scanned, SIM active, internet works. Maps work too.', { money: -400, stress: -3, know: 1, flag: 'sim' }))), C('Use a stranger\'s SIM', 'Cheap but risky; the number is blocked within a week.', { money: -300, stress: 5 })] });
  S({ id: 'shop_troika', cat: 'shop', w: 6, req: (s: State) => !s.flags.troika, title: 'Transport card', text: 'A Troika (or city) transport card costs ₽50 and saves fares on metro, bus and tram.',
    choices: [C('Buy and top up ₽500', 'Beep: you are a Moscow commuter.', { money: -550, stress: -2, flag: 'troika' }), C('Pay each trip by phone', 'It works, but costs more.', {})] });
  S({ id: 'shop_pharmacy', cat: 'shop', w: 1, title: 'Pharmacy', text: 'You need medicine for a persistent cough. The pharmacist offers three brands and strong opinions.',
    choices: [C('Buy the cheap one', 'It works slowly.', { money: -300, health: 2 }), C('Buy the expensive one', 'It works fast.', { money: -900, health: 5 })] });
  S({ id: 'shop_grocery', cat: 'shop', w: 1.5, title: 'Pyaterochka vs. Magnit vs. VkusVill', text: 'You compare prices on buckwheat, kefir and bread. A babushka beside you argues with the cashier about a ₽3 mistake.',
    choices: [C('Shop at the cheapest place', 'You walk further, save ₽400.', { money: 400, energy: -6 }), C('Pick the nearest', 'Convenient and costly.', { money: -200 })] });
  S({ id: 'shop_haircut', cat: 'shop', w: 0.8, title: 'Barbershop', text: 'A shop on the corner offers ₽600 haircuts with tea.',
    choices: [C('Get a haircut', 'You look like a new person.', { money: -600, rep: 2, stress: -3 }), C('Skip it', 'You keep your wild hair.', {})] });
  S({ id: 'shop_delivery', cat: 'shop', w: 0.8, title: 'Parcel at the pick-up point', text: 'Your parcel is at a Wildberries pick-up point, 15 minutes away. The QR code will not scan.',
    choices: [C('Wait for the clerk', 'The clerk finds it manually.', { energy: -5, stress: 3 }), C('Come back later', 'Another trip.', { stress: 3 })] });

  /* =================== RELATIONSHIPS =================== */
  S({ id: 'love_meet', cat: 'love', req: s => !s.partner, w: 3, title: 'Someone interesting', text: 'At a friend\'s tea party, a person asks you where you are from and keeps laughing at your jokes.',
    choices: [
      F('Exchange numbers', s => { const kind = s.status === 'citizen' ? pick<Partner['kind']>(['citizen', 'citizen', 'compatriot']) : pick<Partner['kind']>(['citizen', 'compatriot', 'foreigner']); const p = newPartner(kind); return O(`You and ${p.name} exchange numbers and a long look.`, { partner: p, friends: 1, stress: -6 }); }),
      C('Stay friends', 'You enjoy the conversation and walk home alone.', { friends: 1, stress: -3 })] });
  S({ id: 'love_date', cat: 'love', req: s => !!s.partner, w: 3, title: 'A date', text: 'You and your partner pick a place: cafe, park, cinema, or a walk by the river.',
    choices: [
      F('Dinner at a café (₽2,500)', s => O('Candles, blini, laughter.', { money: -2500, love: 8, stress: -8 })),
      F('Walk in the park (free)', s => O('Autumn leaves or snow. You hold hands.', { love: 5, stress: -6 })),
      C('Cancel for work', 'The silence on the phone says it all.', { love: -8, stress: 4 })] });
  S({ id: 'love_quarrel', cat: 'love', req: s => !!s.partner && s.partner.love > 20, w: 2, title: 'A quarrel', text: 'Money, in-laws, who forgot to buy bread: the quarrel starts small.',
    choices: [C('Apologise first', 'It ends with tea and laughter.', { love: 6, stress: -4 }), C('Hold your ground', 'The flat is very quiet.', { love: -10, stress: 8 })] });
  S({ id: 'love_meet_family', cat: 'love', once: true, req: s => s.partner && s.partner.love >= 40, w: 4, title: 'Meeting the family', text: 'Your partner invites you to dinner with their family. Mother brings out all of the pies.',
    choices: [
      F('Bring flowers and a cake', s => gamble(0.7, O('The mother adopts you on the spot.', { love: 12, rep: 3, stress: -6, money: -1500 }), O('They are polite and cold.', { love: 2, stress: 8, money: -1500 }))),
      C('Say you are busy', 'The door remains closed.', { love: -8 })] });
  S({ id: 'love_proposal', cat: 'love', once: true, req: s => s.partner && s.partner.love >= 65 && !s.flags.married && !s.flags.proposed, w: 5, title: 'Propose?', text: 'You have been together for months. A ring costs ₽30,000 or a promise.',
    choices: [
      F('Propose', s => gamble((s.partner?.love ?? 0) / 100, O('"Yes!" The whole café applauds.', { flag: 'proposed', love: 10, stress: -15, money: -4000 }), O('"Not yet." The silence stretches.', { love: -6, stress: 12 }))),
      C('Wait', 'Not yet.', {})] });
  S({ id: 'love_wedding', cat: 'love', once: true, req: s => s.flags.proposed && !s.flags.married, w: 8, title: 'ZAGS wedding', text: 'The civil registry office wants an application a month in advance. A small ceremony costs ₽15,000; a big one with toastmaster ₽250,000.',
    choices: [
      F('Small ceremony with friends', s => {
        const cit = s.partner && s.partner.kind === 'citizen';
        return O(`The registrar stamps the certificate. ${cit && foreign(s) ? 'You now have a ground to apply for residence permit without the quota.' : 'You are married.'}`, { flag: cit && foreign(s) ? ['married', 'marriedCitizen'] : 'married', mark: 'married', money: -15000, love: 15, stress: -20, rep: 3, friends: 2 });
      }),
      C('Skip the wedding for now', 'The relationship goes on.', {})] });
  S({ id: 'love_pregnancy', cat: 'love', req: s => s.partner && (s.flags.married || s.partner.love >= 70) && !s.flags.pregnant && s.kids < 3, w: 2, title: 'News: a baby is coming', text: 'Two lines on the test. Joy, fear, and a hundred questions about leave, money and papers.',
    choices: [
      C('Embrace it', 'You start counting the weeks and the roubles.', { flag: 'pregnant', mark: 'pregnant', stress: 10, love: 8 }),
      C('Not yet', 'You talk about timing and keep going.', { stress: 4 })] });
  S({ id: 'love_birth', cat: 'love', req: s => s.flags.pregnant && s.day >= (s.marks.pregnant || 0) + 40, w: 10, title: 'Birth at the maternity hospital', text: 'Contractions at 3 a.m., a taxi, a roddom (maternity ward), and a tiny cry at sunrise.',
    choices: [
      F('Welcome the baby', s => {
        const cit = s.status === 'citizen' || (s.partner && s.partner.kind === 'citizen' && s.flags.married);
        const first = s.kids === 0;
        return O(cit ? `A healthy baby! The birth certificate and SNILS follow, and your child is a Russian citizen.${first ? ' The state issues a maternity capital certificate of about ₽730,000 (a game approximation of the 2026 amount), which can pay for housing, education or a pension.' : ''}` : 'A healthy baby! You collect the paperwork for the birth certificate and the child\'s status.', { kids: 1, unflag: 'pregnant', flag: cit ? ['childCitizen', 'baby'] : 'baby', money: cit ? 0 : -5000, stress: -10, energy: -30, love: 10, run: st => { if (cit && first && !st.flags.matCapIssued) { st.flags.matCapIssued = true; st.tmp.matCap = 730000; } } });
      })] });
  S({ id: 'matcap_info', cat: 'love', req: (s: State) => Number(s.tmp.matCap || 0) > 0, w: 5, title: 'What to do with maternity capital', text: 'Your maternity capital certificate sits in the app. A neighbour who has a mortgage tells you it can go towards a down payment, to repair or build a home, to pay for education, or to a mother\'s pension. It cannot simply be taken out as cash.',
    choices: [C('Plan to use it for a home (Real estate agency)', 'You note it down: the agency can apply it to a purchase.', { know: 2, stress: -4 }), C('Read the rules for education and pension use', 'The options are many; the paperwork is longer than you hoped.', { know: 3 })] });
  S({ id: 'baby_registration', cat: 'paper', req: s => s.kids > 0, once: true, w: 4, title: 'Newborn paperwork', text: 'Birth certificate at ZAGS, child registration, SNILS and a polyclinic attachment.',
    choices: [F('Do it all in one trip', s => gamble(0.7, O('Done. You celebrate with a pastry.', { energy: -10, stress: -6 }), O('One document is missing; second visit.', { energy: -14, stress: 8 })))] });
  S({ id: 'baby_kindergarten', cat: 'love', req: s => s.kids > 0 && s.day > 200, once: true, w: 3, title: 'Kindergarten queue', text: 'Gosuslugi says you are 214th in the queue for a place. Private kindergartens ask ₽45,000 a month.',
    choices: [C('Wait in the public queue', 'You find a nanny meanwhile.', { money: -4000, stress: 6 }), C('Pay for private', 'Expensive, but the child is happy.', { money: -20000, stress: -3 })] });
  S({ id: 'baby_sick', cat: 'love', req: s => s.kids > 0, w: 2, title: 'Child has a fever', text: 'The thermometer says 38.9 at 2 a.m. The pediatrician hotline plays a recording.',
    choices: [F('Call an ambulance', s => O('Doctors arrive, calm everyone. Not serious.', { stress: 8, energy: -15 })), C('Home remedies', 'Raspberries, tea, a long night.', { stress: 10, energy: -20 })] });
  S({ id: 'baby_party', cat: 'love', req: s => s.kids > 0, w: 1, title: 'Child\'s birthday', text: 'Balloons, cake, a clown who has seen better days.',
    choices: [C('Big party', 'Twenty kids and a broken vase.', { money: -6000, stress: -8, rep: 3 }), C('Small family dinner', 'Quieter and sweeter.', { money: -1500, stress: -6 })] });
  S({ id: 'love_divorce', cat: 'love', req: s => s.flags.married && s.partner && s.partner.love < 15, w: 8, title: 'Marriage on the rocks', text: 'You and your partner have not said a kind word in weeks.',
    choices: [C('Try counselling', 'An awkward hour, a first honest talk.', { love: 15, money: -4000, stress: -6 }), F('File for divorce', s => O('ZAGS stamp, one hour. A lighter wallet and heavier heart.', { flag: 'divorced', unflag: ['married', 'marriedCitizen'], partner: null, stress: 12, money: -5000 }))] });
  S({ id: 'love_partner_papers', cat: 'love', who: ['citizen'], req: s => s.partner && s.partner.kind !== 'citizen', w: 1.5, title: 'Your partner\'s papers', text: 'Your partner\'s registration is expiring, and the work patent is not renewed. The couple\'s conversations start sounding like migration forms.',
    choices: [C('Help with the paperwork', 'You spend the weekend with the MFC and a thermos.', { energy: -12, stress: 6, love: 6 }), C('Stay out of it', 'They notice.', { love: -6 })] });
  S({ id: 'love_friend_new', cat: 'love', w: 3, title: 'Making a friend', text: 'A neighbour from the stairwell asks if you want to go to the banya, play football or just talk.',
    choices: [C('Say yes', 'Phone numbers, tea and a friend.', { friends: 1, stress: -6, rep: 2 }), C('Say no', 'Friendship waits.', {})] });

  // generated dating + friends + kids
  const venues = ['a café on the Garden Ring', 'a library reading room', 'a university corridor', 'a marshrutka', 'a skating rink', 'the dacha of a friend', 'a mosque courtyard', 'a church fair', 'the gym', 'a hostel kitchen', 'a language exchange', 'a hiking group'];
  const dateSits: [string, number][] = [
    ['starts a conversation', 0.35], ['asks about your accent', 0.4], ['shares a tea thermos', 0.45],
    ['offers an umbrella', 0.4], ['recommends a film', 0.35], ['asks for directions', 0.3],
  ];
  venues.forEach((v, i) => dateSits.forEach(([t, p], j) => S({
    id: `date-${i}-${j}`, cat: 'love', req: s => !s.partner, w: 0.6, title: `${cap(v)}: someone ${t}`, text: `At ${v}, someone ${t}.`,
    choices: [
      { t: 'Chat and exchange numbers', r: s => { if (Math.random() < p + s.rep / 400) { const kind = s.status === 'citizen' ? pick<Partner['kind']>(['citizen', 'citizen', 'compatriot']) : pick<Partner['kind']>(['citizen', 'compatriot', 'foreigner']); const pr = newPartner(kind); return O(`${pr.name} laughs and types a number into your phone.`, { partner: pr, friends: 1, stress: -6 }); } return O('A pleasant chat, but no spark.', { friends: 1, stress: -2 }); } },
      { t: 'Smile and move on', r: () => O('Maybe next time.', {}) }],
  })));
  const kidSits = ['has a fever', 'loses a toy', 'says the first word', 'needs a vaccination', 'refuses to eat borscht', 'starts kindergarten', 'is bullied at school', 'gets a prize at a drawing contest', 'asks why you speak differently', 'needs new winter boots'];
  kidSits.forEach((t, i) => S({
    id: `kid-${i}`, cat: 'love', req: s => s.kids > 0, w: 1.2, title: `Your child ${t}`, text: `Family life: your child ${t}.`,
    choices: [{ t: 'Give your full attention', r: () => O('The evening disappears in a happy blur.', { energy: -10, stress: -6, love: 3, famLove: 3 }) }, { t: 'Delegate to the partner / relatives', r: () => O('Someone else handles it. You feel the guilt.', { stress: 3, famLove: -2 }) }],
  }));

  /* =================== FAMILY / PARENTS =================== */
  const parents: [string, string, Choice, string][] = [
    ['Mother announces she is pregnant', 'You are going to have a baby brother or sister in eight months. Everyone talks at once.', C('Celebrate', 'Joy and jokes.', { famLove: 6, stress: -4 }), 'You will be an adult sibling and a babysitter.'],
    ['Father needs a heart check', 'He says "it is nothing" as always. The doctor says otherwise.', C('Send money for treatment', 'The family breathes out.', { money: -8000, famLove: 8, stress: 6 }), 'Dad will be fine.'],
    ['Grandmother wants you to visit', 'She says she has pies, photographs and "one more piece of advice".', C('Visit', 'Photo albums and tea until night.', { famLove: 8, stress: -10, money: -2000 }), 'She is waiting.'],
    ['Parents ask when you will marry', 'It is Sunday, so the question arrives at 14:03.', C('Laugh it off', 'The question returns.', { stress: 4 }), 'Of course.'],
    ['Sibling gets into university', 'Your younger sister scores high on the ЕГЭ. The whole village knows.', C('Congratulate her', 'A video call, tears, tangerines.', { famLove: 6, stress: -6 }), 'Pride all around.'],
    ['Sibling gives birth', 'You are now an uncle or aunt. The baby photo has a million heart emojis.', C('Send a gift', 'A small gift, a big smile.', { money: -3000, famLove: 8 }), 'A new member of the family.'],
    ['Parents are not well-off this year', 'The harvest was poor and loan payments are high.', C('Help with money', 'You send what you can.', { money: -5000, famLove: 6, stress: 5 }), 'Money is tight.'],
    ['Parents visit you', 'They arrive with six bags of food and a very large pot.', C('Host them', 'Three days of noise and warmth.', { money: -3000, famLove: 10, stress: -8 }), 'Wonderful chaos.'],
  ];
  parents.forEach(([t, text, ch, _], i) => S({
    id: `par-${i}`, cat: 'family', w: 1.2, title: t, text, choices: [ch, C('Postpone the call', 'The chat stays unread.', { famLove: -3, stress: 3 })],
  }));

  /* =================== HEALTH =================== */
  const ail = ['flu', 'toothache', 'back pain from heavy work', 'stomach ache', 'migraine', 'a twisted ankle', 'an allergy', 'insomnia', 'a skin rash', 'a bad cough'];
  ail.forEach((a, i) => S({
    id: `health-${i}`, cat: 'health', title: `You have ${a}`, text: `${cap(a)} has been bothering you all week.`, w: 0.6,
    choices: [
      { t: 'Public polyclinic (free with insurance)', r: s => (s.status === 'citizen' || s.flags.rvp || s.flags.insured) ? O('The doctor writes a prescription after a 90-minute wait.', { health: 6, energy: -8 }) : O('Without OMS insurance they ask ₽2,500 for the visit.', { health: 6, money: -2500, energy: -8 }) },
      { t: 'Private clinic (₽5,000)', r: s => s.money < 5000 ? O('You do not have enough.', { stress: 4 }) : O('Fast, polite, expensive.', { health: 8, money: -5000 }) },
      { t: 'Home remedies and tea', r: () => O('Honey, lemon and patience.', { health: 2, energy: -6 }) }],
  }));
  S({ id: 'health_insurance', cat: 'health', req: (s: State) => !s.flags.insured && !s.flags.rvp, who: ['foreigner'], w: 3, title: 'Voluntary health insurance (DMS)', text: 'Foreigners need a health insurance policy. A basic one is ₽5,000 for three months.',
    choices: [F('Buy a policy', s => s.money < 5000 ? O('Not enough money.', { stress: 4 }) : O('A paper policy and a hotline number. You feel safer.', { money: -5000, flag: 'insured', stress: -5 })), C('Skip it', 'Luck is not insurance.', {})] });

  /* =================== REGION FLAVOUR =================== */
  const region: [string, string, string, Choice, string?][] = [
    ['dagestan', 'Questions about origin', 'A stranger asks "where are you really from?" and stares at your name on the bus ticket.', C('Answer calmly: "Makhachkala"', 'The stranger softens. Conversation turns to khinkal.', { rep: 2, stress: 2 })],
    ['dagestan', 'Mountain hospitality', 'Your cousin hosts a table with twenty dishes for three people.', C('Eat everything', 'You waddle home.', { energy: 10, stress: -8 })],
    ['region', 'Panelka childhood', 'You walk past your old school. The same dog sleeps at the gate.', C('Say hi', 'Everything and nothing has changed.', { stress: -6 })],
    ['moscow', 'Dad knows a guy', 'Your father offers to "fix" a small fine with a phone call.', F('Accept', s => O('Fixed. Your integrity is not.', { rep: -3, stress: -3, strike: 1 })), 'Refuse'],
    ['tajik', 'Home in the group chat', 'A voice message from your mother on WhatsApp; the whole village is in the chat.', C('Reply with a smile', 'Home feels near.', { stress: -8, famLove: 4 })],
    ['uzbek', 'Samarkand bread', 'A colleague brings non from a neighbourhood bakery. It tastes like home.', C('Share it with colleagues', 'Everyone wants the recipe.', { rep: 3, stress: -5 })],
    ['kyrgyz', 'EAEU paperwork', 'A clerk is surprised that you do not need a patent.', C('Show your documents', 'No patent, no problem.', { stress: -3 })],
    ['student', 'Dorm life', 'The kettle explodes at 2 a.m. The whole floor wakes up.', C('Laugh', 'You make eight friends in a night.', { friends: 2, stress: -5 })],
    ['student', 'Lecture in Russian', 'The professor talks very fast and writes very little.', C('Record and study at night', 'You catch up by 4 a.m.', { know: 3, energy: -10 })],
  ];
  region.forEach(([o, t, text, ch, alt], i) => S({
    id: `reg-${i}`, cat: 'life', req: s => s.o === o, w: 1.5, title: t, text, choices: [ch, C(alt || 'Move on', 'You move on.', {})],
  }));
