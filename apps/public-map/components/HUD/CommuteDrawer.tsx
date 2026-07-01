"use client"

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Train, Bus, ArrowUpDown, Clock, Wallet, MousePointerClick } from 'lucide-react';
import { LayerNode } from '@/lib/layers';

interface CommuteDrawerProps {
  layers: LayerNode[];
  onToggleLayer: (id: string, visible: boolean) => void;
  onClose: () => void;
}

// ── Metro network data ───────────────────────────────────────────────────────

const PURPLE_LINE = [
  'Challaghatta', 'Kengeri', 'Jnanabharathi', 'Rajarajeshwari Nagar',
  'Nayandahalli', 'Mysore Road', 'Deepanjali Nagar', 'Attiguppe', 'Vijayanagar',
  'Hosahalli', 'Magadi Road', 'City Railway Station',
  'Majestic (Nadaprabhu Kempegowda)',
  'Sir M Visvesvaraya (Central College)', 'Vidhana Soudha', 'Cubbon Park',
  'MG Road', 'Trinity', 'Halasuru', 'Indiranagar', 'Swami Vivekananda Road',
  'Baiyappanahalli', 'Mahadevapura', 'Krishnarajapura', 'Garudacharpalya',
  'Hoodi', 'Whitefield (Kadugodi)',
];

const GREEN_LINE = [
  'Nagasandra', 'Dasarahalli', 'Jalahalli', 'Peenya Industry', 'Peenya',
  'Goraguntepalya', 'Yeshvantpur', 'Sandal Soap Factory', 'Mahalakshmi',
  'Rajajinagar', 'Kuvempu Road', 'Srirampura', 'Mantri Square (Sampige Road)',
  'Majestic (Nadaprabhu Kempegowda)',
  'Chickpete', 'KR Market', 'National College', 'Lalbagh', 'South End Circle',
  'Jayanagar', 'RV Road (Rashtreeya Vidyalaya Road)', 'Banashankari', 'JP Nagar',
  'Yelachenahalli', 'Konanakunte Cross', 'Doddakallasandra', 'Vajrahalli',
  'Silk Institute (Thalaghattapura)',
];

const INTERCHANGE = 'Majestic (Nadaprabhu Kempegowda)';

const ALL_METRO_STATIONS = [...new Set([...PURPLE_LINE, ...GREEN_LINE])].sort();

function getLineForStation(name: string): 'PURPLE' | 'GREEN' | 'INTERCHANGE' | null {
  const onP = PURPLE_LINE.includes(name);
  const onG = GREEN_LINE.includes(name);
  if (onP && onG) return 'INTERCHANGE';
  if (onP) return 'PURPLE';
  if (onG) return 'GREEN';
  return null;
}

interface RouteResult {
  segments: { line: 'PURPLE' | 'GREEN'; from: string; to: string; stops: number }[];
  interchange: boolean;
  totalStops: number;
  minutes: number;
  fare: number;
}

