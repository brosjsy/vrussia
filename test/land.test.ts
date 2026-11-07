// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import * as L from '../src/land';
import { landHtml } from '../src/land-ui';

const fresh = (origin = 'moscow', money = 5_000_000): G.State => { const s = G.newState('T', origin); s.queue = []; s.money = money; s.flags.sim = true; return s; };
const shopOffer = (s: G.State): L.Offer => L.offersFor(s).find(o => o.purpose === 'shop') as L.Offer;
/** Buys a shop plot, gets the permit and enough materials, and builds a closed 6x5 shop with everything the shop needs. */
function buildShop(s: G.State): L.Plot {
  let o = L.offersFor(s).find(x => x.purpose === 'shop' && x.cols >= 6 && x.rows >= 5);
  for (let k = 0; !o && k < 30; k++) { s.day += 30; o = L.offersFor(s).find(x => x.purpose === 'shop' && x.cols >= 6 && x.rows >= 5); }
  expect(L.buyPlot(s, (o as L.Offer).id).ok).toBe(true);
  const p = L.landOf(s).plots.at(-1) as L.Plot;
  L.askPermit(s, p.id); s.day += 3; L.settle(s);
  for (const m of L.MATERIALS) L.landOf(s).stock[m.id] = 200;
  const W = p.cols - 2, H = p.rows - 2;                                   // the building leaves a margin of one square for the sign
  for (let i = 0; i <= W; i++) { L.drop(s, p.id, 'wall', i, 0); L.drop(s, p.id, 'wall', i, H); }
  for (let j = 1; j < H; j++) { L.drop(s, p.id, 'wall', 0, j); L.drop(s, p.id, 'wall', W, j); }
  for (let j = 1; j < H; j++) for (let i = 1; i < W; i++) L.drop(s, p.id, 'floor', i, j);
  L.lift(s, p.id, 1, 0); L.drop(s, p.id, 'door', 1, 0);                  // a door in the top wall
  L.lift(s, p.id, 2, 1); L.drop(s, p.id, 'counter', 2, 1);
  L.lift(s, p.id, 3, 1); L.drop(s, p.id, 'shelf', 3, 1);
  L.drop(s, p.id, 'sign', p.cols - 1, p.rows - 1);
  return L.plotOf(s, p.id) as L.Plot;
}

describe('plots', () => {
  it('six plots are for sale in the city, the same all month, dearer in Moscow than in a small town, and a shop plot costs more than a housing plot of the same size', () => {
    const a = fresh('moscow'), b = fresh('region');
    const oa = L.offersFor(a), ob = L.offersFor(b);
    expect(oa.length).toBe(6); expect(L.offersFor(a)).toEqual(oa);
    const per = (o: L.Offer): number => o.price / (o.cols * o.rows * L.CELL_M2);
    expect(Math.min(...oa.map(per))).toBeGreaterThan(Math.max(...ob.map(per)));
    a.day += 31; expect(L.offersFor(a)).not.toEqual(oa);
  });
  it('buying costs the price and the registration duty, needs the money, and the same plot cannot be bought twice', () => {
    const s = fresh('moscow', 10_000_000), o = L.offersFor(s)[0];
    const r = L.buyPlot(s, o.id);
    expect(r.ok).toBe(true); expect(s.money).toBe(10_000_000 - o.price - L.REGISTRATION_FEE);
    expect(L.buyPlot(s, o.id).ok).toBe(false);
    const poor = fresh('tajik', 50_000);
    const bad = L.buyPlot(poor, L.offersFor(poor)[0].id);
    expect(bad.ok).toBe(false); expect(poor.money).toBe(50_000);
    expect(L.buyPlot(s, 'nonsense').ok).toBe(false);
  });
  it('a foreign newcomer can buy city land like anyone else', () => {
    const s = fresh('worker', 3_000_000);
    expect(L.buyPlot(s, L.offersFor(s)[0].id).ok).toBe(true);
  });
  it('land tax is charged once a year at 0.3% for housing and 1.5% for the rest of the cadastral value, and paying clears it', () => {
    const s = fresh('moscow', 20_000_000);
    L.buyPlot(s, L.offersFor(s).find(o => o.purpose === 'home')!.id); L.buyPlot(s, shopOffer(s).id);
    const [h, sh] = L.landOf(s).plots;
    expect(L.taxPerYear(h)).toBe(Math.round(Math.round(h.price * 0.8) * 0.003)); expect(L.taxPerYear(sh)).toBe(Math.round(Math.round(sh.price * 0.8) * 0.015));
    expect(L.taxDue(s)).toBe(0); s.day += 364; expect(L.taxDue(s)).toBe(0); s.day += 1;
    expect(L.taxDue(s)).toBe(L.taxPerYear(h) + L.taxPerYear(sh));
    const before = s.money; expect(L.payTax(s).ok).toBe(true); expect(s.money).toBe(before - (L.taxPerYear(h) + L.taxPerYear(sh))); expect(L.taxDue(s)).toBe(0); expect(L.payTax(s).ok).toBe(false);
  });
});

