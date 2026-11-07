/* Keeps the code easy to read for newcomers: every source file starts with a comment that says what it is for, and the generated map of the code
   (docs/MODULES.md) lists every file. Fix a failure by writing the header comment and running `node scripts/module-map.mjs`. */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir: string, out: string[] = []): string[] => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n).split('\\').join('/');
    if (statSync(p).isDirectory()) walk(p, out); else if (/\.(ts|mjs)$/.test(n) && !/\.d\.ts$/.test(n)) out.push(p);
  }
  return out;
};
const files = [...walk('src'), ...walk('server/src')];

describe('the code is documented', () => {
  it('every source file starts with a header comment of a real sentence', () => {
    const bad = files.filter(f => { const t = readFileSync(f, 'utf8').replace(/^\uFEFF/, '').trimStart(); const m = t.match(/^\/\*+\s*([\s\S]*?)\*\/|^((?:\/\/[^\n]*\n?)+)/); return !m || (m[1] ?? m[2] ?? '').replace(/[\s/*]+/g, ' ').trim().length < 25; });
    expect(bad, 'files without a header comment').toEqual([]);
  });
  it('docs/MODULES.md lists every source file', () => {
    const map = readFileSync('docs/MODULES.md', 'utf8');
    const missing = files.filter(f => !map.includes('`' + f + '`'));
    expect(missing, 'run: node scripts/module-map.mjs').toEqual([]);
  });
  it('the guides for contributors exist and point at real files', () => {
    for (const f of ['CONTRIBUTING.md', 'docs/ARCHITECTURE.md', 'docs/MODULES.md']) expect(statSync(f).isFile(), f).toBe(true);
    const text = readFileSync('CONTRIBUTING.md', 'utf8') + readFileSync('docs/ARCHITECTURE.md', 'utf8');
    for (const m of text.matchAll(/`((?:src|server|docs|scripts|test)\/[A-Za-z0-9_./*-]+\.(?:ts|md|mjs|sql))`/g)) {
      if (m[1].includes('*')) continue;
      expect(() => statSync(m[1]), m[1]).not.toThrow();
    }
  });
});
