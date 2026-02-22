import type { StudioState, StudioAction } from '../types';
import type { Scene } from '../types';
import { v4 as uuid } from 'uuid';

export function createDefaultScene(): Scene {
  return {
    id: uuid(),
    name: 'Scene 1',
    duration: 5,
    backgroundUrl: null,
    backgroundColor: '#1a1a2e',
    assets: [],
    speechBubbles: [],
    keyframes: [],
    soundEffects: [],
  };
}

export const initialState: StudioState = {
  scenes: [createDefaultScene()],
  currentSceneIndex: 0,
  assetLibrary: [],
  selectedAssetId: null,
  selectedBubbleId: null,
  selectedKeyframeId: null,
  playback: {
    isPlaying: false,
    currentTime: 0,
    fps: 24,
    loop: false,
  },
  activeTool: 'select',
  timelineZoom: 1,
  showGrid: false,
  geminiApiKey: '',
};

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  const currentScene = state.scenes[state.currentSceneIndex];

  switch (action.type) {
    case 'SET_SCENES':
      return { ...state, scenes: action.scenes };

    case 'SET_CURRENT_SCENE':
      return {
        ...state,
        currentSceneIndex: action.index,
        selectedAssetId: null,
        selectedBubbleId: null,
        selectedKeyframeId: null,
        playback: { ...state.playback, currentTime: 0, isPlaying: false },
      };

    case 'ADD_SCENE':
      return {
        ...state,
        scenes: [...state.scenes, action.scene],
        currentSceneIndex: state.scenes.length,
      };

    case 'UPDATE_SCENE': {
      const scenes = [...state.scenes];
      scenes[action.index] = { ...scenes[action.index], ...action.scene };
      return { ...state, scenes };
    }

    case 'DELETE_SCENE': {
      if (state.scenes.length <= 1) return state;
      const scenes = state.scenes.filter((_, i) => i !== action.index);
      const newIndex = Math.min(state.currentSceneIndex, scenes.length - 1);
      return { ...state, scenes, currentSceneIndex: newIndex };
    }

    case 'REORDER_SCENES': {
      const scenes = [...state.scenes];
      const [moved] = scenes.splice(action.fromIndex, 1);
      scenes.splice(action.toIndex, 0, moved);
      let newIndex = state.currentSceneIndex;
      if (state.currentSceneIndex === action.fromIndex) {
        newIndex = action.toIndex;
      }
      return { ...state, scenes, currentSceneIndex: newIndex };
    }

    case 'ADD_ASSET_TO_LIBRARY':
      return { ...state, assetLibrary: [...state.assetLibrary, action.asset] };

    case 'ADD_ASSET_TO_SCENE': {
      const updated = {
        ...currentScene,
        assets: [...currentScene.assets, action.sceneAsset],
      };
      const scenes = [...state.scenes];
      scenes[state.currentSceneIndex] = updated;
      return { ...state, scenes };
    }

    case 'UPDATE_SCENE_ASSET': {
      const updated = {
        ...currentScene,
        assets: currentScene.assets.map((a) =>
          a.id === action.assetId ? { ...a, ...action.updates } : a
        ),
      };
      const scenes = [...state.scenes];
      scenes[state.currentSceneIndex] = updated;
      return { ...state, scenes };
    }

    case 'REMOVE_SCENE_ASSET': {
      const updated = {
        ...currentScene,
        assets: currentScene.assets.filter((a) => a.id !== action.assetId),
        keyframes: currentScene.keyframes.filter((k) => k.targetId !== action.assetId),
      };
      const scenes = [...state.scenes];
      scenes[state.currentSceneIndex] = updated;
      return {
        ...state,
        scenes,
        selectedAssetId: state.selectedAssetId === action.assetId ? null : state.selectedAssetId,
      };
    }

    case 'SELECT_ASSET':
      return { ...state, selectedAssetId: action.assetId, selectedBubbleId: null };

    case 'SELECT_BUBBLE':
      return { ...state, selectedBubbleId: action.bubbleId, selectedAssetId: null };

    case 'SELECT_KEYFRAME':
      return { ...state, selectedKeyframeId: action.keyframeId };

    case 'ADD_SPEECH_BUBBLE': {
      const updated = {
        ...currentScene,
        speechBubbles: [...currentScene.speechBubbles, action.bubble],
      };
      const scenes = [...state.scenes];
      scenes[state.currentSceneIndex] = updated;
      return { ...state, scenes };
    }

    case 'UPDATE_SPEECH_BUBBLE': {
      const updated = {
        ...currentScene,
        speechBubbles: currentScene.speechBubbles.map((b) =>
          b.id === action.bubbleId ? { ...b, ...action.updates } : b
        ),
      };
      const scenes = [...state.scenes];
      scenes[state.currentSceneIndex] = updated;
      return { ...state, scenes };
    }

    case 'REMOVE_SPEECH_BUBBLE': {
      const updated = {
        ...currentScene,
        speechBubbles: currentScene.speechBubbles.filter((b) => b.id !== action.bubbleId),
      };
      const scenes = [...state.scenes];
      scenes[state.currentSceneIndex] = updated;
      return {
        ...state,
        scenes,
        selectedBubbleId:
          state.selectedBubbleId === action.bubbleId ? null : state.selectedBubbleId,
      };
    }

    case 'ADD_KEYFRAME': {
      const updated = {
        ...currentScene,
        keyframes: [...currentScene.keyframes, action.keyframe],
      };
      const scenes = [...state.scenes];
      scenes[state.currentSceneIndex] = updated;
      return { ...state, scenes };
    }

    case 'UPDATE_KEYFRAME': {
      const updated = {
        ...currentScene,
        keyframes: currentScene.keyframes.map((k) =>
          k.id === action.keyframeId ? { ...k, ...action.updates } : k
        ),
      };
      const scenes = [...state.scenes];
      scenes[state.currentSceneIndex] = updated;
      return { ...state, scenes };
    }

    case 'REMOVE_KEYFRAME': {
      const updated = {
        ...currentScene,
        keyframes: currentScene.keyframes.filter((k) => k.id !== action.keyframeId),
      };
      const scenes = [...state.scenes];
      scenes[state.currentSceneIndex] = updated;
      return { ...state, scenes };
    }

    case 'ADD_SOUND_EFFECT': {
      const updated = {
        ...currentScene,
        soundEffects: [...currentScene.soundEffects, action.sfx],
      };
      const scenes = [...state.scenes];
      scenes[state.currentSceneIndex] = updated;
      return { ...state, scenes };
    }

    case 'UPDATE_SOUND_EFFECT': {
      const updated = {
        ...currentScene,
        soundEffects: currentScene.soundEffects.map((s) =>
          s.id === action.sfxId ? { ...s, ...action.updates } : s
        ),
      };
      const scenes = [...state.scenes];
      scenes[state.currentSceneIndex] = updated;
      return { ...state, scenes };
    }

    case 'REMOVE_SOUND_EFFECT': {
      const updated = {
        ...currentScene,
        soundEffects: currentScene.soundEffects.filter((s) => s.id !== action.sfxId),
      };
      const scenes = [...state.scenes];
      scenes[state.currentSceneIndex] = updated;
      return { ...state, scenes };
    }

    case 'SET_PLAYBACK':
      return { ...state, playback: { ...state.playback, ...action.updates } };

    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.tool };

    case 'SET_TIMELINE_ZOOM':
      return { ...state, timelineZoom: action.zoom };

    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };

    case 'SET_GEMINI_API_KEY':
      return { ...state, geminiApiKey: action.key };

    case 'SET_SCENE_BACKGROUND': {
      const scenes = [...state.scenes];
      scenes[state.currentSceneIndex] = {
        ...currentScene,
        backgroundUrl: action.url,
      };
      return { ...state, scenes };
    }

    default:
      return state;
  }
}
