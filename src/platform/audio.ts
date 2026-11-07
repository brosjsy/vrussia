/* The soundscape: quiet music and ambience that follow what the player is doing, made on the fly with the browser's audio (no files to download).
   What the research behind it says (docs/UX_RESEARCH.md): a layered mix with effects above music above ambience; sound that changes with the
   state of the game (a calm pad at home, a rhythm on the train, a low tremolo when things go wrong); changes that crossfade, so the player does
   not notice the seam; a muffled mix when the character is in bad shape; sound that starts only after the player has clicked or pressed a key,
   with a switch and a volume of its own that the player can reach by keyboard (WCAG 1.4.2). The pure parts (the mood, the levels) are tested
   alone; the engine takes an injected audio context, so it is tested with a stand-in. */
import type { KV } from '../store';

export type Mood = 'home' | 'rest' | 'work' | 'paper' | 'study' | 'street' | 'travel' | 'food' | 'tension' | 'calm';
export const MOODS: readonly Mood[] = ['home', 'rest', 'work', 'paper', 'study', 'street', 'travel', 'food', 'tension', 'calm'];

/** Mix levels in decibels, taken from the usual ranges of game audio: effects loudest, music below, ambience quietest. */
export const DB = { sfx: -5, music: -10, ambience: -16 } as const;
export const dbToGain = (db: number): number => Math.pow(10, db / 20);
const MASTER = 0.5;

export interface MoodInput { loc: string; slot: number; weather: string; stress: number; health: number; energy: number; strikes: number }
/** The mood for the player's situation: trouble first, then where they are, then the time of day. */
export function moodFor(s: MoodInput): Mood {
  if (s.strikes >= 2 || s.health < 20 || s.stress > 90) return 'tension';
  const at = s.loc;
  if (at === 'home') return s.slot === 2 || s.energy < 25 ? 'rest' : 'home';
  if (at === 'guvm' || at === 'mfc' || at === 'bank' || at === 'agency') return 'paper';
  if (at === 'uni') return 'study';
  if (at === 'station' || at === 'airport') return 'travel';
  if (at === 'market' || at === 'mall') return 'food';
  if (at === 'work' || at === 'dealer') return 'work';
  if (at === 'clinic' || at === 'hospital' || at === 'shelter') return 'calm';
  return 'street';
}

export interface Mix { musicOn: boolean; music: number; sfx: number }
export const MIX_KEY = 'vrussia_mix';
export const DEFAULT_MIX: Mix = { musicOn: true, music: 0.5, sfx: 1 };
const defaultKV = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
const level = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : d);
export function loadMix(kv: KV | null = defaultKV()): Mix {
  try { const o = JSON.parse(kv?.getItem(MIX_KEY) ?? '{}') as Partial<Mix>; return { musicOn: typeof o.musicOn === 'boolean' ? o.musicOn : true, music: level(o.music, DEFAULT_MIX.music), sfx: level(o.sfx, DEFAULT_MIX.sfx) }; } catch { return { ...DEFAULT_MIX }; }
}
export function saveMix(m: Mix, kv: KV | null = defaultKV()): void { try { kv?.setItem(MIX_KEY, JSON.stringify(m)); } catch { /* ignore */ } }

/** What each mood is made of. */
interface Recipe { pad?: { notes: number[]; wave: OscillatorType; lowpass: number; tremolo: number; depth: number }; noise?: { type: 'lowpass' | 'highpass' | 'bandpass'; hz: number; gain: number; wobble?: number }; pulse?: { hz: number; freq: number; wave: OscillatorType; gain: number } }
export const RECIPES: Record<Mood, Recipe> = {
  home: { pad: { notes: [110, 164.8, 220, 277.2], wave: 'sine', lowpass: 900, tremolo: 0.08, depth: 0.25 } },
  rest: { pad: { notes: [73.4, 110, 174.6], wave: 'sine', lowpass: 520, tremolo: 0.05, depth: 0.3 } },
  work: { pad: { notes: [130.8, 196, 261.6], wave: 'triangle', lowpass: 800, tremolo: 0.1, depth: 0.15 }, pulse: { hz: 1, freq: 880, wave: 'sine', gain: 0.08 } },
  paper: { pad: { notes: [87.3, 130.8, 174.6], wave: 'sine', lowpass: 700, tremolo: 0.06, depth: 0.2 }, noise: { type: 'bandpass', hz: 3000, gain: 0.05 } },
  study: { pad: { notes: [164.8, 246.9, 415.3], wave: 'sine', lowpass: 1200, tremolo: 0.07, depth: 0.2 } },
  street: { noise: { type: 'lowpass', hz: 600, gain: 0.55, wobble: 0.12 } },
  travel: { noise: { type: 'lowpass', hz: 260, gain: 0.5 }, pulse: { hz: 2.2, freq: 90, wave: 'triangle', gain: 0.35 } },
  food: { pad: { notes: [196, 293.7], wave: 'sine', lowpass: 1000, tremolo: 0.09, depth: 0.2 }, noise: { type: 'bandpass', hz: 5200, gain: 0.07 } },
  tension: { pad: { notes: [123.5, 174.6, 185], wave: 'sawtooth', lowpass: 420, tremolo: 5.5, depth: 0.45 } },
  calm: { pad: { notes: [130.8, 164.8, 196], wave: 'sine', lowpass: 800, tremolo: 0.06, depth: 0.2 } },
};
/** Weather colours the street: rain is a hiss, snow and frost a low wind. */
export function streetWeather(weather: string): Recipe['noise'] | null {
  if (weather === 'rain') return { type: 'highpass', hz: 2200, gain: 0.3 };
  if (weather === 'snow' || weather === 'frost') return { type: 'lowpass', hz: 300, gain: 0.35, wobble: 0.2 };
  return null;
}

