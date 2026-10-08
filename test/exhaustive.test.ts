import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

/** Build a spread of states: every origin, plus rich / poor / sick / married-with-kids / abroad-ready variants. */
function variants(): G.State[] {
  const out: G.State[] = [];
  for (const o of G.origins) {
    const base = G.newState('V', o.id);
    base.queue = [];
    out.push(base);
    const rich = structuredClone(base); rich.money = 3_000_000; rich.bank = { sber: true, vtb: true, tbank: true }; rich.rep = 90; rich.know = 90; rich.job = 'courier'; out.push(rich);
    const poor = structuredClone(base); poor.money = 50; poor.health = 15; poor.stress = 95; poor.strikes = 2; out.push(poor);
    const fam = structuredClone(base); fam.partner = { name: 'P', kind: 'citizen', love: 90 }; fam.kids = 2; fam.pet = { name: 'Rex', kind: 'mix', bond: 50 }; fam.flags = { married: true, rutest: true, rvpGround: true, license: true, pregnant: true }; fam.marks = { pregnant: -100, rvp: -500, vnzh: -500, enrolled: -50, married: -10 }; fam.car = { model: 'x', value: 1 }; fam.money = 800000; fam.job = 'nurse'; fam.biz = { kind: 'bakery', name: 'B', level: 2, staff: 2, rep: 70, regime: 'ip', profit: 200000, weeks: 30, revenueYear: 1_000_000 }; out.push(fam);
  }
  return out;
}

describe('every choice of every scenario', () => {
  it('runs without throwing and returns finite, well-formed outcomes', () => {
    const states = variants();
    let checked = 0;
    for (const raw of G.scenarios) {
      for (let i = 0; i < raw.choices.length || (raw.build && i < 3); i++) {
        for (const base of states) {
          const s = structuredClone(base);
          const sc = G.materialize(raw, s);
          if (i >= sc.choices.length) continue;
          s.tmp = { dog: 'Belka', dogKind: 'mix', price: 14000, level: 2, label: 'phone', uni: 'MSU' };
          s.booking = { dest: 'dushanbe', intl: true, dep: s.day + 1, stay: 5, price: 1, pnr: 'AAAAAA', passenger: 'V TEST', passport: 'AB1234567', baggage: false, done: false };
          let out: G.Chosen;
          try { out = G.choose(s, sc, i); } catch (e) { throw new Error(`scenario ${sc.id} choice ${i} threw: ${(e as Error).message}`); }
          expect(typeof out.msg, sc.id).toBe('string');
          expect(out.msg.length, sc.id).toBeGreaterThan(0);
          for (const k of ['money', 'energy', 'health', 'stress', 'rep', 'know', 'clothes', 'famLove', 'merit'] as const) {
            expect(Number.isFinite(s[k]), `${sc.id}.${k}`).toBe(true);
          }
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(20000);
  });

  it('every dynamic scene builds for every variant', () => {
    for (const id of Object.keys(G.dyn)) {
      for (const base of variants()) {
        const s = structuredClone(base);
        s.tmp = { dog: 'Belka', dogKind: 'mix', price: 14000, level: 2, label: 'phone' };
        s.dest = 'mfc';
        s.booking = { dest: 'dushanbe', intl: true, dep: s.day, stay: 3, price: 1, pnr: 'AAAAAA', passenger: 'V TEST', passport: 'AB1234567', baggage: false, done: false };
        const sc = G.get(id, s);
        expect(sc, id).toBeTruthy();
        for (let i = 0; i < sc!.choices.length; i++) {
          const s2 = structuredClone(s);
          expect(() => G.choose(s2, G.get(id, s2) as G.Scenario, i), `${id}#${i}`).not.toThrow();
        }
      }
    }
  });

  it('text templates never leak undefined or [object Object]', () => {
    const s = G.newState('Tester', 'tajik');
    for (const raw of G.scenarios) {
      const sc = G.materialize(raw, s);
      const t = G.fill(sc.title + ' ' + sc.text + ' ' + sc.choices.map(c => c.t).join(' '), s);
      expect(t, sc.id).not.toMatch(/undefined|\[object|NaN|\{name\}|\{city\}|\{home\}/);
    }
  });
});
