# wards — BBMP ward geometry

> Status: **CURRENT** (landed 2026-08-10).
>
> **Ownership rule**: touch ward lookup logic or the source data file → update this doc in the same change.

## Purpose

Loads Bangalore's BBMP ward polygons into memory and exposes lookup functions — backs `GET /v1/events?wardId=` (`events/geo-query.ts`'s `findEventIdsInWard()`). Per `docs/product/VISION.md`'s Bangalore-specific context section ("map event coordinates to Bangalore's 243 BBMP wards").

## Data source

`bbmp-wards.json` in this directory is a **copy** of `apps/public-map/public/bbmp-wards.json`, not an import across the app boundary — apps in this monorepo stay independently deployable (root `CLAUDE.md`'s Architecture section), so `intelligence-engine` owns its own copy of the geodata it needs rather than reaching into `public-map`'s asset directory. There is no enforced sync between the two copies — a correction to ward boundaries upstream needs updating both files manually.

Only **225 of Bangalore's 243 BBMP wards** have digitized boundaries in this file — `wardId`s outside that set simply have no geometry to filter on (see below), which is not the same as an invalid `wardId`.

## Loading

`index.ts` reads `bbmp-wards.json` via `readFileSync` + `import.meta.url`-derived path at module load time — not a JSON import assertion (`assert { type: 'json' }`), which this repo's `ts-node/esm` + `nodemon` dev setup predates reliable support for. The file is parsed once and held in a `Map<wardId, WardFeature>` for the process lifetime; there's no reload-on-change (the data is static, not expected to update without a deploy).

**Build note**: `tsc` (this app's `build` script) only compiles `.ts` files — it doesn't copy `bbmp-wards.json` into `dist/`. `apps/intelligence-engine/package.json`'s `build` script does `tsc && mkdir -p dist/wards && cp src/wards/bbmp-wards.json dist/wards/bbmp-wards.json` explicitly. If this file ever moves, update that copy step too.

## Interface

```ts
interface WardSummary { id: number; name: string; }
type WardGeometry = { type: string; coordinates: unknown };   // structural, not the @types/geojson package — see index.ts

function getWardGeometry(wardId: number): WardGeometry | undefined;
function wardExists(wardId: number): boolean;
function listWards(): WardSummary[];   // all digitized wards — not consumed by any route yet, exposed since the data's already loaded
```

`WardGeometry` is a minimal structural type, not a dependency on the `@types/geojson` package — the only thing done with it is round-tripping as JSON text into PostGIS's `ST_GeomFromGeoJSON` (see `geo-query.ts`), which doesn't need anything more specific than "valid GeoJSON geometry".

## Consumers

`events/geo-query.ts`'s `findEventIdsInWard(wardId)` — the only consumer today. Looks up the ward's geometry via `getWardGeometry()`, and if found, passes it as a query parameter into a raw-SQL `ST_Within(geom::geometry, ST_SetSRID(ST_GeomFromGeoJSON(...), 4326))` query. An unknown `wardId` (no geometry) short-circuits to an empty result, not an error — see [`../../../../docs/api/intelligence-engine.md`](../../../../docs/api/intelligence-engine.md).

## Why not a PostGIS `Ward` table

Considered and deliberately not built: persisting ward polygons into a `Ward` table (with a migration + seed step) would let queries go the other direction too ("which ward is this event in", computed FROM the database), which nothing currently needs — `GET /v1/events?wardId=` only ever filters events INTO a caller-specified ward, using geometry supplied at query time. Revisit if a real query pattern needs ward membership computed from stored data rather than filtered against it.
