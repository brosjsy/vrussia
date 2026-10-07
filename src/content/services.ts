/* Services & life events: phones, cars, flats, hospital, pets, family decisions, city festivals, errands. */
import { dyn, S, O, gamble, rnd, pick, money, problems, isForeigner, absentDays, CITIES } from '../engine';
import type { State, Scenario, Outcome, Choice, Effects } from '../engine';

const C = (t: string, msg: string, fx: Effects): Choice => ({ t, msg, fx });
const F = (t: string, r: (s: State) => Outcome): Choice => ({ t, r });
const eligibleCredit = (s: State): boolean => (Object.values(s.bank).some(Boolean)) && (s.status === 'citizen' || !!s.flags.rvp || !!s.flags.vnzh) && !!s.job && s.rep >= 40;
const debtFx = (amount: number, weekly: number): Effects['run'] => st => { st.tmp.debt = Number(st.tmp.debt || 0) + amount; st.tmp.debtPay = Number(st.tmp.debtPay || 0) + weekly; };
const dynScene = (id: string, cat: string, build: (s: State) => Pick<Scenario, 'title' | 'text' | 'choices'>): void => {
  dyn[id] = s => ({ id, cat, free: true, dynamic: true, ...build(s) });
};

/* =================== PHONE SHOP =================== */
S({
  id: 'phone_shop', cat: 'phone', w: 6, title: 'Electronics mall: phones',
  text: 'Rows of glass cases, a salesperson in a branded T-shirt and a tag that says "0% instalment". Your current phone is battery-hungry and the screen is cracked.',
  choices: [
    C('Look at new phones', 'The salesperson hands you three boxes.', { queue: 'phone_new' }),
    C('Check used phones on the classifieds board', 'A notice board full of numbers, photos and "urgent, moving abroad".', { queue: 'phone_used' }),
    C('Just browse', 'You admire the flagship and leave.', { stress: -2 }),
  ],
});
dynScene('phone_new', 'phone', s => ({
  title: 'New phones', text: `You have ${money(s.money)}. A good phone makes maps work in the frost and helps you find the right metro exit.`,
  choices: [
    C('Budget phone (₽14,000)', 'You choose a simple phone. It will do.', { queue: 'phone_pay', run: x => { Object.assign(x.tmp, { price: 14000, level: 1, label: 'budget phone' }); } }),
    C('Mid-range phone (₽38,000)', 'A fast chip and a decent camera.', { queue: 'phone_pay', run: x => { Object.assign(x.tmp, { price: 38000, level: 2, label: 'mid-range phone' }); } }),
    C('Flagship phone (₽95,000)', 'The shop assistant treats you like royalty.', { queue: 'phone_pay', run: x => { Object.assign(x.tmp, { price: 95000, level: 3, label: 'flagship phone' }); } }),
    C('Leave', 'You walk away empty-handed.', {}),
  ],
}));
dynScene('phone_pay', 'phone', s => ({
  title: `Pay for the ${s.tmp.label}`, text: `Price: ${money(Number(s.tmp.price))}. How do you pay?`,
  choices: [
    F('Pay in cash / by card now', st => {
      const p = Number(st.tmp.price);
      return st.money < p ? O('You do not have enough money.', { stress: 5 }) : O(`You walk out with a ${st.tmp.label}. It works instantly.`, { money: -p, phone: Number(st.tmp.level), stress: -4, rep: 1 });
    }),
    F('Instalment (40% now, the rest in weekly payments, +15%)', st => {
      const p = Number(st.tmp.price);
      if (!Object.values(st.bank).some(Boolean)) return O('The shop asks for a bank card. You do not have a bank account yet.', { stress: 5 });
      if (st.money < p * 0.4) return O('You cannot cover even the first payment.', { stress: 5 });
      return O(`You sign the instalment form: ${money(Math.round(p * 0.4))} now, the rest weekly.`, { money: -Math.round(p * 0.4), phone: Number(st.tmp.level), run: debtFx(Math.round(p * 0.6 * 1.15), 3000), stress: 2 });
    }),
    C('Not today', 'You decide to think about it.', {}),
  ],
}));
dynScene('phone_used', 'phone', () => ({
  title: 'Used phone from a stranger', text: 'A seller in a car park offers a good-looking phone for ₽9,000. His story is smooth.',
  choices: [
    F('Check the IMEI and test it before buying', st => st.money < 9000 ? O('You cannot afford it.', { stress: 3 }) : gamble(0.85, O('Everything checks out. You get a good deal.', { money: -9000, phone: 2, know: 1 }), O('The IMEI is blocked. You walk away, annoyed but money intact.', { stress: 6 }))),
    F('Pay and go', st => st.money < 9000 ? O('You cannot afford it.', { stress: 3 }) : gamble(0.55, O('Surprisingly honest. The phone works.', { money: -9000, phone: 2 }), O('The phone is stolen and locked. You lost the money.', { money: -9000, stress: 15, rep: -1 }))),
    C('Walk away', 'Too good to be true.', {}),
  ],
}));
S({ id: 'phone_cracked', cat: 'life', w: 0.8, req: (s: State) => s.phone >= 1, title: 'Cracked screen', text: 'You drop your phone on the tram floor. The glass spiderwebs.',
  choices: [C('Fix the screen (₽3,500)', 'The repair stall in the passage fixes it in an hour.', { money: -3500 }), C('Live with it', 'The cracks cut your finger twice a day.', { stress: 4 })] });

