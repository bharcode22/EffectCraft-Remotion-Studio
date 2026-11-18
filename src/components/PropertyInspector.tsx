import React, { useState } from 'react';
import { Diamond, ExternalLink } from 'lucide-react';
import { evaluatePropertyAtFrame } from '../engine/bridge';
import {
  AnimatableProperty,
  BlendMode,
  EasingKind,
  EcLayer,
  RemotionTrack,
} from '../types/studio';

interface PropertyInspectorProps {
  layer: EcLayer | null;
  remotionTrack: RemotionTrack | null;
  currentFrame: number;
  fps: number;
  maxFrame: number;
  onUpdateLayer: (layerId: string, updater: (layer: EcLayer) => EcLayer) => void;
  onToggleKeyframe: (layerId: string, property: AnimatableProperty, value: number, easing: EasingKind) => void;
  onOpenSyncInspector: () => void;
}

interface TransformFieldConfig {
  key: AnimatableProperty;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const TRANSFORM_FIELDS: TransformFieldConfig[] = [
  { key: 'x', label: 'Position X', min: -1200, max: 1200, step: 1, unit: 'px' },
  { key: 'y', label: 'Position Y', min: -800, max: 800, step: 1, unit: 'px' },
  { key: 'scale', label: 'Scale', min: 0.05, max: 3, step: 0.05, unit: '×' },
  { key: 'rotation', label: 'Rotation', min: -360, max: 360, step: 1, unit: '°' },
  { key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.02, unit: '' },
];

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  layer,
  remotionTrack,
  currentFrame,
  fps,
  maxFrame,
  onUpdateLayer,
  onToggleKeyframe,
  onOpenSyncInspector,
}) => {
  const [tab, setTab] = useState<'properties' | 'live-props'>('properties');
  const [defaultEasing, setDefaultEasing] = useState<EasingKind>('spring');

  if (!layer) {
    return (
      <aside className="w-full lg:w-[348px] bg-[#131720] border-t lg:border-t-0 lg:border-l border-[#242B3A] p-6 flex flex-col items-center justify-center text-center shrink-0">
        <p className="text-xs font-medium text-slate-300 mb-1">Tidak ada layer terpilih</p>
        <p className="text-xs text-slate-500">
          Pilih atau tambahkan layer di panel kiri untuk mengedit transformasi, keyframe, dan properti Remotion.
        </p>
      </aside>
    );
  }

  const updateTransformValue = (prop: AnimatableProperty, nextVal: number) => {
    onUpdateLayer(layer.id, (prev) => {
      const existingIdx = prev.keyframes.findIndex(
        (k) => k.property === prop && k.frame === currentFrame
      );
      if (existingIdx >= 0) {
        const nextKfs = [...prev.keyframes];
        nextKfs[existingIdx] = { ...nextKfs[existingIdx], value: nextVal };
        return { ...prev, keyframes: nextKfs };
      }
      // If property already has keyframes on other frames, auto-insert at currentFrame
      const hasAnyKf = prev.keyframes.some((k) => k.property === prop);
      if (hasAnyKf) {
        return {
          ...prev,
          keyframes: [
            ...prev.keyframes,
            {
              id: `kf-${layer.id}-${prop}-${currentFrame}-${Date.now()}`,
              frame: currentFrame,
              property: prop,
              value: nextVal,
              easing: defaultEasing,
            },
          ],
        };
      }
      return {
        ...prev,
        transform: { ...prev.transform, [prop]: nextVal },
      };
    });
  };

  return (
    <aside className="w-full lg:w-[348px] bg-[#131720] border-t lg:border-t-0 lg:border-l border-[#242B3A] flex flex-col shrink-0">
      {/* Segmented Panel Header */}
      <div className="p-3 border-b border-[#242B3A] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-[#0B0E14] rounded-md border border-[#242B3A]">
          <button
            type="button"
            onClick={() => setTab('properties')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              tab === 'properties' ? 'bg-[#191E2A] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Properties
          </button>
          <button
            type="button"
            onClick={() => setTab('live-props')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              tab === 'live-props' ? 'bg-[#191E2A] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Remotion Track
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-500 tabular-nums">
          f{String(currentFrame).padStart(3, '0')}
        </span>
      </div>

      {tab === 'live-props' ? (
        <div className="flex-1 flex flex-col min-h-0 p-4 gap-3 overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-300">Synced Remotion Track Props</p>
            <button
              type="button"
              onClick={onOpenSyncInspector}
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap"
            >
              <span>Full Sync Editor</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <pre className="flex-1 p-3 bg-[#0B0E14] border border-[#242B3A] rounded-md text-[11px] font-mono text-slate-300 overflow-auto leading-relaxed">
            {JSON.stringify(remotionTrack, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-[#242B3A]">
          {layer.locked && (
            <div className="px-4 py-2.5 bg-amber-500/10 text-amber-300 text-xs">
              Layer terkunci. Buka ikon gembok di Layer Stack untuk mengubah properti.
            </div>
          )}

          {/* Layer Identity & Timing */}
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Layer Name</label>
              <input
                type="text"
                disabled={layer.locked}
                value={layer.name}
                onChange={(e) =>
                  onUpdateLayer(layer.id, (prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-2.5 py-1.5 text-xs bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Start (f)</label>
                <input
                  type="number"
                  disabled={layer.locked}
                  min={0}
                  max={layer.endFrame - 1}
                  value={layer.startFrame}
                  onChange={(e) =>
                    onUpdateLayer(layer.id, (prev) => ({
                      ...prev,
                      startFrame: Math.max(0, Math.min(prev.endFrame - 1, Number(e.target.value) || 0)),
                    }))
                  }
                  className="w-full px-2 py-1.5 text-xs font-mono bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded tabular-nums disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">End (f)</label>
                <input
                  type="number"
                  disabled={layer.locked}
                  min={layer.startFrame + 1}
                  max={maxFrame}
                  value={layer.endFrame}
                  onChange={(e) =>
                    onUpdateLayer(layer.id, (prev) => ({
                      ...prev,
                      endFrame: Math.max(
                        prev.startFrame + 1,
                        Math.min(maxFrame, Number(e.target.value) || maxFrame)
                      ),
                    }))
                  }
                  className="w-full px-2 py-1.5 text-xs font-mono bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded tabular-nums disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Blend</label>
                <select
                  disabled={layer.locked}
                  value={layer.blendMode}
                  onChange={(e) =>
                    onUpdateLayer(layer.id, (prev) => ({
                      ...prev,
                      blendMode: e.target.value as BlendMode,
                    }))
                  }
                  className="w-full px-2 py-1.5 text-xs bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded disabled:opacity-50"
                >
                  <option value="normal">Normal</option>
                  <option value="screen">Screen</option>
                  <option value="multiply">Multiply</option>
                  <option value="overlay">Overlay</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transform + Keyframe Controls */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200">Transform & Keyframes</h3>
              <select
                aria-label="Default Keyframe Easing"
                value={defaultEasing}
                onChange={(e) => setDefaultEasing(e.target.value as EasingKind)}
                className="px-2 py-1 text-[11px] bg-[#0B0E14] text-slate-300 border border-[#242B3A] rounded"
              >
                <option value="spring">Spring</option>
                <option value="easeOut">Ease Out</option>
                <option value="linear">Linear</option>
              </select>
            </div>

            <div className="space-y-2.5">
              {TRANSFORM_FIELDS.map((field) => {
                const propKfs = layer.keyframes.filter((k) => k.property === field.key);
                const evaluated = evaluatePropertyAtFrame(
                  layer.transform[field.key],
                  propKfs,
                  currentFrame,
                  fps
                );
                const roundedVal =
                  field.step < 1 ? Number(evaluated.toFixed(2)) : Math.round(evaluated);
                const hasKfAtFrame = propKfs.some((k) => k.frame === currentFrame);

                return (
                  <div key={field.key} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={layer.locked}
                          title={
                            hasKfAtFrame
                              ? `Hapus keyframe ${field.label} di frame ${currentFrame}`
                              : `Tambah keyframe ${field.label} di frame ${currentFrame}`
                          }
                          onClick={() =>
                            onToggleKeyframe(layer.id, field.key, roundedVal, defaultEasing)
                          }
                          className={`p-1 rounded transition-colors disabled:opacity-40 ${
                            hasKfAtFrame
                              ? 'text-blue-400 bg-blue-500/15'
                              : propKfs.length > 0
                              ? 'text-blue-300/60 hover:text-blue-300'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <Diamond
                            className="w-3 h-3"
                            fill={hasKfAtFrame ? 'currentColor' : 'none'}
                          />
                        </button>
                        <span className="text-xs text-slate-300">{field.label}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          disabled={layer.locked}
                          step={field.step}
                          value={roundedVal}
                          onChange={(e) =>
                            updateTransformValue(field.key, Number(e.target.value) || 0)
                          }
                          className="w-16 px-2 py-0.5 text-right text-xs font-mono bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded tabular-nums disabled:opacity-50"
                        />
                        {field.unit && (
                          <span className="text-[11px] text-slate-500 w-4">{field.unit}</span>
                        )}
                      </div>
                    </div>

                    <input
                      type="range"
                      disabled={layer.locked}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={roundedVal}
                      onChange={(e) => updateTransformValue(field.key, Number(e.target.value))}
                      className="w-full h-1.5 bg-[#0B0E14] rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-40"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Layer Type Specific Styling & Effects */}
          <div className="p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-200">Style & Effects</h3>

            {layer.type === 'text' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Text Content</label>
                  <textarea
                    rows={2}
                    disabled={layer.locked}
                    value={layer.style.text ?? ''}
                    onChange={(e) =>
                      onUpdateLayer(layer.id, (prev) => ({
                        ...prev,
                        style: { ...prev.style, text: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Font Size</label>
                    <input
                      type="number"
                      disabled={layer.locked}
                      min={12}
                      max={300}
                      value={layer.style.fontSize ?? 64}
                      onChange={(e) =>
                        onUpdateLayer(layer.id, (prev) => ({
                          ...prev,
                          style: { ...prev.style, fontSize: Number(e.target.value) || 24 },
                        }))
                      }
                      className="w-full px-2 py-1.5 text-xs font-mono bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Letter Spacing</label>
                    <input
                      type="number"
                      disabled={layer.locked}
                      min={-10}
                      max={40}
                      value={layer.style.letterSpacing ?? 0}
                      onChange={(e) =>
                        onUpdateLayer(layer.id, (prev) => ({
                          ...prev,
                          style: { ...prev.style, letterSpacing: Number(e.target.value) || 0 },
                        }))
                      }
                      className="w-full px-2 py-1.5 text-xs font-mono bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded tabular-nums"
                    />
                  </div>
                </div>
              </div>
            )}

            {layer.type === 'counter' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">From Value</label>
                    <input
                      type="number"
                      disabled={layer.locked}
                      value={layer.style.counterFrom ?? 0}
                      onChange={(e) =>
                        onUpdateLayer(layer.id, (prev) => ({
                          ...prev,
                          style: { ...prev.style, counterFrom: Number(e.target.value) || 0 },
                        }))
                      }
                      className="w-full px-2 py-1.5 text-xs font-mono bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">To Value</label>
                    <input
                      type="number"
                      disabled={layer.locked}
                      value={layer.style.counterTo ?? 100}
                      onChange={(e) =>
                        onUpdateLayer(layer.id, (prev) => ({
                          ...prev,
                          style: { ...prev.style, counterTo: Number(e.target.value) || 0 },
                        }))
                      }
                      className="w-full px-2 py-1.5 text-xs font-mono bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded tabular-nums"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Prefix</label>
                    <input
                      type="text"
                      disabled={layer.locked}
                      value={layer.style.counterPrefix ?? ''}
                      onChange={(e) =>
                        onUpdateLayer(layer.id, (prev) => ({
                          ...prev,
                          style: { ...prev.style, counterPrefix: e.target.value },
                        }))
                      }
                      className="w-full px-2 py-1.5 text-xs bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Suffix</label>
                    <input
                      type="text"
                      disabled={layer.locked}
                      value={layer.style.counterSuffix ?? ''}
                      onChange={(e) =>
                        onUpdateLayer(layer.id, (prev) => ({
                          ...prev,
                          style: { ...prev.style, counterSuffix: e.target.value },
                        }))
                      }
                      className="w-full px-2 py-1.5 text-xs bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Font Size</label>
                    <input
                      type="number"
                      disabled={layer.locked}
                      min={16}
                      max={300}
                      value={layer.style.fontSize ?? 96}
                      onChange={(e) =>
                        onUpdateLayer(layer.id, (prev) => ({
                          ...prev,
                          style: { ...prev.style, fontSize: Number(e.target.value) || 64 },
                        }))
                      }
                      className="w-full px-2 py-1.5 text-xs font-mono bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded tabular-nums"
                    />
                  </div>
                </div>
              </div>
            )}

            {(layer.type === 'shape' || layer.type === 'gradient') && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Width</label>
                  <input
                    type="number"
                    disabled={layer.locked}
                    min={4}
                    max={4000}
                    value={layer.style.width ?? 400}
                    onChange={(e) =>
                      onUpdateLayer(layer.id, (prev) => ({
                        ...prev,
                        style: { ...prev.style, width: Number(e.target.value) || 100 },
                      }))
                    }
                    className="w-full px-2 py-1.5 text-xs font-mono bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Height</label>
                  <input
                    type="number"
                    disabled={layer.locked}
                    min={4}
                    max={4000}
                    value={layer.style.height ?? 200}
                    onChange={(e) =>
                      onUpdateLayer(layer.id, (prev) => ({
                        ...prev,
                        style: { ...prev.style, height: Number(e.target.value) || 100 },
                      }))
                    }
                    className="w-full px-2 py-1.5 text-xs font-mono bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Radius</label>
                  <input
                    type="number"
                    disabled={layer.locked}
                    min={0}
                    max={1000}
                    value={layer.style.borderRadius ?? 0}
                    onChange={(e) =>
                      onUpdateLayer(layer.id, (prev) => ({
                        ...prev,
                        style: { ...prev.style, borderRadius: Number(e.target.value) || 0 },
                      }))
                    }
                    className="w-full px-2 py-1.5 text-xs font-mono bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded tabular-nums"
                  />
                </div>
              </div>
            )}

            {/* Color & Blur shared */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  {layer.type === 'gradient' ? 'Color Start' : 'Color'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={layer.locked}
                    value={layer.style.color}
                    onChange={(e) =>
                      onUpdateLayer(layer.id, (prev) => ({
                        ...prev,
                        style: { ...prev.style, color: e.target.value },
                      }))
                    }
                    className="w-8 h-7 bg-transparent border border-[#242B3A] rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    disabled={layer.locked}
                    value={layer.style.color}
                    onChange={(e) =>
                      onUpdateLayer(layer.id, (prev) => ({
                        ...prev,
                        style: { ...prev.style, color: e.target.value },
                      }))
                    }
                    className="w-full px-2 py-1 text-xs font-mono bg-[#0B0E14] text-slate-200 border border-[#242B3A] rounded"
                  />
                </div>
              </div>

              {layer.type === 'gradient' ? (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Color End</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      disabled={layer.locked}
                      value={layer.style.secondaryColor ?? '#1E3A8A'}
                      onChange={(e) =>
                        onUpdateLayer(layer.id, (prev) => ({
                          ...prev,
                          style: { ...prev.style, secondaryColor: e.target.value },
                        }))
                      }
                      className="w-8 h-7 bg-transparent border border-[#242B3A] rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      disabled={layer.locked}
                      value={layer.style.secondaryColor ?? '#1E3A8A'}
                      onChange={(e) =>
                        onUpdateLayer(layer.id, (prev) => ({
                          ...prev,
                          style: { ...prev.style, secondaryColor: e.target.value },
                        }))
                      }
                      className="w-full px-2 py-1 text-xs font-mono bg-[#0B0E14] text-slate-200 border border-[#242B3A] rounded"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Gaussian Blur (px)</label>
                  <input
                    type="number"
                    disabled={layer.locked}
                    min={0}
                    max={80}
                    value={layer.style.blur ?? 0}
                    onChange={(e) =>
                      onUpdateLayer(layer.id, (prev) => ({
                        ...prev,
                        style: { ...prev.style, blur: Math.max(0, Number(e.target.value) || 0) },
                      }))
                    }
                    className="w-full px-2 py-1 text-xs font-mono bg-[#0B0E14] text-slate-200 border border-[#242B3A] rounded tabular-nums"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
