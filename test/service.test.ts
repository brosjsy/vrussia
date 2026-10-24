// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import * as V from '../src/service';
import { serviceHtml, wireService, resetServiceView } from '../src/service-ui';

const citizen = (name = 'Ivan'): G.State => { const s = G.newState(name, 'region'); s.queue = []; s.know = 60; s.health = 90; s.energy = 100; s.weather = 'clear'; return s; };
const rightIv = (s: G.State): number[] => V.interviewFor(s).map(q => V.INTERVIEW[q].a.findIndex(a => a.ok));
/** Applies and goes through the interview and the checks to the job. */
function hire(s: G.State, id: V.RoleId): void {
  expect(V.apply(s, id).ok).toBe(true);
  s.day += 2; V.tickApplication(s); expect(V.serviceOf(s).app!.stage).toBe('interview');
  expect(V.interview(s, rightIv(s)).ok).toBe(true);
  s.day = V.serviceOf(s).app!.due; V.tickApplication(s); expect(V.serviceOf(s).app!.stage).toBe('offer');
  expect(V.accept(s).ok).toBe(true);
}
const lawful = (s: G.State): void => { for (const c of V.casesToday(s)) V.decide(s, c.id, c.opts.findIndex(o => o.ok)); };

describe('the vacancy board and applying', () => {
  it('eleven roles; the police and the civil service are for citizens only; the MFC, the railways and the post take legal residents', () => {
    expect(V.ROLES).toHaveLength(11);
    expect(V.ROLES.every(r => r.cases.length >= 5 && r.ranks.length === 5)).toBe(true);
    const m = G.newState('Aziz', 'uzbek'); m.know = 60;
    for (const id of ['pps', 'dps', 'uch', 'guvm', 'fns', 'customs', 'mchs', 'fssp'] as V.RoleId[]) expect(V.cannotApply(m, id), id).toMatch(/citizens only/);
    expect(V.cannotApply(m, 'post')).toMatch(/papers in order/);                       // no patent yet
    m.docs.patent = 30; expect(V.cannotApply(m, 'post')).toBeNull();
    const s = citizen(); s.know = 10; expect(V.cannotApply(s, 'fns')).toMatch(/Knowledge 45/);
  });
  it('the way in: application, a call two days later, the interview, the checks, the offer and the oath; the old job is left', () => {
    const s = citizen(); s.job = 'courier'; hire(s, 'pps');
    const sv = V.serviceOf(s); expect(sv.role).toBe('pps'); expect(s.job).toBeNull(); expect(sv.badge).toMatch(/^PPS-\d{6}$/); expect(sv.colleagues).toHaveLength(3);
    expect(sv.log[0]).toMatch(/oath/);
  });
  it('a bad interview, poor health for the fitness test, or a record of violations: not hired', () => {
    const a = citizen('A'); V.apply(a, 'dps'); a.day += 2; V.tickApplication(a);
    const wrong = V.interviewFor(a).map(q => V.INTERVIEW[q].a.findIndex(x => !x.ok)); expect(V.interview(a, wrong).ok).toBe(false);
    const b = citizen('B'); b.health = 40; V.apply(b, 'mchs'); b.day += 2; V.tickApplication(b); V.interview(b, rightIv(b)); b.day += 7; V.tickApplication(b);
    expect(V.serviceOf(b).app).toMatchObject({ stage: 'refused' }); expect(V.serviceOf(b).app!.why).toMatch(/fitness/);
    const c = citizen('C'); c.strikes = 1; V.apply(c, 'fns'); c.day += 2; V.tickApplication(c); V.interview(c, rightIv(c)); c.day += 5; V.tickApplication(c);
    expect(V.serviceOf(c).app!.why).toMatch(/background/);
    const d = citizen('D'); d.health = 40; hire(d, 'fns');                                // a desk job needs no fitness test
  });
});

