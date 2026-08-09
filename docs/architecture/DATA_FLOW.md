# Data Flow

> **Ownership rule**: change how an event enters the system, add a source, or change the confidence-scoring formula → update this doc in the same PR. See [`../README.md`](../README.md) for status-label meaning.

## Current flow (CURRENT — landed 2026-08-09)

```
citizen (curl / future citizen-app, needs a JWT — POST /dev/token in non-prod)
        │  POST /report  { latitude, longitude, category, location }  Authorization: Bearer <token>
        ▼
app.ts POST /report handler  (requireRole('citizen','authority'))
        │  ingestEvent(citizenReportSource, request.body)
        ▼
   ┌────────────────────────────────┐
   │  ingestion/  (Source adapters)  │  citizenReportSource.normalize(): Zod-validates raw body
   │  see ingestion/README.md        │  → EventInput, throws ZodError on bad input (caught → 400)
   └────────────────┬────────────────┘
                     ▼
   ┌────────────────────────────────┐
   │  events/  (domain logic)        │  createEvent(): prisma.event.create(...) + $executeRaw geom
   │  see events/README.md           │  write. Confidence scoring still PLANNED (hardcoded 10).
   └────────────────┬────────────────┘
                     ▼
PostgreSQL (Event table, geom persisted — migration must be applied, see OVERVIEW.md)
                     │
                     ▼
   ┌────────────────────────────────┐
   │  ws/  broadcast()                │  { type: 'NEW_EVENT', payload: {...} } — in-process Set
   │  see ws/README.md                │
   └────────────────┬────────────────┘
                     ▼
public-map (WS /ws client) → pulse on the map
```

`PATCH /events/:id/status` calls `events.updateStatus()` directly (no `ingestion/` involved — it's not a new-event source, it's a mutation on an existing one) and **does not broadcast** yet — see `events/README.md` for why that's a deliberate, documented gap rather than an oversight. `POST /dev/inject` calls `events.createEvent()` directly, bypassing `ingestion/` (see `ingestion/README.md`).

`GET /events` is cursor-paginated, queries Prisma directly (reads don't need to go through `events/`); still no bbox filtering, no caching. Auth (JWT + role) required on both mutating routes — see [`../api/intelligence-engine.md`](../api/intelligence-engine.md).

Every *new-event* source funnels through the same `events.createEvent()` core via an `ingestion/` adapter — adding `authority-bulk` or a future sensor feed means writing a new `Source` (see [`../../apps/intelligence-engine/src/ingestion/README.md`](../../apps/intelligence-engine/src/ingestion/README.md)), not touching `events/`. Only `citizen-report` exists today; `citizen-app`/`authority-portal` themselves are still unbuilt (see `OVERVIEW.md`) — this flow is exercised via `curl` + `POST /dev/token` until they exist.

## Design decisions and why (so they aren't re-litigated per PR)

| Decision | Why | Source |
|---|---|---|
| No Redis pub/sub for WS fan-out until >1 engine instance is actually running | A much larger reference system (worldmonitor.app) deliberately didn't build pub/sub either — it isolated its one stateful long-running process and let most consumers poll a cache instead. Building fan-out infra before there's a second instance is speculative complexity with no current payoff. | See `ws/README.md` for the concrete upgrade path when the trigger condition is met. |
| Source adapters normalize to one `EventInput`, core `events/` never branches on origin | Otherwise every new source (authority bulk upload, a future sensor feed) re-solves validation/trust-scoring from scratch instead of reusing the core. | `ingestion/README.md` |
| Confidence score takes a per-source `trustWeight`, not a hardcoded constant | Citizen reports and authority-verified reports shouldn't count equally toward confidence — this was implicit in CLAUDE.md's original formula (+20/unique reporter) but had no source-awareness. | `events/README.md` |
| No generic "external source plugin registry" | Two or three concrete `Source` implementations as plain modules is enough until a real third-party integration exists. Building a dynamic loader for sources that don't exist yet is the overengineering trap. | `ingestion/README.md` |

## What this doc does not cover

Request/response shapes and auth per route → [`../api/intelligence-engine.md`](../api/intelligence-engine.md). Internal module boundaries and file layout → [`../../apps/intelligence-engine/src/README.md`](../../apps/intelligence-engine/src/README.md).
