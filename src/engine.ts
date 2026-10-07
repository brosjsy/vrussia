/* V Russia — game engine. DOM-free: runs in the browser and in Node tests. */

export type Status = 'citizen' | 'migrant' | 'eaeu' | 'student';
export type Weather = 'snow' | 'frost' | 'rain' | 'heat' | 'clear';
export type EndingId = 'hospital' | 'deported' | 'debt' | 'time';

export interface Docs { reg: number; patent: number; visa: number }
export interface Partner { name: string; kind: 'citizen' | 'compatriot' | 'foreigner'; love: number }

export interface Effects {
  money?: number; energy?: number; health?: number; stress?: number; rep?: number; know?: number;
  strike?: number; docs?: Partial<Docs>; setDocs?: Partial<Docs>;
  flag?: string | string[]; unflag?: string | string[];
  clothes?: number; merit?: number; friends?: number; famLove?: number; kids?: number; love?: number;
  partner?: Partner | null; bank?: string | string[]; unbank?: string;
  mark?: string | string[]; dest?: string | null; loc?: string;
  job?: string | null; city?: string; status?: Status; queue?: string; skip?: number;
  phone?: number; setRent?: number;
  /** Escape hatch for complex state changes (bookings, purchases, pets...). */
  run?: (s: State) => void;
  /** Ask the UI to open an interactive screen after this result. */
  ui?: 'booking';
}
export interface Booking {
  dest: string; intl: boolean; dep: number; stay: number; price: number; pnr: string;
  passenger: string; passport: string; baggage: boolean; done: boolean;
}
export interface Pet { name: string; kind: string; bond: number }
export interface Car { model: string; value: number }
export interface Outcome { msg: string; fx: Effects }
export interface Choice { t: string; r?: (s: State) => Outcome; msg?: string; fx?: Effects }
export interface Scenario {
  id: string; cat: string; title: string; text: string; choices: Choice[];
  who?: string[]; req?: (s: State) => unknown; w?: number; once?: boolean; free?: boolean;
  months?: number[]; dynamic?: boolean; map?: boolean;
}
export interface Job { id: string; name: string; pay: number; energy: number; stress: number; line: string; min?: number; cit?: boolean }
export interface Origin {
  id: string; label: string; icon: string; status: Status; home: string; city: string;
  money: number; allow: number; rent: number; know: number; rep: number; blurb: string; docs: Partial<Docs>;
}
export interface Place { id: string; n: string; x: number; y: number }
export interface Note { k: string; v: number; label: string }
export interface LogEntry { day: number; text: string }

export interface State {
  name: string; o: string; label: string; icon: string; status: Status; home: string; city: string;
  day: number; slot: number; money: number; energy: number; health: number; stress: number; rep: number; know: number;
  strikes: number; docs: Docs; flags: Record<string, boolean>; job: string | null;
  seen: Record<string, number>; queue: string[]; log: LogEntry[]; rent: number; allow: number;
  over: EndingId | null; earned: number; version: number;
  marks: Record<string, number>; bank: Record<string, boolean>; loc: string; known: Record<string, boolean>;
  dest: string | null; weather: Weather; clothes: number; merit: number; partner: Partner | null; kids: number; friends: number; famLove: number;
  skip?: number;
  phone: number; car: Car | null; pet: Pet | null; housing: string; booking: Booking | null;
  tmp: Record<string, string | number>;
}

/* ---------- helpers ---------- */
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const rnd = (a: number, b: number): number => a + Math.floor(Math.random() * (b - a + 1));
export const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
export const O = (msg: string, fx?: Effects): Outcome => ({ msg, fx: fx || {} });
export const gamble = <T>(p: number, ok: T, bad: T): T => (Math.random() < p ? ok : bad);
export const money = (n: number): string => (n < 0 ? '−' : '') + '₽' + Math.abs(Math.round(n)).toLocaleString('en-US');

export const START = new Date(2026, 8, 1);
export const MAXDAY = 730;
export const SLOTS = ['Morning', 'Afternoon', 'Evening'];
export const dateOf = (s: State): Date => new Date(START.getTime() + s.day * 864e5);

/* ---------- registry ---------- */
export const scenarios: Scenario[] = [];
export const dyn: Record<string, (s: State) => Scenario> = {};
const byId: Record<string, Scenario> = {};
export const S = (sc: Scenario): Scenario => { scenarios.push(sc); return sc; };
export const index = (): void => { for (const k of Object.keys(byId)) delete byId[k]; scenarios.forEach(sc => { byId[sc.id] = sc; }); };
export const get = (id: string, s: State): Scenario | undefined => (dyn[id] ? dyn[id](s) : byId[id]);
export const fill = (str: string, s: State): string => String(str).replace(/\{name\}/g, s.name).replace(/\{city\}/g, s.city).replace(/\{home\}/g, s.home);
export const jobs: Job[] = [];
export const jobById = (id: string): Job => jobs.find(j => j.id === id) as Job;

