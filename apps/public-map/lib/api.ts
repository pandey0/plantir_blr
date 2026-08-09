// Centralized intelligence-engine API client. Single place that knows the engine's base URL
// and the /v1/ route shapes — no component should build a fetch URL by hand. Before this file
// existed, 4 different components each hardcoded `http://localhost:3001` and the pre-/v1
// unversioned paths, which is exactly how this app ended up silently broken against the
// engine's 2026-08-09 /v1 migration (see docs/architecture/TECH_STACK.md's decision log and
// this app's own CLAUDE.md). One client, one base URL, one place to fix when the engine's
// contract changes.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function wsBaseUrl(): string {
  // Same host as the HTTP API, just a different scheme — ws(s) mirrors http(s). Derived, not a
  // second independently-configured env var, so the two can never drift apart.
  return API_BASE_URL.replace(/^http/, 'ws');
}

export function getWsUrl(): string {
  return `${wsBaseUrl()}/ws`;
}

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      // Non-JSON error body — keep the generic message rather than surfacing raw HTML/text.
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

// Raw engine response shape (packages/database/prisma's Event model + attachCoordinates()'s
// latitude/longitude — see apps/intelligence-engine/src/events/geo-query.ts). Field names
// intentionally NOT the same as MapEvent below (category vs. type, no `location`) — the engine
// is the source of truth for its own shape, this app's components should not be coupled to it
// directly. See toMapEvent().
export interface EngineEvent {
  id: string;
  category: string;
  status: string;
  confidence_score: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  latitude: number | null;
  longitude: number | null;
}

// The shape every component in this app (MapInner, EventTicker, ContextPanel, etc.) already
// expects — matches the WS NEW_EVENT broadcast payload's field names exactly (`type`, not
// `category`), since that's what this app was originally built against. `location` has no
// backing database column on the engine (see docs/architecture/IMPLEMENTATION_NOTES.md's
// "Coordinates missing from read responses" note for the analogous gap that WAS fixed) — it
// only ever arrives live via a WS NEW_EVENT payload at creation time, never via a GET. Always
// `undefined` for hydrated (GET) events; components already fall back to "Unknown" for this.
export interface MapEvent {
  id: string;
  type: string;
  status: string;
  confidence_score: number;
  location?: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  constituency?: string;
}

export function toMapEvent(e: EngineEvent): MapEvent {
  return {
    id: e.id,
    type: e.category,
    status: e.status,
    confidence_score: e.confidence_score,
    latitude: e.latitude,
    longitude: e.longitude,
    created_at: e.created_at,
  };
}

export interface ListEventsParams {
  limit?: number;
  cursor?: string;
  bbox?: string;
  wardId?: number;
}

export async function listEvents(params: ListEventsParams = {}): Promise<{ events: MapEvent[]; nextCursor: string | null }> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.cursor) qs.set('cursor', params.cursor);
  if (params.bbox) qs.set('bbox', params.bbox);
  if (params.wardId) qs.set('wardId', String(params.wardId));

  const result = await request<{ events: EngineEvent[]; nextCursor: string | null }>(`/v1/events?${qs.toString()}`);
  return { events: result.events.map(toMapEvent), nextCursor: result.nextCursor };
}

export interface ArrivalData {
  id: string;
  route: string;
  direction: string;
  eta: string;
  status: 'ON_TIME' | 'DELAYED' | 'APPROACHING';
  platform?: string;
}

export function getArrivals(station: string, mode: 'METRO' | 'BUS'): Promise<ArrivalData[]> {
  return request<ArrivalData[]>(`/v1/transit/arrivals?station=${encodeURIComponent(station)}&mode=${mode}`);
}

export interface FareEstimate {
  fare: number;
  time: string;
}

export function getFareEstimate(from: string, to: string, mode: 'METRO' | 'BUS'): Promise<FareEstimate> {
  return request<FareEstimate>(
    `/v1/transit/estimate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&mode=${mode}`,
  );
}
