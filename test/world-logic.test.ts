import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { WORLD, toWorld, dist, HUB, standPoint, roadSegments, routeTo, newAgent, stepAgent, sendTo, pairTalk, pickDestination, seeded, FRONT, WALK_SPEED, PLAYER_SPEED } from '../src/world-logic';
import type { Agent } from '../src/world-logic';

describe('the 3D map', () => {
  it('turns the 100 x 100 game map into 130 metres, centred on the middle', () => {
    expect(toWorld({ x: 50, y: 50 })).toEqual({ x: 0, z: 0 });
    expect(toWorld({ x: 100, y: 0 })).toEqual({ x: 65, z: -65 }); expect(WORLD).toBe(1.3);
    expect(dist(HUB, toWorld(G.placeById('home')))).toBe(0);
  });
  it('people stand on the road in front of each building, at the same distance, between the building and the hub', () => {
    for (const p of G.PLACES) {
      const s = standPoint(p.id), c = toWorld(p);
      expect(dist(s, c), p.id).toBeCloseTo(FRONT, 5);
      if (p.id !== 'home') expect(dist(s, HUB)).toBeLessThan(dist(c, HUB));
    }
    expect(roadSegments().length).toBe(G.PLACES.length - 1);
    for (const seg of roadSegments()) { expect(seg.from).toEqual(HUB); expect(dist(seg.to, standPoint(seg.place))).toBe(0); }
  });
  it('the way to a place goes along the roads: straight out of the hub, via the hub from anywhere else, nothing when already there', () => {
    expect(routeTo(HUB, 'bank')).toEqual([standPoint('bank')]);
    expect(routeTo(standPoint('mfc'), 'bank')).toEqual([HUB, standPoint('bank')]);
    expect(routeTo(standPoint('bank'), 'bank')).toEqual([]);
    expect(routeTo({ x: standPoint('bank').x + 0.4, z: standPoint('bank').z }, 'bank')).toEqual([]);
  });
});

describe('random numbers for the world', () => {
  it('are the same for the same seed, between 0 and 1, and spread out', () => {
    const a = seeded(5), b = seeded(5), c = seeded(6);
    const xs = Array.from({ length: 200 }, () => a());
    expect(xs).toEqual(Array.from({ length: 200 }, () => b()));
    expect(xs.every(x => x >= 0 && x < 1)).toBe(true);
    expect(Array.from({ length: 5 }, () => c())).not.toEqual(xs.slice(0, 5));
    expect(new Set(xs.map(x => Math.floor(x * 10))).size).toBe(10);
    expect(seeded(0)()).toBeGreaterThanOrEqual(0);
  });
});

describe('where people want to go', () => {
  it('anywhere but where they are, the workplace only with a job, and busy places more often', () => {
    const r = seeded(1); const counts: Record<string, number> = {};
    for (let i = 0; i < 4000; i++) { const d = pickDestination('home', r, false); counts[d] = (counts[d] || 0) + 1; }
    expect(counts.home).toBeUndefined(); expect(counts.work).toBeUndefined();
    expect(Object.keys(counts).length).toBe(G.PLACES.length - 2);
    expect(counts.center).toBeGreaterThan(counts.shelter * 1.5);
    const withJob = new Set(Array.from({ length: 400 }, () => pickDestination('home', r, true))); expect(withJob.has('work')).toBe(true);
  });
});

describe('walking', () => {
  it('an agent never moves faster than its speed, turns toward where it goes, and arrives exactly', () => {
    const r = seeded(2); const a = newAgent('x', 'mfc', r);
    a.timer = 0; stepAgent(a, 0.01, r, false);
    expect(a.state).toBe('walk'); const dest = a.node; expect(dest).not.toBe('mfc');
    let steps = 0, lastPos = { ...a.pos }, lastPhase = a.phase;
    while (a.state === 'walk' && steps++ < 20000) {
      stepAgent(a, 0.05, r, false);
      expect(dist(a.pos, lastPos)).toBeLessThanOrEqual(a.speed * 0.05 + 1e-6); expect(a.phase).toBeGreaterThanOrEqual(lastPhase);
      lastPos = { ...a.pos }; lastPhase = a.phase;
    }
    expect(a.state).toBe('idle'); expect(a.path.length).toBe(0);
    expect(dist(a.pos, standPoint(dest))).toBeLessThan(1e-6);
    expect(a.timer).toBeGreaterThan(1);
  });
  it('a big time step does not skip the corner or jump through the hub', () => {
    const r = seeded(3); const a = newAgent('y', 'bank', r); a.pos = { ...standPoint('bank') };
    sendTo(a, 'mfc'); const via = dist(standPoint('bank'), HUB) + dist(HUB, standPoint('mfc'));
    stepAgent(a, 1000 / a.speed, r, false);                                                // one huge step
    expect(a.state).toBe('idle'); expect(dist(a.pos, standPoint('mfc'))).toBeLessThan(1e-6);
    expect(a.phase).toBeGreaterThan(0); expect(via).toBeGreaterThan(20);
  });
  it('the player walks to a place when sent, faster than the crowd, and a player does not wander off alone', () => {
    const r = seeded(4); const p = newAgent('player', 'home', r, false); p.speed = PLAYER_SPEED;
    expect(PLAYER_SPEED).toBeGreaterThan(WALK_SPEED * 1.5);
    for (let i = 0; i < 400; i++) stepAgent(p, 0.1, r, false);
    expect(p.state).toBe('idle'); expect(p.node).toBe('home');
    sendTo(p, 'uni'); expect(p.state).toBe('walk'); expect(p.node).toBe('uni');
    for (let i = 0; i < 2000 && p.state === 'walk'; i++) stepAgent(p, 0.05, r, false);
    expect(dist(p.pos, standPoint('uni'))).toBeLessThan(1e-6);
    for (let i = 0; i < 2000; i++) stepAgent(p, 0.1, r, true);
    expect(p.node).toBe('uni'); expect(p.state).toBe('idle');
    sendTo(p, 'uni'); expect(p.state).toBe('idle');                                          // already there
  });
});

