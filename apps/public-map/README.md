# public-map — internals

> **Ownership rule**: add/move/rename a file here → update this map in the same change.

Next.js 14 (App Router) + Leaflet. The main UI — a public, read-only map visualizing city events, transit, and administrative boundaries. Connects to `apps/intelligence-engine` over HTTP (`lib/api.ts`) and WebSocket (`/ws`) — see that app's own docs for the API contract this depends on, and [`../../docs/architecture/DATA_FLOW.md`](../../docs/architecture/DATA_FLOW.md) for how an event gets from a citizen report to a marker on this map.

## Current file layout (CURRENT)

| Path | Responsibility |
|---|---|
| `app/page.tsx` | Top-level client component. Owns event state (initial hydration + WS live updates), layer/domain toggle state, hierarchy drill-down state (mirrored from `MapInner`), and lays out every HUD component around the map. |
| `app/layout.tsx` | Root layout — fonts, metadata, global CSS import. |
| `app/globals.css` | Tailwind base + global styles. |
| `lib/api.ts` | **The only place that talks to the intelligence-engine.** Base URL from `NEXT_PUBLIC_API_URL`, typed request functions (`listEvents`, `getArrivals`, `getFareEstimate`), `getWsUrl()`, and `toMapEvent()` (engine response shape → this app's component shape). |
| `lib/layers.ts` | `DOMAIN_REGISTRY` (toggleable domain groups: commute, public buildings, tactical feed) and `LAYER_REGISTRY` (base map tiles). |
| `lib/geo-utils.ts` | `hierarchyService` — CITY→CORP→WARD→BLOCK administrative hierarchy, built from `bbmp-wards.json` + `@turf/turf` polygon combining. |
| `lib/hierarchy.ts` | `BANGALORE_HIERARCHY` — maps Bangalore parliamentary constituencies to 5 corporation zones (North/South/East/West/Central), used for corp-zone event filtering. |
| `lib/categories.ts` | `CATEGORY_REGISTRY` — the one place an `EventCategory` maps to a display color/label. |
| `lib/overpass.ts` | OSM Overpass API client for `osm_points` layers (hospitals, govt offices, parks, etc.) — third-party public data, not the intelligence-engine. |
| `lib/admin-data.ts` | Static reference data for the `AdminDrawer`/`DomainBrowser` panels. |
| `lib/utils.ts` | `cn()` — Tailwind class-merging helper (shadcn/ui convention). |
| `components/Map/index.tsx` | SSR-safe wrapper — `dynamic(() => import('./MapInner'), { ssr: false })`. Leaflet cannot run server-side. |
| `components/Map/MapInner.tsx` | The actual Leaflet map: base tiles, admin hierarchy polygons (density-colored), metro lines/stations, OSM points, live event markers. Owns hierarchy drill-down interaction (click to drill in/retract). |
| `components/TopBar.tsx` | Top status bar — hierarchy breadcrumb, event count, WS connection indicator, category filter. |
| `components/EventTicker.tsx` | Bottom live-feed ticker — scrolling list of recent events. |
| `components/DisplayControl.tsx` | Floating visual-filter controls (brightness/contrast/hue/grayscale/invert on the map tiles). |
| `components/VisualControls.tsx` | `VisualState` type + the control panel `DisplayControl` renders. |
| `components/Sidebar.tsx` | Legacy/simplified commute panel — most of the real commute UI has moved to `components/HUD/CommuteDrawer.tsx`; the non-`isFloatingHUD` render path is explicitly marked deprecated in the code. |
| `components/LayerTree.tsx` | Recursive layer-toggle tree UI, used inside the Sidebar/HUD layer panels. |
| `components/HUD/CommandHUD.tsx` | Main floating HUD shell — hosts the domain browser, layer controls, and drawers (Commute, Admin). |
| `components/HUD/CommuteDrawer.tsx` | Full commute UI — Metro (static Purple/Green line route logic), Rail/BMTC/KSRTC (generic route planner hitting `getFareEstimate()`). |
| `components/HUD/CommutePanel.tsx` | Smaller commute summary panel (distinct from the full `CommuteDrawer`). |
| `components/HUD/ContextPanel.tsx` | Slide-in panel shown when drilled to WARD/BLOCK level — shows events/context for the focused area. |
| `components/HUD/ActiveStack.tsx` | Bottom-of-HUD active-layers bar with per-layer toggle + "flush all" action. |
| `components/HUD/AdminDrawer.tsx` | Administrative boundary browser drawer. |
| `components/HUD/DomainBrowser.tsx` | Domain/layer browser (commute, public buildings, tactical feed) inside the HUD. |
| `components/ui/*` | shadcn/ui primitives (`button`, `card`, `scroll-area`, `tabs`) — generated, not hand-authored; don't hand-edit without checking the shadcn convention this repo follows. |
| `public/*.json` | Static GeoJSON: `bbmp-wards.json` (BBMP ward polygons — also copied into `apps/intelligence-engine/src/wards/`, see that module's README for why there are two copies), `metro-lines.json`, `metro-stations.json`. |

## Known gaps (tracked, not forgotten)

- No test suite (see `CLAUDE.md` and [`../../docs/architecture/PUBLIC_MAP_STANDARDS_COMPLIANCE.md`](../../docs/architecture/PUBLIC_MAP_STANDARDS_COMPLIANCE.md)).
- `event.constituency` is a random placeholder, not derived from real ward/constituency data — see `CLAUDE.md`'s "Conventions" section.
- Two pre-existing TypeScript strict-mode errors (`components/HUD/CommuteDrawer.tsx`'s `Set` iteration under an `es5` target, `lib/geo-utils.ts`'s turf `GeometryCollection` typing) — present before the 2026-08-10 `/v1` adaptation work, not introduced by it, not yet fixed. Tracked in the standards-compliance doc.
- This app does not yet consume `GET /v1/events/heatmap`, `GET /v1/events/playback`, or `GET /v1/events?wardId=` (all landed on the engine 2026-08-10) — hydration currently only uses the plain paginated `GET /v1/events`. Wiring up the heatmap layer and playback timeline are real, separate frontend features, not built speculatively ahead of a UI design for them.

## Related docs

- [`../../docs/architecture/OVERVIEW.md`](../../docs/architecture/OVERVIEW.md) — where this app sits in the whole system.
- [`../../docs/architecture/DATA_FLOW.md`](../../docs/architecture/DATA_FLOW.md) — how an event moves end to end.
- [`../../docs/api/intelligence-engine.md`](../../docs/api/intelligence-engine.md) — the API contract this app consumes.
- [`../../docs/architecture/PUBLIC_MAP_STANDARDS_COMPLIANCE.md`](../../docs/architecture/PUBLIC_MAP_STANDARDS_COMPLIANCE.md) — audit against `docs/standards/frontend-engineering-standards.md`.
