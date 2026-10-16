// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { iso, cityMarkup, treeSpots, PLACE_LOOK, newsItems, quests, placeActions, moodOf } from '../src/city';

const dayIn = (month: number, dom = 1): number => { const s = G.newState('T', 'moscow'); for (let d = 0; d < 800; d++) { s.day = d; const t = G.dateOf(s); if (t.getMonth() + 1 === month && t.getDate() === dom) return d; } throw new Error('no such day'); };

describe('isometric projection', () => {
  it('maps the four corners of the 100 x 100 map to a diamond', () => {
    expect(iso(0, 0)).toEqual({ x: 100, y: 12 });
    expect(iso(100, 0)).toEqual({ x: 200, y: 62 });
    expect(iso(100, 100)).toEqual({ x: 100, y: 112 });
    expect(iso(0, 100)).toEqual({ x: 0, y: 62 });
  });
  it('every place stays inside the 200 x 125 picture', () => {
    for (const p of G.PLACES) { const q = iso(p.x, p.y); expect(q.x).toBeGreaterThanOrEqual(0); expect(q.x).toBeLessThanOrEqual(200); expect(q.y).toBeGreaterThan(0); expect(q.y).toBeLessThan(125); }
  });
});

describe('the city drawing', () => {
  it('has a look for every place and draws every place once, with a label and a badge', () => {
    for (const p of G.PLACES) expect(PLACE_LOOK[p.id], p.id).toBeTruthy();
    const host = document.createElement('div'); host.innerHTML = cityMarkup(G.newState('T', 'moscow'));
    expect(host.querySelectorAll('.place').length).toBe(G.PLACES.length);
    for (const p of G.PLACES) { expect(host.querySelector(`[data-place="${p.id}"]`)).toBeTruthy(); expect(host.querySelector('#pl-' + p.id)).toBeTruthy(); }
    expect(host.querySelector('svg')!.getAttribute('aria-label')).toContain('map');
  });
  it('trees are always in the same places and never on top of a building', () => {
    const a = treeSpots(), b = treeSpots();
    expect(a).toEqual(b); expect(a.length).toBeGreaterThan(10);
    for (const [x, y] of a) for (const p of G.PLACES) expect(Math.hypot(p.x - x, p.y - y)).toBeGreaterThanOrEqual(9);
  });
});

describe('ticker, quests and place card text', () => {
  it('the ticker always has something to say, and says it about holidays, papers, fines and rent', () => {
    const s = G.newState('T', 'tajik');
    expect(newsItems(s).length).toBeGreaterThan(0);
    s.day = dayIn(5, 6);
    expect(newsItems(s).some(x => x.includes('Victory Day'))).toBe(true);
    s.docs.reg = 4; expect(newsItems(s).some(x => x.includes('registration runs out in 4'))).toBe(true);
    s.tmp.fines = 3000; expect(newsItems(s).some(x => x.includes('Unpaid fines'))).toBe(true);
    s.day = dayIn(5, 6) + 0;
    const tue = structuredClone(s); for (let d = 0; d < 7; d++) { tue.day++; if (G.dateOf(tue).getDay() === 4) break; }
    expect(newsItems(tue).some(x => x.includes('Rent is due'))).toBe(true);
  });
  it('state duties appear only for non-citizens and quote the verified amounts', () => {
    const line = (o: string): string | undefined => newsItems(G.newState('T', o)).find(x => x.includes('State duties'));
    expect(line('moscow')).toBeUndefined();
    expect(line('tajik')).toContain('15,000'); expect(line('tajik')).toContain('30,000'); expect(line('tajik')).toContain('50,000');
  });
  it('quests: at most three, the open first-month items come first', () => {
    const s = G.newState('T', 'tajik'); s.day = 3;
    const q = quests(s);
    expect(q.length).toBeGreaterThan(0); expect(q.length).toBeLessThanOrEqual(3);
    expect(q[0].sub).toMatch(/^First month · \d+\/\d+$/); expect(q[0].progress).toBeGreaterThanOrEqual(0);      // with a count and a progress bar since Phase 1
  });
  it('the place card offers the actions that fit the place', () => {
    const s = G.newState('T', 'moscow');
    s.loc = 'bank'; expect(placeActions(s).map(a => a.id)).toContain('money');
    s.loc = 'uni'; expect(placeActions(s).map(a => a.id)).toContain('edu');
    s.loc = 'home'; expect(placeActions(s).map(a => a.id)).toContain('home');
  });
  it('mood follows stress, energy and health', () => {
    const s = G.newState('T', 'moscow');
    s.stress = 10; s.energy = 80; s.health = 90; expect(moodOf(s).label).toBe('Fine');
    s.stress = 80; expect(moodOf(s).label).toBe('Stressed');
    s.stress = 10; s.energy = 10; expect(moodOf(s).label).toBe('Tired');
  });
});

describe('the home screen in the page', () => {
  it('draws the city, lets the player click a place to start a trip, press Enter on it, cycle the news and use place shortcuts', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    window.confirm = () => true;
    const { boot } = await import('../src/ui');
    boot();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Mapper';
    document.getElementById('startBtn')!.click();
    expect(document.querySelectorAll('#city .place').length).toBeGreaterThan(10);
    expect(document.querySelector('#placeCard b')!.textContent).toBe('Home');
    expect(document.querySelectorAll('#placeCard .pcChips button').length).toBeGreaterThan(0);
    expect(document.getElementById('ticker')!.textContent).toMatch(/^📰/);

    // move on until the game waits for a choice (the first screens are story scenes)
    for (let i = 0; i < 40 && !document.querySelector('#actions button'); i++) {
      (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();
    }
    expect(document.querySelector('#actions button')).toBeTruthy();

    const before = document.getElementById('ticker')!.textContent;
    let changed = false;
    for (let i = 0; i < 8 && !changed; i++) { document.getElementById('ticker')!.click(); changed = document.getElementById('ticker')!.textContent !== before; }
    expect(changed).toBe(true);

    const mfc = document.querySelector('#city [data-place="mfc"]') as unknown as SVGGElement;
    mfc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(document.querySelector('#stage h2')!.textContent).toContain('MFC');   // the trip scene names the destination
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  });
});
