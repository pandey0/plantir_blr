"use client"

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Wifi } from 'lucide-react';
import { getCategoryColor, getCategoryLabel } from '@/lib/categories';

interface EventTickerProps {
  events: any[];
  onEngage: (event: any) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function EventTicker({ events, onEngage }: EventTickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [events.length]);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 z-[200] flex items-center bg-black border-t border-zinc-900">
      {/* Label strip */}
      <div className="shrink-0 flex items-center gap-3 px-6 border-r border-zinc-800 h-full">
        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[9px] font-black tracking-[0.3em] text-zinc-500 uppercase whitespace-nowrap">
          Live_Feed
        </span>
      </div>

      {events.length === 0 ? (
        <div className="flex-1 flex items-center justify-center gap-3">
          <Wifi className="w-4 h-4 text-zinc-800 animate-pulse" />
          <span className="text-zinc-700 text-[10px] font-black tracking-[0.3em] uppercase">
            Scanning_Signals...
          </span>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 flex items-center gap-3 overflow-x-auto px-4"
          style={{ scrollbarWidth: 'none' }}
        >
          {events.map((event, i) => {
            const color = getCategoryColor(event.type);
            return (
              <button
                key={event.id || i}
                onClick={() => onEngage(event)}
                className={cn(
                  "shrink-0 flex items-center gap-3 px-4 h-10 rounded-2xl border transition-all duration-300",
                  "bg-zinc-950 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 active:scale-95",
                  "animate-in slide-in-from-right-4 fade-in duration-500"
                )}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }}
                />
                <div className="flex flex-col items-start min-w-0">
                  <span
                    className="text-[9px] font-black uppercase tracking-widest leading-none"
                    style={{ color }}
                  >
                    {getCategoryLabel(event.type)}
                  </span>
                  <span className="text-[11px] font-black text-white uppercase tracking-tight leading-none mt-0.5 truncate max-w-[120px]">
                    {event.location || 'Unknown'}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-zinc-600 tabular-nums shrink-0">
                  {event.created_at ? timeAgo(event.created_at) : `${i}m`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {events.length > 0 && (
        <div className="shrink-0 px-4 border-l border-zinc-800 h-full flex items-center">
          <span className="text-[9px] font-black text-zinc-600 tabular-nums">{events.length} SIG</span>
        </div>
      )}
    </div>
  );
}
