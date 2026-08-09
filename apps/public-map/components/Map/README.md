# components/Map — internals

> **Ownership rule**: change map rendering, drill-down behavior, or add a new layer type → update this doc in the same change.

The Leaflet map itself — base tiles, administrative hierarchy polygons, metro lines/stations, OSM points, live event markers. This is the single most complex component tree in the app.

## Files

| File | Responsibility |
|---|---|
| `index.tsx` | SSR-safe wrapper. `dynamic(() => import('./MapInner'), { ssr: false })` — **required, not stylistic**: Leaflet touches `window`/`document` at import time, so importing it into any code path that can render server-side breaks the Next.js build. This is the only file in the app allowed to reference `MapInner` from a server-renderable context. |
| `MapInner.tsx` | The actual map. Owns: hierarchy drill-down state machine (CITY→CORP→WARD→BLOCK, click to drill in, click tiles/retract button to go back out), GeoJSON loading for `bbmp-wards.json`/`metro-lines.json`/`metro-stations.json` (via `/public/*.json`, not `lib/api.ts` — see `../../lib/README.md`), OSM Overpass layer fetching (`lib/overpass.ts`), density-based heat coloring for admin polygons (event count per corp/constituency), metro station popups (arrivals lookup via `lib/api.ts`'s `getArrivals()`), and live event markers. |

## Hierarchy drill-down (`MapInner.tsx`)

State: `currentLevel` (`HierarchyType`: `CITY | CORP | WARD | BLOCK`), `activeId`, `activeName`, `visibleHierarchy` (`HierarchyLevel[]`, the polygons currently rendered).

Flow:
```
Click a CORP polygon
    ↓
onLayerClick() → hierarchyService.getWardsForCorp(id)
    ↓
currentLevel = 'WARD', map.fitBounds() to the corp's bbox
    ↓
Click a WARD polygon → currentLevel = 'BLOCK' (terminal — no further drill)
    ↓
Click the tile layer (not a polygon) or the TopBar's retract control → handleRetract()
    ↓
Steps back one level (BLOCK→WARD→CORP), CORP is the terminal retract level
```

`onLevelChange`/`onCorpDrill` props mirror this state up to `page.tsx` so `TopBar`/`ContextPanel` can reflect it — `MapInner` is the source of truth for drill state, `page.tsx` does not compute it independently.

`isProcessing` gates a full-screen "Syncing_Context" overlay during the ~50ms `setTimeout` transition — deliberately not instant, gives the drill-down a perceptible "loading" beat rather than an instant jarring polygon swap. See `lib/geo-utils.ts`'s `hierarchyService` for how each level's polygons are actually computed (turf.js combining ward features by corp-zone membership).

## Density coloring

`corpDensityMap`/`constDensityMap` (`useMemo`, derived from the `events` prop) count events per corp-zone / per-constituency. `getDensityColor(count, maxCount)` maps a 0-1 ratio to a 4-step amber→red heat scale — `null` (not zero) means "no incidents, use the corp's own base color at low opacity" vs. an actual heat color. This is purely visual, computed client-side from whatever events are currently in state — not backed by the engine's `GET /v1/events/heatmap` (landed 2026-08-10, not yet consumed here — see `../../README.md`'s Known gaps).

## Metro station popups

Two-phase: `bindPopup()` sets a "Loading arrivals..." placeholder synchronously (`buildStationPopupHTML(..., null)`), then the station's `click` handler calls `lib/api.ts`'s `getArrivals()` and calls `setPopupContent()` with the real result once it resolves (or an empty-state HTML string on failure). **`buildStationPopupHTML()` builds raw HTML strings, not JSX** — this is how Leaflet's `bindPopup`/`setPopupContent` work (outside React's render tree), and means the interpolated values are NOT auto-escaped the way JSX would. Currently safe because station names and arrival data are hardcoded/engine-generated, not user-supplied — see [`../../docs/architecture/PUBLIC_MAP_STANDARDS_COMPLIANCE.md`](../../../docs/architecture/PUBLIC_MAP_STANDARDS_COMPLIANCE.md) row #27 for the full security note. **Live event markers do NOT use this pattern** — they render via `<Popup><div>{...}</div></Popup>` (JSX, auto-escaped); don't copy `buildStationPopupHTML`'s raw-string approach for anything that touches event/user data.

## Related docs

- [`../../README.md`](../../README.md) — app-wide module map.
- [`../../lib/README.md`](../../lib/README.md) — `geo-utils.ts`'s `hierarchyService`, `api.ts`.
