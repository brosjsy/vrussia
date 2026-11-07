import { describe, it, expect, afterEach } from 'vitest';
import { ApiCloud } from '../src/api-client';

class FakeSource {
  static all: FakeSource[] = [];
  closed = false; listeners: Record<string, (() => void)[]> = {};
  constructor(public url: string, public opts?: { withCredentials?: boolean }) { FakeSource.all.push(this); }
  addEventListener(name: string, fn: () => void): void { (this.listeners[name] ??= []).push(fn); }
  close(): void { this.closed = true; }
  emit(name: string): void { (this.listeners[name] ?? []).forEach(f => f()); }
}
const g = globalThis as unknown as { EventSource?: unknown };
afterEach(() => { delete g.EventSource; FakeSource.all = []; });

describe('the live stream in the browser client', () => {
  it('opens one stream with the cookie, nudges on news, and stops when told', () => {
    g.EventSource = FakeSource;
    const api = new ApiCloud('https://api.example.org', { kv: null });
    let nudges = 0; const stop = api.live(['place:Moscow:cafe', 'place:Moscow:market'], () => { nudges++; });
    const es = FakeSource.all[0]!;
    expect(es.url).toBe('https://api.example.org/api/live?rooms=place%3AMoscow%3Acafe%2Cplace%3AMoscow%3Amarket'); expect(es.opts?.withCredentials).toBe(true);
    es.emit('msg'); es.emit('msg'); expect(nudges).toBe(2);
    stop(); expect(es.closed).toBe(true);
  });
  it('does nothing where the browser has no EventSource or no room is given', () => {
    const api = new ApiCloud('https://api.example.org', { kv: null });
    expect(() => api.live(['place:Moscow:cafe'], () => undefined)()).not.toThrow();
    g.EventSource = FakeSource; api.live([], () => undefined)(); expect(FakeSource.all).toHaveLength(0);
  });
});
