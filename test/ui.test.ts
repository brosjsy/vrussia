// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('whole page', () => {
  it('boots, starts a game and survives clicking every action many times', async () => {
    const html = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    document.documentElement.innerHTML = html;
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    window.confirm = () => true;
    const { boot } = await import('../src/ui');
    boot();
    expect(document.querySelectorAll('.ocard').length).toBeGreaterThanOrEqual(7);
    expect(document.getElementById('tagCount')!.textContent).toMatch(/scenarios/);
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Test';
    document.getElementById('startBtn')!.click();
    expect(document.getElementById('game')!.hidden).toBe(false);

    for (let i = 0; i < 400; i++) {
      const next = document.getElementById('nextBtn');
      const actions = document.querySelectorAll<HTMLButtonElement>('#actions button');
      const choices = document.querySelectorAll<HTMLButtonElement>('#stage .choices button');
      if (!document.getElementById('end')!.hidden) break;
      if (next) next.click();
      else if (actions.length) actions[Math.floor(Math.random() * actions.length)].click();
      else if (choices.length) choices[Math.floor(Math.random() * choices.length)].click();
      else if (document.getElementById('stage')!.textContent!.includes('Airline website')) document.getElementById('close')?.click();
      expect(document.getElementById('errbar')!.hidden).toBe(true);
    }
    expect(document.getElementById('stats')!.innerHTML).toContain('Energy');
    document.getElementById('profileBtn')!.click();
    expect(document.getElementById('modalBody')!.textContent).toContain('Patriot');
  });
});
