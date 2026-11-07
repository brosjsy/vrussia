/* Bundle-size budget: after `npm run build`, measures the gzipped size of what the browser must download to start (the entry script and style sheet
   named in dist/index.html) and of every other file, and fails when one is over the limit in bundle-budget.json. The big libraries (three, maplibre)
   are loaded only when the player opens the 3D world or the real map, so they have their own limits. Run: npm run check:bundle */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
if (!existsSync(join(dist, 'index.html'))) { console.error('No dist/index.html: run `npm run build` first.'); process.exit(2); }
const budget = JSON.parse(readFileSync(join(root, 'bundle-budget.json'), 'utf8'));
const kb = n => Math.round(n / 10.24) / 100;
const gz = f => gzipSync(readFileSync(f)).length;

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const entry = new Set([...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+\.(?:js|css))"/g)].map(m => m[1]));
const files = readdirSync(join(dist, 'assets')).filter(f => /\.(js|css)$/.test(f)).map(f => ({ name: 'assets/' + f, gz: gz(join(dist, 'assets', f)), entry: entry.has('assets/' + f) }));

const problems = [];
const check = (label, size, limit) => { const ok = size <= limit * 1024; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(34)} ${String(kb(size)).padStart(8)} kB gzip   (limit ${limit} kB)`); if (!ok) problems.push(`${label}: ${kb(size)} kB is over ${limit} kB`); };

const sum = list => list.reduce((a, f) => a + f.gz, 0);
check('start-up scripts', sum(files.filter(f => f.entry && f.name.endsWith('.js'))), budget.entryJs);
check('start-up styles', sum(files.filter(f => f.entry && f.name.endsWith('.css'))), budget.entryCss);
for (const lib of Object.keys(budget.libraries)) { const f = files.filter(x => x.name.includes('/' + lib + '-')); if (f.length) check(`library ${lib}`, sum(f), budget.libraries[lib]); }
const rest = files.filter(f => !f.entry && !Object.keys(budget.libraries).some(l => f.name.includes('/' + l + '-')));
for (const f of rest) if (f.gz > budget.chunk * 1024) check(f.name, f.gz, budget.chunk);
console.log(`ok   ${rest.length} other chunks, each under ${budget.chunk} kB gzip`);
let total = 0; const walk = d => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : (total += statSync(p).size); } }; walk(dist);
check('whole dist folder (raw)', total, budget.totalRawMB * 1024);

if (problems.length) { console.error('\nOver budget:\n  ' + problems.join('\n  ') + '\nShrink it, or raise bundle-budget.json on purpose and say why in the commit.'); process.exit(1); }
console.log('\nAll sizes are inside the budget.');
