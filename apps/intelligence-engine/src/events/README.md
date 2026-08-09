# events — domain logic

> Status: **CURRENT** (extraction landed 2026-08-09). `createEvent()` and `updateStatus()` (this module's `index.ts`) are the only code that writes to the `Event` table — `app.ts`'s route handlers and `ingestion/`'s `ingestEvent()` both call in here, nothing else touches `prisma.event.*` for writes.
>
> **Ownership rule**: change event creation, status transitions, or the confidence-scoring formula → update this doc in the same change.

## Purpose

The one place that knows how to create an `Event`, transition its `status`, and (once built) score its `confidence_score`. Both HTTP routes (`app.ts`) and non-HTTP sources (`ingestion/`) call into this module — neither talks to Prisma directly for event writes. (Reads, e.g. `GET /events`, are not required to go through here — see `../README.md`.)

## Bug fixed (RESOLVED 2026-08-09, was KNOWN-WRONG)

`POST /report` used to destructure `latitude`/`longitude` from the request body and echo them into the WS broadcast payload without ever persisting them — and no migration had added a `geom` column at all, despite CLAUDE.md previously claiming otherwise. Both are fixed: migration `packages/database/prisma/migrations/20260809130000_add_event_geom/migration.sql` adds `geom geography(Point, 4326)` + a GIST index, and `createEvent()` (this module's `index.ts`) writes it via `prisma.$executeRaw` (tagged template, not `$executeRawUnsafe`) immediately after `prisma.event.create`. Verified against a live database and covered by `index.integration.test.ts` — see `docs/architecture/TESTING.md`.

**Verified against a live database 2026-08-09**: migration applied (required a `prisma migrate reset` — the `postgis/postgis` image auto-installs extensions our migration history didn't declare, which Prisma flagged as drift on an otherwise-empty dev DB), and an end-to-end smoke test confirmed `geom` is actually persisted (`ST_AsText` returned `POINT(77.6228 12.9172)` for a real `POST /report` call). Also fixed a real infra bug found in the process: `docker-compose.yml` mapped `5433:5433`, but Postgres listens on `5432` inside the container by default — nothing was actually listening on the container's `5433`. Now `5433:5432`.

## Confidence scoring (CURRENT, v2 landed 2026-08-10)

Multi-signal model per `docs/product/VISION.md`'s Event Confidence Engine — **reverses** the v1 flat additive formula (2026-08-09), an explicit user-confirmed decision, logged in `docs/architecture/TECH_STACK.md`. Weights below are documented defaults, not calibrated against real usage — calibration is explicitly deferred to beta (user's call), don't hand-tune further pre-beta.

- **Reporter signal**: `min(60, 20 + 15 * (uniqueReporters - 1))` for `uniqueReporters >= 1`, else `0`. Diminishing returns, not unbounded `+20` per reporter: 1 reporter → 20, 2 → 35, 3 → 50, 4+ → capped at 60. (`recalculateConfidence()`: `prisma.report.findMany({ distinct: ['user_id'] })`)
- **Evidence signal**: `min(30, 15 * evidenceCount)` — 1 item → 15, 2+ items → capped at 30. Not a flat "+30 if any evidence" like v1.
- **Authority confirmation**: `+25` once `status` leaves `REPORTED` (i.e. `VERIFIED`/`ESCALATED`/`IN_PROGRESS`/`RESOLVED`) — per VISION.md's "Authority acknowledgment greatly increases confidence." Not added for `FRAUD` (gets the penalty instead).
- **Fraud penalty**: `-50` if `status === 'FRAUD'`.
- Clamped to `[0, 100]`.
- **Spatial + temporal signals are NOT separate additive terms.** VISION.md lists these as their own confidence signals; here they're expressed as the *eligibility gate* for the reporter signal instead — a report only ever counts as an additional unique reporter if it passed duplicate/corroboration detection (below), which already requires being close in both space and time. Adding a second bonus for proximity on top of that would double-count the same underlying signal. See [`../../../../docs/architecture/IMPLEMENTATION_NOTES.md`](../../../../docs/architecture/IMPLEMENTATION_NOTES.md#confidence-scoring).

`createEvent()` accepts `input.reporterId`/`input.mediaUrls` (both optional — no real user accounts exist, `reporterId` is caller-supplied and unverified, see `docs/api/intelligence-engine.md`'s auth section), creates a linked `Report`/`Evidence` row when present (on whichever event — new or duplicate-matched, see below), then calls `recalculateConfidence()` to set the score. `updateStatus()` now calls `recalculateConfidence()` on **every** transition, not just FRAUD — v2's authority-confirmation bonus means every status change can move the score, unlike v1 where only FRAUD mattered.

`input.source.trustWeight` is still accepted but **not** factored into the formula — see [`../../../../docs/architecture/IMPLEMENTATION_NOTES.md`](../../../../docs/architecture/IMPLEMENTATION_NOTES.md#confidence-scoring) for why weighting by source trust is a natural future extension, not built now (it needs storing a weight per-`Report`, and has zero observable effect while `citizen-report` is the only `Source`).

## Duplicate / corroboration detection (CURRENT, landed 2026-08-10)

`createEvent()` no longer unconditionally creates a new `Event`. It first calls `geo-query.ts`'s `findDuplicateCandidateEventId()` (inside the same `$transaction`): a same-`category`, non-terminal (`REPORTED`/`VERIFIED`/`ESCALATED`/`IN_PROGRESS`) event within **150m** and **6 hours** (the oldest such match, if several) is treated as the same real-world issue — the new report attaches to it (`Report`/`Evidence` rows on the *existing* event) instead of creating a second `Event`. This is what makes the reporter signal's multi-reporter case reachable through the real API (previously only exercisable by inserting `Report` rows directly in a test).

- The 6-hour window is anchored to the matched event's `created_at`, not sliding on each new report — bounded corroboration window, not perpetually extended.
- `createEvent()` broadcasts `NEW_EVENT` only when it actually created a new `Event`; a merge broadcasts `EVENT_UPDATED` (`{ id, status, updated_at, confidence_score }`) instead — a corroborating report doesn't add a new map marker.
- **Known residual race** (documented, not fixed): two fully concurrent `createEvent()` calls for the same real-world issue can still both create separate Events under Postgres's default READ COMMITTED isolation. See [`../../../../docs/architecture/IMPLEMENTATION_NOTES.md`](../../../../docs/architecture/IMPLEMENTATION_NOTES.md#duplicate--corroboration-detection-createevent-landed-2026-08-10) for why and what closing it would cost.
- This is also this app's fraud-prevention "duplicate detection" mechanism per `docs/product/VISION.md`.

## Status transitions (CURRENT, landed 2026-08-09)

`updateStatus()` validates against `ALLOWED_TRANSITIONS`, a state machine derived from `docs/product/VISION.md`'s Event Lifecycle:

```
REPORTED   -> VERIFIED, ESCALATED, FRAUD
VERIFIED   -> ESCALATED, IN_PROGRESS, FRAUD
ESCALATED  -> IN_PROGRESS, FRAUD
IN_PROGRESS -> RESOLVED
RESOLVED   -> (terminal)
FRAUD      -> (terminal)
```

An illegal transition throws `InvalidStatusTransitionError`; a nonexistent event throws `EventNotFoundError`. `app.ts` maps these to 409 and 404 respectively. Reopening a terminal state isn't designed — don't add it speculatively.

**The write is compare-and-swap, not read-then-write** — `findUnique` (to validate) then `updateMany({ where: { id, status: current.status } })` (to write only if nothing raced us), not a plain `update`. See [`../../../../docs/architecture/IMPLEMENTATION_NOTES.md`](../../../../docs/architecture/IMPLEMENTATION_NOTES.md#concurrency) for why this matters and what a naive implementation would get wrong.

## Enum boundary

`createEvent()`/`updateStatus()` accept `@plantir/api-contracts`' generated `EventCategory`/`EventStatus` (not `@prisma/client`'s) — `prisma-enum.ts`'s `toPrismaCategory`/`toPrismaStatus` convert at the one point this module talks to Prisma. See [`../../../../docs/architecture/IMPLEMENTATION_NOTES.md`](../../../../docs/architecture/IMPLEMENTATION_NOTES.md#enum-boundary-prisma--api-contracts) — don't add another conversion site elsewhere.

## Current interface

```ts
async function createEvent(input: {
  category: EventCategory;   // from @plantir/api-contracts
  latitude: number;
  longitude: number;
  location?: string;
  reporterId?: string;                            // feeds confidence scoring's reporter count
  mediaUrls?: string[];                            // feeds confidence scoring's evidence bonus
  source: { id: string; trustWeight: number };    // accepted, not factored into the score — see Confidence scoring
}): Promise<Event>

async function updateStatus(eventId: string, status: EventStatus): Promise<Event>   // throws EventNotFoundError | InvalidStatusTransitionError

async function recalculateConfidence(eventId: string): Promise<number>   // also persists the score; called by both functions above

async function listEvents(input: {
  cursor?: string;
  limit: number;
  idFilter?: string[];   // pre-computed by geo-query.ts when a spatial filter is present
}): Promise<{ events: Event[]; nextCursor: string | null }>

async function listEventsInRange(input: {
  from: Date;
  to: Date;
  idFilter?: string[];   // bbox-derived, from geo-query.ts's findEventIdsInBbox — no radius/ward filter on playback today
}): Promise<Event[]>   // ascending created_at order, capped at 1000 rows — backs GET /v1/events/playback
```

Both `createEvent()` and `updateStatus()` call `ws.broadcast()` after their write commits — `createEvent()` with `{ type: 'NEW_EVENT', ... }`, `updateStatus()` with `{ type: 'EVENT_UPDATED', payload: { id, status, updated_at } }` (added 2026-08-09 — previously deferred for `public-map` compatibility; confirmed safe since `public-map`'s WS handler is a plain `if (data.type === 'NEW_EVENT')` that ignores anything else. `public-map` rendering `EVENT_UPDATED` on the map is still its own future change.)

## Spatial reads (`geo-query.ts`, CURRENT)

`findEventIdsInBbox()`/`findEventIdsInRadius()`/`findEventIdsInWard()` — read-side, isolated into their own file because the raw-SQL spatial predicates deserve testability separate from the plain-Prisma pagination query. `listEvents()` (below) is the actual query `app.ts`'s `ListEvents` handler calls; these three supply its optional `idFilter`. Used for `GET /v1/events`'s `bbox=`/`lat=&lng=&radiusKm=`/`wardId=` filters — see [`../../../../docs/api/intelligence-engine.md`](../../../../docs/api/intelligence-engine.md). `findEventIdsInWard()` resolves the ward's polygon from `../wards/` (static GeoJSON, no DB table) and passes it into `ST_GeomFromGeoJSON` — see [`../wards/README.md`](../wards/README.md).

`findDuplicateCandidateEventId(db, category, lat, lng)` (landed 2026-08-10) — the write-side spatial query, used only by `createEvent()`'s duplicate/corroboration detection (above). Takes a `Db` client param (not the module-level `prisma`) so it can run inside `createEvent()`'s transaction and see uncommitted writes from that same transaction.

`getHeatmapPoints(zoom, bbox?)` (landed 2026-08-10) — thin wrapper around `findEventClusters()` (below), remapping `{latitude, longitude, count}` to `{latitude, longitude, weight}`. Backs `GET /v1/events/heatmap`. Deliberately not a separate aggregation query — see its doc comment in `geo-query.ts`.

## Reads (`listEvents()`, CURRENT — moved here 2026-08-09)

**Reversed an earlier stance**: this module's docs previously said "reads don't need to go through `events/`," and `app.ts`'s `ListEvents` handler queried `prisma.event.findMany()` directly. `docs/standards/backend-engineering-standards.md` (adopted 2026-08-09) requires controllers never contain direct DB queries — that rule wins. `listEvents({ cursor, limit, idFilter })` now owns the pagination query; `app.ts` only resolves the spatial filter (via `geo-query.ts`) and calls this. See [`../../../../docs/architecture/STANDARDS_COMPLIANCE.md`](../../../../docs/architecture/STANDARDS_COMPLIANCE.md).

Same file also has `findEventClusters()`/`gridSizeMeters()` — `docs/product/VISION.md`'s Clustering System, backing `GET /v1/events/clusters`. `gridSizeMeters()` is a step function over VISION.md's 4 documented zoom/grid-size reference points (not an interpolation — the doc gives points, not a formula), returning `null` at zoom ≥17 for "individual markers, no clustering." Degree-per-meter conversion uses a fixed Bangalore reference latitude (~13°N) rather than recalculating per-bbox — a documented approximation appropriate for a single-city app, see [`../../../../docs/architecture/IMPLEMENTATION_NOTES.md`](../../../../docs/architecture/IMPLEMENTATION_NOTES.md).

## Read cache (`list-cache.ts`, CURRENT)

`getOrFetch()`/`cacheKey()`/`invalidate()` — request-coalescing + short-TTL (3s) cache in front of `ListEvents`' full query (spatial lookup + Prisma pagination together, one cache entry per distinct param combination). `createEvent()` and `updateStatus()` both call `invalidate()` (clears the whole cache) after their writes commit — **not** a TTL-only design, because this app has live WS push for real-time updates and a citizen/authority re-querying right after their own write must see it, not a stale cached response. See [`../../../../docs/architecture/IMPLEMENTATION_NOTES.md`](../../../../docs/architecture/IMPLEMENTATION_NOTES.md) and [`../../../../docs/architecture/REFERENCES.md`](../../../../docs/architecture/REFERENCES.md) (adapted from worldmonitor's `cachedFetchJson()` pattern).

## Consumers

`app.ts`: `POST /v1/events` via `ingestion/`; `PATCH /v1/events/:id/status` calls `updateStatus()` directly; `POST /dev/inject` calls `createEvent()` directly (skips the `Source` abstraction, see [`../ingestion/README.md`](../ingestion/README.md), but NOT duplicate detection — that lives inside `createEvent()` itself, so randomly-generated injected events can still merge into an existing one if they happen to land within 150m/6h of a same-category event, rare but not impossible given the random coordinates); `GET /v1/events` calls `listEvents()` (plus `geo-query.ts`'s functions when a spatial filter is present); `GET /v1/events/clusters` calls `geo-query.ts`'s `findEventClusters()` directly; `GET /v1/events/heatmap` calls `getHeatmapPoints()`; `GET /v1/events/playback` calls `listEventsInRange()`. No route in `app.ts` calls Prisma directly.
