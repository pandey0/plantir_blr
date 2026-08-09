// Hand-maintained source of truth for HTTP method/path/auth per RPC.
// See ../../../../docs/architecture/DATA_FLOW.md for why this isn't proto-annotation-driven
// (no sebuf), and ./README.md for the extraction plan this feeds into.
//
// Not yet wired into index.ts's route registration — routes are still registered
// directly there. This exists now so docs/api generation and the eventual
// registration refactor have one place to read from, per the doc-precedes-code rule.

export type Role = 'citizen' | 'authority';
export type Auth = Role | 'none';

export interface RouteManifestEntry {
  rpc: string;
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  auth: Auth;
  /** true only for routes not registered at all when NODE_ENV=production */
  devOnly?: boolean;
}

export const routeManifest: readonly RouteManifestEntry[] = [
  { rpc: 'Health', method: 'GET', path: '/health', auth: 'none' },
  { rpc: 'CreateEvent', method: 'POST', path: '/report', auth: 'citizen' },
  { rpc: 'ListEvents', method: 'GET', path: '/events', auth: 'none' },
  { rpc: 'UpdateEventStatus', method: 'PATCH', path: '/events/:id/status', auth: 'authority' },
  { rpc: 'GetArrivals', method: 'GET', path: '/transit/arrivals', auth: 'none' },
  { rpc: 'GetFareEstimate', method: 'GET', path: '/transit/estimate', auth: 'none' },
  { rpc: 'DevIssueToken', method: 'POST', path: '/dev/token', auth: 'none', devOnly: true },
  { rpc: 'DevInjectEvent', method: 'POST', path: '/dev/inject', auth: 'none', devOnly: true },
] as const;
