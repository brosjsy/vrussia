// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { boardFor, answer, post, remove, accept, decline, tickAds, openReplies, adsOf, answeredToday, POST_FEE, AD_DAYS, MAX_MINE, MAX_PRICE, SALE_GAP } from '../src/ads';
import { adsHtml, wireAds } from '../src/ads-ui';

const fresh = (): G.State => { const s = G.newState('T', 'tajik'); s.day = 10; s.money = 20000; s.energy = 80; s.know = 30; s.stress = 40; s.rep = 40; return s; };

describe('the adverts board', () => {
  it('shows eight ads a day, the same all day, different the next day and in another city; no two the same', () => {
    const s = fresh(), b = boardFor(s); expect(b.length).toBe(8); expect(boardFor(s)).toEqual(b);
    expect(new Set(b.map(a => a.title)).size).toBe(8); expect(new Set(b.map(a => a.kind)).size).toBe(5);
    for (const a of b) { expect(a.title.length).toBeGreaterThan(5); expect(a.text.length).toBeGreaterThan(10); expect(a.price % 50).toBe(0); if (a.kind === 'job') expect(a.price).toBeGreaterThanOrEqual(500); if (a.kind === 'room' || a.kind === 'lost') expect(a.price).toBe(0); }
    const t = fresh(); t.day = 11; expect(boardFor(t).map(a => a.title + a.price)).not.toEqual(b.map(a => a.title + a.price));
    const k = fresh(); k.city = 'Kazan'; expect(boardFor(k).map(a => a.title + a.price + a.by)).not.toEqual(b.map(a => a.title + a.price + a.by));
  });
  it('a day of odd work pays what the ad says and tires; a tired person cannot take it', () => {
    const s = fresh(), job = boardFor(s).find(a => a.kind === 'job')!;
    const r = answer(s, job.id); expect(r.ok).toBe(true); expect(s.money).toBe(20000 + job.price); expect(s.energy).toBe(58);
    expect(answer(s, job.id).ok).toBe(false);                                   // not twice
    const t = fresh(); t.energy = 20; expect(answer(t, boardFor(t).find(a => a.kind === 'job')!.id).ok).toBe(false); expect(t.money).toBe(20000);
  });
  it('a bought thing and a service cost their price and help; without the money nothing happens', () => {
    const s = fresh(), sell = boardFor(s).find(a => a.kind === 'sell')!;
    expect(answer(s, sell.id).ok).toBe(true); expect(s.money).toBe(20000 - sell.price); expect(s.stress).toBe(36);
    const p = fresh(); p.money = 10; const svc = boardFor(p).find(a => a.kind === 'service')!; expect(answer(p, svc.id).ok).toBe(false); expect(p.money).toBe(10);
  });
  it('a room viewing teaches a little, looking for a lost thing earns thanks, and only two ads can be answered in a day', () => {
    const s = fresh(), b = boardFor(s);
    expect(answer(s, b.find(a => a.kind === 'room')!.id).ok).toBe(true); expect(s.know).toBe(31);
    expect(answer(s, b.find(a => a.kind === 'lost')!.id).ok).toBe(true); expect(s.rep).toBe(41); expect(answeredToday(s)).toBe(2);
    const third = answer(s, b.find(a => a.kind === 'job')!.id); expect(third.ok).toBe(false); expect(third.msg).toContain('Two');
    s.day++; expect(answeredToday(s)).toBe(0); expect(answer(s, 'nope').ok).toBe(false);
  });
  it('putting up an ad costs the fee and has limits: one a day, three at a time, a sensible title and price, one sale a week, knowledge for lessons', () => {
    const s = fresh();
    expect(post(s, 'sell', 'ab', 1000).ok).toBe(false); expect(post(s, 'sell', 'Old winter boots', 50).ok).toBe(false); expect(post(s, 'sell', 'Old winter boots', MAX_PRICE + 50).ok).toBe(false); expect(s.money).toBe(20000);
    expect(post(s, 'sell', '  Old <b>winter</b> boots  ', 1500).ok).toBe(true); expect(s.money).toBe(20000 - POST_FEE); expect(adsOf(s).mine[0].title).toBe('Old bwinter/b boots');
    expect(post(s, 'job', 'Any work for a day', 0).ok).toBe(false);                                      // one a day
    s.day++; expect(post(s, 'sell', 'An old kettle', 500).ok).toBe(false);                                // nothing else to sell this week
    expect(post(s, 'job', 'Any work for a day', 0).ok).toBe(true);
    s.day++; s.know = 10; expect(post(s, 'service', 'Russian lessons', 0).ok).toBe(false); s.know = 30; expect(post(s, 'service', 'Russian lessons', 0).ok).toBe(true);
    s.day++; expect(adsOf(s).mine.length).toBe(MAX_MINE); expect(post(s, 'room', 'Looking for a room', 0).ok).toBe(false);
    expect(remove(s, adsOf(s).mine[0].id).ok).toBe(true); expect(remove(s, 'nope').ok).toBe(false); expect(post(s, 'room', 'Looking for a room', 0).ok).toBe(true);
    const poor = fresh(); poor.money = 100; expect(post(poor, 'job', 'Any work for a day', 0).ok).toBe(false);
    s.day += SALE_GAP; expect(SALE_GAP).toBeGreaterThanOrEqual(7);
  });
  it('replies come over the following days, one open reply for each ad; a sale pays the offer once and takes the ad down', () => {
    const s = fresh(); post(s, 'sell', 'Old winter boots', 2000); expect(tickAds(s)).toBe(0);                  // nobody replies the same day
    let got = 0; for (let i = 0; i < AD_DAYS - 1 && !got; i++) { s.day++; got = tickAds(s); }
    expect(got).toBe(1); expect(tickAds(s)).toBe(0); const r = openReplies(s)[0]; expect(r.offer).toBeGreaterThanOrEqual(1200); expect(r.offer).toBeLessThanOrEqual(2100);
    const before = s.money; expect(accept(s, 0).ok).toBe(true); expect(s.money).toBe(before + r.offer); expect(adsOf(s).mine.length).toBe(0); expect(openReplies(s).length).toBe(0);
    expect(accept(s, 0).ok).toBe(false); for (let i = 0; i < 10; i++) { s.day++; expect(tickAds(s)).toBe(0); }  // the thing is sold: no more offers
  });
  it('an ad comes down after a week; a reply can be turned down; a long absence is caught up without a flood', () => {
    const s = fresh(); post(s, 'job', 'Any work for a day', 0); s.day += 30; tickAds(s); expect(adsOf(s).mine.length).toBe(0); expect(openReplies(s).length).toBe(0);
    const t = fresh(); post(t, 'job', 'Any work for a day', 0); let n = 0; for (let i = 0; i < 6; i++) { t.day++; n += tickAds(t); if (openReplies(t).length) { const e = t.energy, m = t.money, off = openReplies(t)[0].offer; if (i % 2) { expect(decline(t, 0).ok).toBe(true); expect(t.money).toBe(m); } else { expect(accept(t, 0).ok).toBe(true); expect(t.money).toBe(m + off); expect(t.energy).toBe(e - 22); t.energy = 80; } } }
    expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(6);
  });
  it('is small money: a week of answering and posting earns less than a week of an ordinary wage', () => {
    const s = fresh(); let earned = 0;
    for (let d = 0; d < 7; d++) { s.energy = 100; const m = s.money; for (const a of boardFor(s).filter(x => x.kind === 'job')) answer(s, a.id); post(s, 'job', 'Any work for a day', 0); tickAds(s); while (openReplies(s).length) { s.energy = 100; accept(s, 0); } earned += s.money - m; s.day++; }
    expect(earned).toBeGreaterThan(3000); expect(earned).toBeLessThan(40000);
  });
});

