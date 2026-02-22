import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StudioProvider } from './store/StudioContext';
import StageCanvas from './components/Canvas/StageCanvas';
import AssetPanel from './components/Assets/AssetPanel';
import Timeline from './components/Timeline/Timeline';
import Storyboard from './components/Storyboard/Storyboard';
import BubbleEditor from './components/SpeechBubble/BubbleEditor';
import SoundPanel from './components/SoundEffects/SoundPanel';
import PlaybackControls from './components/Playback/PlaybackControls';
import GeminiPanel from './components/GeminiPanel/GeminiPanel';
import Toolbar from './components/UI/Toolbar';

type RightTab = 'bubbles' | 'sounds' | 'ai';

function StudioApp() {
  const [rightTab, setRightTab] = useState<RightTab>('ai');

  return (
    <div className="studio-root">
      {/* Header */}
      <header className="studio-header">
        <div className="logo">
          <span className="logo-icon">&#9670;</span>
          <span className="logo-text">NOIR STUDIO</span>
          <span className="logo-sub">Cartoon Movie Maker</span>
        </div>
      </header>

      {/* Toolbar */}
      <Toolbar />

      {/* Main layout */}
      <div className="studio-body">
        {/* Left panel: Assets */}
        <motion.div
          className="sidebar sidebar-left"
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          <AssetPanel />
        </motion.div>

        {/* Center: Canvas + Timeline */}
        <div className="center-column">
          <div className="canvas-wrapper">
            <StageCanvas />
            <PlaybackControls />
          </div>
          <Timeline />
          <Storyboard />
        </div>

        {/* Right panel: Tabbed */}
        <motion.div
          className="sidebar sidebar-right"
          initial={{ x: 300 }}
          animate={{ x: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          {/* Tab bar */}
          <div className="tab-bar">
            {([
              { key: 'ai', label: '\u2726 AI' },
              { key: 'bubbles', label: '\uD83D\uDCAC Bubbles' },
              { key: 'sounds', label: '\u266A SFX' },
            ] as { key: RightTab; label: string }[]).map((tab) => (
              <button
                key={tab.key}
                className={`tab-btn ${rightTab === tab.key ? 'active' : ''}`}
                onClick={() => setRightTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={rightTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {rightTab === 'ai' && <GeminiPanel />}
              {rightTab === 'bubbles' && <BubbleEditor />}
              {rightTab === 'sounds' && <SoundPanel />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StudioProvider>
      <StudioApp />
    </StudioProvider>
  );
}
