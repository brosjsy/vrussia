import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

/* A big purchase must check the wallet. Without the check, a poor player who picks "Pay 25,000" ends at -24,000 and a few more
   routine costs take them below the -30,000 limit: the game ends in debt because of a single click (found in rounds 77 and 78).
   This audit plays every choice of every scene with a small wallet and lists outcomes that cost more than 20,000 and leave the
   player below zero. The only allowed one is the deliberate "guaranteed exam result" scam, which is a trap on purpose. */
const ALLOWED = new Set(['rutest[1]']);

describe('large costs check the wallet', () => {
  it('no scene lets a poor player overspend by a large amount', () => {
    const found = new Set<string>();
    for (const origin of ['moscow', 'tajik']) for (const m of [1000, 20000]) {
      const base = G.newState('T', origin); base.day = 200; base.flags.license = true; base.flags.rvp = true;
      for (const sc0 of G.scenarios) {
        const s = structuredClone(base); s.money = m;
        let sc: G.Scenario | null = null;
        try { sc = G.get(sc0.id, s) as G.Scenario | null; } catch { continue; }
        if (!sc) continue;
        sc.choices.forEach((c, i) => {
          for (let k = 0; k < 8; k++) {
            try {
              const t = structuredClone(s);
              const res = c.r ? (c.r as (x: G.State) => G.Outcome)(t) : { msg: '', fx: c.fx as G.Effects };
              const d = (res.fx || {}).money ?? 0;
              if (d < -20000 && t.money + d < 0 && !ALLOWED.has(`${sc!.id}[${i}]`)) found.add(`${sc!.id}[${i}] with ${m}: ${d}`);
            } catch { /* scenes that need special state are skipped */ }
          }
        });
      }
    }
    expect(Array.from(found).sort()).toEqual([]);
  }, 120000);

  it('the fixed scenes refuse politely when the wallet is too small and charge normally when it is not', () => {
    const run = (id: string, i: number, money: number): { msg: string; d: number } => {
      const s = G.newState('T', 'tajik'); s.day = 200; s.money = money;
      const sc = G.get(id, s) as G.Scenario;
      const c = sc.choices[i];
      const res = c.r ? (c.r as (x: G.State) => G.Outcome)(s) : { msg: c.msg || '', fx: c.fx as G.Effects };
      return { msg: res.msg, d: res.fx.money ?? 0 };
    };
    expect(run('imm_funeral', 0, 1000).d).toBe(0);
    expect(run('imm_funeral', 0, 30000).d).toBe(-22000);
    expect(run('bank_repay_loan', 0, 1000).d).toBe(0);
    expect(run('bank_repay_loan', 0, 30000).d).toBe(-21000);
    expect(run('fd-school', 1, 1000).d).toBe(0);                  // the private school at 25,000
    expect(run('fd-school', 1, 40000).d).toBe(-25000);
    expect(run('fd-school', 0, 1000).d).toBe(0);                  // the free local school is always possible
  });
});
