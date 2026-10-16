// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { GIGS, gigsOf, rankOf, cannotWork, courierRound, routeLength, bestRoute, courierScore, baristaRound, baristaScore, orderText, finishShift, RANK_AT } from '../src/gigs';
import { savingsOf, setGoal, move, budget, kindOf } from '../src/budget';
import { openJobs } from '../src/jobs-ui';
import { needsOf } from '../src/needs';

const fresh = (): G.State => { const s = G.newState('T', 'moscow'); s.queue = []; s.energy = 90; s.phone = 1; return s; };

describe('the courier', () => {
  it('four deliveries on a small map, the same all day; the shortest route scores 1, a long one less, a broken order 0', () => {
    const s = fresh(), r = courierRound(s); expect(r.stops.length).toBe(4); expect(courierRound(s)).toEqual(r);
    expect(new Set(r.stops.map(p => `${p.x},${p.y}`)).size).toBe(4);
    const orders = [[0, 1, 2, 3], [3, 2, 1, 0], [1, 3, 0, 2], [2, 0, 3, 1]];
    const best = bestRoute(r); for (const o of orders) expect(routeLength(r, o)).toBeGreaterThanOrEqual(best);
    const scores = orders.map(o => courierScore(r, o)); expect(Math.max(...scores)).toBeLessThanOrEqual(1); expect(Math.min(...scores)).toBeGreaterThan(0);
    expect(courierScore(r, [0, 0, 1, 2])).toBe(0); expect(courierScore(r, [0, 1])).toBe(0);
    const t = fresh(); t.day++; expect(courierRound(t)).not.toEqual(r);
  });
});

describe('the barista', () => {
  it('five orders a day said in words (English and Russian); every right drink is a point', () => {
    const s = fresh(), o = baristaRound(s); expect(o.length).toBe(5); expect(baristaRound(s)).toEqual(o);
    expect(baristaScore(o, o)).toBe(1); expect(baristaScore(o, [])).toBe(0);
    const wrong = o.map((x, i) => (i < 2 ? { ...x, sugar: (x.sugar + 1) % 3 } : x)); expect(baristaScore(o, wrong)).toBeCloseTo(0.6, 5);
    for (const x of o) { expect(orderText(x)).toMatch(/sugar/); expect(orderText(x, true)).toMatch(/сахара/); }
  });
});

describe('a shift', () => {
  it('pays between 60 and 120 per cent of the base by the score, takes energy and hunger, once a day', () => {
    const s = fresh(), g = GIGS.find(x => x.id === 'courier')!, m0 = s.money, n = needsOf(s), h0 = n.hunger;
    const a = finishShift(s, 'courier', 1); expect(a.ok).toBe(true); expect(a.pay).toBe(Math.round(g.base * 1.2 / 10) * 10); expect(s.money).toBe(m0 + a.pay); expect(s.energy).toBe(90 - g.energy); expect(n.hunger).toBe(h0 - 10);
    expect(finishShift(s, 'courier', 1).ok).toBe(false); expect(cannotWork(s, 'courier')).toContain('tomorrow');
    const b = finishShift(s, 'barista', 0); expect(b.pay).toBe(Math.round(GIGS[1].base * 0.6 / 10) * 10);
    const tired = fresh(); tired.energy = 10; expect(finishShift(tired, 'courier', 1).ok).toBe(false); expect(tired.money).toBe(fresh().money);
    const nophone = fresh(); nophone.phone = 0; expect(cannotWork(nophone, 'barista')).toContain('phone');
  });
  it('good shifts raise the rank and the pay; weak shifts do not count', () => {
    const s = fresh(); s.energy = 100;
    for (let d = 0; d < RANK_AT[1]; d++) { s.day = d; s.energy = 100; finishShift(s, 'barista', 0.3); } expect(rankOf(s, 'barista')).toBe(0);
    let up = false; for (let d = 100; d < 100 + RANK_AT[1]; d++) { s.day = d; s.energy = 100; up = finishShift(s, 'barista', 0.9).rankUp || up; }
    expect(up).toBe(true); expect(rankOf(s, 'barista')).toBe(1);
    s.day = 500; s.energy = 100; expect(finishShift(s, 'barista', 1).pay).toBe(Math.round(GIGS[1].base * 1.2 * 1.1 / 10) * 10);
    expect(gigsOf(s).earned).toBeGreaterThan(10000);
  });
});

