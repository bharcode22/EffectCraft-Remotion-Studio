import { Easing, interpolate, spring } from 'remotion';
import {
  AnimatableProperty,
  EcKeyframe,
  EcLayer,
  EcProjectDocument,
  GeneratedPluginFile,
  RemotionCompositionProps,
  RemotionTrack,
} from '../types/studio';

const ANIMATABLE_PROPS: AnimatableProperty[] = ['x', 'y', 'scale', 'rotation', 'opacity'];

/**
 * Forward adapter: EffectCraft .ecproj -> Remotion inputProps
 */
export function ecprojToRemotionProps(doc: EcProjectDocument): RemotionCompositionProps {
  const tracks: RemotionTrack[] = doc.layers.map((layer) => {
    const animations: RemotionTrack['animations'] = {
      x: [],
      y: [],
      scale: [],
      rotation: [],
      opacity: [],
    };

    for (const kf of layer.keyframes) {
      animations[kf.property].push({
        id: kf.id,
        frame: kf.frame,
        value: kf.value,
        easing: kf.easing,
      });
    }

    for (const prop of ANIMATABLE_PROPS) {
      animations[prop].sort((a, b) => a.frame - b.frame);
    }

    const duration = Math.max(1, layer.endFrame - layer.startFrame);

    return {
      ecLayerId: layer.id,
      name: layer.name,
      componentType: layer.type,
      visible: layer.visible,
      locked: layer.locked,
      from: layer.startFrame,
      durationInFrames: duration,
      blendMode: layer.blendMode,
      baseTransform: { ...layer.transform },
      props: { ...layer.style },
      animations,
    };
  });

  return {
    schemaVersion: '1.0.0',
    sourceBridge: 'effectcraft-ecproj',
    meta: { ...doc.composition },
    tracks,
  };
}

/**
 * Reverse adapter: Remotion inputProps -> EffectCraft .ecproj
 */
export function remotionPropsToEcproj(props: RemotionCompositionProps): EcProjectDocument {
  const layers: EcLayer[] = props.tracks.map((track) => {
    const keyframes: EcKeyframe[] = [];
    for (const prop of ANIMATABLE_PROPS) {
      const list = track.animations[prop] ?? [];
      for (const item of list) {
        keyframes.push({
          id: item.id || `kf-${track.ecLayerId}-${prop}-${item.frame}`,
          frame: Math.round(item.frame),
          property: prop,
          value: Number(item.value),
          easing: item.easing || 'easeOut',
        });
      }
    }

    keyframes.sort((a, b) => a.frame - b.frame);

    return {
      id: track.ecLayerId,
      name: track.name,
      type: track.componentType,
      visible: track.visible,
      locked: track.locked,
      startFrame: Math.max(0, Math.round(track.from)),
      endFrame: Math.max(1, Math.round(track.from + track.durationInFrames)),
      blendMode: track.blendMode || 'normal',
      transform: { ...track.baseTransform },
      style: { ...track.props },
      keyframes,
    };
  });

  return {
    schemaVersion: '1.0.0',
    engineTarget: 'remotion-4',
    composition: { ...props.meta },
    layers,
  };
}

/**
 * Validates raw JSON as EcProjectDocument
 */
