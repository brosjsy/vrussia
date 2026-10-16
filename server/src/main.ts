/* Starts the server: reads the settings, connects to the database, runs the hourly clean-up, and stops cleanly on SIGTERM/SIGINT
   (finishes the requests under way, then closes the database pool). Migrations are NOT run here: they are a separate step run with the
   owner role (npm run migrate), so the running server never needs the right to change tables. */
import { loadConfig } from './config.js';
import { pgDb } from './db.js';
import { buildApp } from './app.js';
import { senderFrom } from './email.js';

const cfg = loadConfig();
const db = pgDb(cfg.DATABASE_URL, cfg.DATABASE_SSL, cfg.DATABASE_POOL_MAX);
const app = await buildApp({ cfg, db, mail: senderFrom(cfg, msg => console.log(msg)) });

const cleanup = setInterval(() => { db.query('select * from app.cleanup()').then(r => app.log.info({ cleanup: r.rows[0] }, 'clean-up done'), e => app.log.error({ err: e }, 'clean-up failed')); }, 3_600_000);
cleanup.unref();

let stopping = false;
const stop = async (sig: string): Promise<void> => {
  if (stopping) return; stopping = true;
  app.log.info({ sig }, 'stopping');
  clearInterval(cleanup);
  try { await app.close(); await db.close(); process.exit(0); } catch (e) { app.log.error({ err: e }, 'stop failed'); process.exit(1); }
};
process.on('SIGTERM', () => void stop('SIGTERM'));
process.on('SIGINT', () => void stop('SIGINT'));

await app.listen({ host: cfg.HOST, port: cfg.PORT });
