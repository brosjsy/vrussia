// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { kitchenOf, buyGroceries, cook, cannotCook, RECIPES, BAG, BAG_PRICE, PER_SLOT, mealMoodlet, shopsHere } from '../src/cooking';
import { useObject, teaMoodlet } from '../src/objects';
import { needsOf } from '../src/needs';
import { buyFurn, placeFurn, undoBuy, sellBack, toggleWish, onWishlist, catalogue, furnOf, furnById, UNDO_MS, FURNITURE } from '../src/furniture';
import { drawFurnPanel, resetFurnPanel } from '../src/furn-ui';
import { EN, RU } from '../src/i18n';
import { HOMES, designOf } from '../src/homes';

const fresh = (): G.State => { const s = G.newState('T', 'moscow'); s.queue = []; s.money = 100000; return s; };

describe('cooking', () => {
  it('groceries come by the bag: the market is cheapest but only when the player is there; delivery is dearest', () => {
    const s = fresh(); s.loc = 'home'; expect(shopsHere(s)).toEqual(['shop', 'delivery']);
    expect(buyGroceries(s, 'market').ok).toBe(false); expect(buyGroceries(s, 'shop').ok).toBe(true); expect(kitchenOf(s).pantry).toBe(BAG); expect(s.money).toBe(100000 - BAG_PRICE.shop);
    s.loc = 'market'; expect(buyGroceries(s, 'market').ok).toBe(true); expect(BAG_PRICE.market).toBeLessThan(BAG_PRICE.shop); expect(BAG_PRICE.shop).toBeLessThan(BAG_PRICE.delivery);
    const poor = fresh(); poor.money = 100; expect(buyGroceries(poor, 'shop').ok).toBe(false); expect(kitchenOf(poor).pantry).toBe(0);
  });
  it('a dish uses groceries, fills hunger and teaches; harder dishes need skill and fill more', () => {
    const s = fresh(), n = needsOf(s); n.hunger = 10; kitchenOf(s).pantry = 30;
    const borsch = RECIPES.find(r => r.id === 'borsch')!; expect(cannotCook(s, borsch)).toContain('skill');
    expect(cook(s, 'noodles').ok).toBe(true); expect(n.hunger).toBe(35); expect(kitchenOf(s).pantry).toBe(29); expect(kitchenOf(s).skill).toBe(1);
    expect(RECIPES.map(r => r.id)).toEqual(['noodles', 'syrniki', 'blini', 'pelmeni', 'plov', 'borsch']);
    for (let i = 1; i < RECIPES.length; i++) { expect(RECIPES[i].skill).toBeGreaterThan(RECIPES[i - 1].skill); expect(RECIPES[i].hunger).toBeGreaterThan(RECIPES[i - 1].hunger); }
  });
  it('the stove can be used twice in a part of the day; practice unlocks borscht after a few weeks of cooking', () => {
    const s = fresh(); kitchenOf(s).pantry = 999;
    expect(cook(s, 'noodles').ok).toBe(true); expect(cook(s, 'noodles').ok).toBe(true); const third = cook(s, 'noodles'); expect(third.ok).toBe(false); expect(PER_SLOT).toBe(2);
    let parts = 0; while (kitchenOf(s).skill < 45 && parts < 200) { s.slot = (s.slot + 1) % 3; if (s.slot === 0) s.day++; parts++; const best = [...RECIPES].reverse().find(r => !cannotCook(s, r)); if (best) cook(s, best.id); }
    expect(kitchenOf(s).skill).toBeGreaterThanOrEqual(45); expect(parts).toBeGreaterThan(10); expect(parts).toBeLessThan(60);
    s.slot = (s.slot + 1) % 3; expect(cook(s, 'borsch').ok).toBe(true);
  });
  it('a good dish leaves a feeling for the rest of the day, with words in both languages', () => {
    const s = fresh(); kitchenOf(s).pantry = 10; kitchenOf(s).skill = 40;
    expect(mealMoodlet(s)).toBeNull(); cook(s, 'plov'); expect(mealMoodlet(s)).toEqual({ key: 'ml.meal.plov', v: 3 });
    s.day++; expect(mealMoodlet(s)).toBeNull();
    for (const r of RECIPES) if (r.mood) { expect(EN['ml.meal.' + r.id]).toBeTruthy(); expect(RU['ml.meal.' + r.id]).toBeTruthy(); }
    for (const r of RECIPES) expect(r.ru).toMatch(/[А-Яа-я]/);
  });
});

describe('the objects at home', () => {
  it('the television is fun once in a part of the day; tea calms, from a samovar more, and leaves a feeling', () => {
    const s = fresh(), n = needsOf(s); n.fun = 20; s.stress = 50;
    expect(useObject(s, 'tv').ok).toBe(true); expect(n.fun).toBe(35); expect(useObject(s, 'tv').ok).toBe(false);
    expect(useObject(s, 'tea').ok).toBe(true); expect(s.stress).toBe(48); expect(teaMoodlet(s)).toEqual({ key: 'ml.tea', v: 1 });
    s.slot++; expect(useObject(s, 'tea', true).ok).toBe(true); expect(s.stress).toBe(44); expect(teaMoodlet(s)).toEqual({ key: 'ml.samovar', v: 2 });
    expect(useObject(s, 'sit').pose).toBe('sit');
  });
  it('every home has a stove to cook at and a television to watch', () => {
    for (const o of G.origins) { const acts = designOf(G.newState('T', o.id)).props.map(p => p.action); expect(acts, o.id).toContain('cook'); }      // even the shared room and the dorm have a hot plate
    expect(HOMES.length).toBeGreaterThanOrEqual(5);
    expect(furnById('stove-2')!.action).toBe('cook'); expect(furnById('tv-2')!.action).toBe('tv'); expect(furnById('samovar')!.action).toBe('samovar'); expect(furnById('kettle-stand')!.action).toBe('tea');
  });
});

