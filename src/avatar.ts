/* People pictures: every player and every invented person is drawn as a small illustrated portrait (SVG) from a few choices:
   skin tone, hair style and colour, beard, clothing style and colour, and the things worn on top (coat, hat, scarf, glasses).
   Nothing is a photograph and no outside picture is used: the portraits are drawn here, so they work offline and cost nothing to load. */

export interface Look {
  skin: number;        // 0..SKINS.length-1
  hairStyle: number;   // 0..HAIR_STYLES.length-1
  hairColor: number;   // 0..HAIR_COLORS.length-1
  beard: boolean;
  style: StyleId;      // what is worn on top
  accent: number;      // 0..ACCENTS.length-1, the colour of the top
  height: number;      // 0 short, 1 average, 2 tall
  bottom: BottomId;    // trousers and so on
  bottomColor: number; // 0..BOTTOM_COLORS.length-1
  shoes: ShoeId;
  shoeColor: number;   // 0..SHOE_COLORS.length-1
  eyes: number;        // the eye shape: 0..EYES.length-1 (0 round, 1 almond, as before)
  build: number;       // 0 slim, 1 average, 2 broad, 3 heavy
  face: number;        // 0..FACES.length-1
  eyeColor: number;    // 0..EYE_COLORS.length-1
  facial: number;      // 0 none, 1 stubble, 2 moustache, 3 beard, 4 goatee (`beard` stays for old saves: true means 3)
  brows: number;       // 0 soft, 1 straight, 2 thick, 3 arched
  nose: number;        // 0..3
  lips: number;        // 0..3
  freckles: boolean;
  rosy: boolean;       // red cheeks from the frost
}
export type StyleId = 'casual' | 'sweater' | 'smart' | 'sporty' | 'dress' | 'folk' | 'tracksuit';
export type BottomId = 'jeans' | 'trousers' | 'shorts' | 'skirt';
export type ShoeId = 'sneakers' | 'boots' | 'shoes' | 'sandals' | 'valenki' | 'slippers';
export interface Worn { outer?: string; hat?: string; scarf?: string; glasses?: boolean; gloves?: boolean; bag?: boolean; thermals?: boolean; sunglasses?: boolean }

export const SKINS = ['#fbe3d0', '#f6d5bd', '#efc19b', '#e0a97a', '#c98a5a', '#a8693f', '#7d4a2c', '#55321d', '#fff0e4', '#e8b98e', '#b77a4a', '#3e2415'];
/** The skin tones from the fairest to the deepest, for the creator (the four added later sit between the first eight). */
export const SKIN_ORDER = [8, 0, 1, 2, 9, 3, 4, 10, 5, 6, 7, 11];
export const HAIR_COLORS = ['#1c1410', '#3b2417', '#6b4528', '#a8743a', '#d9b45a', '#efe3b8', '#a23a1e', '#9a9a9a', '#f3f3f3'];
export const HAIR_COLOR_NAMES = ['Black', 'Dark brown', 'Brown', 'Light brown', 'Blond', 'Very fair', 'Red', 'Grey', 'White'] as const;
export const EYES = ['Round', 'Almond', 'Wide', 'Narrow', 'Hooded', 'Upturned', 'Downturned', 'Monolid'] as const;
export const EYE_COLORS = ['#7d8794', '#4a78b8', '#4f8a5b', '#8a6a3a', '#4a2e1c'] as const;
export const EYE_COLOR_NAMES = ['Grey', 'Blue', 'Green', 'Hazel', 'Brown'] as const;
export const BUILDS = ['Slim', 'Average', 'Broad', 'Heavy'] as const;
export const FACES = ['Oval', 'Round', 'Square', 'Heart', 'Long', 'Diamond'] as const;
export const FACIAL = ['None', 'Stubble', 'Moustache', 'Beard', 'Goatee'] as const;
export const BROWS = ['Soft', 'Straight', 'Thick', 'Arched'] as const;
export const NOSES = ['Small', 'Straight', 'Wide', 'Long'] as const;
export const LIPS = ['Thin', 'Medium', 'Full', 'Wide'] as const;
export const ACCENTS = ['#3b6fe0', '#e0373f', '#3ec27a', '#f0b43c', '#a56be0', '#2bb5c9', '#16203a'];
export const HAIR_STYLES = ['Short', 'Long', 'Curly', 'Bun', 'Buzz', 'Bald', 'Braid', 'Wavy', 'Coily', 'Undercut', 'Bob', 'Afro', 'Locs', 'Long plait', 'Ponytail', 'Pixie', 'Side part', 'Mohawk', 'Twin buns', 'Cornrows', 'Shag', 'Hat hair'] as const;
/** The portraits (2D) draw the newer styles with the nearest older shape. */
const PORTRAIT_HAIR = [0, 1, 2, 3, 4, 5, 6, 7, 8, 4, 1, 8, 7, 6, 3, 4, 0, 4, 3, 4, 2, 0];
export const STYLES: { id: StyleId; label: string }[] = [{ id: 'casual', label: 'T-shirt' }, { id: 'sweater', label: 'Sweater' }, { id: 'smart', label: 'Shirt' }, { id: 'sporty', label: 'Hoodie' }, { id: 'dress', label: 'Dress' }, { id: 'tracksuit', label: 'Tracksuit' }, { id: 'folk', label: 'Folk blouse' }];
export const BOTTOMS: { id: BottomId; label: string }[] = [{ id: 'jeans', label: 'Jeans' }, { id: 'trousers', label: 'Trousers' }, { id: 'shorts', label: 'Shorts' }, { id: 'skirt', label: 'Skirt' }];
export const SHOES: { id: ShoeId; label: string }[] = [{ id: 'sneakers', label: 'Sneakers' }, { id: 'boots', label: 'Boots' }, { id: 'shoes', label: 'Shoes' }, { id: 'sandals', label: 'Sandals' }, { id: 'valenki', label: 'Valenki' }, { id: 'slippers', label: 'Slippers' }];
export const BOTTOM_COLORS = ['#2f4b7c', '#16203a', '#5b5b5b', '#6b4a2e', '#3a6b4a', '#8a3a3a'];
export const SHOE_COLORS = ['#ffffff', '#16203a', '#6b4a2e', '#e0373f', '#3a3f4f'];
export const HEIGHTS = ['Short', 'Average', 'Tall'] as const;

