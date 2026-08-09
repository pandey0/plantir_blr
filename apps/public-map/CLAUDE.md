# public-map — app-level rules

App-specific rules only. Repo-wide rules (doc ownership, tech-stack change policy, monorepo commands) are in root `/CLAUDE.md` — read that first, this file doesn't repeat them. **All of [`../../docs/standards/`](../../docs/standards/) is binding**, most relevantly `frontend-engineering-standards.md` for this app — see [`../../docs/architecture/PUBLIC_MAP_STANDARDS_COMPLIANCE.md`](../../docs/architecture/PUBLIC_MAP_STANDARDS_COMPLIANCE.md) for the current gap analysis.

Start at [`README.md`](README.md) for the module map before editing.

## Conventions specific to this app

- **All calls to the intelligence-engine go through `lib/api.ts`, nothing calls `fetch()` on an engine URL directly.** Before this file existed (until 2026-08-10), 4 different components each hardcoded `http://localhost:3001` and the pre-`/v1` unversioned paths — which is exactly how this app silently broke against the engine's `/v1` migration and stayed broken for a full session. One client, one base URL (`NEXT_PUBLIC_API_URL`, defaults to `http://localhost:3001`), one place to update when the engine's contract changes. If you add a new engine call, add it to `lib/api.ts`, don't inline a `fetch()`.
- **Engine response shapes are not this app's component shapes.** The engine returns `EngineEvent` (`category`, no `location`, `latitude`/`longitude` possibly `null`); every component in this app expects `MapEvent` (`type`, not `category`; `location` optional). `lib/api.ts`'s `toMapEvent()` is the one conversion point — don't have a component read `category` off an engine response directly.
- **WebSocket connects via `lib/api.ts`'s `getWsUrl()`**, derived from the same `NEXT_PUBLIC_API_URL` (scheme swapped `http`→`ws`), not a second independently-configured URL — the HTTP base and the WS base can never drift apart this way.
- **Leaflet only inside `components/Map/MapInner.tsx`, loaded via `next/dynamic({ ssr: false })` from `components/Map/index.tsx`.** Leaflet touches `window`/`document` at import time — importing it anywhere that can render server-side breaks the build. Don't import `leaflet` or `react-leaflet` from any other file.
- **`"use client"` is required at the top of every file in this app that uses hooks, browser APIs, or event handlers** — this is a Next.js App Router project (`app/` directory), not Pages Router; components are server components by default unless marked otherwise.
- **Category/color/label mappings live in `lib/categories.ts` (`CATEGORY_REGISTRY`) — the single source of truth for event category → color/label.** Don't hardcode a category's color or label string in a component; import from here so a new `EventCategory` value only needs updating in one place.
- **Admin hierarchy (CITY→CORP→WARD→BLOCK) drill-down state lives in `MapInner.tsx`, mirrored up to `page.tsx` via `onLevelChange`/`onCorpDrill` callbacks** — `page.tsx` doesn't own hierarchy logic itself, it just reflects it for the TopBar/ContextPanel. See `lib/geo-utils.ts`'s `hierarchyService`.
- **The `constituency` field on every event in state is a random placeholder** (`page.tsx`'s `randomConstituency()`), not real data — the engine has no ward/constituency data on an `Event` row (`wardId` is a read-side filter parameter, never written back onto the event; see `apps/intelligence-engine/src/wards/README.md`). Corp-zone filtering (`activeCorpId`) works against this placeholder today. Don't treat `event.constituency` as real without checking this file's date — it's a known gap, not a design decision to build on.

## Engine dependency

This app requires `apps/intelligence-engine` running (`npm run dev:engine`, port 3001) and `npm run infra:up` for the engine's own dependencies. `lib/api.ts` degrades gracefully if the engine is unreachable on page load (empty initial event list, WS shows disconnected) — it does not crash the app.

## Testing

No test suite exists for this app yet (see [`../../docs/architecture/PUBLIC_MAP_STANDARDS_COMPLIANCE.md`](../../docs/architecture/PUBLIC_MAP_STANDARDS_COMPLIANCE.md) — tracked as a deferred gap, not silently missing). Verify changes by running `npm run dev:map` and checking in a browser; `npm run lint` (Next's built-in ESLint config) and `npx tsc --noEmit` are the only automated checks today.

## Env vars

- `NEXT_PUBLIC_API_URL` — intelligence-engine base URL. Optional, defaults to `http://localhost:3001` in `lib/api.ts`. See `.env.example`. Must be `NEXT_PUBLIC_`-prefixed (Next.js requirement for any env var read in client-side code — this app is entirely client components for anything touching the engine).