describe('buying furniture with second thoughts', () => {
  it('a purchase can be taken back for the full price within ten seconds, even after it was put down, and not after', () => {
    const s = fresh(); const t0 = Date.now();
    expect(buyFurn(s, 'stool').ok).toBe(true); const price = furnById('stool')!.price; expect(s.money).toBe(100000 - price);
    expect(undoBuy(s, t0 + 2000).ok).toBe(true); expect(s.money).toBe(100000); expect(furnOf(s).stock.stool).toBeUndefined();
    buyFurn(s, 'stool'); expect(undoBuy(s, Date.now() + UNDO_MS + 1).ok).toBe(false); expect(s.money).toBe(100000 - price);
    const p = fresh(); buyFurn(p, 'stool'); let placed = false;
    for (let i = 0; i < 20 && !placed; i++) for (let j = 0; j < 20 && !placed; j++) placed = placeFurn(p, 'stool', i, j, 0).ok;
    expect(placed).toBe(true); expect(undoBuy(p).ok).toBe(true); expect(furnOf(p).placed.some(x => x.id === 'stool')).toBe(false); expect(p.money).toBe(100000);
  });
  it('things in the stock sell back for half; the wishlist keeps names; the catalogue searches everything, sorts and filters', () => {
    const s = fresh(); buyFurn(s, 'sofa-2'); const price = furnById('sofa-2')!.price;
    expect(sellBack(s, 'sofa-2').ok).toBe(true); expect(s.money).toBe(100000 - price + Math.floor(price / 2)); expect(sellBack(s, 'sofa-2').ok).toBe(false);
    expect(toggleWish(s, 'piano')).toBe(true); expect(onWishlist(s, 'piano')).toBe(true); expect(catalogue(s, { wish: true }).map(f => f.id)).toEqual(['piano']); expect(toggleWish(s, 'piano')).toBe(false);
    const sofas = catalogue(s, { cat: 'design', q: 'sofa' }); expect(sofas.length).toBeGreaterThanOrEqual(3); expect(sofas.every(f => f.name.toLowerCase().includes('sofa'))).toBe(true);
    const dear = catalogue(s, { cat: 'luxury', sort: 'dear' }); for (let i = 1; i < dear.length; i++) expect(dear[i].price).toBeLessThanOrEqual(dear[i - 1].price);
    buyFurn(s, 'stool'); expect(catalogue(s, { cat: 'all', owned: true }).map(f => f.id)).toEqual(['stool']);
    expect(catalogue(s, { cat: 'all' }).length).toBe(FURNITURE.length);
  });
});

describe('the Buy mode screen', () => {
  let s: G.State, placing: string | null, notes: string[];
  const world = { placing: () => (placing ? { id: placing, rot: 0, i: 0, j: 0, ok: true } : null), setPlacing: (id: string | null) => { placing = id; }, rotatePlacing: () => undefined, refreshRoom: () => undefined, setBuild: () => undefined } as never;
  const box = (): HTMLElement => { const b = document.createElement('div'); drawFurnPanel(b, s, world, { notify: m => notes.push(m), changed: () => undefined, hide: () => undefined }); return b; };
  beforeEach(() => { s = fresh(); placing = null; notes = []; resetFurnPanel(); });
  it('asks "Buy ... for ...?" before any money is spent, then puts the piece down; Undo gives the money back', () => {
    const b = box(); const card = b.querySelector<HTMLButtonElement>('.furnCard')!; const id = card.dataset.id!, price = furnById(id)!.price;
    card.click(); expect(s.money).toBe(100000); expect(b.querySelector('.furnAsk')!.textContent).toContain(furnById(id)!.name);
    b.querySelector<HTMLButtonElement>('#fuNo')!.click(); expect(b.querySelector('.furnAsk')).toBeNull(); expect(s.money).toBe(100000);
    b.querySelector<HTMLButtonElement>(`.furnCard[data-id="${id}"]`)!.click(); b.querySelector<HTMLButtonElement>('#fuYes')!.click();
    expect(s.money).toBe(100000 - price); expect(placing).toBe(id);
    b.querySelector<HTMLButtonElement>('#fuUndo')!.click(); expect(s.money).toBe(100000); expect(placing).toBeNull();
  });
  it('the search box, the sort, the owned filter and the wishlist hearts work; a poor player is told instead of asked', () => {
    const b = box(); b.querySelector<HTMLButtonElement>('[data-cat="kitchen"]')!.click();
    const q = b.querySelector<HTMLInputElement>('#fuQ')!; q.value = 'samovar'; q.dispatchEvent(new Event('input'));
    expect(Array.from(b.querySelectorAll<HTMLElement>('.furnCard')).map(c => c.dataset.id)).toEqual(['samovar']);
    b.querySelector<HTMLButtonElement>('[data-wish="samovar"]')!.click(); expect(onWishlist(s, 'samovar')).toBe(true); expect(b.querySelector('[data-wish="samovar"]')!.textContent).toBe('♥');
    q.value = ''; b.querySelector<HTMLInputElement>('#fuQ')!.value = ''; b.querySelector<HTMLInputElement>('#fuQ')!.dispatchEvent(new Event('input'));
    b.querySelector<HTMLButtonElement>('#fuOwned')!.click(); expect(b.querySelectorAll('.furnCard').length).toBe(0); expect(b.textContent).toContain('Nothing here');
    s.money = 10; b.querySelector<HTMLButtonElement>('#fuOwned')!.click(); b.querySelector<HTMLButtonElement>('.furnCard')!.click();
    expect(b.querySelector('.furnAsk')).toBeNull(); expect(notes.pop()).toContain('Not enough');
  });
});
