import { motion } from 'framer-motion';
import { useStudio } from '../../store/StudioContext';

export default function PlaybackControls() {
  const { state, dispatch } = useStudio();
  const currentScene = state.scenes[state.currentSceneIndex];
  const { isPlaying, currentTime, loop, fps } = state.playback;

  const togglePlay = () => {
    dispatch({ type: 'SET_PLAYBACK', updates: { isPlaying: !isPlaying } });
  };

  const stop = () => {
    dispatch({ type: 'SET_PLAYBACK', updates: { isPlaying: false, currentTime: 0 } });
  };

  const skipToStart = () => {
    dispatch({ type: 'SET_PLAYBACK', updates: { currentTime: 0, isPlaying: false } });
  };

  const skipToEnd = () => {
    dispatch({
      type: 'SET_PLAYBACK',
      updates: { currentTime: currentScene.duration, isPlaying: false },
    });
  };

  const stepFrame = (direction: 1 | -1) => {
    const frameTime = 1 / fps;
    const newTime = Math.max(0, Math.min(currentTime + frameTime * direction, currentScene.duration));
    dispatch({ type: 'SET_PLAYBACK', updates: { currentTime: newTime, isPlaying: false } });
  };

  const progressPercent = currentScene.duration > 0
    ? (currentTime / currentScene.duration) * 100
    : 0;

  return (
    <div className="playback-controls">
      {/* Progress bar */}
      <div
        className="progress-track"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          dispatch({
            type: 'SET_PLAYBACK',
            updates: { currentTime: pct * currentScene.duration },
          });
        }}
      >
        <div
          className="progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
        <div
          className="progress-thumb"
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      <div className="controls-row">
        {/* Left: time display */}
        <div className="time-display">
          <span className="time-current">{formatTime(currentTime)}</span>
          <span className="time-separator">/</span>
          <span className="time-total">{formatTime(currentScene.duration)}</span>
        </div>

        {/* Center: transport controls */}
        <div className="transport-controls">
          <motion.button
            className="transport-btn"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={skipToStart}
            title="Skip to start"
          >
            &#9198;
          </motion.button>
          <motion.button
            className="transport-btn"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => stepFrame(-1)}
            title="Previous frame"
          >
            &#9664;
          </motion.button>
          <motion.button
            className="transport-btn transport-btn-play"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '&#10074;&#10074;' : '&#9654;'}
          </motion.button>
          <motion.button
            className="transport-btn"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => stepFrame(1)}
            title="Next frame"
          >
            &#9654;
          </motion.button>
          <motion.button
            className="transport-btn"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={skipToEnd}
            title="Skip to end"
          >
            &#9197;
          </motion.button>
          <motion.button
            className="transport-btn"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={stop}
            title="Stop"
          >
            &#9632;
          </motion.button>
        </div>

        {/* Right: options */}
        <div className="playback-options">
          <button
            className={`btn btn-ghost ${loop ? 'btn-active' : ''}`}
            onClick={() => dispatch({ type: 'SET_PLAYBACK', updates: { loop: !loop } })}
            style={{ fontSize: '11px' }}
            title="Loop"
          >
            &#8634; Loop
          </button>
          <select
            className="input-mini"
            value={fps}
            onChange={(e) =>
              dispatch({ type: 'SET_PLAYBACK', updates: { fps: parseInt(e.target.value) } })
            }
          >
            <option value="12">12 fps</option>
            <option value="24">24 fps</option>
            <option value="30">30 fps</option>
            <option value="60">60 fps</option>
          </select>
          <button
            className={`btn btn-ghost ${state.showGrid ? 'btn-active' : ''}`}
            onClick={() => dispatch({ type: 'TOGGLE_GRID' })}
            style={{ fontSize: '11px' }}
            title="Toggle grid"
          >
            &#9638; Grid
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 24);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}
