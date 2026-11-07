/* Metro in real-city routes (round 157). Walking is the base route; when two metro stations of the loaded map (OpenStreetMap) are also stations of the game's
   real metro (src/metro-data.ts) and walking to one, riding, and walking from the other is clearly quicker, a ride is suggested in the directions.
   Stations are matched by their English name; a station that cannot be matched is ignored. Buses and trams are not here: the map tiles carry stops but no routes. */
import { METRO, MIN_PER_CHANGE, metroRoute } from './metro-data';
import type { MetroSystem } from './metro-data';
import type { Poi, XZ } from './realworld';
import { walkMinutes } from './realworld';

export interface MetroPlan { minutes: number; steps: string[] }
const WAIT = 3, SAVE = 4, MAX_WALK = 1800, NEAR = 3, DETOUR = 1.3;     // minutes waiting for a train, minutes a ride must save, metres to a station, stations tried at each end, street detour

/** A name without spelling variants (Okhotny / Okhotnyy, Kiyevskaya / Kievskaya are not told apart). */
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z]/g, '').replace(/iy|yy|ii|ij/g, 'y').replace(/ie/g, 'iye').replace(/iye/g, 'ye');
const dist = (a: XZ, b: XZ): number => Math.hypot(a.x - b.x, a.z - b.z);
const stops = (n: number, ru: boolean): string => (ru ? `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'остановка' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'остановки' : 'остановок'}` : `${n} stop${n === 1 ? '' : 's'}`);

interface St { station: string; poi: Poi }
/** The nearest entrance of each game station among the places, within `MAX_WALK` of a spot. */
function nearStations(system: MetroSystem, pois: Poi[], at: XZ): St[] {
  const names = new Map<string, string>();
  for (const l of system.lines) for (const s of l.stations) names.set(norm(s), s);
  const best = new Map<string, St>();
  for (const p of pois) {
    if (p.kind !== 'metro' || !p.nameEn || dist(p.at, at) > MAX_WALK) continue;
    const station = names.get(norm(p.nameEn)); if (!station) continue;
    const old = best.get(station); if (!old || dist(p.at, at) < dist(old.poi.at, at)) best.set(station, { station, poi: p });
  }
  return [...best.values()].sort((a, b) => dist(a.poi.at, at) - dist(b.poi.at, at)).slice(0, NEAR);
}

/** The best walk-ride-walk plan from one spot to another, or null when there is none or it does not beat walking (`walkMin`) by a few minutes. */
export function metroPlan(pois: Poi[], from: XZ, to: XZ, walkMin: number, ru: boolean): MetroPlan | null {
  let best: { total: number; a: St; b: St; ride: NonNullable<ReturnType<typeof metroRoute>>; wa: number; wb: number } | null = null;
  for (const sys of METRO) {
    const as = nearStations(sys, pois, from), bs = nearStations(sys, pois, to);
    for (const a of as) for (const b of bs) {
      if (a.station === b.station) continue;
      const ride = metroRoute(sys.city, a.station, b.station); if (!ride) continue;
      const wa = walkMinutes(dist(a.poi.at, from) * DETOUR), wb = walkMinutes(dist(b.poi.at, to) * DETOUR), total = wa + WAIT + ride.minutes + wb;
      if (!best || total < best.total) best = { total, a, b, ride, wa, wb };
    }
  }
  if (!best || best.total + SAVE > walkMin) return null;
  const { a, b, ride, wa, wb, total } = best, nm = (p: Poi): string => (ru ? p.name : p.nameEn ?? p.name);
  const local = new Map<string, string>();                         // the map's own Russian name of every station it shows
  if (ru) for (const p of pois) if (p.kind === 'metro' && p.nameEn && p.name !== p.nameEn) local.set(norm(p.nameEn), p.name);
  const lab = (s: string): string => local.get(norm(s)) ?? s;
  const mid: string[] = [];
  const change = (x: string, y: string): void => { if (x !== y) mid.push(ru ? `Переход: ${lab(x)} → ${lab(y)} (около ${MIN_PER_CHANGE} мин)` : `Change: ${x} → ${y} (about ${MIN_PER_CHANGE} min)`); };
  let at = a.station;
  for (const l of ride.legs) {
    change(at, l.stops[0]); at = l.stops[l.stops.length - 1];
    const n = l.stops.length - 1;
    mid.push(ru ? `Метро, линия ${l.line.num}: ${lab(l.stops[0])} → ${lab(at)}, ${stops(n, true)}` : `Metro line ${l.line.num} (${l.line.name}): ${l.stops[0]} → ${at}, ${stops(n, false)}`);
  }
  change(at, b.station);
  return {
    minutes: total,
    steps: [
      ru ? `Быстрее на метро: около ${total} мин (пешком ${walkMin} мин)` : `Quicker by metro: about ${total} min (on foot ${walkMin} min)`,
      ru ? `Пешком до станции «${nm(a.poi)}»: ${wa} мин` : `Walk to ${nm(a.poi)} station: ${wa} min`,
      ...mid,
      ru ? `От станции «${nm(b.poi)}» пешком: ${wb} мин` : `Walk from ${nm(b.poi)} station: ${wb} min`,
    ],
  };
}
