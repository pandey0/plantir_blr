# Troubleshooting & Resolution Log

This document tracks technical hurdles encountered during the development of the Bangalore City Intelligence Platform and the solutions implemented to maintain a fluid, "plug and play" architecture.

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
- **Raw SQL for Spatial:** Used `prisma.$executeRawUnsafe` in the Intelligence Engine to handle `ST_MakePoint` and `ST_SetSRID` for the `geom` column.
- This ensures high-performance spatial indexing without being limited by the ORM's current capabilities.

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
