/* The sounds of the 3D street, made on the fly with the browser's audio (no files): the player's footsteps (on pavement, snow, grass or a
   floor), the hum of traffic that grows as a car comes close, a car horn, birdsong on a fine day and a door. Everything follows the player's
   sound switch and effects volume (src/sound.ts), and nothing here ever throws: with no audio the calls simply do nothing. */
import { audioContext, sfxVolume } from './sound';

export type Ground = 'street' | 'snow' | 'grass' | 'floor';
/** The ground under the player's feet: snow in winter weather, a hard floor indoors, pavement otherwise. */
export const groundFor = (weather: string, indoors: boolean): Ground => (indoors ? 'floor' : weather === 'snow' || weather === 'frost' ? 'snow' : 'street');

const LEVEL = 0.5;                                                         // the world sounds sit above the quiet UI blips
let noise: AudioBuffer | null = null;
const noiseOf = (C: AudioContext): AudioBuffer => {
  if (noise && noise.sampleRate === C.sampleRate) return noise;
  const len = C.sampleRate * 2, b = C.createBuffer(1, len, C.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return (noise = b);
};

type Spec = [number, number, BiquadFilterType, number];
const GROUND: Record<Ground, Spec> = {
  street: [1500, 0.06, 'bandpass', 0.9],
  snow: [900, 0.16, 'lowpass', 0.8],
  grass: [2200, 0.1, 'bandpass', 0.55],
  floor: [1100, 0.05, 'bandpass', 1],
};

/** One footstep: a burst of noise shaped by the ground, with a low thud under it. `vol` is 0 to 1 (a passer-by far away is quieter). */
export function footstep(ground: Ground, vol = 1): boolean {
  const C = audioContext(); if (!C || vol <= 0) return false;
  try {
    const t = C.currentTime, spec = GROUND[ground];
    const src = C.createBufferSource(), f = C.createBiquadFilter(), g = C.createGain();
    src.buffer = noiseOf(C); f.type = spec[2]; f.frequency.value = spec[0] * (0.85 + Math.random() * 0.3); f.Q.value = 0.9;
    const peak = LEVEL * sfxVolume() * vol * spec[3] * (0.8 + Math.random() * 0.4);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + spec[1]);
    src.connect(f); f.connect(g); g.connect(C.destination); src.start(t, Math.random()); src.stop(t + spec[1] + 0.03);
    const o = C.createOscillator(), og = C.createGain();                                // the heel
    o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.07);
    og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(peak * 0.5, t + 0.008); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(og); og.connect(C.destination); o.start(t); o.stop(t + 0.1);
    return true;
  } catch { return false; }
}

/** A car horn: two short notes. */
export function horn(vol = 1): boolean {
  const C = audioContext(); if (!C) return false;
  try {
    const t = C.currentTime, peak = 0.06 * sfxVolume() * Math.min(1, vol);
    for (const [at, dur] of [[0, 0.16], [0.22, 0.28]]) for (const f of [415, 523]) {
      const o = C.createOscillator(), g = C.createGain();
      o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + at + 0.01); g.gain.setValueAtTime(Math.max(0.0002, peak), t + at + dur - 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(g); g.connect(C.destination); o.start(t + at); o.stop(t + at + dur + 0.02);
    }
    return true;
  } catch { return false; }
}

/** A door: a knock of noise. `open` is a soft click of the latch, otherwise a heavier close. */
export function door(open = true): boolean {
  const C = audioContext(); if (!C) return false;
  try {
    const t = C.currentTime, src = C.createBufferSource(), f = C.createBiquadFilter(), g = C.createGain();
    src.buffer = noiseOf(C); f.type = 'lowpass'; f.frequency.value = open ? 1800 : 600;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, LEVEL * sfxVolume() * (open ? 0.5 : 0.9)), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.09 : 0.25));
    src.connect(f); f.connect(g); g.connect(C.destination); src.start(t); src.stop(t + 0.3);
    return true;
  } catch { return false; }
}

const CHIRPS = [[3200, 4400], [4200, 3000], [3600, 5000]];
/** A bird: a quick rising or falling chirp, two or three times over. */
export function bird(): boolean {
  const C = audioContext(); if (!C) return false;
  try {
    const t = C.currentTime, shape = CHIRPS[Math.floor(Math.random() * CHIRPS.length)], n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      const o = C.createOscillator(), g = C.createGain(), at = t + i * 0.13;
      o.type = 'sine'; o.frequency.setValueAtTime(shape[0], at); o.frequency.exponentialRampToValueAtTime(shape[1], at + 0.08);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.05 * sfxVolume()), at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
      o.connect(g); g.connect(C.destination); o.start(at); o.stop(at + 0.12);
    }
    return true;
  } catch { return false; }
}

/** How loud the traffic is for the player, 0 to 1, from the distance to the nearest car (silent beyond 60 units). */
export const trafficLevel = (nearest: number): number => (Number.isFinite(nearest) ? Math.max(0, Math.min(1, 1 - nearest / 60)) ** 1.6 : 0);

/** The living sound of a street: a continuous rumble of traffic that follows the nearest car, and now and then a bird or a horn. Call update() every frame. */
export class StreetAudio {
  private C: AudioContext | null = null;
  private gain: GainNode | null = null;
  private src: AudioBufferSourceNode | null = null;
  private birdIn = 4;
  /** `nearest` is the distance to the nearest car; `fine` is true on a dry day; `day` true in daylight; `halted` true when a car close by is held up. */
  update(dt: number, nearest: number, fine: boolean, day: boolean, halted: boolean): void {
    const C = audioContext();
    if (!C) { this.hush(); return; }
    try {
      if (C !== this.C) { this.C = C; this.gain = null; this.src = null; }
      if (!this.gain) {
        const src = C.createBufferSource(), f = C.createBiquadFilter(), g = C.createGain();
        src.buffer = noiseOf(C); src.loop = true; f.type = 'lowpass'; f.frequency.value = 240; g.gain.value = 0;
        src.connect(f); f.connect(g); g.connect(C.destination); src.start(); this.gain = g; this.src = src;
      }
      this.gain.gain.setTargetAtTime(0.35 * sfxVolume() * trafficLevel(nearest), C.currentTime, 0.25);
      if (fine && day) { this.birdIn -= dt; if (this.birdIn <= 0) { bird(); this.birdIn = 5 + Math.random() * 12; } }
      if (halted && nearest < 14 && Math.random() < dt * 0.12) horn(trafficLevel(nearest) + 0.3);
    } catch { /* no audio */ }
  }
  hush(): void { try { if (this.gain && this.C) this.gain.gain.setTargetAtTime(0, this.C.currentTime, 0.1); } catch { /* ignore */ } }
  dispose(): void { try { this.src?.stop(); this.gain?.disconnect(); } catch { /* ignore */ } this.src = null; this.gain = null; this.C = null; }
}
