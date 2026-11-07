// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { frx, frxPart, loadFlowRu } from '../src/flows-ru-text';
import { FLOW_TEXT_RU } from '../src/flows-ru-data';
import '../src/content';
import { flows } from '../src/forms';
import { setLang } from '../src/i18n';

describe('the online forms in Russian', () => {
  it('every Russian line has Cyrillic in it, and the forms\' own labels and step titles are covered', () => {
    for (const [en, ru] of Object.entries(FLOW_TEXT_RU)) expect(/[а-яё]/i.test(ru) || /^[\sA-Za-z0-9₽·]+$/.test(ru), en).toBe(true);
    const missing: string[] = [];
    for (const f of flows) for (const st of f.steps) { if (!FLOW_TEXT_RU[st.title]) missing.push(f.id + ': ' + st.title); }
    expect(missing).toEqual([]);
  });
  it('translates in Russian only, and leaves unknown lines alone', async () => {
    setLang('en'); expect(frx('Vacancy')).toBe('Vacancy');
    setLang('ru'); await loadFlowRu(); expect(frx('Vacancy')).toBe('Вакансия'); expect(frx('Something new')).toBe('Something new');
    expect(frxPart('You are covered.')).toBe('Вы застрахованы.');
    setLang('en');
  });
});
