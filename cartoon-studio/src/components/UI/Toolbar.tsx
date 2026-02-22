import { motion } from 'framer-motion';
import { useStudio } from '../../store/StudioContext';
import type { ToolType } from '../../types';

const TOOLS: { type: ToolType; label: string; icon: string; shortcut: string }[] = [
  { type: 'select', label: 'Select', icon: '&#9757;', shortcut: 'V' },
  { type: 'move', label: 'Move', icon: '&#10021;', shortcut: 'M' },
  { type: 'bubble', label: 'Bubble', icon: '&#128172;', shortcut: 'B' },
  { type: 'eraser', label: 'Delete', icon: '&#10006;', shortcut: 'X' },
];

export default function Toolbar() {
  const { state, dispatch } = useStudio();
  const currentScene = state.scenes[state.currentSceneIndex];

  // Handle delete for selected items
  const handleDelete = () => {
    if (state.selectedAssetId) {
      dispatch({ type: 'REMOVE_SCENE_ASSET', assetId: state.selectedAssetId });
    } else if (state.selectedBubbleId) {
      dispatch({ type: 'REMOVE_SPEECH_BUBBLE', bubbleId: state.selectedBubbleId });
    }
  };

  // Scene properties
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const duration = parseFloat(e.target.value) || 1;
    dispatch({
      type: 'UPDATE_SCENE',
      index: state.currentSceneIndex,
      scene: { duration },
    });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: 'UPDATE_SCENE',
      index: state.currentSceneIndex,
      scene: { name: e.target.value },
    });
  };

  return (
    <div className="toolbar">
      {/* Tools */}
      <div className="toolbar-group">
        {TOOLS.map((tool) => (
          <motion.button
            key={tool.type}
            className={`toolbar-btn ${state.activeTool === tool.type ? 'active' : ''}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (tool.type === 'eraser') {
                handleDelete();
              } else {
                dispatch({ type: 'SET_ACTIVE_TOOL', tool: tool.type });
              }
            }}
            title={`${tool.label} (${tool.shortcut})`}
          >
            <span dangerouslySetInnerHTML={{ __html: tool.icon }} />
          </motion.button>
        ))}
      </div>

      <div className="toolbar-divider" />

      {/* Scene info */}
      <div className="toolbar-group" style={{ alignItems: 'center' }}>
        <input
          className="input-noir input-inline"
          value={currentScene.name}
          onChange={handleNameChange}
          style={{ width: '120px', fontWeight: 'bold' }}
        />
        <label style={{ color: '#666', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          Duration:
          <input
            type="number"
            className="input-mini"
            value={currentScene.duration}
            min={1}
            max={60}
            step={0.5}
            onChange={handleDurationChange}
            style={{ width: '50px' }}
          />
          s
        </label>
      </div>

      <div className="toolbar-divider" />

      {/* Selection info */}
      <div className="toolbar-group" style={{ color: '#888', fontSize: '11px' }}>
        {state.selectedAssetId && (
          <span style={{ color: '#ffd700' }}>
            &#9824; {state.assetLibrary.find((a) =>
              currentScene.assets.find((sa) => sa.id === state.selectedAssetId)?.assetId === a.id
            )?.name || 'Asset'} selected
          </span>
        )}
        {state.selectedBubbleId && (
          <span style={{ color: '#00ffff' }}>
            &#9737; Bubble selected
          </span>
        )}
        {!state.selectedAssetId && !state.selectedBubbleId && (
          <span>Nothing selected</span>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Right: scene background color */}
      <div className="toolbar-group" style={{ alignItems: 'center' }}>
        <label style={{ color: '#666', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          BG:
          <input
            type="color"
            value={currentScene.backgroundColor}
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_SCENE',
                index: state.currentSceneIndex,
                scene: { backgroundColor: e.target.value },
              })
            }
            style={{ width: '28px', height: '22px', background: 'none', border: '1px solid #2a2a3a', borderRadius: '3px' }}
          />
        </label>
      </div>
    </div>
  );
}
