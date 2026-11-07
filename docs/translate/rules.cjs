// derive(piece): Russian for a normalised English piece that follows a known template, or null. The dictionary (dict.json) always wins over this.
const T = require('./dishes-ru.json');
const nm = n => T.names[n.toLowerCase()];
const ds = d => T.descs[d];
const cu = c => T.cu[c];
const RULES = [
  [/^(.+) at a restaurant$/, m => nm(m[1]) && `${nm(m[1])} в ресторане`],
  [/^A small restaurant with a handwritten menu offers (.+?): (.+)\.$/, m => nm(m[1]) && ds(m[2]) && `В небольшом ресторане с рукописным меню предлагают: ${nm(m[1])} — ${ds(m[2])}.`],
  [/^The (.+) arrives hot and steaming\.$/, m => nm(m[1]) && 'Заказ приносят горячим, с паром.'],
  [/^Cooking (.+) at home$/, m => nm(m[1]) && `Готовим дома: ${nm(m[1])}`],
  [/^You decide to cook (.+?) yourself: (.+)\.$/, m => nm(m[1]) && ds(m[2]) && `Вы решаете приготовить сами — ${nm(m[1])}: ${ds(m[2])}.`],
  [/^(.+) from a street stall$/, m => nm(m[1]) && `${nm(m[1])} в уличной палатке`],
  [/^A steamy stall near the metro sells (.+?): (.+)\.$/, m => nm(m[1]) && ds(m[2]) && `В дымящейся палатке у метро продаётся: ${nm(m[1])} — ${ds(m[2])}.`],
  [/^A neighbour brings (.+)$/, m => nm(m[1]) && `Сосед приносит: ${nm(m[1])}`],
  [/^A neighbour knocks with a plate of (.+?): "I made too much\." \((.+?): (.+)\.\)$/, m => nm(m[1]) && cu(m[2]) && ds(m[3]) && `Сосед стучит с тарелкой — ${nm(m[1])}: «Наварил слишком много». (${cu(m[2])}: ${ds(m[3])}.)`],
  [/^\((.+)\.\)$/, m => cu(m[1]) && `(${cu(m[1])}.)`],
];
const PV = require('./prov-ru.json');
const all = require('./all-full.json');
const TRANSLIT = {};
for (const s of all) { const m = s.text.match(/says: "(.+)" \((.+)\)\./); if (m) TRANSLIT[m[2]] = m[1]; }
const LAT = /[A-Za-z]/;
RULES.push(
  [/^{(CITY|UNI|JOB)}$/, m => '{' + m[1] + '}'],
  [/^An older colleague says: "(.+)" \(.+\)\.$/, m => `Пожилая коллега говорит: «${m[1]}».`],
  [/^It means: (.+)\.$/, m => PV[m[1]] && `Смысл: ${PV[m[1]]}.`],
  [/^You remember the proverb "(.+?)": (.+)\.$/, m => PV[m[2]] && `Вы вспоминаете пословицу «${m[1]}»: ${PV[m[2]]}.`],
  [/^(.+)$/, m => TRANSLIT[m[1]]],
  [/^(.+)$/, m => (LAT.test(m[1]) ? null : m[1])]
);
RULES.push(...require('./rules-city.cjs'));
module.exports = function derive(p) {
  for (const [re, f] of RULES) { const m = p.match(re); if (m) { const r = f(m); if (r) return r; } }
  return null;
};
