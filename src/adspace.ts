/* Advertising spaces: the player rents a real place in the city and mounts an advert of their own there — a poster at a bus stop, a panel in a metro
   car, a roadside billboard, a banner on a building wall, or a turn on the big screen on the roof of the city centre. The advert says what the player
   wants it to say (a headline, a line, a colour, an icon) and works for a goal the player picks: more replies to their small ads, a good name in the
   city, friends for a party, a greeting for someone dear, or a message for everybody. Every day it hangs it is seen by people (the reach of the place),
   and some of them answer; the campaign report counts the views, the answers and what each answer cost.
   Two more things go with it. The advertising agency checks every advert against the rules of the Russian law on advertising (Federal Law 38-FZ of
   13 March 2006, simplified for the game): no alcohol, tobacco, casinos, quick loans or political campaigning, nothing rude. And the player can work
   for the agency as a poster installer, mounting other people's adverts for pay (no work at height in frost, rain or snow).
   Prices, reach and pay are invented game values, kept small next to a salary. Opt-in, so the bots of the balance reports never touch it. Pure and
   deterministic: no screen, no network (adverts of real players come from the server: see api-client.ts). */
import type { State } from './engine';
import { isRude, hasContact } from './rude';

export type SpotId = 'stop' | 'metro' | 'board' | 'wall' | 'screen';
export interface Spot { id: SpotId; name: string; ru: string; icon: string; price: number; reach: number; blurb: string; ruBlurb: string; metro?: boolean; height?: boolean }
export const SPOTS: Spot[] = [
  { id: 'stop', name: 'Bus stop poster', ru: 'Постер на остановке', icon: '🚏', price: 400, reach: 1500, blurb: 'A lit poster behind glass at a busy stop.', ruBlurb: 'Постер с подсветкой под стеклом на людной остановке.' },
  { id: 'metro', name: 'Metro car panel', ru: 'Панель в вагоне метро', icon: '🚇', price: 900, reach: 6000, blurb: 'Above the doors, read by everyone on the way to work.', ruBlurb: 'Над дверями, её читают все по дороге на работу.', metro: true },
  { id: 'board', name: 'Roadside billboard', ru: 'Билборд у дороги', icon: '🖼️', price: 1800, reach: 10000, blurb: 'Three by six metres on a main street. You will see it in the city.', ruBlurb: 'Три на шесть метров на главной улице. Его видно в городе.', height: true },
  { id: 'wall', name: 'Banner on a building wall', ru: 'Баннер на стене дома', icon: '🏢', price: 2500, reach: 15000, blurb: 'A whole wall of a house by a crossroads.', ruBlurb: 'Целая стена дома у перекрёстка.', height: true },
  { id: 'screen', name: 'Big screen in the centre', ru: 'Большой экран в центре', icon: '📺', price: 6000, reach: 40000, blurb: 'Your advert in turn with others on the roof of the city centre.', ruBlurb: 'Ваша реклама по очереди с другими на крыше центра города.' },
];
export const spotOf = (id: string): Spot | undefined => SPOTS.find(p => p.id === id);
/** The cities with a metro (the same seven as metro-data.ts, kept here so this file stays small). */
export const METRO_TOWNS = ['Moscow', 'Saint Petersburg', 'Nizhny Novgorod', 'Novosibirsk', 'Kazan', 'Samara', 'Yekaterinburg'];
/** Bigger cities cost more and are seen by more people. */
export const cityFactor = (city: string): number => city === 'Moscow' ? 1.6 : city === 'Saint Petersburg' ? 1.3 : ['Kazan', 'Yekaterinburg', 'Novosibirsk', 'Nizhny Novgorod', 'Samara', 'Krasnodar', 'Sochi'].includes(city) ? 1 : 0.75;
export const priceOf = (spot: Spot, city: string): number => Math.round(spot.price * cityFactor(city) / 50) * 50;
export const reachOf = (spot: Spot, city: string): number => Math.round(spot.reach * cityFactor(city));

