"use client"

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { HierarchyType } from '@/lib/geo-utils';
import { ZONE_ADMIN, WARD_ADMIN_TEMPLATE, HELPLINES, Official } from '@/lib/admin-data';

interface AdminDrawerProps {
  level: HierarchyType;
  corpId: string | null;
  zoneName: string;
  onClose: () => void;
}

const TIER_COLOR: Record<string, string> = {
  national: '#f59e0b',
  state:    '#a855f7',
  city:     '#3b82f6',
  zone:     '#10b981',
  ward:     '#f97316',
};

function OfficialRow({ o }: { o: Official }) {
  return (
    <div className="flex items-start justify-between gap-2 py-2.5 border-b border-zinc-800/50 last:border-0">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className={cn(
          "text-[11px] font-black leading-tight",
          o.isPlaceholder ? "text-zinc-600 italic" : "text-zinc-100"
        )}>
          {o.name}
        </span>
        <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-wide">{o.role}</span>
        {!o.isPlaceholder && o.department && (
          <span className="text-[8px] text-zinc-700">{o.department}</span>
        )}
      </div>
      {o.contact && !o.isPlaceholder && (
        <a href={`tel:${o.contact}`}
          className="shrink-0 flex items-center gap-1 px-2 h-5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all mt-0.5"
        >
          <Phone className="w-2.5 h-2.5 text-zinc-400" />
          <span className="text-[8px] font-black text-zinc-400">{o.contact}</span>
        </a>
      )}
    </div>
  );
}

function TierSection({ id, label, sublabel, officials, defaultOpen }: {
  id: string; label: string; sublabel: string; officials: Official[]; defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const color = TIER_COLOR[id] || '#71717a';
  const confirmed = officials.filter(o => !o.isPlaceholder).length;

  return (
    <div className="border-b border-zinc-800/60 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="w-1 h-6 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color }}>{label}</div>
          <div className="text-[8px] text-zinc-600 uppercase tracking-wide">{sublabel}</div>
        </div>
        <span className="text-[8px] font-black text-zinc-700 shrink-0">
          {confirmed}/{officials.length}
        </span>
        {open ? <ChevronUp className="w-3 h-3 text-zinc-700 shrink-0" /> : <ChevronDown className="w-3 h-3 text-zinc-700 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-1">
          {officials.map((o, i) => <OfficialRow key={i} o={o} />)}
        </div>
      )}
    </div>
  );
}

// Zone accent colors matching BANGALORE_HIERARCHY
const ZONE_COLOR: Record<string, string> = {
  north:   '#10b981',
  south:   '#3b82f6',
  east:    '#bc00ff',
  west:    '#f59e0b',
  central: '#71717a',
};

export function AdminDrawer({ level, corpId, zoneName, onClose }: AdminDrawerProps) {
  const zoneId = corpId ?? zoneName.toLowerCase().replace('bengaluru_', '');
  const zoneData = ZONE_ADMIN[zoneId];
  const zoneColor = ZONE_COLOR[zoneId] || '#fff';

  interface TierDef { id: string; label: string; sublabel: string; officials: Official[]; showAt: HierarchyType[] }

  const tiers: TierDef[] = [
    {
      id: 'national', label: 'National', sublabel: 'Lok Sabha MP',
      officials: zoneData ? [zoneData.mp] : [{ role: 'MP', name: '[MP]', department: 'Lok Sabha', isPlaceholder: true }],
      showAt: ['WARD'],
    },
    {
      id: 'state', label: 'State', sublabel: 'Karnataka Legislature — MLAs',
      officials: zoneData ? zoneData.mlas : [{ role: 'MLA', name: '[MLA]', department: 'Karnataka Legislature', isPlaceholder: true }],
      showAt: ['WARD'],
    },
    {
      id: 'zone', label: 'Zone', sublabel: 'City Corporation + Police',
      officials: zoneData ? [zoneData.commissioner, zoneData.dcp] : [{ role: 'Commissioner', name: '[Commissioner]', department: 'GBA', isPlaceholder: true }],
      showAt: ['WARD'],
    },
    {
      id: 'ward', label: 'Ward', sublabel: 'GBA Ward Committee',
      officials: [WARD_ADMIN_TEMPLATE.corporator, WARD_ADMIN_TEMPLATE.aee, WARD_ADMIN_TEMPLATE.healthOfficer],
      showAt: ['BLOCK'],
    },
  ];

  const visibleTiers = tiers.filter(t => t.showAt.includes(level));

  return (
    <div className="fixed right-4 top-[calc(3rem+1rem)] z-[160] w-72 max-h-[calc(100vh-8rem)] flex flex-col
      bg-zinc-900 border border-zinc-700/60 rounded-[1.5rem]
      shadow-[0_32px_80px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden
      animate-in slide-in-from-right-4 fade-in duration-300">

      {/* Colored zone identity strip */}
      <div className="h-1 w-full shrink-0" style={{ backgroundColor: zoneColor }} />

      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div>
          <div className="text-[8px] font-black tracking-[0.35em] text-zinc-500 uppercase">Administration</div>
          <div className="text-[13px] font-black uppercase tracking-tight mt-0.5" style={{ color: zoneColor }}>
            {zoneName.replace(/BENGALURU_/g, '').replace(/_/g, ' ')}
          </div>
          <div className="text-[9px] text-zinc-600 uppercase tracking-wide">
            {level === 'WARD' ? 'Zone Officials' : 'Ward Officials'}
          </div>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center transition-all"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Tiers */}
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        {visibleTiers.map(t => (
          <TierSection
            key={t.id}
            id={t.id}
            label={t.label}
            sublabel={t.sublabel}
            officials={t.officials}
            defaultOpen={true}
          />
        ))}

        {/* Helplines */}
        <div className="px-5 py-4 border-t border-zinc-800">
          <div className="text-[8px] font-black tracking-[0.35em] text-zinc-600 uppercase mb-2.5">Emergency_Lines</div>
          <div className="grid grid-cols-2 gap-1.5">
            {HELPLINES.map(h => (
              <a key={h.number} href={`tel:${h.number}`}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-800/60 border border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800 transition-all"
              >
                <span className="text-[8px] font-black text-zinc-500 uppercase">{h.label}</span>
                <span className="text-[10px] font-black text-white tabular-nums">{h.number}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