export function validateEcProject(
  raw: unknown
): { ok: true; data: EcProjectDocument } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Root JSON harus berupa objek EcProjectDocument.' };
  }
  const obj = raw as Record<string, unknown>;
  if (!obj.composition || typeof obj.composition !== 'object') {
    return { ok: false, error: 'Field "composition" tidak ditemukan atau bukan objek.' };
  }
  const comp = obj.composition as Record<string, unknown>;
  if (
    typeof comp.name !== 'string' ||
    typeof comp.width !== 'number' ||
    typeof comp.height !== 'number' ||
    typeof comp.fps !== 'number' ||
    typeof comp.durationInFrames !== 'number'
  ) {
    return {
      ok: false,
      error: 'Field composition wajib memiliki name (string), width, height, fps, dan durationInFrames (number).',
    };
  }
  if (comp.width < 64 || comp.height < 64 || comp.fps < 1 || comp.durationInFrames < 1) {
    return { ok: false, error: 'Dimensi minimal 64px, FPS >= 1, dan durasi >= 1 frame.' };
  }
  if (!Array.isArray(obj.layers)) {
    return { ok: false, error: 'Field "layers" harus berupa array.' };
  }
  for (let i = 0; i < obj.layers.length; i++) {
    const l = obj.layers[i] as Record<string, unknown>;
    if (!l || typeof l !== 'object' || typeof l.id !== 'string' || typeof l.name !== 'string') {
      return { ok: false, error: `Layer pada indeks ${i} tidak memiliki id/name yang valid.` };
    }
    if (!['text', 'shape', 'gradient', 'counter'].includes(String(l.type))) {
      return { ok: false, error: `Tipe layer "${String(l.type)}" pada indeks ${i} tidak didukung.` };
    }
    if (!l.transform || typeof l.transform !== 'object') {
      return { ok: false, error: `Layer "${l.name}" kehilangan objek transform.` };
    }
    if (!l.style || typeof l.style !== 'object') {
      return { ok: false, error: `Layer "${l.name}" kehilangan objek style.` };
    }
  }
  return { ok: true, data: raw as EcProjectDocument };
}

/**
 * Validates raw JSON as RemotionCompositionProps
 */
export function validateRemotionProps(
  raw: unknown
): { ok: true; data: RemotionCompositionProps } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Root JSON harus berupa objek RemotionCompositionProps.' };
  }
  const obj = raw as Record<string, unknown>;
  if (!obj.meta || typeof obj.meta !== 'object') {
    return { ok: false, error: 'Field "meta" pada Remotion inputProps tidak ditemukan.' };
  }
  const meta = obj.meta as Record<string, unknown>;
  if (
    typeof meta.width !== 'number' ||
    typeof meta.height !== 'number' ||
    typeof meta.fps !== 'number' ||
    typeof meta.durationInFrames !== 'number'
  ) {
    return { ok: false, error: 'Field meta wajib memiliki width, height, fps, dan durationInFrames bertipe number.' };
  }
  if (!Array.isArray(obj.tracks)) {
    return { ok: false, error: 'Field "tracks" harus berupa array.' };
  }
  for (let i = 0; i < obj.tracks.length; i++) {
    const t = obj.tracks[i] as Record<string, unknown>;
    if (!t || typeof t !== 'object' || typeof t.ecLayerId !== 'string' || typeof t.name !== 'string') {
      return { ok: false, error: `Track pada indeks ${i} harus memiliki ecLayerId dan name (string).` };
    }
    if (!['text', 'shape', 'gradient', 'counter'].includes(String(t.componentType))) {
      return { ok: false, error: `componentType "${String(t.componentType)}" pada track ${i} tidak valid.` };
    }
    if (!t.baseTransform || typeof t.baseTransform !== 'object') {
      return { ok: false, error: `Track "${t.name}" kehilangan objek baseTransform.` };
    }
  }
  return { ok: true, data: raw as RemotionCompositionProps };
}

/**
 * Evaluates a single property at a global composition frame using Remotion's interpolate & spring
 */
