import axios from 'axios';
import { TransitMode } from '@plantir/api-contracts';
import { config } from './config.js';

// Intelligence Engine - Transit Adapter
//
// Landed 2026-08-10: this used to contain the mock arrival/fare logic directly
// (Math.random()-based). That logic has moved to a sibling repo,
// plantir-blr-data-service (FastAPI), behind a provider interface designed so a real
// upstream (BMTC/BMRCL feeds, a government API) can be plugged in there later with zero
// changes here or anywhere downstream (public-map) — see that repo's README.md for the
// provider pattern. This file is now a thin HTTP client, not where transit logic lives.
//
// DATA_SERVICE_URL (config.ts) points at it, defaulting to http://localhost:8000.

export interface ArrivalData {
  id: string;
  route: string;
  direction: string;
  eta: string;
  status: 'ON_TIME' | 'DELAYED' | 'APPROACHING';
  platform?: string;
}

export interface FareEstimate {
  fare: number;
  time: string;
}

// 5s timeout on every outbound call — this is the engine's first real outbound HTTP
// dependency (everything before this was either DB or fully mocked in-process), so this
// is also the first place docs/standards/http-networking-engineering-standards.md's
// "every outbound call needs a timeout" requirement actually applies. No retry: a failed
// request throws and the route handler's normal error path (global setErrorHandler, 500)
// takes it from there — no silent fallback to fake data, an unreachable dependency should
// be visible, not masked.
const client = axios.create({ baseURL: config.dataServiceUrl, timeout: 5000 });

export async function fetchLiveArrivals(station: string, mode: TransitMode): Promise<ArrivalData[]> {
  const res = await client.get<ArrivalData[]>('/transit/arrivals', { params: { station, mode } });
  return res.data;
}

export async function getFareEstimate(from: string, to: string, mode: TransitMode): Promise<FareEstimate> {
  const res = await client.get<FareEstimate>('/transit/estimate', { params: { from, to, mode } });
  return res.data;
}
