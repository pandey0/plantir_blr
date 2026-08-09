# intelligence-engine — app-level rules

App-specific rules only. Repo-wide rules (doc ownership, tech-stack change policy, monorepo commands) are in root `/CLAUDE.md` and `docs/architecture/TECH_STACK.md` — read those first, this file doesn't repeat them. **All of [`../../docs/standards/`](../../docs/standards/) is binding** (root `CLAUDE.md` has the full 13-doc list with what each covers) — for this backend app, `backend-engineering-standards.md`, `authentication-security-`, `http-networking-`, `sql-database-`, `testing-`, `observability-operations-`, and `software-engineering-practices-engineering-standards.md` are the ones that come up most; check the relevant one before implementing, not just after. `backend-engineering-standards.md` has a formal audit — [`../../docs/architecture/STANDARDS_COMPLIANCE.md`](../../docs/architecture/STANDARDS_COMPLIANCE.md) — the others don't yet, do one before calling a module "compliant" with a standard rather than asserting it informally.

Start at [`src/README.md`](src/README.md) for the module map and current-vs-planned layout before editing.

## Conventions specific to this app

- **ESM `.js` extensions on every internal import**, even from `.ts` files (e.g. `from './transit.js'`) — required for Node ESM + `ts-node/esm`, not optional style.
- **PostGIS `geom` writes go through `prisma.$executeRaw` tagged templates**, never `$executeRawUnsafe` with manual string interpolation — Prisma has no native geography field type (see `packages/database/prisma/schema.prisma`'s `Event` model comment), and tagged-template `$executeRaw` parameterizes values safely. `events.createEvent()` (`src/events/index.ts`) is the one place this happens; route handlers call it, they don't run raw SQL themselves.
- **Auth**: `requireRole` (an array of roles, see `routes/manifest.ts`'s `Auth` type) as a Fastify `preHandler` on any mutating route. No route skips this except explicitly-public reads (`GET /v1/events`, `GET /v1/events/clusters`, `GET /v1/transit/*`) and dev-only routes.
- **Dev-only routes** (`/dev/inject`, `/dev/token`) are wrapped in `if (!isProduction) { ... }` at registration time, not a runtime check inside the handler — the route must not exist at all in production, not just 403.
- **Request validation**: every route handler that reads `request.body`/`request.query`/`request.params` validates with a Zod schema and returns 400 on failure. `zod` is a dependency specifically for this — don't add another validation library.
- **All event-mutating logic funnels through `events/`** (`createEvent()`, `updateStatus()` — see `src/events/README.md`). Route handlers (in `app.ts`) are HTTP glue, not where business logic lives; new-event sources normalize through an `ingestion/` `Source` adapter first (see `src/ingestion/README.md`).
- **App construction is separated from starting the server**: `app.ts`'s `buildApp()` returns the configured Fastify instance; `index.ts` is the only file that calls `.listen()`. Tests import `buildApp()` and use `.inject()` — never add code to `index.ts` itself beyond the listen bootstrap, or tests can't exercise it without a real port.

## Testing

Two tiers — see [`../../docs/architecture/TESTING.md`](../../docs/architecture/TESTING.md) for the full rationale.

```bash
npm run test:unit --workspace=apps/intelligence-engine         # no DB needed, runs in pre-commit
npm run test:integration --workspace=apps/intelligence-engine  # needs infra:up + db:migrate first
```

Integration tests use `buildApp()` + `.inject()` against the real dev Postgres, and clean up any rows they create in `afterEach` — see `src/index.integration.test.ts` for the pattern.

## Env vars

Validated at startup by `config.ts` (Zod), not read ad hoc from `process.env` in individual modules — an invalid/missing required var exits the process immediately with a clear message, per `docs/standards/backend-engineering-standards.md` Section 26. Import `{ config }` from `./config.js`, don't reach for `process.env` directly in new code.

- `NODE_ENV` — `development | production | test`, defaults to `development`.
- `JWT_SECRET` — required in production (process exits at startup if missing); falls back to a logged insecure dev default otherwise.
- `CORS_ORIGINS` — comma-separated allowlist, defaults to the three local frontend ports (3000, 3002, 3003).

**Not validated here**: `DATABASE_URL`. Prisma's generated client loads it itself from `packages/database/.env` via a path baked in at `prisma generate` time — it's never in `process.env` populated ahead of time by anything else. See [`../../docs/architecture/IMPLEMENTATION_NOTES.md`](../../docs/architecture/IMPLEMENTATION_NOTES.md).