describe('a crowd over ten minutes', () => {
  it('stays inside the map, never jumps, keeps moving, visits many places and talks', () => {
    const r = seeded(9);
    const agents: Agent[] = Array.from({ length: 24 }, (_, i) => newAgent('n' + i, G.PLACES[i % G.PLACES.length].id, r));
    const visited = new Set<string>(), chosen = new Set<string>(); let talked = 0, maxJump = 0, walking = 0, trips = 0;
    const last = agents.map(a => a.node);
    for (let t = 0; t < 600 / 0.1; t++) {
      const before = agents.map(a => ({ ...a.pos }));
      for (const a of agents) stepAgent(a, 0.1, r, false);
      pairTalk(agents, r, 0.02);
      agents.forEach((a, i) => { maxJump = Math.max(maxJump, dist(a.pos, before[i])); visited.add(a.node); if (a.node !== last[i]) { trips++; chosen.add(a.node); last[i] = a.node; } if (a.state === 'talk') talked++; if (a.state === 'walk') walking++; expect(Math.abs(a.pos.x)).toBeLessThan(80); expect(Math.abs(a.pos.z)).toBeLessThan(80); });
    }
    expect(maxJump).toBeLessThanOrEqual(WALK_SPEED * 1.15 * 0.1 + 1e-6);
    expect(walking).toBeGreaterThan(24 * 6000 * 0.1);                                       // at least a tenth of the time is spent walking
    expect(trips).toBeGreaterThan(24 * 4);                                                  // everybody makes several trips in ten minutes
    expect(visited.size).toBeGreaterThan(10); expect(talked).toBeGreaterThan(100);
    expect(chosen.has('work')).toBe(false);                                                 // nobody chooses to go to a workplace nobody has
  });
});

describe('talking', () => {
  it('two people standing close and not busy turn to each other, one speaks, and they go back to normal after a few seconds', () => {
    const r = () => 0;                                           // the lowest number: every chance succeeds
    const a = newAgent('a', 'bank', seeded(1)), b = newAgent('b', 'bank', seeded(2));
    a.pos = { x: 0, z: 0 }; b.pos = { x: 0, z: 2 }; a.state = b.state = 'idle'; a.timer = b.timer = 99;
    pairTalk([a, b], r, 1);
    expect(a.state).toBe('talk'); expect(b.state).toBe('talk'); expect(a.partner).toBe('b'); expect(b.partner).toBe('a');
    expect(a.heading).toBeCloseTo(0, 5); expect(b.heading).toBeCloseTo(Math.PI, 5);          // a looks toward +z, b toward -z
    expect(a.say).toBeTruthy(); expect(b.say).toBeUndefined();
    let steps = 0;
    while ((a.state as string) === 'talk' && steps++ < 200) { stepAgent(a, 0.1, seeded(3), false); stepAgent(b, 0.1, seeded(4), false); }
    expect(steps).toBeGreaterThan(30); expect(steps).toBeLessThan(100);                        // they talked for 4 to 9 seconds
    expect(a.state).toBe('idle'); expect(a.say).toBeUndefined(); expect(a.partner).toBeUndefined(); expect(b.state).toBe('idle');
  });
  it('people who are far apart, walking, or the player never start talking', () => {
    const r = () => 0;
    const a = newAgent('a', 'bank', seeded(1)), b = newAgent('b', 'bank', seeded(2)), p = newAgent('player', 'bank', seeded(3), false);
    a.pos = { x: 0, z: 0 }; b.pos = { x: 20, z: 0 }; p.pos = { x: 0, z: 1 }; a.state = b.state = p.state = 'idle';
    pairTalk([a, b, p], r, 1); expect(a.state).toBe('idle'); expect(b.state).toBe('idle'); expect(p.state).toBe('idle');
    b.pos = { x: 1, z: 0 }; b.state = 'walk'; pairTalk([a, b], r, 1); expect(a.state).toBe('idle');
  });
});
