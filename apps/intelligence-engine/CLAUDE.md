# intelligence-engine — app-level rules

App-specific rules only. Repo-wide rules (doc ownership, tech-stack change policy, monorepo commands) are in root `/CLAUDE.md` and `docs/architecture/TECH_STACK.md` — read those first, this file doesn't repeat them.

Start at [`src/README.md`](src/README.md) for the module map and current-vs-planned layout before editing.

## Conventions specific to this app

- **ESM `.js` extensions on every internal import**, even from `.ts` files (e.g. `from './transit.js'`) — required for Node ESM + `ts-node/esm`, not optional style.
- **PostGIS `geom` writes go through `prisma.$executeRaw` tagged templates**, never `$executeRawUnsafe` with manual string interpolation — Prisma has no native geography field type (see `packages/database/prisma/schema.prisma`'s `Event` model comment), and tagged-template `$executeRaw` parameterizes values safely. `createEventWithGeom()` in `index.ts` is the one place this happens; route handlers call it, they don't run raw SQL themselves.
- **Auth**: `requireRole('citizen' | 'authority')` as a Fastify `preHandler` on any mutating route. No route skips this except explicitly-public reads (`GET /events`, `GET /transit/*`) and dev-only routes.
- **Dev-only routes** (`/dev/inject`, `/dev/token`) are wrapped in `if (!isProduction) { ... }` at registration time, not a runtime check inside the handler — the route must not exist at all in production, not just 403.
- **Request validation**: every route handler that reads `request.body`/`request.query`/`request.params` validates with a Zod schema and returns 400 on failure. `zod` is a dependency specifically for this — don't add another validation library.
- **All event-mutating logic funnels through one function** (`createEventWithGeom` today; `events.createEvent()` once the planned `events/` module lands — see `src/events/README.md`). Route handlers are HTTP glue, not where business logic lives.

## Env vars

- `JWT_SECRET` — required in production (throws at boot if missing); falls back to a logged insecure dev default otherwise.
- `CORS_ORIGINS` — comma-separated allowlist, defaults to the three local frontend ports (3000, 3002, 3003).