export const DEFAULT_LOOK: Look = { skin: 1, hairStyle: 0, hairColor: 1, beard: false, style: 'casual', accent: 0, height: 1, bottom: 'jeans', bottomColor: 0, shoes: 'sneakers', shoeColor: 0, eyes: 0, build: 1, face: 0, eyeColor: 4, facial: 0, brows: 0, nose: 0, lips: 1, freckles: false, rosy: false };

const clampInt = (v: unknown, max: number, fallback: number): number => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : fallback;
};

/** Makes any stored or typed value into a valid look, so a damaged save can never break the drawing. */
export function normalizeLook(raw: unknown): Look {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const style = STYLES.some(s => s.id === o.style) ? (o.style as StyleId) : DEFAULT_LOOK.style;
  const bottom = BOTTOMS.some(s => s.id === o.bottom) ? (o.bottom as BottomId) : DEFAULT_LOOK.bottom;
  const shoes = SHOES.some(s => s.id === o.shoes) ? (o.shoes as ShoeId) : DEFAULT_LOOK.shoes;
  return {
    skin: clampInt(o.skin, SKINS.length - 1, DEFAULT_LOOK.skin), hairStyle: clampInt(o.hairStyle, HAIR_STYLES.length - 1, DEFAULT_LOOK.hairStyle),
    hairColor: clampInt(o.hairColor, HAIR_COLORS.length - 1, DEFAULT_LOOK.hairColor), beard: clampInt(o.facial, FACIAL.length - 1, 0) > 0 ? Number(o.facial) >= 3 : o.beard === true, style, accent: clampInt(o.accent, ACCENTS.length - 1, DEFAULT_LOOK.accent),
    height: clampInt(o.height, HEIGHTS.length - 1, DEFAULT_LOOK.height), bottom, bottomColor: clampInt(o.bottomColor, BOTTOM_COLORS.length - 1, DEFAULT_LOOK.bottomColor),
    shoes, shoeColor: clampInt(o.shoeColor, SHOE_COLORS.length - 1, DEFAULT_LOOK.shoeColor), eyes: clampInt(o.eyes, EYES.length - 1, DEFAULT_LOOK.eyes),
    build: clampInt(o.build, BUILDS.length - 1, 1), face: clampInt(o.face, FACES.length - 1, 0), eyeColor: clampInt(o.eyeColor, EYE_COLORS.length - 1, 4),
    facial: clampInt(o.facial, FACIAL.length - 1, 0) || (o.beard === true ? 3 : 0), brows: clampInt(o.brows, BROWS.length - 1, 0), nose: clampInt(o.nose, NOSES.length - 1, 0), lips: clampInt(o.lips, LIPS.length - 1, 1),
    freckles: o.freckles === true, rosy: o.rosy === true,
  };
}

/* ---------- people from many places ---------- */
/** Starting points for appearance. They only set the first values in the creator; the player can change everything afterwards, and the game never reads a look to decide anything about a person. */
export type GroupId = 'slavic' | 'central-asian' | 'caucasus' | 'volga' | 'east-asian' | 'african';
export const GROUPS: { id: GroupId; label: string; look: Partial<Look> }[] = [
  { id: 'slavic', label: 'Slavic / Russian', look: { skin: 1, hairColor: 4, hairStyle: 0, eyes: 0, beard: false } },
  { id: 'central-asian', label: 'Central Asian (Tajik, Uzbek, Kyrgyz)', look: { skin: 3, hairColor: 0, hairStyle: 0, eyes: 1, beard: false } },
  { id: 'caucasus', label: 'Caucasus (Dagestani, Chechen, Armenian)', look: { skin: 3, hairColor: 0, hairStyle: 7, eyes: 0, beard: false } },
  { id: 'volga', label: 'Tatar / Bashkir', look: { skin: 2, hairColor: 1, hairStyle: 0, eyes: 1, beard: false } },
  { id: 'east-asian', label: 'East Asian / Siberian', look: { skin: 2, hairColor: 0, hairStyle: 0, eyes: 1, beard: false } },
  { id: 'african', label: 'African', look: { skin: 7, hairColor: 0, hairStyle: 8, eyes: 0, beard: false } },
];

