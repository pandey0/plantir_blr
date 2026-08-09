# events — domain logic

> Status: **CURRENT** (extraction landed 2026-08-09). `createEvent()` and `updateStatus()` (this module's `index.ts`) are the only code that writes to the `Event` table — `app.ts`'s route handlers and `ingestion/`'s `ingestEvent()` both call in here, nothing else touches `prisma.event.*` for writes.
>
> **Ownership rule**: change event creation, status transitions, or the confidence-scoring formula → update this doc in the same change.

## Purpose

The one place that knows how to create an `Event`, transition its `status`, and (once built) score its `confidence_score`. Both HTTP routes (`app.ts`) and non-HTTP sources (`ingestion/`) call into this module — neither talks to Prisma directly for event writes. (Reads, e.g. `GET /events`, are not required to go through here — see `../README.md`.)

## Bug fixed (RESOLVED 2026-08-09, was KNOWN-WRONG)

`POST /report` used to destructure `latitude`/`longitude` from the request body and echo them into the WS broadcast payload without ever persisting them — and no migration had added a `geom` column at all, despite CLAUDE.md previously claiming otherwise. Both are fixed: migration `packages/database/prisma/migrations/20260809130000_add_event_geom/migration.sql` adds `geom geography(Point, 4326)` + a GIST index, and `createEvent()` (this module's `index.ts`) writes it via `prisma.$executeRaw` (tagged template, not `$executeRawUnsafe`) immediately after `prisma.event.create`. Verified against a live database and covered by `index.integration.test.ts` — see `docs/architecture/TESTING.md`.

**Verified against a live database 2026-08-09**: migration applied (required a `prisma migrate reset` — the `postgis/postgis` image auto-installs extensions our migration history didn't declare, which Prisma flagged as drift on an otherwise-empty dev DB), and an end-to-end smoke test confirmed `geom` is actually persisted (`ST_AsText` returned `POINT(77.6228 12.9172)` for a real `POST /report` call). Also fixed a real infra bug found in the process: `docker-compose.yml` mapped `5433:5433`, but Postgres listens on `5432` inside the container by default — nothing was actually listening on the container's `5433`. Now `5433:5432`.

## Confidence scoring (PLANNED — designed in CLAUDE.md and `docs/product/VISION.md`, not implemented)

Formula, to live in this module as a pure function taking a source's `trustWeight` (see [`../ingestion/README.md`](../ingestion/README.md)) as an input, not a hardcoded constant:

- **+20** per unique reporter on the same event (dedup by `Report.user_id`)
- **+30** if `Evidence` (media) is attached
- **−50** if flagged as fraud (by AI or authority review)

`createEvent()` accepts `input.source.trustWeight` today but doesn't use it yet — every score is hardcoded to `10`. Note the `docs/product/VISION.md` divergence flagged at the top of that doc (0–100 bucketed vs. this additive formula) — resolve that before implementing, don't just pick one silently.

## Current interface

```ts
async function createEvent(input: {
  category: EventCategory;
  latitude: number;
  longitude: number;
  location?: string;
  source: { id: string; trustWeight: number };   // accepted, not yet used — see above
}): Promise<Event>

async function updateStatus(eventId: string, status: EventStatus): Promise<Event>
```

`recalculateConfidence(eventId): Promise<number>` — still **PLANNED**, not implemented; lands with confidence scoring.

`createEvent()` calls `ws.broadcast()` after the write commits. `updateStatus()` deliberately does **not** broadcast yet — a status-change WS message is a new payload shape `public-map` doesn't handle today, and this restructure is intentionally scoped to `intelligence-engine` only (see `docs/architecture/OVERVIEW.md`). Real gap per `docs/product/VISION.md`'s Real-Time Update System section, tracked, not missed — needs a coordinated `public-map` change to land safely.

## Consumers

`app.ts` (`POST /report` via `ingestion/`, `PATCH /events/:id/status` calls `updateStatus()` directly, `POST /dev/inject` calls `createEvent()` directly — see [`../ingestion/README.md`](../ingestion/README.md) for why `/dev/inject` skips the `Source` abstraction).
