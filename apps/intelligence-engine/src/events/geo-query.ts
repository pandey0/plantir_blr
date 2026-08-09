import { Prisma, type Event } from '@prisma/client';
import { prisma, type Db } from '../db.js';
import { getWardGeometry } from '../wards/index.js';

// Read-side spatial filtering for GET /v1/events. Deliberately NOT part of createEvent()/
// updateStatus()'s write-path module boundary (see README.md: "reads don't need to go
// through events/") — this exists as its own file because the raw-SQL spatial predicates
// are non-trivial enough to deserve isolation/testability, not because reads must funnel
// through a shared core the way writes do.
//
// Two-step design, not a single query with cursor pagination baked into the SQL: this
// returns a plain ID list, and the caller (app.ts) filters Prisma's normal
// findMany/cursor/take pagination by `id: { in: [...] }`. Simpler to write and keeps
// Prisma's pagination semantics intact, at the cost of re-running the spatial query on
// every page instead of once. Fine at current event volumes (a single city's citizen
// reports, not a firehose) — revisit if/when this needs to scale past that, likely
// alongside the request-coalescing cache work.

export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export type EventWithCoordinates = Event & { latitude: number | null; longitude: number | null };

// `geom` has no first-class Prisma field (schema.prisma's comment — no built-in PostGIS
// support), so `prisma.event.findMany()` NEVER returns coordinates, even though they're
// persisted. This was a real gap: every read endpoint (GET /v1/events, GET
// /v1/events/playback) returned events with no way to actually place them on a map, discovered
// while wiring up public-map's initial event hydration (2026-08-10) — bbox/radius/ward
// filtering could query BY location, but the response never gave the caller the location back.
// One extra batched raw-SQL query per page (not a JOIN inside the Prisma query, since Prisma
// can't select a column it doesn't know about) — id list is already small (a page, `limit`
// capped at 100) so this is cheap. `latitude`/`longitude` are `null` only if `geom` is null,
// which shouldn't happen for any event created through createEvent() (always writes geom) —
// defensive typing, not an expected case.
export async function attachCoordinates<T extends { id: string }>(
  events: T[],
): Promise<(T & { latitude: number | null; longitude: number | null })[]> {
  if (events.length === 0) return [];

  const rows = await prisma.$queryRaw<{ id: string; lat: number | null; lng: number | null }[]>`
    SELECT id, ST_Y(geom::geometry) as lat, ST_X(geom::geometry) as lng
    FROM "Event"
    WHERE id = ANY(${events.map((e) => e.id)})
  `;
  const coordsById = new Map(rows.map((r) => [r.id, { latitude: r.lat, longitude: r.lng }]));

  return events.map((e) => ({ ...e, ...(coordsById.get(e.id) ?? { latitude: null, longitude: null }) }));
}

export async function findEventIdsInBbox(bbox: Bbox): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Event"
    WHERE status != 'FRAUD'
      AND geom IS NOT NULL
      AND ST_Within(geom::geometry, ST_MakeEnvelope(${bbox.minLng}, ${bbox.minLat}, ${bbox.maxLng}, ${bbox.maxLat}, 4326))
  `;
  return rows.map((r) => r.id);
}

export async function findEventIdsInRadius(lat: number, lng: number, radiusKm: number): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Event"
    WHERE status != 'FRAUD'
      AND geom IS NOT NULL
      AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusKm * 1000})
  `;
  return rows.map((r) => r.id);
}

