# routes — HTTP/WS route registration

> Status: **`manifest.ts` exists (PLANNED extraction of registration itself)**. Today all routes are still registered inline in `../app.ts`'s `buildApp()`, now with real `requireRole()` auth guards and Zod validation per handler (Phase 0 landed 2026-08-09). `manifest.ts` documents that reality — it's read by nothing yet; `app.ts`'s registration hasn't been refactored to consume it.
>
> **Ownership rule**: add/change/remove a route → update [`../../../../docs/api/intelligence-engine.md`](../../../../docs/api/intelligence-engine.md) in the same change (that's the full request/response reference; this doc only covers how routes get registered).

## Purpose

Routes here do HTTP/WS glue only — parse+validate the request, call into `events/` or `ingestion/` (never Prisma or the WS hub directly), shape the response. No business logic lives here.

## `manifest.ts` (exists, not yet consumed)

`proto/plantir/{events,transit}/v1/*.proto` exist and generate into `packages/api-contracts` (see its [`README.md`](../../../../packages/api-contracts/README.md)) — but since this project isn't using sebuf's annotation-driven HTTP generation (see [`../../../../docs/architecture/TECH_STACK.md`](../../../../docs/architecture/TECH_STACK.md) decision log for why), the method/path/auth mapping is a small hand-maintained manifest, kept at **current, unversioned paths** to match what's actually registered today (not `/v1/` yet — that prefix lands with the future cutover, not before):

```ts
// routes/manifest.ts — actual current content
export const routeManifest = [
  { rpc: 'Health', method: 'GET', path: '/health', auth: 'none' },
  { rpc: 'CreateEvent', method: 'POST', path: '/report', auth: 'citizen' },
  { rpc: 'ListEvents', method: 'GET', path: '/events', auth: 'none' },
  { rpc: 'UpdateEventStatus', method: 'PATCH', path: '/events/:id/status', auth: 'authority' },
  { rpc: 'GetArrivals', method: 'GET', path: '/transit/arrivals', auth: 'none' },
  { rpc: 'GetFareEstimate', method: 'GET', path: '/transit/estimate', auth: 'none' },
  { rpc: 'DevIssueToken', method: 'POST', path: '/dev/token', auth: 'none', devOnly: true },
  { rpc: 'DevInjectEvent', method: 'POST', path: '/dev/inject', auth: 'none', devOnly: true },
] as const;
```

The `auth` values already match what `app.ts` actually enforces via `requireRole()` — this file documents that mapping in one place; it doesn't drive anything yet. Two things still need to happen before it's load-bearing: (1) `app.ts`'s route registration gets refactored to iterate this manifest instead of calling `fastify.get/post/patch` directly per route, and (2) a `docs:api` script reads it (plus proto comments) to regenerate `docs/api/intelligence-engine.md` instead of that file being hand-maintained.

## Consumers

`app.ts` (`buildApp()`) is where this would be consumed once registration is refactored. `index.ts` (bootstrap) only calls `buildApp()` + `.listen()` — it doesn't touch routes directly. Nothing imports `routes/` today — it's the outermost layer, not yet wired to anything.
