// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { book, tickAdSpace, takeDown, lawCheck, install, cannotInstall, rankOf, adSpaceOf, activeOf, boostsAds, priceOf, spotOf, costPerAnswer } from '../src/adspace';
import { post, tickAds, adsOf } from '../src/ads';
import { boardsFor, megaScreen, setOnlineAdverts } from '../src/billboards';
import { adSpaceHtml, wireAdSpace, resetAdSpaceView } from '../src/adspace-ui';

const fresh = (city = 'Kazan'): G.State => { const s = G.newState('T', 'moscow'); s.queue = []; s.city = city; s.money = 100000; s.weather = 'clear'; return s; };
const o = (x: Partial<Parameters<typeof book>[1]> = {}): Parameters<typeof book>[1] => ({ spot: 'board', head: 'Russian lessons', line: 'An hour a day', color: '#2f6fd6', icon: '🎓', goal: 'name', days: 3, ...x });

describe('advertising spaces: renting a place and mounting an advert', () => {
  beforeEach(() => setOnlineAdverts([]));
  it('booking pays for every day, by the size of the city; the advert is up from today until it ends', () => {
    const s = fresh(), before = s.money;
    expect(book(s, o()).ok).toBe(true);
    expect(before - s.money).toBe(priceOf(spotOf('board')!, 'Kazan') * 3);
    expect(priceOf(spotOf('board')!, 'Moscow')).toBeGreaterThan(priceOf(spotOf('board')!, 'Kazan'));
    expect(activeOf(s)).toHaveLength(1);
    s.day += 3; expect(activeOf(s)).toHaveLength(0);
  });
  it('the agency refuses what the advertising law forbids, rude words, links and bad lengths', () => {
    for (const h of ['Cold beer tonight', 'Cheap cigarettes', 'Casino night', 'Quick loan', 'Vote for Ivan', 'Best in Russia', 'see www.site.ru']) expect(lawCheck(h, ''), h).not.toBeNull();
    expect(lawCheck('Russian lessons', 'An hour a day')).toBeNull();
    const s = fresh();
    expect(book(s, o({ head: 'Cold beer' })).msg).toMatch(/Alcohol/);
    expect(book(s, o({ head: 'ab' })).ok).toBe(false);
    expect(book(s, o({ days: 15 })).ok).toBe(false);
    expect(s.money).toBe(100000);                                           // nothing paid for a refused advert
  });
  it('no metro panel in a city without a metro; two adverts at a time; not without the money', () => {
    expect(book(fresh('Sochi'), o({ spot: 'metro' })).msg).toMatch(/no metro/);
    expect(book(fresh('Kazan'), o({ spot: 'metro' })).ok).toBe(true);
    const s = fresh(); book(s, o()); book(s, o({ spot: 'stop' })); expect(book(s, o({ spot: 'wall' })).msg).toMatch(/2 adverts/);
    const p = fresh(); p.money = 100; expect(book(p, o()).msg).toMatch(/costs/);
  });
  it('every day it hangs, people see it and some answer; the report counts views, answers and the cost of an answer', () => {
    const s = fresh(), rep = s.rep; book(s, o({ days: 5 }));
    s.day += 7; const lines = tickAdSpace(s);
    const c = adSpaceOf(s).list[0]; expect(c.views).toBeGreaterThan(5 * 8000); expect(c.answers).toBeGreaterThan(0);
    expect(costPerAnswer(c)).toBe(Math.round(c.paid / c.answers));
    expect(s.rep).toBeGreaterThan(rep);                                      // a good name in the city
    expect(lines.join(' ')).toMatch(/came down/);
    const again = c.views; tickAdSpace(s); expect(c.views).toBe(again);     // counted once
    expect(tickAdSpace(s)).toEqual([]);
  });
  it('an advert for the small ads brings them more replies (ads.ts)', () => {
    const count = (boost: boolean): number => { let n = 0;
      for (let k = 0; k < 20; k++) { const s = fresh(); s.day = 10 + k * 13; post(s, 'job', 'Looking for a day of work', 0);
        if (boost) { expect(book(s, o({ goal: 'myads', spot: 'stop', days: 7 })).ok).toBe(true); expect(boostsAds(s)).toBe(true); }
        for (let d = 1; d <= 6; d++) { s.day++; tickAds(s); adsOf(s).replies.forEach(r => { r.done = true; }); }
        n += adsOf(s).replies.length; }
      return n; };
    expect(count(true)).toBeGreaterThan(count(false));
    expect(book(fresh(), o({ goal: 'myads' })).msg).toMatch(/no small ads/);
  });
  it('taken down early: nothing is paid back, and it is off the boards', () => {
    const s = fresh(); book(s, o()); s.day++;
    expect(boardsFor(s).some(b => /RUSSIAN LESSONS/.test(b.title))).toBe(true);
    const paid = s.money; expect(takeDown(s, adSpaceOf(s).list[0].id).ok).toBe(true); expect(s.money).toBe(paid);
    expect(boardsFor(s).some(b => /RUSSIAN LESSONS/.test(b.title))).toBe(false);
  });
});

