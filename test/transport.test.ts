import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';

const trIds = (s: G.State): string[] => G.eligible(s, ['life']).map(x => x.id).filter(id => id.startsWith('tr-'));

describe('transport pack', () => {
  it('has 22 scenes with unique ids', () => {
    const all = G.scenarios.filter(x => x.id.startsWith('tr-'));
    expect(all.length).toBe(22);
    expect(new Set(all.map(x => x.id)).size).toBe(all.length);
  });

  it('Moscow-only rails appear in Moscow and not elsewhere', () => {
    const m = G.newState('T', 'moscow'); m.queue = [];
    expect(trIds(m)).toContain('tr-mcc'); expect(trIds(m)).toContain('tr-mcd');
    const k = G.newState('T', 'moscow', 'Kazan'); k.queue = [];
    expect(trIds(k)).not.toContain('tr-mcc');
    expect(trIds(k)).toContain('tr-escalator');          // Kazan has a metro
    const t = G.newState('T', 'moscow', 'Tula'); t.queue = [];
    expect(trIds(t)).not.toContain('tr-escalator');      // no metro in Tula
    expect(trIds(t)).toContain('tr-marshrutka');
  });

  it('weather-specific scenes need the right weather', () => {
    const s = G.newState('T', 'moscow'); s.queue = [];
    s.weather = 'clear'; expect(trIds(s)).not.toContain('tr-tram'); expect(trIds(s)).toContain('tr-scooter');
    s.weather = 'snow'; expect(trIds(s)).toContain('tr-tram'); expect(trIds(s)).not.toContain('tr-scooter');
  });

  it('every choice runs and a polite action raises reputation', () => {
    const s = G.newState('T', 'moscow'); s.queue = []; s.rep = 40;
    G.choose(s, G.get('tr-seat', s) as G.Scenario, 0);
    expect(s.rep).toBe(43);
    for (const sc of G.scenarios.filter(x => x.id.startsWith('tr-'))) for (let i = 0; i < sc.choices.length; i++) expect(() => G.choose(structuredClone(s), sc, i), sc.id).not.toThrow();
  });
});
