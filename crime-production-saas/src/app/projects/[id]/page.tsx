"use client";

import { useEffect, useState, useCallback, use, Component, type ReactNode } from "react";
import {
  Eye,
  Music,
  Clock,
  Package,
  FileText,
  Download,
  Loader2,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Clapperboard,
  Volume2,
  Layers,
  Monitor,
  Image,
  BarChart3,
  Check,
  Pencil,
  X,
  Save,
  ExternalLink,
  FileDown,
  Archive,
  Copy,
  ImagePlus,
  Maximize2,
} from "lucide-react";

// ─── Interfaces ───

interface VisualDirection {
  id: string;
  sectionIndex: number;
  scriptText: string;
  layerType: string;
  directionText: string;
  aiPrompt?: string;
  imageUrl?: string;
  imageBase64?: string;
  mediaLinks?: string;
  gfxSpecs?: string;
}

interface AudioDirection {
  id: string;
  sectionIndex: number;
  scriptText: string;
  musicMood: string;
  musicBpmRange: string;
  musicSearchTerms: string;
  sfxCues?: string;
}

interface TimelineSegment {
  id: string;
  segmentIndex: number;
  startTime: string;
  durationSeconds: number;
  narrationText: string;
  visualLayers?: string;
  audioNotes?: string;
}

interface ProductionPackage {
  id: string;
  titles?: string;
  thumbnailConcepts?: string;
  description?: string;
  tags?: string;
}

interface Project {
  id: string;
  title: string;
  status: string;
  inputScript: string;
  estimatedDurationMinutes: number | null;
  youtubeUrl?: string | null;
  createdAt: string;
  visualDirections: VisualDirection[];
  audioDirections: AudioDirection[];
  timelineSegments: TimelineSegment[];
  productionPackage: ProductionPackage | null;
}

type Tab = "script" | "visual" | "audio" | "timeline" | "production" | "export";

// ─── Constants ───

const tabs: { id: Tab; label: string; icon: typeof Eye }[] = [
  { id: "script", label: "Script", icon: FileText },
  { id: "visual", label: "Visual", icon: Eye },
  { id: "audio", label: "Audio", icon: Music },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "production", label: "Package", icon: Package },
  { id: "export", label: "Export", icon: Download },
];

const statusLabel: Record<string, string> = {
  draft: "Draft",
  in_production: "In Production",
  editing: "Editing",
  published: "Published",
};

const statusBadge: Record<string, string> = {
  draft: "badge-draft",
  in_production: "badge-in-production",
  editing: "badge-editing",
  published: "badge-published",
};

const layerIcons: Record<string, typeof Clapperboard> = {
  "3d": Clapperboard,
  media: Monitor,
  gfx: BarChart3,
};

const layerColors: Record<string, string> = {
  "3d": "text-purple-400 bg-purple-400/10 border-purple-400/30",
  media: "text-accent-blue bg-accent-blue/10 border-accent-blue/30",
  gfx: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
};

const moodColors: Record<string, string> = {
  tense: "bg-red-500/20 text-red-400",
  suspenseful: "bg-orange-500/20 text-orange-400",
  dramatic: "bg-red-500/20 text-red-400",
  emotional: "bg-blue-500/20 text-blue-400",
  hopeful: "bg-green-500/20 text-green-400",
  dark: "bg-gray-500/20 text-gray-400",
  building: "bg-yellow-500/20 text-yellow-400",
  neutral: "bg-gray-500/20 text-gray-400",
};

// ─── Error Boundary ───

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode; onReset?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="card text-center py-12 max-w-lg mx-auto">
            <AlertCircle className="w-10 h-10 text-error mx-auto mb-3" />
            <h3 className="text-lg font-display font-semibold mb-2">
              Something went wrong
            </h3>
            <p className="text-text-secondary text-sm mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                this.props.onReset?.();
              }}
              className="btn-primary inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

// ─── Inline Edit Hook ───

function useInlineEdit(
  model: "visual" | "audio" | "timeline" | "production",
  onSaved: () => void
) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const startEdit = (id: string, fields: Record<string, string>) => {
    setEditingId(id);
    setEditData(fields);
  };

  const cancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const save = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, id: editingId, data: editData }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaved();
      cancel();
    } catch {
      // Let it stay in edit mode
    } finally {
      setSaving(false);
    }
  };

  return { editingId, editData, setEditData, saving, startEdit, cancel, save };
}

// ─── Streaming Hook ───

