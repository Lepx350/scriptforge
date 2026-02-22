import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useStudio } from '../../store/StudioContext';
import { createDefaultScene } from '../../store/studioReducer';
import type { Scene } from '../../types';

export default function Storyboard() {
  const { state, dispatch } = useStudio();

  const handleAddScene = () => {
    const scene = createDefaultScene();
    scene.name = `Scene ${state.scenes.length + 1}`;
    dispatch({ type: 'ADD_SCENE', scene });
  };

  const handleDeleteScene = (index: number) => {
    if (state.scenes.length <= 1) return;
    dispatch({ type: 'DELETE_SCENE', index });
  };

  const handleDuplicateScene = (index: number) => {
    const source = state.scenes[index];
    const newScene: Scene = {
      ...JSON.parse(JSON.stringify(source)),
      id: crypto.randomUUID(),
      name: `${source.name} (copy)`,
    };
    dispatch({ type: 'ADD_SCENE', scene: newScene });
  };

  const handleReorder = (newOrder: Scene[]) => {
    dispatch({ type: 'SET_SCENES', scenes: newOrder });
  };

  return (
    <div className="panel storyboard-panel">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <span className="panel-icon">&#9635;</span>
          STORYBOARD
        </div>
        <button className="btn btn-ghost" onClick={handleAddScene}>
          + Scene
        </button>
      </div>

      <div
        className="panel-content"
        style={{
          display: 'flex',
          gap: '8px',
          padding: '8px',
          overflowX: 'auto',
          minHeight: '100px',
        }}
      >
        <Reorder.Group
          axis="x"
          values={state.scenes}
          onReorder={handleReorder}
          style={{ display: 'flex', gap: '8px', listStyle: 'none', margin: 0, padding: 0 }}
        >
          <AnimatePresence>
            {state.scenes.map((scene, index) => (
              <Reorder.Item
                key={scene.id}
                value={scene}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <motion.div
                  whileHover={{ y: -2 }}
                  onClick={() => dispatch({ type: 'SET_CURRENT_SCENE', index })}
                  style={{
                    width: '140px',
                    minWidth: '140px',
                    background: index === state.currentSceneIndex ? '#1a1a3e' : '#12121f',
                    border: `2px solid ${index === state.currentSceneIndex ? '#ffd700' : '#2a2a3a'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    userSelect: 'none',
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      height: '70px',
                      background: scene.backgroundColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      color: '#333',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {scene.backgroundUrl ? (
                      <img
                        src={scene.backgroundUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ color: '#3a3a5a', fontSize: '28px' }}>&#9635;</span>
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        top: '4px',
                        left: '4px',
                        background: 'rgba(0,0,0,0.7)',
                        color: '#ffd700',
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontWeight: 'bold',
                      }}
                    >
                      {index + 1}
                    </div>
                    {scene.assets.length > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '4px',
                          right: '4px',
                          background: 'rgba(0,0,0,0.7)',
                          color: '#888',
                          fontSize: '9px',
                          padding: '1px 5px',
                          borderRadius: '3px',
                        }}
                      >
                        {scene.assets.length} assets
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '6px 8px' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: index === state.currentSceneIndex ? '#ffd700' : '#aaa',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {scene.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                      {scene.duration}s
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      <button
                        className="btn-micro"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateScene(index);
                        }}
                        title="Duplicate"
                      >
                        &#10697;
                      </button>
                      <button
                        className="btn-micro btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteScene(index);
                        }}
                        title="Delete"
                        disabled={state.scenes.length <= 1}
                      >
                        &#10006;
                      </button>
                    </div>
                  </div>
                </motion.div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>
    </div>
  );
}
