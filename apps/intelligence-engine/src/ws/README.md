# ws — WebSocket hub

> Status: **CURRENT** (extracted 2026-08-09, behavior unchanged from when it lived inline in what's now `app.ts`).
>
> **Ownership rule**: change fan-out behavior, add a second WS route, or change the broadcast payload shape → update this doc in the same change.

## Purpose

Push messages to every connected `public-map` client the moment an event is created or updated, so pulses/status changes appear on the map live instead of via polling.

## Current behavior (CURRENT)

- `registerWsHub(fastify)`: one route, `GET /ws`, upgrades to a WebSocket, adds the socket to a module-level `Set<WebSocket>` called `connections`, removes it on `close`.
- `broadcast(payload)`: `JSON.stringify`s the payload and calls `.send()` on every socket in `connections`, swallowing per-socket send errors so one dead socket doesn't break the loop.
- Called from `events/` (see [`../events/README.md`](../events/README.md)) after a write commits — `createEvent()` sends `{ type: 'NEW_EVENT', payload: {...} }`, `updateStatus()` sends `{ type: 'EVENT_UPDATED', payload: { id, status, updated_at } }` (added 2026-08-09 — previously deferred for `public-map` compatibility, confirmed safe: `public-map`'s WS handler is a plain `if (data.type === 'NEW_EVENT')`, so an unrecognized type is silently ignored, not an error).

## Scaling ceiling — read before touching this

`connections` is **per-process**. This works correctly for exactly one running engine instance. It silently stops working correctly (each instance only broadcasts to its own locally-connected clients) the moment you run more than one instance behind a load balancer — there's no error, just missed events on some clients.

**Do not add Redis pub/sub before you need it.** The trigger condition is specifically "we are now running >1 engine replica" (for HA or CPU headroom), not "the codebase looks single-instance." See [`../../../../docs/architecture/DATA_FLOW.md`](../../../../docs/architecture/DATA_FLOW.md) for the reasoning (this mirrors how a much larger reference system — worldmonitor.app — deliberately avoided pub/sub and isolated its one stateful process instead of building fan-out speculatively).

When the trigger condition is actually met, the upgrade is small since `ioredis` is already a dependency and Redis is already provisioned (`docker-compose.yml`):

1. Each instance still keeps its own local `connections` Set (unchanged).
2. `broadcast()` also publishes to a Redis channel (e.g. `events:broadcast`).
3. Each instance subscribes to that channel and re-broadcasts to its own local `connections` — so a publish from any instance reaches every client on every instance.

## Current interface

```ts
function registerWsHub(fastify: FastifyInstance): void   // registers GET /ws, owns `connections`
function broadcast(payload: object): void                 // called by events/ after a write
```

## Consumers

`events/` calls `broadcast()`. `app.ts`'s `buildApp()` calls `registerWsHub(fastify)` once. Nothing else imports this module — route handlers never call `broadcast()` directly, always go through `events/` so every write path fans out consistently.
