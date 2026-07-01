import React from 'react';
import { LayerNode } from '@/lib/layers';
import { cn } from '@/lib/utils';
import { ChevronRight, Database, Map as MapIcon, Info, Activity } from 'lucide-react';

interface LayerTreeProps {
  layers: LayerNode[];
  onToggleLayer: (id: string, visible: boolean) => void;
}

export const LayerTree: React.FC<LayerTreeProps> = ({ layers, onToggleLayer }) => {
  const renderNode = (node: LayerNode, depth: number = 0) => {
    const isGroup = node.type === 'group';
    
    return (
      <div key={node.id} className="mb-1" style={{ marginLeft: `${depth * 8}px` }}>
        <div 
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-lg transition-all group/item",
            !isGroup && "hover:bg-white/5 cursor-pointer"
          )}
          onClick={(e) => {
            if (!isGroup) {
              onToggleLayer(node.id, !node.visible);
            }
          }}
        >
          {isGroup ? (
            <ChevronRight className="w-3 h-3 text-slate-600 transition-transform group-data-[state=open]:rotate-90" />
          ) : (
            <div className={cn(
              "w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all",
              node.visible 
                ? "bg-blue-600 border-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.4)]" 
                : "bg-transparent border-white/10 group-hover/item:border-white/20"
            )}>
              {node.visible && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
            </div>
          )}
          
          <div className="flex-1 flex flex-col min-w-0">
             <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] tracking-tight transition-colors truncate",
                  isGroup 
                    ? "font-black text-slate-500 uppercase" 
                    : node.visible ? "font-bold text-slate-200" : "font-medium text-slate-500 group-hover/item:text-slate-400"
                )}>
                  {node.name}
                </span>
                
                {node.status && (
                  <span className={cn(
                    "text-[7px] font-black px-1 rounded-sm",
                    node.status === 'LIVE' ? "bg-emerald-500/10 text-emerald-500" : 
                    node.status === 'ARCHIVE' ? "bg-blue-500/10 text-blue-500" : "bg-slate-500/10 text-slate-500"
                  )}>
                    {node.status}
                  </span>
                )}
             </div>
             
             {node.description && !isGroup && node.visible && (
                <span className="text-[8px] font-medium text-slate-600 leading-tight mt-0.5 animate-in fade-in slide-in-from-left-1">
                  {node.description}
                </span>
             )}
          </div>

          {!isGroup && node.color && (
            <div 
              className="w-1.5 h-1.5 rounded-full shrink-0" 
              style={{ 
                background: node.color,
                boxShadow: node.visible ? `0 0 8px ${node.color}80` : 'none'
              }} 
            />
          )}
        </div>

        {isGroup && node.children && (
          <div className="mt-1 border-l border-white/5 ml-3.5 pl-1 space-y-0.5 relative">
            <div className="absolute left-[-1px] top-0 bottom-4 w-[1px] bg-gradient-to-b from-white/10 to-transparent" />
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {layers.map(layer => renderNode(layer))}
    </div>
  );
};
