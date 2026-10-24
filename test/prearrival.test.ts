// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import * as P from '../src/prearrival';
import { preHtml, wirePre, resetPreView } from '../src/prearrival-ui';

const student = (name = 'Ada'): G.State => { const s = G.newState(name, 'student'); s.queue = []; return s; };
const goodForm = (s: G.State, p: P.Pre): P.Form => ({ name: s.name, purpose: 'study', entries: 'single', uni: P.UNI, entry: p.t + 12 });
const answersRight = (p: P.Pre): number[] => P.questionsFor(p).map(q => P.QUESTIONS[q].a.findIndex(a => a.ok));
/** Takes a student from Nigeria through every step of the study visa, carefully. */
function fullVisa(s: G.State, opts: { urgent?: boolean; check?: boolean } = {}): P.Pre {
  const p = P.startAtHome(s); expect(P.chooseCountry(s, 'NG').ok).toBe(true);
  if (!P.passportOk(p)) { P.renewPassport(p, true); P.waitUntil(p, p.renewReady!); }
  P.requestInvite(p); P.getHiv(p); P.buyInsurance(p); P.takePhoto(p);
  P.waitUntil(p, p.inviteReady!); expect(p.invite).toBe(true);
  P.fillForm(p, goodForm(s, p));
  const slot = P.slotsFor(p).find(x => x.free)!; expect(P.book(p, slot.day).ok).toBe(true);
  P.waitUntil(p, slot.day);
  const r = P.attend(s, p, answersRight(p), !!opts.urgent); expect(r.ok, r.msg).toBe(true);
  P.waitUntil(p, p.decision!); expect(P.collect(p, opts.check ?? true).ok).toBe(true);
  return p;
}

describe('before Russia: the study visa, step by step', () => {
  it('a careful student gets the visa, buys a ticket after the visa starts, and arrives with a 90-day visa', () => {
    const s = student(), m0 = s.money, p = fullVisa(s);
    const tickets = P.ticketsFor(s, p); expect(tickets.every(t => t.day >= p.form!.entry)).toBe(true);
    expect(tickets[0].label).toMatch(/Nigeria → Kazan via Istanbul/);
    expect(P.buyTicket(s, p, 'plane-b').ok).toBe(true);
    const r = P.arrive(s, 'study'); expect(r.ok).toBe(true);
    expect(s.docs.visa).toBe(90); expect(s.home).toBe('Nigeria'); expect(P.preparing(s)).toBe(false);
    expect(s.money).toBeGreaterThanOrEqual(m0 - (p.spent - P.expectedCost(s, p)));
    expect(s.strikes).toBe(0);
  });
  it('the order is the real one: no appointment without the form, no ticket without the visa, a full day cannot be booked', () => {
    const s = student(), p = P.startAtHome(s); P.chooseCountry(s, 'IN');
    expect(P.book(p, p.t + 5).msg).toMatch(/form first/);
    expect(P.buyTicket(s, p, 'plane-a').msg).toMatch(/visa/);
    P.fillForm(p, goodForm(s, p));
    const full = P.slotsFor(p).find(x => !x.free)!; expect(P.book(p, full.day).ok).toBe(false);
    expect(P.slotsFor(p).every(x => P.weekday(x.day))).toBe(true);           // the visa centre is closed at weekends
  });
  it('coming without a document, or with a wrong form, sends you home; the fee is not taken', () => {
    const s = student(), p = P.startAtHome(s); P.chooseCountry(s, 'NG');
    P.fillForm(p, goodForm(s, p)); const d = P.slotsFor(p).find(x => x.free)!.day; P.book(p, d); P.waitUntil(p, d);
    expect(P.attend(s, p, answersRight(p), false).msg).toMatch(/without .*invitation/);
    expect(p.spent).toBe(0); expect(p.appt).toBeNull();
    const q = fullVisa(student('Bo'));                                          // the same student path works when complete
    expect(q.collected).toBe(true);
    const s2 = student('Cy'), p2 = P.startAtHome(s2); P.chooseCountry(s2, 'NG'); P.requestInvite(p2); P.getHiv(p2); P.buyInsurance(p2); P.takePhoto(p2);
    if (!P.passportOk(p2)) { P.renewPassport(p2, true); P.waitUntil(p2, p2.renewReady!); }
    P.waitUntil(p2, p2.inviteReady!);
    P.fillForm(p2, { ...goodForm(s2, p2), purpose: 'tourism', entries: 'multiple' });
    const d2 = P.slotsFor(p2).find(x => x.free)!.day; P.book(p2, d2); P.waitUntil(p2, d2);
    const r = P.attend(s2, p2, answersRight(p2), false); expect(r.msg).toMatch(/not "study".*single-entry/); expect(p2.form).toBeNull();
  });
  it('answers that say work or tourism are a refusal: a new application only after 30 days', () => {
    const s = student(), p = P.startAtHome(s); P.chooseCountry(s, 'NG'); P.requestInvite(p); P.getHiv(p); P.buyInsurance(p); P.takePhoto(p);
    if (!P.passportOk(p)) { P.renewPassport(p, true); P.waitUntil(p, p.renewReady!); }
    P.waitUntil(p, p.inviteReady!); P.fillForm(p, goodForm(s, p));
    const d = P.slotsFor(p).find(x => x.free)!.day; P.book(p, d); P.waitUntil(p, d);
    const qs = P.questionsFor(p), bad = qs.map(q => P.QUESTIONS[q].a.findIndex(a => /work|Tourism/.test(a.t)));
    const ans = bad.map((b, i) => (b >= 0 ? b : P.QUESTIONS[qs[i]].a.findIndex(a => !a.ok)));
    expect(P.attend(s, p, ans, false).msg).toMatch(/Refused/);
    expect(P.fillForm(p, goodForm(s, p)).ok).toBe(false);
    P.waitUntil(p, p.refusedUntil); expect(P.fillForm(p, goodForm(s, p)).ok).toBe(true);
  });
  it('a missed appointment is cancelled; urgent processing is faster and dearer', () => {
    const s = student(), p = P.startAtHome(s); P.chooseCountry(s, 'NG'); P.fillForm(p, goodForm(s, p));
    const d = P.slotsFor(p).find(x => x.free)!.day; P.book(p, d); P.waitUntil(p, d + 1); expect(p.appt).toBeNull();
    const a = fullVisa(student('Fast'), { urgent: true }), b = fullVisa(student('Slow'));
    expect(a.spent - b.spent).toBe(P.PRICES.consularFast - P.PRICES.consular);
  });
  it('a typo on the visa: caught at the counter it is fixed; not checked, trouble at the border', () => {
    let name = ''; for (let i = 0; i < 200 && !name; i++) { const s = student('T' + i); if (P.startAtHome(s).typo) name = 'T' + i; }
    expect(name).not.toBe('');
    const s1 = student(name), p1 = fullVisa(s1, { check: true }); expect(p1.typo).toBe(false);
    const s2 = student(name), p2 = fullVisa(s2, { check: false }); P.buyTicket(s2, p2, 'plane-b'); const st = s2.stress; P.arrive(s2, 'study');
    expect(s2.stress).toBeGreaterThan(st);
  });
  it('arriving after 1 September costs reputation; a wrong purpose on the migration card is a warning', () => {
    const s = student(), p = fullVisa(s); P.buyTicket(s, p, 'plane-c'); P.waitUntil(p, P.LEAD + 5); const rep = s.rep;
    P.buyTicket(s, p, P.ticketsFor(s, p)[0].id); P.arrive(s, 'tourism');
    expect(s.rep).toBeLessThan(rep); expect(s.strikes).toBe(1);
  });
});

