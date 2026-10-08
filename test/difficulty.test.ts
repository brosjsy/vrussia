// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';

const mk = (diff: G.Difficulty, origin = 'tajik'): G.State => { const s = G.newState('T', origin, undefined, diff); s.queue = []; return s; };

describe('difficulty levels', () => {
  it('start with more money when easy and less when realistic', () => {
    expect(mk('easy').money).toBe(63000);
    expect(mk('normal').money).toBe(45000);
    expect(mk('hard').money).toBe(31500);
    expect(G.newState('T', 'tajik').diff).toBe('normal');          // the default
  });

  it('weekly living costs scale with the level', () => {
    const cost = (d: G.Difficulty): number => {
      const s = mk(d);
      for (let i = 0; i < 14; i++) {
        const lines = G.endDay(s);
        const l = lines.find(x => x.startsWith('Weekly living costs'));
        if (l) return Number((l.match(/₽([\d,]+)/) as RegExpMatchArray)[1].replace(/,/g, ''));
      }
      throw new Error('no Saturday');
    };
    expect(cost('easy')).toBeLessThan(cost('normal'));
    expect(cost('normal')).toBeLessThan(cost('hard'));
    expect(cost('normal')).toBe(2200);
  });

  it('violations expire sooner when easy and later when realistic', () => {
    const left = (d: G.Difficulty, day: number): number => { const s = mk(d); s.docs.reg = 500; s.strikes = 1; s.day = day - 1; G.endDay(s); return s.strikes; };
    expect(left('easy', 20)).toBe(0); expect(left('normal', 20)).toBe(1); expect(left('hard', 20)).toBe(1);
    expect(left('normal', 30)).toBe(0); expect(left('hard', 30)).toBe(1);
    expect(left('hard', 45)).toBe(0);
  });

  it('police scenes are drawn less often when easy and more often when realistic', () => {
    const share = (d: G.Difficulty): number => {
      const s = mk(d); s.day = 30; s.docs.reg = 0;                  // no registration: checks are likely
      let police = 0; const n = 3000;
      for (let i = 0; i < n; i++) if (G.draw(s, ['police', 'social'])?.cat === 'police') police++;
      return police / n;
    };
    const easy = share('easy'), normal = share('normal'), hard = share('hard');
    expect(easy).toBeLessThan(normal); expect(normal).toBeLessThan(hard);
  });
});

describe('saves from before the difficulty levels', () => {
  beforeEach(() => { localStorage.clear(); });
  it('a version-6 save is upgraded to normal difficulty, older ones are refused', () => {
    const old = { ...G.newState('T', 'moscow'), version: 6 } as Partial<G.State>;
    delete old.diff;
    localStorage.setItem('vrussia_save', JSON.stringify(old));
    const loaded = G.load();
    expect(loaded?.version).toBe(7); expect(loaded?.diff).toBe('normal');
    localStorage.setItem('vrussia_save', JSON.stringify({ ...old, version: 5 }));
    expect(G.load()).toBeNull();
  });
  it('a new save keeps its difficulty', () => {
    const s = mk('hard'); G.save(s);
    expect(G.load()?.diff).toBe('hard');
  });
});

describe('the difficulty selector', () => {
  it('is on the title screen, starts the game with the chosen level, and is translated', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    const { boot } = await import('../src/ui');
    boot();
    const sel = document.getElementById('diffSel') as HTMLSelectElement;
    expect(Array.from(sel.options).map(o => o.value)).toEqual(['easy', 'normal', 'hard']);
    expect(sel.value).toBe('normal');
    document.getElementById('langBtn')!.click();
    expect(sel.options[2].textContent).toContain('Реалистичная');
    document.getElementById('langBtn')!.click();
    sel.value = 'hard';
    document.querySelector<HTMLButtonElement>('.ocard[data-o="tajik"]')!.click();
    document.getElementById('startBtn')!.click();
    expect(document.getElementById('moneyBox')!.textContent).toBe('₽31,500');
  });
});
