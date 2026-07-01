"use client"

import React from 'react';
import { LayerNode } from '@/lib/layers';
import { cn } from '@/lib/utils';
import { X, Trash2 } from 'lucide-react';

interface ActiveStackProps {
  layers: LayerNode[];
  onToggleLayer: (id: string, visible: boolean) => void;
  onFlush: () => void;
}

export function ActiveStack({ layers, onToggleLayer, onFlush }: ActiveStackProps) {
  const activeLayers = layers.filter(l => l.visible && l.type !== 'base' && l.type !== 'realtime');

  if (activeLayers.length === 0) return null;

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 pointer-events-none">
      {activeLayers.map((layer) => (
        <div
          key={layer.id}
          className="flex items-center gap-3 bg-zinc-100 px-4 py-2 rounded-2xl pointer-events-auto shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-300 border border-zinc-300"
        >
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
          <span className="text-black text-[10px] font-black tracking-widest uppercase leading-none whitespace-nowrap">
            {layer.code}
          </span>
          <button
            onClick={() => onToggleLayer(layer.id, false)}
            className="p-0.5 hover:bg-zinc-200 rounded-lg transition-all"
          >
            <X className="w-3 h-3 text-zinc-500 hover:text-black" />
          </button>
        </div>
      ))}

      <button
        onClick={onFlush}
        className="flex items-center gap-2 bg-black px-4 py-2 rounded-2xl border border-zinc-800 hover:bg-zinc-900 transition-all pointer-events-auto shadow-xl"
      >
        <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
      </button>
    </div>
  );
}