function useStreamGeneration(projectId: string, onComplete: () => void) {
  const [streamingModule, setStreamingModule] = useState<string | null>(null);
  const [streamText, setStreamText] = useState("");
  const [streamError, setStreamError] = useState("");

  const startStream = useCallback(
    async (module: string) => {
      setStreamingModule(module);
      setStreamText("");
      setStreamError("");

      try {
        const res = await fetch("/api/generate", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, module }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Stream failed");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk) {
                setStreamText((prev) => prev + data.chunk);
              }
              if (data.done) {
                if (!data.success) {
                  setStreamError(data.error || "Generation failed");
                }
                setStreamingModule(null);
                onComplete();
                return;
              }
            } catch {}
          }
        }

        setStreamingModule(null);
        onComplete();
      } catch (err) {
        setStreamError(
          err instanceof Error ? err.message : "Stream failed"
        );
        setStreamingModule(null);
      }
    },
    [projectId, onComplete]
  );

  return { streamingModule, streamText, streamError, startStream, setStreamError };
}

// ─── Section Regeneration Hook ───

function useSectionRegen(projectId: string, onComplete: () => void) {
  const [regenId, setRegenId] = useState<string | null>(null);

  const regenerate = async (
    module: "visual" | "audio" | "timeline",
    sectionId: string
  ) => {
    setRegenId(sectionId);
    try {
      const res = await fetch("/api/generate/section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, module, sectionId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Regeneration failed");
      }
      onComplete();
    } catch {
      // Error handled in UI
    } finally {
      setRegenId(null);
    }
  };

  return { regenId, regenerate };
}

// ─── Main Page ───

