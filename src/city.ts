/* The map-first home screen: a small isometric city that the player clicks to travel, with a news ticker, quest cards and a place card.
   Pure drawing helpers and text builders live here; the wiring (what happens on a click) stays in ui.ts.
   Layout idea only: no artwork, text or code of any other game is used. */
import * as G from './engine';
import type { State } from './engine';
import { dreamOf } from './dreams';
import { bodyInSvg } from './figure';
import { ROLE_PLACES, ROLES, bodyGroup, lookFromSeed, normalizeLook, seedGroup, wornFor } from './avatar';
import type { RoleId } from './avatar';
import type { Look, Worn } from './avatar';
import { HANDLES } from './social';

/* ---------- isometric projection: the 100 x 100 game map becomes a diamond in a 200 x 125 picture ---------- */
export const iso = (x: number, y: number): { x: number; y: number } => ({ x: 100 + (x - y), y: 12 + (x + y) * 0.5 });
const pt = (x: number, y: number): string => { const p = iso(x, y); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; };
const poly = (pts: [number, number][]): string => pts.map(([x, y]) => pt(x, y)).join(' ');

/** Look of each place: an icon, a roof colour and a building height. */
export const PLACE_LOOK: Record<string, { icon: string; color: string; h: number; flavour: string }> = {
  home: { icon: '🏠', color: '#3ec27a', h: 7, flavour: 'Your flat. The kettle is already warm.' },
  station: { icon: '🚉', color: '#6b7bd6', h: 8, flavour: 'Trains, pies and people with very large bags.' },
  mfc: { icon: '🗂️', color: '#3b6fe0', h: 9, flavour: 'The multifunctional centre: a ticket machine and a long wait.' },
  guvm: { icon: '🛂', color: '#e0373f', h: 10, flavour: 'The migration department. Bring every paper twice.' },
  uni: { icon: '🎓', color: '#a56be0', h: 12, flavour: 'Corridors, canteen smells and exam lists on the wall.' },
  market: { icon: '🛒', color: '#f08a3c', h: 6, flavour: 'Honey, pickles, bargaining and a lot of opinions.' },
  clinic: { icon: '🩺', color: '#2bb5c9', h: 8, flavour: 'The polyclinic. The registry desk has seen everything.' },
  work: { icon: '💼', color: '#6b7bd6', h: 11, flavour: 'Your workplace. Somebody is always making tea.' },
  bank: { icon: '🏦', color: '#2bb5c9', h: 10, flavour: 'A bank branch with a queue number and a plant.' },
  center: { icon: '🏛️', color: '#f0b43c', h: 14, flavour: 'The city centre: squares, statues and pigeons.' },
  mall: { icon: '📱', color: '#a56be0', h: 9, flavour: 'Phones, cables and a cheerful sales assistant.' },
  airport: { icon: '✈️', color: '#3b6fe0', h: 7, flavour: 'Check-in desks and the smell of coffee at four in the morning.' },
  dealer: { icon: '🚗', color: '#e0373f', h: 8, flavour: 'Polished floors and a manager with a very large smile.' },
  agency: { icon: '🏘️', color: '#2bb5c9', h: 8, flavour: 'Photos of flats that look larger than they are.' },
  hospital: { icon: '🏥', color: '#e0373f', h: 13, flavour: 'The city hospital. Quiet corridors and kind nurses.' },
  shelter: { icon: '🐕', color: '#c59a5a', h: 6, flavour: 'Wagging tails and a volunteer with a kettle.' },
};

/** Trees, placed on a fixed pattern so that the picture does not jump around, and only where there is room. */
export function treeSpots(): [number, number][] {
  const spots: [number, number][] = [];
  let seed = 7;
  const next = (): number => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < 160 && spots.length < 26; i++) {
    const x = 4 + next() * 92, y = 4 + next() * 92;
    const nearPlace = G.PLACES.some(p => Math.hypot(p.x - x, p.y - y) < 9);
    const river = Math.abs(y - (0.35 * x + 5)) < 7;
    if (!nearPlace && !river) spots.push([x, y]);
  }
  return spots;
}

