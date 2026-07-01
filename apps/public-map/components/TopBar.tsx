"use client"

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { HierarchyType } from '@/lib/geo-utils';
import { CATEGORY_REGISTRY, CATEGORY_KEYS } from '@/lib/categories';
import { BANGALORE_HIERARCHY } from '@/lib/hierarchy';

// "BENGALURU_NORTH" → "NORTH BLR", fallback to raw strip
function shortCorpName(name: string): string {
  const stripped = name.replace(/BENGALURU_/i, '').replace(/_/g, ' ');
  return stripped + ' BLR';
}

export interface TopBarProps {
  currentLevel: HierarchyType;
  activeName: string;   // corp name at WARD level, ward name at BLOCK level
  corpId: string | null;
  onRetract: () => void;
  eventCount: number;
  wsConnected: boolean;
  categoryFilter: string;
  onCategoryFilter: (cat: string) => void;
}

export function TopBar({
  currentLevel, activeName, corpId, onRetract,
  eventCount, wsConnected,
  categoryFilter, onCategoryFilter,
}: TopBarProps) {

  // Resolve corp display name from id → BANGALORE_HIERARCHY
  const corpEntry = BANGALORE_HIERARCHY.find(c => c.id === corpId);
  const corpDisplay = corpEntry ? shortCorpName(corpEntry.name) : (corpId ? shortCorpName(corpId.toUpperCase()) : '');

  // Ward display name — activeName at BLOCK level
  const wardDisplay = activeName.replace(/_/g, ' ');

  return (
    <div className="fixed top-0 left-0 right-0 h-12 bg-black/95 backdrop-blur-xl border-b border-zinc-900 z-[300] flex items-center px-6 gap-4">

      {/* LEFT: Logo + drill breadcrumb showing exact path */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-2.5 h-2.5 bg-white" />
        <span className="text-white text-[10px] font-black tracking-[0.3em] uppercase">BNG</span>

        {/* WARD level: BNG › NORTH BLR (clickable → back to corp view) */}
        {currentLevel === 'WARD' && corpDisplay && (
          <>
            <ChevronRight className="w-3 h-3 text-zinc-700" />
            <button
              onClick={onRetract}
              className="text-[10px] font-black tracking-[0.15em] uppercase text-zinc-400 hover:text-white transition-colors whitespace-nowrap"
            >
              {corpDisplay}
            </button>
          </>
        )}

        {/* BLOCK level: BNG › NORTH BLR (→ retract) › Ward Name (current) */}
        {currentLevel === 'BLOCK' && (
          <>
            {corpDisplay && (
              <>
                <ChevronRight className="w-3 h-3 text-zinc-700" />
                <button
                  onClick={onRetract}
                  className="text-[10px] font-black tracking-[0.15em] uppercase text-zinc-400 hover:text-white transition-colors whitespace-nowrap"
                >
                  {corpDisplay}
                </button>
              </>
            )}
            <ChevronRight className="w-3 h-3 text-zinc-700" />
            <span className="text-[10px] font-black tracking-[0.15em] uppercase text-white whitespace-nowrap max-w-[140px] truncate">
              {wardDisplay}
            </span>
          </>
        )}
      </div>

      <div className="w-px h-5 bg-zinc-800 shrink-0" />

      {/* CENTER: Category filter chips — always visible */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => onCategoryFilter('ALL')}
            className={cn(
              "shrink-0 px-3 h-7 rounded-full text-[9px] font-black tracking-widest uppercase transition-all whitespace-nowrap border",
              categoryFilter === 'ALL'
                ? "bg-white text-black border-white"
                : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 border-zinc-800"
            )}
          >
            ALL
          </button>
          {CATEGORY_KEYS.filter(k => k !== 'OTHER').map(cat => {
            const { label, color } = CATEGORY_REGISTRY[cat];
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => onCategoryFilter(cat)}
                className={cn(
                  "shrink-0 px-3 h-7 rounded-full text-[9px] font-black tracking-widest uppercase transition-all whitespace-nowrap border",
                  active
                    ? "text-black border-transparent shadow-sm"
                    : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 border-zinc-800"
                )}
                style={active ? { backgroundColor: color } : {}}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: WS indicator + event count */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            wsConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"
          )} />
          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
            {wsConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {eventCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 h-6 rounded-full bg-red-500/10 border border-red-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-black text-red-400 tabular-nums">{eventCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
