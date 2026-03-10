import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateWithRetry, SYSTEM_PROMPTS } from "@/lib/gemini";
import {
  parseVisualBlocks,
  parseAudioSections,
  parseTimelineSegments,
} from "@/lib/parsers";

/**
 * Regenerate a single section (visual direction, audio direction, or timeline segment)
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, module, sectionId } = (await request.json()) as {
      projectId: string;
      module: "visual" | "audio" | "timeline";
      sectionId: string;
    };

    if (!projectId || !module || !sectionId) {
      return NextResponse.json(
        { error: "projectId, module, and sectionId required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const script = project.inputScript;

    switch (module) {
      case "visual": {
        const existing = await prisma.visualDirection.findUnique({
          where: { id: sectionId },
        });
        if (!existing) {
          return NextResponse.json({ error: "Section not found" }, { status: 404 });
        }

        const prompt = `Regenerate ONLY ONE visual direction block for this specific script section. The original script context:\n\n${script}\n\nFocus specifically on this section text:\n"${existing.scriptText}"\n\nOriginal layer type: ${existing.layerType}\n\nReturn exactly ONE block in the standard format.`;

        const raw = await generateWithRetry(
          SYSTEM_PROMPTS.visualAnalysis,
          prompt,
          "visual"
        );
        const blocks = parseVisualBlocks(raw);
        const block = blocks[0];

        if (block) {
          await prisma.visualDirection.update({
            where: { id: sectionId },
            data: {
              directionText: block.directionText,
              aiPrompt: block.aiPrompt,
              mediaLinks: block.mediaLinks,
              gfxSpecs: block.gfxSpecs,
            },
          });
        }

        return NextResponse.json({ success: true });
      }

      case "audio": {
        const existing = await prisma.audioDirection.findUnique({
          where: { id: sectionId },
        });
        if (!existing) {
          return NextResponse.json({ error: "Section not found" }, { status: 404 });
        }

        const prompt = `Regenerate ONLY ONE audio direction section for this specific script section. The original script context:\n\n${script}\n\nFocus specifically on this section text:\n"${existing.scriptText}"\n\nReturn exactly ONE section in the standard format.`;

        const raw = await generateWithRetry(
          SYSTEM_PROMPTS.audioDirection,
          prompt,
          "core"
        );
        const sections = parseAudioSections(raw);
        const section = sections[0];

        if (section) {
          await prisma.audioDirection.update({
            where: { id: sectionId },
            data: {
              musicMood: section.musicMood,
              musicBpmRange: section.musicBpmRange,
              musicSearchTerms: section.musicSearchTerms,
              sfxCues: section.sfxCues,
            },
          });
        }

        return NextResponse.json({ success: true });
      }

      case "timeline": {
        const existing = await prisma.timelineSegment.findUnique({
          where: { id: sectionId },
        });
        if (!existing) {
          return NextResponse.json({ error: "Section not found" }, { status: 404 });
        }

        const prompt = `Regenerate ONLY ONE timeline segment for this specific part of the script. The original script context:\n\n${script}\n\nFocus specifically on this segment text:\n"${existing.narrationText}"\n\nReturn exactly ONE segment in the standard format.`;

        const raw = await generateWithRetry(
          SYSTEM_PROMPTS.timelineSegmentation,
          prompt,
          "core"
        );
        const segments = parseTimelineSegments(raw);
        const segment = segments[0];

        if (segment) {
          await prisma.timelineSegment.update({
            where: { id: sectionId },
            data: {
              narrationText: segment.narrationText,
              visualLayers: segment.visualLayers,
              audioNotes: segment.audioNotes,
            },
          });
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid module" }, { status: 400 });
    }
  } catch (error) {
    console.error("Section regeneration error:", error);
    const message = error instanceof Error ? error.message : "Regeneration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
