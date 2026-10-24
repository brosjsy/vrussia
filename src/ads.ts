/* The adverts board: the small ads of a Russian city (a room to let, a day's work, a sofa for sale, a tutor, a lost cat) and the player's own ads.
   Every day the board shows a fresh set; the player can answer one, and can pay a small fee to put up an ad of their own and get replies over the next
   days. Everything is opt-in, so the bots never touch it and the balance reports do not change. Small on purpose: an ad is worth about a day's odd job,
   never a salary. Pure and deterministic: no screen, no network. (Ads from real players are a separate, online thing: see cloud.ts.) */
import type { State } from './engine';
import { boostsAds } from './adspace';

export type AdKind = 'room' | 'job' | 'sell' | 'service' | 'lost';
export interface Ad { id: string; kind: AdKind; title: string; text: string; price: number; by: string }
export interface Reply { ad: string; day: number; from: string; text: string; offer: number; done?: boolean }
export interface MyAd { id: string; kind: Exclude<AdKind, 'lost'>; title: string; price: number; day: number }
export interface AdsState { mine: MyAd[]; replies: Reply[]; answered: string[]; lastPost: number; lastSale: number; seq: number; ticked: number }
export interface Result { ok: boolean; msg: string }

export const POST_FEE = 150;          // roubles to put an ad on the board
export const AD_DAYS = 7;             // an ad hangs for a week
export const MAX_MINE = 3;
export const MAX_PRICE = 4000;        // the most an old thing can be asked for
export const SALE_GAP = 7;            // days between two "for sale" ads: nobody has an endless supply of old things
export const ANSWERS_PER_DAY = 2;

