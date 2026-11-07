import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import { MORE_ROWS, met } from '../src/achievements-more';
import { ACH_MORE_RU } from '../src/i18n-ach-more';
import { DAILY_C } from '../src/content/packs/daily2026c-data';
import { REQ_KEYS } from '../src/content/packs/daily2026';
import '../src/content';

const fresh = (origin = 'moscow'): G.State => G.newState('T', origin);

describe('the sixty-two more achievements', () => {
  it('are in the game once, with a Russian title and text, a plain icon and an English text', () => {
    expect(MORE_ROWS).toHaveLength(62);
    const ids = new Set(G.ACHIEVEMENTS.map(a => a.id)); expect(ids.size).toBe(G.ACHIEVEMENTS.length);
    for (const r of MORE_ROWS) { expect(ids.has(r.id), r.id).toBe(true); const ru = ACH_MORE_RU[r.id]!; expect(ru, r.id).toBeTruthy(); expect(ru[0] + ru[1]).toMatch(/[а-яё]/i); expect(r.title.length).toBeGreaterThan(3); expect(r.text.length).toBeGreaterThan(8); }
    expect(Object.keys(ACH_MORE_RU).sort()).toEqual(MORE_ROWS.map(r => r.id).sort());
  });
  it('are earned by what the player has done, and not before', () => {
    const s = fresh(); const earned = () => G.checkAchievements(s).map(a => a.id);
    s.money = 0; s.friends = 0; s.rep = 0; s.know = 0; s.day = 0; s.earned = 0;      // a new life starts rich in some origins: begin from nothing
    expect(earned().filter(id => MORE_ROWS.some(r => r.id === id))).toEqual([]);
    s.day = 100; s.money = 60_000; s.friends = 3; s.rep = 65; s.know = 55; s.earned = 300_000;
    for (const k of ['d30', 'd60', 'd100', 'm10', 'm50', 'f1', 'f3', 'r40', 'r60', 'kn30', 'kn50', 'e50', 'e250', 'cl100']) expect(earned().concat(s.ach).includes(k), k).toBe(true);
    expect(s.ach.includes('m100')).toBe(false); expect(s.ach.includes('d150')).toBe(false); expect(s.ach.includes('f10')).toBe(false);
  });
  it('count scenes met, places visited, banks and a clean record', () => {
    const s = fresh(); s.day = 120;
    for (let i = 0; i < 5; i++) s.seen[`day2-x${i}`] = 1;
    expect(met({ k: 'seen', p: ['day-', 'day2-', 'day3-'], n: 5 }, s)).toBe(true); expect(met({ k: 'seen', p: ['day-'], n: 5 }, s)).toBe(false);
    s.known = { home: true, mfc: true, uni: false, bank: true }; expect(met({ k: 'places', n: 3 }, s)).toBe(true); expect(met({ k: 'places', n: 4 }, s)).toBe(false);
    s.bank = { sber: true, vtb: true, tbank: false }; expect(met({ k: 'banks', n: 2 }, s)).toBe(true); expect(met({ k: 'banks', n: 3 }, s)).toBe(false);
    expect(met({ k: 'clean', n: 100 }, s)).toBe(true); s.strikes = 1; expect(met({ k: 'clean', n: 100 }, s)).toBe(false);
  });
});

describe('the third part of the daily-life scenes', () => {
  it('knows every condition it names, and shows a scene only to the player it fits', () => {
    for (const d of DAILY_C) if (d.req) expect(REQ_KEYS[d.req], `${d.id}: ${d.req}`).toBeTypeOf('function');
    const solo = fresh(), flat = fresh(); flat.tmp.flatmates = 2; const kazan = fresh(); kazan.city = 'Kazan';
    expect(REQ_KEYS.flat!(solo)).toBeFalsy(); expect(REQ_KEYS.flat!(flat)).toBeTruthy(); expect(REQ_KEYS.kazan!(kazan)).toBeTruthy(); expect(REQ_KEYS.kazan!(solo)).toBeFalsy();
    expect(G.scenarios.find(x => x.id === 'day3-flat-dishes')!.req!(solo)).toBeFalsy(); expect(G.scenarios.find(x => x.id === 'day3-flat-dishes')!.req!(flat)).toBeTruthy();
  });
  it('plays every choice of every scene without an error', () => {
    for (const d of DAILY_C) { const sc = G.scenarios.find(x => x.id === d.id)!; expect(sc, d.id).toBeTruthy(); sc.choices.forEach((c, i) => { const s = fresh('tajik'); s.money = 50_000; const o = c.r!(s); expect(o.msg.length, `${d.id}/${i}`).toBeGreaterThan(5); }); }
  });
});
