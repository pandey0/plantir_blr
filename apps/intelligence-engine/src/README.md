# intelligence-engine — internals

> **Ownership rule**: add/move/rename a file here → update this map in the same change. Add a new module folder → give it its own `README.md` and link it below.

Fastify 5 + TypeScript (ESM) backend. `app.ts` builds the configured Fastify instance (`buildApp()`); `index.ts` is the thin bootstrap that calls `.listen()` — kept separate so tests can `buildApp()` and use `.inject()` without binding a real port (see `../CLAUDE.md`'s Testing section). Dev server via `npm run dev:engine` (nodemon + `ts-node/esm`).

## Current file layout (CURRENT)

| File/module | Responsibility | Doc |
|---|---|---|
| `app.ts` | Plugin registration, all route handlers (HTTP glue only for `/report` and `/events/:id/status` — they call into `events`/`ingestion`; `GET /events` still queries Prisma directly, reads aren't required to go through `events/`) | [`intelligence-engine.md`](../../../docs/api/intelligence-engine.md) for the routes it exposes |
| `index.ts` | Bootstrap only — `buildApp()` + `.listen()`. Nothing else belongs here. | — |
| `db.ts` | Shared `PrismaClient` singleton — every module imports this, none instantiate their own | — |
| `ws/` | WebSocket connection hub + `broadcast()` | [`ws/README.md`](ws/README.md) |
| `events/` | `createEvent()`, `updateStatus()` — the only code that writes to the `Event` table | [`events/README.md`](events/README.md) |
| `ingestion/` | `Source` adapters, `ingestEvent()` — normalizes raw input before calling `events.createEvent()` | [`ingestion/README.md`](ingestion/README.md) |
| `transit.ts` | Transit-arrival and fare-estimate logic (fully mocked) | [`transit/README.md`](transit/README.md) |

`routes/` (below) is the one piece of the originally-planned split that hasn't landed — route *registration* is still inline in `index.ts`, only the logic inside each handler has been extracted.

## Still planned (PLANNED)

| Module | Responsibility | Doc |
|---|---|---|
| `routes/` | Fastify route *registration* only, manifest-driven (`routes/manifest.ts` already exists and documents the mapping — it just isn't consumed by `index.ts` yet) | [`routes/README.md`](routes/README.md) |

## Related docs

- [`../../../docs/architecture/OVERVIEW.md`](../../../docs/architecture/OVERVIEW.md) — where this app sits in the whole system
- [`../../../docs/architecture/DATA_FLOW.md`](../../../docs/architecture/DATA_FLOW.md) — how an event moves end to end
- [`../../../docs/api/intelligence-engine.md`](../../../docs/api/intelligence-engine.md) — full HTTP/WS route reference
