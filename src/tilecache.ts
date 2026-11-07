/* Map tiles kept on the device (round 158), so the real city still opens, around the places the player has been, with no connection.
   A tile is looked up in the browser's cache first (a tile changes rarely and this saves the player's data); one older than 30 days is fetched again, but the old copy
   is still used when that fails. The cache holds the 400 newest tiles. A tile is 20-100 KB, so that is a few tens of MB at most, and the browser may clear it at any time. */

export const TILE_CACHE = 'vrussia-tiles';
export const MAX_TILES = 400;
export const MAX_AGE_MS = 30 * 24 * 3600 * 1000;
const STAMP = 'x-cached-at';

/** The part of the browser's Cache that is used here (tests supply a small stand-in). */
export interface CacheLike {
  match(key: string): Promise<Response | undefined>;
  put(key: string, res: Response): Promise<void>;
  keys(): Promise<readonly { url: string }[]>;
  delete(key: string): Promise<boolean>;
}
const browserCache = async (): Promise<CacheLike | null> => { try { return typeof caches === 'undefined' ? null : await caches.open(TILE_CACHE); } catch { return null; } };

const keyOf = (z: number, x: number, y: number): string => `https://tiles.local/${z}/${x}/${y}`;

/** A tile: from the cache if it is there and fresh, else from `net`, which is then remembered. When `net` fails, a stale copy is better than nothing. */
export async function cachedTile(z: number, x: number, y: number, net: () => Promise<ArrayBuffer | null>, open: () => Promise<CacheLike | null> = browserCache, now: () => number = Date.now): Promise<ArrayBuffer | null> {
  const cache = await open().catch(() => null), key = keyOf(z, x, y);
  let stale: ArrayBuffer | null = null;
  if (cache) {
    const hit = await cache.match(key).catch(() => undefined);
    if (hit) {
      const buf = await hit.arrayBuffer().catch(() => null), at = Number(hit.headers.get(STAMP) ?? 0);
      if (buf && now() - at < MAX_AGE_MS) return buf;
      stale = buf;
    }
  }
  let fresh: ArrayBuffer | null;
  try { fresh = await net(); } catch (e) { if (stale) return stale; throw e; }
  if (!fresh) return stale;
  if (cache) {
    try {
      await cache.put(key, new Response(fresh.slice(0), { headers: { [STAMP]: String(now()) } }));
      const all = await cache.keys();
      for (const k of all.slice(0, Math.max(0, all.length - MAX_TILES))) await cache.delete(k.url);        // the oldest go first
    } catch { /* a full or blocked cache only means this tile is not kept */ }
  }
  return fresh;
}

const TPL_KEY = 'vrussia_tiletpl';
/** The tile address template from the map service (TileJSON): remembered, so it is known with no connection. */
export async function tileTemplateOf(load: () => Promise<string>, kv: { getItem(k: string): string | null; setItem(k: string, v: string): void } | null = (() => { try { return localStorage; } catch { return null; } })()): Promise<string> {
  try { const t = await load(); try { kv?.setItem(TPL_KEY, t); } catch { /* ignore */ } return t; }
  catch (e) { let t: string | null = null; try { t = kv?.getItem(TPL_KEY) ?? null; } catch { /* ignore */ } if (t) return t; throw e; }
}
