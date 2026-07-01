"use client"

import React, { useState } from 'react';
import { LayerNode } from '@/lib/layers';
import { LayerTree } from './LayerTree';
import { Button } from './ui/button';
import { 
  Train, 
  Bus, 
  Wallet,
  Clock,
  ChevronRight,
  Target
} from 'lucide-react';

interface SidebarProps {
  layers: LayerNode[];
  onToggleLayer: (id: string, visible: boolean) => void;
  events: any[];
  visuals: any;
  onVisualChange: (v: any) => void;
  isFloatingHUD?: boolean;
}

const METRO_STATIONS_LIST = ["Majestic", "Indiranagar", "MG Road", "Whitefield", "Silk Board", "Koramangala", "Jayanagar", "JP Nagar"];

export function Sidebar({ layers, onToggleLayer, events, visuals, onVisualChange, isFloatingHUD }: SidebarProps) {
  const [transitMode, setTransitMode] = useState<'METRO' | 'BUS'>('METRO');
  const [selectedFrom, setSelectedFrom] = useState('Majestic');
  const [selectedTo, setSelectedTo] = useState('Whitefield');
  const [estimate, setEstimate] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleCheckStatus = async () => {
    setIsSearching(true);
    try {
      const [arrRes, estRes] = await Promise.all([
        fetch(`http://localhost:3001/transit/arrivals?station=${selectedFrom}&mode=${transitMode}`),
        fetch(`http://localhost:3001/transit/estimate?from=${selectedFrom}&to=${selectedTo}&mode=${transitMode}`)
      ]);
      setEstimate(await estRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // If used inside the HUD, we only render the inner content
  if (isFloatingHUD) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2 p-1 bg-white/5 border border-white/5 rounded-xl">
          <Button 
            variant="ghost" 
            className={`flex-1 text-[10px] font-black tracking-widest h-8 rounded-lg transition-all ${transitMode === 'METRO' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
            onClick={() => setTransitMode('METRO')}
          >
            METRO
          </Button>
          <Button 
            variant="ghost" 
            className={`flex-1 text-[10px] font-black tracking-widest h-8 rounded-lg transition-all ${transitMode === 'BUS' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
            onClick={() => setTransitMode('BUS')}
          >
            BMTC
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Vector_Origin</label>
            <div className="relative group">
              <select 
                value={selectedFrom} 
                onChange={(e) => setSelectedFrom(e.target.value)} 
                className="w-full h-11 bg-white/5 border border-white/5 rounded-xl pl-4 pr-10 text-xs font-bold text-slate-200 outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
              >
                {METRO_STATIONS_LIST.map(s => <option key={s} value={s} className="bg-slate-900">{s.toUpperCase()}</option>)}
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-hover:text-blue-500 transition-all rotate-90" />
            </div>
          </div>

          <div className="flex justify-center -my-2 relative z-10">
            <div className="w-8 h-8 rounded-full bg-[#020617] border border-white/10 flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-blue-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Vector_Target</label>
            <div className="relative group">
              <select 
                value={selectedTo} 
                onChange={(e) => setSelectedTo(e.target.value)} 
                className="w-full h-11 bg-white/5 border border-white/5 rounded-xl pl-4 pr-10 text-xs font-bold text-slate-200 outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
              >
                {METRO_STATIONS_LIST.map(s => <option key={s} value={s} className="bg-slate-900">{s.toUpperCase()}</option>)}
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-hover:text-blue-500 transition-all rotate-90" />
            </div>
          </div>

          <Button 
            onClick={handleCheckStatus} 
            disabled={isSearching} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] tracking-[0.2em] h-12 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            {isSearching ? "SCANNING_GRID..." : "INITIATE_TACTICAL_SCAN"}
          </Button>
        </div>

        {estimate && (
          <div className="grid grid-cols-2 gap-3 pt-4 animate-in zoom-in-95 duration-300">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1 group hover:border-blue-500/30 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-3 h-3 text-blue-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Est_Fare</span>
              </div>
              <span className="text-2xl font-black text-slate-100 tabular-nums">₹{estimate.fare}</span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1 group hover:border-emerald-500/30 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3 h-3 text-emerald-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Travel_ETA</span>
              </div>
              <span className="text-2xl font-black text-slate-100 tabular-nums">{estimate.time}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Original Sidebar layout (Backwards compatibility if needed, but simplified)
  return (
    <div className="w-[360px] h-full bg-white border-r border-slate-200 flex flex-col z-20 shadow-lg">
       <div className="p-6">Panel mode deprecated. Please use the HUD.</div>
    </div>
  );
}
