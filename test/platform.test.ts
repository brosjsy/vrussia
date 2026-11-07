// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { EN, RU, t, setLang, lang, overlayActive } from '../src/i18n';
import { CONSENT_KEY, POLICY_VERSION, analyticsAllowed, eraseLocalData, exportLocalData, getConsent, needsBanner, setConsent } from '../src/platform/consent';
import type { ListableKV } from '../src/platform/consent';
import { privacyPolicy, terms, policyHtml, contactLine } from '../src/platform/policy';
import { LOCALES, currentLocale, savedLocale, setLocale, useOverlays } from '../src/platform/locale';
import { OVERLAY } from '../src/platform/locale-data';
useOverlays(OVERLAY);
import * as PF from '../src/platform/pf-text';
import { Tour, TOUR_STEPS, findTarget, loadTour, resetTour, shouldAutoStart } from '../src/platform/onboarding';
import { SOURCES, STALE_DAYS, forTags, freshness, sourcesHtml, topicsOf, topicsOfText } from '../src/platform/citations';
import { buildReport, compact, isEmpty, printableHtml } from '../src/platform/report';
import { CARD_H, CARD_W, cardSpec, drawCard, wrapLines } from '../src/platform/card';
import { Flags, Telemetry, cleanProps, scrub, MAX_ERRORS } from '../src/platform/telemetry';
import { TEMPLATE, addPack, loadStored, removePack, storedPacks, validatePack } from '../src/platform/packs';
import * as cls from '../src/platform/classroom';
import * as daily from '../src/platform/daily';
import { loadA11y, looksWeak, saveA11y, applyA11y } from '../src/platform/a11y';

class MemKV implements ListableKV {
  m = new Map<string, string>();
  get length(): number { return this.m.size; }
  key(i: number): string | null { return [...this.m.keys()][i] ?? null; }
  getItem(k: string): string | null { return this.m.get(k) ?? null; }
  setItem(k: string, v: string): void { this.m.set(k, v); }
  removeItem(k: string): void { this.m.delete(k); }
}
const reply = (body: unknown, ok = true, status = 200): Response => ({ ok, status, json: async () => body }) as Response;

describe('privacy choices', () => {
  it('nothing is allowed until the player says yes; an older policy version asks again', () => {
    const kv = new MemKV();
    expect(getConsent(kv)).toBeNull(); expect(needsBanner(kv)).toBe(true); expect(analyticsAllowed(kv)).toBe(false);
    setConsent(false, kv); expect(needsBanner(kv)).toBe(false); expect(analyticsAllowed(kv)).toBe(false);
    setConsent(true, kv, 5); expect(analyticsAllowed(kv)).toBe(true); expect(getConsent(kv)).toEqual({ v: POLICY_VERSION, analytics: true, at: 5 });
    kv.setItem(CONSENT_KEY, JSON.stringify({ v: 0, analytics: true, at: 1 })); expect(needsBanner(kv)).toBe(true); expect(analyticsAllowed(kv)).toBe(false);
    kv.setItem(CONSENT_KEY, '{broken'); expect(getConsent(kv)).toBeNull();
  });
  it('download and erase touch only this game’s keys', () => {
    const kv = new MemKV();
    kv.setItem('vrussia_save', JSON.stringify({ day: 3 })); kv.setItem('vrussia_lang', 'ru'); kv.setItem('vrussia_text', 'not json'); kv.setItem('other_app', 'keep me');
    const out = exportLocalData(kv, 0);
    expect(out.data).toEqual({ vrussia_lang: 'ru', vrussia_save: { day: 3 }, vrussia_text: 'not json' });
    expect(eraseLocalData(kv)).toBe(3);
    expect([...kv.m.keys()]).toEqual(['other_app']);
    expect(eraseLocalData(null)).toBe(0);
  });
});

