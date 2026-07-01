export type LayerType = 'base' | 'geojson' | 'realtime' | 'group' | 'osm_points';

export interface LayerNode {
  id: string;
  name: string;
  code: string;
  type: LayerType;
  visible?: boolean;
  children?: LayerNode[];
  color?: string;
  url?: string;
  description?: string;
  status?: 'LIVE' | 'STALE' | 'HISTORICAL' | 'ARCHIVE';
  osm_query?: string; // Query for OSM overpass if needed
}

export interface DomainNode {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  layers: LayerNode[];
}

export const DOMAIN_REGISTRY: DomainNode[] = [
  {
    id: 'commute',
    name: 'COMMUTE',
    icon: 'Bus',
    color: '#00f2ff',
    description: 'Public transit networks across Bengaluru.',
    layers: [
      { id: 'metro_lines',     name: 'Metro Lines',       code: 'METRO_L',  type: 'geojson',    visible: false, color: '#bc00ff', status: 'STALE', description: 'Purple & Green line alignments.' },
      { id: 'metro_stations',  name: 'Metro Stations',    code: 'METRO_S',  type: 'geojson',    visible: false, color: '#00f2ff', status: 'STALE', description: '83 stations across 96km.' },
      { id: 'ir_stations',     name: 'Railway Stations',  code: 'IR_STN',   type: 'osm_points', visible: false, color: '#f59e0b', status: 'STALE', description: 'Indian Railways mainline & halt stations.', osm_query: 'node["railway"~"station|halt"]' },
      { id: 'bmtc_depots',     name: 'BMTC Depots',       code: 'BMTC',     type: 'osm_points', visible: false, color: '#3b82f6', status: 'STALE', description: '47 city bus depots.', osm_query: 'node["amenity"="bus_station"]["operator"~"BMTC|bmtc"]' },
      { id: 'ksrtc_terminals', name: 'KSRTC Terminals',   code: 'KSRTC',    type: 'osm_points', visible: false, color: '#10b981', status: 'STALE', description: 'Intercity & interstate bus terminals.', osm_query: '(node["amenity"="bus_station"]["operator"~"KSRTC|NEKRTC|NWKRTC|KKRTC",i];node["amenity"="bus_station"]["name"~"KSRTC",i];)' },
    ]
  },
  {
    id: 'public_assets',
    name: 'PUBLIC_BUILDINGS',
    icon: 'Shield',
    color: '#ffffff',
    description: 'Critical government and healthcare assets.',
    layers: [
      {
        id: 'govt_hospitals',
        name: 'Govt Hospitals',
        code: 'HOSPITAL',
        type: 'osm_points',
        visible: false,
        color: '#ff4466',
        status: 'LIVE',
        description: 'State and municipal healthcare facilities.',
        osm_query: 'node[amenity=hospital]'
      },
      {
        id: 'govt_offices',
        name: 'Govt Offices',
        code: 'ADMIN',
        type: 'osm_points',
        visible: false,
        color: '#e2e8f0',
        status: 'STALE',
        description: 'Administrative headquarters and BBMP offices.',
        osm_query: 'node[office=government]'
      },
      {
        id: 'public_parks',
        name: 'Public Parks',
        code: 'PARKS',
        type: 'osm_points',
        visible: false,
        color: '#22c55e',
        status: 'LIVE',
        description: 'BBMP maintained parks and green spaces.',
        osm_query: '(node[leisure=park];way[leisure=park];)'
      }
    ]
  },
  {
    id: 'tactical',
    name: 'TACTICAL_FEED',
    icon: 'Activity',
    color: '#ff0055',
    description: 'Live incident reporting.',
    layers: [
      { id: 'events_active', name: 'Live Signals', code: 'SIGNALS', type: 'realtime', visible: true, color: '#ff0055', status: 'LIVE' },
      { id: 'events_resolved', name: 'Archive', code: 'ARCHIVE', type: 'realtime', visible: true, color: '#ff9d00', status: 'ARCHIVE' }
    ]
  }
];

export const LAYER_REGISTRY: LayerNode[] = [
  {
    id: 'base_maps',
    name: 'Base Maps',
    code: 'BASE',
    type: 'group',
    children: [
      { id: 'base_street', name: 'Street Map (OSM)', code: 'OSM', type: 'base', visible: true },
      { id: 'base_satellite', name: 'Satellite (Esri)', code: 'SAT', type: 'base', visible: false }
    ]
  }
];
