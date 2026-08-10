# public-map — Redesign Plan

> **Status: PROPOSED.** A plan, not yet implemented — written for alignment before building. Nothing here is CURRENT. Once a phase lands, move its items into [`UX_SPEC.md`](UX_SPEC.md) as CURRENT and delete them from here, don't let both docs describe the same feature indefinitely.
>
> **Ownership rule**: same as every other doc in this tree — if you implement a phase, update this doc and `UX_SPEC.md` in the same change.

## The actual problem

The current flow is organized around **administrative hierarchy** (CITY→CORP→WARD→BLOCK) because that's how the *data model* is shaped, not because that's how a real person thinks about "what's happening near me." Nobody opens a city map thinking "let me navigate to Bengaluru South corporation zone." They think "what's near me," "is my commute affected," or "what happened on my street this week." The redesign below reorganizes the flow around those jobs, keeps the admin hierarchy as a secondary/analytical layer (it's genuinely useful for the "which ward has the most complaints" question — just shouldn't be the *only* or *default* way in), and wires up three engine endpoints (`clusters`, `heatmap`, `playback`) that were built in the last session but have **zero frontend consumers today** — that's the single biggest "make it better for free" lever available, since it's backend work already paid for.

## Who's actually using this

| Persona | Job | Currently served? |
|---|---|---|
| Resident checking their own area | "What's near me right now?" | No — no search, no geolocation, must manually drill CORP→WARD→BLOCK to find their street |
| Commuter | "Is there a problem on my route today?" | Partially — Commute tab plans fares/times but has no awareness of live incidents on that route |
| Researcher/journalist/civic-tech | "Which areas repeatedly have issues? What happened over the last week?" | No — no playback UI, no ward-level stats view, despite the engine already having both `GET /v1/events/playback` and `?wardId=` filtering |
| First-time visitor | "What am I even looking at?" | No — no legend, no explanation of marker colors, confidence scores, or what a "report" even means |

## Redesign, by priority

### P0 — cheap, high-impact, zero backend changes

These use data the frontend already has in hand.