/* ---------- origins, cities, map ---------- */
export const origins: Origin[] = [
  { id: 'moscow', label: 'Moscow Baby', icon: '🏙️', status: 'citizen', home: 'Moscow', city: 'Moscow', money: 450000, allow: 35000, rent: 0, know: 25, rep: 60,
    blurb: 'Rich parents, flat near Patriarshy. Your problem: boredom, and a father who "knows a guy".', docs: {} },
  { id: 'region', label: 'Regional Kid', icon: '🏚️', status: 'citizen', home: 'Saratov', city: 'Saratov', money: 6000, allow: 2000, rent: 1500, know: 12, rep: 40,
    blurb: 'Panelka block, mum works two jobs. Dream: budget place at a Moscow university.', docs: {} },
  { id: 'tajik', label: 'Tajik Migrant', icon: '🇹🇯', status: 'migrant', home: 'Khatlon, Tajikistan', city: 'Moscow', money: 18000, allow: 0, rent: 3500, know: 8, rep: 40,
    blurb: 'Off the train at Kazansky. 7 days to register, a patent to buy, a family waiting for remittances.', docs: { reg: 7, patent: 0 } },
  { id: 'uzbek', label: 'Uzbek Migrant', icon: '🇺🇿', status: 'migrant', home: 'Samarkand, Uzbekistan', city: 'Moscow', money: 20000, allow: 0, rent: 3500, know: 10, rep: 40,
    blurb: 'Cousin has a place in Moscow region. Needs registration, medical exam, patent — in that order.', docs: { reg: 7, patent: 0 } },
  { id: 'kyrgyz', label: 'Kyrgyz (EAEU) Worker', icon: '🇰🇬', status: 'eaeu', home: 'Osh, Kyrgyzstan', city: 'Moscow', money: 15000, allow: 0, rent: 3500, know: 10, rep: 45,
    blurb: 'EAEU citizen: no patent needed, but registration and a contract still matter.', docs: { reg: 30 } },
  { id: 'student', label: 'Foreign Student', icon: '🎓', status: 'student', home: 'Lagos, Nigeria', city: 'Kazan', money: 40000, allow: 0, rent: 1000, know: 30, rep: 50,
    blurb: 'Government-quota place in Kazan. Dorm, winter, visa extensions, and borscht.', docs: { reg: 60, visa: 300 } },
  { id: 'dagestan', label: 'Dagestani Student', icon: '🏔️', status: 'citizen', home: 'Makhachkala', city: 'Moscow', money: 25000, allow: 8000, rent: 4000, know: 30, rep: 50,
    blurb: 'Citizen from the Caucasus, big family, first time in the capital. Expect questions about where you are "really" from.', docs: {} },
];

export const CITIES = ['Moscow', 'Saint Petersburg', 'Kazan', 'Yekaterinburg', 'Novosibirsk', 'Krasnodar', 'Sochi', 'Vladivostok', 'Grozny', 'Nizhny Novgorod', 'Samara', 'Kaliningrad'];

export const PLACES: Place[] = [
  { id: 'home', n: 'Home', x: 50, y: 52 }, { id: 'station', n: 'Railway station', x: 14, y: 20 }, { id: 'mfc', n: 'MFC', x: 72, y: 24 },
  { id: 'guvm', n: 'Migration dept.', x: 88, y: 62 }, { id: 'uni', n: 'University', x: 30, y: 80 }, { id: 'market', n: 'Market', x: 12, y: 62 },
  { id: 'clinic', n: 'Polyclinic', x: 62, y: 84 }, { id: 'work', n: 'Workplace', x: 82, y: 40 }, { id: 'bank', n: 'Bank branch', x: 40, y: 28 },
  { id: 'center', n: 'City centre', x: 55, y: 10 }, { id: 'mall', n: 'Electronics mall', x: 28, y: 44 },
  { id: 'airport', n: 'Airport', x: 8, y: 88 }, { id: 'dealer', n: 'Car dealership', x: 80, y: 90 }, { id: 'agency', n: 'Real estate agency', x: 68, y: 60 },
  { id: 'hospital', n: 'City hospital', x: 46, y: 72 }, { id: 'shelter', n: 'Animal shelter', x: 90, y: 12 },
];
export const placeById = (id: string): Place => PLACES.find(p => p.id === id) as Place;
const PLACE_CATS: Record<string, string[]> = { mfc: ['paper'], guvm: ['paper'], uni: ['edu'], market: ['shop'], clinic: ['health'], bank: ['bank'], work: ['work'], center: ['social', 'police', 'life', 'culture'], station: ['police', 'life'], home: ['home'],
  mall: ['phone', 'shop'], airport: ['air'], dealer: ['car'], agency: ['estate'], hospital: ['hospital', 'health'], shelter: ['pets'] };
