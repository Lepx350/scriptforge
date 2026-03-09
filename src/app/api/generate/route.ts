import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateWithRetry, SYSTEM_PROMPTS } from "@/lib/gemini";
import {
  parseVisualBlocks,
  parseAudioSections,
  parseTimelineSegments,
  parseProductionPackage,
} from "@/lib/parsers";

type ModuleType = "visual" | "audio" | "timeline" | "production" | "all";

export async function POST(request: NextRequest) {
  try {
    const { projectId, module } = (await request.json()) as {
      projectId: string;
      module: ModuleType;
    };

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const script = project.inputScript;
    const results: Record<string, boolean> = {};

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "in_production" },
    });

    const modulesToRun: ModuleType[] =
      module === "all" ? ["visual", "audio", "timeline", "production"] : [module];

    for (const mod of modulesToRun) {
      try {
        switch (mod) {
          case "visual":
            await generateVisualDirection(projectId, script);
            results.visual = true;
            break;
          case "audio":
            await generateAudioDirection(projectId, script);
            results.audio = true;
            break;
          case "timeline":
            await generateTimeline(projectId, script);
            results.timeline = true;
            break;
          case "production":
            await generateProductionPackage(projectId, script);
            results.production = true;
            break;
        }
      } catch (error) {
        console.error(`Failed to generate ${mod}:`, error);
        results[mod] = false;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Generation error:", error);
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function generateVisualDirection(projectId: string, script: string) {
  // Clear existing
  await prisma.visualDirection.deleteMany({ where: { projectId } });

  // Pass 1: Visual Analysis
  const visualRaw = await generateWithRetry(
    SYSTEM_PROMPTS.visualAnalysis,
    `Here is the narration script. Analyze it and add visual direction tags:\n\n${script}`
  );

  const blocks = parseVisualBlocks(visualRaw);

  if (blocks.length === 0) {
    // Fallback: create a single block with the raw output
    await prisma.visualDirection.create({
      data: {
        projectId,
        sectionIndex: 0,
        scriptText: script.slice(0, 500),
        layerType: "3d",
        directionText: visualRaw,
      },
    });
    return;
  }

  for (const block of blocks) {
    await prisma.visualDirection.create({
      data: {
        projectId,
        sectionIndex: block.sectionIndex,
        scriptText: block.scriptText,
        layerType: block.layerType,
        directionText: block.directionText,
        aiPrompt: block.aiPrompt,
        mediaLinks: block.mediaLinks,
        gfxSpecs: block.gfxSpecs,
      },
    });
  }
}

async function generateAudioDirection(projectId: string, script: string) {
  await prisma.audioDirection.deleteMany({ where: { projectId } });

  const audioRaw = await generateWithRetry(
    SYSTEM_PROMPTS.audioDirection,
    `Here is the narration script. Provide audio direction for each section:\n\n${script}`
  );

  const sections = parseAudioSections(audioRaw);

  if (sections.length === 0) {
    await prisma.audioDirection.create({
      data: {
        projectId,
        sectionIndex: 0,
        scriptText: script.slice(0, 500),
        musicMood: "suspenseful",
        musicBpmRange: "80-120",
        musicSearchTerms: audioRaw,
      },
    });
    return;
  }

  for (const section of sections) {
    await prisma.audioDirection.create({
      data: {
        projectId,
        sectionIndex: section.sectionIndex,
        scriptText: section.scriptText,
        musicMood: section.musicMood,
        musicBpmRange: section.musicBpmRange,
        musicSearchTerms: section.musicSearchTerms,
        sfxCues: section.sfxCues,
      },
    });
  }
}

async function generateTimeline(projectId: string, script: string) {
  await prisma.timelineSegment.deleteMany({ where: { projectId } });

  const timelineRaw = await generateWithRetry(
    SYSTEM_PROMPTS.timelineSegmentation,
    `Break this script into timed editing segments:\n\n${script}`
  );

  const segments = parseTimelineSegments(timelineRaw);

  if (segments.length === 0) {
    const wordCount = script.split(/\s+/).filter(Boolean).length;
    await prisma.timelineSegment.create({
      data: {
        projectId,
        segmentIndex: 0,
        startTime: "00:00",
        durationSeconds: Math.ceil((wordCount / 150) * 60),
        narrationText: script,
      },
    });
    return;
  }

  for (const segment of segments) {
    await prisma.timelineSegment.create({
      data: {
        projectId,
        segmentIndex: segment.segmentIndex,
        startTime: segment.startTime,
        durationSeconds: segment.durationSeconds,
        narrationText: segment.narrationText,
        visualLayers: segment.visualLayers,
        audioNotes: segment.audioNotes,
      },
    });
  }
}

async function generateProductionPackage(projectId: string, script: string) {
  await prisma.productionPackage.deleteMany({ where: { projectId } });

  const packageRaw = await generateWithRetry(
    SYSTEM_PROMPTS.productionPackage,
    `Generate a YouTube production package for this true crime script:\n\n${script}`
  );

  const parsed = parseProductionPackage(packageRaw);

  await prisma.productionPackage.create({
    data: {
      projectId,
      titles: JSON.stringify(parsed.titles),
      thumbnailConcepts: JSON.stringify(parsed.thumbnailConcepts),
      description: parsed.description,
      tags: parsed.tags,
    },
  });
}
