"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap, ZoomControl } from 'react-leaflet'
import { LayerNode } from '@/lib/layers'
import { VisualState } from '../VisualControls'
import { hierarchyService, HierarchyLevel, HierarchyType } from '@/lib/geo-utils'
import { fetchOverpassLayer, OSMFeature } from '@/lib/overpass'
import { BANGALORE_HIERARCHY } from '@/lib/hierarchy'
import { getCategoryColor } from '@/lib/categories'
import { getArrivals } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import * as turf from '@turf/turf'

export interface MapActions {
  retract(): void;
  flyTo(lat: number, lon: number, zoom?: number): void;
}

interface MapInnerProps {
  layers?: LayerNode[]
  events?: any[]
  visuals?: VisualState
  onCorpDrill?: (corpId: string | null) => void
  onLevelChange?: (level: HierarchyType, name: string) => void
  mapActionsRef?: React.MutableRefObject<MapActions | null>
}

const BANGALORE_COORDS: [number, number] = [12.9716, 77.5946]

const ARRIVAL_STATUS_COLOR: Record<string, string> = {
  ON_TIME:    '#4ade80',
  APPROACHING:'#fbbf24',
  DELAYED:    '#f87171',
};

function buildStationPopupHTML(name: string, lineLabel: string, lineColor: string, arrivals: any[] | null): string {
  const header = `
    <div style="background:#09090b;border-radius:16px;overflow:hidden;min-width:230px;max-width:280px;font-family:ui-sans-serif,system-ui,sans-serif">
      <div style="padding:12px 14px 10px;border-bottom:1px solid #27272a">
        <div style="color:${lineColor};font-size:8px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:4px">${lineLabel}</div>
        <div style="color:#fff;font-size:11px;font-weight:900;letter-spacing:0.05em;text-transform:uppercase;line-height:1.3">${name}</div>
      </div>`;

  if (arrivals === null) {
    return header + `
      <div style="padding:12px 14px;color:#71717a;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em">
        Loading arrivals...
      </div>
    </div>`;
  }

  if (arrivals.length === 0) {
    return header + `
      <div style="padding:12px 14px;color:#52525b;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em">
        No arrivals data
      </div>
    </div>`;
  }

  const rows = arrivals.map((a: any) => {
    const sc = ARRIVAL_STATUS_COLOR[a.status] ?? '#71717a';
    const pulse = a.status === 'APPROACHING' ? `box-shadow:0 0 8px ${sc}` : '';
    return `
      <div style="padding:9px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #1c1c1c">
        <div style="width:7px;height:7px;border-radius:50%;background:${sc};flex-shrink:0;${pulse}"></div>
        <div style="flex:1;min-width:0">
          <div style="color:#e4e4e7;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.direction}</div>
          <div style="color:#52525b;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px">${a.route}${a.platform ? ' · ' + a.platform : ''}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="color:#fff;font-size:16px;font-weight:900;line-height:1;tabular-nums">${a.eta}</div>
          <div style="color:${sc};font-size:7px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px">${a.status.replace('_', ' ')}</div>
        </div>
      </div>`;
  }).join('');

  return header + rows + '</div>';
}

// Returns heat color for non-zero density; null means use corp's own color at low opacity
function getDensityColor(count: number, maxCount: number): string | null {
  if (count === 0 || maxCount === 0) return null;
  const r = count / maxCount;
  if (r < 0.25) return '#78350f';
  if (r < 0.5) return '#92400e';
  if (r < 0.75) return '#9a3412';
  return '#7f1d1d';
}

function MapResize() {
  const map = useMap()
  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => {
      try { map.invalidateSize() } catch (e) {}
    }, 100)
    return () => clearTimeout(timer)
  }, [map])
  return null;
}

function VisualFilters({ visuals }: { visuals?: VisualState }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !visuals) return;
    const container = map.getContainer()
    const pane = container?.querySelector('.leaflet-tile-pane') as HTMLElement
    if (pane) {
      const b = visuals.brightness ?? 100;
      const c = (visuals.contrast ?? 100) + 10;
      const h = visuals.hueRotate ?? 0;
      const g = visuals.grayscale ?? 0;
      const i = visuals.invert ?? 0;
      pane.style.filter = `brightness(${b}%) contrast(${c}%) hue-rotate(${h}deg) grayscale(${g}%) invert(${i}%)`;
    }
  }, [visuals, map])
  return null;
}

