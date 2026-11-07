import { describe, it, expect } from 'vitest';
import { cachedTile, tileTemplateOf, MAX_TILES, MAX_AGE_MS } from '../src/tilecache';
import type { CacheLike } from '../src/tilecache';

const fakeCache = (): CacheLike & { store: Map<string, Response> } => {
  const store = new Map<string, Response>();
  return { store, match: async k => store.get(k)?.clone(), put: async (k, r) => { store.delete(k); store.set(k, r); }, keys: async () => [...store.keys()].map(url => ({ url })), delete: async k => store.delete(k) };
};
const bytes = (n: number): ArrayBuffer => new Uint8Array([n, n, n]).buffer;
const first = (b: ArrayBuffer | null): number | undefined => (b ? new Uint8Array(b)[0] : undefined);

describe('map tiles kept on the device', () => {
  it('fetches a tile once, then serves it from the cache with no connection', async () => {
    const c = fakeCache(); let calls = 0;
    expect(first(await cachedTile(14, 1, 2, async () => { calls++; return bytes(7); }, async () => c))).toBe(7);
    expect(first(await cachedTile(14, 1, 2, async () => { calls++; throw new Error('offline'); }, async () => c))).toBe(7);
    expect(calls).toBe(1);
  });
  it('fails as before when the tile was never seen and there is no connection', async () => {
    await expect(cachedTile(14, 9, 9, async () => { throw new Error('offline'); }, async () => fakeCache())).rejects.toThrow('offline');
    expect(await cachedTile(14, 9, 9, async () => null, async () => fakeCache())).toBeNull();
  });
  it('fetches again after 30 days, and keeps using the old copy when that fails', async () => {
    const c = fakeCache(); let t = 1000;
    await cachedTile(14, 1, 1, async () => bytes(1), async () => c, () => t);
    t += MAX_AGE_MS + 1;
    expect(first(await cachedTile(14, 1, 1, async () => bytes(2), async () => c, () => t))).toBe(2);
    t += MAX_AGE_MS + 1;
    expect(first(await cachedTile(14, 1, 1, async () => { throw new Error('offline'); }, async () => c, () => t))).toBe(2);
  });
  it('keeps only the newest tiles', async () => {
    const c = fakeCache();
    for (let i = 0; i < MAX_TILES + 5; i++) await cachedTile(14, i, 0, async () => bytes(1), async () => c);
    expect(c.store.size).toBe(MAX_TILES);
    expect(c.store.has('https://tiles.local/14/0/0')).toBe(false);
    expect(c.store.has(`https://tiles.local/14/${MAX_TILES + 4}/0`)).toBe(true);
  });
  it('works without a cache at all (private window, old browser)', async () => {
    expect(first(await cachedTile(14, 3, 3, async () => bytes(5), async () => null))).toBe(5);
  });
  it('remembers the tile address template for offline use, and still fails when it was never known', async () => {
    const m = new Map<string, string>(), kv = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
    expect(await tileTemplateOf(async () => 'https://t/{z}/{x}/{y}', kv)).toBe('https://t/{z}/{x}/{y}');
    expect(await tileTemplateOf(async () => { throw new Error('offline'); }, kv)).toBe('https://t/{z}/{x}/{y}');
    await expect(tileTemplateOf(async () => { throw new Error('offline'); }, { getItem: () => null, setItem: () => undefined })).rejects.toThrow('offline');
  });
});