/** Applies a starting point to a look and keeps everything else (clothes, height). */
export function applyGroup(rawLook: unknown, id: string): Look {
  const g = GROUPS.find(x => x.id === id);
  return normalizeLook({ ...normalizeLook(rawLook), ...(g ? g.look : {}) });
}

/** Which starting look fits each character of the game. */
export const GROUP_OF_ORIGIN: Record<string, GroupId> = { moscow: 'slavic', region: 'slavic', tajik: 'central-asian', uzbek: 'central-asian', kyrgyz: 'central-asian', student: 'african', dagestan: 'caucasus' };

/** Shares (in per cent) of the people one meets in a city. Large cities are mixed; some regions are known for one people. A guess for a game, not a census. */
export function groupWeights(city: string): Record<GroupId, number> {
  const base: Record<GroupId, number> = { slavic: 72, 'central-asian': 11, caucasus: 7, volga: 5, 'east-asian': 3, african: 2 };
  const tweaks: Record<string, Partial<Record<GroupId, number>>> = {
    Moscow: { slavic: 66, 'central-asian': 15, caucasus: 8, volga: 6, 'east-asian': 3, african: 2 },
    'Saint Petersburg': { slavic: 72, 'central-asian': 13, caucasus: 5, volga: 4, 'east-asian': 3, african: 3 },
    Kazan: { slavic: 48, volga: 40, 'central-asian': 6, caucasus: 3, 'east-asian': 1, african: 2 },
    Ufa: { slavic: 50, volga: 38, 'central-asian': 6, caucasus: 3, 'east-asian': 1, african: 2 },
    Makhachkala: { slavic: 6, caucasus: 90, 'central-asian': 2, volga: 1, 'east-asian': 0, african: 1 },
    Yakutsk: { slavic: 35, 'east-asian': 55, 'central-asian': 5, caucasus: 2, volga: 2, african: 1 },
    Irkutsk: { slavic: 78, 'east-asian': 14, 'central-asian': 4, caucasus: 2, volga: 1, african: 1 },
    Khabarovsk: { slavic: 80, 'east-asian': 12, 'central-asian': 4, caucasus: 2, volga: 1, african: 1 },
  };
  return { ...base, ...(tweaks[city] || {}) } as Record<GroupId, number>;
}

/** Picks a group for a person from a number (any whole number), by the shares of the city. */
export function groupFor(city: string, n: number): GroupId {
  const w = groupWeights(city);
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = ((n % total) + total) % total;
  for (const g of GROUPS) { if (r < w[g.id]) return g.id; r -= w[g.id]; }
  return 'slavic';
}

const SKIN_BY_GROUP: Record<GroupId, number[]> = { slavic: [0, 1, 1, 2], 'central-asian': [2, 3, 3, 4], caucasus: [2, 3, 3, 4], volga: [1, 2, 2, 3], 'east-asian': [1, 2, 2, 3], african: [5, 6, 7, 7] };
const HAIR_BY_GROUP: Record<GroupId, number[]> = {
  slavic: [1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 6, 0],
  'central-asian': [0, 0, 0, 0, 1, 1], caucasus: [0, 0, 0, 1, 1, 2], volga: [0, 1, 1, 2, 2, 3], 'east-asian': [0, 0, 0, 1], african: [0, 0, 0, 1],
};

/** The group a seeded person belongs to, so that clothes can fit it (the same number that lookFromSeed uses). */
export function seedGroup(seed: string, city = ''): GroupId {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  return groupFor(city, h >>> 3);
}

/** A person made from a text (a name): the same text always gives the same person. `city` sets the mix of people; `group` fixes it. */
export function lookFromSeed(seed: string, hint: { beardable?: boolean; female?: boolean; city?: string; group?: GroupId } = {}): Look {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  const pick = (n: number, shift: number): number => ((h >>> shift) % n + n) % n;
  const group = hint.group ?? groupFor(hint.city ?? '', h >>> 3);
  const old = pick(12, 9) === 0;   // now and then an older person with grey or white hair
  const female = !!hint.female;
  const hairStyles = female
    ? (group === 'african' ? [6, 8, 1, 8] : group === 'slavic' ? [1, 2, 3, 6, 7, 1] : [1, 6, 7, 3, 1])
    : (group === 'african' ? [4, 8, 0, 4] : [0, 4, 0, 2, 5, 0]);
  return normalizeLook({
    skin: SKIN_BY_GROUP[group][pick(4, 7)],
    hairStyle: hairStyles[pick(hairStyles.length, 13)],
    hairColor: old ? (pick(2, 21) === 0 ? 7 : 8) : HAIR_BY_GROUP[group][pick(HAIR_BY_GROUP[group].length, 11)],
    beard: !!hint.beardable && pick(group === 'caucasus' || group === 'central-asian' ? 2 : 4, 15) === 0,
    eyes: group === 'central-asian' || group === 'volga' || group === 'east-asian' ? (pick(10, 19) < 8 ? 1 : 0) : 0,
    style: female ? (['dress', 'sweater', 'folk', 'smart', 'casual'] as StyleId[])[pick(5, 17)] : (['casual', 'sweater', 'smart', 'sporty', 'casual'] as StyleId[])[pick(5, 17)],
    accent: pick(ACCENTS.length, 21),
    height: pick(3, 25),
    bottom: female ? (['skirt', 'jeans', 'trousers'] as BottomId[])[pick(3, 27)] : (['jeans', 'trousers', 'shorts', 'jeans'] as BottomId[])[pick(4, 27)],
    bottomColor: pick(BOTTOM_COLORS.length, 29),
    shoes: SHOES[pick(SHOES.length, 31)].id, shoeColor: pick(SHOE_COLORS.length, 5),
  });
}

