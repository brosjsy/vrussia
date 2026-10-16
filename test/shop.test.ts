// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { CATALOG, CATEGORIES, buy, unavailable, itemById, owned, wear, wearing, wardrobe } from '../src/shop';
import { normalizeLook } from '../src/avatar';

const fresh = (money = 100000): G.State => { const s = G.newState('T', 'moscow'); s.queue = []; s.money = money; return s; };

describe('the catalogue', () => {
  it('has unique items, sane prices and a real category for each', () => {
    expect(new Set(CATALOG.map(i => i.id)).size).toBe(CATALOG.length);
    const cats = new Set(CATEGORIES.map(c => c.id));
    for (const i of CATALOG) { expect(cats.has(i.cat), i.id).toBe(true); expect(i.price).toBeGreaterThan(0); expect(i.price).toBeLessThan(100000); expect(i.name.length).toBeGreaterThan(2); }
    for (const c of CATEGORIES) expect(CATALOG.some(i => i.cat === c.id), c.id).toBe(true);
  });
});

describe('buying', () => {
  it('takes the money, applies the effects, remembers the item, dresses the portrait and records the payment', () => {
    const s = fresh(); s.clothes = 10;
    const r = buy(s, 'coat-winter');
    expect(r.ok).toBe(true);
    expect(s.money).toBe(100000 - 6000); expect(s.clothes).toBe(50);
    expect(owned(s, 'coat-winter')).toBe(true); expect(s.worn?.outer).toBe('coat-winter');
    expect(G.phoneOf(s).tx[0]).toMatchObject({ label: 'Bought: Winter coat', amount: -6000 });
  });
  it('refuses when poor, when it is owned already, and for an unknown item, and changes nothing', () => {
    const poor = fresh(100); const before = JSON.stringify(poor);
    expect(buy(poor, 'coat-winter').ok).toBe(false); expect(JSON.stringify(poor)).toBe(before);
    const s = fresh(); buy(s, 'glasses'); const m = s.money;
    expect(buy(s, 'glasses').ok).toBe(false); expect(s.money).toBe(m);
    expect(buy(s, 'nonsense').ok).toBe(false);
    expect(unavailable(poor, itemById('coat-winter')!)).toContain('You need');
  });
  it('phones: only upgrades make sense, and a broken phone can be replaced', () => {
    const s = fresh(); s.phone = 0;
    expect(unavailable(s, itemById('phone-good')!)).toContain('basic phone first');
    expect(buy(s, 'phone-basic').ok).toBe(true); expect(s.phone).toBe(1);
    expect(buy(s, 'phone-flagship').ok).toBe(true); expect(s.phone).toBe(3);
    expect(unavailable(s, itemById('phone-good')!)).toContain('already');
  });
  it('consumables can be bought again; flowers help a partner more', () => {
    const s = fresh(); s.energy = 10;
    expect(buy(s, 'dinner').ok).toBe(true); expect(buy(s, 'dinner').ok).toBe(true); expect(s.energy).toBe(50);
    s.partner = { name: 'Anna', kind: 'citizen', love: 40 };
    buy(s, 'flowers'); expect(s.partner.love).toBeGreaterThan(40);
  });
  it('the shop is reached from the dock, shows a portrait, and buying a coat puts the coat on the player', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    window.confirm = () => true;
    const { boot } = await import('../src/ui');
    boot(); await (await import('../src/ui')).uiReady();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Shopper';
    document.getElementById('startBtn')!.click();
    for (let i = 0; i < 40 && !document.querySelector('#actions button'); i++) (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();
    const before = document.getElementById('whoPic')!.innerHTML;
    document.getElementById('dockShop')!.click();
    const body = document.getElementById('modalBody')!;
    expect(body.querySelector('.shopMe svg')).toBeTruthy();
    expect(body.querySelectorAll('.shopTabs button').length).toBe(CATEGORIES.length + 1);
    expect(body.querySelectorAll('.item').length).toBeGreaterThan(5);
    (body.querySelector('[data-buy="coat-winter"]') as HTMLButtonElement).click();
    expect(body.querySelector('.phNote')!.textContent).toContain('You bought');
    expect((body.querySelector('[data-buy="coat-winter"]') as HTMLButtonElement).disabled).toBe(true);
    expect(document.getElementById('whoPic')!.innerHTML).not.toBe(before);          // the header portrait is now dressed
    (body.querySelector('[data-cat="tech"]') as HTMLButtonElement).click();
    expect(body.textContent).toContain('Flagship phone');
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  });
});

