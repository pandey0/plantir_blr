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
```

No test suite is configured.

## Architecture

npm workspaces monorepo. Four apps, one shared package:

- **`apps/intelligence-engine`** — Fastify 5 + TypeScript backend. ESM module (`"type": "module"`). Uses `ts-node/esm` loader via nodemon in dev. Exposes REST endpoints + a WebSocket hub at `/ws` that broadcasts `NEW_EVENT` messages to connected map clients. Runs on port 3001.
- **`apps/public-map`** — Next.js 14 (App Router). The main UI. Leaflet map with drill-down administrative hierarchy (CITY → CORP → WARD → BLOCK). Connects to the engine's WebSocket for live event streaming.
- **`apps/citizen-app`** — Vite + React stub, not yet implemented.
- **`apps/authority-portal`** — Vite + React stub, not yet implemented.
- **`packages/database`** — Prisma schema + migrations. `DATABASE_URL` in `packages/database/.env` points to port 5433.

## Key implementation details

**Database:** PostGIS runs on port **5433** (not default 5432). The `geom` GEOGRAPHY(POINT) column on the `Event` table is managed via raw SQL migration (`packages/database/prisma/migrations/20260318120343_init/migration.sql`), not the Prisma schema, because Prisma has limited built-in PostGIS support.

**Intelligence Engine ESM:** All internal imports must use `.js` extensions (e.g., `import { foo } from './transit.js'`). This is required for Node ESM compatibility even when writing TypeScript.

**Leaflet + Next.js SSR:** `apps/public-map/components/Map/index.tsx` wraps `MapInner` with `dynamic(..., { ssr: false })`. Never import Leaflet in server-rendered code.

**Map layer system:** `lib/layers.ts` defines `DOMAIN_REGISTRY` (domain groups with toggleable layers: infra, public buildings, tactical feed) and `LAYER_REGISTRY` (base maps). The `MapInner` component loads GeoJSON from `/public/` (bbmp-wards.json, metro-lines.json, metro-stations.json) and manages drill-down state via `lib/geo-utils.ts` (`hierarchyService`).

**Hierarchy drill-down:** `MapInner` tracks `currentLevel: HierarchyType` (CITY/CORP/WARD/BLOCK) and `visibleHierarchy: HierarchyLevel[]`. Clicking a polygon drills down; clicking the tile layer or ContextCard retracts. `lib/hierarchy.ts` maps Bangalore parliamentary constituencies to 5 corporation zones (North/South/East/West/Central) used for `SignalTicker` filtering.

**WebSocket events:** `page.tsx` connects to `ws://localhost:3001/ws` and expects `{ type: 'NEW_EVENT', payload: {...} }` messages. The engine's `connections` Set broadcasts to all connected sockets — broadcast logic must be added to the POST /report handler when events are created.

**Confidence scoring:** Planned but not implemented. Schema has `confidence_score INT` on `Event`. Design: +20 per unique reporter, +30 if media attached, −50 if AI-flagged fraud.
