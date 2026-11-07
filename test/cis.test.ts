import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { COUNTRIES } from '../src/countries';
import { ORIGIN_COUNTRY, VISA_FREE, startAtHome, trackFor, chooseCountry, preOf } from '../src/prearrival';
import { dwellingOf } from '../src/homes';
import { DESTS } from '../src/flights';

const CIS = COUNTRIES.filter(c => c.region === 'CIS' && c.code !== 'RU').map(c => c.code);

describe('every CIS country is a character', () => {
  it('each CIS country has an origin that starts in that country', () => {
    expect([...CIS].sort()).toEqual(Object.values(ORIGIN_COUNTRY).sort());
    for (const [id, code] of Object.entries(ORIGIN_COUNTRY)) {
      const o = G.origins.find(x => x.id === id);
      expect(o, id).toBeTruthy();
      expect(o!.home, id).toContain(COUNTRIES.find(c => c.code === code)!.en);
    }
  });

  it('EAEU members need no patent and the others do', () => {
    const eaeu = ['KZ', 'AM', 'BY', 'KG'];
    for (const [id, code] of Object.entries(ORIGIN_COUNTRY)) {
      const o = G.origins.find(x => x.id === id)!;
      expect(o.status, id).toBe(eaeu.includes(code) ? 'eaeu' : 'migrant');
      expect(o.docs.patent !== undefined, id).toBe(!eaeu.includes(code));
    }
  });

  it('the pre-arrival track matches, and Turkmenistan is the one that needs a visa', () => {
    for (const [id, code] of Object.entries(ORIGIN_COUNTRY)) {
      const s = G.newState('T', id); const p = startAtHome(s);
      expect(p.country, id).toBe(code);
      expect(p.track, id).toBe(trackFor(s.status, code));
    }
    expect(VISA_FREE).not.toContain('TM');
  });

  it('they live in a shared flat and can fly home', () => {
    for (const id of Object.keys(ORIGIN_COUNTRY)) {
      const s = G.newState('T', id); s.queue = [];
      expect(dwellingOf(s), id).toBe('shared');
      const home = G.origins.find(o => o.id === id)!.home;
      expect(DESTS.some(d => d.intl && home.includes(d.country)), id).toBe(true);
    }
  });
});

describe('a worker from any country', () => {
  it('chooses a country, and the papers follow from it', () => {
    const go = (code: string) => { const s = G.newState('T', 'worker'); startAtHome(s); const r = chooseCountry(s, code); expect(r.ok, code).toBe(true); return { s, p: preOf(s)! }; };
    expect(go('KZ').p.track).toBe('eaeu'); expect(go('KZ').s.status).toBe('eaeu');
    expect(go('RS').p.track).toBe('migrant');                  // visa-free
    expect(go('CN').p.track).toBe('study');                    // needs a visa
    expect(chooseCountry(G.newState('T', 'moscow'), 'CN').ok).toBe(false);
  });
});