// Ward-based filtering — docs/product/VISION.md's Bangalore-specific context ("map event
// coordinates to Bangalore's 243 BBMP wards"). No Ward table/migration: the ward polygon
// comes from the static GeoJSON in wards/ (already loaded in memory), passed as a parameter
// into ST_GeomFromGeoJSON at query time rather than persisted — same tradeoff already made
// for bbox/radius filtering (compute over static/caller-supplied geometry, not a stored one).
// Revisit with a real PostGIS-backed Ward table if a query pattern ever needs "which ward is
// this event in" computed FROM the database rather than filtered INTO it.
export async function findEventIdsInWard(wardId: number): Promise<string[]> {
  const geometry = getWardGeometry(wardId);
  if (!geometry) return [];

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Event"
    WHERE status != 'FRAUD'
      AND geom IS NOT NULL
      AND ST_Within(geom::geometry, ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326))
  `;
  return rows.map((r) => r.id);
}

// Duplicate/corroboration detection — docs/product/VISION.md's Fraud Prevention ("duplicate
// detection") and Confidence Signals ("reports within small radius" / "reports within short
// time window"). Rather than scoring spatial/temporal proximity as separate additive terms,
// this repo expresses them as an ELIGIBILITY gate: a new report only ever counts as a second
// "unique reporter" on an existing event (see events/index.ts's confidence formula) if it is
// already close in both space and time to that event. See events/README.md for the full
// rationale and events/index.ts's createEvent() for how this is used.
//
// Takes a `db` param (not the module-level `prisma`) so it can run inside createEvent()'s
// $transaction and see writes from that same transaction — required for correctness, not
// just style, though see the residual-race note in IMPLEMENTATION_NOTES.md: two fully
// concurrent createEvent() calls in overlapping transactions can still both miss each other
// under Postgres's default READ COMMITTED isolation (neither sees the other's uncommitted
// row). Not solved here — would need row/advisory locking, real added complexity not
// justified at this app's traffic.
export const DUPLICATE_RADIUS_METERS = 150;
export const DUPLICATE_TIME_WINDOW_HOURS = 6;

const CORROBORATION_ELIGIBLE_STATUSES = ['REPORTED', 'VERIFIED', 'ESCALATED', 'IN_PROGRESS'] as const;

export async function findDuplicateCandidateEventId(
  db: Db,
  category: string,
  lat: number,
  lng: number,
): Promise<string | null> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Event"
    WHERE category = ${category}::"EventCategory"
      AND status = ANY(${CORROBORATION_ELIGIBLE_STATUSES}::"EventStatus"[])
      AND geom IS NOT NULL
      AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${DUPLICATE_RADIUS_METERS})
      AND created_at >= NOW() - (${DUPLICATE_TIME_WINDOW_HOURS} || ' hours')::interval
    ORDER BY created_at ASC
    LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

// Grid clustering — docs/product/VISION.md's Clustering System. Zoom follows Leaflet/Mapbox
// convention (public-map uses Leaflet): 1 = whole world, 22 = building-level.
//
// Grid size is a STEP FUNCTION over the 4 zoom/grid-size pairs VISION.md documents (5->1km,
// 10->300m, 14->80m, 17->individual markers), not an interpolation — the doc gives reference
// points, not a formula, and a step function reproduces exactly those 4 points without
// inventing curve-fitting behavior nobody asked for. zoom >= 17 returns null: "no clustering,
// individual markers" per the doc, handled as a separate code path below, not grid size 0.
export function gridSizeMeters(zoom: number): number | null {
  if (zoom >= 17) return null;
  if (zoom >= 14) return 80;
  if (zoom >= 10) return 300;
  return 1000;
}

// Bangalore-specific approximation, not geodetically exact: converting a meter grid size to
// degrees requires a reference latitude (a degree of longitude is ~111.32km * cos(latitude),
// degree of latitude is a near-constant ~111.32km). Using Bangalore's own latitude (not the
// equator, not the query's actual bbox center) keeps grid cells visually close to square across
// the single city this app serves — this would need per-bbox recalculation to stay accurate
// for a multi-city or global version, which isn't a real requirement here. Document, don't
// silently "fix" if this ever needs to generalize.
const METERS_PER_DEGREE_LAT = 111_320;
const BANGALORE_REFERENCE_LATITUDE = 12.97;
const METERS_PER_DEGREE_LNG = METERS_PER_DEGREE_LAT * Math.cos((BANGALORE_REFERENCE_LATITUDE * Math.PI) / 180);

export interface EventCluster {
  latitude: number;
  longitude: number;
  count: number;
  // Only present when count === 1 — a cluster of many events has no single "the event" to
  // point at; the frontend can render it as a normal marker (VISION.md's "Zoom 17 -> individual
  // markers") rather than a cluster bubble specifically because these are present.
  eventId?: string;
  category?: string;
}

export async function findEventClusters(zoom: number, bbox?: Bbox): Promise<EventCluster[]> {
  const bboxClause = bbox
    ? Prisma.sql`AND ST_Within(geom::geometry, ST_MakeEnvelope(${bbox.minLng}, ${bbox.minLat}, ${bbox.maxLng}, ${bbox.maxLat}, 4326))`
    : Prisma.empty;

  const gridMeters = gridSizeMeters(zoom);

  if (gridMeters === null) {
    const rows = await prisma.$queryRaw<{ lng: number; lat: number; id: string; category: string }[]>`
      SELECT ST_X(geom::geometry) as lng, ST_Y(geom::geometry) as lat, id, category::text as category
      FROM "Event"
      WHERE status != 'FRAUD' AND geom IS NOT NULL ${bboxClause}
    `;
    return rows.map((r) => ({ latitude: r.lat, longitude: r.lng, count: 1, eventId: r.id, category: r.category }));
  }

  const latDeg = gridMeters / METERS_PER_DEGREE_LAT;
  const lngDeg = gridMeters / METERS_PER_DEGREE_LNG;

  const rows = await prisma.$queryRaw<
    { lng: number; lat: number; count: number; event_id: string | null; category: string | null }[]
  >`
    SELECT
      ST_X(ST_Centroid(ST_Collect(geom::geometry))) as lng,
      ST_Y(ST_Centroid(ST_Collect(geom::geometry))) as lat,
      COUNT(*)::int as count,
      (CASE WHEN COUNT(*) = 1 THEN MIN(id) END) as event_id,
      (CASE WHEN COUNT(*) = 1 THEN MIN(category::text) END) as category
    FROM "Event"
    WHERE status != 'FRAUD' AND geom IS NOT NULL ${bboxClause}
    GROUP BY ST_SnapToGrid(geom::geometry, ${lngDeg}, ${latDeg})
  `;
  return rows.map((r) => ({
    latitude: r.lat,
    longitude: r.lng,
    count: r.count,
    eventId: r.event_id ?? undefined,
    category: r.category ?? undefined,
  }));
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
}

// docs/product/VISION.md's Heatmap Layer ("density of reports"). Deliberately reuses
// findEventClusters() rather than a second grid-aggregation query — a heatmap point IS a
// cluster centroid with its count reinterpreted as intensity/weight instead of a "N events"
// badge. Same zoom->grid-size step function, same bbox handling. If heatmap-specific behavior
// (e.g. a different grid resolution tuned for smooth gradients rather than discrete cluster
// bubbles) is ever needed, split this out then — not speculatively now.
export async function getHeatmapPoints(zoom: number, bbox?: Bbox): Promise<HeatmapPoint[]> {
  const clusters = await findEventClusters(zoom, bbox);
  return clusters.map((c) => ({ latitude: c.latitude, longitude: c.longitude, weight: c.count }));
}
