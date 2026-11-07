// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTour } from '../src/platform/onboarding';

const click = (id: string): void => { (document.getElementById(id) as HTMLElement).click(); };
const modalText = (): string => document.getElementById('modalBody')!.textContent ?? '';

async function boot(): Promise<void> {
  document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
  const { boot: b, uiReady } = await import('../src/ui');
  b(); await uiReady();
}

describe('the platform in the page', () => {
  beforeEach(() => { localStorage.clear(); });

  it('asks about privacy once, and the answer sticks', async () => {
    await boot();
    expect(document.getElementById('consent')).toBeTruthy();
    expect(document.querySelector('#consent [role]')).toBeNull();
    click('cbNo');
    expect(document.getElementById('consent')).toBeNull();
    expect(JSON.parse(localStorage.getItem('vrussia_consent')!).analytics).toBe(false);
  });

  it('the More menu opens every screen and each has a way back', async () => {
    localStorage.setItem('vrussia_consent', JSON.stringify({ v: 1, analytics: false, at: 1 }));
    await boot();
    const hub = document.querySelector<HTMLElement>('#title [data-pf-open]')!;
    expect(hub.textContent).toMatch(/More|Ещё/);
    for (const screen of ['lang', 'privacy', 'report', 'sources', 'cls', 'daily', 'packs', 'a11y', 'terms']) {
      hub.click();
      expect(modalText(), 'menu').toContain('Menu');
      (document.querySelector(`#modalBody [data-pf="${screen}"]`) as HTMLElement).click();
      expect(modalText().length, screen).toBeGreaterThan(30);
      await vi.waitFor(() => expect(document.querySelector('#modalBody [data-pf="hub"]'), `${screen} has a way back`).toBeTruthy());
    }
  });

  it('My data: choosing analytics is saved, and erasing removes this game’s keys only', async () => {
    localStorage.setItem('vrussia_consent', JSON.stringify({ v: 1, analytics: false, at: 1 }));
    await boot();
    document.querySelector<HTMLElement>('#title [data-pf-open]')!.click();
    (document.querySelector('#modalBody [data-pf="privacy"]') as HTMLElement).click();
    await vi.waitFor(() => expect(document.getElementById('pfAn')).toBeTruthy());
    const box = document.getElementById('pfAn') as HTMLInputElement;
    box.checked = true; box.dispatchEvent(new Event('change'));
    expect(JSON.parse(localStorage.getItem('vrussia_consent')!).analytics).toBe(true);
    localStorage.setItem('someone_else', 'keep');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    click('pfEr');
    expect(localStorage.getItem('someone_else')).toBe('keep');
    expect(localStorage.getItem('vrussia_consent')).toBeNull();
    expect(document.getElementById('pfMsg')!.textContent).toMatch(/Erased/);
  });

  it('a new player gets the tour instead of the long guide; it can be skipped with Escape and stays skipped', async () => {
    await boot();
    click('startBtn');
    await vi.waitFor(() => expect(document.getElementById('tour')).toBeTruthy(), { timeout: 4000 });
    expect(document.getElementById('tour')!.textContent).toMatch(/Your day/);
    expect(modalText()).not.toMatch(/How to play/);
    click('tourNext'); expect(document.getElementById('tour')!.textContent).toMatch(/The city/);
    click('tourBack'); expect(document.getElementById('tour')!.textContent).toMatch(/Your day/);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.getElementById('tour')).toBeNull();
    expect(loadTour().status).toBe('skipped');
  });

  it('finishing the tour saves it; Replay starts it again', async () => {
    await boot();
    click('startBtn');
    await vi.waitFor(() => expect(document.getElementById('tour')).toBeTruthy(), { timeout: 4000 });
    for (let i = 0; i < 20 && document.getElementById('tour'); i++) click('tourNext');
    expect(document.getElementById('tour')).toBeNull(); expect(loadTour().status).toBe('done');
    document.querySelector<HTMLElement>('#game [data-pf-open]')!.click();
    (document.querySelector('#modalBody [data-pf="tour"]') as HTMLElement).click();
    await vi.waitFor(() => expect(document.getElementById('tour')).toBeTruthy());
    expect(loadTour().status).toBe('new');
  });

  // before the tests that start a game: a game left open by an earlier test hides the title screen this one uses
  it('a pack file added through the page puts its scenario into the game', async () => {
    localStorage.setItem('vrussia_consent', JSON.stringify({ v: 1, analytics: false, at: 1 }));
    await boot();
    const { TEMPLATE } = await import('../src/platform/packs');
    const G = await import('../src/engine');
    document.querySelector<HTMLElement>('#title [data-pf-open]')!.click();
    (document.querySelector('#modalBody [data-pf="packs"]') as HTMLElement).click();
    const input = document.getElementById('pkFile') as HTMLInputElement;
    const choose = (text: string): void => { Object.defineProperty(input, 'files', { value: [{ text: async () => text }], configurable: true }); input.dispatchEvent(new Event('change')); };
    choose('{"format":"x"}');
    await vi.waitFor(() => expect(document.getElementById('pkMsg')!.className).toContain('bad'), { timeout: 3000 });
    expect(G.scenarios.some(s => s.id.startsWith('pack-'))).toBe(false);
    choose(JSON.stringify(TEMPLATE));
    await vi.waitFor(() => expect(document.getElementById('pkMsg')!.className).toContain('ok'), { timeout: 3000 });
    expect(G.scenarios.some(s => s.id === 'pack-myclass-bus-ticket')).toBe(true);
    const { removePack } = await import('../src/platform/packs'); removePack('myclass');
  });

  it('the daily game fills the title screen, and Play starts it with today’s character', async () => {
    localStorage.setItem('vrussia_tour', JSON.stringify({ status: 'skipped', step: 0 }));
    // a day whose character is a citizen: the others first open the pre-arrival page, which this test is not about
    const G = await import('../src/engine'); const D = await import('../src/platform/daily');
    let day = Date.UTC(2026, 8, 1); while (!['moscow', 'region'].includes(D.presetFor(D.dateKey(day), G.origins.map(o => o.id), G.CITIES).origin)) day += 864e5;
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(day + 12 * 36e5);
    await boot();
    vi.useRealTimers();
    const box = document.getElementById('dailyBox')!;
    expect(box.hidden).toBe(false); expect(box.textContent).toMatch(/Daily game|Игра дня|Today|Сегодня/);
    click('dailyPlay');
    const w = window as unknown as { __state: () => { tmp: Record<string, number>; status: string } | null };
    expect(w.__state()!.tmp.daily).toBeGreaterThan(20260000);
    // a citizen goes straight into the game; a foreign character opens the pre-arrival page first (which character it is depends on the day)
    if (w.__state()!.status === 'citizen') expect(document.getElementById('game')!.hidden).toBe(false);
    await vi.waitFor(() => expect(modalText()).toMatch(/How to play|Before Russia|До России|prepar|Подготов/i), { timeout: 4000 });
    click('closeModal');
  });

  it('lite mode and high contrast are switches on the page', async () => {
    localStorage.setItem('vrussia_consent', JSON.stringify({ v: 1, analytics: false, at: 1 }));
    await boot();
    document.querySelector<HTMLElement>('#title [data-pf-open]')!.click();
    (document.querySelector('#modalBody [data-pf="a11y"]') as HTMLElement).click();
    const con = document.getElementById('a11Con') as HTMLInputElement;
    con.checked = true; con.dispatchEvent(new Event('change'));
    expect(document.documentElement.classList.contains('hiContrast')).toBe(true);
    const lite = document.getElementById('a11Lite') as HTMLInputElement;
    lite.checked = true; lite.dispatchEvent(new Event('change'));
    expect(document.documentElement.classList.contains('lite')).toBe(true);
    expect(JSON.parse(localStorage.getItem('vrussia_a11y')!)).toEqual({ contrast: true, lite: true });
  });

});
