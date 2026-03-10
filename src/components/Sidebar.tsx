"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Plus,
  Settings,
  Film,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects/new", label: "New Project", icon: Plus },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Detect if we're on a project page
  const projectMatch = pathname.match(/^\/projects\/([^/]+)$/);
  const isOnProject = projectMatch && projectMatch[1] !== "new";

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside
        className={`hidden md:flex ${
          collapsed ? "w-16" : "w-60"
        } bg-bg-secondary border-r border-border flex-col transition-all duration-300 shrink-0`}
      >
        <div className="flex items-center gap-2 px-4 h-16 border-b border-border">
          <Film className="w-7 h-7 text-accent-red shrink-0" />
          {!collapsed && (
            <span className="font-display font-bold text-lg tracking-tight">
              CrimeFrame
            </span>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-accent-red/10 text-accent-red"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand" : "Collapse"}
          className="flex items-center justify-center h-12 border-t border-border text-text-muted hover:text-text-primary transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </aside>

      {/* Mobile bottom navigation — hidden on desktop */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-bg-secondary border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  isActive ? "text-accent-red" : "text-text-secondary active:text-text-primary"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          {isOnProject && (
            <Link
              href={pathname}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-accent-red"
            >
              <FolderOpen className="w-5 h-5" />
              <span className="text-[10px] font-medium">Project</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
