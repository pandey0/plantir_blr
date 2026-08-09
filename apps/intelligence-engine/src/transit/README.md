# transit — CURRENT

> Code lives at `apps/intelligence-engine/src/transit.ts` (flat file, not this folder — matches the rest of this app's convention of docs living one level up from where the file historically was expected).
>
> **Ownership rule**: change `transit.ts`'s exports or behavior → update this doc in the same change.

## Purpose

Transit-arrival and fare-estimate data for the BMRCL metro and BMTC bus network, consumed by `GET /v1/transit/arrivals` and `GET /v1/transit/estimate` (see [`../../../../docs/api/intelligence-engine.md`](../../../../docs/api/intelligence-engine.md)).

## Landed 2026-08-10: no longer where the mock logic lives

`transit.ts` used to contain the `Math.random()`-based mock arrival/fare logic directly. That logic has moved to a sibling repo, **`plantir-blr-data-service`** (FastAPI, `../../../../../plantir-blr-data-service` relative to this monorepo's root) — this file is now a thin HTTP client (`axios`, 5s timeout, no retry) calling that service's `/transit/arrivals`/`/transit/estimate` endpoints. Behavior is unchanged (the data service's `MockTransitProvider` is a faithful port of what used to be here), but **this engine no longer generates the mock data itself**.

**Why**: `plantir-blr-data-service` is architected around a provider interface (`TransitProvider`/`GeoProvider`) so a real upstream (BMTC/BMRCL feeds, a government open-data API) can be plugged in there later as a new provider class — with zero changes needed here or in `public-map`. See that repo's `README.md` for the pattern. This engine only needs to know that service's HTTP contract, never its internals.

**Still fully mocked underneath**, just relocated — do not assume this returns live data. See the data service's own `README.md`/`app/providers/mock.py` for exactly what's mocked.

## Configuration

`DATA_SERVICE_URL` env var (`config.ts`, optional, defaults to `http://localhost:8000`) — must be a valid URL if set (Zod `.url()`, fails fast at startup like every other config value, see `docs/architecture/IMPLEMENTATION_NOTES.md`'s Environment section).

## Public interface

```ts
interface ArrivalData {
  id: string;
  route: string;
  direction: string;
  eta: string;
  status: 'ON_TIME' | 'DELAYED' | 'APPROACHING';
  platform?: string;
}

interface FareEstimate {
  fare: number;
  time: string;
}

function fetchLiveArrivals(station: string, mode: 'METRO' | 'BUS'): Promise<ArrivalData[]>
function getFareEstimate(from: string, to: string, mode: 'METRO' | 'BUS'): Promise<FareEstimate>
```

**Renamed from `calculateFare` (sync, returned only a number) to `getFareEstimate` (async, returns `{ fare, time }`)** — `app.ts`'s `GetFareEstimate` handler previously hardcoded `time: '28 mins'` regardless of input because the old function only computed a fare; the data service actually returns both, so the hardcoded value is gone.

## Consumers

`app.ts` — `GET /v1/transit/arrivals`, `GET /v1/transit/estimate`. No other module depends on this today.

## Error handling

**No fallback, no swallowed errors** — this reverses the previous documented behavior (`fetchLiveArrivals` used to catch everything and return `[]`, which meant a caller could never distinguish "no arrivals" from "upstream failed"). Now: if `plantir-blr-data-service` is unreachable or times out (5s), the `axios` call throws, propagates through the route handler, and hits the global `setErrorHandler` (500 `INTERNAL_ERROR`, logged in full server-side) — see `docs/architecture/IMPLEMENTATION_NOTES.md`'s Error handling conventions section. An unreachable dependency should be visible, not masked as "no data."

## Gotchas

- This is the engine's **first real outbound HTTP dependency** — everything before this was either the database or fully in-process mock logic. If you add another outbound call anywhere else in this app, apply the same pattern: explicit timeout, no silent fallback, per `docs/standards/http-networking-engineering-standards.md`.
- `plantir-blr-data-service` has no auth today (internal-only assumption, see its own README) — if it's ever exposed beyond localhost, this needs revisiting before that happens, not after.
