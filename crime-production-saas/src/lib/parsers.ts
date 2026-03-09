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

function extractField(block: string, field: string): string {
  const regex = new RegExp(`${field}:\\s*(.+?)(?=\\n[A-Z_]+:|---END|$)`, "s");
  const match = block.match(regex);
  return match ? match[1].trim() : "";
}

export function parseVisualBlocks(raw: string): VisualBlock[] {
  const blocks = raw.split("---VISUAL_BLOCK---").filter((b) => b.includes("---END_BLOCK---"));
  return blocks.map((block, i) => ({
    sectionIndex: parseInt(extractField(block, "SECTION")) || i,
    scriptText: extractField(block, "SCRIPT"),
    layerType: extractField(block, "TYPE").toLowerCase(),
    directionText: extractField(block, "DIRECTION"),
    aiPrompt: extractField(block, "AI_PROMPT") || undefined,
    mediaLinks: extractField(block, "MEDIA_LINKS") || undefined,
    gfxSpecs: extractField(block, "GFX_SPECS") || undefined,
  }));
}

export function parseAudioSections(raw: string): AudioSection[] {
  const sections = raw.split("---AUDIO_SECTION---").filter((b) => b.includes("---END_SECTION---"));
  return sections.map((section, i) => ({
    sectionIndex: parseInt(extractField(section, "SECTION")) || i,
    scriptText: extractField(section, "SCRIPT"),
    musicMood: extractField(section, "MOOD"),
    musicBpmRange: extractField(section, "BPM"),
    musicSearchTerms: extractField(section, "SEARCH_TERMS"),
    sfxCues: extractField(section, "SFX") || undefined,
  }));
}

export function parseTimelineSegments(raw: string): TimelineSegmentData[] {
  const segments = raw.split("---SEGMENT---").filter((b) => b.includes("---END_SEGMENT---"));
  return segments.map((segment, i) => ({
    segmentIndex: parseInt(extractField(segment, "INDEX")) || i,
    startTime: extractField(segment, "START_TIME") || "00:00",
    durationSeconds: parseInt(extractField(segment, "DURATION")) || 30,
    narrationText: extractField(segment, "NARRATION"),
    visualLayers: extractField(segment, "VISUAL_LAYERS") || undefined,
    audioNotes: extractField(segment, "AUDIO_NOTES") || undefined,
  }));
}

export function parseProductionPackage(raw: string): ProductionPackageData {
  const titlesRaw = extractField(raw, "TITLES");
  const thumbsRaw = extractField(raw, "THUMBNAILS");
  const description = extractField(raw, "DESCRIPTION");
  const tags = extractField(raw, "TAGS");

  let titles: string[] = [];
  try {
    titles = JSON.parse(titlesRaw);
  } catch {
    titles = titlesRaw.split("\n").filter(Boolean).map((t) => t.replace(/^\d+\.\s*/, "").replace(/^["']|["']$/g, ""));
  }

  let thumbnailConcepts: Array<{ concept: string; textOverlay: string }> = [];
  try {
    thumbnailConcepts = JSON.parse(thumbsRaw);
  } catch {
    thumbnailConcepts = thumbsRaw
      .split("\n")
      .filter(Boolean)
      .map((t) => ({ concept: t, textOverlay: "" }));
  }

  return { titles, thumbnailConcepts, description, tags };
}