/* =================== DRIVING SCHOOL + CAR DEALER =================== */
S({
  id: 'driving_school', cat: 'car', req: (s: State) => !s.flags.license && !s.flags.enrolled, w: 6, title: 'Driving school',
  text: 'A banner says: "Licence in two months, 100% pass rate". A course costs about ₽35,000 and includes theory, 56 hours of driving and an exam at the traffic police.',
  choices: [
    F('Enroll (₽35,000)', s => s.money < 35000 ? O('You do not have enough money yet.', { stress: 4 }) : isForeigner(s) && !s.flags.rvp && s.docs.reg <= 0 ? O('The school asks for valid registration. You do not have it.', { stress: 6 }) : O('You sign the contract. First theory class on Monday.', { money: -35000, flag: 'enrolled', mark: 'enrolled', know: 2 })),
    C('Ask about prices and leave', 'You take a leaflet and a lollipop.', {}),
  ],
});
S({
  id: 'driving_exam', cat: 'car', req: (s: State) => !!s.flags.enrolled && !s.flags.license && s.day >= (s.marks.enrolled ?? 0) + 14, w: 12, once: true, title: 'Traffic police exam',
  text: 'Theory test on a touch screen, then the practical exam on a closed track and in town.',
  choices: [
    F('Take the exam', s => gamble(0.5 + s.know / 200, O('You pass. A plastic card with your photo and a very large smile.', { flag: 'license', stress: -15, rep: 3 }), O('You lose points on the parallel parking. Retake next time.', { stress: 10, money: -2000 }))),
    C('Postpone', 'You promise to revise more.', { stress: 3 }),
  ],
});
S({
  id: 'car_dealer', cat: 'car', req: (s: State) => !!s.flags.license && !s.car, w: 8, title: 'Car dealership',
  text: 'Polished floors, a smell of new plastic and a sales manager with a smile: "What are you looking for — comfort, economy, status?" Prices are in the millions, used cars are cheaper.',
  choices: [
    C('Look at used cars', 'The manager leads you outside past rows of hatchbacks.', { queue: 'car_used' }),
    C('Look at new cars on credit', 'He opens a folder of leasing offers.', { queue: 'car_new' }),
    C('Test drive only', 'You take a spin around the block. Heated seats are a revelation.', { stress: -6 }),
    C('Leave', 'You promise to come back.', {}),
  ],
});
dynScene('car_used', 'car', s => ({
  title: 'Used cars', text: `You have ${money(s.money)}. A used car in good condition is the realistic choice.`,
  choices: [
    F('2009 hatchback, ₽250,000', st => st.money < 250000 ? O('You cannot afford it.', { stress: 4 }) : gamble(0.7, O('A reliable little car. You become a driver.', { money: -250000, rep: 2, run: x => { x.car = { model: '2009 hatchback', value: 220000 }; } }), O('A week later the gearbox fails: ₽60,000 of repairs.', { money: -310000, stress: 12, run: x => { x.car = { model: '2009 hatchback', value: 150000 }; } }))),
    F('2016 sedan, ₽520,000 (mechanic checks it: +₽3,000)', st => st.money < 523000 ? O('You cannot afford it.', { stress: 4 }) : O('The mechanic finds nothing serious. A good purchase.', { money: -523000, rep: 4, stress: -6, run: x => { x.car = { model: '2016 sedan', value: 480000 }; } })),
    C('Think about it', 'You leave with a card and a business-like handshake.', {}),
  ],
}));
dynScene('car_new', 'car', s => ({
  title: 'New car on credit', text: 'A new compact crossover, ₽1,900,000: down payment ₽380,000 then ₽15,000 per week. The bank needs your income, your status and your reputation.',
  choices: [
    F('Apply for credit', st => {
      if (st.money < 380000) return O('You do not have enough for the down payment.', { stress: 5 });
      if (!eligibleCredit(st)) return O('The bank declines: no steady income, no status or too low reputation.', { stress: 8 });
      return O('Approved! You drive away with a new car. The loan will accompany you for a long time.', { money: -380000, rep: 6, stress: -10, run: x => { x.car = { model: 'New crossover', value: 1700000 }; debtFx(1520000, 15000)!(x); } });
    }),
    C('Walk away', 'Interest rates do not sound friendly.', {}),
  ],
}));
const carEvents: [string, string, Choice[]][] = [
  ['Traffic police stop', 'A patrol officer waves a striped baton: "Documents, please."', [F('Show licence, registration and insurance', s => (isForeigner(s) && problems(s).length) ? O(`The officer notices: ${problems(s)[0]}. Fine and a warning.`, { money: -5000, strike: 1, stress: 12 }) : O('Everything is in order. He salutes.', { stress: 2 })), C('Politely ask for his name and reason', 'He hands the documents back after a short silence.', { rep: 1 })]],
  ['Parking fine', 'A parking inspector sticks a ticket on your windscreen.', [C('Pay with a discount (₽1,500)', 'Paid in the Gosuslugi app within five days.', { money: -1500 }), C('Ignore it', 'The fine doubles later.', { money: -4000, stress: 6 })]],
  ['Dead battery', 'It is −18 °C and your car does not start.', [C('Ask a neighbour for a jump start', 'A man in felt boots helps you. Everyone has done this.', { stress: 4, rep: 2 }), C('Call a service (₽3,000)', 'Quick, expensive.', { money: -3000 })]],
  ['Winter tyres', 'The first snow is falling and your tyres are bald.', [C('Buy winter tyres (₽24,000)', 'You drive safely all winter.', { money: -24000, health: 1 }), C('Risk it', 'You slide into a snowbank.', { money: -8000, stress: 10 })]],
  ['Car sharing / taxi side job', 'A friend says you can earn money driving at weekends.', [C('Try a weekend of taxi rides', 'You earn ₽6,000 and learn every pothole.', { money: 6000, energy: -18 }), C('Keep the car for yourself', 'Quiet weekends.', {})]],
  ['Hitchhiker in the snow', 'A woman with groceries waves at the road in a blizzard.', [C('Give her a lift', 'She gives you a jar of pickles and her life story.', { rep: 3, merit: 3 }), C('Drive on', 'You feel guilty for two kilometres.', { stress: 3 })]],
  ['Minor accident', 'A scratch and a dent: another driver reversed into you.', [C('Fill in the Europrotocol', 'Ten minutes of forms, no police needed.', { stress: 6, energy: -6 }), C('Call the traffic police', 'You wait two hours in the cold.', { stress: 10, energy: -10 })]],
  ['Insurance renewal', 'The OSAGO policy expires next week.', [C('Renew online', 'Quick and cheap with a no-accident discount.', { money: -9000 }), C('Skip', 'A fine awaits.', { money: -800, strike: 1 })]],
];
carEvents.forEach(([t, text, choices], i) => S({ id: `car-ev-${i}`, cat: 'car', req: (s: State) => !!s.car, w: 3, title: t, text, choices }));