describe('before Russia: the ways without a visa', () => {
  it('a student from a CIS country: no visa, only the letter of admission; Turkmenistan needs a visa', () => {
    const s = student(), p = P.startAtHome(s); P.chooseCountry(s, 'KZ'); expect(p.track).toBe('study_free');
    expect(P.fillForm(p, goodForm(s, p)).ok).toBe(false);
    if (!P.passportOk(p)) { P.renewPassport(p, true); P.waitUntil(p, p.renewReady!); }
    expect(P.readyToGo(s, p)).toEqual(['the letter of admission']);
    P.requestInvite(p); P.waitUntil(p, p.inviteReady!); expect(P.ticketsFor(s, p).some(t => t.mode === 'train')).toBe(true);
    expect(P.buyTicket(s, p, 'train').ok).toBe(true); expect(P.arrive(s, 'study').ok).toBe(true); expect(s.docs.visa).toBe(300);
    const t = student('Tm'); P.startAtHome(t); P.chooseCountry(t, 'TM'); expect(P.preOf(t)!.track).toBe('study');
    expect(P.chooseCountry(student(), 'RU').ok).toBe(false);
  });
  it('a worker from Tajikistan: a foreign passport, the free course, a ticket; "work" on the migration card or no patent', () => {
    const s = G.newState('Rustam', 'tajik'); s.queue = []; const p = P.startAtHome(s); expect(p.country).toBe('TJ'); expect(p.track).toBe('migrant');
    if (!P.passportOk(p)) { expect(P.readyToGo(s, p)).toContain('a valid passport'); P.renewPassport(p, false); P.waitUntil(p, p.renewReady!); }
    const k = s.know; P.takeCourse(s, p); expect(s.know).toBe(k + 4);
    P.buyTicket(s, p, 'train'); const m = s.money; P.arrive(s, 'private');
    expect(s.money).toBeLessThan(m);                                       // left the country and entered again
    const s2 = G.newState('Aziz', 'uzbek'); s2.queue = []; const p2 = P.startAtHome(s2); if (!P.passportOk(p2)) { P.renewPassport(p2, true); P.waitUntil(p2, p2.renewReady!); }
    P.buyTicket(s2, p2, 'plane-b'); const m2 = s2.money; P.arrive(s2, 'work'); expect(s2.money).toBe(Math.max(3000, m2 + P.expectedCost(s2, p2) - p2.spent));
  });
  it('a Kyrgyz (EAEU) worker can travel with the ID card', () => {
    const s = G.newState('Aibek', 'kyrgyz'); s.queue = []; const p = P.startAtHome(s);
    expect(p.track).toBe('eaeu'); expect(P.passportOk(p)).toBe(true); expect(P.readyToGo(s, p)).toEqual([]);
  });
});

