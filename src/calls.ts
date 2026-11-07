/* Audio calls between players, inside the game. The sound goes from browser to browser (WebRTC, encrypted with DTLS-SRTP); the server only passes the small
   set-up messages (offer, answer, network candidates, hang up) and never sees or records any sound. The microphone is asked for only when the player places
   a call or presses Answer, never before. The browser pieces (RTCPeerConnection, the microphone) are injected so the tests run without a browser audio stack.
   States: idle -> calling (we rang) or ringing (someone rings us) -> connected -> ended. */
import type { PhoneOnline, Signal } from './phone-online';
import { phoneWhy } from './phone-online';

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
export interface CallDeps {
  online: Pick<PhoneOnline, 'signal' | 'signals'>;
  /** Makes the connection. Tests pass a fake. */
  peer?: (config: RTCConfiguration) => RTCPeerConnection;
  /** Asks for the microphone (only audio, never video). */
  mic?: () => Promise<MediaStream>;
  /** Plays the other person's sound. */
  onRemote?: (s: MediaStream) => void;
  onState?: (state: CallState, who: string, note: string) => void;
  /** Servers that help two browsers find each other. Empty is fine on one network; most home networks need at least a STUN server. */
  iceUrls?: string[];
}

/** The STUN servers from the build setting VITE_ICE_URLS (comma separated, stun: or turn: addresses), or a public STUN. A TURN relay hosted in Russia can be put here. */
export function iceFromEnv(env: Record<string, unknown> = (import.meta as unknown as { env?: Record<string, unknown> }).env ?? {}): string[] {
  const list = String(env.VITE_ICE_URLS ?? '').split(',').map(x => x.trim()).filter(x => /^(stun|turn|turns):[a-z0-9.\-:]+(\?transport=(udp|tcp))?$/i.test(x));
  return list.length ? list : ['stun:stun.l.google.com:19302'];
}

export class Call {
  state: CallState = 'idle';
  who = '';
  private pc: RTCPeerConnection | null = null;
  private stream: MediaStream | null = null;
  private offer: string | null = null;
  private early: string[] = [];                       // network candidates that came before we were ready
  constructor(private readonly d: CallDeps) {}

  private set(state: CallState, note = ''): void { this.state = state; this.d.onState?.(state, this.who, note); }
  private config(): RTCConfiguration { const urls = this.d.iceUrls ?? iceFromEnv(); return { iceServers: urls.length ? [{ urls }] : [] }; }
  private async open(): Promise<RTCPeerConnection> {
    const mic = this.d.mic ?? (() => navigator.mediaDevices.getUserMedia({ audio: true, video: false }));
    this.stream = await mic();
    const pc = (this.d.peer ?? (c => new RTCPeerConnection(c)))(this.config());
    this.stream.getTracks().forEach(t => pc.addTrack(t, this.stream as MediaStream));
    pc.onicecandidate = e => { if (e.candidate) void this.d.online.signal(this.who, 'ice', JSON.stringify(e.candidate)); };
    pc.ontrack = e => { if (e.streams[0]) this.d.onRemote?.(e.streams[0]); };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'connected') this.set('connected'); else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.end('The connection was lost.'); };
    this.pc = pc;
    return pc;
  }

  /** Rings a number. The microphone is asked for now. */
  async place(to: string): Promise<boolean> {
    if (this.state !== 'idle' && this.state !== 'ended') return false;
    this.who = to; this.early = []; this.set('calling');
    try {
      const pc = await this.open();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sent = await this.d.online.signal(to, 'offer', JSON.stringify(offer));
      if (!sent.ok) { this.end(sent.why); return false; }
      return true;
    } catch { this.end('The microphone is needed for a call: allow it in the browser and try again.'); return false; }
  }

  /** Answers the call that is ringing. The microphone is asked for now. */
  async answer(): Promise<boolean> {
    if (this.state !== 'ringing' || !this.offer) return false;
    try {
      const pc = await this.open();
      await pc.setRemoteDescription(JSON.parse(this.offer));
      for (const c of this.early.splice(0)) await pc.addIceCandidate(JSON.parse(c));
      const a = await pc.createAnswer();
      await pc.setLocalDescription(a);
      const sent = await this.d.online.signal(this.who, 'answer', JSON.stringify(a));
      if (!sent.ok) { this.end(sent.why); return false; }
      return true;
    } catch { this.end('The microphone is needed for a call: allow it in the browser and try again.'); return false; }
  }

  decline(): void { if (this.state === 'ringing') { void this.d.online.signal(this.who, 'decline'); this.end('Declined.'); } }
  hangUp(): void { if (this.state === 'calling' || this.state === 'connected') { void this.d.online.signal(this.who, 'hangup'); this.end('Call ended.'); } }
  /** Switches the microphone off or on without ending the call. */
  mute(on: boolean): void { this.stream?.getAudioTracks().forEach(t => { t.enabled = !on; }); }

  private end(note: string): void {
    this.stream?.getTracks().forEach(t => t.stop()); this.stream = null;
    try { this.pc?.close(); } catch { /* already closed */ }
    this.pc = null; this.offer = null; this.early = [];
    this.set('ended', note);
  }

  /** Takes in the signals that came for us (call this every second or two while the phone is open). */
  async handle(signals: Signal[]): Promise<void> {
    for (const g of signals) {
      if (g.kind === 'offer') {
        if (this.state === 'idle' || this.state === 'ended') { this.who = g.from; this.offer = g.data; this.early = []; this.set('ringing'); }
        else void this.d.online.signal(g.from, 'decline');                      // already in a call: the second caller hears "busy"
      } else if (g.from !== this.who) continue;                                   // signals from anyone but the other side of this call are ignored
      else if (g.kind === 'answer' && this.state === 'calling' && this.pc) { try { await this.pc.setRemoteDescription(JSON.parse(g.data)); for (const c of this.early.splice(0)) await this.pc.addIceCandidate(JSON.parse(c)); } catch { this.end('The call could not be set up.'); } }
      else if (g.kind === 'ice') {
        if (this.pc && this.pc.remoteDescription) { try { await this.pc.addIceCandidate(JSON.parse(g.data)); } catch { /* a stale candidate */ } }
        else if (this.early.length < 50) this.early.push(g.data);
      } else if (g.kind === 'hangup') this.end('The other person hung up.');
      else if (g.kind === 'decline') this.end('The other person is busy or declined.');
    }
  }
  /** One round of listening. */
  async poll(): Promise<void> { const r = await this.d.online.signals(); if (r.ok) await this.handle(r.value); else if (this.state === 'calling') this.end(r.why || phoneWhy('')); }
}
