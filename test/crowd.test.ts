// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { crowdFor, crowdMarkup, playerMarkup, iso, cityMarkup } from '../src/city';
import { HANDLES } from '../src/social';

const fresh = (): G.State => { const s = G.newState('Tester', 'moscow'); s.queue = []; s.day = 12; s.slot = 1; return s; };

describe('the people on the map', () => {
  it('are the same people at the same moment, and different people a part of the day later', () => {
    const s = fresh();
    expect(crowdFor(s)).toEqual(crowdFor(s));
    const later = fresh(); later.slot = 2;
    expect(crowdFor(later).map(n => n.id)).not.toEqual(crowdFor(s).map(n => n.id));
  });
  it('are a believable crowd: not too few, not too many, never more than three at one place, all inside the picture, none at the workplace without a job', () => {
    for (let day = 0; day < 40; day++) {
      const s = fresh(); s.day = day; s.slot = day % 3;
      const crowd = crowdFor(s);
      expect(crowd.length).toBeGreaterThanOrEqual(8); expect(crowd.length).toBeLessThanOrEqual(40);
      const byPlace: Record<string, number> = {};
      for (const n of crowd) {
        byPlace[n.place] = (byPlace[n.place] || 0) + 1;
        const p = iso(n.x, n.y); expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(200); expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(125);
        expect(HANDLES).toContain(n.handle);
        expect(n.place).not.toBe('work');
      }
      for (const [place, c] of Object.entries(byPlace)) expect(c, place).toBeLessThanOrEqual(3);
    }
    const withJob = fresh(); withJob.job = 'courier';
    expect(Array.from({ length: 30 }, (_, d) => { const s = fresh(); s.job = 'courier'; s.day = d; return crowdFor(s).some(n => n.place === 'work'); }).some(Boolean)).toBe(true);
  });
  it('people who stand together talk: some have a speech bubble, and only the people at your place get a name tag', () => {
    const s = fresh(); s.loc = 'center';
    const html = crowdMarkup(s);
    const host = document.createElement('div'); host.innerHTML = `<svg>${html}</svg>`;
    const npcs = Array.from(host.querySelectorAll('.npc'));
    expect(npcs.length).toBe(crowdFor(s).length);
    const tagged = npcs.filter(n => n.querySelector('.tag'));
    expect(tagged.length).toBe(crowdFor(s).filter(n => n.place === 'center').length);
    expect(tagged.every(n => n.getAttribute('data-place') === 'center')).toBe(true);
    let bubbles = 0; for (let d = 0; d < 20; d++) { const t = fresh(); t.day = d; bubbles += new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${crowdMarkup(t)}</svg>`, 'image/svg+xml').querySelectorAll('.bubble').length; }
    expect(bubbles).toBeGreaterThan(5);
    for (const n of npcs) { expect(n.getAttribute('role')).toBe('button'); expect(n.getAttribute('aria-label')).toMatch(/^@/); }
  });
  it('the player is a whole person in their own clothes, with a name tag', () => {
    const s = fresh(); s.name = 'Aisha';
    const plain = playerMarkup(s);
    expect(plain).toContain('Aisha'); expect(plain).toContain('class="tag me"');
    s.look = { ...(s.look ?? {}), bottom: 'skirt', shoes: 'boots', style: 'dress', height: 2 } as never; s.worn = { outer: 'coat-winter' };
    const dressed = playerMarkup(s);
    expect(dressed).not.toBe(plain); expect(dressed).not.toMatch(/NaN|undefined/);
    s.name = '<b>x</b>'; expect(playerMarkup(s)).not.toContain('<b>');
  });
  it('the markup is valid and contains the crowd and the player layers', () => {
    const doc = new DOMParser().parseFromString(cityMarkup(fresh()), 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.querySelector('#mapCrowd')!.children.length).toBeGreaterThan(5);
    expect(doc.querySelector('#mapAvatar')!.innerHTML).toContain('tag me');
  });
});

describe('talking to a person on the map, in the page', () => {
  it('clicking someone at your place starts a chat line from them; someone elsewhere only tells you where they are', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    window.confirm = () => true;
    const { boot } = await import('../src/ui');
    boot();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Talker';
    document.getElementById('startBtn')!.click();
    for (let i = 0; i < 40 && !document.querySelector('#actions button'); i++) (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();
    const here = document.querySelector('#city .npc[data-place="home"]') as unknown as SVGGElement | null;
    const away = document.querySelector('#city .npc:not([data-place="home"])') as unknown as SVGGElement;
    expect(away).toBeTruthy();
    const lines = (): number => document.querySelectorAll('#placeCard .chat li').length;
    away.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('toasts')!.textContent).toMatch(/@/);
    if (here) {
      here.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(Array.from(document.querySelectorAll('#placeCard .chat li')).some(l => (l.textContent || '').includes('You'))).toBe(true);
      expect(lines()).toBeGreaterThan(0);
    }
    const another = document.querySelector('#city .npc') as unknown as SVGGElement;
    another.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  });
});
