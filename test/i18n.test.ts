// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
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
    expect(document.getElementById('tagCount')!.textContent).toContain('ситуаций');
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
    document.getElementById('helpBtn')!.click();
    expect(document.getElementById('modalBody')!.textContent).toContain('Как играть');
    const ruPoints = document.querySelectorAll('#modalBody li').length;
    document.getElementById('closeModal')!.click();
    document.getElementById('logBtn')!.click();
    expect(document.getElementById('modalBody')!.textContent).toContain('Дневник');
    document.getElementById('closeModal')!.click();

    document.getElementById('langBtn2')!.click();
    document.getElementById('helpBtn')!.click();
    expect(document.getElementById('modalBody')!.textContent).toContain('How to play');
    expect(document.querySelectorAll('#modalBody li').length).toBe(ruPoints);
    document.getElementById('closeModal')!.click();
    expect(document.getElementById('actions')!.textContent).toContain('Paperwork');
    expect(document.getElementById('stage')!.textContent).toContain('What now?');
    expect(document.getElementById('moneyBox')!.textContent).toBe(stateBefore);
    expect(store.vrussia_lang).toBe('en');
  });
});
