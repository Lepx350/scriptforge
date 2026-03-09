"use client";

import { useEffect, useState, use } from "react";
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
} from "lucide-react";

interface VisualDirection {
  id: string;
  sectionIndex: number;
  scriptText: string;
  layerType: string;
  directionText: string;
  aiPrompt?: string;
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
  createdAt: string;
  visualDirections: VisualDirection[];
  audioDirections: AudioDirection[];
  timelineSegments: TimelineSegment[];
  productionPackage: ProductionPackage | null;
}

type Tab = "script" | "visual" | "audio" | "timeline" | "production" | "export";

const tabs: { id: Tab; label: string; icon: typeof Eye }[] = [
  { id: "script", label: "Script", icon: FileText },
  { id: "visual", label: "Visual Direction", icon: Eye },
  { id: "audio", label: "Audio", icon: Music },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "production", label: "Production", icon: Package },
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

export default function ProjectWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("script");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProject();
  }, [id]);

  async function fetchProject() {
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
  }

  async function runGeneration(module: string) {
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
      await fetchProject();
      // Auto-switch to the relevant tab
      if (module === "all") setActiveTab("visual");
      else setActiveTab(module as Tab);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(null);
    }
  }

  async function handleExport(format: string) {
    try {
      const res = await fetch(`/api/export?projectId=${id}&format=${format}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "markdown" ? "md" : format;
      a.download = `${project?.title || "project"}-production-package.${ext}`;
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
        <h2 className="text-xl font-display font-semibold">Project not found</h2>
      </div>
    );
  }

  const hasVisual = project.visualDirections.length > 0;
  const hasAudio = project.audioDirections.length > 0;
  const hasTimeline = project.timelineSegments.length > 0;
  const hasProduction = project.productionPackage !== null;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-bg-secondary border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">{project.title}</h1>
            <div className="flex items-center gap-3 mt-1">
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
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => runGeneration("all")}
              disabled={generating !== null}
              className="btn-primary flex items-center gap-2"
            >
              {generating === "all" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {generating === "all" ? "Generating All..." : "Generate All"}
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

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 p-3 rounded-lg bg-error/10 text-error text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "script" && <ScriptTab script={project.inputScript} />}
        {activeTab === "visual" && (
          <VisualTab
            directions={project.visualDirections}
            generating={generating === "visual" || generating === "all"}
            onGenerate={() => runGeneration("visual")}
          />
        )}
        {activeTab === "audio" && (
          <AudioTab
            directions={project.audioDirections}
            generating={generating === "audio" || generating === "all"}
            onGenerate={() => runGeneration("audio")}
          />
        )}
        {activeTab === "timeline" && (
          <TimelineTab
            segments={project.timelineSegments}
            generating={generating === "timeline" || generating === "all"}
            onGenerate={() => runGeneration("timeline")}
          />
        )}
        {activeTab === "production" && (
          <ProductionTab
            pkg={project.productionPackage}
            generating={generating === "production" || generating === "all"}
            onGenerate={() => runGeneration("production")}
          />
        )}
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

function ScriptTab({ script }: { script: string }) {
  return (
    <div className="max-w-4xl">
      <h2 className="text-lg font-display font-semibold mb-4">Original Script</h2>
      <div className="card">
        <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-text-primary">
          {script}
        </pre>
      </div>
    </div>
  );
}

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

function VisualTab({
  directions,
  generating,
  onGenerate,
}: {
  directions: VisualDirection[];
  generating: boolean;
  onGenerate: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold">Visual Direction</h2>
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
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Regenerate
          </button>
        </div>
      </div>

      {directions.map((dir) => {
        const LayerIcon = layerIcons[dir.layerType] || Layers;
        const colors = layerColors[dir.layerType] || "text-text-secondary bg-bg-card border-border";
        const isExpanded = expandedId === dir.id;

        return (
          <div key={dir.id} className={`card border ${colors.split(" ").pop()}`}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : dir.id)}
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
                <div>
                  <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                    Direction
                  </h4>
                  <p className="text-sm">{dir.directionText}</p>
                </div>
                {dir.aiPrompt && (
                  <div>
                    <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                      AI Image Prompt
                    </h4>
                    <div className="bg-bg-secondary rounded-lg p-3">
                      <code className="text-sm font-mono text-purple-300">
                        {dir.aiPrompt}
                      </code>
                    </div>
                  </div>
                )}
                {dir.mediaLinks && (
                  <div>
                    <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                      Media Sources
                    </h4>
                    <p className="text-sm whitespace-pre-wrap">{dir.mediaLinks}</p>
                  </div>
                )}
                {dir.gfxSpecs && (
                  <div>
                    <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                      GFX Specifications
                    </h4>
                    <p className="text-sm whitespace-pre-wrap">{dir.gfxSpecs}</p>
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

function AudioTab({
  directions,
  generating,
  onGenerate,
}: {
  directions: AudioDirection[];
  generating: boolean;
  onGenerate: () => void;
}) {
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
        <h2 className="text-lg font-display font-semibold">Audio Production</h2>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Regenerate
        </button>
      </div>

      {directions.map((dir) => {
        const moodClass =
          moodColors[dir.musicMood.toLowerCase()] || "bg-gray-500/20 text-gray-400";

        return (
          <div key={dir.id} className="card">
            <div className="flex items-center gap-3 mb-3">
              <Volume2 className="w-5 h-5 text-accent-blue" />
              <span className="text-text-muted text-sm">Section {dir.sectionIndex + 1}</span>
              <span className={`badge ${moodClass}`}>{dir.musicMood}</span>
              <span className="text-text-muted text-xs">{dir.musicBpmRange} BPM</span>
            </div>

            <p className="text-sm text-text-secondary mb-4">{dir.scriptText}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-bg-secondary rounded-lg p-3">
                <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                  Music Search Terms
                </h4>
                <p className="text-sm font-mono">{dir.musicSearchTerms}</p>
              </div>
              {dir.sfxCues && (
                <div className="bg-bg-secondary rounded-lg p-3">
                  <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                    Sound Effects
                  </h4>
                  <p className="text-sm">{dir.sfxCues}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimelineTab({
  segments,
  generating,
  onGenerate,
}: {
  segments: TimelineSegment[];
  generating: boolean;
  onGenerate: () => void;
}) {
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

  const totalDuration = segments.reduce((acc, s) => acc + s.durationSeconds, 0);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-semibold">Timeline</h2>
          <p className="text-text-secondary text-sm">
            {segments.length} segments · {Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, "0")} total
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Regenerate
        </button>
      </div>

      <div className="relative">
        {segments.map((seg, i) => (
          <div key={seg.id} className="flex gap-4 mb-0">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-accent-red border-2 border-accent-red/30 shrink-0 mt-1.5" />
              {i < segments.length - 1 && (
                <div className="w-0.5 flex-1 bg-border my-1" />
              )}
            </div>

            <div className="card flex-1 mb-4">
              <div className="flex items-center gap-3 mb-2">
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
              <p className="text-sm">{seg.narrationText}</p>
              {seg.audioNotes && (
                <p className="text-xs text-text-muted mt-2">{seg.audioNotes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductionTab({
  pkg,
  generating,
  onGenerate,
}: {
  pkg: ProductionPackage | null;
  generating: boolean;
  onGenerate: () => void;
}) {
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

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold">Production Package</h2>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Regenerate
        </button>
      </div>

      {/* Titles */}
      {titles.length > 0 && (
        <div className="card">
          <h3 className="font-display font-semibold mb-3">Title Options</h3>
          <div className="space-y-2">
            {titles.map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg group"
              >
                <span className="text-accent-red font-mono text-sm">{i + 1}</span>
                <span className="text-sm flex-1">{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thumbnails */}
      {thumbnails.length > 0 && (
        <div className="card">
          <h3 className="font-display font-semibold mb-3">Thumbnail Concepts</h3>
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
      {pkg.description && (
        <div className="card">
          <h3 className="font-display font-semibold mb-3">YouTube Description</h3>
          <pre className="text-sm font-mono whitespace-pre-wrap bg-bg-secondary rounded-lg p-4">
            {pkg.description}
          </pre>
        </div>
      )}

      {/* Tags */}
      {pkg.tags && (
        <div className="card">
          <h3 className="font-display font-semibold mb-3">Tags</h3>
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
        </div>
      )}
    </div>
  );
}

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
        <h3 className="text-lg font-display font-semibold mb-2">Nothing to export</h3>
        <p className="text-text-secondary">
          Generate some content first, then come back to export
        </p>
      </div>
    );
  }

  const exportOptions = [
    {
      format: "markdown",
      label: "Full Production Package",
      description: "Complete package as Markdown",
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
            <p className="text-sm text-text-secondary mt-1">{opt.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
