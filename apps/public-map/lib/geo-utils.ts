import * as turf from '@turf/turf';
import { BANGALORE_HIERARCHY } from './hierarchy';

export type HierarchyType = 'CITY' | 'CORP' | 'WARD' | 'BLOCK';

export interface HierarchyLevel {
  id: string;
  name: string;
  type: HierarchyType;
  parentId: string | null;
  geometry: any;
  properties: any;
}

class HierarchyService {
  private rawWards: any[] = [];
  private cache: Map<string, HierarchyLevel[]> = new Map();

  setRawData(wardGeoJSON: any) {
    if (!wardGeoJSON || !wardGeoJSON.features) return;
    this.rawWards = wardGeoJSON.features.filter((f: any) => f && f.geometry);
    this.cache.clear();
  }

  getCityLevel(): HierarchyLevel[] {
    if (this.cache.has('CITY_LEVEL')) return this.cache.get('CITY_LEVEL')!;
    if (!this.rawWards.length) return [];

    try {
      // Use Combine for maximum reliability (creates a MultiPolygon)
      const fc = turf.featureCollection(this.rawWards.map(w => turf.truncate(w)));
      const combined = turf.combine(fc);
      
      const result: HierarchyLevel[] = [{
        id: 'gba',
        name: 'GREATER_BENGALURU_AUTHORITY',
        type: 'CITY',
        parentId: null,
        geometry: combined.features[0].geometry,
        properties: { color: '#2563EB' }
      }];
      
      this.cache.set('CITY_LEVEL', result);
      return result;
    } catch (e) {
      console.error("SERVICE_CITY_ERROR", e);
      return [];
    }
  }

  getCorporationLevels(): HierarchyLevel[] {
    if (this.cache.has('CORP_LEVELS')) return this.cache.get('CORP_LEVELS')!;

    const corpLevels: HierarchyLevel[] = [];
    BANGALORE_HIERARCHY.forEach(corp => {
      const corpWards = this.rawWards.filter(w => 
        corp.constituencies.includes(w.properties?.assembly_constituency_name_en)
      );
      if (corpWards.length > 0) {
        try {
          const fc = turf.featureCollection(corpWards.map(w => turf.truncate(w)));
          const combined = turf.combine(fc);
          corpLevels.push({
            id: corp.id,
            name: corp.name,
            type: 'CORP',
            parentId: 'gba',
            geometry: combined.features[0].geometry,
            properties: { color: corp.color }
          });
        } catch (e) {}
      }
    });
    
    this.cache.set('CORP_LEVELS', corpLevels);
    return corpLevels;
  }

  getWardsForCorp(corpId: string): HierarchyLevel[] {
    const key = `WARDS_${corpId}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const corp = BANGALORE_HIERARCHY.find(c => c.id === corpId);
    if (!corp) return [];

    const result: HierarchyLevel[] = this.rawWards
      .filter(w => corp.constituencies.includes(w.properties?.assembly_constituency_name_en))
      .map(f => ({
        id: String(f.id || f.properties?.id || Math.random()),
        name: f.properties?.name_en || f.properties?.proposed_ward_name_en || 'Unknown Ward',
        type: 'WARD',
        parentId: corpId,
        geometry: f.geometry,
        properties: f.properties || {}
      }));

    this.cache.set(key, result);
    return result;
  }

  getBlocksForWard(wardId: string): HierarchyLevel[] {
    const key = `BLOCKS_${wardId}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const ward = this.rawWards.find(w => String(w.id || w.properties?.id) === wardId);
    if (!ward) return [];

    // Procedural split for high-fidelity tactical demo
    const result: HierarchyLevel[] = [
      {
        id: `${wardId}_B1`,
        name: `SECTOR_ALPHA`,
        type: 'BLOCK',
        parentId: wardId,
        geometry: ward.geometry,
        properties: {}
      }
    ];

    this.cache.set(key, result);
    return result;
  }
}

export const hierarchyService = new HierarchyService();
