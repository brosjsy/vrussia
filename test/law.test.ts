// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import * as L from '../src/law';
import { afterTurn } from '../src/turn';
import { lawHtml, wireLaw, resetLawView } from '../src/law-ui';

const citizen = (name = 'Ivan', city = 'Moscow'): G.State => { const s = G.newState(name, 'region'); s.queue = []; s.city = city; s.money = 50000; s.energy = 100; return s; };
/** Tries a crime on day after day until it ends one way (caught or not). */
function until(s: G.State, id: L.CrimeId, caught: boolean): string {
  for (let i = 0; i < 300; i++) { s.day++; s.energy = 100; const before = L.lawOf(s).caught; const r = L.commit(s, id); if ((L.lawOf(s).caught > before) === caught) return r.msg; if (s.over) break; }
  throw new Error('never happened');
}

describe('breaking the law', () => {
  it('five offences with their real articles; pickpocketing is a crime, the others administrative', () => {
    expect(L.CRIMES.map(c => c.id)).toEqual(['fare', 'drink', 'shoplift', 'pickpocket', 'fight']);
    expect(L.crimeOf('pickpocket')!.law).toMatch(/UK 158/); expect(L.crimeOf('pickpocket')!.kind).toBe('criminal');
    expect(L.crimeOf('shoplift')!.law).toMatch(/KoAP 7\.27/);
  });
  it('getting away with it: the gain and the police\'s attention; the chance of being caught rises with attention', () => {
    const s = citizen(); const r0 = L.riskOf(s, 'shoplift'), m = s.money;
    until(s, 'shoplift', false); expect(s.money).toBeGreaterThan(m); expect(L.lawOf(s).heat).toBeGreaterThan(0);
    expect(L.riskOf(s, 'shoplift')).toBeGreaterThan(r0);
    expect(L.commit(s, 'shoplift').msg).toMatch(/enough for one day/);
  });
  it('caught shoplifting: the station, a fine by KoAP 7.27, a violation on record', () => {
    const s = citizen(); const msg = until(s, 'shoplift', true);
    expect(msg).toMatch(/police station.*(fines you|arrest)/); expect(s.strikes).toBe(1);
    expect(L.lawOf(s).record[0]).toMatchObject({ kind: 'admin' });
  });
  it('caught picking a pocket, first time: one year suspended and a criminal record; a second time: the colony', () => {
    const s = citizen('Thief'); until(s, 'pickpocket', true);
    expect(L.convicted(s)).toBe(true); expect(L.lawOf(s).record[0].sentence).toMatch(/suspended/);
    const d = s.day; until(s, 'pickpocket', true); expect(L.lawOf(s).record[0].sentence).toMatch(/colony/); expect(s.day - d).toBeGreaterThanOrEqual(60);
  });
  it('a foreigner convicted of a crime is expelled', () => {
    const s = G.newState('Aziz', 'uzbek'); s.queue = []; s.money = 50000; s.energy = 100;
    until(s, 'pickpocket', true); expect(s.over).toBe('deported');
  });
  it('no pickpocketing in a city without a metro', () => {
    expect(L.cannotCommit(citizen('A', 'Sochi'), 'pickpocket')).toMatch(/no metro/);
  });
});

describe('the victim, 102 and the investigation', () => {
  it('a theft in the metro takes the phone and money; reported, the case is investigated and sometimes solved from the cameras', () => {
    let solved = 0, closed = 0;
    for (let i = 0; i < 30; i++) {
      const s = citizen('V' + i); s.day = 5; const m = s.money, t = L.theft(s, 'metro');
      expect(s.phone).toBe(0); expect(s.money).toBe(m - t.value);
      expect(L.theft(s, 'metro').id).toBe(t.id);                                     // the same scene drawn twice is one theft
      expect(L.report(s, t.id).ok).toBe(true); expect(L.report(s, t.id).ok).toBe(false);
      s.day = t.due; L.tickCases(s);
      if (t.status === 'solved') { solved++; expect(s.money).toBe(m); expect(s.phone).toBe(1); } else { closed++; expect(t.status).toBe('closed'); }
    }
    expect(solved).toBeGreaterThan(5); expect(closed).toBeGreaterThan(5);
  });
  it('the scenes: robbed (call the police), a thief to witness (call 112), arrested later from the metro cameras', () => {
    const s = citizen();
    const rob = G.get('law_robbed_metro', s)!; expect(rob.choices[0].t).toMatch(/102/);
    const out = rob.choices[0].r!(s); expect(out.msg).toMatch(/statement/);
    const wit = G.get('law_witness', s)!; const h = L.lawOf(s).helped; wit.choices[0].r!(s); expect(L.lawOf(s).helped).toBe(h + 1);
    L.lawOf(s).pending = { crime: 'pickpocket', day: s.day, value: 3000 }; L.tickCases(s); expect(s.queue).toContain('law_arrest');
    const ar = G.get('law_arrest', s)!; expect(ar.text).toMatch(/cameras/); ar.choices[0].r!(s); expect(L.convicted(s)).toBe(true); expect(L.lawOf(s).pending).toBeNull();
  });
});

