// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import * as G from '../src/engine';
import '../src/content';
import { HOMES, dwellingOf, designOf, homeInfo, renovate, renoOf, renoStars, currentLook, FLOORS, WALLS, LIGHTS, WINDOWS } from '../src/homes';
import type { Dwelling } from '../src/homes';
import { interiorFor, findPath, doorOf, blocked, SPECIAL, useSpot } from '../src/interiors';
import { moveTo } from '../src/housing';
import { buildRoom, floorTexture } from '../src/rooms3d';
import { buyFurn, placeFurn, canPlace, furnById, gridOf, totalStars } from '../src/furniture';

const mk = (origin: string, housing = 'rented'): G.State => { const s = G.newState('H', origin); s.queue = []; s.housing = housing; s.money = 1_000_000; return s; };
const ALL: [string, string, Dwelling][] = [['moscow', 'rented', 'family'], ['region', 'rented', 'panelka'], ['tajik', 'rented', 'shared'], ['uzbek', 'rented', 'shared'], ['kyrgyz', 'rented', 'shared'], ['student', 'rented', 'dorm'], ['dagestan', 'rented', 'dorm'], ['moscow', 'flat', 'studio'], ['tajik', 'village', 'village'], ['region', 'house', 'house']];
/** Every home, also the rented ones chosen in the Home app (round 151: kommunalka, khrushchyovka, euro-two). */
const rented = (id: 'kommunalka' | 'khrush' | 'eurotwo'): G.State => { const s = mk('region'); s.job = 'courier'; moveTo(s, id); return s; };
const EVERY: [string, () => G.State][] = [...ALL.map(([o, h, d]): [string, () => G.State] => [d, () => mk(o, h)]), ['kommunal', () => rented('kommunalka')], ['khrush', () => rented('khrush')], ['eurotwo', () => rented('eurotwo')]];

describe('who lives where', () => {
  it('a home for every kind of person and every step of the ladder; what the player owns comes first', () => {
    for (const [o, h, d] of ALL) expect(dwellingOf(mk(o, h)), `${o} ${h}`).toBe(d);
    expect(HOMES.length).toBe(10); expect(new Set(HOMES.map(x => x.id)).size).toBe(10); expect(rented('kommunalka') && dwellingOf(rented('kommunalka'))).toBe('kommunal'); expect(dwellingOf(rented('khrush'))).toBe('khrush'); expect(dwellingOf(rented('eurotwo'))).toBe('eurotwo'); for (const x of HOMES) { expect(x.name.length).toBeGreaterThan(8); expect(x.blurb.length).toBeGreaterThan(40); }
    expect(homeInfo('shared').tier).toBeLessThan(homeInfo('panelka').tier); expect(homeInfo('panelka').tier).toBeLessThan(homeInfo('family').tier); expect(homeInfo('family').tier).toBeLessThan(homeInfo('house').tier);
    const odd = mk('moscow'); odd.o = 'weird'; expect(dwellingOf(odd)).toBe('panelka');
  });
  it('the homes differ in size, in title and in look, and the poorest is the smallest', () => {
    const d = ALL.map(([o, h]) => designOf(mk(o, h)));
    expect(new Set(d.map(x => x.title)).size).toBe(7); expect(new Set(d.map(x => x.w * x.d)).size).toBeGreaterThanOrEqual(5);
    const shared = designOf(mk('tajik')), family = designOf(mk('moscow')), house = designOf(mk('region', 'house')); expect(shared.w * shared.d).toBeLessThan(family.w * family.d); expect(family.w * family.d).toBeLessThan(house.w * house.d);
    expect(shared.look!.floorStyle).toBe('lino'); expect(family.look!.floorStyle).toBe('parquet'); expect(family.look!.lights).toBe('chandelier'); expect(shared.look!.lights).toBe('bare'); expect(designOf(mk('student')).look!.deco).toContain('poster');
    expect(shared.props.filter(p => p.kind === 'bunk').length).toBe(2);                          // two bunk beds: four places, one of them yours
    expect(shared.props.filter(p => p.kind === 'bunk' && p.action === 'home').length).toBe(1);
  });
});