describe('the bank: savings and budget', () => {
  it('a goal has a name and a sensible target; money moves into the pot and back, never more than there is', () => {
    const s = fresh(); s.money = 50000;
    expect(setGoal(s, 'x', 5000).ok).toBe(false); expect(setGoal(s, 'A used car', 100).ok).toBe(false); expect(setGoal(s, '  <b>A used car</b> ', 300000).ok).toBe(true); expect(savingsOf(s).name).toBe('bA used car/b');
    expect(move(s, 20000).ok).toBe(true); expect(s.money).toBe(30000); expect(savingsOf(s).saved).toBe(20000);
    expect(move(s, 40000).ok).toBe(false); expect(move(s, -25000).ok).toBe(false); expect(move(s, -5000).ok).toBe(true); expect(s.money).toBe(35000); expect(savingsOf(s).saved).toBe(15000);
  });
  it('the budget sums the last thirty days in and out, by kind', () => {
    const s = fresh(); s.day = 40;
    for (const [label, amount, day] of [['Salary', 30000, 35], ['Rent for the room', -12000, 36], ['Bought: Winter coat', -6000, 38], ['Metro ticket', -60, 39], ['Patent fee', -6000, 20], ['Old payment', -999, 2]] as [string, number, number][]) G.phoneOf(s).tx.unshift({ label, amount, day });
    const b = budget(s); expect(b.income).toBe(30000); expect(b.byKind.home).toBe(12000); expect(b.byKind.shopping).toBe(6000); expect(b.byKind.travel).toBe(60); expect(b.byKind.papers).toBe(6000); expect(b.spent).toBe(24060);
    expect(kindOf('Groceries', -500)).toBe('food'); expect(kindOf('Something', 100)).toBe('income');
  });
});

describe('the Jobs app in the phone', () => {
  it('lists the two jobs; a courier shift is played by tapping the parcels; the barista serves five drinks; both pay', () => {
    const s = fresh(), host = document.createElement('div'), m0 = s.money; let backed = false;
    openJobs(host, s, { back: () => { backed = true; }, refresh: () => undefined, notify: () => undefined });
    expect(host.querySelectorAll('.jobCard').length).toBe(2);
    host.querySelector<HTMLButtonElement>('[data-shift="courier"]')!.click();
    expect(host.querySelectorAll('.cmap .stop').length).toBe(4); expect((host.querySelector('[data-jb="finish"]') as HTMLButtonElement).disabled).toBe(true);
    for (let k = 0; k < 4; k++) host.querySelector<HTMLButtonElement>(`[data-stop="${k}"]`)!.click();
    expect(host.querySelectorAll('.cmap .stop.done').length).toBe(4); host.querySelector<HTMLButtonElement>('[data-jb="finish"]')!.click();
    expect(s.money).toBeGreaterThan(m0); expect(host.querySelector('.phNote')!.textContent).toContain('shift done');
    const m1 = s.money; host.querySelector<HTMLButtonElement>('[data-shift="barista"]')!.click();
    for (const o of baristaRound(s)) { host.querySelector<HTMLButtonElement>(`[data-make="drink:${o.drink}"]`)!.click(); host.querySelector<HTMLButtonElement>(`[data-make="milk:${o.milk}"]`)!.click(); host.querySelector<HTMLButtonElement>(`[data-make="sugar:${o.sugar}"]`)!.click(); host.querySelector<HTMLButtonElement>('[data-jb="serve"]')!.click(); }
    host.querySelector<HTMLButtonElement>('[data-jb="finish"]')!.click(); expect(s.money - m1).toBe(Math.round(GIGS[1].base * 1.2 / 10) * 10);
    host.querySelector<HTMLButtonElement>('[data-jb="back"]')!.click(); expect(backed).toBe(true);
  });
});

describe('the bank app in the phone', () => {
  it('shows the savings goal and the budget, and moves money into the pot from the form', async () => {
    const { openPhone } = await import('../src/phone-ui');
    const s = fresh(); s.money = 40000; (s.bank as Record<string, boolean>).alfa = true; s.day = 5; G.phoneOf(s).tx.unshift({ label: 'Salary', amount: 20000, day: 4 }, { label: 'Rent for the room', amount: -9000, day: 4 });
    const host = document.createElement('div');
    openPhone({ s, host, show: () => undefined, close: () => undefined, refresh: () => undefined, openShop: () => undefined, startFlow: () => undefined, flights: () => undefined, journal: () => undefined, profile: () => undefined, help: () => undefined } as never);
    host.querySelector<HTMLButtonElement>('[data-sys="jobs"]')!.click(); expect(host.querySelectorAll('.jobCard').length).toBe(2);
    host.querySelector<HTMLButtonElement>('[data-jb="back"]')!.click();
    host.querySelector<HTMLButtonElement>('[data-sys="bank"]')!.click();
    expect(host.querySelector('.budget')!.textContent).toContain('20,000'); expect(host.querySelector('.budget')!.textContent).toContain('9,000');
    (host.querySelector('#svName') as HTMLInputElement).value = 'A bicycle'; (host.querySelector('#svTarget') as HTMLInputElement).value = '15000';
    host.querySelector<HTMLFormElement>('#svGoal')!.dispatchEvent(new Event('submit', { cancelable: true }));
    (host.querySelector('#svAmount') as HTMLInputElement).value = '5000'; host.querySelector<HTMLButtonElement>('[data-sv="in"]')!.click();
    expect(s.money).toBe(35000); expect(savingsOf(s)).toMatchObject({ name: 'A bicycle', goal: 15000, saved: 5000 }); expect(host.textContent).toContain('A bicycle');
  });
});
