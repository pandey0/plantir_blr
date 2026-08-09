import { z } from 'zod';
import { EventCategory, EventStatus } from './generated/plantir/events/v1/event.js';
import { TransitMode } from './generated/plantir/transit/v1/arrival.js';

// Zod schemas for the /v1 routes, built on the generated proto enums so there's
// exactly one definition of valid category/status values. Consumed directly by
// apps/intelligence-engine's app.ts/ingestion — see this package's README.md.

export const eventCategorySchema = z.nativeEnum(EventCategory);
export const eventStatusSchema = z.nativeEnum(EventStatus);
export const transitModeSchema = z.nativeEnum(TransitMode);

// docs/product/VISION.md's Fraud Prevention ("GPS validation"). A generous bounding box
// around the Bangalore metro area (city limits plus a buffer), not the tight BBMP-only box
// used elsewhere for synthetic dev-injected data (see app.ts's DevInjectEvent) — the goal is
// to catch obviously-wrong coordinates (GPS spoofing, test data, a client bug sending
// null-island 0,0), not to reject legitimate reports from the edge of the metro area. A
// false rejection (blocking a real citizen report) is worse than a false acceptance here, so
// this box is deliberately wide. Revisit only with real false-positive/false-negative data
// from actual usage, not by guessing tighter bounds pre-beta.
const BANGALORE_METRO_BOUNDS = { latMin: 12.7, latMax: 13.2, lngMin: 77.35, lngMax: 77.85 };

export const createEventRequestSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    category: eventCategorySchema,
    location: z.string().optional(),
    // No real user accounts exist yet (see docs/api/intelligence-engine.md's auth section) —
    // this is caller-supplied, not verified against any identity. Feeds confidence scoring's
    // "unique reporter" count. Not cryptographically anything; a client can claim any ID.
    reporterId: z.string().min(1).optional(),
    // Capped at 10 — a citizen report needing more than 10 photos/videos to substantiate a
    // pothole is not a real use case; an unbounded array is just an abuse vector.
    mediaUrls: z.array(z.string().url()).max(10).optional(),
  })
  .refine(
    (data) =>
      data.latitude >= BANGALORE_METRO_BOUNDS.latMin &&
      data.latitude <= BANGALORE_METRO_BOUNDS.latMax &&
      data.longitude >= BANGALORE_METRO_BOUNDS.lngMin &&
      data.longitude <= BANGALORE_METRO_BOUNDS.lngMax,
    { message: 'Coordinates fall outside the Bangalore metro area', path: ['latitude'] },
  );

export const bboxSchema = z
  .string()
  .transform((val, ctx) => {
    const parts = val.split(',').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'bbox must be "minLng,minLat,maxLng,maxLat"' });
      return z.NEVER;
    }
    const [minLng, minLat, maxLng, maxLat] = parts;
    if (minLng >= maxLng || minLat >= maxLat) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'bbox min must be less than max on both axes' });
      return z.NEVER;
    }
    if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'bbox coordinates out of valid lng/lat range' });
      return z.NEVER;
    }
    return { minLng, minLat, maxLng, maxLat };
  });

export const listEventsRequestSchema = z
  .object({
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    bbox: bboxSchema.optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    // Capped at 50km — this is a single-city (Bangalore) app; a radius approaching or
    // exceeding the metro area's own extent is almost certainly a caller mistake, not a
    // real use case, and an unbounded radius is an easy way to force a full-table geo scan.
    radiusKm: z.coerce.number().positive().max(50).optional(),
    // docs/product/VISION.md's Bangalore-specific ward integration. BBMP ward IDs are small
    // positive integers (see apps/intelligence-engine/src/wards/); an unknown id simply
    // matches zero events (see geo-query.ts's findEventIdsInWard), not a 400 — a ward id with
    // no digitized boundary isn't a caller error, the data just doesn't cover it yet.
    wardId: z.coerce.number().int().positive().optional(),
  })
  .refine(
    (data) =>
      !(
        data.wardId !== undefined &&
        (data.bbox || data.lat !== undefined || data.lng !== undefined || data.radiusKm !== undefined)
      ),
    { message: 'Cannot combine wardId with bbox/lat/lng/radiusKm — use one filtering mode at a time' },
  )
  .refine((data) => !(data.bbox && (data.lat !== undefined || data.lng !== undefined || data.radiusKm !== undefined)), {
    message: 'Cannot combine bbox with lat/lng/radiusKm — use one filtering mode at a time',
  })
  .refine(
    (data) => {
      const radiusFieldCount = [data.lat, data.lng, data.radiusKm].filter((v) => v !== undefined).length;
      return radiusFieldCount === 0 || radiusFieldCount === 3;
    },
    { message: 'lat, lng, and radiusKm must all be provided together, not partially' },
  );

export const updateEventStatusRequestSchema = z.object({
  status: eventStatusSchema,
});

export const getEventClustersRequestSchema = z.object({
  // Zoom range matches Leaflet/Mapbox convention (public-map uses Leaflet) — 1 (whole world)
  // to 22 (building-level). See docs/product/VISION.md's Clustering System for the
  // zoom->grid-size mapping this drives (apps/intelligence-engine/src/events/geo-query.ts's
  // gridSizeMeters()).
  zoom: z.coerce.number().int().min(1).max(22),
  bbox: bboxSchema.optional(),
});

// Identical shape to getEventClustersRequestSchema, kept as a separate named schema (not a
// re-export) because the two endpoints are conceptually distinct per VISION.md (Heatmap Layer
// vs. Clustering System) even though they share an implementation — see geo-query.ts's
// getHeatmapPoints(). A future divergence (e.g. heatmap wanting a different zoom range) won't
// require an API-shape migration if this is already its own schema.
export const getHeatmapRequestSchema = z.object({
  zoom: z.coerce.number().int().min(1).max(22),
  bbox: bboxSchema.optional(),
});

// docs/product/VISION.md's Playback Mode. `to` must be after `from`, and the window is capped
// at 30 days — playback reconstructing a year of city history in one request is not a
// supported use case and would be an easy full-table scan vector; see
// events/index.ts's listEventsInRange() for the additional PLAYBACK_MAX_EVENTS row cap.
const MAX_PLAYBACK_WINDOW_DAYS = 30;

export const getPlaybackRequestSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    bbox: bboxSchema.optional(),
  })
  .refine((data) => data.to > data.from, { message: '"to" must be after "from"', path: ['to'] })
  .refine((data) => data.to.getTime() - data.from.getTime() <= MAX_PLAYBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000, {
    message: `Playback window cannot exceed ${MAX_PLAYBACK_WINDOW_DAYS} days`,
    path: ['to'],
  });

export const getArrivalsRequestSchema = z.object({
  station: z.string().min(1),
  mode: transitModeSchema,
});

export const getFareEstimateRequestSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  mode: transitModeSchema,
});
