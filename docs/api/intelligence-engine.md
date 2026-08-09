# API Reference — intelligence-engine

> **Ownership rule**: add/change/remove a route in `apps/intelligence-engine/src/routes/manifest.ts` (registration) or `app.ts` (handler logic) → update this doc in the same change.
>
> **Status**: hand-maintained (CURRENT), and deliberately staying that way — `npm run docs:api:check` (`apps/intelligence-engine/scripts/check-api-docs.ts`, wired into pre-commit) verifies every route in `routes/manifest.ts` has a heading here, but does not generate or overwrite this file's content. See [`../architecture/TECH_STACK.md`](../architecture/TECH_STACK.md) decision log for why the original full-regeneration plan was dropped.

Base URL: `http://localhost:3001`. **All routes moved to `/v1/` 2026-08-09** (except `/health` and `/dev/*` — see "Versioning" below) — **no backward-compat aliases for the old unversioned paths (`/report`, `/events`, etc.) exist**. This was a deliberate choice, not an oversight: see [`../architecture/IMPLEMENTATION_NOTES.md`](../architecture/IMPLEMENTATION_NOTES.md#versioning). `public-map` still calls the old paths and will 404 until it's updated on its own turn.

## Versioning

`/v1/` covers the real API contract (events, transit). `GET /health` and `/dev/*` are deliberately outside it — infra/tooling, not contract.

## Auth

JWT bearer tokens (`@fastify/jwt`), role claim `'citizen' | 'authority'`. `Authorization: Bearer <token>` header. No user accounts exist yet — in non-production environments, `POST /dev/token` mints a token for either role for local testing. **There is no production-safe way to issue a token today** — a real login/identity flow for citizen-app and authority-portal is still unbuilt; `/dev/token` is explicitly not it (see "Not yet built" below).

`JWT_SECRET` env var: required in production (server refuses to start without it); falls back to a logged insecure default in dev.

## Error responses

Every error response has the shape `{ error: { code: string, message: string, details?: unknown } }` (`docs/standards/backend-engineering-standards.md` Section 13) — never a bare string, never a raw internal error leaked to the client. `details` appears only on 400s (validation failures) and is the Zod `flatten()` output.

| Status | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body/query/params failed Zod validation |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Valid JWT, wrong role |
| 404 | `EVENT_NOT_FOUND` | `PATCH /v1/events/:id/status` on a nonexistent event |
| 409 | `INVALID_STATUS_TRANSITION` | Illegal status transition, or lost a concurrent-update race (indistinguishable to the caller, see [`../architecture/IMPLEMENTATION_NOTES.md`](../architecture/IMPLEMENTATION_NOTES.md#concurrency)) |
| 422 | `IDEMPOTENCY_KEY_CONFLICT` | `POST /v1/events` reused an `Idempotency-Key` with a different request body |
| 429 | (from `@fastify/rate-limit`) | `POST /v1/events` rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Anything unexpected — logged in full server-side, generic message to the client |

## Routes

### `GET /health`
`{ status: 'ok' }`. No auth, no DB check — just confirms the process is up. Not under `/v1`.

### `GET /ws`
WebSocket upgrade, not under `/v1`. Server pushes two message types to every connected client, no auth:
- `{ type: 'NEW_EVENT', payload: {...} }` — on `POST /v1/events` when it creates a genuinely new `Event` (or, non-production, `POST /dev/inject`).
- `{ type: 'EVENT_UPDATED', payload: { id, status, updated_at, confidence_score } }` — on `PATCH /v1/events/:id/status`, and now also on `POST /v1/events` when the report merges into an existing event via duplicate/corroboration detection instead of creating a new one (landed 2026-08-10, see `events/README.md`).

No client→server messages are consumed. See [`../../apps/intelligence-engine/src/ws/README.md`](../../apps/intelligence-engine/src/ws/README.md).

### `GET /v1/events?cursor=&limit=&bbox=|lat=&lng=&radiusKm=|wardId=`
Public, no auth. Returns events where `status != 'FRAUD'`, ordered `created_at desc, id desc`. Cursor-paginated: `limit` (1–100, default 50), `cursor` (an event `id`, optional). Response: `{ events: Event[], nextCursor: string | null }`, where each event includes `latitude`/`longitude` (landed 2026-08-10 — `attachCoordinates()`, see [`../architecture/IMPLEMENTATION_NOTES.md`](../architecture/IMPLEMENTATION_NOTES.md); previously the response had no coordinates at all despite `geom` being persisted). `nextCursor` is `null` on the last page.

Three mutually exclusive spatial filters (400 if more than one given):
- `bbox=minLng,minLat,maxLng,maxLat` — viewport filtering, `ST_Within` against a `ST_MakeEnvelope`.
- `lat=&lng=&radiusKm=` (all three required together) — proximity search, `ST_DWithin` (geography-aware, meters). `radiusKm` capped at 50 — this is a single-city app, anything near or beyond Bangalore's own extent is almost certainly a caller mistake.
- `wardId=` (landed 2026-08-10) — BBMP ward filtering, `ST_Within` against the ward's polygon (loaded from static GeoJSON, not a DB table — see `wards/README.md`). An unknown/undigitized ward id returns an empty list, not an error (225 of Bangalore's 243 wards have digitized boundaries).

Implementation: a two-step query (raw-SQL spatial predicate → ID list → normal Prisma pagination filtered by that list), not one combined query — see `events/geo-query.ts` and [`../architecture/IMPLEMENTATION_NOTES.md`](../architecture/IMPLEMENTATION_NOTES.md) for why, and the known limitation (re-runs the spatial query on every page).

Fronted by a request-coalescing + short-TTL cache (`events/list-cache.ts`) keyed on the full validated param set — concurrent identical requests (e.g. several map tiles requesting the same bbox) share one query. Invalidated entirely on every event write, not TTL-only, so this never serves a stale response to a caller re-querying right after their own write.

### `GET /v1/events/clusters?zoom=&bbox=`
Public, no auth. `zoom` required (1–22, Leaflet/Mapbox convention), `bbox` optional (same format as `GET /v1/events`'s). Per [`docs/product/VISION.md`](../product/VISION.md)'s Clustering System: groups events into a grid (`ST_SnapToGrid`) whose cell size is a step function of zoom (5→1km, 10→300m, 14→80m, ≥17→no clustering/individual markers — exactly VISION.md's 4 reference points, see `events/geo-query.ts`'s `gridSizeMeters()`). Response: `{ clusters: [{ latitude, longitude, count, eventId?, category? }] }` — `eventId`/`category` present only when `count === 1` (a multi-event cluster has no single event to point at).

Grid-size-to-degrees conversion uses a fixed Bangalore reference latitude, not a geodetically exact per-bbox calculation — documented approximation, see [`../architecture/IMPLEMENTATION_NOTES.md`](../architecture/IMPLEMENTATION_NOTES.md). Shares `list-cache.ts`'s cache/invalidation with `GET /v1/events` (a new event changes cluster counts too).

### `GET /v1/events/heatmap?zoom=&bbox=` (landed 2026-08-10)
Public, no auth. Same params as `GET /v1/events/clusters` (identical schema, kept separate per [`docs/product/VISION.md`](../product/VISION.md)'s distinct Heatmap Layer section). Response: `{ points: [{ latitude, longitude, weight }] }`. Deliberately reuses cluster grid aggregation internally — `weight` is the same as a cluster's `count` — see `events/geo-query.ts`'s `getHeatmapPoints()`. `public-map` actually rendering a heat layer from this is a separate, unbuilt frontend change.

### `GET /v1/events/playback?from=&to=&bbox=` (landed 2026-08-10)
Public, no auth. Per [`docs/product/VISION.md`](../product/VISION.md)'s Playback Mode. `from`/`to` are ISO 8601 datetimes, `to` must be after `from`, window capped at 30 days. `bbox` optional, same format as elsewhere. Response: `{ events: Event[] }` (each including `latitude`/`longitude`, same as `GET /v1/events` — see above), ordered `created_at asc` (oldest first, for chronological timeline animation) — no cursor, capped at 1000 rows (`PLAYBACK_MAX_EVENTS`). Not behind the request-coalescing cache — playback queries are ad hoc/wide rather than the small set of repeated viewport queries the cache is tuned for.

### `PATCH /v1/events/:id/status`
**Auth: `authority` role required.** Body: `{ status: EventStatus }`. `id` must be a UUID, `status` one of `REPORTED | VERIFIED | ESCALATED | IN_PROGRESS | RESOLVED | FRAUD` — both Zod-validated, 400 on failure.

**Status transitions are now validated against a state machine** (`events.ALLOWED_TRANSITIONS`, see `events/README.md`) — an illegal transition (e.g. `REPORTED → RESOLVED` directly) returns **409 Conflict**, not a silent accept. A nonexistent event ID returns **404**. `RESOLVED` and `FRAUD` are terminal — no further transitions out of them are accepted (this is a deliberate current limitation, not designed for reopening yet).

The write is compare-and-swap (protects against two concurrent updates racing) — see [`../architecture/IMPLEMENTATION_NOTES.md`](../architecture/IMPLEMENTATION_NOTES.md#concurrency).

### `POST /v1/events`
**Auth: `citizen` or `authority` role required. Rate-limited: 10/minute per client IP.** Body (Zod-validated, `@plantir/api-contracts`' `createEventRequestSchema`): `{ latitude: number [-90,90], longitude: number [-180,180], category: EventCategory, location?: string, reporterId?: string, mediaUrls?: string[] (max 10, each a valid URL) }`. `reporterId` is caller-supplied and unverified — no real user accounts exist (see Auth section above). **Coordinates outside a generous Bangalore-metro bounding box are rejected with 400** (landed 2026-08-10, GPS-validation fraud-prevention measure — see [`../architecture/IMPLEMENTATION_NOTES.md`](../architecture/IMPLEMENTATION_NOTES.md)).

**Optional `Idempotency-Key` header (landed 2026-08-10, 1–200 chars)**: a repeated call with the same key and the same body replays the original response instead of processing again; the same key with a *different* body returns **422 `IDEMPOTENCY_KEY_CONFLICT`**. In-memory, 24h TTL — see [`../architecture/IMPLEMENTATION_NOTES.md`](../architecture/IMPLEMENTATION_NOTES.md#idempotency-key-post-v1events-landed-2026-08-10).

**Duplicate/corroboration detection (landed 2026-08-10)**: if a same-category, non-terminal event already exists within 150m and 6 hours, the report attaches to that event (new `Report`/`Evidence` rows) instead of creating a new `Event` — response is still `{ success: true, event_id }`, but `event_id` may equal a previous call's. Otherwise, creates an `Event` and **persists coordinates to the `geom` column** via `events.createEvent()`. Either way, `Report`/`Evidence` rows are linked as applicable and `confidence_score` is recomputed (multi-signal v2 formula — see [`../../apps/intelligence-engine/src/events/README.md`](../../apps/intelligence-engine/src/events/README.md) for exact weights; **a bare report with neither `reporterId` nor `mediaUrls` scores 0**). Broadcasts `NEW_EVENT` on a genuine create, `EVENT_UPDATED` on a merge. Verified end-to-end against a live database, including the rate limit (see [`../architecture/IMPLEMENTATION_NOTES.md`](../architecture/IMPLEMENTATION_NOTES.md#rate-limiting) for a real Fastify ordering pitfall hit while building this).

### `POST /dev/token` — non-production only, route doesn't exist when `NODE_ENV=production`
Not under `/v1`. Body: `{ role: 'citizen' | 'authority' }`. Returns `{ token }`, a JWT signed for that role, 2h expiry. Development convenience for exercising auth-gated routes before a real login flow exists — **not a login endpoint**.

### `POST /dev/inject` — non-production only, route doesn't exist when `NODE_ENV=production`
Not under `/v1`. No body, no auth. Generates a random category/location/coordinates within Bangalore's bounding box, creates an event with persisted `geom`, broadcasts it.

### `GET /v1/transit/arrivals?station=&mode=METRO|BUS`
Public, no auth. Now Zod-validated (`getArrivalsRequestSchema`, was manual `if` checks before 2026-08-09). Returns `ArrivalData[]`. **Fully mocked** — random ETAs, not a real transit feed. See [`../../apps/intelligence-engine/src/transit/README.md`](../../apps/intelligence-engine/src/transit/README.md).

### `GET /v1/transit/estimate?from=&to=&mode=METRO|BUS`
Public, no auth. Now Zod-validated. Returns `{ fare: number, time: string }`. `fare` is random; `time` is a hardcoded string (`'28 mins'`) regardless of input. Mocked, same caveat as above.

## CORS

Explicit origin allowlist via `CORS_ORIGINS` env var, comma-separated. Defaults to `http://localhost:3000,http://localhost:3002,http://localhost:3003` (public-map, citizen-app, authority-portal dev ports).

## Not yet built (tracked, not implemented)

- Real login/identity — `/dev/token` is a placeholder, not a login flow. "Major" per [`../architecture/TECH_STACK.md`](../architecture/TECH_STACK.md)'s criteria — needs confirmation before starting.
- Reopening a `RESOLVED`/`FRAUD` event — not designed.
- Camera-only uploads, user reputation scoring, AI media verification (`docs/product/VISION.md`'s Fraud Prevention section) — each needs a real product decision (upload pipeline, account system, AI vendor) not yet made.
