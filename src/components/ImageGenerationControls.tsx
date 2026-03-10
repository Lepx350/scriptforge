"use client";

import { useState } from "react";
import {
  Loader2,
  ImagePlus,
  Download,
  RefreshCw,
  Check,
  X,
} from "lucide-react";

// ─── Types & Constants ───

export interface ImageGenSettings {
  model: string;
  quality: string;
  variations: number;
  aspectRatio: string;
}

export const MODEL_OPTIONS = [
  { value: "gemini-3-pro-image-preview", label: "Pro (Best quality)" },
  { value: "gemini-3.1-flash-image-preview", label: "Standard (Fast & good)" },
  { value: "gemini-2.5-flash-image-preview", label: "Flash (Fastest & cheapest)" },
] as const;

export const QUALITY_OPTIONS = [
  { value: "1024", label: "1K" },
  { value: "2048", label: "2K" },
  { value: "4096", label: "4K" },
] as const;

export const VARIATION_OPTIONS = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 4, label: "4" },
] as const;

export const ASPECT_RATIO_OPTIONS = [
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
  { value: "4:3", label: "4:3" },
  { value: "21:9", label: "21:9" },
] as const;

export const DEFAULT_SETTINGS: ImageGenSettings = {
  model: "gemini-3-pro-image-preview",
  quality: "1024",
  variations: 1,
  aspectRatio: "16:9",
};

export interface GeneratedImage {
  imageUrl: string;
  index: number;
}

// ─── Controls Row (2x2 on mobile, inline on desktop) ───

