# lib — internals

> **Ownership rule**: add/move/rename a file here → update this map in the same change.

Non-component logic: the engine API client, static reference data services, and domain constants. No React here — everything in this folder is plain TypeScript, importable from both client and (theoretically) server components.

## Files

| File | Responsibility |
|---|---|
| `api.ts` | **The only place that talks to `intelligence-engine`.** Base URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`), typed request functions (`listEvents`, `getArrivals`, `getFareEstimate`), `getWsUrl()`, and `toMapEvent()` — converts the engine's `EngineEvent` response shape (`category`, no `location`) into this app's `MapEvent` shape (`type`, optional `location`) that every component already expects. See `../CLAUDE.md` for why this file exists and what broke before it did. |
| `geo-utils.ts` | `hierarchyService` — builds the CITY→CORP→WARD→BLOCK administrative hierarchy from raw ward GeoJSON (`setRawData()`) using `@turf/turf` to combine ward polygons into corp-zone/city-level shapes. Caches computed levels (`Map`, cleared on `setRawData()`). `getWardsForCorp(corpId)`/`getBlocksForWard(wardId)` are the drill-down data sources `MapInner.tsx` calls on each click. |
| `hierarchy.ts` | `BANGALORE_HIERARCHY` — static data mapping Bangalore's parliamentary constituencies to 5 corporation zones (North/South/East/West/Central), each with a display color. This is what `geo-utils.ts`'s `getCorporationLevels()`/`getWardsForCorp()` group ward polygons by (matching each ward's `assembly_constituency_name_en` property against a corp's `constituencies` list). |
| `layers.ts` | `DOMAIN_REGISTRY` (toggleable domain groups shown in the HUD: commute, public buildings, tactical feed — each with `LayerNode` children) and `LAYER_REGISTRY` (base map tile options). Static configuration, not fetched from anywhere. |
| `categories.ts` | `CATEGORY_REGISTRY` — the single source of truth for `EventCategory` → display color/label. `getCategoryColor()`/`getCategoryLabel()` are the only functions any component should use to render a category; don't hardcode a color/label string elsewhere. |
| `overpass.ts` | OSM Overpass API client for `osm_points` layers (hospitals, govt offices, parks, transit depots) — third-party public data, unrelated to `intelligence-engine`. Used by `MapInner.tsx` when an `osm_points` layer becomes visible. |
| `admin-data.ts` | Static reference data for the `AdminDrawer`/`DomainBrowser` HUD panels. |
| `utils.ts` | `cn()` — Tailwind class-merging helper (the standard shadcn/ui convention, re-exported for `components/ui/*`). |

## What's static vs. fetched

- **Static, bundled at build time**: `layers.ts`, `categories.ts`, `hierarchy.ts`, `admin-data.ts` — plain TS constants.
- **Fetched from `intelligence-engine`**: everything through `api.ts` — events, transit arrivals/fares.
- **Fetched from `/public/*.json`** (Next.js static file serving, not `intelligence-engine`): `bbmp-wards.json`, `metro-lines.json`, `metro-stations.json` — loaded directly by `MapInner.tsx`'s own `useEffect`, not through this `lib/` layer. See `../README.md`'s "Known gaps" section — these have a duplicate copy in `apps/intelligence-engine/src/wards/`, with no enforced sync.
- **Fetched from OSM Overpass** (third-party, not `intelligence-engine`): via `overpass.ts`.

## Related docs

- [`../CLAUDE.md`](../CLAUDE.md) — app-wide conventions, including the "one API client" rule this folder's `api.ts` exists to enforce.
- [`../../intelligence-engine/src/README.md`](../../intelligence-engine/src/README.md) — the engine module `api.ts` talks to.
