import { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useStudio } from '../../store/StudioContext';
import { v4 as uuid } from 'uuid';
import type { EasingType } from '../../types';

const EASING_OPTIONS: EasingType[] = [
  'linear',
  'easeIn',
  'easeOut',
  'easeInOut',
  'bounceOut',
  'elasticOut',
];

export default function Timeline() {
  const { state, dispatch } = useStudio();
  const timelineRef = useRef<HTMLDivElement>(null);
  const currentScene = state.scenes[state.currentSceneIndex];

  const pxPerSecond = 120 * state.timelineZoom;
  const totalWidth = currentScene.duration * pxPerSecond;

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
      const time = Math.max(0, Math.min(x / pxPerSecond, currentScene.duration));
      dispatch({ type: 'SET_PLAYBACK', updates: { currentTime: time } });
    },
    [pxPerSecond, currentScene.duration, dispatch]
  );

  const handleAddKeyframe = useCallback(() => {
    const targetId = state.selectedAssetId || state.selectedBubbleId;
    if (!targetId) return;

    const isAsset = !!state.selectedAssetId;
    let transform;

    if (isAsset) {
      const sceneAsset = currentScene.assets.find((a) => a.id === targetId);
      if (!sceneAsset) return;
      transform = { ...sceneAsset.transform };
    } else {
      const bubble = currentScene.speechBubbles.find((b) => b.id === targetId);
      if (!bubble) return;
      transform = {
        x: bubble.x,
        y: bubble.y,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
      };
    }

    dispatch({
      type: 'ADD_KEYFRAME',
      keyframe: {
        id: uuid(),
        time: state.playback.currentTime,
        targetId,
        targetType: isAsset ? 'asset' : 'bubble',
        transform,
        easing: 'easeInOut',
      },
    });
  }, [state.selectedAssetId, state.selectedBubbleId, state.playback.currentTime, currentScene, dispatch]);

  const handleDeleteKeyframe = useCallback(() => {
    if (state.selectedKeyframeId) {
      dispatch({ type: 'REMOVE_KEYFRAME', keyframeId: state.selectedKeyframeId });
    }
  }, [state.selectedKeyframeId, dispatch]);

  // Get tracks - one per scene asset and bubble
  const tracks = [
    ...currentScene.assets.map((a) => ({
      id: a.id,
      label: state.assetLibrary.find((lib) => lib.id === a.assetId)?.name || 'Asset',
      type: 'asset' as const,
      keyframes: currentScene.keyframes.filter((k) => k.targetId === a.id),
    })),
    ...currentScene.speechBubbles.map((b) => ({
      id: b.id,
      label: b.text.slice(0, 15) + (b.text.length > 15 ? '...' : ''),
      type: 'bubble' as const,
      keyframes: currentScene.keyframes.filter((k) => k.targetId === b.id),
    })),
  ];

  const playheadX = state.playback.currentTime * pxPerSecond;

  return (
    <div className="panel timeline-panel">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="panel-icon">&#9654;</span>
          TIMELINE
          <span style={{ marginLeft: '12px', color: '#888', fontSize: '11px' }}>
            {state.playback.currentTime.toFixed(2)}s / {currentScene.duration}s
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn btn-ghost" title="Add Keyframe" onClick={handleAddKeyframe}>
            &#9670; +KF
          </button>
          <button
            className="btn btn-ghost"
            title="Delete Keyframe"
            onClick={handleDeleteKeyframe}
            disabled={!state.selectedKeyframeId}
          >
            &#10006;
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => dispatch({ type: 'SET_TIMELINE_ZOOM', zoom: Math.max(0.25, state.timelineZoom - 0.25) })}
          >
            -
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => dispatch({ type: 'SET_TIMELINE_ZOOM', zoom: Math.min(4, state.timelineZoom + 0.25) })}
          >
            +
          </button>
        </div>
      </div>

      <div
        ref={timelineRef}
        className="timeline-body"
        style={{
          overflowX: 'auto',
          overflowY: 'auto',
          position: 'relative',
          maxHeight: '200px',
        }}
        onClick={handleTimelineClick}
      >
        {/* Time ruler */}
        <div
          style={{
            height: '24px',
            width: totalWidth,
            position: 'relative',
            borderBottom: '1px solid #2a2a3a',
            background: '#0f0f1a',
          }}
        >
          {Array.from({ length: Math.ceil(currentScene.duration) + 1 }, (_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: i * pxPerSecond,
                top: 0,
                height: '100%',
                borderLeft: '1px solid #2a2a3a',
                color: '#666',
                fontSize: '10px',
                paddingLeft: '4px',
                paddingTop: '4px',
              }}
            >
              {i}s
            </div>
          ))}
        </div>

        {/* Tracks */}
        {tracks.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#555', fontSize: '12px', width: totalWidth }}>
            Add assets to the scene to see timeline tracks
          </div>
        ) : (
          tracks.map((track) => (
            <div
              key={track.id}
              style={{
                display: 'flex',
                height: '36px',
                borderBottom: '1px solid #1a1a2e',
                width: Math.max(totalWidth, 600),
              }}
            >
              {/* Track label */}
              <div
                style={{
                  width: '120px',
                  minWidth: '120px',
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  background: '#0f0f1a',
                  borderRight: '1px solid #2a2a3a',
                  fontSize: '11px',
                  color: track.id === state.selectedAssetId || track.id === state.selectedBubbleId
                    ? '#ffd700'
                    : '#888',
                  cursor: 'pointer',
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (track.type === 'asset') {
                    dispatch({ type: 'SELECT_ASSET', assetId: track.id });
                  } else {
                    dispatch({ type: 'SELECT_BUBBLE', bubbleId: track.id });
                  }
                }}
              >
                {track.type === 'asset' ? '&#9824;' : '&#9737;'} {track.label}
              </div>

              {/* Track area */}
              <div style={{ flex: 1, position: 'relative', background: '#12121f' }}>
                {track.keyframes.map((kf) => (
                  <motion.div
                    key={kf.id}
                    whileHover={{ scale: 1.3 }}
                    style={{
                      position: 'absolute',
                      left: kf.time * pxPerSecond - 7,
                      top: '50%',
                      transform: 'translateY(-50%) rotate(45deg)',
                      width: 14,
                      height: 14,
                      background: kf.id === state.selectedKeyframeId ? '#ff6b6b' : '#ffd700',
                      border: '2px solid #0a0a0f',
                      cursor: 'pointer',
                      zIndex: 3,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'SELECT_KEYFRAME', keyframeId: kf.id });
                    }}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {/* Playhead */}
        <div
          style={{
            position: 'absolute',
            left: 120 + playheadX,
            top: 0,
            bottom: 0,
            width: '2px',
            background: '#ff4444',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '-5px',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '8px solid #ff4444',
            }}
          />
        </div>
      </div>

      {/* Keyframe properties */}
      {state.selectedKeyframeId && (
        <KeyframeProperties
          keyframeId={state.selectedKeyframeId}
        />
      )}
    </div>
  );
}

function KeyframeProperties({ keyframeId }: { keyframeId: string }) {
  const { state, dispatch } = useStudio();
  const currentScene = state.scenes[state.currentSceneIndex];
  const kf = currentScene.keyframes.find((k) => k.id === keyframeId);
  if (!kf) return null;

  return (
    <div
      style={{
        padding: '8px',
        borderTop: '1px solid #2a2a3a',
        background: '#0f0f1a',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        fontSize: '11px',
        color: '#888',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ color: '#ffd700' }}>&#9670; Keyframe</span>
      <label>
        Time:
        <input
          type="number"
          className="input-mini"
          value={kf.time.toFixed(2)}
          step="0.1"
          min="0"
          max={currentScene.duration}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_KEYFRAME',
              keyframeId,
              updates: { time: parseFloat(e.target.value) || 0 },
            })
          }
        />
      </label>
      <label>
        Easing:
        <select
          className="input-mini"
          value={kf.easing}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_KEYFRAME',
              keyframeId,
              updates: { easing: e.target.value as EasingType },
            })
          }
        >
          {EASING_OPTIONS.map((ease) => (
            <option key={ease} value={ease}>{ease}</option>
          ))}
        </select>
      </label>
      <label>
        X:
        <input
          type="number"
          className="input-mini"
          value={Math.round(kf.transform.x)}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_KEYFRAME',
              keyframeId,
              updates: { transform: { ...kf.transform, x: parseFloat(e.target.value) || 0 } },
            })
          }
        />
      </label>
      <label>
        Y:
        <input
          type="number"
          className="input-mini"
          value={Math.round(kf.transform.y)}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_KEYFRAME',
              keyframeId,
              updates: { transform: { ...kf.transform, y: parseFloat(e.target.value) || 0 } },
            })
          }
        />
      </label>
      <label>
        Rotation:
        <input
          type="number"
          className="input-mini"
          value={Math.round(kf.transform.rotation)}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_KEYFRAME',
              keyframeId,
              updates: { transform: { ...kf.transform, rotation: parseFloat(e.target.value) || 0 } },
            })
          }
        />
      </label>
      <label>
        Opacity:
        <input
          type="number"
          className="input-mini"
          value={kf.transform.opacity.toFixed(2)}
          step="0.1"
          min="0"
          max="1"
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_KEYFRAME',
              keyframeId,
              updates: { transform: { ...kf.transform, opacity: parseFloat(e.target.value) || 0 } },
            })
          }
        />
      </label>
    </div>
  );
}
