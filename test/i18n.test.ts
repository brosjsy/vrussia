// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { EN, RU, ACTIONS_RU, ORIGINS_RU, ENDINGS_RU, t, setLang, lang, actionText, originText, endingText } from '../src/i18n';
import { AWARD_TEXT } from '../src/content/culture';

describe('translation tables', () => {
  it('English and Russian have exactly the same keys', () => {
    expect(Object.keys(RU).sort()).toEqual(Object.keys(EN).sort());
  });

  it('Russian values are real translations, not copies of English', () => {
    const same = Object.keys(RU).filter(k => RU[k] === EN[k] && /[A-Za-z]{3,}/.test(RU[k]) && !['tag'].includes(k));
    expect(same).toEqual([]);
    for (const k of Object.keys(RU)) if (k !== 'note') expect(RU[k].trim().length, k).toBeGreaterThan(0);
  });

  it('every action and every starting character has a Russian text', () => {
    for (const a of G.actions) expect(ACTIONS_RU[a.id], a.id).toBeTruthy();
    for (const o of G.origins) expect(ORIGINS_RU[o.id], o.id).toBeTruthy();
  });

  it('every ending has a Russian version and the fallback keeps English', () => {
    for (const id of Object.keys(G.endings)) expect(ENDINGS_RU[id], id).toBeTruthy();
    setLang('ru');
    expect(endingText('deported', ['Deported', 'x'])[0]).toContain('Депортация');
    expect(endingText('unknown', ['The end', ''])).toEqual(['The end', '']);
    setLang('en');
    expect(endingText('deported', ['Deported', 'x'])).toEqual(['Deported', 'x']);
  });

  it('the English award text matches the one used in the culture pack', () => {
    expect(EN.awardText).toBe(AWARD_TEXT);
  });

  it('falls back to English for unknown Russian keys and to the key itself for unknown keys', () => {
    setLang('ru');
    expect(t('start')).toBe('Начать');
    expect(t('does.not.exist')).toBe('does.not.exist');
    expect(actionText({ id: 'unknown', label: 'L', hint: 'H' })).toEqual({ label: 'L', hint: 'H' });
    expect(originText({ id: 'moscow', label: 'x', blurb: 'y' }).label).toContain('Москв');
    setLang('en');
    expect(t('start')).toBe('Start');
    expect(lang()).toBe('en');
  });
});

describe('the language button', () => {
  it('switches the page between English and Russian, keeps the game state, and remembers the choice', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    const store: Record<string, string> = {};
    (globalThis as unknown as { localStorage: Storage }).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = String(v); }, removeItem: (k: string) => { delete store[k]; }, clear: () => {}, key: () => null, length: 0 } as Storage;
    const { boot } = await import('../src/ui');
    boot();
    const text = (id: string): string => (document.getElementById(id) as HTMLElement).textContent as string;
    expect(text('startBtn')).toBe('Start');

    document.getElementById('langBtn')!.click();
    expect(document.documentElement.lang).toBe('ru');
    expect(text('startBtn')).toBe('Начать');
    expect(text('langBtn')).toBe('EN');
    expect(document.getElementById('nameInput')!.getAttribute('placeholder')).toContain('Рустам');
    expect(document.getElementById('origins')!.textContent).toContain('Мигрант из Таджикистана');
    expect(document.querySelector('#title .tag')!.textContent).toContain('Начни с имени');
    expect(store.vrussia_lang).toBe('ru');
    expect(document.getElementById('langNote')!.textContent).toContain('на английском');

    // start a game: the action grid is Russian; switching back mid-game keeps the same day and money
    document.getElementById('startBtn')!.click();
    (document.querySelector('#stage .choices button') as HTMLElement).click();      // the intro scene
    (document.getElementById('nextBtn') as HTMLElement).click();
    const stateBefore = document.getElementById('moneyBox')!.textContent;
    expect(document.getElementById('actions')!.textContent).toContain('Документы');
    expect(document.getElementById('stage')!.textContent).toContain('Что дальше?');
    expect(document.getElementById('stats')!.textContent).toContain('Энергия');

    // the how-to-play guide and the journal follow the language, with the same number of points
    document.getElementById('helpBtn')!.click(); await vi.waitFor(() => expect(document.getElementById('modalBody')!.textContent).toMatch(/How to play|Как играть/), { timeout: 8000 });      // the guide loads when it is opened
    expect(document.getElementById('modalBody')!.textContent).toContain('Как играть');
    const ruPoints = document.querySelectorAll('#modalBody li').length;
    document.getElementById('closeModal')!.click();
    document.getElementById('logBtn')!.click();
    expect(document.getElementById('modalBody')!.textContent).toContain('Дневник');
    document.getElementById('closeModal')!.click();

    document.getElementById('langBtn2')!.click();
    document.getElementById('helpBtn')!.click(); await vi.waitFor(() => expect(document.getElementById('modalBody')!.textContent).toMatch(/How to play|Как играть/), { timeout: 8000 });      // the guide loads when it is opened
    expect(document.getElementById('modalBody')!.textContent).toContain('How to play');
    expect(document.querySelectorAll('#modalBody li').length).toBe(ruPoints);
    document.getElementById('closeModal')!.click();
    expect(document.getElementById('actions')!.textContent).toContain('Paperwork');
    expect(document.getElementById('stage')!.textContent).toContain('What now?');
    expect(document.getElementById('moneyBox')!.textContent).toBe(stateBefore);
    expect(store.vrussia_lang).toBe('en');
  });
});

