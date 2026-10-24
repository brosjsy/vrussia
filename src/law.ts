/* Law and order on the street, both ways. The player may break the law (take something from a shop, pick a pocket in the metro, jump the turnstile,
   drink in a park, start a fight) and may be caught then or later from the cameras: the police station, the protocol, the court, a fine or days of
   arrest, a criminal record, and for a foreigner a criminal conviction or an illegal stay ends in expulsion. The player may be the victim (a phone
   lifted in the metro, a robbery in the evening, a burgled flat), call the police on 102 or 112, give a statement and wait for the investigation; may
   witness a crime and call the police, step in, or look away. And the migration police check foreigners: raids at markets, building sites, hostels
   and metro exits; without valid papers it is detention, a court, a fine and in Moscow and St Petersburg expulsion with an entry ban; a foreigner with
   no legal grounds to stay goes on the register of controlled persons (since February 2025), which closes bank accounts, driving and marriage.
   The articles named are the real ones (the Code of Administrative Offences, KoAP; the Criminal Code, UK RF), simplified for the game: the fines and
   terms are in the right range, the chances are game values. Pure rules over the game state; the scenes are registered with the engine and the
   daily checks with turn.ts when this module loads (the page loads it at the start; the bots of the balance reports do not). */
import type { State, Scenario, Outcome } from './engine';
import * as G from './engine';
import { turnHooks } from './turn';

export type CrimeId = 'shoplift' | 'pickpocket' | 'fare' | 'drink' | 'fight';
export interface Crime { id: CrimeId; name: string; ru: string; law: string; kind: 'admin' | 'criminal'; risk: number; lo: number; hi: number; heat: number; blurb: string }
export const CRIMES: Crime[] = [
  { id: 'fare', name: 'Jump the turnstile', ru: 'Пройти без оплаты', law: 'regional code (fare evasion)', kind: 'admin', risk: 0.25, lo: 70, hi: 70, heat: 5, blurb: 'Saves the fare. Inspectors and cameras at the gates.' },
  { id: 'drink', name: 'Drink in the park', ru: 'Выпить в парке', law: 'KoAP 20.20', kind: 'admin', risk: 0.2, lo: 0, hi: 0, heat: 4, blurb: 'Less stress tonight. A fine of 500–1,500 ₽ if a patrol passes.' },
  { id: 'shoplift', name: 'Take something from a supermarket', ru: 'Украсть в супермаркете', law: 'KoAP 7.27 (up to 2,500 ₽) / UK 158', kind: 'admin', risk: 0.35, lo: 400, hi: 2400, heat: 12, blurb: 'Guards, cameras and a frame at the door. Petty theft is an administrative offence; more is a crime.' },
  { id: 'pickpocket', name: 'Pick a pocket in the metro', ru: 'Карманная кража в метро', law: 'UK 158 part 2 (from a bag or clothes)', kind: 'criminal', risk: 0.4, lo: 1500, hi: 9000, heat: 25, blurb: 'A crime whatever the amount. The metro has cameras that recognise faces; some arrests come days later.' },
  { id: 'fight', name: 'Start a fight', ru: 'Затеять драку', law: 'KoAP 20.1 / UK 116', kind: 'admin', risk: 0.55, lo: 0, hi: 0, heat: 15, blurb: 'Someone looked at you wrong. Petty hooliganism: a fine or up to 15 days of arrest.' },
];
export const crimeOf = (id: string): Crime | undefined => CRIMES.find(c => c.id === id);

export interface Rec { day: number; law: string; what: string; kind: 'admin' | 'criminal'; sentence: string }
export interface Theft { id: string; day: number; what: string; value: number; where: 'metro' | 'street' | 'home'; phone: boolean; status: 'open' | 'reported' | 'solved' | 'closed'; due: number }
export interface LawState { heat: number; record: Rec[]; thefts: Theft[]; seq: number; ticked: number; register: boolean; crimes: number; caught: number; reported: number; helped: number; raids: number; pending: { crime: CrimeId; day: number; value: number } | null; last: number; noPapers?: number }
export interface Result { ok: boolean; msg: string }

