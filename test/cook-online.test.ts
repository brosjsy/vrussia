// @vitest-environment jsdom
// The Kitchen's online challenge from the game's side: the panel shows the day's table, and a score is sent only for today's dish and only when
// logged in. The connection to the server is a stand-in here (the server side is tested in server/test/cooking.test.ts).
import { describe, it, expect, vi, beforeAll } from 'vitest';
import * as C from '../src/cook';
import { DISHES_A } from '../src/cook-dishes-a';
import { DISHES_B } from '../src/cook-dishes-b';
import { DISHES_C } from '../src/cook-dishes-c';
import { DISHES_D } from '../src/cook-dishes-d';

const sent: { dish: string; score: number; stars: number }[] = [];
let signedIn = true;
vi.mock('../src/cloud', () => ({ cloud: () => ({
  session: () => (signedIn ? { userId: 'u1' } : null),
  cookToday: async (dish: string) => ({ ok: true, msg: '', data: { top: sent.filter(x => x.dish === dish).map(x => ({ username: 'tester', score: x.score, stars: x.stars })), mine: sent.length ? { score: sent[sent.length - 1].score, place: 1 } : null, count: sent.length } }),
  sendCookScore: async (dish: string, score: number, stars: number) => { sent.push({ dish, score, stars }); return { ok: true, msg: '', data: score }; },
}) }));
beforeAll(() => { C.addDishes(DISHES_A); C.addDishes(DISHES_B); C.addDishes(DISHES_C); C.addDishes(DISHES_D); });
const out = (score: number, stars: number): C.Outcome => ({ ok: true, msg: '', stars, score, cost: 0, mistakes: [], forgot: [], wrongPicks: [], ill: false, leftovers: true, firstTime: true });

describe('the online challenge in the game', () => {
  it('sends the score for today\'s dish when logged in, and says the place', async () => {
    const { sendIfToday } = await import('../src/cook-online');
    const today = C.dishOfRealDay()!; expect(today.level).toBe(1);
    expect(await sendIfToday(today.id, out(92, 3))).toMatch(/place is 1/); expect(sent).toEqual([{ dish: today.id, score: 92, stars: 3 }]);
    const other = C.DISHES.find(d => d.id !== today.id)!; expect(await sendIfToday(other.id, out(80, 2))).toBeNull();          // not today's dish
    signedIn = false; expect(await sendIfToday(today.id, out(95, 3))).toBeNull(); signedIn = true;                               // not logged in
    expect(sent.length).toBe(1);
  });
  it('the panel shows today\'s dish, the table and a button that starts it', async () => {
    const { fillPanel } = await import('../src/cook-online');
    const el = document.createElement('div'); let opened = '';
    await fillPanel(el, id => { opened = id; });
    expect(el.textContent).toMatch(/Today's online challenge/); expect(el.textContent).toMatch(/tester · 92%/); expect(el.textContent).toMatch(/1 player today/);
    el.querySelector<HTMLButtonElement>('[data-cko]')!.click(); expect(opened).toBe(C.dishOfRealDay()!.id);
  });
});
