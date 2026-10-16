/* The phone as a game system: contacts, calls, chats and bank transfers. Pure functions over the game state, so they are tested without a screen.
   Everyone the player can call or write to is invented. The phone number is a made-up Russian mobile number; nothing is ever sent anywhere. */
import * as G from './engine';
import type { State, Effects } from './engine';

export type ContactKind = 'family' | 'friend' | 'partner' | 'landlord' | 'work' | 'bank' | 'neighbour' | 'service' | 'emergency';
export interface Contact { id: string; name: string; icon: string; kind: ContactKind; number: string }

/** Who is in the phone book now. Some contacts exist only when the player's life has them (a job, a partner, a landlord, a bank account). */
export function contactsFor(s: State): Contact[] {
  const c = (id: string, name: string, icon: string, kind: ContactKind, number?: string): Contact => ({ id, name, icon, kind, number: number ?? G.numberFrom('contact|' + id) });
  const out: Contact[] = [c('mum', 'Mum', '👩', 'family')];
  if (s.partner) out.push(c('partner', s.partner.name, '💞', 'partner'));
  if (s.friends >= 1) out.push(c('friend', 'Dima (friend)', '🧑', 'friend'));
  if (s.rent > 0) out.push(c('landlord', 'Landlord', '🔑', 'landlord'));
  if (s.job) out.push(c('work', 'Boss', '💼', 'work'));
  if (Object.values(s.bank).some(Boolean)) out.push(c('bank', 'Bank support', '🏦', 'bank', '8-800-100-00-01'));
  if (s.flags.arc_valentina_0) out.push(c('valentina', 'Valentina Petrovna', '👵', 'neighbour'));
  out.push(c('taxi', 'Taxi', '🚕', 'service'));
  out.push(c('112', 'Emergency 112', '🚨', 'emergency', '112'));
  return out;
}

/** Why the phone cannot be used for calls and messages right now, or null. Newcomers need a Russian SIM card; everybody needs a working phone. */
export function phoneBlock(s: State): string | null {
  if (s.phone <= 0) return 'Your phone is broken. Buy a new one at the electronics mall.';
  if (s.status !== 'citizen' && !s.flags.sim) return 'You have no Russian SIM card yet. Buy one at an operator shop (newcomers need identification first).';
  return null;
}

/* ---------- chat replies ---------- */
const pick = <T,>(a: T[], rnd: () => number): T => a[Math.min(a.length - 1, Math.floor(rnd() * a.length))];
const has = (t: string, re: RegExp): boolean => re.test(t.toLowerCase());

const REPLIES: Record<ContactKind, string[]> = {
  family: ['Have you eaten? Eat something warm.', 'I am so glad you wrote. Dress warmly!', 'We miss you. Call on Sunday?', 'Everything is fine here, do not worry about us.'],
  friend: ['Haha, true. Coffee on Friday?', 'Same here, what a week.', 'Send me a photo!', 'Let us meet soon.'],
  partner: ['I was just thinking about you.', 'Tea tonight?', 'You always make me smile.', 'Take care of yourself, please.'],
  landlord: ['Understood. Please send the rent on time.', 'I will look at it on Saturday.', 'Please do not make noise after eleven.', 'All right.'],
  work: ['Noted. See you tomorrow at nine.', 'Please send the report by the evening.', 'Thank you, good work.', 'Talk to me in the morning.'],
  bank: ['Never tell anyone your SMS code. A real bank will not ask for it.', 'You can manage cards in the app.', 'For safety, check the number on the back of your card.', 'Thank you for contacting us.'],
  neighbour: ['Good evening, dear! Eat something, you are so thin.', 'The cucumbers are ready; come by the door.', 'The lift is broken again, what can you do.', 'God bless you!'],
  service: ['The car will arrive in five minutes.', 'Where are you going?', 'Please wait at the entrance.', 'Thank you for choosing us.'],
  emergency: ['This number is for emergencies only: 112 works from any phone, free of charge.'],
};

export function replyFor(c: Contact, text: string, rnd: () => number = Math.random): string {
  if (c.kind === 'landlord' && has(text, /rent|pay|money|deposit/)) return 'The rent is due on Saturday. Please send it by transfer in the bank app.';
  if (c.kind === 'landlord' && has(text, /broken|repair|leak|boiler|lift/)) return 'Send me a photo and I will call a plumber.';
  if (c.kind === 'family' && has(text, /money|send|help/)) return 'Do not worry about us. Look after yourself first.';
  if (c.kind === 'work' && has(text, /sick|ill|late|day off/)) return 'Get well. Please send a doctor\'s note when you are back.';
  if (c.kind === 'bank' && has(text, /code|password|pin/)) return 'We will never ask for your SMS code or card PIN. If someone does, hang up.';
  if (has(text, /thank|thanks|spasibo/)) return 'You are welcome!';
  return pick(REPLIES[c.kind], rnd);
}

