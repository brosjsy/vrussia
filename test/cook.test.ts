// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import * as C from '../src/cook';
import { ING, PREP, TYPES, CUISINES, LEFTOVER, DONENESS, SAFETY } from '../src/cook-data';
import { homeOf } from '../src/homelife';
import { RU } from '../src/cook-ru';
import { DISHES_A } from '../src/cook-dishes-a';
import { DISHES_B } from '../src/cook-dishes-b';
import { DISHES_C } from '../src/cook-dishes-c';
import { DISHES_D } from '../src/cook-dishes-d';
import { dishSvg } from '../src/cook-art';
import { cookHtml, wireCook, resetCookView } from '../src/cook-ui';
import { needsOf } from '../src/needs';
import { writeFileSync } from 'node:fs';

const at = (name = 'Ade', o = 'student'): G.State => { const s = G.newState(name, o); s.queue = []; s.loc = 'home'; s.money = 500000; s.energy = 100; s.slot = 0; needsOf(s); C.cookOf(s).kit = Object.keys(C.KIT); C.cookOf(s).xp = 5000; return s; };
/** Answers every question right (or wrong). */
const answer = (c: C.Challenge, right: boolean): C.Answer[] => c.questions.map((q, qi) => ({ qi, chosen: q.options.findIndex(o => o.ok === right) }));
beforeAll(() => { C.addDishes(DISHES_A); C.addDishes(DISHES_B); C.addDishes(DISHES_C); C.addDishes(DISHES_D); });

