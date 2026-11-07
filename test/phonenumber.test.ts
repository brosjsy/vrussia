/* The phone numbers of the game: 13 digits (+7 and twelve), never a real number, a check digit, two ranges. */
import { describe, it, expect } from 'vitest';
import { digitsFrom, formatNumber, numberFrom, parseNumber, isValidNumber, isPlayerNumber, DIGITS } from '../src/phonenumber';

describe('phone numbers of the game', () => {
  it('have 13 digits with the 7, are written +7 0XXX XXXX-XX-XX, and start with 0 so they can never be a real number', () => {
    for (let i = 0; i < 200; i++) {
      const d = digitsFrom('player' + i), text = formatNumber(d);
      expect(d).toHaveLength(DIGITS); expect(d[0]).toBe('0'); expect(text).toMatch(/^\+7 0\d{3} \d{4}-\d\d-\d\d$/);
      expect(text.replace(/\D/g, '')).toHaveLength(13);
    }
  });
  it('are the same for the same text, different for different text, and rarely collide', () => {
    expect(numberFrom('a', 'player')).toBe(numberFrom('a', 'player')); expect(numberFrom('a', 'player')).not.toBe(numberFrom('b', 'player'));
    const seen = new Set<string>(); for (let i = 0; i < 5000; i++) seen.add(digitsFrom('name' + i + '|moscow'));
    expect(seen.size).toBeGreaterThanOrEqual(4999);
  });
  it('are in the player range (1-8) for players and the game range (9) for the game\'s characters, and only player numbers can be reached by players', () => {
    for (let i = 0; i < 100; i++) { const p = digitsFrom('p' + i, 'player'), g = digitsFrom('g' + i, 'game'); expect(Number(p[1])).toBeGreaterThanOrEqual(1); expect(Number(p[1])).toBeLessThanOrEqual(8); expect(g[1]).toBe('9'); expect(isPlayerNumber(formatNumber(p))).toBe(true); expect(isPlayerNumber(formatNumber(g))).toBe(false); }
  });
  it('are read back from any way of writing them, and refuse everything else', () => {
    const d = digitsFrom('reader'), text = formatNumber(d);
    for (const t of [text, text.replace(/[ -]/g, ''), '7' + d, '+7' + d, ' ' + d + ' ', text.replace('+7 ', '7 ')]) expect(parseNumber(t), t).toBe(d);
    for (const t of ['', 'abc', '+7 912 345-67-89', '89123456789', d.slice(1), d + '0', '+8' + d, '1' + d.slice(1)]) expect(isValidNumber(t), t).toBe(false);
  });
  it('catch every single mistyped digit and every swap of two next digits that differ... at least the single ones', () => {
    for (let n = 0; n < 40; n++) {
      const d = digitsFrom('typo' + n);
      for (let i = 1; i < DIGITS; i++) for (let v = 0; v < 10; v++) { if (String(v) === d[i]) continue; const bad = d.slice(0, i) + v + d.slice(i + 1); expect(isValidNumber(bad), `${d} -> ${bad}`).toBe(false); }
    }
  });
});