describe('privacy policy and terms', () => {
  it('both languages have the same sections and say what is really kept', () => {
    expect(privacyPolicy(true).sections.length).toBe(privacyPolicy(false).sections.length);
    expect(terms(true).sections.length).toBe(terms(false).sections.length);
    const en = JSON.stringify(privacyPolicy(false));
    for (const word of ['e-mail', 'hash of your password', '90 days', 'IP address', 'nickname', '18']) expect(en).toContain(word);
    expect(JSON.stringify(privacyPolicy(true))).toContain('152-ФЗ');
  });
  it('without an operator it says so instead of inventing one; with one it names them; the page escapes text', () => {
    expect(contactLine('', false)).toMatch(/has not entered/);
    expect(contactLine('Help Centre, help@example.org', false)).toContain('help@example.org');
    expect(policyHtml({ title: '<b>x</b>', updated: '1', sections: [{ h: '"', p: ['<script>'] }] }, s => s.replace(/</g, '&lt;'))).not.toContain('<script>');
  });
});

import { MORE_LANGS, MORE_UI, MORE_PF, UI_KEYS, PF_KEYS, RAW_COUNTS } from '../src/platform/locale-more';
useOverlays(MORE_UI);
const kv2 = (): MemKV => new MemKV();
describe('fourteen more languages', () => {
  afterEach(() => { setLocale('en', new MemKV()); });
  it('every language has every key, translated, in the right script', () => {
    const counts = RAW_COUNTS();
    for (const l of MORE_LANGS) {
      expect(counts[l], l).toEqual([UI_KEYS.length, PF_KEYS.length]);
      for (const k of UI_KEYS) { const v = MORE_UI[l][k]; expect(EN[k], k).toBeDefined(); expect(v?.trim().length, `${l}.${k}`).toBeGreaterThan(0); if (!['stat.stress', 'diff.normal'].includes(k)) expect(v, `${l}.${k}`).not.toBe(EN[k]); }
      for (const k of PF_KEYS) { expect(PF.EN[k], k).toBeDefined(); expect(MORE_PF[l][k]?.trim().length, `${l}.${k}`).toBeGreaterThan(0); }
    }
    const script: Record<string, RegExp> = { kk: /[а-яё]/i, uk: /[а-яё]/i, hy: /[԰-֏]/, ka: /[Ⴀ-ჿ]/, zh: /[一-鿿]/, hi: /[ऀ-ॿ]/, ar: /[؀-ۿ]/ };
    for (const [l, re] of Object.entries(script)) expect(re.test(MORE_UI[l as 'kk'].start), l).toBe(true);
  });
  it('Arabic is right to left; post-Soviet languages fall back to Russian, the rest to English', () => {
    const kv = new MemKV();
    setLocale('ar', kv); expect(currentLocale()).toBe('ar'); expect(lang()).toBe('en'); expect(t('start')).toBe(MORE_UI.ar.start); expect(t('journalTitle')).toBe(EN.journalTitle);
    expect(document.documentElement.dir).toBe('rtl');
    setLocale('kk', kv); expect(lang()).toBe('ru'); expect(t('journalTitle')).toBe(RU.journalTitle); expect(document.documentElement.dir).toBe('ltr');
    setLocale('fr', kv); expect(t('close')).toBe(MORE_UI.fr.close); expect(kv.getItem('vrussia_locale')).toBe('fr');
  });
});

