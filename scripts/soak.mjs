// The long soak: the full-feature play-test (test/players20.test.ts) again and again with a different seed each time, then one report.
// Usage: node scripts/soak.mjs [runs=100] [players=10] [days=60]   ->  docs/SOAK.md   (each run's details: dev/playtest/<seed>.json)
// A run that fails is kept in the report with its first lines; the same seed plays the same game again (PT_SEED=<seed> npm run playtest).
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const RUNS = Number(process.argv[2] ?? 100), PLAYERS = String(process.argv[3] ?? 10), DAYS = String(process.argv[4] ?? 60), FIRST = 1001;
mkdirSync('dev/playtest/reports', { recursive: true });
const results = [];
const t0 = Date.now();
for (let i = 0; i < RUNS; i++) {
  const seed = FIRST + i, t = Date.now();
  const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'test/players20.test.ts'], { encoding: 'utf8', env: { ...process.env, PT_SEED: String(seed), PT_PLAYERS: PLAYERS, PT_DAYS: DAYS, PT_OUT: `dev/playtest/reports/${seed}.md` } });
  const out = (r.stdout + r.stderr).replace(/\x1b\[[0-9;]*m/g, '');
  const passed = /Tests\s+1 passed/.test(out);
  const json = existsSync(`dev/playtest/${seed}.json`) ? JSON.parse(readFileSync(`dev/playtest/${seed}.json`, 'utf8')) : null;
  results.push({ seed, passed, secs: Math.round((Date.now() - t) / 1000), crashes: json?.crashes ?? [], nobody: json?.nobody ?? [], serverErrors: json?.serverErrors?.length ?? null, problems: json?.problems ?? [], fail: passed ? '' : (out.match(/AssertionError[^\n]*/)?.[0] ?? out.slice(-400)) });
  process.stdout.write(`run ${i + 1}/${RUNS} seed ${seed}: ${passed ? 'ok' : 'FAILED'} (${results.at(-1).secs}s)\n`);
  // the report is rewritten after every run, so a soak stopped early still leaves its results
  const ok = results.filter(x => x.passed).length;
  const tally = (key) => { const m = {}; for (const x of results) for (const v of x[key]) { const k = typeof v === 'string' ? v : v.f; m[k] = (m[k] ?? 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const lines = [
    '# Soak: the full-feature play-test, many times', '',
    `${results.length} of ${RUNS} runs done (${PLAYERS} players, ${DAYS} days each, seeds ${FIRST}-${FIRST + RUNS - 1}), ${Math.round((Date.now() - t0) / 60000)} min so far.`, '',
    `- Runs that passed every check: **${ok} of ${results.length}**.`,
    `- Runs with a crash in some feature: ${results.filter(x => x.crashes.length).length}.`,
    `- Runs with a server error: ${results.filter(x => x.serverErrors).length}.`,
    `- Runs with a world problem (numbers out of range, a save that differs, a privacy leak, a lost session): ${results.filter(x => x.problems.length).length}.`, '',
    '## Crashes by feature', '', ...(tally('crashes').length ? tally('crashes').map(([k, n]) => `- ${k}: in ${n} runs`) : ['- none']), '',
    '## Features that worked for nobody in a run (often normal in short runs: seasons, children, the June window)', '', ...(tally('nobody').length ? tally('nobody').map(([k, n]) => `- ${k}: ${n} runs`) : ['- none']), '',
    '## Failed runs', '', ...(results.filter(x => !x.passed).map(x => `- seed ${x.seed}: ${x.fail.replace(/\n/g, ' ').slice(0, 300)}`) || []), ...(results.some(x => !x.passed) ? [] : ['- none']), '',
    '## Every run', '', '| Seed | Result | Seconds | Crashes | Server errors | Problems |', '|---|---|---|---|---|---|',
    ...results.map(x => `| ${x.seed} | ${x.passed ? 'ok' : '**failed**'} | ${x.secs} | ${x.crashes.length} | ${x.serverErrors ?? '?'} | ${x.problems.length} |`), '',
  ];
  writeFileSync('docs/SOAK.md', lines.join('\n'));
}
