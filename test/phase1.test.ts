// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { needsOf, decayNeeds, needsOnAction, useToilet, meterAdvice, moodlets, NEED_KEYS, LOW } from '../src/needs';
import type { Meter } from '../src/needs';
import { EN, RU } from '../src/i18n';
import { quests } from '../src/city';

const fresh = (): G.State => { const s = G.newState('T', 'moscow'); s.queue = []; return s; };
const METERS: Meter[] = ['hunger', 'energy', 'fun', 'social', 'hygiene', 'bladder', 'health', 'calm', 'warmth'];

describe('the six needs', () => {
  it('are hunger, energy, fun, social, hygiene and bladder (energy is the old stat); saves from before get ordinary values', () => {
    expect(NEED_KEYS).toEqual(['hunger', 'hygiene', 'social', 'fun', 'bladder']);
    const s = fresh(); (s as unknown as { needs: unknown }).needs = { hunger: 50, hygiene: 60, social: 40 };
    expect(needsOf(s)).toEqual({ hunger: 50, hygiene: 60, social: 40, fun: 70, bladder: 90 });
  });
  it('fun is filled by going out, culture, pets and little activities; the bladder by home or by spending the part of the day anywhere but on the road', () => {
    const s = fresh(), n = needsOf(s); n.fun = 10; n.bladder = 10;
    needsOnAction(s, 'culture'); expect(n.fun).toBe(40); needsOnAction(s, 'act:chess'); expect(n.fun).toBe(60);
    n.bladder = 10; needsOnAction(s, 'travel'); expect(n.bladder).toBe(10); needsOnAction(s, 'work'); expect(n.bladder).toBe(50); needsOnAction(s, 'home'); expect(n.bladder).toBe(100);
  });
  it('when fun or the bladder runs low the player gets a little more stressed and is told why; the toilet at home fixes the bladder at once', () => {
    const s = fresh(), n = needsOf(s); s.stress = 20; n.fun = LOW + 2; n.bladder = LOW + 5;
    const notes = decayNeeds(s); expect(n.fun).toBe(LOW - 1); expect(n.bladder).toBe(LOW - 1); expect(s.stress).toBe(22);
    expect(notes.join(' ')).toContain('bored'); expect(notes.join(' ')).toContain('toilet');
    expect(useToilet(s).ok).toBe(true); expect(n.bladder).toBe(100); expect(useToilet(s).ok).toBe(false);
  });
  it('a game of only work days still keeps the bladder fine (there is a toilet at work); the meter is about long trips', () => {
    const s = fresh(); for (let i = 0; i < 30; i++) { needsOnAction(s, 'work'); decayNeeds(s); } expect(needsOf(s).bladder).toBeGreaterThan(80);
  });
});

describe('every bar explains itself', () => {
  it('each of the nine meters has a reason (low and fine) and a quickest fix, in English and in Russian', () => {
    const s = fresh(); needsOf(s).fun = 5;
    for (const k of METERS) {
      const a = meterAdvice(s, k); expect(Number.isFinite(a.value)).toBe(true);
      for (const key of [a.why, a.fix, `why.${k}.low`, `why.${k}.ok`]) { expect(EN[key], key).toBeTruthy(); expect(RU[key], key).toBeTruthy(); }
    }
    expect(meterAdvice(s, 'fun').why).toBe('why.fun.low'); expect(meterAdvice(s, 'hunger').why).toBe('why.hunger.ok');
  });
  it('moodlets come with a reason and a weight and follow the state', () => {
    const s = fresh(), n = needsOf(s); s.energy = 90; n.fun = 90; n.social = 5; s.stress = 80;
    const m = moodlets(s), keys = m.map(x => x.key);
    expect(keys).toEqual(expect.arrayContaining(['ml.rested', 'ml.fun', 'ml.lonely', 'ml.stressed']));
    expect(m.find(x => x.key === 'ml.rested')!.v).toBeGreaterThan(0); expect(m.find(x => x.key === 'ml.lonely')!.v).toBeLessThan(0);
    for (const k of ['ml.rested', 'ml.tired', 'ml.fed', 'ml.hungry', 'ml.fun', 'ml.bored', 'ml.company', 'ml.lonely', 'ml.dirty', 'ml.fresh', 'ml.bladder', 'ml.cold', 'ml.stressed', 'ml.calm', 'ml.unwell', 'ml.friends', 'ml.debt']) { expect(EN[k], k).toBeTruthy(); expect(RU[k], k).toBeTruthy(); }
  });
  it('the quest cards carry a progress between 0 and 1', () => {
    const q = quests(fresh()); expect(q.length).toBeGreaterThanOrEqual(2);
    for (const x of q) if (x.progress !== undefined) { expect(x.progress).toBeGreaterThanOrEqual(0); expect(x.progress).toBeLessThanOrEqual(1); }
    expect(q.some(x => x.progress !== undefined)).toBe(true);
  });
});

describe('Russian by default', () => {
  const load = async (language: string, saved: string | null): Promise<string> => {
    Object.defineProperty(window.navigator, 'language', { value: language, configurable: true });
    localStorage.clear(); if (saved) localStorage.setItem('vrussia_lang', saved);
    vi.resetModules(); const i = await import('../src/i18n'); return i.lang();
  };
  it('a browser set to Russian starts in Russian; any other starts in English; a choice made in the game wins', async () => {
    expect(await load('ru-RU', null)).toBe('ru'); expect(await load('en-GB', null)).toBe('en'); expect(await load('ru-RU', 'en')).toBe('en'); expect(await load('de-DE', 'ru')).toBe('ru');
    Object.defineProperty(window.navigator, 'language', { value: 'en-US', configurable: true }); localStorage.clear();
  });
});

describe('the HUD in the page', () => {
  it('the mood opens the moodlets, the date starts with the season, and the side panel lists the new needs', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    localStorage.clear(); vi.resetModules();
    const ui = await import('../src/ui'); ui.boot(); await ui.uiReady();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Hud';
    document.getElementById('startBtn')!.click();
    expect(document.getElementById('date')!.textContent).toMatch(/^(❄️|☀️|🌱|🍂) /u);
    document.getElementById('moodPill')!.click();
    expect(document.getElementById('modal')!.hidden).toBe(false); expect(document.querySelector('#modalBody .moodInfo h3')!.textContent).toContain('How you feel');
    expect(document.getElementById('stats')!.textContent).toContain('Fun'); expect(document.getElementById('stats')!.textContent).toContain('Bladder');
  });
});