export function ImageGenControlsRow({
  settings,
  onChange,
  disabled,
}: {
  settings: ImageGenSettings;
  onChange: (s: ImageGenSettings) => void;
  disabled?: boolean;
}) {
  const selectClass = "bg-bg-secondary border border-border rounded px-1.5 py-1 text-xs text-text-primary focus:outline-none focus:border-purple-500/50 min-w-0 min-h-[32px]";

  return (
    <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 w-full md:w-auto">
      <label className="flex items-center gap-1 text-xs text-text-muted">
        Model:
        <select value={settings.model} onChange={(e) => onChange({ ...settings, model: e.target.value })} disabled={disabled} className={selectClass}>
          {MODEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-1 text-xs text-text-muted">
        Quality:
        <select value={settings.quality} onChange={(e) => onChange({ ...settings, quality: e.target.value })} disabled={disabled} className={selectClass}>
          {QUALITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-1 text-xs text-text-muted">
        Variations:
        <select value={settings.variations} onChange={(e) => onChange({ ...settings, variations: Number(e.target.value) })} disabled={disabled} className={selectClass}>
          {VARIATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-1 text-xs text-text-muted">
        AR:
        <select value={settings.aspectRatio} onChange={(e) => onChange({ ...settings, aspectRatio: e.target.value })} disabled={disabled} className={selectClass}>
          {ASPECT_RATIO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    </div>
  );
}

// ─── Full Image Generation Panel ───

export function ImageGenerationPanel({
  prompt,
  existingImageUrl,
  onGenerate,
  onSaveSelected,
  entityId,
  entityType,
  defaultAspectRatio,
}: {
  prompt: string;
  existingImageUrl?: string | null;
  onGenerate: (settings: ImageGenSettings) => Promise<GeneratedImage[]>;
  onSaveSelected: (imageUrl: string) => Promise<void>;
  entityId: string;
  entityType: "visual" | "thumbnail";
  defaultAspectRatio?: string;
}) {
  const [settings, setSettings] = useState<ImageGenSettings>({
    ...DEFAULT_SETTINGS,
    ...(defaultAspectRatio ? { aspectRatio: defaultAspectRatio } : {}),
  });
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    setImages([]);
    try {
      const results = await onGenerate(settings);
      setImages(results);
      setSelectedIdx(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveSelected = async () => {
    if (images.length === 0) return;
    setSaving(true);
    try {
      await onSaveSelected(images[selectedIdx].imageUrl);
      setImages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save image");
    } finally {
      setSaving(false);
    }
  };

  const downloadImage = (src: string, name: string) => {
    const a = document.createElement("a");
    a.href = src;
    a.download = `${name}.png`;
    a.click();
  };

  const downloadAll = () => {
    images.forEach((img, i) => {
      downloadImage(img.imageUrl, `${entityType}-${entityId}-${i + 1}`);
    });
  };

  return (
    <div className="space-y-3">
      {/* Lightbox */}
      {lightboxSrc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 md:p-8 cursor-pointer"
          onClick={() => setLightboxSrc(null)}
          onKeyDown={(e) => { if (e.key === "Escape") setLightboxSrc(null); }}
        >
          <button onClick={() => setLightboxSrc(null)} className="absolute top-4 right-4 text-white/70 hover:text-white p-2">
            <X className="w-6 h-6" />
          </button>
          <img src={lightboxSrc} alt="Full size preview" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Existing image */}
      {existingImageUrl && images.length === 0 && (
        <img
          src={existingImageUrl}
          alt={`${entityType} preview`}
          className="w-full max-h-96 object-contain rounded-lg bg-black/40 cursor-pointer"
          onClick={() => setLightboxSrc(existingImageUrl)}
        />
      )}

      {/* Controls + generate button */}
      <div className="space-y-2 md:space-y-0 md:flex md:flex-wrap md:items-center md:gap-2">
        <ImageGenControlsRow settings={settings} onChange={setSettings} disabled={generating} />
        <button
          onClick={handleGenerate}
          disabled={generating || !prompt}
          className="btn-primary text-xs flex items-center justify-center gap-1.5 w-full md:w-auto md:ml-auto min-h-[44px] md:min-h-[36px]"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
          {generating ? "Generating..." : existingImageUrl ? "Regenerate" : "Generate Image"}
        </button>
      </div>

      {/* Generation loading */}
      {generating && (
        <div className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin shrink-0" />
          <span className="text-sm text-purple-300">
            Generating {settings.variations > 1 ? `${settings.variations} variations` : "image"}... 10-30 seconds
          </span>
        </div>
      )}

      {/* Error */}
      {error && !generating && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <span className="text-sm text-red-300">{error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-300 ml-auto p-1">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Generated variations */}
      {images.length > 0 && (
        <div className="space-y-3">
          {images.length > 1 ? (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-1 px-1 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible">
              {images.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-colors snap-center shrink-0 w-[70vw] md:w-auto ${
                    selectedIdx === i ? "border-purple-500 shadow-lg shadow-purple-500/20" : "border-border"
                  }`}
                >
                  <img
                    src={img.imageUrl}
                    alt={`Variation ${i + 1}`}
                    className="w-full aspect-video object-cover"
                    onClick={(e) => { if (e.detail === 2) { e.stopPropagation(); setLightboxSrc(img.imageUrl); } }}
                  />
                  <div className={`absolute bottom-0 inset-x-0 py-1.5 px-2 text-xs font-medium text-center ${
                    selectedIdx === i ? "bg-purple-500 text-white" : "bg-black/60 text-white/70"
                  }`}>
                    {selectedIdx === i ? (
                      <span className="flex items-center justify-center gap-1"><Check className="w-3 h-3" /> Selected</span>
                    ) : "Select"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <img
              src={images[0].imageUrl}
              alt="Generated image"
              className="w-full rounded-lg cursor-pointer"
              onClick={() => setLightboxSrc(images[0].imageUrl)}
            />
          )}

          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
            <button onClick={handleSaveSelected} disabled={saving} className="btn-primary text-xs flex items-center justify-center gap-1.5 min-h-[44px] md:min-h-0">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {saving ? "Saving..." : "Save Selected"}
            </button>
            <button onClick={() => downloadImage(images[selectedIdx].imageUrl, `${entityType}-${entityId}-selected`)} className="btn-secondary text-xs flex items-center justify-center gap-1.5 min-h-[44px] md:min-h-0">
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            {images.length > 1 && (
              <button onClick={downloadAll} className="btn-secondary text-xs flex items-center justify-center gap-1.5 min-h-[44px] md:min-h-0">
                <Download className="w-3.5 h-3.5" /> Download All
              </button>
            )}
            <button onClick={handleGenerate} disabled={generating} className="btn-secondary text-xs flex items-center justify-center gap-1.5 min-h-[44px] md:min-h-0">
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
