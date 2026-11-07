// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as G from '../src/engine';
import { GIFTS, KINDS, MAX_MONEY, cannotSend, cost, pay, receive } from '../src/gifts';
import { mountGifts } from '../src/gift-ui';
import type { OnlineClient } from '../src/cloud';

const ok = <T>(data: T) => Promise.resolve({ ok: true, msg: '', data });
const flush = async (): Promise<void> => { for (let i = 0; i < 8; i++) await Promise.resolve(); await new Promise(r => setTimeout(r, 0)); };
const player = (): G.State => { const s = G.newState('T', 'moscow'); s.money = 5000; s.stress = 40; s.energy = 50; return s; };
const host = (): HTMLElement => { const el = document.createElement('div'); document.body.appendChild(el); return el; };
function fake(over: Record<string, unknown> = {}): { c: OnlineClient; calls: string[] } {
  const calls: string[] = [];
  const c = {
    session: () => ({ userId: 'u1', username: 'anna', adult: true, email: 'a@b.c', access: '', refresh: '', expires: 0 }),
    myGifts: vi.fn(() => ok([{ id: 7, sender: 'u2', sender_name: 'bakyt', kind: 'tea', amount: 0, note: 'Warm <b>wishes</b>' }, { id: 8, sender: 'u2', sender_name: 'bakyt', kind: 'money', amount: 300, note: '' }])),
    claimGift: vi.fn((id: number) => { calls.push('claim:' + id); return ok({ ok: true }); }),
    sendGift: vi.fn((to: string, k: string, a: number, n: string) => { calls.push(`send:${to}:${k}:${a}:${n}`); return ok({ id: 1 }); }),
    friends: vi.fn(() => ok([{ id: 'u3', username: 'kofi', mutual: true, online: true, city: null, place: null }, { id: 'u4', username: 'dina', mutual: false, online: false, city: null, place: null }])),
    ...over,
  };
  return { c: c as unknown as OnlineClient, calls };
}

afterEach(() => { document.body.innerHTML = ''; });     // every test mounts its own form: the same ids must not pile up in the page

describe('what a gift costs and does', () => {
  it('has seven kinds, each with a price and an effect that does something for the one who takes it', () => {
    expect(KINDS).toHaveLength(7);
    for (const k of KINDS) { expect(GIFTS[k].icon).toBeTruthy(); expect(GIFTS[k].en.length).toBeGreaterThan(3); expect(GIFTS[k].ru).toMatch(/[а-яё]/i); }
    expect(cost('tea')).toBe(150); expect(cost('money', 300)).toBe(300); expect(cost('money', 99999)).toBe(MAX_MONEY); expect(cost('money', -5)).toBe(0);
  });
  it('are refused when the wallet is too small or a money gift is out of range, and are paid for by the sender', () => {
    const s = player(); s.money = 200;
    expect(cannotSend(s, 'scarf')).toMatch(/enough money/); expect(cannotSend(s, 'tea')).toBeNull();
    expect(cannotSend(s, 'money', 10)).toMatch(/between 50/); expect(cannotSend(s, 'money', 5000)).toMatch(/between 50/);
    s.money = 5000; pay(s, 'flowers'); expect(s.money).toBe(4550); pay(s, 'money', 300); expect(s.money).toBe(4250);
  });
  it('help the one who takes them: tea eases stress, soup restores energy, money goes into the wallet', () => {
    const s = player(); receive(s, 'tea'); expect(s.stress).toBe(36); receive(s, 'soup'); expect(s.energy).toBe(56);
    const m = s.money; expect(receive(s, 'money', 300)).toBe('+300 ₽'); expect(s.money).toBe(m + 300); expect(receive(s, 'money', 99999)).toBe('+1,000 ₽');
  });
});

describe('the gifts tab', () => {
  it('shows the inbox with escaped notes, and taking a gift calls the server then gives its effect', async () => {
    const { c, calls } = fake(); const s = player(); const el = host(); const stop = mountGifts(el, c, { notify: () => undefined, state: () => s }); await flush();
    expect(el.textContent).toContain('@bakyt'); expect(el.innerHTML).toContain('&lt;b&gt;wishes&lt;/b&gt;'); expect(el.querySelector('li b b')).toBeNull();
    const m0 = s.money; (el.querySelector('[data-gift="take:8"]') as HTMLButtonElement).click(); await flush();
    expect(calls).toContain('claim:8'); expect(s.money).toBe(m0 + 300); stop();
  });
  it('does not give the effect when the server refuses the claim', async () => {
    const { c } = fake({ claimGift: vi.fn(() => Promise.resolve({ ok: false, msg: 'No such gift.' })) }); const s = player(); const el = host(); const stop = mountGifts(el, c, { notify: () => undefined, state: () => s }); await flush();
    const m0 = s.money; (el.querySelector('[data-gift="take:8"]') as HTMLButtonElement).click(); await flush(); expect(s.money).toBe(m0); stop();
  });
  it('sends a gift to a mutual friend only, shows the money box for money, and charges the sender after the server accepts', async () => {
    const { c, calls } = fake(); const s = player(); const el = host(); const stop = mountGifts(el, c, { notify: () => undefined, state: () => s }); await flush();
    expect(Array.from(el.querySelectorAll('#giftTo option')).map(o => o.textContent)).toEqual(['@kofi']);
    const kind = el.querySelector('#giftKind') as HTMLSelectElement, amount = el.querySelector('#giftAmount') as HTMLInputElement; expect(amount.style.display).toBe('none');
    kind.value = 'money'; kind.dispatchEvent(new Event('change')); expect(amount.style.display).toBe('');
    amount.value = '400'; (el.querySelector('#giftNote') as HTMLInputElement).value = 'For the rent';
    const m0 = s.money; (el.querySelector('#giftSend') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true })); await flush();
    expect(calls).toContain('send:u3:money:400:For the rent'); expect(s.money).toBe(m0 - 400); stop();
  });
  it('does not charge the sender when the server says no, and refuses a gift the wallet cannot pay for', async () => {
    const { c, calls } = fake({ sendGift: vi.fn(() => Promise.resolve({ ok: false, msg: 'daily limit' })) }); const s = player(); const el = host(); const stop = mountGifts(el, c, { notify: () => undefined, state: () => s }); await flush();
    const m0 = s.money; (el.querySelector('#giftSend') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true })); await flush(); expect(s.money).toBe(m0);
    s.money = 10; (el.querySelector('#giftSend') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true })); await flush(); expect((c.sendGift as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(1); expect(calls).toHaveLength(0); stop();
  });
});
