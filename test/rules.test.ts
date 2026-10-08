import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const ids = (s: G.State): string[] => G.eligible(s, ['paper']).map(x => x.id);

describe('patent rules (Moscow 2026)', () => {
  const fresh = (): G.State => { const s = G.newState('T', 'tajik'); s.queue = []; s.flags.med = true; s.flags.insured = true; s.money = 100000; s.docs.reg = 300; return s; };

  it('the first patent payment is ₽10,000 and records the date', () => {
    const s = fresh();
    G.choose(s, G.get('patent_buy', s) as G.Scenario, 0);
    expect(s.money).toBe(90000);
    expect(s.docs.patent).toBeGreaterThanOrEqual(30);
    expect(s.marks.patent).toBeDefined();
  });

  it('asks you to notify the Interior Ministry, and filing it clears the obligation', () => {
    const s = fresh();
    G.choose(s, G.get('patent_buy', s) as G.Scenario, 0);
    expect(ids(s)).not.toContain('patent_notice');            // too early
    s.day += 10;
    expect(ids(s)).toContain('patent_notice');
    G.choose(s, G.get('patent_notice', s) as G.Scenario, 0);
    s.day += 100;
    expect(ids(s)).not.toContain('patent_suspended');
  });

  it('ignoring the notification suspends the patent for a year', () => {
    const s = fresh();
    G.choose(s, G.get('patent_buy', s) as G.Scenario, 1);
    s.day += 70; s.docs.patent = 50;
    expect(ids(s)).toContain('patent_suspended');
    G.choose(s, G.get('patent_suspended', s) as G.Scenario, 0);
    expect(s.docs.patent).toBe(0);
    expect(ids(s)).not.toContain('patent_buy');               // banned
    s.day += 366;
    expect(ids(s)).toContain('patent_buy');                   // the ban expires
  });
});

describe('first-month checklist', () => {
  it('differs by status', () => {
    const migrant = G.checklistFor(G.newState('T', 'tajik')).map(c => c.item.id);
    const citizen = G.checklistFor(G.newState('T', 'moscow')).map(c => c.item.id);
    expect(migrant).toContain('med'); expect(migrant).toContain('patent'); expect(migrant).toContain('reg');
    expect(citizen).not.toContain('med'); expect(citizen).not.toContain('reg');
  });

  it('buying a SIM and a transport card ticks the boxes and can be retried after a failure', () => {
    const s = G.newState('T', 'uzbek'); s.queue = [];
    const done = (id: string): boolean => G.checklistFor(s).find(c => c.item.id === id)!.done;
    expect(done('sim')).toBe(false);
    G.choose(s, G.get('shop_sim', s) as G.Scenario, 1);              // the risky option does not count
    expect(done('sim')).toBe(false);
    expect(G.eligible(s, ['shop']).map(x => x.id)).toContain('shop_sim');   // still available
    G.choose(s, G.get('shop_sim', s) as G.Scenario, 0);
    expect(done('sim')).toBe(false);                       // a foreigner is sent to complete identification first (2025 rules)
    s.flags.simId = true;
    G.choose(s, G.get('shop_sim', s) as G.Scenario, 0);
    expect(done('sim')).toBe(true);
    expect(G.eligible(s, ['shop']).map(x => x.id)).not.toContain('shop_sim');
    G.choose(s, G.get('shop_troika', s) as G.Scenario, 0);
    expect(done('card')).toBe(true);
  });

  it('completing everything unlocks the "Settled in" achievement', () => {
    const s = G.newState('T', 'moscow'); s.queue = [];
    s.flags.sim = true; s.flags.troika = true; s.bank.sber = true; s.clothes = 80; s.job = 'courier';
    expect(G.checkAchievements(s).map(a => a.id)).toContain('settled');
  });
});

describe('job search guidance', () => {
  it('tells a migrant without a patent what is missing, but not once they have one', () => {
    const s = G.newState('T', 'tajik'); s.queue = [];
    expect((G.dyn.job_search(s)).text).toContain('patent');
    s.docs.patent = 20;
    expect((G.dyn.job_search(s)).text).not.toContain('Tip:');
    const c = G.newState('T', 'moscow'); c.queue = [];
    expect((G.dyn.job_search(c)).text).not.toContain('Tip:');
    const st = G.newState('T', 'student'); st.queue = [];
    expect((G.dyn.job_search(st)).text).toContain('work permission');
  });
});

