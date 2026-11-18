import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { PlayerRef } from '@remotion/player';
import { ArchitectureView } from './components/ArchitectureView';
import { LayerStackPanel } from './components/LayerStackPanel';
import { PluginExportView } from './components/PluginExportView';
import { PropertyInspector } from './components/PropertyInspector';
import { SyncInspectorView } from './components/SyncInspectorView';
import { TimelineDock } from './components/TimelineDock';
import { TopBar } from './components/TopBar';
import { ViewportStage } from './components/ViewportStage';
import { STUDIO_PRESETS } from './data/presets';
import { ecprojToRemotionProps, validateEcProject } from './engine/bridge';
import {
  AnimatableProperty,
  EasingKind,
  EcCompositionMeta,
  EcLayer,
  EcLayerType,
  EcProjectDocument,
  SyncOrigin,
  WorkspaceView,
} from './types/studio';

const STORAGE_KEY = 'effectcraft_remotion_studio_v1';

interface HistoryState {
  past: EcProjectDocument[];
  present: EcProjectDocument;
  future: EcProjectDocument[];
  lastSyncOrigin: SyncOrigin;
  activePresetId: string;
}

type HistoryAction =
  | { type: 'COMMIT'; doc: EcProjectDocument; origin: SyncOrigin; presetId?: string }
  | { type: 'UNDO' }
  | { type: 'REDO' };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'COMMIT': {
      const nextPast = [...state.past.slice(-24), state.present];
      return {
        past: nextPast,
        present: action.doc,
        future: [],
        lastSyncOrigin: action.origin,
        activePresetId: action.presetId ?? 'custom',
      };
    }
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        lastSyncOrigin: 'effectcraft-ui',
        activePresetId: 'custom',
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
        lastSyncOrigin: 'effectcraft-ui',
        activePresetId: 'custom',
      };
    }
    default:
      return state;
  }
}

function loadInitialProject(): { doc: EcProjectDocument; presetId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const checked = validateEcProject(parsed.doc);
      if (checked.ok) {
        return { doc: checked.data, presetId: parsed.presetId || 'custom' };
      }
    }
  } catch {
    // Fallback to default preset
  }
  return {
    doc: structuredClone(STUDIO_PRESETS[0].document),
    presetId: STUDIO_PRESETS[0].id,
  };
}

function createNewLayer(type: EcLayerType, durationInFrames: number, index: number): EcLayer {
  const id = `layer-${type}-${Date.now().toString(36)}`;
  const common = {
    id,
    visible: true,
    locked: false,
    startFrame: 0,
    endFrame: durationInFrames,
    blendMode: 'normal' as const,
    transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
    keyframes: [],
  };

  if (type === 'text') {
    return {
      ...common,
      name: `Text Layer ${index + 1}`,
      type: 'text',
      style: {
        text: 'New EffectCraft Text',
        fontSize: 64,
        fontWeight: 700,
        letterSpacing: 0,
        color: '#F8FAFC',
        blur: 0,
      },
    };
  }
  if (type === 'shape') {
    return {
      ...common,
      name: `Shape Layer ${index + 1}`,
      type: 'shape',
      style: {
        color: '#3B82F6',
        width: 360,
        height: 180,
        borderRadius: 16,
        blur: 0,
      },
    };
  }
  if (type === 'gradient') {
    return {
      ...common,
      name: `Gradient Layer ${index + 1}`,
      type: 'gradient',
      style: {
        color: '#0F172A',
        secondaryColor: '#1E40AF',
        gradientAngle: 135,
        width: 1920,
        height: 1080,
        borderRadius: 0,
        blur: 0,
      },
    };
  }
  return {
    ...common,
    name: `Counter Layer ${index + 1}`,
    type: 'counter',
    style: {
      color: '#60A5FA',
      fontSize: 96,
      fontWeight: 700,
      counterFrom: 0,
      counterTo: 1000,
      counterPrefix: '',
      counterSuffix: '+',
      blur: 0,
    },
  };
}