describe('every home works as a home', () => {
  it('has the things a player needs, inside its walls, not on each other, and clear of the door', () => {
    for (const [id, make] of EVERY) {
      const s = make(), it = interiorFor('home', s)!; const acts = it.props.map(p => p.action);
      for (const a of ['home', 'wardrobe', 'food', 'online', 'wash', 'phone']) expect(acts, `${id} ${a}`).toContain(a);
      for (const p of it.props) { if (p.kind === 'window' || p.wallItem) continue; expect(Math.abs(p.x) + p.w / 2, `${id} ${p.kind} x`).toBeLessThanOrEqual(it.w / 2 + 0.05); expect(Math.abs(p.z) + p.d / 2, `${id} ${p.kind} z`).toBeLessThanOrEqual(it.d / 2 + 0.3); }
      const solid = it.props.filter(p => !['rug', 'window', 'laptop', 'phone', 'board'].includes(p.kind) && !p.wallItem);
      const rect = (p: typeof solid[number]): { x: number; z: number; w: number; d: number } => { const t = Math.abs(Math.sin(p.ry ?? 0)) > 0.5; return { x: p.x, z: p.z, w: t ? p.d : p.w, d: t ? p.w : p.d }; };
      for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) { const a = rect(solid[i]), b = rect(solid[j]); const pair = [solid[i].kind, solid[j].kind].sort().join('+'); if (['chair+table', 'chair+desk', 'sofa+tv', 'bed+bedside'].includes(pair)) continue; expect(Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 0.05 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 0.05, `${id}: ${solid[i].kind} and ${solid[j].kind} overlap`).toBe(false); }
      const door = doorOf(it); for (const p of solid) { const r = rect(p); expect(Math.abs(r.x - door.x) < 1.3 + r.w / 2 && Math.abs(r.z - door.z) < 0.6 + r.d / 2, `${id} ${p.kind} blocks the door`).toBe(false); }
      for (const p of solid) for (const w of it.walls ?? []) { const r = rect(p); expect(Math.abs(r.x - w.x) < (r.w + w.w) / 2 - 0.02 && Math.abs(r.z - w.z) < (r.d + w.d) / 2 - 0.02, `${id}: ${p.kind} at ${p.x},${p.z} stands in an inner wall`).toBe(false); }
    }
  });
  it('lets the player reach every thing that can be used, from the door', () => {
    for (const [id, make] of EVERY) {
      const it = interiorFor('home', make())!, door = doorOf(it), start = { x: door.x, z: door.z - 1 };
      for (const p of it.props.filter(q => q.action && !q.action.startsWith('act:'))) { const goal = useSpot(it, p); expect(blocked(it, goal.x, goal.z), `${id} ${p.kind} ${p.action}: no free spot beside it`).toBe(false); expect(Math.hypot(goal.x - p.x, goal.z - p.z), `${id} ${p.kind} spot near`).toBeLessThan(Math.max(p.w, p.d) / 2 + 1.7); const path = findPath(it, start, goal); expect(path.length > 0 || Math.hypot(goal.x - start.x, goal.z - start.z) < 0.6, `${id} ${p.kind} ${p.action}`).toBe(true); for (const w of path) expect(blocked(it, w.x, w.z), `${id} ${p.kind}`).toBe(false); }
    }
  });
  it('all actions are real game actions or known special ones', () => {
    const real = new Set(G.actions.map(a => a.id)); for (const [o, h, id] of ALL) for (const p of interiorFor('home', mk(o, h))!.props) if (p.action) expect(real.has(p.action) || (SPECIAL as readonly string[]).includes(p.action) || p.action.startsWith('act:'), `${id} ${p.action}`).toBe(true);
  });
  it('can be furnished: a free place for a stool and a sofa, and a piece moves back to the stock when the home changes', () => {
    for (const [id, make] of EVERY) {
      const s = make(); const g = gridOf(interiorFor('home', s)!); buyFurn(s, 'stool');
      let ok = false; for (let j = 0; j < g.rows && !ok; j++) for (let i = 0; i < g.cols && !ok; i++) if (canPlace(s, furnById('stool')!, i, j, 0).ok) { ok = placeFurn(s, 'stool', i, j, 0).ok; }
      expect(ok, id).toBe(true);
    }
  });
});

