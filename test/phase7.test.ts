// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { EVENTS, activeEvent, bump, progress, claim, claimable } from '../src/events';
import { seasonLook } from '../src/season3d';
import { FILTERS, STICKERS, composePhoto } from '../src/photo';
import { defaults, load, save, meterColours, HOTKEYS } from '../src/settings';
import { meterColor, setColourSafe } from '../src/needs';
import { kitchenOf, cook } from '../src/cooking';
import { visitScenario } from '../src/venues';
import { buy } from '../src/shop';
import { mountWorld3d } from '../src/world3d';
import { EN, RU } from '../src/i18n';

const on = (y: number, m: number, d: number, city = 'Moscow'): G.State => { const s = G.newState('T', 'moscow'); s.queue = []; s.city = city; s.money = 50000; s.day = Math.round((new Date(y, m - 1, d).getTime() - G.START.getTime()) / 864e5); return s; };
const stub = () => () => ({ domElement: document.createElement('canvas'), setPixelRatio() {}, setSize() {}, render() {}, dispose() {}, shadowMap: { enabled: false, type: 0 } }) as never;

describe('holiday events', () => {
  it('each on its dates: New Year, Tatiana\'s Day, Maslenitsa (by the Easter of the year), the White Nights only in Saint Petersburg, City Day', () => {
    expect(activeEvent(on(2026, 12, 31))?.id).toBe('newyear'); expect(activeEvent(on(2027, 1, 8))?.id).toBe('newyear'); expect(activeEvent(on(2027, 1, 9))).toBeNull();
    expect(activeEvent(on(2027, 1, 25))?.id).toBe('tatiana');
    expect(activeEvent(on(2027, 3, 8))?.id).toBe('maslenitsa'); expect(activeEvent(on(2027, 3, 14))?.id).toBe('maslenitsa'); expect(activeEvent(on(2027, 3, 15))).toBeNull(); expect(activeEvent(on(2028, 2, 23))?.id).toBe('maslenitsa');
    expect(activeEvent(on(2027, 6, 20, 'Saint Petersburg'))?.id).toBe('whitenights'); expect(activeEvent(on(2027, 6, 20))).toBeNull();
    expect(activeEvent(on(2026, 9, 5))?.id).toBe('cityday'); expect(activeEvent(on(2026, 10, 5))).toBeNull();
    for (const e of EVENTS) { expect(e.tasks.length).toBe(3); expect(e.rewards.map(r => r.at)).toEqual([1, 2, 3]); expect(e.ru).toMatch(/[А-Яа-я]/); for (const t of e.tasks) expect(t.ru).toMatch(/[А-Яа-я]/); }
  });
  it('what the player does counts toward the event that is on: blini in Maslenitsa week, the park, gifts; nothing counts outside an event', () => {
    const s = on(2027, 3, 9); kitchenOf(s).pantry = 20; kitchenOf(s).skill = 20;
    for (let i = 0; i < 3; i++) { s.slot = i; cook(s, 'blini'); }
    const sc = visitScenario(s, 'park')!; G.apply(s, sc.choices[0].r!(s).fx);
    const p = progress(s)!; expect(p.event.id).toBe('maslenitsa'); expect(p.tasks.map(x => x.have)).toEqual([3, 1, 0]); expect(p.done).toBe(2);
    const off = on(2026, 10, 5); bump(off, 'blini'); expect(progress(off)).toBeNull();
    const ny = on(2026, 12, 30); buy(ny, 'flowers'); buy(ny, 'chocolates'); buy(ny, 'flowers'); expect(progress(ny)!.tasks[0].have).toBe(3);
  });
  it('the free pass: rewards are taken once, as tasks are done; next year\'s New Year starts again', () => {
    const s = on(2026, 12, 30); const m0 = s.money;
    bump(s, 'centre'); expect(claimable(s)).toBe(1); const r = claim(s); expect(r.money).toBe(500); expect(r.keepsakes).toEqual(['A glass tree ornament']); expect(s.money).toBe(m0 + 500);
    expect(claim(s).money).toBe(0); expect(claimable(s)).toBe(0);
    bump(s, 'cook', 2); bump(s, 'gift', 3); expect(claim(s).money).toBe(3000);
    s.day += 365; expect(activeEvent(s)?.id).toBe('newyear'); expect(progress(s)!.done).toBe(0);
    for (const k of ['evPass', 'evClaim', 'evFree']) { expect(EN[k]).toBeTruthy(); expect(RU[k]).toBeTruthy(); }
  });
});