export function App() {
  const initial = useMemo(() => loadInitialProject(), []);
  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initial.doc,
    future: [],
    lastSyncOrigin: 'effectcraft-ui',
    activePresetId: initial.presetId,
  });

  const [activeView, setActiveView] = useState<WorkspaceView>('studio');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    () => initial.doc.layers[initial.doc.layers.length - 1]?.id ?? null
  );
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const playerRef = useRef<PlayerRef | null>(null);
  const project = history.present;

  // Persist workspace to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ doc: project, presetId: history.activePresetId })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [project, history.activePresetId]);

  // Keep selectedLayerId valid whenever layers change
  useEffect(() => {
    if (project.layers.length === 0) {
      setSelectedLayerId(null);
      return;
    }
    if (!selectedLayerId || !project.layers.some((l) => l.id === selectedLayerId)) {
      setSelectedLayerId(project.layers[project.layers.length - 1].id);
    }
  }, [project.layers, selectedLayerId]);

  const remotionProps = useMemo(() => ecprojToRemotionProps(project), [project]);

  const selectedLayer = useMemo(
    () => project.layers.find((l) => l.id === selectedLayerId) ?? null,
    [project.layers, selectedLayerId]
  );

  const selectedTrack = useMemo(
    () => remotionProps.tracks.find((t) => t.ecLayerId === selectedLayerId) ?? null,
    [remotionProps.tracks, selectedLayerId]
  );

  const commitProject = useCallback(
    (nextDoc: EcProjectDocument, origin: SyncOrigin = 'effectcraft-ui', presetId?: string) => {
      dispatch({ type: 'COMMIT', doc: nextDoc, origin, presetId });
    },
    []
  );

  const handleSeekToFrame = useCallback(
    (frame: number) => {
      const clamped = Math.max(0, Math.min(project.composition.durationInFrames - 1, frame));
      setCurrentFrame(clamped);
      playerRef.current?.seekTo(clamped);
    },
    [project.composition.durationInFrames]
  );

  const handleSelectPreset = useCallback(
    (presetId: string) => {
      const found = STUDIO_PRESETS.find((p) => p.id === presetId);
      if (!found) return;
      const cloned = structuredClone(found.document);
      commitProject(cloned, 'effectcraft-ui', found.id);
      setSelectedLayerId(cloned.layers[cloned.layers.length - 1]?.id ?? null);
      setCurrentFrame(0);
      playerRef.current?.seekTo(0);
    },
    [commitProject]
  );

  const handleUpdateCompositionMeta = useCallback(
    (patch: Partial<EcCompositionMeta>) => {
      const nextComp = { ...project.composition, ...patch };
      const nextLayers = project.layers.map((layer) => ({
        ...layer,
        endFrame: Math.min(layer.endFrame, nextComp.durationInFrames),
      }));
      commitProject({
        ...project,
        composition: nextComp,
        layers: nextLayers,
      });
      if (currentFrame >= nextComp.durationInFrames) {
        const clamped = Math.max(0, nextComp.durationInFrames - 1);
        setCurrentFrame(clamped);
        playerRef.current?.seekTo(clamped);
      }
    },
    [project, commitProject, currentFrame]
  );

  const handleAddLayer = useCallback(
    (type: EcLayerType) => {
      const created = createNewLayer(
        type,
        project.composition.durationInFrames,
        project.layers.length
      );
      commitProject({
        ...project,
        layers: [...project.layers, created],
      });
      setSelectedLayerId(created.id);
    },
    [project, commitProject]
  );

  const handleUpdateLayer = useCallback(
    (layerId: string, updater: (layer: EcLayer) => EcLayer) => {
      commitProject({
        ...project,
        layers: project.layers.map((l) => (l.id === layerId ? updater(l) : l)),
      });
    },
    [project, commitProject]
  );

  const handleToggleVisible = useCallback(
    (layerId: string) => {
      handleUpdateLayer(layerId, (l) => ({ ...l, visible: !l.visible }));
    },
    [handleUpdateLayer]
  );

  const handleToggleLocked = useCallback(
    (layerId: string) => {
      handleUpdateLayer(layerId, (l) => ({ ...l, locked: !l.locked }));
    },
    [handleUpdateLayer]
  );

  const handleDuplicateLayer = useCallback(
    (layerId: string) => {
      const idx = project.layers.findIndex((l) => l.id === layerId);
      if (idx < 0) return;
      const source = project.layers[idx];
      const copy: EcLayer = {
        ...structuredClone(source),
        id: `${source.id}-copy-${Date.now().toString(36)}`,
        name: `${source.name} Copy`,
        locked: false,
      };
      const nextLayers = [...project.layers];
      nextLayers.splice(idx + 1, 0, copy);
      commitProject({ ...project, layers: nextLayers });
      setSelectedLayerId(copy.id);
    },
    [project, commitProject]
  );

  const handleDeleteLayer = useCallback(
    (layerId: string) => {
      commitProject({
        ...project,
        layers: project.layers.filter((l) => l.id !== layerId),
      });
    },
    [project, commitProject]
  );

  const handleMoveLayer = useCallback(
    (layerId: string, direction: 'forward' | 'backward') => {
      const idx = project.layers.findIndex((l) => l.id === layerId);
      if (idx < 0) return;
      const targetIdx = direction === 'forward' ? idx + 1 : idx - 1;
      if (targetIdx < 0 || targetIdx >= project.layers.length) return;
      const nextLayers = [...project.layers];
      const [item] = nextLayers.splice(idx, 1);
      nextLayers.splice(targetIdx, 0, item);
      commitProject({ ...project, layers: nextLayers });
    },
    [project, commitProject]
  );

  const handleToggleKeyframe = useCallback(
    (layerId: string, property: AnimatableProperty, value: number, easing: EasingKind) => {
      handleUpdateLayer(layerId, (layer) => {
        const existingIdx = layer.keyframes.findIndex(
          (k) => k.property === property && k.frame === currentFrame
        );
        if (existingIdx >= 0) {
          return {
            ...layer,
            keyframes: layer.keyframes.filter((_, i) => i !== existingIdx),
          };
        }
        return {
          ...layer,
          keyframes: [
            ...layer.keyframes,
            {
              id: `kf-${layerId}-${property}-${currentFrame}-${Date.now().toString(36)}`,
              frame: currentFrame,
              property,
              value,
              easing,
            },
          ],
        };
      });
    },
    [currentFrame, handleUpdateLayer]
  );

  const handleDeleteKeyframe = useCallback(
    (layerId: string, keyframeId: string) => {
      handleUpdateLayer(layerId, (layer) => ({
        ...layer,
        keyframes: layer.keyframes.filter((k) => k.id !== keyframeId),
      }));
    },
    [handleUpdateLayer]
  );

  const handleAddOpacityKeyframeAtCurrent = useCallback(
    (layerId: string) => {
      const target = project.layers.find((l) => l.id === layerId);
      if (!target) return;
      handleToggleKeyframe(layerId, 'opacity', target.transform.opacity, 'easeOut');
    },
    [project.layers, handleToggleKeyframe]
  );

  return (
    <div className="h-screen w-screen bg-[#0B0E14] text-slate-100 flex flex-col overflow-hidden">
      <TopBar
        activeView={activeView}
        onChangeView={setActiveView}
        onExportQuick={() => setActiveView('export')}
      />

      {/* Mobile View Switcher (visible only below md) */}
      <div className="md:hidden px-4 py-2 bg-[#131720] border-b border-[#242B3A] flex items-center gap-2 overflow-x-auto shrink-0">
        {(
          [
            { id: 'studio', label: 'Studio' },
            { id: 'sync', label: 'Sync Inspector' },
            { id: 'architecture', label: 'Architecture' },
            { id: 'export', label: 'Plugin Export' },
          ] as Array<{ id: WorkspaceView; label: string }>
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveView(item.id)}
            className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 ${
              activeView === item.id ? 'bg-[#191E2A] text-white' : 'text-slate-400'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeView === 'studio' && (
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">
            <LayerStackPanel
              layers={project.layers}
              selectedLayerId={selectedLayerId}
              activePresetId={history.activePresetId}
              onSelectPreset={handleSelectPreset}
              onSelectLayer={setSelectedLayerId}
              onAddLayer={handleAddLayer}
              onToggleVisible={handleToggleVisible}
              onToggleLocked={handleToggleLocked}
              onDuplicateLayer={handleDuplicateLayer}
              onDeleteLayer={handleDeleteLayer}
              onMoveLayer={handleMoveLayer}
            />

            <ViewportStage
              playerRef={playerRef}
              remotionProps={remotionProps}
              currentFrame={currentFrame}
              isPlaying={isPlaying}
              lastSyncOrigin={history.lastSyncOrigin}
              canUndo={history.past.length > 0}
              canRedo={history.future.length > 0}
              onUndo={() => dispatch({ type: 'UNDO' })}
              onRedo={() => dispatch({ type: 'REDO' })}
              onFrameFromPlayer={setCurrentFrame}
              onPlayingChange={setIsPlaying}
              onSeekToFrame={handleSeekToFrame}
              onUpdateCompositionMeta={handleUpdateCompositionMeta}
              onOpenSyncInspector={() => setActiveView('sync')}
            />

            <PropertyInspector
              layer={selectedLayer}
              remotionTrack={selectedTrack}
              currentFrame={currentFrame}
              fps={project.composition.fps}
              maxFrame={project.composition.durationInFrames}
              onUpdateLayer={handleUpdateLayer}
              onToggleKeyframe={handleToggleKeyframe}
              onOpenSyncInspector={() => setActiveView('sync')}
            />
          </div>

          <TimelineDock
            layers={project.layers}
            selectedLayerId={selectedLayerId}
            durationInFrames={project.composition.durationInFrames}
            fps={project.composition.fps}
            currentFrame={currentFrame}
            onSeekToFrame={handleSeekToFrame}
            onSelectLayer={setSelectedLayerId}
            onDeleteKeyframe={handleDeleteKeyframe}
            onAddOpacityKeyframeAtCurrent={handleAddOpacityKeyframeAtCurrent}
          />
        </main>
      )}

      {activeView === 'sync' && (
        <SyncInspectorView
          project={project}
          remotionProps={remotionProps}
          lastSyncOrigin={history.lastSyncOrigin}
          onApplyEcProject={(doc, origin) => commitProject(doc, origin)}
        />
      )}

      {activeView === 'architecture' && <ArchitectureView />}

      {activeView === 'export' && <PluginExportView project={project} />}
    </div>
  );
}

export default App;
