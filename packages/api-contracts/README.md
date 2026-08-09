# @plantir/api-contracts

> **Ownership rule**: change a `.proto` file under `proto/`, or `src/schemas.ts` → regenerate (`npm run proto:generate` from repo root) and update this doc + [`../../docs/architecture/TECH_STACK.md`](../../docs/architecture/TECH_STACK.md) status if the shape of what's exported changes.

## Purpose

The one shared, versioned definition of the engine's API contract: message shapes and enums generated from `proto/plantir/**/v1/*.proto` via `ts-proto`, plus hand-kept Zod schemas (`src/schemas.ts`) built on those same generated enums. Intended consumer: any app that needs to agree on `Event`/`EventCategory`/etc. shapes with `intelligence-engine` — today that's only the engine itself (partially, see below); `public-map`, `citizen-app`, `authority-portal` are future consumers once they need typed API calls instead of ad hoc `fetch`.

## Regenerating

```bash
npm run proto:generate   # from repo root — runs `buf generate` in proto/
npm run build --workspace=packages/api-contracts
```

`src/generated/` is generator output (`DO NOT EDIT` header on every file) — never hand-edit it, edit the `.proto` source and regenerate.

## ⚠️ Not yet wired into `apps/intelligence-engine`'s current routes

This is deliberate, not an oversight. `index.ts`'s current (unversioned) routes still import `EventCategory`/`EventStatus` from `@prisma/client` and use hand-written Zod schemas inline — **not** this package. Two independently-generated enum types (`@prisma/client`'s and this package's) happen to share identical string values by design (see `proto/plantir/events/v1/event.proto`'s comment), but TypeScript string enums are nominally typed, not structurally — passing one where the other is expected requires a cast at the boundary. Rather than introduce that cast into working, tested code for no behavior change, the swap is deferred to the `/v1` route migration (see [`../../apps/intelligence-engine/src/routes/README.md`](../../apps/intelligence-engine/src/routes/README.md)), where routes move wholesale to this package's types anyway. Building against `import`s from `@prisma/client` today is unaffected and correct.

## What's here

- `src/generated/plantir/{events,transit}/v1/*.ts` — ts-proto output. Enums generated as TS string enums (`stringEnums=true` in `proto/buf.gen.yaml`) so values are the literal strings (`"POTHOLE"`, not a proto zero-indexed number) — directly usable by `z.nativeEnum(...)`.
- `src/schemas.ts` — Zod request schemas for the planned `/v1` routes, built on the generated enums.
- `src/index.ts` — the package's public surface. Uses explicit named re-exports, not `export *` — ts-proto duplicates internal plumbing types (`DeepPartial`, `Exact`, `MessageFns`, `protobufPackage`) into every generated file, which collide under a wildcard re-export across multiple files. None of those are meaningful outside the generated code itself.

## Why no service/RPC-level codegen

`buf.gen.yaml` sets `outputServices=false` — no client stub, no server interface generated. This project isn't using gRPC transport or sebuf's HTTP-annotation-driven generation (see [`../../docs/architecture/TECH_STACK.md`](../../docs/architecture/TECH_STACK.md) decision log for why not sebuf); the actual REST method/path/auth mapping is hand-maintained in [`../../apps/intelligence-engine/src/routes/manifest.ts`](../../apps/intelligence-engine/src/routes/manifest.ts). Generating unused service stubs here would be dead code.
