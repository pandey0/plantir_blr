# System Overview

> **Ownership rule**: when app topology, ports, datastores, or which service owns what changes, update this doc in the same PR. See [`../README.md`](../README.md) for the full doc index and status-label meaning.

**CURRENT.** Bangalore City Intelligence Platform: an npm-workspaces monorepo, one shared backend, multiple independent frontend apps. Currently only `intelligence-engine` + `public-map` are implemented; `citizen-app` and `authority-portal` are unstarted Vite+React stubs.

## Topology

```
┌────────────────┐   GET /events, WS /ws   ┌──────────────────────┐
│  public-map     │◄───────────────────────┤                      │
│  Next.js :3000  │                         │  intelligence-engine │
└────────────────┘                         │  Fastify :3001        │
                                             │  (always-on, single   │
┌────────────────┐   not yet built          │   instance)           │
│  citizen-app    │- - - - - - - - - - - - -►│                      │
│  Vite :3002     │                         │                      │
└────────────────┘                         │                      │
                                             │                      │
┌────────────────┐   not yet built          │                      │
│  authority-portal│- - - - - - - - - - - - ►│                      │
│  Vite :3003     │                         └──────┬────────┬──────┘
└────────────────┘                                │        │
                                                    ▼        ▼
                                          ┌──────────────┐ ┌───────┐
                                          │ PostgreSQL   │ │ Redis │
                                          │ + PostGIS    │ │ :6379 │
                                          │ :5433        │ │(unused│
                                          └──────────────┘ │ today)│
                                                            └───────┘
```

## Apps

| App | Status | Stack | Port | Notes |
|---|---|---|---|---|
| `apps/intelligence-engine` | CURRENT | Fastify 5, TypeScript (ESM), Prisma | 3001 | Only backend. Single instance, no auth, no horizontal scaling. See [`../../apps/intelligence-engine/src/README.md`](../../apps/intelligence-engine/src/README.md). |
| `apps/public-map` | CURRENT | Next.js 14 (App Router), Leaflet | 3000 | Main UI. Reads `GET /events`, subscribes to `WS /ws` for live pulses. |
| `apps/citizen-app` | PLANNED (stub only) | Vite + React | 3002 | Reporting interface. Not yet built. |
| `apps/authority-portal` | PLANNED (stub only) | Vite + React | 3003 | Triage dashboard. Not yet built. |
| `packages/database` | CURRENT | Prisma schema + migrations | — | Shared by engine only today. |

## Datastores

- **PostgreSQL + PostGIS**, host port **5433** mapped to the container's default **5432** (`docker-compose.yml` — was previously mis-mapped `5433:5433`, fixed 2026-08-09). Managed via `packages/database` (Prisma). The `geom GEOGRAPHY(POINT)` column (migration `20260809130000_add_event_geom`) is applied and verified end-to-end against a live database — see `api/intelligence-engine.md`.
- **Redis**, port 6379. Provisioned (`ioredis` is a dependency, `docker-compose.yml` runs it) but **not currently used anywhere in the code**. Reserved for future rate-limiting and WebSocket fan-out once the engine runs >1 instance — see [`DATA_FLOW.md`](DATA_FLOW.md).

## Why one always-on backend, not serverless/edge

`intelligence-engine` holds live WebSocket connections (`connections` Set) and a Prisma connection pool — both need a persistent process, not a stateless request handler. If `public-map` (or future frontends) move to an edge/CDN-friendly host later, the engine stays a single always-on service regardless. This mirrors the general pattern of separating "holds persistent state/connections" from "stateless request/response" — see [`DATA_FLOW.md`](DATA_FLOW.md) for how that plays out as ingestion sources grow.

## Scaling ceiling (today)

WebSocket fan-out is an in-process `Set<WebSocket>` — works only for a single engine instance. Do not add Redis pub/sub pre-emptively; the trigger is "we are running >1 engine replica," not before. Documented in detail in [`DATA_FLOW.md`](DATA_FLOW.md).
