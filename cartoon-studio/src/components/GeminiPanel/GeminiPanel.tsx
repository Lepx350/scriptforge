import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStudio } from '../../store/StudioContext';
import { generateImage, type GenerationMode } from '../../api/gemini';
import { v4 as uuid } from 'uuid';
import type { Asset } from '../../types';

export default function GeminiPanel() {
  const { state, dispatch } = useStudio();
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<GenerationMode>('character');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const imageUrl = await generateImage(state.geminiApiKey, prompt, mode);
      setPreview(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToLibrary = () => {
    if (!preview) return;

    if (mode === 'background') {
      dispatch({ type: 'SET_SCENE_BACKGROUND', url: preview });
    } else {
      const asset: Asset = {
        id: uuid(),
        name: prompt.slice(0, 30),
        type: mode,
        imageUrl: preview,
        width: mode === 'character' ? 250 : 150,
        height: mode === 'character' ? 350 : 150,
      };
      dispatch({ type: 'ADD_ASSET_TO_LIBRARY', asset });
    }

    setPreview(null);
    setPrompt('');
  };

  return (
    <div className="panel gemini-panel">
      <div className="panel-header">
        <span className="panel-icon" style={{ color: '#8b5cf6' }}>&#10022;</span>
        AI STUDIO
        <span style={{ marginLeft: '8px', fontSize: '10px', color: '#666' }}>
          Gemini
        </span>
      </div>

      <div className="panel-content" style={{ padding: '8px' }}>
        {/* API Key */}
        <label className="field-label">API Key</label>
        <input
          type="password"
          className="input-noir"
          placeholder="Gemini API key..."
          value={state.geminiApiKey}
          onChange={(e) => dispatch({ type: 'SET_GEMINI_API_KEY', key: e.target.value })}
          style={{ width: '100%', marginBottom: '8px' }}
        />

        {/* Mode selector */}
        <label className="field-label">Generation Mode</label>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          {(['character', 'background', 'prop'] as GenerationMode[]).map((m) => (
            <button
              key={m}
              className={`btn btn-ghost ${mode === m ? 'btn-active' : ''}`}
              onClick={() => setMode(m)}
              style={{ flex: 1, fontSize: '11px', textTransform: 'capitalize' }}
            >
              {m === 'character' ? '♠' : m === 'background' ? '♦' : '♣'} {m}
            </button>
          ))}
        </div>

        {/* Prompt */}
        <label className="field-label">Description</label>
        <textarea
          className="input-noir"
          placeholder={
            mode === 'character'
              ? 'A grizzled private detective in a trench coat...'
              : mode === 'background'
              ? 'A rain-soaked alley with neon signs...'
              : 'A smoking revolver on a desk...'
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          style={{ width: '100%', resize: 'vertical' }}
        />

        {/* Generate button */}
        <motion.button
          className="btn btn-primary"
          style={{
            width: '100%',
            marginTop: '8px',
            background: loading
              ? 'linear-gradient(135deg, #4a3a6a, #3a2a5a)'
              : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
          }}
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          onClick={handleGenerate}
          disabled={loading || !prompt.trim() || !state.geminiApiKey}
        >
          {loading ? (
            <span className="loading-dots">Generating</span>
          ) : (
            '✦ Generate with AI'
          )}
        </motion.button>

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              background: '#2a1a1a',
              border: '1px solid #ff4444',
              borderRadius: '4px',
              color: '#ff6b6b',
              fontSize: '11px',
            }}
          >
            {error}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: '8px' }}
          >
            <div
              style={{
                borderRadius: '6px',
                overflow: 'hidden',
                border: '2px solid #2a2a3a',
              }}
            >
              <img
                src={preview}
                alt="Generated"
                style={{ width: '100%', display: 'block' }}
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={handleAddToLibrary}
            >
              {mode === 'background' ? '+ Set as Background' : '+ Add to Library'}
            </button>
          </motion.div>
        )}

        {/* Tips */}
        {!state.geminiApiKey && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px',
              background: '#1a1a2e',
              border: '1px solid #2a2a3a',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#666',
            }}
          >
            Enter your Gemini API key above to enable AI generation. Get one at{' '}
            <span style={{ color: '#8b5cf6' }}>aistudio.google.com</span>
          </div>
        )}
      </div>
    </div>
  );
}
