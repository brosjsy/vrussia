import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import { flows } from '../src/forms';
import '../src/content';

/* The README makes numeric claims. These tests fail when the code changes and the README is left behind. */
const readme = readFileSync('README.md', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
const num = (re: RegExp): number => { const m = readme.match(re); if (!m) throw new Error('README does not match ' + re); return Number(m[1].replace(/,/g, '')); };

describe('README numbers match the code', () => {
  it('online services', () => {
    expect(num(/\*\*(\d+) online services\*\*/)).toBe(flows.length);
    expect(num(/(\d+) online services you fill in/)).toBe(flows.length);
  });
  it('map places, achievements, cities, kinds of business', () => {
    expect(num(/\((\d+) places\)/)).toBe(G.PLACES.length);
    expect(num(/(\d+) achievements/)).toBe(G.ACHIEVEMENTS.length);
    expect(num(/(\d+) cities ×/)).toBe(G.CITIES.length);
    expect(num(/(\d+) kinds of business/)).toBe(G.BIZ_KINDS.length);
  });
  it('recurring characters (storylines)', () => {
    const arcs = G.scenarios.filter(x => /^arc_[a-z0-9]+_0$/.test(x.id)).length;
    expect(num(/(\d+) recurring characters/)).toBe(arcs);
  });
  it('"over N scenarios" is true and not wildly out of date', () => {
    const n = num(/Over ([\d,]+) scenarios/);
    expect(n).toBeLessThanOrEqual(G.scenarios.length);
    expect(G.scenarios.length).toBeLessThan(n * 1.5);
  });
  it('the number of starting characters in the demo script is right', () => {
    const demo = readFileSync('docs/DEMO_SCRIPT.md', 'utf8');
    expect(demo).toContain('seven starting lives');
    expect(G.origins.length).toBe(7);
  });
});

describe('the docs only mention commands that exist', () => {
  it('every "npm run X" in the README and the demo script is a real script', () => {
    const all = readme + readFileSync('docs/DEMO_SCRIPT.md', 'utf8');
    const used = [...all.matchAll(/npm run ([a-z:]+)/g)].map(m => m[1]);
    expect(used.length).toBeGreaterThan(3);
    for (const name of used) expect(pkg.scripts[name], name).toBeTruthy();
  });
  it('the quick test script lists only test files that exist', () => {
    const files = pkg.scripts.test.match(/test\/[a-z0-9]+\.test\.ts/g) ?? [];
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) expect(() => readFileSync(f, 'utf8'), f).not.toThrow();
  });

  it('the README quotes the same immigration state duties as the game', () => {
    const readme = readFileSync('README.md', 'utf8');
    for (const v of Object.values(G.FEE)) expect(readme).toContain('₽' + v.toLocaleString('en-US'));
  });
});
