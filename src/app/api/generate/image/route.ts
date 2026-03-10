import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "@/lib/prisma";
import { getGeminiKey } from "@/lib/gemini";

const DEFAULT_IMAGE_MODEL = "gemini-3-pro-image-preview";
const IMAGE_TIMEOUT_MS = 55_000;

const ALLOWED_MODELS = new Set([
  "gemini-3-pro-image-preview",
  "gemini-3.1-flash-image-preview",
  "gemini-2.5-flash-image-preview",
]);

const FERN_STYLE_PREFIX = `3D rendered cinematic documentary scene. Faceless humanoid characters with smooth, featureless mannequin-like heads — no facial features, no eyes, no mouth. Stylized but realistic body proportions. Highly detailed 3D environment with realistic textures and materials. Cinematic camera angle with shallow depth of field. Desaturated color palette — muted tones, low saturation, slight teal-and-orange color grade. Dramatic single-source lighting with volumetric light rays and strong shadows. Moody, atmospheric, noir-documentary feel. Characters should be performing contextual actions (not standing still). Photorealistic rendering quality, Blender/Unreal Engine aesthetic.`;

// Aspect ratio to approximate pixel dimensions
function getAspectDimensions(
  aspectRatio: string,
  quality: string
): { width: number; height: number } | null {
  const size = parseInt(quality) || 1024;
  const ratios: Record<string, [number, number]> = {
    "16:9": [16, 9],
    "9:16": [9, 16],
    "1:1": [1, 1],
    "4:3": [4, 3],
    "21:9": [21, 9],
  };
  const ratio = ratios[aspectRatio];
  if (!ratio) return null;
  const [w, h] = ratio;
  // Scale so the larger dimension equals the quality size
  if (w >= h) {
    return { width: size, height: Math.round((size * h) / w) };
  }
  return { width: Math.round((size * w) / h), height: size };
}