const SERVICE_PLACES = ['mall', 'airport', 'dealer', 'agency', 'hospital', 'shelter'];

export const WEATHER: Record<Weather, string> = { snow: '❄️ Snow', frost: '🥶 Hard frost', rain: '🌧️ Rain', heat: '☀️ Heat', clear: '⛅ Clear' };
export function weatherFor(date: Date): Weather {
  const m = date.getMonth() + 1, r = Math.random();
  if (m === 12 || m <= 2) return r < 0.45 ? 'snow' : r < 0.75 ? 'frost' : 'clear';
  if (m === 3 || m === 11) return r < 0.3 ? 'snow' : r < 0.6 ? 'rain' : 'clear';
  if (m === 4 || m === 10 || m === 9) return r < 0.4 ? 'rain' : 'clear';
  return r < 0.2 ? 'rain' : r < 0.45 ? 'heat' : 'clear';
}

export function newState(name: string, originId: string, city?: string): State {
  const o = origins.find(x => x.id === originId) || origins[0];
  const s: State = {
    name: name || 'Player', o: o.id, label: o.label, icon: o.icon, status: o.status, home: o.home, city: city || o.city,
    day: 0, slot: 0, money: o.money, energy: 80, health: 90, stress: 15, rep: o.rep, know: o.know,
    strikes: 0, docs: { reg: 0, patent: 0, visa: 0, ...o.docs }, flags: {}, job: null,
    seen: {}, queue: [], log: [], rent: o.rent, allow: o.allow, over: null, earned: 0, version: 4,
    phone: 1, car: null, pet: null, housing: 'rented', booking: null, tmp: {},
    marks: {}, bank: {}, loc: 'home', known: { home: true }, dest: null, weather: 'clear',
    merit: 0, clothes: o.id === 'moscow' ? 90 : o.status === 'citizen' ? 55 : 35, partner: null, kids: 0, friends: 1, famLove: 60,
  };
  s.weather = weatherFor(START);
  s.queue.push('intro_' + o.status);
  return s;
}

/* ---------- legal status ---------- */
export function problems(s: State): string[] {
  const p: string[] = [];
  if (s.status === 'citizen' || s.flags.rvp) return p;
  if (s.docs.reg <= 0) p.push('no valid migration registration');
  if (s.status === 'student') {
    if (s.docs.visa <= 0) p.push('expired student visa');
    if (s.job && !s.flags.workPermit) p.push('working on a student visa without permission');
  } else if (s.status === 'migrant') {
    if (s.job && s.docs.patent <= 0) p.push('working without a valid patent');
  }
  return p;
}
export const isForeigner = (s: State): boolean => s.status !== 'citizen';

/* ---------- effects ---------- */
const LABELS: Record<string, string> = { money: 'Money', energy: 'Energy', health: 'Health', stress: 'Stress', rep: 'Reputation', know: 'Knowledge', strike: 'Legal strike' };
const DOC_LABELS: Record<string, string> = { reg: 'Registration (days)', patent: 'Patent (days)', visa: 'Visa (days)' };
const STAT_KEYS = ['money', 'energy', 'health', 'stress', 'rep', 'know'] as const;
const arr = (v: string | string[]): string[] => (Array.isArray(v) ? v : [v]);

