// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { groupsFor, requestsFor, resolveRequest } from '../src/phone';

const fresh = (origin = 'moscow'): G.State => { const s = G.newState('T', origin); s.queue = []; s.money = 50000; return s; };

describe('group chats', () => {
  it('follow your life: house always, work, parents, study and newcomers when they apply', () => {
    const s = fresh(); s.job = null; s.kids = 0;
    expect(groupsFor(s).map(g => g.id)).toEqual(['house']);
    s.job = 'courier'; s.kids = 1; s.flags.admitted = true;
    expect(groupsFor(s).map(g => g.id)).toEqual(['house', 'work', 'parents', 'study']);
    expect(groupsFor(fresh('tajik')).map(g => g.id)).toContain('newcomers');
    for (const g of groupsFor(s)) { expect(g.lines.length).toBe(3); for (const l of g.lines) expect(l.from.startsWith('@')).toBe(true); }
  });
});

describe('message requests from unknown numbers', () => {
  it('there are one to three each day, the same all day, different numbers, and bank texts only for people with a bank account', () => {
    const s = fresh(); s.day = 12;
    const a = requestsFor(s), b = requestsFor(s);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(1); expect(a.length).toBeLessThanOrEqual(3);
    expect(new Set(a.map(r => r.from)).size).toBe(a.length);
    for (const r of a) expect(r.from).toMatch(/^\+7 9/);
    let bankSeen = false;
    for (let d = 0; d < 12; d++) { s.day = d; s.bank = {}; if (requestsFor(s).some(r => r.id === 'card')) bankSeen = true; }
    expect(bankSeen).toBe(false);
    s.bank = { sber: true }; for (let d = 0; d < 12; d++) { s.day = d; if (requestsFor(s).some(r => r.id === 'card')) bankSeen = true; }
    expect(bankSeen).toBe(true);
  });
  it('blocking is safe and teaches; opening a scam costs a limited amount; handled requests disappear', () => {
    const s = fresh(); s.bank = { sber: true }; s.day = 3;
    const risky = (): ReturnType<typeof requestsFor>[number] => { for (let d = 0; d < 30; d++) { s.day = d; const r = requestsFor(s).find(x => x.risky); if (r) return r; } throw new Error('none'); };
    const r = risky();
    const block = resolveRequest(s, r, 'block');
    expect(block.fx.money ?? 0).toBe(0); expect(block.fx.know).toBeGreaterThan(0);
    expect(requestsFor(s).some(x => x.id === r.id)).toBe(false);
    s.day += 40; const r2 = (() => { for (let d = s.day; d < s.day + 30; d++) { s.day = d; const x = requestsFor(s).find(y => y.risky); if (x) return x; } throw new Error('none'); })();
    for (const money of [100, 1000, 5000, 100000]) {
      const t = fresh(); t.day = s.day; t.money = money;
      const loss = -(resolveRequest(t, r2, 'open').fx.money as number);
      expect(loss, `with ${money}`).toBeGreaterThanOrEqual(300); expect(loss, `with ${money}`).toBeLessThanOrEqual(3000);
      expect(loss).toBeLessThanOrEqual(Math.max(300, Math.floor(money * 0.6)));
    }
    const poor = fresh(); poor.money = 1000; poor.day = s.day;
    expect(-(resolveRequest(poor, r2, 'open').fx.money as number)).toBe(600);          // 60 per cent of what you have
    const safe = { id: 'sofa', from: '+7 900 000-00-00', text: 'x', risky: false };
    expect(resolveRequest(fresh(), safe, 'open').fx.money ?? 0).toBe(0);
  });
});

describe('the messages screen in the page', () => {
  it('has Chats and Groups tabs, a requests screen that can block, and a bell badge', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    window.confirm = () => true;
    const { boot } = await import('../src/ui');
    boot(); await (await import('../src/ui')).uiReady();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Msg';
    document.getElementById('startBtn')!.click();
    for (let i = 0; i < 40 && !document.querySelector('#actions button'); i++) (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();
    const body = (): HTMLElement => document.getElementById('modalBody') as HTMLElement;
    const click = (sel: string): void => { (body().querySelector(sel) as HTMLButtonElement).click(); };
    document.getElementById('dockPhone')!.click();
    expect(body().querySelector('[data-sys="messages"] .badge')!.textContent).toMatch(/^\d+$/);
    click('[data-sys="messages"]');
    expect(body().querySelector('[data-tab="chats"]')!.getAttribute('aria-selected')).toBe('true');
    expect(body().querySelectorAll('[data-chat]').length).toBeGreaterThan(0);
    click('[data-tab="groups"]');
    expect(body().querySelector('[data-tab="groups"]')!.getAttribute('aria-selected')).toBe('true');
    expect(body().textContent).toContain('House chat');
    click('[data-group="house"]'); expect(body().querySelectorAll('.bubbles .b').length).toBe(3);
    click('[data-go="messages"]');
    click('[data-go="requests"]');
    const n = body().querySelectorAll('[data-req-block]').length;
    expect(n).toBeGreaterThan(0);
    click('[data-req-block]');
    expect(body().querySelector('.phNote')!.textContent).toContain('Blocked');
    expect(body().querySelectorAll('[data-req-block]').length).toBe(n - 1);
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  });
});
