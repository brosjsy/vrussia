// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PhoneOnline, phoneWhy } from '../src/phone-online';
import { Call, iceFromEnv } from '../src/calls';
import type { CallState } from '../src/calls';
import { numberFrom } from '../src/phonenumber';
import { SKINS, detectSkin, skinOf, setSkin, applySkin } from '../src/phone-skins';
import type { KV } from '../src/store';

const A = numberFrom('a', 'player'), B = numberFrom('b', 'player');
const reply = (status: number, body: unknown): Response => ({ ok: status < 400, status, json: async () => body }) as unknown as Response;
const mem = (): KV => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); } }; };

describe('the phone client of the server', () => {
  it('has no network without a server address and says so in plain words', async () => {
    const o = new PhoneOnline(null);
    expect(o.available).toBe(false);
    const r = await o.send(B, 'hi'); expect(r.ok).toBe(false);
  });
  it('checks the number before it asks the server, cleans the text, and passes only the digits', async () => {
    const calls: { url: string; body: string }[] = [];
    const o = new PhoneOnline('https://x.example', async (u, i) => { calls.push({ url: String(u), body: String(i?.body ?? '') }); return reply(200, { id: 7 }); });
    expect((await o.send('+7 0123 4567-89-00', 'hi')).ok).toBe(false);          // wrong check digit: no request
    expect(calls.length).toBe(0);
    const ok = await o.send(B, '  hello <b> world  ');
    expect(ok).toEqual({ ok: true, value: 7 });
    expect(JSON.parse(calls[0].body)).toEqual({ to: B.replace(/[^\d]/g, '').slice(1), body: 'hello b world' });
    expect((await o.send(B, '   ')).ok).toBe(false);
  });
  it('turns a 401, a server code and a network failure into sentences', async () => {
    expect(await new PhoneOnline('https://x.example', async () => reply(401, {})).texts()).toEqual({ ok: false, why: phoneWhy('not signed in') });
    const r = await new PhoneOnline('https://x.example', async () => reply(400, { error: 'chat is for adults' })).send(B, 'hi');
    expect(r.ok === false && r.why).toContain('adults');
    const n = await new PhoneOnline('https://x.example', async () => { throw new Error('offline'); }).number();
    expect(n.ok).toBe(false);
  });
  it('reads the number and the texts back in the written form and drops anything that is not a number of the game', async () => {
    const d = A.replace(/[^\d]/g, '').slice(1);
    const num = await new PhoneOnline('https://x.example', async () => reply(200, { digits: d })).number();
    expect(num).toEqual({ ok: true, value: A });
    const t = await new PhoneOnline('https://x.example', async () => reply(200, [{ id: '2', body: 'b', mine: false, other: d, created_at: 'x' }, { id: '1', body: 'a', mine: true, other: 'junk', created_at: 'x' }])).texts();
    expect(t.ok && t.value.map(x => x.id)).toEqual([1, 2]);
    expect(t.ok && t.value[1].other).toBe(A);
    expect(t.ok && t.value[0].other).toBe('');
    const g = await new PhoneOnline('https://x.example', async () => reply(200, [{ id: 1, kind: 'offer', data: '{}', from: d }, { id: 2, kind: 'ice', data: '', from: null }])).signals();
    expect(g.ok && g.value.length).toBe(1);
  });
});

/* a fake connection and microphone: enough to follow what the call does */
const fakeStream = (): MediaStream => { const track = { enabled: true, stop() { this.stopped = true; }, stopped: false }; return { getTracks: () => [track], getAudioTracks: () => [track], track } as unknown as MediaStream; };
function fakePeer(): { make: () => RTCPeerConnection; made: { remote: unknown[]; added: unknown[]; closed: boolean } } {
  const made = { remote: [] as unknown[], added: [] as unknown[], closed: false };
  const pc = { remoteDescription: null as unknown, addTrack() { /* a track is added */ }, createOffer: async () => ({ type: 'offer', sdp: 'o' }), createAnswer: async () => ({ type: 'answer', sdp: 'a' }), setLocalDescription: async () => undefined,
    setRemoteDescription: async (d: unknown) => { made.remote.push(d); pc.remoteDescription = d; }, addIceCandidate: async (c: unknown) => { made.added.push(c); }, close() { made.closed = true; }, connectionState: 'new' };
  return { make: () => pc as unknown as RTCPeerConnection, made };
}

