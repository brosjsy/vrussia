// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { SKIN_ORDER, GROUPS, applyGroup, groupWeights, groupFor, seedGroup, wornFor, HAIR_COLOR_NAMES, EYES, bodySvg, bodyGroup, BOTTOMS, SHOES, BOTTOM_COLORS, SHOE_COLORS, HEIGHTS, avatarSvg, normalizeLook, lookFromSeed, DEFAULT_LOOK, SKINS, HAIR_COLORS, HAIR_STYLES, STYLES, ACCENTS } from '../src/avatar';

describe('portraits', () => {
  it('normalizeLook turns anything into a valid look', () => {
    for (const junk of [null, undefined, 5, 'x', [], { skin: -1, hairStyle: 99, hairColor: 'a', style: 'wizard', accent: 1.5, beard: 'yes' }]) {
      const l = normalizeLook(junk);
      expect(l.skin).toBeGreaterThanOrEqual(0); expect(l.skin).toBeLessThan(SKINS.length);
      expect(l.hairStyle).toBeLessThan(HAIR_STYLES.length); expect(l.hairColor).toBeLessThan(HAIR_COLORS.length); expect(l.accent).toBeLessThan(ACCENTS.length);
      expect(STYLES.some(s => s.id === l.style)).toBe(true); expect(typeof l.beard).toBe('boolean');
    }
    expect(normalizeLook(undefined)).toEqual(DEFAULT_LOOK);
    expect(normalizeLook({ skin: 3, beard: true }).beard).toBe(true);
  });
  it('every combination of skin, hair, clothing style and colour draws a valid picture', () => {
    const parser = new DOMParser();
    for (let skin = 0; skin < SKINS.length; skin++) for (let hs = 0; hs < HAIR_STYLES.length; hs++) for (const st of STYLES) {
      const svg = avatarSvg({ skin, hairStyle: hs, hairColor: hs % HAIR_COLORS.length, style: st.id, accent: skin % ACCENTS.length, beard: hs % 2 === 0 }, { outer: 'coat-winter', hat: 'hat-ushanka', scarf: 'scarf-wool', glasses: true }, 'Test');
      expect(svg).not.toMatch(/NaN|undefined|null/);
      const doc = parser.parseFromString(svg, 'image/svg+xml');
      expect(doc.querySelector('parsererror'), `${skin}-${hs}-${st.id}`).toBeNull();
      expect(doc.documentElement.getAttribute('role')).toBe('img');
    }
  });
  it('the title is safe, and a decorative picture is hidden from screen readers', () => {
    const svg = avatarSvg(DEFAULT_LOOK, {}, '<script>alert(1)</script>"x');
    expect(svg).not.toContain('<script'); expect(svg).toContain('aria-label=');
    expect(avatarSvg(DEFAULT_LOOK, {}, '')).toContain('aria-hidden="true"');
  });
  it('clothes and glasses change the picture, and a beard only appears when asked for', () => {
    const plain = avatarSvg(DEFAULT_LOOK), full = avatarSvg(DEFAULT_LOOK, { outer: 'coat-winter', hat: 'hat-ushanka', scarf: 'scarf-wool', glasses: true });
    expect(full.length).toBeGreaterThan(plain.length);
    expect(full).toContain('stroke-width="1.6"'); expect(plain).not.toContain('stroke-width="1.6"');
    expect(avatarSvg({ ...DEFAULT_LOOK, beard: true }).length).toBeGreaterThan(plain.length);
    expect(avatarSvg({ ...DEFAULT_LOOK, style: 'smart' })).not.toBe(plain);
  });
  it('people made from a name are always the same person, and different names give different people', () => {
    expect(lookFromSeed('anna-3-1')).toEqual(lookFromSeed('anna-3-1'));
    const looks = new Set(Array.from({ length: 40 }, (_, i) => JSON.stringify(lookFromSeed('p' + i))));
    expect(looks.size).toBeGreaterThan(20);
    expect(lookFromSeed('x', { beardable: false }).beard).toBe(false);
    for (let i = 0; i < 60; i++) { const f = lookFromSeed('f' + i, { female: true }); expect([1, 2, 3, 6, 7, 8]).toContain(f.hairStyle); expect(f.beard).toBe(false); }
    for (let i = 0; i < 60; i++) expect([0, 2, 4, 5, 8]).toContain(lookFromSeed('m' + i, { beardable: true }).hairStyle);
  });

  it('the whole body: every top, bottom, shoe and height draws a valid picture', () => {
    const parser = new DOMParser();
    for (const st of STYLES) for (const b of BOTTOMS) for (const sh of SHOES) for (let h = 0; h < HEIGHTS.length; h++) {
      const svg = bodySvg({ style: st.id, bottom: b.id, shoes: sh.id, height: h, bottomColor: h, shoeColor: h, beard: h === 2 }, { outer: 'coat-winter', hat: 'hat-beanie', scarf: 'scarf-wool', glasses: h === 1 }, 'Test');
      expect(svg).not.toMatch(/NaN|undefined|null/);
      expect(parser.parseFromString(svg, 'image/svg+xml').querySelector('parsererror'), `${st.id}-${b.id}-${sh.id}-${h}`).toBeNull();
    }
  });
  it('height scales the figure from the ground: short 0.9, average 1, tall 1.1', () => {
    expect(bodyGroup({ height: 0 })).toContain('scale(0.9)'); expect(bodyGroup({ height: 1 })).toContain('scale(1)'); expect(bodyGroup({ height: 2 })).toContain('scale(1.1)');
    expect(bodyGroup({ height: 7 })).toContain('scale(1)');                                  // nonsense becomes average
  });
  it('every clothing choice changes the picture', () => {
    const base = bodyGroup({});
    expect(bodyGroup({ bottom: 'skirt' })).not.toBe(base); expect(bodyGroup({ bottom: 'shorts' })).not.toBe(base);
    expect(bodyGroup({ shoes: 'boots' })).not.toBe(base); expect(bodyGroup({ shoes: 'sandals' })).not.toBe(base);
    expect(bodyGroup({ style: 'dress' })).not.toBe(base); expect(bodyGroup({ style: 'sporty' })).not.toBe(base);
    expect(bodyGroup({ bottomColor: 2 })).not.toBe(base); expect(bodyGroup({ shoeColor: 3 })).not.toBe(base);
    expect(bodyGroup({}, { outer: 'coat-winter' })).not.toBe(base); expect(bodyGroup({}, { scarf: 'scarf-wool' })).not.toBe(base);
    expect(BOTTOM_COLORS.length).toBeGreaterThan(3); expect(SHOE_COLORS.length).toBeGreaterThan(3);
  });
});

