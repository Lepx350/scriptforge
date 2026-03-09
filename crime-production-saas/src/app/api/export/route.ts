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
    case "pdf":
      return exportPDF(project);
    case "zip":
      return exportZIP(project);
    default:
      return NextResponse.json({ error: "Unknown format" }, { status: 400 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMarkdown(project: any): string {
  let md = `# ${project.title}\n\n`;
  md += `**Status:** ${project.status} | **Estimated Duration:** ${project.estimatedDurationMinutes || "N/A"} min\n`;
  md += `**Created:** ${new Date(project.createdAt).toLocaleDateString()}\n`;
  if (project.youtubeUrl) md += `**YouTube:** ${project.youtubeUrl}\n`;
  md += `\n---\n\n`;

  md += `## Original Script\n\n${project.inputScript}\n\n---\n\n`;

  if (project.visualDirections.length > 0) {
    md += `## Visual Direction\n\n`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const v of project.visualDirections as any[]) {
      md += `### [${v.layerType.toUpperCase()}] Section ${v.sectionIndex + 1}\n\n`;
      md += `**Script:** ${v.scriptText}\n\n`;
      md += `**Direction:** ${v.directionText}\n\n`;
      if (v.aiPrompt) md += `**AI Prompt:**\n\`\`\`\n${v.aiPrompt}\n\`\`\`\n\n`;
      if (v.mediaLinks) md += `**Media Sources:** ${v.mediaLinks}\n\n`;
      if (v.gfxSpecs) md += `**GFX Specs:** ${v.gfxSpecs}\n\n`;
    }
    md += `---\n\n`;
  }

  if (project.audioDirections.length > 0) {
    md += `## Audio Production\n\n`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const a of project.audioDirections as any[]) {
      md += `### Section ${a.sectionIndex + 1} — ${a.musicMood} (${a.musicBpmRange} BPM)\n\n`;
      md += `**Script:** ${a.scriptText}\n\n`;
      md += `**Search Terms:** ${a.musicSearchTerms}\n\n`;
      if (a.sfxCues) md += `**SFX Cues:** ${a.sfxCues}\n\n`;
    }
    md += `---\n\n`;
  }

  if (project.timelineSegments.length > 0) {
    md += `## Timeline\n\n`;
    md += `| # | Start | Duration | Visual | Narration |\n`;
    md += `|---|-------|----------|--------|-----------|\n`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of project.timelineSegments as any[]) {
      const narr = s.narrationText.slice(0, 80).replace(/\n/g, " ");
      md += `| ${s.segmentIndex + 1} | ${s.startTime} | ${s.durationSeconds}s | ${s.visualLayers || "-"} | ${narr}... |\n`;
    }
    md += `\n---\n\n`;
  }

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let thumbs: any[] = [];
    try { thumbs = JSON.parse(pkg.thumbnailConcepts || "[]"); } catch {}
    if (thumbs.length > 0) {
      md += `### Thumbnail Concepts\n\n`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      thumbs.forEach((t: any, i: number) => {
        md += `**Concept ${i + 1}:** ${t.concept || t}\n`;
        if (t.textOverlay) md += `Text Overlay: ${t.textOverlay}\n`;
        md += `\n`;
      });
    }
  }

  return md;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportMarkdown(project: any) {
  const md = buildMarkdown(project);
  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": `attachment; filename="${project.title}-package.md"`,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportJSON(project: any) {
  const data = {
    project: {
      title: project.title,
      status: project.status,
      estimatedDurationMinutes: project.estimatedDurationMinutes,
      youtubeUrl: project.youtubeUrl,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    timeline: project.timelineSegments.map((s: any) => ({
      index: s.segmentIndex,
      startTime: s.startTime,
      durationSeconds: s.durationSeconds,
      narration: s.narrationText,
      visualLayers: s.visualLayers,
      audioNotes: s.audioNotes,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    visualDirections: project.visualDirections.map((v: any) => ({
      section: v.sectionIndex,
      layerType: v.layerType,
      scriptText: v.scriptText,
      direction: v.directionText,
      aiPrompt: v.aiPrompt,
      mediaLinks: v.mediaLinks,
      gfxSpecs: v.gfxSpecs,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      "Content-Disposition": `attachment; filename="${project.title}-data.json"`,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportCSV(project: any) {
  const headers = [
    "Segment",
    "Start Time",
    "Duration (s)",
    "Narration",
    "Visual Layers",
    "Audio Notes",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = project.timelineSegments.map((s: any) => [
    s.segmentIndex + 1,
    s.startTime,
    s.durationSeconds,
    `"${(s.narrationText || "").replace(/"/g, '""')}"`,
    `"${(s.visualLayers || "").replace(/"/g, '""')}"`,
    `"${(s.audioNotes || "").replace(/"/g, '""')}"`,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join(
    "\n"
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${project.title}-timeline.csv"`,
    },
  });
}

/**
 * Generate a simple HTML-to-PDF using markdown-like content.
 * We generate an HTML document and return it as a downloadable PDF-like file.
 * For true PDF generation without heavy dependencies, we use a printable HTML approach.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportPDF(project: any) {
  const md = buildMarkdown(project);

  // Convert markdown to basic HTML
  const htmlContent = md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/```\n?([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/^---$/gm, "<hr>")
    .replace(/^\| (.+) \|$/gm, (match: string) => {
      const cells = match
        .split("|")
        .filter(Boolean)
        .map((c: string) => `<td>${c.trim()}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .replace(
      /^\|[-| ]+\|$/gm,
      ""
    )
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${project.title} - Production Package</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; line-height: 1.6; }
  h1 { color: #e63946; border-bottom: 2px solid #e63946; padding-bottom: 8px; }
  h2 { color: #333; margin-top: 32px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  h3 { color: #555; }
  pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 13px; }
  code { font-family: 'Courier New', monospace; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  td, th { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
  tr:nth-child(even) { background: #f9f9f9; }
  hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
  strong { color: #333; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<p>${htmlContent}</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `attachment; filename="${project.title}-package.html"`,
    },
  });
}

/**
 * ZIP export: bundle all formats into a single download.
 * Uses a minimal ZIP implementation without external dependencies.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportZIP(project: any) {
  const md = buildMarkdown(project);
  const jsonData = JSON.stringify(
    {
      project: { title: project.title, status: project.status },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      timeline: project.timelineSegments.map((s: any) => ({
        index: s.segmentIndex,
        startTime: s.startTime,
        durationSeconds: s.durationSeconds,
        narration: s.narrationText,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      visualDirections: project.visualDirections.map((v: any) => ({
        section: v.sectionIndex,
        layerType: v.layerType,
        direction: v.directionText,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      audioDirections: project.audioDirections.map((a: any) => ({
        section: a.sectionIndex,
        mood: a.musicMood,
        searchTerms: a.musicSearchTerms,
      })),
    },
    null,
    2
  );

  const csvHeaders = "Segment,Start Time,Duration (s),Narration\n";
  const csvRows = project.timelineSegments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((s: any) => `${s.segmentIndex + 1},${s.startTime},${s.durationSeconds},"${(s.narrationText || "").replace(/"/g, '""')}"`)
    .join("\n");
  const csv = csvHeaders + csvRows;

  const scriptTxt = project.inputScript;

  // Build a ZIP file from scratch (store method, no compression)
  const files: { name: string; data: Uint8Array }[] = [
    { name: "script.md", data: new TextEncoder().encode(scriptTxt) },
    { name: "production-package.md", data: new TextEncoder().encode(md) },
    { name: "data.json", data: new TextEncoder().encode(jsonData) },
    { name: "timeline.csv", data: new TextEncoder().encode(csv) },
  ];

  const zipBuffer = createZip(files);

  return new NextResponse(Buffer.from(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${project.title}-bundle.zip"`,
    },
  });
}

/**
 * Minimal ZIP file creator (store method, no compression).
 * Enough for text files without adding a dependency.
 */
function createZip(
  files: { name: string; data: Uint8Array }[]
): Uint8Array {
  const entries: {
    name: Uint8Array;
    data: Uint8Array;
    offset: number;
    crc: number;
  }[] = [];
  const parts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);

    // Local file header
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lhView = new DataView(localHeader.buffer);
    lhView.setUint32(0, 0x04034b50, true); // signature
    lhView.setUint16(4, 20, true); // version needed
    lhView.setUint16(6, 0, true); // flags
    lhView.setUint16(8, 0, true); // compression (store)
    lhView.setUint16(10, 0, true); // mod time
    lhView.setUint16(12, 0, true); // mod date
    lhView.setUint32(14, crc, true); // crc32
    lhView.setUint32(18, file.data.length, true); // compressed size
    lhView.setUint32(22, file.data.length, true); // uncompressed size
    lhView.setUint16(26, nameBytes.length, true); // filename length
    lhView.setUint16(28, 0, true); // extra field length
    localHeader.set(nameBytes, 30);

    entries.push({ name: nameBytes, data: file.data, offset, crc });
    parts.push(localHeader, file.data);
    offset += localHeader.length + file.data.length;
  }

  // Central directory
  const cdStart = offset;
  for (const entry of entries) {
    const cdEntry = new Uint8Array(46 + entry.name.length);
    const cdView = new DataView(cdEntry.buffer);
    cdView.setUint32(0, 0x02014b50, true); // signature
    cdView.setUint16(4, 20, true); // version made by
    cdView.setUint16(6, 20, true); // version needed
    cdView.setUint16(8, 0, true); // flags
    cdView.setUint16(10, 0, true); // compression
    cdView.setUint16(12, 0, true); // mod time
    cdView.setUint16(14, 0, true); // mod date
    cdView.setUint32(16, entry.crc, true); // crc32
    cdView.setUint32(20, entry.data.length, true); // compressed
    cdView.setUint32(24, entry.data.length, true); // uncompressed
    cdView.setUint16(28, entry.name.length, true); // filename length
    cdView.setUint16(30, 0, true); // extra
    cdView.setUint16(32, 0, true); // comment
    cdView.setUint16(34, 0, true); // disk start
    cdView.setUint16(36, 0, true); // internal attrs
    cdView.setUint32(38, 0, true); // external attrs
    cdView.setUint32(42, entry.offset, true); // local header offset
    cdEntry.set(entry.name, 46);
    parts.push(cdEntry);
    offset += cdEntry.length;
  }

  // End of central directory
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true); // disk number
  eocdView.setUint16(6, 0, true); // cd disk
  eocdView.setUint16(8, entries.length, true); // entries on disk
  eocdView.setUint16(10, entries.length, true); // total entries
  eocdView.setUint32(12, offset - cdStart, true); // cd size
  eocdView.setUint32(16, cdStart, true); // cd offset
  eocdView.setUint16(20, 0, true); // comment length
  parts.push(eocd);

  // Concatenate
  const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }
  return result;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
