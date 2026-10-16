// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { THINGS, thingFor, keyFor, doActivity, leftNow, tagsOf, PER_SLOT } from '../src/activities';
import { needsOf } from '../src/needs';
import { interiorFor } from '../src/interiors';
import { FURNITURE, buyFurn, placeFurn, canPlace, homeInterior, gridOf } from '../src/furniture';

const fresh = (): G.State => { const s = G.newState('A', 'moscow'); s.queue = []; s.money = 1_000_000; s.stress = 40; s.energy = 60; return s; };

describe('the things and their activities', () => {
  it('every thing has a name, a flavour line and at least one activity with a sensible time, price and gift', () => {
    expect(new Set(THINGS.map(t => t.key)).size).toBe(THINGS.length);
    for (const t of THINGS) {
      expect(t.name.length).toBeGreaterThan(2); expect(t.flavour.length).toBeGreaterThan(10); expect(t.list.length).toBeGreaterThanOrEqual(1);
      expect(new Set(t.list.map(a => a.id)).size).toBe(t.list.length);
      for (const a of t.list) { expect(a.secs, `${t.key} ${a.id}`).toBeGreaterThanOrEqual(5); expect(a.secs).toBeLessThanOrEqual(30); expect(a.cost).toBeGreaterThanOrEqual(0); expect(a.cost).toBeLessThanOrEqual(100); expect(Object.keys(a.give).length).toBeGreaterThan(0); for (const v of Object.values(a.give)) expect(v).toBeGreaterThan(0); expect(Math.max(...Object.values(a.give) as number[])).toBeLessThanOrEqual(40); }
    }
  });
  it('the bought pieces that offer activities exist in the catalogue, and the keys are found by kind or by piece', () => {
    for (const t of THINGS) if (!['chair', 'table', 'plant', 'tv', 'window', 'rug', 'item'].includes(t.key)) expect(FURNITURE.some(f => f.id === t.key), t.key).toBe(true);
    expect(keyFor('chair')).toBe('chair'); expect(keyFor('item', 'guitar')).toBe('guitar'); expect(keyFor('item', 'washer')).toBe('item'); expect(keyFor('bed')).toBeNull(); expect(keyFor('zzz', 'nothing')).toBeNull();
    expect(thingFor('guitar')?.name).toBe('Guitar'); expect(thingFor('nope')).toBeUndefined();
  });
  it('tags show what an activity gives', () => {
    const a = thingFor('chair')!.list[0]; expect(tagsOf(a)).toEqual(['+Social']); expect(tagsOf(thingFor('samovar')!.list[0]).sort()).toEqual(['+Calm', '+Food', '+Social']);
  });
});

describe('doing one', () => {
  it('gives what it gives and takes what it costs, once counted against the three of the part of the day', () => {
    const s = fresh(); needsOf(s).social = 30; const m = s.money;
    const r = doActivity(s, 'chair', 'gossip'); expect(r).toMatchObject({ ok: true, secs: 7, pose: 'talk' }); expect(needsOf(s).social).toBe(38); expect(s.money).toBe(m); expect(leftNow(s)).toBe(PER_SLOT - 1);
    const t = doActivity(s, 'chair', 'tea'); expect(t.ok).toBe(true); expect(s.money).toBe(m - 20); expect(s.stress).toBe(38); expect(needsOf(s).hunger).toBe(84);
  });
  it('allows three in each part of the day and refuses the fourth, and a new part of the day starts again', () => {
    const s = fresh(); for (let i = 0; i < PER_SLOT; i++) expect(doActivity(s, 'plant', 'water').ok).toBe(true);
    expect(leftNow(s)).toBe(0); const no = doActivity(s, 'plant', 'water'); expect(no.ok).toBe(false); expect(no.msg).toMatch(/Enough/); G.advance(s); expect(leftNow(s)).toBe(PER_SLOT); expect(doActivity(s, 'plant', 'water').ok).toBe(true);
  });
  it('keeps every need and stat inside its limits, even when asked for far too much', () => {
    const s = fresh(); Object.assign(needsOf(s), { hunger: 99, hygiene: 99, social: 99 }); s.stress = 1; s.energy = 99;
    for (let i = 0; i < 3; i++) doActivity(s, 'rug', 'stretch'); doActivity(s, 'bath-tub', 'soak'); const n = needsOf(s);
    for (const v of [n.hunger, n.hygiene, n.social]) { expect(v).toBeLessThanOrEqual(100); expect(v).toBeGreaterThanOrEqual(0); } expect(s.stress).toBeGreaterThanOrEqual(0); expect(s.energy).toBeLessThanOrEqual(100);
  });
  it('refuses when poor or when there is no such thing, and changes nothing', () => {
    const s = fresh(); s.money = 5; const before = JSON.stringify(s);
    expect(doActivity(s, 'easel', 'paint').ok).toBe(false); expect(doActivity(s, 'nothing', 'x').ok).toBe(false); expect(doActivity(s, 'chair', 'nothing').ok).toBe(false);
    expect(s.money).toBe(5); expect(JSON.parse(JSON.stringify(s)).stress).toBe(JSON.parse(before).stress);
  });
  it('a bath is a real wash and a day of little things cannot be worth more than a real action', () => {
    const s = fresh(); needsOf(s).hygiene = 10; doActivity(s, 'bath-tub', 'soak'); expect(needsOf(s).hygiene).toBe(50);
    const t = fresh(); const e = t.energy, st = t.stress; for (let i = 0; i < 3; i++) doActivity(t, 'tv', 'series'); expect(st - t.stress).toBeLessThanOrEqual(9); expect(t.energy).toBe(e);
  });
});

describe('in the flat', () => {
  it('the chair, the table, the plant, the television, the window and the rug of the flat are things to use, and the others keep their own actions', () => {
    const home = interiorFor('home', fresh())!; const acts = home.props.filter(p => p.action?.startsWith('act:')).map(p => p.action);
    for (const k of ['act:chair', 'act:table', 'act:plant', 'act:tv', 'act:window', 'act:rug']) expect(acts, k).toContain(k);
    expect(home.props.find(p => p.kind === 'bed')!.action).toBe('home'); expect(home.props.find(p => p.kind === 'fridge')!.action).toBe('food'); expect(home.props.find(p => p.action === 'wash')).toBeTruthy();
    expect(home.props.find(p => p.action === 'act:tv')!.label).toContain('Television');
  });
  it('other rooms are unchanged, and a placed guitar is a thing to use but a placed bed keeps its own action', () => {
    const s = fresh(); expect(interiorFor('bank', s)!.props.some(p => p.action?.startsWith('act:'))).toBe(false);
    buyFurn(s, 'guitar'); buyFurn(s, 'bed-single'); const f = (id: string): { i: number; j: number } => { const fu = FURNITURE.find(x => x.id === id)!, g = gridOf(interiorFor('home', s)!); for (let j = 0; j < g.rows; j++) for (let i = 0; i < g.cols; i++) if (canPlace(s, fu, i, j, 0).ok) return { i, j }; throw new Error('none'); };
    const a = f('guitar'); expect(placeFurn(s, 'guitar', a.i, a.j, 0).ok).toBe(true); const b = f('bed-single'); expect(placeFurn(s, 'bed-single', b.i, b.j, 0).ok).toBe(true);
    const mine = homeInterior(s).props.filter(p => p.uid !== undefined); expect(mine.find(p => p.fid === 'guitar')!.action).toBe('act:guitar'); expect(mine.find(p => p.fid === 'bed-single')!.action).toBe('home');
  });
});