/** What an invented person wears on top: a coat, hat and scarf in the cold months, and now and then something traditional (a skullcap or a headscarf). `month` is 0 to 11. */
export function wornFor(seed: string, group: GroupId, female: boolean, month: number): Worn {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  const pick = (n: number, shift: number): number => ((h >>> shift) % n + n) % n;
  const cold = month >= 10 || month <= 2;
  const w: Worn = {};
  if (cold && pick(10, 3) < 7) w.outer = pick(2, 5) === 0 ? 'coat-winter' : 'jacket-warm';
  if (cold && pick(10, 8) < 4) w.hat = pick(2, 11) === 0 ? 'hat-ushanka' : 'hat-beanie';
  if (cold && pick(10, 14) < 3) w.scarf = 'scarf-wool';
  const traditional = group === 'central-asian' || group === 'volga' || group === 'caucasus';
  if (!w.hat && traditional && !female && pick(100, 17) < 14) w.hat = 'hat-doppi';
  if (!w.hat && traditional && female && pick(100, 20) < 12) w.hat = 'hat-headscarf';
  if (pick(12, 23) === 0) w.glasses = true;
  return w;
}

/** The same look in the shapes the 2D portraits know: a newer hair style, top or pair of shoes is drawn as the nearest older one. */
function portraitLook(raw: unknown): Look {
  const l = normalizeLook(raw);
  return { ...l, hairStyle: PORTRAIT_HAIR[l.hairStyle] ?? 0, style: l.style === 'tracksuit' ? 'sporty' : l.style, shoes: l.shoes === 'valenki' ? 'boots' : l.shoes === 'slippers' ? 'shoes' : l.shoes, eyes: l.eyes > 1 ? (l.eyes === 3 || l.eyes === 7 ? 1 : 0) : l.eyes };
}
const shade = (hex: string, amt: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number): number => Math.max(0, Math.min(255, v + amt));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => c(v).toString(16).padStart(2, '0')).join('');
};

const hairBack = (style: number, c: string): string => {
  switch (style) {
    case 1: return `<path d="M26 52 Q24 18 50 16 Q76 18 74 52 L76 96 Q62 102 50 100 Q38 102 24 96 Z" fill="${c}"/>`;   // long
    case 2: return `<g fill="${c}"><circle cx="30" cy="40" r="11"/><circle cx="42" cy="28" r="12"/><circle cx="58" cy="28" r="12"/><circle cx="70" cy="40" r="11"/><circle cx="50" cy="24" r="12"/></g>`;   // curly
    case 3: return `<circle cx="50" cy="14" r="9" fill="${c}"/>`;   // bun
    case 6: return `<path d="M27 52 Q24 18 50 16 Q76 18 73 52 L73 66 Q50 60 27 66 Z" fill="${c}"/>`;   // braid: the plait is drawn in front
    case 7: return `<path d="M26 52 Q22 16 50 14 Q78 16 74 52 Q80 70 72 90 Q64 84 66 70 Q58 78 50 74 Q42 78 34 70 Q36 84 28 90 Q20 70 26 52 Z" fill="${c}"/>`;   // wavy
    case 8: return `<circle cx="50" cy="34" r="30" fill="${c}"/><circle cx="28" cy="46" r="10" fill="${c}"/><circle cx="72" cy="46" r="10" fill="${c}"/>`;   // coily
    default: return '';
  }
};
const hairFront = (style: number, c: string): string => {
  switch (style) {
    case 0: return `<path d="M30 44 Q28 22 50 20 Q72 22 70 44 Q60 32 50 34 Q40 32 30 44 Z" fill="${c}"/>`;
    case 1: return `<path d="M30 46 Q30 22 50 21 Q70 22 70 46 Q58 34 50 36 Q42 34 30 46 Z" fill="${c}"/>`;
    case 2: return `<path d="M30 44 Q34 26 50 25 Q66 26 70 44 Q60 36 50 38 Q40 36 30 44 Z" fill="${c}"/>`;
    case 3: return `<path d="M31 44 Q30 24 50 22 Q70 24 69 44 Q58 33 50 35 Q42 33 31 44 Z" fill="${c}"/>`;
    case 4: return `<path d="M32 42 Q34 28 50 27 Q66 28 68 42 Q58 34 50 35 Q42 34 32 42 Z" fill="${c}" opacity=".9"/>`;
    case 6: return `<path d="M30 46 Q30 22 50 21 Q70 22 70 46 Q58 34 50 36 Q42 34 30 46 Z" fill="${c}"/><path d="M62 56 Q72 72 68 94 Q64 102 60 94 Q64 72 58 60 Z" fill="${c}"/><circle cx="63" cy="96" r="2.4" fill="#e0373f"/>`;
    case 7: return `<path d="M30 46 Q30 22 50 21 Q70 22 70 46 Q58 34 50 36 Q42 34 30 46 Z" fill="${c}"/>`;
    case 8: return `<path d="M28 46 Q26 20 50 18 Q74 20 72 46 Q60 34 50 36 Q40 34 28 46 Z" fill="${c}"/>`;
    default: return '';
  }
};