describe('permits and materials', () => {
  it('walls need the permit; the permit comes after a wait; a housing plot is quicker than a shop plot', () => {
    const s = fresh(); L.buyPlot(s, shopOffer(s).id); const p = L.landOf(s).plots[0];
    L.landOf(s).stock.brick = 5;
    expect(L.drop(s, p.id, 'wall', 0, 0).ok).toBe(false);
    expect(L.askPermit(s, p.id).ok).toBe(true); expect(L.askPermit(s, p.id).ok).toBe(false);
    L.settle(s); expect(p.permit).toBe('asked');
    s.day += L.permitDays(p); expect(L.settle(s).join()).toContain('permit'); expect(p.permit).toBe('granted');
    expect(L.drop(s, p.id, 'wall', 0, 0).ok).toBe(true);
    expect(L.permitDays({ ...p, purpose: 'home' })).toBeLessThan(L.permitDays(p));
  });
  it('ordering takes money, arrives later, has limits, and a floor needs no permit but does need boards', () => {
    const s = fresh(); const m0 = s.money;
    expect(L.orderMaterial(s, 'brick', 0).ok).toBe(false); expect(L.orderMaterial(s, 'brick', L.MAX_ORDER + 1).ok).toBe(false); expect(L.orderMaterial(s, 'gold', 1).ok).toBe(false);
    expect(L.orderMaterial(s, 'brick', 25).ok).toBe(true); expect(s.money).toBe(m0 - 25 * 900);
    expect(L.landOf(s).stock.brick ?? 0).toBe(0);
    s.day += L.deliveryDays(25); L.settle(s); expect(L.landOf(s).stock.brick).toBe(25);
    const poor = fresh('tajik', 100); expect(L.orderMaterial(poor, 'door', 1).ok).toBe(false); expect(poor.money).toBe(100);
  });
});

describe('the designer', () => {
  it('stays inside the plot, refuses a used square, uses materials and gives them back when a piece is picked up', () => {
    const s = fresh(); L.buyPlot(s, L.offersFor(s)[0].id); const p = L.landOf(s).plots[0];
    L.landOf(s).stock.board = 3;
    expect(L.drop(s, p.id, 'floor', -1, 0).ok).toBe(false); expect(L.drop(s, p.id, 'floor', p.cols, 0).ok).toBe(false); expect(L.drop(s, p.id, 'floor', 0.5, 0).ok).toBe(false);
    expect(L.drop(s, p.id, 'floor', 0, 0).ok).toBe(true); expect(L.landOf(s).stock.board).toBe(2);
    expect(L.drop(s, p.id, 'floor', 0, 0).ok).toBe(false);
    expect(L.drop(s, p.id, 'bogus', 1, 1).ok).toBe(false);
    expect(L.lift(s, p.id, 0, 0)).toMatchObject({ ok: true, piece: 'floor' }); expect(L.landOf(s).stock.board).toBe(3);
    expect(L.lift(s, p.id, 0, 0).ok).toBe(false);
    L.landOf(s).stock.board = 0; expect(L.drop(s, p.id, 'floor', 1, 1).msg).toContain('Order more');
  });
  it('knows an open fence from a closed building with a door', () => {
    const s = fresh(); const p = buildShop(s);
    const c = L.inspect(p);
    expect(c.closed).toBe(true); expect(c.entrance).toBe(true); expect(c.counters).toBeGreaterThanOrEqual(1); expect(c.problems).toEqual([]);
    L.lift(s, p.id, 0, 2);                                              // a hole in the wall: the room is no longer closed
    expect(L.inspect(L.plotOf(s, p.id) as L.Plot).closed).toBe(false);
  });
});