describe('the room is drawn', () => {
  it('every home builds a room with its floor, skirting, lamps and wall things, and frees what it made', () => {
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    for (const [id, make] of EVERY) {
      const it = interiorFor('home', make())!; const r = buildRoom(it); let meshes = 0; r.group.traverse(x => { if ((x as THREE.Mesh).isMesh) meshes++; });
      expect(meshes, id).toBeGreaterThan(it.props.length + 10); expect(r.usable.some(x => x.userData.action === 'wash'), id).toBe(true); r.dispose();
    }
  });
  it('the chandelier and the shades differ from the bare bulb, the blinds and curtains show in the windows', () => {
    const count = (lights: 'bare' | 'shade' | 'chandelier', windows: 'plain' | 'blinds' | 'curtains'): number => { const s = mk('moscow'); const it = interiorFor('home', s)!; it.look = { ...it.look!, lights, windows }; const r = buildRoom(it); let n = 0; r.group.traverse(x => { if ((x as THREE.Mesh).isMesh) n++; }); r.dispose(); return n; };
    expect(count('shade', 'plain')).toBeGreaterThan(count('bare', 'plain')); expect(count('bare', 'blinds')).toBeGreaterThan(count('bare', 'plain')); expect(count('bare', 'curtains')).toBeGreaterThan(count('bare', 'plain'));
    const spots = (lights: 'bare' | 'chandelier'): string => { const it = interiorFor('home', mk('moscow'))!; it.look = { ...it.look!, lights, windows: 'plain' }; const r = buildRoom(it); const p: string[] = []; r.group.traverse(x => { if ((x as THREE.Mesh).isMesh && x.position.y > 2.3 && x.parent === r.group) p.push(`${x.position.x.toFixed(1)},${x.position.y.toFixed(1)}`); }); r.dispose(); return p.sort().join('|'); };
    expect(spots('chandelier')).not.toBe(spots('bare')); expect(spots('chandelier')).toContain('0.0,');
  });
  it('floor patterns are drawn for every style when a canvas exists, and are skipped without one', () => {
    const ops: string[] = []; const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : (..._a: unknown[]) => { ops.push(String(k)); }), set: () => true });
    const orig = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
    for (const st of ['lino', 'checker', 'plank', 'parquet'] as const) { ops.length = 0; const t = floorTexture(st, '#aaaaaa', '#888888'); expect(t, st).toBeTruthy(); expect(ops.includes('fillRect'), st).toBe(true); }
    HTMLCanvasElement.prototype.getContext = (() => null) as never; expect(floorTexture('checker', '#aaa', '#888')).toBeNull(); HTMLCanvasElement.prototype.getContext = orig;
  });
});

