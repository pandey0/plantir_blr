"use client"

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, Users } from 'lucide-react';
import { HierarchyType } from '@/lib/geo-utils';
import { getCategoryColor, getCategoryLabel, CATEGORY_KEYS } from '@/lib/categories';
import { AdminDrawer } from './AdminDrawer';

interface ContextPanelProps {
  level: HierarchyType;
  name: string;
  corpId: string | null;
  events: any[];
  onRetract: () => void;
}

const LEVEL_COLOR: Record<HierarchyType, string> = {
  CITY:  '#3b82f6',
  CORP:  '#10b981',
  WARD:  '#a855f7',
  BLOCK: '#f97316',
};

export function ContextPanel({ level, name, corpId, events, onRetract }: ContextPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const visible = level === 'WARD' || level === 'BLOCK';

  const open      = events.filter(e => e.status === 'OPEN' || !e.status).length;
  const escalated = events.filter(e => e.status === 'ESCALATED').length;
  const resolved  = events.filter(e => e.status === 'RESOLVED').length;

  const byCategory = CATEGORY_KEYS.reduce<Record<string, number>>((acc, k) => {
    acc[k] = events.filter(e => e.type === k).length;
    return acc;
  }, {});
  const topCategories = CATEGORY_KEYS
    .filter(k => byCategory[k] > 0)
    .sort((a, b) => byCategory[b] - byCategory[a])
    .slice(0, 4);
  const maxCatCount = Math.max(...topCategories.map(k => byCategory[k]), 1);

  const accentColor = LEVEL_COLOR[level];

  return (
    <>
      {/* Compact stats panel */}
      <div className={cn(
        "fixed right-4 z-[150] w-56 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "top-[calc(3rem+1rem)]",
        visible && !drawerOpen
          ? "opacity-100 translate-x-0 pointer-events-auto"
          : "opacity-0 translate-x-8 pointer-events-none"
      )}>
        <div className="bg-zinc-900/95 border border-zinc-700/60 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl overflow-hidden">

          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-zinc-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="px-2 h-5 rounded-md text-[8px] font-black tracking-widest uppercase flex items-center border"
                style={{ color: accentColor, borderColor: `${accentColor}30`, backgroundColor: `${accentColor}10` }}
              >
                {level}
              </span>
              <button
                onClick={onRetract}
                className="flex items-center gap-1 px-2 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all"
              >
                <ChevronLeft className="w-3 h-3 text-zinc-400" />
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Back</span>
              </button>
            </div>
            <div className="text-white text-[12px] font-black tracking-tight uppercase leading-tight truncate">
              {name.replace(/_/g, ' ')}
            </div>
          </div>

          {/* Signal status */}
          <div className="px-4 py-3 border-b border-zinc-800/80">
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Open',      value: open,      color: '#e4e4e7' },
                { label: 'Escalated', value: escalated, color: '#fb923c' },
                { label: 'Resolved',  value: resolved,  color: '#34d399' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center gap-0.5 py-2 rounded-xl bg-zinc-800/50">
                  <span className="text-[14px] font-black tabular-nums leading-none" style={{ color }}>{value}</span>
                  <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          {topCategories.length > 0 ? (
            <div className="px-4 py-3 border-b border-zinc-800/80">
              <div className="text-[8px] font-black tracking-[0.3em] text-zinc-600 uppercase mb-2">Incident_Types</div>
              <div className="flex flex-col gap-1.5">
                {topCategories.map(cat => {
                  const count = byCategory[cat];
                  const color = getCategoryColor(cat);
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wide">
                          {getCategoryLabel(cat)}
                        </span>
                        <span className="text-[8px] font-black tabular-nums" style={{ color }}>{count}</span>
                      </div>
                      <div className="h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(count / maxCatCount) * 100}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 border-b border-zinc-800/80">
              <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">No signals in zone</span>
            </div>
          )}

          {/* Administration button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.03] transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              <span className="text-[9px] font-black text-zinc-500 group-hover:text-zinc-300 uppercase tracking-widest transition-colors">
                Administration
              </span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-zinc-500 transition-colors" />
          </button>

        </div>
      </div>

      {/* Admin drawer — slides in on button press */}
      {drawerOpen && (
        <AdminDrawer
          level={level}
          corpId={corpId}
          zoneName={name}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}