const clothes = (look: Look, base: string): string => {
  const dark = shade(base, -35);
  switch (look.style) {
    case 'smart': return `<path d="M14 120 Q16 88 38 84 L50 96 L62 84 Q84 88 86 120 Z" fill="${base}"/><path d="M50 96 L44 120 L56 120 Z" fill="#fff"/><path d="M50 98 L47 108 L50 120 L53 108 Z" fill="${dark}"/>`;
    case 'dress': return `<path d="M14 120 Q16 88 38 84 Q50 92 62 84 Q84 88 86 120 Z" fill="${base}"/><path d="M38 86 Q50 98 62 86" stroke="${dark}" stroke-width="2" fill="none"/>`;
    case 'sweater': return `<path d="M14 120 Q16 88 38 84 Q50 90 62 84 Q84 88 86 120 Z" fill="${base}"/><path d="M40 86 Q50 96 60 86" stroke="${dark}" stroke-width="4" fill="none"/>`;
    case 'sporty': return `<path d="M14 120 Q16 88 38 84 Q50 90 62 84 Q84 88 86 120 Z" fill="${base}"/><path d="M44 86 L44 120 M56 86 L56 120" stroke="#fff" stroke-width="2" opacity=".85"/>`;
    case 'folk': return `<path d="M14 120 Q16 88 38 84 Q50 90 62 84 Q84 88 86 120 Z" fill="#f4efe6"/><path d="M38 86 Q50 94 62 86" stroke="${base}" stroke-width="4" fill="none"/><g fill="${base}"><circle cx="30" cy="104" r="2"/><circle cx="38" cy="108" r="2"/><circle cx="62" cy="108" r="2"/><circle cx="70" cy="104" r="2"/></g>`;
    default: return `<path d="M14 120 Q16 88 38 84 Q50 92 62 84 Q84 88 86 120 Z" fill="${base}"/><path d="M42 86 Q50 94 58 86" stroke="${dark}" stroke-width="2" fill="none"/>`;
  }
};

const outerColor = (id: string): string => (id.includes('chapan') ? '#2f6b4a' : id.includes('coat') ? '#3a3f4f' : id.includes('jacket') ? '#6b4a2e' : '#7a1f2b');
/** Stripes for the traditional robe (chapan). */
const robeStripes = (id: string, x0: number, x1: number, y0: number, y1: number): string => (id.includes('chapan') ? `<g stroke="#e0b43c" stroke-width="1.6" opacity=".9">${[0.2, 0.4, 0.6, 0.8].map(f => `<path d="M${(x0 + (x1 - x0) * f).toFixed(1)} ${y0} L${(x0 + (x1 - x0) * f).toFixed(1)} ${y1}"/>`).join('')}</g>` : '');

const outerOf = (id: string | undefined): string => {
  if (!id) return '';
  const col = outerColor(id);
  return `<path d="M10 120 Q10 86 34 82 L40 120 Z M90 120 Q90 86 66 82 L60 120 Z" fill="${col}"/><path d="M34 82 L42 100 M66 82 L58 100" stroke="${shade(col, -30)}" stroke-width="2" fill="none"/>`;
};

/** The head and face: ears, beard, eyes, brows, nose, mouth, glasses, hair in front and a hat. Drawn in the portrait's own coordinates (face centre 50,52). */
/** What is behind the head: the hair, or a headscarf that covers it. */
function headBack(look: Look, worn: Worn): string {
  if (worn.hat === 'hat-headscarf') return `<path d="M22 56 Q22 10 50 10 Q78 10 78 56 L74 86 Q50 68 26 86 Z" fill="#a56be0"/>`;
  return hairBack(look.hairStyle, HAIR_COLORS[look.hairColor]);
}

