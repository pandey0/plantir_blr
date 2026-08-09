# public-map — UI/UX Spec

> **Status: CURRENT + PLANNED, mixed** — sections are labeled. This documents the UI/UX as it actually behaves today (verified in Chrome, 2026-08-10) plus the concrete requirements to close the gaps `PUBLIC_MAP_STANDARDS_COMPLIANCE.md` already flagged. Not a redesign proposal — this app's "tactical command HUD" visual identity is already distinctive and deliberate; this spec formalizes it and closes real gaps, it doesn't replace it.
>
> **Ownership rule**: change a flow, add a panel, or change what a component does → update the relevant section here in the same change.

## Design language (CURRENT)

A dark "command center" aesthetic — full-viewport map, floating glass-morphism HUD panels, monospace/uppercase-tracked micro-labels, CRT scanline overlay, pulsing live-status dots. This is closer to a SOC/NOC dashboard than a consumer map app, which matches the product's actual audience (VISION.md: public observability, not citizen self-service).

Concretely, from the current codebase:
- Background: near-black (`bg-black`), map tiles filtered via `DisplayControl` (brightness/contrast/hue/grayscale/invert).
- Panels: `bg-zinc-950`/`bg-black` with `border-zinc-800`, rounded-xl/2xl corners, `backdrop-blur`.
- Typography: `text-[9px]`–`text-[11px]` for HUD chrome, `font-black`, `tracking-[0.2em]`–`tracking-[0.3em]` uppercase for labels — deliberately terse/technical, not conversational.
- Category colors: `lib/categories.ts`'s `CATEGORY_REGISTRY` (orange=pothole, green=garbage, blue=water-logging, red=traffic, yellow=street-light, purple=construction, gray=other).
- Live indicators: pulsing dot (`animate-pulse`) + "LIVE"/red badge count in `TopBar`, matching `wsConnected` state.

## Requirement: formal design tokens (PLANNED — closes `PUBLIC_MAP_STANDARDS_COMPLIANCE.md` #5)

**Problem**: colors are hex literals scattered across `lib/layers.ts`, `lib/categories.ts`, and inline component styles (`#00f2ff`, `#ff0055`, etc.) — no single source of truth beyond category colors, which are already centralized correctly.

**Inspiration, adapted from worldmonitor** (`src/styles/main.css` — read directly from their source, not guessed): a layered CSS custom-property system, not a component library:
```css
/* Surface hierarchy */
--bg, --bg-secondary, --surface, --surface-hover, --surface-active
/* Borders, three weights */
--border, --border-strong, --border-subtle
/* Text, five weights of de-emphasis */
--text, --text-secondary, --text-dim, --text-muted, --text-faint
/* Semantic severity scale, WCAG-contrast-checked against its own background */
--semantic-critical, --semantic-high, --semantic-elevated, --semantic-normal, --semantic-low
/* Status indicators */
--status-live, --status-cached, --status-unavailable
```
This maps almost directly onto what `public-map` already needs conceptually (event severity/confidence, WS live/disconnected status, hierarchy-level emphasis) but currently expresses ad hoc per-component. **Requirement**: introduce `app/globals.css` custom properties for exactly these three groups (surface, text, semantic-severity) and migrate `lib/categories.ts` + the HUD components' inline hex values to reference them. Do not introduce a full design-token *build pipeline* (Style Dictionary, etc.) — a CSS custom-property layer is enough at this app's size, matching worldmonitor's own choice (they don't use a token build tool either, just CSS variables).

## Requirement: loading state on initial hydration (PLANNED — closes compliance doc #14)

**Current**: `page.tsx`'s `listEvents({ limit: 20 })` on mount has no loading indicator — `EventTicker` already has an empty state ("Scanning_Signals...") that happens to cover this by coincidence, but the map itself gives no signal that a fetch is in flight vs. genuinely has zero events.

**Requirement**: a `hydrating` boolean state in `page.tsx`, true until `listEvents()` resolves (success or failure), passed to `TopBar` to show a distinct "SYNCING" state distinct from `wsConnected`'s "LIVE"/disconnected — reuse the visual language `MapInner.tsx`'s drill-down already has (`Loader2` spinner + `Syncing_Context` label), don't invent a second loading-spinner style.

## Requirement: visible error state for a failed hydration/reconnect (PLANNED — closes compliance doc #15)

**Current**: if the engine is unreachable on load, `listEvents()`'s `.catch()` is silent — the map just stays empty with the exact same visual as "genuinely zero events right now," and `TopBar`'s WS indicator is the only signal something's wrong (and only for the WS connection, not the initial HTTP fetch).