describe('audio calls', () => {
  const setup = (): { call: Call; sent: { to: string; kind: string }[]; states: CallState[]; mic: { n: number }; peer: ReturnType<typeof fakePeer> } => {
    const sent: { to: string; kind: string }[] = [], states: CallState[] = [], mic = { n: 0 }, peer = fakePeer();
    const call = new Call({ online: { signal: async (to, kind) => { sent.push({ to, kind }); return { ok: true, value: true }; }, signals: async () => ({ ok: true, value: [] }) },
      peer: peer.make, mic: async () => { mic.n++; return fakeStream(); }, onState: st => { states.push(st); }, iceUrls: [] });
    return { call, sent, states, mic, peer };
  };
  it('asks for the microphone only when placing a call, and sends an offer to that number', async () => {
    const { call, sent, mic, states } = setup();
    expect(mic.n).toBe(0);
    expect(await call.place(B)).toBe(true);
    expect(mic.n).toBe(1); expect(sent).toEqual([{ to: B, kind: 'offer' }]); expect(states).toEqual(['calling']);
  });
  it('a ringing call does not touch the microphone until Answer, and Decline never does', async () => {
    const a = setup();
    await a.call.handle([{ id: 1, kind: 'offer', data: JSON.stringify({ type: 'offer', sdp: 'o' }), from: A }]);
    expect(a.call.state).toBe('ringing'); expect(a.mic.n).toBe(0);
    a.call.decline(); expect(a.mic.n).toBe(0); expect(a.sent).toEqual([{ to: A, kind: 'decline' }]); expect(a.call.state).toBe('ended');
    const b = setup();
    await b.call.handle([{ id: 1, kind: 'offer', data: JSON.stringify({ type: 'offer', sdp: 'o' }), from: A }, { id: 2, kind: 'ice', data: JSON.stringify({ candidate: 'c' }), from: A }]);
    expect(await b.call.answer()).toBe(true);
    expect(b.mic.n).toBe(1); expect(b.peer.made.remote.length).toBe(1); expect(b.peer.made.added.length).toBe(1);   // the early candidate was kept and then used
    expect(b.sent.map(x => x.kind)).toEqual(['answer']);
  });
  it('a second caller hears busy, signals from strangers are ignored, and hang up releases the microphone', async () => {
    const { call, sent, peer } = setup();
    await call.place(B);
    await call.handle([{ id: 1, kind: 'offer', data: '{}', from: A }]);
    expect(sent.at(-1)).toEqual({ to: A, kind: 'decline' }); expect(call.state).toBe('calling');
    await call.handle([{ id: 2, kind: 'hangup', data: '', from: A }]); expect(call.state).toBe('calling');          // not the person we rang
    await call.handle([{ id: 3, kind: 'answer', data: JSON.stringify({ type: 'answer', sdp: 'a' }), from: B }]);
    expect(peer.made.remote.length).toBe(1);
    call.hangUp(); expect(call.state).toBe('ended'); expect(peer.made.closed).toBe(true); expect(sent.at(-1)).toEqual({ to: B, kind: 'hangup' });
  });
  it('a refused microphone ends the call with a plain sentence; bad JSON from the other side does not crash', async () => {
    const notes: string[] = [];
    const call = new Call({ online: { signal: async () => ({ ok: true, value: true }), signals: async () => ({ ok: true, value: [] }) }, mic: async () => { throw new Error('denied'); }, peer: fakePeer().make, onState: (_s, _w, n) => { notes.push(n); }, iceUrls: [] });
    expect(await call.place(B)).toBe(false); expect(notes.at(-1)).toContain('microphone');
    const c2 = setup(); await c2.call.place(B);
    await c2.call.handle([{ id: 1, kind: 'answer', data: '{not json', from: B }]);
    expect(c2.call.state).toBe('ended');
  });
  it('reads the helper servers from the build setting and ignores anything that is not stun/turn', () => {
    expect(iceFromEnv({ VITE_ICE_URLS: 'stun:a.example:3478, javascript:alert(1), turn:b.example:3478?transport=tcp' })).toEqual(['stun:a.example:3478', 'turn:b.example:3478?transport=tcp']);
    expect(iceFromEnv({})[0]).toMatch(/^stun:/);
  });
});