/* =================== REAL ESTATE =================== */
S({
  id: 'agency', cat: 'estate', w: 8, title: 'Real estate agency',
  text: 'Brochures of towers and cottages, a coffee machine and an agent called Elvira. "Rent, buy, mortgage — what is your dream?"',
  choices: [
    C('Rent a better flat', 'She opens the rental catalogue.', { queue: 'estate_rent' }),
    C('Buy a home', 'She slides a folder of properties across the desk.', { queue: 'estate_buy' }),
    C('Ask about registration and rental contracts', 'She explains how to protect yourself from fake landlords.', { know: 2, stress: -2 }),
    C('Leave', 'You promise to call.', {}),
  ],
});
dynScene('estate_rent', 'estate', s => ({
  title: 'Rental flats', text: `You currently pay ${money(s.rent)} per week. A deposit equal to two weeks is required. Beware of scammers asking for money before a viewing.`,
  choices: [
    F('Studio near the metro (₽8,000/week)', st => { if (st.money < 16000) return O('You cannot pay the deposit yet.', { stress: 4 }); return gamble(0.9, O('A proper lease and a clean flat. You also ask the landlord to register you.', { money: -16000, setRent: 8000, stress: -8, setDocs: { reg: 0 }, queue: 'estate_register' }), O('The "owner" disappears with your deposit. A fake listing.', { money: -16000, stress: 18 })); }),
    F('One-room flat in a good district (₽13,000/week)', st => { if (st.money < 26000) return O('You cannot pay the deposit yet.', { stress: 4 }); return O('Quiet street, new windows. You sleep like a baby.', { money: -26000, setRent: 13000, stress: -14, health: 2, setDocs: { reg: 0 }, queue: 'estate_register' }); }),
    F('Room in a shared flat (₽2,500/week)', st => O('Cheap and cheerful. The roommate cooks borscht on Sundays.', { setRent: 2500, stress: 2, friends: 1 })),
    C('Keep looking', 'Another weekend of viewings.', { energy: -8 }),
  ],
}));
dynScene('estate_register', 'estate', s => ({
  title: 'Registration at the new address', text: 'Foreign citizens must be registered at their address; the landlord must submit the notice. Citizens only need to update their permanent registration.',
  choices: [
    F('Insist the landlord files the notice', st => gamble(0.75, O('Done through the MFC. You are registered at your new address.', { docs: { reg: 90 }, money: -500, stress: -4 }), O('The landlord refuses: "no registration". You must find another solution.', { stress: 8 }))),
    C('Skip it for now', 'You will deal with it later.', { stress: 3 }),
  ],
}));
dynScene('estate_buy', 'estate', s => ({
  title: 'Properties for sale', text: `You have ${money(s.money)}. A mortgage needs a bank account, steady income, status (citizen / RVP / VNZh) and a good reputation.`,
  choices: [
    F('House in a village, ₽600,000 cash', st => st.money < 600000 ? O('You do not have enough.', { stress: 4 }) : O('A small wooden house with an orchard and a view of the field. You are a homeowner.', { money: -600000, setRent: 0, stress: -20, rep: 8, run: x => { x.housing = 'village'; } })),
    F('Studio in a regional city: down ₽480,000, ₽9,000/week mortgage', st => st.money < 480000 ? O('You need ₽480,000 for the down payment.', { stress: 4 }) : !eligibleCredit(st) ? O('The bank declines: not enough income, status or reputation.', { stress: 8 }) : O('Rosreestr stamps the deal. Keys in your pocket.', { money: -480000, setRent: 0, rep: 8, stress: -12, run: x => { x.housing = 'flat'; debtFx(1920000, 9000)!(x); } })),
    F('Moscow studio: down ₽1,800,000, ₽35,000/week mortgage', st => st.money < 1800000 ? O('You need ₽1,800,000 for the down payment.', { stress: 4 }) : !eligibleCredit(st) ? O('The bank declines: not enough income, status or reputation.', { stress: 8 }) : O('Twenty-seven square metres in the capital and a mountain of debt. You are home.', { money: -1800000, setRent: 0, rep: 12, stress: -12, run: x => { x.housing = 'flat'; debtFx(7200000, 35000)!(x); } })),
    C('Keep saving', 'The agent wishes you luck.', {}),
  ],
}));
S({ id: 'estate_scam', cat: 'estate', w: 1.2, title: 'Too good to be true', text: 'An online ad: a flat in the centre for half the market price. "Send the deposit today, I am abroad."',
  choices: [C('Ignore it', 'You report the ad.', { rep: 1 }), F('Send the deposit', s => O('The ad disappears. So does the money.', { money: -Math.min(Math.max(s.money, 0), 20000), stress: 18 }))] });