type S = State & { law?: LawState };
export const lawOf = (s: State): LawState => {
  const x = s as S;
  if (!x.law || typeof x.law !== 'object') x.law = { heat: 0, record: [], thefts: [], seq: 0, ticked: s.day, register: false, crimes: 0, caught: 0, reported: 0, helped: 0, raids: 0, pending: null, last: -1 };
  return x.law;
};
const clamp = (v: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, v));
const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');
const hash = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };
/** A number in [0, 1) that is the same for the same thing on the same day (so a reload does not change luck). */
const luck = (s: State, what: string): number => (hash(`${s.name}|${s.day}|${s.slot}|${what}`) % 10000) / 10000;
const METRO = ['Moscow', 'Saint Petersburg', 'Nizhny Novgorod', 'Novosibirsk', 'Kazan', 'Samara', 'Yekaterinburg'];
const BIG = (city: string): boolean => city === 'Moscow' || city === 'Saint Petersburg';
const foreigner = (s: State): boolean => s.status !== 'citizen' && !s.flags.naturalized;
const add = (s: State, r: Omit<Rec, 'day'>): void => { lawOf(s).record.unshift({ day: s.day, ...r }); lawOf(s).record = lawOf(s).record.slice(0, 40); };
export const convicted = (s: State): boolean => lawOf(s).record.some(r => r.kind === 'criminal');

/** The chance of being caught: the crime, the police's attention ("heat"), the difficulty, the big cities' cameras, the evening. */
export function riskOf(s: State, id: CrimeId): number {
  const c = crimeOf(id)!; let r = c.risk + lawOf(s).heat / 250;
  if (BIG(s.city) && (id === 'pickpocket' || id === 'fare')) r += 0.1;
  if (s.slot === 2) r -= 0.05;
  return clamp(r * G.diffOf(s).police, 0.05, 0.95);
}
/** Why the player cannot do this now (null when they can). */
export function cannotCommit(s: State, id: CrimeId): string | null {
  const c = crimeOf(id); if (!c) return 'No such thing.';
  if (lawOf(s).last === s.day) return 'You have pushed your luck enough for one day.';
  if (s.energy < 10) return 'You are too tired.';
  if (id === 'pickpocket' && !METRO.includes(s.city)) return `There is no metro in ${s.city}.`;
  return null;
}

/** The sentence for an offence, carried out at once (the court sits the next morning for an arrested person, as in life). */
function sentence(s: State, c: Crime, value: number, lawyer: boolean): string {
  const L = lawOf(s), lines: string[] = [];
  L.caught++; s.stress = clamp(s.stress + 12); s.energy = clamp(s.energy - 15); s.rep = clamp(s.rep - (c.kind === 'criminal' ? 12 : 4));
  const criminal = c.kind === 'criminal' || (c.id === 'shoplift' && value > 2500) || (c.id === 'fight' && luck(s, 'injury') < 0.2);
  if (!criminal) {
    const fine = c.id === 'fare' ? 1000 : c.id === 'drink' ? 500 + Math.round(luck(s, 'f') * 10) * 100 : c.id === 'shoplift' ? Math.max(1000, value * 3) : 1000;
    const arrestDays = c.id === 'fight' || (c.id === 'shoplift' && s.money < fine) ? (lawyer ? 0 : 5 + Math.floor(luck(s, 'days') * 6)) : 0;
    if (arrestDays) { lines.push(`The magistrate gives ${arrestDays} days of administrative arrest (${c.law}).`); add(s, { law: c.law, what: c.name, kind: 'admin', sentence: `${arrestDays} days of arrest` }); G.absentDays(s, arrestDays); }
    else { s.money -= fine; lines.push(`The magistrate fines you ${fmt(fine)} ₽ (${c.law}).`); add(s, { law: c.law, what: c.name, kind: 'admin', sentence: `fine ${fmt(fine)} ₽` }); }
    s.strikes++;
    if (foreigner(s) && BIG(s.city) && s.strikes >= 2) lines.push('For a foreigner, offences add up: the next one may mean expulsion.');
    return lines.join(' ');
  }
  // a crime: a criminal case, the court, a record
  const first = !convicted(s);
  if (foreigner(s)) { s.strikes = Math.max(s.strikes, 3); add(s, { law: c.law, what: c.name, kind: 'criminal', sentence: 'conviction and expulsion' }); s.over = 'deported'; return 'The court convicts you; for a foreign citizen a conviction means expulsion and an entry ban. The detention centre, then a one-way flight.'; }
  if (first && lawyer && (c.id === 'shoplift' || c.id === 'pickpocket') && luck(s, 'reconcile') < 0.6) { s.money -= value; add(s, { law: c.law, what: c.name, kind: 'admin', sentence: 'case closed: reconciliation, the damage repaid' }); return `Your lawyer arranges a reconciliation with the victim (UK 76): you repay ${fmt(value)} ₽ and the case is closed. No record.`; }
  if (first) { s.money -= 20000; s.strikes += 2; add(s, { law: c.law, what: c.name, kind: 'criminal', sentence: 'one year suspended, a criminal record, 20,000 ₽' }); return 'The court gives one year suspended and 20,000 ₽ of costs. You now have a criminal record: no police, civil service or many other jobs.'; }
  s.strikes += 2; add(s, { law: c.law, what: c.name, kind: 'criminal', sentence: 'eight months in a colony' });
  G.absentDays(s, 60);
  return 'A second conviction: eight months in a general-regime colony; with parole for good behaviour you are out after two months.';
}

