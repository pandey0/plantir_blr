// Hand-maintained source of truth for HTTP method/path/auth per RPC — consumed by
// app.ts's buildApp() to register routes. See ../../../../docs/architecture/DATA_FLOW.md
// for why this isn't proto-annotation-driven (no sebuf), and ./README.md for background.
//
// /health and /dev/* are deliberately NOT under /v1 — health checks and dev-only tooling
// aren't part of the versioned API contract.

export type Role = 'citizen' | 'authority';
export type Auth = Role[] | 'none';

export interface RouteManifestEntry {
  rpc: string;
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  auth: Auth;
  /** true only for routes not registered at all when NODE_ENV=production */
  devOnly?: boolean;
  /** Per-route override; only routes that need one carry it. Keyed by client IP by default
   *  (see docs/architecture/IMPLEMENTATION_NOTES.md for the known proxy-IP limitation). */
  rateLimit?: { max: number; timeWindow: string };
}

export const routeManifest: readonly RouteManifestEntry[] = [
  { rpc: 'Health', method: 'GET', path: '/health', auth: 'none' },
  {
    rpc: 'CreateEvent',
    method: 'POST',
    path: '/v1/events',
    auth: ['citizen', 'authority'],
    // Real-world reason for the specific number: a citizen walking a street reporting several
    // distinct potholes in a few minutes is legitimate; a script hammering this endpoint to
    // inflate event counts or spam confidence-scoring inputs is not. 10/min allows the former,
    // meaningfully throttles the latter. Not tuned against real traffic — revisit once there is any.
    rateLimit: { max: 10, timeWindow: '1 minute' },
  },
  { rpc: 'ListEvents', method: 'GET', path: '/v1/events', auth: 'none' },
  // Static path, registered ahead of the /:id/status param route below for readability — Fastify's
  // router (find-my-way) prioritizes static segments over parametric ones regardless of
  // registration order, so this ordering doesn't actually affect matching, just document clarity.
  { rpc: 'GetEventClusters', method: 'GET', path: '/v1/events/clusters', auth: 'none' },
  { rpc: 'GetHeatmap', method: 'GET', path: '/v1/events/heatmap', auth: 'none' },
  { rpc: 'GetEventsPlayback', method: 'GET', path: '/v1/events/playback', auth: 'none' },
  { rpc: 'UpdateEventStatus', method: 'PATCH', path: '/v1/events/:id/status', auth: ['authority'] },
  { rpc: 'GetArrivals', method: 'GET', path: '/v1/transit/arrivals', auth: 'none' },
  { rpc: 'GetFareEstimate', method: 'GET', path: '/v1/transit/estimate', auth: 'none' },
  { rpc: 'DevIssueToken', method: 'POST', path: '/dev/token', auth: 'none', devOnly: true },
  { rpc: 'DevInjectEvent', method: 'POST', path: '/dev/inject', auth: 'none', devOnly: true },
] as const;
