// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { DB, MOODS, RECIPES, STINGERS, Soundscape, dbToGain, loadMix, moodFor, saveMix, streetWeather } from '../src/platform/audio';
import type { MoodInput } from '../src/platform/audio';
import { GOALS, HINTS, nextStep, newWins, takeHint, seenHints } from '../src/platform/ftue';
import { play, setSfxLevel } from '../src/sound';

class MemKV { m = new Map<string, string>(); getItem(k: string): string | null { return this.m.get(k) ?? null; } setItem(k: string, v: string): void { this.m.set(k, v); } removeItem(k: string): void { this.m.delete(k); } }

/** A stand-in for the browser's audio that counts the nodes made, started and stopped. */
function fakeCtx(): { ctx: AudioContext; stats: { made: number; started: number; stopped: number; ramps: number } } {
  const stats = { made: 0, started: 0, stopped: 0, ramps: 0 };
  const param = (): Record<string, unknown> => ({ value: 0, setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => { stats.ramps++; }, setTargetAtTime: () => { stats.ramps++; } });
  const node = (): Record<string, unknown> => { stats.made++; return { gain: param(), frequency: param(), detune: param(), connect: () => undefined, disconnect: () => undefined, start: () => { stats.started++; }, stop: () => { stats.stopped++; }, getChannelData: () => new Float32Array(8), type: '' }; };
  const ctx = { currentTime: 0, state: 'running', sampleRate: 4, destination: {}, resume: () => Promise.resolve(), suspend: () => Promise.resolve(), createGain: node, createOscillator: node, createBiquadFilter: node, createBufferSource: node, createBuffer: () => node() } as unknown as AudioContext;
  return { ctx, stats };
}
const here = (o: Partial<MoodInput>): MoodInput => ({ loc: 'street', slot: 1, weather: 'clear', stress: 20, health: 80, energy: 70, strikes: 0, ...o });

describe('the mix', () => {
  it('effects are the loudest layer, then music, then ambience; decibels convert to gain', () => {
    expect(DB.sfx).toBeGreaterThan(DB.music); expect(DB.music).toBeGreaterThan(DB.ambience);
    expect(dbToGain(0)).toBe(1); expect(dbToGain(-6)).toBeCloseTo(0.501, 2); expect(dbToGain(-20)).toBeCloseTo(0.1, 2);
  });
  it('the player’s volumes are kept, bad stored values are repaired, and each is limited to 0..1', () => {
    const kv = new MemKV();
    expect(loadMix(kv)).toEqual({ musicOn: true, music: 0.5, sfx: 1 });
    saveMix({ musicOn: false, music: 0.2, sfx: 0.7 }, kv); expect(loadMix(kv)).toEqual({ musicOn: false, music: 0.2, sfx: 0.7 });
    kv.setItem('vrussia_mix', JSON.stringify({ musicOn: 'yes', music: 9, sfx: -3 })); expect(loadMix(kv)).toEqual({ musicOn: true, music: 1, sfx: 0 });
    kv.setItem('vrussia_mix', '{broken'); expect(loadMix(kv).music).toBe(0.5);
  });
});

describe('the mood follows what the player is doing', () => {
  it.each([
    [{ loc: 'home', slot: 0 }, 'home'], [{ loc: 'home', slot: 2 }, 'rest'], [{ loc: 'home', slot: 0, energy: 10 }, 'rest'], [{ loc: 'guvm' }, 'paper'], [{ loc: 'mfc' }, 'paper'], [{ loc: 'bank' }, 'paper'],
    [{ loc: 'uni' }, 'study'], [{ loc: 'station' }, 'travel'], [{ loc: 'airport' }, 'travel'], [{ loc: 'market' }, 'food'], [{ loc: 'work' }, 'work'], [{ loc: 'clinic' }, 'calm'], [{ loc: 'center' }, 'street'],
    [{ loc: 'work', strikes: 2 }, 'tension'], [{ loc: 'home', health: 10 }, 'tension'], [{ loc: 'uni', stress: 95 }, 'tension'],
  ])('%j sounds like %s', (inp, mood) => { expect(moodFor(here(inp as Partial<MoodInput>))).toBe(mood); });
  it('every place of the game has a mood, and every mood has a recipe with something to play', () => {
    for (const p of G.PLACES) expect(MOODS).toContain(moodFor(here({ loc: p.id })));
    for (const m of MOODS) { const r = RECIPES[m]; expect(r.pad || r.noise, m).toBeTruthy(); if (r.pad) for (const f of r.pad.notes) { expect(f).toBeGreaterThan(50); expect(f).toBeLessThan(1500); } }
    expect(streetWeather('rain')!.type).toBe('highpass'); expect(streetWeather('snow')!.hz).toBeLessThan(500); expect(streetWeather('clear')).toBeNull();
  });
  it('the stingers are short', () => { for (const s of Object.values(STINGERS)) for (const n of s) { expect(n.at + n.dur).toBeLessThan(1); expect(n.f).toBeGreaterThan(200); } });
});

