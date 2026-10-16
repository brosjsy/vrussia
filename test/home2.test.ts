// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('the home screen: layers, chat, messages, daily hunt, plus button', () => {
  it('works in the page', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    window.confirm = () => true;
    const { boot } = await import('../src/ui');
    boot(); await (await import('../src/ui')).uiReady();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Home2';
    document.getElementById('startBtn')!.click();
    for (let i = 0; i < 40 && !document.querySelector('#actions button'); i++) {
      (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();
    }
    expect(document.querySelector('#actions button')).toBeTruthy();

    // achievements pill and the daily hunt card
    expect(document.getElementById('achPill')!.textContent).toMatch(/^🏆 \d+\/\d+$/);
    expect(document.getElementById('quests')!.textContent).toContain('Daily hunt');

    // layers: six chips; choosing one fades the other places but never the place you stand on
    const chips = document.querySelectorAll<HTMLButtonElement>('#layers button[data-layer]');
    expect(chips.length).toBe(6);
    (document.querySelector('#layers button[data-layer="money"]') as HTMLButtonElement).click();
    expect(document.querySelector('#city [data-place="bank"]')!.classList.contains('dim')).toBe(false);
    expect(document.querySelector('#city [data-place="clinic"]')!.classList.contains('dim')).toBe(true);
    expect(document.querySelector('#city [data-place="home"]')!.classList.contains('dim')).toBe(false);   // you are here
    (document.querySelector('#layers button[data-layer="all"]') as HTMLButtonElement).click();
    expect(document.querySelectorAll('#city .place.dim').length).toBe(0);

    // chat: your line and an answer appear; markup in a message stays text
    const input = document.getElementById('chatInput') as HTMLInputElement;
    input.value = 'hello <img src=x onerror=alert(1)>';
    document.getElementById('chatForm')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    const lines = Array.from(document.querySelectorAll('#placeCard .chat li')).map(l => l.textContent || '');
    expect(lines.some(l => l.includes('You'))).toBe(true);
    expect(document.querySelector('#placeCard .chat img')).toBeNull();
    expect((document.getElementById('chatInput') as HTMLInputElement).value).toBe('');

    // the phone has a Messages app that lists at least one message
    document.getElementById('dockPhone')!.click();
    (document.querySelector('#modalBody .app[data-sys="messages"]') as HTMLButtonElement).click();
    expect(document.querySelectorAll('#modalBody .thread').length).toBeGreaterThan(1);       // updates plus at least one contact
    (document.querySelector('#modalBody [data-go="updates"]') as HTMLButtonElement).click();
    expect(document.querySelectorAll('#modalBody .msg').length).toBeGreaterThan(0);
    document.getElementById('closeModal')!.click();

    // the plus button opens bank and shops
    const before = document.getElementById('stage')!.innerHTML;
    document.getElementById('plusBtn')!.click();
    expect(document.getElementById('stage')!.innerHTML).not.toBe(before);
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  });
});