function planMetroRoute(from: string, to: string): RouteResult | null {
  if (from === to) return null;

  const fromP = PURPLE_LINE.indexOf(from);
  const fromG = GREEN_LINE.indexOf(from);
  const toP = PURPLE_LINE.indexOf(to);
  const toG = GREEN_LINE.indexOf(to);

  const majP = PURPLE_LINE.indexOf(INTERCHANGE);
  const majG = GREEN_LINE.indexOf(INTERCHANGE);

  const fare = (stops: number) => {
    if (stops <= 2) return 10;
    if (stops <= 4) return 15;
    if (stops <= 7) return 20;
    if (stops <= 10) return 25;
    if (stops <= 15) return 30;
    if (stops <= 20) return 35;
    if (stops <= 26) return 40;
    return 45;
  };

  // Direct — both on Purple
  if (fromP >= 0 && toP >= 0) {
    const stops = Math.abs(fromP - toP);
    return { segments: [{ line: 'PURPLE', from, to, stops }], interchange: false, totalStops: stops, minutes: Math.round(stops * 1.5), fare: fare(stops) };
  }
  // Direct — both on Green
  if (fromG >= 0 && toG >= 0) {
    const stops = Math.abs(fromG - toG);
    return { segments: [{ line: 'GREEN', from, to, stops }], interchange: false, totalStops: stops, minutes: Math.round(stops * 1.5), fare: fare(stops) };
  }
  // Interchange: Purple → Green
  if (fromP >= 0 && toG >= 0) {
    const s1 = Math.abs(fromP - majP);
    const s2 = Math.abs(majG - toG);
    const total = s1 + s2;
    return {
      segments: [
        { line: 'PURPLE', from, to: INTERCHANGE, stops: s1 },
        { line: 'GREEN', from: INTERCHANGE, to, stops: s2 },
      ],
      interchange: true,
      totalStops: total,
      minutes: Math.round(total * 1.5 + 3),
      fare: fare(total),
    };
  }
  // Interchange: Green → Purple
  if (fromG >= 0 && toP >= 0) {
    const s1 = Math.abs(fromG - majG);
    const s2 = Math.abs(majP - toP);
    const total = s1 + s2;
    return {
      segments: [
        { line: 'GREEN', from, to: INTERCHANGE, stops: s1 },
        { line: 'PURPLE', from: INTERCHANGE, to, stops: s2 },
      ],
      interchange: true,
      totalStops: total,
      minutes: Math.round(total * 1.5 + 3),
      fare: fare(total),
    };
  }
  return null;
}

// ── Smart route planner ──────────────────────────────────────────────────────