/* =================== HOSPITAL =================== */
dynScene('hosp_admit', 'hospital', s => ({
  title: 'You collapse', text: 'Dizziness, a hot flush, and the pavement coming up to meet you. A stranger dials 103 and stays with you until the ambulance arrives.',
  choices: [
    C('Go with the ambulance', 'The ambulance bumps over potholes to the city hospital.', { queue: 'hosp_ward', mark: 'hospital' }),
    F('Refuse and walk home', st => gamble(0.4, O('You rest and feel a bit better.', { health: 8, stress: 6 }), O('You collapse again at home. This time the ambulance takes you.', { health: -5, queue: 'hosp_ward', mark: 'hospital' }))),
  ],
}));
dynScene('hosp_ward', 'hospital', s => ({
  title: 'Admitted to the ward', text: 'A doctor reads your chart. A nurse shows you a bed in a room of six. The window looks out on a snowy courtyard.',
  choices: [
    F('Follow the treatment on the state insurance / pay what is required', st => {
      const cost = (st.status === 'citizen' || st.flags.rvp || st.flags.insured) ? 0 : 25000;
      if (st.money < cost) return O('Without insurance the hospital asks for a deposit you cannot pay. They treat you anyway, but the bill follows.', { money: -cost, stress: 12, queue: 'hosp_injection' });
      return O(cost ? 'You pay the bill at the cashier after discharge.' : 'Your OMS policy covers the stay.', { money: -cost, queue: 'hosp_injection' });
    }),
    F('Pay for a private room (₽15,000)', st => st.money < 15000 ? O('You cannot afford it.', { stress: 6, queue: 'hosp_injection' }) : O('A room for two, a TV and better food.', { money: -15000, stress: -8, queue: 'hosp_injection' })),
  ],
}));
dynScene('hosp_injection', 'hospital', s => ({
  title: 'The injection', text: 'A nurse enters with a tray: "Time for your injection." You hate needles.',
  choices: [
    C('Look away and breathe', 'A tiny pinch, then it is over. She gives you a sticker.', { queue: 'hosp_discharge' }),
    F('Ask what it is and why', st => O('She explains the drug, the dose and the schedule. You feel in control.', { know: 2, queue: 'hosp_discharge' })),
    F('Refuse the injection', st => gamble(0.5, O('The doctor explains the risk until you agree.', { stress: 8, queue: 'hosp_discharge' }), O('You sign a refusal form. Recovery will be slower.', { health: -6, stress: 6, queue: 'hosp_discharge' }))),
  ],
}));
dynScene('hosp_discharge', 'hospital', s => ({
  title: 'Discharge', text: 'After a week of soup, tea, chess with a roommate and a sick-leave certificate, the doctor signs your discharge.',
  choices: [F('Walk out into the fresh air', st => {
    absentDays(st, 6);
    return O('You walk out lighter, with a prescription and a new respect for the nurses.', { health: 45, stress: -15, energy: 30, friends: 1 });
  })],
}));
S({
  id: 'hospital_visit_family', cat: 'hospital', req: (s: State) => !!s.partner || s.kids > 0, w: 3, title: 'A relative is in hospital',
  text: 'Your partner calls: a close family member was admitted overnight. Visiting hours are 17:00–19:00, and no flowers on the ward.',
  choices: [
    C('Visit after work with soup and juice', 'You sit by the bed and listen. They squeeze your hand.', { energy: -10, love: 6, famLove: 4, stress: 4 }),
    C('Pay for a private nurse (₽8,000)', 'A nurse is always at the bedside. It helps the family sleep.', { money: -8000, love: 4, stress: -4 }),
    C('Send a message and stay at work', 'The silence on the phone is heavy.', { love: -6, stress: 8 }),
  ],
});
S({ id: 'hospital_blood', cat: 'hospital', w: 2, title: 'Blood donor desk', text: 'A banner in the corridor: "Every donation can save up to three lives."',
  choices: [C('Donate blood', 'You feel dizzy and proud; a nurse gives you tea and chocolate.', { energy: -12, merit: 8, rep: 4 }), C('Not today', 'You promise to come back.', {})] });
S({ id: 'hospital_firstaid', cat: 'hospital', w: 1.2, title: 'First aid on the metro', text: 'A man collapses on the platform. People stand around with phones. Someone shouts "Does anyone know first aid?"',
  choices: [F('Step in and help', s => s.know >= 40 ? O('You check his breathing, call 103 and keep him stable until the medics arrive. He lives.', { merit: 10, rep: 8, stress: 8, know: 2 }) : O('You do what you can: call 103 and keep him warm. The medics praise you.', { merit: 6, rep: 4, stress: 8 })), C('Call 112 and stay back', 'You call for help and keep the crowd back.', { merit: 3, stress: 6 })] });
S({ id: 'nurse_injection', cat: 'work', req: (s: State) => s.job === 'nurse', w: 4, title: 'You give an injection', text: 'A frightened patient on the ward needs an intramuscular injection. Their hands are shaking; so are yours.',
  choices: [
    F('Check the name and dose, then do it calmly', s => gamble(0.6 + s.know / 200, O('A clean injection. The patient smiles. You feel competent.', { know: 2, rep: 3, stress: -3 }), O('The patient flinches and a bruise forms. You apologise and keep calm.', { stress: 6, rep: -1 }))),
    C('Ask a senior nurse to supervise', 'She nods approvingly and you learn the trick of the angle.', { know: 3 }),
  ] });