describe('the migration police', () => {
  it('a raid: with papers in order, an hour lost; undocumented in Moscow, a court, a fine and expulsion', () => {
    const ok = G.newState('Legal', 'kyrgyz'); ok.queue = []; ok.docs.reg = 60;
    const a = G.get('law_raid', ok)!; expect(a.choices).toHaveLength(1); expect(a.choices[0].r!(ok).msg).toMatch(/in order/);
    const bad = G.newState('Nopaper', 'tajik'); bad.queue = []; bad.docs.reg = 0; bad.money = 50000;
    const b = G.get('law_raid', bad)!; expect(b.text).toMatch(/not in order/);
    expect(b.choices[0].r!(bad).msg).toMatch(/KoAP 18\.8.*expulsion/); expect(bad.over).toBe('deported');
  });
  it('outside the big cities a first time may end with a fine only; a lawyer helps', () => {
    let fineOnly = 0;
    for (let i = 0; i < 20; i++) { const s = G.newState('N' + i, 'tajik'); s.queue = []; s.city = 'Omsk'; s.docs.reg = 0; s.money = 50000; s.day = i; const sc = G.get('law_raid', s)!; sc.choices[1].r!(s); if (!s.over) fineOnly++; }
    expect(fineOnly).toBeGreaterThan(5);
  });
  it('the daily checks run with the other end-of-turn rules: raids find undocumented foreigners far more often; citizens are never raided', () => {
    const count = (make: () => G.State): number => { let n = 0; const s = make(); for (let d = 1; d <= 400; d++) { s.day = d; s.queue = []; L.tickLaw(s); if (s.queue.includes('law_raid')) n++; } return n; };
    const undoc = count(() => { const s = G.newState('U', 'tajik'); s.docs.reg = 0; return s; });
    const legal = count(() => { const s = G.newState('U', 'tajik'); s.docs.reg = 999; s.docs.patent = 999; return s; });
    const cit = count(() => G.newState('C', 'region'));
    expect(undoc).toBeGreaterThan(legal); expect(cit).toBe(0);
    const s = citizen(); s.day = 3; L.lawOf(s).ticked = 0; L.lawOf(s).heat = 30; afterTurn(s); expect(L.lawOf(s).heat).toBe(21);   // hooked into turn.ts
  });
  it('a foreigner long without papers goes on the register of controlled persons, and comes off when the papers are in order', () => {
    const s: G.State | null = G.newState('R', 'tajik'); s.docs.reg = 0;
    for (let d = 1; d <= 30; d++) { s.day = d; s.queue = []; L.tickLaw(s); } expect(L.lawOf(s).register).toBe(false);   // counted from the first look (day 1)
    s.day = 31; L.tickLaw(s); expect(L.lawOf(s).register).toBe(true);
    s!.docs.reg = 90; s!.docs.patent = 90; s!.day++; L.tickLaw(s!); expect(L.lawOf(s!).register).toBe(false);
  });
});

describe('the Police & law app', () => {
  it('shows the offences with articles and risk, a theft to report, the record and the rights', () => {
    resetLawView();
    const s = citizen(); const host = document.body.appendChild(document.createElement('div'));
    const draw = (): void => { host.innerHTML = lawHtml(s); wireLaw(host, s, { notify: () => undefined, again: draw }); };
    draw(); expect(host.querySelectorAll('.lwCrime')).toHaveLength(5); expect(host.textContent).toMatch(/KoAP 7\.27/);
    host.querySelector<HTMLButtonElement>('[data-lw="commit:drink"]')!.click(); expect(L.lawOf(s).crimes).toBe(1);
    L.theft(s, 'street'); host.querySelector<HTMLButtonElement>('[data-lw="tab:call"]')!.click();
    host.querySelector<HTMLButtonElement>('[data-lw^="report:"]')!.click(); expect(host.textContent).toMatch(/under investigation/);
    host.querySelector<HTMLButtonElement>('[data-lw="tab:rights"]')!.click(); expect(host.textContent).toMatch(/112/);
    host.querySelector<HTMLButtonElement>('[data-lw="tab:record"]')!.click(); expect(host.textContent).toMatch(/violations on record/);
  });
});

describe('the drug-courier offer', () => {
  it('refuse, report it, or take it: taking it is usually an arrest under UK 228.1; a foreigner is expelled', () => {
    const s = citizen('Ref'); const sc = G.get('law_drugs', s)!; expect(sc.choices).toHaveLength(3);
    const h = L.lawOf(s).helped; sc.choices[1].r!(s); expect(L.lawOf(s).helped).toBe(h + 1);
    let arrested = 0;
    for (let i = 0; i < 20; i++) { const x = citizen('D' + i); x.day = i; G.get('law_drugs', x)!.choices[2].r!(x); if (L.convicted(x)) arrested++; }
    expect(arrested).toBeGreaterThan(8);
    const m = G.newState('Fm', 'uzbek'); m.queue = []; for (let i = 0; i < 30 && !m.over; i++) { m.day = i; G.get('law_drugs', m)!.choices[2].r!(m); }
    expect(m.over).toBe('deported');
  });
});
