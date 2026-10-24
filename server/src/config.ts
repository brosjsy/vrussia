/* The server's settings, read once from the environment and checked. A missing or unsafe setting stops the server at start-up with a clear
   message, rather than letting it run half-configured. Secrets (the database password, the SMTP password) are only ever read from here. */
import { z } from 'zod';

const bool = z.enum(['true', 'false', '1', '0']).transform(v => v === 'true' || v === '1');
const list = z.string().transform(v => v.split(',').map(s => s.trim()).filter(Boolean));

const Schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  /** Where the server is reached from the outside (used in e-mail links). */
  PUBLIC_URL: z.url(),
  /** Where the game is (the links in e-mails open pages of the game). */
  APP_URL: z.url(),
  /** The web addresses allowed to call the server with the player's cookie (the game's address). */
  CORS_ORIGINS: list,
  DATABASE_URL: z.string().min(10),
  /** 'require' in production (TLS to the database); 'off' only for a database on the same private network or in tests. */
  DATABASE_SSL: z.enum(['require', 'off']).default('require'),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  /** Behind a reverse proxy (nginx, a load balancer) that sets X-Forwarded-For. */
  TRUST_PROXY: bool.default(false),
  COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_-]{3,40}$/).default('vr_session'),
  /** Secure cookies (HTTPS only). Must be on in production. */
  COOKIE_SECURE: bool.default(true),
  COOKIE_DOMAIN: z.string().optional(),
  SESSION_IDLE_DAYS: z.coerce.number().min(1).max(90).default(14),
  SESSION_MAX_DAYS: z.coerce.number().min(1).max(365).default(60),
  VERIFY_TOKEN_HOURS: z.coerce.number().min(1).max(72).default(24),
  RESET_TOKEN_MINUTES: z.coerce.number().min(5).max(240).default(30),
  /** Players must confirm their e-mail address before they can log in. */
  REQUIRE_VERIFIED_EMAIL: bool.default(true),
  EMAIL_TRANSPORT: z.enum(['console', 'smtp', 'memory']).default('console'),
  EMAIL_FROM: z.string().min(3),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_SECURE: bool.default(true),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  /** The brand on e-mails (see docs/BACKEND_V2_PLAN.md about the name). */
  BRAND_NAME: z.string().min(1).max(60).default('В России'),
  BRAND_COLOR: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#2f6fd6'),
  BRAND_LOGO_URL: z.url().optional(),
  BRAND_SUPPORT_EMAIL: z.email().optional(),
  BRAND_FOOTER: z.string().max(300).default('You get this e-mail because of an account in the game.'),
  /** A folder whose template files replace the built-in ones (same file names). */
  TEMPLATE_DIR: z.string().optional(),
  /** Requests a minute from one IP address: to every route, and to each account route (log-in, sign-up, password links). */
  RATE_PER_MIN: z.coerce.number().int().min(1).default(300),
  RATE_AUTH_PER_MIN: z.coerce.number().int().min(1).default(10),
  /** Log-in attempts for one e-mail address in 15 minutes, from anywhere. */
  LOGIN_PER_EMAIL: z.coerce.number().int().min(1).default(10),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});
export type Config = z.infer<typeof Schema>;

/** Reads and checks the settings. Throws one error that lists every problem. */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const r = Schema.safeParse(env);
  if (!r.success) throw new Error('Bad server settings:\n' + r.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n'));
  const c = r.data;
  const problems: string[] = [];
  if (c.NODE_ENV === 'production') {
    if (!c.COOKIE_SECURE) problems.push('COOKIE_SECURE must be true in production');
    if (c.EMAIL_TRANSPORT !== 'smtp') problems.push('EMAIL_TRANSPORT must be smtp in production (console and memory do not deliver e-mail)');
    if (!c.PUBLIC_URL.startsWith('https://') || !c.APP_URL.startsWith('https://')) problems.push('PUBLIC_URL and APP_URL must use https in production');
    if (c.CORS_ORIGINS.some(o => o === '*' || !o.startsWith('https://'))) problems.push('CORS_ORIGINS must list exact https addresses in production');
  }
  if (c.EMAIL_TRANSPORT === 'smtp' && (!c.SMTP_HOST || !c.SMTP_PORT)) problems.push('SMTP_HOST and SMTP_PORT are needed for EMAIL_TRANSPORT=smtp');
  if (c.SESSION_IDLE_DAYS > c.SESSION_MAX_DAYS) problems.push('SESSION_IDLE_DAYS cannot be longer than SESSION_MAX_DAYS');
  if (c.CORS_ORIGINS.length === 0) problems.push('CORS_ORIGINS needs at least the address of the game');
  if (problems.length) throw new Error('Bad server settings:\n' + problems.map(p => '  ' + p).join('\n'));
  return c;
}
