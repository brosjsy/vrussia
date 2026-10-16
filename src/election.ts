/* The weekly city election. Every week the people of the city choose the policy of the next week among the platforms of a handful of invented candidates;
   the winning platform becomes that week's city decree (see decrees.ts). The player can vote once a week, in person at the polling station (the MFC hall),
   and can stand as a candidate for a fee; a very well liked player can win, then their platform is the decree and they are paid a deputy's allowance for
   the week. All people, parties, slogans and numbers are invented, and no real party or politician is named. A decree is only an announcement: it never
   changes money, health or any other number of the game, so the balance is untouched except for the fee and the allowance of a candidate.
   The idea of a weekly election with a campaign fee and an allowance for the winner came from watching another life game's State House screen. Pure functions
   over the game state, tested without a screen. */
import type { State } from './engine';
import { DECREES, weekOf } from './decrees';
import type { Decree } from './decrees';

export interface Candidate { id: string; name: string; party: string; slogan: string; policy: string; weight: number; you?: boolean }
export interface Row extends Candidate { votes: number; share: number }
export interface Standings { week: number; rows: Row[]; winner: Row; total: number; youVoted: string | null }
export interface Civic { voted: Record<string, string>; ran: Record<string, { policy: string; slogan: string }> }
export interface Result { ok: boolean; msg: string }

export const RUN_FEE = 5000;
export const ALLOWANCE = 1500;
export const POLLING_PLACE = 'mfc';
const NPC_COUNT = 6, TURNOUT = 180000;

const FIRST = ['Andrei', 'Olga', 'Ivan', 'Marina', 'Dmitry', 'Svetlana', 'Pavel', 'Natalia', 'Sergei', 'Elena', 'Timur', 'Aigul', 'Ruslan', 'Zarina', 'Maxim', 'Irina'];
const LAST = ['Volkov', 'Smirnova', 'Kuznetsov', 'Popova', 'Sokolov', 'Lebedeva', 'Morozov', 'Novikova', 'Fedorov', 'Gaziev', 'Karimov', 'Orlova', 'Belyaev', 'Nazarova', 'Titov', 'Yusupova'];
const PARTIES = ['Courtyards First', 'Green Boulevard', 'Clean Stairwells', 'Neighbours\' Union', 'Open Windows', 'City of Trams', 'Warm Radiators', 'Quiet Evenings'];
const SLOGANS = ['A bench in every courtyard', 'Light on every staircase', 'Buses that come on time', 'Fewer queues, more windows', 'A city that listens', 'Clean snow, clear roads', 'Parks for the children', 'Ask the neighbours first', 'Simple papers for everyone', 'Warm homes in winter'];

const hashOf = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };
const unit = (t: string): number => (hashOf(t) % 100000) / 100000;

/** The people on the ballot of the election that decides `week` (it is held during the week before). The same for the same city and week. */
export function candidatesFor(city: string, week: number): Candidate[] {
  const out: Candidate[] = [];
  for (let i = 0; i < NPC_COUNT; i++) {
    const k = `${city}|${week}|${i}`;
    out.push({
      id: `c${week}-${i}`, name: `${FIRST[hashOf(k + 'f') % FIRST.length]} ${LAST[hashOf(k + 'l') % LAST.length]}`, party: PARTIES[hashOf(k + 'p') % PARTIES.length],
      slogan: SLOGANS[hashOf(k + 's') % SLOGANS.length], policy: DECREES[hashOf(k + 'd') % DECREES.length].id, weight: 0.4 + 1.6 * unit(k + 'w') ** 2,
    });
  }
  return out;
}

export function civicOf(s: State): Civic {
  const x = s as State & { civic?: Civic };
  if (!x.civic || typeof x.civic !== 'object' || typeof x.civic.voted !== 'object' || typeof x.civic.ran !== 'object') x.civic = { voted: {}, ran: {} };
  return x.civic;
}
/** The civic book for reading: the player's own if there is one, otherwise an empty one that is not attached (reading never changes the game state). */
const readCivic = (s: State): Civic => { const x = (s as State & { civic?: Civic }).civic; return x && typeof x === 'object' && typeof x.voted === 'object' && typeof x.ran === 'object' ? x : { voted: {}, ran: {} }; };
/** How much a player is liked: reputation, community merit and friends. A player needs a great deal of all three to beat the invented candidates. */
export const popularity = (s: State): number => 0.5 + (s.rep / 100) * 1.0 + (Math.min(s.merit, 40) / 40) * 0.6 + Math.min(s.friends, 20) * 0.02;

