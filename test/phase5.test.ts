// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { RENTALS, rentIn, cannotMove, moveTo, rentalOf, tickBills, unpaid, payBills, billFor, homeOf, MAX_WARNINGS, DUE_DAYS } from '../src/housing';
import { dwellingOf } from '../src/homes';
import { SKILLS, COURSES, studyOf, skillOf, cannotEnrol, enrol, lectureScenario, homework, examReady, passChance, sitExam, lessonOf, answerWord, lessonDone, russianLevel, WORDS } from '../src/study';
import { openStudy, openHousing } from '../src/study-ui';
import { kitchenOf } from '../src/cooking';

const fresh = (o = 'tajik'): G.State => { const s = G.newState('T', o); s.queue = []; s.money = 200000; s.energy = 90; return s; };
const firstOfMonth = (s: G.State, month: number, year = 2026): void => { s.day = Math.round((new Date(year, month - 1, 1).getTime() - G.START.getTime()) / 864e5); };

describe('moving up', () => {
  it('a kommunalka, a studio and a two-room flat, dearer in Moscow and Saint Petersburg', () => {
    expect(RENTALS.map(r => r.id)).toEqual(['kommunalka', 'studio', 'tworoom']);
    for (let i = 1; i < RENTALS.length; i++) expect(RENTALS[i].rent).toBeGreaterThan(RENTALS[i - 1].rent);
    expect(rentIn(RENTALS[1], 'Kazan')).toBeLessThan(rentIn(RENTALS[1], 'Moscow'));
  });
  it('moving pays a deposit of two weeks, sets the weekly rent and changes the home that is drawn; the landlords ask for a job or savings', () => {
    const s = fresh(); s.job = null; s.rep = 30;
    expect(cannotMove(s, 'studio')).toContain('job'); expect(cannotMove(s, 'tworoom')).toContain('job');
    const rent = rentIn(RENTALS[0], s.city); expect(moveTo(s, 'kommunalka').ok).toBe(true); expect(s.money).toBe(200000 - rent * 2); expect(s.rent).toBe(rent);
    expect(rentalOf(s)!.id).toBe('kommunalka'); expect(dwellingOf(s)).toBe('panelka'); expect(cannotMove(s, 'kommunalka')).toContain('already');
    s.job = 'courier'; expect(moveTo(s, 'studio').ok).toBe(true); expect(dwellingOf(s)).toBe('studio');
    const poor = fresh(); poor.money = 1000; expect(moveTo(poor, 'kommunalka').ok).toBe(false); expect(poor.rent).toBe(fresh().rent);
    const owner = fresh(); owner.housing = 'flat'; expect(cannotMove(owner, 'studio')).toContain('own');
  });
  it('a player who never moves keeps the home of their character and never gets a bill', () => {
    const s = fresh(); expect(dwellingOf(s)).toBe('shared'); firstOfMonth(s, 10); expect(tickBills(s)).toEqual([]); expect(unpaid(s)).toEqual([]);
  });
});

describe('utility bills', () => {
  it('a bill on the first of each month, larger in the heating season; paid from the phone', () => {
    const s = fresh(); moveTo(s, 'kommunalka'); firstOfMonth(s, 10);
    const lines = tickBills(s); expect(lines.join(' ')).toContain('utility bill'); expect(unpaid(s).length).toBe(1); expect(tickBills(s)).toEqual([]);
    const winter = billFor(s); firstOfMonth(s, 7, 2027); expect(billFor(s)).toBeLessThan(winter);
    firstOfMonth(s, 10); const m = s.money; expect(payBills(s).ok).toBe(true); expect(s.money).toBe(m - winter); expect(unpaid(s)).toEqual([]); expect(payBills(s).ok).toBe(false);
  });
  it('paying late brings a warning and a five per cent penalty each week, at most three, and never an eviction', () => {
    const s = fresh(); moveTo(s, 'kommunalka'); firstOfMonth(s, 11); tickBills(s); const base = unpaid(s)[0].amount;
    s.day += DUE_DAYS; expect(tickBills(s).join(' ')).toContain('warning 1'); s.day += 7; tickBills(s); s.day += 7; tickBills(s); s.day += 7; tickBills(s);
    const b = unpaid(s).find(x => x.amount > base)!; expect(b.warnings).toBe(MAX_WARNINGS); expect(b.amount).toBeGreaterThan(base); expect(b.amount).toBeLessThan(base * 1.2);
    expect(s.housing).toBe('rented'); expect(rentalOf(s)!.id).toBe('kommunalka');
    expect(homeOf(s).bills.length).toBeLessThanOrEqual(12);
  });
});

