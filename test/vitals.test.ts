// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';

describe('the danger zone', () => {
  it('vitalsLevel: burnout from stress 75, weak at health 30 or less, otherwise nothing', () => {
    const s = G.newState('T', 'student');
    s.stress = 74; s.health = 80; expect(G.vitalsLevel(s)).toBeNull();
    s.stress = 75; expect(G.vitalsLevel(s)).toBe('burnout');
    s.stress = 10; s.health = 30; expect(G.vitalsLevel(s)).toBe('weak');
    s.health = 31; expect(G.vitalsLevel(s)).toBeNull();
    s.stress = 99; s.health = 5; expect(G.vitalsLevel(s)).toBe('burnout');   // burnout is the more urgent message
  });
  it('the rule it warns about is real: at stress 75 or more a day costs health', () => {
    const s = G.newState('T', 'student'); s.queue = []; s.stress = 95; s.health = 60;
    const before = s.health; G.endDay(s);
    expect(s.health).toBeLessThan(before);
  });
  it('the idle screen shows an alert when the player is close to burnout, in both languages', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    window.confirm = () => true;
    const { boot } = await import('../src/ui');
    boot();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Vit';
    document.getElementById('startBtn')!.click();
    let seen = '';
    for (let i = 0; i < 4000 && !seen; i++) {
      const next = document.getElementById('nextBtn');
      const paper = document.querySelector<HTMLButtonElement>('#actions button[data-a="paper"]');
      const choices = document.querySelectorAll<HTMLButtonElement>('#stage .choices button');
      if (document.getElementById('end')!.hidden === false) break;
      const alert = document.querySelector('#stage [role="alert"].err');
      if (alert) { seen = alert.textContent || ''; break; }
      if (next) next.click();
      else if (paper) paper.click();
      else if (choices.length) choices[0].click();
      else { const b = document.querySelector<HTMLButtonElement>('#stage button'); if (b) b.click(); }
    }
    expect(seen).toContain('burnout');
    document.getElementById('langBtn2')!.click();
    expect(document.querySelector('#stage [role="alert"].err')!.textContent).toContain('Выгорание');
  }, 120000);
});
