const fs = require('fs');
const derive = require('./rules.cjs');
const a = require('./all.json').filter(s => !s.built);
const { cities, unis, jobs } = require('./ents.json');
const names = [...jobs.map(n => [n, '{JOB}']), ...unis.map(n => [n, '{UNI}']), ...cities.map(n => [n, '{CITY}'])].sort((x, y) => y[0].length - x[0].length);
const norm = p => { let o = p; for (const [n, t] of names) o = o.split(n).join(t); return o; };
const sp = t => t.split(/(?<=[.!?])\s+(?=[A-Z"“({])/).map(x => x.trim()).filter(Boolean);
const key = s => s.id.replace(/[0-9]+/g, '#');
const cnt = {}; for (const s of a) cnt[key(s)] = (cnt[key(s)] || 0) + 1;
const piecesOf = s => { const p = [...s.title.split(': '), ...sp(s.text)]; for (const c of s.choices) { p.push(c.t); if (c.fixed && c.then) p.push(...sp(c.then)); } return p.map(norm); };
module.exports = { a, piecesOf, key, cnt, norm, sp };
if (require.main === module) {
  const dict = fs.existsSync('dict.json') ? JSON.parse(fs.readFileSync('dict.json', 'utf8')) : {};
  const want = process.argv[2] || 'fam';
  const list = want === 'fam' ? a.filter(s => cnt[key(s)] >= 8) : a;
  const todo = new Map();
  for (const s of list) for (const p of piecesOf(s)) if (!dict[p] && !derive(p) && !todo.has(p)) todo.set(p, 1);
  const arr = [...todo.keys()];
  fs.writeFileSync('todo.json', JSON.stringify(arr));
  console.log('scenes', list.length, 'todo pieces', arr.length, 'chars', arr.reduce((n, x) => n + x.length, 0), 'dict', Object.keys(dict).length);
}