function faceMarkup(look: Look, worn: Worn): string {
  const skin = SKINS[look.skin], hair = HAIR_COLORS[look.hairColor];
  const eye = look.skin >= 6 ? '#f6efe6' : '#fff';
  const almond = look.eyes === 1;
  const scarfOn = worn.hat === 'hat-headscarf', doppi = worn.hat === 'hat-doppi';
  const hat = worn.hat && !scarfOn && !doppi ? `<path d="M26 40 Q26 12 50 12 Q74 12 74 40 Q50 32 26 40 Z" fill="${worn.hat.includes('ushanka') ? '#6b4a2e' : '#e0373f'}"/><rect x="24" y="36" width="52" height="8" rx="4" fill="${worn.hat.includes('ushanka') ? '#8a6a46' : '#c0282f'}"/>`
    : doppi ? `<path d="M32 38 Q50 10 68 38 Q50 32 32 38 Z" fill="#16203a"/><rect x="31" y="35" width="38" height="5" rx="2.5" fill="#fff"/><path d="M36 33 Q50 18 64 33" stroke="#fff" stroke-width="1.3" fill="none" stroke-dasharray="2 2"/>`
    : scarfOn ? `<path d="M28 47 Q50 24 72 47 Q72 38 50 26 Q28 38 28 47 Z" fill="#8a4fc9"/><path d="M30 62 Q50 82 70 62 L72 80 Q50 98 28 80 Z" fill="#a56be0"/>` : '';
  const eyes = almond
    ? `<ellipse cx="41" cy="54.4" rx="3.9" ry="1.9" fill="${eye}" transform="rotate(8 41 54.4)"/><ellipse cx="59" cy="54.4" rx="3.9" ry="1.9" fill="${eye}" transform="rotate(-8 59 54.4)"/><circle cx="41" cy="54.5" r="1.5" fill="#1c1410"/><circle cx="59" cy="54.5" r="1.5" fill="#1c1410"/>`
    : `<ellipse cx="41" cy="54" rx="3.4" ry="2.6" fill="${eye}"/><ellipse cx="59" cy="54" rx="3.4" ry="2.6" fill="${eye}"/><circle cx="41" cy="54.4" r="1.8" fill="#1c1410"/><circle cx="59" cy="54.4" r="1.8" fill="#1c1410"/>`;
  const glasses = worn.glasses ? `<g fill="none" stroke="#16203a" stroke-width="1.6"><circle cx="40" cy="55" r="7"/><circle cx="60" cy="55" r="7"/><path d="M47 55 L53 55"/></g>` : '';
  const beard = look.beard ? `<path d="M34 62 Q36 84 50 86 Q64 84 66 62 Q58 72 50 72 Q42 72 34 62 Z" fill="${hair}"/>` : '';
  return `<ellipse cx="50" cy="52" rx="21" ry="25" fill="${skin}"/>
    <ellipse cx="29.5" cy="54" rx="3.4" ry="5" fill="${shade(skin, -10)}"/><ellipse cx="70.5" cy="54" rx="3.4" ry="5" fill="${shade(skin, -10)}"/>
    ${beard}
    ${eyes}
    <path d="M36 48 Q41 45.5 46 48 M54 48 Q59 45.5 64 48" stroke="${shade(hair, -10)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M50 56 L48 63 L52 63" stroke="${shade(skin, -35)}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M43 68 Q50 74 57 68" stroke="${look.beard ? '#fff' : '#a23a3a'}" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${glasses}${scarfOn ? '' : hairFront(look.hairStyle, hair)}${hat}`;
}

const ariaOf = (title: string): string => (title ? ` role="img" aria-label="${title.replace(/[<>"&]/g, '')}"` : ' aria-hidden="true"');

/** The portrait (head and shoulders). `title` is read aloud by screen readers; pass an empty text for a purely decorative picture. */
export function avatarSvg(rawLook: unknown, worn: Worn = {}, title = 'Portrait'): string {
  const look = portraitLook(rawLook);
  const skin = SKINS[look.skin], hair = HAIR_COLORS[look.hairColor], accent = ACCENTS[look.accent];
  const scarf = worn.scarf ? `<path d="M34 80 Q50 92 66 80 L68 92 Q50 104 32 92 Z" fill="#e0373f"/><path d="M60 90 L66 116 L56 114 Z" fill="#c0282f"/>` : '';
  return `<svg class="avatar-svg" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"${ariaOf(title)}>
    <circle cx="50" cy="60" r="58" fill="${shade(accent, 150)}"/>
    ${headBack(look, worn)}
    ${clothes(look, accent)}${outerOf(worn.outer)}
    <rect x="43" y="68" width="14" height="18" rx="5" fill="${shade(skin, -18)}"/>
    ${faceMarkup(look, worn)}${scarf}
  </svg>`;
}

/* ---------- the whole person ---------- */
const HEIGHT_SCALE = [0.9, 1, 1.1];

