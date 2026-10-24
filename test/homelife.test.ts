// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import * as H from '../src/homelife';
import { afterTurn } from '../src/turn';
import { homeLifeHtml, wireHomeLife } from '../src/homelife-ui';
import { needsOf } from '../src/needs';

const at = (name = 'Olga'): G.State => { const s = G.newState(name, 'region'); s.queue = []; s.loc = 'home'; s.money = 50000; s.energy = 100; return s; };

describe('life at home', () => {
  it('the flat gets dirty, the sink and the bin fill, plants dry out; more people make more mess', () => {
    const s = at(); H.homeOf(s); H.buyPlant(s, 'Ficus'); s.day = 3; H.tickHome(s);
    const h = H.homeOf(s); expect(h.dirt).toBeGreaterThan(30); expect(h.dishes).toBeGreaterThan(5); expect(h.rubbish).toBeGreaterThan(60); expect(h.plants[0].water).toBe(35);
    const f = at('Fam'); f.kids = 2; f.partner = { name: 'A', kind: 'citizen', love: 60 }; H.homeOf(f); f.day = 3; H.tickHome(f); expect(H.homeOf(f).dishes).toBeGreaterThan(h.dishes);
    s.day = 6; H.tickHome(s); expect(H.homeOf(s).plants).toHaveLength(0);                 // dried out
  });
  it('neglect costs: a filthy flat raises stress, a full bin costs reputation with the neighbours', () => {
    const s = at(); const h = H.homeOf(s); h.dirt = 95; h.rubbish = 100; const st = s.stress, rep = s.rep; s.day = 1; const out = H.tickHome(s);
    expect(s.stress).toBeGreaterThan(st); expect(s.rep).toBeLessThan(rep); expect(out.join(' ')).toMatch(/mess.*smells|smells/);
  });
  it('the chores: dishes, cleaning (or a cleaner), the rubbish sorted, watering; once a day each, at home', () => {
    const s = at(); const h = H.homeOf(s); h.dirt = 70; h.dishes = 8; h.rubbish = 60; H.buyPlant(s, 'Aloe'); h.plants[0].water = 20;
    expect(H.washDishes(s).ok).toBe(true); expect(h.dishes).toBe(0); expect(H.washDishes(s).ok).toBe(false);
    const m = s.money; expect(H.clean(s, true).ok).toBe(true); expect(m - s.money).toBe(2500); expect(h.dirt).toBe(0);
    expect(H.rubbish(s, true).ok).toBe(true); expect(h.rubbish).toBe(0); expect(h.sorted).toBe(1);
    expect(H.water(s).ok).toBe(true); expect(h.plants[0].water).toBe(100);
    s.loc = 'work'; s.day++; expect(H.washDishes(s).msg).toMatch(/not at home/);
  });
  it('breakdowns: fix it yourself (knowledge helps; a socket can shock) or a handyman; a cold radiator is the management company\'s, free', () => {
    let selfFixed = 0;
    for (let i = 0; i < 20; i++) { const s = at('F' + i); s.know = 60; const h = H.homeOf(s); h.broken = 'tap'; H.fix(s, 'diy'); if (!h.broken) selfFixed++; }
    expect(selfFixed).toBeGreaterThan(10);
    const s = at(); const h = H.homeOf(s); h.broken = 'fridge'; const m = s.money; expect(H.fix(s, 'pro').ok).toBe(true); expect(m - s.money).toBe(4500); expect(h.broken).toBeNull();
    h.broken = 'heater'; const m2 = s.money; H.fix(s, 'pro'); expect(s.money).toBe(m2);
  });
  it('lost keys: locked out until a locksmith opens the door', () => {
    const s = at(); const h = H.homeOf(s); h.keysLost = true; expect(H.washDishes(s).msg).toMatch(/keys/);
    expect(H.locksmith(s).ok).toBe(true); expect(h.keysLost).toBe(false);
  });
  it('without an alarm a tired person sleeps through the morning; the evening things rest and teach', () => {
    let lost = 0;
    for (let i = 0; i < 30; i++) { const s = at('S' + i); H.homeOf(s); H.setAlarm(s, null); s.energy = 20; s.day = 1; s.slot = 0; H.tickHome(s); if (s.slot > 0) lost++; }
    expect(lost).toBeGreaterThan(5);
    const s = at(); H.homeOf(s); s.stress = 50; H.watchSeries(s); expect(s.stress).toBe(44); expect(needsOf(s).fun).toBeGreaterThan(0);
    const k = s.know; for (let d = 0; d < 8; d++) { s.day = d + 1; H.read(s); } expect(s.know).toBe(k + 8); expect(H.homeOf(s).books).toBe(1);
    s.slot = 0; s.energy = 40; H.nap(s); expect(s.energy).toBe(55); expect(s.slot).toBe(1);
  });
  it('the daily part runs with the end-of-turn rules', () => {
    const s = at(); H.homeOf(s).ticked = 0; s.day = 2; const d = H.homeOf(s).dirt; afterTurn(s); expect(H.homeOf(s).dirt).toBeGreaterThan(d);
  });
  it('the Household app shows the flat and does the chores', () => {
    const s = at(); const host = document.body.appendChild(document.createElement('div'));
    const draw = (): void => { host.innerHTML = homeLifeHtml(s); wireHomeLife(host, s, { notify: () => undefined, again: draw }); };
    draw(); H.homeOf(s).broken = 'socket'; draw(); expect(host.textContent).toMatch(/socket/);
    host.querySelector<HTMLButtonElement>('[data-hl="dishes"]')!.click(); expect(H.homeOf(s).dishes).toBe(0);
    host.querySelector<HTMLButtonElement>('[data-hl="alarm:off"]')!.click(); expect(H.homeOf(s).alarm).toBeNull();
    host.querySelector<HTMLButtonElement>('[data-hl="fix:pro"]')!.click(); expect(H.homeOf(s).broken).toBeNull();
  });
});
