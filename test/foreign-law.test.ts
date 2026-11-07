import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import { RULES, TOPICS, rulesFor, breaches, ruleById, whoOf } from '../src/foreign-law';

describe('the rulebook for foreigners', () => {
  it('every rule has both languages, a law, a game note and a known topic, and ids are unique', () => {
    const ids = new Set<string>();
    for (const r of RULES) {
      expect(ids.has(r.id), r.id).toBe(false); ids.add(r.id);
      expect(TOPICS[r.topic], r.id).toBeTruthy();
      expect(r.law.length).toBeGreaterThan(3); expect(r.en.length).toBeGreaterThan(40);
      expect(r.ru).toMatch(/[а-яё]/i); expect(r.game.ru).toMatch(/[а-яё]/i); expect(r.game.en.length).toBeGreaterThan(10);
    }
    for (const t of Object.keys(TOPICS)) expect(RULES.some(r => r.topic === t), t).toBe(true);
  });
  it('shows a student, a migrant and an EAEU worker their own rules', () => {
    const student = G.newState('t', 'student'), migrant = G.newState('t', 'tajik'), eaeu = G.newState('t', 'kyrgyz'), citizen = G.newState('t', 'moscow');
    expect(whoOf(student)).toBe('student'); expect(whoOf(migrant)).toBe('migrant'); expect(whoOf(eaeu)).toBe('eaeu');
    expect(rulesFor(eaeu).some(r => r.id === 'eaeu-work')).toBe(true); expect(rulesFor(eaeu).some(r => r.id === 'patent')).toBe(false);
    expect(rulesFor(citizen).every(r => r.who === 'all')).toBe(true);
    expect(rulesFor(student).some(r => r.id === 'student-work')).toBe(true);
    expect(rulesFor(student).some(r => r.id === 'patent')).toBe(false);
    expect(rulesFor(migrant).some(r => r.id === 'reg-7')).toBe(true);
  });
  it('names the rules a player breaks, from the same check the raids use', () => {
    const s = G.newState('t', 'student'); s.docs.reg = 0;
    expect(breaches(s).map(r => r.id)).toContain('reg-7');
    s.docs.reg = 30; s.docs.visa = 100; s.job = null;
    expect(breaches(s)).toHaveLength(0);
    expect(ruleById('entry-ban')).toBeTruthy();
  });
});

import '../src/content';
import { CHECKS, CHECKED_ON } from '../src/foreign-law';
import { RULES_RU } from '../src/scenes-ru-rules';

describe('the online check and the 2026 scenes', () => {
  it('records a source and both languages for every checked rule, and every checked rule exists', () => {
    expect(CHECKED_ON).toMatch(/^2026-/);
    for (const [id, c] of Object.entries(CHECKS)) { expect(ruleById(id), id).toBeTruthy(); expect(c.url).toMatch(/^https:\/\//); expect(c.ru).toMatch(/[а-яё]/i); expect(['confirmed', 'partly', 'open']).toContain(c.s); }
  });
  it('has nine rules2026 scenes, each with a Russian version and only for foreigners', () => {
    const sc = G.scenarios.filter(x => x.id.startsWith('rule-'));
    expect(sc.length).toBe(9);
    for (const x of sc) { expect(x.who).toEqual(['foreigner']); expect(RULES_RU[x.id], x.id).toBeTruthy(); expect(RULES_RU[x.id].choices.length, x.id).toBe(x.choices.length); }
  });
  it('every choice runs without error', () => {
    for (const x of G.scenarios.filter(y => y.id.startsWith('rule-'))) for (let i = 0; i < x.choices.length; i++) {
      const s = G.newState('T', 'tajik'); s.money = 50000; s.day = 40; s.job = 'cook'; s.kids = 1; s.flags.vnzh = true;
      const o = x.choices[i]!.r!(s); expect(o.msg.length, `${x.id}/${i}`).toBeGreaterThan(5);
    }
  });
});

import { DAILY } from '../src/content/packs/daily2026-data';
import { DAILY_B } from '../src/content/packs/daily2026b-data';
import { DAILY_RU } from '../src/scenes-ru-daily';
import { DAILY_B_RU } from '../src/scenes-ru-daily-b';
import { DAILY_C } from '../src/content/packs/daily2026c-data';
import { DAILY_C_RU } from '../src/scenes-ru-daily-c';
import { DAILY_D } from '../src/content/packs/daily2026d-data';
import { DAILY_D_RU } from '../src/scenes-ru-daily-d';
import { DAILY_E } from '../src/content/packs/daily2026e-data';
import { DAILY_E_RU } from '../src/scenes-ru-daily-e';
const ALL = [...DAILY, ...DAILY_B, ...DAILY_C, ...DAILY_D, ...DAILY_E], ALL_RU = { ...DAILY_RU, ...DAILY_B_RU, ...DAILY_C_RU, ...DAILY_D_RU, ...DAILY_E_RU };

describe('the daily-life scenes', () => {
  it('has unique ids, three choices each, both languages and small costs', () => {
    const ids = new Set<string>();
    expect(ALL.length).toBeGreaterThanOrEqual(135);
    for (const d of ALL) {
      expect(ids.has(d.id), d.id).toBe(false); ids.add(d.id);
      const r = ALL_RU[d.id]!; expect(r, d.id).toBeTruthy();
      expect(d.ch.length, d.id).toBe(3); expect(r.choices.length, d.id).toBe(3); expect(r.title).toMatch(/[а-яё]/i); expect(r.text).toMatch(/[а-яё]/i);
      d.ch.forEach((c, k) => { expect(r.choices[k]![0]).toMatch(/[а-яё]/i); expect(r.choices[k]![1]).toMatch(/[а-яё]/i); expect(c[2].money ?? 0, d.id).toBeGreaterThanOrEqual(-15000); expect(c[2].money ?? 0, `${d.id} gives free money`).toBeLessThanOrEqual(0); });
      expect(G.scenarios.some(x => x.id === d.id), d.id).toBe(true);
    }
  });
  it('shows the foreigner-only scenes only to foreigners', () => {
    for (const d of ALL.filter(x => x.foreigner)) expect(G.scenarios.find(x => x.id === d.id)!.who).toEqual(['foreigner']);
  });
});