/** The whole body in a 100 x 200 box, standing on the line y = 196. The player's height scales the figure from the ground up. Used inside other pictures too. */
export function bodyGroup(rawLook: unknown, worn: Worn = {}): string {
  const look = portraitLook(rawLook);
  const skin = SKINS[look.skin], hair = HAIR_COLORS[look.hairColor], top = ACCENTS[look.accent], pants = BOTTOM_COLORS[look.bottomColor], shoe = SHOE_COLORS[look.shoeColor];
  const k = HEIGHT_SCALE[look.height];
  const skinDark = shade(skin, -18);
  const dress = look.style === 'dress';
  const longSleeve = look.style !== 'casual' && look.style !== 'dress';
  // legs
  let legs = '';
  const leg = (x: number): string => {
    const bottomEnd = look.bottom === 'shorts' ? 142 : look.bottom === 'skirt' || dress ? 150 : 186;
    const cloth = dress || look.bottom === 'skirt' ? '' : `<rect x="${x}" y="108" width="12" height="${bottomEnd - 108}" rx="3" fill="${pants}"/>`;
    const bare = bottomEnd < 186 ? `<rect x="${x + 1}" y="${bottomEnd - 4}" width="10" height="${186 - bottomEnd + 4}" rx="3" fill="${skin}"/>` : '';
    return bare + cloth;
  };
  legs = leg(36) + leg(52);
  const skirt = look.bottom === 'skirt' && !dress ? `<path d="M31 108 L69 108 L74 148 L26 148 Z" fill="${pants}"/>` : '';
  // shoes
  const foot = (x: number, flip: number): string => {
    const tx = flip ? x - 4 : x;
    switch (look.shoes) {
      case 'boots': return `<path d="M${x} 168 L${x + 12} 168 L${x + 12} 192 L${tx - 2 + (flip ? 0 : 6)} 194 L${tx - 2 + (flip ? 0 : 6)} 197 L${x - 2} 197 L${x - 2} 192 Z" fill="${shoe}"/><rect x="${x - 2}" y="195" width="16" height="2.5" rx="1" fill="#16203a"/>`;
      case 'shoes': return `<path d="M${x} 184 L${x + 12} 184 L${x + 14} 194 L${x - 3} 194 Z" fill="${shoe}"/><rect x="${x - 3}" y="193" width="17" height="3.5" rx="1.5" fill="#16203a"/>`;
      case 'sandals': return `<rect x="${x - 1}" y="188" width="14" height="8" rx="3" fill="${skin}"/><path d="M${x} 188 L${x + 12} 188" stroke="${shoe}" stroke-width="2.4"/><rect x="${x - 2}" y="195" width="16" height="2.5" rx="1" fill="${shoe}"/>`;
      default: return `<path d="M${x} 182 L${x + 12} 182 L${x + 14} 192 L${x - 3} 192 Z" fill="${shoe}"/><rect x="${x - 3}" y="191" width="17" height="5" rx="2.5" fill="#fff" stroke="#00000022"/>`;
    }
  };
  const feet = foot(36, 1) + foot(52, 0);
  // torso and arms
  const sleeveEnd = longSleeve ? 100 : 78;
  const arm = (x: number, dir: number): string => {
    const x2 = x + dir * 3;
    return `<path d="M${x} 58 L${x2} 58 L${x2 + dir * 1} 106 L${x + dir * -1} 106 Z" fill="${skin}"/><path d="M${x} 58 L${x2} 58 L${x2 + dir * 1} ${sleeveEnd} L${x + dir * -1} ${sleeveEnd} Z" fill="${top}"/><circle cx="${x + dir * 1}" cy="108" r="4.2" fill="${skin}"/>`;
  };
  const torsoBottom = dress ? 150 : 114;
  const torso = dress
    ? `<path d="M33 58 Q50 52 67 58 L70 108 L76 150 L24 150 L30 108 Z" fill="${top}"/>`
    : `<path d="M33 58 Q50 52 67 58 L70 ${torsoBottom} L30 ${torsoBottom} Z" fill="${top}"/>`;
  const detail = look.style === 'smart' ? `<path d="M50 60 L45 76 L50 82 L55 76 Z" fill="#fff"/><path d="M50 66 L48 82 L50 90 L52 82 Z" fill="${shade(top, -40)}"/>`
    : look.style === 'sporty' ? `<path d="M46 56 L46 112 M54 56 L54 112" stroke="#fff" stroke-width="1.6" opacity=".85"/>`
    : look.style === 'folk' ? `<g fill="${shade(top, -10)}"><circle cx="40" cy="96" r="2"/><circle cx="50" cy="100" r="2"/><circle cx="60" cy="96" r="2"/></g><path d="M38 60 Q50 68 62 60" stroke="${shade(top, -25)}" stroke-width="3" fill="none"/>`
    : `<path d="M44 58 Q50 64 56 58" stroke="${shade(top, -35)}" stroke-width="2" fill="none"/>`;
  const belt = !dress && look.bottom !== 'skirt' ? `<rect x="30" y="108" width="40" height="6" fill="${shade(pants, -20)}"/>` : '';
  const coat = worn.outer ? (() => { const c = outerColor(worn.outer!); const len = worn.outer!.includes('coat') || worn.outer!.includes('chapan') ? 144 : 124; return `<path d="M30 58 Q50 52 70 58 L74 ${len} L26 ${len} Z" fill="${c}"/>${robeStripes(worn.outer!, 28, 72, 60, len)}<path d="M50 58 L50 ${len}" stroke="${shade(c, -35)}" stroke-width="1.6"/><path d="M26 60 L18 62 L17 104 L26 106 Z M74 60 L82 62 L83 104 L74 106 Z" fill="${c}"/>`; })() : '';
  const scarf = worn.scarf ? `<path d="M38 52 Q50 62 62 52 L63 60 Q50 70 37 60 Z" fill="#e0373f"/><path d="M58 60 L62 82 L55 80 Z" fill="#c0282f"/>` : '';
  // head: the portrait's head drawn at half size on top of a neck
  const head = `<g transform="translate(14 -11) scale(0.72)">${headBack(look, worn)}${faceMarkup(look, worn)}</g>`;
  const neck = `<rect x="44" y="40" width="12" height="18" rx="4" fill="${skinDark}"/>`;
  return `<g transform="translate(50 196) scale(${k}) translate(-50 -196)"><ellipse cx="50" cy="196" rx="24" ry="3.2" fill="#0003"/>${legs}${skirt}${feet}${arm(33, -1)}${arm(67, 1)}${torso}${detail}${belt}${coat}${neck}${scarf}${head}</g>`;
}

/** The whole person as a picture of its own. */
export function bodySvg(rawLook: unknown, worn: Worn = {}, title = 'Character'): string {
  return `<svg class="avatar-svg body" viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg"${ariaOf(title)}>${bodyGroup(rawLook, worn)}</svg>`;
}

