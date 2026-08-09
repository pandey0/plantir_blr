# public-map — internals

> **Ownership rule**: add/move/rename a file here → update this map in the same change.

Next.js 14 (App Router) + Leaflet. The main UI — a public, read-only map visualizing city events, transit, and administrative boundaries. Connects to `apps/intelligence-engine` over HTTP (`lib/api.ts`) and WebSocket (`/ws`) — see that app's own docs for the API contract this depends on, and [`../../docs/architecture/DATA_FLOW.md`](../../docs/architecture/DATA_FLOW.md) for how an event gets from a citizen report to a marker on this map.

## Current file layout (CURRENT)

| Path | Responsibility |
|---|---|
| `app/page.tsx` | Top-level client component. Owns event state (initial hydration + WS live updates), layer/domain toggle state, hierarchy drill-down state (mirrored from `MapInner`), and lays out every HUD component around the map. |
| `app/layout.tsx` | Root layout — fonts, metadata, global CSS import. |
| `app/globals.css` | Tailwind base + global styles. |
| `lib/*` | Engine API client, static reference data, domain constants — see [`lib/README.md`](lib/README.md) for the full breakdown. |
| `components/Map/*` | The Leaflet map itself — see [`components/Map/README.md`](components/Map/README.md). |
| `components/TopBar.tsx` | Top status bar — hierarchy breadcrumb, event count, WS connection indicator, category filter. |
| `components/EventTicker.tsx` | Bottom live-feed ticker — scrolling list of recent events. |
| `components/DisplayControl.tsx` | Floating visual-filter controls (brightness/contrast/hue/grayscale/invert on the map tiles). |
| `components/VisualControls.tsx` | `VisualState` type + the control panel `DisplayControl` renders. |
| `components/Sidebar.tsx` | Legacy/simplified commute panel — most of the real commute UI has moved to `components/HUD/CommuteDrawer.tsx`; the non-`isFloatingHUD` render path is explicitly marked deprecated in the code. |
| `components/LayerTree.tsx` | Recursive layer-toggle tree UI, used inside the Sidebar/HUD layer panels. |
| `components/HUD/*` | Floating command-center UI shell — domain browser, layer controls, commute drawer, drill-down context panel. See [`components/HUD/README.md`](components/HUD/README.md) for the full breakdown and composition. |
| `components/ui/*` | shadcn/ui primitives (`button`, `card`, `scroll-area`, `tabs`) — generated, not hand-authored; don't hand-edit without checking the shadcn convention this repo follows. |
| `public/*.json` | Static GeoJSON: `bbmp-wards.json` (BBMP ward polygons — also copied into `apps/intelligence-engine/src/wards/`, see that module's README for why there are two copies), `metro-lines.json`, `metro-stations.json`. |

## Known gaps (tracked, not forgotten)

- No test suite (see `CLAUDE.md` and [`../../docs/architecture/PUBLIC_MAP_STANDARDS_COMPLIANCE.md`](../../docs/architecture/PUBLIC_MAP_STANDARDS_COMPLIANCE.md)).
- `event.constituency` is a random placeholder, not derived from real ward/constituency data — see `CLAUDE.md`'s "Conventions" section.
- Two pre-existing TypeScript strict-mode errors (`components/HUD/CommuteDrawer.tsx`'s `Set` iteration under an `es5` target, `lib/geo-utils.ts`'s turf `GeometryCollection` typing) — present before the 2026-08-10 `/v1` adaptation work, not introduced by it, not yet fixed. Tracked in the standards-compliance doc.
- This app does not yet consume `GET /v1/events/heatmap`, `GET /v1/events/playback`, or `GET /v1/events?wardId=` (all landed on the engine 2026-08-10) — hydration currently only uses the plain paginated `GET /v1/events`. Wiring up the heatmap layer and playback timeline are real, separate frontend features, not built speculatively ahead of a UI design for them.

## Related docs

- [`UX_SPEC.md`](UX_SPEC.md) — UI/UX design language, flows, and open design requirements.
- [`lib/README.md`](lib/README.md), [`components/Map/README.md`](components/Map/README.md), [`components/HUD/README.md`](components/HUD/README.md) — module-level docs, same granularity as `intelligence-engine`'s (see that app's `src/README.md` for the pattern this follows).
- [`../../docs/architecture/OVERVIEW.md`](../../docs/architecture/OVERVIEW.md) — where this app sits in the whole system.
- [`../../docs/architecture/DATA_FLOW.md`](../../docs/architecture/DATA_FLOW.md) — how an event moves end to end.
- [`../../docs/api/intelligence-engine.md`](../../docs/api/intelligence-engine.md) — the API contract this app consumes.
- [`../../docs/architecture/PUBLIC_MAP_STANDARDS_COMPLIANCE.md`](../../docs/architecture/PUBLIC_MAP_STANDARDS_COMPLIANCE.md) — audit against `docs/standards/frontend-engineering-standards.md`.
