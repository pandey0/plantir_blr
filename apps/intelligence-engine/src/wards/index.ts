import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Loaded via readFileSync + import.meta.url, not a JSON import-assertion (`assert { type:
// 'json' }`) — this repo's ts-node/esm + nodemon dev setup (see root CLAUDE.md) predates
// reliable cross-version support for that syntax; readFileSync has no such risk and this file
// is only read once at module load, not a hot path.
const __dirname = dirname(fileURLToPath(import.meta.url));

// Bangalore's 243 BBMP wards — copied from apps/public-map/public/bbmp-wards.json, not
// imported across the app boundary. Apps in this monorepo stay independently deployable (see
// root CLAUDE.md's Architecture section); intelligence-engine owning its own copy of the same
// source geodata is the price of that independence. If the ward boundaries are ever corrected
// upstream, both copies need updating — there's no single source of truth enforced across
// apps today. Only 225 of Bangalore's ward polygons are present in the source file (not all
// 243 BBMP wards have digitized boundaries available) — ward IDs outside this set simply have
// no filterable geometry, see findWardById() below.
// Minimal structural type, not the `@types/geojson` package — this repo doesn't otherwise
// need a GeoJSON dependency, and the only thing done with this geometry is round-tripping it
// as JSON text into PostGIS's ST_GeomFromGeoJSON (see geo-query.ts), which doesn't care about
// anything beyond "it's valid GeoJSON".
export type WardGeometry = { type: string; coordinates: unknown };

interface WardFeature {
  type: 'Feature';
  properties: { id: number; name_en: string; [key: string]: unknown };
  geometry: WardGeometry;
}

interface WardCollection {
  type: 'FeatureCollection';
  features: WardFeature[];
}

const raw = readFileSync(join(__dirname, 'bbmp-wards.json'), 'utf-8');
const wardCollection = JSON.parse(raw) as WardCollection;

const wardsById = new Map<number, WardFeature>(wardCollection.features.map((f) => [f.properties.id, f]));

export interface WardSummary {
  id: number;
  name: string;
}

/** Ward polygon geometry (GeoJSON), for building a spatial filter — see geo-query.ts's
 *  findEventIdsInWard(). Returns undefined for an unknown/undigitized ward id. */
export function getWardGeometry(wardId: number): WardGeometry | undefined {
  return wardsById.get(wardId)?.geometry;
}

export function wardExists(wardId: number): boolean {
  return wardsById.has(wardId);
}

/** All wards with digitized boundaries, for a future ward-picker UI — not consumed by any
 *  route yet, exposed because the data is already loaded and the cost of exporting it is
 *  zero. Not itself an endpoint (YAGNI until a caller needs it as one). */
export function listWards(): WardSummary[] {
  return wardCollection.features.map((f) => ({ id: f.properties.id, name: f.properties.name_en }));
}
