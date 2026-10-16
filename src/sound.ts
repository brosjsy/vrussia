/* Sound effects made on the fly with the browser's audio system: no sound files, nothing to download.
   A sound is a short list of notes; playing it only needs an audio context. The player can switch sound off; the choice is kept in
   the browser (localStorage). Browsers allow sound only after a click or key press, which is when every effect here is played. */
import type { KV } from './store';

export type SoundName = 'tap' | 'pop' | 'coin' | 'bad' | 'chime' | 'ring' | 'error';
export interface Note { f: number; at: number; dur: number; wave: 'sine' | 'triangle' | 'square'; vol: number }

export const SOUNDS: Record<SoundName, Note[]> = {
  tap: [{ f: 620, at: 0, dur: 0.04, wave: 'sine', vol: 0.5 }],
  pop: [{ f: 700, at: 0, dur: 0.05, wave: 'sine', vol: 0.6 }, { f: 930, at: 0.06, dur: 0.07, wave: 'sine', vol: 0.6 }],
  coin: [{ f: 988, at: 0, dur: 0.07, wave: 'triangle', vol: 0.7 }, { f: 1319, at: 0.07, dur: 0.18, wave: 'triangle', vol: 0.7 }],
  bad: [{ f: 260, at: 0, dur: 0.1, wave: 'triangle', vol: 0.6 }, { f: 190, at: 0.1, dur: 0.16, wave: 'triangle', vol: 0.6 }],
  chime: [{ f: 523, at: 0, dur: 0.12, wave: 'sine', vol: 0.6 }, { f: 659, at: 0.1, dur: 0.12, wave: 'sine', vol: 0.6 }, { f: 784, at: 0.2, dur: 0.25, wave: 'sine', vol: 0.6 }],
  ring: [{ f: 440, at: 0, dur: 0.18, wave: 'sine', vol: 0.5 }, { f: 480, at: 0.2, dur: 0.18, wave: 'sine', vol: 0.5 }, { f: 440, at: 0.6, dur: 0.18, wave: 'sine', vol: 0.5 }, { f: 480, at: 0.8, dur: 0.18, wave: 'sine', vol: 0.5 }],
  error: [{ f: 200, at: 0, dur: 0.08, wave: 'square', vol: 0.3 }, { f: 200, at: 0.12, dur: 0.08, wave: 'square', vol: 0.3 }],
};

export const SOUND_KEY = 'vrussia_sound';
const MASTER = 0.07;          // quiet on purpose

const defaultKV = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
/** Sound is on unless the player has switched it off. */
export const soundOn = (kv: KV | null = defaultKV()): boolean => { try { return kv?.getItem(SOUND_KEY) !== 'off'; } catch { return true; } };
export function setSound(on: boolean, kv: KV | null = defaultKV()): void { try { kv?.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch { /* ignore */ } }

/** Which sound goes with the outcome of a choice: coins for gains, a low tone for losses and stress, a tap otherwise. */
export function soundForNotes(notes: { k: string; v: number }[]): SoundName {
  const money = notes.find(n => n.k === 'money');
  if (money && money.v > 0) return 'coin';
  if (money && money.v < 0) return 'bad';
  if (notes.some(n => (n.k === 'stress' && n.v > 0) || n.k === 'strike' || (n.k === 'health' && n.v < 0))) return 'bad';
  return 'tap';
}

let ctx: AudioContext | null = null;
/** Plays a sound if sound is on and the browser can. Never throws. `audio` and `on` can be supplied by tests. */
export function play(name: SoundName, audio?: AudioContext | null, on: boolean = soundOn()): boolean {
  if (!on) return false;
  try {
    const C = audio ?? ctx ?? (ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)());
    if (C.state === 'suspended') void C.resume();
    const t0 = C.currentTime;
    for (const n of SOUNDS[name]) {
      const o = C.createOscillator(), g = C.createGain();
      o.type = n.wave; o.frequency.value = n.f;
      g.gain.setValueAtTime(0.0001, t0 + n.at);
      g.gain.exponentialRampToValueAtTime(MASTER * n.vol, t0 + n.at + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
      o.connect(g); g.connect(C.destination);
      o.start(t0 + n.at); o.stop(t0 + n.at + n.dur + 0.02);
    }
    return true;
  } catch { return false; }
}
