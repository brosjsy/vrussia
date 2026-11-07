/* Finding an address or a town in Russia by its name, for the real map. The search is sent to the public OpenStreetMap geocoder (Nominatim), so it is only
   done after the player agrees (CONSENT_KEY) and only for what they type. The public server allows about one request a second for all the players of an app,
   so the game asks at most once every 1.2 seconds, remembers answers, and does not ask for fewer than three letters. For many players the game should use its own
   geocoder (docs/MAPS.md). What comes back is data, never trusted: only places inside Russia, short text, numbers in range. Pure apart from the fetch that is
   passed in, so it is tested without the internet. */
export const GEO_URL = 'https://nominatim.openstreetmap.org/search';
export const CONSENT_KEY = 'vrussia_geo_ok';
export interface GeoHit { name: string; lat: number; lon: number; kind: string }
export interface GeoDeps { fetch?: (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>; now?: () => number; wait?: (ms: number) => Promise<void> }

/** The country's box (the far east crosses the 180th meridian, so longitudes up to 180 and from -170 are Russian). */
export const inRussia = (lat: number, lon: number): boolean => Number.isFinite(lat) && Number.isFinite(lon) && lat >= 41 && lat <= 82 && (lon >= 19 && lon <= 180 || lon <= -168 && lon >= -180);

const cache = new Map<string, GeoHit[]>();
let lastAt = 0, queue: Promise<unknown> = Promise.resolve();
export const clearGeoCache = (): void => { cache.clear(); lastAt = 0; };

export function geocode(query: string, d: GeoDeps = {}): Promise<GeoHit[]> {
  const q = query.trim().replace(/\s+/g, ' ').slice(0, 120), key = q.toLowerCase();
  if (q.length < 3) return Promise.resolve([]);
  const hit = cache.get(key); if (hit) return Promise.resolve(hit);
  const now = d.now ?? Date.now, wait = d.wait ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms))), go = d.fetch ?? ((u: string) => fetch(u, { headers: { Accept: 'application/json' }, referrerPolicy: 'strict-origin-when-cross-origin' }));
  const run = async (): Promise<GeoHit[]> => {
    const gap = 1200 - (now() - lastAt); if (gap > 0) await wait(gap);
    lastAt = now();
    const url = `${GEO_URL}?format=jsonv2&limit=6&countrycodes=ru&addressdetails=0&accept-language=ru&q=${encodeURIComponent(q)}`;
    const res = await go(url); if (!res.ok) throw new Error('The address search is not available now.');
    const raw = await res.json(); if (!Array.isArray(raw)) return [];
    const out: GeoHit[] = [];
    for (const r of raw.slice(0, 10) as Record<string, unknown>[]) {
      const lat = Number(r?.lat), lon = Number(r?.lon), name = String(r?.display_name ?? '').replace(/\s+/g, ' ').trim().slice(0, 160);
      if (!name || !inRussia(lat, lon)) continue;
      out.push({ name, lat, lon, kind: String(r?.type ?? r?.category ?? '').slice(0, 30) });
      if (out.length >= 6) break;
    }
    cache.set(key, out); if (cache.size > 100) cache.delete(cache.keys().next().value as string);
    return out;
  };
  const p = queue.then(run, run); queue = p.catch(() => undefined); return p;
}
export const geoConsent = (kv: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): boolean => { try { return kv?.getItem(CONSENT_KEY) === 'yes'; } catch { return false; } };
export const giveGeoConsent = (kv: Pick<Storage, 'setItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): void => { try { kv?.setItem(CONSENT_KEY, 'yes'); } catch { /* ignore */ } };
