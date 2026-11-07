// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import * as G from '../src/engine';
import { mountFlat } from '../src/flat-ui';
import { startSync } from '../src/cloud-sync';
import type { OnlineClient } from '../src/cloud';

const ok = <T>(data: T) => Promise.resolve({ ok: true, msg: '', data });
const flush = async (): Promise<void> => { for (let i = 0; i < 8; i++) await Promise.resolve(); await new Promise(r => setTimeout(r, 0)); };
const flat3 = { id: 1, city: 'Moscow', owner: 'u1', members: [{ id: 'u1', username: 'anna', chore_today: false }, { id: 'u2', username: 'bakyt', chore_today: true }, { id: 'u3', username: 'kofi', chore_today: false }] };
function fake(over: Record<string, unknown> = {}): { c: OnlineClient; calls: string[] } {
  const calls: string[] = [];
  const c = {
    session: () => ({ userId: 'u1', username: 'anna', adult: true, email: 'a@b.c', access: '', refresh: '', expires: 0 }),
    myFlat: vi.fn(() => ok({ flat: null, invites: [] })), createFlat: vi.fn((city: string) => { calls.push('create:' + city); return ok({ id: 1 }); }),
    inviteToFlat: vi.fn((f: string) => { calls.push('invite:' + f); return ok({ id: 1 }); }), answerFlatInvite: vi.fn((id: number, a: boolean) => { calls.push(`answer:${id}:${a}`); return ok({ ok: true }); }),
    leaveFlat: vi.fn(() => { calls.push('leave'); return ok({ ok: true }); }), doChore: vi.fn(() => { calls.push('chore'); return ok({ doneToday: 1 }); }),
    friends: vi.fn(() => ok([{ id: 'u4', username: 'dina', mutual: true, online: true, city: null, place: null }, { id: 'u2', username: 'bakyt', mutual: true, online: false, city: null, place: null }])),
    ...over,
  };
  return { c: c as unknown as OnlineClient, calls };
}
const host = (): HTMLElement => { const el = document.createElement('div'); document.body.appendChild(el); return el; };
const player = (): G.State => { const s = G.newState('T', 'student'); s.rent = 30000; return s; };

describe('rent in a shared flat', () => {
  it('splits the rent equally between the people who live there, and not at all when alone', () => {
    const s = player(); expect(G.rentDue(s)).toBe(30000);
    s.tmp.flatmates = 1; expect(G.rentDue(s)).toBe(15000);
    s.tmp.flatmates = 3; expect(G.rentDue(s)).toBe(7500);
    s.tmp.flatmates = 99; expect(G.rentDue(s)).toBe(7500);            // never more than four people
    s.tmp.flatmates = -2; expect(G.rentDue(s)).toBe(30000); s.tmp.flatmates = 'x'; expect(G.rentDue(s)).toBe(30000);
  });
  it('takes only the share from the money on Saturday', () => {
    const s = player(); s.tmp.flatmates = 2; s.money = 60000; s.rent = 30000; s.day = 3;      // the game starts on a Tuesday: day 4 is a Saturday
    const out = G.endDay(s);
    expect(out.find(l => l.includes('rent paid'))).toMatch(/−₽10,000.*3 people live in the flat/);
    const alone = player(); alone.money = 60000; alone.rent = 30000; alone.day = 3;
    expect(G.endDay(alone).find(l => l.includes('rent paid'))).toMatch(/−₽30,000/);
  });
});

describe('the flat tab', () => {
  it('offers to start a flat in the player\'s city and creates it', async () => {
    const { c, calls } = fake(); const s = player(); s.city = 'Kazan'; const el = host(); const stop = mountFlat(el, c, { notify: () => undefined, state: () => s }); await flush();
    expect(el.textContent).toContain('Kazan'); (el.querySelector('[data-flat="start:0"]') as HTMLButtonElement).click(); await flush(); expect(calls).toContain('create:Kazan'); stop();
  });
  it('shows the flatmates and the rent share, sets the game, invites a free friend and does the chore', async () => {
    const { c, calls } = fake({ myFlat: vi.fn(() => ok({ flat: flat3, invites: [] })) }); const s = player(); const el = host();
    const stop = mountFlat(el, c, { notify: () => undefined, state: () => s }); await flush();
    expect(s.tmp.flatmates).toBe(2); expect(el.textContent).toContain('@kofi'); expect(el.textContent).toContain('10,000'); expect(el.textContent).toContain('(3/4)');
    expect(Array.from(el.querySelectorAll('#flFriend option')).map(o => o.textContent)).toEqual(['@dina']);
    (el.querySelector('#flInvite') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true })); await flush(); expect(calls).toContain('invite:u4');
    (el.querySelector('[data-flat="chore:0"]') as HTMLButtonElement).click(); await flush(); expect(calls).toContain('chore');
    (el.querySelector('[data-flat="leave:0"]') as HTMLButtonElement).click(); await flush(); expect(calls).toContain('leave'); stop();
  });
  it('clears the rent share when the player no longer lives in a flat', async () => {
    const { c } = fake(); const s = player(); s.tmp.flatmates = 2; const el = host(); const stop = mountFlat(el, c, { notify: () => undefined, state: () => s }); await flush();
    expect(s.tmp.flatmates).toBe(0); stop();
  });
});

describe('the background sync of the flat', () => {
  it('reads the number of flatmates into the game on the first tick', async () => {
    const s = player(); let tick: () => void = () => undefined, t = 1_000_000;
    const { c } = fake({ myFlat: vi.fn(() => ok({ flat: flat3, invites: [] })), save: vi.fn(() => ok(1)), publishHome: vi.fn(() => ok(1)) });
    const win = { addEventListener: () => undefined, removeEventListener: () => undefined, setInterval: ((fn: () => void) => { tick = fn; return 1; }) as unknown as Window['setInterval'], clearInterval: () => undefined };
    const doc = { addEventListener: () => undefined, removeEventListener: () => undefined, visibilityState: 'visible' } as unknown as Document;
    const sync = startSync({ cloud: c, state: () => s, now: () => t, win, doc }); tick(); await flush();
    expect(s.tmp.flatmates).toBe(2); sync.stop();
  });
});