describe('the "Before Russia" screen', () => {
  beforeEach(() => resetPreView());
  it('walks a student through: country, documents, the form, the calendar, the interview, the ticket, the arrival', () => {
    const s = student('Ada'); P.startAtHome(s); const host = document.body.appendChild(document.createElement('div'));
    let arrived = '';
    const draw = (): void => { host.innerHTML = preHtml(s); wirePre(host, s, { notify: () => undefined, again: draw, done: m => { arrived = m; } }); };
    const click = (sel: string): void => { const b = host.querySelector<HTMLButtonElement>(sel); expect(b, sel).not.toBeNull(); b!.click(); };
    draw(); expect(host.textContent).toMatch(/70 days until classes/);
    host.querySelector<HTMLSelectElement>('#prCountry')!.value = 'NG'; click('[data-pr="country"]');
    expect(host.textContent).toMatch(/Study visa/);
    const p = P.preOf(s)!;
    if (!P.passportOk(p)) { click('[data-pr="renewFast"]'); click(`[data-pr="wait:${p.renewReady}"]`); }
    click('[data-pr="invite"]'); click('[data-pr="hiv"]'); click('[data-pr="insurance"]'); click('[data-pr="photo"]');
    click(`[data-pr="wait:${p.inviteReady}"]`);
    click('[data-pr="editForm"]');
    const set = (id: string, v: string): void => { const el = host.querySelector<HTMLInputElement | HTMLSelectElement>(id)!; el.value = v; };
    set('#prName', 'Ada'); set('#prPurpose', 'study'); set('#prEntries', 'single'); set('#prUni', P.UNI);
    click('[data-pr="saveForm"]'); expect(p.form?.purpose).toBe('study');
    click('.prSlot:not([disabled])'); expect(p.appt).not.toBeNull();
    click(`[data-pr="wait:${p.appt}"]`); expect(host.querySelector('.prInterview')).not.toBeNull();
    expect(host.querySelector<HTMLButtonElement>('[data-pr="attend"]')!.disabled).toBe(true);
    P.questionsFor(p).forEach((q, i) => { const j = P.QUESTIONS[q].a.findIndex(a => a.ok); const r = host.querySelector<HTMLInputElement>(`input[name="prQ${i}"][value="${j}"]`)!; r.checked = true; r.dispatchEvent(new Event('change')); });
    click('[data-pr="attend"]'); expect(p.decision).not.toBeNull();
    click(`[data-pr="wait:${p.decision}"]`); click('[data-pr="collect:1"]'); expect(p.collected).toBe(true);
    click('[data-pr="ticket:plane-b"]'); expect(p.ticket?.id).toBe('plane-b');
    const c = host.querySelector<HTMLInputElement>('input[name="prCard"][value="study"]')!; c.checked = true; c.dispatchEvent(new Event('change'));
    click('[data-pr="arrive"]'); expect(arrived).toMatch(/90 days/); expect(P.preparing(s)).toBe(false);
  });
});

describe('starting a new game', () => {
  it('a foreigner with "start at home" ticked begins in their country, saved at once, and the window cannot be closed before the arrival', async () => {
    const { readFileSync } = await import('node:fs');
    try { localStorage.clear(); localStorage.setItem('vrussia_help_seen', '1'); } catch { /* storage may be blocked */ }      // the first-run guide would open over the preparation
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    const { boot } = await import('../src/ui');
    boot();
    expect((document.getElementById('homeStart') as HTMLInputElement).checked).toBe(true);
    document.querySelector<HTMLButtonElement>('.ocard[data-o="uzbek"]')!.click();
    document.getElementById('startBtn')!.click();
    await vi.waitFor(() => expect(document.querySelector('#modalBody .pre')).not.toBeNull(), { timeout: 25_000 });      // the screen loads on demand; slow when the whole suite runs at once
    expect(document.getElementById('modalBody')!.textContent).toMatch(/Uzbekistan/);
    expect(JSON.parse(localStorage.getItem('vrussia_save')!).pre.track).toBe('migrant');            // saved at once
    document.getElementById('closeModal')!.click();                                                   // it cannot be closed before the arrival
    await vi.waitFor(() => expect(document.getElementById('modal')!.hidden).toBe(false));
  }, 30_000);
});
