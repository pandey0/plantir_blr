# Testing Standard

> **Ownership rule**: change what a test covers, add a new test tier, or change what pre-commit runs → update this doc in the same change.

## Framework: Vitest, not Jest

Native ESM + TypeScript support with no transform config to fight — this repo already requires `NodeNext` module resolution and `.js` import extensions (see root `CLAUDE.md`); Jest's ESM support is still a configuration exercise, Vitest's isn't. Faster too. No decision-log entry needed for this (not a "major" change per `TECH_STACK.md`'s criteria — swapping it later is cheap, nothing depends on Jest-specific APIs).

## Two tiers — they run in different places, don't conflate them

| Tier | Covers | Needs live DB? | Runs where |
|---|---|---|---|
| **`test:unit`** | Pure logic: Zod schema validation, `ingestion` adapters' `normalize()`, anything with no I/O | No | **Pre-commit hook**, every commit |
| **`test:integration`** | Auth guards, actual `geom` persistence, pagination behavior — via Fastify's `.inject()` (no port binding needed) against a real Postgres | Yes (`npm run infra:up` + migrated) | Manual (`npm run test:integration`) / CI once CI exists — **not** pre-commit |

**Real hazard hit while building this suite**: a failed test's cleanup can leave permanent orphan rows in the dev database if the failure happens before the cleanup code runs (e.g. an assertion throws mid-test, skipping a `finally` that was only partially written). 49 orphaned rows accumulated in the dev DB over the course of building this suite (mostly at the same default test coordinates `{latitude: 12.9, longitude: 77.6}` many tests share) and later silently inflated a bbox-scoped clustering test's counts, since that test's bbox happened to cover the same region. Symptom looked like a clustering bug; root cause was stale data from unrelated earlier test runs. If a bbox/radius/cluster test's assertions fail in a way that doesn't match the data you just created, check for orphaned rows (`SELECT COUNT(*) FROM "Event"` on the dev DB) before assuming the query logic is wrong. Mitigation: wrap event creation + assertions in `try`/`finally` so cleanup always runs regardless of where a test fails — not yet retrofitted onto every existing test in this file, worth doing incrementally as tests are touched.

**Why integration tests are excluded from pre-commit**: a hook that fails every commit when Docker happens to be down trains people to reach for `--no-verify`, which defeats the point of having a hook at all. Pre-commit only runs checks that work with zero external state.

## CI (CURRENT — `.github/workflows/ci.yml`)

Two jobs, matching the unit/integration split above:
- `build-and-unit-test` — typecheck, `test:unit`, `docs:api:check`. No external services.
- `integration-test` — real `postgis/postgis` service container, `prisma migrate deploy` (the CI/production-safe non-interactive command — never used locally in this repo before, `migrate dev`/`migrate reset` were; verified manually that `migrate deploy` behaves correctly against the existing migration history), then `test:integration`.

**Honesty note**: the workflow's individual commands (`prisma generate`, `prisma migrate deploy`, `docs:api:check`, both test tiers) were each verified locally before writing this file. The workflow YAML itself has not yet been observed running in real GitHub Actions — it hasn't been pushed/triggered as of this doc being written. If you're the first to see it run, and something in the YAML itself (not the commands) is wrong, fix forward and update this note.

## What pre-commit actually runs (CURRENT — `.husky/pre-commit`)

1. `scripts/check-docs-reminder.mjs` — non-blocking warning if source changed with no doc staged.
2. Typecheck (`npm run build` for `apps/intelligence-engine` + `packages/api-contracts`).
3. `test:unit` (both workspaces).
4. `npm run docs:api:check` — **blocking**, unlike the reminder script above. Verifies every route in `apps/intelligence-engine/src/routes/manifest.ts` has a documented heading in `docs/api/intelligence-engine.md`. This one is safe to block on (unlike "did any doc change") because it's a precise, deterministic, zero-false-positive check — a route either has a heading or it doesn't.

## Where tests live

Co-located with the code they test, `*.test.ts` next to the source file (e.g. `ingestion/index.ts` → `ingestion/index.test.ts`) — same "doc/test lives next to what it describes" convention as everything else in this repo, not a separate `tests/` tree that drifts out of sync with what it's testing.

## What "done" looks like — not a coverage percentage

No arbitrary coverage target. A module is adequately tested when its documented behavior (see that module's `README.md`) is exercised, especially the parts already flagged as bugs-once-found in this repo's docs (e.g. `geom` actually being persisted, not just accepted). Test the behavior described in the doc, not the implementation — a refactor that preserves behavior shouldn't break the tests.

## Current coverage (CURRENT — update as tests are added/removed)

| Area | Tier | File |
|---|---|---|
| `ingestion.citizenReportSource.normalize()` | unit | `apps/intelligence-engine/src/ingestion/index.test.ts` |
| `packages/api-contracts` Zod schemas | unit | `packages/api-contracts/src/schemas.test.ts` |
| Auth guards (401/403), `POST /v1/events` → `geom` persisted, status-transition state machine (409/404), `GET /v1/events` pagination shape | integration | `apps/intelligence-engine/src/index.integration.test.ts` |
| Transit request schemas (`getArrivalsRequestSchema`, `getFareEstimateRequestSchema`) | unit | `packages/api-contracts/src/schemas.test.ts` |
| bbox/radius query validation (`listEventsRequestSchema`) | unit | `packages/api-contracts/src/schemas.test.ts` |
| bbox/radius filtering actually discriminating inside vs. outside events (`geo-query.ts`) | integration | `apps/intelligence-engine/src/index.integration.test.ts` |
| Rate limiting (`POST /v1/events`, 10/min → 429) | integration | `apps/intelligence-engine/src/index.integration.test.ts` |
| Confidence scoring formula (reporter/evidence points, FRAUD penalty + clamp, unique-reporter dedup) | integration | `apps/intelligence-engine/src/index.integration.test.ts` |
| `list-cache.ts` coalescing/TTL/invalidation logic (mocked fetcher, no DB) | unit | `apps/intelligence-engine/src/events/list-cache.test.ts` |
| Cache doesn't serve stale data after a write (the property that actually matters) | integration | `apps/intelligence-engine/src/index.integration.test.ts` |
| `gridSizeMeters()` zoom→grid-size step function (VISION.md's 4 reference points) | unit | `apps/intelligence-engine/src/events/geo-query.test.ts` |
| `getEventClustersRequestSchema` validation | unit | `packages/api-contracts/src/schemas.test.ts` |
| Actual clustering (same-coordinate events merge, zoom≥17 stays unclustered) | integration | `apps/intelligence-engine/src/index.integration.test.ts` |
| `buildConfig()` env validation (defaults, prod requires JWT_SECRET, invalid NODE_ENV rejected) | unit | `apps/intelligence-engine/src/config.test.ts` |
| Standardized error response shape (`{ error: { code, message, details? } }`) | integration | `apps/intelligence-engine/src/index.integration.test.ts` |

Not yet covered (tracked, not forgotten): `transit.ts` (arguably lower priority — it's already documented as fully mocked, testing mocked-random-output has limited value until it's a real integration).
