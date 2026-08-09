# Troubleshooting & Resolution Log

> Moved here from root `TROUBLESHOOTING.md` during doc reorganization. **Ownership rule**: hit and solve a non-obvious technical hurdle → append a new entry here in the same change, don't let it live only in your head or a commit message.

This document tracks technical hurdles encountered during development and the solutions implemented to maintain a fluid, "plug and play" architecture.

---

## 1. Docker Compose Connectivity Error
**Issue:** `urllib3.exceptions.URLSchemeUnknown: Not supported URL scheme http+docker`
**Symptoms:** `npm run infra:up` fails with a Python traceback related to `docker-compose`.
**Root Cause:** Incompatibility between the installed `docker-compose` (v1) and the environment's Python/Docker socket configuration.
**Status:** System-level constraint.
**Workaround/Solution:**
- If `docker-compose` fails, try using the newer `docker compose` (V2) command.
- Ensure the Docker daemon is running and the user has permissions to access `/var/run/docker.sock`.
- Manual fallback: Run `docker run --name plantir_db -p 5432:5432 -e POSTGRES_PASSWORD=plantir_secret_password -d postgis/postgis:15-3.3`.

---

## 2. Prisma Configuration Module Not Found
**Issue:** `Error: Cannot find module 'dotenv/config'` or `'prisma/config'` when running `prisma generate`.
**Root Cause:** The `prisma.config.ts` file was attempting to use modules not yet installed or recognized by the Prisma CLI in the monorepo context.
**Solution:**
- Removed `packages/database/prisma.config.ts`.
- Switched to standard Prisma behavior: using `.env` files automatically loaded by the CLI.
- Added `dotenv` as an explicit dependency to `packages/database`.

---

## 3. PostGIS Geography Type Support in Prisma
**Issue:** Prisma does not have native, first-class support for the `geography` type in the `schema.prisma` file, making it difficult to perform spatial queries via the standard API.
**Solution:**
- **The "Hybrid" Approach:** Defined the standard metadata in `schema.prisma`.
- **Raw SQL for Spatial:** Use `prisma.$executeRaw`/`$executeRawUnsafe` in the Intelligence Engine to handle `ST_MakePoint` and `ST_SetSRID` for the `geom` column.
- This ensures high-performance spatial indexing without being limited by the ORM's current capabilities.
- **Caveat found 2026-08-09**: this pattern was documented before it was actually implemented — the `geom` column and its raw-SQL write were missing from the codebase entirely until the Phase 0 fix. See [`api/intelligence-engine.md`](api/intelligence-engine.md) and [`../apps/intelligence-engine/src/events/README.md`](../apps/intelligence-engine/src/events/README.md). Lesson: don't let a "solved" entry here get ahead of what's actually in the code — verify before trusting this log for a design decision.

---

## 4. Monorepo Workspace Dependency Resolution
**Issue:** `npm install` in one workspace occasionally failed to link shared packages.
**Solution:**
- Configured `package.json` with explicit `workspaces` array.
- Used `npm run <script> --workspace=<name>` to ensure context-aware execution.

---

## 5. ESM (ECMAScript Modules) Support in TypeScript
**Issue:** `ECMAScript imports and exports cannot be written in a CommonJS file`.
**Root Cause:** The project was using `import/export` syntax but `package.json` did not specify `"type": "module"`, and `tsconfig.json` was not configured for ESM.
**Solution:**
- Added `"type": "module"` to `apps/intelligence-engine/package.json`.
- Updated `tsconfig.json` to use `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`.
- Updated the `dev` script to use `node --loader ts-node/esm`.

---

## 6. Prisma Type Mismatch in 1-to-Many Relations
**Issue:** `Type '{ user_id: string; description: string | undefined; }' is not assignable to type ...` during event creation.
**Root Cause:** The `reports` field in the `Event` model is an array (`Report[]`). Prisma requires an array for the `create` operation when using the nested create syntax for multiple potential reports.
**Solution:** Changed `reports: { create: { ... } }` to `reports: { create: [{ ... }] }`.

---

## 7. docker-compose Postgres port mapped to the wrong container-side port
**Issue:** `docker-compose.yml` had `ports: ["5433:5433"]` for the `db` service. Container came up healthy (the healthcheck runs `pg_isready` *inside* the container, unaffected by port mapping), but nothing outside the container could actually reach Postgres on host port 5433.
**Root Cause:** The `postgis/postgis` image listens on Postgres's default `5432` inside the container unless `PGPORT` is explicitly set — it wasn't. Host-side `5433` was mapped to a container-side `5433` that nothing was listening on.
**Solution:** Changed to `ports: ["5433:5432"]` — host 5433 (our documented non-default port) mapped to the container's real default 5432. Found while applying the `geom` migration (2026-08-09) — the healthcheck passing masked this until an actual client tried to connect.

---

## 8. `prisma migrate reset` blocked when invoked by Claude Code
**Issue:** Prisma refuses to run `migrate reset` (or other destructive commands) when it detects it's being invoked by an AI agent, printing an explanation and exiting rather than prompting interactively.
**Root Cause:** Prisma has a built-in guard specifically for AI-agent-driven sessions, requiring explicit human consent before any irreversible database operation.
**Solution:** Get explicit user confirmation first (not implicit from earlier conversation — Prisma's own message is explicit that prior consent doesn't count), then re-run with `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="<exact text of the user's consent message, no newlines/quotes>"` set in the environment. Only use this on a database you've verified is a dev/empty database — the guard existing at all is a signal to slow down, not a checkbox to clear.
