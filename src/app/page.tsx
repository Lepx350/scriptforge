"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Film,
  Clock,
  Search,
  ArrowUpDown,
  Trash2,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Project {
  id: string;
  title: string;
  status: string;
  inputMethod: string;
  estimatedDurationMinutes: number | null;
  youtubeUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusBadge: Record<string, string> = {
  draft: "badge-draft",
  in_production: "badge-in-production",
  editing: "badge-editing",
  published: "badge-published",
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  in_production: "In Production",
  editing: "Editing",
  published: "Published",
};

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title" | "status">("date");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load projects");
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects?id=${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setProjects((p) => p.filter((proj) => proj.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError("Failed to delete project");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = projects
    .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "date")
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      if (sortBy === "title") return a.title.localeCompare(b.title);
      return a.status.localeCompare(b.status);
    });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-semibold text-lg mb-2">Delete Project?</h3>
            <p className="text-text-secondary text-sm mb-4">
              This will permanently delete &ldquo;{deleteTarget.title}&rdquo; and all generated content. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="btn-secondary text-sm">
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-error hover:bg-red-600 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-text-secondary mt-1 text-sm">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden md:inline">New Project</span>
          <span className="md:hidden">New</span>
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-error/10 text-error text-sm mb-6">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button
            onClick={() => setError("")}
            className="ml-auto text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 md:gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <button
          onClick={() =>
            setSortBy(
              sortBy === "date"
                ? "title"
                : sortBy === "title"
                  ? "status"
                  : "date"
            )
          }
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <ArrowUpDown className="w-4 h-4" />
          <span className="hidden md:inline">Sort: {sortBy}</span>
          <span className="md:hidden">{sortBy}</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-bg-card-hover rounded w-3/4 mb-4" />
              <div className="h-3 bg-bg-card-hover rounded w-1/2 mb-2" />
              <div className="h-3 bg-bg-card-hover rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Film className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold mb-2">
            {search ? "No matching projects" : "No projects yet"}
          </h3>
          <p className="text-text-secondary mb-6">
            {search
              ? "Try a different search term"
              : "Create your first project to get started"}
          </p>
          {!search && (
            <Link
              href="/projects/new"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="card hover:border-accent-red/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-display font-semibold text-lg group-hover:text-accent-red transition-colors line-clamp-2">
                  {project.title}
                </h3>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteTarget(project);
                  }}
                  className="text-text-muted hover:text-error transition-colors p-2 md:p-1 md:opacity-0 md:group-hover:opacity-100 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <span
                  className={statusBadge[project.status] || "badge-draft"}
                >
                  {statusLabel[project.status] || project.status}
                </span>
                {project.estimatedDurationMinutes && (
                  <span className="flex items-center gap-1 text-text-secondary">
                    <Clock className="w-3.5 h-3.5" />
                    {project.estimatedDurationMinutes}m
                  </span>
                )}
                {project.youtubeUrl && (
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(project.youtubeUrl!, "_blank");
                    }}
                    className="flex items-center gap-1 text-accent-blue hover:underline cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    YouTube
                  </span>
                )}
              </div>
              <p className="text-text-muted text-xs mt-3">
                {new Date(project.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