describe('the soundscape engine', () => {
  it('makes no sound until it is started from a user action, and survives a browser without audio', () => {
    const { ctx, stats } = fakeCtx(); const sc = new Soundscape(new MemKV(), () => ctx);
    sc.setMood('home'); expect(stats.made).toBe(0); expect(sc.started).toBe(false); expect(sc.stinger('win')).toBe(false);
    expect(new Soundscape(new MemKV(), () => { throw new Error('no audio'); }).start()).toBe(false);
  });
  it('starts a mood, changes only when the mood changes, and fades the old one out', () => {
    vi.useFakeTimers();
    const { ctx, stats } = fakeCtx(); const sc = new Soundscape(new MemKV(), () => ctx);
    expect(sc.start()).toBe(true); sc.setMood('home'); const afterFirst = stats.started; expect(afterFirst).toBeGreaterThan(3); expect(sc.current).toBe('home');
    sc.setMood('home'); expect(stats.started).toBe(afterFirst);
    sc.setMood('street', 'rain'); expect(stats.started).toBeGreaterThan(afterFirst); const before = stats.stopped; vi.advanceTimersByTime(3000); expect(stats.stopped).toBeGreaterThan(before);
    const s2 = stats.started; sc.setMood('street', 'snow'); expect(stats.started).toBeGreaterThan(s2);       // the weather changes the street
    vi.useRealTimers();
  });
  it('music off means no layers; turning it on brings the current mood back; volumes are saved', () => {
    const kv = new MemKV(), { ctx, stats } = fakeCtx(); const sc = new Soundscape(kv, () => ctx);
    sc.start(); sc.setMix({ musicOn: false }); sc.setMood('work'); expect(stats.started).toBe(0);
    sc.setMix({ musicOn: true, music: 2 }); expect(sc.mix.music).toBe(1); expect(stats.started).toBeGreaterThan(0); expect(loadMix(kv)).toMatchObject({ musicOn: true, music: 1 });
  });
  it('stingers follow the effects volume and are silent at zero', () => {
    const { ctx, stats } = fakeCtx(); const sc = new Soundscape(new MemKV(), () => ctx); sc.start();
    expect(sc.stinger('win')).toBe(true); expect(stats.started).toBe(STINGERS.win.length);
    sc.setMix({ sfx: 0 }); expect(sc.stinger('win')).toBe(false);
  });
  it('the effects volume reaches the older sound effects too, and a sound is a little different each time', () => {
    const calls: number[] = [];
    const ctx = { currentTime: 0, state: 'running', destination: {}, resume: () => Promise.resolve(), createOscillator: () => ({ type: '', frequency: { set value(v: number) { calls.push(v); } }, connect: () => undefined, start: () => undefined, stop: () => undefined }), createGain: () => ({ gain: { setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined }, connect: () => undefined }) } as unknown as AudioContext;
    setSfxLevel(1); play('tap', ctx, true); play('tap', ctx, true); play('tap', ctx, true);
    expect(new Set(calls).size).toBeGreaterThan(1); for (const f of calls) expect(Math.abs(f - 620)).toBeLessThan(620 * 0.04);
    setSfxLevel(0); expect(play('tap', ctx, true)).toBe(false); setSfxLevel(1);
  });
});