describe('opening the shop', () => {
  it('needs a real building, the right papers and the cash register, then becomes the player business, and closing it releases the building', () => {
    const s = fresh(); const p = buildShop(s);
    const before = s.money;
    const r = L.openShop(s, p.id, '  <b>Corner</b> shop ');
    expect(r.ok).toBe(true); expect(s.money).toBe(before - L.CASH_REGISTER);
    expect(s.biz).toMatchObject({ kind: 'shop', name: 'bCorner/b shop', regime: 'ip' }); expect(s.flags.bizOpened).toBe(true);
    expect(L.openShop(s, p.id, 'again').ok).toBe(false);
    expect(L.lift(s, p.id, 2, 1).ok).toBe(false);                        // open for business: no rebuilding
    expect(L.closeShop(s, p.id).ok).toBe(true); expect(s.biz).toBeNull(); expect(L.lift(s, p.id, 3, 1).ok).toBe(true);
    expect(G.BIZ_KINDS.some(k => k.id === 'shop')).toBe(true);
    const wk = G.bizWeek({ ...s, biz: { kind: 'shop', name: 'x', level: 1, staff: 0, rep: 50, regime: 'npd', profit: 0, weeks: 0, revenueYear: 0 } } as G.State);
    expect(wk[0]).toContain('sales');
  });
  it('refuses a housing plot, an unfinished building, someone who is not registered, and someone who cannot pay', () => {
    const s = fresh(); const home = L.offersFor(s).find(o => o.purpose === 'home')!; L.buyPlot(s, home.id);
    expect(L.openShop(s, L.landOf(s).plots[0].id, 'x').ok).toBe(false);
    const t = fresh(); L.buyPlot(t, shopOffer(t).id); expect(L.openShop(t, L.landOf(t).plots[0].id, 'x').ok).toBe(false);
    const m = fresh('tajik', 5_000_000); m.docs.reg = 0; const pm = buildShop(m);
    expect(L.openShop(m, pm.id, 'x').msg).toContain('registered');
    m.docs.reg = 30; m.money = 100; expect(L.openShop(m, pm.id, 'x').msg).toContain('cash register');
  });
});

describe('old or broken saves', () => {
  it('a broken land record is replaced by an empty one and does not crash the screen', () => {
    const s = fresh(); (s as unknown as { land: unknown }).land = { plots: 'x', stock: null };
    expect(L.landOf(s).plots).toEqual([]);
    expect(landHtml(s)).toContain('Land');
  });
});

describe('the Land & shop screen (pick and drop)', () => {
  it('buys a plot, orders, picks a piece, drops it on a square, picks it up again and tells the player why when it cannot', async () => {
    const { openLand } = await import('../src/land-ui');
    const s = fresh(); const host = document.createElement('div'); document.body.appendChild(host);
    let refreshed = 0; openLand(host, s, { back: () => undefined, refresh: () => { refreshed++; }, notify: () => undefined });
    (host.querySelector('[data-lbuy]') as HTMLButtonElement).click();
    expect(L.landOf(s).plots.length).toBe(1); expect(refreshed).toBe(1);
    (host.querySelector('[data-lt="mats"]') as HTMLButtonElement).click();
    const f = host.querySelector('form[data-lord="board"]') as HTMLFormElement; (f.querySelector('input') as HTMLInputElement).value = '3';
    f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    expect(host.textContent).toContain('ordered');
    s.day += 2;
    (host.querySelector('[data-lt="design"]') as HTMLButtonElement).click();
    (host.querySelector('[data-lcell="0,0"]') as HTMLButtonElement).click();
    expect(host.querySelector('.phNote')!.textContent).toContain('Choose a piece');
    (host.querySelector('[data-lhand="floor"]') as HTMLButtonElement).click();
    (host.querySelector('[data-lcell="0,0"]') as HTMLButtonElement).click();
    expect(host.querySelector('[data-lcell="0,0"]')!.classList.contains('floor')).toBe(true);
    (host.querySelector('[data-lcell="0,0"]') as HTMLButtonElement).click();               // pick it up again: it goes to the hand
    expect(host.querySelector('[data-lcell="0,0"]')!.classList.contains('floor')).toBe(false);
    (host.querySelector('[data-lhand="wall"]') as HTMLButtonElement).click();
    (host.querySelector('[data-lcell="1,1"]') as HTMLButtonElement).click();
    expect(host.querySelector('.phNote')!.textContent).toMatch(/permit|notification/i);
    host.remove();
  });
});
