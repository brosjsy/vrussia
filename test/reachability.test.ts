import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

/* Every scenario must be able to appear in at least one realistic game state. The generator below explores the dimensions the
   conditions depend on: city, season, weather, job, origin, progress through each storyline, immigration stage, family, money, business, fines... */
describe('no dead content', () => {
  it('every scenario is eligible in at least one state', () => {
    const cats = [...new Set(G.scenarios.map(s => s.cat))];
    const reachable = new Set<string>();
    const dayInMonth = (m: number): number => { const s = G.newState('x', 'moscow'); for (let d = 0; d < 400; d++) { s.day = d; if (G.dateOf(s).getMonth() + 1 === m) return d; } return 0; };
    const mark = (s: G.State): void => { for (const sc of G.eligible(s, cats)) reachable.add(sc.id); };
    const base = (origin: string, rich: boolean, month = 3, weather: G.Weather = 'clear'): G.State => {
      const s = G.newState('x', origin); s.queue = []; s.day = dayInMonth(month) + 7; s.weather = weather; s.flags = {}; s.marks = {};
      s.know = 80; s.rep = 70; s.friends = 6; s.famLove = 80; s.clothes = rich ? 90 : 20; s.health = rich ? 100 : 25; s.stress = 30;
      s.money = rich ? 3_000_000 : 500; s.job = rich ? 'nurse' : 'courier'; s.rent = rich ? 5000 : 0; s.strikes = rich ? 0 : 2;
      s.docs = { reg: rich ? 500 : 0, patent: rich ? 100 : 0, visa: rich ? 300 : 0 }; s.bank = rich ? { sber: true } : {}; s.kids = rich ? 1 : 0;
      s.partner = rich ? { name: 'P', kind: 'citizen', love: 80 } : null; s.pet = rich ? { name: 'R', kind: 'm', bond: 50 } : null; s.car = rich ? { model: 'x', value: 1 } : null;
      s.housing = rich ? 'village' : 'rented'; s.tmp = {}; return s;
    };
    // A. every city and season
    for (const city of G.CITIES) for (const m of [1, 5, 9]) for (const w of ['clear', 'snow'] as const) for (const rich of [false, true]) { const s = base('moscow', rich, m, w); s.city = city; mark(s); }
    // B. every job
    for (const j of G.jobs) for (const rich of [false, true]) { const s = base('moscow', rich); s.job = j.id; mark(s); }
    // C. every storyline step with the previous step done
    const arcIds = [...new Set(G.scenarios.filter(x => /^arc_/.test(x.id)).map(x => x.id.split('_')[1]))];
    for (const arc of arcIds) for (const origin of ['moscow', 'region', 'tajik', 'student']) for (let i = 1; i <= 4; i++) {
      for (const know of [80, 20]) {
        const s = base(origin, true, 11); s.know = know; s.rent = 3000; s.housing = 'rented'; s.flags.admitted = true; s.flags[`arc_${arc}_${i - 1}`] = true; s.marks[`arc_${arc}_${i - 1}`] = 0; s.partner = null; mark(s);
        const t = base(origin, true, 12); t.know = know; t.rent = 3000; t.housing = 'rented'; t.flags[`arc_${arc}_${i - 1}`] = true; t.marks[`arc_${arc}_${i - 1}`] = 0; t.job = 'courier'; mark(t);
      }
    }
    // D. special situations
    const specials: ((s: G.State) => void)[] = [
      s => { s.merit = 20; }, s => { s.merit = 60; }, s => { s.know = 20; }, s => { s.partner = { name: 'P', kind: 'foreigner', love: 10 }; s.flags.married = true; },
      s => { s.flags.proposed = true; s.partner = { name: 'P', kind: 'citizen', love: 80 }; }, s => { s.flags.med = true; s.flags.insured = false; },
      s => { s.flags.med = true; s.flags.insured = true; s.docs.patent = 5; },
      s => { s.flags.med = true; s.flags.insured = true; s.marks.patent = s.day - 20; s.docs.patent = 20; },
      s => { s.flags.med = true; s.flags.insured = true; s.marks.patent = s.day - 70; s.docs.patent = 20; },
      s => { s.flags.rutest = true; s.flags.rvpGround = true; s.day += 100; }, s => { s.flags.marriedCitizen = true; s.flags.rutest = true; s.flags.married = true; },
      s => { s.flags.childCitizen = true; s.flags.rutest = true; }, s => { s.flags.rvp = true; s.marks.rvp = s.day - 200; },
      s => { s.flags.rvp = true; s.flags.vnzh = true; s.marks.rvp = s.day - 400; s.marks.vnzh = s.day - 300; }, s => { s.flags.rvp = true; s.marks.rvp = s.day - 10; },
      s => { s.tmp.fines = 2000; s.tmp.fineDay = s.day - 30; }, s => { s.tmp.fines = 2000; s.tmp.fineDay = s.day - 70; }, s => { s.tmp.fines = 2000; s.tmp.fineDay = s.day - 2; },
      s => { s.flags.enrolled = true; s.marks.enrolled = s.day - 30; s.flags.license = false; }, s => { s.flags.license = true; s.car = null; },
      s => { s.pet = null; s.partner = { name: 'P', kind: 'citizen', love: 70 }; }, s => { s.tmp.matCap = 730000; }, s => { s.flags.microloan = true; s.money = 40000; },
      s => { s.bank = { vtb: true }; }, s => { s.bank = { tbank: true }; }, s => { s.bank = { sber: true, vtb: true, tbank: true }; },
      s => { s.biz = { kind: 'bakery', name: 'B', level: 1, staff: 1, rep: 50, regime: 'npd', profit: 200000, weeks: 20, revenueYear: 1 }; },
      s => { s.biz = { kind: 'bakery', name: 'B', level: 1, staff: 0, rep: 50, regime: 'ip', profit: -5000, weeks: 20, revenueYear: 1 }; },
      s => { s.flags.pregnant = true; s.marks.pregnant = s.day - 60; }, s => { s.flags.admitted = false; s.flags.expelled = true; },
      s => { s.health = 10; }, s => { s.booking = { dest: 'sochi', intl: false, dep: s.day + 3, stay: 3, price: 1, pnr: 'A', passenger: 'X', passport: 'Y', baggage: false, done: false }; },
    ];
    for (const origin of G.origins.map(o => o.id)) for (const rich of [false, true]) for (const f of specials) for (const m of [3, 7, 8, 12]) for (const w of ['clear', 'frost', 'rain', 'heat', 'snow'] as const) {
      if (w !== 'clear' && f !== specials[0] && f !== specials[2]) continue;           // weather only needs a couple of variants
      const s = base(origin, rich, m, w); f(s); mark(s);
    }
    const intentional = new Set(['biz_none']);                   // shown directly to non-owners, never drawn
    const dead = G.scenarios.filter(sc => !reachable.has(sc.id) && !intentional.has(sc.id)).map(sc => sc.id);
    expect(dead, `${dead.length} unreachable scenarios`).toEqual([]);
  });
});
