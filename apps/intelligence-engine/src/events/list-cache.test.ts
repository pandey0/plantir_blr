import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheKey, getOrFetch, invalidate } from './list-cache.js';

// Pure unit tests — getOrFetch/invalidate hold everything in-memory, no DB touches this file.

beforeEach(() => {
  invalidate();
});

describe('cacheKey', () => {
  it('is stable regardless of property insertion order', () => {
    const a = cacheKey({ limit: 50, cursor: 'abc' });
    const b = cacheKey({ cursor: 'abc', limit: 50 });
    expect(a).toBe(b);
  });

  it('differs when bbox differs', () => {
    const a = cacheKey({ limit: 50, bbox: { minLng: 0, minLat: 0, maxLng: 1, maxLat: 1 } });
    const b = cacheKey({ limit: 50, bbox: { minLng: 0, minLat: 0, maxLng: 2, maxLat: 1 } });
    expect(a).not.toBe(b);
  });

  it('treats an unset field and an explicitly-undefined one the same (both normalize to null)', () => {
    const a = cacheKey({ limit: 50 });
    const b = cacheKey({ limit: 50, cursor: undefined });
    expect(a).toBe(b);
  });
});

describe('getOrFetch', () => {
  it('calls the fetcher once for concurrent calls with the same key (coalescing)', async () => {
    const fetcher = vi.fn(() => new Promise((resolve) => setTimeout(() => resolve('value'), 20)));
    const [r1, r2, r3] = await Promise.all([
      getOrFetch('k', fetcher),
      getOrFetch('k', fetcher),
      getOrFetch('k', fetcher),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect([r1, r2, r3]).toEqual(['value', 'value', 'value']);
  });

  it('calls the fetcher again for a different key', async () => {
    const fetcher = vi.fn(async () => 'value');
    await getOrFetch('k1', fetcher);
    await getOrFetch('k2', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('serves a cached (resolved) value again within the TTL window without re-calling the fetcher', async () => {
    const fetcher = vi.fn(async () => 'value');
    await getOrFetch('k', fetcher);
    await getOrFetch('k', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not cache a rejection — a retried call after a failure calls the fetcher again', async () => {
    let calls = 0;
    const fetcher = vi.fn(() => {
      calls++;
      return calls === 1 ? Promise.reject(new Error('transient')) : Promise.resolve('recovered');
    });

    await expect(getOrFetch('k', fetcher)).rejects.toThrow('transient');
    // give the .catch(() => cache.delete(key)) microtask a chance to run
    await new Promise((resolve) => setTimeout(resolve, 0));
    const result = await getOrFetch('k', fetcher);
    expect(result).toBe('recovered');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('invalidate() clears the cache so the next call re-fetches', async () => {
    const fetcher = vi.fn(async () => 'value');
    await getOrFetch('k', fetcher);
    invalidate();
    await getOrFetch('k', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
