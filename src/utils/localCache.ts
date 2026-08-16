/**
 * Lightweight localStorage cache to minimize backend/cloud usage.
 * Entries live for 12 days unless manually refreshed.
 */
export const CACHE_TTL_MS = 12 * 24 * 60 * 60 * 1000; // 12 days
const PREFIX = "cc_cache:";

interface Entry<T> { t: number; v: T }

export function readCache<T>(key: string, ttl = CACHE_TTL_MS): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry<T>;
    if (!parsed || typeof parsed.t !== "number") return null;
    if (Date.now() - parsed.t > ttl) return null;
    return parsed.v;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v: value } as Entry<T>));
  } catch {
    /* quota exceeded – ignore */
  }
}

export function clearCache(key?: string) {
  try {
    if (key) { localStorage.removeItem(PREFIX + key); return; }
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/** Age of a cache entry in ms, or null when missing. */
export function cacheAge(key: string): number | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry<unknown>;
    return typeof parsed?.t === "number" ? Date.now() - parsed.t : null;
  } catch {
    return null;
  }
}

/** Fetch with cache: returns cached value when fresh, otherwise runs the loader. */
export async function cachedFetch<T>(
  key: string,
  loader: () => Promise<T>,
  opts: { ttl?: number; force?: boolean } = {}
): Promise<T> {
  if (!opts.force) {
    const hit = readCache<T>(key, opts.ttl);
    if (hit !== null) return hit;
  }
  const value = await loader();
  writeCache(key, value);
  return value;
}

/** Clears every cached media/data entry and the image cache in the service worker. */
export async function clearAllCaches() {
  clearCache();
  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("cc-media")).map((n) => caches.delete(n)));
    }
  } catch {
    /* ignore */
  }
}
