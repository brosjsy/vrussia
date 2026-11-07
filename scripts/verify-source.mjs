/* Helps a person check the legal sources in src/platform/citations.ts. It never decides that a rule is right: only a person can.
     node scripts/verify-source.mjs                       list every source: is the official portal reachable, how old is the check
     node scripts/verify-source.mjs fz115                 the same for one source, with its law title and the rule the game uses
     node scripts/verify-source.mjs fz115 --confirm "Your Name"
          after YOU have opened the official text and compared it with the game: sets verifiedOn to today and adds a line to docs/CITATIONS_LOG.md
   Why it asks for a name: the screens tell players when a person last checked a rule, so the date has to mean that. */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';

const FILE = 'src/platform/citations.ts', LOG = 'docs/CITATIONS_LOG.md', STALE_DAYS = 180;
const text = readFileSync(FILE, 'utf8');
const crlf = text.includes('\r\n');
const src = text.replace(/\r\n/g, '\n');

const sources = [...src.matchAll(/\{ id: '([a-z0-9_]+)', topic: '([^']*)'[^\n]*?authority: '([^']*)', url: ([A-Za-z_]+|'[^']*'), verifiedOn: (null|'[0-9-]+')/g)].map(m => ({ id: m[1], topic: m[2], authority: m[3], urlExpr: m[4], verified: m[5] === 'null' ? null : m[5].slice(1, -1) }));
const consts = Object.fromEntries([...src.matchAll(/\b([A-Z]+) = '(https?:[^']+)'/g)].map(m => [m[1], m[2]]));
const lawOf = id => { const i = src.indexOf(`id: '${id}'`); const j = src.indexOf('ru: ', src.indexOf('law:', i)); return src.slice(j + 5, src.indexOf("'", j + 5)); };
const urlOf = s => (s.urlExpr.startsWith("'") ? s.urlExpr.slice(1, -1) : consts[s.urlExpr] ?? '');
const age = d => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 864e5) : null);

const [, , id, flag, who] = process.argv;
if (id && flag === '--confirm') {
  const s = sources.find(x => x.id === id);
  if (!s) { console.error(`No source "${id}". Known: ${sources.map(x => x.id).join(', ')}`); process.exit(1); }
  if (!who || who.trim().length < 3) { console.error('Give your name: --confirm "Your Name". A person must have read the official text.'); process.exit(1); }
  const today = new Date().toISOString().slice(0, 10);
  const re = new RegExp(`(\\{ id: '${id}',[^\\n]*?verifiedOn: )(null|'[0-9-]+')`);
  if (!re.test(src)) { console.error('Could not find the entry to change.'); process.exit(1); }
  let out = src.replace(re, `$1'${today}'`);
  if (crlf) out = out.replace(/\n/g, '\r\n');
  writeFileSync(FILE, out);
  if (!existsSync(LOG)) writeFileSync(LOG, '# Who checked which legal source\n\nOne line per check, added by `scripts/verify-source.mjs`.\n\n| Date | Source | Checked by |\n|---|---|---|\n');
  appendFileSync(LOG, `| ${today} | ${id} (${lawOf(id).slice(0, 80)}) | ${who.trim()} |\n`);
  console.log(`${id}: verifiedOn set to ${today} by ${who.trim()}. Run the tests before you commit.`);
  process.exit(0);
}

const wanted = id ? sources.filter(s => s.id === id) : sources;
if (!wanted.length) { console.error(`No source "${id}". Known: ${sources.map(x => x.id).join(', ')}`); process.exit(1); }
for (const s of wanted) {
  const url = urlOf(s);
  let reach = 'not tried';
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'vrussia-source-check' } });
    reach = `${r.status} ${r.ok ? 'reachable' : 'problem'}`;
  } catch (e) { reach = 'unreachable (' + String(e?.cause?.code ?? e?.message ?? e).slice(0, 40) + ')'; }
  const a = age(s.verified);
  const state = s.verified === null ? 'NOT CHECKED BY A PERSON' : a > STALE_DAYS ? `check again (${a} days)` : `checked ${s.verified}`;
  console.log(`${s.id.padEnd(12)} ${state.padEnd(26)} ${reach.padEnd(28)} ${url}`);
  if (id) console.log(`\n  ${lawOf(s.id)}\n\n  Open ${url}, find the law by its number, compare the rule in the game, then run:\n  node scripts/verify-source.mjs ${s.id} --confirm "Your Name"\n`);
}