export function apply(s: State, fx?: Effects): Note[] {
  const notes: Note[] = [];
  if (!fx) return notes;
  for (const k of STAT_KEYS) {
    const v = fx[k];
    if (v) { s[k] += v; notes.push({ k, v, label: LABELS[k] }); }
  }
  s.energy = clamp(s.energy, 0, 100); s.health = clamp(s.health, 0, 100);
  s.stress = clamp(s.stress, 0, 100); s.rep = clamp(s.rep, 0, 100); s.know = clamp(s.know, 0, 100);
  if (fx.strike) { s.strikes = Math.max(0, s.strikes + fx.strike); notes.push({ k: 'strike', v: fx.strike, label: LABELS.strike }); }
  if (fx.docs) for (const d of Object.keys(fx.docs) as (keyof Docs)[]) {
    const v = fx.docs[d] as number;
    s.docs[d] = (s.docs[d] || 0) + v;
    notes.push({ k: 'doc', v, label: DOC_LABELS[d] || d });
  }
  if (fx.setDocs && s.status !== 'citizen' && !s.flags.rvp) for (const d of Object.keys(fx.setDocs) as (keyof Docs)[]) {
    s.docs[d] = fx.setDocs[d] as number; notes.push({ k: 'doc', v: 0, label: 'Registration reset — register at the new address' });
  }
  if (fx.flag) arr(fx.flag).forEach(f => { s.flags[f] = true; });
  if (fx.unflag) arr(fx.unflag).forEach(f => { delete s.flags[f]; });
  if (fx.clothes) { s.clothes = clamp(s.clothes + fx.clothes, 0, 100); notes.push({ k: 'clothes', v: fx.clothes, label: 'Clothing' }); }
  if (fx.merit) { s.merit = Math.max(0, s.merit + fx.merit); notes.push({ k: 'merit', v: fx.merit, label: 'Community merit' }); }
  if (fx.friends) { s.friends = Math.max(0, s.friends + fx.friends); notes.push({ k: 'friends', v: fx.friends, label: 'Friends' }); }
  if (fx.famLove) { s.famLove = clamp(s.famLove + fx.famLove, 0, 100); notes.push({ k: 'famLove', v: fx.famLove, label: 'Family bond' }); }
  if (fx.kids) { s.kids += fx.kids; notes.push({ k: 'kids', v: fx.kids, label: 'Children' }); }
  if (fx.love && s.partner) { s.partner.love = clamp(s.partner.love + fx.love, 0, 100); notes.push({ k: 'love', v: fx.love, label: 'Relationship' }); }
  if (fx.partner !== undefined) s.partner = fx.partner;
  if (fx.bank) arr(fx.bank).forEach(b => { s.bank[b] = true; notes.push({ k: 'bank', v: 0, label: 'Account opened: ' + b }); });
  if (fx.unbank) s.bank[fx.unbank] = false;
  if (fx.mark) arr(fx.mark).forEach(m => { s.marks[m] = s.day; });
  if (fx.dest !== undefined) s.dest = fx.dest;
  if (fx.loc) { s.loc = fx.loc; s.known[fx.loc] = true; }
  if (fx.job !== undefined) s.job = fx.job;
  if (fx.city) s.city = fx.city;
  if (fx.status) s.status = fx.status;
  if (fx.queue) s.queue.push(fx.queue);
  if (fx.skip) s.skip = (s.skip || 0) + fx.skip;
  if (fx.phone !== undefined) { s.phone = fx.phone; notes.push({ k: 'phone', v: 0, label: 'New phone' }); }
  if (fx.setRent !== undefined) s.rent = fx.setRent;
  if (fx.run) fx.run(s);
  return notes;
}

/* ---------- drawing scenarios ---------- */
function whoOk(sc: Scenario, s: State): boolean {
  if (!sc.who) return true;
  return sc.who.some(w => w === s.status || (w === 'foreigner' && s.status !== 'citizen') || (w === 'worker' && (s.status === 'migrant' || s.status === 'eaeu')));
}
const monthOk = (sc: Scenario, s: State): boolean => !sc.months || sc.months.includes(dateOf(s).getMonth() + 1);

export const eligible = (s: State, cats: string[]): Scenario[] => scenarios.filter(sc => cats.includes(sc.cat) && whoOk(sc, s) && monthOk(sc, s) &&
  (!sc.req || sc.req(s)) && !(sc.once && s.seen[sc.id]));

export function draw(s: State, cats: string[]): Scenario | null {
  const pool = eligible(s, cats);
  if (!pool.length) return null;
  const illegal = problems(s).length > 0;
  const ws = pool.map(sc => {
    let w = (sc.w || 1) / (1 + (s.seen[sc.id] || 0) * 2);
    if (sc.cat === 'police') {
      if (s.status === 'citizen') w *= 0.3;
      if (illegal) w *= 2.5;
    }
    return w;
  });
  let r = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}

