// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { flows } from '../src/forms';
import { openFlow, openOnlineMenu } from '../src/forms-ui';
import { openBooking } from '../src/booking-ui';

/** Collects accessibility problems in the given container. */
function audit(root: ParentNode, where: string): string[] {
  const problems: string[] = [];
  const name = (el: Element): string => (el.getAttribute('aria-label') || el.textContent || '').trim();
  root.querySelectorAll('button').forEach(b => { if (!name(b) && !b.getAttribute('title')) problems.push(`${where}: button without a name (${b.id || b.className})`); });
  root.querySelectorAll('input, select, textarea').forEach(el => {
    const i = el as HTMLInputElement;
    if (i.type === 'hidden') return;
    const labelled = !!el.closest('label') || !!el.getAttribute('aria-label') || !!(i.id && document.querySelector(`label[for="${i.id}"]`));
    if (!labelled) problems.push(`${where}: field without a label (${i.id || i.name || i.type})`);
  });
  root.querySelectorAll('svg').forEach(v => { if (!v.getAttribute('aria-label') && !v.getAttribute('aria-hidden')) problems.push(`${where}: svg without a label`); });
  root.querySelectorAll('canvas').forEach(c => { if (!c.getAttribute('aria-label')) problems.push(`${where}: canvas without a label`); });
  const ids = new Map<string, number>();
  document.querySelectorAll('[id]').forEach(e => ids.set(e.id, (ids.get(e.id) || 0) + 1));
  ids.forEach((n, id) => { if (n > 1) problems.push(`${where}: duplicate id ${id}`); });
  return problems;
}

describe('accessibility audit', () => {
  it('the title screen and the game screen', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    const { boot } = await import('../src/ui');
    boot();
    const found: string[] = [];
    found.push(...audit(document, 'title'));
    expect(document.documentElement.lang).toBeTruthy();
    expect(document.title.length).toBeGreaterThan(3);
    document.getElementById('startBtn')!.click();
    found.push(...audit(document, 'game'));
    (document.querySelector('#stage .choices button') as HTMLElement).click();
    (document.getElementById('nextBtn') as HTMLElement).click();
    found.push(...audit(document, 'actions'));
    // the pop-up must be announced as a dialog
    const modal = document.getElementById('modal') as HTMLElement;
    if (modal.getAttribute('role') !== 'dialog') found.push('modal: missing role="dialog"');
    if (modal.getAttribute('aria-modal') !== 'true') found.push('modal: missing aria-modal');
    expect(found).toEqual([]);
  });

  it('every online service, step by step, and the airline site', () => {
    const s = G.newState('Tester', 'tajik'); s.queue = []; s.money = 200000; s.bank.sber = true; s.know = 80; s.flags.rvp = true;
    s.partner = { name: 'A', kind: 'citizen', love: 80 }; s.kids = 1; s.tmp.fines = 1000; s.tmp.fineDay = s.day; s.day = 280;
    const found: string[] = [];
    const host = document.createElement('div'); document.body.appendChild(host);
    openOnlineMenu(s, host, () => {});
    found.push(...audit(host, 'online menu'));
    for (const f of flows) {
      const h = document.createElement('div'); document.body.appendChild(h);
      openFlow(s, h, f, () => {});
      found.push(...audit(h, `flow ${f.id}`));
      h.remove();
    }
    const air = document.createElement('div'); document.body.appendChild(air);
    openBooking(G.newState('T', 'moscow'), air, () => {});
    found.push(...audit(air, 'airline site'));
    expect(found).toEqual([]);
  });
});

describe('dialog behaviour', () => {
  it('opening a pop-up moves focus into it and closing returns focus; the label follows the language', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    const { boot } = await import('../src/ui');
    boot();
    document.getElementById('startBtn')!.click();
    await new Promise(r => setTimeout(r, 120));           // the first-run guide opens on its own after 50 ms
    document.getElementById('closeModal')!.click();
    await Promise.resolve(); await new Promise(r => setTimeout(r, 0));
    const help = document.getElementById('helpBtn') as HTMLElement;
    help.focus();
    help.click();
    await new Promise(r => setTimeout(r, 0));
    expect(document.getElementById('modal')!.hidden).toBe(false);
    expect(document.activeElement).toBe(document.getElementById('closeModal'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 0));
    expect(document.getElementById('modal')!.hidden).toBe(true);
    expect(document.activeElement).toBe(help);
    expect(document.getElementById('modal')!.getAttribute('aria-label')).toBe('Details');
    document.getElementById('langBtn2')!.click();
    expect(document.getElementById('modal')!.getAttribute('aria-label')).toBe('Подробности');
  });
});