describe('the cooking challenge', () => {
  it('every dish line is sound: a unique id, both names, a known cuisine, kind and ingredients, a time and a level', () => {
    const all = [...DISHES_A, ...DISHES_B, ...DISHES_C, ...DISHES_D], ids = all.map(d => d[0]);
    expect(new Set(ids).size, ids.filter((x, i) => ids.indexOf(x) !== i).join(' ')).toBe(ids.length);
    expect(C.DISHES.length).toBe(all.length); expect(all.length).toBeGreaterThanOrEqual(1000);
    const bad: string[] = [];
    for (const [id, name, ru, cu, type, ings, min, lvl] of all) {
      if (!name || !/[А-Яа-яЁё]/.test(ru) || !CUISINES[cu] || !TYPES[type] || !(min > 0) || ![1, 2, 3].includes(lvl)) bad.push(id);
      for (const k of ings.split(' ')) if (!ING[k]) bad.push(`${id}:${k}`);
    }
    expect(bad).toEqual([]);
  });
  it('every ingredient kind that is prepared has its question; every kind of dish has four steps, each with mistakes and the lesson', () => {
    for (const k of Object.values(ING)) expect(PREP[k[3]], k[0]).toBeDefined();
    for (const [id, t] of Object.entries(TYPES)) { expect(t.steps.length, id).toBe(4); for (const st of t.steps) { expect(st.bad.length).toBeGreaterThanOrEqual(2); for (const b of st.bad) expect(b[1].length).toBeGreaterThan(5); } }
  });
  it('a challenge: the shelf has the dish\'s ingredients and some that do not belong; the raw chicken is asked about first and washing it is wrong', () => {
    const c = C.challengeOf('jollof', 'x')!;
    for (const k of c.dish.ings) expect(c.shelf).toContain(k);
    expect(c.shelf.length).toBeGreaterThan(c.dish.ings.length + 3);
    const q = c.questions[0]; expect(q.ing).toBe('chicken'); expect(q.danger).toBe(true);
    const wash = q.options.find(o => /Rinse it under the tap/.test(o.t))!; expect(wash.ok).toBe(false); expect(wash.why).toMatch(/do not wash/);
    expect(c.questions.some(x => /Is it cooked\?|Done\?/.test(x.q))).toBe(true);                 // chicken is checked for doneness
    expect(c.questions[c.questions.length - 1].q).toBe('The leftovers');
    expect(C.challengeOf('jollof', 'x')).toEqual(c);                                               // the same seed gives the same challenge
  });
  it('red kidney beans must boil hard; frozen food thaws in the fridge', () => {
    const c = C.challengeOf('lobio')!, q = c.questions.find(x => x.ing === 'kidney')!;
    expect(q.options.find(o => o.ok)!.t).toMatch(/boil hard for at least 10 minutes/);
    expect(PREP.frozen!.ok).toMatch(/fridge/);
  });
  it('cooking right: three stars, the shopping paid, staples kept in the pantry, the player fed, leftovers in the fridge, experience gained', () => {
    const s = at(), c = C.challengeOf('borscht')!, m = s.money; needsOf(s).hunger = 20;
    const o = C.cook(s, c, c.dish.ings, answer(c, true));
    expect(o.ok).toBe(true); expect(o.stars).toBe(3); expect(o.ill).toBe(false); expect(o.mistakes).toEqual([]);
    expect(m - s.money).toBe(o.cost); expect(o.cost).toBeGreaterThan(0);
    expect(C.cookOf(s).pantry).toContain('ketchup'); expect(C.cookOf(s).pantry).not.toContain('beet');
    expect(needsOf(s).hunger).toBeGreaterThan(50); expect(C.cookOf(s).meals.length).toBe(1); expect(C.cookOf(s).xp).toBeGreaterThan(0);
    expect(C.shoppingOf(s, ['ketchup', 'turnip']).buy).toEqual(['turnip']);                      // the tomato paste is already at home
    expect(C.leftoversLeft(s)).toBe(2); expect(C.eatLeftovers(s).ok).toBe(true); s.day += 4; expect(C.leftoversLeft(s)).toBe(0);
  });
  it('cooking wrong: no stars, every mistake explained, danger mistakes can make the player ill (and stop cooking for the rest of the day)', () => {
    let ill = false;
    for (let i = 0; i < 10 && !ill; i++) {
      const s = at(`Cook${i}`), c = C.challengeOf('chickenoven')!;
      const o = C.cook(s, c, [...c.dish.ings.slice(1), 'sugar'], answer(c, false));
      expect(o.stars).toBe(0); expect(o.forgot).toEqual(['chicken']); expect(o.wrongPicks).toEqual(['sugar']);
      expect(o.mistakes.length).toBe(c.questions.length); expect(o.mistakes.every(x => x.why.length > 5)).toBe(true);
      if (o.ill) { ill = true; expect(s.health).toBeLessThan(at().health); expect(C.cannotCookDish(s, 'omelet')).toMatch(/recovering/); }
    }
    expect(ill).toBe(true);
  });
  it('requirements: at home, with energy and the money for the shopping', () => {
    const s = at(); s.loc = 'street'; expect(C.cannotCookDish(s, 'omelet')).toMatch(/home/);
    s.loc = 'home'; s.money = 0; expect(C.cannotCookDish(s, 'omelet')).toMatch(/costs/);
    s.money = 9999; s.energy = 3; expect(C.cannotCookDish(s, 'omelet')).toMatch(/tired/);
  });
  it('suggestions: similar dishes, what the pantry allows, a taste of home, the dish of the day; search by name or ingredient in both languages', () => {
    expect(C.similar('pelmeni').length).toBe(4);
    const f = C.fromIngredients(['potato', 'egg', 'onion']); expect(f[0].missing).toEqual([]); expect(f.every((x, i) => i === 0 || x.missing.length >= f[i - 1].missing.length)).toBe(true);
    const s = at(), sg = C.suggest(s); expect(sg[0].why).toBe('Dish of the day'); expect(sg.some(x => x.why === 'A taste of home' && x.d.cuisine === 'ng')).toBe(true);
    expect(C.search('borscht').some(d => d.id === 'borscht')).toBe(true); expect(C.search('Борщ').length).toBeGreaterThan(0);
    expect(C.search('plantain', 'ng').every(d => d.cuisine === 'ng')).toBe(true);
  });
  it('every dish has a picture: an SVG with its name, the same each time', () => {
    for (const d of C.DISHES) { const svg = dishSvg(d); expect(svg.startsWith('<svg')).toBe(true); expect(svg).not.toMatch(/NaN|undefined/); }
    expect(dishSvg(C.dishOf('borscht')!)).toBe(dishSvg(C.dishOf('borscht')!));
  });
  it('diets: halal has no pork or wine, vegetarian no meat or fish, vegan no animal products; search and suggestions follow the diet', () => {
    const halal = C.search('', 'all', 'all', 'halal'), veg = C.search('', 'all', 'all', 'veg'), vegan = C.search('', 'all', 'all', 'vegan');
    expect(halal.some(d => d.ings.includes('pork') || d.ings.includes('wine'))).toBe(false); expect(halal.some(d => d.id === 'plov')).toBe(true);
    expect(veg.some(d => d.ings.some(k => ['beef', 'chicken', 'fish', 'shrimp', 'sausage'].includes(k)))).toBe(false); expect(veg.some(d => d.id === 'syrniki')).toBe(true);
    expect(vegan.some(d => d.ings.some(k => ['egg', 'milk', 'butter', 'honey', 'tvorog'].includes(k)))).toBe(false); expect(vegan.some(d => d.id === 'dal' || d.id === 'falafel')).toBe(true);
    expect(vegan.length).toBeLessThan(veg.length); expect(veg.length).toBeLessThan(C.DISHES.length);
    const s = at(); C.cookOf(s).diet = 'veg'; expect(C.suggest(s).every(x => C.dietOk(x.d, 'veg'))).toBe(true);
  });
  it('what I have: ingredients named in free text (English or Russian) find the dishes with the least to buy', () => {
    expect(C.ingredientsIn('Potatoes, eggs, лук')).toEqual(expect.arrayContaining(['potato', 'egg', 'onion']));
    const f = C.fromIngredients(C.ingredientsIn('potato, egg, onion, oil')); expect(f.length).toBeGreaterThan(3);
  });
  it('sharing a dish once: with the partner (love), friends (social, reputation when good), the neighbours', () => {
    const s = at(), c = C.challengeOf('pelmeni')!; C.cook(s, c, c.dish.ings, answer(c, true));
    const rep = s.rep; expect(C.share(s, 'pelmeni', 'neighbours').ok).toBe(true); expect(s.rep).toBe(rep + 3);
    expect(C.share(s, 'pelmeni', 'guests').msg).toMatch(/already/);
    expect(C.share(s, 'borscht', 'guests').msg).toMatch(/Cook it first/);
    expect(C.share(s, 'pelmeni', 'partner').ok).toBe(false);
  });
  it('every question, answer, lesson and serving note has its Russian', () => {
    const all = new Set<string>(), st = (x: { q: string; ok: string; bad: [string, string][] }): void => { all.add(x.q); all.add(x.ok); for (const [a, b] of x.bad) { all.add(a); all.add(b); } };
    for (const p of Object.values(PREP)) st(p!); for (const t of Object.values(TYPES)) { all.add(t.serve); t.steps.forEach(st); } st(LEFTOVER); st(DONENESS); SAFETY.forEach(st);
    const missing = [...all].filter(t => !RU[t]); expect(missing).toEqual([]);
    for (const t of all) expect(RU[t], t).toMatch(/[А-Яа-яЁё]/);
  });
  it('equipment: a rented room has no oven until one is bought; an owned flat has one; the steamer, grill pan, jars and blender', () => {
    const s = at(); C.cookOf(s).kit = []; s.housing = 'rented'; s.rent = 3000;
    expect(C.cannotCookDish(s, 'chickenoven')).toMatch(/tabletop oven/); expect(C.cannotCookDish(s, 'manti')).toMatch(/steamer/);
    expect(C.cannotCookDish(s, 'saltedcucumbers')).toMatch(/jars/); expect(C.cannotCookDish(s, 'smoothie')).toMatch(/blender/); expect(C.cannotCookDish(s, 'borscht')).toBeNull();
    const m = s.money; expect(C.buyKit(s, 'oven').ok).toBe(true); expect(m - s.money).toBe(5900); expect(C.cannotCookDish(s, 'chickenoven')).toBeNull(); expect(C.buyKit(s, 'oven').ok).toBe(false);
    const f = at(); C.cookOf(f).kit = []; f.housing = 'flat'; expect(C.cannotCookDish(f, 'chickenoven')).toBeNull();
    f.housing = 'homeless'; expect(C.cannotCookDish(f, 'borscht')).toMatch(/no kitchen/);
  });
  it('seasons: fresh tomatoes are cheap in August and dear in January; flour costs the same', () => {
    const s = at(), month = (m: number): void => { while (G.dateOf(s).getMonth() + 1 !== m) s.day++; };
    month(8); const summer = C.priceOf(s, 'tomato'), flourS = C.priceOf(s, 'flour'); month(1); const winter = C.priceOf(s, 'tomato');
    expect(summer).toBeLessThan(ING.tomato[4]); expect(winter).toBeGreaterThan(ING.tomato[4]); expect(C.priceOf(s, 'flour')).toBe(flourS);
  });
  it('the dish of the day cooked well gives double experience', () => {
    const s = at(), d = C.dishOfDay(s)!, c = C.challengeOf(d.id)!, t = at('Twin'); t.day = s.day + 1; while (C.dishOfDay(t)!.id === d.id) t.day++;
    const o = C.cook(s, c, c.dish.ings, answer(c, true)); C.cook(t, c, c.dish.ings, answer(c, true));
    expect(o.daily).toBe(true); expect(C.cookOf(s).xp - 5000).toBe((C.cookOf(t).xp - 5000) * 2);
  });
  it('the Kitchen screen: the list, a dish, the shelf, every question to the result, and the other tabs', () => {
    resetCookView(); const s = at(), host = document.createElement('div'), notes: string[] = [];
    const draw = (): void => { host.innerHTML = cookHtml(s); wireCook(host, s, { notify: m => notes.push(m), again: draw }); };
    const click = (sel: string): void => { const b = host.querySelector<HTMLButtonElement>(sel); expect(b, sel).not.toBeNull(); b!.click(); };
    draw(); expect(host.textContent).toMatch(/1\d{3} dishes cooked/); expect(host.querySelectorAll('.ckCard svg').length).toBeGreaterThan(10);
    const q = host.querySelector<HTMLInputElement>('#ckQ')!; q.value = 'Omelette'; q.dispatchEvent(new Event('input'));
    click('[data-ck="open:omelet"]'); expect(host.textContent).toMatch(/Take from the shelf/);
    for (const k of C.dishOf('omelet')!.ings) click(`[data-ck="pick:${k}"]`);
    click('[data-ck="start"]');
    for (let i = 0; i < 20 && host.querySelector('[data-ck^="ans:"]'); i++) { click('[data-ck^="ans:"]'); click('[data-ck="next"]'); }
    expect(host.querySelector('.ckStars')).not.toBeNull(); expect(C.cookOf(s).count.omelet).toBe(1);
    click('[data-ck="list"]');
    for (const t of ['fridge', 'book', 'kit']) { click(`[data-ck="tab:${t}"]`); expect(host.querySelector('.ckApp')).not.toBeNull(); }
    expect(host.textContent).toMatch(/Tabletop oven/); click('[data-ck="tab:book"]'); expect(host.textContent).toMatch(/Omelette/);
  });
  it('home life: every dish leaves dirty dishes, a full sink stops cooking; a safety question with every dish; tired cooks burn a finger', () => {
    const s = at(); homeOf(s).dishes = 0; const c = C.challengeOf('borscht')!; C.cook(s, c, c.dish.ings, answer(c, true)); expect(homeOf(s).dishes).toBe(4);
    homeOf(s).keysLost = true; expect(C.cannotCookDish(s, 'omelet')).toMatch(/lost your keys/); homeOf(s).keysLost = false;
    homeOf(s).dishes = 20; expect(C.cannotCookDish(s, 'omelet')).toMatch(/sink is full/);
    const host = document.createElement('div'); resetCookView(); const draw = (): void => { host.innerHTML = cookHtml(s); wireCook(host, s, { notify: () => undefined, again: draw }); };
    draw(); const q = host.querySelector<HTMLInputElement>('#ckQ')!; q.value = 'Omelette'; q.dispatchEvent(new Event('input')); host.querySelector<HTMLButtonElement>('[data-ck="open:omelet"]')!.click();
    host.querySelector<HTMLButtonElement>('[data-ck="pick:egg"]')!.click(); host.querySelector<HTMLButtonElement>('[data-ck="wash"]')!.click(); expect(homeOf(s).dishes).toBe(0); expect(C.cannotCookDish(s, 'omelet')).toBeNull();
    expect(c.questions.some(q => SAFETY.some(x => x.q === q.q) && q.danger)).toBe(true);
    let hurt = false; for (let i = 0; i < 12 && !hurt; i++) { const t = at(`Tired${i}`); t.energy = 20; const ch = C.challengeOf('omelet')!; const h = t.health; const o = C.cook(t, ch, ch.dish.ings, answer(ch, true)); if (o.tired) { hurt = true; expect(t.health).toBe(h - 3); expect(o.msg).toMatch(/burnt a finger/); } }
    expect(hurt).toBe(true);
  });
  it('progression: level 2 dishes open at Learner, level 3 at Home cook; suggestions only offer what is open; cuisine medals at ten dishes', () => {
    const s = at(); C.cookOf(s).xp = 0;
    expect(C.cannotCookDish(s, 'khinkali')).toMatch(/Level 3/); expect(C.cannotCookDish(s, 'borscht')).toMatch(/Level 2/); expect(C.cannotCookDish(s, 'omelet')).toBeNull();
    expect(C.suggest(s).filter(x => x.why === 'Your next challenge').every(x => x.d.level === 1)).toBe(true);
    C.cookOf(s).xp = 60; expect(C.cannotCookDish(s, 'borscht')).toBeNull(); expect(C.cannotCookDish(s, 'khinkali')).toMatch(/Home cook/);
    C.cookOf(s).xp = 250; expect(C.cannotCookDish(s, 'khinkali')).toBeNull();
    const ng = C.DISHES.filter(d => d.cuisine === 'ng').slice(0, 10); for (const d of ng) C.cookOf(s).count[d.id] = 1;
    const st = C.stampsOf(s); expect(st[0]).toMatchObject({ cuisine: 'ng', done: 10, master: true });
  });
  it('guests: this week\'s friends and their allergies and diets; a dish with their allergen ends the evening early; the filter shows only safe dishes', () => {
    const s = at(), g = C.guestsOf(s); expect(g.length).toBeGreaterThanOrEqual(3); expect(C.guestsOf(s)).toEqual(g);
    expect(C.safeFor(C.dishOf('kungpao')!, 'nuts')).toBe(false); expect(C.safeFor(C.dishOf('pelmeni')!, 'gluten')).toBe(false); expect(C.safeFor(C.dishOf('omelet')!, 'egg')).toBe(false);
    expect(C.safeFor(C.dishOf('borscht')!, 'nuts')).toBe(true); expect(C.safeFor(C.dishOf('sushi')!, 'fish')).toBe(false); expect(C.safeFor(C.dishOf('hummus')!, 'sesame')).toBe(false);
    // find a week with a nut-allergic guest and serve them kung pao
    let t = at('Host'); for (let d = 0; d < 400 && !C.guestsOf(t).some(x => x.need === 'nuts'); d += 7) t.day = d;
    expect(C.guestsOf(t).some(x => x.need === 'nuts')).toBe(true);
    const c = C.challengeOf('kungpao')!; C.cook(t, c, c.dish.ings, answer(c, true)); const rep = t.rep;
    const o = C.share(t, 'kungpao', 'guests'); expect(o.msg).toMatch(/allergic to nuts/); expect(t.rep).toBeLessThan(rep);
  });
  it('the family: feed them when there are children; call home once a week for a recipe and a free hint', () => {
    const s = at(); const c = C.challengeOf('omelet')!; C.cook(s, c, c.dish.ings, answer(c, true));
    expect(C.share(s, 'omelet', 'family').ok).toBe(false); s.kids = 2; const fl = s.famLove; expect(C.share(s, 'omelet', 'family').ok).toBe(true); expect(s.famLove).toBeGreaterThan(fl);
    const xp = C.cookOf(s).xp; expect(C.callHome(s).ok).toBe(true); expect(C.cookOf(s).xp).toBe(xp + 20); expect(C.cookOf(s).freeHint).toBe(true);
    expect(C.callHome(s).msg).toMatch(/again in 7 days/); s.day += 7; expect(C.callHome(s).ok).toBe(true);
  });
  it('the fridge: half a pack of fresh food is left for the next dish and keeps a few days; what goes off is thrown away and counted', () => {
    const s = at(); const c = C.challengeOf('omelet')!; C.cook(s, c, c.dish.ings, answer(c, true));
    expect(C.cookOf(s).fresh!.egg).toBe(s.day); expect(C.shoppingOf(s, ['egg', 'milk']).buy).toEqual([]);          // eggs and milk left over
    C.cook(s, C.challengeOf('omelet')!, c.dish.ings, answer(c, true)); expect(C.cookOf(s).fresh!.egg).toBeUndefined();  // used up
    const t = at('Fridge'); const ch = C.challengeOf('borscht')!; C.cook(t, ch, ch.dish.ings, answer(ch, true));
    t.day += 3; const f = C.fridgeOf(t); expect(f.thrown).toContain('beef'); expect(f.thrown).not.toContain('beet'); expect(C.cookOf(t).wasted).toBeGreaterThan(0);
  });
  it('shops: the market is cheaper and takes a part of the day, closed in the evening; haggling once a day; delivery is dearer', () => {
    const s = at(), keys = C.dishOf('borscht')!.ings, base = C.shoppingOf(s, keys).cost;
    C.cookOf(s).shop = 'market'; expect(C.shoppingOf(s, keys).cost).toBeLessThan(base); C.cookOf(s).shop = 'delivery'; expect(C.shoppingOf(s, keys).cost).toBeGreaterThan(base);
    C.cookOf(s).shop = 'market'; s.slot = 2; expect(C.cannotCookDish(s, 'omelet')).toMatch(/closed in the evening/); s.slot = 0;
    const h = C.haggle(s); expect(h.msg.length).toBeGreaterThan(5); expect(C.haggle(s).msg).toMatch(/already/);
    const c = C.challengeOf('omelet')!; C.cook(s, c, c.dish.ings, answer(c, true)); expect(s.slot).toBe(1);
  });
  it('the messages of the Kitchen have their Russian, with the names and numbers in them', () => {
    const s = at(); s.kids = 1; const c = C.challengeOf('pelmeni')!; C.cook(s, c, c.dish.ings, answer(c, true));
    const msgs = [C.share(s, 'pelmeni', 'family').msg, C.share(s, 'pelmeni', 'guests').msg, C.callHome(s).msg, C.callHome(s).msg, C.haggle(s).msg, C.buyKit(s, 'oven').msg, C.eatLeftovers(s).msg, C.eatLeftovers(s).msg, C.eatLeftovers(s).msg];
    s.loc = 'street'; msgs.push(C.cannotCookDish(s, 'omelet')!); s.loc = 'home'; C.cookOf(s).xp = 0; msgs.push(C.cannotCookDish(s, 'khinkali')!);
    for (const m of msgs) expect(C.MSG_RU.get(m), m).toMatch(/[А-Яа-яЁё]/);
    expect(C.MSG_RU.get(msgs[0])).toMatch(/Пельмени/);
  });
  it('kitchen achievements: the first dish, three stars, a safe run, the host', () => {
    const s = at(); for (const g of C.guestsOf(s)) g.need = null;
    let k = 0; for (const d of C.DISHES.filter(x => x.level === 1).slice(0, 10)) { const c = C.challengeOf(d.id)!; C.cook(s, c, c.dish.ings, answer(c, true)); k++; homeOf(s).dishes = 0; s.energy = 100; }
    const got = G.checkAchievements(s).map(a => a.id); expect(got).toEqual(expect.arrayContaining(['cook1', 'cook3star', 'cooksafe'])); expect(got).not.toContain('cook25');
    expect(k).toBe(10);
  });
  it('writes the list of dishes (docs/DISHES.md)', () => {
    const by = new Map<string, C.DishInfo[]>(); for (const d of C.DISHES) by.set(d.cuisine, [...(by.get(d.cuisine) ?? []), d]);
    const lines = ['# Dishes of the Kitchen app', '', `Written by test/cook.test.ts from src/cook-dishes-*.ts. **${C.DISHES.length} dishes** in ${by.size} cuisines; ${Object.keys(ING).length} ingredients; ${Object.keys(TYPES).length} kinds of dish, each cooked in four steps with the usual mistakes.`, ''];
    for (const [cu, ds] of by) { lines.push(`## ${CUISINES[cu][0]} (${ds.length})`, '', ds.map(d => `${d.name} (${d.ru})`).join(' · '), ''); }
    writeFileSync('docs/DISHES.md', lines.join('\n')); expect(lines.length).toBeGreaterThan(20);
  });
});
