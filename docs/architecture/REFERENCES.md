# External References

> **Ownership rule**: when an idea from a reference below gets implemented (or rejected), update the relevant module/API doc to say so, and add a line here pointing at it — don't let this file be the only place the connection is recorded.

## worldmonitor (github.com/koala73/worldmonitor)

A much larger real-time intelligence dashboard (news aggregation, geopolitical/infra monitoring, map visualization) used as a source of proven patterns — not as a tech-stack template. We deliberately don't match its stack (Vanilla TS/Vite/globe.gl/protobuf-via-sebuf); we pulled specific ideas and adapted them to Fastify/Next.js/Postgres at much smaller scale. Cloned locally at audit time to a scratch path (not part of this repo, not guaranteed to still exist — re-clone from the URL above if a citation below needs re-verification).

### Ideas pulled in, and where they landed

| Idea from worldmonitor | Applied here | Status |
|---|---|---|
| No Redis pub/sub for WS fan-out until actually running >1 instance — isolate the one stateful process instead of building fan-out speculatively | [`../../apps/intelligence-engine/src/ws/README.md`](../../apps/intelligence-engine/src/ws/README.md) — explicit trigger condition documented | Principle adopted, infra not built (not yet needed) |
| Request-coalescing caching (`cachedFetchJson()`) in front of expensive reads | `apps/intelligence-engine/src/events/list-cache.ts` — in-memory `Map` in front of `GET /v1/events`, no Redis. Adapted, not copied: our version invalidates entirely on every write rather than relying on TTL + negative-sentinel caching, since this app has live WS push and needs read-after-write consistency for citizens/authorities checking their own submissions. | CURRENT (landed 2026-08-09) |
| Versioned proto services (`domain/v1/...`) generating OpenAPI + typed clients from one source of truth, CI fails on drift | [`TECH_STACK.md`](TECH_STACK.md) decision log — adopted the versioning discipline and single-source-of-truth idea via `buf` + `ts-proto` (Node-only), explicitly **not** their `sebuf` toolchain (Go-built plugins, see decision log) | PLANNED (Phase 1, task pending) |
| One always-on stateful service (their Railway relay) vs. stateless/edge frontends | [`OVERVIEW.md`](OVERVIEW.md) "Why one always-on backend" — `intelligence-engine` fills this role already, no restructuring needed | Already matches, no change required |
| Flat `shared/` directory imported by both browser and server code | Adapted, not copied directly: our apps are genuinely separate deployable apps (worldmonitor is one SPA with config variants), so this became the `packages/shared-config` idea (event enums, hierarchy constants, map tokens) instead of an unstructured shared folder | PLANNED (Phase 1, not yet scaffolded) |
| CSS custom-property design tokens (surface/border/text hierarchy + a semantic severity color scale, WCAG-contrast-checked), not a design-token build pipeline | [`../../apps/public-map/UX_SPEC.md`](../../apps/public-map/UX_SPEC.md)'s "formal design tokens" requirement — read their actual `src/styles/main.css`, adapted the token *categories* (not the specific values/palette) to `public-map`'s existing tactical-HUD aesthetic | PLANNED, not yet built |
| `.panel-tabs` reusable tab component with a right-edge fade-mask hint on overflow, instead of hard-clipping | [`../../apps/public-map/UX_SPEC.md`](../../apps/public-map/UX_SPEC.md)'s "panel/tab pattern" requirement | PLANNED, not yet built |
| Pluggable provider/adapter pattern behind a stable interface, so a real upstream can swap in without touching callers (their AI fallback chain — Ollama→Groq→OpenRouter — is the clearest example of the same underlying idea) | `plantir-blr-data-service` (sibling repo)'s `TransitProvider`/`GeoProvider` interfaces — also directly mirrors this repo's own pre-existing `ingestion/` `Source` adapter pattern, so this is really two converging precedents, not a new idea borrowed wholesale | CURRENT (mock provider only, landed 2026-08-10) |

### Explicitly not adopted, and why

- **`sebuf`'s annotation-driven HTTP+OpenAPI codegen** — its plugins are Go-built; adding a Go toolchain to this Node-only monorepo for codegen alone was judged not worth it. We hand-maintain the RPC→HTTP path/method mapping instead (`routes/manifest.ts`, PLANNED). Logged in [`TECH_STACK.md`](TECH_STACK.md).
- **Multi-variant single-SPA pattern** (`src/config/variants/`) — doesn't apply; our four apps are independently deployed, not one bundle switching config by hostname.
- **Full 4-layer cache hierarchy (in-memory LRU + Upstash Redis + negative sentinels + HTTP cache-control tiers)** — adopting the whole hierarchy is overkill at current scale. Only the request-coalescing piece was judged worth it; see [`DATA_FLOW.md`](DATA_FLOW.md).
