# routes — HTTP/WS route registration

> Status: **CURRENT** (`manifest.ts` is now the live source of truth, consumed 2026-08-09). `app.ts`'s `buildApp()` iterates `routeManifest` and registers each handler with the right method/path/auth — no more hand-called `fastify.get/post/patch` per route.
>
> **Ownership rule**: add/change/remove a route → update `manifest.ts` (registration) and [`../../../../docs/api/intelligence-engine.md`](../../../../docs/api/intelligence-engine.md) (reference) in the same change.

## Purpose

`manifest.ts` is the single source of truth for method/path/auth per route. `app.ts` reads it to register routes; each route's actual logic lives in a `handlers` map in `app.ts`, keyed by `rpc` name — routes do HTTP/WS glue only (parse+validate, call into `events/`/`ingestion/`, shape the response), no business logic.

## `manifest.ts` (CURRENT)

```ts
// routes/manifest.ts — actual current content
export const routeManifest = [
  { rpc: 'Health', method: 'GET', path: '/health', auth: 'none' },
  { rpc: 'CreateEvent', method: 'POST', path: '/v1/events', auth: ['citizen', 'authority'], rateLimit: { max: 10, timeWindow: '1 minute' } },
  { rpc: 'ListEvents', method: 'GET', path: '/v1/events', auth: 'none' },
  { rpc: 'UpdateEventStatus', method: 'PATCH', path: '/v1/events/:id/status', auth: ['authority'] },
  { rpc: 'GetArrivals', method: 'GET', path: '/v1/transit/arrivals', auth: 'none' },
  { rpc: 'GetFareEstimate', method: 'GET', path: '/v1/transit/estimate', auth: 'none' },
  { rpc: 'DevIssueToken', method: 'POST', path: '/dev/token', auth: 'none', devOnly: true },
  { rpc: 'DevInjectEvent', method: 'POST', path: '/dev/inject', auth: 'none', devOnly: true },
] as const;
```

`/health` and `/dev/*` are deliberately outside `/v1` — see [`../../../../docs/architecture/IMPLEMENTATION_NOTES.md`](../../../../docs/architecture/IMPLEMENTATION_NOTES.md#versioning).

`auth` is `Role[] | 'none'`, not a single `Role` — `CreateEvent` genuinely allows *either* `citizen` or `authority`, which a single-value field couldn't express honestly (an earlier version of this file had `auth: 'citizen'` for `CreateEvent`, which was actually wrong — `requireRole()` always accepted both roles; fixed when this became load-bearing rather than just documentation).

`proto/plantir/{events,transit}/v1/*.proto` exist and generate into `packages/api-contracts` (see its [`README.md`](../../../../packages/api-contracts/README.md)) — this project isn't using sebuf's annotation-driven HTTP generation (see [`../../../../docs/architecture/TECH_STACK.md`](../../../../docs/architecture/TECH_STACK.md) decision log for why), so this manifest is hand-maintained rather than generated from proto annotations. `scripts/check-api-docs.ts` (CURRENT, `npm run docs:api:check`, wired into pre-commit) verifies every route here has a documented heading in `docs/api/intelligence-engine.md` — it's a **drift check, not a doc generator**; the original plan to fully regenerate that doc from this file was deliberately dropped once the doc accumulated hand-written value a generator would destroy. See the `TECH_STACK.md` decision log.

## Consumers

`app.ts`'s `buildApp()` — iterates `routeManifest` **inside `fastify.after(...)`** (required — see [`../../../../docs/architecture/IMPLEMENTATION_NOTES.md`](../../../../docs/architecture/IMPLEMENTATION_NOTES.md#rate-limiting), registering too early makes `@fastify/rate-limit`'s per-route config silently no-op), skips `devOnly` entries when `NODE_ENV=production`, looks up the handler by `rpc` in its `handlers` map, registers with `requireRole(entry.auth)` as `preHandler` when `auth !== 'none'` and `config.rateLimit` when the entry has one. `index.ts` (bootstrap) only calls `buildApp()` + `.listen()`.