function MetroRoutePlanner() {
  const [from, setFrom] = useState('MG Road');
  const [to, setTo] = useState('JP Nagar');
  const [result, setResult] = useState<RouteResult | null | 'none'>(null);

  const plan = () => {
    const r = planMetroRoute(from, to);
    setResult(r ?? 'none');
  };
  const swap = () => { const t = from; setFrom(to); setTo(t); setResult(null); };

  const LINE_COLOR = { PURPLE: '#bc00ff', GREEN: '#16a34a' };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1 block">From</label>
        <div className="relative">
          <select value={from} onChange={e => { setFrom(e.target.value); setResult(null); }}
            className="w-full h-10 bg-zinc-900/80 border border-zinc-800 rounded-xl pl-3 pr-8 text-[10px] font-black text-zinc-200 outline-none focus:border-zinc-600 appearance-none cursor-pointer">
            <optgroup label="── Purple Line ──" style={{ background: '#09090b' }}>
              {PURPLE_LINE.map(s => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
            </optgroup>
            <optgroup label="── Green Line ──" style={{ background: '#09090b' }}>
              {GREEN_LINE.filter(s => s !== INTERCHANGE).map(s => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
            </optgroup>
          </select>
          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600 rotate-90 pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-800" />
        <button onClick={swap} className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-600 flex items-center justify-center transition-all active:scale-90">
          <ArrowUpDown className="w-3 h-3 text-zinc-500" />
        </button>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      <div>
        <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1 block">To</label>
        <div className="relative">
          <select value={to} onChange={e => { setTo(e.target.value); setResult(null); }}
            className="w-full h-10 bg-zinc-900/80 border border-zinc-800 rounded-xl pl-3 pr-8 text-[10px] font-black text-zinc-200 outline-none focus:border-zinc-600 appearance-none cursor-pointer">
            <optgroup label="── Purple Line ──" style={{ background: '#09090b' }}>
              {PURPLE_LINE.map(s => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
            </optgroup>
            <optgroup label="── Green Line ──" style={{ background: '#09090b' }}>
              {GREEN_LINE.filter(s => s !== INTERCHANGE).map(s => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
            </optgroup>
          </select>
          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600 rotate-90 pointer-events-none" />
        </div>
      </div>

      <button
        onClick={plan}
        disabled={from === to}
        className={cn(
          "w-full h-10 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase transition-all border",
          from === to
            ? "bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed"
            : "bg-zinc-100 border-zinc-100 text-black hover:bg-white active:scale-95"
        )}
      >
        Plan Route
      </button>

      {result === 'none' && (
        <div className="text-center text-zinc-600 text-[9px] font-black uppercase tracking-widest py-2">
          No route found
        </div>
      )}

      {result && result !== 'none' && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Segment pills */}
          <div className="px-4 pt-4 flex items-center gap-1.5 flex-wrap">
            {result.segments.map((seg, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest px-1">
                    change
                  </div>
                )}
                <div
                  className="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest"
                  style={{ backgroundColor: `${LINE_COLOR[seg.line]}20`, color: LINE_COLOR[seg.line], border: `1px solid ${LINE_COLOR[seg.line]}40` }}
                >
                  {seg.line === 'PURPLE' ? 'Purple' : 'Green'} · {seg.stops} stop{seg.stops !== 1 ? 's' : ''}
                </div>
              </React.Fragment>
            ))}
          </div>

          {result.interchange && (
            <div className="px-4 pt-2 text-[9px] text-amber-400 font-black uppercase tracking-widest">
              ↻ Change at Majestic
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 p-4 pt-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Stops</span>
              <span className="text-[18px] font-black text-white tabular-nums">{result.totalStops}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-zinc-600" />
                <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Time</span>
              </div>
              <span className="text-[18px] font-black text-white tabular-nums">{result.minutes}m</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <Wallet className="w-2.5 h-2.5 text-zinc-600" />
                <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Fare</span>
              </div>
              <span className="text-[18px] font-black text-white tabular-nums">₹{result.fare}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Non-metro tabs ───────────────────────────────────────────────────────────

interface GenericTab {
  id: string;
  label: string;
  Icon: React.ElementType;
  color: string;
  authority: string;
  tagline: string;
  layerIds: string[];
  stops: string[];
  stopLabel: string;
  apiMode: string;
}

const OTHER_TABS: GenericTab[] = [
  {
    id: 'rail',
    label: 'Rail',
    Icon: Train,
    color: '#f59e0b',
    authority: 'South Western Rly',
    tagline: 'Mainline & suburban halt stations across Bengaluru',
    layerIds: ['ir_stations'],
    stops: ['KSR City (Majestic)', 'Yeshvantpur Jn', 'KR Puram', 'Cantonment', 'Whitefield', 'Banaswadi', 'Hebbal', 'Carmelaram', 'Nayandahalli', 'Krishnarajapuram'],
    stopLabel: 'Station',
    apiMode: 'RAIL',
  },
  {
    id: 'bmtc',
    label: 'BMTC',
    Icon: Bus,
    color: '#3b82f6',
    authority: 'BMTC',
    tagline: '6,500+ buses · 2,200+ routes · 47 depots',
    layerIds: ['bmtc_depots'],
    stops: ['Majestic', 'KR Market', 'Shivajinagar', 'Koramangala', 'BTM Layout', 'Jayanagar', 'Banashankari', 'Rajajinagar', 'Yeshvantpur', 'Hebbal', 'Whitefield', 'Electronic City', 'Marathahalli', 'Sarjapur Road'],
    stopLabel: 'Stop',
    apiMode: 'BMTC',
  },
  {
    id: 'ksrtc',
    label: 'KSRTC',
    Icon: Bus,
    color: '#10b981',
    authority: 'KSRTC / NEKRTC',
    tagline: 'Intercity & interstate routes from Bengaluru',
    layerIds: ['ksrtc_terminals'],
    stops: ['Kempegowda BS (Majestic)', 'Satellite BS (Vijayanagar)', 'Shivajinagar BS', 'Mysuru', 'Mangaluru', 'Hubballi', 'Hassan', 'Tumakuru', 'Chikkaballapur', 'Kolar'],
    stopLabel: 'Terminal',
    apiMode: 'KSRTC',
  },
];

function GenericRoutePlanner({ tab }: { tab: GenericTab }) {
  const [from, setFrom] = useState(tab.stops[0]);
  const [to, setTo] = useState(tab.stops[3] ?? tab.stops[1]);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ fare: string; time: string } | null>(null);

  const handleScan = async () => {
    setScanning(true);
    setResult(null);
    try {
      const res = await fetch(`http://localhost:3001/transit/estimate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&mode=${tab.apiMode}`);
      if (res.ok) setResult(await res.json());
      else throw new Error();
    } catch {
      setResult({ fare: '—', time: '—' });
    } finally {
      setScanning(false);
    }
  };

  const swap = () => { const t = from; setFrom(to); setTo(t); setResult(null); };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1 block">From · {tab.stopLabel}</label>
        <div className="relative">
          <select value={from} onChange={e => { setFrom(e.target.value); setResult(null); }}
            className="w-full h-10 bg-zinc-900/80 border border-zinc-800 rounded-xl pl-3 pr-8 text-[10px] font-black text-zinc-200 outline-none focus:border-zinc-600 appearance-none cursor-pointer">
            {tab.stops.map(s => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
          </select>
          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600 rotate-90 pointer-events-none" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-800" />
        <button onClick={swap} className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-600 flex items-center justify-center transition-all active:scale-90">
          <ArrowUpDown className="w-3 h-3 text-zinc-500" />
        </button>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>
      <div>
        <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1 block">To · {tab.stopLabel}</label>
        <div className="relative">
          <select value={to} onChange={e => { setTo(e.target.value); setResult(null); }}
            className="w-full h-10 bg-zinc-900/80 border border-zinc-800 rounded-xl pl-3 pr-8 text-[10px] font-black text-zinc-200 outline-none focus:border-zinc-600 appearance-none cursor-pointer">
            {tab.stops.map(s => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
          </select>
          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600 rotate-90 pointer-events-none" />
        </div>
      </div>
      <button
        onClick={handleScan}
        disabled={scanning || from === to}
        style={(!scanning && from !== to) ? { backgroundColor: tab.color, borderColor: tab.color } : undefined}
        className={cn(
          "w-full h-10 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase transition-all border",
          scanning || from === to ? "bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed" : "text-white hover:opacity-90 active:scale-95"
        )}
      >
        {scanning ? 'Scanning...' : 'Scan Route'}
      </button>
      {result && (
        <div className="grid grid-cols-2 gap-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet className="w-3 h-3 text-zinc-500" />
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Fare</span>
            </div>
            <span className="text-[18px] font-black text-white tabular-nums">{result.fare === '—' ? '—' : `₹${result.fare}`}</span>
            {result.fare === '—' && <div className="text-[7px] text-zinc-700 mt-0.5">Backend stub</div>}
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">ETA</span>
            </div>
            <span className="text-[18px] font-black text-white tabular-nums">{result.time}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Status badge styles ──────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  LIVE:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  STALE:   'bg-amber-500/10  text-amber-400  border-amber-500/20',
  STUB:    'bg-zinc-800      text-zinc-500   border-zinc-700',
  ARCHIVE: 'bg-zinc-800      text-zinc-500   border-zinc-700',
};

// ── All tabs config ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'metro', label: 'Metro', Icon: Train, color: '#bc00ff' },
  { id: 'rail',  label: 'Rail',  Icon: Train, color: '#f59e0b' },
  { id: 'bmtc',  label: 'BMTC',  Icon: Bus,   color: '#3b82f6' },
  { id: 'ksrtc', label: 'KSRTC', Icon: Bus,   color: '#10b981' },
];

// ── Main drawer ──────────────────────────────────────────────────────────────

export function CommuteDrawer({ layers, onToggleLayer, onClose }: CommuteDrawerProps) {
  const [activeTab, setActiveTab] = useState('metro');

  const isMetro = activeTab === 'metro';
  const otherTab = OTHER_TABS.find(t => t.id === activeTab);

  const activeLayerIds = isMetro
    ? ['metro_lines', 'metro_stations']
    : (otherTab?.layerIds ?? []);

  const tabLayers = activeLayerIds
    .map(id => layers.find(l => l.id === id))
    .filter(Boolean) as LayerNode[];

  const activeColor = TABS.find(t => t.id === activeTab)?.color ?? '#bc00ff';
  const ActiveIcon = TABS.find(t => t.id === activeTab)?.Icon ?? Train;

  return (
    <div className="w-[340px] max-h-[calc(100vh-6rem)] flex flex-col
      bg-zinc-950/95 border border-zinc-800 rounded-[2.5rem]
      shadow-[0_50px_100px_rgba(0,0,0,0.9)] backdrop-blur-3xl overflow-hidden
      animate-in slide-in-from-left-4 fade-in duration-300">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-zinc-800 flex items-center gap-3 shrink-0">
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center transition-all shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-zinc-400" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-white text-[12px] font-black tracking-[0.3em] uppercase">Commute</div>
          <div className="text-zinc-600 text-[9px] font-black tracking-widest uppercase truncate">Bengaluru Transit Network</div>
        </div>
      </div>

      {/* Tab strip */}
      <div className="px-4 pt-3 flex gap-1.5 shrink-0">
        {TABS.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex-1 h-9 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all border text-[8px] font-black tracking-widest uppercase",
                isActive ? "border-zinc-700 bg-zinc-900" : "border-transparent hover:border-zinc-800 text-zinc-600 hover:text-zinc-400"
              )}
              style={isActive ? { color: t.color } : undefined}
            >
              <t.Icon className="w-3.5 h-3.5" style={isActive ? { color: t.color } : undefined} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Active tab indicator */}
      <div className="px-4 pt-2 pb-3 shrink-0">
        <div className="flex gap-1.5">
          {TABS.map(t => (
            <div key={t.id} className="flex-1 h-0.5 rounded-full transition-all duration-300"
              style={{ backgroundColor: activeTab === t.id ? t.color : '#27272a' }} />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 pb-5 flex flex-col gap-5" key={activeTab}>

        {/* Layer toggles */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-0.5">Map Layers</div>
          {tabLayers.map(layer => (
            <button
              key={layer.id}
              onClick={() => onToggleLayer(layer.id, !layer.visible)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all text-left",
                layer.visible ? "bg-zinc-100 border-zinc-100" : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: layer.visible ? layer.color : '#52525b' }} />
                <span className={cn("text-[10px] font-black uppercase tracking-tight",
                  layer.visible ? "text-black" : "text-zinc-300")}>
                  {layer.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {layer.status && (
                  <span className={cn("px-1.5 h-4 rounded text-[7px] font-black tracking-widest uppercase border flex items-center",
                    STATUS_STYLE[layer.status] || STATUS_STYLE.STUB)}>
                    {layer.status}
                  </span>
                )}
                <div className={cn("w-3.5 h-3.5 rounded-sm border transition-all",
                  layer.visible ? "bg-black border-black" : "bg-zinc-700 border-zinc-700")} />
              </div>
            </button>
          ))}
        </div>

        {/* Metro: map tap hint */}
        {isMetro && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-purple-500/20 bg-purple-500/5">
            <MousePointerClick className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">Next train timings</div>
              <div className="text-[8px] text-zinc-600 mt-0.5 leading-snug">Tap any station marker on the map — see arrivals + direction</div>
            </div>
          </div>
        )}

        {/* Route planner divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Route Planner</span>
          <div className="flex-1 h-px bg-zinc-800" />
          {!isMetro && (
            <span className="text-[7px] font-black uppercase tracking-widest border px-1.5 py-0.5 rounded"
              style={{ color: activeColor, borderColor: `${activeColor}40` }}>
              STUB
            </span>
          )}
        </div>

        {/* Route planner content */}
        {isMetro ? <MetroRoutePlanner /> : otherTab && <GenericRoutePlanner tab={otherTab} />}

      </div>
    </div>
  );
}
