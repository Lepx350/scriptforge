export interface Vector2 {
  x: number;
  y: number;
}

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
}

export type AssetType = 'character' | 'background' | 'prop';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  imageUrl: string;
  width: number;
  height: number;
}

export interface SceneAsset {
  id: string;
  assetId: string;
  transform: Transform;
  zIndex: number;
  visible: boolean;
}

export type BubbleStyle = 'speech' | 'thought' | 'shout' | 'whisper' | 'narration';

export interface SpeechBubble {
  id: string;
  text: string;
  style: BubbleStyle;
  x: number;
  y: number;
  width: number;
  height: number;
  tailX: number;
  tailY: number;
  fontSize: number;
  color: string;
  backgroundColor: string;
}

export interface Keyframe {
  id: string;
  time: number; // in seconds
  targetId: string; // sceneAsset id or speechBubble id
  targetType: 'asset' | 'bubble';
  transform: Transform;
  easing: EasingType;
}

export type EasingType =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'bounceOut'
  | 'elasticOut';

export type SfxType =
  | 'impact'
  | 'whoosh'
  | 'pop'
  | 'zap'
  | 'boom'
  | 'splat'
  | 'ding'
  | 'dramatic'
  | 'laugh'
  | 'custom';

export interface SoundEffect {
  id: string;
  name: string;
  sfxType: SfxType;
  startTime: number;
  duration: number;
  volume: number;
  audioUrl?: string;
}

export interface Scene {
  id: string;
  name: string;
  duration: number; // in seconds
  backgroundUrl: string | null;
  backgroundColor: string;
  assets: SceneAsset[];
  speechBubbles: SpeechBubble[];
  keyframes: Keyframe[];
  soundEffects: SoundEffect[];
  thumbnailUrl?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  fps: number;
  loop: boolean;
}

export interface StudioState {
  // Project
  scenes: Scene[];
  currentSceneIndex: number;
  assetLibrary: Asset[];

  // Selection
  selectedAssetId: string | null;
  selectedBubbleId: string | null;
  selectedKeyframeId: string | null;

  // Playback
  playback: PlaybackState;

  // UI
  activeTool: ToolType;
  timelineZoom: number;
  showGrid: boolean;
  geminiApiKey: string;
}

export type ToolType = 'select' | 'move' | 'bubble' | 'eraser';

export type StudioAction =
  | { type: 'SET_SCENES'; scenes: Scene[] }
  | { type: 'SET_CURRENT_SCENE'; index: number }
  | { type: 'ADD_SCENE'; scene: Scene }
  | { type: 'UPDATE_SCENE'; index: number; scene: Partial<Scene> }
  | { type: 'DELETE_SCENE'; index: number }
  | { type: 'REORDER_SCENES'; fromIndex: number; toIndex: number }
  | { type: 'ADD_ASSET_TO_LIBRARY'; asset: Asset }
  | { type: 'ADD_ASSET_TO_SCENE'; sceneAsset: SceneAsset }
  | { type: 'UPDATE_SCENE_ASSET'; assetId: string; updates: Partial<SceneAsset> }
  | { type: 'REMOVE_SCENE_ASSET'; assetId: string }
  | { type: 'SELECT_ASSET'; assetId: string | null }
  | { type: 'SELECT_BUBBLE'; bubbleId: string | null }
  | { type: 'SELECT_KEYFRAME'; keyframeId: string | null }
  | { type: 'ADD_SPEECH_BUBBLE'; bubble: SpeechBubble }
  | { type: 'UPDATE_SPEECH_BUBBLE'; bubbleId: string; updates: Partial<SpeechBubble> }
  | { type: 'REMOVE_SPEECH_BUBBLE'; bubbleId: string }
  | { type: 'ADD_KEYFRAME'; keyframe: Keyframe }
  | { type: 'UPDATE_KEYFRAME'; keyframeId: string; updates: Partial<Keyframe> }
  | { type: 'REMOVE_KEYFRAME'; keyframeId: string }
  | { type: 'ADD_SOUND_EFFECT'; sfx: SoundEffect }
  | { type: 'UPDATE_SOUND_EFFECT'; sfxId: string; updates: Partial<SoundEffect> }
  | { type: 'REMOVE_SOUND_EFFECT'; sfxId: string }
  | { type: 'SET_PLAYBACK'; updates: Partial<PlaybackState> }
  | { type: 'SET_ACTIVE_TOOL'; tool: ToolType }
  | { type: 'SET_TIMELINE_ZOOM'; zoom: number }
  | { type: 'TOGGLE_GRID' }
  | { type: 'SET_GEMINI_API_KEY'; key: string }
  | { type: 'SET_SCENE_BACKGROUND'; url: string };
