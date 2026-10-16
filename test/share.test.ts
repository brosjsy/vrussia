// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { shareText, copyText } from '../src/share';

const base = { name: 'Aisha', label: 'Tajik Migrant', ending: 'time', score: 6420, days: 731, citizen: true, achievements: 12, achievementsTotal: 33, diff: 'hard' };

describe('the shareable result', () => {
  it('prints name, origin, difficulty, score, days, ending, citizenship and achievements in three lines', () => {
    const t = shareText(base).split('\n');
    expect(t.length).toBe(3);
    expect(t[0]).toContain('Aisha'); expect(t[0]).toContain('Tajik Migrant'); expect(t[0]).toContain('hard');
    expect(t[1]).toContain('6420'); expect(t[1]).toContain('731 days'); expect(t[1]).toContain('citizen');
    expect(t[2]).toContain('12 / 33');
  });
  it('handles empty names, long names, negative scores, other endings and non-citizens', () => {
    expect(shareText({ ...base, name: '   ' })).toContain('Player');
    expect(shareText({ ...base, name: 'N'.repeat(50) }).split('\n')[0].match(/N+/)![0].length).toBe(20);
    expect(shareText({ ...base, score: -148 })).toContain('Score 0');
    expect(shareText({ ...base, ending: 'deported', citizen: false })).toMatch(/was deported(?!.*citizen)/);
    expect(shareText({ ...base, ending: 'mystery' })).toContain('mystery');
  });
  it('copies through the Clipboard API when it exists', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    expect(await copyText('hello')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });
  it('falls back to the old copy command, and reports failure instead of throwing', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true });
    document.execCommand = vi.fn().mockReturnValue(true) as never;
    expect(await copyText('x')).toBe(true);
    document.execCommand = vi.fn().mockReturnValue(false) as never;
    expect(await copyText('x')).toBe(false);
    document.execCommand = (() => { throw new Error('no'); }) as never;
    expect(await copyText('x')).toBe(false);
  });
});
