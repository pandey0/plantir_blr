# Product Vision — Bangalore City Intelligence Platform

> Moved here from root `blr_palantir.md` during doc reorganization (was untracked from the rest of the doc tree). Status labels per [`../README.md`](../README.md).
>
> **This is a product/UX vision document, not an implementation spec.** Almost everything described below is `PLANNED` — cross-check against [`../architecture/DATA_FLOW.md`](../architecture/DATA_FLOW.md) and [`../api/intelligence-engine.md`](../api/intelligence-engine.md) for what's actually built before assuming a feature exists.
>
> **Ownership rule**: if a feature described here gets built, don't just leave it here as "vision" — add/update the relevant implementation doc (module `README.md`, `api/*.md`, or `DATA_FLOW.md`) and note here that it's shipped.
>
> **Divergence resolved 2026-08-10**: the engine now implements this doc's multi-signal model (Confidence Engine v2 — reporter/evidence/spatial/temporal/authority signals, 0–100 clamped). See [`../../apps/intelligence-engine/src/events/README.md`](../../apps/intelligence-engine/src/events/README.md) for the exact weights and [`../architecture/TECH_STACK.md`](../architecture/TECH_STACK.md)'s decision log for the reversal of the earlier additive-formula decision. **Weights are defaults, not calibrated** — there's no production usage yet to tune them against; calibration is explicitly deferred to beta, not pre-beta guesswork.

## Overview

This document summarizes the architecture and design of a **Bangalore-focused City Intelligence Platform**.
The goal of the platform is to create a **real-time observability system for the city**, where events occurring across the city can be visualized, analyzed, and tracked transparently.

The system is designed around **three independent platforms** connected through a shared **Event Intelligence Engine**.

The core philosophy is:

* Citizens report information
* Authorities respond to events
* The public map visualizes the truth of what is happening in the city

The map acts as a **neutral visualization layer**.

---

# System Architecture

The platform consists of three independent interfaces.

```
Citizen Reporting Platform
        │
        ▼
   Event Intelligence Engine
        │
        ▼
Public City Intelligence Map
        ▲
        │
Authority Operations Portal
```

Each component has a distinct role.

---

# 1. Public City Intelligence Map

## Purpose

The map is a **public observability platform** that visualizes city events.

Users cannot submit events through this interface.
It is designed purely for **exploration, monitoring, and analysis**.

Primary functions:

* Real-time city event visualization
* Heatmaps and density analysis
* Event clustering
* Evidence viewing (photos/videos)
* Timeline playback
* Monitoring authority responses

---

## Map Navigation Model

The interface is **map-first and exploratory**.

Users navigate through:

```
Pan
Zoom
Cluster expansion
Event inspection
```

Search is intentionally minimized to keep the interface exploratory.

---

## Zoom-Based Visualization

The map changes behavior based on zoom level.

### City Level

Visible elements:

* Heatmap of event density
* Critical city alerts
* Zone boundaries

Purpose:

Identify major hotspots across the city.

---

### Ward Level

Visible elements:

* Cluster markers
* Ward polygons
* Event density

Clusters summarize events in an area.

Example:

```
Cluster (14 events)
```

---

### Street Level

Visible elements:

* Individual event markers
* Media evidence
* Event timelines
* Confidence indicators

Users can inspect each event in detail.

---

# 2. Citizen Reporting Platform

The citizen platform is a **separate application** used to submit reports.

Possible implementations:

* Mobile application
* Web portal

The reporting interface captures **structured evidence**.

---

## Reporting Workflow

```
User opens reporting app
        ↓
Capture photo or video
        ↓
GPS location automatically recorded
        ↓
User selects issue category
        ↓
Submit report
```

Captured metadata:

```
GPS coordinates
timestamp
media evidence
issue type
user ID
```

---

## User Dashboard

Citizens can track their submissions.

Example:

```
My Reports

Garbage – Indiranagar
Status: Under Review

Pothole – BTM Layout
Status: Resolved
```

---

# 3. Authority Operations Portal

Authorities use a dedicated portal to manage city events.

This portal provides operational control.

Functions include:

* View active incidents
* Assign response teams
* Upload resolution evidence
* Update event status
* Monitor response metrics

---

## Authority Dashboard Example

```
Active Garbage Events: 24
Critical Events: 6
Resolved Today: 18
```