export default function MapInner({
  layers = [],
  events = [],
  visuals,
  onCorpDrill,
  onLevelChange,
  mapActionsRef,
}: MapInnerProps) {
  const [geoData, setGeoData] = useState<{ [key: string]: any }>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [osmData, setOsmData] = useState<Record<string, OSMFeature[]>>({})
  const osmFetchedRef = useRef<Set<string>>(new Set())

  // Start at CORP level — corps are the first meaningful unit of analysis
  const [currentLevel, setCurrentLevel] = useState<HierarchyType>('CORP')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeName, setActiveName] = useState<string>('GREATER_BENGALURU')
  const [visibleHierarchy, setVisibleHierarchy] = useState<HierarchyLevel[]>([])

  const mapInstance = useRef<L.Map | null>(null);

  // Incident density per corp zone (green→red heat by event count)
  const corpDensityMap = useMemo(() => {
    const map: Record<string, number> = {};
    BANGALORE_HIERARCHY.forEach(c => { map[c.id] = 0; });
    events.forEach(e => {
      const corp = BANGALORE_HIERARCHY.find(c => c.constituencies.includes(e.constituency));
      if (corp) map[corp.id] = (map[corp.id] || 0) + 1;
    });
    return map;
  }, [events]);

  // Incident density per constituency (used at WARD level)
  const constDensityMap = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach(e => {
      if (e.constituency) map[e.constituency] = (map[e.constituency] || 0) + 1;
    });
    return map;
  }, [events]);

  const maxCorpDensity = useMemo(() =>
    Math.max(...Object.values(corpDensityMap), 1), [corpDensityMap]);

  const maxConstDensity = useMemo(() =>
    Math.max(...Object.values(constDensityMap), 1), [constDensityMap]);

  // Load GeoJSON data, start at CORP level immediately
  useEffect(() => {
    const loadData = async () => {
      const urls = [
        { id: 'bbmp_wards', url: '/bbmp-wards.json' },
        { id: 'metro_lines', url: '/metro-lines.json' },
        { id: 'metro_stations', url: '/metro-stations.json' }
      ]
      const results: { [key: string]: any } = {}
      for (const item of urls) {
        try {
          const res = await fetch(item.url)
          if (res.ok) results[item.id] = await res.json()
        } catch (e) {}
      }
      setGeoData(results)
      if (results['bbmp_wards']) {
        hierarchyService.setRawData(results['bbmp_wards']);
        setVisibleHierarchy(hierarchyService.getCorporationLevels());
        onLevelChange?.('CORP', 'GREATER_BENGALURU');
      }
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch Overpass data when osm_points layers become visible
  useEffect(() => {
    layers
      .filter(l => l.type === 'osm_points' && l.visible && l.osm_query && !osmFetchedRef.current.has(l.id))
      .forEach(async (layer) => {
        osmFetchedRef.current.add(layer.id);
        try {
          const features = await fetchOverpassLayer(layer.osm_query!);
          setOsmData(prev => ({ ...prev, [layer.id]: features }));
        } catch (e) {
          console.error(`Overpass fetch failed [${layer.id}]:`, e);
          osmFetchedRef.current.delete(layer.id);
        }
      });
  }, [layers]);

  const findLayerVisible = (id: string) => layers?.find(l => l.id === id)?.visible;

  // RETRACT — CORP is the terminal level (no further back)
  const handleRetract = useCallback(() => {
    if (currentLevel === 'CORP' || !mapInstance.current) return;

    setIsProcessing(true);
    const map = mapInstance.current;

    setTimeout(() => {
      try {
        if (currentLevel === 'BLOCK') {
          const parentCorp = hierarchyService.getCorporationLevels().find(c =>
            hierarchyService.getWardsForCorp(c.id).some(w => w.id === activeId)
          );
          const wards = hierarchyService.getWardsForCorp(parentCorp?.id || '');
          setCurrentLevel('WARD');
          setVisibleHierarchy(wards);
          onLevelChange?.('WARD', activeName);
          if (parentCorp) {
            const bbox = turf.bbox(parentCorp.geometry);
            map.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { padding: [80, 80] });
          }
        } else if (currentLevel === 'WARD') {
          setCurrentLevel('CORP');
          setActiveId(null);
          setActiveName('GREATER_BENGALURU');
          setVisibleHierarchy(hierarchyService.getCorporationLevels());
          onLevelChange?.('CORP', 'GREATER_BENGALURU');
          onCorpDrill?.(null);
          map.flyTo(BANGALORE_COORDS, 11);
        }
      } finally {
        setIsProcessing(false);
      }
    }, 50);
  }, [currentLevel, activeId, activeName, onCorpDrill, onLevelChange]);

  // Expose imperative actions
  useEffect(() => {
    if (!mapActionsRef) return;
    mapActionsRef.current = {
      retract: handleRetract,
      flyTo: (lat, lon, zoom = 15) => {
        mapInstance.current?.flyTo([lat, lon], zoom);
      },
    };
  }, [mapActionsRef, handleRetract]);

  // DRILL DOWN
  const onLayerClick = (item: HierarchyLevel, map: L.Map, e: L.LeafletMouseEvent) => {
    L.DomEvent.stopPropagation(e);
    if (!item.geometry || isProcessing) return;

    setIsProcessing(true);
    setTimeout(() => {
      try {
        if (item.type === 'CORP') {
          setCurrentLevel('WARD');
          setActiveId(item.id);
          setActiveName(item.name);
          setVisibleHierarchy(hierarchyService.getWardsForCorp(item.id));
          onLevelChange?.('WARD', item.name);
          onCorpDrill?.(item.id);
          const bbox = turf.bbox(item.geometry);
          map.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { padding: [50, 50] });
        } else if (item.type === 'WARD') {
          setCurrentLevel('BLOCK');
          setActiveId(item.id);
          setActiveName(item.name);
          setVisibleHierarchy(hierarchyService.getBlocksForWard(item.id));
          onLevelChange?.('BLOCK', item.name);
          const bbox = turf.bbox(item.geometry);
          map.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { padding: [100, 100] });
        }
      } finally {
        setIsProcessing(false);
      }
    }, 50);
  };

  return (
    <div className="w-full h-full relative bg-[#020617]">
      {isProcessing && (
        <div className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-6">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <div className="text-white text-[12px] font-black tracking-[0.5em] uppercase">Syncing_Context</div>
        </div>
      )}

      <MapContainer
        center={BANGALORE_COORDS}
        zoom={11}
        scrollWheelZoom={true}
        className="w-full h-full"
        zoomControl={false}
        ref={(map) => { if (map) mapInstance.current = map; }}
      >
        <MapResize />
        <VisualFilters visuals={visuals} />
        <ZoomControl position="bottomright" />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
          eventHandlers={{ click: handleRetract }}
        />

        {/* Administrative hierarchy — density-colored at CORP/WARD level */}
        {visibleHierarchy.map((item) => {
          const isFocused = item.id === activeId;

          // Density: null = no incidents (use corp color at low opacity), color = heat fill
          let heatColor: string | null = null;
          let eventCountForTooltip = 0;
          if (item.type === 'CORP') {
            eventCountForTooltip = corpDensityMap[item.id] || 0;
            heatColor = getDensityColor(eventCountForTooltip, maxCorpDensity);
          } else if (item.type === 'WARD') {
            const wardConst = item.properties?.assembly_constituency_name_en;
            eventCountForTooltip = constDensityMap[wardConst] || 0;
            heatColor = getDensityColor(eventCountForTooltip, maxConstDensity);
          }

          const borderColor = item.properties?.color || '#2563EB';
          const fillColor = isFocused ? borderColor : (heatColor ?? borderColor);
          const fillOpacity = isFocused ? 0.08 : (heatColor ? 0.45 : 0.1);

          return (
            <GeoJSON
              key={`${currentLevel}-${item.id}-${isFocused}-${fillColor}-${fillOpacity}`}
              data={item.geometry}
              onEachFeature={(_f, l) => {
                if (!isFocused) {
                  const evLabel = eventCountForTooltip > 0
                    ? `<span style="color:#f87171;font-size:8px">${eventCountForTooltip} INCIDENT${eventCountForTooltip !== 1 ? 'S' : ''}</span>`
                    : `<span style="color:#3f4a5a;font-size:8px">NO INCIDENTS</span>`;
                  l.bindTooltip(`
                    <div style="background:#09090b;border:1px solid #27272a;padding:8px 12px;border-radius:12px;display:flex;flex-direction:column;align-items:center;gap:4px;box-shadow:0 8px 32px rgba(0,0,0,0.8)">
                      <span style="color:#fff;font-size:10px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase">${item.name.replace(/_/g, ' ')}</span>
                      ${evLabel}
                      <span style="color:#3f4a5a;font-size:8px;text-transform:uppercase;letter-spacing:0.15em;margin-top:2px">↓ Drill In</span>
                    </div>
                  `, { sticky: true, direction: 'top', className: 'swiss-tooltip' });
                }
              }}
              eventHandlers={{
                click: (e) => onLayerClick(item, e.target._map, e),
                mouseover: (e) => {
                  if (!isFocused) e.target.setStyle({ fillOpacity: fillOpacity + 0.15, color: borderColor, weight: 3 });
                },
                mouseout: (e) => {
                  if (!isFocused) e.target.setStyle({ fillOpacity: fillOpacity, color: borderColor, weight: 2 });
                }
              }}
              style={{
                color: borderColor,
                weight: isFocused ? 3 : 2,
                fillColor: fillColor,
                fillOpacity: fillOpacity,
                opacity: 1,
              }}
            />
          );
        })}

        {/* Metro lines — per-feature color from GeoJSON properties */}
        {findLayerVisible('metro_lines') && geoData['metro_lines'] && (
          <GeoJSON
            data={geoData['metro_lines']}
            style={(feature) => ({
              color: feature?.properties?.color ?? '#bc00ff',
              weight: 4,
              opacity: 0.9,
            })}
          />
        )}

        {/* Metro stations — color by line */}
        {findLayerVisible('metro_stations') && geoData['metro_stations'] && (
          <GeoJSON
            data={geoData['metro_stations']}
            pointToLayer={(feature, latlng) => {
              const line = feature.properties?.line;
              const color = line === 'GREEN' ? '#16a34a' : line === 'INTERCHANGE' ? '#ffffff' : '#bc00ff';
              const radius = line === 'INTERCHANGE' ? 7 : 5;
              return L.circleMarker(latlng, {
                radius,
                fillColor: color,
                color: '#09090b',
                fillOpacity: 1,
                weight: line === 'INTERCHANGE' ? 2 : 1,
              });
            }}
            onEachFeature={(feature, layer) => {
              const p = feature.properties;
              if (!p?.name) return;

              const lineColor = p.line === 'GREEN' ? '#16a34a' : p.line === 'INTERCHANGE' ? '#a78bfa' : '#bc00ff';
              const lineLabel = p.line === 'INTERCHANGE' ? 'Interchange · Purple & Green' : p.line === 'GREEN' ? 'Green Line' : 'Purple Line';

              // Hover tooltip — station name only, instant
              layer.bindTooltip(
                `<div style="background:#09090b;color:#fff;padding:6px 10px;border-radius:8px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em">
                  <div style="color:${lineColor};font-size:8px;margin-bottom:2px;letter-spacing:0.15em">${lineLabel}</div>
                  ${p.name}
                </div>`,
                { sticky: true, className: 'swiss-tooltip' }
              );

              // Click popup — starts with loading, fetches arrivals async
              layer.bindPopup(buildStationPopupHTML(p.name, lineLabel, lineColor, null), {
                className: 'metro-popup',
                maxWidth: 300,
                minWidth: 230,
                autoPan: true,
              });

              layer.on('click', async (e: L.LeafletMouseEvent) => {
                // Stop click from reaching the polygon/ward layer underneath
                L.DomEvent.stopPropagation(e);
                try {
                  const arrivals = await getArrivals(p.name, 'METRO');
                  (layer as any).setPopupContent(buildStationPopupHTML(p.name, lineLabel, lineColor, arrivals));
                } catch {
                  (layer as any).setPopupContent(buildStationPopupHTML(p.name, lineLabel, lineColor, []));
                }
              });
            }}
          />
        )}

        {/* OSM public buildings (Overpass) */}
        {layers
          .filter(l => l.type === 'osm_points' && l.visible && osmData[l.id])
          .flatMap(layer =>
            osmData[layer.id].map(feat => (
              <CircleMarker
                key={`${layer.id}-${feat.id}`}
                center={[feat.lat, feat.lon]}
                radius={6}
                pathOptions={{ color: layer.color || '#fff', fillColor: layer.color || '#fff', fillOpacity: 0.85, weight: 1.5 }}
              >
                <Popup>
                  <div style={{ background: '#09090b', color: '#fff', padding: '10px 14px', borderRadius: 12, fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', minWidth: 160 }}>
                    <div style={{ color: layer.color, fontSize: 9, marginBottom: 4 }}>{layer.code}</div>
                    <div>{feat.tags.name || 'Unnamed'}</div>
                    {feat.tags['addr:full'] && <div style={{ color: '#71717a', fontSize: 9, marginTop: 4 }}>{feat.tags['addr:full']}</div>}
                    {feat.tags.phone && <div style={{ color: '#71717a', fontSize: 9 }}>{feat.tags.phone}</div>}
                  </div>
                </Popup>
              </CircleMarker>
            ))
          )
        }

        {/* Live event markers — gated by events_active toggle */}
        {findLayerVisible('events_active') && events.map((ev, i) => {
          if (!ev.latitude || !ev.longitude) return null;
          const color = getCategoryColor(ev.type);
          return (
            <CircleMarker
              key={ev.id || i}
              center={[ev.latitude, ev.longitude]}
              radius={8}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 2 }}
            >
              <Popup>
                <div style={{ background: '#09090b', color: '#fff', padding: '10px 14px', borderRadius: 12, fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', minWidth: 160 }}>
                  <div style={{ color, fontSize: 9, marginBottom: 4 }}>{ev.type}</div>
                  <div>{ev.location || 'Unknown'}</div>
                  <div style={{ color: '#71717a', fontSize: 9, marginTop: 4 }}>Score: {ev.confidence_score} · {ev.status}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  )
}