export type Stinger = 'win' | 'level' | 'warn' | 'tour';
export const STINGERS: Record<Stinger, { f: number; at: number; dur: number }[]> = {
  win: [{ f: 523, at: 0, dur: 0.12 }, { f: 659, at: 0.1, dur: 0.12 }, { f: 784, at: 0.2, dur: 0.12 }, { f: 1047, at: 0.3, dur: 0.4 }],
  level: [{ f: 392, at: 0, dur: 0.1 }, { f: 523, at: 0.1, dur: 0.1 }, { f: 659, at: 0.2, dur: 0.3 }],
  warn: [{ f: 330, at: 0, dur: 0.14 }, { f: 262, at: 0.16, dur: 0.24 }],
  tour: [{ f: 698, at: 0, dur: 0.08 }, { f: 880, at: 0.09, dur: 0.14 }],
};

interface Live { gain: GainNode; stop: () => void }
export class Soundscape {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private tone: BiquadFilterNode | null = null;
  private live: Live | null = null;
  private mood: Mood | null = null;
  private weather = '';
  private noiseBuf: AudioBuffer | null = null;
  mix: Mix;
  constructor(private readonly kv: KV | null = defaultKV(), private readonly make?: () => AudioContext) { this.mix = loadMix(kv); }

  get started(): boolean { return !!this.ctx; }
  get current(): Mood | null { return this.mood; }
  /** Starts the audio. Call it from a click or a key press only (browsers insist, and so does the research on autoplay). */
  start(): boolean {
    if (this.ctx) { void this.ctx.resume?.(); return true; }
    try {
      const C = this.make ? this.make() : new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.ctx = C;
      this.tone = C.createBiquadFilter(); this.tone.type = 'lowpass'; this.tone.frequency.value = 18000;
      this.master = C.createGain(); this.master.gain.value = this.mix.musicOn ? this.mix.music * MASTER : 0;
      this.tone.connect(this.master); this.master.connect(C.destination);
      void C.resume?.();
      return true;
    } catch { this.ctx = null; return false; }
  }
  setMix(p: Partial<Mix>): void {
    this.mix = { musicOn: p.musicOn ?? this.mix.musicOn, music: level(p.music, this.mix.music), sfx: level(p.sfx, this.mix.sfx) };
    saveMix(this.mix, this.kv);
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(this.mix.musicOn ? this.mix.music * MASTER : 0, this.ctx.currentTime, 0.1);
    if (this.mix.musicOn && this.ctx && !this.live && this.mood) { const m = this.mood; this.mood = null; this.setMood(m, this.weather); }
  }
  /** Fades to the mood of the new situation over about a second and a half. Does nothing when the mood has not changed. */
  setMood(m: Mood, weather = ''): void {
    if (!this.ctx || !this.tone) return;
    if (m === this.mood && (m !== 'street' || weather === this.weather)) return;
    this.mood = m; this.weather = weather;
    const C = this.ctx, old = this.live, t0 = C.currentTime;
    if (!this.mix.musicOn) { old?.stop(); this.live = null; return; }
    const g = C.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(1, t0, 0.5); g.connect(this.tone);
    const stops: (() => void)[] = [];
    const r = RECIPES[m];
    if (r.pad) stops.push(this.pad(g, r.pad));
    const noises = [r.noise, m === 'street' ? streetWeather(weather) : null].filter((x): x is NonNullable<Recipe['noise']> => !!x);
    for (const n of noises) stops.push(this.noise(g, n));
    if (r.pulse) stops.push(this.pulse(g, r.pulse));
    this.live = { gain: g, stop: () => { g.gain.setTargetAtTime(0, C.currentTime, 0.5); setTimeout(() => { for (const s of stops) { try { s(); } catch { /* already stopped */ } } try { g.disconnect(); } catch { /* ignore */ } }, 2500); } };
    old?.stop();
  }
  /** Muffles everything when the character is in bad shape, and clears it again when they recover. */
  setMuffle(on: boolean): void { if (this.ctx && this.tone) this.tone.frequency.setTargetAtTime(on ? 700 : 18000, this.ctx.currentTime, 0.6); }
  pause(): void { if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend?.(); }
  resume(): void { if (this.ctx && this.ctx.state === 'suspended' && this.mix.musicOn) void this.ctx.resume?.(); }
  /** A short rising or falling phrase for a win, a milestone or a warning; follows the effects volume. */
  stinger(name: Stinger): boolean {
    if (!this.ctx || this.mix.sfx <= 0) return false;
    const C = this.ctx, t0 = C.currentTime, peak = dbToGain(DB.sfx) * this.mix.sfx * 0.12;
    for (const n of STINGERS[name]) {
      const o = C.createOscillator(), g = C.createGain();
      o.type = name === 'warn' ? 'triangle' : 'sine'; o.frequency.value = n.f * (1 + (Math.random() - 0.5) * 0.02);
      g.gain.setValueAtTime(0.0001, t0 + n.at); g.gain.exponentialRampToValueAtTime(peak, t0 + n.at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
      o.connect(g); g.connect(C.destination); o.start(t0 + n.at); o.stop(t0 + n.at + n.dur + 0.03);
    }
    return true;
  }

  private pad(out: GainNode, p: NonNullable<Recipe['pad']>): () => void {
    const C = this.ctx!, g = C.createGain(), lp = C.createBiquadFilter(), lfo = C.createOscillator(), depth = C.createGain();
    const peak = dbToGain(DB.music) * 0.5;
    lp.type = 'lowpass'; lp.frequency.value = p.lowpass; g.gain.value = peak * (1 - p.depth / 2);
    lfo.frequency.value = p.tremolo; depth.gain.value = peak * p.depth / 2; lfo.connect(depth); depth.connect(g.gain);
    const oscs = p.notes.map((f, i) => { const o = C.createOscillator(); o.type = p.wave; o.frequency.value = f; o.detune.value = (i - 1) * 4; o.connect(lp); o.start(); return o; });
    lp.connect(g); g.connect(out); lfo.start();
    return () => { for (const o of oscs) o.stop(); lfo.stop(); };
  }
  private noise(out: GainNode, n: NonNullable<Recipe['noise']>): () => void {
    const C = this.ctx!;
    if (!this.noiseBuf) { const len = C.sampleRate * 2, b = C.createBuffer(1, len, C.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noiseBuf = b; }
    const src = C.createBufferSource(), f = C.createBiquadFilter(), g = C.createGain();
    src.buffer = this.noiseBuf; src.loop = true; f.type = n.type; f.frequency.value = n.hz; g.gain.value = dbToGain(DB.ambience) * n.gain * 2;
    src.connect(f); f.connect(g); g.connect(out); src.start();
    let lfo: OscillatorNode | null = null;
    if (n.wobble) { lfo = C.createOscillator(); const d = C.createGain(); lfo.frequency.value = n.wobble; d.gain.value = g.gain.value * 0.5; lfo.connect(d); d.connect(g.gain); lfo.start(); }
    return () => { src.stop(); lfo?.stop(); };
  }
  private pulse(out: GainNode, p: NonNullable<Recipe['pulse']>): () => void {
    const C = this.ctx!, o = C.createOscillator(), g = C.createGain(), lfo = C.createOscillator(), d = C.createGain();
    o.type = p.wave; o.frequency.value = p.freq; g.gain.value = 0;
    lfo.type = 'square'; lfo.frequency.value = p.hz; d.gain.value = dbToGain(DB.ambience) * p.gain; lfo.connect(d); d.connect(g.gain);
    o.connect(g); g.connect(out); o.start(); lfo.start();
    return () => { o.stop(); lfo.stop(); };
  }
}