describe('phone skins', () => {
  it('there are eight, each with a name in both languages and no brand names', () => {
    expect(SKINS.length).toBe(8);
    for (const k of SKINS) { expect(k.name.length).toBeGreaterThan(3); expect(k.ru.length).toBeGreaterThan(3); expect(k.name + k.blurb).not.toMatch(/iphone|samsung|xiaomi|pixel|huawei|nokia|apple|galaxy/i); }
  });
  it('the device picks a shape, the choice is kept, and bad storage falls back to the device', () => {
    expect(detectSkin({ width: 390, height: 844, touch: true, ua: 'Mozilla/5.0 (iPhone)' })).toBe('island');
    expect(detectSkin({ width: 820, height: 1180, touch: true, ua: 'Mozilla/5.0 (iPad)' })).toBe('tablet');
    expect(detectSkin({ width: 412, height: 915, touch: true, ua: 'Mozilla/5.0 (Linux; Android 14)' })).toBe('punch');
    expect(detectSkin({ width: 320, height: 640, touch: true, ua: 'Mozilla/5.0 (Linux; Android 8)' })).toBe('compact');
    expect(detectSkin({ width: 240, height: 320, touch: false, ua: 'Opera Mini KaiOS' })).toBe('keypad');
    expect(detectSkin({ width: 1400, height: 900, touch: false, ua: 'Mozilla/5.0 (Windows)' })).toBe('notch');
    const kv = mem(), dev = { width: 390, height: 844, touch: true, ua: 'iPhone' };
    expect(skinOf(kv, dev)).toBe('island'); setSkin('keypad', kv); expect(skinOf(kv, dev)).toBe('keypad');
    kv.setItem('vrussia_phone_skin', '<script>'); expect(skinOf(kv, dev)).toBe('island');
    const el = document.createElement('div'); applySkin(el, 'budget'); applySkin(el, 'tablet'); expect(el.className).toBe('skin-tablet');
  });
});

describe('the Players screen in the page', () => {
  it('opens from the home screen, checks a typed number, opens a thread, and the look can be changed', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    window.confirm = () => true;
    const { boot } = await import('../src/ui');
    boot(); await (await import('../src/ui')).uiReady();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Pl';
    document.getElementById('startBtn')!.click();
    for (let i = 0; i < 40 && !document.querySelector('#actions button'); i++) (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();
    (window as unknown as { __state: () => { flags: Record<string, boolean> } | null }).__state()!.flags.sim = true;
    const body = (): HTMLElement => document.getElementById('modalBody') as HTMLElement;
    document.getElementById('dockPhone')!.click();
    const sel = body().querySelector('#phSkin') as HTMLSelectElement;
    sel.value = 'keypad'; sel.dispatchEvent(new Event('change'));
    expect(body().querySelector('.phone')!.classList.contains('skin-keypad')).toBe(true);
    (body().querySelector('[data-sys="players"]') as HTMLButtonElement).click();
    expect(body().textContent).toContain('+7 0');
    (body().querySelector('#phDialNo') as HTMLInputElement).value = '+7 0123 4567-89-00';
    (body().querySelector('[data-pdial="text"]') as HTMLButtonElement).click();
    expect(body().querySelector('.phNote')!.textContent).toContain('not a number');
    (body().querySelector('#phDialNo') as HTMLInputElement).value = B;
    (body().querySelector('[data-pdial="text"]') as HTMLButtonElement).click();
    expect(body().querySelector('#phPForm')).toBeTruthy();
    expect(body().textContent).toContain(B);
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  }, 60000);
});