function building(x: number, y: number, h: number, color: string): string {
  const w = 3.7;                       // half of the footprint in game units
  const top = (dy: number): string => poly([[x - w, y - w], [x + w, y - w], [x + w, y + w], [x - w, y + w]]).split(' ').map(p => { const [a, b] = p.split(','); return `${a},${(Number(b) - dy).toFixed(1)}`; }).join(' ');
  const left = `${pt(x - w, y + w)} ${pt(x + w, y + w)} ${iso(x + w, y + w).x.toFixed(1)},${(iso(x + w, y + w).y - h).toFixed(1)} ${iso(x - w, y + w).x.toFixed(1)},${(iso(x - w, y + w).y - h).toFixed(1)}`;
  const right = `${pt(x + w, y + w)} ${pt(x + w, y - w)} ${iso(x + w, y - w).x.toFixed(1)},${(iso(x + w, y - w).y - h).toFixed(1)} ${iso(x + w, y + w).x.toFixed(1)},${(iso(x + w, y + w).y - h).toFixed(1)}`;
  return `<polygon points="${left}" fill="${color}" opacity=".78"/><polygon points="${right}" fill="${color}" opacity=".55"/><polygon points="${top(h)}" fill="${color}"/>`;
}

export function cityMarkup(s: State): string {
  const ground = poly([[0, 0], [100, 0], [100, 100], [0, 100]]);
  const river = poly([[0, 1], [100, 36], [100, 44], [0, 9]]);
  const roads = G.PLACES.filter(p => p.id !== 'home').map(p => `${pt(50, 52)} ${pt(p.x, p.y)}`).map(d => `<polyline points="${d}"/>`).join('');
  const trees = treeSpots().map(([x, y]) => { const p = iso(x, y); return `<g class="tree"><rect x="${(p.x - 0.5).toFixed(1)}" y="${(p.y - 2).toFixed(1)}" width="1" height="2.4" fill="#7a5a3a"/><circle cx="${p.x.toFixed(1)}" cy="${(p.y - 3.6).toFixed(1)}" r="2.6" fill="#3c8f4a"/></g>`; }).join('');
  const flakes = Array.from({ length: 30 }, (_, i) => `<circle class="flake" cx="${(i * 37) % 200}" cy="0" r=".9" style="animation-delay:-${(i * 0.31).toFixed(2)}s"/>`).join('');
  const drops = Array.from({ length: 30 }, (_, i) => `<line class="drop" x1="${(i * 29) % 200}" y1="0" x2="${((i * 29) % 200) - 2}" y2="5" style="animation-delay:-${(i * 0.17).toFixed(2)}s"/>`).join('');
  const places = [...G.PLACES].sort((a, b) => iso(a.x, a.y).y - iso(b.x, b.y).y).map(p => {
    const look = PLACE_LOOK[p.id] || { icon: '📍', color: '#3b6fe0', h: 8, flavour: '' };
    const q = iso(p.x, p.y);
    return `<g class="place" data-place="${p.id}" role="button" tabindex="0" aria-label="${p.n}"><title>${p.n}</title>
      <ellipse cx="${q.x.toFixed(1)}" cy="${(q.y + 1).toFixed(1)}" rx="8" ry="4" fill="#00000022"/>
      ${building(p.x, p.y, look.h, look.color)}
      <g class="badge" id="pl-${p.id}"><circle cx="${q.x.toFixed(1)}" cy="${(q.y - look.h - 7).toFixed(1)}" r="4.6"/><text x="${q.x.toFixed(1)}" y="${(q.y - look.h - 4.9).toFixed(1)}" text-anchor="middle" class="em">${look.icon}</text></g>
      <text class="plabel" x="${q.x.toFixed(1)}" y="${(q.y + 8).toFixed(1)}" text-anchor="middle">${p.n}</text></g>`;
  }).join('');
  return `<svg viewBox="0 0 200 125" role="img" aria-label="Interactive isometric city map" preserveAspectRatio="xMidYMid meet">
    <defs><linearGradient id="gGround" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fd18b"/><stop offset="1" stop-color="#7fbf7a"/></linearGradient>
    <linearGradient id="gWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fc7f0"/><stop offset="1" stop-color="#5aa5df"/></linearGradient></defs>
    <polygon points="${ground}" fill="url(#gGround)" stroke="#5f9f66" stroke-width=".8"/>
    <polygon points="${river}" fill="url(#gWater)" opacity=".95"/>
    <g class="roads" fill="none" stroke="#e8e2d2" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${roads}</g>
    ${trees}${places}
    <circle class="pulse" id="mapPulse" r="3" fill="#3b6fe0" cx="-10" cy="-10"/>
    <g id="mapCrowd">${crowdMarkup(s)}</g><g class="avatar" id="mapAvatar">${playerMarkup(s)}</g>
    <g id="mapSnow" class="snow" style="display:none">${flakes}</g><g id="mapRain" class="rain" style="display:none">${drops}</g>
    <rect id="mapNight" width="200" height="125" fill="#0b1030" opacity="0" pointer-events="none"/></svg>`;
}

