import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateWithRetry, streamGeneration, SYSTEM_PROMPTS } from "@/lib/gemini";
import {
  parseVisualBlocks,
  parseAudioSections,
  parseTimelineSegments,
  parseProductionPackage,
  ParseError,
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
    const errors: Record<string, string> = {};

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
        errors[mod] =
          error instanceof ParseError
            ? error.message
            : error instanceof Error
              ? error.message
              : `Generation of ${mod} failed`;
      }
    }

    // Auto-transition to editing when all 4 modules complete
    const allComplete =
      modulesToRun.length === 4 && Object.values(results).every((v) => v === true);
    if (allComplete) {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "editing" },
      });
    }

    const hasErrors = Object.keys(errors).length > 0;
    return NextResponse.json({
      success: !hasErrors,
      results,
      ...(hasErrors && { errors }),
    });
  } catch (error) {
    console.error("Generation error:", error);
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Streaming endpoint for real-time generation output
export async function PUT(request: NextRequest) {
  try {
    const { projectId, module } = (await request.json()) as {
      projectId: string;
      module: string;
    };

    if (!projectId || !module) {
      return NextResponse.json({ error: "projectId and module required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const script = project.inputScript;
    const purpose = module === "visual" ? "visual" : "core";

    let systemPrompt: string;
    let userPrompt: string;

    switch (module) {
      case "visual":
        systemPrompt = SYSTEM_PROMPTS.visualAnalysis;
        userPrompt = `Here is the narration script. Analyze it and add visual direction tags:\n\n${script}`;
        break;
      case "audio":
        systemPrompt = SYSTEM_PROMPTS.audioDirection;
        userPrompt = `Here is the narration script. Provide audio direction for each section:\n\n${script}`;
        break;
      case "timeline":
        systemPrompt = SYSTEM_PROMPTS.timelineSegmentation;
        userPrompt = `Break this script into timed editing segments:\n\n${script}`;
        break;
      case "production":
        systemPrompt = SYSTEM_PROMPTS.productionPackage;
        userPrompt = `Generate a YouTube production package for this true crime script:\n\n${script}`;
        break;
      default:
        return NextResponse.json({ error: "Invalid module" }, { status: 400 });
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "in_production" },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullText = "";
          const gen = streamGeneration(systemPrompt, userPrompt, purpose as "core" | "visual");

          for await (const chunk of gen) {
            fullText += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ chunk, partial: true })}\n\n`)
            );
          }

          // Parse and save the complete output
          let parseResult: { success: boolean; error?: string } = { success: true };
          try {
            switch (module) {
              case "visual":
                await saveVisualDirection(projectId, fullText);
                break;
              case "audio":
                await saveAudioDirection(projectId, fullText);
                break;
              case "timeline":
                await saveTimeline(projectId, fullText);
                break;
              case "production":
                await saveProductionPackage(projectId, fullText);
                break;
            }
          } catch (err) {
            parseResult = {
              success: false,
              error: err instanceof Error ? err.message : "Failed to parse output",
            };
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, ...parseResult })}\n\n`
            )
          );
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Stream failed";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, success: false, error: msg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Streaming failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function saveVisualDirection(projectId: string, raw: string) {
  await prisma.visualDirection.deleteMany({ where: { projectId } });
  const blocks = parseVisualBlocks(raw);
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

async function saveAudioDirection(projectId: string, raw: string) {
  await prisma.audioDirection.deleteMany({ where: { projectId } });
  const sections = parseAudioSections(raw);
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

async function saveTimeline(projectId: string, raw: string) {
  await prisma.timelineSegment.deleteMany({ where: { projectId } });
  const segments = parseTimelineSegments(raw);
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

async function saveProductionPackage(projectId: string, raw: string) {
  await prisma.productionPackage.deleteMany({ where: { projectId } });
  const parsed = parseProductionPackage(raw);
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

async function generateVisualDirection(projectId: string, script: string) {
  const raw = await generateWithRetry(
    SYSTEM_PROMPTS.visualAnalysis,
    `Here is the narration script. Analyze it and add visual direction tags:\n\n${script}`,
    "visual"
  );
  await saveVisualDirection(projectId, raw);
}

async function generateAudioDirection(projectId: string, script: string) {
  const raw = await generateWithRetry(
    SYSTEM_PROMPTS.audioDirection,
    `Here is the narration script. Provide audio direction for each section:\n\n${script}`,
    "core"
  );
  await saveAudioDirection(projectId, raw);
}

async function generateTimeline(projectId: string, script: string) {
  const raw = await generateWithRetry(
    SYSTEM_PROMPTS.timelineSegmentation,
    `Break this script into timed editing segments:\n\n${script}`,
    "core"
  );
  await saveTimeline(projectId, raw);
}

async function generateProductionPackage(projectId: string, script: string) {
  const raw = await generateWithRetry(
    SYSTEM_PROMPTS.productionPackage,
    `Generate a YouTube production package for this true crime script:\n\n${script}`,
    "core"
  );
  await saveProductionPackage(projectId, raw);
}
