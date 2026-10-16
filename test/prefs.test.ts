// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { textStep, cycleTextStep, applyTextStep, TEXT_KEY, TEXT_STEPS } from '../src/prefs';
import type { KV } from '../src/store';

const fakeKV = (): KV & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; }, removeItem: k => { delete data[k]; } };
};

describe('text size preference', () => {
  it('defaults to step 0 and ignores nonsense in storage', () => {
    const kv = fakeKV();
    expect(textStep(kv)).toBe(0);
    for (const bad of ['7', '-1', 'big', '1.5', '']) { kv.data[TEXT_KEY] = bad; expect(textStep(kv)).toBe(0); }
    expect(textStep(null)).toBe(0);
  });
  it('cycles through the three steps, saves each, and applies the CSS variable', () => {
    const kv = fakeKV(); const root = document.createElement('div');
    expect(cycleTextStep(kv, root)).toBe(1); expect(root.style.getPropertyValue('--fs')).toBe(String(TEXT_STEPS[1])); expect(kv.data[TEXT_KEY]).toBe('1');
    expect(cycleTextStep(kv, root)).toBe(2); expect(root.style.getPropertyValue('--fs')).toBe(String(TEXT_STEPS[2]));
    expect(cycleTextStep(kv, root)).toBe(0); expect(root.style.getPropertyValue('--fs')).toBe('1');
    applyTextStep(99, root); expect(root.dataset.textStep).toBe('2');
  });
  it('does not throw when storage is blocked', () => {
    const blocked: KV = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); }, removeItem: () => { throw new Error('no'); } };
    expect(() => cycleTextStep(blocked, document.createElement('div'))).not.toThrow();
  });
  it('both Aa buttons on the page change the size and the choice is remembered', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    localStorage.removeItem(TEXT_KEY);
    const { boot } = await import('../src/ui');
    boot();
    expect(document.documentElement.dataset.textStep).toBe('0');
    document.getElementById('textBtn')!.click();
    expect(document.documentElement.dataset.textStep).toBe('1');
    document.getElementById('textBtn2')!.click();
    expect(document.documentElement.dataset.textStep).toBe('2');
    expect(localStorage.getItem(TEXT_KEY)).toBe('2');
    expect(document.getElementById('textBtn')!.getAttribute('aria-label')).toBeTruthy();
  });
});

import { phoneNight, setPhoneNight, seenApps, markSeen, NIGHT_KEY, SEEN_KEY } from '../src/prefs';
describe('the phone: night mode and new tags', () => {
  const fake = (): { m: Map<string, string>; getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } => { const m = new Map<string, string>(); return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); } }; };
  it('night mode is off by default, can be switched and is remembered', () => {
    const kv = fake(); expect(phoneNight(kv)).toBe(false); setPhoneNight(true, kv); expect(phoneNight(kv)).toBe(true); setPhoneNight(false, kv); expect(phoneNight(kv)).toBe(false);
    expect(phoneNight(null)).toBe(false); expect(() => setPhoneNight(true, null)).not.toThrow(); kv.m.set(NIGHT_KEY, 'banana'); expect(phoneNight(kv)).toBe(false);
  });
  it('remembers which apps were opened, once each, and survives broken storage', () => {
    const kv = fake(); expect(seenApps(kv).size).toBe(0);
    markSeen('shop', kv); markSeen('shop', kv); markSeen('dating', kv); expect([...seenApps(kv)].sort()).toEqual(['dating', 'shop']);
    kv.m.set(SEEN_KEY, '{not json'); expect(seenApps(kv).size).toBe(0);
    kv.m.set(SEEN_KEY, JSON.stringify([1, 'a', null, 'b'])); expect([...seenApps(kv)]).toEqual(['a', 'b']);
    kv.m.set(SEEN_KEY, '"text"'); expect(seenApps(kv).size).toBe(0);
    expect(seenApps(null).size).toBe(0); expect(() => markSeen('x', null)).not.toThrow();
  });
});
