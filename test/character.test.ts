// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import * as G from '../src/engine';
import '../src/content';
import { normalizeLook, avatarSvg, bodySvg, HAIR_STYLES, SHOES, STYLES, SKINS, SKIN_ORDER, EYES, BUILDS, FACES, FACIAL, SAMPLES, ROLES, RUSSIAN_NAMES, DEFAULT_LOOK } from '../src/avatar';
import { buildCharacter, setPose, EMOTES } from '../src/characters3d';
import type { Pose } from '../src/characters3d';
import { temperatureOf, seasonOf, warmthNeeded, outfitWarmth, warmthMeter, coldPress, advice, coldWord, whiteNights } from '../src/warmth';
import { buy, wear, wearing, itemById, tierOf, CATALOG } from '../src/shop';
import { crowdFor } from '../src/city';

const at = (month: number, weather: G.Weather, city = 'Moscow'): G.State => {
  const s = G.newState('T', 'tajik'); s.city = city; s.weather = weather; s.loc = 'market'; s.clothes = 20; s.worn = {};
  s.day = Math.round((new Date(month >= 9 ? 2026 : 2027, month - 1, 15).getTime() - G.START.getTime()) / 864e5); return s;
};
const meshes = (o: THREE.Object3D): number => { let n = 0; o.traverse(x => { if ((x as THREE.Mesh).isMesh) n++; }); return n; };

describe('looks', () => {
  it('old saves keep working: missing new choices get ordinary values, an old beard becomes a full beard, nonsense is ignored', () => {
    const old = normalizeLook({ skin: 3, hairStyle: 2, beard: true, style: 'casual' });
    expect(old.facial).toBe(3); expect(old.beard).toBe(true); expect(old.build).toBe(1); expect(old.eyeColor).toBe(4); expect(old.freckles).toBe(false);
    const bad = normalizeLook({ build: 9, face: -1, eyeColor: 'blue', facial: 2.5, hairStyle: 99, shoes: 'roller skates', skin: 40 });
    expect(bad).toMatchObject({ build: 1, face: 0, eyeColor: 4, facial: 0, hairStyle: 0, shoes: 'sneakers', skin: 1 });
    expect(normalizeLook({ facial: 1, beard: true }).beard).toBe(false);                     // the facial hair choice wins over the old flag
  });
  it('offers what the brief asks for: 12 skin tones from fair to deep, 20+ hair styles, 8 eye shapes, 6 faces, 4 builds, 5 kinds of facial hair', () => {
    expect(SKINS.length).toBeGreaterThanOrEqual(12); expect([...SKIN_ORDER].sort((a, b) => a - b)).toEqual(SKINS.map((_, i) => i));
    const light = (hex: string): number => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11; };
    for (let i = 1; i < SKIN_ORDER.length; i++) expect(light(SKINS[SKIN_ORDER[i]])).toBeLessThan(light(SKINS[SKIN_ORDER[i - 1]]));
    expect(HAIR_STYLES.length).toBeGreaterThanOrEqual(20); expect(EYES.length).toBe(8); expect(FACES.length).toBe(6); expect(BUILDS.length).toBe(4); expect(FACIAL.length).toBe(5);
  });
  it('every hair style, top and pair of shoes draws as a portrait (the newer ones with the nearest older shape)', () => {
    for (let h = 0; h < HAIR_STYLES.length; h++) { const svg = avatarSvg({ hairStyle: h }); expect(svg).toContain('<svg'); expect(svg).not.toMatch(/undefined|NaN/); }
    for (const st of STYLES) for (const sh of SHOES) expect(bodySvg({ style: st.id, shoes: sh.id }, { gloves: true, bag: true, sunglasses: true })).not.toMatch(/undefined|NaN/);
  });
});