describe('the board in the page', () => {
  it('lists the ads, answers one from a button, puts up an ad from the form, and a title cannot put markup on the page', () => {
    const s = fresh(), host = document.createElement('div'), said: string[] = [];
    const draw = (): void => { host.innerHTML = adsHtml(s); wireAds(host, s, { notify: m => said.push(m), again: draw }); }; draw();
    expect(host.querySelectorAll('[data-answer]').length).toBe(8);
    host.querySelector<HTMLButtonElement>('[data-answer]')!.click(); expect(said.length).toBe(1); expect(host.querySelectorAll('[data-answer]').length).toBe(7);
    (host.querySelector('#adKind') as HTMLSelectElement).value = 'sell'; (host.querySelector('#adTitle') as HTMLInputElement).value = '<img src=x onerror=1> boots'; (host.querySelector('#adPrice') as HTMLInputElement).value = '1500';
    host.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(adsOf(s).mine.length).toBe(1); expect(host.querySelector('.ads img')).toBeNull(); expect(host.querySelectorAll('[data-remove]').length).toBe(1);
    host.querySelector<HTMLButtonElement>('[data-remove]')!.click(); expect(adsOf(s).mine.length).toBe(0);
    (host.querySelector('#adKind') as HTMLSelectElement).value = 'job'; host.querySelector('#adKind')!.dispatchEvent(new Event('change')); expect((host.querySelector('#adPriceRow') as HTMLElement).hidden).toBe(true);
  });
});
