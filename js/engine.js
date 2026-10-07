/* V Russia — engine (DOM-free so it can be tested in Node) */
var RU = globalThis.RU = globalThis.RU || {};
(function () {
  const U = RU.util = {
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    rnd: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
    pick: a => a[Math.floor(Math.random() * a.length)],
    O: (msg, fx) => ({ msg, fx: fx || {} }),
    gamble: (p, ok, bad) => (Math.random() < p ? ok : bad),
  };
  const { clamp, rnd, pick, O } = U;

  RU.scenarios = [];
  RU.dyn = {};
  RU.S = sc => { RU.scenarios.push(sc); return sc; };
  RU.START = new Date(2026, 8, 1);
  RU.MAXDAY = 730;
  RU.money = n => (n < 0 ? '−' : '') + '₽' + Math.abs(Math.round(n)).toLocaleString('en-US');
  RU.dateOf = s => new Date(RU.START.getTime() + s.day * 864e5);
  RU.SLOTS = ['Morning', 'Afternoon', 'Evening'];

  /* ---------- Origins ---------- */
  RU.origins = [
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
  ];

  RU.origins.push({ id: 'dagestan', label: 'Dagestani Student', icon: '🏔️', status: 'citizen', home: 'Makhachkala', city: 'Moscow', money: 25000, allow: 8000, rent: 4000, know: 30, rep: 50,
    blurb: 'Citizen from the Caucasus, big family, first time in the capital. Expect questions about where you are "really" from.', docs: {} });

  RU.CITIES = ['Moscow', 'Saint Petersburg', 'Kazan', 'Yekaterinburg', 'Novosibirsk', 'Krasnodar', 'Sochi', 'Vladivostok', 'Grozny', 'Nizhny Novgorod', 'Samara', 'Kaliningrad'];

  /* ---------- Map ---------- */
  RU.PLACES = [
    { id: 'home', n: 'Home', x: 50, y: 52 }, { id: 'station', n: 'Railway station', x: 14, y: 20 }, { id: 'mfc', n: 'MFC', x: 72, y: 24 },
    { id: 'guvm', n: 'Migration dept.', x: 88, y: 62 }, { id: 'uni', n: 'University', x: 30, y: 80 }, { id: 'market', n: 'Market', x: 12, y: 62 },
    { id: 'clinic', n: 'Polyclinic', x: 62, y: 84 }, { id: 'work', n: 'Workplace', x: 82, y: 40 }, { id: 'bank', n: 'Bank branch', x: 40, y: 28 },
    { id: 'center', n: 'City centre', x: 55, y: 10 },
  ];
  RU.placeById = id => RU.PLACES.find(p => p.id === id);
  RU.PLACE_CATS = { mfc: ['paper'], guvm: ['paper'], uni: ['edu'], market: ['shop'], clinic: ['health'], bank: ['bank'], work: ['work'], center: ['social', 'police', 'life'], station: ['police', 'life'], home: ['home'] };

  /* ---------- Weather ---------- */
  RU.weatherFor = function (date) {
    const m = date.getMonth() + 1, r = Math.random();
    if (m === 12 || m <= 2) return r < 0.45 ? 'snow' : r < 0.75 ? 'frost' : 'clear';
    if (m === 3 || m === 11) return r < 0.3 ? 'snow' : r < 0.6 ? 'rain' : 'clear';
    if (m === 4 || m === 10 || m === 9) return r < 0.4 ? 'rain' : 'clear';
    return r < 0.2 ? 'rain' : r < 0.45 ? 'heat' : 'clear';
  };
  RU.WEATHER = { snow: '❄️ Snow', frost: '🥶 Hard frost', rain: '🌧️ Rain', heat: '☀️ Heat', clear: '⛅ Clear' };

  RU.newState = function (name, originId, city) {
    const o = RU.origins.find(x => x.id === originId) || RU.origins[0];
    const s = {
      name: name || 'Player', o: o.id, label: o.label, icon: o.icon, status: o.status, home: o.home, city: city || o.city,
      day: 0, slot: 0, money: o.money, energy: 80, health: 90, stress: 15, rep: o.rep, know: o.know,
      strikes: 0, docs: Object.assign({ reg: 0, patent: 0, visa: 0 }, o.docs), flags: {}, job: null,
      seen: {}, queue: [], log: [], rent: o.rent, allow: o.allow, over: null, earned: 0, version: 2,
      marks: {}, bank: {}, loc: 'home', known: { home: true }, dest: null, weather: 'clear',
      clothes: o.id === 'moscow' ? 90 : o.status === 'citizen' ? 55 : 35, partner: null, kids: 0, friends: 1, famLove: 60,
    };
    s.weather = RU.weatherFor(RU.START);
    s.queue.push('intro_' + o.status);
    return s;
  };

  /* ---------- Legal status ---------- */
  RU.problems = function (s) {
    const p = [];
    if (s.status === 'citizen' || s.flags.rvp) return p;
    if (s.docs.reg <= 0) p.push('no valid migration registration');
    if (s.status === 'student') {
      if (s.docs.visa <= 0) p.push('expired student visa');
      if (s.job && !s.flags.workPermit) p.push('working on a student visa without permission');
    } else if (s.status === 'migrant') {
      if (s.job && s.docs.patent <= 0) p.push('working without a valid patent');
    }
    return p;
  };
  RU.isForeigner = s => s.status !== 'citizen';

  /* ---------- Effects ---------- */
  const LABELS = { money: 'Money', energy: 'Energy', health: 'Health', stress: 'Stress', rep: 'Reputation', know: 'Knowledge', strike: 'Legal strike' };
  RU.apply = function (s, fx) {
    const notes = [];
    if (!fx) return notes;
    for (const k of ['money', 'energy', 'health', 'stress', 'rep', 'know']) {
      if (fx[k]) { s[k] += fx[k]; notes.push({ k, v: fx[k], label: LABELS[k] }); }
    }
    s.energy = clamp(s.energy, 0, 100); s.health = clamp(s.health, 0, 100);
    s.stress = clamp(s.stress, 0, 100); s.rep = clamp(s.rep, 0, 100); s.know = clamp(s.know, 0, 100);
    if (fx.strike) { s.strikes = Math.max(0, s.strikes + fx.strike); notes.push({ k: 'strike', v: fx.strike, label: LABELS.strike }); }
    if (fx.docs) for (const d in fx.docs) {
      s.docs[d] = (s.docs[d] || 0) + fx.docs[d];
      notes.push({ k: 'doc', v: fx.docs[d], label: { reg: 'Registration (days)', patent: 'Patent (days)', visa: 'Visa (days)' }[d] || d });
    }
    if (fx.setDocs && s.status !== 'citizen' && !s.flags.rvp) for (const d in fx.setDocs) {
      s.docs[d] = fx.setDocs[d]; notes.push({ k: 'doc', v: 0, label: 'Registration reset — register at the new address' });
    }
    if (fx.flag) (Array.isArray(fx.flag) ? fx.flag : [fx.flag]).forEach(f => { s.flags[f] = true; });
    if (fx.unflag) (Array.isArray(fx.unflag) ? fx.unflag : [fx.unflag]).forEach(f => { delete s.flags[f]; });
    if (fx.clothes) { s.clothes = clamp(s.clothes + fx.clothes, 0, 100); notes.push({ k: 'clothes', v: fx.clothes, label: 'Clothing' }); }
    if (fx.friends) { s.friends = Math.max(0, s.friends + fx.friends); notes.push({ k: 'friends', v: fx.friends, label: 'Friends' }); }
    if (fx.famLove) { s.famLove = clamp(s.famLove + fx.famLove, 0, 100); notes.push({ k: 'famLove', v: fx.famLove, label: 'Family bond' }); }
    if (fx.kids) { s.kids += fx.kids; notes.push({ k: 'kids', v: fx.kids, label: 'Children' }); }
    if (fx.love && s.partner) { s.partner.love = clamp(s.partner.love + fx.love, 0, 100); notes.push({ k: 'love', v: fx.love, label: 'Relationship' }); }
    if (fx.partner !== undefined) { s.partner = fx.partner; }
    if (fx.bank) (Array.isArray(fx.bank) ? fx.bank : [fx.bank]).forEach(b => { s.bank[b] = true; notes.push({ k: 'bank', v: 0, label: 'Account opened: ' + b }); });
    if (fx.unbank) s.bank[fx.unbank] = false;
    if (fx.mark) (Array.isArray(fx.mark) ? fx.mark : [fx.mark]).forEach(m => { s.marks[m] = s.day; });
    if (fx.dest !== undefined) s.dest = fx.dest;
    if (fx.loc) { s.loc = fx.loc; s.known[fx.loc] = true; }
    if (fx.job !== undefined) s.job = fx.job;
    if (fx.city) s.city = fx.city;
    if (fx.status) s.status = fx.status;
    if (fx.queue) s.queue.push(fx.queue);
    if (fx.skip) s.skip = (s.skip || 0) + fx.skip;
    return notes;
  };

  /* ---------- Scenario lookup / drawing ---------- */
  RU.byId = {};
  RU.index = function () { RU.byId = {}; RU.scenarios.forEach(sc => { RU.byId[sc.id] = sc; }); };
  RU.get = function (id, s) { return RU.dyn[id] ? RU.dyn[id](s) : RU.byId[id]; };
  RU.fill = (str, s) => String(str).replace(/\{name\}/g, s.name).replace(/\{city\}/g, s.city).replace(/\{home\}/g, s.home);

  function whoOk(sc, s) {
    if (!sc.who) return true;
    return sc.who.some(w => w === s.status || (w === 'foreigner' && s.status !== 'citizen') || (w === 'worker' && (s.status === 'migrant' || s.status === 'eaeu')));
  }
  function monthOk(sc, s) { return !sc.months || sc.months.includes(RU.dateOf(s).getMonth() + 1); }

  RU.eligible = (s, cats) => RU.scenarios.filter(sc => cats.includes(sc.cat) && whoOk(sc, s) && monthOk(sc, s) &&
    (!sc.req || sc.req(s)) && !(sc.once && s.seen[sc.id]));

  RU.draw = function (s, cats) {
    const pool = RU.eligible(s, cats);
    if (!pool.length) return null;
    const probs = RU.problems(s).length > 0;
    const ws = pool.map(sc => {
      let w = (sc.w || 1) / (1 + (s.seen[sc.id] || 0) * 2);
      if (sc.cat === 'police') {
        if (s.status === 'citizen') w *= 0.3;
        if (probs) w *= 2.5;
      }
      return w;
    });
    let r = Math.random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  };

  /* ---------- Jobs ---------- */
  RU.jobs = [];
  RU.jobOffers = function (s) {
    const ok = RU.jobs.filter(j => (!j.cit || s.status === 'citizen' || s.flags.rvp) && s.know >= (j.min || 0) && !(j.hours && false));
    const out = [];
    const bag = ok.slice();
    while (out.length < 3 && bag.length) out.push(bag.splice(rnd(0, bag.length - 1), 1)[0]);
    return out;
  };
  RU.dyn.job_search = function (s) {
    const offers = RU.jobOffers(s);
    const choices = offers.map(j => ({
      t: `${j.name} — about ${RU.money(j.pay)} per shift${j.cit ? ' (citizens/RVP only)' : ''}`,
      r: s2 => {
        const fx = { job: j.id };
        if (RU.isForeigner(s2) && RU.problems(Object.assign({}, s2, { job: j.id })).length)
          return O(`You start as ${j.name}. The boss does not ask about papers — which is exactly the problem: ${RU.problems(Object.assign({}, s2, { job: j.id }))[0]}.`, Object.assign(fx, { stress: 5 }));
        return O(`You start as ${j.name}. ${j.line}`, fx);
      },
    }));
    choices.push({ t: 'Keep looking (no luck today)', r: () => O('Three offices, two "we will call you back", one scam. You walk home.', { energy: -8, stress: 5 }) });
    return { id: 'job_search', cat: 'work', title: 'Job hunt', text: 'You scroll Avito Rabota, HeadHunter and Telegram chats for vacancies. Which one do you take?', choices };
  };
  RU.dyn.job_quit = function (s) {
    return { id: 'job_quit', cat: 'work', title: 'Quit?', text: 'You think about quitting your current job.', choices: [
      { t: 'Quit and look for something else', r: () => O('You hand in your notice. Freedom — and an empty schedule.', { job: null, stress: -5 }) },
      { t: 'Stay', r: () => O('You stay. The rent is the rent.', {}) } ] };
  };
  RU.dyn.rent_short = function (s) {
    return { id: 'rent_short', cat: 'home', free: true, title: 'Rent is due — you are short', text: `Saturday. Rent is ${RU.money(s.rent)} and you only have ${RU.money(s.money)}. The landlord is texting.`, choices: [
      { t: 'Borrow from a friend / relatives', r: () => O('Someone sends you the money with a long voice message about responsibility.', { money: s.rent, rep: -4, stress: 6 }) },
      { t: 'Sell your phone/laptop', r: () => O('You sell the gadget at a pawnshop for a bad price. Rent covered.', { money: Math.round(s.rent * 0.4), stress: 8, know: -1 }) },
      { t: 'Ask for a week of grace', r: () => U.gamble(0.5, O('"One week. Last time," says the landlord.', { stress: 4 }), O('The landlord packs your things into bags and changes the lock.', { money: -s.rent, stress: 15, rep: -5, skip: 1 })) },
    ] };
  };

  /* ---------- Actions ---------- */
  RU.actions = [
    { id: 'work', label: 'Work a shift', icon: '🛠️', cats: ['work'], hint: 'Earn money (needs a job)' },
    { id: 'food', label: 'Eat', icon: '🍲', cats: ['food'], hint: 'Restore energy' },
    { id: 'travel', label: 'Travel (map)', icon: '🗺️', cats: ['life'], hint: 'Go somewhere in the city' },
    { id: 'out', label: 'Go out', icon: '🚇', cats: ['police', 'social', 'life'], hint: 'City life, people, checks' },
    { id: 'paper', label: 'Paperwork', icon: '📄', cats: ['paper'], hint: 'MFC, migration, documents' },
    { id: 'money', label: 'Bank & shops', icon: '💳', cats: ['bank', 'shop'], hint: 'Sber, VTB, clothes, SIM' },
    { id: 'people', label: 'People & love', icon: '❤️', cats: ['love'], hint: 'Friends, partner, children' },
    { id: 'edu', label: 'Study / Exams', icon: '📚', cats: ['edu'], hint: 'Knowledge, admission' },
    { id: 'home', label: 'Stay home', icon: '🛏️', cats: ['home', 'health'], hint: 'Rest and housing' },
    { id: 'family', label: 'Call family', icon: '📞', cats: ['family'], hint: 'Remittances, home' },
  ];

  /* ---------- Travel on the map ---------- */
  RU.dyn.travel_pick = function (s) {
    const dests = RU.PLACES.filter(p => p.id !== s.loc && (p.id !== 'work' || s.job));
    return { id: 'travel_pick', cat: 'map', free: true, dynamic: true, map: true, title: 'Where to?', text: `You are at: ${RU.placeById(s.loc).n}. Weather: ${RU.WEATHER[s.weather]}. Choose a destination on the map.`,
      choices: dests.map(p => ({ t: `${p.n}${s.known[p.id] ? '' : ' (never been)'}`, r: () => O(`You decide to go to ${p.n}.`, { dest: p.id, queue: 'trip_method' }) })) };
  };
  RU.dyn.trip_method = function (s) {
    const to = RU.placeById(s.dest || 'center'), from = RU.placeById(s.loc);
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const cost = Math.round(dist / 100 * 600);
    const bad = s.weather === 'snow' ? 0.3 : s.weather === 'frost' ? 0.15 : s.weather === 'rain' ? 0.08 : 0;
    const unk = s.known[to.id] ? -0.12 : 0.18;
    const arrive = (msg, fx) => O(msg, Object.assign({ loc: to.id, dest: null }, fx));
    const lost = (p, okMsg, lostMsg, extra) => Math.random() < p
      ? O(lostMsg, Object.assign({ loc: to.id, dest: null, energy: -18, stress: 10 }, extra || {}))
      : arrive(okMsg, Object.assign({ energy: -Math.round(dist / 6) }, extra && extra.money ? { money: extra.money } : {}));
    const here = RU.placeById(s.loc).n;
    return { id: 'trip_method', cat: 'map', dynamic: true, free: true, map: true, title: `${here} → ${to.n}`, text: `Distance is about ${Math.round(dist)} map units. ${s.weather === 'snow' ? 'Snow covers the signs and the pavements. ' : s.weather === 'frost' ? 'Your phone battery drops fast in the frost. ' : ''}How do you go?`, choices: [
      { t: 'Follow the maps app (Yandex Maps)', r: () => {
        if (s.weather === 'frost' && Math.random() < 0.25) return O('Your phone dies in the frost halfway there. You walk by instinct.', { loc: to.id, dest: null, energy: -20, stress: 12 });
        return lost(Math.max(0.04, 0.08 + bad * 0.5 + unk * 0.3), 'The blue dot leads you right to the door.', 'The dot jumps around between courtyards; you lose forty minutes in a dead-end.');
      } },
      { t: 'Ask people on the street', r: () => lost(Math.max(0.05, 0.12 + bad + unk * 0.5), 'A kind grandmother points the way and adds advice about your hat.', 'Three people give three answers. You arrive eventually.', { rep: 0 }) },
      { t: `Take a taxi (about ${RU.money(cost + 250)})`, r: () => s.money < cost + 250 ? O('You do not have enough money for the fare. You walk instead and get tired.', { loc: to.id, dest: null, energy: -20, stress: 6 }) : arrive('The driver talks the entire ride about politics, prices and his son. You arrive fast.', { money: -(cost + 250), energy: -2 }) },
      { t: 'Metro / bus with a ticket (₽90)', r: () => lost(Math.max(0.05, 0.1 + bad * 0.7 + unk), 'Right line, right exit.', 'You exit at the wrong metro exit and pop up in an unknown street.', { money: -90 }) },
    ] };
  };

  RU.jobById = id => RU.jobs.find(j => j.id === id);

  RU.perform = function (s, actionId) {
    const a = RU.actions.find(x => x.id === actionId);
    let base = {}, pre = '';
    if (actionId === 'travel') return { sc: RU.dyn.travel_pick(s), notes: [], pre: '' };
    if (actionId === 'work') {
      if (!s.job) { const sc = RU.dyn.job_search(s); return { sc, notes: [], pre: '' }; }
      const j = RU.jobById(s.job);
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
    else if (actionId === 'money') { base = { energy: -4 }; pre = 'Errands.'; }
    else if (actionId === 'people') { base = { energy: -4, stress: -3 }; pre = 'You make time for people.'; }
    const notes = RU.apply(s, base);
    const sc = RU.draw(s, a.cats) || RU.draw(s, ['social']);
    return { sc, notes, pre };
  };

  RU.choose = function (s, sc, i) {
    const c = sc.choices[i];
    const res = c.r ? c.r(s) : O(c.msg, c.fx);
    const notes = RU.apply(s, res.fx);
    if (!sc.dynamic) s.seen[sc.id] = (s.seen[sc.id] || 0) + 1;
    s.log.unshift({ day: s.day, text: `${sc.title}: ${res.msg}` });
    if (s.log.length > 60) s.log.length = 60;
    RU.checkEnd(s);
    let dayNotes = [];
    let advanceNow = !sc.free;
    if (sc.id === 'trip_method') advanceNow = !RU.arrivalHook(s);
    if (advanceNow && !s.over) dayNotes = RU.advance(s);
    return { msg: res.msg, notes, dayNotes };
  };

  // On arriving somewhere, there is a chance something happens there. Returns true if an event was queued.
  RU.arrivalHook = function (s) {
    const cats = RU.PLACE_CATS[s.loc];
    if (!cats || Math.random() > 0.65) return false;
    const sc = RU.draw(s, cats);
    if (!sc) return false;
    s.queue.push(sc.id);
    return true;
  };

  /* ---------- Time ---------- */
  const CAL = [
    { m: 9, d: 1, id: 'cal_sept1' }, { m: 11, d: 4, id: 'cal_unity' }, { m: 12, d: 31, id: 'cal_newyear' },
    { m: 1, d: 7, id: 'cal_christmas' }, { m: 2, d: 23, id: 'cal_feb23' }, { m: 3, d: 8, id: 'cal_mar8' },
    { m: 3, d: 21, id: 'cal_navruz' }, { m: 5, d: 9, id: 'cal_victory' }, { m: 6, d: 12, id: 'cal_russiaday' },
    { m: 6, d: 20, id: 'cal_ege' }, { m: 7, d: 25, id: 'cal_admission' },
  ];
  RU.advance = function (s) {
    const out = [];
    s.slot++;
    if (s.skip > 0) { s.skip--; s.slot = 3; out.push('You lose the rest of the day.'); }
    if (s.slot >= 3) { s.slot = 0; out.push(...RU.endDay(s)); }
    RU.checkEnd(s);
    return out;
  };

  RU.endDay = function (s) {
    const out = [];
    s.day++;
    const d = RU.dateOf(s);
    ['reg', 'patent', 'visa'].forEach(k => {
      if (s.docs[k] > 0 && s.docs[k] < 5000) {
        s.docs[k]--;
        if (s.docs[k] === 3 && !s.flags.rvp && s.status !== 'citizen') out.push(`⚠ ${k === 'reg' ? 'Registration' : k === 'patent' ? 'Patent' : 'Visa'} expires in 3 days.`);
        if (s.docs[k] === 0 && !s.flags.rvp && s.status !== 'citizen') out.push(`⛔ ${k === 'reg' ? 'Registration' : k === 'patent' ? 'Patent' : 'Visa'} has EXPIRED.`);
      }
    });
    // overnight recovery
    s.energy = clamp(s.energy + 35, 0, 100);
    s.stress = clamp(s.stress - 4, 0, 100);
    if (s.energy > 50 && s.stress < 70) s.health = clamp(s.health + 1, 0, 100);
    if (s.stress >= 90) { s.health -= 4; out.push('Burnout: your health takes a hit.'); }
    // weather and clothing
    s.weather = RU.weatherFor(d);
    if ((s.weather === 'frost' || s.weather === 'snow') && s.clothes < 40) { s.health -= 3; out.push('🥶 You are underdressed for the cold: health −3. Buy a proper coat and boots.'); }
    if (s.weather === 'rain' && s.clothes < 20) { s.health -= 1; }
    s.clothes = clamp(s.clothes - 0.3, 0, 100);
    if (s.partner) { s.partner.love = clamp(s.partner.love - 0.4, 0, 100); }
    if (s.kids > 0 && d.getDay() === 6) { const c = 2500 * s.kids; s.money -= c; out.push(`Child expenses this week: −${RU.money(c)}.`); }
    // weekly allowance Monday, rent Saturday
    if (d.getDay() === 1 && s.allow) { s.money += s.allow; out.push(`Weekly transfer from family: +${RU.money(s.allow)}.`); }
    if (d.getDay() === 6 && s.rent > 0) {
      if (s.money >= s.rent) { s.money -= s.rent; out.push(`Saturday: rent paid, −${RU.money(s.rent)}.`); }
      else s.queue.push('rent_short');
    }
    CAL.forEach(c => { if (c.m === d.getMonth() + 1 && c.d === d.getDate()) s.queue.push(c.id); });
    if (d.getDate() === 1 && s.job === null && s.status !== 'citizen') out.push('New month: remember to check your documents.');
    return out;
  };

  RU.checkEnd = function (s) {
    if (s.over) return;
    if (s.health <= 0) s.over = 'hospital';
    else if (s.status !== 'citizen' && s.strikes >= 3) s.over = 'deported';
    else if (s.money < -30000) s.over = 'debt';
    else if (s.day >= RU.MAXDAY) s.over = 'time';
  };

  /* ---------- Goals & score ---------- */
  RU.goals = [
    { id: 'admit', label: 'Get into a university', done: s => !!s.flags.admitted },
    { id: 'save', label: 'Save ₽500,000', done: s => s.money >= 500000 },
    { id: 'rutest', label: 'Pass the Russian language & history test', done: s => !!s.flags.rutest || s.status === 'citizen' },
    { id: 'rvp', label: 'Get temporary residence (RVP)', done: s => !!s.flags.rvp || s.status === 'citizen' },
    { id: 'vnzh', label: 'Get permanent residence (VNZh)', done: s => !!s.flags.vnzh || s.status === 'citizen' },
    { id: 'citizen', label: 'Become a Russian citizen', done: s => !!s.flags.naturalized },
    { id: 'bank', label: 'Open a bank account', done: s => !!(s.bank.sber || s.bank.vtb || s.bank.tbank) },
    { id: 'family', label: 'Build a family (partner or child)', done: s => !!s.flags.married || s.kids > 0 },
    { id: 'friends', label: 'Make 5 friends', done: s => s.friends >= 5 },
    { id: 'clean', label: 'Finish with zero legal strikes', done: s => s.strikes === 0 },
  ];
  RU.score = s => Math.round(Math.max(0, s.money) / 1000 + s.know * 5 + s.rep * 2 + RU.goals.filter(g => g.done(s)).length * 400 - s.strikes * 150 + s.day);
  RU.endings = {
    hospital: ['🏥 Hospital', 'You pushed too hard. Doctors at the city clinic tell you the only treatment is sleep.'],
    deported: ['✈️ Deported', 'Three violations on record. Border service, entry ban, one-way ticket home.'],
    debt: ['💸 Debt spiral', 'The collectors, the loans, the phone that never stops. Time to start over.'],
    time: ['📅 Two years in Russia', 'Two winters survived. Here is how your story ended.'],
  };

  /* ---------- Save / load ---------- */
  RU.save = s => { try { localStorage.setItem('vrussia_save', JSON.stringify(s)); } catch (e) {} };
  RU.load = () => { try { const r = localStorage.getItem('vrussia_save'); const o = r ? JSON.parse(r) : null; return o && o.version === 2 ? o : null; } catch (e) { return null; } };
  RU.clear = () => { try { localStorage.removeItem('vrussia_save'); } catch (e) {} };
})();
