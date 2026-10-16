// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/world3d-support', () => ({ supportsWebGL: () => (globalThis as { __gl?: boolean }).__gl === true }));
vi.mock('../src/portraits3d', () => ({ renderFigure: (kind: string, look: { skin?: number }) => `data:image/png;base64,${kind}${look.skin ?? 0}` }));

import { bustHtml, bodyHtml, bodyInSvg, upgradeFigures, cachedFigure, clearFigures } from '../src/figure';
import { crowdMarkup, playerMarkup } from '../src/city';
import * as G from '../src/engine';
import '../src/content';

beforeEach(() => { clearFigures(); (globalThis as { __gl?: boolean }).__gl = false; document.body.innerHTML = ''; });

describe('people as pictures', () => {
  it('start as the flat drawn portrait, marked so they can be upgraded, and keep an accessible name', () => {
    const b = bustHtml({ skin: 2 }, {}, 'Anna'), w = bodyHtml({ skin: 2 }, {}, 'Anna');
    expect(b).toContain('data-fig="bust"'); expect(b).toContain('<svg'); expect(b).toContain('aria-label="Anna"');
    expect(w).toContain('data-fig="body"'); expect(w).toContain('<svg');
    expect(bustHtml({}, {}, '')).toContain('aria-hidden="true"');
    expect(bustHtml({ skin: 2 }, {}, 'A"<b>')).not.toContain('<b>');
  });
  it('the look and clothes travel in escaped attributes and come back unchanged', () => {
    const host = document.createElement('div'); host.innerHTML = bustHtml({ skin: 3, hairStyle: 4 }, { hat: 'hat-beanie' }, 'x"y');
    const el = host.querySelector('[data-fig]') as HTMLElement;
    expect(JSON.parse(el.dataset.look as string)).toMatchObject({ skin: 3, hairStyle: 4 }); expect(JSON.parse(el.dataset.worn as string)).toEqual({ hat: 'hat-beanie' }); expect(el.dataset.title).toBe('x"y');
  });
  it('without 3D nothing changes: the flat portraits stay', async () => {
    const host = document.createElement('div'); document.body.append(host); host.innerHTML = bustHtml({ skin: 1 }, {}, 'A') + bodyHtml({ skin: 1 }, {}, 'B');
    await upgradeFigures(host);
    expect(host.querySelectorAll('svg').length).toBe(2); expect(host.querySelectorAll('img').length).toBe(0); expect(host.querySelectorAll('[data-done]').length).toBe(0);
  });
  it('with 3D every portrait becomes a picture of the 3D person, once, and the picture is remembered', async () => {
    (globalThis as { __gl?: boolean }).__gl = true;
    const host = document.createElement('div'); document.body.append(host); host.innerHTML = bustHtml({ skin: 5 }, {}, 'A') + bodyHtml({ skin: 6 }, {}, 'B');
    await upgradeFigures(host);
    const imgs = Array.from(host.querySelectorAll('img')); expect(imgs.length).toBe(2);
    expect(imgs[0].src).toContain('bust5'); expect(imgs[0].alt).toBe('A'); expect(imgs[0].className).toContain('avatar-svg'); expect(imgs[1].src).toContain('body6'); expect(imgs[1].className).toContain('body');
    expect(host.querySelectorAll('svg').length).toBe(0);
    expect(cachedFigure('bust', { skin: 5 }, {})).toContain('bust5');
    await upgradeFigures(host); expect(host.querySelectorAll('img').length).toBe(2);               // nothing is done twice
    const again = document.createElement('div'); again.innerHTML = bustHtml({ skin: 5 }, {}, 'A');   // the next drawing of the same person is a picture at once, with no flicker
    expect(again.querySelector('img')).toBeTruthy(); expect(again.querySelector('svg')).toBeNull();
  });
  it('a portrait that left the page while the library loaded is skipped without trouble', async () => {
    (globalThis as { __gl?: boolean }).__gl = true;
    const host = document.createElement('div'); document.body.append(host); host.innerHTML = bustHtml({ skin: 4 }, {}, 'A');
    const p = upgradeFigures(host); host.remove(); await expect(p).resolves.toBeUndefined();
  });
  it('the flat city map shows the crowd and the player as pictures in the map itself, when 3D is available', async () => {
    (globalThis as { __gl?: boolean }).__gl = true;
    const s = G.newState('T', 'tajik'); s.day = 3;
    const wrap = document.createElement('div'); document.body.append(wrap);
    wrap.innerHTML = `<svg viewBox="0 0 100 100">${crowdMarkup(s)}${playerMarkup(s)}</svg>`;
    const n = wrap.querySelectorAll('g[data-fig]').length; expect(n).toBeGreaterThan(3);
    await upgradeFigures(wrap);
    expect(wrap.querySelectorAll('image').length).toBe(n); expect(wrap.querySelectorAll('g[data-fig]:not([data-done])').length).toBe(0);
    expect(wrap.querySelectorAll('.npc image').length).toBeGreaterThan(2);
    wrap.innerHTML = `<svg viewBox="0 0 100 100">${crowdMarkup(s)}</svg>`;                         // drawn again: pictures at once
    expect(wrap.querySelectorAll('image').length).toBeGreaterThan(2);
    expect(bodyInSvg({}, {}, '<g id="flat"/>')).toContain('<image');
  });
});
