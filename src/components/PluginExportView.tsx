import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, FileCode2 } from 'lucide-react';
import { generatePluginBundle } from '../engine/bridge';
import { EcProjectDocument } from '../types/studio';

interface PluginExportViewProps {
  project: EcProjectDocument;
}

export const PluginExportView: React.FC<PluginExportViewProps> = ({ project }) => {
  const files = useMemo(() => generatePluginBundle(project), [project]);
  const [selectedFilename, setSelectedFilename] = useState<string>(files[0].filename);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [downloadedNotice, setDownloadedNotice] = useState<string | null>(null);

  const activeFile = files.find((f) => f.filename === selectedFilename) ?? files[0];

  const triggerDownload = (filename: string, content: string, mime = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeFile.content);
    setCopiedFile(activeFile.filename);
    setTimeout(() => setCopiedFile(null), 1800);
  };

  const handleDownloadSingle = () => {
    triggerDownload(activeFile.filename, activeFile.content);
    setDownloadedNotice(`File ${activeFile.filename} diunduh.`);
    setTimeout(() => setDownloadedNotice(null), 2500);
  };

  const handleDownloadBundleJson = () => {
    const bundlePayload = {
      generatedAt: new Date().toISOString(),
      composition: project.composition,
      ecproj: project,
      files: files.map((f) => ({
        filename: f.filename,
        purpose: f.purpose,
        content: f.content,
      })),
    };
    triggerDownload(
      `${project.composition.id || 'effectcraft-remotion'}-plugin-bundle.json`,
      JSON.stringify(bundlePayload, null, 2),
      'application/json'
    );
    setDownloadedNotice('Bundel lengkap plugin (.json + source files) diunduh.');
    setTimeout(() => setDownloadedNotice(null), 3000);
  };

  return (
    <div className="flex-1 bg-[#0B0E14] flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-[#131720] border-b border-[#242B3A] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-slate-100">
            Plugin Starter Bundle Generator
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Keempat file berikut dibuat dinamis mengikuti composition aktif{' '}
            <span className="text-slate-200 font-medium">{project.composition.name}</span> (
            {project.composition.width}×{project.composition.height} · {project.composition.fps} fps).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {downloadedNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <Check className="w-3.5 h-3.5" />
              <span>{downloadedNotice}</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleDownloadBundleJson}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Full Bundle (.json)</span>
          </button>
        </div>
      </div>

      {/* File Explorer + Code Viewer */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        {/* Left File List */}
        <aside className="lg:col-span-4 xl:col-span-3 bg-[#131720] border-b lg:border-b-0 lg:border-r border-[#242B3A] overflow-y-auto divide-y divide-[#1D2330]">
          {files.map((file) => {
            const isSelected = file.filename === activeFile.filename;
            return (
              <button
                key={file.filename}
                type="button"
                onClick={() => setSelectedFilename(file.filename)}
                className={`w-full p-4 text-left transition-colors ${
                  isSelected ? 'bg-blue-600/15 text-white' : 'hover:bg-[#191E2A] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileCode2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs font-mono font-medium truncate">{file.filename}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{file.purpose}</p>
              </button>
            );
          })}
        </aside>

        {/* Right Code Viewer */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-0 bg-[#0B0E14]">
          <div className="px-5 py-3 bg-[#131720] border-b border-[#242B3A] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="text-xs font-mono text-slate-200">{activeFile.filename}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-200 bg-[#191E2A] hover:bg-[#222938] border border-[#242B3A] rounded transition-colors"
              >
                {copiedFile === activeFile.filename ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedFile === activeFile.filename ? 'Copied' : 'Copy File'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSingle}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-200 bg-[#191E2A] hover:bg-[#222938] border border-[#242B3A] rounded transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
            </div>
          </div>

          <pre className="flex-1 p-5 font-mono text-xs text-slate-200 leading-relaxed overflow-auto">
            {activeFile.content}
          </pre>
        </div>
      </div>
    </div>
  );
};
