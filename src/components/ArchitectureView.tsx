import React, { useState } from 'react';
import { ArrowRight, Code2, Cpu, Layers, PlaySquare } from 'lucide-react';

interface StageSpec {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  mechanism: string;
  contracts: string[];
  sampleCode: string;
}

const STAGES: StageSpec[] = [
  {
    id: 'effectcraft',
    title: '01. EffectCraft Host Environment',
    subtitle: 'egui UI · Rust Session · .ecproj · JS/WASM Plugin',
    icon: <Layers className="w-4 h-4 text-blue-400" />,
    mechanism:
      'EffectCraft memisahkan inti mesin compositing (Rust Session) dari antarmuka egui melalui aliran command terpadu. Plugin JS Scripting API atau modul WebAssembly (ABI v1/v2) dapat membaca layer, transformasi, keyframe, dan durasi composition secara langsung.',
    contracts: [
      'Akses layer & keyframe melalui JS Scripting API (thisComp.layer(i)) atau parser file JSON .ecproj.',
      'Setiap edit di UI EffectCraft memicu event debounced (16ms–50ms) untuk mengirim snapshot komposisi.',
      'Menu panel khusus di EffectCraft ("Open in Remotion Bridge") dapat dipanggil lewat startup script.',
    ],
    sampleCode: `// Di lingkungan EffectCraft Scripting API
const comp = app.project.activeItem;
const snapshot = {
  id: comp.name,
  width: comp.width,
  height: comp.height,
  fps: comp.frameRate,
  durationInFrames: Math.round(comp.duration * comp.frameRate),
  layers: collectLayersAndKeyframes(comp)
};
fetch("http://127.0.0.1:4190/api/remotion-sync", {
  method: "POST",
  body: JSON.stringify(snapshot)
});`,
  },
  {
    id: 'bridge',
    title: '02. Bidirectional Schema Bridge',
    subtitle: 'Local IPC Server · .ecproj ↔ Remotion inputProps',
    icon: <Code2 className="w-4 h-4 text-teal-400" />,
    mechanism:
      'Layer terjemahan deterministik mengonversi struktur .ecproj (koordinat berpusat di tengah kanvas, rentang inPoint/outPoint, keyframe per properti) menjadi RemotionCompositionProps yang terdiri atas <Sequence> dan track animasi terurut, dan sebaliknya.',
    contracts: [
      'Koordinat EffectCraft (origin tengah) dipetakan 1:1 ke transform translate(x, y) di Remotion AbsoluteFill.',
      'Setiap keyframe menyimpan frame global, nilai target, dan kurva easing (linear, easeOut, spring).',
      'Validasi skema mencegah JSON corrupt menimpa state komposisi terakhir yang valid.',
    ],
    sampleCode: `// Pemetaan deterministik dua arah
const remotionProps = ecprojToRemotionProps(ecprojDoc);
// -> { meta: { width, height, fps, durationInFrames }, tracks: [...] }

const backToEcproj = remotionPropsToEcproj(remotionProps);
// -> Menulis balik ke .ecproj atau mengirim command ke EffectCraft Session`,
  },
  {
    id: 'player',
    title: '03. Remotion Live Preview Engine',
    subtitle: '@remotion/player · useCurrentFrame · interpolate & spring',
    icon: <PlaySquare className="w-4 h-4 text-indigo-400" />,
    mechanism:
      'Untuk pratinjau instan tanpa menunggu render video disk, antarmuka panel atau WebView menyematkan @remotion/player. Komponen React <StudioComposition /> menerima inputProps secara langsung dan mengevaluasi animasi frame-by-frame.',
    contracts: [
      'Tidak membutuhkan tag <Composition /> saat berjalan di dalam <Player />.',
      'Mendukung scrubbing dua arah melalui PlayerRef.seekTo(frame) dan event frameupdate.',
      'Perubahan slider di EffectCraft UI langsung memutasi inputProps sehingga canvas Remotion ikut berubah real-time.',
    ],
    sampleCode: `<Player
  component={StudioComposition}
  inputProps={remotionProps}
  durationInFrames={remotionProps.meta.durationInFrames}
  compositionWidth={remotionProps.meta.width}
  compositionHeight={remotionProps.meta.height}
  fps={remotionProps.meta.fps}
/>`,
  },
  {
    id: 'renderer',
    title: '04. Remotion Headless Render API',
    subtitle: '@remotion/bundler · @remotion/renderer · renderMedia / renderStill',
    icon: <Cpu className="w-4 h-4 text-amber-400" />,
    mechanism:
      'Saat pengguna menekan Render Final atau ingin memasukkan hasil render Remotion kembali ke timeline EffectCraft sebagai layer video/PNG sequence, bridge Node.js menjalankan bundle() dan renderMedia() atau renderStill() secara headless.',
    contracts: [
      'Mode A (Export Final): renderMedia() menghasilkan MP4/ProRes/WebM langsung dari inputProps hasil desain di EffectCraft.',
      'Mode B (Round-Trip Compositing): renderStill() atau frame stream dikirim kembali ke EffectCraft WASM/media source sebagai layer.',
      'Mendukung render paralel multi-thread serta rendering berbasis Lambda/Cloud Run.',
    ],
    sampleCode: `const serveUrl = await bundle({ entryPoint: "./src/index.ts" });
const composition = await selectComposition({
  serveUrl,
  id: "KineticLaunchComp",
  inputProps
});
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: "./out/final.mp4",
  inputProps
});`,
  },
];

