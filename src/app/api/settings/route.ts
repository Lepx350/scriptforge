import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: "default" } });
    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: "default" },
      });
    }
    return NextResponse.json({
      geminiKey: settings.geminiKey ? "•".repeat(8) + settings.geminiKey.slice(-4) : "",
      elevenLabsKey: settings.elevenLabsKey ? "•".repeat(8) + settings.elevenLabsKey.slice(-4) : "",
      defaultVoice: settings.defaultVoice || "",
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data: Record<string, string> = {};

    // Only update keys that don't start with bullet chars (masked values)
    if (body.geminiKey && !body.geminiKey.startsWith("•")) {
      data.geminiKey = body.geminiKey;
    }
    if (body.elevenLabsKey && !body.elevenLabsKey.startsWith("•")) {
      data.elevenLabsKey = body.elevenLabsKey;
    }
    if (body.defaultVoice !== undefined) {
      data.defaultVoice = body.defaultVoice;
    }

    await prisma.settings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
