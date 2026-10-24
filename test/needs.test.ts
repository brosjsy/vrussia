// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { needsOf, decayNeeds, needsOnAction, wash, needStatus, meterColor, DECAY, LOW, VERY_LOW, NEED_KEYS } from '../src/needs';
import { statusFor } from '../src/billboards';
import { buildCharacter, setPose } from '../src/characters3d';
import { interiorFor, SPECIAL } from '../src/interiors';
import { mountWorld3d } from '../src/world3d';
import type { World3dDeps } from '../src/world3d';

const fresh = (): G.State => { const s = G.newState('N', 'moscow'); s.queue = []; s.health = 80; s.stress = 10; s.energy = 80; return s; };

describe('needs', () => {
  it('start at ordinary values, are made for old saves, and are repaired when damaged', () => {
    const s = fresh(); expect(needsOf(s)).toEqual({ hunger: 80, hygiene: 80, social: 70, fun: 70, bladder: 90 });
    (s as unknown as { needs: unknown }).needs = { hunger: 'x', hygiene: 150, social: -20 };
    expect(needsOf(s)).toEqual({ hunger: 80, hygiene: 100, social: 0, fun: 70, bladder: 90 });
    (s as unknown as { needs: unknown }).needs = 5; expect(needsOf(s)).toEqual({ hunger: 80, hygiene: 80, social: 70, fun: 70, bladder: 90 });
    expect(JSON.parse(JSON.stringify(fresh())).needs).toBeUndefined();               // nothing is saved until it is first used
  });
  it('fall with every part of the day, by their own amounts, never below zero', () => {
    const s = fresh(); const before = { ...needsOf(s) }; G.advance(s);
    for (const k of NEED_KEYS) expect(needsOf(s)[k]).toBe(before[k] - DECAY[k]);
    for (let i = 0; i < 60; i++) G.advance(s);
    for (const k of NEED_KEYS) expect(needsOf(s)[k]).toBe(0);
  });
  it('a low need presses gently: hunger and loneliness add stress, being unwashed costs a little reputation, and a player with nothing to eat loses a little energy but never health', () => {
    const s = fresh(); Object.assign(needsOf(s), { hunger: LOW + DECAY.hunger, hygiene: 80, social: 80 }); const st = s.stress, h = s.health;
    let notes = decayNeeds(s); expect(needsOf(s).hunger).toBe(LOW); expect(s.stress).toBe(st + 1); expect(s.health).toBe(h); expect(notes.join()).toMatch(/hungry/);
    Object.assign(needsOf(s), { hunger: VERY_LOW + DECAY.hunger, hygiene: 80, social: 80 }); const e0 = s.energy; notes = decayNeeds(s); expect(s.energy).toBe(e0 - 3); expect(s.health).toBe(h); expect(notes.join()).toMatch(/very hungry/);
    const t = fresh(); Object.assign(needsOf(t), { hunger: 90, hygiene: 90, social: LOW + DECAY.social }); const s0 = t.stress; expect(decayNeeds(t).join()).toMatch(/lonely/); expect(t.stress).toBe(s0 + 1);
    const u = fresh(); Object.assign(needsOf(u), { hunger: 90, hygiene: LOW + DECAY.hygiene, social: 90 }); const u0 = u.stress, r0 = u.rep; expect(decayNeeds(u).join()).toMatch(/wash/); expect(u.stress).toBe(u0); expect(u.rep).toBe(r0 - 1);
    const v = fresh(); Object.assign(needsOf(v), { hunger: 0, hygiene: 0, social: 0 }); v.stress = 99; v.energy = 1; decayNeeds(v); expect(v.stress).toBe(100); expect(v.energy).toBe(0);
  });
  it('eating, company and family restore them, up to a hundred', () => {
    const s = fresh(); Object.assign(needsOf(s), { hunger: 10, hygiene: 50, social: 10 });
    needsOnAction(s, 'food'); expect(needsOf(s).hunger).toBe(60); needsOnAction(s, 'food'); needsOnAction(s, 'food'); expect(needsOf(s).hunger).toBe(100);
    needsOnAction(s, 'people'); expect(needsOf(s).social).toBe(40); needsOnAction(s, 'out'); expect(needsOf(s).social).toBe(54); needsOnAction(s, 'family'); expect(needsOf(s).social).toBe(72);
    needsOnAction(s, 'work'); needsOnAction(s, 'paper'); expect(needsOf(s)).toMatchObject({ hunger: 100, hygiene: 50, social: 72 });
    needsOnAction(s, 'home'); expect(needsOf(s).hygiene).toBe(70); needsOnAction(s, 'home'); needsOnAction(s, 'home'); needsOnAction(s, 'home'); expect(needsOf(s).hygiene).toBe(100);
  });
  it('the real actions of the game do it: eating feeds and meeting people is company', () => {
    const s = fresh(); Object.assign(needsOf(s), { hunger: 20, social: 20 }); G.perform(s, 'food'); expect(needsOf(s).hunger).toBe(70);
    G.perform(s, 'people'); expect(needsOf(s).social).toBe(50); G.perform(s, 'home'); expect(needsOf(s)).toMatchObject({ hunger: 70, social: 50, hygiene: 100 });
  });
});