const lum = (hex: string): number => { const n = parseInt(hex.slice(1), 16); return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
const sample = (n: number, f: (i: number) => ReturnType<typeof lookFromSeed>): ReturnType<typeof lookFromSeed>[] => Array.from({ length: n }, (_, i) => f(i));

describe('people from many places', () => {
  it('skin tones run from very light to very dark in order, and hair colours include blond, red, grey and white', () => {
    // twelve tones; the four added later sit between the first eight, so the order from fair to deep is SKIN_ORDER
    const ordered = SKIN_ORDER.map(i => SKINS[i]);
    for (let i = 1; i < ordered.length; i++) expect(lum(ordered[i])).toBeLessThan(lum(ordered[i - 1]));
    expect(lum(ordered[0])).toBeGreaterThan(200); expect(lum(ordered[ordered.length - 1])).toBeLessThan(70);
    expect(new Set(HAIR_COLORS).size).toBe(HAIR_COLORS.length); expect(HAIR_COLOR_NAMES.length).toBe(HAIR_COLORS.length);
    for (const name of ['Black', 'Blond', 'Red', 'Grey', 'White']) expect(HAIR_COLOR_NAMES as readonly string[]).toContain(name);
    expect(lum(HAIR_COLORS[HAIR_COLOR_NAMES.indexOf('Black')])).toBeLessThan(40); expect(lum(HAIR_COLORS[HAIR_COLOR_NAMES.indexOf('White')])).toBeGreaterThan(230);
    expect(EYES.length).toBe(8); expect(HAIR_STYLES.length).toBe(22);      // grown in round 113 (eight eye shapes, twenty-two hair styles)
  });
  it('every starting look is valid, keeps the clothes, and the weights of every city add up to 100', () => {
    const own = normalizeLook({ style: 'dress', bottom: 'skirt', shoes: 'boots', height: 2 });
    for (const g of GROUPS) { const l = applyGroup(own, g.id); expect(l.style).toBe('dress'); expect(l.height).toBe(2); expect(l.skin).toBe(g.look.skin); expect(l.eyes).toBe(g.look.eyes); }
    expect(applyGroup(own, 'nonsense')).toEqual(own);
    for (const city of ['', 'Moscow', 'Kazan', 'Ufa', 'Makhachkala', 'Yakutsk', 'Irkutsk', 'Khabarovsk', 'Saint Petersburg', 'Omsk']) {
      expect(Object.values(groupWeights(city)).reduce((a, b) => a + b, 0), city).toBe(100);
    }
  });
  it('the mix of people follows the city: mostly Slavic in Moscow, Tatar-Bashkir in Kazan, Caucasian in Makhachkala, Siberian in Yakutsk', () => {
    const share = (city: string, g: string): number => sample(3000, i => lookFromSeed(`${city}|${i}`, { city })).length && Array.from({ length: 3000 }, (_, i) => seedGroup(`${city}|${i}`, city)).filter(x => x === g).length / 3000;
    expect(share('Moscow', 'slavic')).toBeGreaterThan(0.58); expect(share('Moscow', 'slavic')).toBeLessThan(0.74);
    expect(share('Moscow', 'central-asian')).toBeGreaterThan(0.08);
    expect(share('Kazan', 'volga')).toBeGreaterThan(0.3); expect(share('Makhachkala', 'caucasus')).toBeGreaterThan(0.8); expect(share('Yakutsk', 'east-asian')).toBeGreaterThan(0.45);
    expect(groupFor('Moscow', -7)).toBeTruthy();
  });
  it('each group looks different: fair hair is common among Slavic people and rare among Central Asians, almond eyes the other way round, and darker skin among African people', () => {
    const slavic = sample(600, i => lookFromSeed('s' + i, { group: 'slavic' })), central = sample(600, i => lookFromSeed('c' + i, { group: 'central-asian' })), african = sample(600, i => lookFromSeed('a' + i, { group: 'african' }));
    const fair = (l: { hairColor: number }): boolean => [3, 4, 5, 6].includes(l.hairColor);
    const share = (arr: typeof slavic, f: (l: (typeof slavic)[number]) => boolean): number => arr.filter(f).length / arr.length;
    expect(share(slavic, fair)).toBeGreaterThan(0.3); expect(share(central, fair)).toBeLessThan(0.05);
    expect(share(central, l => l.eyes === 1)).toBeGreaterThan(0.6); expect(share(slavic, l => l.eyes === 1)).toBe(0);
    expect(Math.max(...slavic.map(l => l.skin))).toBeLessThanOrEqual(2); expect(Math.min(...african.map(l => l.skin))).toBeGreaterThanOrEqual(5);
    expect(share(african, l => l.hairStyle === 8)).toBeGreaterThan(0.2);
    expect(share(slavic, l => l.hairColor >= 7)).toBeGreaterThan(0.03);                      // now and then older people with grey or white hair
  });
  it('traditional hats appear only for people of the groups that wear them, a coat only in the cold months, and nothing breaks the drawing', () => {
    let doppi = 0, scarf = 0, slavicTraditional = 0, winterCoats = 0, summerCoats = 0;
    for (let i = 0; i < 800; i++) {
      const cA = wornFor('x' + i, 'central-asian', false, 6), cF = wornFor('y' + i, 'central-asian', true, 6), sl = wornFor('z' + i, 'slavic', i % 2 === 0, 6);
      if (cA.hat === 'hat-doppi') doppi++; if (cF.hat === 'hat-headscarf') scarf++; if (sl.hat === 'hat-doppi' || sl.hat === 'hat-headscarf') slavicTraditional++;
      if (wornFor('w' + i, 'slavic', false, 0).outer) winterCoats++; if (wornFor('w' + i, 'slavic', false, 6).outer) summerCoats++;
    }
    expect(doppi).toBeGreaterThan(40); expect(scarf).toBeGreaterThan(40); expect(slavicTraditional).toBe(0);
    expect(winterCoats).toBeGreaterThan(400); expect(summerCoats).toBe(0);
    const parser = new DOMParser();
    for (let hs = 0; hs < HAIR_STYLES.length; hs++) for (const hat of ['hat-doppi', 'hat-headscarf', 'hat-ushanka', undefined]) for (const outer of ['chapan', 'coat-winter', undefined]) for (const eyes of [0, 1]) {
      for (const svg of [avatarSvg({ hairStyle: hs, eyes, beard: hs % 2 === 0 }, { hat, outer }, 'x'), bodySvg({ hairStyle: hs, eyes, skin: 7 }, { hat, outer }, 'x')]) {
        expect(svg).not.toMatch(/NaN|undefined|null/);
        expect(parser.parseFromString(svg, 'image/svg+xml').querySelector('parsererror'), `${hs}-${hat}-${outer}`).toBeNull();
      }
    }
    expect(avatarSvg({}, { hat: 'hat-headscarf' })).not.toBe(avatarSvg({})); expect(avatarSvg({}, { hat: 'hat-doppi' })).not.toBe(avatarSvg({}));
    expect(bodyGroup({}, { outer: 'chapan' })).toContain('#e0b43c');
    expect(avatarSvg({ eyes: 1 })).toContain('rotate(8 41 54.4)'); expect(avatarSvg({ eyes: 0 })).not.toContain('rotate(8 41');
  });
});
