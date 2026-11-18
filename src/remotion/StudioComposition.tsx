import React from 'react';
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { evaluatePropertyAtFrame } from '../engine/bridge';
import { RemotionCompositionProps, RemotionTrack } from '../types/studio';

export const StudioComposition: React.FC<RemotionCompositionProps> = ({ meta, tracks }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: meta.backgroundColor || '#0B0E14',
        overflow: 'hidden',
      }}
    >
      {tracks
        .filter((track) => track.visible)
        .map((track) => (
          <Sequence
            key={track.ecLayerId}
            from={track.from}
            durationInFrames={Math.max(1, track.durationInFrames)}
            name={track.name}
          >
            <TrackLayerRenderer track={track} fps={fps} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};

const TrackLayerRenderer: React.FC<{ track: RemotionTrack; fps: number }> = ({ track, fps }) => {
  const localFrame = useCurrentFrame();
  const globalFrame = localFrame + track.from;

  const x = evaluatePropertyAtFrame(track.baseTransform.x, track.animations.x, globalFrame, fps);
  const y = evaluatePropertyAtFrame(track.baseTransform.y, track.animations.y, globalFrame, fps);
  const scale = evaluatePropertyAtFrame(
    track.baseTransform.scale,
    track.animations.scale,
    globalFrame,
    fps
  );
  const rotation = evaluatePropertyAtFrame(
    track.baseTransform.rotation,
    track.animations.rotation,
    globalFrame,
    fps
  );
  const opacity = evaluatePropertyAtFrame(
    track.baseTransform.opacity,
    track.animations.opacity,
    globalFrame,
    fps
  );

  const blurPx = track.props.blur ?? 0;

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mixBlendMode: track.blendMode,
        opacity: Math.max(0, Math.min(1, opacity)),
        filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
        transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`,
        pointerEvents: 'none',
      }}
    >
      {track.componentType === 'gradient' && (
        <div
          style={{
            width: track.props.width ?? 1920,
            height: track.props.height ?? 1080,
            borderRadius: track.props.borderRadius ?? 0,
            background: `linear-gradient(${track.props.gradientAngle ?? 135}deg, ${
              track.props.color
            }, ${track.props.secondaryColor ?? '#1E3A8A'})`,
          }}
        />
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

      {track.componentType === 'text' && (
        <div
          style={{
            color: track.props.color,
            fontSize: track.props.fontSize ?? 72,
            fontWeight: track.props.fontWeight ?? 700,
            letterSpacing: `${track.props.letterSpacing ?? 0}px`,
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            textAlign: 'center',
            lineHeight: 1.15,
            whiteSpace: 'pre-wrap',
            maxWidth: '88%',
          }}
        >
          {track.props.text ?? 'EffectCraft Layer'}
        </div>
      )}

      {track.componentType === 'counter' && (
        <div
          style={{
            color: track.props.color,
            fontSize: track.props.fontSize ?? 112,
            fontWeight: track.props.fontWeight ?? 700,
            fontFamily: '"JetBrains Mono", monospace',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {track.props.counterPrefix ?? ''}
          {Math.round(
            interpolate(
              localFrame,
              [0, Math.max(1, Math.round(track.durationInFrames * 0.65))],
              [track.props.counterFrom ?? 0, track.props.counterTo ?? 100],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.out(Easing.cubic),
              }
            )
          ).toLocaleString('en-US')}
          {track.props.counterSuffix ?? ''}
        </div>
      )}
    </AbsoluteFill>
  );
};
