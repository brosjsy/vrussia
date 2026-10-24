/* The picture of a dish, drawn from what it is. Each kind of dish has its own drawing: soup in a bowl, a stew in a clay pot, dumplings on a plate,
   meat on a skewer, noodles in swirls, salad leaves, a sandwich, a fried egg, a stack of pancakes, a pie, a slice of cake, a mound of rice, a roast
   bird, a cup or a glass, a jar, a swallow beside its soup. The colours come from the main ingredients, pieces of the next ones go on top, herbs
   and smetana when the dish has them, steam when it is served hot. The same dish always looks the same. An SVG string. */
import { ING } from './cook-data';
import type { DishInfo } from './cook';

const hash = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };
/** Mixes two colours (#rrggbb) by w (0 to 1 of the second). */
function mix(a: string, b: string, w: number): string {
  const p = (c: string, i: number): number => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  return '#' + [0, 1, 2].map(i => Math.round(p(a, i) * (1 - w) + p(b, i) * w).toString(16).padStart(2, '0')).join('');
}
const COLD = ['salad', 'cold', 'drink', 'pickle', 'sandwich', 'dessert', 'sauce'];
const PLATE = '<ellipse cx="80" cy="114" rx="68" ry="16" fill="#0002"/><ellipse cx="80" cy="100" rx="70" ry="24" fill="#f7f4ee" stroke="#d8d2c4"/><ellipse cx="80" cy="100" rx="54" ry="17" fill="#ece7dc"/>';
const BOWL = (fill: string): string => `<ellipse cx="80" cy="112" rx="58" ry="12" fill="#0002"/><path d="M20 62 a60 44 0 0 0 120 0z" fill="#f4f1ea" stroke="#d8d2c4"/><ellipse cx="80" cy="62" rx="60" ry="15" fill="#e9e4d8"/><ellipse cx="80" cy="63" rx="54" ry="12" fill="${fill}"/>`;

