// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { candidatesFor, standings, decreeFor, governorOf, vote, run, payOffice, popularity, civicOf, openWeek, daysLeft, RUN_FEE, ALLOWANCE, POLLING_PLACE } from '../src/election';
import { DECREES, weekOf } from '../src/decrees';
import { civicHtml, wireCivic } from '../src/civic-ui';
import { interiorFor, SPECIAL } from '../src/interiors';

const at = (day: number, city = 'Kazan'): G.State => { const s = G.newState('Tester', 'moscow'); s.city = city; s.day = day; s.queue = []; return s; };
const star = (s: G.State): void => { s.rep = 100; s.merit = 40; s.friends = 20; s.money = 100000; };

describe('the candidates and the count', () => {
  it('are the same for the same city and week, differ between them, and are well formed', () => {
    expect(candidatesFor('Kazan', 3)).toEqual(candidatesFor('Kazan', 3)); expect(candidatesFor('Kazan', 3)).not.toEqual(candidatesFor('Kazan', 4)); expect(candidatesFor('Kazan', 3)).not.toEqual(candidatesFor('Perm', 3));
    for (let w = 1; w < 12; w++) {
      const c = candidatesFor('Kazan', w); expect(c.length).toBe(6); expect(new Set(c.map(x => x.id)).size).toBe(6);
      for (const x of c) { expect(x.name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/); expect(x.slogan.length).toBeGreaterThan(8); expect(DECREES.some(d => d.id === x.policy)).toBe(true); expect(x.weight).toBeGreaterThanOrEqual(0.4); expect(x.weight).toBeLessThanOrEqual(2.0); }
    }
  });
  it('count the votes in order, with shares that add up to one, and the winner first', () => {
    const st = standings(at(10), 2); expect(st.week).toBe(2); expect(st.rows.length).toBe(6); expect(st.winner).toBe(st.rows[0]);
    expect(st.rows.reduce((t, r) => t + r.share, 0)).toBeCloseTo(1, 6); for (let i = 1; i < st.rows.length; i++) expect(st.rows[i].votes).toBeLessThanOrEqual(st.rows[i - 1].votes);
    expect(st.total).toBeGreaterThan(150000); expect(st.total).toBeLessThan(200000); expect(st.youVoted).toBeNull();
  });
  it('reading them never changes the game state', () => {
    const s = at(10); const before = JSON.stringify(s); standings(s, 2); decreeFor(s); governorOf(s); payOffice(s); openWeek(s); daysLeft(s); expect(JSON.stringify(s)).toBe(before);
  });
});

describe('the decree of the week comes from the election', () => {
  it('is the winner\'s platform from the second week on, the same all week, and the first week has its own', () => {
    const s = at(0); expect(governorOf(s)).toBeNull(); expect(DECREES.some(d => d.id === decreeFor(s).id)).toBe(true);
    for (let d = 7; d < 14; d++) { const t = at(d); expect(decreeFor(t)).toBe(decreeFor(at(7))); expect(decreeFor(t).id).toBe(standings(t, 1).winner.policy); expect(governorOf(t)?.name).toBe(standings(t, 1).winner.name); }
    expect(weekOf(at(6))).toBe(0); expect(weekOf(at(7))).toBe(1);
  });
  it('differs between weeks and between cities', () => {
    expect(new Set(Array.from({ length: 30 }, (_, w) => decreeFor(at(7 * w + 7)).id)).size).toBeGreaterThan(8);
    expect(new Set(G.CITIES.map(c => decreeFor(at(14, c)).id)).size).toBeGreaterThan(5);
  });
  it('the open election is next week\'s, and it closes at the end of this week', () => {
    expect(openWeek(at(9))).toBe(2); expect(daysLeft(at(7))).toBe(6); expect(daysLeft(at(13))).toBe(0); expect(daysLeft(at(9))).toBe(4);
  });
});

describe('voting', () => {
  it('only in person at the polling station, once a week, for a real candidate, and the vote is counted', () => {
    const s = at(9); const cand = standings(s, 2).rows[1].id;
    expect(vote(s, cand).ok).toBe(false); expect(vote(s, cand).msg).toMatch(/in person/); expect((s as unknown as { civic?: unknown }).civic).toBeUndefined();
    s.loc = POLLING_PLACE; expect(vote(s, 'nobody').ok).toBe(false); const before = standings(s, 2).rows.find(r => r.id === cand)!.votes;
    expect(vote(s, cand).ok).toBe(true); expect(standings(s, 2).rows.find(r => r.id === cand)!.votes).toBe(before + 1); expect(standings(s, 2).youVoted).toBe(cand);
    expect(vote(s, standings(s, 2).rows[2].id).msg).toMatch(/already/);
    s.day = 16; expect(vote(s, standings(s, 3).rows[0].id).ok).toBe(true);                    // a new week, a new vote
  });
  it('keeps only the last eight weeks of votes and candidacies', () => {
    const s = at(0); s.loc = POLLING_PLACE; s.money = 1e6;
    for (let w = 0; w < 14; w++) { s.day = 7 * w; vote(s, standings(s, w + 1).rows[0].id); run(s, DECREES[0].id); }
    expect(Object.keys(civicOf(s).voted).length).toBe(8); expect(Object.keys(civicOf(s).ran).length).toBe(8);
  });
});