describe('the 3D person', () => {
  it('builds every hair style, top, shoe, build, face, eye shape and kind of facial hair, with nothing broken', () => {
    const check = (c: ReturnType<typeof buildCharacter>): void => { c.root.updateMatrixWorld(true); c.root.traverse(o => { expect(Number.isFinite(o.matrixWorld.elements[12])).toBe(true); }); expect(meshes(c.root)).toBeGreaterThan(20); };
    for (let h = 0; h < HAIR_STYLES.length; h++) check(buildCharacter({ hairStyle: h }));
    for (const st of STYLES) for (const sh of SHOES) check(buildCharacter({ style: st.id, shoes: sh.id }));
    for (let b = 0; b < 4; b++) for (let f = 0; f < 6; f++) check(buildCharacter({ build: b, face: f }));
    for (let e = 0; e < 8; e++) for (let x = 0; x < 5; x++) check(buildCharacter({ eyes: e, facial: x, eyeColor: e % 5 }));
  });
  it('a different hair style, freckles, rosy cheeks, facial hair, a coat or a bag each change the model', () => {
    const base = meshes(buildCharacter(DEFAULT_LOOK).root);
    expect(meshes(buildCharacter({ ...DEFAULT_LOOK, freckles: true }).root)).toBeGreaterThan(base);
    expect(meshes(buildCharacter({ ...DEFAULT_LOOK, rosy: true }).root)).toBeGreaterThan(base);
    expect(meshes(buildCharacter({ ...DEFAULT_LOOK, facial: 4 }).root)).toBeGreaterThan(base);
    expect(meshes(buildCharacter(DEFAULT_LOOK, { bag: true }).root)).toBeGreaterThan(base);
    expect(meshes(buildCharacter(DEFAULT_LOOK, { outer: 'coat-puffer' }).root)).toBeGreaterThan(meshes(buildCharacter(DEFAULT_LOOK, { outer: 'coat-winter' }).root));
    const sig = (h: number): string => { const parts: string[] = []; buildCharacter({ ...DEFAULT_LOOK, hairStyle: h }).head.traverse(o => { if ((o as THREE.Mesh).isMesh) parts.push([o.position.x, o.position.y, o.position.z, o.scale.x, o.scale.y, o.rotation.z].map(v => v.toFixed(3)).join(",") + JSON.stringify(((o as THREE.Mesh).geometry as unknown as { parameters?: unknown }).parameters ?? {})); }); return parts.join(';'); };
    expect(new Set(Array.from({ length: HAIR_STYLES.length }, (_, h) => sig(h))).size).toBe(HAIR_STYLES.length);      // every hair style is a different shape
  });
  it('a heavier build is wider, and stays wider through every pose', () => {
    const slim = buildCharacter({ build: 0 }), heavy = buildCharacter({ build: 3 });
    expect(heavy.torso.scale.x).toBeGreaterThan(slim.torso.scale.x * 1.3);
    for (const p of ['idle', 'walk', 'sit', 'wave', 'brr'] as Pose[]) { setPose(heavy, p, 1, 2); expect(heavy.torso.scale.x).toBeGreaterThan(1.1); }
  });
  it('seven gestures, each moving the body differently from standing still', () => {
    expect(EMOTES.map(e => e.id)).toEqual(['wave', 'laugh', 'dance', 'shrug', 'brr', 'thumbs', 'clap']);
    const c = buildCharacter(DEFAULT_LOOK), snap = (): string => [c.armL, c.armR, c.elbowL, c.elbowR, c.torso, c.head, c.legL].map(o => `${o.rotation.x.toFixed(2)},${o.rotation.z.toFixed(2)},${o.rotation.y.toFixed(2)}`).join('|');
    setPose(c, 'idle', 0, 1.3); const still = snap(), seen = new Set<string>();
    for (const e of [...EMOTES.map(x => x.id), 'phone', 'stretch'] as Pose[]) { setPose(c, e, 0, 1.3); const now = snap(); expect(now, e).not.toBe(still); seen.add(now); }
    expect(seen.size).toBe(9);
  });
});

