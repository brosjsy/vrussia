/* How much of the story is in Russian, and a check on every Russian scene that is added.
     npx vitest run test/ru-coverage.test.ts                       checks the translations that exist
     RU_REPORT=1 npx vitest run test/ru-coverage.test.ts           writes docs/RU_COVERAGE.md
     RU_EXPORT=papers npx vitest run test/ru-coverage.test.ts      writes docs/translate/papers.json: the English still to translate in that category (use "all" for every one; RU_FULL=1 also lists the scenes already translated, which docs/translate/gen.cjs needs) */
import { it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { SCENES_RU } from '../src/scenes-ru';
import { SCENES_RU_MORE, loadGenerated } from '../src/scenes-ru-more';

const ALL = { ...SCENES_RU, ...(await loadGenerated()), ...SCENES_RU_MORE };
const all = (): G.Scenario[] => { const seen = new Set<string>(); return G.scenarios.filter(s => !seen.has(s.id) && seen.add(s.id)); };
const hasRu = (id: string): boolean => !!ALL[id];
const CYR = /[а-яё]/i, PH = /\{(name|city|home)\}/g;

/** The result lines a choice can give across several characters and tries: one line means it is always the same. */
const lines = (c: G.Choice): Set<string> => { const out = new Set<string>(); for (const o of ['tajik', 'moscow', 'student', 'kyrgyz']) for (let k = 0; k < 40; k++) { try { const st = G.newState('{name}', o); out.add(c.r ? c.r(st).msg : c.msg ?? ''); } catch { out.add('?'); } } return out; };

/** The English of a scene as plain data: static text where there is any, and the answer for a typical player where the scene builds it. */
function plain(sc: G.Scenario): { id: string; cat: string; built: boolean; title: string; text: string; choices: { t: string; then: string; fixed: boolean }[] } {
  const s = G.newState('{name}', 'tajik'); let sc2 = sc;
  try { sc2 = G.materialize(sc, s); } catch { /* keep the scene as it is */ }
  return { id: sc.id, cat: sc.cat, built: !!sc.build, title: sc.title, text: sc2.text, choices: sc2.choices.map(c => { let then = c.msg ?? ''; try { if (c.r) then = c.r(structuredClone(s)).msg; } catch { /* no line */ } return { t: c.t, then, fixed: lines(c).size === 1 }; }) };
}

it('every Russian scene belongs to a real scene, keeps its choices and its {name} / {home}, and is really Russian', () => {
  const ids = new Map(all().map(s => [s.id, s]));
  for (const [id, r] of Object.entries(ALL)) {
    const sc = ids.get(id) ?? G.get(id, G.newState('X', 'tajik'));
    expect(sc, `${id} is not a scene of the game`).toBeTruthy();
    expect(r.title.trim().length, id).toBeGreaterThan(0); expect(r.text.trim().length, id).toBeGreaterThan(0);
    expect(CYR.test(r.title + r.text), `${id} has no Russian letters`).toBe(true);
    const en = G.get(id, G.newState('X', 'tajik'))!;
    expect(r.choices.length, `${id}: number of choices`).toBe(en.choices.length);
    for (const [i, [t, then]] of r.choices.entries()) {
      if (then) expect(lines(en.choices[i]).size, `${id}: choice ${i + 1} has a Russian result line but the English one varies; leave it empty`).toBe(1); expect(t.trim().length, id).toBeGreaterThan(0); expect(CYR.test(t + then), `${id}: choice is not Russian`).toBe(true); }
    const want = (en.text.match(PH) ?? []).sort().join(), got = (r.text.match(PH) ?? []).sort().join();
    expect(got, `${id}: placeholders in the text`).toBe(want);
  }
});

it('reports the coverage by category, and can export what is left for translators', () => {
  const list = all(), done = list.filter(s => hasRu(s.id));
  const by = new Map<string, { n: number; ru: number }>();
  for (const s of list) { const c = by.get(s.cat) ?? { n: 0, ru: 0 }; c.n++; if (hasRu(s.id)) c.ru++; by.set(s.cat, c); }
  expect(list.length).toBeGreaterThan(1000);
  expect(done.length, 'the number of translated scenes never goes down').toBeGreaterThanOrEqual(455);
  if (process.env.RU_REPORT === '1') {
    const rows = [...by.entries()].sort((a, b) => b[1].n - a[1].n).map(([c, v]) => `| ${c} | ${v.n} | ${v.ru} | ${Math.round(v.ru / v.n * 100)}% |`);
    writeFileSync('docs/RU_COVERAGE.md', `# Story texts in Russian\n\nThe interface is fully translated. The stories are not: **${done.length} of ${list.length} scenes (${(done.length / list.length * 100).toFixed(1)}%)** have a Russian version; the rest show in English.\n\nHow to add more: see the top of \`src/scenes-ru-more.ts\`. Run \`RU_REPORT=1 npx vitest run test/ru-coverage.test.ts\` to refresh this file.\n\n| Category | Scenes | In Russian | Share |\n|---|---|---|---|\n${rows.join('\n')}\n`);
  }
  const want = process.env.RU_EXPORT;
  if (want) {
    mkdirSync('docs/translate', { recursive: true });
    const todo = list.filter(s => (process.env.RU_FULL === '1' || !hasRu(s.id)) && (want === 'all' || s.cat === want)).map(plain);
    writeFileSync(`docs/translate/${want.replace(/[^a-z_-]/gi, '')}${process.env.RU_FULL === '1' ? '-full' : ''}.json`, JSON.stringify(todo, null, 1));
  }
});
