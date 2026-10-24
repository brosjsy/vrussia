// Starts the whole game on this computer for testing by hand, with one command:  npm run local
// 1. builds the server (server/dist), 2. starts the local database and the game's server (server/scripts/dev-stack.mjs) on the first
// free port of 8787, 3001, 4100, 5180, 18080 (Windows reserves some ranges, e.g. 8730-8829 on some computers) with the database kept in server/.devdata (accounts survive a restart; delete the folder to start clean; git ignores it),
// 3. starts the game (Vite) on http://127.0.0.1:5173 connected to that server. E-mails (confirm, reset password) are printed in this window,
// not sent: open the link from here. Stop everything with Ctrl+C.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createServer } from 'node:net';

// npm run local -- --db <folder> starts on another database folder instead (e.g. the play-test's 50 players: dev/playtest-db)
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), server = join(root, 'server'), dbArg = process.argv.indexOf('--db'), data = dbArg > 0 && process.argv[dbArg + 1] ? join(root, process.argv[dbArg + 1]) : join(server, '.devdata');
const node = process.execPath;
const say = (m) => console.log(`\n[local] ${m}`);

if (!existsSync(join(root, 'node_modules')) || !existsSync(join(server, 'node_modules'))) {
  say('First run: installing packages (npm install) ...');
  for (const dir of [root, server]) if (!existsSync(join(dir, 'node_modules'))) { const r = spawnSync('npm', ['install'], { cwd: dir, stdio: 'inherit', shell: true }); if (r.status !== 0) process.exit(r.status ?? 1); }
}
say('Building the server ...');
const b = spawnSync(node, [join(server, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.build.json'], { cwd: server, stdio: 'inherit' });
if (b.status !== 0) { say('The server did not build. See the errors above.'); process.exit(b.status ?? 1); }

/** The first port of the list this computer lets us listen on. */
const free = (port) => new Promise(ok => { const t = createServer(); t.once('error', () => ok(false)); t.listen(port, '127.0.0.1', () => t.close(() => ok(true))); });
const pick = async (list) => { for (const p of list) if (await free(p)) return p; return null; };
const API = await pick([8787, 3001, 4100, 5180, 18080, 28787]), DB = await pick([25433, 15433, 35433, 45433]);
if (!API || !DB) { say('No free port for the server or the database. Close other programs and try again.'); process.exit(1); }
if (!(await free(5173))) { say('Port 5173 is in use (is the game already running in another window?). Stop it and try again.'); process.exit(1); }
const API_URL = `http://127.0.0.1:${API}`;
mkdirSync(data, { recursive: true });
say(`Starting the database (port ${DB}) and the game server on ${API_URL} ...`);
const api = spawn(node, ['scripts/dev-stack.mjs'], { cwd: server, stdio: 'inherit', env: { ...process.env, DEV_DB_DIR: data, DEV_API_PORT: String(API), DEV_DB_PORT: String(DB) } });
say('Starting the game on http://127.0.0.1:5173 ...');
const game = spawn(node, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { cwd: root, stdio: 'inherit', env: { ...process.env, VITE_API_URL: API_URL } });
setTimeout(() => say('Ready: open http://127.0.0.1:5173 in your browser. Online (🌐): make an account; the confirmation link is printed in this window. Stop with Ctrl+C.'), 4000);

let stopping = false;
const stop = (code = 0) => { if (stopping) return; stopping = true; say('Stopping ...'); api.kill('SIGINT'); game.kill('SIGINT'); setTimeout(() => process.exit(code), 1500); };
process.on('SIGINT', () => stop(0)); process.on('SIGTERM', () => stop(0));
api.on('exit', c => { if (!stopping) { say(`The game server stopped (code ${c}). See the message above.`); stop(1); } });
game.on('exit', c => { if (!stopping) { say(`The game stopped (code ${c}). Is port 5173 already in use?`); stop(1); } });
