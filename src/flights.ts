/* Flights: destinations, pricing, the booking record and the airport-day scenes.
   The interactive booking website itself lives in booking-ui.ts. */
import { dyn, S, O, gamble, rnd, problems, absentDays, isForeigner } from './engine';
import type { State, Booking, Scenario, Outcome } from './engine';

export interface Dest { id: string; name: string; country: string; intl: boolean; price: number; hours: number }

export const DESTS: Dest[] = [
  { id: 'dushanbe', name: 'Dushanbe', country: 'Tajikistan', intl: true, price: 14500, hours: 4.5 },
  { id: 'tashkent', name: 'Tashkent', country: 'Uzbekistan', intl: true, price: 12500, hours: 4.5 },
  { id: 'bishkek', name: 'Bishkek', country: 'Kyrgyzstan', intl: true, price: 11800, hours: 4.5 },
  { id: 'yerevan', name: 'Yerevan', country: 'Armenia', intl: true, price: 13500, hours: 3.5 },
  { id: 'almaty', name: 'Almaty', country: 'Kazakhstan', intl: true, price: 12000, hours: 4.5 },
  { id: 'istanbul', name: 'Istanbul', country: 'Türkiye', intl: true, price: 18500, hours: 3.5 },
  { id: 'lagos', name: 'Lagos (via Istanbul)', country: 'Nigeria', intl: true, price: 68000, hours: 14 },
  { id: 'sochi', name: 'Sochi', country: 'Russia', intl: false, price: 6500, hours: 2.5 },
  { id: 'spb', name: 'Saint Petersburg', country: 'Russia', intl: false, price: 3800, hours: 1.5 },
  { id: 'kazan', name: 'Kazan', country: 'Russia', intl: false, price: 4200, hours: 1.5 },
  { id: 'novosibirsk', name: 'Novosibirsk', country: 'Russia', intl: false, price: 11000, hours: 4.5 },
  { id: 'vladivostok', name: 'Vladivostok', country: 'Russia', intl: false, price: 24000, hours: 8.5 },
];
export const destById = (id: string): Dest => DESTS.find(d => d.id === id) as Dest;

/** Last-minute fares cost more; booking a month ahead is cheapest. */
export const leadMultiplier = (lead: number): number => (lead < 3 ? 1.9 : lead < 7 ? 1.5 : lead < 14 ? 1.25 : lead < 30 ? 1 : 0.9);

export const EXTRAS = { baggage: 2500, meal: 700, insurance: 1200, seat: 500, agentFee: 600 };

/** Your passport first name must equal your character name; the website does not check it for you. */
export const nameMatches = (s: State, first: string): boolean => first.trim().toLowerCase() === s.name.trim().toLowerCase();

export function passportFor(s: State): string {
  if (!s.tmp.passport) s.tmp.passport = String.fromCharCode(65 + rnd(0, 25)) + String.fromCharCode(65 + rnd(0, 25)) + String(rnd(1000000, 9999999));
  return String(s.tmp.passport);
}

/** Warnings shown on the booking site before paying. */
export function warnings(s: State, d: Dest, lead: number, stay: number): string[] {
  const w: string[] = [];
  if (isForeigner(s) && !s.flags.rvp && d.intl) {
    if (s.docs.reg > 0 && s.docs.reg < lead + stay + 1) w.push('Your registration will expire before you return. You may face a fine or refusal of entry.');
    if (s.status === 'migrant' && s.docs.patent > 0 && s.docs.patent < lead + stay + 1) w.push('Your patent will expire while you are away.');
    if (s.status === 'student' && s.docs.visa < lead + stay + 1) w.push('Your visa will expire before you are back.');
    if (s.strikes >= 2) w.push('You have two recorded violations. Border control may refuse your return.');
  }
  if (s.job && stay > 7) w.push('A long absence may cost you your job.');
  if (s.partner || s.kids) w.push('Your family will miss you — but the trip also costs money you may need.');
  return w;
}

/* ---------- airport day ---------- */
const need = (s: State): Booking | null => (s.booking && !s.booking.done ? s.booking : null);
const flightScene = (id: string, build: (s: State, b: Booking) => Omit<Scenario, 'id' | 'cat' | 'free' | 'dynamic'>): void => {
  dyn[id] = s => {
    const b = need(s);
    if (!b) return { id, cat: 'air', free: true, dynamic: true, title: 'No flight', text: 'There is no active booking.', choices: [{ t: 'OK', r: () => O('Nothing to do.', {}) }] };
    return { id, cat: 'air', free: true, dynamic: true, ...build(s, b) };
  };
};
const q = (id: string) => ({ queue: id });