/* ---------- dynamic scenarios ---------- */
export function jobOffers(s: State): Job[] {
  const bag = jobs.filter(j => (!j.cit || s.status === 'citizen' || s.flags.rvp) && s.know >= (j.min || 0));
  const out: Job[] = [];
  while (out.length < 3 && bag.length) out.push(bag.splice(rnd(0, bag.length - 1), 1)[0]);
  return out;
}
dyn.job_search = s => {
  const choices: Choice[] = jobOffers(s).map(j => ({
    t: `${j.name} — about ${money(j.pay)} per shift${j.cit ? ' (citizens/RVP only)' : ''}`,
    r: s2 => {
      const withJob = problems({ ...s2, job: j.id });
      if (isForeigner(s2) && withJob.length)
        return O(`You start as ${j.name}. The boss does not ask about papers — which is exactly the problem: ${withJob[0]}.`, { job: j.id, stress: 5 });
      return O(`You start as ${j.name}. ${j.line}`, { job: j.id });
    },
  }));
  choices.push({ t: 'Keep looking (no luck today)', r: () => O('Three offices, two "we will call you back", one scam. You walk home.', { energy: -8, stress: 5 }) });
  return { id: 'job_search', cat: 'work', dynamic: true, title: 'Job hunt', text: 'You scroll Avito Rabota, HeadHunter and Telegram chats for vacancies. Which one do you take?', choices };
};
dyn.rent_short = s => ({
  id: 'rent_short', cat: 'home', free: true, dynamic: true, title: 'Rent is due — you are short',
  text: `Saturday. Rent is ${money(s.rent)} and you only have ${money(s.money)}. The landlord is texting.`,
  choices: [
    { t: 'Borrow from a friend / relatives', r: () => O('Someone sends you the money with a long voice message about responsibility.', { money: s.rent, rep: -4, stress: 6 }) },
    { t: 'Sell your phone/laptop', r: () => O('You sell the gadget at a pawnshop for a bad price. Rent covered.', { money: Math.round(s.rent * 0.4), stress: 8, know: -1 }) },
    { t: 'Ask for a week of grace', r: () => gamble(0.5, O('"One week. Last time," says the landlord.', { stress: 4 }), O('The landlord packs your things into bags and changes the lock.', { money: -s.rent, stress: 15, rep: -5, skip: 1 })) },
  ],
});
dyn.travel_pick = s => {
  const dests = PLACES.filter(p => p.id !== s.loc && (p.id !== 'work' || s.job));
  return {
    id: 'travel_pick', cat: 'map', free: true, dynamic: true, map: true, title: 'Where to?',
    text: `You are at: ${placeById(s.loc).n}. Weather: ${WEATHER[s.weather]}. Choose a destination on the map.`,
    choices: dests.map(p => ({ t: `${p.n}${s.known[p.id] ? '' : ' (never been)'}`, r: () => O(`You decide to go to ${p.n}.`, { dest: p.id, queue: 'trip_method' }) })),
  };
};
dyn.trip_method = s => {
  const to = placeById(s.dest || 'center'), from = placeById(s.loc);
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const cost = Math.round(dist / 100 * 600);
  const bad = s.weather === 'snow' ? 0.3 : s.weather === 'frost' ? 0.15 : s.weather === 'rain' ? 0.08 : 0;
  const unk = s.known[to.id] ? -0.12 : 0.18;
  const arrive = (msg: string, fx: Effects): Outcome => O(msg, { loc: to.id, dest: null, ...fx });
  const ph = (s.phone - 1) * 0.03;
  const lost = (p: number, okMsg: string, lostMsg: string, extra?: Effects): Outcome => Math.random() < Math.max(0.02, p - ph)
    ? O(lostMsg, { loc: to.id, dest: null, energy: -18, stress: 10, ...extra })
    : arrive(okMsg, { energy: -Math.round(dist / 6), ...(extra && extra.money ? { money: extra.money } : {}) });
  return {
    id: 'trip_method', cat: 'map', dynamic: true, free: true, map: true, title: `${placeById(s.loc).n} → ${to.n}`,
    text: `Distance is about ${Math.round(dist)} map units. ${s.weather === 'snow' ? 'Snow covers the signs and the pavements. ' : s.weather === 'frost' ? 'Your phone battery drops fast in the frost. ' : ''}How do you go?`,
    choices: [
      { t: 'Follow the maps app (Yandex Maps)', r: () => {
        if (s.weather === 'frost' && s.phone < 2 && Math.random() < 0.25) return O('Your phone dies in the frost halfway there. You walk by instinct.', { loc: to.id, dest: null, energy: -20, stress: 12 });
        return lost(Math.max(0.04, 0.08 + bad * 0.5 + unk * 0.3), 'The blue dot leads you right to the door.', 'The dot jumps around between courtyards; you lose forty minutes in a dead-end.');
      } },
      { t: 'Ask people on the street', r: () => lost(Math.max(0.05, 0.12 + bad + unk * 0.5), 'A kind grandmother points the way and adds advice about your hat.', 'Three people give three answers. You arrive eventually.') },
      { t: `Take a taxi (about ${money(cost + 250)})`, r: () => s.money < cost + 250
        ? O('You do not have enough money for the fare. You walk instead and get tired.', { loc: to.id, dest: null, energy: -20, stress: 6 })
        : arrive('The driver talks the entire ride about politics, prices and his son. You arrive fast.', { money: -(cost + 250), energy: -2 }) },
      ...(s.car ? [{ t: 'Drive your own car', r: (): Outcome => (s.weather === 'snow' || s.weather === 'frost') && Math.random() < 0.3 ? O('The engine coughs in the cold and the road is a skating rink. You arrive late and frazzled.', { loc: to.id, dest: null, energy: -14, stress: 10, money: -300 }) : arrive('You park, lock the car, and walk the last metres.', { money: -150, energy: -3, rep: 1 }) }] : []),
      { t: 'Metro / bus with a ticket (₽90)', r: () => lost(Math.max(0.05, 0.1 + bad * 0.7 + unk), 'Right line, right exit.', 'You exit at the wrong metro exit and pop up in an unknown street.', { money: -90 }) },
    ],
  };
};