1. **Confidence-aware marker rendering.** `confidence_score` (0–100) is already on every fetched event and completely unused visually — every marker renders identically (`radius=8`, same opacity) regardless of whether it's a single unverified report or an authority-confirmed critical event. This is the actual core value proposition of a "trust layer" platform and it's currently invisible. Map to VISION.md's own bucket spec: `0–30` small/faint (radius ~5, opacity ~0.4), `30–60` standard, `60–80` emphasized (slightly larger, full opacity), `80–100` critical (largest, `animate-pulse`, small halo). One function (`getConfidenceStyle(score)`) in `lib/categories.ts` or a new `lib/confidence.ts`, consumed by `MapInner.tsx`'s existing marker render — no new data needed.
2. **A legend.** Nothing on screen today explains what a marker color means, what confidence looks like, or what LIVE/count badges mean. A collapsible legend (bottom-left or inside `DisplayControl`'s existing floating-controls pattern) listing category colors (`CATEGORY_REGISTRY`) and the confidence visual scale from item 1. Without this, item 1's entire payoff is illegible to a first-time visitor.
3. **"Near me" button.** Browser Geolocation API → `mapActionsRef.current.flyTo(lat, lon, 16)` (the imperative action already exists, unused for this). Single highest-value feature for the resident persona — turns "manually drill three admin levels to find my street" into one tap. No backend change; if geolocation permission is denied, fail silently to the current default view (don't block on it).
4. **Command-palette search (⌘K / Ctrl+K), not a plain text box.** Read worldmonitor's actual `src/components/SearchModal.ts`/`src/app/search-manager.ts` for this — their search is a registered-source architecture: `searchModal.registerSource(type, items[])`, each item `{id, title, subtitle, data}`, searched together with a 180ms trailing debounce, results capped (`MAX_RESULTS = 24`), and up to 8 recent searches persisted to `localStorage`. This fits `public-map`'s tactical-HUD aesthetic far better than a plain input, and the "register a source" shape scales cleanly: launch with two sources (ward names from `bbmp-wards.json`'s `name_en`, metro station names from `metro-stations.json` — both already parsed client-side, zero new fetches), and category/action commands ("filter: potholes", "near me") become a third source later without redesigning search itself. On selecting a location result, `flyTo()` it (reuses `MapActions`, same as item 3). **Explicitly NOT a real geocoder** (Nominatim etc.) in this phase — arbitrary-address search is a real external dependency decision, deferred to P2 if these two sources prove insufficient once used.
5. **Honest "how do I report" messaging.** `public-map` is deliberately read-only (VISION.md), but a real user will look for a report button and find nothing — currently silent, which reads as broken, not "intentional." A small, permanent, low-emphasis note (e.g. in `TopBar` or a footer strip) — "Reports come from citizens via a separate app" — manages the expectation honestly without needing the citizen-app to actually exist yet.
6. **Loading/error states.** Already specified in [`UX_SPEC.md`](UX_SPEC.md) — folded in here as part of the same "make it feel like a real product" pass, not a separate effort.

### P1 — backend already built, needs frontend wiring

These endpoints landed on `intelligence-engine` in the 2026-08-10 session and have never been called from `public-map`.

7. **Zoom-tiered rendering** (VISION.md's own spec, currently unbuilt): replace the current "always render every individual event marker regardless of zoom" behavior — which becomes an unreadable pile of overlapping dots once event counts grow past a few dozen — with:
   - **City zoom (≤10)**: `GET /v1/events/heatmap` — density gradient, no individual pins. Replaces (or layers under) the current 5-zone admin-polygon density coloring, which is coarse (5 buckets for the whole city) compared to a real grid heatmap.
   - **Ward/neighborhood zoom (10–16)**: `GET /v1/events/clusters?zoom=&bbox=` — clustered bubble markers with counts (`● 12`), exactly what the engine already returns and nothing currently consumes.
   - **Street zoom (17+)**: individual pins, confidence-styled per item 1.
   This is a genuinely large perceived-quality jump for near-zero backend cost — the hard part (grid aggregation, zoom-to-grid-size mapping) is already done and tested on the engine side.
8. **Richer event detail panel**, replacing the current 3-line Leaflet popup (category, location, "Score: X · STATUS"). Click a marker → slide-in panel (reuse `ContextPanel`'s existing slide-in mechanism/animation, don't invent a second panel style) showing: category + icon, a confidence badge with the *bucket label* (not just the raw number — VISION's Low/Moderate/High/Critical), status (with the transition history if available), time since first report, reporter count.
   **Real dependency, not free**: photo evidence (`mediaUrls`) is **not currently returned by `GET /v1/events`** — `listEvents()` doesn't `include` the `Evidence` relation (checked directly in `apps/intelligence-engine/src/events/index.ts`). Showing photos in this panel needs either a new `GET /v1/events/:id` detail endpoint (fetch-on-open, avoids bloating the list response with media nobody's viewing yet — preferred) or including evidence in the list query (worse, pays the cost for every event whether opened or not). **This is an engine change, flag it as such when scoping the work, don't assume the data is already there.**
9. **Status + time-range filtering.** `status` is already on every event (add filter pills next to the existing category pills — cheap). Time-range filtering can either be a light client-side filter over already-fetched events, or use `GET /v1/events/playback?from=&to=` for a real server-side range query once item 10 (below) exists to give it a UI home.

### P2 — bigger bets, real design/product decisions needed

10. **Playback timeline scrubber.** `GET /v1/events/playback` returns a time-ordered event history (VISION.md's "Playback Mode": "select a time window, map reconstructs city state, timeline animation shows event progression") with zero UI today. A bottom timeline control (date-range picker + play/pause, replacing or supplementing the live ticker in a "history mode" toggle) is the natural home for both this and item 9's time filtering. This is the feature that most directly serves the researcher/journalist persona and is explicitly named in VISION.md as core to the platform's long-term value ("which areas repeatedly face issues" — only answerable by looking at data *over time*, not a live snapshot).
11. **Design tokens + reusable panel-tabs** — already specified in [`UX_SPEC.md`](UX_SPEC.md), not repeated here.
12. **Mobile layout.** Not designed here — flagging the likely direction rather than deciding it: the bottom `EventTicker` becomes a swipeable bottom sheet, floating HUD panels become full-screen overlays below a breakpoint, fixed-pixel-width panels (`Sidebar`'s `w-[360px]`) get relative sizing. This is a real, separate design pass once P0/P1 prove the desktop flow is right — don't build both at once.
13. **Real geocoding search**, only if P0's local-name matching (item 4) proves insufficient for the commuter persona (arbitrary addresses, not just known landmarks/wards). A real decision (which geocoder, cost, rate limits) deferred until there's evidence local matching isn't enough.

## Explicitly not doing

- **Route-aware incident checking for the Commute tab** ("is there a problem on my route") — a real, valuable idea for the commuter persona, but needs the engine to correlate a planned route's stops against nearby events, which doesn't exist and isn't a small addition. Noted here so it's not forgotten, not designed prematurely.
- **Citizen reporting from `public-map`** — explicitly out of scope per VISION.md; item 5 above manages this honestly instead of building around it.

## Suggested sequencing

P0 items are independent of each other and of P1/P2 — any can land standalone. Recommended order within P0: **legend → confidence-aware markers → near-me → local search → report-messaging**, since the legend is what makes item 2 (confidence markers) actually legible to a new user, and near-me/search are the two biggest jobs-to-be-done wins. P1's zoom-tiered rendering (item 7) is the single highest-leverage next step after P0 — it's the difference between "works with 20 demo events" and "works with a real city's worth of reports."

## Related docs

- [`UX_SPEC.md`](UX_SPEC.md) — current design language, verified flows, and the smaller PLANNED items (design tokens, loading/error states) this plan builds on top of.
- [`../../docs/api/intelligence-engine.md`](../../docs/api/intelligence-engine.md) — `GET /v1/events/clusters`, `/heatmap`, `/playback` contracts referenced in P1/P2 above.
- [`../../docs/product/VISION.md`](../../docs/product/VISION.md) — the original source for zoom-tiered visualization, confidence buckets, and Playback Mode; this plan is largely "actually build what VISION.md already specified but was never implemented on the frontend."
