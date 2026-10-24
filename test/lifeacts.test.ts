// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import * as A from '../src/lifeacts';
import { CATALOG } from '../src/catalog';
import { lifeHtml, wireLife, resetLifeView } from '../src/lifeacts-ui';
import { needsOf } from '../src/needs';

const at = (name = 'Lena', o = 'moscow'): G.State => { const s = G.newState(name, o); s.queue = []; s.loc = 'home'; s.money = 200000; s.energy = 100; s.slot = 0; needsOf(s); return s; };

describe('City life activities', () => {
  it('every activity has a known category, a name in both languages, and fulfils a real catalogue entry that points back here', () => {
    const cat = new Map(CATALOG.flatMap(c => c.items.map(a => [a.id, a] as const)));
    expect(A.ACTS.length).toBeGreaterThanOrEqual(45);
    expect(new Set(A.ACTS.map(a => a.id)).size).toBe(A.ACTS.length);
    for (const a of A.ACTS) {
      expect(A.CATS.some(c => c.id === a.cat), a.id).toBe(true); expect(a.ru, a.id).toMatch(/[А-Яа-я]/);
      if (a.cat2) { expect(cat.has(a.cat2), a.cat2).toBe(true); expect(cat.get(a.cat2)!.where).toBe('src/lifeacts.ts'); }
    }
  });
  it('doing one pays, spends energy, gives its effects, counts toward variety, and is limited by how often', () => {
    const s = at(); s.stress = 50; const m = s.money;
    expect(A.doAct(s, 'banya').ok).toBe(true); expect(m - s.money).toBe(1200); expect(s.stress).toBe(38); expect(needsOf(s).hygiene).toBeGreaterThan(50);
    expect(s.slot).toBe(1);                                                        // it took a part of the day
    expect(A.cannotDo(s, 'banya')).toMatch(/today/); expect(A.cannotDo(s, 'dentist')).toBeNull();
    A.doAct(s, 'dentist'); s.day += 5; s.slot = 0; expect(A.cannotDo(s, 'dentist')).toMatch(/Again in 25 days/);
    expect(A.variety(s).done).toBe(2);
  });
  it('requirements: home only, the season, a pet, a partner, citizenship, a job, health, an owned home, the big cities', () => {
    const s = at(); s.loc = 'work'; expect(A.cannotDo(s, 'delivery')).toMatch(/home/);
    s.day = 0; expect(A.cannotDo(s, 'skating')).toMatch(/winter/);                   // 1 September
    expect(A.cannotDo(s, 'walkdog')).toMatch(/no pet/); s.pet = { name: 'Murka', kind: 'cat', bond: 50 }; expect(A.cannotDo(s, 'walkdog')).toMatch(/dog/);
    expect(A.cannotDo(s, 'zags')).toMatch(/partner/); expect(A.cannotDo(s, 'sickleave')).toMatch(/no job/);
    const m = at('Mig', 'tajik'); expect(A.cannotDo(m, 'selfemployed')).toMatch(/citizens of Russia and of the EAEU/); expect(A.cannotDo(at(), 'consulate')).toMatch(/Russian citizen/);
    expect(A.cannotDo(at(), 'letout')).toMatch(/own/); const o = at(); o.city = 'Omsk'; o.day = 60; expect(A.cannotDo(o, 'scooter')).toMatch(/big cities|season/);
    const weak = at(); weak.health = 40; expect(A.cannotDo(weak, 'blood')).toMatch(/health 60/);
  });
  it('the driving school: ten lessons, then the exam at the traffic police; the licence opens carsharing', () => {
    const s = at('Driver'); s.know = 80; expect(A.cannotDo(s, 'carshare')).toMatch(/licence/);
    for (let i = 0; i < 30 && !s.flags.licence; i++) { s.day++; s.slot = 0; s.energy = 100; A.doAct(s, 'drivingschool'); }
    expect(s.flags.licence).toBe(true); expect(A.cannotDo(s, 'drivingschool')).toMatch(/licence/); expect(A.cannotDo(s, 'carshare')).toBeNull();
  });
  it('family: register the marriage, then the wedding; breaking up ends it', () => {
    const s = at(); s.partner = { name: 'Dima', kind: 'citizen', love: 50 };
    expect(A.cannotDo(s, 'wedding')).toMatch(/Register/); A.doAct(s, 'zags'); expect(s.flags.married).toBe(true); expect(s.partner.love).toBe(65);
    s.slot = 0; A.doAct(s, 'wedding'); expect(s.flags.weddingParty).toBe(true);
    s.slot = 0; A.doAct(s, 'breakup'); expect(s.partner).toBeNull(); expect(s.flags.married).toBe(false);
  });
  it('a lost passport can be restored; an appeal sometimes takes the last offence off the record', () => {
    const s = at(); expect(A.cannotDo(s, 'lostpassport')).toMatch(/safe/); s.flags.passportLost = true; A.doAct(s, 'lostpassport'); expect(s.flags.passportLost).toBe(false);
    let won = 0;
    for (let i = 0; i < 40; i++) { const x = at('Ap' + i); (x as G.State & { law: unknown }).law = { record: [{ day: 0, kind: 'admin', law: 'KoAP 20.20', what: 'x', sentence: 'fine' }] }; x.strikes = 1; A.doAct(x, 'appeal'); if (x.strikes === 0) won++; }
    expect(won).toBeGreaterThan(4); expect(won).toBeLessThan(30);
  });
  it('the app lists them by category, searches, and does them', () => {
    resetLifeView(); const s = at(); const host = document.body.appendChild(document.createElement('div'));
    const draw = (): void => { host.innerHTML = lifeHtml(s); wireLife(host, s, { notify: () => undefined, again: draw }); };
    draw(); expect(host.querySelectorAll('.svVac').length).toBe(A.ACTS.length);
    host.querySelector<HTMLButtonElement>('[data-la="cat:health"]')!.click(); expect(host.querySelectorAll('.svVac').length).toBe(A.ACTS.filter(a => a.cat === 'health').length);
    host.querySelector<HTMLButtonElement>('[data-la="cat:all"]')!.click();
    const q = host.querySelector<HTMLInputElement>('#laQ')!; q.value = 'banya'; q.dispatchEvent(new Event('input')); expect(host.querySelectorAll('.svVac').length).toBe(A.ACTS.filter(a => /banya/i.test(a.name)).length);
    host.querySelector<HTMLButtonElement>('[data-la="do:banya"]')!.click(); expect(A.lifeOf(s).count.banya).toBe(1); expect(host.textContent).toMatch(/1\/\d+/);
  });
});

