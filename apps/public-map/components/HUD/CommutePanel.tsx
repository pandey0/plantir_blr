"use client"

import React from 'react';
import { cn } from '@/lib/utils';
import { Train, Bus } from 'lucide-react';
import { LayerNode } from '@/lib/layers';

interface CommutePanelProps {
  layers: LayerNode[];
  onToggleLayer: (id: string, visible: boolean) => void;
}

const STATUS_STYLE: Record<string, string> = {
  LIVE:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  STALE: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
  STUB:  'bg-zinc-800      text-zinc-500   border-zinc-700',
};

interface TransitGroup {
  id: string;
  label: string;
  authority: string;
  Icon: React.ElementType;
  color: string;
  description: string;
  layerIds: string[];
}

const TRANSIT_GROUPS: TransitGroup[] = [
  {
    id: 'metro',
    label: 'Namma Metro',
    authority: 'BMRCL',
    Icon: Train,
    color: '#bc00ff',
    description: 'Purple & Green lines. 83 stations across 96 km. No live API.',
    layerIds: ['metro_lines', 'metro_stations'],
  },
  {
    id: 'rail',
    label: 'Indian Railways',
    authority: 'South Western Rly',
    Icon: Train,
    color: '#f59e0b',
    description: 'KSR City, Yesvantpur, KR Puram, Cantonment & halt stations.',
    layerIds: ['ir_stations'],
  },
  {
    id: 'bmtc',
    label: 'BMTC City Bus',
    authority: 'BMTC',
    Icon: Bus,
    color: '#3b82f6',
    description: '6,500+ buses on 2,200+ routes. Depot locations shown (47 depots).',
    layerIds: ['bmtc_depots'],
  },
  {
    id: 'ksrtc',
    label: 'KSRTC Intercity',
    authority: 'KSRTC / NEKRTC',
    Icon: Bus,
    color: '#10b981',
    description: 'Kempegowda, Satellite & Shivajinagar terminals. Interstate routes.',
    layerIds: ['ksrtc_terminals'],
  },
];

export function CommutePanel({ layers, onToggleLayer }: CommutePanelProps) {
  const getLayer = (id: string) => layers.find(l => l.id === id);

  return (
    <div className="flex flex-col gap-3">
      {TRANSIT_GROUPS.map(group => {
        const groupLayers = group.layerIds.map(getLayer).filter(Boolean) as LayerNode[];
        const anyActive = groupLayers.some(l => l.visible);

        return (
          <div
            key={group.id}
            className={cn(
              "rounded-2xl border overflow-hidden transition-all",
              anyActive ? "border-zinc-700 bg-zinc-900/60" : "border-zinc-800 bg-zinc-900/30"
            )}
          >
            {/* Group header */}
            <div className="px-4 pt-4 pb-3 flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: `${group.color}18`, border: `1px solid ${group.color}30` }}
              >
                <group.Icon className="w-4 h-4" style={{ color: group.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-black text-white uppercase tracking-tight">{group.label}</span>
                  <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{group.authority}</span>
                </div>
                <p className="text-[9px] text-zinc-500 leading-snug">{group.description}</p>
              </div>
            </div>

            {/* Layer toggles */}
            <div className="px-3 pb-3 flex flex-col gap-1.5">
              {groupLayers.map(layer => (
                <button
                  key={layer.id}
                  onClick={() => onToggleLayer(layer.id, !layer.visible)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-left",
                    layer.visible
                      ? "bg-zinc-100 border-zinc-100 text-black"
                      : "bg-zinc-800/40 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: layer.visible ? layer.color : '#52525b' }}
                    />
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-tight",
                      layer.visible ? "text-black" : "text-zinc-300"
                    )}>
                      {layer.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {layer.status && (
                      <span className={cn(
                        "px-1.5 h-4 rounded text-[7px] font-black tracking-widest uppercase border flex items-center",
                        STATUS_STYLE[layer.status] || STATUS_STYLE.STUB
                      )}>
                        {layer.status}
                      </span>
                    )}
                    <div className={cn(
                      "w-3.5 h-3.5 rounded-sm border transition-all",
                      layer.visible ? "bg-black border-black" : "bg-zinc-700 border-zinc-700"
                    )} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
