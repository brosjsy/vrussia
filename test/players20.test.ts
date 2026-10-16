/* The big play-test: 20 players on the game's own server (server/: real server code, real PostgreSQL in PGlite with the migrations and
   the server's small database role), each living 100 game days and using EVERY feature of the game, then playing each life to its end.
   - Every feature is one entry of FEATURES. Each player goes round all of them again and again (two a day besides the day's ordinary
     actions), so every player tries every feature several times. The report shows, feature by feature, how many of the players got it to
     work at least once, how often it worked, why it was refused, and every crash (a crash is a bug; a refusal with a reason is the game
     working). A feature that worked for nobody is flagged: either a bug or something players cannot reach.
   - The rules of the turn run as on the page (turn.ts: bills, holiday progress, the dream, achievements).
   - Every 10 days the world is checked: no server errors, numbers in range, sessions alive, server saves equal the device, private
     talks private, the number of accounts right.
   - The server counts limits by the clock, so after each day the stored rows are moved one hour back (an hour passes).
   Settings: PT_SEED (the same seed plays the same run), PT_DAYS (100), PT_PLAYERS (20), PT_OUT (where the report goes).
   Writes docs/PLAYTEST_20.md (and dev/playtest/<seed>.json for the long soak). Run: npm run playtest */
import { it, expect } from 'vitest';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { ApiCloud } from '../src/api-client';
import { directRoom, placeRoom } from '../src/cloud';
import { kitchenOf, buyGroceries, cook, cannotCook, RECIPES } from '../src/cooking';
import { enrol, cannotEnrol, COURSES, lectureScenario, homework, examReady, sitExam, studyOf } from '../src/study';
import { cannotWork, finishShift } from '../src/gigs';
import { visitScenario, VENUES, closed } from '../src/venues';
import { flows, validateStep, codeFor, submitFlow } from '../src/forms';
import type { Flow, Data } from '../src/forms';
import { DESTS, book, passportFor } from '../src/flights';
import { needsOf, useToilet, wash } from '../src/needs';
import { buy, wear, CATALOG, owned } from '../src/shop';
import { FURNITURE, buyFurn, placeFurn, furnOf, homeInterior, gridOf } from '../src/furniture';
import { renovate } from '../src/homes';
import { doActivity } from '../src/activities';
import { useObject } from '../src/objects';
import { moveTo, payBills, unpaid } from '../src/housing';
import { setGoal, move as saveMoney, savingsOf } from '../src/budget';
import { claim, claimable } from '../src/events';
import { profilesFor, swipe, dating, askOnDate, makeCouple } from '../src/dating';
import { newMemory, flip, memoryWon, newScramble, checkScramble, reward } from '../src/games';
import { contactsFor, callScript, transfer, canReceive, requestsFor, resolveRequest } from '../src/phone';
import { candidatesFor, vote as cityVote, run as runForOffice, openWeek } from '../src/election';
import { startNext } from '../src/build';
import { afterTurn, beforeAction } from '../src/turn';
import { tripScenario } from '../src/train-trip';
import { choresOf, hasWasher, planActive } from '../src/chores';
import { washClothes, topUpPhone, connectWifi, buyCard, topUpCard } from '../src/chores-do';
import { start, ORIGIN } from '../server/test/util';
import type { Ctx } from '../server/test/util';