/* =================== PETS: STRAYS, ADS, ADOPTION =================== */
S({ id: 'stray_encounter', cat: 'pets', w: 4, title: 'A stray dog in the courtyard', text: 'A thin dog with matted fur watches you from behind a bin. It shivers. Snow is falling.',
  choices: [
    C('Give it food and water', 'The dog wolfs the sausage and follows you to the door, then stops.', { money: -200, stress: -6, merit: 2 }),
    C('Call the animal rescue number', 'A volunteer takes the details and promises to come in the evening.', { merit: 3, stress: -2 }),
    F('Take it to the vet (₽4,000)', s => s.money < 4000 ? O('You cannot afford it.', { stress: 4 }) : O('The vet cleans it, vaccinates it and says: "Healthy and very sweet." Now it needs a home.', { money: -4000, merit: 6, queue: 'pet_ads' })),
    C('Walk past', 'The dog watches you leave. You feel its eyes in your back.', { stress: 4 }),
  ] });
S({ id: 'stray_pack', cat: 'pets', w: 1.5, title: 'A pack of stray dogs', text: 'Three big dogs trot along the road at dusk. One of them growls.',
  choices: [
    C('Stand still, avoid eye contact and back away slowly', 'The pack loses interest. Your heart beats for a minute.', { stress: 8 }),
    C('Take another route and report to the city animal service', 'You walk longer but feel safer.', { energy: -6, merit: 2 }),
    F('Throw a stone to scare them', s => gamble(0.4, O('They scatter.', { stress: 6 }), O('One barks and snaps. You run and fall in the snow.', { health: -6, stress: 15 }))),
  ] });
S({ id: 'dog_found_post', cat: 'pets', w: 2, title: 'A found dog with a collar', text: 'A friendly spaniel with a tag on its collar and nobody around. It looks lost, not abandoned.',
  choices: [
    C('Post a "found" ad in the neighbourhood chat', 'Within two hours a tearful owner calls. "Thank you, thank you!"', { merit: 8, rep: 6, stress: -8 }),
    C('Take it to a vet to read the chip', 'The vet scans the chip and calls the owner. A happy reunion.', { merit: 7, rep: 5, money: -300 }),
    C('Ignore it', 'Someone else will help.', { stress: 3 }),
  ] });

const dogNames = ['Belka', 'Sharik', 'Mukhtar', 'Bobik', 'Laika', 'Rex', 'Tuzik', 'Zhuchka', 'Dymka', 'Pirozhok', 'Snezhok', 'Barsik'];
const dogKinds = ['mixed breed', 'shepherd mix', 'spaniel mix', 'husky mix', 'terrier mix', 'labrador mix'];
const stories = [
  ['was left tied to a fence near a dacha settlement', 'The volunteers say: "He waited by the fence for three days."'],
  ['was abandoned when the owner moved to another country', 'The ad reads: "Owner emigrated. She cried at the station. He is vaccinated and chipped."'],
  ['was found at a metro exit in the snow', 'A passer-by wrote: "She was shivering, wearing a red scarf."'],
  ['was the last puppy of a litter born under a garage', 'A volunteer posted: "Eight puppies found a home; he is the last."'],
  ['was thrown out of a car on a country road', 'Drivers who stopped saved him; he now sleeps on a volunteer\'s sofa.'],
];
dogNames.forEach((n, i) => stories.forEach(([story, quote], j) => S({
  id: `ad-${i}-${j}`, cat: 'pets', w: 0.55, req: (s: State) => !s.pet, title: `Ad: "${n}" needs a home`,
  text: `A post in the "Dogs looking for a home" channel: ${n}, a ${dogKinds[(i + j) % dogKinds.length]}, ${story}. ${quote} Dozens of people have reacted; few have written to the volunteers.`,
  choices: [
    { t: 'Message the volunteers: "I want to meet him"', r: (st: State): Outcome => { st.tmp.dog = n; st.tmp.dogKind = dogKinds[(i + j) % dogKinds.length]; return O(`A volunteer replies within minutes and invites you to meet ${n}.`, { queue: 'pet_meet', merit: 1 }); } },
    C('Share the post with friends', 'Three friends reshare it. Someone adopts a different dog from the same channel.', { merit: 3, rep: 1 }),
    C('Scroll on', 'There are too many sad posts to bear.', { stress: 2 }),
  ],
})));
S({ id: 'pet_ads', cat: 'pets', w: 5, req: (s: State) => !s.pet, title: 'The adoption channel', text: 'You open a Telegram channel where volunteers post abandoned dogs and cats. Every day a new post: ages, breeds, stories, phone numbers.',
  choices: [
    F('Look at today\'s posts', (s: State): Outcome => { const n = pick(dogNames); s.tmp.dog = n; s.tmp.dogKind = pick(dogKinds); return O(`One post stands out: ${n}, a ${s.tmp.dogKind}, three years old, "calm with children and cats". You press "I want to meet".`, { queue: 'pet_meet' }); }),
    C('Not now', 'You close the app.', {}),
  ] });