describe('the first minutes', () => {
  it('a new migrant is told to register first, then the next thing, and a citizen gets a different list', () => {
    const s = G.newState('T', 'tajik');
    expect(nextStep(s)!.id).toBe('s_med');          // a new arrival starts with a valid registration
    s.flags.med = true; expect(nextStep(s)!.id).toBe('s_ins');
    s.docs.reg = 0; s.flags.registered = false; expect(nextStep(s)!.id).toBe('s_reg');
    const c = G.newState('C', 'region'); expect(nextStep(c)!.id).not.toBe('s_reg');
    for (const k of Object.keys(GOALS)) { expect(GOALS[k].label.en.length).toBeGreaterThan(5); expect(GOALS[k].label.ru).toMatch(/[а-яё]/i); }
  });
  it('the registration step shows the days left, and a game with everything done has no next step', () => {
    const s = G.newState('T', 'tajik'); s.docs.reg = 5;
    expect(nextStep(s)).toMatchObject({ id: 'renew_reg', daysLeft: 5 });
    s.docs.reg = 20; expect(nextStep(s)!.id).toBe('s_med');
    s.flags.registered = true; s.flags.med = true; s.flags.insured = true; s.flags.rutest = true; s.docs.patent = 20; s.job = 'x'; s.bank = { sber: true }; s.flags.rvp = true;
    expect(nextStep(s)).toBeNull();
  });
  it('a tip appears once, only when it applies, and never twice', () => {
    const kv = new MemKV(), s = G.newState('T', 'tajik');
    expect(takeHint(s, kv)).toBeNull();
    s.energy = 10; const h = takeHint(s, kv); expect(h!.id).toBe('energy'); expect(takeHint(s, kv)).toBeNull();
    s.strikes = 1; expect(takeHint(s, kv)!.id).toBe('strike'); expect(seenHints(kv).size).toBe(2);
    kv.setItem('vrussia_hints', '{broken'); expect(seenHints(kv).size).toBe(0);
    for (const x of HINTS) { expect(x.text.en.length).toBeGreaterThan(20); expect(x.text.ru).toMatch(/[а-яё]/i); }
  });
  it('a win is reported when a step becomes done after the first look, and the very first one is marked', () => {
    const s = G.newState('T', 'tajik');
    let r = newWins(s, null); expect(r.wins).toEqual([]);
    s.flags.med = true; r = newWins(s, r.known); expect(r.wins.map(w => w.id)).toEqual(['s_med']); expect(r.wins[0].first).toBe(false);
    s.flags.insured = true; r = newWins(s, r.known); expect(r.wins.map(w => w.id)).toEqual(['s_ins']);
    r = newWins(s, r.known); expect(r.wins).toEqual([]);
  });
});

describe('in the page', () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem('vrussia_consent', JSON.stringify({ v: 1, analytics: false, at: 1 })); localStorage.setItem('vrussia_tour', JSON.stringify({ status: 'skipped', step: 0 })); localStorage.setItem('vrussia_help_seen', '1'); });
  it('the next step shows on the game screen, a win is celebrated, the sound screen saves volumes', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    const { boot, uiReady } = await import('../src/ui'); boot(); await uiReady();
    const w = window as unknown as { __platform: { tick: () => void; audio: Soundscape }; __state: () => G.State | null };
    document.getElementById('startBtn')!.click(); await new Promise(r => setTimeout(r, 200));
    document.getElementById('modal')!.hidden = true;        // the game may open a pop-up at the start; tips and wins wait while one is open
    w.__platform.tick();
    const bar = document.getElementById('nextStep')!;
    expect(bar.querySelector('[data-why]')).toBeTruthy();
    const s = w.__state()!; s.bank = { sber: true }; w.__platform.tick();
    expect(document.getElementById('toasts')!.textContent).toMatch(/🎉/);
    expect(bar.textContent).not.toMatch(/bank account|банковский/i);
    document.querySelector<HTMLElement>('#game [data-pf-open]')!.click();
    (document.querySelector('#modalBody [data-pf="sound"]') as HTMLElement).click();
    const sl = document.getElementById('snMusV') as HTMLInputElement; sl.value = '20'; sl.dispatchEvent(new Event('input'));
    expect(JSON.parse(localStorage.getItem('vrussia_mix')!).music).toBeCloseTo(0.2);
    const sfx = document.getElementById('snSfx') as HTMLInputElement; sfx.checked = false; sfx.dispatchEvent(new Event('change'));
    expect(localStorage.getItem('vrussia_sound')).toBe('off');
    sfx.checked = true; sfx.dispatchEvent(new Event('change'));
  }, 20_000);
});