describe('more of daily life', () => {
  it('an ambulance only when it is serious; selling a flat; the labour inspectorate; a funeral comes as a scene', () => {
    const s = at(); expect(A.cannotDo(s, 'ambulance')).toMatch(/serious/); s.health = 30; A.doAct(s, 'ambulance'); expect(s.health).toBe(48);
    const o = at('Own'); o.housing = 'flat'; o.slot = 0; const m = o.money; A.doAct(o, 'sellflat'); expect(o.money - m).toBe(4200000); expect(o.housing).toBe('rented');
    const w = at('Worker'); expect(A.cannotDo(w, 'labour')).toMatch(/job/);
    const f = G.get('life_funeral', at())!; expect(f.choices).toHaveLength(3); expect(f.text).toMatch(/wake/);
  });
});

describe('hundreds more, and the calendar', () => {
  it('over 300 activities in 24 categories, each with effects that parse; holidays only in their months', () => {
    expect(A.ACTS.length).toBeGreaterThanOrEqual(300);
    expect(new Set(A.ACTS.map(a => a.cat)).size).toBeGreaterThanOrEqual(24);
    const s = at(); s.day = 0;                                                        // 1 September
    expect(A.cannotDo(s, 'newyear')).toMatch(/December to January/); expect(A.cannotDo(s, 'cityday')).toBeNull();
    s.day = 120; expect(A.cannotDo(s, 'newyear')).toBeNull();                        // 30 December
    s.day = 290; s.city = 'Moscow'; expect(A.cannotDo(s, 'whitenights')).toMatch(/St Petersburg/); s.city = 'Saint Petersburg'; expect(A.cannotDo(s, 'whitenights')).toBeNull();
    expect(A.parseFx('s-5 so10 m300')).toEqual({ stress: -5, money: 300, need: { social: 10 } });
    expect(() => A.parseFx('zz5')).toThrow();
  });
  it('a working day, children, study and the car each need what they need', () => {
    const s = at(); expect(A.cannotDo(s, 'standup')).toMatch(/job/); expect(A.cannotDo(s, 'bedtime')).toMatch(/children/);
    expect(A.cannotDo(s, 'lecture')).toMatch(/students/); expect(A.cannotDo(s, 'fuel')).toMatch(/car/);
    s.kids = 1; s.loc = 'home'; expect(A.doAct(s, 'bedtime').ok).toBe(true);
  });
});