/* ---------- actions ---------- */
export interface Action { id: string; label: string; icon: string; cats: string[]; hint: string }
export const actions: Action[] = [
  { id: 'work', label: 'Work a shift', icon: '🛠️', cats: ['work'], hint: 'Earn money (needs a job)' },
  { id: 'food', label: 'Eat', icon: '🍲', cats: ['food'], hint: 'Restore energy' },
  { id: 'travel', label: 'Travel (map)', icon: '🗺️', cats: ['life'], hint: 'Go somewhere in the city' },
  { id: 'out', label: 'Go out', icon: '🚇', cats: ['police', 'social', 'life'], hint: 'City life, people, checks' },
  { id: 'paper', label: 'Paperwork', icon: '📄', cats: ['paper'], hint: 'MFC, migration, documents' },
  { id: 'money', label: 'Bank & shops', icon: '💳', cats: ['bank', 'shop', 'phone', 'car', 'estate'], hint: 'Banks, phones, cars, flats' },
  { id: 'people', label: 'People & love', icon: '❤️', cats: ['love', 'family_decision'], hint: 'Friends, partner, children' },
  { id: 'edu', label: 'Study / Exams', icon: '📚', cats: ['edu'], hint: 'Knowledge, admission' },
  { id: 'home', label: 'Stay home', icon: '🛏️', cats: ['home', 'health'], hint: 'Rest and housing' },
  { id: 'flight', label: 'Book a flight', icon: '✈️', cats: [], hint: 'Airline website' },
  { id: 'pets', label: 'Pets & strays', icon: '🐕', cats: ['pets'], hint: 'Stray dogs, adoption ads' },
  { id: 'culture', label: 'Culture & community', icon: '🏛️', cats: ['culture'], hint: 'History, traditions, volunteering' },
  { id: 'family', label: 'Call family', icon: '📞', cats: ['family'], hint: 'Remittances, home' },
];

export interface Performed { sc: Scenario | null; notes: Note[]; pre: string }
export function perform(s: State, actionId: string): Performed {
  const a = actions.find(x => x.id === actionId) as Action;
  let base: Effects = {}, pre = '';
  if (actionId === 'travel') return { sc: dyn.travel_pick(s), notes: [], pre: '' };
  if (actionId === 'work') {
    if (!s.job) return { sc: dyn.job_search(s), notes: [], pre: '' };
    const j = jobById(s.job);
    const pay = Math.round(j.pay * (1 + s.know / 200) * (0.85 + Math.random() * 0.3));
    base = { money: pay, energy: -(j.energy || 20), stress: j.stress || 5 };
    s.earned += pay;
    pre = `Shift as ${j.name}.`;
  } else if (actionId === 'food') { base = { money: -rnd(150, 400), energy: 22, health: 1 }; pre = 'You find something to eat.'; }
  else if (actionId === 'out') { base = { energy: -5, stress: -3 }; pre = 'You step outside.'; }
  else if (actionId === 'paper') { base = { energy: -8, stress: 4 }; pre = 'Documents day.'; }
  else if (actionId === 'edu') { base = { energy: -10, stress: 3, know: 2 }; pre = 'You hit the books.'; }
  else if (actionId === 'home') { base = { energy: 28, stress: -6 }; pre = 'You stay in.'; }
  else if (actionId === 'family') { base = { stress: -5 }; pre = 'You call home.'; }
  else if (actionId === 'flight') { return { sc: null, notes: [], pre: '' }; }
  else if (actionId === 'pets') { base = { energy: -4, stress: -4 }; pre = 'You look around for four-legged friends.'; }
  else if (actionId === 'culture') { base = { energy: -6, stress: -4 }; pre = 'You step into the life of the city.'; }
  else if (actionId === 'money') { base = { energy: -4 }; pre = 'Errands.'; }
  else if (actionId === 'people') { base = { energy: -4, stress: -3 }; pre = 'You make time for people.'; }
  const notes = apply(s, base);
  const sc = draw(s, a.cats) || draw(s, ['social']);
  return { sc, notes, pre };
}

export interface Chosen { msg: string; notes: Note[]; dayNotes: string[]; ui?: string }
export function choose(s: State, sc: Scenario, i: number): Chosen {
  const c = sc.choices[i];
  const res = c.r ? c.r(s) : O(c.msg || '', c.fx);
  const notes = apply(s, res.fx);
  if (!sc.dynamic) s.seen[sc.id] = (s.seen[sc.id] || 0) + 1;
  s.log.unshift({ day: s.day, text: `${sc.title}: ${res.msg}` });
  if (s.log.length > 60) s.log.length = 60;
  checkEnd(s);
  let dayNotes: string[] = [];
  let advanceNow = !sc.free;
  if (sc.id === 'trip_method') advanceNow = !arrivalHook(s);
  if (advanceNow && !s.over) dayNotes = advance(s);
  return { msg: res.msg, notes, dayNotes, ui: res.fx.ui };
}