/** The small effect of a first chat today. Returns null when the contact has no bonus or it was used already. */
export function chatBonus(s: State, c: Contact): Effects | null {
  if (!G.firstToday(s, 'chat:' + c.id)) return null;
  if (c.kind === 'family') return { famLove: 1, stress: -1 };
  if (c.kind === 'partner' && s.partner) return { love: 1, stress: -1 };
  if (c.kind === 'friend' || c.kind === 'neighbour') return { stress: -2 };
  return null;
}

/* ---------- calls ---------- */
export interface CallResult { lines: string[]; fx: Effects }

const line = (who: string, text: string): string => `${who}: ${text}`;

/** What is said on a call. Only the first call to the same person on a day has an effect on the game. */
export function callScript(s: State, c: Contact, rnd: () => number = Math.random): CallResult {
  const first = G.firstToday(s, 'call:' + c.id);
  const none: Effects = {};
  switch (c.kind) {
    case 'family': return { lines: [line(c.name, 'Hello, is that you? How are you? Have you eaten?'), 'You talk for half an hour about nothing and everything.'], fx: first ? { famLove: 3, stress: -5 } : none };
    case 'partner': return { lines: [line(c.name, 'I was waiting for your call.'), 'You talk until the battery warning appears.'], fx: first && s.partner ? { love: 2, stress: -4 } : none };
    case 'friend': return { lines: [line(c.name, pick(['Finally! I have so much to tell you.', 'Hey! Are we still on for Friday?'], rnd)), 'A cheerful quarter of an hour.'], fx: first ? { stress: -4, friends: rnd() < 0.15 ? 1 : 0 } : none };
    case 'neighbour': return { lines: [line(c.name, 'Dear, how nice of you to call!'), 'You hear about the whole house, and a jar of pickles is promised.'], fx: first ? { stress: -3, merit: 1 } : none };
    case 'landlord': return { lines: [line(c.name, s.rent > 0 ? `The rent is ${G.money(s.rent)}, due on Saturday.` : 'Hello?'), 'A short, businesslike call.'], fx: none };
    case 'work': return { lines: [line(c.name, s.job ? 'Your next shift is tomorrow at nine.' : 'Hello?'), 'You say you will be there.'], fx: none };
    case 'bank': return { lines: [line(c.name, 'Hello. For your safety, we will never ask for your SMS code or card PIN.'), 'The operator checks your question and thanks you for calling.'], fx: first ? { know: 1 } : none };
    case 'service': return { lines: [line(c.name, 'Where are you going? A car will be there in five minutes.'), 'The ride itself is not part of the game; use the map to travel.'], fx: none };
    case 'emergency': return { lines: ['112 is the single emergency number in Russia; it is free from any phone. The separate numbers 101, 102, 103 and 104 also work from a mobile.', 'This is a demonstration: no help is sent.'], fx: none };
  }
}

/* ---------- bank transfers ---------- */
export const TRANSFER_MAX = 100000;
/** Who can receive a transfer from the bank app. */
export const canReceive = (c: Contact): boolean => ['family', 'friend', 'partner', 'landlord', 'neighbour'].includes(c.kind);

export interface TransferResult { ok: boolean; message: string; fx: Effects }

/** Checks and describes a transfer; the caller applies the effects. Invalid transfers change nothing. */
export function transfer(s: State, c: Contact, rawAmount: string): TransferResult {
  if (!Object.values(s.bank).some(Boolean)) return { ok: false, message: 'You need a bank account first (Online services, Open a bank account).', fx: {} };
  const block = phoneBlock(s);
  if (block) return { ok: false, message: block, fx: {} };
  if (!canReceive(c)) return { ok: false, message: `${c.name} cannot receive transfers.`, fx: {} };
  const cleaned = rawAmount.replace(/[\s,]/g, '');
  if (!/^\d+$/.test(cleaned)) return { ok: false, message: 'Enter the amount in whole roubles.', fx: {} };
  const amount = Number(cleaned);
  if (amount < 1) return { ok: false, message: 'The amount must be at least ₽1.', fx: {} };
  if (amount > TRANSFER_MAX) return { ok: false, message: `One transfer is limited to ${G.money(TRANSFER_MAX)} in the game.`, fx: {} };
  if (amount > s.money) return { ok: false, message: `You only have ${G.money(s.money)}.`, fx: {} };
  const fx: Effects = { money: -amount };
  if (c.kind === 'family') { fx.famLove = Math.min(6, 1 + Math.floor(amount / 2000)); fx.stress = -2; }
  if (c.kind === 'partner' && s.partner) fx.love = Math.min(4, 1 + Math.floor(amount / 5000));
  if (c.kind === 'friend' || c.kind === 'neighbour') fx.stress = -1;
  return { ok: true, message: `Sent ${G.money(amount)} to ${c.name}.`, fx };
}

