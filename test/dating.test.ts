// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { profilesFor, swipe, compat, swipesLeft, playerInterests, askOnDate, makeCouple, dateReply, SWIPES_PER_DAY, MIN_MESSAGES, DATE_COST, INTERESTS } from '../src/dating';

const fresh = (): G.State => { const s = G.newState('Tester', 'moscow'); s.queue = []; s.money = 20000; return s; };

describe('profiles', () => {
  it('five adults a day, the same people all day, with portraits, interests and no repeated names', () => {
    const s = fresh(); s.day = 7;
    const a = profilesFor(s), b = profilesFor(s);
    expect(a).toEqual(b); expect(a.length).toBe(SWIPES_PER_DAY);
    expect(new Set(a.map(p => p.name)).size).toBe(a.length);
    for (const p of a) { expect(p.age).toBeGreaterThanOrEqual(20); expect(p.age).toBeLessThan(40); expect(p.interests.length).toBeGreaterThan(0); for (const i of p.interests) expect(INTERESTS).toContain(i); expect(p.bio.length).toBeGreaterThan(10); }
    s.day = 8; expect(profilesFor(s).map(p => p.id)).not.toEqual(a.map(p => p.id));
  });
  it('your interests are at least three, from your life', () => {
    const s = fresh(); expect(playerInterests(s).length).toBeGreaterThanOrEqual(3);
    s.dream = 'athlete'; expect(playerInterests(s)).toEqual(expect.arrayContaining(['football', 'hiking']));
    s.pet = { name: 'Rex', bond: 50 } as G.State['pet']; expect(playerInterests(s)).toContain('dogs');
  });
  it('compatibility is between 0 and 100 and grows with shared interests', () => {
    const s = fresh(); const p = profilesFor(s)[0];
    const none = compat(s, { ...p, interests: [], city: 'Elsewhere' }), all = compat(s, { ...p, interests: playerInterests(s).slice(0, 3), city: s.city });
    for (const c of [none, all]) { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThanOrEqual(100); }
    expect(all).toBeGreaterThan(none);
  });
});

describe('answering profiles', () => {
  it('five answers a day, then the app says come back tomorrow', () => {
    const s = fresh();
    for (let i = 0; i < SWIPES_PER_DAY; i++) { const p = profilesFor(s)[0]; expect(p).toBeTruthy(); swipe(s, p, false); }
    expect(swipesLeft(s)).toBe(0); expect(profilesFor(s)).toEqual([]);
    s.day++; expect(swipesLeft(s)).toBe(SWIPES_PER_DAY); expect(profilesFor(s).length).toBe(SWIPES_PER_DAY);
  });
  it('passing never matches; liking matches when the fixed luck is below compatibility; the same answer is not counted twice', () => {
    const s = fresh(); const p = profilesFor(s)[0];
    const passed = swipe(s, p, false); expect(passed.matched).toBe(false);
    expect(swipe(s, p, true).message).toContain('already answered');
    let matches = 0, tries = 0;
    for (let d = 0; d < 30; d++) { s.day = 100 + d; for (const q of profilesFor(s)) { tries++; if (swipe(s, q, true).matched) matches++; } }
    expect(matches).toBeGreaterThan(tries * 0.2); expect(matches).toBeLessThan(tries);
    const outcome = (): boolean => { const t = fresh(); t.day = 100; return swipe(t, profilesFor(t)[0], true).matched; };
    expect(outcome()).toBe(outcome());                                  // the luck is fixed, not random
  });
});

describe('dates and couples', () => {
  const match = (s: G.State): ReturnType<typeof profilesFor>[number] => {
    for (let d = 0; d < 80; d++) { s.day = 200 + d; for (const p of profilesFor(s)) if (swipe(s, p, true).matched) return p; }
    throw new Error('no match found');
  };
  it('a date needs messages and money, and cannot be asked while you are with someone else', () => {
    const s = fresh(); const p = match(s);
    expect(askOnDate(s, p).message).toContain(`at least ${MIN_MESSAGES}`);
    for (let i = 0; i < MIN_MESSAGES; i++) G.addChat(s, 'date:' + p.id, 'me', 'hello ' + i);
    s.money = 100; expect(askOnDate(s, p).message).toContain('costs about');
    s.money = 20000; s.partner = { name: 'Someone', kind: 'citizen', love: 50 };
    expect(askOnDate(s, p).message).toContain('already with Someone');
  });
  it('a good date makes a couple, costs the price, and the couple is recorded; a bad one leaves friends', () => {
    const s = fresh(); const p = match(s);
    for (let i = 0; i < MIN_MESSAGES; i++) G.addChat(s, 'date:' + p.id, 'me', 'hi');
    const good = askOnDate(s, p, () => 0);
    expect(good).toMatchObject({ ok: true, becameCouple: true }); expect(good.fx.money).toBe(-DATE_COST);
    makeCouple(s, p); expect(s.partner).toMatchObject({ name: p.name, love: 45 });
    const t = fresh(); const q = match(t);
    for (let i = 0; i < MIN_MESSAGES; i++) G.addChat(t, 'date:' + q.id, 'me', 'hi');
    const bad = askOnDate(t, q, () => 0.999);
    expect(bad).toMatchObject({ ok: true, becameCouple: false }); expect(bad.fx.friends).toBe(1);
    const again = askOnDate(s, p, () => 0); expect(again.fx.love).toBe(6);       // the same person again: a nicer evening
  });
  it('replies are friendly and notice shared interests', () => {
    const p = profilesFor(fresh())[0];
    expect(dateReply(p, 'shall we have coffee?', () => 0)).toMatch(/Saturday|lovely|plan/);
    expect(dateReply(p, 'hello', () => 0)).toContain(p.name);
    expect(dateReply(p, `I love ${p.interests[0]}`, () => 0)).toContain(p.interests[0]);
  });
});

describe('the meet app in the page', () => {
  it('shows a profile with a portrait, answers it, runs out for the day, and shows matches', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    window.confirm = () => true;
    const { boot } = await import('../src/ui');
    boot(); await (await import('../src/ui')).uiReady();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Dater';
    document.getElementById('startBtn')!.click();
    for (let i = 0; i < 40 && !document.querySelector('#actions button'); i++) (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();
    const body = (): HTMLElement => document.getElementById('modalBody') as HTMLElement;
    document.getElementById('dockPhone')!.click();
    (body().querySelector('[data-sys="dating"]') as HTMLButtonElement).click();
    expect(body().querySelector('.dateFace svg')).toBeTruthy();
    expect(body().querySelector('.dateCard h3')!.textContent).toMatch(/, \d\d/);
    for (let i = 0; i < SWIPES_PER_DAY; i++) (body().querySelector('[data-swipe="pass"]') as HTMLButtonElement).click();
    expect(body().textContent).toContain('Come back tomorrow');
    (body().querySelector('[data-dtab="matches"]') as HTMLButtonElement).click();
    expect(body().textContent).toContain('No matches yet');
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  });
});
