import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

function expecting(origin: string, partner?: G.Partner, married = false): G.State {
  const s = G.newState('T', origin); s.queue = []; s.flags.pregnant = true; s.marks.pregnant = -100; s.money = 10000;
  if (partner) s.partner = partner;
  if (married) s.flags.married = true;
  return s;
}
const birth = (s: G.State): void => { G.choose(s, G.get('love_birth', s) as G.Scenario, 0); };

describe('maternity capital', () => {
  it('a citizen gets a certificate for the first child, not a cash payment', () => {
    const s = expecting('moscow');
    birth(s);
    expect(s.kids).toBe(1);
    expect(s.tmp.matCap).toBe(730000);
    expect(s.money).toBe(10000);
  });

  it('a second child does not issue a second certificate', () => {
    const s = expecting('moscow');
    birth(s);
    s.tmp.matCap = 0; s.flags.pregnant = true; s.marks.pregnant = -100;
    birth(s);
    expect(s.kids).toBe(2);
    expect(Number(s.tmp.matCap || 0)).toBe(0);
  });

  it('a foreigner whose child is not a citizen gets none and pays fees', () => {
    const s = expecting('tajik');
    birth(s);
    expect(s.tmp.matCap).toBeUndefined();
    expect(s.money).toBe(5000);
  });

  it('a foreigner married to a citizen gets it', () => {
    const s = expecting('tajik', { name: 'Anna', kind: 'citizen', love: 80 }, true);
    birth(s);
    expect(s.tmp.matCap).toBe(730000);
  });

  it('pays for a village house together with cash, and is used up', () => {
    const s = G.newState('T', 'moscow'); s.queue = []; s.money = 100000; s.tmp.matCap = 730000;
    G.choose(s, G.get('estate_buy', s) as G.Scenario, 0);          // house, 600,000
    expect(s.housing).toBe('village');
    expect(s.money).toBe(100000);                                    // all paid from the certificate
    expect(s.tmp.matCap).toBe(130000);
  });

  it('partly covers a down payment and cash covers the rest', () => {
    const s = G.newState('T', 'moscow'); s.queue = []; s.money = 400000; s.tmp.matCap = 100000;
    s.bank.sber = true; s.rep = 80; s.job = 'courier';
    G.choose(s, G.get('estate_buy', s) as G.Scenario, 1);          // regional studio, 480,000 down
    expect(s.housing).toBe('flat');
    expect(s.money).toBe(20000);
    expect(s.tmp.matCap).toBe(0);
  });

  it('without enough cash plus capital the purchase fails and nothing is spent', () => {
    const s = G.newState('T', 'moscow'); s.queue = []; s.money = 100000; s.tmp.matCap = 100000;
    G.choose(s, G.get('estate_buy', s) as G.Scenario, 0);
    expect(s.housing).toBe('rented');
    expect(s.tmp.matCap).toBe(100000);
  });

  it('an information scene appears only for holders', () => {
    const s = G.newState('T', 'moscow'); s.queue = [];
    expect(G.eligible(s, ['love']).map(x => x.id)).not.toContain('matcap_info');
    s.tmp.matCap = 1;
    expect(G.eligible(s, ['love']).map(x => x.id)).toContain('matcap_info');
  });
});