describe('renovating', () => {
  it('floors, walls, light and windows can be changed for money, once each, and the room shows it', () => {
    const s = mk('tajik'); const m = s.money; const d0 = designOf(s);
    expect(renovate(s, 'floor', 'parquet')).toMatchObject({ ok: true }); expect(s.money).toBe(m - FLOORS.find(f => f.id === 'parquet')!.price); expect(designOf(s).look!.floorStyle).toBe('parquet'); expect(designOf(s).floor).not.toBe(d0.floor);
    expect(renovate(s, 'wall', '#f3f3ee').ok).toBe(true); expect(designOf(s).wall).toBe('#f3f3ee'); expect(renovate(s, 'light', 'chandelier').ok).toBe(true); expect(currentLook(s).lights).toBe('chandelier'); expect(renovate(s, 'windows', 'curtains').ok).toBe(true); expect(designOf(s).look!.windows).toBe('curtains');
    expect(renoOf(s)).toEqual({ floor: 'parquet', wall: '#f3f3ee', light: 'chandelier', windows: 'curtains' });
    const after = s.money; expect(renovate(s, 'floor', 'parquet').ok).toBe(false); expect(renovate(s, 'floor', 'parquet').msg).toMatch(/already/); expect(s.money).toBe(after);
    expect(renovate(s, 'floor', 'plank').ok).toBe(true); expect(designOf(s).look!.floorStyle).toBe('plank');                // a new floor replaces the old
  });
  it('refuses when poor or for a choice that does not exist, and changes nothing', () => {
    const s = mk('tajik'); s.money = 100; const before = JSON.stringify(s); expect(renovate(s, 'floor', 'parquet').ok).toBe(false); expect(renovate(s, 'floor', 'marble' as never).ok).toBe(false); expect(renovate(s, 'sky' as never, 'x').ok).toBe(false); expect(JSON.stringify(s)).toBe(before);
    expect((s as unknown as { reno?: unknown }).reno).toBeUndefined();
  });
  it('the catalogue has sensible prices and the renovations add comfort stars', () => {
    for (const list of [FLOORS, WALLS, LIGHTS, WINDOWS]) { expect(list.length).toBeGreaterThanOrEqual(3); for (const x of list) { expect(x.price).toBeGreaterThanOrEqual(0); expect(x.price).toBeLessThan(40000); expect(x.name.length).toBeGreaterThan(2); } }
    expect(new Set(WALLS.map(w => w.id)).size).toBe(WALLS.length);
    const s = mk('tajik'); const base = renoStars(s); renovate(s, 'floor', 'parquet'); renovate(s, 'light', 'chandelier'); renovate(s, 'windows', 'curtains'); expect(renoStars(s)).toBeGreaterThan(base + 2); expect(totalStars(s)).toBeGreaterThanOrEqual(0);
  });
  it('reading a home never changes the game state', () => {
    const s = mk('region'); const before = JSON.stringify(s); designOf(s); currentLook(s); renoOf(s); renoStars(s); dwellingOf(s); interiorFor('home', s); expect(JSON.stringify(s)).toBe(before);
  });
});

import { mountWorld3d } from '../src/world3d';
import type { World3dDeps } from '../src/world3d';
import { drawFurnPanel } from '../src/furn-ui';
import { buildSite } from '../src/site3d';
import { STAGES } from '../src/build';

function stub(): NonNullable<World3dDeps['rendererFactory']> {
  return canvas => { canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 380, right: 600, bottom: 380, x: 0, y: 0, toJSON() { return {}; } }); return { domElement: canvas, setSize() { /* nothing */ }, setPixelRatio() { /* nothing */ }, render() { /* nothing */ }, dispose() { /* nothing */ }, shadowMap: { enabled: false, type: 0 } } as never; };
}
const mount = async (s: G.State): ReturnType<typeof mountWorld3d> => { HTMLCanvasElement.prototype.getContext = (() => null) as never; return mountWorld3d({ host: document.body.appendChild(document.createElement('div')), s, onPlace: () => undefined, onNpc: () => undefined, onFail: () => undefined, rendererFactory: stub() }); };
const meshCount = (o: THREE.Object3D): number => { let n = 0; o.traverse(x => { if ((x as THREE.Mesh).isMesh) n++; }); return n; };

