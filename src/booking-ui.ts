/* The mock airline website: search → flights → passenger details → extras → payment → bank SMS code → e-ticket.
   Nothing real is collected: all fields are fictional game data. */
import * as G from './engine';
import type { State } from './engine';
import { DESTS, destById, leadMultiplier, EXTRAS, warnings, passportFor } from './flights';

const esc = (t: string): string => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

interface Form {
  step: number; dest: string; lead: number; stay: number; fare: number;
  first: string; last: string; passport: string; dob: string; baggage: boolean; meal: boolean; insurance: boolean; seat: boolean;
  pay: string; code: string; sms: string; tries: number; error: string;
}
const LEADS = [2, 5, 10, 14, 21, 30, 45, 60];
const STAYS = [3, 7, 14, 21];
const FARES: [string, number][] = [['Early flight 06:40', 1], ['Afternoon flight 13:15', 1.12], ['Night flight 23:50 (cheapest)', 0.88]];
const BANKS: Record<string, string> = { sber: 'Sber card', vtb: 'VTB card', tbank: 'T-Bank card' };

export function openBooking(s: State, host: HTMLElement, onClose: (booked: boolean) => void): void {
  const f: Form = {
    step: 1, dest: '', lead: 14, stay: 7, fare: 0, first: s.name, last: '', passport: passportFor(s), dob: '1998-05-14',
    baggage: false, meal: false, insurance: false, seat: false, pay: '', code: '', sms: '', tries: 0, error: '',
  };
  const dateLabel = (lead: number): string => new Date(G.dateOf(s).getTime() + lead * 864e5).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const base = (): number => Math.round(destById(f.dest).price * leadMultiplier(f.lead) * FARES[f.fare][1]);
  const extras = (): number => (f.baggage ? EXTRAS.baggage : 0) + (f.meal ? EXTRAS.meal : 0) + (f.insurance ? EXTRAS.insurance : 0) + (f.seat ? EXTRAS.seat : 0);
  const total = (): number => base() + extras() + (f.pay === 'agent' ? EXTRAS.agentFee : 0);
  const banks = Object.keys(s.bank).filter(k => s.bank[k]);

  const frame = (title: string, body: string, buttons: string): void => {
    host.innerHTML = `<div class="cat">Airline website</div>
      <div class="site"><div class="siteBar"><b>✈️ SkyRoute</b><span>${esc(title)} · step ${Math.min(f.step, 6)}/6</span></div>
      <div class="siteBody">${f.error ? `<div class="err">${esc(f.error)}</div>` : ''}${body}</div>
      <div class="siteBtns">${buttons}</div></div>`;
    f.error = '';
  };
  const btn = (id: string, label: string, cls = ''): string => `<button id="${id}" class="${cls}">${label}</button>`;
  const on = (id: string, fn: () => void): void => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  const val = (id: string): string => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value;
  const chk = (id: string): boolean => (document.getElementById(id) as HTMLInputElement).checked;

  const step1 = (): void => {
    const opts = DESTS.filter(d => d.intl || d.name !== s.city).map(d => `<option value="${d.id}" ${d.id === f.dest ? 'selected' : ''}>${esc(d.name)}, ${esc(d.country)} — from ${G.money(d.price)}</option>`).join('');
    frame('Search', `<label>From<input value="${esc(s.city)}" disabled></label>
      <label>To<select id="dest"><option value="">Choose destination…</option>${opts}</select></label>
      <label>Departure<select id="lead">${LEADS.map(l => `<option value="${l}" ${l === f.lead ? 'selected' : ''}>${dateLabel(l)} (in ${l} days)${l < 7 ? ' — last-minute fare' : ''}</option>`).join('')}</select></label>
      <label>Length of stay<select id="stay">${STAYS.map(l => `<option value="${l}" ${l === f.stay ? 'selected' : ''}>${l} days</option>`).join('')}</select></label>
      <p class="hint">Round trip, 1 passenger. Book earlier and the fare drops.</p>`,
    btn('close', 'Close the site', 'ghost') + btn('next', 'Search flights', 'primary'));
    on('close', () => onClose(false));
    on('next', () => {
      f.dest = val('dest'); f.lead = Number(val('lead')); f.stay = Number(val('stay'));
      if (!f.dest) { f.error = 'Please choose a destination.'; return step1(); }
      f.step = 2; step2();
    });
  };

  const step2 = (): void => {
    const d = destById(f.dest);
    const w = warnings(s, d, f.lead, f.stay);
    frame('Choose a flight', `<p><b>${esc(s.city)} → ${esc(d.name)}</b> · ${dateLabel(f.lead)} · returning ${dateLabel(f.lead + f.stay)}</p>
      ${FARES.map((x, i) => `<label class="fare"><input type="radio" name="fare" value="${i}" ${i === f.fare ? 'checked' : ''}> ${x[0]} · ${d.hours} h <b>${G.money(Math.round(d.price * leadMultiplier(f.lead) * x[1]))}</b></label>`).join('')}
      ${w.map(x => `<div class="warn">⚠ ${esc(x)}</div>`).join('')}`,
    btn('back', 'Back', 'ghost') + btn('next', 'Continue', 'primary'));
    on('back', () => { f.step = 1; step1(); });
    on('next', () => { const r = document.querySelector<HTMLInputElement>('input[name=fare]:checked'); f.fare = r ? Number(r.value) : 0; f.step = 3; step3(); });
  };

  const step3 = (): void => {
    frame('Passenger details', `<p class="hint">Enter the data exactly as it appears in your passport. A mismatch can stop you at check-in.</p>
      <label>First name (as in passport)<input id="first" value="${esc(f.first)}" autocomplete="off"></label>
      <label>Last name<input id="last" value="${esc(f.last)}" placeholder="e.g. Rahimov" autocomplete="off"></label>
      <label>Passport number<input id="passport" value="${esc(f.passport)}" autocomplete="off"></label>
      <label>Date of birth<input id="dob" type="date" value="${esc(f.dob)}"></label>`,
    btn('back', 'Back', 'ghost') + btn('next', 'Continue', 'primary'));
    on('back', () => { f.step = 2; step2(); });
    on('next', () => {
      f.first = val('first').trim(); f.last = val('last').trim(); f.passport = val('passport').trim(); f.dob = val('dob');
      if (!f.first || !f.last) { f.error = 'First and last name are required.'; return step3(); }
      if (f.passport.length < 6) { f.error = 'Passport number looks too short.'; return step3(); }
      if (!f.dob) { f.error = 'Please enter your date of birth.'; return step3(); }
      f.step = 4; step4();
    });
  };

  const step4 = (): void => {
    const ck = (id: string, on_: boolean, label: string, price: number): string => `<label class="fare"><input type="checkbox" id="${id}" ${on_ ? 'checked' : ''}> ${label} <b>+${G.money(price)}</b></label>`;
    frame('Extras', ck('baggage', f.baggage, '🧳 Checked baggage 23 kg', EXTRAS.baggage) + ck('meal', f.meal, '🍽️ Hot meal', EXTRAS.meal) + ck('insurance', f.insurance, '🛡️ Travel insurance', EXTRAS.insurance) + ck('seat', f.seat, '💺 Choose your seat', EXTRAS.seat)
      + `<p>Fare so far: <b>${G.money(base())}</b></p>`,
    btn('back', 'Back', 'ghost') + btn('next', 'Continue to payment', 'primary'));
    on('back', () => { f.step = 3; step3(); });
    on('next', () => { f.baggage = chk('baggage'); f.meal = chk('meal'); f.insurance = chk('insurance'); f.seat = chk('seat'); f.step = 5; step5(); });
  };

  const step5 = (): void => {
    if (!f.pay) f.pay = banks[0] || 'agent';
    const rows = banks.map(k => `<label class="fare"><input type="radio" name="pay" value="${k}" ${f.pay === k ? 'checked' : ''}> ${BANKS[k] || k} ••${(k.length * 1111 + 4).toString().slice(-4)}</label>`).join('')
      + `<label class="fare"><input type="radio" name="pay" value="agent" ${f.pay === 'agent' ? 'checked' : ''}> Pay cash at an agent (+${G.money(EXTRAS.agentFee)} fee)</label>`;
    frame('Payment', `${banks.length ? '' : '<div class="warn">You have no bank account yet — open one at Sber, VTB or T-Bank to pay by card.</div>'}${rows}
      <p>Total to pay: <b id="tot">${G.money(total())}</b> · You have ${G.money(s.money)}</p>`,
    btn('back', 'Back', 'ghost') + btn('next', 'Pay', 'primary'));
    on('back', () => { f.step = 4; step4(); });
    on('next', () => {
      const r = document.querySelector<HTMLInputElement>('input[name=pay]:checked');
      f.pay = r ? r.value : 'agent';
      if (s.money < total()) { f.error = `Insufficient funds: you need ${G.money(total())}.`; return step5(); }
      f.sms = String(Math.floor(1000 + Math.random() * 9000)); f.tries = 0;
      f.step = 6; step6();
    });
  };

  const step6 = (): void => {
    if (f.pay === 'agent') return finish();
    frame('Bank confirmation (3-D Secure)', `<p>Your bank sends an SMS: <b class="sms">“Code ${f.sms} to confirm payment of ${G.money(total())}. Never share it with anyone.”</b></p>
      <label>Enter the SMS code<input id="code" inputmode="numeric" maxlength="4" autocomplete="off"></label>
      <p class="hint">Attempts left: ${3 - f.tries}</p>`,
    btn('back', 'Cancel payment', 'ghost') + btn('next', 'Confirm', 'primary'));
    on('back', () => { f.step = 5; step5(); });
    on('next', () => {
      if (val('code').trim() === f.sms) return finish();
      f.tries++;
      if (f.tries >= 3) { f.error = 'Payment declined: too many wrong codes.'; f.step = 5; return step5(); }
      f.error = 'Wrong code. Check the SMS and try again.'; step6();
    });
  };

  const finish = (): void => {
    const d = destById(f.dest);
    const pnr = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
    const cost = total();
    const dep = s.day + f.lead;
    G.apply(s, { money: -cost, run: st => {
      st.booking = { dest: f.dest, intl: d.intl, dep, stay: f.stay, price: cost, pnr, passenger: `${f.first} ${f.last}`.toUpperCase(), passport: f.passport, baggage: f.baggage, done: false };
    } });
    s.log.unshift({ day: s.day, text: `Booked a flight to ${d.name} for ${dateLabel(f.lead)} (${pnr}), ${G.money(cost)}.` });
    G.advance(s);
    f.step = 7;
    host.innerHTML = `<div class="cat">Airline website</div><div class="site"><div class="siteBar"><b>✈️ SkyRoute</b><span>Booking confirmed</span></div>
      <div class="siteBody ticket"><h3>🎫 E-ticket · ${pnr}</h3>
      <p><b>${esc(`${f.first} ${f.last}`.toUpperCase())}</b> · passport ${esc(f.passport)}</p>
      <p>${esc(s.city)} → <b>${esc(d.name)}</b><br>Departure: ${dateLabel(f.lead)} · ${FARES[f.fare][0]}<br>Return: ${dateLabel(f.lead + f.stay)}</p>
      <p>Paid: <b>${G.money(cost)}</b> ${f.baggage ? '· 🧳 baggage' : ''} ${f.insurance ? '· 🛡️ insured' : ''}</p>
      <p class="hint">On departure day you will go to the airport: choose your transport, check in, pass security${d.intl ? ' and passport control' : ''}. Do not be late.</p></div>
      <div class="siteBtns">${btn('done', 'Done', 'primary')}</div></div>`;
    on('done', () => onClose(true));
  };

  if (s.booking && !s.booking.done) {
    const b = s.booking, d = destById(b.dest);
    host.innerHTML = `<div class="cat">Airline website</div><div class="site"><div class="siteBar"><b>✈️ SkyRoute</b><span>My bookings</span></div>
      <div class="siteBody"><p>You already have a booking: <b>${esc(d.name)}</b> in ${b.dep - s.day} day(s), reference <b>${b.pnr}</b>. You can only hold one active booking.</p></div>
      <div class="siteBtns">${btn('close', 'Close the site', 'primary')}</div></div>`;
    on('close', () => onClose(false));
    return;
  }
  step1();
}