export const ArchitectureView: React.FC = () => {
  const [selectedStageId, setSelectedStageId] = useState<string>('effectcraft');
  const [renderMode, setRenderMode] = useState<'preview' | 'headless'>('preview');

  const activeStage = STAGES.find((s) => s.id === selectedStageId) ?? STAGES[0];

  return (
    <div className="flex-1 bg-[#0B0E14] overflow-y-auto">
      <div className="max-w-[1240px] mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#242B3A] pb-6">
          <div className="max-w-2xl">
            <h1 className="text-xl font-semibold text-slate-100">
              Arsitektur Teknis Plugin EffectCraft ↔ Remotion
            </h1>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Membuat composition di antarmuka EffectCraft sambil mengeksekusi komposisi tersebut di engine Remotion sepenuhnya memungkinkan secara teknis karena EffectCraft memiliki Session Command Stream dan skema proyek JSON (.ecproj) yang terpisah dari UI.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#131720] border border-[#242B3A] rounded-md">
            <button
              type="button"
              onClick={() => setRenderMode('preview')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                renderMode === 'preview'
                  ? 'bg-[#191E2A] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mode A: Live Player Sync
            </button>
            <button
              type="button"
              onClick={() => setRenderMode('headless')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                renderMode === 'headless'
                  ? 'bg-[#191E2A] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mode B: Headless Render Pipeline
            </button>
          </div>
        </div>

        {/* Interactive Pipeline Stages */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {STAGES.map((stage, idx) => {
            const isSelected = stage.id === selectedStageId;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setSelectedStageId(stage.id)}
                className={`p-4 text-left rounded-md border transition-colors relative ${
                  isSelected
                    ? 'bg-[#191E2A] border-blue-500/60 text-white'
                    : 'bg-[#131720] border-[#242B3A] text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  {stage.icon}
                  {idx < STAGES.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 hidden md:block" />
                  )}
                </div>
                <div className="text-xs font-semibold mb-1">{stage.title}</div>
                <div className="text-[11px] text-slate-400 leading-snug">{stage.subtitle}</div>
              </button>
            );
          })}
        </div>

        {/* Stage Deep Dive + System Diagram */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-[#131720] border border-[#242B3A] rounded-md p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-100">{activeStage.title}</h2>
              <p className="text-xs text-slate-400 mt-1">{activeStage.subtitle}</p>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">{activeStage.mechanism}</p>

            <div>
              <h3 className="text-xs font-semibold text-slate-200 mb-2.5">
                Kontrak Teknis & Batasan Integrasi
              </h3>
              <ul className="space-y-2">
                {activeStage.contracts.map((item, i) => (
                  <li key={i} className="text-xs text-slate-300 leading-relaxed flex gap-2.5">
                    <span className="text-blue-400 font-mono shrink-0">0{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-200 mb-2">Contoh Implementasi</h3>
              <pre className="p-4 bg-[#0B0E14] border border-[#242B3A] rounded-md text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                {activeStage.sampleCode}
              </pre>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#131720] border border-[#242B3A] rounded-md p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-100">
              {renderMode === 'preview'
                ? 'Alur Mode A: Live Preview Dua Arah'
                : 'Alur Mode B: Headless Render ke Disk / EffectCraft'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {renderMode === 'preview'
                ? 'Ideal saat proses desain berlangsung: EffectCraft bertindak sebagai pengontrol parameter visual, sedangkan @remotion/player mengevaluasi React/TSX secara real-time.'
                : 'Ideal untuk ekspor akhir atau menyisipkan komposisi React/D3/Three.js kompleks dari Remotion sebagai layer raster ke dalam compositor EffectCraft.'}
            </p>

            <pre className="p-4 bg-[#0B0E14] border border-[#242B3A] rounded-md text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {renderMode === 'preview'
                ? `┌───────────────────────────────────────┐
│      EffectCraft Desktop (egui)       │
│  [Layer Stack] [Timeline] [Inspector] │
└──────────────────┬────────────────────┘
                   │ JS Script / WASM Hook
                   ▼ (.ecproj JSON diff)
┌───────────────────────────────────────┐
│     Local Bridge (ws/http :4190)      │
│  ecprojToRemotionProps()              │
│  remotionPropsToEcproj()              │
└──────────────────┬────────────────────┘
                   │ Live inputProps
                   ▼
┌───────────────────────────────────────┐
│     Remotion Studio / @remotion/player│
│  <StudioComposition {...inputProps} />│
└───────────────────────────────────────┘`
                : `┌───────────────────────────────────────┐
│      EffectCraft Desktop (Rust)       │
│  Export .ecproj + Trigger Render CLI  │
└──────────────────┬────────────────────┘
                   │ POST /api/remotion-render
                   ▼
┌───────────────────────────────────────┐
│    Node.js Remotion Render Worker     │
│  1. bundle("./src/index.ts")          │
│  2. selectComposition({ inputProps }) │
│  3. renderMedia() / renderStill()     │
└──────────────────┬────────────────────┘
                   │ MP4 / WebM / PNG Frames
                   ▼
┌───────────────────────────────────────┐
│  EffectCraft Media Bin / Layer Source │
└───────────────────────────────────────┘`}
            </pre>

            <div className="pt-2 border-t border-[#242B3A] space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Protokol Sinkronisasi</span>
                <span className="font-mono">HTTP / WebSocket JSON</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Plugin ABI EffectCraft</span>
                <span className="font-mono">JS API + WASM ABI v2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Engine Remotion</span>
                <span className="font-mono">remotion v4.x</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