export type Goal = 'myads' | 'name' | 'party' | 'greeting' | 'cause';
export const GOALS: { id: Goal; name: string; ru: string; icon: string }[] = [
  { id: 'myads', name: 'More replies to my small ads', ru: 'Больше откликов на мои объявления', icon: '📌' },
  { id: 'name', name: 'A good name in the city (find work, clients)', ru: 'Доброе имя в городе (работа, клиенты)', icon: '⭐' },
  { id: 'party', name: 'Invite people to my party', ru: 'Позвать людей на мой праздник', icon: '🎉' },
  { id: 'greeting', name: 'A greeting for someone dear', ru: 'Поздравление для близкого', icon: '💐' },
  { id: 'cause', name: 'A message for everybody (kindness, safety)', ru: 'Послание для всех (доброта, безопасность)', icon: '🤝' },
];
export const COLORS = ['#2f6fd6', '#e0373f', '#1f9d55', '#f0b43c', '#a56be0', '#16203a', '#e07bb0', '#2bb5c9'];
export const ICONS = ['📣', '🏷️', '🎓', '🧰', '🎉', '💐', '❤️', '🤝', '🍲', '🏠', '🚲', '⭐'];

export interface Campaign { id: string; spot: SpotId; city: string; head: string; line: string; color: string; icon: string; goal: Goal; start: number; days: number; paid: number; views: number; answers: number; ticked: number; online?: number; reported?: boolean }
export interface Install { day: number; shifts: number; last: number }
export interface AdSpaceState { list: Campaign[]; seq: number; install: Install }
export interface Result { ok: boolean; msg: string }

export const MAX_DAYS = 14;
export const MAX_ACTIVE = 2;
/** At most this many adverts of players on one kind of place in one city at a time (the place has only so many frames). */
export const CAPACITY: Record<SpotId, number> = { stop: 6, metro: 6, board: 5, wall: 2, screen: 4 };

