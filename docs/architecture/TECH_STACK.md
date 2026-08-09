# Tech Stack & Architecture Rules

> **Ownership rule**: this doc is updated continuously as the project evolves — same change as the code, no exceptions, same as every other doc in this tree (see [`../README.md`](../README.md)).
>
> **Change policy — read before proposing a major change**: routine changes (new route, new field, new adapter, bugfix, new small dependency) get documented here or in the relevant module doc in the same change, no sign-off needed. **Major changes require explicit user confirmation before implementation** — see "What counts as major" below. Propose it, mark it `PROPOSED` in the table, wait for a go-ahead, then implement and flip the status.

## Core principles

- **Modular monolith first.** Extract a separate service only when a real scale number forces it, not speculatively.
- **No Kubernetes, microservices, Kafka, event sourcing, or CQRS** until scale actually demands them. Not on the table at current size.
- **One always-on stateful service** (`intelligence-engine` — holds WS connections + DB pool) vs. **stateless/edge-friendly frontends**. Don't blur this line without discussion.
- **Don't add infra ahead of the trigger that justifies it** — e.g. Redis pub/sub only once we're actually running >1 engine instance, not because it "seems like the scalable thing to do." See [`DATA_FLOW.md`](DATA_FLOW.md) for the specific trigger conditions already identified.
- **Docs precede implementation** for new modules/sources — write the module's `README.md` (purpose, interface, data flow) before the code, per [`../README.md`](../README.md).

## Current stack, per app/package

| App/package | Stack | Status |
|---|---|---|
| `apps/intelligence-engine` | Fastify 5, TypeScript (ESM, `.js` import extensions required), Prisma, PostgreSQL+PostGIS, Redis (`ioredis` — provisioned, not yet used), Zod (imported, not yet used for validation), axios | CURRENT |
| `apps/public-map` | Next.js 14 (App Router), React 18, Leaflet + react-leaflet, @turf/turf, Tailwind, Radix UI, lucide-react | CURRENT |
| `apps/citizen-app` | Vite + React, TypeScript | Stub only |
| `apps/authority-portal` | Vite + React, TypeScript | Stub only |
| `packages/database` | Prisma schema + migrations (raw SQL for PostGIS-specific pieces) | CURRENT |
| `packages/api-contracts` | Zod schemas + `ts-proto`-generated types from `proto/`. Builds clean, not yet consumed by any route — see its own [`README.md`](../../packages/api-contracts/README.md) for why. | CURRENT (scaffolded, unconsumed) |
| `proto/` | Protocol Buffers, `buf` CLI (npm-distributed via `@bufbuild/buf`, no Go toolchain) + `ts-proto` for TS codegen (`stringEnums=true`, `outputServices=false`). Explicitly **not** using worldmonitor's `sebuf` (its plugins are Go-built; decided against adding a Go toolchain to this Node-only monorepo — see decision log below). No lint/breaking-change enforcement yet (`proto/buf.yaml` is deliberately minimal). | CURRENT — `events` and `transit` domains defined |

## Decision log

Chronological, newest first. Every entry here was either a direct user call or is flagged `PROPOSED` awaiting one.

| Date | Decision | Why |
|---|---|---|
| 2026-08-09 | Protobuf via `buf` + `ts-proto` (Node-only), not `sebuf` | `sebuf`'s HTTP-annotation-driven codegen (used by reference project worldmonitor.app) requires Go-built plugins. User chose to keep the toolchain pure-Node rather than add Go for codegen only. Cost: we hand-maintain the RPC→HTTP path/method mapping (`routes/manifest.ts`) instead of getting it generated from proto annotations. |
| 2026-08-09 | Restructure focuses on `intelligence-engine` only; `public-map`/`citizen-app`/`authority-portal` untouched for now | User confirmed scope — matches the "data coming in from other sources" framing being a backend/ingestion concern. |
| 2026-08-09 | Docs precede code; every module/component/API gets a doc, updated in the same change as the code it describes; major architecture changes need explicit confirmation before implementation | User directive — this file and [`../README.md`](../README.md) exist to enforce it. |
| 2026-08-09 | Phase 0 landed: `@fastify/jwt` role-based auth (`citizen`/`authority`) on mutating routes, `geom` migration + persisted writes, Zod validation, cursor pagination on `GET /events`, CORS allowlist, `/health`. Not logged as a separate `PROPOSED` item — this was already-agreed scope from the architecture review, not a new major decision. | Closes the Phase 0 gaps identified during the architecture skill review (open `/dev/inject`, unpersisted coordinates, unbounded `GET /events`, wildcard CORS). See [`../api/intelligence-engine.md`](../api/intelligence-engine.md) for what's actually enforced. `/dev/token` is an explicit placeholder, not a real login flow — building one is a separate, larger decision. |
| 2026-08-09 | Phase 1 landed: `proto/plantir/{events,transit}/v1/*.proto`, `buf`+`ts-proto` toolchain, `packages/api-contracts` generated + building. `routes/manifest.ts` written (documents current routes, not yet consumed by `index.ts`'s registration). Current unversioned routes intentionally left on `@prisma/client` enums, not switched to the generated ones — see `packages/api-contracts/README.md` "Not yet wired in" for the TS nominal-typing reason. | Continuation of the already-agreed proto adoption, not a new major decision. The cutover to `/v1` routes using these generated types is the next increment, deliberately not bundled into this one to avoid an unnecessary type-cast at the Prisma boundary for zero behavior change. |
| 2026-08-09 | Phase 2 landed: `events/`, `ws/`, `ingestion/` extracted from `index.ts` per their already-written specs, wired in (route *handlers* now call these modules; route *registration* stays inline — `routes/`'s extraction is still separately deferred). `citizen-report` is the first real `Source` adapter. One behavior change beyond pure extraction: `PATCH /events/:id/status` still does not broadcast — flagged, not bundled in, since a new WS payload shape needs a `public-map`-side change and this restructure stays engine-only. | Matches the already-agreed module boundaries from `events/README.md`/`ws/README.md`/`ingestion/README.md`, not a new decision. Added a shared `db.ts` Prisma singleton (wasn't in the original module docs) to avoid each new module opening its own connection pool — small, uncontroversial, documented in `src/README.md`. |

## What counts as "major" (needs your confirmation first)

- Adding a new datastore, message queue, or third-party infra vendor.
- Swapping a framework (Fastify, Next.js, Prisma, etc.) or the protobuf toolchain decided above.
- Splitting any module out into a separately-deployed service (breaks "modular monolith first").
- Introducing Kubernetes, microservices, Kafka, event sourcing, or CQRS.
- Adding an auth provider or changing the auth architecture (JWT vs. sessions vs. OAuth, etc.).
- Anything that changes a decision already logged above.

Everything else — new routes, new fields, new adapters following an already-agreed pattern, dependency bumps, bugfixes — proceeds without asking, documented as it happens.
