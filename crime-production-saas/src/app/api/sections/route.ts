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

    switch (model) {
      case "visual":
        await prisma.visualDirection.update({ where: { id }, data });
        break;
      case "audio":
        await prisma.audioDirection.update({ where: { id }, data });
        break;
      case "timeline":
        await prisma.timelineSegment.update({ where: { id }, data });
        break;
      case "production":
        await prisma.productionPackage.update({ where: { id }, data });
        break;
      default:
        return NextResponse.json({ error: "Invalid model" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Inline edit error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