export default function ProjectWorkspace({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("script");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error("Project not found");
      const data = await res.json();
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const { streamingModule, streamText, streamError, startStream, setStreamError } =
    useStreamGeneration(id, fetchProject);

  async function runGeneration(module: string) {
    if (module === "all") {
      // Non-streaming batch generation
      setGenerating(module);
      setError("");
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: id, module }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");
        if (data.errors) {
          const errMsgs = Object.entries(data.errors)
            .map(([k, v]) => `${k}: ${v}`)
            .join("; ");
          setError(errMsgs);
        }
        await fetchProject();
        setActiveTab("visual");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed");
      } finally {
        setGenerating(null);
      }
    } else {
      // Streaming single module
      startStream(module);
      setActiveTab(module as Tab);
    }
  }

  async function updateStatus(status: string, youtubeUrl?: string) {
    try {
      const body: Record<string, string> = { status };
      if (youtubeUrl) body.youtubeUrl = youtubeUrl;
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await fetchProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleExport(format: string) {
    try {
      const res = await fetch(
        `/api/export?projectId=${id}&format=${format}`
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext =
        format === "markdown" ? "md" : format === "pdf" ? "pdf" : format === "zip" ? "zip" : format;
      a.download = `${project?.title || "project"}-package.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-accent-red" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
        <h2 className="text-xl font-display font-semibold">
          {error || "Project not found"}
        </h2>
      </div>
    );
  }

  const isGenerating = generating !== null || streamingModule !== null;
  const hasVisual = project.visualDirections.length > 0;
  const hasAudio = project.audioDirections.length > 0;
  const hasTimeline = project.timelineSegments.length > 0;
  const hasProduction = project.productionPackage !== null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-secondary border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">{project.title}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className={statusBadge[project.status] || "badge-draft"}>
                {statusLabel[project.status] || project.status}
              </span>
              {project.estimatedDurationMinutes && (
                <span className="text-text-secondary text-sm">
                  ~{project.estimatedDurationMinutes} min
                </span>
              )}
              <span className="text-text-muted text-sm">
                {project.inputScript.split(/\s+/).filter(Boolean).length} words
              </span>
              {project.youtubeUrl && (
                <a
                  href={project.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-blue text-sm flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  YouTube
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusActions
              status={project.status}
              onStatusChange={updateStatus}
              hasAllModules={hasVisual && hasAudio && hasTimeline && hasProduction}
            />
            <button
              onClick={() => runGeneration("all")}
              disabled={isGenerating}
              className="btn-primary flex items-center gap-2"
            >
              {generating === "all" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {generating === "all" ? "Generating..." : "Generate All"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 -mb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-bg-primary text-text-primary border-t border-x border-border"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error / Stream Error Banner */}
      {(error || streamError) && (
        <div className="mx-6 mt-4 flex items-center gap-2 p-3 rounded-lg bg-error/10 text-error text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error || streamError}</span>
          <button
            onClick={() => {
              setError("");
              setStreamError("");
            }}
            className="text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Streaming Preview */}
      {streamingModule && (
        <div className="mx-6 mt-4 card">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 className="w-4 h-4 animate-spin text-accent-red" />
            <span className="text-sm font-medium">
              Streaming {streamingModule} generation...
            </span>
          </div>
          <pre className="text-xs font-mono text-text-secondary max-h-60 overflow-y-auto whitespace-pre-wrap">
            {streamText || "Waiting for response..."}
          </pre>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <ErrorBoundary onReset={fetchProject}>
          {activeTab === "script" && (
            <ScriptTab script={project.inputScript} />
          )}
        </ErrorBoundary>
        <ErrorBoundary onReset={() => runGeneration("visual")}>
          {activeTab === "visual" && (
            <VisualTab
              directions={project.visualDirections}
              generating={
                generating === "visual" ||
                generating === "all" ||
                streamingModule === "visual"
              }
              onGenerate={() => runGeneration("visual")}
              projectId={id}
              onRefresh={fetchProject}
            />
          )}
        </ErrorBoundary>
        <ErrorBoundary onReset={() => runGeneration("audio")}>
          {activeTab === "audio" && (
            <AudioTab
              directions={project.audioDirections}
              generating={
                generating === "audio" ||
                generating === "all" ||
                streamingModule === "audio"
              }
              onGenerate={() => runGeneration("audio")}
              projectId={id}
              onRefresh={fetchProject}
            />
          )}
        </ErrorBoundary>
        <ErrorBoundary onReset={() => runGeneration("timeline")}>
          {activeTab === "timeline" && (
            <TimelineTab
              segments={project.timelineSegments}
              generating={
                generating === "timeline" ||
                generating === "all" ||
                streamingModule === "timeline"
              }
              onGenerate={() => runGeneration("timeline")}
              projectId={id}
              onRefresh={fetchProject}
            />
          )}
        </ErrorBoundary>
        <ErrorBoundary onReset={() => runGeneration("production")}>
          {activeTab === "production" && (
            <ProductionTab
              pkg={project.productionPackage}
              generating={
                generating === "production" ||
                generating === "all" ||
                streamingModule === "production"
              }
              onGenerate={() => runGeneration("production")}
              onRefresh={fetchProject}
            />
          )}
        </ErrorBoundary>
        {activeTab === "export" && (
          <ExportTab
            onExport={handleExport}
            hasData={hasVisual || hasAudio || hasTimeline || hasProduction}
          />
        )}
      </div>
    </div>
  );
}

// ─── Status Actions ───

function StatusActions({
  status,
  onStatusChange,
  hasAllModules,
}: {
  status: string;
  onStatusChange: (status: string, youtubeUrl?: string) => void;
  hasAllModules: boolean;
}) {
  const [showPublish, setShowPublish] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");

  if (status === "editing" || (status === "in_production" && hasAllModules)) {
    return (
      <>
        {showPublish ? (
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="YouTube URL (optional)"
              className="input-field text-sm w-64"
            />
            <button
              onClick={() => {
                onStatusChange("published", youtubeUrl || undefined);
                setShowPublish(false);
              }}
              className="btn-primary text-sm flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Publish
            </button>
            <button
              onClick={() => setShowPublish(false)}
              className="btn-secondary text-sm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowPublish(true)}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            Mark as Published
          </button>
        )}
      </>
    );
  }

  if (status === "published") {
    return (
      <button
        onClick={() => onStatusChange("editing")}
        className="btn-secondary text-sm"
      >
        Back to Editing
      </button>
    );
  }

  return null;
}

// ─── Script Tab ───

function ScriptTab({ script }: { script: string }) {
  return (
    <div className="max-w-4xl">
      <h2 className="text-lg font-display font-semibold mb-4">
        Original Script
      </h2>
      <div className="card">
        <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-text-primary">
          {script}
        </pre>
      </div>
    </div>
  );
}

// ─── Empty State ───

function EmptyState({
  title,
  description,
  generating,
  onGenerate,
  icon: Icon,
}: {
  title: string;
  description: string;
  generating: boolean;
  onGenerate: () => void;
  icon: typeof Eye;
}) {
  return (
    <div className="card text-center py-16 max-w-lg mx-auto">
      <Icon className="w-12 h-12 text-text-muted mx-auto mb-4" />
      <h3 className="text-lg font-display font-semibold mb-2">{title}</h3>
      <p className="text-text-secondary mb-6">{description}</p>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="btn-primary inline-flex items-center gap-2"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Generate Now
          </>
        )}
      </button>
    </div>
  );
}

// ─── Inline Edit Text Area ───

function EditableField({
  value,
  field,
  editData,
  setEditData,
  isEditing,
  className,
}: {
  value: string;
  field: string;
  editData: Record<string, string>;
  setEditData: (d: Record<string, string>) => void;
  isEditing: boolean;
  className?: string;
}) {
  if (!isEditing) return <span className={className}>{value}</span>;

  return (
    <textarea
      value={editData[field] ?? value}
      onChange={(e) => setEditData({ ...editData, [field]: e.target.value })}
      className={`input-field text-sm resize-y min-h-[60px] ${className || ""}`}
      rows={3}
    />
  );
}

// ─── Visual Tab ───

function VisualTab({
  directions,
  generating,
  onGenerate,
  projectId,
  onRefresh,
}: {
  directions: VisualDirection[];
  generating: boolean;
  onGenerate: () => void;
  projectId: string;
  onRefresh: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [imageError, setImageError] = useState<Record<string, string>>({});
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const edit = useInlineEdit("visual", onRefresh);
  const regen = useSectionRegen(projectId, onRefresh);

  const getImageSrc = (dir: VisualDirection): string | null => {
    if (dir.imageUrl) return dir.imageUrl;
    if (dir.imageBase64) return `data:image/png;base64,${dir.imageBase64}`;
    return null;
  };

  const generateImage = async (dir: VisualDirection, promptOverride?: string) => {
    const prompt = promptOverride || dir.aiPrompt;
    if (!prompt) return;

    setGeneratingImageId(dir.id);
    setImageError((prev) => ({ ...prev, [dir.id]: "" }));

    try {
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualDirectionId: dir.id,
          prompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setImageError((prev) => ({ ...prev, [dir.id]: data.error || "Image generation failed" }));
        return;
      }

      setEditingPromptId(null);
      onRefresh();
    } catch {
      setImageError((prev) => ({
        ...prev,
        [dir.id]: "Network error — please try again",
      }));
    } finally {
      setGeneratingImageId(null);
    }
  };

  const copyPrompt = async (prompt: string, id: string) => {
    await navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadImage = (src: string, name: string) => {
    const a = document.createElement("a");
    a.href = src;
    a.download = `${name}.png`;
    a.click();
  };

  if (directions.length === 0) {
    return (
      <EmptyState
        title="No visual direction yet"
        description="Run the Visual Direction Engine to tag your script with 3D, Media, and GFX layers"
        generating={generating}
        onGenerate={onGenerate}
        icon={Eye}
      />
    );
  }

  const grouped = {
    "3d": directions.filter((d) => d.layerType === "3d"),
    media: directions.filter((d) => d.layerType === "media"),
    gfx: directions.filter((d) => d.layerType === "gfx"),
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 cursor-pointer"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxSrc}
            alt="Full size preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-display font-semibold">
          Visual Direction
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-purple-400">
              <Clapperboard className="w-4 h-4" /> {grouped["3d"].length} 3D
            </span>
            <span className="flex items-center gap-1.5 text-accent-blue">
              <Monitor className="w-4 h-4" /> {grouped.media.length} Media
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <BarChart3 className="w-4 h-4" /> {grouped.gfx.length} GFX
            </span>
          </div>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Regenerate All
          </button>
        </div>
      </div>

      {directions.map((dir) => {
        const LayerIcon = layerIcons[dir.layerType] || Layers;
        const colors =
          layerColors[dir.layerType] ||
          "text-text-secondary bg-bg-card border-border";
        const isExpanded = expandedId === dir.id;
        const isEditing = edit.editingId === dir.id;
        const isRegenerating = regen.regenId === dir.id;
        const is3D = dir.layerType === "3d";
        const imageSrc = getImageSrc(dir);
        const isGeneratingImage = generatingImageId === dir.id;
        const isEditingPrompt = editingPromptId === dir.id;
        const dirImageError = imageError[dir.id];

        return (
          <div
            key={dir.id}
            className={`card border ${colors.split(" ").pop()}`}
          >
            <button
              onClick={() =>
                setExpandedId(isExpanded ? null : dir.id)
              }
              className="w-full text-left"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${colors}`}>
                  <LayerIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${colors}`}>
                      [{dir.layerType.toUpperCase()}]
                    </span>
                    <span className="text-text-muted text-xs">
                      Section {dir.sectionIndex + 1}
                    </span>
                    {is3D && imageSrc && (
                      <span className="badge bg-green-500/20 text-green-400 text-xs">
                        Image Ready
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-2">
                    {dir.scriptText}
                  </p>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-text-muted transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                {/* Action buttons for non-3D cards (unchanged) */}
                <div className="flex gap-2 justify-end">
                  {isEditing ? (
                    <>
                      <button
                        onClick={edit.save}
                        disabled={edit.saving}
                        className="btn-primary text-xs flex items-center gap-1"
                      >
                        {edit.saving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        Save
                      </button>
                      <button
                        onClick={edit.cancel}
                        className="btn-secondary text-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() =>
                          edit.startEdit(dir.id, {
                            directionText: dir.directionText,
                            aiPrompt: dir.aiPrompt || "",
                            mediaLinks: dir.mediaLinks || "",
                            gfxSpecs: dir.gfxSpecs || "",
                          })
                        }
                        className="btn-secondary text-xs flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          regen.regenerate("visual", dir.id)
                        }
                        disabled={isRegenerating}
                        className="btn-secondary text-xs flex items-center gap-1"
                      >
                        {isRegenerating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Regen
                      </button>
                    </>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                    Direction
                  </h4>
                  <EditableField
                    value={dir.directionText}
                    field="directionText"
                    editData={edit.editData}
                    setEditData={(d) => edit.setEditData(d)}
                    isEditing={isEditing}
                    className="text-sm"
                  />
                </div>

                {/* ─── 3D Scene Image Section ─── */}
                {is3D && (
                  <div className="space-y-3">
                    {/* Generated image preview */}
                    {imageSrc && (
                      <div>
                        <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                          Generated Image
                        </h4>
                        <div className="relative group">
                          <img
                            src={imageSrc}
                            alt={`Scene ${dir.sectionIndex + 1}`}
                            className="w-full max-h-96 object-contain rounded-lg bg-black/40 cursor-pointer"
                            onClick={() => setLightboxSrc(imageSrc)}
                          />
                          <button
                            onClick={() => setLightboxSrc(imageSrc)}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            title="View full size"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Image generation loading state */}
                    {isGeneratingImage && (
                      <div className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                        <span className="text-sm text-purple-300">
                          Generating image... this may take 10-30 seconds
                        </span>
                      </div>
                    )}

                    {/* Image error state */}
                    {dirImageError && !isGeneratingImage && (
                      <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-red-300">{dirImageError}</p>
                          <button
                            onClick={() => generateImage(dir)}
                            className="text-xs text-red-400 hover:text-red-300 mt-1 underline"
                          >
                            Try again
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Prompt display / edit */}
                    <div>
                      <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                        AI Image Prompt
                      </h4>
                      {isEditingPrompt ? (
                        <div className="space-y-2">
                          <textarea
                            value={editedPrompt}
                            onChange={(e) => setEditedPrompt(e.target.value)}
                            className="w-full bg-bg-secondary border border-border rounded-lg p-3 text-sm font-mono text-purple-300 resize-y min-h-[80px] focus:outline-none focus:border-purple-500/50"
                            rows={4}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => generateImage(dir, editedPrompt)}
                              disabled={isGeneratingImage || !editedPrompt.trim()}
                              className="btn-primary text-xs flex items-center gap-1"
                            >
                              <ImagePlus className="w-3 h-3" />
                              Generate Image
                            </button>
                            <button
                              onClick={() => setEditingPromptId(null)}
                              className="btn-secondary text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {dir.aiPrompt ? (
                            <div className="bg-bg-secondary rounded-lg p-3">
                              <code className="text-sm font-mono text-purple-300 whitespace-pre-wrap">
                                {dir.aiPrompt}
                              </code>
                            </div>
                          ) : (
                            <p className="text-sm text-text-muted italic">
                              No prompt generated yet
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {/* 3D action buttons */}
                    {!isEditingPrompt && dir.aiPrompt && (
                      <div className="flex flex-wrap gap-2">
                        {!imageSrc ? (
                          <button
                            onClick={() => generateImage(dir)}
                            disabled={isGeneratingImage}
                            className="btn-primary text-xs flex items-center gap-1.5"
                          >
                            {isGeneratingImage ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ImagePlus className="w-3.5 h-3.5" />
                            )}
                            Generate Image
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => downloadImage(imageSrc, `scene-${dir.sectionIndex + 1}`)}
                              className="btn-secondary text-xs flex items-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </button>
                            <button
                              onClick={() => generateImage(dir)}
                              disabled={isGeneratingImage}
                              className="btn-secondary text-xs flex items-center gap-1.5"
                            >
                              {isGeneratingImage ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                              Regenerate
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => copyPrompt(dir.aiPrompt!, dir.id)}
                          className="btn-secondary text-xs flex items-center gap-1.5"
                        >
                          {copiedId === dir.id ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copiedId === dir.id ? "Copied" : "Copy Prompt"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingPromptId(dir.id);
                            setEditedPrompt(dir.aiPrompt || "");
                          }}
                          className="btn-secondary text-xs flex items-center gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit Prompt
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Non-3D: AI prompt display (unchanged) */}
                {!is3D && (dir.aiPrompt || isEditing) && (
                  <div>
                    <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                      AI Image Prompt
                    </h4>
                    {isEditing ? (
                      <EditableField
                        value={dir.aiPrompt || ""}
                        field="aiPrompt"
                        editData={edit.editData}
                        setEditData={(d) => edit.setEditData(d)}
                        isEditing={isEditing}
                        className="font-mono text-purple-300"
                      />
                    ) : (
                      <div className="bg-bg-secondary rounded-lg p-3">
                        <code className="text-sm font-mono text-purple-300">
                          {dir.aiPrompt}
                        </code>
                      </div>
                    )}
                  </div>
                )}
                {(dir.mediaLinks || isEditing) && (
                  <div>
                    <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                      Media Sources
                    </h4>
                    <EditableField
                      value={dir.mediaLinks || ""}
                      field="mediaLinks"
                      editData={edit.editData}
                      setEditData={(d) => edit.setEditData(d)}
                      isEditing={isEditing}
                      className="text-sm whitespace-pre-wrap"
                    />
                  </div>
                )}
                {(dir.gfxSpecs || isEditing) && (
                  <div>
                    <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                      GFX Specifications
                    </h4>
                    <EditableField
                      value={dir.gfxSpecs || ""}
                      field="gfxSpecs"
                      editData={edit.editData}
                      setEditData={(d) => edit.setEditData(d)}
                      isEditing={isEditing}
                      className="text-sm whitespace-pre-wrap"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Audio Tab ───

function AudioTab({
  directions,
  generating,
  onGenerate,
  projectId,
  onRefresh,
}: {
  directions: AudioDirection[];
  generating: boolean;
  onGenerate: () => void;
  projectId: string;
  onRefresh: () => void;
}) {
  const edit = useInlineEdit("audio", onRefresh);
  const regen = useSectionRegen(projectId, onRefresh);

  if (directions.length === 0) {
    return (
      <EmptyState
        title="No audio direction yet"
        description="Generate music moods, SFX cues, and audio notes for your script"
        generating={generating}
        onGenerate={onGenerate}
        icon={Music}
      />
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold">
          Audio Production
        </h2>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          {generating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Regenerate All
        </button>
      </div>

      {directions.map((dir) => {
        const moodClass =
          moodColors[dir.musicMood.toLowerCase()] ||
          "bg-gray-500/20 text-gray-400";
        const isEditing = edit.editingId === dir.id;
        const isRegenerating = regen.regenId === dir.id;

        return (
          <div key={dir.id} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-accent-blue" />
                <span className="text-text-muted text-sm">
                  Section {dir.sectionIndex + 1}
                </span>
                <span className={`badge ${moodClass}`}>
                  {dir.musicMood}
                </span>
                <span className="text-text-muted text-xs">
                  {dir.musicBpmRange} BPM
                </span>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={edit.save}
                      disabled={edit.saving}
                      className="btn-primary text-xs flex items-center gap-1"
                    >
                      {edit.saving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      Save
                    </button>
                    <button
                      onClick={edit.cancel}
                      className="btn-secondary text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() =>
                        edit.startEdit(dir.id, {
                          musicMood: dir.musicMood,
                          musicBpmRange: dir.musicBpmRange,
                          musicSearchTerms: dir.musicSearchTerms,
                          sfxCues: dir.sfxCues || "",
                        })
                      }
                      className="btn-secondary text-xs flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        regen.regenerate("audio", dir.id)
                      }
                      disabled={isRegenerating}
                      className="btn-secondary text-xs flex items-center gap-1"
                    >
                      {isRegenerating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Regen
                    </button>
                  </>
                )}
              </div>
            </div>

            <p className="text-sm text-text-secondary mb-4">
              {dir.scriptText}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-bg-secondary rounded-lg p-3">
                <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                  Music Search Terms
                </h4>
                <EditableField
                  value={dir.musicSearchTerms}
                  field="musicSearchTerms"
                  editData={edit.editData}
                  setEditData={(d) => edit.setEditData(d)}
                  isEditing={isEditing}
                  className="text-sm font-mono"
                />
              </div>
              {(dir.sfxCues || isEditing) && (
                <div className="bg-bg-secondary rounded-lg p-3">
                  <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                    Sound Effects
                  </h4>
                  <EditableField
                    value={dir.sfxCues || ""}
                    field="sfxCues"
                    editData={edit.editData}
                    setEditData={(d) => edit.setEditData(d)}
                    isEditing={isEditing}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Timeline Tab ───

function TimelineTab({
  segments,
  generating,
  onGenerate,
  projectId,
  onRefresh,
}: {
  segments: TimelineSegment[];
  generating: boolean;
  onGenerate: () => void;
  projectId: string;
  onRefresh: () => void;
}) {
  const edit = useInlineEdit("timeline", onRefresh);
  const regen = useSectionRegen(projectId, onRefresh);

  if (segments.length === 0) {
    return (
      <EmptyState
        title="No timeline yet"
        description="Auto-cut your script into timed editing segments"
        generating={generating}
        onGenerate={onGenerate}
        icon={Clock}
      />
    );
  }

  const totalDuration = segments.reduce(
    (acc, s) => acc + s.durationSeconds,
    0
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-semibold">Timeline</h2>
          <p className="text-text-secondary text-sm">
            {segments.length} segments ·{" "}
            {Math.floor(totalDuration / 60)}:
            {String(totalDuration % 60).padStart(2, "0")} total
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          {generating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Regenerate All
        </button>
      </div>

      <div className="relative">
        {segments.map((seg, i) => {
          const isEditing = edit.editingId === seg.id;
          const isRegenerating = regen.regenId === seg.id;

          return (
            <div key={seg.id} className="flex gap-4 mb-0">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-accent-red border-2 border-accent-red/30 shrink-0 mt-1.5" />
                {i < segments.length - 1 && (
                  <div className="w-0.5 flex-1 bg-border my-1" />
                )}
              </div>

              <div className="card flex-1 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-accent-red text-sm font-semibold">
                      {seg.startTime}
                    </span>
                    <span className="text-text-muted text-xs">
                      {seg.durationSeconds}s
                    </span>
                    {seg.visualLayers && (
                      <span className="text-text-muted text-xs">
                        {seg.visualLayers}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={edit.save}
                          disabled={edit.saving}
                          className="btn-primary text-xs flex items-center gap-1"
                        >
                          {edit.saving ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          Save
                        </button>
                        <button
                          onClick={edit.cancel}
                          className="btn-secondary text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            edit.startEdit(seg.id, {
                              narrationText: seg.narrationText,
                              audioNotes: seg.audioNotes || "",
                            })
                          }
                          className="btn-secondary text-xs flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            regen.regenerate("timeline", seg.id)
                          }
                          disabled={isRegenerating}
                          className="btn-secondary text-xs flex items-center gap-1"
                        >
                          {isRegenerating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          Regen
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <EditableField
                  value={seg.narrationText}
                  field="narrationText"
                  editData={edit.editData}
                  setEditData={(d) => edit.setEditData(d)}
                  isEditing={isEditing}
                  className="text-sm"
                />
                {(seg.audioNotes || isEditing) && (
                  <div className="mt-2">
                    <EditableField
                      value={seg.audioNotes || ""}
                      field="audioNotes"
                      editData={edit.editData}
                      setEditData={(d) => edit.setEditData(d)}
                      isEditing={isEditing}
                      className="text-xs text-text-muted"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Production Tab ───

function ProductionTab({
  pkg,
  generating,
  onGenerate,
  onRefresh,
}: {
  pkg: ProductionPackage | null;
  generating: boolean;
  onGenerate: () => void;
  onRefresh: () => void;
}) {
  const edit = useInlineEdit("production", onRefresh);

  if (!pkg) {
    return (
      <EmptyState
        title="No production package yet"
        description="Generate YouTube titles, description, tags, and thumbnail concepts"
        generating={generating}
        onGenerate={onGenerate}
        icon={Package}
      />
    );
  }

  let titles: string[] = [];
  try {
    titles = JSON.parse(pkg.titles || "[]");
  } catch {
    titles = [];
  }

  let thumbnails: Array<{ concept: string; textOverlay?: string }> = [];
  try {
    thumbnails = JSON.parse(pkg.thumbnailConcepts || "[]");
  } catch {
    thumbnails = [];
  }

  const isEditing = edit.editingId === pkg.id;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold">
          Production Package
        </h2>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={edit.save}
                disabled={edit.saving}
                className="btn-primary text-sm flex items-center gap-1"
              >
                {edit.saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save
              </button>
              <button
                onClick={edit.cancel}
                className="btn-secondary text-sm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() =>
                  edit.startEdit(pkg.id, {
                    description: pkg.description || "",
                    tags: pkg.tags || "",
                  })
                }
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={onGenerate}
                disabled={generating}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                {generating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Regenerate
              </button>
            </>
          )}
        </div>
      </div>

      {/* Titles */}
      {titles.length > 0 && (
        <div className="card">
          <h3 className="font-display font-semibold mb-3">Title Options</h3>
          <div className="space-y-2">
            {titles.map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg"
              >
                <span className="text-accent-red font-mono text-sm">
                  {i + 1}
                </span>
                <span className="text-sm flex-1">{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thumbnails */}
      {thumbnails.length > 0 && (
        <div className="card">
          <h3 className="font-display font-semibold mb-3">
            Thumbnail Concepts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {thumbnails.map((thumb, i) => (
              <div
                key={i}
                className="bg-bg-secondary rounded-lg p-4 border border-border"
              >
                <div className="aspect-video bg-bg-primary rounded-lg flex items-center justify-center mb-3">
                  <Image className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-sm">{thumb.concept}</p>
                {thumb.textOverlay && (
                  <p className="text-xs text-accent-red mt-1">
                    Text: {thumb.textOverlay}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="card">
        <h3 className="font-display font-semibold mb-3">
          YouTube Description
        </h3>
        {isEditing ? (
          <textarea
            value={edit.editData.description ?? pkg.description ?? ""}
            onChange={(e) =>
              edit.setEditData({
                ...edit.editData,
                description: e.target.value,
              })
            }
            className="input-field text-sm font-mono resize-y min-h-[200px]"
            rows={10}
          />
        ) : (
          <pre className="text-sm font-mono whitespace-pre-wrap bg-bg-secondary rounded-lg p-4">
            {pkg.description || "No description generated"}
          </pre>
        )}
      </div>

      {/* Tags */}
      <div className="card">
        <h3 className="font-display font-semibold mb-3">Tags</h3>
        {isEditing ? (
          <textarea
            value={edit.editData.tags ?? pkg.tags ?? ""}
            onChange={(e) =>
              edit.setEditData({ ...edit.editData, tags: e.target.value })
            }
            className="input-field text-sm resize-y"
            rows={3}
          />
        ) : pkg.tags ? (
          <div className="flex flex-wrap gap-2">
            {pkg.tags.split(",").map((tag, i) => (
              <span
                key={i}
                className="badge bg-bg-secondary text-text-secondary border border-border"
              >
                {tag.trim()}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-sm">No tags generated</p>
        )}
      </div>
    </div>
  );
}

// ─── Export Tab ───

function ExportTab({
  onExport,
  hasData,
}: {
  onExport: (format: string) => void;
  hasData: boolean;
}) {
  if (!hasData) {
    return (
      <div className="card text-center py-16 max-w-lg mx-auto">
        <Download className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-display font-semibold mb-2">
          Nothing to export
        </h3>
        <p className="text-text-secondary">
          Generate some content first, then come back to export
        </p>
      </div>
    );
  }

  const exportOptions = [
    {
      format: "markdown",
      label: "Full Package (Markdown)",
      description: "Complete production package as .md",
      icon: FileText,
    },
    {
      format: "json",
      label: "Timeline JSON",
      description: "Timeline data as structured JSON",
      icon: Clock,
    },
    {
      format: "csv",
      label: "Timeline CSV",
      description: "Timeline segments as spreadsheet",
      icon: BarChart3,
    },
    {
      format: "pdf",
      label: "Full Package (PDF)",
      description: "Formatted PDF of the entire package",
      icon: FileDown,
    },
    {
      format: "zip",
      label: "Download All (ZIP)",
      description: "Everything bundled: MD, JSON, CSV, PDF",
      icon: Archive,
    },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-lg font-display font-semibold">Export</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportOptions.map((opt) => (
          <button
            key={opt.format}
            onClick={() => onExport(opt.format)}
            className="card text-left hover:border-accent-red/30 transition-all group"
          >
            <opt.icon className="w-8 h-8 text-text-muted group-hover:text-accent-red transition-colors mb-3" />
            <h3 className="font-display font-semibold">{opt.label}</h3>
            <p className="text-sm text-text-secondary mt-1">
              {opt.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