/** Start a trip to a place chosen directly on the map. */
export function startTrip(s: State, destId: string): Scenario {
  s.dest = destId;
  return dyn.trip_method(s);
}

/** On arriving somewhere something may happen there. Returns true if an event was queued. */
export function arrivalHook(s: State): boolean {
  const cats = PLACE_CATS[s.loc];
  if (!cats || (!SERVICE_PLACES.includes(s.loc) && Math.random() > 0.65)) return false;
  const sc = draw(s, cats);
  if (!sc) return false;
  s.queue.push(sc.id);
  return true;
}

/* ---------- time ---------- */
const CAL = [
  { m: 9, d: 1, id: 'cal_sept1' }, { m: 11, d: 4, id: 'cal_unity' }, { m: 12, d: 31, id: 'cal_newyear' },
  { m: 1, d: 7, id: 'cal_christmas' }, { m: 2, d: 23, id: 'cal_feb23' }, { m: 3, d: 8, id: 'cal_mar8' },
  { m: 3, d: 21, id: 'cal_navruz' }, { m: 5, d: 9, id: 'cal_victory' }, { m: 6, d: 12, id: 'cal_russiaday' },
  { m: 6, d: 20, id: 'cal_ege' }, { m: 7, d: 25, id: 'cal_admission' },
];

export function advance(s: State): string[] {
  const out: string[] = [];
  s.slot++;
  if (s.skip && s.skip > 0) { s.skip--; s.slot = 3; out.push('You lose the rest of the day.'); }
  if (s.slot >= 3) { s.slot = 0; out.push(...endDay(s)); }
  checkEnd(s);
  return out;
}

export function endDay(s: State): string[] {
  const out: string[] = [];
  s.day++;
  const d = dateOf(s);
  const names: Record<string, string> = { reg: 'Registration', patent: 'Patent', visa: 'Visa' };
  (['reg', 'patent', 'visa'] as (keyof Docs)[]).forEach(k => {
    if (s.docs[k] > 0 && s.docs[k] < 5000) {
      s.docs[k]--;
      if (!s.flags.rvp && s.status !== 'citizen') {
        if (s.docs[k] === 3) out.push(`⚠ ${names[k]} expires in 3 days.`);
        if (s.docs[k] === 0) out.push(`⛔ ${names[k]} has EXPIRED.`);
      }
    }
  });
  s.energy = clamp(s.energy + 35, 0, 100);
  s.stress = clamp(s.stress - 4, 0, 100);
  if (s.energy > 50 && s.stress < 70) s.health += 1;
  if (s.stress >= 90) { s.health -= 4; out.push('Burnout: your health takes a hit.'); }
  s.weather = weatherFor(d);
  if ((s.weather === 'frost' || s.weather === 'snow') && s.clothes < 40) { s.health -= 3; out.push('🥶 You are underdressed for the cold: health −3. Buy a proper coat and boots.'); }
  if (s.weather === 'rain' && s.clothes < 20) s.health -= 1;
  s.health = clamp(s.health, 0, 100);
  s.clothes = clamp(s.clothes - 0.3, 0, 100);
  if (s.partner) s.partner.love = clamp(s.partner.love - 0.4, 0, 100);
  if (s.kids > 0 && d.getDay() === 6) { const c = 2500 * s.kids; s.money -= c; out.push(`Child expenses this week: −${money(c)}.`); }
  if (s.pet) { s.money -= 120; s.pet.bond = clamp(s.pet.bond + 0.4, 0, 100); }
  if (s.booking && !s.booking.done && s.booking.dep < s.day) { s.booking = null; out.push('You missed your flight; the ticket is void.'); }
  if (d.getDay() === 6 && Number(s.tmp.debt) > 0) { const pay = Math.min(Number(s.tmp.debt), Number(s.tmp.debtPay) || 5000); s.money -= pay; s.tmp.debt = Number(s.tmp.debt) - pay; out.push(`Loan / mortgage instalment: −${money(pay)} (left: ${money(Number(s.tmp.debt))}).`); if (Number(s.tmp.debt) <= 0) { s.tmp.debt = 0; s.tmp.debtPay = 0; out.push('You have paid off your loan!'); } }
  if (s.car && d.getDay() === 6) { s.money -= 3000; out.push('Car upkeep this week: fuel and insurance −₽3,000.'); }
  if (s.health <= 20 && (s.marks.hospital === undefined || s.day - s.marks.hospital > 30) && !s.queue.includes('hosp_admit')) s.queue.push('hosp_admit');
  if (s.booking && !s.booking.done && s.booking.dep === s.day) s.queue.push('fl_airport');
  if (d.getDay() === 1 && s.allow) { s.money += s.allow; out.push(`Weekly transfer from family: +${money(s.allow)}.`); }
  if (d.getDay() === 6 && s.rent > 0) {
    if (s.money >= s.rent) { s.money -= s.rent; out.push(`Saturday: rent paid, −${money(s.rent)}.`); }
    else s.queue.push('rent_short');
  }
  if (d.getMonth() === 8 && d.getDate() === 6) s.queue.push('cal_cityday');
  CAL.forEach(c => { if (c.m === d.getMonth() + 1 && c.d === d.getDate()) s.queue.push(c.id); });
  if (d.getDate() === 1 && s.job === null && s.status !== 'citizen') out.push('New month: remember to check your documents.');
  return out;
}

