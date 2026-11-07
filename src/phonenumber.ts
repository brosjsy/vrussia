/* The phone numbers of the game: 13 digits, written +7 0XXX XXXX-XX-XX (the 7 of Russia and twelve more digits).
   Why this shape: a real Russian number has 11 digits and never has a 0 right after the +7, so no number of the game can be the number of a real person, and the
   game's calls and texts stay inside the game. The twelve digits are: 0, a range digit (1 to 8 for players, 9 for the game's own characters and services),
   nine digits of the number itself and a check digit (Luhn) that catches a mistyped digit. The server gives each player's number once, at the first login, and it
   never changes; without an account the game makes the same number from the player's name, so a newcomer still has one. Pure: no screen, no network. */
export type Range = 'player' | 'game';
export const DIGITS = 12;                         // after the +7

const luhn = (d: string): number => {             // the check digit for the digits d (the digit that would be written after them)
  let sum = 0;
  for (let i = 0; i < d.length; i++) { let n = Number(d[d.length - 1 - i]); if (i % 2 === 0) { n *= 2; if (n > 9) n -= 9; } sum += n; }
  return (10 - (sum % 10)) % 10;
};
const hash = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };

/** The twelve digits of a number made from some text (the same text, the same number), in the player range or the range of the game's own characters. */
export function digitsFrom(seed: string, range: Range = 'player'): string {
  let body = '', h = hash(seed);
  while (body.length < 9) { h = hash(`${h}|${seed}|${body.length}`); body += String(h % 1e9).padStart(9, '0'); }
  body = body.slice(0, 9);
  const head = `0${range === 'game' ? 9 : 1 + (hash('r|' + seed) % 8)}${body}`;
  return head + luhn(head);
}
/** The number as it is written: +7 0123 4567-89-01. */
export const formatNumber = (digits: string): string => `+7 ${digits.slice(0, 4)} ${digits.slice(4, 8)}-${digits.slice(8, 10)}-${digits.slice(10, 12)}`;
export const numberFrom = (seed: string, range: Range = 'game'): string => formatNumber(digitsFrom(seed, range));

/** The twelve digits of a number typed in any way ("+7 0123 4567-89-01", "70123456789 01", "012345678901"), or null if it is not a number of the game. */
export function parseNumber(text: string): string | null {
  let d = String(text).replace(/[\s()+\-.]/g, '');
  if (!/^\d+$/.test(d)) return null;
  if (d.length === DIGITS + 1 && d[0] === '7') d = d.slice(1);
  if (d.length !== DIGITS || d[0] !== '0') return null;
  return luhn(d.slice(0, 11)) === Number(d[11]) ? d : null;
}
export const isValidNumber = (text: string): boolean => parseNumber(text) !== null;
/** Is this a number that belongs to a player (and so can be texted and called by other players) rather than to a character of the game? */
export const isPlayerNumber = (text: string): boolean => { const d = parseNumber(text); return !!d && d[1] >= '1' && d[1] <= '8'; };
