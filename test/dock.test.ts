// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { flows } from '../src/forms';

describe('the dock, the phone and the clean screen', () => {
  it('shows a dock only during the game, opens a phone with every online service as an app, and starts a service from it', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    window.confirm = () => true;
    const { boot } = await import('../src/ui');
    boot(); await (await import('../src/ui')).uiReady();
    const dock = document.getElementById('dock')!;
    expect(dock.hidden).toBe(true);                                   // title screen: no dock
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Dock';
    document.getElementById('startBtn')!.click();
    expect(dock.hidden).toBe(false);
    expect(dock.querySelectorAll('button').length).toBe(4);

    document.getElementById('dockPhone')!.click();
    expect(document.getElementById('modal')!.hidden).toBe(false);
    const apps = document.querySelectorAll('#modalBody .app[data-flow]');
    expect(apps.length).toBe(flows.length);
    expect(document.querySelectorAll('#modalBody .app[data-sys]').length).toBe(15);      // ten, the Jobs app (Phase 3), Study and Home (Phase 5), Daily life and Trains (round 124)
    expect(document.querySelector('#modalBody .phoneClock')!.textContent).toMatch(/^\d\d:\d\d$/);

    // the first service that is available opens as a website in the main panel and the phone closes
    const open = Array.from(apps).find(a => !a.classList.contains('off')) as HTMLButtonElement;
    expect(open).toBeTruthy();
    open.click();
    expect(document.getElementById('modal')!.hidden).toBe(true);
    expect(document.querySelector('#stage .site')).toBeTruthy();
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  });
  it('an unavailable app shakes and does nothing; the journal app opens the journal; Escape-free closing works', async () => {
    document.getElementById('dockPhone')!.click();
    const off = document.querySelector('#modalBody .app.off') as HTMLButtonElement | null;
    if (off) { off.click(); expect(off.classList.contains('shake')).toBe(true); expect(document.getElementById('modal')!.hidden).toBe(false); }
    (document.querySelector('#modalBody .app[data-sys="journal"]') as HTMLButtonElement).click();
    expect(document.getElementById('modalBody')!.textContent).toMatch(/Journal|Nothing yet|Day/);
  });
  it('the clean-screen button hides the interface panels and shows them again', () => {
    const game = document.getElementById('game')!;
    document.getElementById('cleanBtn')!.click();
    expect(game.classList.contains('clean')).toBe(true);
    expect(document.getElementById('cleanBtn')!.getAttribute('aria-pressed')).toBe('true');
    document.getElementById('cleanBtn')!.click();
    expect(game.classList.contains('clean')).toBe(false);
  });
});