describe('skills and courses', () => {
  it('six skills, cooking read from the kitchen; seven courses with Russian from A1 to C1 in order', () => {
    expect(SKILLS.map(k => k.id)).toEqual(['cooking', 'fitness', 'russian', 'programming', 'charisma', 'music']);
    const s = fresh(); kitchenOf(s).skill = 33; expect(skillOf(s, 'cooking')).toBe(33);
    expect(COURSES.filter(c => c.level).map(c => c.level)).toEqual(['A1', 'A2', 'B1', 'C1']);
    expect(cannotEnrol(s, 'ru-a2')).toBeTruthy(); expect(cannotEnrol(s, 'ru-a1')).toBeNull();
  });
  it('a course: the fee, lectures (each a part of the day), homework at home once a part of the day, then the exam', () => {
    const s = fresh(), c = COURSES[0]; expect(enrol(s, c.id).ok).toBe(true); expect(s.money).toBe(200000 - c.fee); expect(cannotEnrol(s, 'prog')).toContain('Finish');
    expect(examReady(s)).toBe(false); expect(sitExam(s, 0).ok).toBe(false);
    for (let i = 0; i < c.lectures; i++) { const sc = lectureScenario(s)!; expect(sc.free).toBeFalsy(); const slot = s.slot, day = s.day; G.choose(s, sc, 0); expect(s.slot !== slot || s.day !== day).toBe(true); s.energy = 90; }
    expect(lectureScenario(s)).toBeNull();
    expect(homework(s).ok).toBe(true); expect(homework(s).ok).toBe(false);
    for (let i = 1; i < c.homework; i++) { s.slot = (s.slot + 1) % 3; if (s.slot === 0) s.day++; expect(homework(s).ok).toBe(true); }
    expect(examReady(s)).toBe(true); expect(passChance(s)).toBeGreaterThan(0.5);
    expect(sitExam(s, 0.99).ok).toBe(false); expect(examReady(s)).toBe(false);                                    // failed: two more pieces of homework
    for (let i = 0; i < 2; i++) { s.slot = (s.slot + 1) % 3; if (s.slot === 0) s.day++; homework(s); }
    const r0 = skillOf(s, 'russian'); expect(sitExam(s, 0).ok).toBe(true); expect(studyOf(s).certs).toEqual(['ru-a1']); expect(skillOf(s, 'russian')).toBeGreaterThan(r0); expect(russianLevel(s)).toBe('A1');
    expect(cannotEnrol(s, 'ru-a1')).toContain('already');
  });
  it('five Russian words a day with four choices each; a right answer raises Russian once', () => {
    const s = fresh(), l = lessonOf(s); expect(l.length).toBe(5); expect(new Set(l.map(w => w.ru)).size).toBe(5);
    for (const w of l) { expect(w.options).toContain(w.en); expect(w.options.length).toBe(4); expect(new Set(w.options).size).toBe(4); }
    expect(answerWord(s, 0, 'nonsense').ok).toBe(false); expect(answerWord(s, 0, l[0].en).ok).toBe(true); expect(answerWord(s, 0, l[0].en).ok).toBe(false);
    expect(skillOf(s, 'russian')).toBe(1); expect(lessonDone(s)).toBe(1);
    const t = fresh(); t.day = 1; expect(lessonOf(t).map(w => w.ru)).not.toEqual(l.map(w => w.ru));
    expect(WORDS.length).toBeGreaterThanOrEqual(40); for (const [ru] of WORDS) expect(ru).toMatch(/^[а-яё ]+$/);
  });
});

describe('the Study and Home apps', () => {
  it('Study lists skills, courses and the words; a lecture is handed to the game as a scenario; the word buttons answer and speak', () => {
    const s = fresh(), host = document.createElement('div'); const scenes: string[] = []; const said: string[] = []; let back = 0;
    openStudy(host, s, { back: () => { back++; }, refresh: () => undefined, scenario: sc => scenes.push(sc.id), speak: w => said.push(w), random: () => 0 });
    expect(host.querySelectorAll('.skRow').length).toBe(6); expect(host.querySelectorAll('[data-enrol]').length).toBe(COURSES.length);
    host.querySelector<HTMLButtonElement>('[data-enrol="ru-a1"]')!.click(); host.querySelector<HTMLButtonElement>('[data-ap="lecture"]')!.click(); expect(scenes).toEqual(['lecture_ru-a1']);
    host.querySelector<HTMLButtonElement>('[data-ap="hw"]')!.click(); expect(studyOf(s).course!.homework).toBe(1);
    const w = lessonOf(s)[0]; host.querySelector<HTMLButtonElement>(`[data-word="0"][data-ans="${w.en}"]`)!.click(); expect(lessonDone(s)).toBe(1);
    host.querySelector<HTMLButtonElement>('[data-say]')!.click(); expect(said.length).toBe(1);
    host.querySelector<HTMLButtonElement>('[data-ap="back"]')!.click(); expect(back).toBe(1);
  });
  it('Home shows the rent, moves the player and pays the bills', () => {
    const s = fresh(), host = document.createElement('div');
    openHousing(host, s, { back: () => undefined, refresh: () => undefined, scenario: () => undefined });
    expect(host.querySelectorAll('[data-move]').length).toBe(3); host.querySelector<HTMLButtonElement>('[data-move="kommunalka"]')!.click();
    expect(rentalOf(s)!.id).toBe('kommunalka'); expect(host.querySelector('[data-ap="pay"]')).toBeTruthy();
    const m = s.money; host.querySelector<HTMLButtonElement>('[data-ap="pay"]')!.click(); expect(s.money).toBeLessThan(m); expect(unpaid(s)).toEqual([]);
  });
});
