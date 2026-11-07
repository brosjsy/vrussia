// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { problems, active, partnersFor, label, realPrice, hidden, setHidden, HIDE_KEY, type Partner } from '../src/partners';
import { PARTNERS } from '../src/content/partners';
import { partnersHtml } from '../src/partners-ui';
import type { KV } from '../src/store';

const mem = (): KV => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); } }; };
const good = (o: Partial<Partner> = {}): Partner => ({
  id: 'test-uni', name: 'Test University', nameRu: 'Тестовый университет', taxId: '7700000001', category: 'university', cities: ['Moscow'],
  blurb: 'Help desk for new foreign students: papers, housing, language.', blurbRu: 'Центр помощи новым иностранным студентам: документы, жильё, язык.',
  url: 'https://example.edu/international', priceRub: 0, from: '2027-01-01', until: '2027-12-31',
  reviewedBy: 'Test reviewer', reviewedOn: '2026-12-15', agreement: 'Agreement No. 1', ...o,
});

describe('partner places', () => {
  it('ships an empty list, and every entry that is ever added must pass the rules', () => {
    expect(PARTNERS.length).toBe(0);                                    // no organisation is invented; the first real one is added by a reviewed change
    for (const p of PARTNERS) expect(problems(p), p.id).toEqual([]);
  });

  it('accepts a complete entry and names each problem of a bad one', () => {
    expect(problems(good())).toEqual([]);
    expect(problems(good({ taxId: '123' })).join()).toMatch(/taxId/);
    expect(problems(good({ url: 'http://example.edu' })).join()).toMatch(/url/);
    expect(problems(good({ url: 'https://203.0.113.5/x' })).join()).toMatch(/url/);
    expect(problems(good({ cities: [] })).join()).toMatch(/cities/);
    expect(problems(good({ priceRub: 1.5 })).join()).toMatch(/priceRub/);
    expect(problems(good({ priceRub: -5 })).join()).toMatch(/priceRub/);
    expect(problems(good({ until: '2026-01-01' })).join()).toMatch(/from\/until/);
    expect(problems(good({ reviewedBy: '' })).join()).toMatch(/review/);
    expect(problems(good({ agreement: ' ' })).join()).toMatch(/review/);
    expect(problems(good({ blurb: 'Call us on +7 999 123 45 67 today' })).join()).toMatch(/phone numbers/);
    expect(problems(good({ category: 'casino' as never })).join()).toMatch(/category/);
  });

  it('refuses what partners may not offer: loans, money transfers, a result without an exam, gambling, alcohol', () => {
    for (const bad of ['Fast loan in ten minutes for everyone', 'Money transfer to home at a low fee', 'Patent without exam in a week', 'Best betting odds in town', 'Cheap vodka and beer', 'Гарантируем результат', 'Быстрый займ без справок', 'Денежные переводы домой', 'Патент без экзамена', 'Казино и покер']) {
      expect(problems(good({ blurb: bad + ' for newcomers', blurbRu: bad + ' для новичков' })).join(), bad).toMatch(/may not offer/);
    }
  });

  it('shows an entry only inside its dates, only in its cities, and never an invalid one', () => {
    const list = [good(), good({ id: 'spb-only', cities: ['Saint Petersburg'] }), good({ id: 'broken', taxId: 'x' }), good({ id: 'later', from: '2028-01-01', until: '2028-12-31' })];
    expect(active(list, '2027-06-01').map(p => p.id)).toEqual(['test-uni', 'spb-only']);
    expect(partnersFor(list, 'Moscow', '2027-06-01').map(p => p.id)).toEqual(['test-uni']);
    expect(partnersFor(list, 'Moscow', '2026-06-01')).toEqual([]);      // before it starts
    expect(partnersFor(list, 'Moscow', '2028-06-01').map(p => p.id)).toEqual(['later']);
  });

  it('labels every place as advertising with the advertiser and says a price is real roubles', () => {
    expect(label(good(), false)).toBe('Advertisement · Test University · INN 7700000001');
    expect(label(good(), true)).toBe('Реклама · Тестовый университет · ИНН 7700000001');
    expect(realPrice(good({ priceRub: 12500 }), false)).toMatch(/Real price: .*RUB.*not game money/);
    expect(realPrice(good({ priceRub: 12500 }), true)).toMatch(/Настоящая цена: .*руб\..*не игровые деньги/);
    expect(realPrice(good({ priceRub: null }), false)).toMatch(/No price given/);
    expect(realPrice(good({ priceRub: 0 }), false)).toMatch(/Free/);
  });

  it('draws the list with the label, the real price and a safe link, and says so when the city has none', () => {
    const s = G.newState('P', 'moscow');
    const html = partnersHtml(s, [good({ priceRub: 5000 })], '2027-06-01');
    expect(html).toContain('Advertisement · Test University · INN 7700000001');
    expect(html).toContain('Real price: 5');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('https://example.edu/international');
    expect(html).toContain('never asks for money or documents');
    const none = partnersHtml(s, [good({ cities: ['Kazan'] })], '2027-06-01');
    expect(none).toContain('No partners in this city yet.');
    expect(none).not.toContain('Test University');
    const evil = partnersHtml(s, [good({ name: '<img src=x onerror=alert(1)>' })], '2027-06-01');
    expect(evil).not.toContain('<img');
  });

  it('lets the player switch partner places off, kept on this device', () => {
    const kv = mem();
    expect(hidden(kv)).toBe(false);
    setHidden(true, kv); expect(kv.getItem(HIDE_KEY)).toBe('1'); expect(hidden(kv)).toBe(true);
    setHidden(false, kv); expect(hidden(kv)).toBe(false);
    expect(hidden(null)).toBe(false);                                   // no storage: partners shown, nothing thrown
  });

  it('adds the app to the phone only when the city has a partner, offers the switch, and the switch removes it', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    window.confirm = () => true;
    localStorage.clear();
    const ui = await import('../src/ui');
    ui.boot(); await ui.uiReady();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Part';
    document.getElementById('startBtn')!.click();
    document.getElementById('dockPhone')!.click();
    expect(document.querySelector('#modalBody [data-sys="partners"]')).toBeNull();      // empty list: nothing new on the phone
    expect(document.getElementById('phPartners')).toBeNull();
    const city = (document.querySelector('#modalBody .phoneDate')?.textContent ?? '').split('·').pop()?.trim();
    expect(city).toBeTruthy();
    document.getElementById('closeModal')!.click();
    const today = new Date().toISOString().slice(0, 10);
    const p = good({ cities: [city ?? 'Moscow'], from: '2000-01-01', until: '2099-12-31' });
    PARTNERS.push(p);
    try {
      document.getElementById('dockPhone')!.click();
      expect(document.querySelector('#modalBody [data-sys="partners"]')).not.toBeNull();
      const box = document.getElementById('phPartners') as HTMLInputElement;
      expect(box.checked).toBe(true);
      box.checked = false; box.dispatchEvent(new Event('change'));
      expect(localStorage.getItem(HIDE_KEY)).toBe('1');
      expect(document.querySelector('#modalBody [data-sys="partners"]')).toBeNull();
      expect(today.length).toBe(10);
    } finally { PARTNERS.length = 0; localStorage.removeItem(HIDE_KEY); }
  }, 30000);
});
