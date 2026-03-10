export interface VisualBlock {
  sectionIndex: number;
  scriptText: string;
  layerType: string;
  directionText: string;
  aiPrompt?: string;
  mediaLinks?: string;
  gfxSpecs?: string;
}

export interface AudioSection {
  sectionIndex: number;
  scriptText: string;
  musicMood: string;
  musicBpmRange: string;
  musicSearchTerms: string;
  sfxCues?: string;
}

export interface TimelineSegmentData {
  segmentIndex: number;
  startTime: string;
  durationSeconds: number;
  narrationText: string;
  visualLayers?: string;
  audioNotes?: string;
}

export interface ProductionPackageData {
  titles: string[];
  thumbnailConcepts: Array<{ concept: string; textOverlay: string }>;
  description: string;
  tags: string;
}

/**
 * Strip markdown code fences from raw Gemini output
 */
function stripCodeFences(raw: string): string {
  return raw.replace(/```[\w]*\n?/g, "").trim();
}

/**
 * Extract a field value from a delimited block.
 * Case-insensitive, handles flexible whitespace.
 */
function extractField(block: string, field: string): string {
  const regex = new RegExp(
    `${field}\\s*:\\s*(.+?)(?=\\n\\s*[A-Z_]+\\s*:|---END|$)`,
    "is"
  );
  const match = block.match(regex);
  return match ? match[1].trim() : "";
}

export class ParseError extends Error {
  constructor(module: string) {
    super(
      `Failed to parse ${module} output from Gemini. The model returned an unexpected format. Please try regenerating.`
    );
    this.name = "ParseError";
  }
}

export function parseVisualBlocks(raw: string): VisualBlock[] {
  const cleaned = stripCodeFences(raw);

  const blocks = cleaned
    .split(/---\s*VISUAL_BLOCK\s*---/i)
    .filter((b) => /---\s*END_BLOCK\s*---/i.test(b));

  if (blocks.length > 0) {
    return blocks.map((block, i) => ({
      sectionIndex: parseInt(extractField(block, "SECTION")) || i,
      scriptText: extractField(block, "SCRIPT"),
      layerType: extractField(block, "TYPE").toLowerCase().replace(/[\[\]]/g, ""),
      directionText: extractField(block, "DIRECTION"),
      aiPrompt: extractField(block, "AI_PROMPT") || undefined,
      mediaLinks: extractField(block, "MEDIA_LINKS") || undefined,
      gfxSpecs: extractField(block, "GFX_SPECS") || undefined,
    }));
  }

  // JSON fallback
  try {
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const arr = JSON.parse(jsonMatch[0]);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map((item: Record<string, unknown>, i: number) => ({
          sectionIndex: (item.sectionIndex as number) ?? (item.section as number) ?? i,
          scriptText: (item.scriptText as string) ?? (item.script as string) ?? "",
          layerType: ((item.layerType as string) ?? (item.type as string) ?? "3d").toLowerCase().replace(/[\[\]]/g, ""),
          directionText: (item.directionText as string) ?? (item.direction as string) ?? "",
          aiPrompt: (item.aiPrompt as string) ?? (item.ai_prompt as string) ?? undefined,
          mediaLinks: (item.mediaLinks as string) ?? (item.media_links as string) ?? undefined,
          gfxSpecs: (item.gfxSpecs as string) ?? (item.gfx_specs as string) ?? undefined,
        }));
      }
    }
  } catch {}

  throw new ParseError("visual direction");
}

export function parseAudioSections(raw: string): AudioSection[] {
  const cleaned = stripCodeFences(raw);

  const sections = cleaned
    .split(/---\s*AUDIO_SECTION\s*---/i)
    .filter((b) => /---\s*END_SECTION\s*---/i.test(b));

  if (sections.length > 0) {
    return sections.map((section, i) => ({
      sectionIndex: parseInt(extractField(section, "SECTION")) || i,
      scriptText: extractField(section, "SCRIPT"),
      musicMood: extractField(section, "MOOD"),
      musicBpmRange: extractField(section, "BPM"),
      musicSearchTerms: extractField(section, "SEARCH_TERMS"),
      sfxCues: extractField(section, "SFX") || undefined,
    }));
  }

  // JSON fallback
  try {
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const arr = JSON.parse(jsonMatch[0]);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map((item: Record<string, unknown>, i: number) => ({
          sectionIndex: (item.sectionIndex as number) ?? (item.section as number) ?? i,
          scriptText: (item.scriptText as string) ?? (item.script as string) ?? "",
          musicMood: (item.musicMood as string) ?? (item.mood as string) ?? "neutral",
          musicBpmRange: (item.musicBpmRange as string) ?? (item.bpm as string) ?? "",
          musicSearchTerms: (item.musicSearchTerms as string) ?? (item.searchTerms as string) ?? (item.search_terms as string) ?? "",
          sfxCues: (item.sfxCues as string) ?? (item.sfx as string) ?? undefined,
        }));
      }
    }
  } catch {}

  throw new ParseError("audio direction");
}

export function parseTimelineSegments(raw: string): TimelineSegmentData[] {
  const cleaned = stripCodeFences(raw);

  const segments = cleaned
    .split(/---\s*SEGMENT\s*---/i)
    .filter((b) => /---\s*END_SEGMENT\s*---/i.test(b));

  if (segments.length > 0) {
    return segments.map((segment, i) => ({
      segmentIndex: parseInt(extractField(segment, "INDEX")) || i,
      startTime: extractField(segment, "START_TIME") || "00:00",
      durationSeconds: parseInt(extractField(segment, "DURATION")) || 30,
      narrationText: extractField(segment, "NARRATION"),
      visualLayers: extractField(segment, "VISUAL_LAYERS") || undefined,
      audioNotes: extractField(segment, "AUDIO_NOTES") || undefined,
    }));
  }

  // JSON fallback
  try {
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const arr = JSON.parse(jsonMatch[0]);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map((item: Record<string, unknown>, i: number) => ({
          segmentIndex: (item.segmentIndex as number) ?? (item.index as number) ?? i,
          startTime: (item.startTime as string) ?? (item.start_time as string) ?? "00:00",
          durationSeconds: (item.durationSeconds as number) ?? (item.duration as number) ?? 30,
          narrationText: (item.narrationText as string) ?? (item.narration as string) ?? "",
          visualLayers: (item.visualLayers as string) ?? (item.visual_layers as string) ?? undefined,
          audioNotes: (item.audioNotes as string) ?? (item.audio_notes as string) ?? undefined,
        }));
      }
    }
  } catch {}

  throw new ParseError("timeline");
}

export function parseProductionPackage(raw: string): ProductionPackageData {
  const cleaned = stripCodeFences(raw);

  const titlesRaw = extractField(cleaned, "TITLES");
  const thumbsRaw = extractField(cleaned, "THUMBNAILS");
  const description = extractField(cleaned, "DESCRIPTION");
  const tags = extractField(cleaned, "TAGS");

  if (titlesRaw || description) {
    let titles: string[] = [];
    try {
      titles = JSON.parse(titlesRaw);
    } catch {
      titles = titlesRaw
        .split("\n")
        .filter(Boolean)
        .map((t) => t.replace(/^\d+\.\s*/, "").replace(/^["']|["']$/g, "").trim())
        .filter(Boolean);
    }

    let thumbnailConcepts: Array<{ concept: string; textOverlay: string }> = [];
    try {
      thumbnailConcepts = JSON.parse(thumbsRaw);
    } catch {
      thumbnailConcepts = thumbsRaw
        .split("\n")
        .filter(Boolean)
        .map((t) => ({ concept: t.trim(), textOverlay: "" }));
    }

    return { titles, thumbnailConcepts, description, tags };
  }

  // Full JSON fallback
  try {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const obj = JSON.parse(jsonMatch[0]);
      return {
        titles: Array.isArray(obj.titles) ? obj.titles : [],
        thumbnailConcepts: Array.isArray(obj.thumbnailConcepts || obj.thumbnails)
          ? (obj.thumbnailConcepts || obj.thumbnails).map((t: unknown) =>
              typeof t === "string" ? { concept: t, textOverlay: "" } : (t as { concept: string; textOverlay: string })
            )
          : [],
        description: obj.description || "",
        tags: Array.isArray(obj.tags) ? obj.tags.join(", ") : obj.tags || "",
      };
    }
  } catch {}

  throw new ParseError("production package");
}