flightScene('fl_airport', (s, b) => ({
  title: `Departure day: ${destById(b.dest).name}`,
  text: `Your flight leaves today (booking ${b.pnr}). ${s.weather === 'snow' ? 'Heavy snow is slowing the roads.' : s.weather === 'frost' ? 'It is minus twenty and the car engines do not like it.' : 'The weather is calm.'} How do you get to the airport?`,
  choices: [
    { t: 'Express train (₽500)', r: () => gamble(s.weather === 'snow' ? 0.8 : 0.93, O('The express train glides through the snow. You arrive early.', { money: -500, ...q('fl_security') }), O('The train stops for forty minutes. You sprint through the terminal.', { money: -500, stress: 12, ...q('fl_security') })) },
    { t: 'Taxi (₽3,000)', r: () => s.money < 3000 ? O('You cannot afford a taxi. You take the metro and bus instead, and stress rises.', { stress: 8, ...q('fl_security') }) : gamble(s.weather === 'snow' ? 0.88 : 0.97, O('The driver knows every shortcut. You are early with time to spare.', { money: -3000, ...q('fl_security') }), O('A traffic jam at the ring road. You make it with minutes to spare.', { money: -3000, stress: 10, ...q('fl_security') })) },
    { t: 'Bus and metro (₽200)', r: () => gamble(s.weather === 'snow' ? 0.6 : 0.82, O('Cheap and slow, but you arrive on time.', { money: -200, ...q('fl_security') }), O('Two transfers, a delay and a closed exit. You watch the departure board in despair.', { money: -200, stress: 15, ...q('fl_missed') })) },
  ],
}));

flightScene('fl_missed', (s, b) => ({
  title: 'You missed the check-in',
  text: 'The counter has closed. A staff member suggests rebooking for the next day for a fee.',
  choices: [
    { t: 'Rebook for tomorrow (₽4,500)', r: () => s.money < 4500 ? O('You cannot pay. The ticket is lost.', { run: st => { if (st.booking) st.booking.done = true; st.booking = null; }, stress: 20 }) : O('A new ticket, a night at an airport bench, and a lesson learned.', { money: -4500, stress: 10, run: st => { if (st.booking) st.booking.dep = st.day + 1; } }) },
    { t: 'Give up and go home', r: () => O('You return home with a sinking feeling. The ticket is lost.', { run: st => { st.booking = null; }, stress: 18, energy: -10 }) },
  ],
}));

flightScene('fl_security', (s, b) => ({
  title: 'Check-in and security',
  text: `At the counter the agent checks your passport against the ticket: "${b.passenger}", passport ${b.passport}.`,
  choices: [
    { t: 'Hand over passport and ticket', r: () => {
      if (!b.passenger.toLowerCase().startsWith(s.name.trim().toLowerCase())) {
        return s.money >= 3500
          ? O('The name on the ticket does not match your passport. You pay ₽3,500 to correct it and keep the flight.', { money: -3500, stress: 14, ...q(b.intl ? 'fl_border' : 'fl_board') })
          : O('The name does not match and you cannot pay the correction fee. You are not allowed to fly.', { run: st => { st.booking = null; }, stress: 22 });
      }
      return O('Passport and ticket match. Your luggage goes on the belt.', { ...q(b.intl ? 'fl_border' : 'fl_board') });
    } },
    { t: 'Realise you forgot a liquid in your bag and fix it', r: () => O('A bottle of juice goes into the bin; you pass security without trouble.', { stress: 3, ...q(b.intl ? 'fl_border' : 'fl_board') }) },
  ],
}));

flightScene('fl_border', (s, b) => ({
  title: 'Passport control',
  text: 'A border officer scans your passport and looks at your migration documents, then at the screen.',
  choices: [
    { t: 'Answer calmly: purpose, return date, ticket', r: () => {
      const p = problems(s);
      if (isForeigner(s) && p.length) return gamble(0.4, O(`The officer notes: ${p[0]}. Warning issued; you may leave.`, { stress: 14, ...q('fl_board') }), O(`A report is drawn up: ${p[0]}. Fine and a recorded violation.`, { money: -5000, strike: 1, stress: 18, ...q('fl_board') }));
      return O('Stamp. "Have a good flight."', { stress: -2, ...q('fl_board') });
    } },
    { t: 'Ask for a translator or lawyer if unsure', r: () => O('The officer calls a colleague. Slow but fair.', { stress: 4, energy: -4, ...q('fl_board') }) },
  ],
}));