**Requirement, minimal**: a single dismissible banner (not a full toast system — that's real infra this app doesn't need yet for one error case) shown when `listEvents()` rejects, worldmonitor-style ("Intelligence gap tracker explicitly reports data source outages rather than silently hiding them" — `docs/architecture.mdx`'s "Show what you can't see" principle, directly applicable here). Text: "Can't reach the intelligence engine — showing cached/live data only" or similar, not a raw error message per `frontend-engineering-standards.md`'s error-state guidance.

## Flow: page load → live map (CURRENT, verified in Chrome)

```
Page loads
    ↓
useState(mounted=false) → renders black placeholder div (avoids SSR/CSR map mismatch)
    ↓
useEffect fires:
  1. listEvents({limit:20}) → GET /v1/events → populate `events` state
  2. new WebSocket(getWsUrl()) → connects to /ws
    ↓
MapInner's own useEffect fires independently:
  fetch /bbmp-wards.json, /metro-lines.json, /metro-stations.json (static, NOT via lib/api.ts — see lib/README.md)
    ↓
hierarchyService.setRawData(wards) → getCorporationLevels() → render CORP-level polygons
    ↓
Map interactive: pan/zoom/drill immediately: event markers appear as `events` state populates
```

**Verified working** (Chrome, 2026-08-10): hydration returns 200 with real `latitude`/`longitude` (engine fix, same day); a `/dev/inject`-triggered event appeared in the Live_Feed ticker and density coloring within ~1s of the WS push, no reload needed.

## Flow: administrative drill-down (CURRENT)

```
CORP level (default) → click a zone polygon → WARD level (fitBounds to zone bbox)
    ↓
click a ward polygon → BLOCK level (terminal, fitBounds to ward bbox)
    ↓
click the base tile layer (not a polygon), or TopBar's retract control → step back one level
```

`ContextPanel` slides in only at WARD/BLOCK level, showing events filtered to the focused area + `AdminDrawer` (officials/helplines, static data). See `components/Map/README.md` for the state machine detail.

## Flow: commute planning (CURRENT)

```
Click COMMUTE icon (left rail) → CommandHUD expands → CommuteDrawer
    ↓
Tab: METRO (static Purple/Green line lookup, no network call)
   | RAIL / BMTC / KSRTC (generic planner → GET /v1/transit/estimate, mode=BUS)
    ↓
Select From/To → Plan/Scan → result card (fare, time) or "—"/"—" on failure
```

**Verified working** (Chrome, 2026-08-10): METRO tab returns a real multi-stop route (via static line data, no API); BMTC tab confirmed hitting `/v1/transit/estimate?...&mode=BUS` with a 200 response and real fare/ETA — this was broken before the 2026-08-10 fix (`apiMode` values didn't match the engine's enum).

## Panel/tab pattern: adopt worldmonitor's `.panel-tabs` convention (PLANNED, minor)

`CommuteDrawer.tsx`'s tab switcher is bespoke per-instance styling. Worldmonitor's `panel-tabs`/`panel-tab` CSS (`src/styles/panels.css`, referenced by their own comment as "gold standard: Telegram Intel style") is a reusable pattern worth adopting almost verbatim: horizontal scroll with a right-edge fade-mask hint (`mask-image: linear-gradient(...)`) when tabs overflow, rather than hard-clipping or wrapping. **Requirement**: extract `CommuteDrawer`'s tab bar into a small reusable `components/ui/panel-tabs.tsx` (shadcn-style primitive, matching this app's existing `components/ui/tabs.tsx` convention) with this overflow-fade behavior, then use it anywhere else a horizontal tab set appears (currently only `CommuteDrawer`, but `ContextPanel`'s category breakdown is a plausible second user).

## Explicitly out of scope for this spec

- **Mobile/responsive redesign** — flagged as unconfirmed-intentional in the compliance doc (#23), not decided here. This is a desktop command-center app; a mobile spec is a separate decision.
- **Citizen-reporting UI** — belongs to the unbuilt `citizen-app`, not `public-map` (VISION.md is explicit that `public-map` is read-only).
- **Heatmap/playback UI** — the engine now has `GET /v1/events/heatmap`/`GET /v1/events/playback` (landed 2026-08-10), but no UI consumes them yet. A real spec for these needs its own design pass (heatmap layer toggle? timeline scrubber component?) — not speculatively designed here ahead of that decision.

## Related docs

- [`README.md`](README.md) — module map.
- [`CLAUDE.md`](CLAUDE.md) — app-wide engineering conventions.
- [`../../docs/architecture/PUBLIC_MAP_STANDARDS_COMPLIANCE.md`](../../docs/architecture/PUBLIC_MAP_STANDARDS_COMPLIANCE.md) — the standards audit this spec's "Requirement" sections close gaps from.
- worldmonitor.app's `src/styles/main.css`/`panels.css` and `docs/architecture.mdx` — external reference project, cited by name per section above rather than copied wholesale; see `docs/architecture/REFERENCES.md` for this repo's existing convention of tracking where borrowed ideas came from.
