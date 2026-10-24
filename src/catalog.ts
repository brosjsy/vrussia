/* The catalogue of what people do in daily life, and what of it the game has. Not loaded by the game: it is the plan. A test writes
   docs/ACTIVITIES.md from it and checks that every "sys" entry names a file that exists.
   sys   = a feature the player can use whenever they choose (a screen, an action, an app), in the file named
   scene = only in the life scenes (the 4,000+ cards with choices): it happens to the player, they cannot start it themselves
   todo  = not in the game yet; built in batches, a category at a time */
import { ACTS, CATS } from './lifeacts';
import { MORE } from './lifeacts-more';
export type Status = 'sys' | 'scene' | 'todo';
export interface Activity { id: string; name: string; status: Status; where?: string }
export interface Category { id: string; name: string; items: Activity[] }
const A = (id: string, name: string, status: Status, where?: string): Activity => ({ id, name, status, where });

export const CATALOG: Category[] = [
  { id: 'home', name: 'At home: the daily routine', items: [
    A('sleep', 'Sleep and rest', 'sys', 'src/engine.ts'), A('hygiene', 'Wash, shower, brush teeth (hygiene need)', 'sys', 'src/needs.ts'), A('toilet', 'Toilet (bladder need)', 'sys', 'src/needs.ts'),
    A('dress', 'Get dressed for the weather (clothes)', 'sys', 'src/engine.ts'), A('breakfast', 'Cook breakfast, lunch, dinner', 'sys', 'src/cooking.ts'), A('laundry', 'Do the laundry (machine or laundromat)', 'sys', 'src/chores.ts'),
    A('dishes', 'Wash the dishes', 'sys', 'src/homelife.ts'), A('clean', 'Clean the flat, vacuum', 'sys', 'src/homelife.ts'), A('rubbish', 'Take out the rubbish, sort waste', 'sys', 'src/homelife.ts'), A('plants', 'Water the plants', 'sys', 'src/homelife.ts'),
    A('furnish', 'Buy and place furniture', 'sys', 'src/furniture.ts'), A('renovate', 'Renovate the flat', 'sys', 'src/furn-ui.ts'), A('repair', 'Fix things at home (a tap, a socket), call a handyman', 'sys', 'src/homelife.ts'),
    A('utilities', 'Pay rent and utilities', 'sys', 'src/housing.ts'), A('internet', 'Home internet and the mobile plan', 'sys', 'src/chores.ts'), A('neighbours', 'Neighbours: greet, borrow, complain', 'sys', 'src/lifeacts.ts'),
    A('alarm', 'Set an alarm, oversleep', 'sys', 'src/homelife.ts'), A('keys', 'Lose the keys, call a locksmith', 'sys', 'src/homelife.ts'), A('tv', 'Watch TV and series', 'sys', 'src/homelife.ts'), A('read', 'Read a book', 'sys', 'src/homelife.ts'), A('nap', 'Take a nap', 'sys', 'src/homelife.ts'),
  ] },
  { id: 'housing', name: 'Housing', items: [
    A('rent', 'Find and rent a flat or room', 'sys', 'src/housing.ts'), A('move', 'Move to another flat', 'sys', 'src/housing.ts'), A('mortgage', 'Buy a flat, take a mortgage', 'sys', 'src/engine.ts'),
    A('build', 'Build your own house', 'sys', 'src/build.ts'), A('dorm', 'Live in a dormitory', 'scene'), A('dacha', 'Go to the dacha, grow vegetables', 'sys', 'src/lifeacts.ts'), A('landlord', 'Disputes with the landlord, the deposit back', 'scene'),
    A('registration_home', 'Register at the address', 'sys', 'src/content/core.ts'), A('sell_flat', 'Sell a flat', 'sys', 'src/lifeacts.ts'), A('let_out', 'Let out a room to someone', 'sys', 'src/lifeacts.ts'),
  ] },
  { id: 'food', name: 'Food and drink', items: [
    A('groceries', 'Buy groceries', 'sys', 'src/cooking.ts'), A('cook', 'Cook a recipe', 'sys', 'src/cooking.ts'), A('cookchallenge', 'Cook any of over 1,000 dishes step by step: pick the ingredients, wash, peel, thaw, cook, keep the leftovers (the Kitchen app)', 'sys', 'src/cook.ts'), A('cafe', 'Eat in a café or canteen', 'sys', 'src/venues.ts'), A('delivery', 'Order food delivery', 'sys', 'src/lifeacts.ts'),
    A('shawarma', 'Street food', 'sys', 'src/lifeacts.ts'), A('tea', 'Tea with friends', 'sys', 'src/lifeacts.ts'), A('fasting', 'Fast for Ramadan or Lent', 'sys', 'src/lifeacts.ts'), A('diet', 'Eat healthy, count calories', 'sys', 'src/lifeacts.ts'), A('restaurant', 'A restaurant evening', 'sys', 'src/venues.ts'), A('market_food', 'Buy at the market, haggle', 'sys', 'src/lifeacts.ts'),
  ] },
  { id: 'health', name: 'Health and body', items: [
    A('polyclinic', 'See a doctor at the polyclinic', 'sys', 'src/engine.ts'), A('hospital', 'Hospital stay', 'sys', 'src/content/core.ts'), A('pharmacy', 'Buy medicine at a pharmacy', 'sys', 'src/lifeacts.ts'), A('dentist', 'Go to the dentist', 'sys', 'src/lifeacts.ts'),
    A('insurance', 'Health insurance (OMS, DMS, for a patent)', 'sys', 'src/lifeacts.ts'), A('medexam', 'The medical exam for a patent', 'sys', 'src/content/core.ts'), A('gym', 'Go to the gym', 'sys', 'src/lifeacts.ts'), A('run', 'Go running, cycling', 'sys', 'src/lifeacts.ts'), A('yoga', 'Yoga, stretching', 'sys', 'src/lifeacts.ts'),
    A('sickleave', 'Take sick leave', 'sys', 'src/lifeacts.ts'), A('ambulance', 'Call an ambulance (103)', 'sys', 'src/lifeacts.ts'), A('vaccine', 'Get vaccinated', 'sys', 'src/lifeacts.ts'), A('therapy', 'See a psychologist', 'sys', 'src/lifeacts.ts'), A('haircut', 'Haircut, barber, manicure', 'sys', 'src/lifeacts.ts'), A('banya', 'Go to the banya', 'sys', 'src/lifeacts.ts'), A('blood', 'Donate blood', 'sys', 'src/lifeacts.ts'),
  ] },
  { id: 'work', name: 'Work and career', items: [
    A('jobsearch', 'Look for a job', 'sys', 'src/engine.ts'), A('shift', 'Work a shift', 'sys', 'src/engine.ts'), A('career', 'Be promoted', 'sys', 'src/career.ts'), A('gigs', 'Courier and barista shifts (mini-games)', 'sys', 'src/gigs.ts'),
    A('stateservice', 'Work for the state: police, customs, tax, MFC, railways, post', 'sys', 'src/service.ts'), A('commute', 'Commute: the hour, the way, parking', 'sys', 'src/service.ts'), A('clockin', 'Clock in and out, overtime, lateness', 'sys', 'src/service.ts'),
    A('colleagues', 'Colleagues: lunch, relations', 'sys', 'src/service.ts'), A('business', 'Run a small business', 'sys', 'src/engine.ts'), A('installer', 'Mount adverts for an agency', 'sys', 'src/adspace.ts'), A('freelance', 'Freelance work online', 'sys', 'src/lifeacts.ts'),
    A('quit', 'Quit, be fired', 'sys', 'src/service.ts'), A('union', 'Labour disputes, unpaid wages', 'sys', 'src/lifeacts.ts'), A('interview', 'A job interview', 'sys', 'src/service.ts'), A('cv', 'Write a CV, apply on a job site', 'sys', 'src/service.ts'), A('selfemployed', 'Register as self-employed', 'sys', 'src/lifeacts.ts'),
  ] },
  { id: 'money', name: 'Money and bank', items: [
    A('bank', 'Open a bank account, cards', 'sys', 'src/engine.ts'), A('transfer', 'Send money, transfers home', 'sys', 'src/phone.ts'), A('savings', 'Savings and deposits', 'sys', 'src/budget.ts'), A('loan', 'Take a loan', 'sys', 'src/engine.ts'),
    A('budget', 'Plan a budget', 'sys', 'src/budget.ts'), A('tax', 'Pay taxes', 'sys', 'src/lifeacts.ts'), A('scamcall', 'Spot a scam call', 'sys', 'src/phone.ts'), A('sellstuff', 'Sell old things (small ads)', 'sys', 'src/ads.ts'), A('lottery', 'Buy a lottery ticket', 'sys', 'src/lifeacts.ts'), A('pension', 'Pension, benefits', 'scene'),
  ] },
  { id: 'study', name: 'Study', items: [
    A('university', 'Enter a university', 'sys', 'src/engine.ts'), A('courses', 'Courses, lectures, homework, exams', 'sys', 'src/study.ts'), A('russian', 'Learn Russian words', 'sys', 'src/study.ts'), A('library', 'Go to the library', 'sys', 'src/lifeacts.ts'),
    A('drivingschool', 'Driving school and the licence', 'sys', 'src/lifeacts.ts'), A('school_kids', 'Children\'s school and kindergarten', 'scene'), A('exam_lang', 'The language, history and law exam for migrants', 'scene'),
  ] },
  { id: 'papers', name: 'Documents and the state', items: [
    A('visa', 'Apply for a visa at home: form, appointment, interview', 'sys', 'src/prearrival.ts'), A('migcard', 'The migration card at the border', 'sys', 'src/prearrival.ts'), A('reg', 'Registration', 'sys', 'src/content/core.ts'), A('patent', 'The work patent', 'sys', 'src/content/core.ts'),
    A('rvp', 'Temporary residence, permanent residence, citizenship', 'sys', 'src/content/core.ts'), A('mfc', 'The MFC and 14 online services', 'sys', 'src/forms.ts'), A('fines', 'Pay fines', 'sys', 'src/content/core.ts'), A('vote', 'Vote, stand for office', 'sys', 'src/election.ts'),
    A('lostpassport', 'Lose the passport and restore it', 'sys', 'src/lifeacts.ts'), A('consulate', 'Go to your country\'s consulate', 'sys', 'src/lifeacts.ts'), A('marriage_reg', 'Register a marriage (ZAGS)', 'sys', 'src/lifeacts.ts'),
  ] },
  { id: 'transport', name: 'Getting around', items: [
    A('walk', 'Walk', 'sys', 'src/service.ts'), A('metro', 'The metro (real lines, a route planner)', 'sys', 'src/metro-ui.ts'), A('bus', 'Bus, tram, the transport card', 'sys', 'src/chores.ts'), A('taxi', 'Taxi', 'sys', 'src/service.ts'),
    A('car', 'Buy a car, drive, fuel, parking', 'sys', 'src/engine.ts'), A('trains', 'Trains between cities', 'sys', 'src/trains.ts'), A('flights', 'Book a flight', 'sys', 'src/flights.ts'), A('scooter', 'Rent a bike or a scooter', 'sys', 'src/lifeacts.ts'), A('carsharing', 'Carsharing', 'sys', 'src/lifeacts.ts'), A('trafficstop', 'Stopped by traffic police', 'scene'), A('accident', 'A road accident, insurance', 'scene'),
  ] },
  { id: 'social', name: 'People and family', items: [
    A('call', 'Phone a friend or family', 'sys', 'src/phone.ts'), A('messages', 'Messages and chat', 'sys', 'src/phone.ts'), A('friends', 'Make friends', 'sys', 'src/engine.ts'), A('dating', 'Dating', 'sys', 'src/dating.ts'),
    A('partner', 'A partner, moving in together', 'sys', 'src/engine.ts'), A('wedding', 'A wedding', 'sys', 'src/lifeacts.ts'), A('kids', 'Have children, raise them', 'sys', 'src/engine.ts'), A('callhome', 'Call home, send money to the family', 'sys', 'src/phone.ts'),
    A('party', 'Throw a party, invite people (an advert)', 'sys', 'src/adspace.ts'), A('guests', 'Have guests at home', 'sys', 'src/lifeacts.ts'), A('gifts', 'Give gifts', 'sys', 'src/cloud-ui.ts'), A('breakup', 'Break up, divorce', 'sys', 'src/lifeacts.ts'), A('funeral', 'A funeral, grief (it comes as a scene)', 'scene', 'src/lifeacts.ts'), A('birthday', 'Celebrate a birthday', 'sys', 'src/lifeacts.ts'),
  ] },
  { id: 'leisure', name: 'Free time and culture', items: [
    A('venues', 'Go out: 11 kinds of places', 'sys', 'src/venues.ts'), A('museum', 'Museums and landmarks (photos)', 'sys', 'src/photo.ts'), A('cinema', 'The cinema', 'sys', 'src/lifeacts.ts'), A('theatre', 'The theatre, the ballet', 'sys', 'src/lifeacts.ts'), A('concert', 'A concert', 'sys', 'src/lifeacts.ts'),
    A('park', 'A walk in the park', 'sys', 'src/venues.ts'), A('games', 'Play games on the phone', 'sys', 'src/games.ts'), A('sport_watch', 'Watch football', 'sys', 'src/lifeacts.ts'), A('skating', 'Ice skating, skiing', 'sys', 'src/lifeacts.ts'), A('fishing', 'Fishing', 'sys', 'src/lifeacts.ts'),
    A('holidays', 'Holidays: New Year, Maslenitsa, Victory Day, City Day', 'sys', 'src/events.ts'), A('trip', 'A trip to another city', 'sys', 'src/trains.ts'), A('hobby', 'A hobby (music, drawing, sport club)', 'sys', 'src/lifeacts.ts'), A('church', 'Church, mosque, synagogue', 'sys', 'src/lifeacts.ts'), A('photo', 'Take photos', 'sys', 'src/photo.ts'),
  ] },
  { id: 'shopping', name: 'Shopping', items: [
    A('shop', 'Shop for clothes, electronics, home goods', 'sys', 'src/shop.ts'), A('phone_buy', 'Buy or repair a phone', 'sys', 'src/engine.ts'), A('parcels', 'Order online, collect parcels', 'sys', 'src/lifeacts.ts'), A('returns', 'Return a broken thing', 'sys', 'src/lifeacts.ts'), A('market', 'The market', 'sys', 'src/lifeacts.ts'), A('pets_buy', 'Pet food and the vet', 'sys', 'src/engine.ts'),
  ] },
  { id: 'pets', name: 'Pets', items: [ A('adopt', 'Adopt a pet', 'sys', 'src/engine.ts'), A('walkdog', 'Walk the dog', 'sys', 'src/lifeacts.ts'), A('vet', 'The vet', 'sys', 'src/lifeacts.ts') ] },
  { id: 'law', name: 'Law and order', items: [
    A('steal', 'Steal: shoplifting, pickpocketing', 'sys', 'src/law.ts'), A('offences', 'Small offences: fare dodging, drinking in public, a fight', 'sys', 'src/law.ts'), A('caught', 'Caught: the station, the protocol, the court', 'sys', 'src/law.ts'),
    A('sentence', 'Sentences: a fine, days of arrest, suspended, the colony', 'sys', 'src/law.ts'), A('record', 'A criminal record and its consequences', 'sys', 'src/law.ts'), A('laterarrest', 'Arrested later from the cameras', 'sys', 'src/law.ts'),
    A('robbed', 'Robbed: metro, street, burglary', 'sys', 'src/law.ts'), A('call102', 'Call 102/112, a statement, the investigation', 'sys', 'src/law.ts'), A('witness', 'Witness a crime: call the police, step in, look away', 'sys', 'src/law.ts'),
    A('raids', 'Migration police raids for undocumented foreigners', 'sys', 'src/law.ts'), A('expulsion', 'Detention, the court, expulsion, the entry ban', 'sys', 'src/law.ts'), A('register', 'The register of controlled persons', 'sys', 'src/law.ts'),
    A('rights', 'Know your rights with the police', 'sys', 'src/law.ts'), A('lawyer', 'Hire a lawyer', 'sys', 'src/law.ts'), A('bribe', 'Bribes and internal security (as an official)', 'sys', 'src/service.ts'), A('arrest_others', 'As a police officer: checks, arrests, cases', 'sys', 'src/service.ts'),
    A('fraud', 'Fraud and scams against the player', 'sys', 'src/phone.ts'), A('drugs', 'The drug-courier offer: refuse, report, or take it (UK 228.1)', 'scene', 'src/law.ts'), A('appeal', 'Appeal a court decision', 'sys', 'src/lifeacts.ts'),
  ] },
  { id: 'civic', name: 'City and community', items: [
    A('cityvote', 'The city vote online', 'sys', 'src/cloud-ui.ts'), A('decrees', 'The city\'s weekly decree', 'sys', 'src/decrees.ts'), A('volunteer', 'Volunteer', 'sys', 'src/lifeacts.ts'), A('donate', 'Donate to a cause', 'sys', 'src/lifeacts.ts'), A('ads_board', 'Small ads on the board', 'sys', 'src/ads.ts'), A('advertise', 'Rent a billboard, the metro, the city screen', 'sys', 'src/adspace.ts'),
  ] },
  { id: 'online', name: 'Online with other players', items: [
    A('account', 'An account, log in, reset the password', 'sys', 'src/api-client.ts'), A('chat', 'Chat at places, private messages', 'sys', 'src/cloud-ui.ts'), A('challenges', '80 challenges with other players', 'sys', 'src/cloud-ui.ts'), A('leaderboard', 'The leaderboard', 'sys', 'src/cloud-ui.ts'),
    A('homes', 'Show your home, visit others, the guest book', 'sys', 'src/cloud-ui.ts'), A('friends_online', 'Follow, friends, co-op challenges', 'sys', 'src/cloud-ui.ts'), A('adverts_online', 'Adverts seen by real players', 'sys', 'src/adspace-ui.ts'),
  ] },
];
/* Every City life activity (lifeacts.ts and the short lines of lifeacts-more.ts) that is not already an entry above, by its category: they are all built. */
{
  const known = new Set(CATALOG.flatMap(c => c.items.map(i => i.id)).concat(ACTS.map(x => x.cat2 ?? '').filter(Boolean))), more = new Set(MORE.map(r => r[0]));
  for (const c of CATS) {
    const items = ACTS.filter(x => x.cat === c.id && !x.cat2 && !known.has(x.id)).map(x => A(x.id, x.name, 'sys', more.has(x.id) ? 'src/lifeacts-more.ts' : 'src/lifeacts.ts'));
    if (items.length) CATALOG.push({ id: 'life-' + c.id, name: 'City life: ' + c.name.toLowerCase(), items });
  }
}
export const counts = (): Record<Status, number> => { const c: Record<Status, number> = { sys: 0, scene: 0, todo: 0 }; for (const k of CATALOG) for (const a of k.items) c[a.status]++; return c; };
