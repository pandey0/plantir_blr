"use client"

import React from 'react';
import { DomainNode, LayerNode } from '@/lib/layers';
import { cn } from '@/lib/utils';
import { 
  HardHat, 
  Shield, 
  Activity, 
  Layers,
  Power
} from 'lucide-react';

interface DomainBrowserProps {
  domains: DomainNode[];
  onToggleLayer: (id: string, visible: boolean) => void;
}

const ICON_MAP: { [key: string]: any } = {
  HardHat,
  Shield,
  Activity
};

export function DomainBrowser({ domains, onToggleLayer }: DomainBrowserProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {domains.map((domain) => {
        const Icon = ICON_MAP[domain.icon] || Layers;
        const activeCount = domain.layers.filter(l => l.visible).length;

        return (
          <div key={domain.id} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <h4 className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">{domain.name}</h4>
              </div>
              <span className="text-[9px] font-black text-blue-500/50 tracking-widest">{activeCount} / {domain.layers.length} ACTIVE</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {domain.layers.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => onToggleLayer(layer.id, !layer.visible)}
                  className={cn(
                    "relative flex flex-col items-start p-4 rounded-[1.5rem] border transition-all duration-500 group overflow-hidden",
                    layer.visible 
                      ? "bg-white/10 border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.2)]" 
                      : "bg-white/5 border-white/5 hover:bg-white/10"
                  )}
                >
                  {/* Layer Glow Effect */}
                  {layer.visible && (
                    <div 
                      className="absolute inset-0 opacity-20 blur-xl animate-pulse"
                      style={{ background: `radial-gradient(circle at center, ${layer.color}, transparent)` }}
                    />
                  )}

                  <div className="flex items-center justify-between w-full relative z-10">
                    <div 
                      className={cn(
                        "w-2 h-2 rounded-full transition-all duration-500",
                        layer.visible ? "scale-110 shadow-[0_0_10px_currentColor]" : "bg-slate-700"
                      )}
                      style={{ backgroundColor: layer.visible ? layer.color : undefined }}
                    />
                    <Power className={cn(
                      "w-3 h-3 transition-colors",
                      layer.visible ? "text-white" : "text-slate-700"
                    )} />
                  </div>

                  <div className="mt-4 relative z-10 text-left">
                    <div className={cn(
                      "text-[10px] font-black tracking-tight transition-colors",
                      layer.visible ? "text-white" : "text-slate-500"
                    )}>
                      {layer.name.split(' ').join('_').toUpperCase()}
                    </div>
                    <div className="text-[8px] font-bold text-slate-600 mt-1 uppercase line-clamp-1">
                      {layer.status || 'STABLE'}
                    </div>
                  </div>

                  {/* Active Indicator Bar */}
                  <div className={cn(
                    "absolute bottom-0 left-0 h-1 transition-all duration-500",
                    layer.visible ? "w-full" : "w-0"
                  )} style={{ backgroundColor: layer.color }} />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
