import React, { useEffect, useState } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import {
  Crosshair,
  Pause,
  Play,
  Redo2,
  Repeat,
  SkipBack,
  SkipForward,
  Undo2,
} from 'lucide-react';
import { StudioComposition } from '../remotion/StudioComposition';
import { EcCompositionMeta, RemotionCompositionProps, SyncOrigin } from '../types/studio';

interface ViewportStageProps {
  playerRef: React.RefObject<PlayerRef | null>;
  remotionProps: RemotionCompositionProps;
  currentFrame: number;
  isPlaying: boolean;
  lastSyncOrigin: SyncOrigin;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFrameFromPlayer: (frame: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onSeekToFrame: (frame: number) => void;
  onUpdateCompositionMeta: (patch: Partial<EcCompositionMeta>) => void;
  onOpenSyncInspector: () => void;
}

const RESOLUTION_PRESETS = [
  { label: '1920×1080 (16:9)', width: 1920, height: 1080 },
  { label: '1080×1080 (1:1)', width: 1080, height: 1080 },
  { label: '1080×1920 (9:16)', width: 1080, height: 1920 },
  { label: '1280×720 (HD)', width: 1280, height: 720 },
];

const SYNC_ORIGIN_LABEL: Record<SyncOrigin, string> = {
  'effectcraft-ui': 'EffectCraft UI',
  'ecproj-json': '.ecproj JSON',
  'remotion-props': 'Remotion inputProps',
};

export const ViewportStage: React.FC<ViewportStageProps> = ({
  playerRef,
  remotionProps,
  currentFrame,
  isPlaying,
  lastSyncOrigin,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onFrameFromPlayer,
  onPlayingChange,
  onSeekToFrame,
  onUpdateCompositionMeta,
  onOpenSyncInspector,
}) => {
  const [loop, setLoop] = useState(true);
  const [showGuides, setShowGuides] = useState(false);

  const { meta } = remotionProps;

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handleFrameUpdate = (e: { detail: { frame: number } }) => {
      onFrameFromPlayer(e.detail.frame);
    };
    const handlePlay = () => onPlayingChange(true);
    const handlePause = () => onPlayingChange(false);

    player.addEventListener('frameupdate', handleFrameUpdate);
    player.addEventListener('play', handlePlay);
    player.addEventListener('pause', handlePause);

    return () => {
      player.removeEventListener('frameupdate', handleFrameUpdate);
      player.removeEventListener('play', handlePlay);
      player.removeEventListener('pause', handlePause);
    };
  }, [playerRef, onFrameFromPlayer, onPlayingChange]);

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const durationSec = (meta.durationInFrames / Math.max(1, meta.fps)).toFixed(2);
  const currentSec = (currentFrame / Math.max(1, meta.fps)).toFixed(2);

  const currentResKey = `${meta.width}x${meta.height}`;

  return (
    <section className="flex-1 bg-[#0B0E14] flex flex-col min-w-0 min-h-0">
      {/* Composition Settings & Sync Strip */}
      <div className="px-4 py-2.5 bg-[#131720] border-b border-[#242B3A] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            aria-label="Composition Name"
            value={meta.name}
            onChange={(e) => onUpdateCompositionMeta({ name: e.target.value })}
            className="px-2.5 py-1 text-xs font-medium bg-[#0B0E14] text-slate-100 border border-[#242B3A] rounded focus:outline-none focus:border-blue-500 w-44"
          />

          <select
            aria-label="Resolution Preset"
            value={
              RESOLUTION_PRESETS.some((r) => `${r.width}x${r.height}` === currentResKey)
                ? currentResKey
                : 'custom'
            }
            onChange={(e) => {
              const found = RESOLUTION_PRESETS.find(
                (r) => `${r.width}x${r.height}` === e.target.value
              );
              if (found) {
                onUpdateCompositionMeta({ width: found.width, height: found.height });
              }
            }}
            className="px-2.5 py-1 text-xs bg-[#0B0E14] text-slate-200 border border-[#242B3A] rounded focus:outline-none focus:border-blue-500 tabular-nums"
          >
            {RESOLUTION_PRESETS.map((r) => (
              <option key={r.label} value={`${r.width}x${r.height}`}>
                {r.label}
              </option>
            ))}
            {!RESOLUTION_PRESETS.some((r) => `${r.width}x${r.height}` === currentResKey) && (
              <option value="custom">
                {meta.width}×{meta.height} (Custom)
              </option>
            )}
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>FPS</span>
            <select
              aria-label="Frame Rate"
              value={meta.fps}
              onChange={(e) => onUpdateCompositionMeta({ fps: Number(e.target.value) })}
              className="px-2 py-1 text-xs bg-[#0B0E14] text-slate-200 border border-[#242B3A] rounded focus:outline-none focus:border-blue-500 tabular-nums"
            >
              <option value={24}>24</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Frames</span>
            <input
              type="number"
              aria-label="Duration In Frames"
              min={30}
              max={1800}
              value={meta.durationInFrames}
              onChange={(e) =>
                onUpdateCompositionMeta({
                  durationInFrames: Math.max(15, Math.min(1800, Number(e.target.value) || 30)),
                })
              }
              className="w-16 px-2 py-1 text-xs font-mono bg-[#0B0E14] text-slate-200 border border-[#242B3A] rounded focus:outline-none focus:border-blue-500 tabular-nums"
            />
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
            <span>BG</span>
            <input
              type="color"
              aria-label="Composition Background Color"
              value={meta.backgroundColor}
              onChange={(e) => onUpdateCompositionMeta({ backgroundColor: e.target.value })}
              className="w-6 h-6 bg-transparent border border-[#242B3A] rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Undo/Redo & Sync Status (unboxed text, no pills) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Undo"
              disabled={!canUndo}
              onClick={onUndo}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-[#191E2A] disabled:opacity-30 rounded transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Redo"
              disabled={!canRedo}
              onClick={onRedo}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-[#191E2A] disabled:opacity-30 rounded transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenSyncInspector}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap"
          >
            <span className="text-emerald-400 font-medium">Synced</span>
            <span className="mx-1.5 text-slate-600" aria-hidden="true">
              ·
            </span>
            <span>{SYNC_ORIGIN_LABEL[lastSyncOrigin]}</span>
          </button>
        </div>
      </div>

      {/* Remotion Player Center Viewport */}
      <div
        className="flex-1 min-h-0 p-4 lg:p-6 flex items-center justify-center overflow-hidden relative"
        style={{ containerType: 'size' }}
      >
        <div
          className="relative shadow-2xl border border-[#242B3A] bg-black overflow-hidden flex items-center justify-center"
          style={{
            width: `min(calc(100cqw - 32px), calc((100cqh - 32px) * (${meta.width} / ${meta.height})))`,
            height: `min(calc(100cqh - 32px), calc((100cqw - 32px) * (${meta.height} / ${meta.width})))`,
          }}
        >
          <Player
            ref={playerRef}
            component={StudioComposition}
            inputProps={remotionProps}
            durationInFrames={meta.durationInFrames}
            compositionWidth={meta.width}
            compositionHeight={meta.height}
            fps={meta.fps}
            loop={loop}
            clickToPlay
            style={{
              width: '100%',
              height: '100%',
            }}
          />

          {/* Optional Safe-Area & Center Crosshair Overlay */}
          {showGuides && (
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-[5%] border border-dashed border-blue-400/40" />
              <div className="absolute inset-[10%] border border-dashed border-slate-300/25" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-400/30" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-400/30" />
            </div>
          )}
        </div>
      </div>

      {/* Transport Bar synced with @remotion/player */}
      <div className="px-4 py-2 bg-[#131720] border-t border-[#242B3A] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="text-xs font-mono text-slate-400 tabular-nums whitespace-nowrap">
          <span className="text-slate-100 font-medium">
            Frame {String(currentFrame).padStart(3, '0')}
          </span>
          <span className="mx-1.5 text-slate-600">/</span>
          <span>{meta.durationInFrames}</span>
          <span className="mx-2 text-slate-600">·</span>
          <span>
            {currentSec}s / {durationSec}s
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="Jump to start"
            onClick={() => onSeekToFrame(0)}
            className="p-2 text-slate-300 hover:text-white hover:bg-[#191E2A] rounded transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors whitespace-nowrap shrink-0"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            type="button"
            title="Jump to end"
            onClick={() => onSeekToFrame(Math.max(0, meta.durationInFrames - 1))}
            className="p-2 text-slate-300 hover:text-white hover:bg-[#191E2A] rounded transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLoop((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border transition-colors whitespace-nowrap ${
              loop
                ? 'bg-[#191E2A] text-blue-400 border-blue-500/40'
                : 'bg-transparent text-slate-400 border-[#242B3A] hover:text-slate-200'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Loop</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGuides((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border transition-colors whitespace-nowrap ${
              showGuides
                ? 'bg-[#191E2A] text-blue-400 border-blue-500/40'
                : 'bg-transparent text-slate-400 border-[#242B3A] hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Safe Guides</span>
          </button>

          <span className="hidden xl:inline text-xs text-slate-500 tabular-nums whitespace-nowrap ml-2">
            {meta.width} × {meta.height} · {meta.fps} fps
          </span>
        </div>
      </div>
    </section>
  );
};