Authorities interact with events through the portal.

Their actions are reflected on the public map.

---

# 4. Event Intelligence Engine

The Event Intelligence Engine is the **core backend system** that processes all incoming information.

It performs:

```
event detection
event clustering
confidence scoring
fraud detection
spatial analysis
real-time broadcasting
```

All systems communicate through this engine.

---

# Event Lifecycle

Each event progresses through defined stages.

```
Observation
    ↓
Event Creation
    ↓
Confidence Growth
    ↓
Escalation
    ↓
Authority Response
    ↓
Resolution
    ↓
Archival
```

Example timeline:

```
10:05 AM – Citizen report
10:20 AM – Additional report
10:40 AM – Event confidence high
11:00 AM – Event escalated
12:15 PM – Authority acknowledges
1:45 PM – Issue resolved
```

---

# Event Confidence Engine

> **Shipped 2026-08-10** (engine side): see [`../../apps/intelligence-engine/src/events/README.md`](../../apps/intelligence-engine/src/events/README.md) for the implemented signal weights. Spatial + temporal signals are expressed as an *eligibility gate* for the reporter signal (see Fraud Prevention below), not separate additive terms — documented there, not a missing signal.

Each event is assigned a **confidence score (0–100)**.

Confidence determines event visibility and severity.

### Score Ranges

```
0–30   Low confidence
30–60  Moderate confidence
60–80  High confidence
80–100 Critical / Verified
```

---

## Confidence Signals

Confidence is calculated using multiple signals.

### Reporter Signals

```
number of independent reporters
user reputation score
```

---

### Evidence Signals

```
photo evidence
video evidence
AI image validation
```

---

### Spatial Signals

```
reports within small radius
cluster density
```

---

### Temporal Signals

```
reports within short time window
```

---

### Authority Confirmation

Authority acknowledgment greatly increases confidence.

---

# Event Visualization System

Events appear differently depending on confidence.

### Low Confidence

```
small faint markers
semi-transparent
```

---

### Standard Events

```
medium markers
category icons
color-coded severity
```

---

### Critical Events

```
large pulsing markers
highlighted hotspots
city alert panel
```

---

# Marker Color Encoding

Color reflects severity.

```
Yellow   – low confidence
Orange   – moderate
Red      – severe
Green    – resolved
```

---

# Clustering System

> **Shipped 2026-08-09** (engine side): `GET /v1/events/clusters?zoom=&bbox=` — see [`../api/intelligence-engine.md`](../api/intelligence-engine.md) and [`../../apps/intelligence-engine/src/events/README.md`](../../apps/intelligence-engine/src/events/README.md). `public-map` consuming it to actually render cluster bubbles is still a separate, unbuilt frontend change.

To prevent map clutter, events are clustered.

Backend grid clustering groups nearby events.

Cluster example:

```
Cluster Marker

● 12
```

Meaning:

```
12 events in this location
```

Clusters expand as the user zooms.

---

# Heatmap Layer

> **Shipped 2026-08-10** (engine side): `GET /v1/events/heatmap?zoom=&bbox=` — see [`../api/intelligence-engine.md`](../api/intelligence-engine.md). Deliberately reuses the Clustering System's grid aggregation (same zoom→grid-size mapping) rather than a second implementation — see `geo-query.ts`'s `getHeatmapPoints()`. `public-map` actually rendering a heat layer from this is still a separate, unbuilt frontend change.

Heatmaps represent **density of reports**.

Color scale:

```
Light yellow – low density
Orange       – moderate
Red          – dense hotspot
```

Critical events are shown separately to remain visible.

---

# Real-Time Update System

The map uses **WebSockets** to receive updates.

Flow:

```
Event update occurs
        ↓
Event engine recalculates state
        ↓
WebSocket broadcasts change
        ↓
Frontend updates marker
```

Only the affected event is updated.

The map does not re-render entirely.

---

# Playback Mode

> **Shipped 2026-08-10** (engine side): `GET /v1/events/playback?from=&to=&bbox=` returns events in the window ordered oldest-first, capped at 30 days and 1000 rows — see [`../api/intelligence-engine.md`](../api/intelligence-engine.md). The frontend timeline-animation UI itself is still unbuilt — this ships the data endpoint it would consume.

The system also supports **historical playback**.

Users can choose a time window.

