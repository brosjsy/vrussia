// The 50-player play-test with its database kept and the PDF report, in one command:  npm run playtest:50
// 1. plays 50 players for 100 days and each life to its end on the game's own server (test/players20.test.ts), keeping the database in
//    dev/playtest-db (the old one is replaced) and the accounts in server/secrets/playtest-accounts.json;
// 2. writes docs/PLAYTEST_50.md and docs/V_Russia_report.pdf. Then: npm run local -- --db dev/playtest-db, and log in as any player.
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const seed = process.argv[2] ?? '1';
rmSync('dev/playtest-db', { recursive: true, force: true });
const env = { ...process.env, PT_PLAYERS: '50', PT_SEED: seed, PT_DB_DIR: 'dev/playtest-db', PT_OUT: 'docs/PLAYTEST_50.md' };
const t = spawnSync('npx', ['vitest', 'run', 'test/players20.test.ts'], { stdio: 'inherit', env, shell: true });
if (t.status !== 0) process.exit(t.status ?? 1);
const r = spawnSync(process.execPath, ['scripts/playtest-pdf.mjs', seed], { stdio: 'inherit' });
process.exit(r.status ?? 0);