/** Commits a crime. Success brings the gain and the police's attention; failure is the station and the court. Some successes are caught later. */
export function commit(s: State, id: CrimeId): Result {
  const why = cannotCommit(s, id); if (why) return { ok: false, msg: why };
  const c = crimeOf(id)!, L = lawOf(s); L.last = s.day; L.crimes++;
  const value = c.lo === c.hi ? c.lo : Math.round((c.lo + luck(s, 'v') * (c.hi - c.lo)) / 50) * 50;
  s.energy = clamp(s.energy - 6);
  if (luck(s, 'catch') < riskOf(s, id)) { const m = sentence(s, c, value, false); return { ok: true, msg: `Caught. Taken to the police station, a protocol is written. ${m}` }; }
  L.heat = clamp(L.heat + c.heat); s.stress = clamp(s.stress + (id === 'drink' ? -6 : 4));
  if (value) s.money += Math.round(value * (id === 'shoplift' ? 0.6 : 1));          // goods are worth less than their price on the shelf
  if (id === 'pickpocket' && BIG(s.city) && luck(s, 'camera') < 0.3) L.pending = { crime: id, day: s.day + 2 + Math.floor(luck(s, 'when') * 4), value };
  const got = id === 'shoplift' ? `goods worth ${fmt(value)} ₽` : id === 'pickpocket' ? `a wallet with ${fmt(value)} ₽` : id === 'fare' ? 'a free ride' : id === 'drink' ? 'a quiet evening' : 'nothing but bruised knuckles';
  if (id === 'fight') s.health = clamp(s.health - 6);
  return { ok: true, msg: `Nobody stopped you: ${got}. The police's attention to you grows.` };
}

