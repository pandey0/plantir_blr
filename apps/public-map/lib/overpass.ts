const BLR_BBOX = '12.85,77.47,13.07,77.75';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export interface OSMFeature {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

const cache = new Map<string, OSMFeature[]>();

export async function fetchOverpassLayer(osmQuery: string): Promise<OSMFeature[]> {
  if (cache.has(osmQuery)) return cache.get(osmQuery)!;

  const fullQuery = `[out:json][timeout:25];(${osmQuery}(${BLR_BBOX}););out center;`;

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(fullQuery)}`,
  });

  if (!res.ok) throw new Error(`Overpass ${res.status}`);

  const data = await res.json();

  const features: OSMFeature[] = (data.elements as any[])
    .map((el) => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (!lat || !lon) return null;
      return { id: el.id as number, lat, lon, tags: (el.tags || {}) as Record<string, string> };
    })
    .filter((f): f is OSMFeature => f !== null);

  cache.set(osmQuery, features);
  return features;
}
