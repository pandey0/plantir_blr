# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Infrastructure (requires Docker)
npm run infra:up          # Start PostGIS (port 5433) + Redis (port 6379)
npm run infra:down        # Stop containers

# Database
npm run db:migrate        # Run Prisma migrations (prisma migrate dev)

# Development servers
npm run dev:engine        # Intelligence Engine — Fastify API on port 3001
npm run dev:map           # Public Map — Next.js dev server

# Build
npm run build --workspace=apps/intelligence-engine

# Lint (public-map only; other apps have no lint script)
npm run lint --workspace=apps/public-map

# Tests
npm run test:unit          # no DB needed, runs in pre-commit
npm run test:integration   # needs infra:up + db:migrate first
```

See [`docs/architecture/TESTING.md`](docs/architecture/TESTING.md) for the unit/integration split.

## Documentation

Before editing code, check whether a doc already covers it — this repo is being deliberately over-documented so an agent can work from docs instead of re-deriving design by reading the whole tree. Start at [`docs/README.md`](docs/README.md) (the index). Root `docs/` holds only cross-app material (system topology, cross-app data flow, per-app API index); each app's internal module docs live inside that app's own folder (e.g. `apps/intelligence-engine/src/*/README.md`).

**Ownership rule, binding on every change**: if you touch code a doc describes, update that doc in the same change — not a follow-up. Docs are labeled CURRENT / PLANNED / STALE-KNOWN-WRONG / PROPOSED so neither you nor a future agent has to guess what's actually built.

**[`docs/architecture/TECH_STACK.md`](docs/architecture/TECH_STACK.md) is binding**: it lists the stack per app and a decision log. Major changes (new datastore/infra, framework swap, splitting a module into its own service, auth architecture changes, anything that reverses a logged decision) must be confirmed with the user before implementation — write it up there as `PROPOSED` and ask, don't just build it.

**Every doc in [`docs/standards/`](docs/standards/) is binding — 13 docs, check the ones relevant to what you're touching before implementing, not just backend/frontend.** Framework-agnostic engineering rules, one file per domain:

| Doc | Covers |
|---|---|
| `backend-engineering-standards.md` | Layering, validation, DTOs, transactions, error handling, security, testing, deployment |
| `frontend-engineering-standards.md` | Component architecture, state separation, forms, accessibility, performance |
| `authentication-security-engineering-standards.md` | AuthN/AuthZ, session/token handling, IDOR/BOLA, secrets |
| `http-networking-engineering-standards.md` | Timeouts, retries, headers, proxies, request limits |
| `sql-database-engineering-standards.md` | Schema design, indexing, migrations, query patterns, transactions |
| `testing-engineering-standards.md` | Test tiers, naming, coverage philosophy, what to test |
| `deployment-devops-engineering-standards.md` | Environments, CI/CD, releases, rollback |
| `linux-docker-cicd-engineering-standards.md` | Containers, Dockerfiles, CI pipeline mechanics |
| `observability-operations-engineering-standards.md` | Logging, metrics, tracing, alerting, incident response |
| `redis-queues-kafka-engineering-standards.md` | Caching, queues, event streaming (N/A today — no Redis/Kafka usage exists yet, don't add speculatively) |
| `ai-application-engineering-standards.md` | LLM/AI integration patterns (N/A today — no AI features exist) |
| `system-design-engineering-standards.md` | Capacity planning, scaling, architecture trade-offs |
| `software-engineering-practices-standards.md` | General code quality — SOLID, DRY/KISS/YAGNI, naming, PR hygiene |

**When implementing a feature, check the standard(s) that domain touches before writing code, and reference the specific one in a code comment or the doc you update if a decision follows from it** (e.g. "per `sql-database-engineering-standards.md`'s indexing section" — this is how a standard actually gets *maintained*, not just filed). If a standard's rule doesn't apply at this app's current scale (e.g. Kafka, multi-region, microservices splitting), say so explicitly where relevant rather than silently ignoring it — see [`docs/architecture/STANDARDS_COMPLIANCE.md`](docs/architecture/STANDARDS_COMPLIANCE.md) for the audit pattern to follow (compliant / fixed / deliberately deferred-with-reason). That audit currently only covers `backend-engineering-standards.md` in full — the other 12 have been read and applied ad hoc (VISION-gap implementation round, 2026-08-10) but don't have a formal section-by-section audit doc yet. Do one for a standard before claiming a module is "compliant" with it.

**Rules exist at two levels, don't duplicate across them**: this file (repo root) holds rules that apply everywhere — doc ownership, the change-confirmation policy, monorepo commands. Each app that has app-specific conventions (import style, validation patterns, auth wiring, etc.) gets its own `apps/<app>/CLAUDE.md`, loaded automatically by Claude Code when working in that subtree — see `apps/intelligence-engine/CLAUDE.md` for the first one. When a rule is specific to one app's code, it belongs in that app's `CLAUDE.md`, not here.

## Architecture

npm workspaces monorepo. Four apps, one shared package:

- **`apps/intelligence-engine`** — Fastify 5 + TypeScript backend. ESM module (`"type": "module"`). Uses `ts-node/esm` loader via nodemon in dev. Exposes REST endpoints + a WebSocket hub at `/ws` that broadcasts `NEW_EVENT` messages to connected map clients. Runs on port 3001.
- **`apps/public-map`** — Next.js 14 (App Router). The main UI. Leaflet map with drill-down administrative hierarchy (CITY → CORP → WARD → BLOCK). Connects to the engine's WebSocket for live event streaming.
- **`apps/citizen-app`** — Vite + React stub, not yet implemented.
- **`apps/authority-portal`** — Vite + React stub, not yet implemented.
- **`packages/database`** — Prisma schema + migrations. `DATABASE_URL` in `packages/database/.env` points to port 5433.

Intelligence Engine routes, registered from `apps/intelligence-engine/src/routes/manifest.ts` by `app.ts`'s `buildApp()`: `GET /ws` (WebSocket upgrade, unversioned), `GET /v1/events` (`bbox=`/`lat=&lng=&radiusKm=`/`wardId=` filters, mutually exclusive), `GET /v1/events/clusters`, `GET /v1/events/heatmap`, `GET /v1/events/playback`, `PATCH /v1/events/:id/status`, `POST /v1/events`, `GET /v1/transit/arrivals`, `GET /v1/transit/estimate` (transit logic lives in `src/transit.ts`), plus non-production-only `POST /dev/token`/`POST /dev/inject`. **All moved to `/v1/` 2026-08-09, no backward-compat aliases** — `public-map` still calls the old unversioned paths and is stale until updated on its own turn; see [`docs/architecture/IMPLEMENTATION_NOTES.md`](docs/architecture/IMPLEMENTATION_NOTES.md#versioning).

## Key implementation details

**Database:** PostGIS runs on host port **5433**, mapped to the container's default **5432** (`docker-compose.yml`). The `geom GEOGRAPHY(POINT)` column on `Event` is added via migration `20260809130000_add_event_geom` and written via `prisma.$executeRaw` in `events.createEvent()` (`apps/intelligence-engine/src/events/index.ts`) — not via `schema.prisma` (Prisma has limited built-in PostGIS support). Applied and verified end-to-end against a live database. See [`docs/api/intelligence-engine.md`](docs/api/intelligence-engine.md) and [`apps/intelligence-engine/src/events/README.md`](apps/intelligence-engine/src/events/README.md).

**Auth:** JWT bearer tokens (`@fastify/jwt`), role claim `citizen`/`authority`, required on `POST /v1/events` and `PATCH /v1/events/:id/status`. No real login flow exists — `POST /dev/token` (non-production only) mints test tokens. See [`docs/api/intelligence-engine.md`](docs/api/intelligence-engine.md).

**Intelligence Engine ESM:** All internal imports must use `.js` extensions (e.g., `import { foo } from './transit.js'`). This is required for Node ESM compatibility even when writing TypeScript.

**Leaflet + Next.js SSR:** `apps/public-map/components/Map/index.tsx` wraps `MapInner` with `dynamic(..., { ssr: false })`. Never import Leaflet in server-rendered code.

**Map layer system:** `lib/layers.ts` defines `DOMAIN_REGISTRY` (domain groups with toggleable layers: infra, public buildings, tactical feed) and `LAYER_REGISTRY` (base maps). The `MapInner` component loads GeoJSON from `/public/` (bbmp-wards.json, metro-lines.json, metro-stations.json) and manages drill-down state via `lib/geo-utils.ts` (`hierarchyService`).

**Hierarchy drill-down:** `MapInner` tracks `currentLevel: HierarchyType` (CITY/CORP/WARD/BLOCK) and `visibleHierarchy: HierarchyLevel[]`. Clicking a polygon drills down; clicking the tile layer or ContextCard retracts. `lib/hierarchy.ts` maps Bangalore parliamentary constituencies to 5 corporation zones (North/South/East/West/Central) used for `SignalTicker` filtering.

**WebSocket events:** `page.tsx` connects to `ws://localhost:3001/ws` and handles `{ type: 'NEW_EVENT', payload: {...} }` (ignores anything else, including `EVENT_UPDATED` — see below). The engine's `connections` Set (in `src/ws/index.ts`) broadcasts to all connected sockets; `events.createEvent()` sends `NEW_EVENT` on a genuine create or `EVENT_UPDATED` when the report merges into an existing event via duplicate detection (see below), `events.updateStatus()` always sends `EVENT_UPDATED` — `public-map` doesn't render `EVENT_UPDATED` yet, that's a future `public-map`-side change, not a bug.

**Confidence scoring:** Multi-signal v2 (2026-08-10, reverses the earlier additive v1 formula) — reporter signal `min(60, 20 + 15*(reporters-1))`, evidence signal `min(30, 15*evidenceCount)`, `+25` authority-confirmation bonus once status leaves `REPORTED`, `-50` if `FRAUD`, clamped 0–100. Weights are documented defaults, calibration explicitly deferred to beta. See [`apps/intelligence-engine/src/events/README.md`](apps/intelligence-engine/src/events/README.md).

**Duplicate/corroboration detection:** `POST /v1/events` checks for a same-category, non-terminal event within 150m/6h before creating a new one — a match attaches as a corroborating `Report`/`Evidence` instead (this is what makes the reporter signal's multi-reporter case reachable through the real API). Known residual race under fully concurrent requests, documented not fixed — see [`docs/architecture/IMPLEMENTATION_NOTES.md`](docs/architecture/IMPLEMENTATION_NOTES.md). GPS validation (Bangalore-metro bounding box) also rejects clearly-wrong coordinates with 400. "AI-flagged" fraud detection, camera-only uploads, and user reputation scoring remain unbuilt — each needs a real product decision (AI vendor, upload pipeline, account system) not yet made.

**Ward filtering:** `GET /v1/events?wardId=` filters by BBMP ward polygon. `apps/intelligence-engine/src/wards/` holds its own copy of `bbmp-wards.json` (same source as `public-map`'s, copied not imported — apps stay independently deployable) with no DB table; the ward's geometry is passed as a query parameter into `ST_GeomFromGeoJSON` at read time. See [`apps/intelligence-engine/src/wards/README.md`](apps/intelligence-engine/src/wards/README.md).
