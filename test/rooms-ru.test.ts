// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { EN, RU, setLang } from '../src/i18n';
import { interiorFor } from '../src/interiors';
import { moveTo } from '../src/housing';
import { HOMES } from '../src/homes';
import { roomL } from '../src/i18n-rooms';

/* Round 151: the words inside the 3D rooms have Russian, and the dictionaries loaded on demand never change a word the game already has
   (the phone's dictionary used to turn the bank's "Savings goal" into "State service" and the stove into "Kitchen"). */
const mk = (o: string, h = 'rented'): G.State => { const s = G.newState('H', o); s.queue = []; s.housing = h; s.money = 1e6; return s; };

describe('the 3D rooms in Russian', () => {
  it('every room title, every part of a flat and every thing that can be used has its Russian', () => {
    const states = [mk('moscow'), mk('region'), mk('tajik'), mk('student'), mk('moscow', 'flat'), mk('tajik', 'village'), mk('region', 'house')];
    for (const id of ['kommunalka', 'khrush', 'eurotwo'] as const) { const s = mk('region'); s.job = 'courier'; moveTo(s, id); states.push(s); }
    const job = mk('moscow'); job.job = 'courier'; states.push(job);
    const words = new Set<string>(HOMES.map(h => h.name));
    for (const s of states) for (const p of G.PLACES) { const it = interiorFor(p.id, s); if (!it) continue; words.add(it.title); for (const q of it.props) if (q.label && !q.action?.startsWith('act:')) words.add(q.label); for (const z of it.zones ?? []) words.add(z.name); }
    setLang('ru');
    try { const missing = [...words].filter(w => roomL(w) === w || !/[А-Яа-яЁё]/.test(roomL(w))); expect(missing).toEqual([]); expect(roomL('Desk: work a shift (Trainee)')).toMatch(/^Рабочий стол: отработать смену \(Trainee\)$/); }
    finally { setLang('en'); }
    expect(roomL('Kitchen')).toBe('Kitchen');
  });
});

describe('dictionaries loaded later', () => {
  it('add new words but never change the meaning of a word that is already there', async () => {
    const en = { ...EN }, ru = { ...RU };
    await import('../src/i18n-life'); await import('../src/i18n-online'); await import('../src/i18n-account');
    const changed = Object.keys(en).filter(k => EN[k] !== en[k] || RU[k] !== ru[k]);
    expect(changed).toEqual([]);
  });
});
