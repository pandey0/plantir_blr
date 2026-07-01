# 🚦 Bangalore City Intelligence Platform - Run Guide

This guide explains how to start the complete "Observability System" for Bangalore, including the spatial engine, the real-time map, and the operational portals.

---

## 🛠️ Prerequisites
- **Node.js:** v20.x or v22.x
- **Docker:** To run the PostGIS "Brain" and Redis "Pulse"
- **Ports required:** 3000, 3001, 3002, 3003, 5433, 6379

---

## 🚀 Step 1: Start the Infrastructure (The "Brain")
Power up the spatial database and real-time cache.

```bash
# Start PostGIS and Redis
docker run --name plantir_db -p 5433:5432 -e POSTGRES_USER=plantir_admin -e POSTGRES_PASSWORD=plantir_secret_password -e POSTGRES_DB=plantir_blr_db -d postgis/postgis:15-3.3
docker run --name plantir_realtime -p 6379:6379 -d redis:7-alpine
```

---

## 🚀 Step 2: Start the Intelligence Engine (The "Core")
The backend handles spatial clustering, confidence scoring, and WebSocket broadcasting.

```bash
```
*Runs on: [http://localhost:3001](http://localhost:3001)*

---

## 🚀 Step 3: Start the Observatory (The "Map")
The public-facing real-time visualization layer.

```bash
cd apps/public-map
```
*Runs on: [http://localhost:3000](http://localhost:3000)*

---

## 🚀 Step 4: Start the Citizen App (The "Reporting")
The mobile-first interface for reporting city issues.

```bash
cd apps/citizen-app
```
*Runs on: [http://localhost:3002](http://localhost:3002)*

---

## 🚀 Step 5: Start the Authority Portal (The "Action")
The triage dashboard for city officials (BBMP).

```bash
cd apps/authority-portal
```
*Runs on: [http://localhost:3003](http://localhost:3003)*

---

## 🧪 Quick Test: Simulated City Pulse
To verify the system is "Alive," run this command in your terminal while the **Observatory Map** is open:

```bash
curl -X POST http://localhost:3001/report \
-H "Content-Type: application/json" \
-d '{
  "latitude": 12.9172, 
  "longitude": 77.6228, 
  "category": "POTHOLE", 
  "description": "Silk Board Junction pothole"
}'
```

**Observation:**
1. A **Red Pulse** should immediately appear on the map at Silk Board.
2. The **Authority Portal** will show a new pending triage item.
3. If you run the command again, the **Confidence Score** will boost!

---

## 📂 Project Structure
- `apps/intelligence-engine`: Node.js/Fastify/Prisma (Port 3001)
- `apps/public-map`: React/MapLibre (Port 3000)
- `apps/citizen-app`: React/Lucide (Port 3002)
- `apps/authority-portal`: React/Lucide (Port 3003)
- `packages/database`: Shared PostGIS Schema & Migrations
