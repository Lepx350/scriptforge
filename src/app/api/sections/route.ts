import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * PATCH: Update individual fields of visual directions, audio directions,
 * timeline segments, or production packages inline.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { model, id, data } = (await request.json()) as {
      model: "visual" | "audio" | "timeline" | "production";
      id: string;
      data: Record<string, unknown>;
    };

    if (!model || !id || !data) {
      return NextResponse.json(
        { error: "model, id, and data required" },
        { status: 400 }
      );
    }

    // Whitelist allowed fields per model to prevent mass assignment
    const allowedFields: Record<string, string[]> = {
      visual: ["scriptText", "directionText", "aiPrompt", "mediaLinks", "gfxSpecs"],
      audio: ["scriptText", "musicMood", "musicBpmRange", "musicSearchTerms", "sfxCues"],
      timeline: ["startTime", "durationSeconds", "narrationText", "visualLayers", "audioNotes"],
      production: ["titles", "thumbnailConcepts", "description", "tags"],
    };

    const fields = allowedFields[model];
    if (!fields) {
      return NextResponse.json({ error: "Invalid model" }, { status: 400 });
    }

    const sanitized: Record<string, unknown> = {};
    for (const key of fields) {
      if (key in data) sanitized[key] = data[key];
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    switch (model) {
      case "visual":
        await prisma.visualDirection.update({ where: { id }, data: sanitized });
        break;
      case "audio":
        await prisma.audioDirection.update({ where: { id }, data: sanitized });
        break;
      case "timeline":
        await prisma.timelineSegment.update({ where: { id }, data: sanitized });
        break;
      case "production":
        await prisma.productionPackage.update({ where: { id }, data: sanitized });
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Inline edit error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
