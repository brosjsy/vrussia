/* The meeting app: invented adults with portraits, shared interests and a compatibility score. You can pass or like; a like can become a match,
   and a match can be chatted with and invited on a date. Wholesome content only. Every person here is made up and nothing is sent anywhere.
   Everything is decided by the state of the game and the day, so the same day always shows the same people. */
import * as G from './engine';
import type { State, Partner } from './engine';
import { lookFromSeed } from './avatar';
import type { GroupId } from './avatar';
import type { Look } from './avatar';

export interface Profile { id: string; name: string; age: number; city: string; bio: string; interests: string[]; look: Look; kind: Partner['kind'] }
export interface Datable { seen: Record<string, 'like' | 'pass'>; matches: Profile[] }

const MEN = ['Artyom', 'Ivan', 'Dmitry', 'Timur', 'Rustam', 'Kirill', 'Maxim', 'Nikita', 'Aleksey', 'Farhod'];
const WOMEN = ['Anna', 'Elena', 'Aigul', 'Marina', 'Zarina', 'Olga', 'Sofia', 'Daria', 'Kamila', 'Polina'];
export const INTERESTS = ['books', 'football', 'cooking', 'chess', 'hiking', 'music', 'cinema', 'travel', 'dogs', 'tea', 'banya', 'dacha'];
const BIOS = ['Looking for someone to share tea and a long walk.', 'I love my city and I love meeting new people.', 'Work hard, rest well, cook for friends.', 'New here? I can show you the best places.', 'Honest, a bit shy, good at making soup.', 'Evenings are for books, weekends are for the dacha.'];

export const SWIPES_PER_DAY = 5;

export function dating(s: State): Datable {
  const p = G.phoneOf(s);
  return p.dating ?? (p.dating = { seen: {}, matches: [] });
}

const hash = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };

/** What the player likes, from their dream, belongings and name. Always at least three things. */
export function playerInterests(s: State): string[] {
  const out = new Set<string>();
  if (s.dream === 'doctor' || s.dream === 'teacher' || s.flags.admitted) out.add('books');
  if (s.dream === 'athlete') { out.add('football'); out.add('hiking'); }
  if (s.dream === 'driver' || s.car) out.add('travel');
  if (s.dream === 'artist') { out.add('music'); out.add('cinema'); }
  if (s.pet) out.add('dogs');
  let k = 0;
  while (out.size < 3) out.add(INTERESTS[(hash(s.name + k++)) % INTERESTS.length]);
  return Array.from(out);
}

/** How many answers the player has left today. */
export function swipesLeft(s: State): number {
  const used = Object.keys(dating(s).seen).filter(id => id.includes(`-${s.day}-`)).length;
  return Math.max(0, SWIPES_PER_DAY - used);
}

/** Five people for today: not seen before, with names and portraits that never change for the same day. */
export function profilesFor(s: State): Profile[] {
  const d = dating(s);
  const out: Profile[] = [];
  const left = swipesLeft(s);
  for (let i = 0; out.length < left && i < 60; i++) {
    const h = hash(`p|${s.day}|${i}`);
    const male = h % 2 === 0;
    const name = (male ? MEN : WOMEN)[(h >>> 3) % 10];
    const id = `${name.toLowerCase()}-${s.day}-${i}`;
    if (d.seen[id] || out.some(o => o.name === name)) continue;
    const mine = hash(id);
    const ints = Array.from(new Set([INTERESTS[mine % 12], INTERESTS[(mine >>> 4) % 12], INTERESTS[(mine >>> 8) % 12]]));
    out.push({
      id, name, age: 20 + (h >>> 7) % 20, city: (h >>> 11) % 3 === 0 ? G.CITIES[(h >>> 14) % G.CITIES.length] : s.city, bio: BIOS[(h >>> 5) % BIOS.length], interests: ints,
      look: lookFromSeed(id, { beardable: male, female: !male, city: s.city, group: (h >>> 17) % 5 === 0 ? (['central-asian', 'east-asian', 'african', 'caucasus'] as GroupId[])[(h >>> 20) % 4] : undefined }), kind: (h >>> 17) % 5 === 0 ? 'foreigner' : 'citizen',
    });
  }
  return out;
}