describe('adverts in the 3D city', () => {
  it('the player\'s billboard and other players\' adverts appear on the boards, at most two, and the city keeps its notices', () => {
    const s = fresh(); book(s, o());
    setOnlineAdverts([{ city: 'Kazan', spot: 'board', head: 'Guitar lessons', line: 'Evenings', color: '#e0373f', icon: '🎉', username: 'anna' }, { city: 'Omsk', spot: 'board', head: 'Elsewhere', line: '', color: '#e0373f', icon: '🎉', username: 'bo' }]);
    const b = boardsFor(s, 5); expect(b).toHaveLength(5);
    expect(b[0].title).toMatch(/RUSSIAN LESSONS/); expect(b.some(x => /GUITAR/.test(x.title) && /anna/.test(x.text))).toBe(true);
    expect(b.some(x => /ELSEWHERE/.test(x.title))).toBe(false);
    expect(b.filter(x => /LESSONS|GUITAR/.test(x.title)).length).toBeLessThanOrEqual(2);
    setOnlineAdverts([]);
  });
  it('the big screen shows a booked advert one part of the day in two', () => {
    const s = fresh(); book(s, o({ spot: 'screen', head: 'Happy birthday Mum', goal: 'greeting' }));
    const seen = [0, 1, 2].map(slot => { s.slot = slot as G.State['slot']; return megaScreen(s, 'today'); });
    expect(seen.some(x => /Happy birthday Mum/.test(x))).toBe(true); expect(seen.some(x => /Kazan/.test(x))).toBe(true);
  });
});

describe('working for the agency as a poster installer', () => {
  it('pays, tires, once a day; no work at height in bad weather or before three poster shifts; the rank rises', () => {
    const s = fresh(); s.energy = 100;
    expect(cannotInstall(s, 'billboard')).toMatch(/three shifts/);
    const m = s.money; expect(install(s, 'posters').ok).toBe(true); expect(s.money - m).toBe(1300); expect(s.energy).toBe(80);
    expect(install(s, 'posters').msg).toMatch(/One shift a day/);
    for (let i = 0; i < 9; i++) { s.day++; s.energy = 100; install(s, 'posters'); }
    expect(rankOf(s)).toBe(1);
    s.day++; s.weather = 'snow'; expect(cannotInstall(s, 'banner')).toMatch(/weather/); expect(cannotInstall(s, 'posters')).toBeNull();
    s.weather = 'clear'; expect(install(s, 'banner').ok).toBe(true);
    s.day++; s.energy = 10; expect(cannotInstall(s, 'posters')).toMatch(/tired/);
  });
});

describe('the agency screen', () => {
  it('shows the places with prices, a live preview and the law check; mounting moves to the report', async () => {
    resetAdSpaceView();
    const s = fresh('Sochi'), host = document.body.appendChild(document.createElement('div'));
    const draw = (): void => { host.innerHTML = adSpaceHtml(s, null); wireAdSpace(host, s, null, { notify: () => undefined, again: draw }); };
    draw();
    expect(host.querySelectorAll('.asSpot')).toHaveLength(5);
    expect(host.querySelector<HTMLInputElement>('input[value="metro"]')!.disabled).toBe(true);
    const head = host.querySelector<HTMLInputElement>('#asHead')!; head.value = 'Cold beer'; head.dispatchEvent(new Event('input'));
    expect(host.querySelector('.asLaw')!.classList.contains('bad')).toBe(true); expect(host.querySelector<HTMLButtonElement>('.asTotal button')!.disabled).toBe(true);
    head.value = 'Bike repair'; head.dispatchEvent(new Event('input'));
    expect(host.querySelector('.asForm .asPreview')!.textContent).toMatch(/Bike repair/);
    expect(host.querySelector<HTMLButtonElement>('.asTotal button')!.disabled).toBe(false);
    host.querySelector<HTMLButtonElement>('[data-color="#e0373f"]')!.click();
    expect(host.querySelector<HTMLInputElement>('#asHead')!.value).toBe('Bike repair');      // the draft survives a redraw
    host.querySelector<HTMLFormElement>('#asForm')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await Promise.resolve();
    expect(adSpaceOf(s).list[0]).toMatchObject({ head: 'Bike repair', color: '#e0373f', city: 'Sochi' });
    expect(host.querySelector('.asTab.on')!.textContent).toMatch(/My adverts/);
    expect(host.querySelector('.asStats')).not.toBeNull();
    host.querySelector<HTMLButtonElement>('[data-tab="work"]')!.click();
    expect(host.querySelectorAll('[data-task]')).toHaveLength(3);
    host.querySelector<HTMLButtonElement>('[data-tab="city"]')!.click();
    expect(host.textContent).toMatch(/No adverts of players in Sochi/);
  });
});
