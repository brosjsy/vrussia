/* Material for the native readers of Uzbek, Tajik and Kyrgyz.
     LOCALE_EXPORT=1 npx vitest run test/locale-review.test.ts     writes docs/translate/locale-review.csv: every text with English, Russian and the three
                                                                    languages side by side, and empty columns for the reviewer's verdict and correction
   The check always runs: a language cannot be marked as reviewed without a name and a date. */
import { it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { OVERLAY } from '../src/platform/locale-data';
import * as PF from '../src/platform/pf-text';
import { EN, RU } from '../src/i18n';
import { REVIEWED, needsReview } from '../src/platform/locale-review';

const cell = (v: string | undefined): string => `"${(v ?? '').replace(/"/g, '""').replace(/^[=+\-@\t\r]/, "'$&")}"`;     // safe in a spreadsheet: no formula can start a cell
import { MORE_LANGS } from '../src/platform/locale-more';
const LANGS = ['uz', 'tg', 'ky', ...MORE_LANGS] as const;

it('a language is "reviewed" only with a name and a date', () => {
  for (const l of LANGS) {
    const r = REVIEWED[l];
    if (r) { expect(r.by.trim().length, l).toBeGreaterThan(2); expect(r.on, l).toMatch(/^\d{4}-\d{2}-\d{2}$/); }
    expect(needsReview(l), l).toBe(!r);
  }
  expect(needsReview('en')).toBe(false); expect(needsReview('ru')).toBe(false);
});

it('can export every text for the reviewers', () => {
  const rows: string[][] = [];
  const keys = new Set([...Object.keys(OVERLAY.uz), ...Object.keys(OVERLAY.tg), ...Object.keys(OVERLAY.ky)]);
  for (const k of keys) rows.push(['interface', k, EN[k], RU[k], OVERLAY.uz[k], OVERLAY.tg[k], OVERLAY.ky[k]]);
  const pk = new Set([...Object.keys(PF.UZ), ...Object.keys(PF.TG), ...Object.keys(PF.KY)]);
  for (const k of pk) rows.push(['platform', k, PF.EN[k], PF.RU[k], PF.UZ[k], PF.TG[k], PF.KY[k]]);
  expect(rows.length).toBeGreaterThan(50);
  if (process.env.LOCALE_EXPORT === '1') {
    mkdirSync('docs/translate', { recursive: true });
    const head = ['group', 'key', 'english', 'russian', 'uzbek', 'tajik', 'kyrgyz', 'ok? (uz/tg/ky)', 'correction', 'reviewer'];
    writeFileSync('docs/translate/locale-review.csv', '\ufeff' + [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n'));
  }
});
