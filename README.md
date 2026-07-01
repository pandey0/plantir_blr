# Bangalore City Intelligence Platform

A real-time city observability platform inspired by Palantir, focused on Bangalore's urban challenges.

## 🏗️ Architecture

- **`apps/intelligence-engine`**: The central "Event Engine" (Node.js/TypeScript/Fastify).
- **`apps/public-map`**: The Public Observatory (To be built).
- **`apps/citizen-app`**: The Reporting Interface (To be built).
- **`apps/authority-portal`**: The Operational Triage (To be built).
- **`packages/database`**: Shared PostGIS schema managed with Prisma.

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

## 🛠️ Tech Stack
- **Database:** PostgreSQL + PostGIS (The Brain)
- **Cache:** Redis (The Real-time Pulse)
- **API:** Fastify + TypeScript (The Core Engine)
- **ORM:** Prisma (The Source of Truth)
- **Frontend:** React + MapLibre/Leaflet (The Observatory)

## 📍 Next Steps
- [ ] Connect the `intelligence-engine` to the PostGIS DB.
- [ ] Add the `geom` column via a SQL migration to the `Event` table.
- [ ] Implement the `POST /report` logic with spatial insertion.
- [ ] Bootstrap the `public-map` frontend.
