// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('HUD and scene cards', () => {
  it('shows four condition bars, a category accent on scenes, icon tiles for actions, and flashes changes', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    window.confirm = () => true;
    const { boot } = await import('../src/ui');
    boot();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Hud';
    document.getElementById('startBtn')!.click();

    const hud = document.getElementById('hud')!;
    expect(hud.querySelectorAll('.hs').length).toBe(4);
    for (const b of Array.from(hud.querySelectorAll<HTMLElement>('.bar i'))) expect(b.style.width).toMatch(/^\d+%$/);
    let sawRecent = false, sawAccent = false, sawDelta = false, tiles = 0;
    for (let i = 0; i < 300 && !(sawAccent && sawDelta && tiles > 5 && sawRecent); i++) {
      const next = document.getElementById('nextBtn');
      const actions = document.querySelectorAll<HTMLButtonElement>('#actions button');
      const choices = document.querySelectorAll<HTMLButtonElement>('#stage .choices button');
      if (!document.getElementById('end')!.hidden) break;
      if (next) next.click();
      else if (actions.length) actions[i % actions.length].click();
      else if (choices.length) choices[0].click();
      else document.getElementById('close')?.click();
      if (document.querySelector('#stage .recent li')) sawRecent = true;
      tiles = Math.max(tiles, document.querySelectorAll('#actions button .ic').length);
      const stage = document.getElementById('stage')!;
      if (stage.dataset.cat && stage.style.getPropertyValue('--accent')) sawAccent = true;
      if (hud.querySelector('.delta')) sawDelta = true;
      expect(document.getElementById('errbar')!.hidden).toBe(true);
    }
    expect(tiles).toBeGreaterThan(5);
    expect(sawRecent).toBe(true);
    expect(sawAccent).toBe(true);
    expect(sawDelta).toBe(true);
  });
});
