/* Phone messages, small talk at a place, and map layers. Pure functions: no screen code, so they are easy to test.
   All people and handles are invented. */
import * as G from './engine';
import type { State } from './engine';

/* ---------- Messages app ---------- */
export interface Msg { from: string; icon: string; text: string; tag?: 'urgent' | 'scam' | 'warm' }

/** What the phone would show right now, built only from the player's own situation. There is always at least one message. */
export function messagesFor(s: State): Msg[] {
  const out: Msg[] = [];
  const dow = G.dateOf(s).getDay();
  const banked = Object.values(s.bank).some(Boolean);
  if (s.status !== 'citizen') {
    if (s.docs.reg > 0 && s.docs.reg < 10) out.push({ from: 'Host', icon: '🏠', text: `Your registration ends in ${Math.round(s.docs.reg)} days. Shall we renew it?`, tag: 'urgent' });
    if (s.docs.reg <= 0) out.push({ from: 'Host', icon: '🏠', text: 'Your registration has expired. You must renew it today.', tag: 'urgent' });
    if (s.status === 'migrant' && s.docs.patent > 0 && s.docs.patent < 10) out.push({ from: 'Patent reminder', icon: '📄', text: `Your patent runs out in ${Math.round(s.docs.patent)} days. Pay for the next month.`, tag: 'urgent' });
  }
  if (s.rent > 0 && dow >= 4) out.push({ from: 'Landlord', icon: '🔑', text: `Rent is due on Saturday: ${G.money(s.rent)}.` });
  if (Number(s.tmp.fines) > 0) out.push({ from: 'Gosuslugi', icon: '🧾', text: `You have unpaid fines: ${G.money(Number(s.tmp.fines))}. Paying early costs less.`, tag: 'urgent' });
  if (Number(s.tmp.debt) > 0) out.push({ from: 'Bank', icon: '🏦', text: `Loan balance: ${G.money(Number(s.tmp.debt))}. The next payment is on Saturday.` });
  if (s.job) out.push({ from: 'Work', icon: '💼', text: dow === 5 || dow === 6 ? 'Thank you for this week. See you on Monday.' : 'Your shift starts tomorrow at nine. Do not be late.' });
  if (s.famLove < 40) out.push({ from: 'Mum', icon: '👩', text: 'You have not called for a long time. Is everything all right?', tag: 'warm' });
  else if (s.famLove >= 80) out.push({ from: 'Mum', icon: '👩', text: 'I sent you a photo of the garden. Eat something warm.', tag: 'warm' });
  if (s.partner) out.push({ from: s.partner.name, icon: '💞', text: s.partner.love >= 60 ? 'Thinking of you. Tea tonight?' : 'We should talk this week.', tag: 'warm' });
  else if (s.friends >= 3) out.push({ from: 'Friends', icon: '👥', text: 'We are meeting at the café on Friday. Come!', tag: 'warm' });
  if (banked && s.day % 9 === 4) out.push({ from: 'Unknown number', icon: '❓', text: 'Your parcel is held. Follow this link and enter your card details to release it.', tag: 'scam' });
  if (!out.length) out.push({ from: 'Gosuslugi', icon: '🏛️', text: 'Welcome. Your notifications will appear here.' });
  return out;
}

/* ---------- small talk at the place ---------- */
export const HANDLES = ['@lena_msk', '@rustam92', '@babushka_vera', '@kolya_pro', '@aigul_k', '@sasha_metro', '@dima_taxi', '@marina_cafe', '@olga_p', '@timur_n', '@zarina_b', '@vlad_s'];

