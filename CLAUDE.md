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
```

No test suite is configured.

## Documentation

Before editing code, check whether a doc already covers it — this repo is being deliberately over-documented so an agent can work from docs instead of re-deriving design by reading the whole tree. Start at [`docs/README.md`](docs/README.md) (the index). Root `docs/` holds only cross-app material (system topology, cross-app data flow, per-app API index); each app's internal module docs live inside that app's own folder (e.g. `apps/intelligence-engine/src/*/README.md`).

**Ownership rule, binding on every change**: if you touch code a doc describes, update that doc in the same change — not a follow-up. Docs are labeled CURRENT / PLANNED / STALE-KNOWN-WRONG / PROPOSED so neither you nor a future agent has to guess what's actually built.

**[`docs/architecture/TECH_STACK.md`](docs/architecture/TECH_STACK.md) is binding**: it lists the stack per app and a decision log. Major changes (new datastore/infra, framework swap, splitting a module into its own service, auth architecture changes, anything that reverses a logged decision) must be confirmed with the user before implementation — write it up there as `PROPOSED` and ask, don't just build it.

**Rules exist at two levels, don't duplicate across them**: this file (repo root) holds rules that apply everywhere — doc ownership, the change-confirmation policy, monorepo commands. Each app that has app-specific conventions (import style, validation patterns, auth wiring, etc.) gets its own `apps/<app>/CLAUDE.md`, loaded automatically by Claude Code when working in that subtree — see `apps/intelligence-engine/CLAUDE.md` for the first one. When a rule is specific to one app's code, it belongs in that app's `CLAUDE.md`, not here.

## Architecture

npm workspaces monorepo. Four apps, one shared package:

- **`apps/intelligence-engine`** — Fastify 5 + TypeScript backend. ESM module (`"type": "module"`). Uses `ts-node/esm` loader via nodemon in dev. Exposes REST endpoints + a WebSocket hub at `/ws` that broadcasts `NEW_EVENT` messages to connected map clients. Runs on port 3001.
- **`apps/public-map`** — Next.js 14 (App Router). The main UI. Leaflet map with drill-down administrative hierarchy (CITY → CORP → WARD → BLOCK). Connects to the engine's WebSocket for live event streaming.
- **`apps/citizen-app`** — Vite + React stub, not yet implemented.
- **`apps/authority-portal`** — Vite + React stub, not yet implemented.
- **`packages/database`** — Prisma schema + migrations. `DATABASE_URL` in `packages/database/.env` points to port 5433.

Intelligence Engine routes (`apps/intelligence-engine/src/index.ts`): `GET /ws` (WebSocket upgrade), `GET /events`, `PATCH /events/:id/status`, `POST /report`, `POST /dev/inject`, `GET /transit/arrivals`, `GET /transit/estimate` (transit logic lives in `src/transit.ts`).

## Key implementation details

**Database:** PostGIS runs on host port **5433**, mapped to the container's default **5432** (`docker-compose.yml`). The `geom GEOGRAPHY(POINT)` column on `Event` is added via migration `20260809130000_add_event_geom` and written via `prisma.$executeRaw` in `events.createEvent()` (`apps/intelligence-engine/src/events/index.ts`) — not via `schema.prisma` (Prisma has limited built-in PostGIS support). Applied and verified end-to-end against a live database. See [`docs/api/intelligence-engine.md`](docs/api/intelligence-engine.md) and [`apps/intelligence-engine/src/events/README.md`](apps/intelligence-engine/src/events/README.md).

**Auth:** JWT bearer tokens (`@fastify/jwt`), role claim `citizen`/`authority`, required on `POST /report` and `PATCH /events/:id/status`. No real login flow exists — `POST /dev/token` (non-production only) mints test tokens. See [`docs/api/intelligence-engine.md`](docs/api/intelligence-engine.md).

**Intelligence Engine ESM:** All internal imports must use `.js` extensions (e.g., `import { foo } from './transit.js'`). This is required for Node ESM compatibility even when writing TypeScript.

**Leaflet + Next.js SSR:** `apps/public-map/components/Map/index.tsx` wraps `MapInner` with `dynamic(..., { ssr: false })`. Never import Leaflet in server-rendered code.

**Map layer system:** `lib/layers.ts` defines `DOMAIN_REGISTRY` (domain groups with toggleable layers: infra, public buildings, tactical feed) and `LAYER_REGISTRY` (base maps). The `MapInner` component loads GeoJSON from `/public/` (bbmp-wards.json, metro-lines.json, metro-stations.json) and manages drill-down state via `lib/geo-utils.ts` (`hierarchyService`).

**Hierarchy drill-down:** `MapInner` tracks `currentLevel: HierarchyType` (CITY/CORP/WARD/BLOCK) and `visibleHierarchy: HierarchyLevel[]`. Clicking a polygon drills down; clicking the tile layer or ContextCard retracts. `lib/hierarchy.ts` maps Bangalore parliamentary constituencies to 5 corporation zones (North/South/East/West/Central) used for `SignalTicker` filtering.

**WebSocket events:** `page.tsx` connects to `ws://localhost:3001/ws` and expects `{ type: 'NEW_EVENT', payload: {...} }` messages. The engine's `connections` Set broadcasts to all connected sockets — broadcast logic must be added to the POST /report handler when events are created.

**Confidence scoring:** Planned but not implemented. Schema has `confidence_score INT` on `Event`. Design: +20 per unique reporter, +30 if media attached, −50 if AI-flagged fraud.
