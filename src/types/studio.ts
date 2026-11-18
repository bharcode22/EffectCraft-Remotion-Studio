export type EcLayerType = 'text' | 'shape' | 'gradient' | 'counter';

export type EasingKind = 'linear' | 'easeOut' | 'spring';

export type AnimatableProperty = 'x' | 'y' | 'scale' | 'rotation' | 'opacity';

export type BlendMode = 'normal' | 'screen' | 'multiply' | 'overlay';

export type SyncOrigin = 'effectcraft-ui' | 'ecproj-json' | 'remotion-props';

export type WorkspaceView = 'studio' | 'sync' | 'architecture' | 'export';

export interface EcKeyframe {
  id: string;
  frame: number;
  property: AnimatableProperty;
  value: number;
  easing: EasingKind;
}

export interface EcLayerTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface EcLayerStyle {
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  color: string;
  secondaryColor?: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  blur?: number;
  gradientAngle?: number;
  counterFrom?: number;
  counterTo?: number;
  counterPrefix?: string;
  counterSuffix?: string;
}

export interface EcLayer {
  id: string;
  name: string;
  type: EcLayerType;
  visible: boolean;
  locked: boolean;
  startFrame: number;
  endFrame: number;
  blendMode: BlendMode;
  transform: EcLayerTransform;
  style: EcLayerStyle;
  keyframes: EcKeyframe[];
}

export interface EcCompositionMeta {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  backgroundColor: string;
}

export interface EcProjectDocument {
  schemaVersion: '1.0.0';
  engineTarget: 'remotion-4';
  composition: EcCompositionMeta;
  layers: EcLayer[];
}

export interface RemotionTrack {
  ecLayerId: string;
  name: string;
  componentType: EcLayerType;
  visible: boolean;
  locked: boolean;
  from: number;
  durationInFrames: number;
  blendMode: BlendMode;
  baseTransform: EcLayerTransform;
  props: EcLayerStyle;
  animations: Record<AnimatableProperty, Array<{ id: string; frame: number; value: number; easing: EasingKind }>>;
}

export interface RemotionCompositionProps {
  schemaVersion: '1.0.0';
  sourceBridge: 'effectcraft-ecproj';
  meta: EcCompositionMeta;
  tracks: RemotionTrack[];
}

export interface GeneratedPluginFile {
  filename: string;
  language: 'javascript' | 'typescript' | 'json';
  purpose: string;
  content: string;
}
