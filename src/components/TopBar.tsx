import React from 'react';
import { Download } from 'lucide-react';
import { WorkspaceView } from '../types/studio';

interface TopBarProps {
  activeView: WorkspaceView;
  onChangeView: (view: WorkspaceView) => void;
  onExportQuick: () => void;
}

const NAV_ITEMS: Array<{ id: WorkspaceView; label: string }> = [
  { id: 'studio', label: 'Studio' },
  { id: 'sync', label: 'Sync Inspector' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'export', label: 'Plugin Export' },
];

export const TopBar: React.FC<TopBarProps> = ({ activeView, onChangeView, onExportQuick }) => {
  return (
    <header className="h-14 px-6 bg-[#131720] border-b border-[#242B3A] flex items-center justify-between gap-8 shrink-0">
      {/* Zone 1: Single-line brand wordmark */}
      <button
        type="button"
        onClick={() => onChangeView('studio')}
        className="text-[15px] font-semibold tracking-tight text-slate-100 whitespace-nowrap shrink-0 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
      >
        EffectCraft Remotion Studio
      </button>

      {/* Zone 2: Clean single-line typography navigation */}
      <nav aria-label="Workspace views" className="hidden md:flex items-center gap-6">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeView(item.id)}
              className={`relative py-1 text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute left-0 right-0 -bottom-[17px] h-[2px] bg-blue-500" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Single primary action button */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onExportQuick}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Plugin Bundle</span>
        </button>
      </div>
    </header>
  );
};
