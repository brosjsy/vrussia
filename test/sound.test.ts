// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { SOUNDS, play, soundOn, setSound, soundForNotes, SOUND_KEY } from '../src/sound';
import type { SoundName } from '../src/sound';
import type { KV } from '../src/store';

const fakeKV = (): KV & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; }, removeItem: k => { delete data[k]; } };
};

/** A stand-in for the browser's audio system that only counts what is scheduled. */
function fakeAudio(): { ctx: AudioContext; oscillators: number; started: number } {
  const stats = { oscillators: 0, started: 0 };
  const param = { value: 0, setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined };
  const ctx = {
    currentTime: 0, state: 'running', destination: {}, resume: () => Promise.resolve(),
    createOscillator: () => { stats.oscillators++; return { type: 'sine', frequency: { value: 0 }, connect: () => undefined, start: () => { stats.started++; }, stop: () => undefined }; },
    createGain: () => ({ gain: param, connect: () => undefined }),
  } as unknown as AudioContext;
  return { ctx, get oscillators() { return stats.oscillators; }, get started() { return stats.started; } };
}

describe('the sound effects', () => {
  it('every sound is a few short, audible notes', () => {
    const names = Object.keys(SOUNDS) as SoundName[];
    expect(names.sort()).toEqual(['bad', 'chime', 'coin', 'error', 'pop', 'ring', 'tap']);
    for (const n of names) {
      expect(SOUNDS[n].length).toBeGreaterThan(0);
      for (const note of SOUNDS[n]) {
        expect(note.f).toBeGreaterThanOrEqual(150); expect(note.f).toBeLessThanOrEqual(2000);
        expect(note.dur).toBeGreaterThan(0); expect(note.dur).toBeLessThanOrEqual(0.4);
        expect(note.at + note.dur).toBeLessThan(1.2);
        expect(note.vol).toBeGreaterThan(0); expect(note.vol).toBeLessThanOrEqual(1);
      }
    }
  });
  it('playing schedules one oscillator per note, and nothing when sound is off or the browser has no audio', () => {
    const a = fakeAudio();
    expect(play('chime', a.ctx, true)).toBe(true);
    expect(a.oscillators).toBe(SOUNDS.chime.length); expect(a.started).toBe(SOUNDS.chime.length);
    expect(play('chime', a.ctx, false)).toBe(false);
    expect(a.oscillators).toBe(SOUNDS.chime.length);
    expect(play('tap', null, true)).toBe(false);                 // jsdom has no audio system: no sound, no error
  });
  it('the preference defaults to on, remembers off and on, and survives blocked storage', () => {
    const kv = fakeKV();
    expect(soundOn(kv)).toBe(true);
    setSound(false, kv); expect(kv.data[SOUND_KEY]).toBe('off'); expect(soundOn(kv)).toBe(false);
    setSound(true, kv); expect(soundOn(kv)).toBe(true);
    const blocked: KV = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); }, removeItem: () => { throw new Error('no'); } };
    expect(soundOn(blocked)).toBe(true); expect(() => setSound(false, blocked)).not.toThrow(); expect(soundOn(null)).toBe(true);
  });
  it('the sound that goes with an outcome: coins, a low tone, or a tap', () => {
    expect(soundForNotes([{ k: 'money', v: 300 }])).toBe('coin');
    expect(soundForNotes([{ k: 'money', v: -300 }])).toBe('bad');
    expect(soundForNotes([{ k: 'stress', v: 5 }])).toBe('bad');
    expect(soundForNotes([{ k: 'strike', v: 1 }])).toBe('bad');
    expect(soundForNotes([{ k: 'stress', v: -5 }, { k: 'know', v: 2 }])).toBe('tap');
    expect(soundForNotes([])).toBe('tap');
  });
});

describe('sound in the page', () => {
  it('the sound button switches sound off and on, and clicks play a tap only while it is on', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    localStorage.removeItem(SOUND_KEY);
    const a = fakeAudio();
    (window as unknown as { AudioContext: unknown }).AudioContext = function () { return a.ctx; } as unknown;
    window.confirm = () => true;
    const { boot } = await import('../src/ui');
    boot(); await (await import('../src/ui')).uiReady();
    const btn = document.getElementById('soundBtn') as HTMLButtonElement;
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Sound';
    document.getElementById('startBtn')!.click();
    const before = a.oscillators;
    expect(before).toBeGreaterThan(0);                                // the start click made a tap
    btn.click();                                                      // off
    expect(btn.getAttribute('aria-pressed')).toBe('false'); expect(localStorage.getItem(SOUND_KEY)).toBe('off');
    const afterOff = a.oscillators;
    document.getElementById('dockPhone')!.click();
    expect(a.oscillators).toBe(afterOff);                             // silent
    document.getElementById('closeModal')!.click();
    btn.click();                                                      // on again
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    const afterOn = a.oscillators;
    document.getElementById('dockPhone')!.click();
    expect(a.oscillators).toBeGreaterThan(afterOn);
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  });
  it('the mood pill, the shortcuts button and the saved-game notice', async () => {
    document.getElementById('closeModal')!.click();
    expect(document.getElementById('moodPill')!.textContent).toMatch(/Fine|Tense|Tired|Stressed|Unwell/);
    expect(document.getElementById('keysBtn')!.hidden).toBe(false);
    document.getElementById('keysBtn')!.click();
    expect(document.getElementById('modalBody')!.textContent).toContain('1 to 9');
    document.getElementById('closeModal')!.click();
    document.getElementById('menuBtn')!.click();
    expect(document.getElementById('keysBtn')!.hidden).toBe(true);    // title screen: no shortcut button
    document.getElementById('continueBtn')!.click();
    expect(document.getElementById('toasts')!.textContent).toContain('Loaded your latest saved game');
    vi.restoreAllMocks();
  });
});