/* ---------- people on the map ---------- */
const FIGURE = 0.07;            // size of a person on the map: about 12 map units tall
export const SAY = ['Privet!', 'Nice day!', 'Tea?', 'The queue again...', 'Careful, ice!', 'See you!', 'Good evening!', 'What a crowd!', 'Do you have a minute?', 'Dobryi den!'];
const BUSY = new Set(['center', 'market', 'mall', 'station', 'uni', 'work', 'airport', 'mfc']);

export interface Npc { id: string; handle: string; look: Look; worn: Worn; x: number; y: number; place: string; say?: string; flip: boolean; role?: RoleId }

const hashOf = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };

/** The invented people standing around the places. They change a little every part of the day, and the same moment always shows the same people. */
export function crowdFor(s: State): Npc[] {
  const out: Npc[] = [];
  const moment = s.day * 3 + s.slot;
  for (const p of G.PLACES) {
    if (p.id === 'work' && !s.job) continue;
    const h = hashOf(`${moment}|${p.id}`);
    const n = Math.min(3, (h % 3) + (BUSY.has(p.id) ? 1 : 0)) - (p.id === 'home' ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const hh = hashOf(`${moment}|${p.id}|${k}`);
      const male = hh % 2 === 0;
      const id = `${p.id}-${moment}-${k}`;
      // now and then somebody whose work or age shows in their clothes: the metro worker at the station, the grandmother by the market
      const month = G.dateOf(s).getMonth(), cold = month >= 10 || month <= 2;
      const roles = ROLES.filter(r => ROLE_PLACES[r.id]?.includes(p.id)), role = roles.length && (hh >>> 6) % 3 === 0 ? roles[(hh >>> 9) % roles.length] : undefined;
      const base = lookFromSeed(id, { beardable: male, female: role?.id === 'babushka' ? true : !male, city: s.city });
      out.push({
        id, handle: HANDLES[hh % HANDLES.length], place: p.id, flip: k % 2 === 1, role: role?.id,
        look: role ? normalizeLook({ ...base, ...role.look, beard: role.id === 'babushka' ? false : base.beard, facial: role.id === 'babushka' ? 0 : base.facial }) : base,
        worn: role ? role.worn(cold) : wornFor(id, seedGroup(id, s.city), !male, month),
        x: p.x + 5 + k * 3.2 + ((hh >>> 4) % 3), y: p.y + 4 + ((hh >>> 8) % 4) + (k % 2) * 2.4,
        say: k === 0 && n > 1 ? SAY[(hh >>> 12) % SAY.length] : undefined,
      });
    }
  }
  return out;
}

const figure = (look: unknown, worn: unknown, at: { x: number; y: number }, flip: boolean, k = FIGURE): string =>
  `<g transform="translate(${(at.x).toFixed(1)} ${(at.y).toFixed(1)}) scale(${flip ? -k : k} ${k}) translate(-50 -196)">${bodyInSvg(look, worn as never, bodyGroup(look, worn as never))}</g>`;

