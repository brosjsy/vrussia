import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import * as G from '../src/engine';
import '../src/content';

/* Guards against content growth quietly making the game slow or the save file huge.
   Measured at the time of writing: 0.55 ms per scene draw, 28 KB for a complete two-year save, 173 KB gzipped script.
   The limits below leave room for several times more content. */
describe('performance and size budgets', () => {
  it('picking a scene is fast (average under 3 ms over 1,000 draws)', () => {
    const s = G.newState('P', 'moscow'); s.queue = []; s.job = 'courier';
    const cats = ['paper', 'edu', 'police', 'social', 'life', 'arc', 'work', 'culture', 'shop', 'love'];
    G.draw(s, ['life']);                                          // warm up
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) G.draw(s, [cats[i % cats.length]]);
    const avg = (performance.now() - t0) / 1000;
    expect(avg, `average ${avg.toFixed(2)} ms`).toBeLessThan(3);
  });

  it('a complete two-year save stays under 120 KB', () => {
    const g = G.newState('P', 'moscow'); let steps = 0;
    while (!g.over && steps++ < 8000) {
      if (g.queue.length) { const sc = G.get(g.queue.shift() as string, g); if (sc) G.choose(g, sc, 0); continue; }
      const r = G.perform(g, g.energy < 30 ? 'home' : ['paper', 'out', 'work', 'culture', 'people', 'food', 'money'][steps % 7]);
      if (r.sc) G.choose(g, r.sc, 0);
    }
    const bytes = JSON.stringify(g).length;
    expect(g.log.length).toBeLessThanOrEqual(60);                // the journal is capped
    expect(bytes, `${bytes} bytes`).toBeLessThan(120_000);
  });

  // Since round 117 the budgets measure what the page really loads: the scripts named in index.html are the first download (under 250 KB);
  // every other script is fetched only when the player opens something (3D, the phone, the shop, the metro...), and each must stay small on its own.
  const builtJs = (): string[] => readdirSync('dist/assets').filter(f => f.endsWith('.js'));
  const gz = (f: string): number => gzipSync(readFileSync('dist/assets/' + f)).length;
  const firstLoad = (): string[] => { const html = readFileSync('dist/index.html', 'utf8'); return builtJs().filter(f => html.includes('assets/' + f)); };
  const LIBS = /^(maplibre|three)/;                          // the real-map library and the 3D library: loaded only on demand, and not ours to shrink
  it('the first download (the scripts the page names) stays under 250 KB gzipped (only checked when a build exists)', () => {
    if (!existsSync('dist/assets')) return;
    const js = firstLoad(); expect(js.length).toBeGreaterThan(0);
    const total = js.reduce((n, f) => n + gz(f), 0);
    expect(total, `${Math.round(total / 1024)} KB gzipped`).toBeLessThan(250 * 1024);
  });
  it('everything else is fetched only on demand, each of our files under 40 KB gzipped and all of them together under 140 KB (only checked when a build exists)', () => {
    if (!existsSync('dist/assets')) return;
    const first = new Set(firstLoad()), lazy = builtJs().filter(f => !first.has(f) && !LIBS.test(f));
    expect(lazy.length).toBeGreaterThanOrEqual(10);
    for (const f of lazy) expect(gz(f), `${f}: ${Math.round(gz(f) / 1024)} KB`).toBeLessThan(40 * 1024);
    const sum = lazy.reduce((n, f) => n + gz(f), 0); expect(sum, `${Math.round(sum / 1024)} KB together`).toBeLessThan(140 * 1024);
    for (const name of ['world3d', 'phone-ui', 'shop-ui', 'metro-ui', 'furniture', 'cloud']) expect(lazy.some(f => f.startsWith(name)), name).toBe(true);
  });
  it('the scenario count is in the expected range (a sudden jump or drop means something broke)', () => {
    expect(G.scenarios.length).toBeGreaterThan(4000);
    expect(G.scenarios.length).toBeLessThan(9000);
  });
  it('the map library is a separate download that the page does not load by itself, and stays under 350 KB gzipped (only checked when a build exists)', () => {
    if (!existsSync('dist/assets')) return;
    const chunks = readdirSync('dist/assets').filter(f => f.startsWith('maplibre') && f.endsWith('.js'));
    expect(chunks.length).toBe(1);
    const gz = gzipSync(readFileSync('dist/assets/' + chunks[0])).length;
    expect(gz, `${Math.round(gz / 1024)} KB gzipped`).toBeLessThan(350 * 1024);
    expect(readFileSync('dist/index.html', 'utf8')).not.toContain('maplibre');
  });
  it('the 3D world is a separate download of under 220 KB gzipped that the page does not load by itself (only checked when a build exists)', () => {
    if (!existsSync('dist/assets')) return;
    const files = readdirSync('dist/assets').filter(f => /^(three|world3d)/.test(f) && f.endsWith('.js'));
    expect(files.length).toBeGreaterThanOrEqual(2);
    const gz = files.reduce((n, f) => n + gzipSync(readFileSync('dist/assets/' + f)).length, 0);
    expect(gz, `${Math.round(gz / 1024)} KB gzipped`).toBeLessThan(220 * 1024);
    expect(readFileSync('dist/index.html', 'utf8')).not.toMatch(/assets\/(three|world3d)/);
  });
});
