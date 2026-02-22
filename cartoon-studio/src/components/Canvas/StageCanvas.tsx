import { useRef, useEffect, useCallback, useState } from 'react';
import { useStudio } from '../../store/StudioContext';
import {
  renderScene,
  hitTestAsset,
  hitTestBubble,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  preloadSceneImages,
} from '../../engine/canvasRenderer';
import { v4 as uuid } from 'uuid';

export default function StageCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, dispatch } = useStudio();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragTarget, setDragTarget] = useState<{ id: string; type: 'asset' | 'bubble' } | null>(null);
  const animFrameRef = useRef<number>(0);

  const currentScene = state.scenes[state.currentSceneIndex];

  // Convert screen coords to canvas coords
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      return {
        x: (screenX - rect.left) * scaleX,
        y: (screenY - rect.top) * scaleY,
      };
    },
    []
  );

  // Preload images when scene changes
  useEffect(() => {
    preloadSceneImages(currentScene, state.assetLibrary);
  }, [currentScene, state.assetLibrary]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      renderScene(ctx, currentScene, state.assetLibrary, {
        showGrid: state.showGrid,
        selectedAssetId: state.selectedAssetId,
        selectedBubbleId: state.selectedBubbleId,
        currentTime: state.playback.currentTime,
        isPlaying: state.playback.isPlaying,
      });
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [currentScene, state.assetLibrary, state.showGrid, state.selectedAssetId, state.selectedBubbleId, state.playback.currentTime, state.playback.isPlaying]);

  // Playback timer
  useEffect(() => {
    if (!state.playback.isPlaying) return;

    const interval = setInterval(() => {
      const next = state.playback.currentTime + 1 / state.playback.fps;
      if (next >= currentScene.duration) {
        if (state.playback.loop) {
          dispatch({ type: 'SET_PLAYBACK', updates: { currentTime: 0 } });
        } else {
          dispatch({ type: 'SET_PLAYBACK', updates: { isPlaying: false, currentTime: 0 } });
        }
      } else {
        dispatch({ type: 'SET_PLAYBACK', updates: { currentTime: next } });
      }
    }, 1000 / state.playback.fps);

    return () => clearInterval(interval);
  }, [state.playback.isPlaying, state.playback.currentTime, state.playback.fps, state.playback.loop, currentScene.duration, dispatch]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (state.playback.isPlaying) return;

      const { x, y } = screenToCanvas(e.clientX, e.clientY);

      if (state.activeTool === 'bubble') {
        // Create a new speech bubble
        const bubble = {
          id: uuid(),
          text: 'Edit me!',
          style: 'speech' as const,
          x: x - 80,
          y: y - 40,
          width: 200,
          height: 100,
          tailX: x,
          tailY: y + 80,
          fontSize: 18,
          color: '#1a1a2e',
          backgroundColor: '#fffef5',
        };
        dispatch({ type: 'ADD_SPEECH_BUBBLE', bubble });
        dispatch({ type: 'SELECT_BUBBLE', bubbleId: bubble.id });
        dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'select' });
        return;
      }

      // Check bubbles first (they're on top)
      const bubbleId = hitTestBubble(x, y, currentScene);
      if (bubbleId) {
        dispatch({ type: 'SELECT_BUBBLE', bubbleId });
        const bubble = currentScene.speechBubbles.find((b) => b.id === bubbleId)!;
        setDragOffset({ x: x - bubble.x, y: y - bubble.y });
        setDragTarget({ id: bubbleId, type: 'bubble' });
        setIsDragging(true);
        return;
      }

      // Check assets
      const assetId = hitTestAsset(x, y, currentScene, state.assetLibrary, state.playback.currentTime);
      if (assetId) {
        dispatch({ type: 'SELECT_ASSET', assetId });
        const sceneAsset = currentScene.assets.find((a) => a.id === assetId)!;
        setDragOffset({ x: x - sceneAsset.transform.x, y: y - sceneAsset.transform.y });
        setDragTarget({ id: assetId, type: 'asset' });
        setIsDragging(true);
        return;
      }

      // Deselect
      dispatch({ type: 'SELECT_ASSET', assetId: null });
      dispatch({ type: 'SELECT_BUBBLE', bubbleId: null });
    },
    [state, currentScene, screenToCanvas, dispatch]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragTarget) return;
      const { x, y } = screenToCanvas(e.clientX, e.clientY);

      if (dragTarget.type === 'asset') {
        dispatch({
          type: 'UPDATE_SCENE_ASSET',
          assetId: dragTarget.id,
          updates: {
            transform: {
              ...currentScene.assets.find((a) => a.id === dragTarget.id)!.transform,
              x: x - dragOffset.x,
              y: y - dragOffset.y,
            },
          },
        });
      } else if (dragTarget.type === 'bubble') {
        dispatch({
          type: 'UPDATE_SPEECH_BUBBLE',
          bubbleId: dragTarget.id,
          updates: {
            x: x - dragOffset.x,
            y: y - dragOffset.y,
          },
        });
      }
    },
    [isDragging, dragTarget, dragOffset, screenToCanvas, currentScene, dispatch]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragTarget(null);
  }, []);

  // Handle drop from asset panel
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const assetId = e.dataTransfer.getData('application/asset-id');
      if (!assetId) return;

      const asset = state.assetLibrary.find((a) => a.id === assetId);
      if (!asset) return;

      const { x, y } = screenToCanvas(e.clientX, e.clientY);

      dispatch({
        type: 'ADD_ASSET_TO_SCENE',
        sceneAsset: {
          id: uuid(),
          assetId: asset.id,
          transform: {
            x: x - asset.width / 2,
            y: y - asset.height / 2,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
          },
          zIndex: currentScene.assets.length,
          visible: true,
        },
      });
    },
    [state.assetLibrary, currentScene, screenToCanvas, dispatch]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  return (
    <div
      ref={containerRef}
      className="stage-container"
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        background: '#0a0a0f',
        borderRadius: '4px',
        overflow: 'hidden',
        border: '2px solid #2a2a3a',
        boxShadow: '0 0 40px rgba(0,0,0,0.6), inset 0 0 60px rgba(0,0,0,0.3)',
        cursor: state.activeTool === 'bubble' ? 'crosshair' : isDragging ? 'grabbing' : 'default',
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      />
      {/* Film strip border effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '8px',
          background: 'repeating-linear-gradient(90deg, #1a1a2e 0px, #1a1a2e 12px, #0a0a0f 12px, #0a0a0f 18px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '8px',
          background: 'repeating-linear-gradient(90deg, #1a1a2e 0px, #1a1a2e 12px, #0a0a0f 12px, #0a0a0f 18px)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
