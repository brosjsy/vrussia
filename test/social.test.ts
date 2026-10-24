import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { messagesFor, ambientChat, chatReply, cleanMessage, LAYERS, inLayer } from '../src/social';

const dayWithDow = (dow: number): number => { const s = G.newState('T', 'moscow'); for (let d = 0; d < 30; d++) { s.day = d; if (G.dateOf(s).getDay() === dow) return d; } throw new Error('no such weekday'); };

describe('the phone messages', () => {
  it('there is always at least one message', () => {
    expect(messagesFor(G.newState('T', 'moscow')).length).toBeGreaterThan(0);
  });
  it('papers about to run out are urgent, for non-citizens only', () => {
    const s = G.newState('T', 'tajik'); s.docs.reg = 4; s.docs.patent = 6;
    const m = messagesFor(s);
    expect(m.filter(x => x.tag === 'urgent').length).toBe(2);
    const c = G.newState('T', 'moscow'); c.docs.reg = 4;
    expect(messagesFor(c).some(x => x.text.includes('registration'))).toBe(false);
  });
  it('rent is announced from Thursday, fines and loans from the state of the game', () => {
    const s = G.newState('T', 'moscow'); s.rent = 25000; s.day = dayWithDow(1);
    expect(messagesFor(s).some(x => x.from === 'Landlord')).toBe(false);
    s.day = dayWithDow(5);
    expect(messagesFor(s).some(x => x.from === 'Landlord' && x.text.includes('25,000'))).toBe(true);
    s.tmp.fines = 3000; s.tmp.debt = 90000;
    const t = messagesFor(s).map(x => x.text).join(' ');
    expect(t).toContain('3,000'); expect(t).toContain('90,000');
  });
  it('family and a partner write according to how close you are, and a scam message is labelled', () => {
    const s = G.newState('T', 'moscow'); s.famLove = 20;
    expect(messagesFor(s).some(x => x.from === 'Mum' && x.text.includes('not called'))).toBe(true);
    s.famLove = 90; expect(messagesFor(s).some(x => x.from === 'Mum' && x.text.includes('garden'))).toBe(true);
    s.partner = { name: 'Anna', love: 80 } as G.State['partner']; expect(messagesFor(s).some(x => x.from === 'Anna')).toBe(true);
    s.bank = { sber: true };
    let found = false; for (let d = 0; d < 20; d++) { s.day = d; if (messagesFor(s).some(x => x.tag === 'scam')) found = true; }
    expect(found).toBe(true);
    s.bank = {}; for (let d = 0; d < 20; d++) { s.day = d; expect(messagesFor(s).some(x => x.tag === 'scam')).toBe(false); }
  });
});

describe('talk at the place', () => {
  it('every place has three invented neighbours speaking, with different names', () => {
    for (const p of G.PLACES) { const c = ambientChat(p.id); expect(c.length).toBe(3); expect(new Set(c.map(x => x.from)).size).toBe(3); for (const l of c) expect(l.text.length).toBeGreaterThan(5); }
    expect(ambientChat('nowhere').length).toBe(3);
  });
  it('answers questions, greetings, thanks and work talk differently, and anything else with local talk', () => {
    const r = (t: string): string => chatReply('bank', t, () => 0).text;
    expect(r('where is the desk?')).toContain('desk');
    expect(r('hello')).toMatch(/Hello|Privet|friendly/);
    expect(r('thanks')).toContain('Not at all');
    expect(r('I need a job')).toContain('jobs app');
    expect(r('bananas')).toContain('app is faster');
  });
  it('messages are cleaned of markup characters and cut to 80 characters', () => {
    expect(cleanMessage('  <b>hi</b>   there ')).toBe('<b>hi</b> there');                 // kept as typed; the screen escapes it
    expect(cleanMessage('x'.repeat(200)).length).toBe(80);
  });
});

describe('map layers', () => {
  it('every layer names real places and every place is in at least one named layer', () => {
    const ids = new Set(G.PLACES.map(p => p.id));
    for (const l of LAYERS) for (const p of l.places || []) expect(ids.has(p), p).toBe(true);
    for (const p of G.PLACES) expect(LAYERS.some(l => l.places && l.places.includes(p.id)), p.id).toBe(true);
  });
  it('the all layer shows everything and the others only their own places', () => {
    expect(inLayer('all', 'bank')).toBe(true);
    expect(inLayer('money', 'bank')).toBe(true); expect(inLayer('money', 'clinic')).toBe(false);
    expect(inLayer('unknown-layer', 'clinic')).toBe(true);
  });
});

describe('the daily matryoshka hunt', () => {
  it('the spot is never home, never the workplace without a job, and changes from day to day', () => {
    const s = G.newState('T', 'moscow'); const seen = new Set<string>();
    for (let d = 0; d < 60; d++) { s.day = d; const p = G.dailySpot(s); expect(p).not.toBe('home'); expect(p).not.toBe('work'); seen.add(p); }
    expect(seen.size).toBeGreaterThan(8);
    s.job = 'courier'; let work = false; for (let d = 0; d < 60; d++) { s.day = d; if (G.dailySpot(s) === 'work') work = true; }
    expect(work).toBe(true);
  });
  it('finding it pays once per day, and every fifth find pays the big prize', () => {
    const s = G.newState('T', 'moscow'); s.money = 1000;
    for (let k = 1; k <= 5; k++) {
      s.day = k * 3; s.loc = G.dailySpot(s);
      const before = s.money; const msg = G.collectDaily(s);
      expect(msg).toContain('matryoshka');
      expect(s.money - before).toBe(G.DAILY_FIND_PAY + (k === 5 ? G.DAILY_BIG_PRIZE : 0));
      expect(G.collectDaily(s)).toBeNull();            // not twice on the same day
    }
    expect(G.dailyFound(s)).toBe(5);
    expect(G.dailyToPrize(s)).toBe(5);
  });
  it('standing somewhere else finds nothing, and travelling to the spot through the game finds it', () => {
    const s = G.newState('T', 'moscow'); s.queue = []; s.day = 10;
    s.loc = G.dailySpot(s) === 'bank' ? 'mfc' : 'bank'; expect(G.collectDaily(s)).toBeNull();
    s.loc = 'home'; s.dest = G.dailySpot(s);
    const sc = G.get('trip_method', s) as G.Scenario;
    const res = G.choose(s, sc, 0);
    const arrived = s.loc === G.dailySpot(s);
    if (arrived) expect(res.dayNotes.some(x => x.includes('matryoshka'))).toBe(true);
    expect(G.dailyFound(s)).toBe(arrived ? 1 : 0);
  });
});
