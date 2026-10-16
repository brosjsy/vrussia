// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('the games app in the page', () => {
  it('opens the list, plays memory pairs to the end with a daily prize, and handles city letters', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    window.confirm = () => true;
    const { boot } = await import('../src/ui');
    boot(); await (await import('../src/ui')).uiReady();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Gamer';
    document.getElementById('startBtn')!.click();
    for (let i = 0; i < 40 && !document.querySelector('#actions button'); i++) (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();
    const body = (): HTMLElement => document.getElementById('modalBody') as HTMLElement;
    const click = (sel: string): void => { (body().querySelector(sel) as HTMLButtonElement).click(); };
    document.getElementById('dockPhone')!.click();
    click('[data-sys="games"]');
    expect(body().querySelectorAll('.thread').length).toBe(2);

    // memory: find every pair by trying partners one by one
    click('[data-go="memory"]');
    expect(body().querySelectorAll('.memCard').length).toBe(12);
    for (let i = 0; i < 12; i++) {
      if (body().querySelectorAll('.memCard')[i].classList.contains('done')) continue;
      for (let j = i + 1; j < 12 && !body().querySelectorAll('.memCard')[i].classList.contains('done'); j++) {
        if (body().querySelectorAll('.memCard')[j].classList.contains('done')) continue;
        (body().querySelectorAll('.memCard')[i] as HTMLButtonElement).click();
        (body().querySelectorAll('.memCard')[j] as HTMLButtonElement).click();
      }
    }
    expect(body().querySelectorAll('.memCard.done').length).toBe(12);
    expect(body().querySelector('.phNote')!.textContent).toContain('You won');
    expect(body().querySelector('[data-go="memory-new"]')).toBeTruthy();
    click('[data-go="memory-new"]');
    expect(body().querySelectorAll('.memCard.done').length).toBe(0);
    click('[data-go="games"]');

    // city letters: a wrong answer is refused, a hint shows the first letter, another word replaces the letters
    click('[data-go="scramble"]');
    const letters = body().querySelector('.scr')!.textContent;
    expect(letters!.length).toBeGreaterThanOrEqual(5);
    (body().querySelector('#scrInput') as HTMLInputElement).value = 'zzzzz';
    body().querySelector('#scrForm')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    expect(body().querySelector('.phNote')!.textContent).toContain('Not quite');
    click('[data-go="scramble-hint"]');
    expect(body().querySelector('.phNote')!.textContent).toMatch(/Hint: [A-Z]…/);
    click('[data-go="scramble-new"]');
    expect(body().querySelector('.scr')!.textContent!.length).toBeGreaterThanOrEqual(5);
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  });
});