```
Select date/time
        ↓
Map reconstructs city state
        ↓
Timeline animation shows event progression
```

Playback allows analysis of city events over time.

---

# Media Evidence System

Each event can contain supporting media.

Supported evidence:

```
photos
short videos
timestamps
location metadata
```

Media is displayed in the event panel.

---

# Fraud Prevention

The platform prevents spam using multiple mechanisms.

Examples:

```
camera-only uploads
GPS validation
duplicate detection
user reputation scoring
AI media verification
```

Suspicious reports are penalized in the confidence engine.

> **Partially shipped 2026-08-10** (engine side):
> - **GPS validation**: `POST /v1/events` rejects coordinates outside a generous Bangalore-metro bounding box (400 `VALIDATION_ERROR`) — see `packages/api-contracts/src/schemas.ts`'s `createEventRequestSchema`.
> - **Duplicate detection**: a same-category report within 150m and 6 hours of an existing non-terminal event attaches to it as a corroborating report instead of creating a second event — see [`../../apps/intelligence-engine/src/events/README.md`](../../apps/intelligence-engine/src/events/README.md).
> - **Not built**: camera-only uploads (no upload pipeline exists at all — `mediaUrls` are caller-supplied URLs), user reputation scoring (no user accounts exist), AI media verification (no AI/media-analysis integration exists). These need real product decisions (an upload pipeline, an account system, a chosen AI provider) before they're buildable — not implementable as an engine-only change.

---

# Geospatial Data System

All events are stored using **PostGIS geospatial indexing**.

Each event stores coordinates as:

```
POINT (longitude latitude)
```

Spatial indexing enables fast queries like:

```
events within radius
events inside ward
events inside map viewport
```

---

# Cluster and Heatmap Generation

Clusters are generated using grid-based aggregation.

Grid size depends on map zoom level.

```
Zoom 5  → 1km grid
Zoom 10 → 300m grid
Zoom 14 → 80m grid
Zoom 17 → individual markers
```

This ensures stable performance.

---

# Data Model

Core event structure:

```
event_id
type
confidence_score
status
created_at
resolved_at
geom (location)
report_count
media_count
```

---

# Performance Strategy

The system is optimized for a **single city (Bangalore)**.

Key optimizations include:

```
spatial indexing
tile-based event loading
cluster caching
viewport filtering
```

This allows the system to scale to **hundreds of thousands of events**.

---

# Platform Vision

The system ultimately functions as a **city observability layer**.

It answers questions such as:

```
What is happening in the city right now?
Where are the major incidents?
How fast are authorities responding?
Which areas repeatedly face issues?
```

Over time the platform becomes a **living operational map of the city**.

---

# Future Expansion

Possible future integrations include:

```
traffic sensor data
public transport feeds
weather data
pollution sensors
crowd density signals
```

These automated signals would combine with citizen reports to create a **comprehensive city intelligence system**. Each would be a new `Source` adapter under [`../../apps/intelligence-engine/src/ingestion/README.md`](../../apps/intelligence-engine/src/ingestion/README.md) once a concrete integration is chosen — not built speculatively ahead of that.

Bangalore-specific context (folded in from the retired `PROJECT_PLAN.md`):

* **Ward integration**: map event coordinates to Bangalore's 243 BBMP wards using GeoJSON polygons (`public-map` already loads `bbmp-wards.json` — see root `CLAUDE.md`'s Map layer system section for the current drill-down hierarchy this would extend).
  > **Shipped 2026-08-10** (engine side, read-filtering only): `GET /v1/events?wardId=` filters events by ward polygon (225 of 243 wards have digitized boundaries in the source data) — see [`../../apps/intelligence-engine/src/wards/README.md`](../../apps/intelligence-engine/src/wards/README.md). This does not compute or store "which ward is this event in" on the `Event` row itself, and `public-map` consuming this filter for its drill-down UI is still a separate, unbuilt frontend change.
* **Traffic correlation** (future, unscoped): overlay traffic data (Google Maps Traffic / TomTom) to show how road issues impact congestion. Not designed — do not build ahead of a concrete data source being identified.

---

# Final Concept

The completed platform consists of:

```
Citizen Reporting System
Authority Operations Portal
Public City Intelligence Map
Event Intelligence Engine
```

Together they form a **real-time digital observatory for Bangalore**.