/* ---------- people of the city, and three ready-made characters ---------- */
/** Kinds of people one meets in a Russian city, each with clothes that make them easy to tell apart from far away. Only clothes and age: nobody is drawn as a joke. */
export type RoleId = 'babushka' | 'metro' | 'cashier' | 'student' | 'office' | 'taxi' | 'musician' | 'guard';
export const ROLES: { id: RoleId; label: string; look: Partial<Look>; worn: (cold: boolean) => Worn }[] = [
  { id: 'babushka', label: 'Grandmother on the bench', look: { hairStyle: 3, hairColor: 8, height: 0, build: 2, style: 'folk', accent: 1, bottom: 'skirt', bottomColor: 3, shoes: 'valenki', shoeColor: 4, rosy: true }, worn: cold => ({ hat: 'hat-headscarf', outer: cold ? 'coat-wool' : undefined, bag: true }) },
  { id: 'metro', label: 'Metro worker', look: { style: 'smart', accent: 6, bottom: 'trousers', bottomColor: 1, shoes: 'shoes', shoeColor: 1 }, worn: () => ({ hat: 'hat-cap' }) },
  { id: 'cashier', label: 'Shop cashier', look: { style: 'smart', accent: 2, bottom: 'trousers', bottomColor: 1, shoes: 'shoes', shoeColor: 1 }, worn: () => ({}) },
  { id: 'student', label: 'Student', look: { style: 'sporty', accent: 0, bottom: 'jeans', bottomColor: 0, shoes: 'sneakers', shoeColor: 0 }, worn: cold => ({ bag: true, outer: cold ? 'coat-puffer' : undefined, hat: cold ? 'hat-beanie' : undefined }) },
  { id: 'office', label: 'Office worker', look: { style: 'smart', accent: 0, bottom: 'trousers', bottomColor: 2, shoes: 'shoes', shoeColor: 1 }, worn: cold => ({ outer: cold ? 'coat-wool' : undefined, scarf: cold ? 'scarf-wool' : undefined, bag: true }) },
  { id: 'taxi', label: 'Taxi driver', look: { style: 'casual', accent: 3, bottom: 'jeans', bottomColor: 1, shoes: 'sneakers', shoeColor: 1 }, worn: cold => ({ outer: 'jacket-warm', hat: cold ? 'hat-beanie' : 'hat-cap', sunglasses: !cold }) },
  { id: 'musician', label: 'Street musician', look: { style: 'sweater', accent: 4, bottom: 'jeans', bottomColor: 3, shoes: 'boots', shoeColor: 2 }, worn: () => ({ hat: 'hat-beanie', scarf: 'scarf-wool' }) },
  { id: 'guard', label: 'Security guard', look: { style: 'smart', accent: 6, bottom: 'trousers', bottomColor: 1, shoes: 'boots', shoeColor: 1, build: 2 }, worn: cold => ({ outer: cold ? 'jacket-warm' : undefined, hat: 'hat-cap' }) },
];
/** Where each kind of person is usually met. */
export const ROLE_PLACES: Partial<Record<RoleId, string[]>> = { babushka: ['home', 'market', 'clinic'], metro: ['station'], cashier: ['market', 'mall'], student: ['uni', 'center'], office: ['center', 'bank', 'mfc'], taxi: ['station', 'airport'], musician: ['center', 'station'], guard: ['bank', 'mall', 'guvm'] };

/** Three ready-made characters: a look and what they wear. */
export const SAMPLES: { id: string; label: string; name: string; look: Partial<Look>; worn: Worn }[] = [
  { id: 'intl-student', label: 'International student in a puffer jacket', name: 'Amara', look: { skin: 7, hairStyle: 11, hairColor: 0, eyeColor: 4, style: 'sporty', accent: 1, bottom: 'jeans', bottomColor: 1, shoes: 'boots', shoeColor: 1, build: 1, face: 1, lips: 2 }, worn: { outer: 'coat-puffer', hat: 'hat-beanie', scarf: 'scarf-wool', gloves: true, bag: true } },
  { id: 'office', label: 'Local office worker in a wool coat', name: 'Artyom', look: { skin: 1, hairStyle: 16, hairColor: 2, eyeColor: 1, style: 'smart', accent: 0, bottom: 'trousers', bottomColor: 2, shoes: 'shoes', shoeColor: 1, build: 1, face: 2, facial: 1 }, worn: { outer: 'coat-wool', scarf: 'scarf-wool', bag: true } },
  { id: 'babushka', label: 'Babushka (a character of the city)', name: 'Valentina Petrovna', look: { skin: 0, hairStyle: 3, hairColor: 8, eyeColor: 0, height: 0, build: 2, face: 1, style: 'folk', accent: 1, bottom: 'skirt', bottomColor: 3, shoes: 'valenki', shoeColor: 4, rosy: true }, worn: { hat: 'hat-headscarf', outer: 'coat-wool', bag: true } },
];
/** Russian first names, for the random name button (both Latin and Cyrillic). */
export const RUSSIAN_NAMES = ['Artyom', 'Dasha', 'Nikita', 'Polina', 'Timur', 'Aigul', 'Ivan', 'Sofia', 'Maksim', 'Alina', 'Dmitry', 'Ksenia', 'Ruslan', 'Varvara', 'Yegor', 'Milana', 'Артём', 'Даша', 'Никита', 'Полина', 'Тимур', 'Айгуль'];
