"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [inputMethod, setInputMethod] = useState<"paste" | "upload">("paste");
  const [fileName, setFileName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "text/plain",
      "text/markdown",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExts = [".txt", ".md", ".pdf", ".doc", ".docx"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      setError("Unsupported file type. Please upload .txt, .md, .pdf, .doc, or .docx");
      return;
    }

    setFileName(file.name);
    setInputMethod("upload");
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/projects/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setScript(data.text);
      if (!title) {
        setTitle(file.name.replace(/\.[^.]+$/, ""));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    }
  }

  async function handleCreate() {
    if (!title.trim()) {
      setError("Please enter a project title");
      return;
    }
    if (!script.trim()) {
      setError("Please enter or upload a script");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          inputScript: script.trim(),
          inputMethod,
          originalFilename: fileName || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");
      router.push(`/projects/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setCreating(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-display font-bold mb-2">New Project</h1>
      <p className="text-text-secondary mb-8">
        Paste your script or upload a document to get started
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Project Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., The Theranos Deception"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Script Input</label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setInputMethod("paste")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inputMethod === "paste"
                  ? "bg-accent-red/10 text-accent-red border border-accent-red/30"
                  : "bg-bg-card text-text-secondary border border-border hover:text-text-primary"
              }`}
            >
              <FileText className="w-4 h-4" />
              Paste Text
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inputMethod === "upload"
                  ? "bg-accent-red/10 text-accent-red border border-accent-red/30"
                  : "bg-bg-card text-text-secondary border border-border hover:text-text-primary"
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {fileName && (
            <p className="text-sm text-accent-blue mb-2">
              Uploaded: {fileName}
            </p>
          )}

          <textarea
            value={script}
            onChange={(e) => {
              setScript(e.target.value);
              if (inputMethod !== "paste") setInputMethod("paste");
            }}
            placeholder="Paste your full narration script here..."
            rows={20}
            className="input-field font-mono text-sm leading-relaxed resize-y"
          />
          <p className="text-text-muted text-xs mt-1">
            {script.split(/\s+/).filter(Boolean).length} words
            {script.length > 0 &&
              ` · ~${Math.ceil(script.split(/\s+/).filter(Boolean).length / 150)} min estimated`}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-error/10 text-error text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={creating}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
        >
          {creating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Project...
            </>
          ) : (
            "Create Project & Generate"
          )}
        </button>
      </div>
    </div>
  );
}
