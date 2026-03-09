"use client";

import { useEffect, useState } from "react";
import { Save, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState("");
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [defaultVoice, setDefaultVoice] = useState("");
  const [showGemini, setShowGemini] = useState(false);
  const [showElevenLabs, setShowElevenLabs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setGeminiKey(data.geminiKey || "");
        setElevenLabsKey(data.elevenLabsKey || "");
        setDefaultVoice(data.defaultVoice || "");
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiKey, elevenLabsKey, defaultVoice }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: "success", text: "Settings saved successfully" });
    } catch {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-display font-bold mb-2">Settings</h1>
      <p className="text-text-secondary mb-8">
        Configure your API keys and preferences
      </p>

      <div className="space-y-6">
        <div className="card">
          <h2 className="font-display font-semibold text-lg mb-1">
            Google Gemini API
          </h2>
          <p className="text-text-secondary text-sm mb-4">
            Required for all AI generation features. Get your key from{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-blue hover:underline"
            >
              Google AI Studio
            </a>
          </p>
          <div className="relative">
            <input
              type={showGemini ? "text" : "password"}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="input-field pr-10"
            />
            <button
              type="button"
              onClick={() => setShowGemini(!showGemini)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="font-display font-semibold text-lg mb-1">
            ElevenLabs API (Optional)
          </h2>
          <p className="text-text-secondary text-sm mb-4">
            For AI voiceover generation. Phase 2 feature.
          </p>
          <div className="relative">
            <input
              type={showElevenLabs ? "text" : "password"}
              value={elevenLabsKey}
              onChange={(e) => setElevenLabsKey(e.target.value)}
              placeholder="Enter your ElevenLabs API key"
              className="input-field pr-10"
            />
            <button
              type="button"
              onClick={() => setShowElevenLabs(!showElevenLabs)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              {showElevenLabs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="font-display font-semibold text-lg mb-1">
            Default Voice
          </h2>
          <p className="text-text-secondary text-sm mb-4">
            Preferred voice for TTS generation
          </p>
          <input
            type="text"
            value={defaultVoice}
            onChange={(e) => setDefaultVoice(e.target.value)}
            placeholder="e.g., Rachel, Adam"
            className="input-field"
          />
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-success/10 text-success"
                : "bg-error/10 text-error"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {message.text}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 w-full justify-center"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