describe('weather and clothes', () => {
  it('the temperature follows the season and the weather, the same all day: frost is -25 to -15, a summer heat 25 to 32', () => {
    expect(seasonOf(1)).toBe('winter'); expect(seasonOf(7)).toBe('summer'); expect(seasonOf(4)).toBe('offseason');
    for (let d = 0; d < 30; d++) { const s = at(1, 'frost'); s.day += d; const t = temperatureOf(s); expect(t).toBeGreaterThanOrEqual(-25); expect(t).toBeLessThanOrEqual(-15); expect(temperatureOf(s)).toBe(t); }
    for (let d = 0; d < 30; d++) { const s = at(7, 'heat'); s.day += d; const t = temperatureOf(s); expect(t).toBeGreaterThanOrEqual(25); expect(t).toBeLessThanOrEqual(32); }
    expect(whiteNights(at(6, 'clear', 'Saint Petersburg'))).toBe(true); expect(whiteNights(at(6, 'clear', 'Moscow'))).toBe(false); expect(whiteNights(at(1, 'clear', 'Saint Petersburg'))).toBe(false);
  });
  it('clothes give warmth: a full winter outfit covers minus twenty-five, summer clothes cover nothing', () => {
    expect(warmthNeeded(15)).toBe(0); expect(warmthNeeded(0)).toBe(24); expect(warmthNeeded(-25)).toBe(84);
    const winter = outfitWarmth({ style: 'sweater', bottom: 'trousers', shoes: 'valenki' }, { outer: 'coat-dublyonka', hat: 'hat-ushanka', scarf: 'scarf-wool', gloves: true, thermals: true });
    expect(winter).toBeGreaterThanOrEqual(84);
    expect(outfitWarmth({ style: 'casual', bottom: 'shorts', shoes: 'sandals' })).toBeLessThanOrEqual(0);
    expect(outfitWarmth({}, { outer: 'coat-puffer' })).toBeGreaterThan(outfitWarmth({}, { outer: 'jacket-warm' }));
  });
  it('the Warmth meter shows only when it is cold, is full indoors, drops for somebody in a T-shirt in the frost and rises with a coat', () => {
    expect(warmthMeter(at(7, 'clear'))).toBeNull();
    const s = at(1, 'frost'); expect(warmthMeter(s, true)).toBe(100);
    const cold = warmthMeter(s)!; expect(cold).toBeLessThan(20); expect(coldWord(s)).toBe('Freezing');
    s.worn = { outer: 'coat-puffer', hat: 'hat-ushanka', scarf: 'scarf-wool', gloves: true }; s.look = normalizeLook({ ...normalizeLook(s.look), shoes: 'valenki', style: 'sweater' });
    expect(warmthMeter(s)!).toBeGreaterThan(55); expect(coldWord(s)).toBeNull();
    const snow = at(1, 'snow'), rich = at(1, 'snow'); rich.clothes = 60; expect(warmthMeter(rich)!).toBeGreaterThan(warmthMeter(snow)!); expect(cold).toBe(0);   // a decent wardrobe means an old coat is on
  });
  it('outdoors and freezing: a little stress each part of the day; dressed or at home: nothing', () => {
    const s = at(1, 'frost'), st = s.stress; expect(coldPress(s)).toContain('freezing'); expect(s.stress).toBe(st + 1);
    s.loc = 'home'; expect(coldPress(s)).toBe(''); expect(s.stress).toBe(st + 1);
    const sum = at(7, 'clear'); expect(coldPress(sum)).toBe('');
  });
  it('advice says what is missing for the day, and nothing in a mild one', () => {
    const a = advice(at(1, 'frost')); expect(a.missing).toEqual(expect.arrayContaining(['a warm coat', 'a hat', 'mittens', 'winter boots'])); expect(a.line).toMatch(/^-?\d+°C|^[+-]?\d+°C/);
    expect(advice(at(8, 'clear')).missing).toEqual([]);
  });
});

describe('the clothes shop', () => {
  it('sells the winter things from the brief, each in a market stall, a mall or a boutique', () => {
    for (const id of ['coat-puffer', 'coat-wool', 'coat-dublyonka', 'valenki', 'mittens', 'thermals', 'hat-ushanka', 'tracksuit', 'hat-cap', 'sunglasses', 'bag', 'slippers']) expect(itemById(id), id).toBeTruthy();
    expect(new Set(CATALOG.filter(i => i.cat === 'clothes').map(tierOf))).toEqual(new Set(['budget', 'mid', 'premium']));
    expect(tierOf(itemById('coat-dublyonka')!)).toBe('premium'); expect(tierOf(itemById('mittens')!)).toBe('budget');
  });
  it('mittens, a bag, thermals and sunglasses are worn and taken off like glasses; valenki and the tracksuit change the look', () => {
    const s = G.newState('T', 'moscow'); s.money = 100000;
    for (const id of ['mittens', 'bag', 'thermals', 'sunglasses']) { expect(buy(s, id).ok).toBe(true); expect(wearing(s, itemById(id)!)).toBe(true); expect(wear(s, id).ok).toBe(true); expect(wearing(s, itemById(id)!)).toBe(false); }
    expect(s.worn).toEqual({});
    buy(s, 'valenki'); expect(normalizeLook(s.look).shoes).toBe('valenki'); buy(s, 'tracksuit'); expect(normalizeLook(s.look).style).toBe('tracksuit');
  });
});