/* ---------- the victim: thefts, calling the police, the investigation ---------- */
const THEFT_TEXT: Record<Theft['where'], string> = { metro: 'In the crush of the metro someone opened your bag: your phone and wallet are gone.', street: 'Two men stopped you in a dark yard and took your money.', home: 'Your flat was broken into while you were out: the cash from the drawer is gone.' };
export function theft(s: State, where: Theft['where']): Theft {
  const same = lawOf(s).thefts.find(x => x.day === s.day && x.where === where); if (same) return same;     // the scene may be drawn more than once
  const L = lawOf(s), value = where === 'home' ? 5000 + Math.round(luck(s, 'h') * 15) * 1000 : where === 'street' ? Math.min(Math.max(0, s.money), 2000 + Math.round(luck(s, 's') * 6) * 1000) : 1500 + Math.round(luck(s, 'm') * 5) * 500;
  L.seq++; const t: Theft = { id: `t${L.seq}`, day: s.day, what: THEFT_TEXT[where], value, where, phone: where === 'metro', status: 'open', due: -1 };
  s.money -= value; s.stress = clamp(s.stress + 10); if (t.phone) s.phone = 0;
  L.thefts.unshift(t); L.thefts = L.thefts.slice(0, 15); return t;
}
/** The chance the police find it: the metro's cameras help most. */
export const findChance = (t: Theft): number => t.where === 'metro' ? 0.5 : t.where === 'home' ? 0.35 : 0.3;
/** Reports a theft (102 from any phone, 112 for emergencies): a statement at the station, a case number, and days of investigation. */
export function report(s: State, id: string): Result {
  const L = lawOf(s), t = L.thefts.find(x => x.id === id); if (!t) return { ok: false, msg: 'No such case.' };
  if (t.status !== 'open') return { ok: false, msg: 'It is reported already.' };
  if (s.energy < 8) return { ok: false, msg: 'You are too tired to go to the station today.' };
  t.status = 'reported'; t.due = s.day + 3 + Math.floor(luck(s, 'due') * 8); L.reported++; s.energy = clamp(s.energy - 8); s.stress = clamp(s.stress - 3);
  return { ok: true, msg: `You called 102 and gave a statement at the station. Case number registered (KUSP); the investigator will call within ${t.due - s.day} days.` };
}
/** Brings the investigations and the delayed arrests up to date (once a day). */
export function tickCases(s: State): string[] {
  const L = lawOf(s), out: string[] = [];
  for (const t of L.thefts) if (t.status === 'reported' && s.day >= t.due) {
    if ((hash(`${t.id}|${s.name}`) % 100) / 100 < findChance(t)) { t.status = 'solved'; s.money += t.value; if (t.phone) s.phone = 1; out.push(`🚓 The police found who robbed you${t.where === 'metro' ? ' from the metro cameras' : ''}: ${t.phone ? 'your phone and ' : ''}${fmt(t.value)} ₽ are returned.`); }
    else { t.status = 'closed'; out.push('🚓 The investigator calls: the case is suspended, the thief not found. It stays open if anything turns up.'); }
  }
  if (L.pending && s.day >= L.pending.day && !s.queue.includes('law_arrest')) { L.pending.day = s.day + 9999; s.queue.push('law_arrest'); }
  return out;
}

/* ---------- the daily checks ---------- */
/** Once a day: the police's attention fades, investigations move, and sometimes something happens: a theft, a crime to witness, a document raid. */
export function tickLaw(s: State): string[] {
  const L = lawOf(s); if (L.ticked >= s.day || s.over) return [];
  const days = s.day - L.ticked; L.ticked = s.day;
  L.heat = clamp(L.heat - 3 * days);
  const out = tickCases(s);
  L.noPapers = problemsOf(s).length && foreigner(s) ? (L.noPapers ?? 0) + days : 0;          // days in a row without valid papers
  if (L.noPapers >= 30 && !L.register) { L.register = true; out.push('⚠ You are on the register of controlled persons: no legal grounds to stay. Banks freeze accounts, no driving or marriage, and the police may detain you. Sort your papers or leave.'); }
  if (L.register && !problemsOf(s).length) { L.register = false; out.push('You are off the register of controlled persons: your papers are in order.'); }
  if (s.queue.some(id => id.startsWith('law_'))) return out;
  const r = luck(s, 'daily'), metro = METRO.includes(s.city);
  const raid = foreigner(s) ? 0.02 * (problemsOf(s).length ? 3 : 1) * (BIG(s.city) ? 1.3 : 1) * G.diffOf(s).police * (L.register ? 2 : 1) : 0;
  if (r < raid) s.queue.push('law_raid');
  else if (r < raid + 0.012) s.queue.push(metro ? 'law_robbed_metro' : 'law_robbed_street');
  else if (r < raid + 0.016) s.queue.push('law_robbed_home');
  else if (r < raid + 0.04) s.queue.push('law_witness');
  else if (r < raid + 0.045 && s.money < 20000) s.queue.push('law_drugs');
  return out;
}
/** The engine's check of papers (registration, patent, student visa), used for the raids. */
const problemsOf = (s: State): string[] => G.problems(s);

