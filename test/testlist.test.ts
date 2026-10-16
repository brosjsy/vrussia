import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

/* The `npm test` script names its files one by one (the long ones are run separately). A test file that is not named there is never
   run by the quick suite: that happened once with fees.test.ts. This test makes the omission impossible. */
const LONG_RUNNING = new Set(['exhaustive.test.ts', 'balance.test.ts', 'players20.test.ts']);

describe('the quick test script', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
  const listed = new Set((pkg.scripts.test.match(/test\/[A-Za-z0-9_.-]+\.test\.ts/g) || []).map(p => p.replace('test/', '')));
  const files = readdirSync('test').filter(f => f.endsWith('.test.ts'));

  it('names every test file except the long-running ones', () => {
    const missing = files.filter(f => !listed.has(f) && !LONG_RUNNING.has(f));
    expect(missing).toEqual([]);
  });
  it('does not name files that do not exist', () => {
    const ghosts = Array.from(listed).filter(f => !files.includes(f));
    expect(ghosts).toEqual([]);
  });
  it('has separate scripts for the long-running tests', () => {
    expect(pkg.scripts['test:exhaustive']).toContain('exhaustive.test.ts');
    expect(pkg.scripts.balance).toContain('balance.test.ts');
    expect(pkg.scripts.playtest).toContain('players20.test.ts');
  });
});
