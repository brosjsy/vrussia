// The Russian of the creator, the cities, the places, the checklist, the decrees and the first scenes (round 149).
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { WORDS_RU, CITY_RU, PLACE_RU, FLAVOUR_RU, CHECK_RU, DECREE_RU } from '../src/i18n-words-ru';
import { SCENES_RU, HOME_RU } from '../src/scenes-ru';
import { HAIR_STYLES, HAIR_COLOR_NAMES, EYES, BUILDS, FACES, FACIAL, BROWS, NOSES, LIPS, HEIGHTS, STYLES, BOTTOMS, SHOES, GROUPS, SAMPLES } from '../src/avatar';
import { DREAMS } from '../src/dreams';
import { PLACE_LOOK } from '../src/city';
import { DECREES } from '../src/decrees';

describe('the Russian of the title screen and the city', () => {
  it('every creator choice, ready-made character, starting look and dream has its Russian', () => {
    const words = [...HAIR_STYLES, ...HAIR_COLOR_NAMES, ...EYES, ...BUILDS, ...FACES, ...FACIAL, ...BROWS, ...NOSES, ...LIPS, ...HEIGHTS, ...STYLES.map(x => x.label), ...BOTTOMS.map(x => x.label), ...SHOES.map(x => x.label),
      ...GROUPS.map(g => g.label), ...SAMPLES.map(x => x.label), ...DREAMS.flatMap(d => [d.label, d.blurb])];
    const missing = words.filter(w => !WORDS_RU[w]); expect(missing).toEqual([]);
  });
  it('every city, place, place description, checklist item and decree has its Russian', () => {
    expect(G.CITIES.filter(c => !CITY_RU[c])).toEqual([]);
    expect(G.PLACES.filter(p => !PLACE_RU[p.n]).map(p => p.n)).toEqual([]);
    expect(Object.keys(PLACE_LOOK).filter(id => !FLAVOUR_RU[id])).toEqual([]);
    expect(G.CHECKLIST.filter(c => !CHECK_RU[c.label]).map(c => c.label)).toEqual([]);
    expect(DECREES.filter(d => !DECREE_RU[d.text] && !d.text.startsWith('Farmers')).map(d => d.text)).toEqual([]);
  });
  it('a translated scene exists, has as many choices as the English, and every home town has its Russian', () => {
    for (const [id, r] of Object.entries(SCENES_RU)) { const sc = G.get(id, G.newState('Test', 'moscow')); expect(sc, id).toBeTruthy(); expect(r.choices.length, id).toBe(sc!.choices.length); expect(r.text).toMatch(/[А-Яа-яЁё]/); }
    expect(G.origins.filter(o => !HOME_RU[o.home]).map(o => o.home)).toEqual([]);
  });
});