async function generateSingleImage(
  genAI: GoogleGenerativeAI,
  modelName: string,
  prompt: string,
  aspectRatio?: string,
  quality?: string,
): Promise<{ imageBase64: string; mimeType: string }> {
  const generationConfig: Record<string, unknown> = {
    responseModalities: ["TEXT", "IMAGE"],
  };

  const dims = getAspectDimensions(aspectRatio || "16:9", quality || "1024");
  if (dims) {
    generationConfig.imageResolution = dims.width > 2048 || dims.height > 2048 ? "HIGH" : undefined;
  }

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig,
  });

  let imagePrompt = prompt;
  if (aspectRatio) {
    imagePrompt += `\n\nAspect ratio: ${aspectRatio}`;
  }

  const resultPromise = model.generateContent(imagePrompt);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error("Image generation is taking longer than expected, please try again")),
      IMAGE_TIMEOUT_MS
    )
  );

  const result = await Promise.race([resultPromise, timeoutPromise]);

  const candidates = result.response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No response from image model. The prompt may have been blocked by content policy.");
  }

  const parts = candidates[0].content.parts;
  for (const part of parts) {
    if (part.inlineData) {
      return {
        imageBase64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }

  throw new Error("Image couldn't be generated. The model returned text only. Try rephrasing the prompt.");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      visualDirectionId,
      prompt,
      model: requestedModel,
      quality,
      aspectRatio,
      variations,
      thumbnailMode,
    } = body as {
      visualDirectionId?: string;
      prompt: string;
      model?: string;
      quality?: string;
      aspectRatio?: string;
      variations?: number;
      thumbnailMode?: boolean;
    };

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // For visual directions, validate the direction exists and is 3D
    if (visualDirectionId && !thumbnailMode) {
      const direction = await prisma.visualDirection.findUnique({
        where: { id: visualDirectionId },
      });

      if (!direction) {
        return NextResponse.json({ error: "Visual direction not found" }, { status: 404 });
      }

      if (direction.layerType !== "3d") {
        return NextResponse.json(
          { error: "Image generation is only available for [3D] scenes" },
          { status: 400 }
        );
      }
    }

    const apiKey = await getGeminiKey();
    const genAI = new GoogleGenerativeAI(apiKey);

    const modelName = requestedModel && ALLOWED_MODELS.has(requestedModel)
      ? requestedModel
      : DEFAULT_IMAGE_MODEL;

    const numVariations = Math.min(Math.max(variations || 1, 1), 4);

    // Build the full prompt
    const imagePrompt = thumbnailMode
      ? `YouTube thumbnail design: ${prompt}`
      : `${FERN_STYLE_PREFIX}\n\nScene: ${prompt}`;

    // Generate all variations
    const results: Array<{ imageUrl: string; index: number }> = [];

    const generateOne = async (index: number) => {
      const { imageBase64, mimeType } = await generateSingleImage(
        genAI,
        modelName,
        imagePrompt,
        aspectRatio,
        quality,
      );
      return {
        imageUrl: `data:${mimeType};base64,${imageBase64}`,
        imageBase64,
        mimeType,
        index,
      };
    };

    // Run variations in parallel (capped at 4)
    const promises = Array.from({ length: numVariations }, (_, i) => generateOne(i));
    const settled = await Promise.allSettled(promises);

    for (const result of settled) {
      if (result.status === "fulfilled") {
        results.push({
          imageUrl: result.value.imageUrl,
          index: result.value.index,
        });
      }
    }

    if (results.length === 0) {
      // Get the error from the first rejected promise
      const firstError = settled.find((r) => r.status === "rejected");
      const errorMsg = firstError && firstError.status === "rejected"
        ? (firstError.reason as Error).message
        : "All image generation attempts failed";
      return NextResponse.json({ error: errorMsg }, { status: 422 });
    }

    // If only 1 variation and we have a visualDirectionId, auto-save it
    if (numVariations === 1 && visualDirectionId && !thumbnailMode && results.length === 1) {
      const first = settled.find((r) => r.status === "fulfilled");
      if (first && first.status === "fulfilled") {
        const { imageBase64, mimeType } = first.value;
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
          imageUrl = null;
        }

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
          images: [{
            imageUrl: imageUrl || `data:${mimeType};base64,${imageBase64}`,
            index: 0,
          }],
          autoSaved: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      images: results.sort((a, b) => a.index - b.index),
    });
  } catch (error) {
    console.error("Image generation error:", error);
    const message = error instanceof Error ? error.message : "Image generation failed";

    if (
      message.includes("SAFETY") ||
      message.includes("blocked") ||
      message.includes("policy")
    ) {
      return NextResponse.json(
        { error: "Image couldn't be generated due to content policy. Try modifying the prompt." },
        { status: 422 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Save a selected image to a visual direction or thumbnail
export async function PUT(request: NextRequest) {
  try {
    const { visualDirectionId, imageUrl, prompt } = await request.json();

    if (!visualDirectionId || !imageUrl) {
      return NextResponse.json({ error: "visualDirectionId and imageUrl required" }, { status: 400 });
    }

    // If it's a data URL, try to upload to Vercel Blob
    let finalUrl = imageUrl;
    if (imageUrl.startsWith("data:")) {
      const base64Match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        const [, mimeType, base64Data] = base64Match;
        try {
          const { put } = await import("@vercel/blob");
          const buffer = Buffer.from(base64Data, "base64");
          const ext = mimeType.includes("png") ? "png" : "jpeg";
          const blob = await put(
            `scene-images/${visualDirectionId}.${ext}`,
            buffer,
            { access: "public", contentType: mimeType }
          );
          finalUrl = blob.url;
        } catch {
          // Keep as data URL, store base64 in DB
          await prisma.visualDirection.update({
            where: { id: visualDirectionId },
            data: {
              imageUrl: null,
              imageBase64: base64Data,
              ...(prompt ? { aiPrompt: prompt } : {}),
            },
          });
          return NextResponse.json({ success: true, imageUrl: imageUrl });
        }
      }
    }

    await prisma.visualDirection.update({
      where: { id: visualDirectionId },
      data: {
        imageUrl: finalUrl,
        imageBase64: null,
        ...(prompt ? { aiPrompt: prompt } : {}),
      },
    });

    return NextResponse.json({ success: true, imageUrl: finalUrl });
  } catch (error) {
    console.error("Save image error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save image" },
      { status: 500 }
    );
  }
}
