import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { call, player, start, ORIGIN } from './util.js';
import type { Ctx } from './util.js';

let c: Ctx, A: Awaited<ReturnType<typeof player>>, B: Awaited<ReturnType<typeof player>>, port = 0;
beforeAll(async () => { c = await start(); A = await player(c, 'anna'); B = await player(c, 'bakyt'); await c.app.listen({ port: 0, host: '127.0.0.1' }); port = (c.app.server.address() as AddressInfo).port; }, 120_000);
afterAll(async () => { await c?.app.close(); await c?.t.close(); });

/** Opens the stream like the browser's EventSource does and collects what arrives. */
function open(rooms: string, cookie?: string): Promise<{ status: number; type: string; chunks: string[]; close: () => void; next: () => Promise<string> }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: `/api/live?rooms=${encodeURIComponent(rooms)}`, headers: { origin: ORIGIN, ...(cookie ? { cookie } : {}) } }, res => {
      const chunks: string[] = [], waiters: ((s: string) => void)[] = [];
      res.setEncoding('utf8');
      res.on('data', (d: string) => { chunks.push(d); waiters.shift()?.(d); });
      const next = (): Promise<string> => new Promise(r => waiters.push(r));
      resolve({ status: res.statusCode ?? 0, type: String(res.headers['content-type']), chunks, close: () => req.destroy(), next });
      if ((res.statusCode ?? 0) >= 400) res.resume();
    });
    req.on('error', e => { if ((e as NodeJS.ErrnoException).code !== 'ECONNRESET') reject(e); });
    req.end();
  });
}

describe('the live stream over HTTP', () => {
  it('needs a login and a valid room list', async () => {
    const a = await open('place:Moscow:cafe'); expect(a.status).toBe(401); a.close();
    const b = await open(`direct:${A.id}:${B.id}`.replace(B.id, 'not-a-uuid'), A.cookie); expect(b.status).toBe(400); b.close();
    const o = await open(`direct:${B.id}:${'f'.repeat(8)}-ffff-ffff-ffff-${'f'.repeat(12)}`, A.cookie); expect(o.status).toBe(400); o.close();
  });
  it('tells the listener when a message arrives in the room, and not when it arrives elsewhere', async () => {
    const room = 'place:Moscow:cafe', s = await open(room, B.cookie);
    expect(s.status).toBe(200); expect(s.type).toContain('text/event-stream');
    await new Promise(r => setTimeout(r, 50)); expect(s.chunks.join('')).toContain(': open');
    const wait = s.next();
    const sent = await call(c, 'POST', '/api/messages', { room, body: 'Hello everyone' }, A.cookie);
    expect(sent.status).toBe(200);
    const got = await Promise.race([wait, new Promise<string>(r => setTimeout(() => r('timeout'), 3000))]);
    expect(got).toContain('event: msg'); expect(got).toContain(room); expect(got).not.toContain('Hello everyone');
    s.close();
  });
});