dynScene('pet_meet', 'pets', s => ({
  title: `Meet ${s.tmp.dog || 'the dog'}`, text: 'At the shelter a volunteer brings out a thin, curious dog that smells your hands, then your shoes, then leans on your leg.',
  choices: [
    C('Sit down and let the dog come to you', 'After a minute the dog puts its head in your lap.', { stress: -8, queue: 'pet_check' }),
    C('Walk the dog around the yard', 'It pulls toward every smell and returns to you.', { energy: -6, queue: 'pet_check' }),
    C('Say you need time to think', 'The volunteer says: "Of course. But he is waiting."', { stress: 2 }),
  ],
}));
dynScene('pet_check', 'pets', s => ({
  title: 'The volunteer\'s questions', text: 'She asks: "Where will he live? Who will walk him in the snow? Does your landlord allow pets? Can you afford vet bills?"',
  choices: [
    F('Answer honestly', st => {
      const ok = st.money >= 4000 && (st.rent === 0 || Math.random() < 0.7);
      return ok ? O('She smiles. "You are exactly the kind of person he needs." She brings the adoption contract.', { queue: 'pet_adopt', rep: 2 }) : O(st.money < 4000 ? 'She says: "Come back when you can afford vaccination and food."' : 'Your landlord refuses a dog. She recommends looking for a pet-friendly flat first.', { stress: 6 });
    }),
    F('Exaggerate to get approved', st => gamble(0.45, O('She believes you. You sign the contract, uneasily.', { queue: 'pet_adopt', rep: -1 }), O('She sees through the story and refuses. "I am sorry — he deserves better."', { stress: 8, rep: -2 }))),
    C('Say you need to prepare', 'She nods: "Take your time, but not too long."', {}),
  ],
}));
dynScene('pet_adopt', 'pets', s => ({
  title: `Adopting ${s.tmp.dog || 'the dog'}`, text: 'Contract, vaccination certificate, a leash and a bag of food. Vet check costs ₽3,500; the shelter asks a small donation.',
  choices: [
    F('Adopt and pay for vet check (₽3,500)', st => st.money < 3500 ? O('You cannot afford the vet check yet.', { stress: 5 }) : O(`${st.tmp.dog} jumps into your arms. The first night is long: whining, a chewed slipper and an unforgettable look.`, { money: -3500, merit: 8, stress: -15, run: x => { x.pet = { name: String(x.tmp.dog || 'Dog'), kind: String(x.tmp.dogKind || 'mixed breed'), bond: 40 }; } })),
    C('Not yet', 'You promise to come back.', {}),
  ],
}));
const petEvents: [string, string, Choice[]][] = [
  ['Walk in the snow', 'Your dog sinks into snowdrifts and barks at snowflakes.', [C('Walk for an hour', 'You return with red cheeks and frozen toes.', { energy: -8, stress: -12, health: 1, love: 1 }), C('Quick lap around the block', 'The dog sighs.', { stress: -3 })]],
  ['Vet visit', 'Your dog scratches and sneezes. It might be an allergy.', [C('Go to the vet (₽2,500)', 'A simple allergy. A shampoo and a diet.', { money: -2500, stress: 2 }), C('Wait and see', 'It gets worse and costs more later.', { money: -4000, stress: 6 })]],
  ['The dog runs away', 'The dog slips through a gap in the fence and vanishes.', [C('Post a "lost dog" ad and search the neighbourhood', 'Two hours later a neighbour calls: "I have your dog".', { energy: -12, stress: 10, merit: 2, friends: 1 }), C('Wait for it to return', 'It returns by dinner, muddy and happy.', { stress: 8 })]],
  ['Barking complaint', 'A neighbour knocks: "Your dog barks all day when you are at work".', [C('Apologise and work out a schedule', 'You arrange a dog walker. The neighbour softens.', { money: -2000, rep: 2 }), C('Argue', 'The neighbour calls the manager.', { rep: -3, stress: 8 })]],
  ['Fireworks fear', 'New Year fireworks are booming. Your dog hides under the bed.', [C('Stay with the dog all night', 'A soft head on your knee. You miss the countdown.', { stress: -4, love: 1, famLove: 2 }), C('Go out and leave it', 'You come back to a chewed pillow.', { stress: 6 })]],
  ['Dog park friends', 'At the dog park two dogs start playing and their owners start talking.', [C('Chat with the other owners', 'You exchange numbers and a coffee invitation.', { friends: 2, stress: -8 }), C('Keep walking', 'The dog drags you back.', {})]],
  ['The dog saves you', 'You slip on ice and lie stunned. Your dog barks until a passer-by comes.', [C('Pet and thank the dog', 'You will never leave the dog behind.', { health: -3, stress: -6, rep: 2 })]],
  ['Training class', 'The local cynologist offers a Saturday training class.', [C('Sign up (₽2,000)', 'Sit, stay, come — the dog knows a few commands now.', { money: -2000, know: 1, stress: -4 }), C('Skip', 'Your dog learns "sit" for sausage only.', {})]],
];
petEvents.forEach(([t, text, choices], i) => S({ id: `pet-ev-${i}`, cat: 'pets', req: (s: State) => !!s.pet, w: 3, title: t, text, choices }));