describe('admission calendar (2026 rules)', () => {
  it('results come on 7 August, after the 25 July deadline and 27 July lists', () => {
    expect(G.CAL).toContainEqual({ m: 8, d: 7, id: 'cal_admission' });
    expect(G.CAL.some(c => c.id === 'cal_admission' && c.m === 7)).toBe(false);
    const s = G.newState('T', 'moscow'); s.queue = [];
    const text = (G.get('cal_admission', s) as G.Scenario).text;
    for (const d of ['25 July', '27 July', '7 August']) expect(text).toContain(d);
  });

  it('applicants who never applied on the portal are not admitted, applicants with strong results are', () => {
    const no = G.newState('T', 'moscow'); no.queue = []; no.know = 100; no.flags.egeHigh = true;
    G.choose(no, G.get('cal_admission', no) as G.Scenario, 0);
    expect(no.flags.admitted).toBeFalsy();
    const yes = G.newState('T', 'moscow'); yes.queue = []; yes.know = 100; yes.flags.egeHigh = true; yes.flags.applied = true;
    const orig = Math.random; Math.random = () => 0.9;       // a neutral roll
    try { G.choose(yes, G.get('cal_admission', yes) as G.Scenario, 0); } finally { Math.random = orig; }
    expect(yes.flags.admitted).toBe(true);
  });
});

describe('health insurance is part of the patent route', () => {
  const base = (): G.State => { const s = G.newState('T', 'tajik'); s.queue = []; s.flags.med = true; s.money = 100000; s.docs.reg = 300; return s; };
  const ids = (s: G.State): string[] => G.eligible(s, ['paper']).map(x => x.id);

  it('without a policy the patent cannot be bought, but the insurance step is offered', () => {
    const s = base();
    expect(ids(s)).not.toContain('patent_buy');
    expect(ids(s)).toContain('dms_policy');
  });

  it('buying the policy unlocks the patent and removes the insurance step', () => {
    const s = base();
    G.choose(s, G.get('dms_policy', s) as G.Scenario, 0);
    expect(s.flags.insured).toBe(true);
    expect(s.money).toBe(95000);
    expect(ids(s)).toContain('patent_buy');
    expect(ids(s)).not.toContain('dms_policy');
  });

  it('the policy can be bought online with a name check and an SMS code', async () => {
    const { flows } = await import('../src/forms');
    const dms = flows.find(f => f.id === 'dms')!;
    const s = base();
    expect(dms.available(s)).toBeNull();
    const out = dms.finish(s, { plan: '6' });
    expect(out.fx.money).toBe(-9000);
    expect(out.fx.flag).toBe('insured');
  });

  it('citizens and residents do not need it', async () => {
    const { flows } = await import('../src/forms');
    const dms = flows.find(f => f.id === 'dms')!;
    expect(dms.available(G.newState('T', 'moscow'))).toContain('OMS');
    const r = base(); r.flags.rvp = true;
    expect(dms.available(r)).toContain('OMS');
    const done = base(); done.flags.insured = true;
    expect(dms.available(done)).toContain('already');
  });

  it('the insurance scene can be retried until it works', () => {
    const s = G.newState('T', 'uzbek'); s.queue = []; s.money = 100;
    G.choose(s, G.get('health_insurance', s) as G.Scenario, 0);   // cannot afford
    expect(s.flags.insured).toBeFalsy();
    expect(G.eligible(s, ['health']).map(x => x.id)).toContain('health_insurance');
  });
});

