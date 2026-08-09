# ingestion — source adapters

> Status: **CURRENT** (`citizen-report` source + `ingestEvent()` landed 2026-08-09, built against this doc's spec — written before the code, per project convention, see [`../../../../docs/README.md`](../../../../docs/README.md)).
>
> **Ownership rule**: add/change a source adapter, or change the `Source`/`EventInput` shape → update this doc in the same change.

## Purpose

Today "how an event enters the system" means exactly one thing: a citizen hits `POST /report` directly. That's fine for a demo, wrong as a long-term shape — the platform will eventually take events from multiple kinds of origin (citizen reports today; authority bulk-upload, third-party civic APIs like BBMP/Swachify, and IoT/sensor feeds later). If each of those is wired straight into `events/` with its own bespoke logic, every new source means re-solving validation, dedup, and trust scoring from scratch.

This module exists so **adding a source is "write an adapter," never "touch the core."**

## Design

```
   citizen-app          authority-portal        (future) sensor feed / third-party API
        │                       │                              │
        ▼                       ▼                              ▼
 CitizenReportSource     AuthorityBulkSource            SensorFeedSource
        │                       │                              │
        └───────────────────────┴──────────────────────────────┘
                                 │  all normalize to EventInput
                                 ▼
                          ingestEvent(input)
                                 │
                                 ▼
                      events/.createEvent()  ──►  Prisma write + geom
                                 │
                                 ▼
                          ws/.broadcast()
```

Every adapter implements the same interface and is responsible only for translating its own input shape into a normalized `EventInput`. The core (`events/createEvent`) never branches on where data came from — it only sees `EventInput` plus a `trustWeight` supplied by the adapter.

## Current interface

```ts
interface EventInput {
  category: EventCategory;
  latitude: number;
  longitude: number;
  location?: string;
  reporterId?: string;      // declared for confidence scoring's "unique reporter" count — no
                             // current Source populates it yet, citizen-report's Zod schema
                             // doesn't capture a reporter identity from the request body today
  mediaUrls?: string[];     // same — declared, not populated by any Source yet
}

interface Source {
  id: string;                 // e.g. 'citizen-report', 'authority-bulk', 'bbmp-api'
  trustWeight: number;        // input to confidence scoring — see events/README.md (accepted, not yet used)
  normalize(raw: unknown): EventInput;   // validates + shapes raw input; throws (ZodError) on bad input
}

async function ingestEvent(source: Source, raw: unknown): Promise<Event>
// = events.createEvent({ ...source.normalize(raw), source: { id: source.id, trustWeight: source.trustWeight } })
```

## Sources

| Source | Status | Notes |
|---|---|---|
| `citizen-report` | **CURRENT** — `index.ts`'s `POST /report` calls `ingestEvent(citizenReportSource, request.body)` | `trustWeight: 1`. Zod schema validates `latitude`/`longitude`/`category`/`location`, matching the original inline validation exactly. |
| `authority-bulk` | PLANNED, not scheduled | Higher `trustWeight` — authenticated authority-portal users. Needed once authority-portal is built. |
| third-party / sensor feeds | NOT DESIGNED | Explicitly out of scope until a concrete source is chosen — do not build a generic "external API poller" abstraction speculatively. Add a new adapter only when an actual source is identified. |

`POST /dev/inject` deliberately bypasses this module entirely and calls `events.createEvent()` directly with `source: { id: 'dev-inject', trustWeight: 0 }` — it already generates normalized, valid random data, there's no raw input to shape, so a `Source` adapter would be pure ceremony.

## Why this exists now, before citizen-app/authority-portal are built

We're deliberately building only `intelligence-engine` right now (see [`../../../../docs/architecture/OVERVIEW.md`](../../../../docs/architecture/OVERVIEW.md)), but `POST /report`'s replacement should be written as the `citizen-report` adapter from the start rather than as one-off inline logic — otherwise the eventual `authority-bulk` adapter means refactoring `events/` under it instead of just adding a file next to it.

## Explicitly not doing (avoid overengineering)

No generic plugin registry, no dynamic adapter loading, no config-driven source definitions. Two or three `Source` implementations as plain TS modules, registered by hand in `routes/`, is the right amount of abstraction until there's a real third-party source to integrate.