describe('more languages', () => {
  afterEach(() => { setLocale('en', new MemKV()); });
  it('every key is a real interface key, translated, and different from English', () => {
    for (const l of ['uz', 'tg', 'ky'] as const) {
      for (const [k, v] of Object.entries(OVERLAY[l])) { expect(EN[k], `${l}.${k}`).toBeDefined(); expect(v.trim().length, `${l}.${k}`).toBeGreaterThan(0); if (k !== 'stat.stress') expect(v, `${l}.${k}`).not.toBe(EN[k]); }       // “Stress” is the same word in Uzbek
      expect(Object.keys(OVERLAY[l]).sort(), l).toEqual(Object.keys(OVERLAY.uz).sort());
    }
    expect(/[а-яё]/i.test(OVERLAY.uz.start)).toBe(false);          // Uzbek is in Latin letters
    expect(/[а-яё]/i.test(OVERLAY.tg.start) && /[а-яё]/i.test(OVERLAY.ky.start)).toBe(true);
  });
  it('an extra language shows its text, falls back to Russian, and the old RU/EN switch ends it', () => {
    const kv = new MemKV();
    expect(setLocale('uz', kv)).toBe(true);
    expect(currentLocale()).toBe('uz'); expect(overlayActive()).toBe(true); expect(lang()).toBe('ru');
    expect(t('start')).toBe('Boshlash');
    expect(t('journalTitle')).toBe(RU.journalTitle);                // no Uzbek for this key: Russian
    expect(kv.getItem('vrussia_locale')).toBe('uz');
    setLang('en');                                                  // what the RU button does
    expect(overlayActive()).toBe(false); expect(currentLocale()).toBe('en'); expect(t('start')).toBe(EN.start);
    setLocale('ky', kv); expect(t('close')).toBe('Жабуу'); setLocale('ru', kv); expect(t('close')).toBe(RU.close);
    expect(setLocale('xx' as never, kv)).toBe(false);
  });
  it('a saved choice wins; otherwise the browser language decides', () => {
    const kv = new MemKV();
    expect(savedLocale(kv, 'uz-UZ')).toBe('uz'); expect(savedLocale(kv, 'ky')).toBe('ky'); expect(savedLocale(kv, 'tg-TJ')).toBe('tg'); expect(savedLocale(kv, 'en-GB')).toBeNull();
    kv.setItem('vrussia_locale', 'ru'); expect(savedLocale(kv, 'uz')).toBe('ru');
    expect(LOCALES.map(l => l.id)).toEqual(['en', 'ru', 'uz', 'tg', 'ky', ...MORE_LANGS]);
    expect(savedLocale(kv2(), 'zh-CN')).toBe('zh'); expect(savedLocale(kv2(), 'pt-BR')).toBe('pt'); expect(savedLocale(kv2(), 'ar-EG')).toBe('ar');
  });
  it('the platform texts: English and Russian have the same keys; the others only use real keys; every tour step is told in all five languages', () => {
    expect(Object.keys(PF.RU).sort()).toEqual(Object.keys(PF.EN).sort());
    for (const d of [PF.UZ, PF.TG, PF.KY]) for (const k of Object.keys(d)) expect(PF.EN[k], k).toBeDefined();
    for (const d of [PF.EN, PF.RU, PF.UZ, PF.TG, PF.KY]) for (const s of TOUR_STEPS) { expect(d[`tour.${s.key}.t`], s.key).toBeTruthy(); expect(d[`tour.${s.key}.b`], s.key).toBeTruthy(); }
    setLocale('tg', new MemKV()); expect(PF.pf('tourNext')).toBe(PF.TG.tourNext); expect(PF.pf('classTitle')).toBe(PF.RU.classTitle);
  });
});

describe('the first-run tutorial', () => {
  it('walks the steps, can go back, and remembers that it was finished or skipped', () => {
    const kv = new MemKV();
    expect(shouldAutoStart(kv)).toBe(true);
    const tour = new Tour(kv);
    expect(tour.current?.key).toBe(TOUR_STEPS[0].key); expect(tour.back()?.key).toBe(TOUR_STEPS[0].key);
    tour.next(); expect(tour.step).toBe(1); tour.back(); expect(tour.step).toBe(0);
    for (let i = 0; i < TOUR_STEPS.length - 1; i++) tour.next();
    expect(tour.last).toBe(true); expect(tour.next()).toBeNull(); expect(tour.active).toBe(false);
    expect(loadTour(kv).status).toBe('done'); expect(shouldAutoStart(kv)).toBe(false);
    resetTour(kv); expect(shouldAutoStart(kv)).toBe(true);
    const t2 = new Tour(kv); t2.skip(); expect(loadTour(kv).status).toBe('skipped'); expect(t2.current).toBeNull();
  });
  it('points at an element that is on screen and ignores hidden ones', () => {
    document.body.innerHTML = '<div id="a" hidden>hidden</div><div id="b">shown</div>';
    const rect = { width: 10, height: 10, top: 0, left: 0, right: 10, bottom: 10, x: 0, y: 0, toJSON: () => ({}) };
    (document.getElementById('b') as HTMLElement).getBoundingClientRect = () => rect as DOMRect;
    (document.getElementById('a') as HTMLElement).getBoundingClientRect = () => rect as DOMRect;
    expect(findTarget('#a, #b')?.id).toBe('b'); expect(findTarget('#nothing')).toBeNull();
  });
});