/* ---------- group chats ---------- */
export interface Group { id: string; name: string; icon: string; lines: { from: string; text: string }[] }

/** Group chats that exist in the player's life. The talk in them is invented and does not change with the player. */
export function groupsFor(s: State): Group[] {
  const g = (id: string, name: string, icon: string, lines: [string, string][]): Group => ({ id, name, icon, lines: lines.map(([from, text]) => ({ from, text })) });
  const out: Group[] = [g('house', 'House chat', '🏢', [['@vera_apt12', 'Who parked across the entrance again?'], ['@kolya_pro', 'The lift is being repaired on Thursday.'], ['@olga_p', 'Please do not leave bags in the corridor.']])];
  if (s.job) out.push(g('work', 'Work chat', '💼', [['@boss', 'Shift swap on Saturday: who can help?'], ['@dima_taxi', 'I can take the morning.'], ['@marina_cafe', 'Do not forget to log your hours.']]));
  if (s.kids > 0) out.push(g('parents', 'Class parents', '🎒', [['@teacher', 'Parents meeting on Tuesday at six.'], ['@mama_sveta', 'Who is collecting for the flowers?'], ['@papa_alex', 'Homework is on the portal.']]));
  if (s.flags.admitted) out.push(g('study', 'Study group', '🎓', [['@aigul_k', 'Anyone have the lecture notes?'], ['@timur_n', 'The exam list is on the third floor.'], ['@zarina_b', 'Library after four?']]));
  if (s.status !== 'citizen') out.push(g('newcomers', 'Newcomers help', '🧭', [['@rustam92', 'Always keep a copy of your registration.'], ['@sasha_metro', 'The migration queue is shortest on Tuesdays.'], ['@lena_msk', 'Never pay anyone who promises a "guaranteed" document.']]));
  return out;
}

/* ---------- message requests: texts from numbers that are not in your phone book ---------- */
export interface MsgRequest { id: string; from: string; text: string; risky: boolean }

const REQUESTS: { id: string; text: string; risky: boolean; bank?: boolean }[] = [
  { id: 'courier', text: 'Your parcel is held at the depot. Open the link and pay a small fee to release it.', risky: true },
  { id: 'prize', text: 'You have won a free phone! Click here in the next ten minutes.', risky: true },
  { id: 'card', text: 'Your card is blocked. Call this number and say your SMS code to unblock it.', risky: true, bank: true },
  { id: 'sofa', text: 'Hello! Is the sofa still for sale?', risky: false },
  { id: 'wrong', text: 'Sorry, wrong number. Have a lovely day!', risky: false },
  { id: 'survey', text: 'Hello, we are a local library. Would you like to join our free reading club?', risky: false },
];

/** Up to three requests for today. The same day always gives the same requests. Handled ones disappear. */
export function requestsFor(s: State): MsgRequest[] {
  const pool = REQUESTS.filter(r => !r.bank || Object.values(s.bank).some(Boolean));
  const start = (Math.imul(s.day + 1, 2654435761) >>> 0) % pool.length;
  const out: MsgRequest[] = [];
  for (let k = 0; k < 3; k++) {
    const r = pool[(start + k) % pool.length];
    if (G.phoneOf(s).bonus['req:' + r.id] === s.day) continue;
    out.push({ id: r.id, from: G.numberFrom(`${r.id}|${s.day}`), text: r.text, risky: r.risky });
  }
  return out;
}

export type RequestAction = 'block' | 'open';
export interface RequestResult { message: string; fx: Effects }

/** Blocking is always safe and teaches a little. Opening a risky one costs money (never more than 60 per cent of what you have, at least 300). */
export function resolveRequest(s: State, req: MsgRequest, action: RequestAction): RequestResult {
  G.phoneOf(s).bonus['req:' + req.id] = s.day;
  if (action === 'block') return req.risky
    ? { message: 'Blocked. That was a scam text: real couriers, banks and prizes never ask you to pay or share a code through a link.', fx: { know: 2, stress: -1 } }
    : { message: 'Blocked. Nothing bad would have happened, but it is fine to be careful.', fx: { stress: -1 } };
  if (!req.risky) return { message: 'You reply politely. A short friendly exchange, nothing more.', fx: { stress: -1 } };
  const loss = Math.min(3000, Math.max(300, Math.floor(Math.max(0, s.money) * 0.6)));
  return { message: `It was a scam. You lose ${G.money(loss)} and spend an hour getting your accounts back in order.`, fx: { money: -loss, stress: 10, know: 2 } };
}
