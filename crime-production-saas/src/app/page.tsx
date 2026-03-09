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
} from "lucide-react";

interface Project {
  id: string;
  title: string;
  status: string;
  inputMethod: string;
  estimatedDurationMinutes: number | null;
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
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title" | "status">("date");

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProject(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
    setProjects((p) => p.filter((proj) => proj.id !== id));
  }

  const filtered = projects
    .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "date")
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "title") return a.title.localeCompare(b.title);
      return a.status.localeCompare(b.status);
    });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-text-secondary mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/projects/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-6">
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
            setSortBy(sortBy === "date" ? "title" : sortBy === "title" ? "status" : "date")
          }
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <ArrowUpDown className="w-4 h-4" />
          Sort: {sortBy}
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
            <Link href="/projects/new" className="btn-primary inline-flex items-center gap-2">
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
                    deleteProject(project.id);
                  }}
                  className="text-text-muted hover:text-error transition-colors p-1 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className={statusBadge[project.status] || "badge-draft"}>
                  {statusLabel[project.status] || project.status}
                </span>
                {project.estimatedDurationMinutes && (
                  <span className="flex items-center gap-1 text-text-secondary">
                    <Clock className="w-3.5 h-3.5" />
                    {project.estimatedDurationMinutes}m
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