describe('sources for the rules', () => {
  it('each source is complete, unique, honest about not being checked, and goes to an official portal', () => {
    const ids = SOURCES.map(s => s.id); expect(new Set(ids).size).toBe(ids.length);
    for (const s of SOURCES) {
      expect(s.law.en.length).toBeGreaterThan(20); expect(s.law.ru.length).toBeGreaterThan(20); expect(s.url).toMatch(/^https?:\/\//); expect(s.tags.length).toBeGreaterThan(0);
      expect(freshness(s)).toBe('unchecked');                        // nobody has confirmed them against the law yet: the screen must say so
    }
  });
  it('a checked date is fresh for half a year, then old', () => {
    const s = { ...SOURCES[0], verifiedOn: '2026-01-01' }, day = 864e5, t0 = Date.parse('2026-01-01');
    expect(freshness(s, t0 + 10 * day)).toBe('fresh'); expect(freshness(s, t0 + (STALE_DAYS + 1) * day)).toBe('old');
    expect(freshness({ ...s, verifiedOn: 'junk' }, t0)).toBe('old');
  });
  it('a migrant gets the migration law, a student the education law; text is matched by keywords', () => {
    const m = G.newState('M', 'tajik'), st = G.newState('S', 'student');
    expect(forTags(topicsOf(m)).map(x => x.id)).toEqual(expect.arrayContaining(['fz109', 'fz115', 'tax2271']));
    expect(forTags(topicsOf(st)).map(x => x.id)).toContain('fz273');
    expect(topicsOfText('You need a patent and registration')).toEqual(expect.arrayContaining(['patent', 'registration']));
    expect(topicsOfText('Вас оштрафовали')).toContain('fines');
    expect(topicsOfText('nothing relevant')).toEqual([]);
  });
  it('the list escapes text and marks unchecked sources', () => {
    const html = sourcesHtml([{ ...SOURCES[0], law: { en: '<img src=x>', ru: 'x' } }], false, { never: 'Not checked', checked: 'C', old: 'O', open: 'Open' }, s => s.replace(/</g, '&lt;'));
    expect(html).not.toContain('<img'); expect(html).toContain('Not checked'); expect(html).toContain('rel="noopener noreferrer"');
  });
});

describe('the learning report', () => {
  it('shows what the state shows: papers held, strikes, endings', () => {
    const s = G.newState('M', 'tajik');
    const fresh = buildReport(s);
    expect(fresh.steps.some(x => x.id === 's_reg')).toBe(true); expect(fresh.steps.some(x => x.id === 's_oms')).toBe(false);
    s.flags.med = true; s.flags.insured = true; s.flags.rutest = true; s.strikes = 2; s.over = 'deported';
    const r = buildReport(s);
    expect(r.done.map(x => x.id)).toEqual(expect.arrayContaining(['med', 'insured', 'rutest']));
    expect(r.mistakes.map(x => x.id)).toEqual(expect.arrayContaining(['strikes', 'deported']));
    expect(r.steps.find(x => x.id === 's_med')!.done).toBe(true);
    expect(r.sources.length).toBeGreaterThan(3);
    expect(compact(r).mistakes).toContain('deported'); expect(JSON.stringify(compact(r))).not.toContain('M');       // ids only, no name
    expect(isEmpty(buildReport(G.newState('X', 'moscow')))).toBe(true);
  });
  it('every item has both languages; the printable page escapes the player’s name', () => {
    const s = G.newState('<b>Eve</b>', 'tajik'); s.flags.med = true;
    const r = buildReport(s);
    for (const i of [...r.done, ...r.steps]) { expect(i.en.length).toBeGreaterThan(5); expect(i.ru).toMatch(/[а-яё]/i); }
    const lab = { title: 'Report', done: 'Done', mistakes: 'Mistakes', next: 'Next', sources: 'Sources', day: 'Day', none: '-', note: 'Check', never: 'n', checked: 'c', old: 'o', open: 'Open' };
    const html = printableHtml(r, false, lab, x => x.replace(/</g, '&lt;'), () => '<ul></ul>');
    expect(html).toContain('<!doctype html>'); expect(html).not.toContain('<b>Eve</b>'); expect(html).toContain('☑');
  });
});

describe('the result card', () => {
  const base = { name: 'Dilya', label: 'Tajik Migrant', ending: 'time', score: 1234.6, days: 412, citizen: true, achievements: 12, achievementsTotal: 45, diff: 'normal' };
  it('says what happened, in both languages, at the size social sites show', () => {
    const c = cardSpec(base);
    expect(c.w).toBe(CARD_W); expect(c.h).toBe(CARD_H); expect(c.headline).toBe('Dilya became a Russian citizen'); expect(c.lines).toContain('Score: 1235'); expect(c.lines).toContain('412 days played');
    expect(cardSpec({ ...base, citizen: false, ending: 'deported' }).headline).toBe('Dilya: Was deported');
    expect(cardSpec(base, true).headline).toContain('гражданство'); expect(cardSpec({ ...base, name: '  ' }).headline).toContain('Player');
  });
  it('wraps long text and draws without errors', () => {
    const ctx = { measureText: (x: string) => ({ width: x.length * 10 }) as TextMetrics };
    expect(wrapLines(ctx, 'aaa bbb ccc ddd', 70)).toEqual(['aaa bbb', 'ccc ddd']); expect(wrapLines(ctx, '', 70)).toEqual([]);
    const calls: string[] = [];
    const fake = new Proxy({ measureText: (x: string) => ({ width: x.length * 10 }), fillText: (x: string) => { calls.push(x); } } as Record<string, unknown>, { get: (o, k) => (k in o ? o[k as string] : () => undefined), set: (o, k, v) => { o[k as string] = v; return true; } });
    drawCard(fake as unknown as CanvasRenderingContext2D, cardSpec(base));
    expect(calls.some(c => c.includes('Dilya'))).toBe(true); expect(calls.some(c => c.includes('В России'))).toBe(true);
  });
});

describe('usage numbers, error reports and flags', () => {
  const sent: { url: string; init: RequestInit }[] = [];
  const fakeFetch = (async (url: string, init: RequestInit) => { sent.push({ url, init }); return reply({ ok: true }); }) as unknown as typeof fetch;
  const kvYes = (): MemKV => { const kv = new MemKV(); setConsent(true, kv); return kv; };
  afterEach(() => { sent.length = 0; });

  it('sends nothing without a yes, or without a server', async () => {
    const no = new Telemetry({ base: 'https://api.example.org', fetch: fakeFetch, kv: new MemKV() });
    expect(no.track('run_start')).toBe(false); expect(no.error('boom')).toBe(false); expect(await no.flush()).toBe(true); expect(sent).toHaveLength(0);
    const off = new Telemetry({ base: null, fetch: fakeFetch, kv: kvYes() });
    expect(off.track('run_start')).toBe(false); expect(off.on).toBe(false);
  });
  it('sends a batch with no cookie, a random id for this tab and only clean properties', async () => {
    const tm = new Telemetry({ base: 'https://api.example.org', fetch: fakeFetch, kv: kvYes(), build: '2.0', random: () => 0.5 });
    expect(tm.track('run_start', { origin: 'tajik', n: 3, ok: true, nested: { a: 1 }, 'Bad Key': 'x', long: 'y'.repeat(200) })).toBe(true);
    expect(tm.track('Bad Name')).toBe(false);
    await tm.flush();
    expect(sent).toHaveLength(1); expect(sent[0].url).toBe('https://api.example.org/api/telemetry');
    expect(sent[0].init.credentials).toBe('omit');
    const body = JSON.parse(String(sent[0].init.body)) as { sid: string; build: string; events: { name: string; props: Record<string, unknown> }[] };
    expect(body.sid).toMatch(/^[a-z0-9]{12}$/); expect(body.build).toBe('2.0');
    expect(body.events[0].props).toEqual({ origin: 'tajik', n: 3, ok: true, long: 'y'.repeat(80) });
    expect(JSON.stringify(body)).not.toMatch(/email|password|cookie/i);
  });
  it('cleans error text, sends each error once, and stops after a few', async () => {
    expect(scrub('Failed for bob@example.org at https://x.org/a?token=abc#h id 123456789')).toBe('Failed for [email] at https://x.org/a id #');
    expect(scrub('x'.repeat(500))).toHaveLength(200);
    const tm = new Telemetry({ base: 'https://api.example.org', fetch: fakeFetch, kv: kvYes() });
    expect(tm.error('same', 'a.ts:1')).toBe(true); expect(tm.error('same', 'a.ts:1')).toBe(false);
    for (let i = 0; i < 30; i++) tm.error('e' + i);
    await tm.flush();
    const total = sent.flatMap(s => (JSON.parse(String(s.init.body)) as { events: unknown[] }).events).length;
    expect(total).toBe(MAX_ERRORS);
    expect(cleanProps(null)).toEqual({}); expect(Object.keys(cleanProps(Object.fromEntries(Array.from({ length: 20 }, (_, i) => ['k' + i, i])))).length).toBe(8);
  });
  it('a failed send never throws', async () => {
    const tm = new Telemetry({ base: 'https://api.example.org', fetch: (async () => { throw new Error('offline'); }) as unknown as typeof fetch, kv: kvYes() });
    tm.track('tick'); expect(await tm.flush()).toBe(false);
  });
  it('flags: defaults, the server’s list with a percentage of players, the address override, and a broken cache', async () => {
    const kv = new MemKV();
    expect(new Flags(kv, '').isOn('tour')).toBe(true); expect(new Flags(kv, '').isOn('unknown_flag')).toBe(false);
    const f = new Flags(kv, '');
    expect(await f.refresh('https://api.example.org', (async () => reply([{ key: 'tour', enabled: false, rollout: 100 }, { key: 'half', enabled: true, rollout: 50 }, { key: 'all', enabled: true, rollout: 100 }, { junk: 1 }])) as unknown as typeof fetch)).toBe(true);
    expect(f.isOn('tour')).toBe(false); expect(f.isOn('all')).toBe(true);
    let on = 0; for (let i = 0; i < 400; i++) { const k = new MemKV(); k.setItem('vrussia_bucket', 'b' + i); k.setItem('vrussia_flags', JSON.stringify([{ key: 'half', enabled: true, rollout: 50 }])); if (new Flags(k, '').isOn('half')) on++; }
    expect(on).toBeGreaterThan(140); expect(on).toBeLessThan(260);
    expect(new Flags(kv, '?x=1&ff=tour,-all').isOn('tour')).toBe(true); expect(new Flags(kv, '?ff=-all').isOn('all')).toBe(false);
    expect(await f.refresh(null)).toBe(false); expect(await f.refresh('https://api.example.org', (async () => reply({}, false, 500)) as unknown as typeof fetch)).toBe(false);
    const bad = new MemKV(); bad.setItem('vrussia_flags', '{nope'); expect(new Flags(bad, '').isOn('tour')).toBe(true);
  });
});

describe('community packs', () => {
  const good = () => JSON.parse(JSON.stringify(TEMPLATE)) as typeof TEMPLATE;
  it('the template is valid, and every kind of mistake is named', () => {
    expect(validatePack(good())).toEqual([]);
    const bad = (f: (p: ReturnType<typeof good>) => void): string[] => { const p = good(); f(p); return validatePack(p); };
    expect(bad(p => { (p as { format: string }).format = 'x'; })[0]).toMatch(/format/);
    expect(bad(p => { p.id = 'Bad Id'; })[0]).toMatch(/id/);
    expect(bad(p => { p.scenarios[0].choices[0].fx = { money: 1e9 }; })[0]).toMatch(/money/);
    expect(bad(p => { p.scenarios[0].choices[0].fx = { run: 'alert(1)' }; })[0]).toMatch(/not allowed/);
    expect(bad(p => { p.scenarios[0].choices[0].fx = { flag: ['Bad Flag'] }; })[0]).toMatch(/flag/);
    expect(bad(p => { p.scenarios[0].choices = [p.scenarios[0].choices[0]]; })[0]).toMatch(/2 to 4/);
    expect(bad(p => { p.scenarios.push({ ...p.scenarios[0] }); })[0]).toMatch(/twice/);
    expect(bad(p => { p.scenarios[0].who = ['alien' as never]; })[0]).toMatch(/who/);
    expect(bad(p => { p.scenarios[0].months = [13]; })[0]).toMatch(/months/);
    expect(bad(p => { p.scenarios[0].w = 99; })[0]).toMatch(/\bw\b/);
    expect(validatePack(null)[0]).toMatch(/not a pack/); expect(validatePack({ ...good(), scenarios: [] })[0]).toMatch(/at least one/);
  });
  it('a good pack adds scenarios under its own prefix, survives a restart, and can be removed; bad files add nothing', () => {
    const kv = new MemKV(), before = G.scenarios.length;
    const bad = addPack('{nope', kv); expect(bad.ok).toBe(false); expect(bad.problems[0]).toMatch(/JSON/);
    expect(addPack(JSON.stringify({ ...good(), id: 'x'.repeat(30) }), kv).ok).toBe(false);
    expect(addPack('x'.repeat(130_000), kv).problems[0]).toMatch(/too big/);
    expect(G.scenarios.length).toBe(before);
    const r = addPack(JSON.stringify(good()), kv);
    expect(r).toMatchObject({ ok: true, count: 1 }); expect(G.scenarios.length).toBe(before + 1);
    const sc = G.scenarios.find(x => x.id === 'pack-myclass-bus-ticket')!;
    expect(sc.cat).toBe('life'); expect(G.get('pack-myclass-bus-ticket', G.newState('T', 'tajik'))).toBeTruthy();
    const o = sc.choices[0].r!(G.newState('T', 'tajik')); expect(o.fx).toEqual({ know: 1, friends: 1 });
    expect(addPack(JSON.stringify(good()), kv).ok).toBe(true); expect(G.scenarios.length).toBe(before + 1);        // the same id replaces, not doubles
    removePack('myclass', kv); expect(G.scenarios.length).toBe(before); expect(storedPacks(kv)).toEqual([]);
    addPack(JSON.stringify(good()), kv); G.scenarios.splice(G.scenarios.findIndex(x => x.id.startsWith('pack-')), 1);
    expect(loadStored(kv)).toBe(1); removePack('myclass', kv);
  });
  it('a pack can never replace a scenario of the game', () => {
    const kv = new MemKV(), p = good(); p.scenarios[0].id = G.scenarios[0].id.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30) || 'abc';
    const n = G.scenarios.length; addPack(JSON.stringify(p), kv);
    expect(G.scenarios.filter(x => x.id === G.scenarios[0].id)).toHaveLength(1); removePack('myclass', kv); expect(G.scenarios.length).toBe(n);
  });
});

