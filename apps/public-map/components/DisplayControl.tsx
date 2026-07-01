"use client"

import React, { useState } from 'react';
import { Sliders, X, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VisualState, DEFAULT_VISUAL } from './VisualControls';

interface DisplayControlProps {
  visuals: VisualState;
  onChange: (v: VisualState) => void;
}

const PRESETS: { label: string; state: VisualState }[] = [
  { label: 'DEFAULT',       state: DEFAULT_VISUAL },
  { label: 'NIGHT_OPS',     state: { brightness: 80,  contrast: 150, hueRotate: 90,  grayscale: 0,   invert: 0   } },
  { label: 'HIGH_CONTRAST', state: { brightness: 120, contrast: 120, hueRotate: 0,   grayscale: 100, invert: 0   } },
  { label: 'X-RAY',         state: { brightness: 100, contrast: 100, hueRotate: 0,   grayscale: 0,   invert: 100 } },
];

function Slider({ label, value, min, max, unit, onChange }: {
  label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
        <span className="text-[9px] font-black text-zinc-300 tabular-nums">{value}{unit}</span>
      </div>
      <div className="relative h-1 bg-zinc-800 rounded-full">
        <div
          className="absolute left-0 top-0 h-full bg-zinc-300 rounded-full pointer-events-none"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range" min={min} max={max} value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
      </div>
    </div>
  );
}

export function DisplayControl({ visuals, onChange }: DisplayControlProps) {
  const [open, setOpen] = useState(false);
  const isDefault = JSON.stringify(visuals) === JSON.stringify(DEFAULT_VISUAL);

  return (
    <>
      {/* Floating trigger — sits above Leaflet zoom controls (zoom top ≈ 140px from viewport bottom) */}
      <div className="fixed bottom-[10.5rem] right-3 z-[200]">
        <button
          onClick={() => setOpen(v => !v)}
          className={cn(
            "w-9 h-9 rounded-2xl flex items-center justify-center transition-all border shadow-lg",
            open
              ? "bg-zinc-100 text-black border-zinc-200 scale-105"
              : "bg-zinc-950/95 text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 backdrop-blur",
            !isDefault && !open && "border-zinc-500 text-zinc-200"
          )}
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>

      {/* Panel — opens upward from button */}
      {open && (
        <div className="fixed bottom-[14rem] right-3 z-[200] w-56
          bg-zinc-950/95 border border-zinc-800 rounded-[1.5rem]
          shadow-[0_32px_80px_rgba(0,0,0,0.9)] backdrop-blur-3xl overflow-hidden
          animate-in slide-in-from-bottom-2 fade-in duration-200">

          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-zinc-100" />
              <span className="text-[9px] font-black tracking-[0.3em] text-zinc-100 uppercase">Display</span>
            </div>
            <div className="flex items-center gap-1.5">
              {!isDefault && (
                <button
                  onClick={() => onChange(DEFAULT_VISUAL)}
                  className="w-6 h-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center transition-all"
                  title="Reset"
                >
                  <RefreshCcw className="w-3 h-3 text-zinc-500" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center transition-all"
              >
                <X className="w-3 h-3 text-zinc-500" />
              </button>
            </div>
          </div>

          {/* Presets */}
          <div className="px-3 pt-3 pb-2 border-b border-zinc-800 grid grid-cols-2 gap-1.5">
            {PRESETS.map(p => {
              const active = JSON.stringify(visuals) === JSON.stringify(p.state);
              return (
                <button
                  key={p.label}
                  onClick={() => onChange(p.state)}
                  className={cn(
                    "h-8 rounded-xl text-[8px] font-black tracking-widest uppercase transition-all border",
                    active
                      ? "bg-zinc-100 text-black border-zinc-100 shadow-lg"
                      : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Sliders */}
          <div className="px-4 py-3 flex flex-col gap-3.5">
            <Slider label="Brightness" value={visuals.brightness} min={50}  max={200} unit="%" onChange={v => onChange({ ...visuals, brightness: v })} />
            <Slider label="Contrast"   value={visuals.contrast}   min={50}  max={200} unit="%" onChange={v => onChange({ ...visuals, contrast: v })} />
            <Slider label="Hue_Shift"  value={visuals.hueRotate}  min={0}   max={360} unit="°" onChange={v => onChange({ ...visuals, hueRotate: v })} />
            <div className="flex gap-1.5">
              {(['grayscale', 'invert'] as const).map(key => (
                <button
                  key={key}
                  onClick={() => onChange({ ...visuals, [key]: visuals[key] === 100 ? 0 : 100 })}
                  className={cn(
                    "flex-1 h-7 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border",
                    visuals[key] === 100
                      ? "bg-zinc-100 text-black border-zinc-100"
                      : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