/* ---------- the scenes ---------- */
const O = (msg: string): Outcome => ({ msg, fx: {} });
const robbed = (where: Theft['where']) => (s: State): Scenario => {
  const t = theft(s, where);
  return { id: `law_robbed_${where}`, cat: 'police', title: where === 'metro' ? 'Robbed in the metro' : where === 'home' ? 'Your flat was burgled' : 'Robbed in the street', text: `${t.what} (${fmt(t.value)} ₽${t.phone ? ' and your phone' : ''}).`, free: true, choices: [
    { t: 'Call the police (102) and give a statement', r: x => O(report(x, t.id).msg) },
    { t: 'Block your bank cards first, then report it', r: x => { x.stress = clamp(x.stress - 2); return O(`Cards blocked through the bank's line. ${report(x, t.id).msg}`); } },
    { t: 'Do not bother the police', r: x => { x.stress = clamp(x.stress + 4); return O('You let it go. Nobody will look for it now.'); } },
  ] };
};
G.dyn.law_robbed_metro = robbed('metro'); G.dyn.law_robbed_street = robbed('street'); G.dyn.law_robbed_home = robbed('home');
G.dyn.law_witness = s => ({ id: 'law_witness', cat: 'police', title: 'A thief on the bus', text: 'You see a man slide a wallet out of an old woman\'s bag at the stop.', free: true, choices: [
  { t: 'Call 112 and keep him in sight', r: x => { const L = lawOf(x); L.helped++; x.rep = clamp(x.rep + 3); x.energy = clamp(x.energy - 8); return O('A patrol car arrives in four minutes; he is arrested with the wallet in his pocket. You give a witness statement. The woman hugs you.'); } },
  { t: 'Shout and grab his arm', r: x => { if (luck(x, 'brave') < 0.6) { lawOf(x).helped++; x.rep = clamp(x.rep + 5); return O('He drops the wallet and runs. People around clap.'); } x.health = clamp(x.health - 8); x.rep = clamp(x.rep + 2); return O('He shoves you into a pole and runs off with it. Your shoulder aches.'); } },
  { t: 'Look away', r: x => { x.stress = clamp(x.stress + 3); return O('Not your business. It stays with you all day.'); } },
] });
G.dyn.law_arrest = s => {
  const L = lawOf(s), p = L.pending, c = crimeOf(p?.crime ?? 'pickpocket')!, value = p?.value ?? 3000;
  const done = (x: State): void => { lawOf(x).pending = null; };
  return { id: 'law_arrest', cat: 'police', title: 'Police at the door', text: `Two officers and an investigator: the metro cameras recognised your face. You are detained on suspicion under ${c.law}.`, free: true, choices: [
    { t: 'Go with them, ask for the state lawyer', r: x => { done(x); return O(sentence(x, c, value, false)); } },
    { t: 'Call a private lawyer (15,000 ₽)', r: x => { done(x); if (x.money < 15000) return O(`You cannot pay a lawyer. ${sentence(x, c, value, false)}`); x.money -= 15000; return O(sentence(x, c, value, true)); } },
    { t: 'Run for it', r: x => { done(x); const resist: Crime = { id: 'fight', name: 'Resisting the police', ru: 'Неповиновение полиции', law: 'KoAP 19.3', kind: 'admin', risk: 1, lo: 0, hi: 0, heat: 20, blurb: '' }; const a = sentence(x, resist, 0, false); return O(`You are caught on the stairs. ${a} ${sentence(x, c, value, false)}`); } },
  ] };
};
/** A document raid of the migration police; where it happens depends on the player's job. */
G.dyn.law_raid = s => {
  const L = lawOf(s);
  const place = s.job && /construction|warehouse|market|farm|fish/.test(s.job) ? (/construction/.test(s.job) ? 'the building site' : /market/.test(s.job) ? 'the market' : 'the warehouse') : ['the metro exit', 'your hostel', 'the market'][hash(`${s.day}`) % 3];
  const bad = problemsOf(s), big = BIG(s.city);
  const court = (x: State, lawyer: boolean): string => {
    L.raids++;
    const fine = big ? 5000 + Math.round(luck(x, 'rf') * 2) * 1000 : 2000 + Math.round(luck(x, 'rf') * 3) * 1000;
    const law = x.job ? 'KoAP 18.10 (working without the right papers)' : 'KoAP 18.8 (breaking the rules of stay)';
    const expel = big ? !(lawyer && luck(x, 'lw') < 0.3) : !(lawyer && luck(x, 'lw') < 0.6) && (x.strikes >= 1 || L.register);
    x.money -= fine; x.stress = clamp(x.stress + 15); add(x, { law, what: 'Undocumented at a raid', kind: 'admin', sentence: expel ? `fine ${fmt(fine)} ₽ and expulsion` : `fine ${fmt(fine)} ₽` });
    if (expel) { x.strikes = Math.max(x.strikes, 3); x.over = 'deported'; return `Court the next morning: ${law}, a fine of ${fmt(fine)} ₽ and administrative expulsion with an entry ban of five years. The temporary detention centre for foreigners, then a flight home.`; }
    x.strikes++; return `Court: ${law}, a fine of ${fmt(fine)} ₽. No expulsion this time; put your papers in order at once.`;
  };
  if (!bad.length) return { id: 'law_raid', cat: 'police', title: `A document check at ${place}`, text: 'Officers of the migration police block the exits: "Documents, everyone."', free: true, choices: [
    { t: 'Show the passport, the migration card and the papers', r: x => { L.raids++; x.energy = clamp(x.energy - 8); x.stress = clamp(x.stress + 4); return O('They check you against the database. Everything is in order. You lose an hour and go.'); } },
  ] };
  return { id: 'law_raid', cat: 'police', title: `A raid at ${place}`, text: `Officers of the migration police check everyone. Your papers are not in order (${bad.join(', ')}).`, free: true, choices: [
    { t: 'Show what you have and explain', r: x => O(`You are taken to the station. ${court(x, false)}`) },
    { t: 'Ask to call a lawyer and your consulate (15,000 ₽)', r: x => { if (x.money < 15000) return O(`You cannot pay. ${court(x, false)}`); x.money -= 15000; return O(`The lawyer comes to the station. ${court(x, true)}`); } },
    { t: 'Slip away through the back', r: x => { if (luck(x, 'run') < 0.3) { lawOf(x).heat = clamp(lawOf(x).heat + 20); x.stress = clamp(x.stress + 10); return O('You get out through the loading bay. This time.'); } return O(`Caught at the gate. ${court(x, false)}`); } },
  ] };
};
/** The offer every big city knows: "easy money" as a courier for an online shop that sells drugs. The law is harsh (UK 228.1). */
G.dyn.law_drugs = () => ({ id: 'law_drugs', cat: 'police', title: '"Easy money"', text: 'A message: "Courier work, 15,000 a day, flexible hours, no experience needed. Just leave small packets in hidden places." You know what that is.', free: true, choices: [
  { t: 'Refuse and block the number', r: () => O('Blocked. Some money is not worth it.') },
  { t: 'Report it to the police (102)', r: x => { lawOf(x).helped++; x.rep = clamp(x.rep + 2); return O('The officer thanks you and takes the number and the screenshots for the drugs department.'); } },
  { t: 'Take the job', r: x => {
    const c: Crime = { id: 'pickpocket', name: 'Selling drugs as a courier', ru: 'Сбыт наркотиков (закладки)', law: 'UK 228.1', kind: 'criminal', risk: 1, lo: 0, hi: 0, heat: 40, blurb: '' };
    if (luck(x, 'drugs') < 0.7) { const m = sentence(x, c, 0, false); if (!x.over) G.absentDays(x, 60); return O('Arrested at the second hiding place: the police watch these spots. ' + m + ' Under UK 228.1 the real sentence starts at four years.'); }
    lawOf(x).heat = clamp(lawOf(x).heat + 40); x.money += 15000; x.stress = clamp(x.stress + 15); return O('15,000 ₽ on a card in someone else\'s name, and you cannot sleep. The next time is likely the last.'); } },
] });
turnHooks.push(tickLaw);

/** What the police may and may not do, and the player's rights (shown on the screen). */
export const RIGHTS: string[] = [
  'An officer must give their name, rank and the reason for a check, and show the ID if you ask (Law on Police, art. 5).',
  'A foreigner must carry the passport, the migration card and the registration; a citizen need not carry the passport, but without it may be taken for identification for up to three hours.',
  'At the station you have the right to a lawyer from the moment of detention, to an interpreter, and a foreigner to inform the consulate.',
  'Detention before a court: up to 48 hours for a crime; for an administrative case usually no more than 3 hours (48 if arrest or expulsion may follow).',
  'Calls: 112 for any emergency (free, from any phone, even without a SIM card), 102 for the police.',
  'Offering a bribe is a crime too (UK 291). Report extortion to the internal security of the MVD or the prosecutor.',
];