export function evaluatePropertyAtFrame(
  baseValue: number,
  keyframes: Array<{ frame: number; value: number; easing: 'linear' | 'easeOut' | 'spring' }>,
  frame: number,
  fps: number
): number {
  if (!keyframes || keyframes.length === 0) {
    return baseValue;
  }
  const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);
  if (frame <= sorted[0].frame) {
    return sorted[0].value;
  }
  const last = sorted[sorted.length - 1];
  if (frame >= last.frame) {
    return last.value;
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const k1 = sorted[i];
    const k2 = sorted[i + 1];
    if (frame >= k1.frame && frame <= k2.frame) {
      if (k1.frame === k2.frame) return k2.value;
      if (k2.easing === 'spring') {
        const progress = spring({
          frame: frame - k1.frame,
          fps,
          durationInFrames: Math.max(1, k2.frame - k1.frame),
          config: { damping: 14, stiffness: 120, mass: 0.9 },
        });
        return k1.value + (k2.value - k1.value) * progress;
      }
      return interpolate(frame, [k1.frame, k2.frame], [k1.value, k2.value], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: k2.easing === 'easeOut' ? Easing.out(Easing.cubic) : Easing.linear,
      });
    }
  }

  return baseValue;
}

/**
 * Generates clean, production-ready Remotion TSX reflecting the active project
 */
export function generateRemotionTsx(doc: EcProjectDocument): string {
  const compId = doc.composition.id.replace(/[^a-zA-Z0-9_]/g, '') || 'EffectCraftComp';
  const propsJson = JSON.stringify(ecprojToRemotionProps(doc), null, 2);

  return `import React from 'react';
import {
  AbsoluteFill,
  Composition,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export type LayerTrack = {
  ecLayerId: string;
  name: string;
  componentType: 'text' | 'shape' | 'gradient' | 'counter';
  visible: boolean;
  from: number;
  durationInFrames: number;
  blendMode: 'normal' | 'screen' | 'multiply' | 'overlay';
  baseTransform: { x: number; y: number; scale: number; rotation: number; opacity: number };
  props: Record<string, any>;
  animations: Record<'x' | 'y' | 'scale' | 'rotation' | 'opacity', Array<{ frame: number; value: number; easing: string }>>;
};

export type ${compId}Props = {
  meta: {
    id: string;
    name: string;
    width: number;
    height: number;
    fps: number;
    durationInFrames: number;
    backgroundColor: string;
  };
  tracks: LayerTrack[];
};

const evalTrack = (
  base: number,
  kfs: Array<{ frame: number; value: number; easing: string }> = [],
  frame: number,
  fps: number
) => {
  if (kfs.length === 0) return base;
  const sorted = [...kfs].sort((a, b) => a.frame - b.frame);
  if (frame <= sorted[0].frame) return sorted[0].value;
  if (frame >= sorted[sorted.length - 1].frame) return sorted[sorted.length - 1].value;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      if (b.easing === 'spring') {
        const p = spring({
          frame: frame - a.frame,
          fps,
          durationInFrames: Math.max(1, b.frame - a.frame),
          config: { damping: 14, stiffness: 120 },
        });
        return a.value + (b.value - a.value) * p;
      }
      return interpolate(frame, [a.frame, b.frame], [a.value, b.value], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: b.easing === 'easeOut' ? Easing.out(Easing.cubic) : Easing.linear,
      });
    }
  }
  return base;
};

export const ${compId}: React.FC<${compId}Props> = ({ meta, tracks }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: meta.backgroundColor }}>
      {tracks
        .filter((t) => t.visible)
        .map((track) => (
          <Sequence key={track.ecLayerId} from={track.from} durationInFrames={track.durationInFrames}>
            <TrackRenderer track={track} fps={fps} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};

const TrackRenderer: React.FC<{ track: LayerTrack; fps: number }> = ({ track, fps }) => {
  const localFrame = useCurrentFrame();
  const globalFrame = localFrame + track.from;
  const x = evalTrack(track.baseTransform.x, track.animations.x, globalFrame, fps);
  const y = evalTrack(track.baseTransform.y, track.animations.y, globalFrame, fps);
  const scale = evalTrack(track.baseTransform.scale, track.animations.scale, globalFrame, fps);
  const rotation = evalTrack(track.baseTransform.rotation, track.animations.rotation, globalFrame, fps);
  const opacity = evalTrack(track.baseTransform.opacity, track.animations.opacity, globalFrame, fps);

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mixBlendMode: track.blendMode,
        opacity,
        filter: track.props.blur ? \`blur(\${track.props.blur}px)\` : undefined,
        transform: \`translate(\${x}px, \${y}px) scale(\${scale}) rotate(\${rotation}deg)\`,
      }}
    >
      {track.componentType === 'text' && (
        <div
          style={{
            color: track.props.color,
            fontSize: track.props.fontSize ?? 64,
            fontWeight: track.props.fontWeight ?? 700,
            letterSpacing: track.props.letterSpacing ?? 0,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
          }}
        >
          {track.props.text}
        </div>
      )}
      {track.componentType === 'shape' && (
        <div
          style={{
            width: track.props.width ?? 400,
            height: track.props.height ?? 200,
            backgroundColor: track.props.color,
            borderRadius: track.props.borderRadius ?? 16,
          }}
        />
      )}
      {track.componentType === 'gradient' && (
        <div
          style={{
            width: track.props.width ?? 1920,
            height: track.props.height ?? 1080,
            background: \`linear-gradient(\${track.props.gradientAngle ?? 135}deg, \${track.props.color}, \${track.props.secondaryColor ?? '#1E3A8A'})\`,
          }}
        />
      )}
      {track.componentType === 'counter' && (
        <div
          style={{
            color: track.props.color,
            fontSize: track.props.fontSize ?? 96,
            fontWeight: track.props.fontWeight ?? 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {track.props.counterPrefix ?? ''}
          {Math.round(
            interpolate(
              localFrame,
              [0, Math.max(1, track.durationInFrames * 0.65)],
              [track.props.counterFrom ?? 0, track.props.counterTo ?? 100],
              { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
            )
          ).toLocaleString()}
          {track.props.counterSuffix ?? ''}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="${compId}"
      component={${compId}}
      durationInFrames={${doc.composition.durationInFrames}}
      fps={${doc.composition.fps}}
      width={${doc.composition.width}}
      height={${doc.composition.height}}
      defaultProps={${propsJson.split('\n').join('\n      ')}}
    />
  );
};
`;
}