describe('washing up', () => {
  it('a bucket gives a good wash, a shower a perfect one, once in each part of the day', () => {
    const s = fresh(); needsOf(s).hygiene = 10; const st = s.stress;
    expect(wash(s, 'bucket').ok).toBe(true); expect(needsOf(s).hygiene).toBe(65); expect(s.stress).toBe(st - 1);
    const again = wash(s, 'shower'); expect(again.ok).toBe(false); expect(again.msg).toMatch(/already/); expect(needsOf(s).hygiene).toBe(65);
    G.advance(s); const sh = wash(s, 'shower'); expect(sh.ok).toBe(true); expect(needsOf(s).hygiene).toBe(100); expect(sh.msg).toMatch(/shower/);
    s.slot = 0; s.day += 1; expect(wash(s, 'bucket').ok).toBe(true);
  });
  it('washing costs no time and no money, and cannot push stress below zero', () => {
    const s = fresh(); s.stress = 0; const m = s.money, d = s.day, sl = s.slot; wash(s, 'bucket'); expect(s.money).toBe(m); expect(s.day).toBe(d); expect(s.slot).toBe(sl); expect(s.stress).toBe(0);
  });
});

describe('what the player sees', () => {
  it('the status chip names the most urgent trouble, hunger first, and stays empty when all is well', () => {
    const s = fresh(); expect(needStatus(s)).toBeNull(); expect(statusFor(s)).toBeNull();
    needsOf(s).social = 5; expect(statusFor(s)?.text).toBe('Lonely · meet someone'); needsOf(s).hygiene = 5; expect(statusFor(s)?.text).toBe('Dirty · wash up');
    s.tmp.fines = 100; expect(statusFor(s)?.text).toBe('Unpaid fines'); needsOf(s).hunger = 5; expect(statusFor(s)?.text).toBe('Hungry · eat something');
    s.health = 10; expect(statusFor(s)?.text).toContain('Sick');
  });
  it('meter colours go from green to amber to red', () => { expect(meterColor(90)).toBe('#3ec27a'); expect(meterColor(25)).toBe('#f0b43c'); expect(meterColor(5)).toBe('#e0373f'); });
  it('the washing pose leans over and scrubs, and standing up restores the body', () => {
    const c = buildCharacter({}); setPose(c, 'wash', 0, 1);
    expect(c.torso.rotation.x).toBeGreaterThan(0.3); expect(c.armL.rotation.x).toBeLessThan(-0.7); expect(c.armR.rotation.x).toBeLessThan(-0.7);
    const seen = new Set<string>(); for (let t = 0; t < 2; t += 0.1) { setPose(c, 'wash', 0, t); seen.add(c.armL.rotation.x.toFixed(2)); }
    expect(seen.size).toBeGreaterThan(5);
    setPose(c, 'idle', 0, 1); expect(c.torso.rotation.x).toBe(0); expect(c.head.rotation.x).toBe(0);
  });
});

beforeEach(() => { HTMLCanvasElement.prototype.getContext = (() => null) as never; });
function stub(): NonNullable<World3dDeps['rendererFactory']> {
  return canvas => { canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 380, right: 600, bottom: 380, x: 0, y: 0, toJSON() { return {}; } }); return { domElement: canvas, setSize() { /* nothing */ }, setPixelRatio() { /* nothing */ }, render() { /* nothing */ }, dispose() { /* nothing */ }, shadowMap: { enabled: false, type: 0 } } as never; };
}
describe('the bucket in the flat', () => {
  it('stands in the flat as a thing to use, and wash is a known special action', () => {
    const home = interiorFor('home', fresh())!; const b = home.props.find(p => p.action === 'wash')!;
    expect(b).toBeTruthy(); expect(b.label).toMatch(/Bucket|Bath|Shower|Washstand/); expect((SPECIAL as readonly string[]).includes('wash')).toBe(true);
  });
  it('using it asks the page to wash, the washing pose can be played in a room only, and the flat offers it', async () => {
    const s = fresh(); const host = document.body.appendChild(document.createElement('div'));
    const h = await mountWorld3d({ host, s, onPlace: () => undefined, onNpc: () => undefined, onFail: () => undefined, rendererFactory: stub() });
    for (let i = 0; i < 100; i++) h.tick(0.05);
    expect(h.playPose('wash', 2)).toBe(false);
    h.enter('home'); h.tick(0.05); expect(h.roomActions()).toContain('wash'); expect(h.playPose('wash', 2)).toBe(true);
    for (let i = 0; i < 20; i++) h.tick(0.05);
    h.leave(); expect(h.playPose('wash', 2)).toBe(false);
    h.destroy();
  });
});
