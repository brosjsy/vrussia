const a = require('./all.json');
const fam = {};
for (const s of a) { const m = s.id.match(/^(.*?)-(\d+)-(\d+)$/) ; if (!m) continue; (fam[m[1]] ??= []).push({ ...s, i: +m[2], j: +m[3] }); }
const out = {};
for (const [p, l] of Object.entries(fam)) {
  if (l.length < 8) continue;
  const ents = {}, sits = {}, chs = new Set(), texts = new Set();
  for (const s of l) {
    const [A, ...rest] = s.title.split(': '); ents[s.i] = A; sits[s.j] = rest.join(': ');
    s.choices.forEach((c, k) => chs.add(k + '|' + c.t + '|' + (c.fixed ? c.then : '~')));
  }
  out[p] = { n: l.length, ents, sits, chs: [...chs], sample: l[0].text, built: l.some(s => s.built) };
}
require('fs').writeFileSync('_fam.json', JSON.stringify(out, null, 1));
for (const [p, v] of Object.entries(out)) console.log(p, v.n, 'ents', Object.keys(v.ents).length, 'sits', Object.keys(v.sits).length, 'choices', v.chs.length, v.built);
