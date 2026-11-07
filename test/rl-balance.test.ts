/* Balancing with reinforcement learning. A tabular Q-learning agent plays the game headless, choosing what to do with each part of the day; its
   state is a coarse summary (the character, the stage of the game, money, papers, strikes, energy, a job), its reward is the change of the
   game's own score, with a penalty for a bad ending. A smart agent that finds a loop paying far more than a careful human player would is
   a balance bug (an exploit), and a character the agent can almost never get through is too hard. The default run is a short smoke test; a long
   run writes docs/RL_BALANCE.md:   RL_EPISODES=300 RL_REPORT=1 npx vitest run test/rl-balance.test.ts */
import { it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';

const EPISODES = Number(process.env.RL_EPISODES ?? 24), REPORT = process.env.RL_REPORT === '1';
const ACTIONS = ['work', 'paper', 'home', 'food', 'edu', 'out', 'money', 'people', 'family', 'culture', 'travel'] as const;
const ORIGINS = ['tajik', 'moscow', 'region'].filter(id => G.origins.some(o => o.id === id));
const bucket = (v: number, cuts: number[]): number => cuts.filter(c => v >= c).length;

/** The coarse state the agent sees. */
function key(s: G.State): string {
  return [s.o, bucket(s.day, [30, 90, 180, 365, 540]), bucket(s.money, [0, 2000, 10000, 40000, 150000]), Math.min(3, s.strikes), G.problems(s).length ? 1 : 0, bucket(s.energy, [25, 55]), s.job ? 1 : 0,
    s.flags.registered ? 1 : 0, s.flags.rvp ? 1 : 0].join('|');
}
const pickChoice = (sc: G.Scenario): number => 0;

type Q = Map<string, number[]>;
function qrow(q: Q, k: string): number[] { let r = q.get(k); if (!r) { r = ACTIONS.map(() => 0); q.set(k, r); } return r; }
const argmax = (r: number[]): number => r.reduce((b, v, i) => (v > r[b] ? i : b), 0);

interface Run { score: number; ending: string; days: number; counts: number[] }
function episode(origin: string, q: Q | null, eps: number, rnd: () => number, learn: boolean): Run {
  const s = G.newState('Bot', origin, undefined, 'normal');
  const counts = ACTIONS.map(() => 0);
  let steps = 0, prev = G.score(s);
  while (!s.over && steps++ < 4000) {
    if (s.queue.length) { const sc = G.get(s.queue.shift() as string, s); if (sc) G.choose(s, sc, pickChoice(sc)); continue; }
    const k = q ? key(s) : '', row = q ? qrow(q, k) : [];
    // rest first when worn out (the same rule for every agent, so the learning is about the rest of the day)
    const a = !q ? Math.floor(rnd() * ACTIONS.length) : rnd() < eps ? Math.floor(rnd() * ACTIONS.length) : argmax(row);
    counts[a]++;
    const r = G.perform(s, s.energy < 20 ? 'home' : ACTIONS[a]);
    if (r.sc) G.choose(s, r.sc, pickChoice(r.sc));
    if (q && learn) {
      const now = G.score(s), reward = (now - prev) / 200 - (s.over && s.over !== 'time' ? 5 : 0); prev = now;
      const next = s.over ? 0 : Math.max(...qrow(q, key(s)));
      row[a] += 0.15 * (reward + 0.97 * next - row[a]);
    }
  }
  return { score: G.score(s), ending: String(s.over ?? 'running'), days: s.day + 1, counts };
}
const mean = (a: number[]): number => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
function seeded(seed: number): () => number { let x = seed >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; }

it('a Q-learning agent plays whole games, learns something, and every game ends', () => {
  const rnd = seeded(7), rows: string[] = [], flags: string[] = [];
  for (const origin of ORIGINS) {
    const q: Q = new Map(), train: Run[] = [];
    for (let i = 0; i < EPISODES; i++) train.push(episode(origin, q, Math.max(0.05, 0.6 * (1 - i / EPISODES)), rnd, true));
    const greedy = Array.from({ length: Math.max(6, Math.floor(EPISODES / 4)) }, () => episode(origin, q, 0, rnd, false));
    const random = Array.from({ length: Math.max(6, Math.floor(EPISODES / 4)) }, () => episode(origin, null, 1, rnd, false));
    expect(q.size).toBeGreaterThan(5);
    for (const r of [...train, ...greedy, ...random]) { expect(Number.isFinite(r.score)).toBe(true); expect(r.ending).not.toBe('running'); }
    const gm = mean(greedy.map(r => r.score)), rm = mean(random.map(r => r.score));
    const bad = greedy.filter(r => r.ending !== 'time').length / greedy.length;
    const use = ACTIONS.map((a, i) => [a, greedy.reduce((n, r) => n + r.counts[i], 0)] as const).sort((x, y) => y[1] - x[1]);
    const total = use.reduce((n, u) => n + u[1], 0) || 1;
    rows.push(`| ${origin} | ${Math.round(rm)} | ${Math.round(gm)} | ${Math.round(bad * 100)}% | ${use.slice(0, 3).map(u => `${u[0]} ${Math.round(u[1] / total * 100)}%`).join(', ')} |`);
    if (gm > rm * 3 && gm > 3000) flags.push(`${origin}: the learned player scores ${Math.round(gm)} against ${Math.round(rm)} for a random one. Look for a loop that pays too well.`);
    if (use[0][1] / total > 0.7) flags.push(`${origin}: the learned player spends ${Math.round(use[0][1] / total * 100)}% of its turns on “${use[0][0]}”. One action may be too good.`);
    if (bad > 0.9 && EPISODES >= 100) flags.push(`${origin}: ${Math.round(bad * 100)}% of the learned player's games end badly. This start may be too hard.`);
  }
  if (REPORT) writeFileSync('docs/RL_BALANCE.md', `# Balancing with reinforcement learning\n\nA Q-learning agent (${EPISODES} training games per character, then a few test games without exploring) against a random player. Run: \`RL_EPISODES=${EPISODES} RL_REPORT=1 npx vitest run test/rl-balance.test.ts\`. Normal difficulty. The agent sees a coarse state and chooses only what to do with each part of the day; in scenarios it always takes the first choice, so it measures the structure of the game, not its stories.\n\n| Character | Random player: mean score | Learned player: mean score | Learned player: bad endings | Most used actions |\n|---|---|---|---|---|\n${rows.join('\n')}\n\n## What to look at\n\n${flags.length ? flags.map(f => '- ' + f).join('\n') : 'Nothing stands out: no action dominates and no character is out of reach for the learned player.'}\n`);
  expect(rows.length).toBe(ORIGINS.length);
}, 280_000);