describe('clothes change the character', () => {
  it('every item that changes the look names valid values (nothing is silently dropped)', () => {
    for (const i of CATALOG.filter(x => x.look)) {
      const merged = normalizeLook({ ...normalizeLook(undefined), ...i.look });
      for (const [k, v] of Object.entries(i.look as Record<string, unknown>)) expect((merged as unknown as Record<string, unknown>)[k], `${i.id}.${k}`).toBe(v);
    }
    expect(CATALOG.filter(x => x.look && x.look.shoes).length).toBeGreaterThanOrEqual(4);
    expect(CATALOG.filter(x => x.look && x.look.bottom).length).toBeGreaterThanOrEqual(4);
    expect(CATALOG.filter(x => x.look && x.look.style).length).toBeGreaterThanOrEqual(6);
  });
  it('buying a skirt, boots and a dress changes the look and the clothing value', () => {
    const s = fresh(); s.clothes = 10;
    buy(s, 'skirt-navy'); buy(s, 'boots-winter'); buy(s, 'dress-green');
    expect(normalizeLook(s.look)).toMatchObject({ bottom: 'skirt', bottomColor: 1, shoes: 'boots', style: 'dress', accent: 2 });
    expect(s.clothes).toBe(10 + 8 + 22 + 12);
  });
  it('the wardrobe lists what you own, lets you change back, and takes a coat off and on', () => {
    const s = fresh(); expect(wardrobe(s)).toEqual([]);
    buy(s, 'jeans-blue'); buy(s, 'shorts-sand'); buy(s, 'coat-winter');
    expect(wardrobe(s).map(i => i.id)).toEqual(expect.arrayContaining(['jeans-blue', 'shorts-sand', 'coat-winter']));
    expect(normalizeLook(s.look).bottom).toBe('shorts'); expect(wearing(s, itemById('shorts-sand')!)).toBe(true); expect(wearing(s, itemById('jeans-blue')!)).toBe(false);
    expect(wear(s, 'jeans-blue').ok).toBe(true); expect(normalizeLook(s.look).bottom).toBe('jeans');
    expect(s.worn?.outer).toBe('coat-winter');
    expect(wear(s, 'coat-winter').message).toContain('took off'); expect(s.worn?.outer).toBeUndefined();
    expect(wear(s, 'coat-winter').message).toContain('wearing'); expect(s.worn?.outer).toBe('coat-winter');
    expect(wear(s, 'tee-white').ok).toBe(false);                      // not owned
    expect(wear(s, 'dinner').ok).toBe(false);                         // not wearable
  });
  it('the wardrobe tab in the page shows owned clothes with a Wear button that changes the portrait', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    window.confirm = () => true;
    const { boot } = await import('../src/ui');
    boot(); await (await import('../src/ui')).uiReady();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Wardrobe';
    document.getElementById('startBtn')!.click();
    for (let i = 0; i < 40 && !document.querySelector('#actions button'); i++) (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();
    document.getElementById('dockShop')!.click();
    const body = document.getElementById('modalBody')!;
    (body.querySelector('[data-cat="wardrobe"]') as HTMLButtonElement).click();
    expect(body.textContent).toContain('do not own any clothes');
    (body.querySelector('[data-cat="clothes"]') as HTMLButtonElement).click();
    (body.querySelector('[data-buy="jeans-blue"]') as HTMLButtonElement).click();
    (body.querySelector('[data-buy="shorts-sand"]') as HTMLButtonElement).click();
    (body.querySelector('[data-cat="wardrobe"]') as HTMLButtonElement).click();
    expect(body.querySelectorAll('[data-wear]').length).toBe(2);
    const before = body.querySelector('.shopMe')!.innerHTML;
    (body.querySelector('[data-wear="jeans-blue"]') as HTMLButtonElement).click();
    expect(body.querySelector('.shopMe')!.innerHTML).not.toBe(before);
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  });
});
