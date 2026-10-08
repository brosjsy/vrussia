import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const patient = (origin: string, money = 100000): G.State => { const s = G.newState('T', origin); s.queue = []; s.money = money; s.health = 20; return s; };
const scene = (id: string, s: G.State): G.Scenario => G.get(id, s) as G.Scenario;

describe('hospital: emergency care is free for everyone, later treatment is paid for the uninsured', () => {
  it('the ward explains the rule to an uninsured foreigner and accepting emergency care costs nothing', () => {
    const s = patient('tajik');
    const ward = scene('hosp_ward', s);
    expect(ward.text).toContain('Emergency care is free for everyone');
    const before = s.money;
    G.choose(s, ward, 0);
    expect(s.money).toBe(before);
    expect(s.queue).toContain('hosp_injection');
  });

  it('insured people and citizens are told that the policy covers the stay and get a single discharge option', () => {
    for (const s of [patient('moscow'), (() => { const t = patient('tajik'); t.flags.insured = true; return t; })()]) {
      expect(scene('hosp_ward', s).text).toContain('insurance policy covers the stay');
      expect(scene('hosp_discharge', s).choices.length).toBe(1);
    }
  });

  it('an uninsured foreigner chooses at discharge: pay 12,000 for full recovery or leave earlier with less recovery', () => {
    const paid = patient('tajik'), left = patient('tajik');
    const d = scene('hosp_discharge', paid);
    expect(d.choices.length).toBe(2);
    expect(d.text).toContain('12,000');
    // the fee itself, read from the outcome (rent and living costs during the stay are charged separately by the calendar)
    expect((d.choices[0].r as (x: G.State) => G.Outcome)(structuredClone(paid)).fx.money).toBe(-12000);
    expect((scene('hosp_discharge', left).choices[1].r as (x: G.State) => G.Outcome)(structuredClone(left)).fx.money).toBeUndefined();
    G.choose(paid, d, 0);
    G.choose(left, scene('hosp_discharge', left), 1);
    expect(paid.money).toBeLessThan(left.money);        // the paid stay costs more, even after the same kind of rent charges
    expect(paid.health).toBeGreaterThan(left.health);
  });

  it('someone who cannot pay is not robbed: they leave when stable and a debt is recorded', () => {
    const s = patient('tajik', 500);
    G.choose(s, scene('hosp_discharge', s), 0);
    expect(s.money).toBeGreaterThanOrEqual(0);
    expect(Number(s.tmp.debt)).toBe(12000);
    expect(Number(s.tmp.debtPay)).toBe(2000);
  });

  it('the whole chain runs from collapse to discharge for both kinds of patient', () => {
    for (const origin of ['moscow', 'tajik']) {
      const s = patient(origin); s.health = 10;
      G.endDay(s);
      expect(s.queue).toContain('hosp_admit');
      let guard = 0;
      while (s.queue.length && guard++ < 20) { const sc = G.get(s.queue.shift() as string, s); if (sc) G.choose(s, sc, 0); }
      expect(s.health, origin).toBeGreaterThan(30);
    }
  });
});
