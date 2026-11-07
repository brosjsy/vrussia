// node merge.cjs <todo-file.json> <batch.tsv>...   adds "index<TAB>russian" lines of the batches to dict.json (key: the normalised English piece)
const fs = require('fs');
const [, , todoFile, ...files] = process.argv;
const todo = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
const dict = fs.existsSync('dict.json') ? JSON.parse(fs.readFileSync('dict.json', 'utf8')) : {};
let added = 0, bad = 0;
for (const f of files) {
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const k = line.indexOf('\t'); const i = Number(line.slice(0, k)); const ru = line.slice(k + 1).trim();
    if (!Number.isInteger(i) || !todo[i] || !ru) { bad++; console.log('bad line:', line.slice(0, 60)); continue; }
    const en = todo[i];
    const tok = s => (s.match(/\{[A-Z]+(:[a-z]+)?\}/g) || []).map(x => x.replace(/:[a-z]+/, '')).sort().join();
    if (tok(en) !== tok(ru)) { bad++; console.log('token mismatch:', i, en, '=>', ru); continue; }
    if (dict[en] === undefined) added++;
    dict[en] = ru;
  }
}
fs.writeFileSync('dict.json', JSON.stringify(dict, null, 0));
console.log('added', added, 'bad', bad, 'dict size', Object.keys(dict).length);
