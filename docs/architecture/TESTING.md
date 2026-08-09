# Testing Standard

> **Ownership rule**: change what a test covers, add a new test tier, or change what pre-commit runs → update this doc in the same change.

## Framework: Vitest, not Jest

Native ESM + TypeScript support with no transform config to fight — this repo already requires `NodeNext` module resolution and `.js` import extensions (see root `CLAUDE.md`); Jest's ESM support is still a configuration exercise, Vitest's isn't. Faster too. No decision-log entry needed for this (not a "major" change per `TECH_STACK.md`'s criteria — swapping it later is cheap, nothing depends on Jest-specific APIs).

## Two tiers — they run in different places, don't conflate them

| Tier | Covers | Needs live DB? | Runs where |
|---|---|---|---|
| **`test:unit`** | Pure logic: Zod schema validation, `ingestion` adapters' `normalize()`, anything with no I/O | No | **Pre-commit hook**, every commit |
| **`test:integration`** | Auth guards, actual `geom` persistence, pagination behavior — via Fastify's `.inject()` (no port binding needed) against a real Postgres | Yes (`npm run infra:up` + migrated) | Manual (`npm run test:integration`) / CI once CI exists — **not** pre-commit |

**Why integration tests are excluded from pre-commit**: a hook that fails every commit when Docker happens to be down trains people to reach for `--no-verify`, which defeats the point of having a hook at all. Pre-commit only runs checks that work with zero external state.

## Where tests live

Co-located with the code they test, `*.test.ts` next to the source file (e.g. `ingestion/index.ts` → `ingestion/index.test.ts`) — same "doc/test lives next to what it describes" convention as everything else in this repo, not a separate `tests/` tree that drifts out of sync with what it's testing.

## What "done" looks like — not a coverage percentage

No arbitrary coverage target. A module is adequately tested when its documented behavior (see that module's `README.md`) is exercised, especially the parts already flagged as bugs-once-found in this repo's docs (e.g. `geom` actually being persisted, not just accepted). Test the behavior described in the doc, not the implementation — a refactor that preserves behavior shouldn't break the tests.

## Current coverage (CURRENT — update as tests are added/removed)

| Area | Tier | File |
|---|---|---|
| `ingestion.citizenReportSource.normalize()` | unit | `apps/intelligence-engine/src/ingestion/index.test.ts` |
| `packages/api-contracts` Zod schemas | unit | `packages/api-contracts/src/schemas.test.ts` |
| Auth guards (401/403), `POST /report` → `geom` persisted, `GET /events` pagination shape | integration | `apps/intelligence-engine/src/index.integration.test.ts` |

Not yet covered (tracked, not forgotten): `events.updateStatus()`, `transit.ts` (arguably lower priority — it's already documented as fully mocked, testing mocked-random-output has limited value until it's a real integration), confidence scoring (doesn't exist yet).
