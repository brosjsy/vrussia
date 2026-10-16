// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { VENUES, visitScenario, closed, photosOf, fareOf, hasMetro, TAXI } from '../src/venues';
import { LINES, stationIds, openMetro } from '../src/metro-ui';
import { needsOf } from '../src/needs';
import { EN, RU } from '../src/i18n';

const fresh = (city = 'Moscow'): G.State => { const s = G.newState('T', 'moscow'); s.queue = []; s.city = city; s.money = 20000; return s; };
const run = (s: G.State, id: string, i: number): string => { const sc = visitScenario(s, id)!; const out = sc.choices[i].r!(s); G.apply(s, out.fx); return out.msg; };

describe('places to go', () => {
  it('a banya, a park, a café, a cinema, a gym, a winter ice rink, a library and four landmarks, each with words in Russian', () => {
    expect(VENUES.map(v => v.id)).toEqual(['banya', 'park', 'cafe', 'cinema', 'gym', 'rink', 'library', 'embankment', 'cathedral', 'stadium', 'tower']);
    for (const v of VENUES) { expect(v.ru).toMatch(/[А-Яа-я]/); expect(v.ru_text).toMatch(/[А-Яа-я]/); expect(v.price).toBeGreaterThanOrEqual(0); }
    expect(VENUES.filter(v => v.landmark).length).toBe(4);
  });
  it('the banya costs the ticket and the fare, leaves the player clean, rested and happier; a taxi costs more but tires less', () => {
    const s = fresh(), n = needsOf(s); n.hygiene = 20; n.fun = 20; s.stress = 50; s.energy = 50;
    run(s, 'banya', 0); expect(s.money).toBe(20000 - 900 - fareOf('Moscow')); expect(n.hygiene).toBe(100); expect(n.fun).toBe(45); expect(s.stress).toBe(40); expect(s.energy).toBe(56);
    const t = fresh(); t.energy = 50; run(t, 'banya', 1); expect(t.money).toBe(20000 - 900 - TAXI); expect(t.energy).toBe(60);
  });
  it('the metro where there is one, the bus elsewhere; the rink only in winter; no visit without the money', () => {
    expect(hasMetro('Moscow')).toBe(true); expect(hasMetro('Sochi')).toBe(false); expect(fareOf('Sochi')).toBeLessThan(fareOf('Moscow'));
    expect(visitScenario(fresh(), 'park')!.choices[0].t).toContain('metro'); expect(visitScenario(fresh('Sochi'), 'park')!.choices[0].t).toContain('bus');
    const s = fresh(); expect(closed(s, VENUES.find(v => v.id === 'rink')!)).toContain('winter'); expect(visitScenario(s, 'rink')).toBeNull();
    s.day = 120; expect(closed(s, VENUES.find(v => v.id === 'rink')!)).toBeNull();
    const poor = fresh(); poor.money = 100; expect(visitScenario(poor, 'stadium')).toBeNull();
    expect(visitScenario(fresh(), 'park', true)!.choices[0].t).toContain('метро');
  });
  it('a landmark gives a photo for the collection the first time only', () => {
    const s = fresh(); expect(run(s, 'embankment', 0)).toContain('photo'); expect(photosOf(s)).toEqual(['embankment']);
    expect(run(s, 'embankment', 0)).not.toContain('photo'); expect(photosOf(s)).toEqual(['embankment']);
  });
  it('a visit takes a part of the day, like any action', () => {
    const s = fresh(), sc = visitScenario(s, 'cinema')!; expect(sc.free).toBeFalsy(); const slot = s.slot;
    G.choose(s, sc, 0); expect(s.slot !== slot || s.day > 0).toBe(true);
  });
});

describe('the metro map', () => {
  it('has a station for every place of the game and every place to go, and every line passes the centre', () => {
    const ids = stationIds(); for (const p of G.PLACES) expect(ids, p.id).toContain(p.id); for (const v of VENUES) expect(ids, v.id).toContain(v.id);
    for (const l of LINES) expect(l.stations).toContain('center');
    for (const k of ['mtTitle', 'mtBus', 'mtHint', 'mtGo', 'mtTicket', 'mtHere', 'mtPhoto', 'mtShot', 'mtCollection', 'mtMetroFare', 'mtBusFare']) { expect(EN[k], k).toBeTruthy(); expect(RU[k], k).toBeTruthy(); }
  });
  it('a tapped venue shows its card and goes there; a tapped place starts the trip there; the station the player is at says so', () => {
    const s = fresh(), host = document.createElement('div'); const went: string[] = []; let closedN = 0;
    openMetro(host, s, { goPlace: id => went.push('place:' + id), visit: id => went.push('venue:' + id), close: () => { closedN++; } });
    expect(host.querySelectorAll('[data-st]').length).toBe(stationIds().length);
    host.querySelector('[data-st="banya"]')!.dispatchEvent(new Event('click')); expect(host.querySelector('.mtCard')!.textContent).toContain('Banya');
    host.querySelector<HTMLButtonElement>('[data-mt="go"]')!.click(); expect(went).toEqual(['venue:banya']); expect(closedN).toBe(1);
    host.querySelector('[data-st="market"]')!.dispatchEvent(new Event('click')); host.querySelector<HTMLButtonElement>('[data-mt="go"]')!.click(); expect(went[1]).toBe('place:market');
    host.querySelector(`[data-st="${s.loc}"]`)!.dispatchEvent(new Event('click')); expect(host.querySelector('[data-mt="go"]')).toBeNull();
    s.money = 10; host.querySelector('[data-st="stadium"]')!.dispatchEvent(new Event('click')); expect((host.querySelector('[data-mt="go"]') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('the metro in the page', () => {
  it('the Metro button opens the map; a visit to the cinema plays as a scenario and takes a part of the day', async () => {
    const { readFileSync } = await import('node:fs'); const { vi } = await import('vitest');
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    localStorage.clear(); vi.resetModules();
    const ui = await import('../src/ui'); ui.boot(); await ui.uiReady();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Metro';
    document.getElementById('startBtn')!.click();
    for (let i = 0; i < 40 && !document.querySelector('#actions button'); i++) (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();
    const date0 = document.getElementById('date')!.textContent;
    document.getElementById('metroBtn')!.click();
    await vi.waitFor(() => expect(document.querySelector('#modalBody .mtMap')).toBeTruthy());
    document.querySelector('#modalBody [data-st="cinema"]')!.dispatchEvent(new Event('click'));
    document.querySelector<HTMLButtonElement>('#modalBody [data-mt="go"]')!.click();
    expect(document.getElementById('modal')!.hidden).toBe(true); expect(document.getElementById('stage')!.textContent).toContain('Cinema');
    document.querySelector<HTMLButtonElement>('#stage .choices button')!.click();
    for (let i = 0; i < 10 && !document.querySelector('#actions button'); i++) (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();
    expect(document.getElementById('date')!.textContent).not.toBe(date0);
  });
});

describe('one list of metro cities', () => {
  it('the screen and the places-to-go module agree on which cities have a metro', async () => {
    const src = (await import('node:fs')).readFileSync('src/ui.ts', 'utf8'), m = src.match(/const hasMetro = \(city: string\): boolean => (\[[^\]]+\])/);
    expect(m).toBeTruthy(); const { METRO_CITIES } = await import('../src/venues'); expect(JSON.parse(m![1].replace(/'/g, '"'))).toEqual(METRO_CITIES);
  });
});
