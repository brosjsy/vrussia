// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { ENTRIES, ask, words, stem, MIN_SCORE } from '../src/platform/guide';
import { byId } from '../src/platform/citations';
import { LO, HI, MIN_SAMPLES, factor, learn, loadProfile, saveProfile, wellbeing } from '../src/platform/personalise';
import type { Profile } from '../src/platform/personalise';

class MemKV { m = new Map<string, string>(); getItem(k: string): string | null { return this.m.get(k) ?? null; } setItem(k: string, v: string): void { this.m.set(k, v); } removeItem(k: string): void { this.m.delete(k); } }

describe('the grounded guide', () => {
  it('every entry has both languages, real sources and a question that finds itself', () => {
    const ids = new Set<string>();
    for (const e of ENTRIES) {
      expect(ids.has(e.id)).toBe(false); ids.add(e.id);
      expect(e.q.en.length).toBeGreaterThan(8); expect(e.a.en.length).toBeGreaterThan(30); expect(e.q.ru).toMatch(/[а-яё]/i); expect(e.a.ru).toMatch(/[а-яё]/i);
      for (const s of e.src) expect(byId(s), `${e.id} -> ${s}`).toBeTruthy();
      expect(ask(e.q.en).entry?.id, e.q.en).toBe(e.id); expect(ask(e.q.ru).entry?.id, e.q.ru).toBe(e.id);
    }
  });
  it.each([
    ['how long do I have to register my stay', 'registration'], ['my patent payment every month', 'patent'], ['do I need insurance and a medical exam', 'medical'],
    ['what happens at three strikes, am I deported', 'strikes'], ['I am from Kyrgyzstan, do I need a patent', 'eaeu'], ['how do I get citizenship and what does it cost', 'ladder'],
    ['как перенести игру на другой телефон', 'account'], ['сколько стоит гражданство и вид на жительство', 'ladder'], ['когда платить за квартиру', 'rent'], ['как удалить мои данные', 'privacy'],
    ['registering at my address', 'registration'], ['can I write my own scenario pack', 'packs'],
  ])('“%s” is answered by %s', (q, id) => { expect(ask(q).entry?.id).toBe(id); });
  it('says so when it has no vetted answer, instead of making one up', () => {
    for (const q of ['what is the capital of Peru', 'bitcoin price tomorrow', 'asdf qwer zxcv', '', '   ', 'recipe for pancakes with cheese']) {
      const a = ask(q); expect(a.found, q).toBe(false); expect(a.entry).toBeUndefined();
    }
    expect(MIN_SCORE).toBeGreaterThan(1);
  });
  it('an answer is only ever the text of an entry, never text from the question', () => {
    const q = '<img src=x onerror=alert(1)> how long to register'; const a = ask(q);
    expect(a.entry).toBeTruthy(); expect(JSON.stringify(a)).not.toContain('onerror');
  });
  it('words and stems treat plurals, endings and both alphabets sensibly', () => {
    expect(stem('registration')).toBe(stem('registrations')); expect(stem('registered')).toBe(stem('register')); expect(words('The Patent, patents!')).toEqual([stem('patent'), stem('patents')]);
    expect(words('учёт и регистрация')).toHaveLength(2);
  });
  it('the answers match what the game really does (rent on Saturdays, the score formula, the fees)', () => {
    expect(ENTRIES.find(e => e.id === 'rent')!.a.en).toContain('Saturdays');
    const s = G.newState('T', 'moscow'); s.money = 5000; s.know = 10; s.rep = 10; s.strikes = 1; s.day = 4;
    const manual = Math.round(5000 / 1000 + 10 * 5 + 10 * 2 + G.goals.filter(g => g.done(s)).length * 400 - 1 * 150 + 4);
    expect(G.score(s)).toBe(manual);
    const ladder = ENTRIES.find(e => e.id === 'ladder')!.a.en;
    expect(ladder).toContain(G.FEE.rvp.toLocaleString('en-US')); expect(ladder).toContain(G.FEE.vnzh.toLocaleString('en-US')); expect(ladder).toContain(G.FEE.citizen.toLocaleString('en-US'));
  });
});

