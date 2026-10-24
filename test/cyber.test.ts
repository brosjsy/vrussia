// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { registerCyber, cyberOf, todaysRound, answer, protect, MESSAGES, PROTECTIONS, levelOf, CYBER_JOB } from '../src/cyber';
import { openCyber } from '../src/cyber-ui';
import { setLang } from '../src/i18n';

/* Round 151: the cyber life. */
const mk = (o = 'student'): G.State => { const s = G.newState('Cy', o); s.queue = []; return s; };
registerCyber();

describe('cyber scenes', () => {
  it('are registered once, have two choices with Russian, and every choice runs with finite stats', () => {
    const cy = G.scenarios.filter(sc => sc.id.startsWith('cy-')); expect(cy.length).toBeGreaterThanOrEqual(18);
    registerCyber(); expect(G.scenarios.filter(sc => sc.id.startsWith('cy-')).length).toBe(cy.length);
    const s = mk(); s.money = 50000; s.bank.sber = true; s.job = 'infosec'; s.know = 80;
    setLang('ru');
    try { for (const sc of cy) { const m = G.get(sc.id, s)!; expect(m.choices.length, sc.id).toBe(2); expect(m.title + m.text, sc.id).toMatch(/[А-Яа-я]/); for (const c of m.choices) { const o = c.r!(G.newState('X', 'student')); expect(o.msg).toMatch(/[А-Яа-я]/); for (const v of Object.values(o.fx)) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true); } } }
    finally { setLang('en'); }
  });
  it('the job of information-security analyst exists, and the dropper choice blocks the cards and gives a legal strike', () => {
    expect(G.jobs.some(j => j.id === CYBER_JOB.id)).toBe(true);
    const s = mk(); s.bank.sber = true; const sc = G.get('cy-card-rent', s)!; const o = sc.choices[0].r!(s); G.apply(s, o.fx);
    expect(s.bank.sber).toBe(false); expect(s.strikes).toBeGreaterThan(0); expect(s.flags.cyDropper).toBe(true);
  });
  it('a protection makes the trap harmless', () => {
    const s = mk(); s.money = 50000; const before = G.get('cy-contract', s)!.choices[0].r!(s); expect(before.fx.money).toBeLessThan(0);
    expect(protect(s, 'twofa').ok).toBe(true); expect(protect(s, 'twofa').ok).toBe(false); const after = G.get('cy-contract', s)!.choices[0].r!(s); expect(after.fx.money ?? 0).toBe(0);
    expect(protect(s, 'trusted').ok).toBe(false);                                    // needs a bank account
  });
});

describe('scam or not?', () => {
  it('gives five different messages a day, scores them once, and the levels grow', () => {
    expect(MESSAGES.length).toBeGreaterThanOrEqual(20); expect(MESSAGES.some(m => !m.scam)).toBe(true); for (const m of MESSAGES) expect(m.ru).toMatch(/[А-Яа-я]/);
    const s = mk(), r = todaysRound(s); expect(new Set(r).size).toBe(5); expect(todaysRound(s)).toEqual(r);
    let last; for (const i of r) last = answer(s, i, MESSAGES[i].scam);
    expect(last!.finished).toBe(true); expect(cyberOf(s).score).toBe(5); expect(answer(s, r[0], true).right).toBe(false);
    expect(levelOf(s).n).toBe(1); expect(PROTECTIONS.length).toBe(6);
  });
  it('the app shows the round, answers, and switches a protection on', () => {
    const s = mk(), host = document.createElement('div'); let notes = 0;
    openCyber(host, s, { back: () => undefined, refresh: () => undefined, notify: () => { notes++; } });
    expect(host.textContent).toContain('Scam or not?'); (host.querySelector('[data-cyans="1"]') as HTMLButtonElement).click();
    expect(host.textContent).toMatch(/Right|Not quite/); (host.querySelector('[data-cyprot="selfban"]') as HTMLButtonElement).click();
    expect(cyberOf(s).shield.selfban).toBe(s.day); expect(notes).toBeGreaterThan(0);
  });
});