const escXml = (t: string): string => t.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string));
const bubble = (text: string, x: number, y: number): string => { const w = Math.max(10, text.length * 1.9 + 3); return `<g class="bubble"><rect x="${(x - w / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="${w.toFixed(1)}" height="5.4" rx="2.2"/><path d="M${(x - 1.2).toFixed(1)} ${(y + 0.4).toFixed(1)} L${x.toFixed(1)} ${(y + 2.4).toFixed(1)} L${(x + 1.2).toFixed(1)} ${(y + 0.4).toFixed(1)} Z"/><text x="${x.toFixed(1)}" y="${(y - 1.4).toFixed(1)}" text-anchor="middle">${escXml(text)}</text></g>`; };
const tag = (text: string, x: number, y: number, cls = ''): string => { const w = text.length * 1.75 + 3.5; return `<g class="tag ${cls}"><rect x="${(x - w / 2).toFixed(1)}" y="${(y - 3.6).toFixed(1)}" width="${w.toFixed(1)}" height="4.6" rx="2.3"/><text x="${x.toFixed(1)}" y="${(y - 0.3).toFixed(1)}" text-anchor="middle">${escXml(text)}</text></g>`; };

/** The crowd, drawn from the back to the front. People at your place wear a name tag; some of them talk in a speech bubble. */
export function crowdMarkup(s: State): string {
  const list = crowdFor(s).map(n => ({ n, p: iso(n.x, n.y) })).sort((a, b) => a.p.y - b.p.y);
  return list.map(({ n, p }) => `<g class="npc" data-npc="${n.id}" data-place="${n.place}" role="button" tabindex="0" aria-label="${escXml(n.handle)}"><title>${escXml(n.handle)}</title>${figure(n.look, n.worn, p, n.flip)}${n.place === s.loc ? tag(n.handle, p.x, p.y - 13.2) : ''}${n.say && (n.place === s.loc || hashOf(n.id) % 3 === 0) ? bubble(n.say, p.x, p.y - 15.5) : ''}</g>`).join('');
}

/** The player: a whole person with the chosen clothes, with a name tag. Drawn around the point (0, 0), the feet. */
export function playerMarkup(s: State): string {
  const look = normalizeLook(s.look);
  return `<g transform="translate(-7 4)">${figure(look, s.worn ?? {}, { x: 0, y: 0 }, false, FIGURE * 1.15)}${tag(s.name.slice(0, 14), 0, -15.4, 'me')}</g>`;
}

/** Updates what changes during play: which place is current, where the avatar stands, weather and the time of day. */
export function updateCity(s: State): void {
  G.PLACES.forEach(p => {
    const badge = document.getElementById('pl-' + p.id);
    if (!badge) return;
    const g = badge.parentElement as unknown as SVGGElement;
    g.setAttribute('class', 'place ' + (p.id === s.loc ? 'here' : s.known[p.id] ? 'known' : 'unk'));
    g.style.display = p.id === 'work' && !s.job ? 'none' : '';
  });
  const here = iso(G.placeById(s.loc).x, G.placeById(s.loc).y);
  const av = document.getElementById('mapAvatar') as SVGGElement | null;
  if (av) { av.style.transform = `translate(${here.x}px, ${here.y}px)`; av.innerHTML = playerMarkup(s); }
  const crowd = document.getElementById('mapCrowd');
  if (crowd) crowd.innerHTML = crowdMarkup(s);
  const dest = s.dest ? iso(G.placeById(s.dest).x, G.placeById(s.dest).y) : here;
  const pulse = document.getElementById('mapPulse');
  if (pulse) { pulse.setAttribute('cx', dest.x.toFixed(1)); pulse.setAttribute('cy', dest.y.toFixed(1)); }
  const show = (id: string, on: boolean): void => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
  show('mapSnow', s.weather === 'snow'); show('mapRain', s.weather === 'rain');
  const night = document.getElementById('mapNight');
  if (night) night.setAttribute('opacity', s.slot === 2 ? '0.28' : '0');
}

/* ---------- text builders ---------- */
const HOLIDAYS: Record<string, string> = {
  cal_sept1: 'The Day of Knowledge (1 September)', cal_unity: 'Unity Day (4 November)', cal_newyear: 'New Year (31 December)', cal_christmas: 'Orthodox Christmas (7 January)',
  cal_feb23: 'Defender of the Fatherland Day (23 February)', cal_mar8: 'International Women\'s Day (8 March)', cal_navruz: 'Navruz (21 March)', cal_victory: 'Victory Day (9 May)',
  cal_russiaday: 'Russia Day (12 June)', cal_ege: 'Exam season', cal_admission: 'University admission campaign',
};