/* =================== FAMILY DECISIONS =================== */
const decide = (id: string, title: string, text: string, options: [string, string, Effects][], req?: (s: State) => unknown): void => {
  S({ id: `fd-${id}`, cat: 'family_decision', req: (s: State) => !!s.partner && (!req || req(s)), w: 2.2, title, text, choices: options.map(([t, msg, fx]) => C(t, msg, fx)) });
};
decide('where', 'Where should we live?', 'Your partner wants to move closer to their parents. You prefer the city with better jobs.', [
  ['Stay in the city', 'You promise to visit often. They agree, with a sigh.', { love: -3, money: 2000, stress: 2 }],
  ['Move to be near their parents', 'A smaller flat, cheaper rent and lots of help with babysitting.', { love: 8, famLove: 4, money: -3000, stress: -4 }],
  ['Take turns: a year here, a year there', 'A compromise nobody loves but everyone can live with.', { love: 3, stress: 4 }],
]);
decide('money', 'Money or family?', 'Your family asks for a large transfer just when you were saving for the future.', [
  ['Send the money to your family', 'Your partner nods slowly, but you can see the worry.', { money: -10000, famLove: 8, love: -3 }],
  ['Save it for the future', 'You call home and explain. The call is short.', { famLove: -6, love: 4, stress: 4 }],
  ['Split it half and half', 'Both sides get something. Nobody is thrilled, nobody is angry.', { money: -5000, famLove: 3, love: 2 }],
]);
decide('child', 'Is it time for a child?', 'Your partner brings up the question: "Should we start a family now or wait?"', [
  ['Yes, let\'s try', 'You hold hands and smile at the unknown.', { love: 8, stress: 6, flag: 'wantsChild' }],
  ['Wait until we are settled', 'You agree to revisit in a year.', { love: 1 }],
  ['Not sure at all', 'The conversation ends in silence.', { love: -5, stress: 6 }],
], s => s.kids < 3);
decide('inlaws', 'In-laws visit for a month', 'Your partner\'s parents announce they are arriving with enough pickles for a siege.', [
  ['Welcome them warmly', 'The flat fills with stories, advice and pickles.', { love: 6, stress: 8, money: -3000, famLove: 3 }],
  ['Set a two-week limit', 'It is tense but fair.', { love: 1, stress: 4 }],
  ['Suggest they stay at a hotel', 'It is hurtful. Your partner is quiet for days.', { love: -8, money: -4000 }],
]);
decide('traditions', 'Whose holiday traditions?', 'You celebrate different holidays: Navruz, Eid, Orthodox Easter, New Year. Who hosts what?', [
  ['Celebrate both, take turns', 'Twice the cooking and twice the joy.', { love: 6, merit: 3, stress: 4 }],
  ['Celebrate your own', 'Your partner joins but looks lost.', { love: -3 }],
  ['Celebrate theirs', 'You learn new recipes and new songs.', { love: 5, know: 2, merit: 2 }],
]);
decide('name', 'What shall we call the baby?', 'A name is a decision for life. Your parents suggest one; your partner another.', [
  ['Choose a name from your culture', 'Your family cheers on a video call.', { famLove: 6, love: 1 }],
  ['Choose a name from their family', 'Their parents are delighted.', { love: 6, famLove: -2 }],
  ['Choose a name that works in both languages', 'A thoughtful compromise: easy to pronounce in every place.', { love: 5, famLove: 2, know: 1 }],
], s => !!s.flags.pregnant || s.kids > 0);
decide('school', 'Which school for our child?', 'The local school is close and free; a private one is expensive but has a better reputation.', [
  ['Local public school', 'Free, close, and with a kind teacher called Olga Petrovna.', { money: 0, love: 2, stress: -2 }],
  ['Private school (₽25,000/month)', 'Small classes, English lessons and a heavy bill.', { money: -25000, love: 1, stress: 4 }],
  ['A school with a language support class', 'Teachers help your child settle in. A relief for you all.', { stress: -6, love: 3, know: 1 }],
], s => s.kids > 0);
decide('work', 'Career or childcare?', 'One of you must cut hours to take care of the child.', [
  ['You cut back your job', 'Money gets tight, but the child grows up with a parent at home.', { money: -8000, love: 4, stress: 6 }],
  ['Your partner cuts back', 'Your partner sighs: "Of course it is me again".', { love: -5, money: 3000 }],
  ['Hire a nanny (₽20,000)', 'The child likes her. You feel jealous.', { money: -20000, love: 2, stress: -4 }],
], s => s.kids > 0);
decide('pet', 'Should we adopt a dog?', 'Your partner shows you a post about an abandoned dog and asks, "Can we?"', [
  ['Yes', 'Your partner hugs you. The dog is on its way.', { love: 8, stress: 3, queue: 'pet_ads' }],
  ['Not now', 'Your partner sighs. The ad is still open on their phone.', { love: -3 }],
], s => !s.pet);
decide('home', 'Rent forever or buy?', 'Rent keeps rising. A mortgage would tie you to the same street for years.', [
  ['Start saving for a down payment', 'You make a spreadsheet and a plan.', { love: 4, stress: 2, know: 1 }],
  ['Keep renting and travelling', 'Freedom costs, but you keep your options.', { love: 2 }],
]);
decide('citizenship', 'Citizenship together', 'Your partner wants to apply for Russian citizenship with you and asks if you would do it.', [
  ['Apply together', 'You gather documents and share the stress of the interview.', { love: 8, stress: 6, know: 2 }],
  ['Apply separately', 'Two files, two queues, two sets of nerves.', { love: 0, stress: 6 }],
], s => isForeigner(s) || (s.partner !== null && s.partner.kind !== 'citizen'));
decide('abroad', 'Move abroad?', 'An offer comes from a distant country. Your partner is thrilled; you are torn.', [
  ['Stay', 'You turn down the offer. Your partner is quiet for days.', { love: -6, stress: 6 }],
  ['Go and see', 'A trial year somewhere far away. Everything is uncertain.', { love: 4, stress: 10, money: -5000 }],
]);
decide('elderly', 'Bring an elderly parent to live with us?', 'Your mother is alone in the village; the winter is hard and the nearest clinic is far away.', [
  ['Bring her over', 'She arrives with six jars of jam and bossy advice. The flat is full of life.', { famLove: 12, love: -2, stress: 6, money: -3000 }],
  ['Send help and visit often', 'It is the best you can do for now.', { famLove: 3, money: -5000 }],
  ['Move back to the village', 'A new beginning, slow and quiet.', { famLove: 10, love: 2, stress: -6, money: -4000 }],
]);

