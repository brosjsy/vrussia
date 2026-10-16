// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { DREAMS, dreamById, dreamOf } from '../src/dreams';

describe('dreams', () => {
  it('each dream has a boost that is small, a goal that is checked against the game state, and a unique id', () => {
    expect(new Set(DREAMS.map(d => d.id)).size).toBe(DREAMS.length);
    for (const d of DREAMS) {
      const total = Object.values(d.boost).reduce((a, b) => a + Math.abs(Number(b)), 0);
      expect(total, d.id).toBeGreaterThan(0); expect(total, d.id).toBeLessThanOrEqual(8);
      const s = G.newState('T', 'moscow'); s.stress = 0;
      expect(typeof d.done(s)).toBe('boolean'); expect(d.goal.length).toBeGreaterThan(5);
    }
    expect(dreamById('nonsense')).toBeUndefined(); expect(dreamOf(G.newState('T', 'moscow'))).toBeUndefined();
  });
  it('goals come true when the state says so', () => {
    const s = G.newState('T', 'tajik');
    const done = (id: string): boolean => (dreamById(id) as NonNullable<ReturnType<typeof dreamById>>).done(s);
    expect(done('doctor')).toBe(false); s.flags.admitted = true; s.know = 60; expect(done('doctor')).toBe(true);
    expect(done('entrepreneur')).toBe(false); s.biz = { name: 'x' } as G.State['biz']; expect(done('entrepreneur')).toBe(true);
    expect(done('driver')).toBe(false); s.car = { model: 'x', value: 1 }; expect(done('driver')).toBe(true);
    expect(done('citizen')).toBe(false); s.flags.naturalized = true; expect(done('citizen')).toBe(true);
    s.health = 99; expect(done('athlete')).toBe(false); s.health = 100; expect(done('athlete')).toBe(true);
    s.merit = 30; expect(done('artist')).toBe(true);
  });
});

describe('the character creator on the title screen', () => {
  it('previews the portrait, changes it with every choice, picks a dream, and starts the game with all of it', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    window.confirm = () => true;
    localStorage.removeItem('vrussia_save');
    const { boot } = await import('../src/ui');
    boot(); await (await import('../src/ui')).uiReady();
    const preview = (): string => document.getElementById('creatorPreview')!.innerHTML;
    const first = preview();
    expect(first).toContain('<svg');
    (document.querySelector('#creatorControls [data-look="skin"][data-v="4"]') as HTMLButtonElement).click();
    expect(preview()).not.toBe(first);
    expect((document.querySelector('#creatorControls [data-look="skin"][data-v="4"]') as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true');
    const afterSkin = preview();
    (document.querySelector('#creatorControls [data-look="hairStyle"][data-v="1"]') as HTMLButtonElement).click(); expect(preview()).not.toBe(afterSkin);
    (document.querySelector('#creatorControls [data-look="style"][data-v="folk"]') as HTMLButtonElement).click();
    const beforeBody = preview();
    (document.querySelector('#creatorControls [data-look="height"][data-v="2"]') as HTMLButtonElement).click(); expect(preview()).not.toBe(beforeBody); expect(preview()).toContain('scale(1.1)');
    (document.querySelector('#creatorControls [data-look="bottom"][data-v="skirt"]') as HTMLButtonElement).click();
    (document.querySelector('#creatorControls [data-look="bottomColor"][data-v="3"]') as HTMLButtonElement).click();
    (document.querySelector('#creatorControls [data-look="shoes"][data-v="boots"]') as HTMLButtonElement).click();
    (document.querySelector('#creatorControls [data-look="shoeColor"][data-v="3"]') as HTMLButtonElement).click();
    (document.querySelector('#creatorControls [data-look="facial"][data-v="3"]') as HTMLButtonElement).click();      // a beard (the facial hair choice replaced the old box)
    const dream = document.querySelector('#creatorControls [data-dream="athlete"]') as HTMLButtonElement;
    dream.click();
    expect((document.querySelector('#creatorControls [data-dream="athlete"]') as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true');
    (document.querySelector('#creatorControls [data-dream="athlete"]') as HTMLButtonElement).click();       // a second click removes the choice
    expect((document.querySelector('#creatorControls [data-dream="athlete"]') as HTMLButtonElement).getAttribute('aria-pressed')).toBe('false');
    (document.querySelector('#creatorControls [data-dream="athlete"]') as HTMLButtonElement).click();

    (document.getElementById('nameInput') as HTMLInputElement).value = 'Creator';
    document.getElementById('startBtn')!.click();
    const saved = JSON.parse(localStorage.getItem('vrussia_save') as string) as G.State;
    expect(saved.look).toMatchObject({ skin: 4, hairStyle: 1, style: 'folk', beard: true, height: 2, bottom: 'skirt', bottomColor: 3, shoes: 'boots', shoeColor: 3 });
    expect(saved.dream).toBe('athlete');
    expect(saved.health).toBe(90);                                                  // the athlete's boost goes to energy, so the goal is not done on day one
    expect(saved.energy).toBeGreaterThan(80);
    expect(document.getElementById('whoPic')!.innerHTML).toContain('<svg');
    expect(document.getElementById('quests')!.textContent).toContain('Reach perfect health');
    document.getElementById('profileBtn')!.click();
    expect(document.getElementById('modalBody')!.textContent).toContain('Athlete');
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  });
});

describe('starting looks in the creator', () => {
  it('presets set skin, eyes and hair as a starting point, a chosen character suggests a look until the player chooses one, and the player can change everything', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    window.confirm = () => true;
    localStorage.removeItem('vrussia_save');
    vi.resetModules();                                   // a fresh game page: the creator remembers nothing from the test above
    const { boot } = await import('../src/ui');
    boot(); await (await import('../src/ui')).uiReady();
    const preview = (): string => document.getElementById('creatorPreview')!.innerHTML;
    const pressed = (key: string): string => (document.querySelector(`#creatorControls [data-look="${key}"][aria-pressed="true"]`) as HTMLButtonElement).dataset.v as string;
    expect(document.querySelectorAll('#creatorControls [data-group]').length).toBe(6);
    expect(document.querySelectorAll('#creatorControls [data-look="hairColor"]').length).toBe(9); expect(document.querySelectorAll('#creatorControls [data-look="skin"]').length).toBe(12);
    expect(document.querySelectorAll('#creatorControls [data-look="hairStyle"]').length).toBe(22);
    // choosing a character before touching the look suggests a matching look
    (document.querySelectorAll('.ocard')[2] as HTMLButtonElement).click();                  // the Tajik migrant
    expect(pressed('eyes')).toBe('1'); expect(pressed('skin')).toBe('3');
    (document.querySelectorAll('.ocard')[5] as HTMLButtonElement).click();                  // the foreign student
    expect(pressed('skin')).toBe('7');
    // a preset, then own choices, then another character: the look is no longer replaced
    const before = preview();
    (document.querySelector('#creatorControls [data-group="slavic"]') as HTMLButtonElement).click();
    expect(preview()).not.toBe(before); expect(pressed('eyes')).toBe('0'); expect(pressed('hairColor')).toBe('4');
    (document.querySelector('#creatorControls [data-look="hairColor"][data-v="6"]') as HTMLButtonElement).click();
    expect(pressed('hairColor')).toBe('6');
    (document.querySelectorAll('.ocard')[2] as HTMLButtonElement).click();
    expect(pressed('hairColor')).toBe('6'); expect(pressed('skin')).toBe('1');
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  });
});
