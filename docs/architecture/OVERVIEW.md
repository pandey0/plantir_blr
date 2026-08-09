# System Overview

> **Ownership rule**: when app topology, ports, datastores, or which service owns what changes, update this doc in the same PR. See [`../README.md`](../README.md) for the full doc index and status-label meaning.

**CURRENT.** Bangalore City Intelligence Platform: an npm-workspaces monorepo, one shared backend, multiple independent frontend apps. Currently only `intelligence-engine` + `public-map` are implemented; `citizen-app` and `authority-portal` are unstarted Vite+React stubs.

## Topology

```
┌────────────────┐   GET /v1/events*, WS /ws  ┌──────────────────────┐
│  public-map     │◄───────────────────────────┤                      │
│  Next.js :3000  │                            │  intelligence-engine │
└────────────────┘                            │  Fastify :3001        │
                                                │  (always-on, single   │
┌────────────────┐   not yet built             │   instance)           │
│  citizen-app    │- - - - - - - - - - - - - - ►│                      │
│  Vite :3002     │                            │                      │
└────────────────┘                            │                      │
                                                │                      │
┌────────────────┐   not yet built             │                      │
│  authority-portal│- - - - - - - - - - - - -  ►│                      │
│  Vite :3003     │                            └──┬─────┬─────────┬──┘
└────────────────┘                                │     │         │
                                                    ▼     ▼         ▼
                                          ┌──────────────┐┌───────┐┌─────────────────────────┐
                                          │ PostgreSQL   ││ Redis ││ plantir-blr-data-service │
                                          │ + PostGIS    ││ :6379 ││ FastAPI :8000             │
                                          │ :5433        ││(unused││ (sibling repo, own git    │
                                          └──────────────┘│ today)││  history — see below)     │
                                                           └───────┘└─────────────────────────┘
```
\* `public-map` calls the engine via `lib/api.ts`, all `/v1/` paths — adapted 2026-08-10 (was stale against the `/v1` migration before that; see `TECH_STACK.md` decision log). The engine's `transit.ts` calls `plantir-blr-data-service` for transit/geo reference data (landed 2026-08-10) — `public-map` never talks to that service directly, only through the engine, same as every other data source.

## Apps

| App | Status | Stack | Port | Notes |
|---|---|---|---|---|
| `apps/intelligence-engine` | CURRENT | Fastify 5, TypeScript (ESM), Prisma | 3001 | Only backend. Single instance, JWT+role auth, no horizontal scaling. See [`../../apps/intelligence-engine/src/README.md`](../../apps/intelligence-engine/src/README.md). |
| `apps/public-map` | CURRENT | Next.js 14 (App Router), Leaflet | 3000 | Main UI. Calls the engine's `/v1/` API via `lib/api.ts`, hydrates events on load, handles both `NEW_EVENT` and `EVENT_UPDATED` WS messages. See [`../../apps/public-map/README.md`](../../apps/public-map/README.md). |
| `apps/citizen-app` | PLANNED (stub only) | Vite + React | 3002 | Reporting interface. Not yet built. |
| `apps/authority-portal` | PLANNED (stub only) | Vite + React | 3003 | Triage dashboard. Not yet built. |
| `packages/database` | CURRENT | Prisma schema + migrations | — | Shared by engine only today. |

## Datastores

- **PostgreSQL + PostGIS**, host port **5433** mapped to the container's default **5432** (`docker-compose.yml` — was previously mis-mapped `5433:5433`, fixed 2026-08-09). Managed via `packages/database` (Prisma). The `geom GEOGRAPHY(POINT)` column (migration `20260809130000_add_event_geom`) is applied and verified end-to-end against a live database — see `api/intelligence-engine.md`.
- **Redis**, port 6379. Provisioned (`ioredis` is a dependency, `docker-compose.yml` runs it) but **not currently used anywhere in the code**. Reserved for future rate-limiting and WebSocket fan-out once the engine runs >1 instance — see [`DATA_FLOW.md`](DATA_FLOW.md).

## External services

- **`plantir-blr-data-service`** (landed 2026-08-10) — FastAPI/Python, port 8000, **its own repo** (`../plantir-blr-data-service`, sibling directory to this monorepo — not an npm workspace, own git history, own language/stack). Serves Bangalore transit (arrivals, fare estimates) and geo reference data (BBMP wards, metro lines/stations) behind a provider interface designed so a real upstream can be plugged in later without touching this monorepo. `intelligence-engine`'s `transit.ts` is its only consumer (`DATA_SERVICE_URL` config var, defaults to `http://localhost:8000`) — see [`../../apps/intelligence-engine/src/transit/README.md`](../../apps/intelligence-engine/src/transit/README.md) and that service's own `README.md`. Currently mock data only (a faithful port of what used to be hardcoded in `transit.ts` directly), no real transit API wired in yet.

## Why one always-on backend, not serverless/edge

`intelligence-engine` holds live WebSocket connections (`connections` Set) and a Prisma connection pool — both need a persistent process, not a stateless request handler. If `public-map` (or future frontends) move to an edge/CDN-friendly host later, the engine stays a single always-on service regardless. This mirrors the general pattern of separating "holds persistent state/connections" from "stateless request/response" — see [`DATA_FLOW.md`](DATA_FLOW.md) for how that plays out as ingestion sources grow.

## Scaling ceiling (today)

WebSocket fan-out is an in-process `Set<WebSocket>` — works only for a single engine instance. Do not add Redis pub/sub pre-emptively; the trigger is "we are running >1 engine replica," not before. Documented in detail in [`DATA_FLOW.md`](DATA_FLOW.md).