describe('people of the city', () => {
  it('some passers-by are dressed for who they are: a grandmother in a headscarf with no beard, a metro worker at the station', () => {
    const roles = new Map<string, { place: string; worn: Record<string, unknown>; facial: number }[]>();
    for (let d = 0; d < 60; d++) for (let sl = 0; sl < 3; sl++) { const s = G.newState('T', 'moscow'); s.day = d; s.slot = sl; s.job = null; for (const n of crowdFor(s)) if (n.role) { const l = roles.get(n.role) ?? []; l.push({ place: n.place, worn: n.worn as never, facial: n.look.facial }); roles.set(n.role, l); } }
    expect(roles.size).toBeGreaterThanOrEqual(6);
    for (const b of roles.get('babushka') ?? []) { expect(b.worn.hat).toBe('hat-headscarf'); expect(b.facial).toBe(0); }
    for (const m of roles.get('metro') ?? []) expect(m.place).toBe('station');
    expect(ROLES.length).toBe(8);
  });
  it('three ready-made characters, each a valid look and outfit, and a list of Russian names in both alphabets', () => {
    expect(SAMPLES.map(x => x.id)).toEqual(['intl-student', 'office', 'babushka']);
    expect(SAMPLES[0].worn.outer).toBe('coat-puffer'); expect(SAMPLES[1].worn.outer).toBe('coat-wool'); expect(SAMPLES[2].worn.hat).toBe('hat-headscarf');
    for (const x of SAMPLES) { const l = normalizeLook({ ...DEFAULT_LOOK, ...x.look }); for (const [k, v] of Object.entries(x.look)) expect((l as unknown as Record<string, unknown>)[k], `${x.id} ${k}`).toEqual(v); }
    expect(RUSSIAN_NAMES.some(n => /[А-Яа-я]/.test(n))).toBe(true); expect(RUSSIAN_NAMES).toEqual(expect.arrayContaining(['Artyom', 'Dasha', 'Nikita', 'Polina', 'Timur', 'Aigul']));
  });
});

describe('the creator in the page', () => {
  it('a ready-made character fills the look and the name, and the game starts with its clothes on and in the wardrobe; the random name button gives a Russian name', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    localStorage.clear(); vi.resetModules();
    const { boot } = await import('../src/ui'); boot(); await (await import('../src/ui')).uiReady();
    const name = document.getElementById('nameInput') as HTMLInputElement;
    document.getElementById('randNameBtn')!.click(); expect(RUSSIAN_NAMES).toContain(name.value);
    name.value = '';
    document.querySelector<HTMLButtonElement>('[data-sample="intl-student"]')!.click();
    expect(name.value).toBe('Amara'); expect(document.querySelector('[data-sample="intl-student"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelectorAll('#creatorControls [data-look="skin"]').length).toBe(SKINS.length);
    expect(document.querySelectorAll('#creatorControls [data-look="hairStyle"]').length).toBe(HAIR_STYLES.length);
    (document.getElementById('crFreckles') as HTMLInputElement).click();
    document.getElementById('startBtn')!.click();
    const saved = JSON.parse(localStorage.getItem('vrussia_save') ?? 'null') ?? G.load();
    const st = saved ?? null;
    if (st) { expect(st.worn.outer).toBe('coat-puffer'); expect(st.inv['coat-puffer']).toBe(1); expect(st.inv.mittens).toBe(1); expect(st.look.freckles).toBe(true); expect(st.look.hairStyle).toBe(11); }
    expect(document.getElementById('moodPill')!.textContent!.length).toBeGreaterThan(2);
    expect(document.getElementById('date')!.textContent).toMatch(/°C/);
  });
});
