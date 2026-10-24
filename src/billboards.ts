/* The notice boards of the 3D city. They are not paid advertisements: they show things a person living in the city would like to know,
   taken from the game itself (holidays, papers, fines, weather) and from safety messages checked earlier in the project. */
import type { State } from './engine';
import { newsItems } from './city';
import { decreeFor } from './election';
import { needStatus } from './needs';
import { activeOf, isUp } from './adspace';

export interface Board { title: string; text: string; color: string }

const TIPS: Board[] = [
  { title: 'EMERGENCY', text: '112 works from any phone, free of charge', color: '#e0373f' },
  { title: 'STAY SAFE', text: 'Nobody serious asks for your SMS code', color: '#f0b43c' },
  { title: 'PAY EARLY', text: 'Fines cost less when paid in the first 20 days', color: '#3b6fe0' },
  { title: 'WINTER', text: 'A real coat, boots and a hat: the cold is serious', color: '#2bb5c9' },
  { title: 'LEARN', text: 'Free Russian conversation clubs at the library', color: '#3ec27a' },
  { title: 'NEIGHBOURS', text: 'Say good evening: the bench by the door remembers', color: '#a56be0' },
  { title: 'DOCUMENTS', text: 'Keep copies of every paper, in a separate bag', color: '#16203a' },
  { title: 'HEALTH', text: 'Rest is also a plan: stress above 75 costs health', color: '#e07bb0' },
];

/** Adverts of other players in this city (from the server, set by the advertising screen when the player is online). */
let online: { city: string; spot: string; head: string; line: string; color: string; icon: string; username: string }[] = [];
export function setOnlineAdverts(list: typeof online): void { online = Array.isArray(list) ? list.slice(0, 20) : []; }
/** Changes when an advert goes up or down, so the 3D boards are drawn again. */
export const advertsKey = (s: State): string => `${activeOf(s).map(c => c.id + c.days).join(',')}|${online.length}|${online[0]?.head ?? ''}`;
const advert = (a: { head: string; line: string; color: string; icon: string }, by?: string): Board => ({ title: `${a.icon} ${a.head}`.toUpperCase(), text: by ? `${a.line} · ${by}` : a.line, color: a.color });

/** Five boards for the current part of the day: first the adverts the player has mounted on a billboard (adspace.ts) and those of other players, then
    what is happening in the player's own life, then tips. Always `count` of them; at most two of them are adverts, so the city keeps its notices. */
export function boardsFor(s: State, count = 5): Board[] {
  const mine = activeOf(s).filter(c => c.spot === 'board' && isUp(s, c)).map(c => advert(c));
  const theirs = online.filter(a => a.spot === 'board' && a.city === s.city).map(a => advert(a, a.username));
  const k = (s.day * 3 + s.slot) % Math.max(1, theirs.length);                // a different player's advert each part of the day
  const ads = [...mine, ...theirs.slice(k), ...theirs.slice(0, k)].slice(0, Math.min(2, count));
  const out: Board[] = [...ads, ...newsItems(s).filter(n => !n.startsWith('State duties') && !n.startsWith('Emergency')).slice(0, 3).map((text, i): Board => ({ title: 'THIS WEEK', text, color: ['#2f6fd6', '#e0373f', '#1f9d55'][i % 3] }))];
  const dec = decreeFor(s); out.splice(Math.min(1, out.length), 0, { title: dec.title, text: dec.text, color: '#8a4fc9' });
  const start = (s.day * 3 + s.slot) % TIPS.length;
  for (let k = 0; out.length < count; k++) out.push(TIPS[(start + k) % TIPS.length]);
  return out.slice(0, count);
}

/** The big screen on the roof of the city centre. */
export function megaScreen(s: State, date: string): string {
  const w = s.weather === 'snow' ? 'Snow' : s.weather === 'rain' ? 'Rain' : s.weather === 'frost' ? 'Frost' : 'Clear';
  // the adverts booked on the screen take turns with the date: one part of the day in two
  const ads = [...activeOf(s).filter(c => c.spot === 'screen' && isUp(s, c)), ...online.filter(a => a.spot === 'screen' && a.city === s.city)];
  if (ads.length && (s.day * 3 + s.slot) % 2 === 0) { const a = ads[Math.floor((s.day * 3 + s.slot) / 2) % ads.length]; return `${a.icon} ${a.head} · ${a.line}`; }
  return `${s.city} · ${date} · ${w}`;
}

export interface Status { text: string; color: string }
/** What the player most needs to know about themselves right now, as a short chip over their head in the 3D world (the most urgent first); null when all is well. */
export function statusFor(s: State): Status | null {
  if (s.health <= 30) return { text: 'Sick · rest or see a doctor', color: '#e0373f' };
  if (s.stress >= 75) return { text: 'Burned out · rest at home', color: '#e0373f' };
  if (s.energy <= 20) return { text: 'Exhausted · eat and sleep', color: '#e07b2a' };
  const ns = needStatus(s); if (ns && ns.key === 'hunger') return { text: ns.text, color: ns.color };
  if (((s.tmp as { fines?: number } | undefined)?.fines ?? 0) > 0) return { text: 'Unpaid fines', color: '#d6a53a' };
  if (ns) return { text: ns.text, color: ns.color };
  if (s.energy <= 40) return { text: 'Tired · eat something', color: '#d6a53a' };
  return null;
}
