"use client";

import { useEffect, useState } from "react";
import {
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Trash2,
  Zap,
  Loader2,
} from "lucide-react";

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState("");
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [coreModel, setCoreModel] = useState("");
  const [visualModel, setVisualModel] = useState("");
  const [coreModels, setCoreModels] = useState<string[]>([]);
  const [visualModels, setVisualModels] = useState<string[]>([]);
  const [showGemini, setShowGemini] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setGeminiKey(data.geminiKey || "");
        setHasGeminiKey(data.hasGeminiKey || false);
        setCoreModel(data.coreModel || "");
        setVisualModel(data.visualModel || "");
        setCoreModels(data.defaultCoreModels || []);
        setVisualModels(data.defaultVisualModels || []);
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load settings" }))
      .finally(() => setLoading(false));
  }, []);

  function showMsg(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiKey, coreModel, visualModel }),
      });
      if (!res.ok) throw new Error("Failed to save");
      if (geminiKey && !geminiKey.startsWith("\u2022")) setHasGeminiKey(true);
      showMsg("success", "Settings saved successfully");
    } catch {
      showMsg("error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", apiKey: geminiKey }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg("success", `Connected successfully via ${data.model}`);
      } else {
        showMsg("error", data.error || "Connection test failed");
      }
    } catch {
      showMsg("error", "Connection test failed");
    } finally {
      setTesting(false);
    }
  }

  async function handleDeleteKey() {
    if (!confirm("Delete your Gemini API key? Generation will stop working."))
      return;
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteKey" }),
      });
      if (!res.ok) throw new Error();
      setGeminiKey("");
      setHasGeminiKey(false);
      showMsg("success", "API key deleted");
    } catch {
      showMsg("error", "Failed to delete key");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-accent-red" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-display font-bold mb-2">Settings</h1>
      <p className="text-text-secondary mb-8">
        Configure your API keys and model preferences
      </p>

      <div className="space-y-6">
        {/* Gemini API Key */}
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
              {showGemini ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleTestConnection}
              disabled={testing || (!geminiKey && !hasGeminiKey)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              {testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              {testing ? "Testing..." : "Test Connection"}
            </button>
            {hasGeminiKey && (
              <button
                onClick={handleDeleteKey}
                className="btn-secondary text-sm flex items-center gap-2 text-error hover:bg-error/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Key
              </button>
            )}
          </div>
        </div>

        {/* Model Configuration */}
        <div className="card">
          <h2 className="font-display font-semibold text-lg mb-1">
            Model Configuration
          </h2>
          <p className="text-text-secondary text-sm mb-4">
            Dual-engine architecture: Core handles text reasoning, Visual handles
            image-related generation. Fallback models activate automatically.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Core Engine
                <span className="text-text-muted font-normal ml-2">
                  Audio, Timeline, Production, Script Analysis
                </span>
              </label>
              <select
                value={coreModel}
                onChange={(e) => setCoreModel(e.target.value)}
                className="input-field"
              >
                {coreModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                    {m === coreModels[0] ? " (default)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Visual Engine
                <span className="text-text-muted font-normal ml-2">
                  3D Prompts, Media Research, GFX Briefs
                </span>
              </label>
              <select
                value={visualModel}
                onChange={(e) => setVisualModel(e.target.value)}
                className="input-field"
              >
                {visualModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                    {m === visualModels[0] ? " (default)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
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
