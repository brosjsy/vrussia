// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('finishing a game', () => {
  it('records the run in the hall of fame', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    window.confirm = () => true;
    localStorage.removeItem('vrussia_runs');
    const { boot } = await import('../src/ui');
    boot();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Finisher';
    document.querySelectorAll<HTMLButtonElement>('.ocard')[2].click();   // a migrant origin: careless play ends early
    document.getElementById('startBtn')!.click();
    for (let i = 0; i < 20000 && document.getElementById('end')!.hidden; i++) {
      const next = document.getElementById('nextBtn');
      const actions = document.querySelectorAll<HTMLButtonElement>('#actions button');
      const choices = document.querySelectorAll<HTMLButtonElement>('#stage .choices button');
      if (next) next.click();
      else if (actions.length) actions[Math.floor(Math.random() * actions.length)].click();
      else if (choices.length) choices[Math.floor(Math.random() * choices.length)].click();
      else { const b = document.querySelector<HTMLButtonElement>('#stage button'); if (b) b.click(); }
    }
    expect(document.getElementById('end')!.hidden).toBe(false);
    const saved = JSON.parse(localStorage.getItem('vrussia_runs') || '{}');
    expect(saved.rows.length).toBe(1);
    expect(saved.rows[0].name).toBe('Finisher');
    expect(saved.rows[0].score).toBeGreaterThanOrEqual(0);
    expect(['time', 'hospital', 'deported', 'debt']).toContain(saved.rows[0].ending);
  }, 240000);
});
