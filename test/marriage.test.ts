import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { flows, validateStep } from '../src/forms';

const zags = flows.find(f => f.id === 'zags')!;
const couple = (origin: string, money = 50000): G.State => { const s = G.newState('T', origin); s.queue = []; s.money = money; s.partner = { name: 'Anna', kind: 'citizen', love: 80 }; return s; };
const step1 = (s: G.State) => zags.steps[0].fields(s, {});

describe('marriage application (ZAGS rules)', () => {
  it('prints the one-month wait and the 12-month window', () => {
    const note = step1(couple('moscow')).find(f => f.id === 'rule')!;
    expect(note.label).toContain('one month'); expect(note.label).toContain('12 months');
  });

  it('a citizen needs no extra documents and pays the 350 state fee', () => {
    const s = couple('moscow');
    expect(step1(s).map(f => f.id)).not.toContain('noimp');
    const out = zags.finish(s, { type: 'std', when: '30', w: 'Ivan' });
    expect(out.fx.money).toBe(-350);
    expect(out.fx.flag).toBe('proposed');
  });

  it('a foreigner must confirm the legalised no-impediment certificate and its translation, and pays for them', () => {
    const s = couple('tajik');
    const fields = step1(s);
    expect(fields.map(f => f.id)).toEqual(expect.arrayContaining(['noimp', 'transl']));
    expect(validateStep(fields, { type: 'std', when: '30' }, s, {})).not.toBeNull();            // boxes unchecked
    expect(validateStep(fields, { type: 'std', when: '30', noimp: 'yes', transl: 'yes' }, s, {})).toBeNull();
    expect(zags.finish(s, { type: 'std', when: '30', w: 'x' }).fx.money).toBe(-4350);
    const poor = couple('tajik', 1000);
    const refused = zags.finish(poor, { type: 'std', when: '30', w: 'x' });
    expect(refused.fx.flag).toBeUndefined(); expect(refused.msg).toContain('documents');
  });

  it('the same-day option exists only for pregnancy', () => {
    const a = couple('moscow'), b = couple('moscow'); b.flags.pregnant = true;
    const dates = (s: G.State): string[] => (step1(s).find(f => f.id === 'when')!.options as [string, string][]).map(o => o[0]);
    expect(dates(a)).not.toContain('0');
    expect(dates(b)).toContain('0');
    expect(zags.finish(b, { type: 'std', when: '0', w: 'x' }).msg).toContain('waived');
    expect(zags.finish(a, { type: 'std', when: '30', w: 'x' }).msg).toContain('at least a month');
  });
});
