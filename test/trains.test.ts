// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { LINES, journeys, route, routeFare, fareOf, daysOf, cannotRide } from '../src/trains';
import { tripEffects, tripScenario, cannotTravel, classesFor } from '../src/train-trip';
import { openTrains } from '../src/study-ui';
import { EN, RU } from '../src/i18n';

describe('the railway network (researched, round 124)', () => {
  it('every city of the game can be reached from Moscow by train (with changes where needed)', () => {
    const missing = G.CITIES.filter(c => c !== 'Moscow' && !route('Moscow', c));
    expect(missing).toEqual([]);
    for (const c of G.CITIES) for (const d of ['Saint Petersburg', 'Vladivostok', 'Sochi']) if (c !== d) expect(route(c, d), `${c} → ${d}`).not.toBeNull();
  });
  it('the real figures: Sapsan Moscow–Saint Petersburg 650 km in about 4 hours; the Rossiya 9,289 km in about a week via Yaroslavl, Kirov and Perm', () => {
    const sap = journeys('Moscow', 'Saint Petersburg')[0]; expect(sap.line.id).toBe('sapsan'); expect(sap.km).toBe(650); expect(sap.hours).toBe(4);
    const ros = LINES.find(l => l.id === 'rossiya')!; expect(ros.stops.at(-1)).toMatchObject({ city: 'Vladivostok', km: 9289 });
    expect(ros.stops.map(x => x.city).slice(0, 4)).toEqual(['Moscow', 'Yaroslavl', 'Kirov', 'Perm']);
    expect(route('Moscow', 'Vladivostok')!.hours).toBeGreaterThan(150);
    const nn = journeys('Moscow', 'Nizhny Novgorod')[0]; expect(nn.line.id).toBe('lastochka-nn'); expect(nn.km).toBe(439);
    expect(LINES.every(l => l.stops.every((x, i) => i === 0 || x.km > l.stops[i - 1].km)), 'kilometres grow along every line').toBe(true);
  });
  it('Yakutsk: by the Rossiya to Khabarovsk, the BAM to Neryungri and on to Nizhny Bestyakh across the Lena', () => {
    const r = route('Moscow', 'Yakutsk')!; expect(r.legs.length).toBeGreaterThanOrEqual(3);
    expect(r.legs.at(-1)!.to.station).toMatch(/Nizhny Bestyakh/); expect(r.legs.at(-1)!.line.note).toMatch(/Lena/);
  });
  it('Kaliningrad by train: through Lithuania, for Russian citizens only (with the transit document); foreigners are told to fly', () => {
    const j = journeys('Moscow', 'Kaliningrad')[0]; expect(j.line.id).toBe('yantar');
    expect(cannotRide('citizen', j)).toBeNull(); expect(cannotRide('migrant', j)).toMatch(/fly/);
    const s = G.newState('T', 'uzbek'); s.city = 'Moscow'; s.money = 100000; expect(cannotTravel(s, 'Kaliningrad', 'kupe')).toMatch(/fly/);
  });
  it('fares: platzkart is cheaper than kupe, kupe cheaper than SV; a high-speed seat costs more per km than a day express', () => {
    const j = journeys('Moscow', 'Kazan')[0]; expect(fareOf(j, 'platzkart')!).toBeLessThan(fareOf(j, 'kupe')!); expect(fareOf(j, 'kupe')!).toBeLessThan(fareOf(j, 'sv')!); expect(fareOf(j, 'seat')).toBeNull();
    expect(fareOf(journeys('Moscow', 'Saint Petersburg')[0], 'seat')! / 650).toBeGreaterThan(fareOf(journeys('Moscow', 'Nizhny Novgorod')[0], 'seat')! / 439);
    expect(daysOf(4)).toBe(0); expect(daysOf(23.7)).toBe(1); expect(daysOf(166)).toBe(7);
  });
  it('the trip: pay, the days on board, arrive living in the new city at the station; a foreigner registers again', () => {
    const s = G.newState('T', 'tajik'); s.queue = []; s.city = 'Moscow'; s.money = 50000; s.docs.reg = 60;
    const r = route('Moscow', 'Kazan')!; const fare = routeFare(r, 'kupe');
    const sc = tripScenario(s, 'Kazan')!; expect(sc.text).toMatch(/793 km/);
    const i = sc.choices.findIndex(c => c.t.startsWith('Kupe')); G.choose(s, sc, i);
    expect(s.city).toBe('Kazan'); expect(s.loc).toBe('station'); expect(s.money).toBeLessThanOrEqual(50000 - fare); expect(s.docs.reg).toBe(0);
    const c = G.newState('C', 'moscow'); c.money = 50000; const fx = tripEffects(c, 'Saint Petersburg', 'seat'); expect(fx.setDocs).toBeUndefined(); expect(fx.skip).toBe(0);
    const poor = G.newState('P', 'region'); poor.city = 'Moscow'; poor.money = 100; expect(cannotTravel(poor, 'Vladivostok', 'platzkart')).toMatch(/cost/);
    expect(classesFor(route('Moscow', 'Saint Petersburg')!)).toEqual(['seat']);
  });
  it('the phone app lists every reachable city, fastest first, with real stops, and starts the trip', () => {
    const s = G.newState('T', 'moscow'); s.queue = []; const host = document.body.appendChild(document.createElement('div')); let started: G.Scenario | null = null;
    openTrains(host, s, { back: () => undefined, refresh: () => undefined, scenario: sc => { started = sc; } });
    const cards = host.querySelectorAll('.jobCard'); expect(cards.length).toBe(G.CITIES.length - 1);
    expect(cards[0].textContent).toMatch(/Tula|Vladimir|Yaroslavl/);
    expect(host.textContent).toContain('Bologoye-Moskovskoye'); expect(host.textContent).toContain('times approximate');
    host.querySelector<HTMLButtonElement>('[data-go="Saint Petersburg"]')!.click(); expect(started!.title).toContain('Saint Petersburg');
    for (const k of ['trTitle', 'trGo', 'trStops', 'trApprox']) { expect(EN[k]).toBeTruthy(); expect(RU[k]).toMatch(/[А-Яа-я]/); }
  });
});
