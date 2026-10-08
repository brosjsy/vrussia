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

  it('the built script stays under 250 KB gzipped (only checked when a build exists)', () => {
    if (!existsSync('dist/assets')) return;
    const js = readdirSync('dist/assets').filter(f => f.endsWith('.js'));
    expect(js.length).toBeGreaterThan(0);
    const total = js.reduce((n, f) => n + gzipSync(readFileSync('dist/assets/' + f)).length, 0);
    expect(total, `${Math.round(total / 1024)} KB gzipped`).toBeLessThan(250 * 1024);
  });

  it('the scenario count is in the expected range (a sudden jump or drop means something broke)', () => {
    expect(G.scenarios.length).toBeGreaterThan(4000);
    expect(G.scenarios.length).toBeLessThan(9000);
  });
});
