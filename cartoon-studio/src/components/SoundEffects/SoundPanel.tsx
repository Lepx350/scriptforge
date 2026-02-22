import { motion, AnimatePresence } from 'framer-motion';
import { useStudio } from '../../store/StudioContext';
import { v4 as uuid } from 'uuid';
import type { SfxType } from '../../types';

const SFX_LIBRARY: { type: SfxType; label: string; icon: string }[] = [
  { type: 'impact', label: 'WHAM!', icon: '💥' },
  { type: 'whoosh', label: 'WHOOSH', icon: '💨' },
  { type: 'pop', label: 'POP', icon: '🎈' },
  { type: 'zap', label: 'ZAP!', icon: '⚡' },
  { type: 'boom', label: 'BOOM', icon: '💣' },
  { type: 'splat', label: 'SPLAT', icon: '🎨' },
  { type: 'ding', label: 'DING', icon: '🔔' },
  { type: 'dramatic', label: 'DUN DUN', icon: '🎭' },
  { type: 'laugh', label: 'HA HA', icon: '😂' },
];

// Generate simple sound effects using Web Audio API
function playSfx(type: SfxType) {
  const audioCtx = new AudioContext();

  switch (type) {
    case 'impact': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
      break;
    }
    case 'whoosh': {
      const noise = audioCtx.createBufferSource();
      const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.4, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      noise.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2000, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.4);
      noise.connect(filter).connect(audioCtx.destination);
      noise.start();
      break;
    }
    case 'pop': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
      break;
    }
    case 'zap': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2000, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
      break;
    }
    case 'boom': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.7, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
      break;
    }
    case 'ding': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
      break;
    }
    case 'dramatic': {
      [200, 150].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.4);
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + i * 0.4);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.4 + 0.35);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.4);
        osc.stop(audioCtx.currentTime + i * 0.4 + 0.35);
      });
      break;
    }
    default: {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }
  }
}

export default function SoundPanel() {
  const { state, dispatch } = useStudio();
  const currentScene = state.scenes[state.currentSceneIndex];

  const handleAddSfx = (sfxType: SfxType, label: string) => {
    playSfx(sfxType);
    dispatch({
      type: 'ADD_SOUND_EFFECT',
      sfx: {
        id: uuid(),
        name: label,
        sfxType,
        startTime: state.playback.currentTime,
        duration: 0.5,
        volume: 0.8,
      },
    });
  };

  return (
    <div className="panel sound-panel">
      <div className="panel-header">
        <span className="panel-icon">&#9835;</span>
        SOUND EFFECTS
      </div>

      <div className="panel-content" style={{ padding: '8px' }}>
        {/* SFX Palette */}
        <div className="section-title">SFX Library</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '4px',
            marginBottom: '12px',
          }}
        >
          {SFX_LIBRARY.map((sfx) => (
            <motion.button
              key={sfx.type}
              className="btn btn-ghost"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAddSfx(sfx.type, sfx.label)}
              style={{
                fontSize: '11px',
                padding: '6px 4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <span style={{ fontSize: '16px' }}>{sfx.icon}</span>
              {sfx.label}
            </motion.button>
          ))}
        </div>

        {/* Scene SFX list */}
        <div className="section-title">Scene SFX ({currentScene.soundEffects.length})</div>
        <AnimatePresence>
          {currentScene.soundEffects.map((sfx) => (
            <motion.div
              key={sfx.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                marginBottom: '4px',
                background: '#1a1a2e',
                borderRadius: '4px',
                border: '1px solid #2a2a3a',
                fontSize: '11px',
                color: '#c0c0d0',
              }}
            >
              <span style={{ color: '#ffd700', fontWeight: 'bold', flex: 1 }}>{sfx.name}</span>
              <span style={{ color: '#666' }}>@{sfx.startTime.toFixed(1)}s</span>
              <button
                className="btn-micro"
                onClick={() => playSfx(sfx.sfxType)}
                title="Preview"
              >
                &#9654;
              </button>
              <button
                className="btn-micro btn-danger"
                onClick={() => dispatch({ type: 'REMOVE_SOUND_EFFECT', sfxId: sfx.id })}
              >
                &#10006;
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {currentScene.soundEffects.length === 0 && (
          <div style={{ color: '#555', fontSize: '11px', textAlign: 'center', padding: '8px' }}>
            Click a sound effect above to add it at the current playhead position.
          </div>
        )}
      </div>
    </div>
  );
}