type S = State & { adspace?: AdSpaceState };
export const adSpaceOf = (s: State): AdSpaceState => {
  const x = s as S;
  if (!x.adspace || !Array.isArray(x.adspace.list)) x.adspace = { list: [], seq: 0, install: { day: -1, shifts: 0, last: -99 } };
  return x.adspace;
};
const hash = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };
const rnd = (seed: string): (() => number) => { let v = hash(seed) || 1; return () => { v = (Math.imul(v ^ (v >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return (v >>> 8) / 16777216; }; };
const clamp = (v: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, v));
const clean = (t: string): string => String(t ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');

/** The day an advert comes down (it hangs from its first day up to, not including, this day). */
export const endOf = (c: Campaign): number => c.start + c.days;
export const isUp = (s: State, c: Campaign): boolean => s.day >= c.start && s.day < endOf(c) && c.city === s.city;
/** Read only (the 3D boards call it on every redraw and must not change the save). */
const listOf = (s: State): Campaign[] => { const l = (s as S).adspace?.list; return Array.isArray(l) ? l : []; };
export const activeOf = (s: State): Campaign[] => listOf(s).filter(c => s.day < endOf(c));

/** What the agency says about an advert's words: null when it may go up, or the reason it may not (the law on advertising, simplified). */
export function lawCheck(head: string, line: string): string | null {
  const t = `${head} ${line}`.toLowerCase();
  if (hasContact(t)) return 'No phone numbers or messenger names: people answer the advert through the agency.';
  if (isRude(t)) return 'The agency does not put up rude words.';
  if (/(vodka|beer|wine|alcohol|водк|пив|вино|алкогол|коньяк)/.test(t)) return 'Alcohol may not be advertised on the street (law on advertising, art. 21).';
  if (/(cigarette|tobacco|vape|сигарет|табак|вейп|кальян)/.test(t)) return 'Tobacco and vapes may not be advertised at all (art. 7).';
  if (/(casino|poker|bet\b|bets|ставк|казино|покер|букмекер)/.test(t)) return 'Gambling and betting have their own strict rules; the agency does not take them (art. 27).';
  if (/(loan|credit|займ|кредит|микрофинанс)/.test(t)) return 'Loans need a licence and the full cost written large; the agency does not take private loan adverts (art. 28).';
  if (/(vote for|elect|голосуй|выбери|партия|party of)/.test(t)) return 'Election campaigning has its own rules and dates; the agency does not take it.';
  if (/(best in russia|лучш(ий|ая|ее) в россии|number one|№\s?1|#1)/.test(t)) return '"The best" or "number one" needs proof; without it the advert is unfair (art. 5).';
  if (/(https?:|www\.|\.ru\b|\.com\b|@)/.test(t)) return 'No links or addresses: write what you offer, people will find you through the board.';
  return null;
}

/** Books a place and mounts the advert from today. */
export function book(s: State, o: { spot: SpotId; head: string; line: string; color: string; icon: string; goal: Goal; days: number }): Result {
  const spot = spotOf(o.spot); if (!spot) return { ok: false, msg: 'No such place.' };
  if (spot.metro && !METRO_TOWNS.includes(s.city)) return { ok: false, msg: `There is no metro in ${s.city}.` };
  const head = clean(o.head), line = clean(o.line), days = Math.round(o.days);
  if (head.length < 3 || head.length > 32) return { ok: false, msg: 'Write a headline of 3 to 32 characters.' };
  if (line.length > 60) return { ok: false, msg: 'The second line is at most 60 characters.' };
  if (!(days >= 1 && days <= MAX_DAYS)) return { ok: false, msg: `Book from 1 to ${MAX_DAYS} days.` };
  if (!GOALS.some(g => g.id === o.goal)) return { ok: false, msg: 'Choose what the advert is for.' };
  const why = lawCheck(head, line); if (why) return { ok: false, msg: why };
  if (activeOf(s).length >= MAX_ACTIVE) return { ok: false, msg: `You can run ${MAX_ACTIVE} adverts at a time.` };
  if (o.goal === 'myads' && !((s as State & { ads?: { mine?: unknown[] } }).ads?.mine?.length)) return { ok: false, msg: 'You have no small ads on the board to promote. Put one up first (📌).' };
  const cost = priceOf(spot, s.city) * days;
  if (s.money < cost) return { ok: false, msg: `This costs ${fmt(cost)} roubles; you have ${fmt(s.money)}.` };
  const a = adSpaceOf(s); a.seq++;
  s.money -= cost;
  a.list.unshift({ id: `c${a.seq}`, spot: spot.id, city: s.city, head, line, color: COLORS.includes(o.color) ? o.color : COLORS[0], icon: ICONS.includes(o.icon) ? o.icon : ICONS[0], goal: o.goal, start: s.day, days, paid: cost, views: 0, answers: 0, ticked: s.day - 1 });
  a.list = a.list.slice(0, 12);
  return { ok: true, msg: `${spot.name}: your advert is up in ${s.city} for ${days} day${days === 1 ? '' : 's'}. ${fmt(cost)} roubles paid.` };
}
/** Takes an advert down early. Nothing is paid back for days already booked: the agency has printed it. */
export function takeDown(s: State, id: string): Result {
  const c = adSpaceOf(s).list.find(x => x.id === id && s.day < endOf(x)); if (!c) return { ok: false, msg: 'No such advert.' };
  c.days = Math.max(0, s.day - c.start); return { ok: true, msg: 'The advert is taken down. The agency keeps the money: it has been printed.' };
}

/** Brings every advert up to date: for each day it hung, people saw it and some answered; each goal gives back something small. Called when the screen
    opens. Returns lines for the player. */
export function tickAdSpace(s: State): string[] {
  const a = adSpaceOf(s), out: string[] = [];
  for (const c of a.list) {
    const spot = spotOf(c.spot); if (!spot) continue;
    const last = Math.min(s.day, endOf(c) - 1);
    for (let day = Math.max(c.ticked + 1, c.start); day <= last; day++) {
      const r = rnd(`adspace|${c.id}|${c.city}|${day}`);
      const views = Math.round(reachOf(spot, c.city) * (0.8 + r() * 0.4)), ans = Math.floor(views / 2500 + r() * 1.5);
      c.views += views; c.answers += ans; c.ticked = day;
      if (c.goal === 'name') { s.rep = clamp(s.rep + (ans > 0 ? 1 : 0)); }
      else if (c.goal === 'party' && ans > 0) { const n = (s as State & { needs?: { social: number } }).needs; if (n) n.social = clamp(n.social + 6); s.stress = clamp(s.stress - 1); }
      else if (c.goal === 'greeting') { s.stress = clamp(s.stress - 2); if (s.partner) s.partner.love = clamp(s.partner.love + 1); }
      else if (c.goal === 'cause') { if (ans > 0) s.rep = clamp(s.rep + 1); }
    }
    if (!c.reported && s.day >= endOf(c)) { c.reported = true; if (c.days > 0) out.push(`Your advert "${c.head}" came down: ${fmt(c.views)} views, ${c.answers} answers.`); }
  }
  return out;
}
/** Is one of the player's adverts working for their small ads in this city today? The board (ads.ts) then gets more replies. */
export const boostsAds = (s: State, day = s.day): boolean => listOf(s).some(c => c.goal === 'myads' && c.city === s.city && day >= c.start && day < endOf(c));
/** The campaign report: cost per answer (null before the first answer). */
export const costPerAnswer = (c: Campaign): number | null => c.answers > 0 ? Math.round(c.paid / c.answers) : null;

/* ----- working for the agency: mounting other people's adverts ----- */
export type TaskId = 'posters' | 'billboard' | 'banner';
export const TASKS: { id: TaskId; name: string; ru: string; pay: number; energy: number; stress: number; height: boolean }[] = [
  { id: 'posters', name: 'Change the posters at ten bus stops', ru: 'Поменять постеры на десяти остановках', pay: 1300, energy: 20, stress: 2, height: false },
  { id: 'billboard', name: 'Paste a new billboard from a ladder', ru: 'Поклеить новый билборд с лестницы', pay: 2000, energy: 26, stress: 4, height: true },
  { id: 'banner', name: 'Hang a wall banner from a lift platform', ru: 'Повесить баннер на стену с автовышки', pay: 2600, energy: 30, stress: 6, height: true },
];
export const RANK_AT = [0, 10, 25];
export const RANKS = ['Helper', 'Installer', 'Senior installer'];
export const RANKS_RU = ['Помощник', 'Монтажник', 'Старший монтажник'];
export const rankOf = (s: State): number => { const n = adSpaceOf(s).install.shifts; return n >= RANK_AT[2] ? 2 : n >= RANK_AT[1] ? 1 : 0; };
/** Why the player cannot do this task now (null when they can). */
export function cannotInstall(s: State, id: TaskId): string | null {
  const t = TASKS.find(x => x.id === id); if (!t) return 'No such task.';
  if (adSpaceOf(s).install.last === s.day) return 'One shift a day for the agency.';
  if (t.height && (s.weather === 'frost' || s.weather === 'rain' || s.weather === 'snow')) return 'No work at height in this weather: the safety rules forbid it. Posters at the stops are fine.';
  if (t.height && rankOf(s) === 0 && adSpaceOf(s).install.shifts < 3) return 'Work at height comes after three shifts on the posters.';
  if (s.energy < t.energy + 5) return 'You are too tired for a shift.';
  return null;
}
/** A shift of mounting adverts: pay by rank, energy and a little stress. */
export function install(s: State, id: TaskId): Result {
  const why = cannotInstall(s, id); if (why) return { ok: false, msg: why };
  const t = TASKS.find(x => x.id === id)!, i = adSpaceOf(s).install, pay = Math.round(t.pay * [1, 1.15, 1.3][rankOf(s)] / 50) * 50, before = rankOf(s);
  s.energy = clamp(s.energy - t.energy); s.stress = clamp(s.stress + t.stress); s.money += pay; i.shifts++; i.last = s.day;
  const up = rankOf(s) > before ? ` You are now ${RANKS[rankOf(s)]}.` : '';
  return { ok: true, msg: `${t.name}: done. The agency paid ${fmt(pay)} roubles.${up}` };
}
