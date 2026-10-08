// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('keyboard shortcuts', () => {
  it('number keys pick options and Enter continues', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    const { boot } = await import('../src/ui');
    boot();
    document.getElementById('startBtn')!.click();
    const press = (key: string): void => { document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); };
    // intro scene has one choice: key 1 picks it, Enter continues
    expect(document.querySelectorAll('#stage .choices button').length).toBeGreaterThan(0);
    press('1');
    expect(document.getElementById('nextBtn')).not.toBeNull();
    press('Enter');
    // now the action grid is shown: key 3 should run an action
    expect(document.querySelectorAll('#actions button').length).toBeGreaterThan(5);
    press('3');
    expect(document.getElementById('stage')!.innerHTML.length).toBeGreaterThan(50);
    // typing in an input must not trigger shortcuts
    document.getElementById('stage')!.insertAdjacentHTML('beforeend', '<input id="tmpInput">');
    const input = document.getElementById('tmpInput') as HTMLInputElement;
    const before = document.getElementById('stage')!.innerHTML;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    expect(document.getElementById('stage')!.innerHTML).toBe(before);
  });
});

describe('help', () => {
  it('opens the how-to-play pop-up from the button and closes it with Escape', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    const { boot } = await import('../src/ui');
    boot();
    document.getElementById('startBtn')!.click();
    document.getElementById('helpBtn')!.click();
    expect(document.getElementById('modal')!.hidden).toBe(false);
    expect(document.getElementById('modalBody')!.textContent).toContain('How to play');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.getElementById('modal')!.hidden).toBe(true);
  });
});
