import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Hash,
  Layers,
  Lock,
  Plus,
  Square,
  Trash2,
  Type,
  Unlock,
  Palette,
} from 'lucide-react';
import { STUDIO_PRESETS } from '../data/presets';
import { EcLayer, EcLayerType } from '../types/studio';

interface LayerStackPanelProps {
  layers: EcLayer[];
  selectedLayerId: string | null;
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
  onSelectLayer: (layerId: string) => void;
  onAddLayer: (type: EcLayerType) => void;
  onToggleVisible: (layerId: string) => void;
  onToggleLocked: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onMoveLayer: (layerId: string, direction: 'forward' | 'backward') => void;
}

const LAYER_TYPE_META: Record<EcLayerType, { label: string; icon: React.ReactNode }> = {
  text: { label: 'Text', icon: <Type className="w-3.5 h-3.5 text-blue-400" /> },
  shape: { label: 'Shape', icon: <Square className="w-3.5 h-3.5 text-indigo-400" /> },
  gradient: { label: 'Gradient', icon: <Palette className="w-3.5 h-3.5 text-teal-400" /> },
  counter: { label: 'Counter', icon: <Hash className="w-3.5 h-3.5 text-amber-400" /> },
};

export const LayerStackPanel: React.FC<LayerStackPanelProps> = ({
  layers,
  selectedLayerId,
  activePresetId,
  onSelectPreset,
  onSelectLayer,
  onAddLayer,
  onToggleVisible,
  onToggleLocked,
  onDuplicateLayer,
  onDeleteLayer,
  onMoveLayer,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Display top-most z-index layer first (index length-1 down to 0)
  const displayLayers = [...layers].reverse();

  return (
    <aside className="w-full lg:w-[276px] bg-[#131720] border-b lg:border-b-0 lg:border-r border-[#242B3A] flex flex-col shrink-0 select-none">
      {/* Presets Selector */}
      <div className="p-4 border-b border-[#242B3A]">
        <label
          htmlFor="preset-select"
          className="block text-[11px] font-medium text-slate-400 mb-2"
        >
          Composition Preset
        </label>
        <select
          id="preset-select"
          value={activePresetId}
          onChange={(e) => onSelectPreset(e.target.value)}
          className="w-full px-3 py-2 text-xs font-medium bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded-md focus:outline-none focus:border-blue-500"
        >
          {STUDIO_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
          {activePresetId === 'custom' && <option value="custom">Custom Modified Project</option>}
        </select>
      </div>

      {/* Layer Stack Header */}
      <div className="px-4 py-3 border-b border-[#242B3A] flex items-center justify-between gap-2 relative">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <h2 className="text-xs font-semibold tracking-wide text-slate-200">
            EffectCraft Layers
          </h2>
          <span className="text-[11px] text-slate-500 tabular-nums">({layers.length})</span>
        </div>

        <button
          type="button"
          onClick={() => setShowAddMenu((prev) => !prev)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 bg-[#191E2A] hover:bg-[#222938] border border-[#242B3A] rounded transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3 h-3" />
          <span>Add</span>
        </button>

        {showAddMenu && (
          <div className="absolute right-4 top-11 z-30 w-44 bg-[#191E2A] border border-[#2E374A] rounded-md shadow-xl py-1">
            {(['text', 'shape', 'gradient', 'counter'] as EcLayerType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onAddLayer(type);
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-blue-600/20 hover:text-white flex items-center gap-2.5 transition-colors"
              >
                {LAYER_TYPE_META[type].icon}
                <span>{LAYER_TYPE_META[type].label} Layer</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1D2330]">
        {displayLayers.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs text-slate-400 mb-3">
              Belum ada layer pada composition ini.
            </p>
            <button
              type="button"
              onClick={() => onAddLayer('text')}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
            >
              Add First Layer
            </button>
          </div>
        ) : (
          displayLayers.map((layer, displayIdx) => {
            const isSelected = layer.id === selectedLayerId;
            const isTopMost = displayIdx === 0;
            const isBottomMost = displayIdx === displayLayers.length - 1;

            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectLayer(layer.id);
                  }
                }}
                className={`group px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-600/15 text-white'
                    : 'hover:bg-[#191E2A] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="shrink-0">{LAYER_TYPE_META[layer.type].icon}</span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-xs font-medium truncate ${
                        !layer.visible ? 'text-slate-500 line-through' : ''
                      }`}
                    >
                      {layer.name}
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums truncate">
                      {LAYER_TYPE_META[layer.type].label} · f{layer.startFrame}–{layer.endFrame}
                    </div>
                  </div>
                </div>

                {/* Compact row action buttons */}
                <div
                  className="flex items-center gap-0.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    title="Move forward"
                    disabled={isTopMost}
                    onClick={() => onMoveLayer(layer.id, 'forward')}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-25 rounded"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title="Move backward"
                    disabled={isBottomMost}
                    onClick={() => onMoveLayer(layer.id, 'backward')}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-25 rounded"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                    onClick={() => onToggleVisible(layer.id)}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    {layer.visible ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </button>
                  <button
                    type="button"
                    title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                    onClick={() => onToggleLocked(layer.id)}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    {layer.locked ? (
                      <Lock className="w-3 h-3 text-amber-400" />
                    ) : (
                      <Unlock className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                    )}
                  </button>
                  <button
                    type="button"
                    title="Duplicate layer"
                    onClick={() => onDuplicateLayer(layer.id)}
                    className="p-1 text-slate-400 hover:text-white rounded hidden group-hover:inline-flex"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title="Delete layer"
                    onClick={() => onDeleteLayer(layer.id)}
                    className="p-1 text-slate-400 hover:text-red-400 rounded hidden group-hover:inline-flex"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
