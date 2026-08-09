# @plantir/api-contracts

> **Ownership rule**: change a `.proto` file under `proto/`, or `src/schemas.ts` → regenerate (`npm run proto:generate` from repo root) and update this doc + [`../../docs/architecture/TECH_STACK.md`](../../docs/architecture/TECH_STACK.md) status if the shape of what's exported changes.

## Purpose

The one shared, versioned definition of the engine's API contract: message shapes and enums generated from `proto/plantir/**/v1/*.proto` via `ts-proto`, plus hand-kept Zod schemas (`src/schemas.ts`) built on those same generated enums. Consumed by `intelligence-engine`'s `/v1/` routes since 2026-08-09 (see below); `public-map`, `citizen-app`, `authority-portal` are future consumers once they need typed API calls instead of ad hoc `fetch`.

## Regenerating

```bash
npm run proto:generate   # from repo root — runs `buf generate` in proto/
npm run build --workspace=packages/api-contracts
```

`src/generated/` is generator output (`DO NOT EDIT` header on every file) — never hand-edit it, edit the `.proto` source and regenerate.

## Wired into `apps/intelligence-engine`'s routes (CURRENT, since 2026-08-09)

`app.ts` and `ingestion/index.ts` use this package's generated types and `src/schemas.ts` directly for request validation and response typing. The enum boundary problem this deferred earlier — `@prisma/client`'s `EventCategory`/`EventStatus` are a *different* nominal TS type from this package's, despite identical string values — is solved at exactly one point: `apps/intelligence-engine/src/events/prisma-enum.ts`'s `toPrismaCategory`/`toPrismaStatus`, called only where `events/index.ts` talks to Prisma. Don't add another conversion site elsewhere; see [`../../docs/architecture/IMPLEMENTATION_NOTES.md`](../../docs/architecture/IMPLEMENTATION_NOTES.md#enum-boundary-prisma--api-contracts).

## What's here

- `src/generated/plantir/{events,transit}/v1/*.ts` — ts-proto output. Enums generated as TS string enums (`stringEnums=true` in `proto/buf.gen.yaml`) so values are the literal strings (`"POTHOLE"`, not a proto zero-indexed number) — directly usable by `z.nativeEnum(...)`.
- `src/schemas.ts` — Zod request schemas for events and transit, built on the generated enums. Used directly by `intelligence-engine`'s `/v1/` routes.
- `src/index.ts` — the package's public surface. Uses explicit named re-exports, not `export *` — ts-proto duplicates internal plumbing types (`DeepPartial`, `Exact`, `MessageFns`, `protobufPackage`) into every generated file, which collide under a wildcard re-export across multiple files. None of those are meaningful outside the generated code itself.

## Why no service/RPC-level codegen

`buf.gen.yaml` sets `outputServices=false` — no client stub, no server interface generated. This project isn't using gRPC transport or sebuf's HTTP-annotation-driven generation (see [`../../docs/architecture/TECH_STACK.md`](../../docs/architecture/TECH_STACK.md) decision log for why not sebuf); the actual REST method/path/auth mapping is hand-maintained in [`../../apps/intelligence-engine/src/routes/manifest.ts`](../../apps/intelligence-engine/src/routes/manifest.ts). Generating unused service stubs here would be dead code.
