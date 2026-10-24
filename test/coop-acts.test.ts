// Every co-op challenge asks for a real City life activity (round 150: "I did my part" alone finished the tea challenge in manual testing).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { COOP_ACT } from '../src/coop-acts';
import { actOf, doAct, lifeOf } from '../src/lifeacts';
import * as G from '../src/engine';
import '../src/content';

describe('co-op challenges need the activity done in the game', () => {
  it('every co-op challenge of the server has an activity that exists', () => {
    const sql = readFileSync('server/migrations/0005_challenge_story.sql', 'utf8');
    const ids = [...sql.matchAll(/\('([a-z_]+)', \d+, \d+, 'coop'/g)].map(m => m[1]);
    expect(ids.length).toBeGreaterThan(10);
    for (const id of ids) { expect(COOP_ACT[id], id).toBeTruthy(); expect(actOf(COOP_ACT[id].act), COOP_ACT[id].act).toBeTruthy(); }
  });
  it('the tea activity is recorded on the day it is done (what the button checks), and costs what it costs', () => {
    const s = G.newState('Tea', 'moscow'); s.queue = []; s.loc = 'home'; s.money = 5000; s.energy = 100; s.slot = 0;
    const before = s.money, r = doAct(s, COOP_ACT.tea_together.act);
    expect(r.ok, r.msg).toBe(true);
    expect(lifeOf(s).done.teafriends).toBe(s.day);
    expect(s.money).toBeLessThanOrEqual(before);
  });
});
