# Data Flow

> **Ownership rule**: change how an event enters the system, add a source, or change the confidence-scoring formula → update this doc in the same PR. See [`../README.md`](../README.md) for status-label meaning.

## Current flow (CURRENT — landed 2026-08-09)

```
citizen (curl / future citizen-app, needs a JWT — POST /dev/token in non-prod)
        │  POST /v1/events  { latitude, longitude, category, location }  Authorization: Bearer <token>
        ▼
app.ts CreateEvent handler  (requireRole(['citizen','authority']))
        │  ingestEvent(citizenReportSource, request.body)
        ▼
   ┌────────────────────────────────┐
   │  ingestion/  (Source adapters)  │  citizenReportSource.normalize(): Zod-validates raw body
   │  see ingestion/README.md        │  → EventInput, throws ZodError on bad input (caught → 400)
   └────────────────┬────────────────┘
                     ▼
   ┌──────────────────────────────────────┐
   │  events/  (domain logic)              │  createEvent(): duplicate/corroboration check first
   │  see events/README.md                 │  (150m/6h/same-category) — attaches to an existing
   │                                        │  event if matched, else prisma.event.create(...) +
   │                                        │  $executeRaw geom write. Either way, recalculateConfidence()
   │                                        │  runs (multi-signal v2 — reporter/evidence/authority
   │                                        │  signals, spatial+temporal expressed via the
   │                                        │  duplicate-check eligibility gate, not separate terms).
   └────────────────┬───────────────────────┘
                     ▼
PostgreSQL (Event table, geom persisted — migration must be applied, see OVERVIEW.md)
                     │
                     ▼
   ┌────────────────────────────────────────┐
   │  ws/  broadcast()                        │  { type: 'NEW_EVENT', ... } on a genuine create,
   │  see ws/README.md                        │  { type: 'EVENT_UPDATED', ... } on a duplicate-
   │                                           │  detection merge — in-process Set
   └────────────────┬──────────────────────────┘
                     ▼
public-map (WS /ws client) → pulse on the map
```

`PATCH /v1/events/:id/status` calls `events.updateStatus()` directly (no `ingestion/` involved — it's not a new-event source, it's a mutation on an existing one), validates the transition against a state machine (409 on illegal, 404 on missing), writes compare-and-swap, and **does** broadcast — `{ type: 'EVENT_UPDATED', ... }` — since 2026-08-09. `POST /dev/inject` calls `events.createEvent()` directly, bypassing `ingestion/` (see `ingestion/README.md`).

`GET /v1/events` is cursor-paginated via `events.listEvents()` (moved out of `app.ts` 2026-08-09 to comply with `docs/standards/backend-engineering-standards.md` — controllers must not query Prisma directly), supports bbox/radius filtering (`events/geo-query.ts`), and is fronted by a request-coalescing cache (`events/list-cache.ts`) that's invalidated entirely on every event write, not TTL-only. Auth (JWT + role) required on both mutating routes — see [`../api/intelligence-engine.md`](../api/intelligence-engine.md). All routes moved to `/v1/` 2026-08-09, no backward-compat aliases — see [`IMPLEMENTATION_NOTES.md`](IMPLEMENTATION_NOTES.md#versioning).

Every *new-event* source funnels through the same `events.createEvent()` core via an `ingestion/` adapter — adding `authority-bulk` or a future sensor feed means writing a new `Source` (see [`../../apps/intelligence-engine/src/ingestion/README.md`](../../apps/intelligence-engine/src/ingestion/README.md)), not touching `events/`. Only `citizen-report` exists today; `citizen-app`/`authority-portal` themselves are still unbuilt (see `OVERVIEW.md`) — this flow is exercised via `curl` + `POST /dev/token` until they exist.

## Design decisions and why (so they aren't re-litigated per PR)

| Decision | Why | Source |
|---|---|---|
| No Redis pub/sub for WS fan-out until >1 engine instance is actually running | A much larger reference system (worldmonitor.app) deliberately didn't build pub/sub either — it isolated its one stateful long-running process and let most consumers poll a cache instead. Building fan-out infra before there's a second instance is speculative complexity with no current payoff. | See `ws/README.md` for the concrete upgrade path when the trigger condition is met. |
| Source adapters normalize to one `EventInput`, core `events/` never branches on origin | Otherwise every new source (authority bulk upload, a future sensor feed) re-solves validation/trust-scoring from scratch instead of reusing the core. | `ingestion/README.md` |
| `Source.trustWeight` is accepted on every `EventInput` but not yet factored into the confidence formula | Citizen reports and authority-verified reports arguably shouldn't count equally toward confidence, but weighting by source needs a per-`Report` weight (schema change) and has zero observable effect while `citizen-report` is the only `Source` — natural extension once a second weighted source exists, not built speculatively. **Corrects a previously-stale claim here** that this was already wired in; it wasn't, and still isn't. | `events/README.md` |
| No generic "external source plugin registry" | Two or three concrete `Source` implementations as plain modules is enough until a real third-party integration exists. Building a dynamic loader for sources that don't exist yet is the overengineering trap. | `ingestion/README.md` |

## What this doc does not cover

Request/response shapes and auth per route → [`../api/intelligence-engine.md`](../api/intelligence-engine.md). Internal module boundaries and file layout → [`../../apps/intelligence-engine/src/README.md`](../../apps/intelligence-engine/src/README.md).