const SEED = Number(process.env.PT_SEED ?? 1), DAYS = Number(process.env.PT_DAYS ?? 100), PLAYERS = Number(process.env.PT_PLAYERS ?? 20), CHECK_EVERY = 10;
// one seeded random source for the bots AND the game, so that a run can be played again exactly
let seed = (SEED * 2654435761) >>> 0 || 1;
Math.random = () => { seed = (Math.imul(seed ^ (seed >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return (seed >>> 8) / 16777216; };

type Style = 'careful' | 'social' | 'hustler' | 'random';
const STYLES: Style[] = ['careful', 'social', 'hustler', 'random'];
const NAMES = ['aigerim', 'bakhrom', 'chidi', 'dasha', 'emeka', 'farida', 'gulnara', 'hiro', 'ivan', 'jamila', 'kofi', 'lena', 'maksim', 'nodira', 'olu', 'pavel', 'qudrat', 'rustam', 'sveta', 'timur'];
const LINES = ['Привет! Кто идёт в МФЦ?', 'Does anyone know a good banya here?', 'Ищу работу курьером', 'The metro is so beautiful', 'Где купить сим-карту?', 'Как дела?', 'Anyone studying Russian A2?', 'Пельмени лучше дома', 'New here, from far away', 'Снег скоро!'];
const R = (n: number): number => Math.floor(Math.random() * n);
const pick = <T>(a: T[]): T => a[R(a.length)];

interface P { last?: { over: string; money: number; day: number }; name: string; style: Style; api: ApiCloud; s: G.State; id: string; lives: number; adult: boolean; scores: number; turn: number; pw: string }
type Out = { ok: boolean; why?: string } | null;          // null: does not apply right now (not counted)
interface Feature { id: string; area: string; run: (p: P, day: number) => Out | Promise<Out> }

const yes: Out = { ok: true };
const no = (why: string): Out => ({ ok: false, why: why.replace(/\s+/g, ' ').slice(0, 60) });
const res = (r: { ok: boolean; msg?: string; message?: string }): Out => (r.ok ? yes : no(r.msg ?? r.message ?? 'refused'));
const choose = (p: P, sc: G.Scenario): void => { G.choose(p.s, sc, p.style === 'random' ? R(sc.choices.length) : 0); };
let everyone: P[] = [];
const runQ = (p: P): void => { let g = 0; while (p.s.queue.length && g++ < 20) { const sc = G.get(p.s.queue.shift() as string, p.s); if (sc) choose(p, sc); } };
/* a website form, filled in like a player: the default where there is one, the first choice of a list, ticks, the SMS code, and plain
   believable text (a phone number, an INN, an address, the player's own name where the form checks it) */
const TEXT: Record<string, string> = { pay: '2500', phone: '9161234567', inn: '123456789012', addr: 'Moscow, Lenina 1', cn: 'Misha', w: 'Ivan', dob: '2000-09-01' };
function fillFlow(p: P, fl: Flow): Out {
  const why = fl.available(p.s); if (why) return no(why);
  const data: Data = {};
  for (const st of fl.steps) {
    const fields = st.fields(p.s, data); codeFor(fields, data);
    const values: Data = {};
    for (const fd of fields) {
      if (fd.type === 'note') continue;
      values[fd.id] = fd.type === 'code' ? data._code : fd.type === 'checkbox' ? 'yes' : fd.init || ((fd.type === 'select' || fd.type === 'radio') && fd.options?.length ? fd.options[0][0] : (fd.id === 'pname' || fd.id === 'who') ? p.s.name : TEXT[fd.id] ?? 'Test');
    }
    const err = validateStep(fields, values, p.s, data); if (err) return no(`step "${st.title}": ${err}`);
    Object.assign(data, values);
  }
  submitFlow(p.s, fl, data); return yes;
}
const others = (p: P): P[] => everyone.filter(o => o !== p);

/* ---------------- every feature of the game ---------------- */
const FEATURES: Feature[] = [
  // life in the city: the game's own actions, one by one
  ...G.actions.filter(a => a.id !== 'flight' && a.id !== 'online').map(a => ({ id: `action: ${a.id}`, area: 'Life', run: (p: P): Out => { beforeAction(p.s, a.id); const r = G.perform(p.s, a.id); if (r.sc) choose(p, r.sc); return yes; } })),
  { id: 'train to another city', area: 'Travel', run: p => { if (Math.random() < 0.6) return null; const to = pick(G.CITIES.filter(c => c !== p.s.city)); const sc = tripScenario(p.s, to); if (!sc) return no('no railway'); const cls = sc.choices.findIndex(c => !c.t.includes('(') && !c.t.startsWith('Not now')); if (cls < 0) return no(sc.choices[0].t.split('(').pop()!.replace(/\)$/, '')); G.choose(p.s, sc, cls); return p.s.city === to ? yes : no('did not arrive'); } },
  { id: 'metro or bus to a place', area: 'Travel', run: p => { const dest = pick(G.PLACES.filter(x => x.id !== p.s.loc && (x.id !== 'work' || p.s.job))); choose(p, G.startTrip(p.s, dest.id)); return yes; } },
  // needs
  { id: 'toilet', area: 'Needs', run: p => res(useToilet(p.s)) },
  { id: 'shower', area: 'Needs', run: p => res(wash(p.s, 'shower')) },
  // food and home life
  { id: 'buy groceries', area: 'Food', run: p => res(buyGroceries(p.s, 'shop')) },
  { id: 'cook a meal', area: 'Food', run: p => { const k = kitchenOf(p.s); const rec = RECIPES.filter(x => x.skill <= k.skill).pop() ?? RECIPES[0]; if (cannotCook(p.s, rec)) buyGroceries(p.s, 'shop'); return res(cook(p.s, rec.id)); } },
  { id: 'tea / samovar', area: 'Home life', run: p => res(useObject(p.s, 'tea')) },
  { id: 'watch TV', area: 'Home life', run: p => res(useObject(p.s, 'tv')) },
  { id: 'sit and rest', area: 'Home life', run: p => res(useObject(p.s, 'sit')) },
  ...([['chair', 'gossip'], ['table', 'breakfast'], ['plant', 'water'], ['tv', 'news'], ['window', 'look']] as const).map(([k, a]) => ({ id: `home activity: ${k} · ${a}`, area: 'Home life', run: (p: P): Out => res(doActivity(p.s, k, a)) })),
  // study
  { id: 'enrol in a course', area: 'Study', run: p => { if (studyOf(p.s).course) return null; const next = COURSES.find(x => !cannotEnrol(p.s, x.id)); if (!next) return no(cannotEnrol(p.s, COURSES.find(x => !studyOf(p.s).certs.includes(x.id))?.id ?? '') ?? 'every course passed'); return res(enrol(p.s, next.id)); } },
  { id: 'lecture', area: 'Study', run: p => { const l = lectureScenario(p.s); if (!l) return null; choose(p, l); return yes; } },
  { id: 'homework', area: 'Study', run: p => (studyOf(p.s).course ? res(homework(p.s)) : null) },
  { id: 'exam', area: 'Study', run: p => (examReady(p.s) ? res(sitExam(p.s, Math.random())) : null) },
  // jobs
  ...(['courier', 'barista'] as const).map(g => ({ id: `shift: ${g}`, area: 'Jobs', run: (p: P): Out => { const why = cannotWork(p.s, g); if (why) return no(why); finishShift(p.s, g, 40 + R(60)); return yes; } })),
  // places
  ...VENUES.map(v => ({ id: `go out: ${v.id}`, area: 'Places', run: (p: P): Out => { const why = closed(p.s, v); if (why) return no(why); const sc = visitScenario(p.s, v.id); if (!sc) return no('not offered here'); choose(p, sc); return yes; } })),
  // shopping and clothes
  { id: 'buy clothes', area: 'Shop', run: p => { const list = CATALOG.filter(i => i.slot && !owned(p.s, i.id)); return list.length ? res(buy(p.s, pick(list).id)) : null; } },
  { id: 'wear something', area: 'Shop', run: p => { const it = CATALOG.find(i => owned(p.s, i.id) && i.slot); return it ? res(wear(p.s, it.id)) : null; } },
  { id: 'buy a gift', area: 'Shop', run: p => res(buy(p.s, pick(['flowers', 'chocolates']))) },
  // the home
  { id: 'buy and place furniture', area: 'Home', run: p => {
    const list = FURNITURE.filter(x => x.price < p.s.money / 4); if (!list.length) return no('cannot afford any piece');
    const f = pick(list); const b = buyFurn(p.s, f.id); if (!b.ok) return res(b);
    const g = gridOf(homeInterior(p.s));
    for (let j = 0; j < g.rows; j++) for (let i = 0; i < g.cols; i++) for (const rot of [0, 1] as const) { if (placeFurn(p.s, f.id, i, j, rot).ok) return yes; }
    return no('bought, but no free spot in the flat');
  } },
  { id: 'renovate: floor', area: 'Home', run: p => res(renovate(p.s, 'floor', pick(['lino', 'checker', 'plank', 'parquet']))) },
  { id: 'renovate: walls', area: 'Home', run: p => res(renovate(p.s, 'wall', pick(['#e7d9a8', '#f3f3ee', '#bfd6c4']))) },
  { id: 'rent a better flat', area: 'Home', run: p => res(moveTo(p.s, pick(['kommunalka', 'studio', 'tworoom'] as const))) },
  { id: 'pay bills', area: 'Home', run: p => (unpaid(p.s).length ? res(payBills(p.s)) : null) },
  { id: 'build own house', area: 'Home', run: p => res(startNext(p.s)) },
  // money
  { id: 'savings goal', area: 'Money', run: p => (savingsOf(p.s).goal ? null : res(setGoal(p.s, 'A winter coat', 30000))) },
  { id: 'put money aside', area: 'Money', run: p => (savingsOf(p.s).goal ? res(saveMoney(p.s, 1000)) : null) },
  // phone
  { id: 'phone: call someone', area: 'Phone', run: p => { const list = contactsFor(p.s); if (!list.length) return null; const c = pick(list); const r = callScript(p.s, c); G.addCall(p.s, c.name, 'out'); G.apply(p.s, r.fx); return yes; } },
  { id: 'phone: send money', area: 'Phone', run: p => { const c = contactsFor(p.s).find(canReceive); if (!c) return null; const r = transfer(p.s, c, '500'); if (r.ok) G.apply(p.s, r.fx); return res(r); } },
  { id: 'phone: strange messages', area: 'Phone', run: p => { const q = requestsFor(p.s)[0]; if (!q) return null; const r = resolveRequest(p.s, q, 'block'); G.apply(p.s, r.fx); return yes; } },
  { id: 'phone: dating app', area: 'Phone', run: p => {
    const m = dating(p.s).matches[0];
    if (m && Math.random() < 0.5) { for (let k = 0; k < 3; k++) { G.addChat(p.s, 'date:' + m.id, 'me', pick(['Привет!', 'How was your day?', 'Do you like the metro?'])); G.addChat(p.s, 'date:' + m.id, 'them', 'Hi!'); } const r = askOnDate(p.s, m); if (r.ok) { G.apply(p.s, r.fx); if (r.becameCouple) makeCouple(p.s, m); } return r.ok ? yes : no(r.message); }
    const pr = profilesFor(p.s)[0]; if (!pr) return no('no profiles left today'); swipe(p.s, pr, Math.random() < 0.6); return yes;
  } },
  { id: 'phone: memory game', area: 'Phone', run: p => { let m = newMemory(p.name + p.s.day); for (let i = 0; i < 400 && !memoryWon(m); i++) m = flip(m, R(m.cards.length)); if (!memoryWon(m)) return no('not finished in 400 flips'); G.apply(p.s, reward(p.s, 'memory').fx); return yes; } },
  { id: 'phone: word game', area: 'Phone', run: p => { const sc = newScramble(p.name + p.s.day); if (!checkScramble(sc, sc.word)) return no('the right word was refused'); G.apply(p.s, reward(p.s, 'scramble').fx); return yes; } },
  // online services: every website form, filled in step by step like a player
  ...flows.map(fl => ({ id: `online service: ${fl.id}`, area: 'Services', run: (p: P): Out => fillFlow(p, fl) })),
  { id: 'book a flight', area: 'Travel', run: p => {
    if (p.s.booking && !p.s.booking.done) return null;
    const bank = Object.keys(p.s.bank).find(k => p.s.bank[k]);
    return res(book(p.s, { dest: pick(DESTS).id, lead: pick([14, 21, 30]), stay: pick([3, 7]), fare: 2, first: p.s.name, last: 'Testova', passport: passportFor(p.s), baggage: false, meal: false, insurance: Math.random() < 0.5, seat: false, pay: bank ?? 'agent' }));
  } },
  // daily chores (chores.ts, added in learning round 5)
  { id: 'wash clothes', area: 'Daily life', run: p => (choresOf(p.s).clothes > 60 ? null : res(washClothes(p.s, hasWasher(p.s) && p.s.loc === 'home' ? 'home' : 'laundromat'))) },
  { id: 'top up the mobile plan', area: 'Daily life', run: p => (planActive(p.s) && Math.random() < 0.7 ? null : res(topUpPhone(p.s, 1))) },
  { id: 'connect home internet', area: 'Daily life', run: p => (choresOf(p.s).wifi ? null : res(connectWifi(p.s))) },
  { id: 'transport card', area: 'Daily life', run: p => { const c = choresOf(p.s).card; return c && c.city === p.s.city ? res(topUpCard(p.s, 500)) : res(buyCard(p.s)); } },
  // the city
  { id: 'vote for governor', area: 'City', run: p => { if (p.s.loc !== 'mfc') { choose(p, G.startTrip(p.s, 'mfc')); runQ(p); } const c = candidatesFor(p.s.city, openWeek(p.s))[0]; return c ? res(cityVote(p.s, c.id)) : no('no candidates'); } },
  { id: 'run for governor', area: 'City', run: p => res(runForOffice(p.s, pick(['queue', 'heat', 'dogs', 'metro']))) },
  { id: 'holiday pass', area: 'City', run: p => (claimable(p.s) ? (claim(p.s), yes) : null) },
  // online, with other players, on the server
  { id: 'chat at a place', area: 'Online', run: async p => (p.adult ? res(await p.api.send(placeRoom(p.s.city, p.s.loc), pick(LINES))) : null) },
  { id: 'chat: a rude word is refused', area: 'Online', run: async p => { if (!p.adult) return null; const r = await p.api.send(placeRoom(p.s.city, p.s.loc), 'ты сука'); return r.ok ? no('a rude word got through') : yes; } },
  { id: 'private message', area: 'Online', run: async p => { if (!p.adult) return null; const list = others(p).filter(o => o.adult); return list.length ? res(await p.api.send(directRoom(p.id, pick(list).id), 'Привет!')) : null; } },
  { id: 'list of private talks', area: 'Online', run: async p => (p.adult ? res(await p.api.talks()) : null) },
  { id: 'report a message', area: 'Online', run: async p => { if (!p.adult) return null; const m = ((await p.api.messages(placeRoom(p.s.city, p.s.loc))).data ?? []).find(x => x.sender !== p.id); return m ? res(await p.api.report(m.id, 'spam in the chat')) : null; } },
  { id: 'follow a player', area: 'Online', run: async p => res(await p.api.follow(pick(others(p)).id)) },
  { id: 'friends list', area: 'Online', run: async p => res(await p.api.friends()) },
  { id: 'find a player by name', area: 'Online', run: async p => { const q = pick(others(p)); const r = await p.api.findPlayers(q.name.slice(0, 3)); return r.ok && (r.data ?? []).some(x => x.username === q.name) ? yes : no(r.msg || 'not found'); } },
  { id: 'block a player', area: 'Online', run: async p => (Math.random() < 0.15 ? res(await p.api.block(pick(others(p)).id)) : null) },
  { id: 'post an advert', area: 'Online', run: async p => ((await p.api.myAds()).data ?? []).length >= 3 ? null : res(await p.api.postAd(p.s.city, pick(['room', 'job', 'sell', 'service'] as const), pick(['Room near the metro', 'Selling a warm coat', 'Courier wanted', 'Russian lessons']), 'Write to me', R(20000))) },
  { id: 'read adverts', area: 'Online', run: async p => res(await p.api.ads(p.s.city)) },
  { id: 'show my home', area: 'Online', run: async p => res(await p.api.publishHome(p.s.city, 'flat', { placed: furnOf(p.s).placed.slice(0, 40).map(x => ({ id: x.id, i: x.i, j: x.j, rot: x.rot })), w: 12, d: 9 }, R(200))) },
  { id: 'visit a home + guest book', area: 'Online', run: async p => { const q = pick(others(p)); const h = await p.api.home(q.id); if (!h.ok) return res(h); if (!h.data) return null; return res(await p.api.signGuestbook(q.id, 'Уютно у тебя!', Math.random() < 0.3 ? 'tea' : null)); } },
  { id: 'like a home (once a week)', area: 'Online', run: async p => { const mine = await p.api.myHomeVote(); if (!mine.ok) return res(mine); if (mine.data) return null; return res(await p.api.voteHome(pick(others(p)).id)); } },
  { id: 'see my adverts', area: 'Online', run: async p => res(await p.api.myAds()) },
  { id: 'news and counters', area: 'Online', run: async p => { const a = await p.api.announcements(); const c2 = await p.api.counters(); return a.ok && c2.ok ? yes : no(a.msg || c2.msg); } },
  { id: 'who is online', area: 'Online', run: async p => res(await p.api.online()) },
  { id: 'leaderboard', area: 'Online', run: async p => res(await p.api.top(20)) },
  { id: 'load my save', area: 'Online', run: async p => { const l = await p.api.load(); return l.ok ? (l.data ? yes : no('no save yet')) : res(l); } },
];

it(`${PLAYERS} players live ${DAYS} days using every feature of the game, on the game's own server (seed ${SEED})`, async () => {
  const c: Ctx = await start({ LOG_LEVEL: 'error' });
  const serverErrors: string[] = [], problems: string[] = [], checks: string[] = [];
  const t0 = Date.now();
  const grid: Record<string, Record<string, { ok: number; no: number; err: number }>> = {};
  const why: Record<string, Record<string, number>> = {}, crashes: Record<string, string[]> = {};
  const record = (f: string, who: string, o: Out, err?: string): void => {
    if (!o && !err) return;
    const g = ((grid[f] ??= {})[who] ??= { ok: 0, no: 0, err: 0 });
    if (err) { g.err++; const list = (crashes[f] ??= []); if (list.length < 3) list.push(`${who}: ${err}`); return; }
    if (o!.ok) g.ok++; else { g.no++; const w = (why[f] ??= {}); const k = o!.why ?? 'refused'; w[k] = (w[k] ?? 0) + 1; }
  };
  const browserFor = (jar: { v: string }, who: string): typeof fetch => (async (url: string, init: RequestInit = {}) => {
    const u = new URL(url);
    const r = await c.app.inject({ method: (init.method ?? 'GET') as 'GET', url: u.pathname + u.search, payload: init.body as string | undefined, headers: { ...(init.headers as Record<string, string>), origin: ORIGIN, ...(jar.v ? { cookie: jar.v } : {}) } });
    const set = r.headers['set-cookie']; if (set) { const v = String(Array.isArray(set) ? set[0] : set).split(';')[0]; jar.v = v.endsWith('=') ? '' : v; }
    if (r.statusCode >= 500) serverErrors.push(`${who} ${init.method ?? 'GET'} ${u.pathname} -> ${r.statusCode} ${r.body.slice(0, 120)}`);
    return { ok: r.statusCode < 400, status: r.statusCode, json: async () => r.json(), text: async () => r.body } as Response;
  }) as unknown as typeof fetch;
  const linkIn = (to: string, key: string): string => new RegExp(`#${key}=([A-Za-z0-9_-]{43})`).exec(c.mail.last(to)!.text)![1];

  /* ---------- the players arrive: sign up, confirm, log in, a public name ---------- */
  const players: P[] = [];
  for (let i = 0; i < PLAYERS; i++) {
    const name = NAMES[i % NAMES.length] + (i >= NAMES.length ? String(i) : ''), email = `${name}@play.test`, pw = `${name} plays v russia every day`, jar = { v: '' };
    const api = new ApiCloud('https://api.example.org', { fetch: browserFor(jar, name), kv: null });
    const adult = i % 7 !== 6;
    record('account: sign up', name, res(await api.signUp(email, pw, name, adult)));
    record('account: confirm e-mail', name, res(await api.verifyEmail(linkIn(email, 'verify'))));
    record('account: log in', name, res(await api.signIn(email, pw)));
    if (!api.session()?.username) record('account: choose name', name, res(await api.claim(name, adult)));
    players.push({ name, style: STYLES[i % STYLES.length], api, s: G.newState(name, G.origins[i % G.origins.length].id), id: api.session()!.userId, lives: 1, adult, scores: 0, turn: i * 3, pw });
  }
  everyone = players;

  const ordinary = (p: P): string => {
    const s = p.s;
    if (s.energy < 25) return 'home';
    if (s.energy < 45 && s.money > 400) return 'food';
    if (p.style === 'careful' && G.problems(s).length) return 'paper';
    if (p.style === 'careful' && s.stress > 70) return 'home';
    if (p.style !== 'random' && G.problems(s).length && Math.random() < 0.6) return 'paper';
    if (p.style === 'hustler' && Math.random() < 0.55) return 'work';
    if (p.style === 'social' && Math.random() < 0.35) return pick(['people', 'out', 'culture']);
    return Math.random() < 0.4 ? 'work' : pick(['paper', 'edu', 'out', 'money', 'people', 'family', 'culture', 'home', 'food', 'travel']);
  };
  const runQueue = (p: P): void => { let g = 0; while (p.s.queue.length && g++ < 20) { const sc = G.get(p.s.queue.shift() as string, p.s); if (sc) choose(p, sc); } };
  const partOfDay = (p: P): void => {
    runQueue(p); if (p.s.over) return;
    const id = ordinary(p); beforeAction(p.s, id); const r = G.perform(p.s, id); if (r.sc) choose(p, r.sc);
    afterTurn(p.s);
  };
  const tryFeature = async (p: P, f: Feature, day: number): Promise<void> => {
    if (p.s.over) return;
    try { const o = await f.run(p, day); runQueue(p); afterTurn(p.s); record(f.id, p.name, o); }
    catch (e) { record(f.id, p.name, null, String((e as Error)?.message ?? e).slice(0, 140)); }
  };
  const newLifeIfOver = async (p: P): Promise<void> => {
    if (!p.s.over) return;
    const sc = await p.api.submitScore(p.s.o, p.s.city, p.s.over, G.score(p.s), Math.max(1, p.s.day)); record('leaderboard: send my score', p.name, res(sc)); if (sc.ok) p.scores++;
    p.last = { over: p.s.over, money: p.s.money, day: p.s.day };
    p.s = G.newState(p.name, p.s.o); p.lives++;
  };

  let gone = 0;
  const check = async (day: number): Promise<void> => {
    const found: string[] = [];
    for (const p of players) {
      const s = p.s;
      for (const k of ['energy', 'health', 'stress', 'rep', 'know'] as const) if (!(s[k] >= 0 && s[k] <= 100)) found.push(`${p.name}: ${k}=${s[k]}`);
      if (!Number.isFinite(s.money)) found.push(`${p.name}: money is ${s.money}`);
      for (const [k, v] of Object.entries(needsOf(s) as unknown as Record<string, number>)) if (typeof v === 'number' && !(v >= 0 && v <= 100)) found.push(`${p.name}: need ${k}=${v}`);
      if (!(await p.api.restore())) found.push(`${p.name}: the server no longer knows the session`);
    }
    for (const p of players.slice(0, 5)) { await p.api.save(p.s); const l = await p.api.load(); if (!l.ok || !l.data || l.data.state.day !== p.s.day || l.data.state.money !== p.s.money) found.push(`${p.name}: the server save differs from the device`); }
    const [a, b, x] = players;
    const leak = await x.api.messages(directRoom(a.id, b.id)); if (leak.ok && (leak.data ?? []).length) found.push(`privacy: ${x.name} read private messages of ${a.name} and ${b.name}`);
    const rows = (await c.t.admin('select (select count(*) from app.messages)::int m, (select count(*) from app.sessions)::int s, (select count(*) from app.users)::int u')).rows[0];
    if (rows.u !== PLAYERS - gone) found.push(`accounts: ${rows.u}, expected ${PLAYERS - gone}`);
    checks.push(`day ${day}: ${found.length ? found.length + ' problem(s)' : 'all well'} · server errors so far ${serverErrors.length} · messages ${rows.m} · sessions ${rows.s}`);
    problems.push(...found.map(f => `day ${day}: ${f}`));
  };
  const anHourPasses = async (): Promise<void> => {
    for (const tb of ['messages', 'scores', 'guestbook']) await c.t.admin(`update app.${tb} set created_at = created_at - interval '1 hour'`);
    await c.t.admin("update app.ads set created_at = created_at - interval '1 hour', expires_at = expires_at - interval '1 hour'");
  };

  /* ---------- the days ---------- */
  for (let day = 1; day <= DAYS; day++) {
    for (const p of [...players]) {
      partOfDay(p); partOfDay(p);
      for (let k = 0; k < 2; k++) await tryFeature(p, FEATURES[p.turn++ % FEATURES.length], day);
      record('presence in the city', p.name, res(await p.api.heartbeat(p.s.city, p.s.loc)));
      if (day % 5 === 0) record('automatic save', p.name, res(await p.api.save(p.s)));
      if (day === 50) record('city vote online', p.name, res(await p.api.castVote(1, p.s.city, pick(['Ivanova', 'Petrov', 'Sidorova']))));
      await newLifeIfOver(p);
    }
    if (day === 30) for (const p of players.filter(q => q.style === 'careful')) { await p.api.signOut(); record('account: log out', p.name, p.api.session() ? no('still logged in') : yes); record('account: log in again', p.name, res(await p.api.signIn(p.name + '@play.test', p.pw))); }
    if (day === 40) { const p = players[7 % players.length]; record('account: forgot password', p.name, res(await p.api.forgot(p.name + '@play.test'))); record('account: reset password', p.name, res(await p.api.resetPassword(linkIn(p.name + '@play.test', 'reset'), p.name + ' has a fresh passphrase'))); p.pw = p.name + ' has a fresh passphrase'; record('account: log in after reset', p.name, res(await p.api.signIn(p.name + '@play.test', p.pw))); }
    if (day === 60) { const p = players[8 % players.length]; const np = p.name + ' has a new passphrase'; record('account: change password', p.name, res(await p.api.changePassword(p.pw, np))); p.pw = np; record('account: log out other devices', p.name, res(await p.api.endOtherSessions())); }
    if (day === 90 && players.length > 3) { const p = players[players.length - 1]; const d = await p.api.deleteAccount(p.pw); record('account: delete', p.name, res(d)); if (d.ok) { players.splice(players.indexOf(p), 1); everyone = players; gone++; } }
    await anHourPasses();
    if (day % CHECK_EVERY === 0) await check(day);
  }

  /* ---------- every life is played to its end, and goes on the leaderboard ---------- */
  // the rest of each life (up to two years): ordinary days, and every third part of a day one more feature, so that seasons, children,
  // fines, the June university window and the later papers are reached too
  for (const p of players) { let g = 0; while (!p.s.over && g++ < 30000) { partOfDay(p); if (g % 3 === 0) await tryFeature(p, FEATURES[p.turn++ % FEATURES.length], DAYS + Math.floor(g / 3)); } await newLifeIfOver(p); }
  const board = (await players[0].api.top(100)).data ?? [];
  const sent = players.reduce((a, p) => a + p.scores, 0);
  if (board.length !== sent) problems.push(`leaderboard has ${board.length} rows for ${sent} scores of the players still here`);
  if (board.some((r, i) => i > 0 && r.score > board[i - 1].score)) problems.push('leaderboard is not sorted');

  /* ---------- the report ---------- */
  const all = Object.keys(grid);
  const area = (f: string): string => FEATURES.find(x => x.id === f)?.area ?? (f.startsWith('account') ? 'Account' : 'Online');
  const rows = all.sort((a, b) => area(a).localeCompare(area(b)) || a.localeCompare(b)).map(f => {
    const g = grid[f], ps = Object.keys(g), okP = ps.filter(n => g[n].ok > 0).length, tot = ps.reduce((s, n) => s + g[n].ok + g[n].no + g[n].err, 0), ok = ps.reduce((s, n) => s + g[n].ok, 0), err = ps.reduce((s, n) => s + g[n].err, 0);
    const w = Object.entries(why[f] ?? {}).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, v]) => `${k.replace(/\|/g, '/')} (${v})`).join('; ');
    return { f, area: area(f), okP, ps: ps.length, tot, ok, err, w };
  });
  const nobody = rows.filter(r => r.ok === 0), crashed = rows.filter(r => r.err > 0);
  const perPlayer = players.map(p => { const used = all.filter(f => grid[f][p.name]?.ok); return `| ${p.name} | ${p.style} | ${G.origins.find(o => o.id === p.s.o)?.label} | ${used.length} of ${all.length} | ${p.lives} | ${p.last ? `${p.last.over} on day ${p.last.day}` : '—'} | ${p.last ? G.money(p.last.money) : '—'} |`; });
  const out = [
    `# Play-test: ${PLAYERS} players, ${DAYS} days, every feature, on the game's own server`, '',
    `Seed ${SEED} (the same seed plays the same run). ${Math.round((Date.now() - t0) / 1000)} s. ${FEATURES.length} features driven by the bots, plus the account steps, presence, saving, the city vote and the leaderboard. Styles: careful, social, hustler, random. Every 7th player is under 18 (no chat).`, '',
    '## Verdict', '',
    `- Crashes (bugs): ${crashed.length ? crashed.map(r => r.f).join(', ') : 'none'}.`,
    `- Features that worked for nobody: ${nobody.length ? nobody.map(r => `${r.f} (${r.w || 'never applicable'})`).join('; ') : 'none'}.`,
    `- Server errors: ${serverErrors.length}. World problems: ${problems.length}.`, '',
    '## Every feature', '', '| Area | Feature | Players it worked for | Tries | Worked | Main reasons it was refused |', '|---|---|---|---|---|---|',
    ...rows.map(r => `| ${r.area} | ${r.f} | ${r.okP} / ${r.ps} | ${r.tot} | ${Math.round((100 * r.ok) / Math.max(1, r.tot))}%${r.err ? ` · **${r.err} crashes**` : ''} | ${r.w || '—'} |`), '',
    ...(crashed.length ? ['## Crashes', '', ...crashed.flatMap(r => (crashes[r.f] ?? []).map(x => `- ${r.f}: ${x}`)), ''] : []),
    '## Each player', '', '| Player | Style | Origin | Features that worked | Lives | How the last life ended | Money then |', '|---|---|---|---|---|---|---|', ...perPlayer, '',
    '## The world, checked every 10 days', '', ...checks.map(x => '- ' + x), '',
    '## Problems found', '', ...(problems.length ? problems.map(x => '- ' + x) : ['- none']), '',
    '## Server errors (5xx)', '', ...(serverErrors.length ? serverErrors.slice(0, 30).map(x => '- ' + x) : ['- none']), '',
    `Leaderboard top: ${board.slice(0, 5).map(r => `@${r.username} ${r.score}`).join(', ')}.`, '',
  ];
  if (existsSync('docs/PLAYTEST_LOG.md')) out.push(readFileSync('docs/PLAYTEST_LOG.md', 'utf8'));
  writeFileSync(process.env.PT_OUT ?? 'docs/PLAYTEST_20.md', out.join('\n'));
  mkdirSync('dev/playtest', { recursive: true });
  writeFileSync(`dev/playtest/${SEED}.json`, JSON.stringify({ seed: SEED, crashes: crashed.map(r => ({ f: r.f, ex: crashes[r.f] })), nobody: nobody.map(r => ({ f: r.f, w: r.w })), serverErrors, problems, rows }, null, 1));
  await c.app.close(); await c.t.close();
  expect(serverErrors, serverErrors.join('\n')).toEqual([]);
  expect(problems, problems.join('\n')).toEqual([]);
  expect(crashed.map(r => `${r.f}: ${(crashes[r.f] ?? []).join(' | ')}`)).toEqual([]);
}, 1_800_000);