/**
 * Generates the 4-file EffectCraft <-> Remotion plugin starter bundle
 */
export function generatePluginBundle(doc: EcProjectDocument): GeneratedPluginFile[] {
  const compId = doc.composition.id.replace(/[^a-zA-Z0-9_]/g, '') || 'EffectCraftComp';

  const effectCraftScript = `/**
 * EffectCraft Scripting API Bridge -> Remotion Engine
 * Place in EffectCraft Scripts folder or execute via headless Session command.
 */
const BRIDGE_URL = "http://127.0.0.1:4190/api/remotion-sync";

function serializeActiveComposition() {
  const comp = app.project.activeItem;
  if (!comp) {
    throw new Error("Tidak ada composition aktif di EffectCraft.");
  }

  const layers = [];
  for (let i = 1; i <= comp.numLayers; i++) {
    const layer = comp.layer(i);
    layers.push({
      id: "layer-" + i,
      name: layer.name,
      type: layer.hasText ? "text" : "shape",
      visible: layer.enabled,
      locked: layer.locked,
      startFrame: Math.round(layer.inPoint * comp.frameRate),
      endFrame: Math.round(layer.outPoint * comp.frameRate),
      blendMode: "normal",
      transform: {
        x: layer.transform.position.value[0] - comp.width / 2,
        y: layer.transform.position.value[1] - comp.height / 2,
        scale: layer.transform.scale.value[0] / 100,
        rotation: layer.transform.rotation.value,
        opacity: layer.transform.opacity.value / 100
      },
      style: {
        text: layer.hasText ? layer.property("Source Text").value.text : undefined,
        color: "#F8FAFC"
      },
      keyframes: []
    });
  }

  return {
    schemaVersion: "1.0.0",
    engineTarget: "remotion-4",
    composition: {
      id: "${compId}",
      name: comp.name || "${doc.composition.name}",
      width: comp.width,
      height: comp.height,
      fps: comp.frameRate,
      durationInFrames: Math.round(comp.duration * comp.frameRate),
      backgroundColor: "${doc.composition.backgroundColor}"
    },
    layers
  };
}

async function syncToRemotionBridge() {
  const ecprojPayload = serializeActiveComposition();
  const response = await fetch(BRIDGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ecprojPayload)
  });
  return response.json();
}

syncToRemotionBridge();
`;

  const bridgeServerTs = `import express from 'express';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const app = express();
app.use(express.json({ limit: '5mb' }));

let latestEcprojState: any = null;

// Receive .ecproj snapshot from EffectCraft JS/WASM plugin
app.post('/api/remotion-sync', (req, res) => {
  latestEcprojState = req.body;
  const inputProps = {
    schemaVersion: '1.0.0',
    sourceBridge: 'effectcraft-ecproj',
    meta: latestEcprojState.composition,
    tracks: latestEcprojState.layers.map((layer: any) => ({
      ecLayerId: layer.id,
      name: layer.name,
      componentType: layer.type,
      visible: layer.visible,
      from: layer.startFrame,
      durationInFrames: Math.max(1, layer.endFrame - layer.startFrame),
      blendMode: layer.blendMode,
      baseTransform: layer.transform,
      props: layer.style,
      animations: { x: [], y: [], scale: [], rotation: [], opacity: [] },
    })),
  };

  res.json({ status: 'synced', compositionId: inputProps.meta.id, trackCount: inputProps.tracks.length });
});

// Trigger headless Remotion MP4/WebM render from latest synced .ecproj
app.post('/api/remotion-render', async (req, res) => {
  if (!latestEcprojState) {
    return res.status(400).json({ error: 'Belum ada composition yang disinkronkan dari EffectCraft.' });
  }
  const bundleLocation = await bundle({
    entryPoint: path.resolve('./src/index.ts'),
  });
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: '${compId}',
    inputProps: req.body.inputProps,
  });
  const outputLocation = path.resolve('./out/${compId}.mp4');
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation,
    inputProps: req.body.inputProps,
  });
  res.json({ rendered: true, outputLocation });
});

app.listen(4190, () => {
  console.log('EffectCraft <-> Remotion Bridge listening on http://127.0.0.1:4190');
});
`;

  const manifestJson = JSON.stringify(
    {
      name: 'effectcraft-remotion-bridge',
      displayName: 'EffectCraft Remotion Composition Bridge',
      version: '1.0.0',
      effectCraftAbi: 2,
      capabilities: ['composition.read', 'composition.write', 'session.commandStream', 'http.localBridge'],
      remotionTarget: {
        compositionId: compId,
        fps: doc.composition.fps,
        width: doc.composition.width,
        height: doc.composition.height,
        bridgeEndpoint: 'http://127.0.0.1:4190/api/remotion-sync',
      },
    },
    null,
    2
  );

  return [
    {
      filename: 'effectcraft-remotion-bridge.js',
      language: 'javascript',
      purpose: 'Skrip JS Scripting API di EffectCraft untuk membaca layer/keyframe aktif dan mengirimkannya ke Remotion bridge.',
      content: effectCraftScript,
    },
    {
      filename: 'RemotionComposition.tsx',
      language: 'typescript',
      purpose: 'Komponen React/Remotion & <Composition /> yang sinkron dengan proyek aktif Anda saat ini.',
      content: generateRemotionTsx(doc),
    },
    {
      filename: 'bridge-server.ts',
      language: 'typescript',
      purpose: 'Local Node.js bridge server menggunakan @remotion/bundler dan @remotion/renderer untuk render video nyata.',
      content: bridgeServerTs,
    },
    {
      filename: 'plugin-manifest.json',
      language: 'json',
      purpose: 'Manifest plugin EffectCraft ABI v2 untuk mendaftarkan menu dan hook sinkronisasi Remotion.',
      content: manifestJson,
    },
  ];
}
