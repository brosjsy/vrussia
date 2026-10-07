/* Template-generated scenario families: each (slot × situation) pair is a distinct scenario. */
(function () {
  const { O, gamble, rnd, pick } = RU.util;
  const S = RU.S;
  const money = RU.money;

  /* =================== JOBS =================== */
  const J = (id, name, pay, extra) => RU.jobs.push(Object.assign({ id, name, pay, energy: 20, stress: 5, line: 'Your first shift starts tomorrow.' }, extra));
  J('courier', 'Delivery courier (Yandex Eda)', 2200, { energy: 25, line: 'An orange bag and a bicycle in minus five.' });
  J('samokat', 'Dark-store picker', 2000, { line: 'You learn the shelves of a hidden supermarket.' });
  J('taxi', 'Taxi driver', 3000, { energy: 22, min: 10, line: 'A rented car and the Yandex Go algorithm.' });
  J('construction', 'Construction worker', 3200, { energy: 30, stress: 6, line: 'Helmet, scaffolding, shared bunkhouse.' });
  J('shawarma', 'Shawarma cook', 2300, { line: 'You smell like garlic sauce and never mind.' });
  J('pvz', 'Wildberries pick-up point clerk', 1800, { energy: 15, line: 'Hundreds of parcels with names you cannot pronounce.' });
  J('warehouse', 'Warehouse picker (Ozon)', 2500, { energy: 28, line: 'Night shift, forklifts, warm tea.' });
  J('cleaner', 'Mall cleaner', 1800, { energy: 22, line: 'You mop miles of marble.' });
  J('dvornik', 'Street sweeper (dvornik)', 2000, { energy: 22, line: 'Snow at 5 a.m., an orange vest, a shovel.' });
  J('callcenter', 'Call-centre operator', 2400, { min: 25, stress: 9, line: 'Headset, script, angry voices.' });
  J('cashier', 'Pyaterochka cashier', 2100, { min: 12, line: 'Beep, "do you have the loyalty card?", beep.' });
  J('barista', 'Café barista', 2300, { min: 15, line: 'You master the oat latte.' });
  J('dev', 'Junior developer', 6500, { min: 55, cit: true, energy: 15, line: 'Open space, ping-pong table, deadlines.' });
  J('teacher', 'School teacher', 3200, { min: 45, cit: true, stress: 8, line: 'Thirty teenagers and a whiteboard.' });
  J('nurse', 'Nurse', 3000, { min: 40, cit: true, energy: 25, stress: 8, line: 'Night shifts, kindness, and bureaucracy.' });
  J('guard', 'Security guard', 2200, { energy: 12, stress: 3, min: 10, line: 'A booth, a kettle, a CCTV screen.' });
  J('busdrv', 'Bus driver', 3300, { min: 20, energy: 24, line: 'Route 36, rush hour included.' });
  J('farm', 'Farm worker (Krasnodar)', 2400, { energy: 28, line: 'Tomatoes, sunshine, farm bosses.' });
  J('fish', 'Fish-processing worker', 4000, { energy: 32, stress: 8, line: 'Cold hands, high wages.' });
  J('welder', 'Welder at a factory', 4200, { min: 25, energy: 26, line: 'Sparks and certificates.' });
  J('hotel', 'Hotel housekeeper', 2100, { energy: 22, line: 'Hundred beds, fifty bathrooms.' });
  J('cook', 'Restaurant cook (plov)', 2800, { min: 15, energy: 24, line: 'A kazan the size of a bathtub.' });
  J('tutor', 'Private tutor', 2800, { min: 50, energy: 12, line: 'You teach other people\'s kids.' });
  J('designer', 'Freelance designer', 3500, { min: 45, energy: 14, line: 'Clients who "need it yesterday".' });
  J('market', 'Market stall seller', 2400, { energy: 18, line: 'Fruit, haggling, a thermos of tea.' });

  const jobs = RU.jobs;
  const inc = [
    ['late_wages', 'Wages are late', j => `Payday for the ${j.name} job comes and goes. The boss says the money "will come on Monday".`, [
      ['Wait politely', (s, j) => gamble(0.6, O('The money arrives on Thursday, with an apology.', { stress: 3 }), O('The money never arrives.', { money: -j.pay, stress: 10, rep: -2 }))],
      ['Threaten to complain to the labour inspectorate', (s, j) => gamble(0.5, O('Paid the same day, but relations are chilly.', { stress: 6, rep: -1 }), O('Fired on the spot.', { job: null, money: -j.pay, stress: 12 }))],
      ['Quit', (s, j) => O('You walk out with an empty envelope.', { job: null, money: -j.pay, stress: 8 })]]],
    ['overtime', 'Unpaid overtime', j => `Three hours before closing time, the manager at the ${j.name} job says: "Everybody stays tonight".`, [
      ['Stay without pay', () => O('You stay. The boss notices.', { energy: -15, rep: 3, stress: 5 })],
      ['Ask for extra pay', (s, j) => gamble(0.5, O('You get half-rate for the extra hours.', { money: Math.round(j.pay * 0.3), energy: -12, rep: 1 }), O('"Do not push". Cold shoulder follows.', { stress: 6, rep: -2 }))],
      ['Refuse politely', (s) => gamble(0.6, O('The manager nods. You go home.', { rep: 0 }), O('You are scheduled for the worst shifts afterwards.', { rep: -3, stress: 5 }))]]],
    ['injury', 'A workplace injury', j => `You slip while working as ${j.name}. Your wrist hurts, and so does your pride.`, [
      ['Keep working', () => O('The pain grows by evening.', { health: -8, stress: 4 })],
      ['Go to the polyclinic', s => O(s.status === 'citizen' || s.flags.rvp ? 'Free care under the state health insurance. A sick leave certificate follows.' : 'Without insurance the visit costs ₽3,000.', { money: s.status === 'citizen' || s.flags.rvp ? 0 : -3000, health: 3 })],
      ['Take the boss\'s cash to stay quiet', () => O('₽5,000 and no report. You feel uneasy.', { money: 5000, health: -4, stress: 5 })]]],
    ['inspection', 'Inspection at work', j => `Officers with folders walk into the ${j.name} workplace: "Inspection of labour and migration documents."`, [
      ['Show your documents calmly', s => RU.problems(s).length ? O(`The inspector notes: ${RU.problems(s)[0]}. A report follows.`, { strike: 1, money: -5000, stress: 15 }) : O('Everything is fine. The boss pats your shoulder.', { rep: 2, stress: 3 })],
      ['Hide in the storeroom', s => gamble(0.35, O('They leave without noticing you.', { stress: 10 }), O('They find you. This looks bad.', { strike: 1, money: -5000, stress: 15 }))],
      ['Ask the boss to speak for you', (s) => gamble(0.5, O('The boss handles it.', { rep: 1, stress: 3 }), O('The boss says he has never seen you.', { rep: -3, stress: 10, job: null }))]]],
    ['raise', 'A promotion offer', j => `The manager at the ${j.name} job wants you for a more responsible position.`, [
      ['Accept', (s, j) => O('More money, more problems.', { money: Math.round(j.pay * 0.4), stress: 6, rep: 4, know: 2 })],
      ['Ask for even more money', (s, j) => gamble(0.45, O('He agrees: a bigger raise than offered.', { money: Math.round(j.pay * 0.8), stress: 4, rep: 2 }), O('"Forget it." The offer is withdrawn.', { rep: -2 }))],
      ['Decline', () => O('Fewer responsibilities, steady life.', { stress: -3 })]]],
    ['conflict', 'Conflict with a colleague', j => `A colleague at the ${j.name} job keeps leaving you the worst tasks and makes jokes about your accent.`, [
      ['Ignore him', () => O('You grit your teeth.', { stress: 7 })],
      ['Confront him privately', () => gamble(0.55, O('He stammers an apology. Respect earned.', { rep: 3, stress: -2 }), O('It gets worse.', { stress: 10, rep: -2 }))],
      ['Report to the manager', () => gamble(0.5, O('The manager has a talk with him.', { rep: 1, stress: -3 }), O('The manager shrugs: "solve it yourselves".', { stress: 6 }))]]],
    ['customer', 'A customer complains', j => `A customer yells that ${j.name === 'Pyaterochka cashier' ? 'the milk expired' : 'your service is terrible'}. Others in line stare.`, [
      ['Apologise and fix it', () => O('She calms down and leaves a tip.', { money: 300, stress: 3, rep: 2 })],
      ['Defend yourself', () => gamble(0.4, O('The crowd takes your side.', { rep: 3 }), O('A complaint goes to the manager.', { rep: -3, stress: 7 }))],
      ['Call the manager', () => O('The manager arrives; you are excused.', { stress: 2 })]]],
    ['nocontract', 'Work without a contract', j => `The boss of your ${j.name} job: "I can pay 20% more if we skip the contract and taxes."`, [
      ['Accept', (s, j) => gamble(0.55, O('Extra cash this month.', { money: Math.round(j.pay * 0.2 * 5), stress: 3 }), O('The boss vanishes with two months of wages.', { money: -j.pay * 2, stress: 12 }))],
      ['Insist on a written contract', () => gamble(0.6, O('He grumbles but signs.', { rep: 1, stress: -2 }), O('He finds someone else. You are out.', { job: null, stress: 8 }))]]],
    ['skill', 'Learn a skill', j => `An older colleague at the ${j.name} job offers to show you a trick of the trade.`, [
      ['Listen carefully', () => O('You learn something that will outlast the job.', { know: 4, energy: -6 })],
      ['Say you know already', () => O('He shrugs. You do not.', { know: 0, rep: -1 })]]],
  ];
  for (const j of jobs) for (const [key, title, text, chs] of inc) {
    S({ id: `work-${j.id}-${key}`, cat: 'work', req: s => s.job === j.id, title: `${title} (${j.name})`, text: text(j),
      choices: chs.map(([t, fn]) => ({ t, r: s => fn(s, j) })) });
  }

  /* =================== POLICE =================== */
  const places = ['Kuntsevskaya metro', 'Paveletsky station', 'Sadovod market', 'Lyublino market', 'Kuznetsky Most', 'Vykhino metro', 'Moscow-City promenade', 'a Khimki construction gate', 'Tsaritsyno park', 'a Zelenograd bus stop', 'Sennaya Square', 'Nevsky Prospekt', 'the Kazan Kremlin embankment', 'Uralmash in Yekaterinburg', 'Gagarinskaya in Novosibirsk', 'Krasnaya Street in Krasnodar', 'Adler station in Sochi', 'the Golden Bridge in Vladivostok', 'central Grozny', 'a Pyaterochka entrance', 'a hostel stairwell', 'a night-club queue', 'a Wildberries pick-up point', 'the long-distance bus station', 'Sheremetyevo Terminal D', 'a dacha village', 'a university gate', 'an MFC queue', 'an election-day polling station', 'a Chertanovo courtyard'];
  const sits = [
    ['Routine ID check', 'Two officers: "Documents, please."', 1],
    ['"You match a description"', 'An officer says someone fitting your description robbed a shop an hour ago.', 2],
    ['A mass raid', 'Officers form a corridor and ask everyone who is not local to board a bus to the station.', 3],
    ['Phone inspection', 'The officer asks you to unlock your phone and show your chats and photos.', 2],
    ['"You are not in the system"', 'The officer scans your document: "Your registration is not in the database."', 2],
    ['Plainclothes conversation', 'A man in a plain jacket asks you to step aside "for a short talk".', 2],
    ['Fingerprint scan', 'They scan your fingerprints with a portable device.', 1],
    ['A friend is detained', 'Your friend is stopped. The officer asks if you can confirm his identity.', 2],
  ];
  const polChoices = sev => [
    { t: 'Calmly hand over your documents', r: s => {
      const p = RU.problems(s);
      if (!p.length) return gamble(0.9 - 0.1 * sev, O('The documents check out. You are on your way within minutes.', { stress: 3 }), O('"Come with us for verification." You lose two hours at the station.', { stress: 9, energy: -10 }));
      return gamble(0.3 - 0.05 * sev, O(`The officer spots a problem (${p[0]}) but lets you go with a warning.`, { stress: 12 }), O(`A protocol is drawn up: ${p[0]}. Fine and a recorded violation.`, { money: -5000 * sev, strike: 1, stress: 15 }));
    } },
    { t: 'Ask politely for his name, rank and reason; mention a lawyer or consulate', r: s => {
      const p = RU.problems(s);
      if (!p.length) return gamble(0.85, O('He notes your politeness and steps back. Rights respected.', { rep: 2, stress: 2 }), O('He sighs and checks you slowly anyway.', { stress: 6, energy: -6 }));
      return gamble(0.45 + s.know / 300, O('Paperwork annoys him more than it annoys you. He lets you go.', { stress: 8, rep: 1 }), O(`He proceeds regardless: ${p[0]}.`, { money: -4000 * sev, strike: 1, stress: 12 }));
    } },
    { t: 'Offer money to "settle it here" (illegal — bribery)', r: s => gamble(0.4, O('He pockets the money, unseen. You feel dirty.', { money: -3000 * sev, stress: 10, rep: -2 }), O('"Attempted bribery." The tone has changed.', { money: -15000, strike: 1, stress: 20, rep: -4 })) },
    { t: 'Walk away quickly / run', r: s => gamble(RU.problems(s).length ? 0.2 : 0.4, O('They do not follow. Your heart pounds for an hour.', { stress: 12, energy: -10 }), O('They stop you within thirty metres. Resisting makes it worse.', { money: -5000, strike: 1, stress: 18 })) },
  ];
  places.forEach((place, i) => sits.forEach(([title, text, sev], j) => {
    S({ id: `pol-${i}-${j}`, cat: 'police', title: `${title} at ${place}`, text: `At ${place}. ${text}`, choices: polChoices(sev) });
  }));

  /* =================== EDUCATION =================== */
  const subjects = ['Russian language', 'Profile mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Social studies', 'Literature', 'Informatics', 'English', 'Geography'];
  const exSits = [
    ['Mock exam', s => O('The results show weak spots.', { know: 3, stress: 4 })],
    ['Tutor session', s => O('A tutor charges ₽2,500 an hour and is worth it.', { know: 5, money: -2500 })],
    ['Cheat sheet temptation', s => gamble(0.35, O('You slip a note in your sleeve and nobody sees. Guilt follows.', { know: 1, stress: 8, rep: -1 }), O('Caught: disqualified from the day\'s exam.', { know: -2, stress: 20, rep: -5 }))],
    ['Group study', s => O('You and three friends cover a year of material in a weekend.', { know: 4, stress: -2, rep: 1 })],
    ['Late-night cramming', s => O('Coffee, energy drinks and a headache.', { know: 4, health: -3, stress: 6, energy: -12 })],
    ['Appeal of a mark', s => gamble(0.35, O('The commission adds 3 points.', { know: 2, stress: -3 }), O('The appeal commission lowers your mark.', { stress: 10, know: -1 }))],
  ];
  subjects.forEach((sub, i) => exSits.forEach(([t, fn], j) => S({ id: `ege-${i}-${j}`, cat: 'edu', title: `${sub}: ${t}`, text: `Preparing ${sub}. Situation: ${t.toLowerCase()}.`, choices: [
    { t: 'Go all in', r: fn }, { t: 'Take it easy', r: () => O('Less pressure, less progress.', { know: 1, stress: -3 }) } ] })));

  const unis = ['Lomonosov Moscow State University', 'HSE', 'MGIMO', 'Bauman MSTU', 'Saint Petersburg State University', 'ITMO', 'RUDN', 'Kazan Federal University', 'Ural Federal University', 'Novosibirsk State University', 'Tomsk Polytechnic', 'MEPhI', 'Sechenov University', 'Pirogov Medical University', 'Far Eastern Federal University', 'Southern Federal University', 'Samara University', 'MPGU (Pedagogical)', 'Gubkin Oil University', 'Moscow Conservatory'];
  const admSits = [
    ['Budget places competition', 'There are 40 budget places for 600 applicants. The list changes every night.', s => O(s.know > 50 ? 'You climb to 28th place.' : 'You slide to 140th.', { stress: 8, know: 1 })],
    ['Olympiad bonus points', 'An olympiad diploma would give +10 points.', s => gamble(0.3 + s.know / 200, O('You win a bronze prize.', { know: 3, stress: 4, flag: 'olymp' }), O('You just miss.', { stress: 6 }))],
    ['Dormitory lottery', 'Beds are limited; the commission prioritises low-income applicants.', s => gamble(0.5, O('A bed in the dorm: ₽600 per month.', { stress: -6 }), O('You rent a corner instead.', { stress: 6, money: -3000 }))],
    ['Target contract', 'A regional company offers a "target contract": study free, work for them for three years afterwards.', s => O('You sign a contract to secure a place; freedom is the price.', { know: 2, stress: -4, rep: 1 })],
    ['Entrance interview', 'A professor in a creaky chair asks about your motivation.', s => gamble(0.4 + s.know / 200, O('He nods warmly.', { rep: 3, know: 2 }), O('You freeze on the third question.', { stress: 9 }))],
    ['Paid vs. budget', 'The admissions office offers a paid place immediately — ₽280,000 per year.', s => O('You do the maths; your hands sweat.', { stress: 5 })],
    ['Preparatory faculty', 'For foreigners: a one-year preparatory faculty teaches Russian and basic subjects.', s => O('A year of language drills and borscht.', { know: 4, money: -800 })],
    ['Documents deadline', 'Originals of your certificate must be delivered by 18:00 on the last day.', s => gamble(0.75, O('You rush through traffic and make it by 17:42.', { stress: 10, energy: -10 }), O('The office closed two minutes earlier.', { stress: 15, know: -1 }))],
  ];
  unis.forEach((u, i) => admSits.forEach(([t, desc, fn], j) => S({ id: `adm-${i}-${j}`, cat: 'edu', title: `${u}: ${t}`, text: `${desc} (Applying to ${u}.)`, choices: [
    { t: 'Handle it properly', r: fn }, { t: 'Postpone', r: () => O('Time passes.', { stress: 2 }) } ] })));

  /* =================== PAPERWORK =================== */
  const docs = ['Registration notice', 'Patent receipt', 'Work contract', 'Residence permit (RVP)', 'Residence card (VNZh)', 'Citizenship application', 'Military ID', 'SNILS (pension number)', 'INN (tax number)', 'Driver\'s licence', 'Medical certificate', 'Russian language test certificate', 'Fingerprint & photo registration', 'Gosuslugi confirmed account', 'Health insurance (OMS)'];
  const issues = [
    ['Endless queue', s => O('You get number 187. It is 09:00; the office closes at 17:00.', { energy: -12, stress: 6 }), 'Wait it out'],
    ['Missing stamp', s => O('A clerk asks for a document you were never told about.', { stress: 8, energy: -8 }), 'Argue politely'],
    ['Notarised translation', s => O('A translator charges ₽2,500 per page.', { money: -2500, stress: 3 }), 'Pay'],
    ['Name spelling mismatch', s => gamble(0.5, O('They fix the spelling after a signed statement.', { stress: 6 }), O('The mismatch means starting over.', { stress: 12, energy: -10 })), 'Insist on a fix'],
    ['A fixer offers a shortcut', s => gamble(0.3, O('A genuine shortcut — you are lucky.', { money: -4000 }), O('The shortcut is a scam.', { money: -4000, stress: 10, strike: 1 })), 'Pay the fixer'],
    ['The website crashes', s => O('"Service temporarily unavailable". You try again at midnight.', { stress: 5, energy: -6 }), 'Retry'],
    ['New rule announced', s => O('A new requirement appears on the notice board and nobody can explain it.', { stress: 7, know: 1 }), 'Read the fine print'],
    ['A kind clerk', s => O('The clerk quietly helps you and says it is "not common practice, but fine".', { stress: -8, rep: 2 }), 'Thank them'],
  ];
  docs.forEach((d, i) => issues.forEach(([t, fn, label], j) => S({ id: `paper-${i}-${j}`, cat: 'paper', title: `${d}: ${t}`, text: `You work on the ${d.toLowerCase()}. Problem: ${t.toLowerCase()}.`, choices: [
    { t: label, r: fn }, { t: 'Come back tomorrow', r: () => O('Another day lost.', { stress: 3 }) } ] })));

  /* =================== HOUSING =================== */
  const cities = ['Moscow', 'Saint Petersburg', 'Kazan', 'Yekaterinburg', 'Novosibirsk', 'Krasnodar', 'Sochi', 'Vladivostok', 'Grozny', 'Nizhny Novgorod', 'Samara', 'Kaliningrad'];
  const houseSits = [
    ['Landlord raises the rent', s => gamble(0.5, O('You negotiate it down by half.', { money: -1000, stress: 4 }), O('He shows you a queue of other tenants.', { money: -3000, stress: 7 }))],
    ['Hostel bunk next to a snorer', s => O('You buy earplugs and survive.', { energy: -10, stress: 6, money: -300 })],
    ['Noisy neighbours', s => O('The neighbours party until 3 a.m. You discover the joy of the police number.', { energy: -12, stress: 8 })],
    ['Heating is off', s => O('The radiator is cold in October. An electric heater costs ₽2,000.', { money: -2000, health: -2, stress: 5 })],
    ['Twelve people in the flat', s => O('Everyone cooks at 7 p.m. Everyone leaves dishes.', { stress: 8, rep: 1 })],
    ['Landlord visits unannounced', s => O('He checks the bathroom and counts the guests.', { stress: 6 })],
    ['"Fictitious registration" offered', s => gamble(0.35, O('It works on paper.', { money: -4000, docs: { reg: 30 } }), O('The address has 150 registered people. Authorities notice.', { money: -4000, strike: 1, stress: 10 }))],
    ['Cockroaches and mould', s => O('You scrub for three hours. The cockroaches return.', { energy: -12, stress: 6, health: -2 })],
    ['Utility bills pile up', s => O('Water, electricity, internet: ₽2,300 for the month.', { money: -2300, stress: 3 })],
  ];
  cities.forEach((c, i) => houseSits.forEach(([t, fn], j) => S({ id: `home-${i}-${j}`, cat: 'home', req: s => s.city === c, title: `${c}: ${t}`, text: `Life in ${c}. ${t}.`, choices: [
    { t: 'Deal with it', r: fn }, { t: 'Ignore it and sleep', r: () => O('You sleep, but the problem stays.', { energy: 8, stress: 4 }) } ] })));
  cities.forEach((c, i) => S({ id: `move-${i}`, cat: 'home', req: s => s.city !== c && s.money > 8000, w: 0.4, title: `Move to ${c}?`, text: `A friend says there is a better job market in ${c}. Moving costs ₽6,000 and new registration.`, choices: [
    { t: 'Move', r: s => O(`You pack your bags and take the train to ${c}.`, { city: c, money: -6000, setDocs: { reg: 0 }, stress: 8 }) },
    { t: 'Stay', r: () => O('You stay put.', {}) } ] }));

  /* =================== FOOD =================== */
  const dishes = ['shawarma', 'borscht', 'pelmeni', 'plov', 'buckwheat with sausage', 'blini', 'shashlik', 'khachapuri', 'olivier salad', 'manti', 'pirozhki', 'kebab', 'lagman', 'samsa', 'kholodets', 'okroshka', 'vareniki', 'shchi', 'syrniki', 'kvass and bread'];
  const foodSits = [
    ['Cheap and wonderful', s => O('A perfect meal for ₽250.', { energy: 8, stress: -5 })],
    ['Food poisoning risk', s => gamble(0.3, O('A bad stomach for 24 hours.', { health: -10, energy: -15 }), O('You get away with it.', { stress: 2 }))],
    ['Price shock', s => O('Prices doubled in one month. You pay anyway.', { money: -400, stress: 4 })],
    ['Shared with a friend', s => O('A friend insists on paying.', { money: 200, stress: -6, rep: 2 })],
    ['Taste of home', s => O('You taste home. The homesickness hits harder.', { stress: -8, money: -150 })],
    ['Prejudice at the café', s => gamble(0.6, O('The waiter is kind after all.', { stress: -2 }), O('The waiter ignores you for 15 minutes.', { stress: 7 }))],
    ['Free lunch from the boss', s => O('He puts a pot of soup on the table: "Eat, you look thin."', { energy: 10, rep: 2 })],
    ['Wrong order delivered', s => O('Courier brings someone else\'s food — and a smile.', { energy: 5 })],
  ];
  dishes.forEach((d, i) => foodSits.forEach(([t, fn], j) => S({ id: `food-${i}-${j}`, cat: 'food', title: `${d[0].toUpperCase() + d.slice(1)}: ${t}`, text: `Lunchtime: ${d}. ${t}.`, choices: [
    { t: 'Enjoy it', r: fn }, { t: 'Skip the meal', r: () => O('Hunger makes you irritable.', { energy: -8, stress: 4, money: 250 }) } ] })));

  /* =================== SOCIAL =================== */
  const persons = ['an elderly neighbour', 'a taxi driver', 'a colleague', 'your roommate', 'the landlord\'s son', 'a classmate', 'a war veteran at the bus stop', 'a street musician', 'a hostel manager', 'a university professor', 'a volunteer lawyer', 'a fellow countryman'];
  const socSits = [
    ['invites you for tea', s => O('Tea and a long conversation.', { stress: -8, rep: 3, money: -100 })],
    ['asks for help carrying groceries', s => O('You carry the bags up five floors. A blessing follows.', { energy: -6, rep: 3 })],
    ['gives unsolicited life advice', s => O('Half is nonsense, half is gold.', { know: 2, stress: 2 })],
    ['offers a side job', s => gamble(0.6, O('A one-day job pays ₽2,500.', { money: 2500, energy: -12 }), O('The "job" is a pyramid scheme.', { stress: 6 }))],
    ['gossips about a raid', s => O('"Be careful at Sadovod this week", they whisper.', { stress: 4, know: 1 })],
    ['asks where you are from', s => O('The conversation lasts all the way to your stop.', { stress: -4, rep: 2 })],
    ['shares a rumour about new rules', s => O('Nobody knows if it is true, but the chat is full of it.', { stress: 5 })],
    ['argues about football', s => O('A passionate dispute about Zenit vs Spartak.', { stress: -5, rep: 1 })],
  ];
  persons.forEach((p, i) => socSits.forEach(([t, fn], j) => S({ id: `soc-${i}-${j}`, cat: 'social', title: `${p[0].toUpperCase() + p.slice(1)} ${t}`, text: `On the way, ${p} ${t}.`, choices: [
    { t: 'Engage', r: fn }, { t: 'Politely decline', r: () => O('You smile and move on.', {}) } ] })));

  /* =================== FAMILY =================== */
  const relatives = ['your mother', 'your father', 'your older brother', 'your younger sister', 'your grandmother', 'your uncle'];
  const famSits = [
    ['asks for money', s => s.money < 5000 ? O('You do not have enough. Guilt follows.', { stress: 8 }) : O('You send ₽5,000.', { money: -5000, stress: -6 })],
    ['is sick', s => O('You arrange a call with a doctor.', { money: -2000, stress: 8 })],
    ['has good news', s => O('A wedding is planned! You feel joy and distance.', { stress: -8 })],
    ['asks when you are coming home', s => O('You do not know. You say "soon".', { stress: 6 })],
    ['sends food via a driver', s => O('Parcel of dried fruit and bread arrives.', { stress: -8, energy: 8 })],
    ['worries about the news', s => O('You reassure them you are fine.', { stress: 3 })],
    ['asks you to apply for family reunification', s => O('You discover the paperwork is longer than the journey.', { stress: 6, know: 1 })],
    ['jokes about your accent', s => O('Laughter across 3,000 kilometres.', { stress: -10 })],
  ];
  relatives.forEach((r, i) => famSits.forEach(([t, fn], j) => S({ id: `fam-${i}-${j}`, cat: 'family', title: `${r[0].toUpperCase() + r.slice(1)} ${t}`, text: `Phone call: ${r} ${t}.`, choices: [
    { t: 'Respond', r: fn }, { t: 'Let it ring', r: () => O('You call back tomorrow.', { stress: 3 }) } ] })));

  RU.index();
  RU.countStats = function () {
    const by = {};
    RU.scenarios.forEach(sc => { by[sc.cat] = (by[sc.cat] || 0) + 1; });
    return { total: RU.scenarios.length, by };
  };
})();
