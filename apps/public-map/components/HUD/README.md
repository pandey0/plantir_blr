# components/HUD — internals

> **Ownership rule**: add/rename a HUD panel or change how they compose → update this doc in the same change.

The floating "command center" UI shell — domain browsing, layer toggles, commute planning, and context-sensitive panels shown around the edges of the full-screen map (`components/Map/`).

## Files

| File | Responsibility |
|---|---|
| `CommandHUD.tsx` | The main HUD shell — a left-edge icon rail (`activeDomain` state) that expands into a panel per domain. Hosts `CommuteDrawer` directly; other domains render inline. Receives `layers`/`domains`/`visuals` from `page.tsx` and passes toggle/change callbacks straight through. |
| `CommuteDrawer.tsx` | Full commute planning UI — Metro tab (static Purple/Green line route lookup, no API call), Rail/BMTC/KSRTC tabs (generic route planner calling `lib/api.ts`'s `getFareEstimate()`, `mode` always `'METRO'`/`'BUS'` — see `../../CLAUDE.md`'s note on why these three tabs' `apiMode` was fixed 2026-08-10). Also toggles the domain's map layers (metro lines/stations, BMTC depots, KSRTC terminals). |
| `CommutePanel.tsx` | A smaller, simpler commute summary — distinct from `CommuteDrawer`, shows transit layer status (`LIVE`/`STALE`/`STUB`) without the full route-planner UI. Check which one a given surface actually renders before assuming "the commute UI" means one specific file. |
| `ContextPanel.tsx` | Slides in when `MapInner`'s drill-down reaches `WARD`/`BLOCK` level (`level`/`name`/`corpId` props, mirrored from `MapInner` via `page.tsx`). Shows events filtered to the focused area, category breakdown, and embeds `AdminDrawer` for officials/helplines. |
| `AdminDrawer.tsx` | Administrative contact info (officials, helplines) per hierarchy level — static data from `lib/admin-data.ts` (`ZONE_ADMIN`, `WARD_ADMIN_TEMPLATE`, `HELPLINES`), not fetched from the engine. |
| `DomainBrowser.tsx` | Renders `DOMAIN_REGISTRY` (`lib/layers.ts`) as a browsable icon grid with per-layer toggle switches — the "what layers exist and are they on" view, distinct from `ActiveStack`'s "what's currently on" view below. |
| `ActiveStack.tsx` | Bottom-of-HUD bar listing only the currently-*active* non-base, non-realtime layers, each with a quick remove (×) toggle, plus a "flush all" action. Renders nothing (`return null`) when no optional layers are active — realtime/tactical-feed and base-map layers are deliberately excluded from this view (they're controlled elsewhere / always relevant). |

## Composition

```
page.tsx
 ├── CommandHUD                    (domain browser, hosts CommuteDrawer)
 │    └── CommuteDrawer
 ├── ContextPanel                  (WARD/BLOCK drill-down only)
 │    └── AdminDrawer
 └── ActiveStack                   (bottom bar, active-layers-only)
```

`DomainBrowser` and `CommutePanel` exist as components but aren't both wired into `page.tsx`'s top-level render today — check `CommandHUD.tsx`'s actual render tree before assuming a given panel is live in the current UI versus available-but-unused.

## Shared conventions

- Every file here takes `layers`/`onToggleLayer` (or a subset) as props rather than reading `lib/layers.ts`'s registries directly — `page.tsx` owns the mutable layer-visibility state, these are presentational.
- Category colors/labels always go through `lib/categories.ts` (`getCategoryColor`/`getCategoryLabel`), never a hardcoded hex/string — see `../../lib/README.md`.
- None of these components call `lib/api.ts` directly except `CommuteDrawer.tsx` — if you add a new panel that needs engine data, follow that pattern (call `lib/api.ts`, don't reach for `fetch()`).

## Related docs

- [`../../README.md`](../../README.md) — app-wide module map.
- [`../../CLAUDE.md`](../../CLAUDE.md) — app-wide conventions (API client rule, `MapEvent` shape, etc.).
