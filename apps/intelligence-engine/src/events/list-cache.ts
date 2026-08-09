// Request-coalescing + short-TTL cache in front of GET /v1/events' read query. Two distinct
// purposes, not one: (1) concurrent requests for the identical query (e.g. several map tiles
// requesting the same bbox at once) share one Prisma round trip instead of each issuing its
// own — the actual worldmonitor-derived idea, see docs/architecture/REFERENCES.md. (2) a short
// TTL for rapid repeat identical requests after the first completes.
//
// Invalidated ENTIRELY on every event write (see invalidate(), called from createEvent()/
// updateStatus()), not left to expire on its own — this app has live WS push for real-time
// updates anyway, so this cache exists to absorb read bursts, not to intentionally serve stale
// data. A citizen or authority re-querying right after their own write must see it.

interface CacheEntry {
  expiresAt: number;
  promise: Promise<unknown>;
}

const TTL_MS = 3000;
const MAX_ENTRIES = 200; // simple cap against unbounded growth; oldest entry evicted first

const cache = new Map<string, CacheEntry>();

export interface ListEventsCacheParams {
  cursor?: string;
  limit: number;
  bbox?: { minLng: number; minLat: number; maxLng: number; maxLat: number };
  lat?: number;
  lng?: number;
  radiusKm?: number;
  wardId?: number;
}

// Builds the key from an explicit fixed-order object, not the raw query string or a naive
// JSON.stringify(params) — property insertion order on the input isn't guaranteed, and
// JSON.stringify's own key-replacer-array trick doesn't recurse correctly into `bbox`'s nested
// keys. Constructing a new object with fixed key order here sidesteps both problems.
export function cacheKey(params: ListEventsCacheParams): string {
  return JSON.stringify({
    cursor: params.cursor ?? null,
    limit: params.limit,
    bbox: params.bbox ?? null,
    lat: params.lat ?? null,
    lng: params.lng ?? null,
    radiusKm: params.radiusKm ?? null,
    wardId: params.wardId ?? null,
  });
}

export async function getOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.promise as Promise<T>;
  }

  // Storing the PROMISE (not its resolved value) is what makes this request-coalescing, not
  // just caching: a concurrent call for the same key while this is still pending gets the same
  // in-flight promise above, rather than triggering a second fetcher() call.
  const promise = fetcher();
  cache.set(key, { expiresAt: now + TTL_MS, promise });

  if (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }

  // Don't leave a rejected promise cached for the TTL window — a transient DB error shouldn't
  // keep failing every request for the next 3 seconds once the DB recovers.
  promise.catch(() => cache.delete(key));

  return promise;
}

export function invalidate(): void {
  cache.clear();
}
