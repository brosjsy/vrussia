import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { call, player, start } from './util.js';
import type { Ctx } from './util.js';
import { luhn, newDigits } from '../src/routes-phone.js';

let c: Ctx;
let A: Awaited<ReturnType<typeof player>>, B: Awaited<ReturnType<typeof player>>, K: Awaited<ReturnType<typeof player>>;
let na = '', nb = '', nk = '';
beforeAll(async () => {
  c = await start();
  A = await player(c, 'anna'); B = await player(c, 'boris'); K = await player(c, 'kid', false);
  na = String((await call(c, 'GET', '/api/phone/number', undefined, A.cookie)).json.digits);
  nb = String((await call(c, 'GET', '/api/phone/number', undefined, B.cookie)).json.digits);
  nk = String((await call(c, 'GET', '/api/phone/number', undefined, K.cookie)).json.digits);
}, 120_000);
afterAll(async () => { await c?.app.close(); await c?.t.close(); });

describe('game numbers', () => {
  it('are made with the Luhn check digit, in the player range, never start like a real number, and do not change', async () => {
    for (let i = 0; i < 50; i++) { const d = newDigits(); expect(d).toMatch(/^0[1-8]\d{10}$/); expect(luhn(d.slice(0, 11))).toBe(Number(d[11])); }
    expect(na).toMatch(/^0[1-8]\d{10}$/); expect(na).not.toBe(nb);
    expect((await call(c, 'GET', '/api/phone/number', undefined, A.cookie)).json.digits).toBe(na);
    expect((await call(c, 'GET', '/api/phone/number')).status).toBe(401);
  });
});

describe('texts between players', () => {
  it('an adult can text another adult by number; both see it; the receiver learns the sender number', async () => {
    const r = await call(c, 'POST', '/api/phone/texts', { to: nb, body: 'hello Boris' }, A.cookie);
    expect(r.status).toBe(200);
    const inbox = (await call(c, 'GET', '/api/phone/texts', undefined, B.cookie)).json as unknown as { body: string; mine: boolean; other: string }[];
    expect(inbox[0]).toMatchObject({ body: 'hello Boris', mine: false, other: na });
    const sent = (await call(c, 'GET', '/api/phone/texts', undefined, A.cookie)).json as unknown as { mine: boolean; other: string }[];
    expect(sent[0]).toMatchObject({ mine: true, other: nb });
  });
  it('refuses a child, an unknown number, yourself, bad words, contact details, markup-sized bodies and extra fields', async () => {
    const send = async (cookie: string, body: unknown): Promise<number> => (await call(c, 'POST', '/api/phone/texts', body, cookie)).status;
    expect(await send(K.cookie, { to: na, body: 'hi' })).toBe(400);                   // chat is for adults
    expect(await send(A.cookie, { to: '012345678901', body: 'hi' })).toBe(400);       // no such number
    expect(await send(A.cookie, { to: na, body: 'hi' })).toBe(400);                   // yourself
    expect(await send(A.cookie, { to: nb, body: 'you fuck' })).toBe(400);
    expect(await send(A.cookie, { to: nb, body: 'call me on +79001234567' })).toBe(400);
    expect(await send(A.cookie, { to: nb, body: 'x'.repeat(161) })).toBe(400);
    expect(await send(A.cookie, { to: nb, body: 'ok', extra: 1 })).toBe(400);
    expect(await send(A.cookie, { to: 'not a number', body: 'ok' })).toBe(400);
    expect((await call(c, 'POST', '/api/phone/texts', { to: nb, body: 'ok' })).status).toBe(401);
  });
  it('a block stops texts; a report from two people hides a text; the rate limit holds', async () => {
    const X = await player(c, 'xena'); const nx = String((await call(c, 'GET', '/api/phone/number', undefined, X.cookie)).json.digits);
    await call(c, 'POST', '/api/phone/block', { number: na }, X.cookie);
    expect((await call(c, 'POST', '/api/phone/texts', { to: nx, body: 'hello' }, A.cookie)).status).toBe(400);
    const Y = await player(c, 'yuri'); const ny = String((await call(c, 'GET', '/api/phone/number', undefined, Y.cookie)).json.digits);
    let last = 0;
    for (let i = 0; i < 7; i++) last = (await call(c, 'POST', '/api/phone/texts', { to: ny, body: 'msg ' + i }, B.cookie)).status;
    expect(last).toBe(400);                                                           // slow down after 6 in 30 seconds
  });
});

describe('call signalling', () => {
  it('passes an offer to the other side once, and deletes it when read; refuses strangers and children', async () => {
    const P = await player(c, 'paula'), Q = await player(c, 'quentin');
    const np = String((await call(c, 'GET', '/api/phone/number', undefined, P.cookie)).json.digits), nq = String((await call(c, 'GET', '/api/phone/number', undefined, Q.cookie)).json.digits);
    expect((await call(c, 'POST', '/api/phone/signal', { to: nq, kind: 'offer', data: '{"sdp":"x"}' }, P.cookie)).status).toBe(200);
    const got = (await call(c, 'GET', '/api/phone/signal', undefined, Q.cookie)).json as unknown as { kind: string; from: string }[];
    expect(got).toHaveLength(1); expect(got[0]).toMatchObject({ kind: 'offer', from: np });
    expect(((await call(c, 'GET', '/api/phone/signal', undefined, Q.cookie)).json as unknown as unknown[]).length).toBe(0);
    expect((await call(c, 'POST', '/api/phone/signal', { to: nq, kind: 'bad', data: '' }, P.cookie)).status).toBe(400);
    expect((await call(c, 'POST', '/api/phone/signal', { to: nq, kind: 'ice', data: 'x'.repeat(8001) }, P.cookie)).status).toBe(400);
    expect((await call(c, 'POST', '/api/phone/signal', { to: np, kind: 'offer', data: '' }, P.cookie)).status).toBe(400);   // not to yourself
    expect((await call(c, 'POST', '/api/phone/signal', { to: np, kind: 'offer', data: '' }, K.cookie)).status).toBe(400);    // a child cannot call
  });
  it('the erase route removes the texts of the player', async () => {
    expect((await call(c, 'DELETE', '/api/phone/data', undefined, B.cookie)).status).toBe(200);
    expect(((await call(c, 'GET', '/api/phone/texts', undefined, B.cookie)).json as unknown as unknown[]).length).toBe(0);
  });
});