export function dishSvg(d: DishInfo, size = 160): string {
  const cols = d.ings.map(k => ING[k]?.[5]).filter((c): c is string => !!c && c !== '#ffffff'), h = hash(d.id);
  const c0 = cols[0] ?? '#d9b26f', c1 = cols[1] ?? c0, base = mix(c0, c1, 0.3), has = (k: string): boolean => d.ings.includes(k);
  const kinds = d.ings.map(k => ING[k]?.[3]);
  /** Small pieces of the other ingredients scattered in an ellipse. */
  const bits = (cx: number, cy: number, rx: number, ry: number, n: number): string => Array.from({ length: n }, (_, i) => {
    const a = ((h >> (i % 24)) % 628) / 100 + i * 2.4, r = ((hash(`${d.id}${i}`) % 100) / 100) ** 0.6, x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    const c = cols[2 + (i % Math.max(1, cols.length - 2))] ?? cols[i % Math.max(1, cols.length)] ?? '#a0522d', s = 3 + (hash(`${d.id}s${i}`) % 4);
    return i % 3 === 0 ? `<rect x="${(x - s / 2).toFixed(1)}" y="${(y - s / 2).toFixed(1)}" width="${s}" height="${s}" rx="1" fill="${c}" transform="rotate(${Math.round((a * 40) % 90)} ${x.toFixed(1)} ${y.toFixed(1)})"/>` : `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(s * 0.7).toFixed(1)}" ry="${(s * 0.5).toFixed(1)}" fill="${c}"/>`;
  }).join('');
  const herbs = (y: number): string => kinds.includes('herb') ? Array.from({ length: 5 }, (_, i) => `<path d="M${68 + i * 8 + (h % 5)} ${y + ((h >> i) % 6)} q3 -4 6 0 q-3 3 -6 0z" fill="#3f8f2f"/>`).join('') : '';
  const cream = (y: number): string => (has('smetana') || has('cream') || has('yogurt') ? `<ellipse cx="88" cy="${y}" rx="9" ry="4" fill="#fffaf0"/>` : '');
  const steam = COLD.includes(d.type) ? '' : '<g stroke="#bbb" stroke-width="2" fill="none" opacity=".7"><path d="M66 30 q-6 -8 0 -16 q6 -8 0 -14"/><path d="M80 26 q-6 -8 0 -16 q6 -8 0 -14"/><path d="M94 30 q-6 -8 0 -16 q6 -8 0 -14"/></g>';
  const poultry = kinds.includes('poultry'), dough = mix('#f3e3bf', c0, 0.12);
  let body: string;
  if (has('seaweed') && has('rice')) {                             // rolls: rice in nori with the filling in the middle
    const fill = cols.find((_, i) => d.ings[i] !== 'rice' && d.ings[i] !== 'seaweed') ?? '#f28a64';
    return `<svg class="ckArt" viewBox="0 0 160 140" width="${size}" height="${Math.round(size * 0.875)}" role="img" aria-label="${d.name.replace(/[<>"&]/g, '')}">${PLATE}${[[56, 94], [80, 90], [104, 94], [68, 106], [92, 106]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="#1f3a1f"/><circle cx="${x}" cy="${y}" r="8.5" fill="#faf8f2"/><circle cx="${x}" cy="${y}" r="3.5" fill="${fill}"/>`).join('')}</svg>`;
  }
  switch (d.type) {
    case 'soup': case 'cold': body = `${BOWL(base)}${bits(80, 63, 44, 8, 12)}${cream(62)}${herbs(58)}`; break;
    case 'stew': case 'swallow': body = d.type === 'swallow'
      ? `${BOWL(base)}${bits(80, 63, 44, 8, 10)}<ellipse cx="128" cy="104" rx="22" ry="8" fill="#0002"/><ellipse cx="126" cy="92" rx="20" ry="15" fill="${has('cassava') ? '#f2ead2' : has('yam') ? '#efe6cf' : '#efe4c0'}" stroke="#d9cfb2"/>`
      : `<ellipse cx="80" cy="120" rx="50" ry="10" fill="#0002"/><path d="M30 60 q-4 50 20 58 h60 q24 -8 20 -58z" fill="#a4552c"/><ellipse cx="80" cy="60" rx="50" ry="12" fill="#7a3d1f"/><ellipse cx="80" cy="61" rx="44" ry="9" fill="${base}"/>${bits(80, 61, 36, 6, 9)}${cream(60)}${herbs(56)}<path d="M26 74 h-8 M134 74 h8" stroke="#7a3d1f" stroke-width="6" stroke-linecap="round"/>`; break;
    case 'dumpling': case 'steam': body = `${PLATE}${[[58, 96], [80, 92], [102, 96], [66, 106], [92, 106], [80, 101]].map(([x, y], i) => d.type === 'steam'
      ? `<circle cx="${x}" cy="${y - 4}" r="11" fill="${dough}" stroke="#d8c8a0"/><path d="M${x - 5} ${y - 9} q5 -5 10 0" stroke="#c9b48a" fill="none"/>`
      : `<path d="M${x - 11} ${y} a11 9 0 0 1 22 0 z" fill="${dough}" stroke="#d1bf96" transform="rotate(${(i * 23 + h) % 30 - 15} ${x} ${y})"/>`).join('')}${cream(90)}${herbs(86)}`; break;
    case 'grill': body = `${PLATE}<line x1="22" y1="104" x2="140" y2="88" stroke="#8a6a4a" stroke-width="3"/>${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${32 + i * 17}" y="${86 - i * 2.3}" width="14" height="14" rx="4" fill="${i % 2 ? (cols[2] ?? '#e2a04a') : mix(c0, '#3a1a0a', 0.25)}" transform="rotate(-8 ${39 + i * 17} ${93 - i * 2.3})"/>`).join('')}${has('onion') ? '<ellipse cx="110" cy="108" rx="10" ry="4" fill="none" stroke="#e8d7f0" stroke-width="2"/><ellipse cx="96" cy="111" rx="8" ry="3" fill="none" stroke="#e8d7f0" stroke-width="2"/>' : ''}${herbs(104)}`; break;
    case 'pasta': body = `${PLATE}${[0, 1, 2, 3, 4, 5, 6].map(i => `<path d="M${50 + i * 9} ${92 + (i % 3) * 3} q10 -10 18 2 q-8 10 -18 -2" fill="none" stroke="${mix('#f0d58e', c0, 0.15)}" stroke-width="3"/>`).join('')}${cols[1] && cols[1] !== cols[0] ? `<ellipse cx="80" cy="96" rx="20" ry="7" fill="${cols[1]}" opacity=".85"/>` : ''}${bits(80, 96, 26, 7, 8)}${herbs(90)}`; break;
    case 'salad': body = `${BOWL(mix(base, '#ffffff', 0.15))}${[0, 1, 2, 3, 4].map(i => `<path d="M${42 + i * 17} 62 q8 -14 16 0 q-8 8 -16 0z" fill="${kinds.includes('leaf') ? '#7fbf4f' : cols[i % Math.max(1, cols.length)] ?? '#7fbf4f'}" opacity=".9"/>`).join('')}${bits(80, 62, 42, 8, 12)}${herbs(56)}`; break;
    case 'sandwich': body = `${PLATE}<rect x="42" y="86" width="76" height="14" rx="6" fill="${has('ryebread') ? '#5a3a24' : has('lavash') || has('tortilla') ? '#f0d69a' : '#d9a55a'}"/><rect x="40" y="80" width="80" height="7" rx="3" fill="${cols[1] ?? '#8fc95b'}"/><rect x="44" y="75" width="72" height="6" rx="3" fill="${cols[2] ?? c0}"/>${!has('lavash') && !has('tortilla') ? `<rect x="42" y="64" width="76" height="12" rx="6" fill="${has('ryebread') ? '#6a4a30' : '#e2b46a'}"/>` : ''}`; break;
    case 'egg': body = `${PLATE}<path d="M50 100 q-6 -16 14 -18 q12 -8 26 0 q22 0 16 16 q-4 12 -26 10 q-26 4 -30 -8z" fill="#fbfaf3" stroke="#eee"/><circle cx="76" cy="96" r="9" fill="#f2b51c"/>${has('egg') && d.ings.length > 4 ? '<circle cx="96" cy="99" r="7" fill="#f2b51c"/>' : ''}${bits(82, 98, 28, 8, 7)}${herbs(92)}`; break;
    case 'pancake': body = `<ellipse cx="80" cy="118" rx="64" ry="14" fill="#f4f1ea" stroke="#d8d2c4"/>${[0, 1, 2, 3, 4].map(i => `<ellipse cx="80" cy="${110 - i * 8}" rx="${48 - i}" ry="11" fill="${mix(dough, '#c98a3a', 0.4 + i * 0.05)}" stroke="#a8692a" stroke-width=".6"/>`).join('')}${has('jam') || kinds.includes('berry') ? '<ellipse cx="82" cy="76" rx="14" ry="5" fill="#a51f33"/>' : has('honey') ? '<ellipse cx="82" cy="76" rx="14" ry="5" fill="#e9a823"/>' : ''}${cream(76)}${has('caviar') ? '<g fill="#f2552c">' + [0, 1, 2, 3, 4, 5].map(i => `<circle cx="${74 + i * 3}" cy="${74 + (i % 2) * 2}" r="1.8"/>`).join('') + '</g>' : ''}`; break;
    case 'pie': body = `<ellipse cx="80" cy="116" rx="64" ry="14" fill="#f4f1ea" stroke="#d8d2c4"/><ellipse cx="80" cy="96" rx="56" ry="20" fill="#c98a3a"/><ellipse cx="80" cy="90" rx="54" ry="18" fill="#e3a952"/><path d="M80 90 l40 -10 a54 18 0 0 1 12 12z" fill="${base}"/>${[0, 1, 2, 3].map(i => `<path d="M${50 + i * 16} 84 q4 6 8 0" stroke="#b5762e" stroke-width="2" fill="none"/>`).join('')}${has('sesame') || has('poppy') ? bits(70, 88, 24, 6, 8).replace(/fill="#[0-9a-f]{6}"/g, `fill="${has('poppy') ? '#2a2a33' : '#efe2c2'}"`) : ''}`; break;
    case 'dessert': body = /cake|медовик|наполеон|торт/i.test(d.name + d.ru) || has('condensed') || has('gelatin')
      ? `${PLATE}<path d="M44 102 l36 -28 l40 20 v14 l-40 -18 l-36 26z" fill="${mix('#e8c48a', c0, 0.25)}"/><path d="M44 102 v-12 l36 -28 l40 20 v12 l-40 -20z" fill="${mix('#f4e2b8', c0, 0.2)}"/>${[0, 1, 2].map(i => `<path d="M44 ${96 - i * 4} l36 -28" stroke="${mix('#fff4dc', c1, 0.2)}" stroke-width="2"/>`).join('')}${kinds.includes('berry') || has('cherry') ? '<circle cx="82" cy="66" r="5" fill="#b3122c"/>' : ''}`
      : `${PLATE}${[[60, 96], [80, 90], [100, 96], [70, 106], [92, 106]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="12" ry="8" fill="${mix('#e3a952', c0, 0.3)}" stroke="#c98a3a"/>`).join('')}${has('honey') ? '<path d="M56 90 q24 10 48 0" stroke="#e9a823" stroke-width="3" fill="none"/>' : ''}${bits(80, 98, 26, 8, 6)}`; break;
    case 'rice': body = `${PLATE}<path d="M34 100 q46 -46 92 0 z" fill="${has('turmeric') || has('saffron') || has('carrot') ? mix('#f2d27a', c1, 0.3) : has('ketchup') || has('tomato') ? '#e0742c' : '#faf8f2'}" stroke="#e2dccb"/>${bits(80, 88, 30, 9, 12)}${poultry || kinds.includes('meat') ? `<ellipse cx="80" cy="74" rx="14" ry="7" fill="${mix(c1, '#5a2a1a', 0.2)}"/>` : ''}${herbs(84)}`; break;
    case 'roast': body = poultry
      ? `${PLATE}<ellipse cx="80" cy="92" rx="36" ry="20" fill="#c9792e"/><ellipse cx="74" cy="86" rx="22" ry="10" fill="#e19a4a" opacity=".8"/><path d="M112 88 l14 -6 a5 5 0 1 1 2 8 z M48 88 l-14 -6 a5 5 0 1 0 -2 8 z" fill="#c9792e"/>${bits(80, 106, 46, 6, 8)}${herbs(100)}`
      : `${PLATE}<path d="M42 98 q4 -26 38 -26 q34 0 38 26 q-38 10 -76 0z" fill="${mix(c0, '#5a2a1a', 0.35)}"/><path d="M50 94 q30 -14 60 0" stroke="${mix(c0, '#f0b0a0', 0.4)}" stroke-width="3" fill="none"/>${bits(80, 106, 46, 6, 8)}${herbs(100)}`; break;
    case 'drink': body = has('tea') || has('coffee') || has('cocoa') || has('chocolate')
      ? `<ellipse cx="80" cy="122" rx="46" ry="10" fill="#f4f1ea" stroke="#d8d2c4"/><path d="M50 70 h56 l-6 46 h-44z" fill="#fbfaf6" stroke="#d8d2c4"/><path d="M106 80 q16 0 12 16 q-4 10 -14 8" stroke="#d8d2c4" stroke-width="5" fill="none"/><ellipse cx="78" cy="71" rx="27" ry="5" fill="${has('milk') ? mix(c0, '#f5e6d0', 0.5) : c0}"/>${has('lemon') ? '<circle cx="66" cy="70" r="6" fill="#f5dc3a" stroke="#e0b820"/>' : ''}`
      : `<ellipse cx="80" cy="128" rx="34" ry="6" fill="#0002"/><path d="M52 34 l6 92 h44 l6 -92z" fill="#ffffff55" stroke="#bbb"/><path d="M55 56 l4 68 h42 l4 -68z" fill="${base}" opacity=".9"/>${bits(80, 60, 18, 3, 4)}${has('mint') ? '<path d="M96 40 q8 -8 14 0 q-8 6 -14 0z" fill="#3f9f4f"/>' : ''}${has('lemon') || has('orange') ? `<circle cx="104" cy="40" r="10" fill="${has('orange') ? '#f39a1e' : '#f5dc3a'}" stroke="#e0b820"/>` : ''}`; break;
    case 'pickle': case 'sauce': body = `<ellipse cx="80" cy="130" rx="40" ry="6" fill="#0002"/><rect x="46" y="38" width="68" height="90" rx="12" fill="#ffffff55" stroke="#aaa"/><rect x="50" y="48" width="60" height="76" rx="9" fill="${base}"/>${bits(80, 86, 24, 30, d.type === 'pickle' ? 14 : 6)}${has('dill') ? '<path d="M60 60 q10 30 0 60 M100 58 q-8 30 0 60" stroke="#4f8f2f" stroke-width="2" fill="none"/>' : ''}<rect x="44" y="28" width="72" height="14" rx="4" fill="#c9a227"/>`; break;
    case 'porridge': body = `${BOWL(mix(base, '#fff8ea', 0.25))}<path d="M48 60 q32 -16 64 0" fill="${mix(base, '#fff8ea', 0.15)}"/>${has('butter') ? '<rect x="74" y="55" width="12" height="8" rx="2" fill="#f6dc7c"/>' : ''}${has('honey') || has('jam') ? `<path d="M60 62 q20 6 40 0" stroke="${has('jam') ? '#a51f33' : '#e9a823'}" stroke-width="3" fill="none"/>` : ''}${bits(80, 62, 40, 7, 6)}${herbs(56)}`; break;
    default: body = `${PLATE}<ellipse cx="${74 + (h % 8)}" cy="98" rx="34" ry="11" fill="${base}"/>${cols[1] ? `<ellipse cx="${108 - (h % 6)}" cy="102" rx="16" ry="7" fill="${cols[1]}"/>` : ''}${bits(80, 98, 34, 9, 10)}${herbs(92)}${cream(94)}`;
  }
  return `<svg class="ckArt" viewBox="0 0 160 140" width="${size}" height="${Math.round(size * 0.875)}" role="img" aria-label="${d.name.replace(/[<>"&]/g, '')}">${steam}${body}</svg>`;
}