describe('personalised scenario selection', () => {
  const calm = { status: 'migrant', energy: 80, health: 80, stress: 20, flags: {}, docs: { reg: 0, patent: 0, visa: 0 }, strikes: 0 } as never;
  const fresh = (): Profile => ({ on: true, cats: {} });

  it('with nothing learned and nothing wrong, nothing changes', () => {
    expect(factor(fresh(), { cat: 'work' }, calm, false)).toBe(1);
  });
  it('papers scenarios come up more when the papers have a problem, and only for people who need papers', () => {
    expect(factor(fresh(), { cat: 'papers' }, calm, true)).toBeGreaterThan(1);
    expect(factor(fresh(), { cat: 'papers' }, { ...(calm as object), status: 'citizen' } as never, true)).toBe(1);
  });
  it('a worn-out player gets gentler draws', () => {
    const tired = { ...(calm as object), energy: 10 } as never;
    expect(factor(fresh(), { cat: 'social' }, tired, false)).toBeLessThan(1); expect(factor(fresh(), { cat: 'health' }, tired, false)).toBeGreaterThan(1);
  });
  it('it learns which categories keep going well or badly, only after enough evidence, and stays between the limits', () => {
    const p = fresh();
    for (let i = 0; i < MIN_SAMPLES - 1; i++) { learn(p, 'social', 10, 5); learn(p, 'culture', 10, 20); }
    expect(factor(p, { cat: 'social' }, calm, false)).toBe(1);
    for (let i = 0; i < 40; i++) { learn(p, 'social', 10, 5); learn(p, 'culture', 10, 20); }
    const bad = factor(p, { cat: 'social' }, calm, false), good = factor(p, { cat: 'culture' }, calm, false);
    expect(bad).toBeLessThan(1); expect(good).toBeGreaterThan(1); expect(good).toBeGreaterThan(bad);
    for (const f of [bad, good]) { expect(f).toBeGreaterThanOrEqual(LO); expect(f).toBeLessThanOrEqual(HI); }
  });
  it('the law, the police and the first scenes are never tuned, and switching it off changes nothing', () => {
    const p = fresh(); for (let i = 0; i < 50; i++) learn(p, 'police', 10, 0);
    expect(p.cats.police).toBeUndefined(); expect(factor(p, { cat: 'police' }, calm, true)).toBe(1); expect(factor(p, { cat: 'intro' }, calm, true)).toBe(1);
    const off = { on: false, cats: { social: { n: 50, good: 0 } } }; expect(factor(off, { cat: 'social' }, calm, false)).toBe(1);
    learn(off, 'work', 1, 0); expect((off.cats as Record<string, unknown>).work).toBeUndefined();
  });
  it('the profile survives storage, and damaged or hostile stored values are thrown away', () => {
    const kv = new MemKV(), p = fresh(); learn(p, 'work', 1, 2); saveProfile(p, kv);
    expect(loadProfile(kv)).toEqual({ on: true, cats: { work: { n: 1, good: 1 } } });
    kv.setItem('vrussia_profile', JSON.stringify({ on: false, cats: { 'bad key!': { n: 1, good: 1 }, work: { n: 3, good: 9 }, social: { n: 1e9, good: 1 }, ok: { n: 2, good: 1 } } }));
    const l = loadProfile(kv); expect(l.on).toBe(false); expect(Object.keys(l.cats).sort()).toEqual(['ok', 'social']); expect(l.cats.social.n).toBeLessThanOrEqual(500);
    kv.setItem('vrussia_profile', '{broken'); expect(loadProfile(kv)).toEqual({ on: true, cats: {} });
  });
  it('wellbeing goes up with health and knowledge and down with stress and strikes', () => {
    const base = { health: 50, energy: 50, stress: 50, rep: 50, know: 10, money: 1000, strikes: 0 };
    expect(wellbeing({ ...base, health: 60 })).toBeGreaterThan(wellbeing(base)); expect(wellbeing({ ...base, stress: 60 })).toBeLessThan(wellbeing(base)); expect(wellbeing({ ...base, strikes: 2 })).toBeLessThan(wellbeing(base));
  });
  it('wired into the engine, the weight hook changes how often a category is drawn but not which scenarios exist', () => {
    const s = G.newState('T', 'tajik'); s.day = 40;
    const count = (hook: ((sc: G.Scenario) => number) | null): number => { G.setWeightHook(hook); let n = 0; for (let i = 0; i < 600; i++) { const sc = G.draw(s, ['life', 'social']); if (sc?.cat === 'life') n++; } G.setWeightHook(null); return n; };
    const base = count(null), up = count(sc => (sc.cat === 'life' ? 2 : 1)), down = count(sc => (sc.cat === 'life' ? 0.5 : 1));
    expect(up).toBeGreaterThan(down); expect(base).toBeGreaterThan(0);
    expect(G.draw(s, ['life'])).toBeTruthy();
  });
});

describe('the guide and the adaptive switch in the page', () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem('vrussia_consent', JSON.stringify({ v: 1, analytics: false, at: 1 })); });
  async function boot(): Promise<void> {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    const { boot: b, uiReady } = await import('../src/ui'); b(); await uiReady();
  }
  it('asking a question shows the vetted answer with its sources; an unknown question says so; hostile text stays text', async () => {
    await boot();
    document.querySelector<HTMLElement>('#title [data-pf-open]')!.click();
    (document.querySelector('#modalBody [data-pf="guide"]') as HTMLElement).click();
    await vi.waitFor(() => expect(document.getElementById('gdQ')).toBeTruthy());
    const ask1 = (q: string): string => { (document.getElementById('gdQ') as HTMLInputElement).value = q; document.getElementById('gdForm')!.dispatchEvent(new Event('submit', { cancelable: true })); return document.getElementById('gdOut')!.textContent ?? ''; };
    expect(ask1('how long do I have to register')).toMatch(/7 working days/);
    expect(document.querySelector('#gdOut .srcList')).toBeTruthy();
    expect(ask1('what is the capital of Peru')).toMatch(/vetted answer|проверенного/i);
    ask1('<img src=x onerror=alert(1)> patent');
    expect(document.querySelector('#gdOut img, #gdOut script')).toBeNull();
    (document.querySelector('#gdTopics [data-topic="rent"]') as HTMLElement).click();
    expect(document.getElementById('gdOut')!.textContent).toMatch(/Saturdays/);
  });
  it('the adaptive switch is saved', async () => {
    await boot();
    document.querySelector<HTMLElement>('#title [data-pf-open]')!.click();
    (document.querySelector('#modalBody [data-pf="a11y"]') as HTMLElement).click();
    const box = document.getElementById('a11Per') as HTMLInputElement; expect(box.checked).toBe(true);
    box.checked = false; box.dispatchEvent(new Event('change'));
    expect(JSON.parse(localStorage.getItem('vrussia_profile')!).on).toBe(false);
    vi.restoreAllMocks();
  });
});
