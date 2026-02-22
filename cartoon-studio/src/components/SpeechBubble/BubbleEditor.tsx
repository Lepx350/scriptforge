import { useStudio } from '../../store/StudioContext';
import type { BubbleStyle } from '../../types';

const BUBBLE_STYLES: { value: BubbleStyle; label: string; icon: string }[] = [
  { value: 'speech', label: 'Speech', icon: '&#128172;' },
  { value: 'thought', label: 'Thought', icon: '&#128173;' },
  { value: 'shout', label: 'Shout', icon: '&#128165;' },
  { value: 'whisper', label: 'Whisper', icon: '&#128300;' },
  { value: 'narration', label: 'Narration', icon: '&#128214;' },
];

export default function BubbleEditor() {
  const { state, dispatch } = useStudio();
  const currentScene = state.scenes[state.currentSceneIndex];

  const selectedBubble = state.selectedBubbleId
    ? currentScene.speechBubbles.find((b) => b.id === state.selectedBubbleId)
    : null;

  if (!selectedBubble) {
    return (
      <div className="panel bubble-panel">
        <div className="panel-header">
          <span className="panel-icon">&#128172;</span>
          SPEECH BUBBLES
        </div>
        <div className="panel-content" style={{ padding: '12px' }}>
          <div style={{ color: '#555', fontSize: '12px', textAlign: 'center', marginBottom: '12px' }}>
            Select a bubble on the canvas to edit, or use the Bubble tool to create one.
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'bubble' })}
          >
            &#128172; Add Speech Bubble
          </button>

          {currentScene.speechBubbles.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div className="section-title">Bubbles in Scene</div>
              {currentScene.speechBubbles.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: '6px 8px',
                    marginBottom: '4px',
                    background: '#1a1a2e',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#aaa',
                    border: '1px solid #2a2a3a',
                  }}
                  onClick={() => dispatch({ type: 'SELECT_BUBBLE', bubbleId: b.id })}
                >
                  {b.text.slice(0, 30)}
                  {b.text.length > 30 ? '...' : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="panel bubble-panel">
      <div className="panel-header">
        <span className="panel-icon">&#128172;</span>
        EDIT BUBBLE
      </div>
      <div className="panel-content" style={{ padding: '8px' }}>
        {/* Text */}
        <label className="field-label">Text</label>
        <textarea
          className="input-noir"
          value={selectedBubble.text}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_SPEECH_BUBBLE',
              bubbleId: selectedBubble.id,
              updates: { text: e.target.value },
            })
          }
          rows={3}
          style={{ width: '100%', resize: 'vertical' }}
        />

        {/* Style */}
        <label className="field-label" style={{ marginTop: '8px' }}>
          Style
        </label>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {BUBBLE_STYLES.map((s) => (
            <button
              key={s.value}
              className={`btn btn-ghost ${selectedBubble.style === s.value ? 'btn-active' : ''}`}
              style={{ fontSize: '11px', padding: '4px 8px' }}
              onClick={() =>
                dispatch({
                  type: 'UPDATE_SPEECH_BUBBLE',
                  bubbleId: selectedBubble.id,
                  updates: { style: s.value },
                })
              }
            >
              <span dangerouslySetInnerHTML={{ __html: s.icon }} /> {s.label}
            </button>
          ))}
        </div>

        {/* Font size */}
        <label className="field-label" style={{ marginTop: '8px' }}>
          Font Size: {selectedBubble.fontSize}px
        </label>
        <input
          type="range"
          min="10"
          max="48"
          value={selectedBubble.fontSize}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_SPEECH_BUBBLE',
              bubbleId: selectedBubble.id,
              updates: { fontSize: parseInt(e.target.value) },
            })
          }
          className="slider-noir"
        />

        {/* Size */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <div style={{ flex: 1 }}>
            <label className="field-label">Width</label>
            <input
              type="number"
              className="input-noir"
              value={selectedBubble.width}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_SPEECH_BUBBLE',
                  bubbleId: selectedBubble.id,
                  updates: { width: parseInt(e.target.value) || 100 },
                })
              }
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="field-label">Height</label>
            <input
              type="number"
              className="input-noir"
              value={selectedBubble.height}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_SPEECH_BUBBLE',
                  bubbleId: selectedBubble.id,
                  updates: { height: parseInt(e.target.value) || 60 },
                })
              }
            />
          </div>
        </div>

        {/* Colors */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <div style={{ flex: 1 }}>
            <label className="field-label">Text Color</label>
            <input
              type="color"
              value={selectedBubble.color}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_SPEECH_BUBBLE',
                  bubbleId: selectedBubble.id,
                  updates: { color: e.target.value },
                })
              }
              style={{ width: '100%', height: '28px', background: 'none', border: '1px solid #2a2a3a', borderRadius: '4px' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="field-label">Background</label>
            <input
              type="color"
              value={selectedBubble.backgroundColor}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_SPEECH_BUBBLE',
                  bubbleId: selectedBubble.id,
                  updates: { backgroundColor: e.target.value },
                })
              }
              style={{ width: '100%', height: '28px', background: 'none', border: '1px solid #2a2a3a', borderRadius: '4px' }}
            />
          </div>
        </div>

        {/* Tail position */}
        <label className="field-label" style={{ marginTop: '8px' }}>
          Tail Position
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <label className="field-label">Tail X</label>
            <input
              type="number"
              className="input-noir"
              value={Math.round(selectedBubble.tailX)}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_SPEECH_BUBBLE',
                  bubbleId: selectedBubble.id,
                  updates: { tailX: parseInt(e.target.value) || 0 },
                })
              }
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="field-label">Tail Y</label>
            <input
              type="number"
              className="input-noir"
              value={Math.round(selectedBubble.tailY)}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_SPEECH_BUBBLE',
                  bubbleId: selectedBubble.id,
                  updates: { tailY: parseInt(e.target.value) || 0 },
                })
              }
            />
          </div>
        </div>

        {/* Delete */}
        <button
          className="btn btn-danger"
          style={{ width: '100%', marginTop: '12px' }}
          onClick={() => dispatch({ type: 'REMOVE_SPEECH_BUBBLE', bubbleId: selectedBubble.id })}
        >
          &#10006; Delete Bubble
        </button>
      </div>
    </div>
  );
}
