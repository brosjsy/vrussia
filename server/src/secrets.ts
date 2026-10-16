/* Passwords and tokens.
   - Passwords: Argon2id (@node-rs/argon2) with the OWASP minimum of 19 MiB memory, 2 passes, 1 lane. A hash made with weaker settings is
     replaced at the next successful login.
   - Tokens (the session cookie, the links in e-mails): 32 random bytes from the operating system, sent as base64url. Only their SHA-256 hash
     is stored, so a copy of the database cannot be turned back into working tokens. */
import { hash, verify } from '@node-rs/argon2';
import { createHash, randomBytes } from 'node:crypto';

const PARAMS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;    // Argon2id is the library's default algorithm
export const PASSWORD_MIN = 10, PASSWORD_MAX = 256;

export const hashPassword = (pw: string): Promise<string> => hash(pw, PARAMS);
export async function checkPassword(stored: string, pw: string): Promise<boolean> {
  try { return await verify(stored, pw); } catch { return false; }
}
/** True when the stored hash was made with other settings than today's (it is then made again). */
export const needsRehash = (stored: string): boolean => !stored.startsWith(`$argon2id$v=19$m=${PARAMS.memoryCost},t=${PARAMS.timeCost},p=${PARAMS.parallelism}$`);

/** A fixed hash to check against when the e-mail is unknown, so a wrong address takes as long as a wrong password (no telling which). */
let dummy: Promise<string> | null = null;
export const dummyHash = (): Promise<string> => (dummy ??= hashPassword('not a real password ' + randomBytes(8).toString('hex')));

const COMMON = new Set(['password12', 'password123', 'password1234', '1234567890', '12345678910', 'qwertyuiop', 'qwerty1234', 'iloveyou12', '1q2w3e4r5t', 'q1w2e3r4t5', 'йцукенгшщз', 'abcdefghij', '0123456789', 'letmein123', 'welcome123', 'admin12345', 'passw0rd12']);
/** Why a new password is not good enough (null when it is). Long passphrases are welcome; no rules about symbols. */
export function passwordProblem(pw: string, email: string): string | null {
  if (typeof pw !== 'string' || pw.length < PASSWORD_MIN) return 'password too short';
  if (pw.length > PASSWORD_MAX) return 'password too long';
  const low = pw.toLowerCase();
  if (COMMON.has(low) || /^(.)\1+$/.test(pw)) return 'password too common';
  if (low === email.toLowerCase() || low === email.toLowerCase().split('@')[0]) return 'password like email';
  return null;
}

export function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: tokenHash(token) };
}
export const tokenHash = (token: string): string => createHash('sha256').update(token, 'utf8').digest('hex');
/** A token as it arrives from outside: exactly 43 base64url characters, or nothing. */
export const cleanToken = (v: unknown): string | null => (typeof v === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v) ? v : null);
