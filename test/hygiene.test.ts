import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/* Source hygiene. Shell heredocs have more than once damaged files while they were being written: a backslash-b in a regular expression
   became a real backspace character, and other control characters or the Unicode replacement character crept in. None of these is ever
   intended in the game's source, tests, docs or page, so this test fails when one appears and names the file and line.
   The forbidden characters are built from their numbers, so that this file itself contains none of them. */
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

const FILES = [...walk('src'), ...walk('test'), ...walk('docs').filter(f => f.endsWith('.md')), 'index.html', 'README.md', 'package.json']
  .filter(f => /\.(ts|md|html|json|css)$/.test(f));

const REPLACEMENT = String.fromCharCode(0xFFFD);
/** True for control characters other than tab (9), line feed (10) and carriage return (13), for DEL (127) and for the replacement character. */
const isBad = (line: string): boolean => {
  for (let i = 0; i < line.length; i++) {
    const c = line.charCodeAt(i);
    if ((c < 32 && c !== 9 && c !== 10 && c !== 13) || c === 127 || line[i] === REPLACEMENT) return true;
  }
  return false;
};

/** Emoji newer than Unicode 12 (code points from 1FA83 up) show as empty boxes on many Windows 10 computers, so the game does not use them. */
const NEW_EMOJI_FROM = 0x1FA83, NEW_EMOJI_TO = 0x1FAFF;
const newEmoji = (line: string): string | null => { for (const ch of line) { const c = ch.codePointAt(0) as number; if (c >= NEW_EMOJI_FROM && c <= NEW_EMOJI_TO) return ch; } return null; };

describe('source hygiene', () => {
  it('finds the files it is meant to check', () => {
    expect(FILES.length).toBeGreaterThan(80);
  });
  it('has no stray control characters or replacement characters in source, tests, docs or the page', () => {
    const found: string[] = [];
    for (const f of FILES) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => { if (isBad(line)) found.push(`${f}:${i + 1}`); });
    }
    expect(found).toEqual([]);
  });
  it('uses no emoji that older computers draw as empty boxes (Unicode 13 and newer)', () => {
    const found: string[] = [];
    for (const f of FILES.filter(x => /\.(ts|html|css)$/.test(x) && !x.includes('hygiene.test'))) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => { const e = newEmoji(line); if (e) found.push(`${f}:${i + 1} ${e}`); });
    }
    expect(found).toEqual([]);
    expect(newEmoji('ok 🧸 🌿')).toBeNull(); expect(newEmoji('new ' + String.fromCodePoint(0x1FA86))).not.toBeNull();
  });
  it('the detector itself works: a backspace and a replacement character are caught, tabs and accents are not', () => {
    expect(isBad('a' + String.fromCharCode(8) + 'b')).toBe(true);
    expect(isBad('x' + REPLACEMENT + 'y')).toBe(true);
    expect(isBad('del' + String.fromCharCode(127))).toBe(true);
    expect(isBad('tab\tand ₽ and é and 🇷🇺 and \r')).toBe(false);
  });
});
