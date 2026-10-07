// Headless smoke test: node test/simulate.js
const fs = require('fs'), vm = require('vm'), path = require('path');
for (const f of ['engine', 'content-core', 'content-generated', 'content-life'])
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), { filename: f });
const st = RU.countStats();
console.log('Scenarios:', st.total, st.by);
const ids = new Set(RU.scenarios.map(s => s.id));
if (ids.size !== RU.scenarios.length) throw new Error('duplicate scenario ids');
const ends = {};
for (const o of RU.origins) for (let g = 0; g < 200; g++) {
  const s = RU.newState('T', o.id);
  let steps = 0;
  while (!s.over && steps++ < 5000) {
    if (s.queue.length) { const sc = RU.get(s.queue.shift(), s); RU.choose(s, sc, Math.floor(Math.random() * sc.choices.length)); continue; }
    const a = RU.util.pick(RU.actions);
    const r = RU.perform(s, a.id);
    if (!r.sc) continue;
    RU.choose(s, r.sc, Math.floor(Math.random() * r.sc.choices.length));
    for (const k of ['energy', 'health', 'stress', 'rep', 'know']) if (!(s[k] >= 0 && s[k] <= 100)) throw new Error('stat out of range ' + k);
    if (Number.isNaN(s.money)) throw new Error('NaN money');
  }
  ends[o.id + ':' + s.over] = (ends[o.id + ':' + s.over] || 0) + 1;
}
console.log('Endings:', ends);