describe('seasons in the 3D city', () => {
  it('snow in winter, slush in March, gold in autumn; bright White Nights; the northern lights only on some clear winter evenings up north', () => {
    expect(seasonLook(1, 'Moscow', 1, 'snow', 0)).toMatchObject({ name: 'winter', snowCrown: true }); expect(seasonLook(3, 'Moscow', 1, 'rain', 0).name).toBe('spring-slush'); expect(seasonLook(10, 'Moscow', 1, 'clear', 0).crown).toBe('#d9922e');
    expect(seasonLook(6, 'Saint Petersburg', 2, 'clear', 0).whiteNight).toBe(true); expect(seasonLook(6, 'Moscow', 2, 'clear', 0).whiteNight).toBe(false);
    expect(seasonLook(1, 'Saint Petersburg', 2, 'clear', 8).aurora).toBe(true); expect(seasonLook(1, 'Saint Petersburg', 2, 'clear', 9).aurora).toBe(false); expect(seasonLook(1, 'Sochi', 2, 'clear', 8).aurora).toBe(false); expect(seasonLook(1, 'Saint Petersburg', 1, 'clear', 8).aurora).toBe(false);
  });
  it('the 3D city on New Year\'s Eve has the tree and fireworks; in saver mode no fireworks; a June evening in Saint Petersburg is bright', async () => {
    const s = on(2026, 12, 31); s.slot = 2; s.weather = 'clear';
    const h = await mountWorld3d({ host: document.body.appendChild(document.createElement('div')), s, onPlace: () => undefined, onNpc: () => undefined, onFail: () => undefined, rendererFactory: stub() });
    expect(h.seasonInfo()).toMatchObject({ season: 'winter', decor: 'newyear', fireworks: true });
    h.setSaver(true); h.update({ ...s }); expect(h.seasonInfo().fireworks).toBe(false); h.setFpsCap(30); h.destroy();
    const w = on(2027, 6, 21, 'Saint Petersburg'); w.slot = 2;
    const h2 = await mountWorld3d({ host: document.body.appendChild(document.createElement('div')), s: w, onPlace: () => undefined, onNpc: () => undefined, onFail: () => undefined, rendererFactory: stub() });
    expect(h2.seasonInfo()).toMatchObject({ season: 'summer', whiteNight: true, decor: 'whitenights' }); h2.destroy();
  }, 60000);
});

describe('photo mode and settings', () => {
  it('four filters, stickers, and a picture that falls back to the plain snapshot when the browser cannot draw', async () => {
    expect(Object.keys(FILTERS)).toEqual(['none', 'film', 'snow', 'warm']); expect(STICKERS.length).toBeGreaterThanOrEqual(5);
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    expect(await composePhoto('data:image/png;base64,iVBORw0KGgo=', 'film', '🎄', 'x')).toBeNull();
  });
  it('settings: a weak device starts low at 30 frames; the choice is kept; broken storage gives the defaults; colour-safe meters', () => {
    expect(defaults({ hardwareConcurrency: 2 })).toMatchObject({ graphics: 'low', fps: 30 }); expect(defaults({ hardwareConcurrency: 8 })).toMatchObject({ graphics: 'medium', fps: 60 });
    const store = new Map<string, string>(); const st = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } };
    save({ graphics: 'high', fps: 30, colourSafe: true, lessMotion: false }, st); expect(load(st)).toEqual({ graphics: 'high', fps: 30, colourSafe: true, lessMotion: false });
    store.set('vrussia_settings', '{broken'); expect(load(st, defaults({ hardwareConcurrency: 8 }))).toMatchObject({ graphics: 'medium' });
    store.set('vrussia_settings', '{"graphics":"ultra","fps":144}'); expect(load(st, defaults({ hardwareConcurrency: 8 }))).toMatchObject({ graphics: 'medium', fps: 60 });
    expect(meterColor(5)).toBe(meterColours(false)[2]); setColourSafe(true); expect(meterColor(5)).toBe('#7b3294'); expect(meterColor(80)).toBe('#2f6fd6'); setColourSafe(false);
    expect(HOTKEYS.map(k => k[0])).toEqual(expect.arrayContaining(['R', 'B', 'M', 'P', 'H', 'F']));
  });
  it('in the page: the settings screen, and the keys P (phone), H (hide the interface) and M (the metro map)', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    localStorage.clear(); vi.resetModules();
    const ui = await import('../src/ui'); ui.boot(); await ui.uiReady();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Keys';
    document.getElementById('startBtn')!.click();
    for (let i = 0; i < 40 && !document.querySelector('#actions button'); i++) (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();
    document.getElementById('modal')!.hidden = true;
    document.getElementById('settingsBtn')!.click(); expect(document.querySelector('#modalBody .settings')).toBeTruthy();
    (document.getElementById('setSafe') as HTMLInputElement).click(); expect(JSON.parse(localStorage.getItem('vrussia_settings')!).colourSafe).toBe(true);
    (document.getElementById('setMotion') as HTMLInputElement).click(); expect(document.documentElement.classList.contains('lessMotion')).toBe(true);
    document.getElementById('modal')!.hidden = true;
    const key = (k: string): void => { document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); };
    key('h'); expect(document.getElementById('game')!.classList.contains('clean')).toBe(true); key('h');
    key('p'); expect(document.getElementById('modal')!.hidden).toBe(false); expect(document.querySelector('#modalBody .phone')).toBeTruthy(); key('Escape');
    key('m'); await vi.waitFor(() => expect(document.querySelector('#modalBody .mtMap')).toBeTruthy());
  });
});

describe('new achievements', () => {
  it('home chef, tourist, certified, speaks Russian, goal reached, in the spirit', () => {
    const ids = ['chef', 'tourist', 'graduate', 'russianb1', 'saver', 'festive']; const A = (id: string) => G.ACHIEVEMENTS.find(a => a.id === id)!;
    for (const id of ids) expect(A(id), id).toBeTruthy();
    const s = G.newState('T', 'moscow'); for (const id of ids) expect(A(id).done(s), id).toBe(false);
    const x = s as unknown as Record<string, unknown>;
    x.kitchen = { pantry: 0, skill: 45 }; x.photos = ['a', 'b', 'c', 'd']; x.study = { skills: {}, course: null, certs: ['ru-a1', 'ru-a2', 'ru-b1'] }; x.savings = { name: 'car', goal: 1000, saved: 1000 }; x.events = { counts: {}, claimed: { 'newyear:2026': [0, 1, 2] }, keepsakes: [] };
    for (const id of ids) expect(A(id).done(s), id).toBe(true);
  });
});
