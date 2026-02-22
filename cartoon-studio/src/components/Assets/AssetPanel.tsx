import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudio } from '../../store/StudioContext';
import type { Asset } from '../../types';
import { v4 as uuid } from 'uuid';

const PLACEHOLDER_ASSETS: Omit<Asset, 'id'>[] = [
  { name: 'Detective', type: 'character', imageUrl: '', width: 200, height: 300 },
  { name: 'Femme Fatale', type: 'character', imageUrl: '', width: 200, height: 300 },
  { name: 'Villain', type: 'character', imageUrl: '', width: 200, height: 300 },
  { name: 'Street Lamp', type: 'prop', imageUrl: '', width: 60, height: 200 },
  { name: 'Revolver', type: 'prop', imageUrl: '', width: 120, height: 80 },
  { name: 'Briefcase', type: 'prop', imageUrl: '', width: 100, height: 80 },
];

export default function AssetPanel() {
  const { state, dispatch } = useStudio();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddPlaceholder = (template: Omit<Asset, 'id'>) => {
    const asset: Asset = { ...template, id: uuid() };
    dispatch({ type: 'ADD_ASSET_TO_LIBRARY', asset });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const asset: Asset = {
            id: uuid(),
            name: file.name.replace(/\.[^.]+$/, ''),
            type: 'prop',
            imageUrl: ev.target?.result as string,
            width: Math.min(img.width, 400),
            height: Math.min(img.height, 400),
          };
          dispatch({ type: 'ADD_ASSET_TO_LIBRARY', asset });
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragStart = (e: React.DragEvent, assetId: string) => {
    e.dataTransfer.setData('application/asset-id', assetId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const groupedAssets = {
    character: state.assetLibrary.filter((a) => a.type === 'character'),
    prop: state.assetLibrary.filter((a) => a.type === 'prop'),
    background: state.assetLibrary.filter((a) => a.type === 'background'),
  };

  return (
    <div className="panel asset-panel">
      <div className="panel-header">
        <span className="panel-icon">&#9670;</span>
        ASSETS
      </div>

      <div className="panel-content" style={{ padding: '8px' }}>
        {/* Upload button */}
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: '8px' }}
          onClick={() => fileInputRef.current?.click()}
        >
          + Upload Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        {/* Quick-add templates */}
        <div className="panel-section">
          <div className="section-title">Quick Add</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {PLACEHOLDER_ASSETS.map((tmpl, i) => (
              <button
                key={i}
                className="btn btn-ghost"
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={() => handleAddPlaceholder(tmpl)}
              >
                {tmpl.name}
              </button>
            ))}
          </div>
        </div>

        {/* Library */}
        {(['character', 'prop', 'background'] as const).map((type) => (
          <div key={type} className="panel-section">
            <div className="section-title">
              {type === 'character' ? '&#9824; Characters' : type === 'prop' ? '&#9827; Props' : '&#9830; Backgrounds'}
            </div>
            <AnimatePresence>
              {groupedAssets[type].map((asset) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  draggable
                  onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, asset.id)}
                  className="asset-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    marginBottom: '4px',
                    background: '#1a1a2e',
                    borderRadius: '4px',
                    cursor: 'grab',
                    border: '1px solid #2a2a3a',
                    fontSize: '12px',
                    color: '#c0c0d0',
                  }}
                >
                  {asset.imageUrl ? (
                    <img
                      src={asset.imageUrl}
                      alt={asset.name}
                      style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 3 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        background: '#2a2a4a',
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        color: '#ffd700',
                      }}
                    >
                      {type === 'character' ? '&#9824;' : type === 'prop' ? '&#9827;' : '&#9830;'}
                    </div>
                  )}
                  <span style={{ flex: 1 }}>{asset.name}</span>
                  <span style={{ color: '#666', fontSize: '10px' }}>
                    {asset.width}x{asset.height}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            {groupedAssets[type].length === 0 && (
              <div style={{ color: '#555', fontSize: '11px', padding: '8px', textAlign: 'center' }}>
                No {type}s yet. Upload or generate with AI.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
