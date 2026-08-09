# Bangalore City Intelligence Platform

A real-time city observability platform inspired by Palantir, focused on Bangalore's urban challenges.

**Full documentation lives in [`docs/`](docs/README.md)** — architecture, API reference, product vision, per-module design docs, and the tech-stack/decision log. Read that before making changes; this file is just the front door.

## 🏗️ Architecture

- **`apps/intelligence-engine`**: The central "Event Engine" (Node.js/TypeScript/Fastify). Built, single instance, JWT + role auth on mutating routes.
- **`apps/public-map`**: The Public Observatory (Next.js + Leaflet). Built — live event pulses, ward drill-down map.
- **`apps/citizen-app`**: The Reporting Interface (Vite + React). Stub only, not yet built.
- **`apps/authority-portal`**: The Operational Triage (Vite + React). Stub only, not yet built.
- **`packages/database`**: Shared PostGIS schema managed with Prisma.

See [`docs/architecture/OVERVIEW.md`](docs/architecture/OVERVIEW.md) for the full system diagram and [`docs/architecture/TECH_STACK.md`](docs/architecture/TECH_STACK.md) for stack details per app.

## 🚀 Getting Started

### 1. Start Infrastructure
Requires Docker to be installed.
```bash
npm run infra:up
```

### 2. Run Database Migrations
```bash
npm run db:migrate
```

### 3. Start the Intelligence Engine
```bash
npm run dev:engine
```

## 🧪 Testing

```bash
npm run test:unit          # no DB needed — runs in pre-commit automatically
npm run test:integration   # needs infra:up + db:migrate first
```

Full rationale: [`docs/architecture/TESTING.md`](docs/architecture/TESTING.md).

## 🛠️ Tech Stack
- **Database:** PostgreSQL + PostGIS (The Brain), port 5433
- **Cache:** Redis (provisioned, not yet used by any code path)
- **API:** Fastify 5 + TypeScript, ESM (The Core Engine)
- **ORM:** Prisma (The Source of Truth)
- **Frontend:** Next.js 14 + Leaflet (`public-map`); Vite + React stubs (`citizen-app`, `authority-portal`)

Full detail, decision log, and the rule for proposing major changes: [`docs/architecture/TECH_STACK.md`](docs/architecture/TECH_STACK.md).

Current known gaps and per-route status are tracked in [`docs/api/intelligence-engine.md`](docs/api/intelligence-engine.md), not here — this file doesn't carry a changelog.