export function checkEnd(s: State): void {
  if (s.over) return;
  if (s.health <= 0) s.over = 'hospital';
  else if (s.status !== 'citizen' && s.strikes >= 3) s.over = 'deported';
  else if (s.money < -30000) s.over = 'debt';
  else if (s.day >= MAXDAY) s.over = 'time';
}

/* ---------- goals & score ---------- */
export const goals: { id: string; label: string; done: (s: State) => boolean }[] = [
  { id: 'admit', label: 'Get into a university', done: s => !!s.flags.admitted },
  { id: 'save', label: 'Save ₽500,000', done: s => s.money >= 500000 },
  { id: 'rutest', label: 'Pass the Russian language & history test', done: s => !!s.flags.rutest || s.status === 'citizen' },
  { id: 'rvp', label: 'Get temporary residence (RVP)', done: s => !!s.flags.rvp || s.status === 'citizen' },
  { id: 'vnzh', label: 'Get permanent residence (VNZh)', done: s => !!s.flags.vnzh || s.status === 'citizen' },
  { id: 'citizen', label: 'Become a Russian citizen', done: s => !!s.flags.naturalized },
  { id: 'bank', label: 'Open a bank account', done: s => !!(s.bank.sber || s.bank.vtb || s.bank.tbank) },
  { id: 'family', label: 'Build a family (partner or child)', done: s => !!s.flags.married || s.kids > 0 },
  { id: 'award', label: 'Earn the community «Patriot» Award', done: s => !!s.flags.award },
  { id: 'home', label: 'Own a home', done: s => s.housing !== 'rented' },
  { id: 'car', label: 'Buy a car', done: s => !!s.car },
  { id: 'pet', label: 'Adopt an abandoned dog', done: s => !!s.pet },
  { id: 'friends', label: 'Make 5 friends', done: s => s.friends >= 5 },
  { id: 'clean', label: 'Finish with zero legal strikes', done: s => s.strikes === 0 },
];
export const score = (s: State): number => Math.round(Math.max(0, s.money) / 1000 + s.know * 5 + s.rep * 2 + goals.filter(g => g.done(s)).length * 400 - s.strikes * 150 + s.day);
export const endings: Record<EndingId, [string, string]> = {
  hospital: ['🏥 Hospital', 'You pushed too hard. Doctors at the city clinic tell you the only treatment is sleep.'],
  deported: ['✈️ Deported', 'Three violations on record. Border service, entry ban, one-way ticket home.'],
  debt: ['💸 Debt spiral', 'The collectors, the loans, the phone that never stops. Time to start over.'],
  time: ['📅 Two years in Russia', 'Two winters survived. Here is how your story ended.'],
};

export function countStats(): { total: number; by: Record<string, number> } {
  const by: Record<string, number> = {};
  scenarios.forEach(sc => { by[sc.cat] = (by[sc.cat] || 0) + 1; });
  return { total: scenarios.length, by };
}

/* ---------- save / load ---------- */
const KEY = 'vrussia_save';
export const save = (s: State): void => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } };
export const load = (): State | null => {
  try { const r = localStorage.getItem(KEY); const o = r ? JSON.parse(r) as State : null; return o && o.version === 4 ? o : null; } catch { return null; }
};
export const clear = (): void => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } };

/** Backwards-compatible namespace used by the content modules. */
export const RU = {
  util: { clamp, rnd, pick, O, gamble },
  S, scenarios, dyn, index, get, fill, jobs, jobById, CITIES, PLACES, WEATHER, money, problems, isForeigner,
};

/** Fast-forward `n` days while the player is away (flight, hospital stay). */
export function absentDays(s: State, n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n && !s.over; i++) { s.slot = 0; out.push(...endDay(s)); checkEnd(s); }
  s.queue = s.queue.filter(id => !id.startsWith('cal_') && id !== 'rent_short' && id !== 'hosp_admit' && id !== 'fl_airport');
  return out;
}
