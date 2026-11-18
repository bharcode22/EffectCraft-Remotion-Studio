import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeftRight, Check, Copy, RotateCcw } from 'lucide-react';
import {
  ecprojToRemotionProps,
  generateRemotionTsx,
  remotionPropsToEcproj,
  validateEcProject,
  validateRemotionProps,
} from '../engine/bridge';
import { EcProjectDocument, RemotionCompositionProps, SyncOrigin } from '../types/studio';

interface SyncInspectorViewProps {
  project: EcProjectDocument;
  remotionProps: RemotionCompositionProps;
  lastSyncOrigin: SyncOrigin;
  onApplyEcProject: (doc: EcProjectDocument, origin: SyncOrigin) => void;
}

const ORIGIN_LABELS: Record<SyncOrigin, string> = {
  'effectcraft-ui': 'EffectCraft Studio UI',
  'ecproj-json': '.ecproj JSON Editor',
  'remotion-props': 'Remotion inputProps Editor',
};

export const SyncInspectorView: React.FC<SyncInspectorViewProps> = ({
  project,
  remotionProps,
  lastSyncOrigin,
  onApplyEcProject,
}) => {
  const [ecprojDraft, setEcprojDraft] = useState(() => JSON.stringify(project, null, 2));
  const [remotionDraft, setRemotionDraft] = useState(() => JSON.stringify(remotionProps, null, 2));
  const [rightTab, setRightTab] = useState<'inputProps' | 'tsx'>('inputProps');
  const [ecprojError, setEcprojError] = useState<string | null>(null);
  const [remotionError, setRemotionError] = useState<string | null>(null);
  const [copiedPane, setCopiedPane] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    setEcprojDraft(JSON.stringify(project, null, 2));
    setRemotionDraft(JSON.stringify(remotionProps, null, 2));
    setEcprojError(null);
    setRemotionError(null);
  }, [project, remotionProps]);

  const generatedTsx = generateRemotionTsx(project);

  const handleApplyEcproj = () => {
    try {
      const parsed = JSON.parse(ecprojDraft);
      const validation = validateEcProject(parsed);
      if (validation.ok === false) {
        setEcprojError(validation.error);
        return;
      }
      setEcprojError(null);
      onApplyEcProject(validation.data, 'ecproj-json');
      setSyncNotice('Skema .ecproj divalidasi dan disinkronkan ke Studio UI & Remotion inputProps.');
      setTimeout(() => setSyncNotice(null), 3500);
    } catch (err) {
      setEcprojError(err instanceof Error ? err.message : 'Sintaks JSON tidak valid.');
    }
  };

  const handleApplyRemotionProps = () => {
    try {
      const parsed = JSON.parse(remotionDraft);
      const validation = validateRemotionProps(parsed);
      if (validation.ok === false) {
        setRemotionError(validation.error);
        return;
      }
      setRemotionError(null);
      const convertedDoc = remotionPropsToEcproj(validation.data);
      onApplyEcProject(convertedDoc, 'remotion-props');
      setSyncNotice('Remotion inputProps berhasil dikonversi balik ke .ecproj dan EffectCraft UI.');
      setTimeout(() => setSyncNotice(null), 3500);
    } catch (err) {
      setRemotionError(err instanceof Error ? err.message : 'Sintaks JSON tidak valid.');
    }
  };

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedPane(id);
    setTimeout(() => setCopiedPane(null), 1800);
  };

  return (
    <div className="flex-1 bg-[#0B0E14] flex flex-col min-h-0 overflow-hidden">
      {/* Inspector Header Strip */}
      <div className="px-6 py-3.5 bg-[#131720] border-b border-[#242B3A] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-slate-100">
            Bidirectional Schema Sync Inspector
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Sunting JSON .ecproj di kiri atau Remotion inputProps di kanan untuk menguji sinkronisasi dua arah secara langsung.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {syncNotice && (
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
              <Check className="w-3.5 h-3.5" />
              <span>{syncNotice}</span>
            </span>
          )}
          <div className="text-slate-400 whitespace-nowrap">
            <span>Last sync origin: </span>
            <span className="text-slate-100 font-medium">{ORIGIN_LABELS[lastSyncOrigin]}</span>
          </div>
        </div>
      </div>

      {/* Dual-Pane JSON / TSX Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-[#242B3A]">
        {/* Left Pane: EffectCraft .ecproj JSON */}
        <div className="flex flex-col min-h-0 bg-[#0B0E14]">
          <div className="px-4 py-2.5 bg-[#131720] border-b border-[#242B3A] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-200">EffectCraft Project (.ecproj)</span>
              <span className="text-slate-500 font-mono tabular-nums">
                {project.layers.length} layers
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEcprojDraft(JSON.stringify(project, null, 2));
                  setEcprojError(null);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-[#191E2A] border border-[#242B3A] rounded transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Revert</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy('ecproj', ecprojDraft)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-[#191E2A] border border-[#242B3A] rounded transition-colors"
              >
                {copiedPane === 'ecproj' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedPane === 'ecproj' ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={handleApplyEcproj}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors whitespace-nowrap"
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span>Sync to Remotion</span>
              </button>
            </div>
          </div>

          {ecprojError && (
            <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{ecprojError}</span>
            </div>
          )}

          <textarea
            aria-label="EffectCraft ecproj JSON Editor"
            spellCheck={false}
            value={ecprojDraft}
            onChange={(e) => setEcprojDraft(e.target.value)}
            className="flex-1 w-full p-4 bg-[#0B0E14] text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-none"
          />
        </div>

        {/* Right Pane: Remotion inputProps JSON / Generated TSX */}
        <div className="flex flex-col min-h-0 bg-[#0B0E14]">
          <div className="px-4 py-2.5 bg-[#131720] border-b border-[#242B3A] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1 p-0.5 bg-[#0B0E14] border border-[#242B3A] rounded">
              <button
                type="button"
                onClick={() => setRightTab('inputProps')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  rightTab === 'inputProps'
                    ? 'bg-[#191E2A] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Remotion inputProps
              </button>
              <button
                type="button"
                onClick={() => setRightTab('tsx')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  rightTab === 'tsx'
                    ? 'bg-[#191E2A] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Composition.tsx
              </button>
            </div>

            {rightTab === 'inputProps' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRemotionDraft(JSON.stringify(ecprojToRemotionProps(project), null, 2));
                    setRemotionError(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-[#191E2A] border border-[#242B3A] rounded transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Revert</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('remotion', remotionDraft)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-[#191E2A] border border-[#242B3A] rounded transition-colors"
                >
                  {copiedPane === 'remotion' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedPane === 'remotion' ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleApplyRemotionProps}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors whitespace-nowrap"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>Sync to EffectCraft UI</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleCopy('tsx', generatedTsx)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-[#191E2A] border border-[#242B3A] rounded transition-colors"
              >
                {copiedPane === 'tsx' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedPane === 'tsx' ? 'Copied TSX' : 'Copy TSX'}</span>
              </button>
            )}
          </div>

          {rightTab === 'inputProps' && remotionError && (
            <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{remotionError}</span>
            </div>
          )}

          {rightTab === 'inputProps' ? (
            <textarea
              aria-label="Remotion inputProps JSON Editor"
              spellCheck={false}
              value={remotionDraft}
              onChange={(e) => setRemotionDraft(e.target.value)}
              className="flex-1 w-full p-4 bg-[#0B0E14] text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-none"
            />
          ) : (
            <pre className="flex-1 w-full p-4 bg-[#0B0E14] text-slate-200 font-mono text-xs leading-relaxed overflow-auto">
              {generatedTsx}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