describe('a working day', () => {
  it('leaving early enough by metro is on time; the cases must be decided; leaving on time pays the day and counts it', () => {
    const s = citizen(); s.city = 'Moscow'; hire(s, 'uch');
    const r = V.goToWork(s, 7 * 60 + 30, 'metro'); expect(r.ok).toBe(true); expect(r.msg).toMatch(/checkpoint/);
    expect(V.goToWork(s, 7 * 60, 'metro').ok).toBe(false);                             // once a day
    const t = citizen('Mover'); t.city = 'Kazan'; hire(t, 'mfc'); t.city = 'Omsk'; expect(V.goToWork(t, 7 * 60, 'bus').msg).toMatch(/Your job is in Kazan/);
    const u = citizen('Late'); u.city = 'Moscow'; hire(u, 'mfc'); u.slot = 1; expect(V.goToWork(u, 7 * 60, 'metro').msg).toMatch(/starts in the morning/);
    expect(V.leaveWork(s, 'ontime').msg).toMatch(/Decide the 3 cases/);
    lawful(s); const m = s.money; expect(V.leaveWork(s, 'ontime').ok).toBe(true);
    expect(s.money - m).toBe(V.payOf(s, V.roleOf('uch')!)); expect(V.serviceOf(s).shifts).toBe(1); expect(V.serviceOf(s).merit).toBeGreaterThan(5);
  });
  it('late twice in ten days is a reprimand; leaving early is a reprimand; four reprimands end the job', () => {
    const s = citizen(); s.city = 'Moscow'; hire(s, 'pps');                              // patrol starts at 08:00
    expect(V.goToWork(s, 8 * 60 + 30, 'metro').msg).toMatch(/warning/);
    V.leaveWork(s, 'early'); expect(V.serviceOf(s).reprimands).toBe(1);
    s.day++; s.slot = 0; s.energy = 100; expect(V.goToWork(s, 8 * 60 + 30, 'metro').msg).toMatch(/reprimand/);
    V.leaveWork(s, 'early'); s.day++; s.slot = 0; s.energy = 100; V.goToWork(s, 6 * 60 + 30, 'metro'); V.leaveWork(s, 'early');
    expect(V.serviceOf(s).role).toBeNull(); expect(V.cannotApply(s, 'pps')).toMatch(/dismissal/);
  });
  it('by car: the staff car park until 08:15, then paid street parking; the pavement may bring a fine', () => {
    const s = citizen(); s.city = 'Kazan'; s.car = { id: 'lada' } as never; hire(s, 'fns');
    expect(V.modesFor(s)).toContain('car');
    V.goToWork(s, 7 * 60, 'car', 'lot'); expect(V.serviceOf(s).today!.park).toBe('lot');
    lawful(s); const m1 = s.money; V.leaveWork(s, 'ontime'); expect(s.money - m1).toBe(V.payOf(s, V.roleOf('fns')!));
    s.day++; s.slot = 0; s.energy = 100; V.goToWork(s, 8 * 60 + 30, 'car', 'lot'); expect(V.serviceOf(s).today!.park).toBe('street');
    lawful(s); const m2 = s.money; V.leaveWork(s, 'ontime'); expect(s.money - m2).toBeLessThan(V.payOf(s, V.roleOf('fns')!));
    expect(V.modesFor(citizen('NoCar'))).not.toContain('car');
  });
  it('a bribe pays until internal security is watching: dismissal, a criminal record and a ban', () => {
    const s = citizen('Taker'); s.city = 'Moscow'; hire(s, 'dps');
    let caught = false;
    for (let day = 0; day < 60 && !caught; day++) {
      s.day++; s.slot = 0; s.energy = 100; if (!V.serviceOf(s).role) break; V.goToWork(s, 6 * 60 + 30, 'metro');
      for (const c of V.casesToday(s)) { const k = c.opts.findIndex(o => o.bribe); const r = V.decide(s, c.id, k >= 0 ? k : 0); if (/Internal security/.test(r.msg)) { caught = true; break; } }
      if (!caught) V.leaveWork(s, 'ontime');
    }
    expect(caught).toBe(true); expect(V.serviceOf(s).role).toBeNull(); expect(s.strikes).toBeGreaterThan(0);
  });
  it('honest days raise the rank and the pay; lunch builds relations with colleagues', () => {
    const s = citizen(); s.city = 'Moscow'; hire(s, 'mfc');
    const p0 = V.payOf(s, V.roleOf('mfc')!), rel = V.serviceOf(s).colleagues[0].rel;
    for (let i = 0; i < 12; i++) { s.day++; s.slot = 0; s.energy = 100; V.goToWork(s, 7 * 60, "metro"); lawful(s); if (i === 0) V.lunch(s, 0); V.leaveWork(s, "overtime"); }
    expect(V.rankOf(s)).toBeGreaterThan(0); expect(V.payOf(s, V.roleOf('mfc')!)).toBeGreaterThan(p0);
    expect(V.serviceOf(s).colleagues[0].rel).toBeGreaterThan(rel);
  });
});

describe('the Service app screen', () => {
  beforeEach(() => resetServiceView());
  it('applies from the board, passes the interview, takes the job, works a day and shows the service profile', () => {
    const s = citizen(); s.city = 'Moscow'; const host = document.body.appendChild(document.createElement('div'));
    const draw = (): void => { host.innerHTML = serviceHtml(s); wireService(host, s, { notify: () => undefined, again: draw }); };
    const click = (sel: string): void => { const b = host.querySelector<HTMLButtonElement>(sel); expect(b, sel).not.toBeNull(); b!.click(); };
    draw(); expect(host.querySelectorAll('.svVac')).toHaveLength(11);
    click('[data-sv="filter:state"]'); expect(host.querySelectorAll('.svVac')).toHaveLength(3); click('[data-sv="filter:all"]');
    click('[data-sv="apply:pps"]'); expect(host.textContent).toMatch(/personnel department will call/);
    s.day += 2; draw();
    V.interviewFor(s).forEach((q, i) => { const j = V.INTERVIEW[q].a.findIndex(a => a.ok); const r = host.querySelector<HTMLInputElement>(`input[name="svIv${i}"][value="${j}"]`)!; r.checked = true; r.dispatchEvent(new Event('change')); });
    click('[data-sv="interview"]'); s.day = V.serviceOf(s).app!.due; draw(); click('[data-sv="accept"]');
    expect(host.querySelector('.asTab.on')!.textContent).toMatch(/Workday/);
    click('[data-sv="depart:390"]'); click('[data-sv="go"]');
    for (const c of V.casesToday(s)) click(`[data-sv="decide:${c.id}:${c.opts.findIndex(o => o.ok)}"]`);
    click('[data-sv="leave:ontime"]'); expect(host.textContent).toMatch(/day is over/);
    click('[data-sv="tab:prof"]'); expect(host.querySelector('.svId')!.textContent).toMatch(/PPS-\d{6}/);
  });
});
