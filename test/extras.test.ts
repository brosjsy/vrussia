// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { EXTRAS, EXTRAS_OPEN_UNTIL, extrasOpen, press, pressed, INTEREST_KEY, rub } from '../src/extras';
import { extrasHtml, openExtras } from '../src/extras-ui';
import type { KV } from '../src/store';

const mem = (): KV => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); } }; };

describe('extras: the interest test for planned paid services', () => {
  it('lists four offers with real rouble prices, a counter each, and no free text from the player', () => {
    expect(EXTRAS.map(e => e.id)).toEqual(['exam', 'plus', 'looks', 'gift']);
    expect(new Set(EXTRAS.map(e => e.counter)).size).toBe(4);
    for (const e of EXTRAS) { expect(e.counter).toBe('interest_' + e.id); expect(Number.isInteger(e.priceRub) && e.priceRub > 0).toBe(true); expect(e.what.length).toBeGreaterThan(20); expect(e.whatRu.length).toBeGreaterThan(20); }
    expect(rub(1990)).toMatch(/руб\.$/); expect(rub(1990, false)).toMatch(/RUB$/);
  });

  it('counts a device once per offer, and survives broken or missing storage', () => {
    const kv = mem();
    expect(press('exam', kv)).toBe(true);
    expect(press('exam', kv)).toBe(false);                              // pressing again does not push the counter up
    expect(press('gift', kv)).toBe(true);
    expect([...pressed(kv)].sort()).toEqual(['exam', 'gift']);
    kv.setItem(INTEREST_KEY, '{not json'); expect(pressed(kv).size).toBe(0);
    kv.setItem(INTEREST_KEY, JSON.stringify(['exam', 'hack', 5])); expect([...pressed(kv)]).toEqual(['exam']);   // unknown values are dropped
    expect(press('plus', null)).toBe(true);                             // no storage: counted, nothing thrown
  });

  it('is shown until its last day and not after', () => {
    expect(extrasOpen('2026-11-02')).toBe(true);
    expect(extrasOpen(EXTRAS_OPEN_UNTIL)).toBe(true);
    expect(extrasOpen('2027-02-01')).toBe(false);
    expect(extrasHtml(new Set(), '2027-02-01')).toContain('survey has ended');
  });

  it('says plainly that nothing is on sale, shows planned prices in roubles, and asks for no payment or personal data', () => {
    const html = extrasHtml(new Set(), '2026-11-02');
    expect(html).toContain('Not on sale yet.');
    expect(html).toContain('Nothing is charged');
    expect(html).toContain('planned price, not on sale');
    expect(html).toContain('RUB');
    expect(html).not.toMatch(/<input|<form|card number|e-?mail/i);
    expect((html.match(/data-xwant=/g) ?? []).length).toBe(4);
  });

  it('a press sends one count, marks the offer as counted, and a second press sends nothing', () => {
    localStorage.clear();
    const host = document.createElement('div'), sent: string[] = [];
    openExtras(host, { back: () => undefined, send: k => sent.push(k) });
    (host.querySelector('[data-xwant="exam"]') as HTMLButtonElement).click();
    expect(sent).toEqual(['interest_exam']);
    const again = host.querySelector('[data-xwant="exam"]') as HTMLButtonElement;
    expect(again.disabled).toBe(true);
    expect(again.textContent).toContain('counted');
    again.click();
    expect(sent).toEqual(['interest_exam']);
    (host.querySelector('[data-xwant="plus"]') as HTMLButtonElement).click();
    expect(sent).toEqual(['interest_exam', 'interest_plus']);
    localStorage.clear();
  });

  it('is an app on the phone while the test is open', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    window.confirm = () => true; localStorage.clear();
    const ui = await import('../src/ui');
    ui.boot(); await ui.uiReady();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Ex';
    document.getElementById('startBtn')!.click();
    document.getElementById('dockPhone')!.click();
    const app = document.querySelector('#modalBody [data-sys="extras"]') as HTMLButtonElement;
    expect(app).not.toBeNull();
    app.click();
    await new Promise(r => setTimeout(r, 50));
    expect(document.querySelector('#modalBody .extras')).not.toBeNull();
  }, 30000);
});
