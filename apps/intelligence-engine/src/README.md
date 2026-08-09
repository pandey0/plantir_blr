# intelligence-engine — internals

> **Ownership rule**: add/move/rename a file here → update this map in the same change. Add a new module folder → give it its own `README.md` and link it below.

Fastify 5 + TypeScript (ESM) backend. `app.ts` builds the configured Fastify instance (`buildApp()`); `index.ts` is the thin bootstrap that calls `.listen()` — kept separate so tests can `buildApp()` and use `.inject()` without binding a real port (see `../CLAUDE.md`'s Testing section). Dev server via `npm run dev:engine` (nodemon + `ts-node/esm`).

## Current file layout (CURRENT)

| File/module | Responsibility | Doc |
|---|---|---|
| `app.ts` | Plugin registration, all route handlers (HTTP glue only — every route calls into `events`/`ingestion`; no route touches Prisma directly, per `docs/standards/backend-engineering-standards.md`) | [`intelligence-engine.md`](../../../docs/api/intelligence-engine.md) for the routes it exposes |
| `index.ts` | Bootstrap only — `buildApp()` + `.listen()`. Nothing else belongs here. | — |
| `db.ts` | Shared `PrismaClient` singleton (every module imports this, none instantiate their own) + the `Db` type (`typeof prisma \| Prisma.TransactionClient`) used by any function that must be able to run standalone or inside a caller's `$transaction` | — |
| `errors.ts` | `sendError()` — the one place API error responses are shaped, `{ error: { code, message, details? } }` | [`../../docs/api/intelligence-engine.md`](../../docs/api/intelligence-engine.md)'s "Error responses" section |
| `config.ts` | Zod-validated env config (`NODE_ENV`, `JWT_SECRET`, `CORS_ORIGINS`), fails fast at startup. Not `DATABASE_URL` — see [`../../docs/architecture/IMPLEMENTATION_NOTES.md`](../../docs/architecture/IMPLEMENTATION_NOTES.md) | — |
| `index.ts` (bootstrap) | Also owns graceful shutdown (`SIGTERM`/`SIGINT` → `fastify.close()` → `prisma.$disconnect()`), not automated-tested — see [`../../docs/architecture/IMPLEMENTATION_NOTES.md`](../../docs/architecture/IMPLEMENTATION_NOTES.md) for how it was verified manually | — |
| `ws/` | WebSocket connection hub + `broadcast()` | [`ws/README.md`](ws/README.md) |
| `events/` | `createEvent()` (incl. duplicate/corroboration detection), `updateStatus()`, `recalculateConfidence()` (multi-signal v2, the only code that writes to `Event`), `listEventsInRange()` (playback), `geo-query.ts`'s bbox/radius/ward/cluster/heatmap read queries, `list-cache.ts`'s request-coalescing cache, `idempotency.ts`'s `Idempotency-Key` dedup store, `prisma-enum.ts`'s Prisma⟷api-contracts boundary conversion | [`events/README.md`](events/README.md) |
| `ingestion/` | `Source` adapters, `ingestEvent()` — normalizes raw input before calling `events.createEvent()` | [`ingestion/README.md`](ingestion/README.md) |
| `transit.ts` | Thin HTTP client to `plantir-blr-data-service` (sibling repo) for transit-arrival and fare-estimate data — no longer generates mock data itself (moved 2026-08-10) | [`transit/README.md`](transit/README.md) |
| `wards/` | Bangalore BBMP ward polygon lookup (static GeoJSON, loaded in memory) — backs `GET /v1/events?wardId=` | [`wards/README.md`](wards/README.md) |

`routes/` (below) is the one piece of the originally-planned split that hasn't landed — route *registration* is still inline in `index.ts`, only the logic inside each handler has been extracted.

## Still planned (PLANNED)

| Module | Responsibility | Doc |
|---|---|---|
| `routes/` | Fastify route *registration* only, manifest-driven (`routes/manifest.ts` already exists and documents the mapping — it just isn't consumed by `index.ts` yet) | [`routes/README.md`](routes/README.md) |

## Related docs

- [`../../../docs/architecture/OVERVIEW.md`](../../../docs/architecture/OVERVIEW.md) — where this app sits in the whole system
- [`../../../docs/architecture/DATA_FLOW.md`](../../../docs/architecture/DATA_FLOW.md) — how an event moves end to end
- [`../../../docs/api/intelligence-engine.md`](../../../docs/api/intelligence-engine.md) — full HTTP/WS route reference
