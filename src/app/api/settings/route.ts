import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { testConnection, MODEL_CHAINS } from "@/lib/gemini";

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: "default" } });
    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: "default" },
      });
    }
    return NextResponse.json({
      geminiKey: settings.geminiKey
        ? "\u2022".repeat(8) + settings.geminiKey.slice(-4)
        : "",
      hasGeminiKey: !!settings.geminiKey,
      coreModel: settings.coreModel || MODEL_CHAINS.core[0],
      visualModel: settings.visualModel || MODEL_CHAINS.visual[0],
      defaultCoreModels: MODEL_CHAINS.core,
      defaultVisualModels: MODEL_CHAINS.visual,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Handle test connection
    if (body.action === "test") {
      const settings = await prisma.settings.findUnique({ where: { id: "default" } });
      const key = body.apiKey && !body.apiKey.startsWith("\u2022")
        ? body.apiKey
        : settings?.geminiKey;
      if (!key) {
        return NextResponse.json({ success: false, error: "No API key to test" });
      }
      const result = await testConnection(key);
      return NextResponse.json(result);
    }

    // Handle delete key
    if (body.action === "deleteKey") {
      await prisma.settings.update({
        where: { id: "default" },
        data: { geminiKey: null },
      });
      return NextResponse.json({ success: true });
    }

    // Normal save
    const data: Record<string, string | null> = {};

    if (body.geminiKey && !body.geminiKey.startsWith("\u2022")) {
      data.geminiKey = body.geminiKey;
    }
    if (body.coreModel !== undefined) {
      data.coreModel = body.coreModel || null;
    }
    if (body.visualModel !== undefined) {
      data.visualModel = body.visualModel || null;
    }

    await prisma.settings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