/** Short "this week" lines for the ticker. There is always at least one. Facts here were checked earlier in the project (see docs/ITERATION_REPORT.md). */
export function newsItems(s: State): string[] {
  const out: string[] = [];
  const now = G.dateOf(s);
  for (const c of G.CAL) {
    for (let d = 0; d <= 10; d++) {
      const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      if (t.getMonth() + 1 === c.m && t.getDate() === c.d) { out.push(d === 0 ? `Today: ${HOLIDAYS[c.id] || c.id}` : `In ${d} day${d > 1 ? 's' : ''}: ${HOLIDAYS[c.id] || c.id}`); break; }
    }
  }
  if (s.status !== 'citizen') {
    if (s.docs.reg > 0 && s.docs.reg < 10) out.push(`Your registration runs out in ${Math.round(s.docs.reg)} days`);
    if (s.status === 'migrant' && s.docs.patent > 0 && s.docs.patent < 10) out.push(`Your patent runs out in ${Math.round(s.docs.patent)} days`);
  }
  if (Number(s.tmp.fines) > 0) out.push(`Unpaid fines: ${G.money(Number(s.tmp.fines))}. Paying early costs less`);
  if (Number(s.tmp.debt) > 0) out.push(`Loan balance: ${G.money(Number(s.tmp.debt))}`);
  if (s.booking && !s.booking.done) out.push(`Your flight leaves in ${Math.max(0, s.booking.dep - s.day)} days`);
  if (now.getDay() >= 4 && s.rent > 0) out.push('Rent is due on Saturday');
  if (s.weather === 'snow' || s.weather === 'frost') out.push('Cold weather: wear a coat and check the map before you go out');
  out.push('Emergency: 112 is free from any phone');
  if (s.status !== 'citizen') out.push('State duties from 26 July 2026: residence permit 15,000, VNZh 30,000, citizenship 50,000');
  return out;
}

export interface Quest { icon: string; title: string; sub: string; progress?: number }
/** Up to three things worth doing now: the open first-month checklist items first, then unfinished goals. */
export function quests(s: State): Quest[] {
  const todo: Quest[] = [];
  const dr = dreamOf(s);
  if (dr && !dr.done(s)) todo.push({ icon: dr.icon, title: dr.goal, sub: `Your dream: ${dr.label}` });
  const list = G.checklistFor(s), listDone = list.filter(c => c.done).length, goalsDone = G.goals.filter(g => g.done(s)).length;
  for (const c of list) if (!c.done) todo.push({ icon: '📋', title: c.item.label, sub: `First month · ${listDone}/${list.length}`, progress: list.length ? listDone / list.length : 0 });
  for (const g of G.goals) if (!g.done(s)) todo.push({ icon: '🎯', title: g.label, sub: `Goal · ${goalsDone}/${G.goals.length}`, progress: goalsDone / G.goals.length });
  const daily: Quest = G.dailyDone(s)
    ? { icon: '🧸', title: 'Matryoshka found today', sub: `${G.dailyFound(s)} found · big prize in ${G.dailyToPrize(s)} more`, progress: 1 - G.dailyToPrize(s) / G.DAILY_PRIZE_EVERY }
    : { icon: '🧸', title: `Daily hunt: look at ${G.placeById(G.dailySpot(s)).n}`, sub: `${G.dailyFound(s)} found · ${G.money(G.DAILY_BIG_PRIZE)} after ${G.dailyToPrize(s)} more`, progress: 1 - G.dailyToPrize(s) / G.DAILY_PRIZE_EVERY };
  // the first to-do, the daily hunt, then one more to-do
  return [todo[0], daily, todo[1]].filter((x): x is Quest => !!x);
}

/** The actions that fit the place where the player stands. */
export function placeActions(s: State): G.Action[] {
  const cats = G.PLACE_CATS[s.loc] || [];
  return G.actions.filter(a => a.cats.some(c => cats.includes(c)));
}

export const moodOf = (s: State): { icon: string; label: string } =>
  s.stress >= 75 ? { icon: '😫', label: 'Stressed' } : s.energy < 25 ? { icon: '🥱', label: 'Tired' } : s.stress >= 45 ? { icon: '😐', label: 'Tense' } : s.health < 35 ? { icon: '🤒', label: 'Unwell' } : { icon: '🙂', label: 'Fine' };
