# Bangalore City Intelligence Platform - Implementation Plan

## 1. Project Vision
To build a high-performance, real-time observability platform for Bangalore that synchronizes citizen reports, authority responses, and public visualization into a single "Source of Truth" for city operations.

---

## 2. Core Architecture
The system follows a decoupled architecture connected via a central Intelligence Engine.

*   **Public Map (Frontend):** React + MapLibre GL / Leaflet. Uses Vector Tiles (MVT) for performance.
*   **Citizen App (Mobile/Web):** React Native or PWA for structured evidence capture.
*   **Authority Portal (Dashboard):** React-based internal tool for triage and resolution.
*   **Intelligence Engine (Backend):** Node.js (TypeScript) + Fastify/Express.
*   **Spatial Database:** PostgreSQL + PostGIS (The "Brain").
*   **Real-time Layer:** WebSockets (Socket.io) for live map pulses.

---

## 3. Database Schema (PostGIS Focused)

### `events` Table
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `geom` | GEOGRAPHY(POINT) | PostGIS spatial coordinate |
| `category` | ENUM | Pothole, Garbage, Water Logging, etc. |
| `confidence_score` | INT (0-100) | Calculated by Engine |
| `status` | ENUM | Reported, Verified, Escalated, Resolved |
| `created_at` | TIMESTAMP | System time |
| `metadata` | JSONB | Extensible attributes (ward_id, street_name) |

### `evidence` Table
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `event_id` | UUID | Foreign Key |
| `media_url` | STRING | S3/CDN Link |
| `is_authority_proof` | BOOLEAN | If true, marks the resolution proof |

---

## 4. Development Roadmap (Phased)

### Phase 1: The Foundation (The "Foundry")
*   Setup PostgreSQL with PostGIS extension.
*   Build the **Event Intelligence Engine** (API) with basic CRUD for events.
*   Implement **Spatial Indexing** (GIST) for fast proximity queries.

### Phase 2: The Public Map (The "Observatory")
*   Implement a high-performance map interface.
*   **Grid-based Clustering:** Use PostGIS `ST_SnapToGrid` or H3 hexagons for city-wide aggregation.
*   Real-time integration: When an event is added to the DB, it "pulses" on the map via WebSockets.

### Phase 3: Reporting & Confidence (The "Triage")
*   Build the Citizen Reporting interface (GPS + Camera integration).
*   Implement the **Confidence Engine v1**:
    *   +20 points per unique reporter.
    *   +30 points if media is attached.
    *   -50 points if flagged as fraud by AI.

### Phase 4: Operations (The "Action")
*   Build the Authority Portal.
*   "Close the Loop": Authorities must upload a photo of the "Resolved" state to update the Public Map to Green.

---

## 5. Intelligence Features (The "Palantir" Edge)
*   **H3 Hexagonal Heatmaps:** Using Uber’s H3 for better density visualization than square grids.
*   **Temporal Playback:** A "Time Slider" to see how garbage piles or flooding progressed over the last 24-48 hours.
*   **Reputation Decay:** Users who submit false reports lose "Weight" in future confidence calculations.

---

## 6. Local Context (Bangalore Specifics)
*   **Ward Integration:** Map event coordinates to Bangalore's 243 BBMP Wards using GeoJSON polygons.
*   **Traffic Correlation:** (Future) Overlay Google Maps Traffic or TomTom data to show how road issues impact congestion.

---

## 7. Immediate Next Steps
1.  Initialize the project repository.
2.  Define the `docker-compose.yml` for PostGIS and Redis.
3.  Draft the API Specification for `POST /report`.
