"use client"

import React from 'react';
import { Button } from './ui/button';
import { Sun, Contrast, Palette, RefreshCcw, Eye, Ghost } from 'lucide-react';

export interface VisualState {
  brightness: number;
  contrast: number;
  hueRotate: number;
  grayscale: number;
  invert: number;
}

interface VisualControlsProps {
  state: VisualState;
  onChange: (newState: VisualState) => void;
}

export const DEFAULT_VISUAL: VisualState = {
  brightness: 100,
  contrast: 100,
  hueRotate: 0,
  grayscale: 0,
  invert: 0
};

export const VisualControls: React.FC<VisualControlsProps> = ({ state, onChange }) => {
  const update = (key: keyof VisualState, val: number) => {
    onChange({ ...state, [key]: val });
  };

  const setPreset = (preset: VisualState) => {
    onChange(preset);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="text-[10px] font-black tracking-widest gap-2 h-9 border-white/5 bg-slate-900/50 hover:bg-blue-600 hover:text-white transition-all"
          onClick={() => setPreset(DEFAULT_VISUAL)}
        >
          <RefreshCcw className="w-3 h-3" /> RESET
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-[10px] font-black tracking-widest gap-2 h-9 border-white/5 bg-slate-900/50 hover:bg-emerald-600 hover:text-white transition-all"
          onClick={() => setPreset({ brightness: 80, contrast: 150, hueRotate: 90, grayscale: 0, invert: 0 })}
        >
          <Eye className="w-3 h-3" /> NIGHT_OPS
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-[10px] font-black tracking-widest gap-2 h-9 border-white/5 bg-slate-900/50 hover:bg-amber-600 hover:text-white transition-all"
          onClick={() => setPreset({ brightness: 120, contrast: 120, hueRotate: 0, grayscale: 100, invert: 0 })}
        >
          <Ghost className="w-3 h-3" /> HIGH_CONTRAST
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-[10px] font-black tracking-widest gap-2 h-9 border-white/5 bg-slate-900/50 hover:bg-purple-600 hover:text-white transition-all"
          onClick={() => setPreset({ brightness: 100, contrast: 100, hueRotate: 0, grayscale: 0, invert: 100 })}
        >
          <Palette className="w-3 h-3" /> X-RAY
        </Button>
      </div>

      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sun className="w-3 h-3 text-slate-500" />
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Brightness</label>
            </div>
            <span className="text-[9px] font-mono text-blue-500">{state.brightness}%</span>
          </div>
          <input 
            type="range" min="50" max="200" value={state.brightness} 
            onChange={(e) => update('brightness', parseInt(e.target.value))}
            className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Contrast className="w-3 h-3 text-slate-500" />
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contrast</label>
            </div>
            <span className="text-[9px] font-mono text-blue-500">{state.contrast}%</span>
          </div>
          <input 
            type="range" min="50" max="200" value={state.contrast} 
            onChange={(e) => update('contrast', parseInt(e.target.value))}
            className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Palette className="w-3 h-3 text-slate-500" />
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hue_Shift</label>
            </div>
            <span className="text-[9px] font-mono text-blue-500">{state.hueRotate}°</span>
          </div>
          <input 
            type="range" min="0" max="360" value={state.hueRotate} 
            onChange={(e) => update('hueRotate', parseInt(e.target.value))}
            className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
           <div className="flex items-center justify-between p-3 bg-slate-900/30 border border-white/5 rounded-xl">
             <span className="text-[9px] font-black text-slate-500 uppercase">Grayscale</span>
             <input 
               type="checkbox" 
               checked={state.grayscale === 100} 
               onChange={(e) => update('grayscale', e.target.checked ? 100 : 0)}
               className="w-3 h-3 accent-blue-500 cursor-pointer"
             />
           </div>
           <div className="flex items-center justify-between p-3 bg-slate-900/30 border border-white/5 rounded-xl">
             <span className="text-[9px] font-black text-slate-500 uppercase">Invert</span>
             <input 
               type="checkbox" 
               checked={state.invert === 100} 
               onChange={(e) => update('invert', e.target.checked ? 100 : 0)}
               className="w-3 h-3 accent-blue-500 cursor-pointer"
             />
           </div>
        </div>
      </div>
    </div>
  );
};