describe('goals and achievements in Russian (round 159)', () => {
  it('every goal and checklist item has a Russian text, and every achievement a Russian title and text', async () => {
    const W = await import('../src/i18n-words-ru');
    for (const g of G.goals) expect(W.CHECK_RU[g.label], g.label).toBeTruthy();
    for (const c of G.CHECKLIST) expect(W.CHECK_RU[c.label], c.label).toBeTruthy();
    for (const a of G.ACHIEVEMENTS) { const r = W.ACH_RU[a.id]; expect(r, a.id).toBeTruthy(); expect(r[0] && r[1], a.id).toBeTruthy(); expect(/[а-яё]/i.test(r[0] + r[1]), a.id).toBe(true); }
    expect(Object.keys(W.ACH_RU).sort()).toEqual(G.ACHIEVEMENTS.map(a => a.id).sort());
  });
});

describe('small talk in Russian (round 160)', () => {
  it('every background line and every answer of the places has a Russian text', async () => {
    const { ambientChat, chatReply } = await import('../src/social');
    const W = await import('../src/i18n-words-ru');
    const seen = new Set<string>();
    for (const p of [...G.PLACES.map(x => x.id), 'nowhere']) for (const r of [0, 0.5, 0.99]) {
      for (const l of ambientChat(p, () => r)) seen.add(l.text);
      for (const q of ['hello', 'thanks', 'any job?', 'where is it?', 'blah']) seen.add(chatReply(p, q, () => r).text);
    }
    expect(seen.size).toBeGreaterThan(40);
    for (const text of seen) expect(W.CHAT_RU[text], text).toBeTruthy();
  });
});

describe('journal entries (round 161)', () => {
  it('a scene line remembers its scene and choice so it can be shown in Russian', () => {
    const s = G.newState('T', 'moscow');
    const sc = G.scenarios.find(x => x.id === 'intro_citizen')!;
    G.choose(s, sc, 0);
    expect(s.log[0]).toMatchObject({ sid: 'intro_citizen', ci: 0 });
  });
});

describe('the online services have Russian names', () => {
  it('every service of the phone has a Russian title, site and blurb, and English is untouched', async () => {
    const { flows } = await import('../src/forms'); const { flowText, FLOW_IDS } = await import('../src/flows-ru'); const { setLang } = await import('../src/i18n');
    expect(FLOW_IDS.slice().sort()).toEqual(flows.map(f => f.id).sort());
    setLang('ru'); for (const f of flows) { const t = flowText(f); expect(t.title + t.site + t.blurb, f.id).toMatch(/[а-яё]/i); expect(t.title, f.id).not.toBe(f.title); }
    setLang('en'); for (const f of flows) expect(flowText(f).title).toBe(f.title);
  });
});
