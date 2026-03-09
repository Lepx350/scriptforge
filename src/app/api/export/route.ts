import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  const format = request.nextUrl.searchParams.get("format") || "markdown";

  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      visualDirections: { orderBy: { sectionIndex: "asc" } },
      audioDirections: { orderBy: { sectionIndex: "asc" } },
      timelineSegments: { orderBy: { segmentIndex: "asc" } },
      productionPackage: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  switch (format) {
    case "markdown":
      return exportMarkdown(project);
    case "json":
      return exportJSON(project);
    case "csv":
      return exportCSV(project);
    default:
      return NextResponse.json({ error: "Unknown format" }, { status: 400 });
  }
}

function exportMarkdown(project: any) {
  let md = `# ${project.title}\n\n`;
  md += `**Status:** ${project.status} | **Estimated Duration:** ${project.estimatedDurationMinutes || "N/A"} min\n`;
  md += `**Created:** ${new Date(project.createdAt).toLocaleDateString()}\n\n`;
  md += `---\n\n`;

  // Script
  md += `## Original Script\n\n${project.inputScript}\n\n---\n\n`;

  // Visual Direction
  if (project.visualDirections.length > 0) {
    md += `## Visual Direction\n\n`;
    for (const v of project.visualDirections) {
      md += `### [${v.layerType.toUpperCase()}] Section ${v.sectionIndex + 1}\n\n`;
      md += `**Script:** ${v.scriptText}\n\n`;
      md += `**Direction:** ${v.directionText}\n\n`;
      if (v.aiPrompt) md += `**AI Prompt:**\n\`\`\`\n${v.aiPrompt}\n\`\`\`\n\n`;
      if (v.mediaLinks) md += `**Media Sources:** ${v.mediaLinks}\n\n`;
      if (v.gfxSpecs) md += `**GFX Specs:** ${v.gfxSpecs}\n\n`;
    }
    md += `---\n\n`;
  }

  // Audio Direction
  if (project.audioDirections.length > 0) {
    md += `## Audio Production\n\n`;
    for (const a of project.audioDirections) {
      md += `### Section ${a.sectionIndex + 1} — ${a.musicMood} (${a.musicBpmRange} BPM)\n\n`;
      md += `**Script:** ${a.scriptText}\n\n`;
      md += `**Search Terms:** ${a.musicSearchTerms}\n\n`;
      if (a.sfxCues) md += `**SFX Cues:** ${a.sfxCues}\n\n`;
    }
    md += `---\n\n`;
  }

  // Timeline
  if (project.timelineSegments.length > 0) {
    md += `## Timeline\n\n`;
    md += `| # | Start | Duration | Visual | Narration |\n`;
    md += `|---|-------|----------|--------|-----------|\n`;
    for (const s of project.timelineSegments) {
      const narr = s.narrationText.slice(0, 80).replace(/\n/g, " ");
      md += `| ${s.segmentIndex + 1} | ${s.startTime} | ${s.durationSeconds}s | ${s.visualLayers || "-"} | ${narr}... |\n`;
    }
    md += `\n---\n\n`;
  }

  // Production Package
  if (project.productionPackage) {
    const pkg = project.productionPackage;
    md += `## Production Package\n\n`;

    let titles: string[] = [];
    try { titles = JSON.parse(pkg.titles || "[]"); } catch {}
    if (titles.length > 0) {
      md += `### Title Options\n\n`;
      titles.forEach((t: string, i: number) => { md += `${i + 1}. ${t}\n`; });
      md += `\n`;
    }

    if (pkg.description) {
      md += `### YouTube Description\n\n\`\`\`\n${pkg.description}\n\`\`\`\n\n`;
    }

    if (pkg.tags) {
      md += `### Tags\n\n${pkg.tags}\n\n`;
    }

    let thumbs: any[] = [];
    try { thumbs = JSON.parse(pkg.thumbnailConcepts || "[]"); } catch {}
    if (thumbs.length > 0) {
      md += `### Thumbnail Concepts\n\n`;
      thumbs.forEach((t: any, i: number) => {
        md += `**Concept ${i + 1}:** ${t.concept || t}\n`;
        if (t.textOverlay) md += `Text Overlay: ${t.textOverlay}\n`;
        md += `\n`;
      });
    }
  }

  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": `attachment; filename="${project.title}-package.md"`,
    },
  });
}

function exportJSON(project: any) {
  const data = {
    project: {
      title: project.title,
      status: project.status,
      estimatedDurationMinutes: project.estimatedDurationMinutes,
    },
    timeline: project.timelineSegments.map((s: any) => ({
      index: s.segmentIndex,
      startTime: s.startTime,
      durationSeconds: s.durationSeconds,
      narration: s.narrationText,
      visualLayers: s.visualLayers,
      audioNotes: s.audioNotes,
    })),
    visualDirections: project.visualDirections.map((v: any) => ({
      section: v.sectionIndex,
      layerType: v.layerType,
      scriptText: v.scriptText,
      direction: v.directionText,
      aiPrompt: v.aiPrompt,
      mediaLinks: v.mediaLinks,
      gfxSpecs: v.gfxSpecs,
    })),
    audioDirections: project.audioDirections.map((a: any) => ({
      section: a.sectionIndex,
      scriptText: a.scriptText,
      mood: a.musicMood,
      bpm: a.musicBpmRange,
      searchTerms: a.musicSearchTerms,
      sfxCues: a.sfxCues,
    })),
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${project.title}-timeline.json"`,
    },
  });
}

function exportCSV(project: any) {
  const headers = [
    "Segment",
    "Start Time",
    "Duration (s)",
    "Narration",
    "Visual Layers",
    "Audio Notes",
  ];

  const rows = project.timelineSegments.map((s: any) => [
    s.segmentIndex + 1,
    s.startTime,
    s.durationSeconds,
    `"${(s.narrationText || "").replace(/"/g, '""')}"`,
    `"${(s.visualLayers || "").replace(/"/g, '""')}"`,
    `"${(s.audioNotes || "").replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${project.title}-timeline.csv"`,
    },
  });
}
