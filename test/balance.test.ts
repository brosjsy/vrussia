import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';

type Policy = 'random' | 'cautious';
/** Run with BALANCE_DIFF=hard (or easy) to measure another difficulty level; the default is normal. */
const DIFF = (process.env.BALANCE_DIFF ?? 'normal') as G.Difficulty;

/** Chooses what to do with the next slot. The cautious policy fixes papers first and rests before burning out. */
function act(s: G.State, p: Policy): string {
  if (s.energy < 25) return 'home';
  if (s.energy < 45 && s.money > 400) return 'food';
  if (p === 'cautious') {
    if (G.problems(s).length) return Math.random() < 0.8 ? 'paper' : 'home';
    // a careful newcomer finishes the legal route before looking for work
    if (s.status === 'migrant' && !s.flags.rvp && (!s.flags.registered || !s.flags.med || s.docs.patent <= 0 || !s.flags.patentNotice)) return Math.random() < 0.85 ? 'paper' : 'home';
    if (s.status === 'student' && !s.flags.workPermit && !s.job && s.day < 60) return 'paper';
    if (s.stress > 70) return 'home';
    if (s.partner === null && Math.random() < 0.05) return 'people';
  } else if (G.problems(s).length && Math.random() < 0.6) return 'paper';
  if (!s.job && Math.random() < 0.5) return 'work';
  if (s.job && Math.random() < 0.45) return 'work';
  const pool = ['paper', 'edu', 'out', 'money', 'people', 'family', 'culture', 'pets', 'home', 'food', 'travel', 'online'];
  const a = pool[Math.floor(Math.random() * pool.length)];
  return a === 'online' ? 'paper' : a;
}

function pickChoice(s: G.State, sc: G.Scenario, p: Policy): number {
  if (p === 'random') return Math.floor(Math.random() * sc.choices.length);
  if (sc.id === 'job_search') {
    // accept the first job that would not make the player's papers illegal
    for (let i = 0; i < sc.choices.length - 1; i++) {
      const t = structuredClone(s); G.choose(t, G.get('job_search', t) as G.Scenario, 0);
      void t;
      const probe = structuredClone(s); const res = (sc.choices[i].r as (x: G.State) => G.Outcome)(probe); G.apply(probe, res.fx);
      if (G.problems(probe).length === 0) return i;
    }
    return sc.choices.length - 1;
  }
  return 0;
}

function play(origin: string, p: Policy): G.State {
  const s = G.newState('Bot', origin, undefined, DIFF);
  let steps = 0;
  while (!s.over && steps++ < 8000) {
    if (s.queue.length) {
      const sc = G.get(s.queue.shift() as string, s);
      if (sc) G.choose(s, sc, pickChoice(s, sc, p));
      continue;
    }
    const r = G.perform(s, act(s, p));
    if (!r.sc) continue;
    G.choose(s, r.sc, pickChoice(s, r.sc, p));
  }
  return s;
}

it('prints balance metrics for both policies', () => {
  const N = 30;
  const out: string[] = [`# Balance report (${DIFF} difficulty)`, '', `Bot players, ${N} games per origin and policy. "Random" picks any choice; "cautious" takes the first (straightforward) option, only accepts legal jobs and rests before burning out.`, ''];
  for (const p of ['cautious', 'random'] as Policy[]) {
    out.push(`## Policy: ${p}`, '', '| Origin | Survived 2 yrs | Deported | Died/hospital | Debt | Median money | Citizen | RVP | Bank | Family | Median score | Median days |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const o of G.origins) {
      const runs = Array.from({ length: N }, () => play(o.id, p));
      const pct = (f: (s: G.State) => boolean): string => Math.round(100 * runs.filter(f).length / N) + '%';
      const med = (f: (s: G.State) => number): number => { const a = runs.map(f).sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
      out.push(`| ${o.label} | ${pct(s => s.over === 'time')} | ${pct(s => s.over === 'deported')} | ${pct(s => s.over === 'hospital')} | ${pct(s => s.over === 'debt')} | ${G.money(med(s => s.money))} | ${pct(s => !!s.flags.naturalized)} | ${pct(s => !!s.flags.rvp)} | ${pct(s => Object.values(s.bank).some(Boolean))} | ${pct(s => s.kids > 0 || !!s.flags.married)} | ${med(G.score)} | ${med(s => s.day)} |`);
    }
    out.push('');
  }
  console.log(out.join('\n'));
  writeFileSync(DIFF === 'normal' ? 'docs/BALANCE.md' : `docs/BALANCE-${DIFF}.md`, out.join('\n') + '\n');
}, 900000);