describe('standing as a candidate', () => {
  it('costs the fee once, needs a real platform and enough money, and puts the player on the ballot', () => {
    const s = at(9); s.money = 100000; const m = s.money;
    expect(run(s, 'nothing').ok).toBe(false); expect(s.money).toBe(m);
    expect(run(s, DECREES[2].id, 'Free tea for all').ok).toBe(true); expect(s.money).toBe(m - RUN_FEE);
    const st = standings(s, 2); expect(st.rows.length).toBe(7); const me = st.rows.find(r => r.you)!; expect(me.name).toBe('Tester'); expect(me.policy).toBe(DECREES[2].id); expect(me.slogan).toBe('Free tea for all');
    expect(run(s, DECREES[3].id).msg).toMatch(/already/); expect(s.money).toBe(m - RUN_FEE);
    const poor = at(9); poor.money = RUN_FEE - 1; expect(run(poor, DECREES[0].id).ok).toBe(false); expect(poor.money).toBe(RUN_FEE - 1);
  });
  it('an ordinary player rarely wins, and a very well liked one wins every time and sets the decree', () => {
    const plain = at(9); plain.rep = 20; plain.merit = 0; plain.friends = 0; run(plain, DECREES[0].id); expect(standings(plain, 2).winner.you).toBeFalsy();
    const loved = at(9); star(loved); expect(popularity(loved)).toBeCloseTo(2.5, 5); run(loved, DECREES[5].id);
    expect(standings(loved, 2).winner.you).toBe(true);
    loved.day = 14; expect(decreeFor(loved).id).toBe(DECREES[5].id); expect(governorOf(loved)).toMatchObject({ you: true, name: 'Tester' });
  });
  it('the winner is paid the allowance every day of the week, the others are not, and nobody is paid before the first election', () => {
    const loved = at(9); star(loved); run(loved, DECREES[1].id); const m = loved.money;
    loved.day = 13; expect(payOffice(loved)).toBe(0);                                         // still the week before
    loved.day = 14; expect(payOffice(loved)).toBe(ALLOWANCE); expect(loved.money).toBe(m + ALLOWANCE); loved.day = 20; expect(payOffice(loved)).toBe(ALLOWANCE); loved.day = 21; expect(payOffice(loved)).toBe(0);
    const plain = at(9); plain.rep = 20; plain.merit = 0; plain.friends = 0; run(plain, DECREES[1].id); plain.day = 14; const pm = plain.money; expect(payOffice(plain)).toBe(0); expect(plain.money).toBe(pm);
    const first = at(0); expect(payOffice(first)).toBe(0);
  });
  it('the game pays it at the turn of the day', () => {
    const s = at(9); star(s); run(s, DECREES[1].id); s.day = 13; s.slot = 2; const m = s.money; const notes = G.endDay(s);
    expect(s.day).toBe(14); expect(s.money).toBeGreaterThanOrEqual(m + ALLOWANCE - 50000); expect(notes.join(' ')).toMatch(/allowance/);
  });
});

describe('the city hall screen', () => {
  it('shows the decree, the candidates and the count, asks to go to the polling station when elsewhere, and lets one vote there', () => {
    const s = at(9); const html = civicHtml(s); expect(html).toContain(decreeFor(s).text); expect(html).toContain('cvRow'); expect(html).toMatch(/polling station/); expect(html).not.toContain('cvVote');
    expect((html.match(/cvRow/g) ?? []).length).toBe(6);
    s.loc = POLLING_PLACE; const box = document.createElement('div'); box.innerHTML = civicHtml(s); expect(box.querySelectorAll('.cvVote').length).toBe(6);
    const notes: string[] = []; let again = 0; wireCivic(box, s, { notify: m => notes.push(m), again: () => { again++; } });
    (box.querySelector('.cvVote') as HTMLButtonElement).click(); expect(notes).toEqual(['Your vote is counted.']); expect(again).toBe(1);
    const after = document.createElement('div'); after.innerHTML = civicHtml(s); expect(after.querySelectorAll('.cvVote').length).toBe(0); expect(after.textContent).toMatch(/your vote/);
  });
  it('lets the player register, shows that they are on the ballot, and the first week says no election was held', () => {
    const s = at(9); s.money = 50000; const box = document.createElement('div'); box.innerHTML = civicHtml(s); expect(box.querySelector('#cvRun')).toBeTruthy(); expect(box.querySelectorAll('#cvPolicy option').length).toBe(4);
    wireCivic(box, s, { notify: () => undefined, again: () => undefined }); (box.querySelector('#cvRun') as HTMLButtonElement).click();
    expect(s.money).toBe(50000 - RUN_FEE); const again = document.createElement('div'); again.innerHTML = civicHtml(s); expect(again.querySelector('#cvRun')).toBeNull(); expect(again.textContent).toMatch(/on the ballot/); expect(again.querySelectorAll('.cvRow.you').length).toBe(1);
    expect(civicHtml(at(2))).toMatch(/no election was held/);
  });
  it('the polling station has a ballot box that is a known special action', () => {
    const box = interiorFor('mfc', at(0))!.props.find(p => p.action === 'vote')!; expect(box).toBeTruthy(); expect(box.label).toMatch(/Ballot box/); expect((SPECIAL as readonly string[]).includes('vote')).toBe(true);
    expect(interiorFor('guvm', at(0))!.props.some(p => p.action === 'vote')).toBe(false);
  });
});
