# Standards Compliance — intelligence-engine

> **Ownership rule**: fix or deliberately defer a gap found here → update its row in the same change. Adding a new gap you found but aren't fixing right now is also an update — don't just leave it undiscovered.

Section-by-section audit of `apps/intelligence-engine` against [`../standards/backend-engineering-standards.md`](../standards/backend-engineering-standards.md), done 2026-08-09 when that doc was adopted as binding. Status per section: **✅ Compliant**, **🔧 Fixed this session**, or **⏸ Deferred** (with a reason — every deferral here is a decision, not an oversight).

`docs/standards/frontend-engineering-standards.md` has no compliance doc yet — no frontend app has been touched this session (deliberate scope, see `TECH_STACK.md`). Audit it when frontend work resumes.

| # | Section | Status | Notes |
|---|---|---|---|
| 1 | Separation of Concerns | ✅ | Route (`app.ts`) → Zod validation → `events/`/`ingestion/` (domain) → Prisma. Strengthened this session — see #7. |
| 2 | Route/Controller Layer | ✅ | Every handler in `app.ts` is HTTP glue only (parse, call domain function, shape response). No route touches Prisma directly as of this session. |
| 3 | Validation | ✅ | Every route validates body/query/params via Zod (`@plantir/api-contracts` schemas). Env vars validated too — see #26. |
| 4 | DTOs | ⏸ | Responses return the raw Prisma `Event` shape, not a mapped DTO. `Event` has no sensitive/internal-only fields today (no credentials, no fields that shouldn't be client-visible) — a mapping layer would be pure ceremony with no actual information-hiding benefit right now. Revisit if a field is ever added that must stay server-only (e.g. an internal moderation flag). |
| 5 | Service/Use-case Layer | ✅ | `events/index.ts`'s `createEvent()`/`updateStatus()`/`listEvents()` serve this role, one function per use case, not a monolithic `EventService`. |
| 6 | Business/Domain Logic | ✅ | `ALLOWED_TRANSITIONS` and the confidence formula are pure, framework/DB-independent rules — the formula math doesn't know about Prisma or HTTP, only the surrounding data-gathering does. |
| 7 | Repository/DAL | 🔧 | `app.ts`'s `ListEvents` handler used to call `prisma.event.findMany()` directly — moved into `events.listEvents()`. No route in `app.ts` touches Prisma anymore. Not a separate named `EventRepository` class per entity — Prisma is already a repository-pattern ORM, and there's no second data-access technology to abstract against at this scale; an extra indirection layer here would have no real swap target. Revisit if that changes. |
| 8 | Database Rules | ✅ mostly | Migrations ✓, indexes ✓ (`status`, `category`, `geom` GIST, plus `created_at`, `(category, status, created_at)`, `Report.event_id`, `Evidence.event_id` added 2026-08-10 — the FK-column indexes were a real gap, Postgres doesn't auto-index those), pagination ✓, no N+1 found. **Known gap, tracked separately, not fixed**: `Event`→`Report`/`Evidence` has no cascade delete (see `IMPLEMENTATION_NOTES.md`'s Data model section) — would need a new migration; not urgent since nothing deletes events today. |
| 9 | Transactions | 🔧 | `createEvent()` was 4-5 sequential unguarded writes (event + geom + optional Report + optional Evidence + confidence recalc) — a crash partway left a permanent half-created event. `updateStatus()`'s CAS write + FRAUD confidence recalc had the same gap. Both now wrapped in `prisma.$transaction()`. |
| 10 | Authentication | ✅ for what exists | JWT, 2h expiry on dev tokens, `JWT_SECRET` validated at startup (see #26), never logged. Real login/password hashing doesn't exist (no user accounts) — already tracked elsewhere as a "major, needs confirmation" item, not a fixable gap in this pass. |
| 11 | Authorization | ✅ | `requireRole()` RBAC, enforced server-side, no frontend authorization to (mis)trust yet. |
| 12 | Middleware | ✅ | Auth, rate limiting, CORS, security headers (helmet, fixed this session — see #20/#28-equivalent), request IDs (Fastify's built-in `reqId`, free). |
| 13 | Error Handling | 🔧 | Was an inconsistent mix of bare strings and raw Zod `flatten()` objects. Now `{ error: { code, message, details? } }` everywhere (`errors.ts`'s `sendError()`), plus a global `setErrorHandler` safety net that logs unexpected (≥500) errors in full server-side and never leaks internals to the client. See [`../api/intelligence-engine.md`](../api/intelligence-engine.md#error-responses). |
| 14 | API Design | ✅ mostly | Correct HTTP methods/statuses, versioned (`/v1/`), consistent noun-based paths, pagination, filtering. **Idempotency gap, see #15.** |
| 15 | Idempotency | 🔧 | Fixed 2026-08-10: optional `Idempotency-Key` header on `POST /v1/events`, in-memory dedup-key store (`events/idempotency.ts`, 24h TTL, 1000-entry cap), same-key+same-body replays the cached response, same-key+different-body returns 422. See [`IMPLEMENTATION_NOTES.md`](IMPLEMENTATION_NOTES.md#idempotency-key-post-v1events-landed-2026-08-10). |
| 16 | Caching | ✅ | `events/list-cache.ts` — request-coalescing + short TTL, invalidated on every write (stronger guarantee than the standards example's plain cache-aside). |
| 17 | Background Jobs | N/A | Nothing in this app needs async/queued work yet (no email, no PDF generation, no imports). Correctly not built speculatively. |
| 18 | Events (internal pub/sub) | ✅ | WS broadcast (`NEW_EVENT`/`EVENT_UPDATED`) serves this role for the one meaningful internal event this app has. |
| 19 | External Services | N/A | No real third-party integrations exist (transit is mocked, isolated in `transit.ts` — would become an adapter if ever made real). |
| 20 | Security | ✅ | Parameterized raw queries throughout (tagged-template `$executeRaw`/`$queryRaw`, never string concatenation), rate limiting on the one write-heavy public endpoint, security headers (`@fastify/helmet`, fixed this session), input validation at every boundary, secrets never committed. HTTPS/TLS is a deployment-time concern, N/A pre-deployment. |
| 21 | Logging | ✅ | Structured (Fastify's built-in pino), request IDs, verified `Authorization` headers aren't in the default request-log serializer (not logged). |
| 22 | Observability | ⏸ | Only a bare `/health` (process-is-up, no DB check — see #23). No metrics/tracing backend (no Prometheus, no OpenTelemetry) — there's nothing to send metrics *to* yet at this stage; wiring up instrumentation with no collector behind it would be dead infrastructure. Revisit once this is actually deployed somewhere observability matters. |
| 23 | Reliability | 🔧 partial | Graceful shutdown added this session (`SIGTERM`/`SIGINT` → `fastify.close()` → `prisma.$disconnect()`, verified manually — see `IMPLEMENTATION_NOTES.md`). Retries/backoff/circuit-breakers — N/A, no external service calls exist yet to need them. `/health` stays shallow (no DB check) deliberately — a DB-connectivity check risks false-negative flapping under transient DB latency on a liveness probe; a separate DB-aware readiness probe is a different, unbuilt thing. |
| 24 | Performance | ✅ | Reviewed: no N+1 queries, indexes present, pagination present, no obviously blocking operations in the request path. |
| 25 | Testing | ✅ | Unit + integration tiers, extensive (see `TESTING.md`). No dedicated "API contract" or E2E or load-testing tier — N/A at this stage, no deployed environment or real traffic to load-test against yet. |
| 26 | Configuration | 🔧 | `config.ts` — Zod-validated `NODE_ENV`/`JWT_SECRET`/`CORS_ORIGINS`, fails fast at startup instead of the previous ad hoc `process.env` reads scattered through `app.ts`. Deliberately does **not** validate `DATABASE_URL` — Prisma sources that itself from `packages/database/.env`, not `process.env` populated ahead of time; see `IMPLEMENTATION_NOTES.md`'s Environment section for the mechanism and why duplicating it would be wrong. |
| 27 | File Uploads | N/A | `mediaUrls` are caller-supplied URL strings — no file upload handling exists in this app (a future citizen-app would own uploading to storage first). |
| 28 | Pagination | ✅ | Cursor-based, capped `limit` (1–100). |
| 29 | Multi-Tenancy | N/A | Single-city app, no tenants. |
| 30 | Architecture Evolution | ✅ | Explicitly a modular monolith — matches this repo's own `TECH_STACK.md` philosophy already, independently arrived at before this standards doc existed. |
| 31 | Clean/Hexagonal Architecture | N/A | Correctly not adopted — matches the standards' own "don't introduce mechanically" guidance at this scale. |
| 32 | Distributed Systems | N/A | Correctly deferred — WS pub/sub has a documented trigger condition (>1 engine instance) that hasn't been met; see `IMPLEMENTATION_NOTES.md`. |
| 33 | Deployment | 🔧 | No CI existed before this session. `.github/workflows/ci.yml` added — build+unit-test job (no external services) and integration-test job (real `postgis/postgis` service container, `prisma migrate deploy`). Docker/reverse-proxy/blue-green deploys — N/A, not deployed anywhere yet. |
| 34 | Code Quality Rules | ✅ | Reviewed: small-ish functions, clear names, no god-objects/god-services, low duplication. |
| 35 | Recommended Request Flow | ✅ | Matches: auth → authz → validation → handler → domain → DAL → DB → response. |
| 36–38 | Practical Priority / Golden Rules / Final Mental Model | — | Reference/learning material, not literal per-repo requirements — used as the checklist framework for this audit itself, not an actionable row. |

## Summary of what actually changed this session (2026-08-09)

Transactions (#9), controller/DB-query separation (#7), error response shape (#13), env validation (#26), security headers + graceful shutdown (#20/#23), and CI (#33). Everything else was already compliant, structurally not applicable at this scale, or is a real, explicitly-tracked deferral (DTOs #4, idempotency #15, observability #22, cascade-delete gap under #8) — not a silent gap.

## Summary of what changed in the 2026-08-10 round

Closed idempotency (#15 — `Idempotency-Key` support) and extended the database-rules audit (#8 — added the missing `created_at`/composite/FK-column indexes, see `IMPLEMENTATION_NOTES.md`'s Index review section for the `EXPLAIN ANALYZE` evidence). Also ran an explicit IDOR/BOLA analysis against `docs/standards/authentication-security-engineering-standards.md` (conclusion: no gap exists today — this app has no per-user-owned resource yet, see `IMPLEMENTATION_NOTES.md`) and a secrets-in-logs audit against the same standard plus `software-engineering-practices-standards.md` (conclusion: no secret is ever logged; found and fixed one unrelated dead-code issue in `transit.ts`). DTOs (#4), observability (#22), and the cascade-delete gap (#8) remain deferred with the same reasoning as before — not touched this round.
