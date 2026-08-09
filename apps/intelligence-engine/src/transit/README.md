# transit — CURRENT

> Code currently lives at `apps/intelligence-engine/src/transit.ts` (flat file, not yet in this folder). This doc sits at the planned path; treat `../transit.ts` as the real source until it moves here.
>
> **Ownership rule**: change `transit.ts`'s exports or behavior → update this doc in the same change.

## Purpose

Transit-arrival and fare-estimate data for the BMRCL metro and BMTC bus network, consumed by `GET /transit/arrivals` and `GET /transit/estimate` (see [`../../../../docs/api/intelligence-engine.md`](../../../../docs/api/intelligence-engine.md)).

## ⚠️ Known state: fully mocked, no real data source

Neither function calls a real transit API today, despite `axios` being imported. **Do not assume this returns live data.**

- `fetchLiveArrivals(station, mode)` — `transit.ts:15`. Returns `Math.random()`-generated ETAs and statuses. Comments (`transit.ts:17,22`) note the intended real integration (IUDX / Namma Yatri / BMRCL APIs) but it isn't wired up.
- `calculateFare(from, to, mode)` — `transit.ts:72`. Returns a random fare in a plausible range, not a real distance/tier calculation.

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

function fetchLiveArrivals(station: string, mode: 'METRO' | 'BUS'): Promise<ArrivalData[]>
function calculateFare(from: string, to: string, mode: 'METRO' | 'BUS'): number
```

## Consumers

`app.ts` — `GET /transit/arrivals`, `GET /transit/estimate`. No other module depends on this today.

## Gotchas

- `fetchLiveArrivals` swallows all errors and returns `[]` (`transit.ts:65-68`) — a caller can't distinguish "no arrivals" from "upstream failed," which will matter once a real API is wired in.
- Station/route names are Bangalore-specific hardcoded strings (`Purple Line`, `KIA-9`, etc.) — not derived from `station`/`mode` params beyond branching on `mode`.
