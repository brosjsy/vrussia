import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

/* The site is built on Linux by GitHub Actions, where file names are case-sensitive, while development happens on Windows, where they are not.
   An import such as './Store' for a file called store.ts works on Windows and breaks the deployment. This test resolves every relative import
   in src/ and test/ against the real directory listing, letter case included. */
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

const files = [...walk('src'), ...walk('test')].filter(f => f.endsWith('.ts'));
const IMPORT = /(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g;

/** Does a file or folder with exactly this name (and case) exist? Checks every path segment against the directory listing. */
function existsExact(path: string): boolean {
  const parts = resolve(path).split(/[\\/]/);
  let cur = parts[0] + '/';
  for (let i = 1; i < parts.length; i++) {
    if (!readdirSync(cur).includes(parts[i])) return false;
    cur = join(cur, parts[i]);
  }
  return true;
}

describe('import paths match the real file names exactly', () => {
  it('every relative import in src and test resolves with the correct letter case', () => {
    const bad: string[] = [];
    let checked = 0;
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      for (const m of text.matchAll(IMPORT)) {
        const target = join(dirname(f), m[1]);
        const candidates = [target + '.ts', join(target, 'index.ts'), target];
        const hit = candidates.find(c => existsSync(c));
        checked++;
        if (!hit || !existsExact(hit)) bad.push(`${f}: ${m[1]}`);
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(bad).toEqual([]);
  });
  it('the exact-case check can tell the difference', () => {
    expect(existsExact('src/engine.ts')).toBe(true);
    expect(existsExact('src/Engine.ts')).toBe(false);
  });
});
