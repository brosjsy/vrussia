import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { FURNITURE, FURN_CATS, furnById, inCat, furnOf, buyFurn, placeFurn, pickUp, canPlace, homeInterior, repairFurn, totalStars, sizeOf, gridOf, centreOf } from '../src/furniture';
import { interiorFor, findPath, doorOf, SPECIAL, useSpot } from '../src/interiors';

const fresh = (): G.State => { const s = G.newState('T', 'moscow'); s.money = 1_000_000; return s; };
/** The first free cell for an item (scanning the flat), or null. */
const freeCell = (s: G.State, id: string, rot: 0 | 1 = 0): { i: number; j: number } | null => {
  const f = furnById(id)!, g = gridOf(interiorFor('home', s)!);
  for (let j = 0; j < g.rows; j++) for (let i = 0; i < g.cols; i++) if (canPlace(s, f, i, j, rot).ok) return { i, j };
  return null;
};

describe('the catalogue', () => {
  it('has unique items in all eleven tabs, with sensible sizes, prices and stars', () => {
    expect(new Set(FURNITURE.map(f => f.id)).size).toBe(FURNITURE.length); expect(FURN_CATS.length).toBe(11);
    for (const c of FURN_CATS) expect(inCat(c.id).length, c.id).toBeGreaterThanOrEqual(3);
    for (const f of FURNITURE) {
      expect(f.w, f.id).toBeGreaterThanOrEqual(1); expect(f.w).toBeLessThanOrEqual(3); expect(f.d).toBeGreaterThanOrEqual(1); expect(f.d).toBeLessThanOrEqual(2);
      expect(f.price, f.id).toBeGreaterThan(100); expect(Number.isInteger(f.price)).toBe(true); expect(f.name.length).toBeGreaterThan(3); expect(f.color).toMatch(/^#[0-9a-f]{6}$/);
      if (f.stars !== undefined) { expect(f.stars).toBeGreaterThanOrEqual(1); expect(f.stars).toBeLessThanOrEqual(4); }
      expect(f.h, f.id).toBeGreaterThanOrEqual(0);
    }
    for (const c of FURN_CATS) { const l = inCat(c.id); for (let k = 1; k < l.length; k++) expect(l[k].price).toBeGreaterThanOrEqual(l[k - 1].price); }
    expect(Math.min(...FURNITURE.map(f => f.price))).toBeLessThan(1500); expect(Math.max(...FURNITURE.map(f => f.price))).toBeGreaterThan(80000);
  });
  it('every item that can be used points at a real game action or a known special one (washing)', () => {
    const real = new Set(G.actions.map(a => a.id));
    for (const f of FURNITURE) if (f.action) expect(real.has(f.action) || (SPECIAL as readonly string[]).includes(f.action), f.id).toBe(true);
  });
});

describe('buying', () => {
  it('takes the money and puts the piece in the stock; the same piece can be bought twice', () => {
    const s = fresh(), m0 = s.money, f = furnById('armchair')!;
    expect(buyFurn(s, 'armchair').ok).toBe(true); expect(s.money).toBe(m0 - f.price); expect(furnOf(s).stock.armchair).toBe(1);
    buyFurn(s, 'armchair'); expect(furnOf(s).stock.armchair).toBe(2); expect(s.money).toBe(m0 - 2 * f.price);
  });
  it('refuses when there is not enough money or no such thing, and changes nothing', () => {
    const s = fresh(); s.money = 100; const before = JSON.stringify(s);
    expect(buyFurn(s, 'piano').ok).toBe(false); expect(buyFurn(s, 'nothing').ok).toBe(false); expect(JSON.stringify(s)).toBe(before.replace('"furn"', '"furn"'));
    expect(s.money).toBe(100); expect(Object.keys(furnOf(s).stock)).toEqual([]);
    s.money = furnById('stool')!.price; expect(buyFurn(s, 'stool').ok).toBe(true); expect(s.money).toBe(0);
  });
});

describe('placing', () => {
  it('puts a bought piece in a free place, counts it once, and shows it in the flat', () => {
    const s = fresh(); buyFurn(s, 'sofa-2'); const c = freeCell(s, 'sofa-2')!; expect(c).toBeTruthy();
    expect(placeFurn(s, 'sofa-2', c.i, c.j, 0).ok).toBe(true); expect(furnOf(s).placed.length).toBe(1); expect(furnOf(s).stock['sofa-2']).toBeUndefined();
    expect(placeFurn(s, 'sofa-2', c.i, c.j, 0).ok).toBe(false);                          // none left in the stock
    const home = homeInterior(s), mine = home.props.filter(p => p.uid !== undefined); expect(mine.length).toBe(1); expect(mine[0].icon).toBe('🛋️');
    expect(home.props.length).toBe(interiorFor('home', s)!.props.length + 1);
    expect(totalStars(s)).toBe(2);
  });
  it('does not fit on the fixed furniture, outside the walls, in the doorway or on another piece', () => {
    const s = fresh(); buyFurn(s, 'sofa-2'); buyFurn(s, 'sofa-2'); const f = furnById('sofa-2')!;
    const home = interiorFor('home', s)!, bed = home.props.find(p => p.kind === 'bed')!;
    const bi = Math.floor(bed.x + home.w / 2 - 0.5), bj = Math.floor(bed.z + home.d / 2 - 0.5);
    expect(canPlace(s, f, bi, bj, 0).ok).toBe(false);
    expect(canPlace(s, f, -1, 3, 0).ok).toBe(false); expect(canPlace(s, f, 13, 3, 0).ok).toBe(false); expect(canPlace(s, f, 3, 11, 0).ok).toBe(false); expect(canPlace(s, f, 3, -1, 0).ok).toBe(false);
    const door = doorOf(home), di = Math.floor(door.x + home.w / 2 - 1), dj = Math.floor(door.z + home.d / 2 - 1);
    expect(canPlace(s, f, di, dj, 0).ok).toBe(false); expect(canPlace(s, f, di, dj, 0).why).toMatch(/door/);
    const c = freeCell(s, 'sofa-2')!; expect(placeFurn(s, 'sofa-2', c.i, c.j, 0).ok).toBe(true);
    expect(canPlace(s, f, c.i, c.j, 0).ok).toBe(false); expect(canPlace(s, f, c.i + 1, c.j, 0).ok).toBe(false);
    expect(placeFurn(s, 'sofa-2', c.i, c.j, 0).msg).toMatch(/does not fit|do not have/);
  });
  it('turning a piece swaps its width and depth', () => {
    const f = furnById('sofa-3')!; expect(sizeOf(f, 0)).toEqual({ w: 3, d: 1 }); expect(sizeOf(f, 1)).toEqual({ w: 1, d: 3 });
    const s = fresh(); const home = interiorFor('home', s)!; const a = centreOf(home, f, 2, 2, 0), b = centreOf(home, f, 2, 2, 1);
    expect(a.x).toBeCloseTo(-home.w / 2 + 3.5, 5); expect(b.x).toBeCloseTo(-home.w / 2 + 2.5, 5); expect(b.z).toBeCloseTo(-home.d / 2 + 3.5, 5);
    buyFurn(s, 'sofa-3'); const c = freeCell(s, 'sofa-3', 1)!; expect(c).toBeTruthy(); expect(placeFurn(s, 'sofa-3', c.i, c.j, 1).ok).toBe(true);
    const mine = homeInterior(s).props.find(p => p.uid !== undefined)!; expect(Math.abs(Math.sin(mine.ry ?? 0))).toBeCloseTo(1, 5);
  });
  it('wall pieces hang on the back wall, cover no floor and cannot overlap each other', () => {
    const s = fresh(); buyFurn(s, 'rug-wall'); buyFurn(s, 'ac-wall'); const a = furnById('rug-wall')!, b = furnById('ac-wall')!;
    expect(canPlace(s, a, 0, 99, 0).ok).toBe(true);                                       // the row does not matter on a wall
    expect(canPlace(s, a, -1, 0, 0).ok).toBe(false); expect(canPlace(s, a, gridOf(interiorFor('home', s)!).cols - 1, 0, 0).ok).toBe(false);
    expect(placeFurn(s, 'rug-wall', 4, 0, 0).ok).toBe(true); expect(canPlace(s, b, 5, 0, 0).ok).toBe(false); expect(canPlace(s, b, 7, 0, 0).ok).toBe(true);
    const mine = homeInterior(s).props.find(p => p.uid !== undefined)!; expect(mine.wallItem).toBe(true); expect(mine.z).toBeLessThan(-4.5);
    const bed = interiorFor('home', s)!.props.find(p => p.kind === 'bed')!; void bed;
    buyFurn(s, 'stool'); const c = freeCell(s, 'stool')!; expect(c).toBeTruthy();                   // a wall piece does not take floor space
  });
  it('never closes the way to a thing that can be used', () => {
    const s = fresh(); for (let k = 0; k < 40; k++) buyFurn(s, 'stool');
    const home0 = interiorFor('home', s)!; let placed = 0;
    for (let j = 0; j < 11; j++) for (let i = 0; i < 14; i++) if (placeFurn(s, 'stool', i, j, 0).ok) placed++;
    expect(placed).toBeGreaterThan(5);
    const home = homeInterior(s), door = doorOf(home), start = { x: door.x, z: door.z - 1 };
    for (const p of home.props.filter(q => q.action && !q.action.startsWith('act:'))) { const goal = useSpot(home, p); expect(findPath(home, start, goal).length, `${p.kind} ${p.action}`).toBeGreaterThan(0); }
    expect(home0.props.length).toBeLessThan(home.props.length);
  });
});

describe('taking pieces back and old saves', () => {
  it('picks a piece up into the stock without a refund, and not twice', () => {
    const s = fresh(); buyFurn(s, 'armchair'); const c = freeCell(s, 'armchair')!; placeFurn(s, 'armchair', c.i, c.j, 0);
    const uid = furnOf(s).placed[0].uid, m = s.money;
    expect(pickUp(s, uid).ok).toBe(true); expect(furnOf(s).placed.length).toBe(0); expect(furnOf(s).stock.armchair).toBe(1); expect(s.money).toBe(m);
    expect(pickUp(s, uid).ok).toBe(false);
  });
  it('a game saved without furniture, or with a damaged furniture book, starts clean and repairs itself', () => {
    const s = fresh(); expect(furnOf(s)).toEqual({ placed: [], stock: {}, next: 1 });
    (s as unknown as { furn: unknown }).furn = { placed: 'oops', stock: 3 }; expect(furnOf(s)).toEqual({ placed: [], stock: {}, next: 1 });
    (s as unknown as { furn: unknown }).furn = { next: 5, stock: { ghost: 2, stool: 1, bad: -4 }, placed: [{ uid: 3, id: 'stool', i: 0, j: 0, rot: 0 }, { uid: 4, id: 'unknown-thing', i: 1, j: 1, rot: 0 }, { uid: 5, id: 'stool', i: 1.5, j: 2, rot: 0 }, { uid: 6, id: 'sofa-2', i: 6, j: 5, rot: 0 }, { uid: 7, id: 'sofa-2', i: 6, j: 5, rot: 0 }] };
    repairFurn(s); const fs = furnOf(s);
    expect(fs.placed.map(p => p.uid).sort()).not.toContain(4); expect(fs.stock.ghost).toBeUndefined(); expect(fs.stock.bad).toBeUndefined();
    expect(new Set(fs.placed.map(p => p.uid)).size).toBe(fs.placed.length); expect(fs.next).toBeGreaterThan(Math.max(...fs.placed.map(p => p.uid)));
    const sofas = fs.placed.filter(p => p.id === 'sofa-2').length; expect(sofas).toBeLessThanOrEqual(1);          // two on the same spot cannot both stay
    expect(JSON.parse(JSON.stringify(s)).furn.placed.length).toBe(fs.placed.length);
  });
});
