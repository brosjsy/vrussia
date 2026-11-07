# Balancing with reinforcement learning

A Q-learning agent (60 training games per character, then a few test games without exploring) against a random player. Run: `RL_EPISODES=60 RL_REPORT=1 npx vitest run test/rl-balance.test.ts`. Normal difficulty. The agent sees a coarse state and chooses only what to do with each part of the day; in scenarios it always takes the first choice, so it measures the structure of the game, not its stories.

| Character | Random player: mean score | Learned player: mean score | Learned player: bad endings | Most used actions |
|---|---|---|---|---|
| tajik | 1210 | 2833 | 100% | work 33%, paper 28%, home 11% |
| moscow | 6206 | 11333 | 13% | work 56%, culture 17%, paper 12% |
| region | 3929 | 5492 | 93% | work 50%, home 13%, money 10% |

## What to look at

Nothing stands out: no action dominates and no character is out of reach for the learned player.
