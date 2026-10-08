// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('the hall of fame on the title screen', () => {
  it('is hidden when empty, lists saved runs best-first, and the clear button empties it', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    localStorage.setItem('vrussia_runs', JSON.stringify({ schema: 1, rows: [
      { id: 'a', name: 'Low', origin: 'moscow', label: 'Moscow Baby', ending: 'time', score: 100, days: 700, citizen: true, diff: 'normal', achievements: 1, savedAt: 1 },
      { id: 'b', name: 'High', origin: 'tajik', label: 'Tajik Migrant', ending: 'time', score: 9000, days: 730, citizen: true, diff: 'hard', achievements: 9, savedAt: 2 },
    ] }));
    localStorage.setItem('vrussia_lifetime', JSON.stringify({ schema: 1, v: { games: 7, citizens: 3, bestScore: 9000, totalDays: 100, endings: {} } }));
    const { boot } = await import('../src/ui');
    boot();
    expect(document.getElementById('hallBox')!.hidden).toBe(false);
    const items = Array.from(document.querySelectorAll('#hallList li'));
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('High');
    expect(items[1].textContent).toContain('Low');
    expect(document.getElementById('hallTotals')!.textContent).toContain('7');
    expect(document.getElementById('hallTotals')!.textContent).toContain('9000');
    document.getElementById('hallClear')!.click();
    expect(document.getElementById('hallBox')!.hidden).toBe(true);
    expect(localStorage.getItem('vrussia_runs')).toBeNull();
  });
});