flightScene('fl_board', (s, b) => {
  const d = destById(b.dest);
  return {
    title: `Boarding to ${d.name}`,
    text: `${d.hours} hours in the air. Window seat, sleepy kid in front, a flight attendant with tea.`,
    choices: [
      { t: 'Read a book about the place you are going', r: () => O('You land knowing three new facts and one good restaurant.', { know: 3, stress: -6, ...q('fl_arrive') }) },
      { t: 'Sleep', r: () => O('You wake up with a stiff neck but a clear head.', { energy: 20, ...q('fl_arrive') }) },
      { t: 'Talk to your neighbour', r: () => O('A stranger tells you the story of their family. You swap numbers.', { friends: 1, stress: -6, ...q('fl_arrive') }) },
    ],
  };
});

flightScene('fl_arrive', (s, b) => {
  const d = destById(b.dest);
  const home = d.country !== 'Russia' && (s.home.includes(d.country) || (d.id === 'lagos' && s.home.includes('Nigeria')));
  return {
    title: `Arrival in ${d.name}`,
    text: home ? 'Your family is at the arrivals gate with flowers and too many bags. For a moment, nothing else exists.' : `You walk through the terminal of ${d.name}. The air smells different here.`,
    choices: [
      { t: `Spend ${b.stay} days there`, r: () => {
        absentDays(s, b.stay);
        const fx = home ? { famLove: 12, stress: -25, money: -Math.round(b.price * 0.2), energy: 10 } : { stress: -15, money: -Math.round(b.price * 0.2), know: d.intl ? 3 : 1, merit: 1 };
        const fired = s.job && b.stay > 7 && Math.random() < 0.4;
        return O(`${b.stay} days pass in ${d.name}. ${home ? 'Weddings, funerals, long dinners and a lot of stories.' : 'Streets, food and sights you will remember.'}${fired ? ' When you return, your employer has replaced you.' : ''}`, { ...fx, ...(fired ? { job: null } : {}), ...q(d.intl ? 'fl_return' : 'fl_home') });
      } },
    ],
  };
});

flightScene('fl_return', (s, b) => ({
  title: 'Returning to Russia',
  text: 'At Russian passport control the officer checks your documents and your migration record.',
  choices: [
    { t: 'Present your documents', r: () => {
      if (!isForeigner(s)) return O('A stamp and "welcome home".', { ...q('fl_home') });
      const p = problems(s);
      if (s.strikes >= 2) return O('The system shows repeated violations. Entry is refused. Your life in Russia ends at the border desk.', { strike: 3, stress: 30 });
      if (p.length) return gamble(0.45, O(`The officer notes: ${p[0]}. A fine and a recorded warning, but you are admitted.`, { money: -5000, stress: 18, ...q('fl_home') }), O(`Entry denied for: ${p[0]}.`, { strike: 3, stress: 30 }));
      return O('All in order. You are home.', { stress: -3, ...q('fl_home') });
    } },
  ],
}));

flightScene('fl_home', () => ({
  title: 'Home again',
  text: 'Your own bed, your own key and a stack of unread messages.',
  choices: [{ t: 'Unpack', r: () => O('You are back in the rhythm of the city.', { energy: -5, stress: -4, run: st => { if (st.booking) st.booking.done = true; st.flags.flew = true; st.booking = null; st.loc = 'home'; } }) }],
}));

/* ---------- ticket office at the airport opens the website ---------- */
S({
  id: 'air_ticket_office', cat: 'air', w: 3, title: 'Ticket office',
  text: 'Airline desks and a row of terminals. Prices at the counter are higher, but staff will help you book now.',
  choices: [
    { t: 'Use the airline website on your phone', r: (): Outcome => O('You open the airline site and start searching.', { ui: 'booking' }) },
    { t: 'Just look at the departures board', r: (): Outcome => O('Destinations you have never visited blink in white on black.', { stress: -3 }) },
  ],
});
S({
  id: 'air_lounge_story', cat: 'air', w: 1.5, title: 'Departure hall', text: 'A family on the benches shares tea and dumplings from a plastic box. A child asks where you are from.',
  choices: [
    { t: 'Chat with them', r: (): Outcome => O('You swap stories about home and food. The airport feels smaller.', { stress: -8, friends: 1 }) },
    { t: 'Keep to yourself', r: (): Outcome => O('You scroll your phone. The board flips.', {}) },
  ],
});