/** 0 to 100: shared interests, the same city and the player's reputation. */
export function compat(s: State, p: Profile): number {
  const mine = new Set(playerInterests(s));
  const shared = p.interests.filter(i => mine.has(i)).length;
  return Math.max(0, Math.min(100, Math.round(35 + shared * 18 + (p.city === s.city ? 10 : 0) + s.rep / 10)));
}

export interface SwipeResult { matched: boolean; message: string }

/** Pass or like. A like becomes a match when the day's luck for this person is below the compatibility score; the luck is fixed, not random. */
export function swipe(s: State, p: Profile, like: boolean): SwipeResult {
  const d = dating(s);
  if (d.seen[p.id]) return { matched: false, message: 'You have already answered this profile.' };
  if (!like) { d.seen[p.id] = 'pass'; return { matched: false, message: `You passed on ${p.name}.` }; }
  d.seen[p.id] = 'like';
  const luck = hash(`luck|${p.id}`) % 100;
  if (luck < compat(s, p)) {
    if (!d.matches.some(m => m.id === p.id)) d.matches.push(p);
    return { matched: true, message: `It is a match! ${p.name} liked you too.` };
  }
  return { matched: false, message: `${p.name} has not answered yet. Maybe next time.` };
}

/** A friendly reply from a match. */
export function dateReply(p: Profile, text: string, rnd: () => number = Math.random): string {
  const t = text.toLowerCase();
  const pick = (a: string[]): string => a[Math.min(a.length - 1, Math.floor(rnd() * a.length))];
  if (/\b(coffee|tea|walk|meet|date|dinner)\b/.test(t)) return pick(['I would like that. Saturday?', 'That sounds lovely.', 'Yes! Let us plan it.']);
  if (/\b(hi|hello|privet|hey)\b/.test(t)) return pick([`Hi! I am ${p.name}. Nice to meet you.`, 'Hello! How is your day?']);
  const shared = p.interests.find(i => t.includes(i));
  if (shared) return `Oh, you like ${shared} too? Tell me more!`;
  return pick(['Haha, tell me more.', 'That is interesting!', `I am from ${p.city}. And you?`, 'What do you do on weekends?']);
}

export const DATE_COST = 1500;
export const MIN_MESSAGES = 3;

export interface DateResult { ok: boolean; message: string; fx: G.Effects; becameCouple: boolean }

/** Invites a match on a date. Needs a few messages first and some money. Never possible while you have a different partner. */
export function askOnDate(s: State, p: Profile, rnd: () => number = Math.random): DateResult {
  const chat = G.phoneOf(s).chats['date:' + p.id] || [];
  if (chat.filter(m => m.from === 'me').length < MIN_MESSAGES) return { ok: false, message: `Write at least ${MIN_MESSAGES} messages first.`, fx: {}, becameCouple: false };
  if (s.partner && s.partner.name !== p.name) return { ok: false, message: `You are already with ${s.partner.name}. It would not be fair to ${p.name}.`, fx: {}, becameCouple: false };
  if (s.money < DATE_COST) return { ok: false, message: `A date costs about ${G.money(DATE_COST)}; you have ${G.money(s.money)}.`, fx: {}, becameCouple: false };
  const good = rnd() * 100 < 45 + compat(s, p) / 2;
  if (!good) return { ok: true, message: `The evening with ${p.name} was pleasant but there was no spark. You part as friends.`, fx: { money: -DATE_COST, stress: -2, friends: 1 }, becameCouple: false };
  if (s.partner) return { ok: true, message: `Another lovely evening with ${p.name}.`, fx: { money: -DATE_COST, stress: -6, love: 6 }, becameCouple: false };
  return { ok: true, message: `A wonderful evening. ${p.name} and you decide to see where this goes: you are a couple now.`, fx: { money: -DATE_COST, stress: -8 }, becameCouple: true };
}

/** Records the new couple in the game state. */
export function makeCouple(s: State, p: Profile): void {
  if (!s.partner) s.partner = { name: p.name, kind: p.kind, love: 45 };
}