/** The votes of the election that decides `week`. Votes are fixed in advance by the weights; the player's own vote adds one. */
export function standings(s: State, week: number): Standings {
  const civic = readCivic(s), list = candidatesFor(s.city, week), you = civic.ran[String(week)];
  if (you) list.push({ id: 'you', name: s.name, party: 'Independent', slogan: you.slogan, policy: you.policy, weight: popularity(s), you: true });
  const sum = list.reduce((t, c) => t + c.weight, 0), voted = civic.voted[String(week)] ?? null;
  const rows: Row[] = list.map(c => ({ ...c, votes: Math.round((c.weight / sum) * TURNOUT) + (voted === c.id ? 1 : 0), share: 0 }));
  const total = rows.reduce((t, r) => t + r.votes, 0);
  rows.forEach(r => { r.share = r.votes / total; });
  rows.sort((a, b) => b.votes - a.votes || (a.id < b.id ? -1 : 1));
  return { week, rows, winner: rows[0], total, youVoted: voted };
}

/** The election that is open now: the one that decides next week. */
export const openWeek = (s: State): number => weekOf(s) + 1;
/** Days left before it closes (the last day of the week is 0). */
export const daysLeft = (s: State): number => 6 - (Math.max(0, s.day) % 7);

/** The decree in force this week: the platform that won the election, or, in the first week, the first decree of the city. */
export function decreeFor(s: State): Decree {
  const w = weekOf(s);
  const pol = w <= 0 ? DECREES[hashOf(`${s.city}|0`) % DECREES.length].id : standings(s, w).winner.policy;
  return DECREES.find(d => d.id === pol) ?? DECREES[0];
}
/** The name of whoever won this week's election, with the party; null in the first week. */
export function governorOf(s: State): { name: string; party: string; you: boolean } | null {
  const w = weekOf(s); if (w <= 0) return null;
  const x = standings(s, w).winner; return { name: x.name, party: x.party, you: !!x.you };
}

/** Votes for a candidate of the open election. Only once a week and only in person at the polling station. */
export function vote(s: State, candidateId: string): Result {
  if (s.loc !== POLLING_PLACE) return { ok: false, msg: 'You vote in person: go to the polling station in the MFC hall.' };
  const week = openWeek(s), civic = civicOf(s);
  if (civic.voted[String(week)]) return { ok: false, msg: 'You have already voted in this election.' };
  if (!standings(s, week).rows.some(r => r.id === candidateId)) return { ok: false, msg: 'There is no such candidate.' };
  civic.voted[String(week)] = candidateId; prune(civic);
  return { ok: true, msg: 'Your vote is counted.' };
}

/** Stands as a candidate in the open election, for a fee, with a platform chosen from the decrees. */
export function run(s: State, policyId: string, slogan = 'A city that listens'): Result {
  const week = openWeek(s), civic = civicOf(s);
  if (civic.ran[String(week)]) return { ok: false, msg: 'You are already on the ballot.' };
  if (!DECREES.some(d => d.id === policyId)) return { ok: false, msg: 'Choose a platform first.' };
  if (s.money < RUN_FEE) return { ok: false, msg: 'Not enough money for the campaign fee.' };
  s.money -= RUN_FEE; civic.ran[String(week)] = { policy: policyId, slogan: slogan.slice(0, 60) }; prune(civic);
  return { ok: true, msg: 'You are on the ballot.' };
}
function prune(c: Civic): void {
  for (const m of [c.voted, c.ran] as Record<string, unknown>[]) { const keys = Object.keys(m).map(Number).sort((a, b) => a - b); while (keys.length > 8) delete m[String(keys.shift())]; }
}

/** The deputy's allowance of today: paid when the player won this week's election. Returns the money paid (0 otherwise). */
export function payOffice(s: State): number {
  const w = weekOf(s); if (w <= 0) return 0;
  const civic = readCivic(s); if (!civic.ran[String(w)]) return 0;
  if (!standings(s, w).winner.you) return 0;
  s.money += ALLOWANCE; return ALLOWANCE;
}