describe('class mode', () => {
  const net = (handler: (url: string, init: RequestInit) => Response): cls.Net => ({ base: 'https://api.example.org', fetch: (async (u: string, i: RequestInit) => handler(u, i)) as unknown as typeof fetch });
  it('a pupil joins with a code and a nickname, and the task is kept', async () => {
    const kv = new MemKV(), calls: string[] = [];
    const n = net((u, i) => { calls.push(`${i.method} ${u} ${i.credentials}`); return u.endsWith('/ABC234') ? reply({ name: 'Class 9B', assignment: { origin: 'tajik', note: 'Register' } }) : reply({ error: 'no such class' }, false, 404); });
    expect((await cls.join(n, 'abc 234', 'Dilya', kv)).ok).toBe(true);
    expect(cls.membership(kv)).toMatchObject({ code: 'ABC234', name: 'Class 9B', nickname: 'Dilya' }); expect(calls[0]).toBe('GET https://api.example.org/api/classes/ABC234 omit');
    expect((await cls.join(n, 'ZZZZZZ', 'Dilya', new MemKV())).msg).toBe('no such class');
    expect((await cls.join(n, 'abc', 'Dilya', kv)).msg).toBe('bad code'); expect((await cls.join(n, 'ABC234', '<x>', kv)).msg).toBe('bad nickname');
    expect((await cls.join({ base: null }, 'ABC234', 'Dilya', kv)).msg).toBe('offline');
    cls.leave(kv); expect(cls.membership(kv)).toBeNull();
  });
  it('the result goes only to the class, with ids and numbers but no name', async () => {
    const kv = new MemKV(); let body = '';
    const n = net((_u, i) => { body = String(i.body); return reply({ ok: true }); });
    expect((await cls.sendResult(n, { origin: 'tajik', ending: 'time', score: 10, days: 5 }, buildReport(G.newState('Eve', 'tajik')), kv)).msg).toBe('no class');
    kv.setItem(cls.CLASS_KEY, JSON.stringify({ code: 'ABC234', name: 'C', assignment: {}, nickname: 'Dilya' }));
    expect((await cls.sendResult(n, { origin: 'tajik', ending: 'time', score: 99999999, days: 5 }, buildReport(G.newState('Eve', 'tajik')), kv)).ok).toBe(true);
    const sent = JSON.parse(body); expect(sent.nickname).toBe('Dilya'); expect(sent.score).toBe(100000); expect(body).not.toContain('Eve');
  });
  it('the table for a spreadsheet cannot run a formula', () => {
    const csv = cls.resultsCsv([{ nickname: '=HYPERLINK("x")', origin: 'a,b', ending: 'time', score: 5, days: 7, learned: { done: ['med'], mistakes: [] }, created_at: '' }]);
    expect(csv.split('\n')[1]).toBe('"\'=HYPERLINK(""x"")","a,b",time,5,7,med,');
    expect(cls.cleanCode('ab-c 1x2y3z9')).toBe('ABC1X2');
  });
});

