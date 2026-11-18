import React, { useRef } from 'react';
import { Diamond, Plus, Trash2 } from 'lucide-react';
import { EcLayer } from '../types/studio';

interface TimelineDockProps {
  layers: EcLayer[];
  selectedLayerId: string | null;
  durationInFrames: number;
  fps: number;
  currentFrame: number;
  onSeekToFrame: (frame: number) => void;
  onSelectLayer: (layerId: string) => void;
  onDeleteKeyframe: (layerId: string, keyframeId: string) => void;
  onAddOpacityKeyframeAtCurrent: (layerId: string) => void;
}

export const TimelineDock: React.FC<TimelineDockProps> = ({
  layers,
  selectedLayerId,
  durationInFrames,
  fps,
  currentFrame,
  onSeekToFrame,
  onSelectLayer,
  onDeleteKeyframe,
  onAddOpacityKeyframeAtCurrent,
}) => {
  const trackAreaRef = useRef<HTMLDivElement>(null);

  const scrubFromClientX = (clientX: number) => {
    const el = trackAreaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    const nextFrame = Math.round(ratio * Math.max(1, durationInFrames - 1));
    onSeekToFrame(nextFrame);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    scrubFromClientX(e.clientX);
  };

  const displayLayers = [...layers].reverse();
  const playheadPct = (currentFrame / Math.max(1, durationInFrames - 1)) * 100;

  // Build crisp ruler tick intervals
  const tickStep = durationInFrames <= 90 ? 15 : durationInFrames <= 240 ? 30 : 60;
  const ticks: number[] = [];
  for (let f = 0; f <= durationInFrames; f += tickStep) {
    ticks.push(f);
  }

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) ?? null;

  return (
    <section className="h-[224px] bg-[#131720] border-t border-[#242B3A] flex flex-col shrink-0 select-none">
      {/* Timeline Header Bar */}
      <div className="px-4 py-2 border-b border-[#242B3A] flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-slate-200">Timeline & Keyframes</span>
          <span className="text-slate-500 tabular-nums">
            {durationInFrames} frames · {fps} fps
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedLayer && (
            <button
              type="button"
              disabled={selectedLayer.locked}
              onClick={() => onAddOpacityKeyframeAtCurrent(selectedLayer.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-[#191E2A] hover:bg-[#222938] border border-[#242B3A] rounded disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3 h-3 text-blue-400" />
              <span>Keyframe Opacity @ f{currentFrame}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split: Layer Labels + Scrubbable Track Lanes */}
      <div className="flex-1 flex min-h-0 overflow-y-auto">
        {/* Left Track Names */}
        <div className="w-[210px] lg:w-[276px] border-r border-[#242B3A] bg-[#131720] shrink-0">
          <div className="h-7 px-4 border-b border-[#242B3A] flex items-center text-[11px] text-slate-500">
            Layer Track
          </div>
          {displayLayers.map((layer) => {
            const isSelected = layer.id === selectedLayerId;
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => onSelectLayer(layer.id)}
                className={`w-full h-9 px-4 border-b border-[#1D2330] flex items-center justify-between gap-2 text-left transition-colors ${
                  isSelected ? 'bg-blue-600/15 text-white' : 'text-slate-300 hover:bg-[#191E2A]'
                }`}
              >
                <span className="text-xs truncate">{layer.name}</span>
                <span className="text-[11px] font-mono text-slate-500 tabular-nums shrink-0">
                  {layer.keyframes.length} kf
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Scrubbable Time Ruler & Keyframe Lanes */}
        <div className="flex-1 min-w-0 relative flex flex-col">
          {/* Ruler */}
          <div
            ref={trackAreaRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            className="h-7 border-b border-[#242B3A] bg-[#0B0E14] relative cursor-ew-resize shrink-0"
          >
            {ticks.map((f) => {
              const pct = (f / Math.max(1, durationInFrames - 1)) * 100;
              return (
                <div
                  key={f}
                  className="absolute top-0 bottom-0 flex flex-col justify-between pointer-events-none"
                  style={{ left: `${Math.min(98, pct)}%` }}
                >
                  <span className="text-[10px] font-mono text-slate-500 tabular-nums pl-1 pt-0.5">
                    {f}
                  </span>
                  <span className="w-px h-1.5 bg-slate-600" />
                </div>
              );
            })}

            {/* Playhead Knob */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 pointer-events-none z-20"
              style={{ left: `${playheadPct}%` }}
            >
              <div className="w-2.5 h-2.5 -ml-[4px] bg-blue-500 rotate-45 rounded-[1px]" />
            </div>
          </div>

          {/* Layer Span Bars & Keyframe Diamonds */}
          <div className="flex-1 relative">
            {/* Vertical Playhead Line across lanes */}
            <div
              className="absolute top-0 bottom-0 w-px bg-blue-500/70 pointer-events-none z-10"
              style={{ left: `${playheadPct}%` }}
            />

            {displayLayers.map((layer) => {
              const isSelected = layer.id === selectedLayerId;
              const startPct = (layer.startFrame / Math.max(1, durationInFrames)) * 100;
              const spanPct =
                ((layer.endFrame - layer.startFrame) / Math.max(1, durationInFrames)) * 100;

              // Group keyframes by frame for clean diamond markers
              const framesMap = new Map<number, typeof layer.keyframes>();
              for (const kf of layer.keyframes) {
                const list = framesMap.get(kf.frame) ?? [];
                list.push(kf);
                framesMap.set(kf.frame, list);
              }

              return (
                <div
                  key={layer.id}
                  onClick={() => onSelectLayer(layer.id)}
                  className={`h-9 border-b border-[#1D2330] relative ${
                    isSelected ? 'bg-blue-600/5' : ''
                  }`}
                >
                  {/* Sequence Span Bar */}
                  <div
                    className={`absolute top-2 bottom-2 rounded-sm border transition-colors ${
                      isSelected
                        ? 'bg-blue-500/20 border-blue-500/50'
                        : 'bg-[#191E2A] border-[#2A3346]'
                    }`}
                    style={{
                      left: `${startPct}%`,
                      width: `${Math.max(2, spanPct)}%`,
                    }}
                  />

                  {/* Keyframe Diamonds */}
                  {Array.from(framesMap.entries()).map(([frame, kfs]) => {
                    const kfPct = (frame / Math.max(1, durationInFrames - 1)) * 100;
                    const firstKf = kfs[0];
                    return (
                      <div
                        key={frame}
                        className="group/kf absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 flex items-center"
                        style={{ left: `${kfPct}%` }}
                      >
                        <button
                          type="button"
                          title={`Frame ${frame}: ${kfs
                            .map((k) => `${k.property}=${k.value}`)
                            .join(', ')} (Klik untuk lompat ke frame)`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLayer(layer.id);
                            onSeekToFrame(frame);
                          }}
                          className="p-0.5 text-blue-400 hover:text-white transition-transform hover:scale-125"
                        >
                          <Diamond className="w-3 h-3" fill="currentColor" />
                        </button>
                        {!layer.locked && isSelected && (
                          <button
                            type="button"
                            title={`Hapus keyframe di frame ${frame}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteKeyframe(layer.id, firstKf.id);
                            }}
                            className="hidden group-hover/kf:inline-flex ml-0.5 p-0.5 bg-[#0B0E14] border border-[#242B3A] rounded text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