const LINES: Record<string, string[]> = {
  home: ['Who is making tea?', 'The neighbours are drilling again.', 'Has anyone seen the courier?'],
  station: ['Is the 14:20 train on time?', 'Careful with your bags here.', 'The pies at the kiosk are still warm.'],
  mfc: ['The queue number machine is broken again.', 'Always bring the original and a copy.', 'Window 7 is the friendly one.'],
  guvm: ['Take a number and a book.', 'Check your papers twice.', 'They close for lunch at one.'],
  uni: ['Anyone know where room 214 is?', 'The canteen has cheap pies.', 'Exam lists are on the third floor.'],
  market: ['Fresh honey! Taste it first.', 'Those tomatoes are from the south.', 'Bargain politely and they smile.'],
  clinic: ['Take a ticket from the machine.', 'The doctor is running late.', 'Bring your passport and your policy.'],
  work: ['Break in ten minutes?', 'The boss is in a good mood.', 'Who ate my yoghurt?'],
  bank: ['The app is faster than the queue.', 'Never tell anyone your SMS code.', 'Take a number and a seat.'],
  center: ['Lovely evening for a walk.', 'There is a concert in the square.', 'Pigeons own this place.'],
  mall: ['Do not buy the cheapest cable.', 'Warranty first, colour second.', 'Sale on the third floor.'],
  airport: ['Gate changed again.', 'Have you checked in online?', 'Coffee here is a crime.'],
  dealer: ['The manager says this price is final.', 'Ask about the service history.', 'Try the heated seats!'],
  agency: ['Look at the flat before you pay.', 'The deposit should be written down.', 'Is the landlord at the viewing?'],
  hospital: ['Visiting hours end at six.', 'Be kind to the nurses.', 'Bring slippers.'],
  shelter: ['That one loves cuddles.', 'We need volunteers on Saturday.', 'Please bring a towel.'],
};
const GENERIC = ['Hello, everyone!', 'Nice weather today.', 'Quiet here, isn\'t it?'];

export interface ChatLine { from: string; text: string }
const pickOf = <T,>(a: T[], rnd: () => number): T => a[Math.min(a.length - 1, Math.floor(rnd() * a.length))];

/** Three lines of background talk for the place, from invented neighbours. */
export function ambientChat(placeId: string, rnd: () => number = Math.random): ChatLine[] {
  const lines = LINES[placeId] || GENERIC;
  const names = [...HANDLES];
  return lines.slice(0, 3).map(text => { const i = Math.min(names.length - 1, Math.floor(rnd() * names.length)); const from = names.splice(i, 1)[0]; return { from, text }; });
}

/** Keeps a message on one line and short. */
// kept as typed ("3 < 5" stays): the screen escapes it when it shows it (round 150: < and > were removed)
export const cleanMessage = (raw: string): string => raw.replace(/\s+/g, ' ').trim().slice(0, 80);

/** Someone nearby answers. The answer depends on a few words in the message and on the place. */
export function chatReply(placeId: string, text: string, rnd: () => number = Math.random): ChatLine {
  const t = text.toLowerCase();
  const from = pickOf(HANDLES, rnd);
  if (/\b(help|how|where|what|why|when)\b|\?/.test(t)) return { from, text: pickOf(['Good question. Ask at the desk, they know.', 'Try the official website first.', 'I think it is on the left, past the stairs.'], rnd) };
  if (/\b(hi|hello|privet|hey|good (morning|evening))\b/.test(t)) return { from, text: pickOf(['Hello! Welcome.', 'Privet! First time here?', 'Good to see a friendly face.'], rnd) };
  if (/\b(thank|thanks|spasibo)\b/.test(t)) return { from, text: 'Not at all. Everybody helps here.' };
  if (/\b(job|work|money|pay)\b/.test(t)) return { from, text: 'Check the jobs app on your phone. Careful with offers that sound too good.' };
  return { from, text: pickOf(LINES[placeId] || GENERIC, rnd) };
}

/* ---------- map layers ---------- */
export const LAYERS: { id: string; label: string; icon: string; places: string[] | null }[] = [
  { id: 'all', label: 'All', icon: '🗺️', places: null },
  { id: 'papers', label: 'Papers', icon: '🗂️', places: ['mfc', 'guvm', 'station', 'airport'] },
  { id: 'money', label: 'Money & shops', icon: '💳', places: ['bank', 'market', 'mall', 'dealer', 'agency'] },
  { id: 'health', label: 'Health & pets', icon: '🩺', places: ['clinic', 'hospital', 'shelter'] },
  { id: 'study', label: 'Study & work', icon: '🎓', places: ['uni', 'work'] },
  { id: 'city', label: 'City life', icon: '🏛️', places: ['center', 'home'] },
];

export const inLayer = (layerId: string, placeId: string): boolean => {
  const l = LAYERS.find(x => x.id === layerId);
  return !l || !l.places || l.places.includes(placeId);
};