describe('language, history and law exam', () => {
  const taker = (): G.State => { const s = G.newState('T', 'uzbek'); s.queue = []; s.day = 60; s.know = 20; s.money = 50000; return s; };
  /** Runs the exam with a scripted sequence of random numbers. */
  const sit = (s: G.State, rolls: number[], choice = 0): void => {
    const orig = Math.random; let i = 0;
    Math.random = () => rolls[Math.min(i++, rolls.length - 1)];
    try { G.choose(s, G.get('rutest', s) as G.Scenario, choice); } finally { Math.random = orig; }
  };

  it('describes the three modules and the real price', () => {
    const sc = G.get('rutest', taker()) as G.Scenario;
    expect(sc.text).toContain('three modules');
    expect(sc.text).toContain('5,300');
    expect(sc.choices[0].t).toContain('5,300');
  });

  it('passing costs the full fee and clears the flag for good', () => {
    const s = taker();
    sit(s, [0.1]);                          // below the pass chance
    expect(s.flags.rutest).toBe(true);
    expect(s.money).toBe(50000 - 5300);
    expect(G.eligible(s, ['paper']).map(x => x.id)).not.toContain('rutest');
  });

  it('failing one module allows a half-price retake of just that module', () => {
    const s = taker();
    sit(s, [0.99, 0.1]);                    // fail the exam, then "only one module failed"
    expect(s.flags.rutest).toBeFalsy();
    expect(s.flags.exam_half).toBe(true);
    expect(s.money).toBe(50000 - 5300);
    const again = G.get('rutest', s) as G.Scenario;
    expect(again.text).toContain('half');
    expect(again.choices[0].t).toContain('2,650');
    sit(s, [0.1]);                          // pass the retake
    expect(s.flags.rutest).toBe(true);
    expect(s.flags.exam_half).toBeFalsy();
    expect(s.money).toBe(50000 - 5300 - 2650);
  });

  it('failing two or more modules means starting over at full price', () => {
    const s = taker();
    sit(s, [0.99, 0.9]);                    // fail, and not a single-module failure
    expect(s.flags.exam_half).toBeFalsy();
    expect((G.get('rutest', s) as G.Scenario).choices[0].t).toContain('5,300');
  });

  it('failing the retake sends you back to the full exam', () => {
    const s = taker(); s.flags.exam_half = true;
    sit(s, [0.99]);
    expect(s.flags.exam_half).toBeFalsy();
    expect(s.money).toBe(50000 - 2650);
  });

  it('you cannot sit it without the fee, and the "guaranteed result" is a scam', () => {
    const poor = taker(); poor.money = 1000;
    sit(poor, [0.1]);
    expect(poor.money).toBe(1000); expect(poor.flags.rutest).toBeFalsy();
    const bought = taker(); const before = bought.strikes;
    sit(bought, [0.5], 1);
    expect(bought.strikes).toBe(before + 1); expect(bought.flags.rutest).toBeFalsy();
  });
});

describe('buying a SIM card (foreigners, 2025 rules)', () => {
  it('a foreigner must complete mobile identification first, a citizen only needs a passport', () => {
    const f = G.newState('T', 'uzbek'); f.queue = []; f.money = 20000;
    G.choose(f, G.get('shop_sim', f) as G.Scenario, 0);
    expect(f.flags.sim).toBeFalsy();                                   // told to identify first
    expect(G.eligible(f, ['shop']).map(x => x.id)).toContain('shop_sim');   // and may try again later
    const c = G.newState('T', 'moscow'); c.queue = []; c.money = 20000;
    G.choose(c, G.get('shop_sim', c) as G.Scenario, 0);
    expect(c.flags.sim).toBe(true);
  });

  it('the identification service costs the translation fee, unlocks the SIM, and is not for citizens', async () => {
    const { flows } = await import('../src/forms');
    const svc = flows.find(x => x.id === 'simid')!;
    const f = G.newState('T', 'uzbek'); f.queue = []; f.money = 20000;
    expect(svc.available(f)).toBeNull();
    const out = svc.finish(f, { bio: 'bank' });
    expect(out.fx.money).toBe(-2500); expect(out.fx.flag).toBe('simId');
    G.apply(f, out.fx);
    expect(svc.available(f)).toContain('already identified');
    G.choose(f, G.get('shop_sim', f) as G.Scenario, 0);
    expect(f.flags.sim).toBe(true);
    expect(svc.available(G.newState('T', 'moscow'))).toContain('Citizens');
    const poor = G.newState('T', 'uzbek'); poor.money = 100;
    expect(svc.finish(poor, { bio: 'ruid' }).fx.flag).toBeUndefined();
  });
});

describe('registration deadlines at arrival (RBC explainer, 2025)', () => {
  const start = (o: string): number => G.newState('T', o).docs.reg;
  it('Tajik and Uzbek citizens have 15 days, EAEU workers 30', () => {
    expect(start('tajik')).toBe(15);
    expect(start('uzbek')).toBe(15);
    expect(start('kyrgyz')).toBe(30);
  });
  it('the intro and the registration scene tell the player the periods', () => {
    const s = G.newState('T', 'tajik');
    const intro = (G.get('intro_migrant', s) as G.Scenario).text;
    expect(intro).toContain('15 days'); expect(intro).toContain('Tajikistan and Uzbekistan');
    const reg = (G.get('reg_first', s) as G.Scenario).text;
    for (const part of ['7 days', '15 days', '30']) expect(reg).toContain(part);
  });
  it('the character cards promise 15 days, in both languages', () => {
    expect(G.origins.find(o => o.id === 'tajik')!.blurb).toContain('15 days');
  });
});
