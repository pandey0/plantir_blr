"use client"

import React, { useState } from 'react';
import { Bus, Activity, X, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DomainNode, LayerNode } from '@/lib/layers';
import { VisualState } from '../VisualControls';
import { CommuteDrawer } from './CommuteDrawer';

interface CommandHUDProps {
  layers: LayerNode[];
  onToggleLayer: (id: string, visible: boolean) => void;
  visuals: VisualState;
  onVisualChange: (v: VisualState) => void;
  events: any[];
  domains: DomainNode[];
}

export function CommandHUD({ layers, onToggleLayer, visuals, onVisualChange, events, domains }: CommandHUDProps) {
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  const navItems = [
    { id: 'commute',      label: 'COMMUTE', icon: Bus },
    { id: 'public_assets', label: 'ASSETS',  icon: Building2 },
    { id: 'tactical',     label: 'SIGNALS', icon: Activity },
  ];

  const currentDomainData = domains.find(d => d.id === activeDomain);

  const getDomainBadge = (domainId: string) => {
    const domain = domains.find(d => d.id === domainId);
    if (!domain) return 0;
    return domain.layers.filter(l => l.visible).length;
  };

  // Commute drawer replaces the whole HUD
  if (activeDomain === 'commute') {
    const commuteLayers = domains.find(d => d.id === 'commute')?.layers ?? [];
    return (
      <div className="fixed left-8 top-1/2 -translate-y-1/2 z-[100]">
        <CommuteDrawer
          layers={commuteLayers}
          onToggleLayer={onToggleLayer}
          onClose={() => setActiveDomain(null)}
        />
      </div>
    );
  }

  return (
    <div className="fixed left-8 top-1/2 -translate-y-1/2 z-[100] flex gap-6 items-center">
      {/* ICON STRIP */}
      <div className="w-20 rounded-[2.5rem] flex flex-col items-center py-8 gap-6 border border-zinc-800 shadow-2xl backdrop-blur-3xl bg-zinc-950/95">
        {navItems.map((item) => {
          const badge = getDomainBadge(item.id);
          const isSignals = item.id === 'tactical';
          const hasEvents = isSignals && events.length > 0;

          return (
            <button
              key={item.id}
              onClick={() => setActiveDomain(activeDomain === item.id ? null : item.id)}
              className={cn(
                "w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 group relative",
                activeDomain === item.id
                  ? "bg-zinc-100 text-black scale-110 shadow-2xl"
                  : "hover:bg-white/5 text-zinc-500"
              )}
            >
              <div className="relative">
                <item.icon className={cn("w-6 h-6 mb-1", activeDomain === item.id ? "text-black" : "group-hover:text-white")} />
                {badge > 0 && !isSignals && (
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-[7px] font-black text-white leading-none">{badge}</span>
                  </div>
                )}
                {hasEvents && (
                  <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>
              <span className="text-[8px] font-black tracking-widest uppercase leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* FLY-OUT for ASSETS + SIGNALS */}
      <div className={cn(
        "rounded-[2.5rem] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden border border-zinc-800 shadow-[0_50px_100px_rgba(0,0,0,0.9)] bg-zinc-950/95",
        activeDomain ? "w-[360px] opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-20 pointer-events-none"
      )}>
        <div className="p-8 w-[360px]">
          <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-zinc-100" />
              <h3 className="text-white text-[12px] font-black tracking-[0.4em] uppercase">
                {activeDomain}_INTERFACE
              </h3>
            </div>
            <button onClick={() => setActiveDomain(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <div className="max-h-[560px] overflow-y-auto pr-2 custom-scrollbar">
            {(activeDomain === 'tactical' || activeDomain === 'public_assets') && (
              <div className="grid grid-cols-1 gap-3">
                {currentDomainData?.layers.map(layer => (
                  <button
                    key={layer.id}
                    onClick={() => onToggleLayer(layer.id, !layer.visible)}
                    className={cn(
                      "relative p-5 rounded-2xl border transition-all text-left flex items-center justify-between group overflow-hidden h-20",
                      layer.visible
                        ? "bg-zinc-100 border-zinc-100 text-black shadow-2xl"
                        : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 text-zinc-500"
                    )}
                  >
                    <div className="flex items-center gap-5 relative z-10">
                      <div className={cn(
                        "w-3.5 h-3.5 rounded-sm transition-all border",
                        layer.visible ? "bg-black border-black" : "bg-zinc-800 border-zinc-700"
                      )} />
                      <div>
                        <div className={cn(
                          "text-[11px] font-black tracking-tight block uppercase",
                          layer.visible ? "text-black" : "text-white"
                        )}>{layer.name}</div>
                        <div className={cn(
                          "text-[9px] font-bold mt-1 uppercase opacity-60",
                          layer.visible ? "text-zinc-700" : "text-zinc-500"
                        )}>{layer.description}</div>
                      </div>
                    </div>
                    <div
                      className={cn("w-1.5 h-full absolute right-0 top-0", layer.visible ? "opacity-100" : "opacity-20")}
                      style={{ backgroundColor: layer.color }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