type S = State & { ads?: AdsState };
export const adsOf = (s: State): AdsState => { const x = s as S; if (!x.ads) x.ads = { mine: [], replies: [], answered: [], lastPost: -99, lastSale: -99, seq: 0, ticked: s.day }; return x.ads; };
const hash = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };
const rnd = (seed: string): (() => number) => { let v = hash(seed) || 1; return () => { v = (Math.imul(v ^ (v >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return (v >>> 8) / 16777216; }; };
const clamp = (v: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, v));
const NAMES = ['Olga', 'Timur', 'Sasha', 'Dilnoza', 'Pavel', 'Aigul', 'Nikita', 'Madina', 'Viktor', 'Zarina', 'Anton', 'Gulnara', 'Ilya', 'Farida', 'Roman', 'Lena'];

const POOL: Record<AdKind, { title: string; text: string; lo: number; hi: number }[]> = {
  room: [
    { title: 'Room in a two-room flat', text: 'Ten minutes from the metro. Quiet neighbours, a washing machine, registration is possible. Come and look.', lo: 0, hi: 0 },
    { title: 'Bed in a clean hostel room', text: 'Four beds, a kitchen, hot water all day. The landlady shows the room in the evening.', lo: 0, hi: 0 },
    { title: 'Studio from the owner, no agent', text: 'After repairs, with furniture. A contract and a receipt for every payment.', lo: 0, hi: 0 },
    { title: 'Room for a student', text: 'Near the university. A desk, a lamp, fast internet. No smoking.', lo: 0, hi: 0 },
  ],
  job: [
    { title: 'Help to move a flat, one day', text: 'Third floor, there is a lift. Paid in cash the same evening.', lo: 1200, hi: 2200 },
    { title: 'Hand out leaflets by the metro', text: 'Four hours, warm clothes needed in winter. Paid at the end of the shift.', lo: 700, hi: 1100 },
    { title: 'Clear snow from a yard', text: 'A shovel is given. One morning of work.', lo: 900, hi: 1500 },
    { title: 'Help at a market stall on Saturday', text: 'Weighing, packing, talking to customers. Lunch is on the stall.', lo: 1000, hi: 1700 },
    { title: 'Assemble furniture for a new flat', text: 'A wardrobe and two beds. The tools are there.', lo: 1300, hi: 2000 },
    { title: 'Walk a dog for a week of mornings', text: 'A calm old spaniel. Paid for today on the spot.', lo: 500, hi: 800 },
  ],
  sell: [
    { title: 'Warm winter jacket, worn one season', text: 'Size fits most. Holds the frost well.', lo: 900, hi: 1800 },
    { title: 'Russian textbooks, levels A1 to B1', text: 'With pencil notes in the margins. Good for the exam.', lo: 300, hi: 700 },
    { title: 'Electric kettle and a set of cups', text: 'Works. Leaving the city, selling everything.', lo: 250, hi: 500 },
    { title: 'Old bicycle, needs a new chain', text: 'Rides. Honest price.', lo: 1200, hi: 2400 },
    { title: 'Desk lamp and a folding chair', text: 'For a student room.', lo: 300, hi: 600 },
  ],
  service: [
    { title: 'Russian lessons with a teacher', text: 'An hour of talking and grammar. Preparing for the language exam.', lo: 600, hi: 1000 },
    { title: 'Help with documents and forms', text: 'I check that everything is filled in correctly before you queue.', lo: 400, hi: 800 },
    { title: 'Massage for a tired back', text: 'After a shift on your feet. One hour.', lo: 800, hi: 1400 },
    { title: 'Phone and laptop repair', text: 'Cleaning, a new battery, the same day.', lo: 500, hi: 1200 },
  ],
  lost: [
    { title: 'Lost: a grey cat with a white paw', text: 'Ran out of the entrance on Tuesday. Answers to Barsik. Please call if you see him.', lo: 0, hi: 0 },
    { title: 'Found: a folder with documents', text: 'On a bench by the bus stop. I will give it to the owner.', lo: 0, hi: 0 },
    { title: 'Lost: a child\'s red mitten', text: 'Near the playground. It was knitted by a grandmother.', lo: 0, hi: 0 },
  ],
};
const ORDER: AdKind[] = ['job', 'room', 'sell', 'service', 'job', 'sell', 'lost', 'service'];

/** The ads on the board today: eight of them, the same all day, different tomorrow and in another city. */
export function boardFor(s: State): Ad[] {
  const r = rnd(`ads|${s.city}|${s.day}`), used = new Set<string>(), out: Ad[] = [];
  for (let i = 0; i < ORDER.length; i++) {
    const kind = ORDER[i], pool = POOL[kind]; let k = Math.floor(r() * pool.length);
    for (let tries = 0; tries < pool.length && used.has(kind + k); tries++) k = (k + 1) % pool.length;
    used.add(kind + k); const p = pool[k];
    out.push({ id: `${s.day}-${i}`, kind, title: p.title, text: p.text, price: Math.round((p.lo + r() * (p.hi - p.lo)) / 50) * 50, by: NAMES[Math.floor(r() * NAMES.length)] });
  }
  return out;
}
/** How many ads the player has answered today. */
export const answeredToday = (s: State): number => adsOf(s).answered.filter(id => id.startsWith(`${s.day}-`)).length;

/** Answers an ad from the board. Each kind does one small thing: a day's work pays and tires, a bought thing or a service costs and helps, a room
    viewing teaches a little about renting, a lost thing looked for earns thanks. */
export function answer(s: State, id: string): Result {
  const a = adsOf(s), ad = boardFor(s).find(x => x.id === id);
  if (!ad) return { ok: false, msg: 'That ad is no longer on the board.' };
  if (a.answered.includes(id)) return { ok: false, msg: 'You have already answered this ad.' };
  if (answeredToday(s) >= ANSWERS_PER_DAY) return { ok: false, msg: 'Two ads a day is enough. Look again tomorrow.' };
  if (ad.kind === 'job') {
    if (s.energy < 25) return { ok: false, msg: 'You are too tired for a day of odd work.' };
    s.energy = clamp(s.energy - 22); s.money += ad.price; s.stress = clamp(s.stress + 3);
    a.answered.push(id); return { ok: true, msg: `You did the job for ${ad.by} and were paid ${ad.price.toLocaleString('en-US')} roubles in cash.` };
  }
  if (ad.kind === 'sell' || ad.kind === 'service') {
    if (s.money < ad.price) return { ok: false, msg: 'You do not have enough money for this.' };
    s.money -= ad.price;
    if (ad.kind === 'sell') s.stress = clamp(s.stress - 4); else if (/lesson|document/i.test(ad.title)) s.know = clamp(s.know + 2); else { s.stress = clamp(s.stress - 6); s.energy = clamp(s.energy + 4); }
    a.answered.push(id); return { ok: true, msg: ad.kind === 'sell' ? `You bought it from ${ad.by}. A useful thing for little money.` : `${ad.by} did a good job. Money well spent.` };
  }
  if (ad.kind === 'room') {
    if (s.energy < 8) return { ok: false, msg: 'You are too tired to go and look at a room.' };
    s.energy = clamp(s.energy - 6); s.know = clamp(s.know + 1);
    a.answered.push(id); return { ok: true, msg: `You looked at the room with ${ad.by} and asked about the contract and registration. Now you know what to ask a landlord.` };
  }
  s.energy = clamp(s.energy - 4); s.rep = clamp(s.rep + 1);
  a.answered.push(id); return { ok: true, msg: `You looked around the yards and called ${ad.by}. They were very grateful.` };
}

const clean = (t: string): string => t.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
/** Puts the player's own ad on the board for a week. What can be advertised: an old thing for sale, looking for a day's work, offering lessons or help
    (needs some knowledge), looking for a room. */
export function post(s: State, kind: MyAd['kind'], title: string, price: number): Result {
  const a = adsOf(s), t = clean(title); expire(s);
  if (t.length < 4 || t.length > 60) return { ok: false, msg: 'Write a title of 4 to 60 characters.' };
  if (a.mine.length >= MAX_MINE) return { ok: false, msg: `You can have ${MAX_MINE} ads on the board at a time.` };
  if (a.lastPost === s.day) return { ok: false, msg: 'One new ad a day.' };
  if (s.money < POST_FEE) return { ok: false, msg: `The board takes ${POST_FEE} roubles for an ad.` };
  const p = Math.round(price);
  if (kind === 'sell') {
    if (!(p >= 100 && p <= MAX_PRICE)) return { ok: false, msg: `Ask between 100 and ${MAX_PRICE.toLocaleString('en-US')} roubles for an old thing.` };
    if (s.day - a.lastSale < SALE_GAP) return { ok: false, msg: 'You sold something not long ago. You have nothing else to sell this week.' };
    a.lastSale = s.day;
  }
  if (kind === 'service' && s.know < 20) return { ok: false, msg: 'You need to know more before you can offer lessons or help (knowledge 20).' };
  s.money -= POST_FEE; a.lastPost = s.day; a.seq++;
  a.mine.push({ id: `m${a.seq}`, kind, title: t, price: kind === 'sell' ? p : 0, day: s.day });
  return { ok: true, msg: `Your ad is on the board for ${AD_DAYS} days. Replies come over the next days.` };
}
/** Takes one of the player's ads down. */
export function remove(s: State, id: string): Result { const a = adsOf(s), n = a.mine.length; a.mine = a.mine.filter(m => m.id !== id); a.replies = a.replies.filter(r => r.ad !== id || r.done); return n === a.mine.length ? { ok: false, msg: 'No such ad.' } : { ok: true, msg: 'The ad is taken down.' }; }
function expire(s: State): void { const a = adsOf(s), gone = a.mine.filter(m => s.day - m.day >= AD_DAYS).map(m => m.id); if (gone.length) { a.mine = a.mine.filter(m => !gone.includes(m.id)); a.replies = a.replies.filter(r => !gone.includes(r.ad) || r.done); } a.replies = a.replies.filter(r => s.day - r.day < 14); a.answered = a.answered.filter(id => Number(id.split('-')[0]) >= s.day - 1); }

/** Brings the board up to date: for every day that has passed since the last look, somebody may have replied to each of the player's ads. Called when
    the board is opened (the engine does not know about ads, so the game stays the same size for people who never use them). Returns how many new replies. */
export function tickAds(s: State): number {
  const a = adsOf(s); let n = 0;
  for (let day = Math.max(a.ticked + 1, s.day - AD_DAYS); day <= s.day; day++) {
    for (const m of a.mine) {
      if (day <= m.day || day - m.day >= AD_DAYS || a.replies.some(r => r.ad === m.id && !r.done)) continue;      // one open reply at a time for each ad
      const r = rnd(`reply|${s.city}|${day}|${m.id}`); if (r() > (boostsAds(s, day) ? 0.85 : 0.55)) continue;      // an advert in the city (adspace.ts) brings more replies
      const from = NAMES[Math.floor(r() * NAMES.length)];
      const reply: Reply = m.kind === 'sell' ? { ad: m.id, day, from, text: `${from} wants to buy it and offers this much.`, offer: Math.max(50, Math.round((m.price * (0.6 + r() * 0.45)) / 50) * 50) }
        : m.kind === 'job' ? { ad: m.id, day, from, text: `${from} needs a pair of hands for a day.`, offer: 800 + Math.round(r() * 26) * 50 }
        : m.kind === 'service' ? { ad: m.id, day, from, text: `${from} would like an hour of your help.`, offer: 500 + Math.round(r() * 16) * 50 }
        : { ad: m.id, day, from, text: `${from} has a room and invites you to see it.`, offer: 0 };
      a.replies.push(reply); n++;
    }
  }
  a.ticked = s.day; expire(s);
  return n;
}
/** The replies that still wait for the player. */
export const openReplies = (s: State): Reply[] => adsOf(s).replies.filter(r => !r.done);
/** Accepts a reply: the thing is sold (and its ad comes down), the day's work or the lesson is done and paid, the room is seen. */
export function accept(s: State, index: number): Result {
  const a = adsOf(s), r = openReplies(s)[index]; if (!r) return { ok: false, msg: 'No such reply.' };
  const m = a.mine.find(x => x.id === r.ad); if (!m) { r.done = true; return { ok: false, msg: 'That ad is no longer on the board.' }; }
  if (m.kind === 'sell') { s.money += r.offer; r.done = true; a.mine = a.mine.filter(x => x.id !== m.id); return { ok: true, msg: `Sold to ${r.from} for ${r.offer.toLocaleString('en-US')} roubles.` }; }
  if (m.kind === 'job') { if (s.energy < 25) return { ok: false, msg: 'You are too tired for a day of odd work.' }; s.energy = clamp(s.energy - 22); s.stress = clamp(s.stress + 3); s.money += r.offer; r.done = true; return { ok: true, msg: `You worked a day for ${r.from}: ${r.offer.toLocaleString('en-US')} roubles.` }; }
  if (m.kind === 'service') { if (s.energy < 14) return { ok: false, msg: 'You are too tired to help anybody today.' }; s.energy = clamp(s.energy - 12); s.money += r.offer; s.rep = clamp(s.rep + 1); r.done = true; return { ok: true, msg: `You helped ${r.from} for an hour: ${r.offer.toLocaleString('en-US')} roubles and a good word about you.` }; }
  if (s.energy < 8) return { ok: false, msg: 'You are too tired to go and look at a room.' };
  s.energy = clamp(s.energy - 6); s.know = clamp(s.know + 1); s.stress = clamp(s.stress - 2); r.done = true; return { ok: true, msg: `You saw the room ${r.from} offered. It is good to know there is somewhere to go.` };
}
/** Turns a reply down. */
export function decline(s: State, index: number): Result { const r = openReplies(s)[index]; if (!r) return { ok: false, msg: 'No such reply.' }; r.done = true; return { ok: true, msg: 'You said no, politely.' }; }
