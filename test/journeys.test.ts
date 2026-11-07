// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import { JOURNEYS, journeyById, walkThrough, routePlaces, finished, journeyForChecklist } from '../src/journeys';
import { openJourneys } from '../src/journeys-ui';

const fresh = (origin = 'student'): G.State => { const s = G.newState('Tester', origin); s.queue = []; return s; };

describe('journeys', () => {
  it('every step that names a place names a real place, and every journey has a title in both languages', () => {
    for (const j of JOURNEYS) {
      expect(j.title[0] && j.title[1]).toBeTruthy();
      for (const st of j.steps) { if (st.place) expect(G.PLACES.some(p => p.id === st.place), `${j.id}: ${st.place}`).toBe(true); expect(st.title[0] && st.title[1] && st.note[0] && st.note[1]).toBeTruthy(); }
    }
  });
  it('the SIM route for a foreigner: identification, the mall, the shop; a citizen skips the identification', () => {
    const f = fresh('student'), c = fresh('moscow'); c.status = 'citizen';
    const j = journeyById('sim')!;
    expect(walkThrough(f, j).map(x => x.n)).toEqual([1, 2, 3]); expect(walkThrough(f, j)[0].state).toBe('now');
    expect(walkThrough(c, j).length).toBe(2);
    f.flags.simId = true; expect(walkThrough(f, j).map(x => x.state)).toEqual(['done', 'now', 'later']);
    f.loc = 'mall'; expect(walkThrough(f, j).map(x => x.state)).toEqual(['done', 'done', 'now']);
    f.flags.sim = true; expect(finished(f, j)).toBe(true);
  });
  it('the route starts where the player stands and lists each place once in a row', () => {
    const s = fresh(); s.loc = 'home'; s.flags.simId = true;
    expect(routePlaces(s, journeyById('sim')!)).toEqual(['home', 'mall']);
    expect(routePlaces(s, journeyById('patent')!)[0]).toBe('home');
  });
  it('checklist items map to a journey', () => { expect(journeyForChecklist('sim')).toBe('sim'); expect(journeyForChecklist('med')).toBe('patent'); expect(journeyForChecklist('nothing')).toBeNull(); });
});

describe('the journeys screen', () => {
  it('draws the list, then a route with a map, numbered stops and a go button that walks to the place', () => {
    const s = fresh(); s.loc = 'home'; s.flags.simId = true;
    const host = document.createElement('div'); document.body.appendChild(host);
    let went = '', closed = false;
    openJourneys(host, s, { close: () => { closed = true; }, go: p => { went = p; }, canGo: () => true });
    expect(host.querySelectorAll('[data-j="open"]').length).toBe(JOURNEYS.length);
    (host.querySelector('[data-id="sim"]') as HTMLButtonElement).click();
    expect(host.querySelector('svg.jMap')).toBeTruthy(); expect(host.querySelectorAll('.jFlow > li').length).toBeGreaterThanOrEqual(3);
    (host.querySelector('[data-j="go"]') as HTMLButtonElement).click(); expect(went).toBe('mall');
    (host.querySelector('[data-j="list"]') as HTMLButtonElement).click(); (host.querySelector('[data-j="close"]') as HTMLButtonElement).click(); expect(closed).toBe(true);
  });
  it('opens straight on a route when asked, and says it is done when it is', () => {
    const s = fresh(); s.flags.sim = true; s.flags.simId = true;
    const host = document.createElement('div'); openJourneys(host, s, { close() {}, go() {}, canGo: () => true }, 'sim');
    expect(host.querySelector('svg.jMap')).toBeTruthy(); expect(host.querySelector('[data-j="go"]')).toBeNull(); expect(host.textContent).toMatch(/Done|Готово/);
  });
});