describe('the daily game and seasons', () => {
  const O = G.origins.map(o => o.id);
  it('is the same for everyone on a day and changes between days', () => {
    expect(daily.presetFor('2026-10-30', O, G.CITIES)).toEqual(daily.presetFor('2026-10-30', O, G.CITIES));
    const days = new Set(Array.from({ length: 30 }, (_, i) => daily.presetFor(`2026-11-${String(i + 1).padStart(2, '0')}`, O, G.CITIES).origin));
    expect(days.size).toBeGreaterThan(4);
    const p = daily.presetFor('2026-10-30', O, G.CITIES); expect(O).toContain(p.origin); expect(G.CITIES).toContain(p.city);
  });
  it('keeps a streak over consecutive days, ends it after a missed day, and keeps the best score', () => {
    const kv = new MemKV();
    expect(daily.finish(100, kv, '2026-10-01').streak).toBe(1);
    expect(daily.finish(300, kv, '2026-10-02').streak).toBe(2);
    expect(daily.finish(200, kv, '2026-10-02').streak).toBe(2); expect(daily.record(kv).best['2026-10-02']).toBe(300);
    expect(daily.liveStreak(daily.record(kv), '2026-10-03')).toBe(2); expect(daily.liveStreak(daily.record(kv), '2026-10-04')).toBe(0);
    expect(daily.finish(50, kv, '2026-10-05').streak).toBe(1);
    expect(daily.record(new MemKV())).toEqual({ last: '', streak: 0, best: {} });
  });
  it('seasons cover the new year across December and January, and no season is on in the gaps', () => {
    expect(daily.seasonOn(12, 31)?.id).toBe('newyear'); expect(daily.seasonOn(1, 5)?.id).toBe('newyear'); expect(daily.seasonOn(5, 9)?.id).toBe('victory');
    expect(daily.seasonOn(4, 10)).toBeNull(); expect(daily.seasonOn(9, 1)?.id).toBe('back');
    expect(daily.seasonOfDate(Date.UTC(2026, 11, 25))?.id).toBe('newyear');
  });
});

describe('contrast and lite mode', () => {
  it('lite starts on for a weak device or a data saver and can be switched either way; the classes land on the page', () => {
    expect(looksWeak({ hardwareConcurrency: 2 })).toBe(true); expect(looksWeak({ deviceMemory: 1 })).toBe(true); expect(looksWeak({ connection: { saveData: true } })).toBe(true); expect(looksWeak({ hardwareConcurrency: 8, deviceMemory: 8 })).toBe(false);
    const kv = new MemKV();
    expect(loadA11y(kv, { hardwareConcurrency: 2 })).toEqual({ contrast: false, lite: true });
    saveA11y({ contrast: true, lite: false }, kv); expect(loadA11y(kv, { hardwareConcurrency: 2 })).toEqual({ contrast: true, lite: false });
    kv.setItem('vrussia_a11y', '{broken'); expect(loadA11y(kv, { hardwareConcurrency: 8 }).lite).toBe(false);
    const root = document.createElement('div'); applyA11y({ contrast: true, lite: true }, root); expect(root.className).toBe('hiContrast lite'); applyA11y({ contrast: false, lite: false }, root); expect(root.className).toBe('');
  });
});