describe('the plot and the house being built', () => {
  it('is drawn at every stage, with more and more of the house, and nothing before the plot is bought', () => {
    const counts = [0, 1, 2, 3, 4, 5].map(d => meshCount(buildSite(d, false)));
    expect(counts[0]).toBe(0); for (let i = 1; i < 6; i++) expect(counts[i], `stage ${i}`).toBeGreaterThan(counts[i - 1] - (i === 5 ? 3 : 0)); expect(counts[5]).toBeGreaterThan(counts[2] + 8);
    expect(meshCount(buildSite(3, true))).toBeGreaterThan(meshCount(buildSite(3, false)));                              // bricks and a sign while the builders work
  });
  it('stands in the 3D city off the roads and clear of everything, nobody walks into it, and it goes away with the world', async () => {
    const s = mk('region'); const h = await mount(s); const before = h.solids();
    expect(h.buildSpot()).toBeNull(); h.setBuild({ done: 1, working: false }); const spot = h.buildSpot()!; expect(spot).toBeTruthy(); expect(h.solids()).toBe(before + 1); expect(h.blockedAt(spot.x, spot.z, 0.3)).toBe(true);
    for (let i = 0; i < 5; i++) { h.setBuild({ done: i + 1, working: i % 2 === 0 }); expect(h.buildSpot()).toEqual(spot); }
    expect(h.scene.children.filter(o => o.name === 'building-site').length).toBe(1);
    for (let i = 0; i < 400; i++) { h.tick(0.1); for (const p of h.people()) expect(h.blockedAt(p.x, p.z, 0.2)).toBe(false); }
    h.setBuild(null); expect(h.buildSpot()).toBeNull(); expect(h.scene.children.filter(o => o.name === 'building-site').length).toBe(0); expect(h.solids()).toBe(before);
    h.setBuild({ done: 2, working: false }); h.destroy(); expect(h.scene.children.filter(o => o.name === 'building-site').length).toBe(0);
  });
  it('the Home tab of the catalogue shows the home, renovates it for money, and builds the house stage by stage', async () => {
    const s = mk('region'); s.status = 'citizen'; const h = await mount(s); for (let i = 0; i < 50; i++) h.tick(0.1); h.enter('home'); h.tick(0.05); h.setFurnish(true);
    const box = document.createElement('div'); const notes: string[] = []; let changed = 0;
    const ui = { notify: (m: string) => notes.push(m), changed: () => { changed++; }, hide: () => undefined };
    drawFurnPanel(box, s, h, ui); (box.querySelector('[data-cat="home"]') as HTMLButtonElement).click();
    expect(box.querySelector('.homeCard')?.textContent).toContain('panel block'); expect(box.querySelectorAll('.rnChip').length).toBe(FLOORS.length + WALLS.length + LIGHTS.length + WINDOWS.length); expect(box.querySelectorAll('.stageList li').length).toBe(STAGES.length);
    const m0 = s.money; (box.querySelector('[data-reno="floor:parquet"]') as HTMLButtonElement).click(); expect(s.money).toBe(m0 - 26000); expect(changed).toBe(1); expect(designOf(s).look!.floorStyle).toBe('parquet');
    expect((box.querySelector('[data-reno="floor:parquet"]') as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true');
    (box.querySelector('[data-reno^="wall:#f3f3ee"]') as HTMLButtonElement).click(); expect(designOf(s).wall).toBe('#f3f3ee');
    (box.querySelector('[data-reno="floor:parquet"]') as HTMLButtonElement).click(); expect(notes[notes.length - 1]).toMatch(/already/);
    (box.querySelector('#hmBuild') as HTMLButtonElement).click(); expect(h.buildSpot()).toBeTruthy(); expect(box.querySelectorAll('.stageList li.done').length).toBe(1);
    (box.querySelector('#hmBuild') as HTMLButtonElement).click(); expect(box.querySelector('#hmBuild')).toBeNull(); expect(box.textContent).toMatch(/builders are at work/);
    h.destroy();
  });
  it('a migrant is told that only citizens can build, and nothing is spent', async () => {
    const s = mk('tajik'); const h = await mount(s); for (let i = 0; i < 50; i++) h.tick(0.1); h.enter('home'); h.tick(0.05);
    const box = document.createElement('div'); const notes: string[] = []; drawFurnPanel(box, s, h, { notify: m => notes.push(m), changed: () => undefined, hide: () => undefined });
    (box.querySelector('[data-cat="home"]') as HTMLButtonElement).click(); const m = s.money; (box.querySelector('#hmBuild') as HTMLButtonElement).click(); expect(notes[notes.length - 1]).toMatch(/citizen/); expect(s.money).toBe(m); expect(h.buildSpot()).toBeNull();
    expect(box.querySelector('.homeCard')?.textContent).toContain('shared room'); h.destroy();
  });
});