/* =================== CITY FESTIVALS =================== */
S({
  id: 'cal_cityday', cat: 'cal', free: true, title: 'City Day in {city}',
  text: 'Streets are closed to traffic, stages are built on the main square and the smell of grilled corn drifts through the crowd. A band plays folk songs, a DJ plays something modern, and everyone seems to be smiling.',
  choices: [
    C('Go to the concert with friends', 'Tickets, noise, strangers singing along. You lose your voice.', { money: -1000, stress: -14, friends: 1, merit: 2 }),
    C('Try street food and craft stalls', 'Pickles, pirozhki, honey, pottery. You come home with a bag of treasures.', { money: -1500, stress: -10, merit: 1 }),
    C('Watch the fireworks from a quiet bridge', 'Colour reflecting on the river. You stay until the last spark.', { stress: -12, love: 2 }),
  ],
});
const cityFlavor: Record<string, string> = {
  Moscow: 'a river of lights, a parade of vintage cars and fireworks over the Moskva',
  'Saint Petersburg': 'the open bridges, white nights and a festival of music on Palace Square',
  Kazan: 'Tatar songs, chak-chak and the glittering Kazanka embankment',
  Yekaterinburg: 'a Night of Museums, street art and a procession along the Iset',
  Novosibirsk: 'Siberian honey fairs, jazz in the park and giant ice sculptures in winter',
  Krasnodar: 'Kuban Cossack singing, sunflower fields on posters and sweet melon',
  Sochi: 'film screenings by the sea, tea plantations and palm-lined promenades',
  Vladivostok: 'sea breezes, seafood stalls and ship horns at the harbour',
  Grozny: 'folk dance, lights on the skyscrapers and hospitable tables',
  'Nizhny Novgorod': 'the confluence of the Volga and Oka, craft fairs and a stately Kremlin',
  Samara: 'the longest embankment on the Volga, beer festivals and rocket-themed souvenirs',
  Kaliningrad: 'amber jewellery, Baltic wind and a Prussian-era gate on every street',
};
const fests: [string, string, Effects][] = [
  ['Food stalls', 'You wander along food stalls trying everything.', { money: -900, stress: -8, energy: 4 }],
  ['Evening concert', 'A local band plays songs everyone knows.', { money: -300, stress: -12, friends: 1 }],
  ['Craft market', 'Handmade scarves, wooden toys and fridge magnets.', { money: -1200, stress: -6, clothes: 2, merit: 1 }],
  ['Fireworks at night', 'Colours burst over the roofs; the crowd sighs together.', { stress: -14, love: 1, merit: 1 }],
];
CITIES.forEach((c, i) => fests.forEach(([t, text, fx], j) => S({
  id: `cityfest-${i}-${j}`, cat: 'culture', req: (s: State) => s.city === c, w: 1.1, title: `${c}: ${t.toLowerCase()} at the city festival`,
  text: `The city festival in ${c} brings ${cityFlavor[c]}. ${text}`,
  choices: [C(t === 'Fireworks at night' ? 'Stay for the finale' : 'Join in', text, fx), C('Stay in tonight', 'You hear the noise from your window and wonder what you missed.', { stress: 1 })],
})));

/* =================== DAILY ERRANDS =================== */
const errands: [string, string][] = [
  ['Pay utility bills', 'a stack of receipts for water, electricity and heating'],
  ['Collect a parcel at the post office', 'a long queue and a clerk who disappears for a tea break'],
  ['Get a passport photo', 'a booth that gives everyone the same expression'],
  ['Top up the mobile balance', 'a SIM that will not accept payments'],
  ['Repair your shoes', 'a cobbler who is also a philosopher'],
  ['Copy documents', 'a copy centre with a broken scanner'],
  ['Return a faulty kettle', 'a customer-service desk with a very polite no'],
  ['Join the library', 'a librarian who asks for two photos'],
  ['Renew a gym membership', 'a manager with a smile and a ten-page contract'],
  ['Buy bus tickets for a trip', 'the ticket office queue at the bus station'],
  ['Visit the pharmacy', 'a pharmacist with strong opinions about vitamin D'],
  ['Cut a spare key', 'a hole-in-the-wall workshop and a bell at the door'],
  ['Sell an old chair on a classifieds site', 'ten messages, nine of which say "Is it available?"'],
  ['Get a haircut', 'a barber who tells you about his holiday in Sochi'],
  ['Do laundry at the laundromat', 'a machine that eats a coin and refuses to apologise'],
  ['Buy groceries in bulk', 'three bags that cut into your fingers'],
];
const approaches: [string, (n: string) => Outcome][] = [
  ['Do it quickly', n => O(`You do it quickly: ${n.toLowerCase()} done, a little pricey but painless.`, { money: -rnd(300, 900), energy: -4, stress: -2 })],
  ['Do it thoughtfully, shop around', n => O(`You compare prices and options: ${n.toLowerCase()} done cheaper, but it takes longer.`, { money: -rnd(100, 400), energy: -10, know: 1 })],
  ['Ask a neighbour or friend for help', n => O(`A neighbour knows a trick that saves time. ${n}: done.`, { energy: -3, rep: 1, friends: 0, stress: -4 })],
];
errands.forEach(([n, desc], i) => approaches.forEach(([label, fn], j) => S({
  id: `errand-${i}-${j}`, cat: 'life', w: 0.5, title: `Errand: ${n}`, text: `Today you need to: ${n.toLowerCase()} — ${desc}.`,
  choices: [{ t: label, r: (): Outcome => fn(n) }, C('Put it off', 'It will be waiting tomorrow, with interest.', { stress: 3 })],
})));
