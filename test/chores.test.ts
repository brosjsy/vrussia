// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { choresOf, tickChores, planActive, payFare, cardName, choreMoodlets, LAUNDROMAT, PLAN_MONTH, WIFI_INSTALL, WIFI_MONTH, CARD_DEPOSIT } from '../src/chores';
import { washClothes, topUpPhone, connectWifi, buyCard, topUpCard } from '../src/chores-do';
import { afterTurn } from '../src/turn';
import { moodlets } from '../src/needs';
import { visitScenario } from '../src/venues';
import { openChores } from '../src/study-ui';
import { EN, RU } from '../src/i18n';

const fresh = (): G.State => { const s = G.newState('T', 'moscow'); s.queue = []; s.money = 50000; return s; };

describe('daily chores', () => {
  it('clothes wear every day; a laundromat load costs money; at home only with a washing machine', () => {
    const s = fresh(); const c = choresOf(s); expect(c.clothes).toBe(80);
    s.day += 3; expect(tickChores(s)).toEqual([]); expect(c.clothes).toBe(59);
    s.day += 9; expect(tickChores(s)).toContain('Your clothes need washing.'); expect(c.clothes).toBe(0);
    expect(choreMoodlets(s)).toContainEqual({ key: 'ml.dirtyClothes', v: -1 }); expect(moodlets(s).some(m => m.key === 'ml.dirtyClothes')).toBe(true);
    expect(washClothes(s, 'home').msg).toMatch(/no washing machine/);
    const m0 = s.money; expect(washClothes(s, 'laundromat').ok).toBe(true); expect(s.money).toBe(m0 - LAUNDROMAT); expect(c.clothes).toBe(100);
    expect(washClothes(s, 'laundromat').msg).toMatch(/clean/);
  });
  it('the mobile plan runs a month; a note on the day it runs out; topping up adds months', () => {
    const s = fresh(); expect(planActive(s)).toBe(true);
    s.day = 30; expect(tickChores(s)).toContain('Your mobile plan ran out today: top it up for mobile internet.'); expect(planActive(s)).toBe(false);
    expect(choreMoodlets(s)).toContainEqual({ key: 'ml.noData', v: -1 });
    const m0 = s.money; expect(topUpPhone(s, 2).ok).toBe(true); expect(s.money).toBe(m0 - 2 * PLAN_MONTH); expect(choresOf(s).planUntil).toBe(90);
  });
  it('home internet: installation and the first month, then a monthly bill; unpaid, it is switched off', () => {
    const s = fresh(); const m0 = s.money;
    expect(connectWifi(s).ok).toBe(true); expect(s.money).toBe(m0 - WIFI_INSTALL - WIFI_MONTH); expect(connectWifi(s).ok).toBe(false);
    s.day = 30; expect(tickChores(s).join(' ')).toMatch(/Home internet: 600/); expect(s.money).toBe(m0 - WIFI_INSTALL - 2 * WIFI_MONTH);
    s.money = 10; s.day = 60; expect(tickChores(s).join(' ')).toMatch(/switched off/); expect(choresOf(s).wifi).toBe(false);
  });
  it('a transport card: Troika in Moscow, Podorozhnik in Saint Petersburg; fares from the card are cheaper; another city needs its own card', () => {
    expect(cardName('Moscow')).toBe('Troika'); expect(cardName('Saint Petersburg', true)).toBe('Подорожник'); expect(cardName('Kazan')).toBe('Transport card');
    const s = fresh(); expect(topUpCard(s, 500).ok).toBe(false);
    const m0 = s.money; expect(buyCard(s).ok).toBe(true); expect(s.money).toBe(m0 - CARD_DEPOSIT);
    expect(topUpCard(s, 50).ok).toBe(false); expect(topUpCard(s, 500).ok).toBe(true);
    const m1 = s.money; expect(payFare(s, 65)).toBe(55); expect(s.money).toBe(m1); expect(choresOf(s).card!.balance).toBe(445);
    const sc = visitScenario(s, 'park')!; G.apply(s, sc.choices[0].r!(s).fx); expect(choresOf(s).card!.balance).toBe(390);   // the park by metro, paid from the card
    s.city = 'Kazan'; expect(payFare(s, 45)).toBe(45); expect(s.money).toBe(m1 - 45);
  });
  it('one transport card in the game: the shop scene and the Daily life app are the same card, and the checklist counts both', () => {
    const a = fresh(); a.flags.troika = true; expect(choresOf(a).card).toEqual({ city: 'Moscow', balance: 500 }); expect(buyCard(a).ok).toBe(false);
    const b = fresh(); buyCard(b); expect(b.flags.troika).toBe(true); expect(G.CHECKLIST.find(x => x.id === 'card')!.done(b)).toBe(true);
  });
  it('the turn runs the chores (turn.ts): the same rules on the page and for bots', () => {
    const s = fresh(); choresOf(s); s.day = 12; expect(afterTurn(s).notes).toContain('Your clothes need washing.');
  });
  it('the phone app: four rows, buttons that work, both languages', () => {
    const s = fresh(); const host = document.body.appendChild(document.createElement('div')); let refreshed = 0;
    openChores(host, s, { back: () => undefined, refresh: () => { refreshed++; }, scenario: () => undefined });
    expect(host.querySelectorAll('.jobCard').length).toBe(4);
    host.querySelector<HTMLButtonElement>('[data-ch="card"]')!.click(); expect(host.textContent).toContain('Troika'); expect(host.querySelector('[data-ch="top"]')).toBeTruthy();
    host.querySelector<HTMLButtonElement>('[data-ch="wifi"]')!.click(); expect(choresOf(s).wifi).toBe(true); expect(refreshed).toBe(2);
    for (const k of ['chTitle', 'chClothes', 'chLaundromat', 'chPlan', 'chWifi', 'chCard', 'phoneLife', 'ml.dirtyClothes', 'ml.noData']) { expect(EN[k], k).toBeTruthy(); expect(RU[k], k).toMatch(/[А-Яа-я]/); }
  });
});
