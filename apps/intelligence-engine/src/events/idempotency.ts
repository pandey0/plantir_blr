import { createHash } from 'node:crypto';

// Idempotency-Key support for POST /v1/events — docs/architecture/STANDARDS_COMPLIANCE.md row
// #15 (was ⏸ deferred). A retried request (flaky mobile connection, a client that times out
// waiting for a response and retries) previously always created a duplicate Report — duplicate
// detection (geo-query.ts) reduces the practical damage of a genuinely-duplicate REPORT but
// doesn't make a literal retry of the SAME request safe: two calls with the same body still
// created two Report rows before this. This closes that gap directly.
//
// In-memory Map, not Redis — same architectural call already made for list-cache.ts's
// request-coalescing cache: this app has no Redis usage yet (see TECH_STACK.md), and a single
// engine instance is the documented current deployment shape (see DATA_FLOW.md's WS fan-out
// trigger condition). An idempotency key surviving a process restart isn't a real requirement
// at that scale — if this becomes a multi-instance deployment, this store needs to move
// somewhere shared (Redis), same as list-cache.ts's cache would.

interface IdempotencyRecord {
  expiresAt: number;
  requestHash: string;
  statusCode: number;
  body: unknown;
}

// 24h — long enough to cover realistic client retry windows (a mobile client retrying a failed
// submission after being offline for a while), short enough that the map doesn't grow forever
// between the (rare) natural cleanup opportunities below.
const TTL_MS = 24 * 60 * 60 * 1000;
// Same cap-and-evict-oldest pattern as list-cache.ts — bounds memory without needing a
// background sweep timer for a feature this low-traffic (10/min rate-limited).
const MAX_ENTRIES = 1000;

const store = new Map<string, IdempotencyRecord>();

function hashBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

export type IdempotencyLookupResult =
  | { kind: 'none' }
  | { kind: 'replay'; statusCode: number; body: unknown }
  | { kind: 'conflict' };

/** Checks whether `key` has already been used. A matching key with a DIFFERENT request body is
 *  a conflict (the client reused an idempotency key for a different logical request — a real
 *  client bug, per the standard idempotency-key contract other APIs like Stripe's follow), not
 *  a replay. */
export function checkIdempotency(key: string, requestBody: unknown): IdempotencyLookupResult {
  const existing = store.get(key);
  if (!existing || existing.expiresAt <= Date.now()) {
    return { kind: 'none' };
  }
  if (existing.requestHash !== hashBody(requestBody)) {
    return { kind: 'conflict' };
  }
  return { kind: 'replay', statusCode: existing.statusCode, body: existing.body };
}

export function recordIdempotency(key: string, requestBody: unknown, statusCode: number, body: unknown): void {
  store.set(key, { expiresAt: Date.now() + TTL_MS, requestHash: hashBody(requestBody), statusCode, body });

  if (store.size > MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) store.delete(oldestKey);
  }
}
