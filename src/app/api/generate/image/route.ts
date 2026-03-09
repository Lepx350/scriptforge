import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "@/lib/prisma";
import { getGeminiKey } from "@/lib/gemini";

const IMAGE_MODEL = "gemini-3-pro-image-preview";
const IMAGE_TIMEOUT_MS = 55_000;

export async function POST(request: NextRequest) {
  try {
    const { visualDirectionId, prompt } = (await request.json()) as {
      visualDirectionId: string;
      prompt: string;
    };

    if (!visualDirectionId || !prompt) {
      return NextResponse.json(
        { error: "visualDirectionId and prompt are required" },
        { status: 400 }
      );
    }

    const direction = await prisma.visualDirection.findUnique({
      where: { id: visualDirectionId },
    });

    if (!direction) {
      return NextResponse.json(
        { error: "Visual direction not found" },
        { status: 404 }
      );
    }

    if (direction.layerType !== "3d") {
      return NextResponse.json(
        { error: "Image generation is only available for [3D] scenes" },
        { status: 400 }
      );
    }

    const apiKey = await getGeminiKey();
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: IMAGE_MODEL,
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      } as Record<string, unknown>,
    });

    const imagePrompt = `Generate a cinematic image for a true crime video scene: ${prompt}`;

    const resultPromise = model.generateContent(imagePrompt);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              "Image generation is taking longer than expected, please try again"
            )
          ),
        IMAGE_TIMEOUT_MS
      )
    );

    const result = await Promise.race([resultPromise, timeoutPromise]);

    // Extract image from response
    const candidates = result.response.candidates;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: "No response from image model. The prompt may have been blocked by content policy." },
        { status: 422 }
      );
    }

    const parts = candidates[0].content.parts;
    let imageBase64: string | null = null;
    let mimeType = "image/png";

    for (const part of parts) {
      if (part.inlineData) {
        imageBase64 = part.inlineData.data;
        mimeType = part.inlineData.mimeType || "image/png";
        break;
      }
    }

    if (!imageBase64) {
      return NextResponse.json(
        {
          error:
            "Image couldn't be generated for this scene. The model returned text only. Try rephrasing the prompt.",
        },
        { status: 422 }
      );
    }

    // Try Vercel Blob storage first, fall back to base64 in DB
    let imageUrl: string | null = null;

    try {
      const { put } = await import("@vercel/blob");
      const buffer = Buffer.from(imageBase64, "base64");
      const ext = mimeType.includes("png") ? "png" : "jpeg";
      const blob = await put(
        `scene-images/${visualDirectionId}.${ext}`,
        buffer,
        { access: "public", contentType: mimeType }
      );
      imageUrl = blob.url;
    } catch {
      // Vercel Blob not available — store as base64
      imageUrl = null;
    }

    // Update the visual direction record
    await prisma.visualDirection.update({
      where: { id: visualDirectionId },
      data: {
        imageUrl: imageUrl,
        imageBase64: imageUrl ? null : imageBase64,
        aiPrompt: prompt,
      },
    });

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl || `data:${mimeType};base64,${imageBase64}`,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    const message =
      error instanceof Error ? error.message : "Image generation failed";

    // Detect content policy blocks
    if (
      message.includes("SAFETY") ||
      message.includes("blocked") ||
      message.includes("policy")
    ) {
      return NextResponse.json(
        {
          error:
            "Image couldn't be generated for this scene due to content policy. Try modifying the prompt.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
