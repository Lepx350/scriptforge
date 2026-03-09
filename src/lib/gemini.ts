import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "./prisma";

async function getGeminiKey(): Promise<string> {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!settings?.geminiKey) {
    throw new Error("Gemini API key not configured. Please add your API key in Settings.");
  }
  return settings.geminiKey;
}

async function getModel(systemInstruction?: string) {
  const apiKey = await getGeminiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-2.5-pro-preview-05-06",
    systemInstruction,
  });
}

async function generateWithRetry(
  systemPrompt: string,
  userPrompt: string,
  maxRetries = 3
): Promise<string> {
  const model = await getModel(systemPrompt);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.generateContent(userPrompt);
      return result.response.text();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt + 1) * 1000));
      }
    }
  }
  throw lastError;
}

// System prompts for each pipeline pass
const SYSTEM_PROMPTS = {
  visualAnalysis: `You are a video production director specializing in true crime and investigative YouTube content. Your job is to read a narration script and add visual direction tags for every section.

You work with 3 visual layers:
- [3D] — AI-generated cinematic visuals (recreations, abstract concepts, establishing shots)
- [MEDIA] — Real-world footage (news clips, court footage, photos, stock footage)
- [GFX] — Motion graphics (timelines, data viz, relationship maps, text overlays)

Rules:
- Every 2-3 sentences of narration MUST have at least one visual tag
- High-impact moments should stack 2-3 layers
- Be extremely specific in descriptions — an editor should never have to guess what goes on screen
- For [MEDIA] tags, include the specific event/date/person to search for
- For [GFX] tags, include exact data, numbers, and text to display
- For [3D] tags, include mood, lighting, camera angle, and color palette
- Balance the three layers throughout — don't overuse any single type
- Place tags inline, right after the narration they accompany

Output format: Return the script with visual tags inserted. Use this exact format for each tag:
---VISUAL_BLOCK---
SECTION: [section number]
SCRIPT: [the narration text this visual accompanies]
TYPE: [3D|MEDIA|GFX]
DIRECTION: [detailed visual direction]
AI_PROMPT: [for 3D only: ready-to-use image generation prompt]
MEDIA_LINKS: [for MEDIA only: search terms, suggested sources]
GFX_SPECS: [for GFX only: exact data, format, animation specs]
---END_BLOCK---`,

  promptGeneration: `You are an expert AI image and video prompt engineer. Given visual scene descriptions from a true crime video, generate optimized prompts for AI image generation tools.

For each scene, provide:
1. A detailed Gemini/Midjourney image generation prompt (include: composition, mood, lighting, camera angle, color palette, style keywords, quality tags)
2. Kling/Runway I2V animation notes (camera movement, duration, style)

Be specific and cinematic. These are for true crime content — think dark, dramatic, suspenseful tones.`,

  mediaResearch: `You are a video research assistant. Given a list of media footage descriptions needed for a true crime YouTube video, find real sources.

For each item:
1. Suggest specific YouTube search queries to find news coverage, press conferences, documentaries
2. Suggest news article search terms for relevant photos
3. Suggest specific stock footage search terms for sites like Pexels, Storyblocks
4. Note any copyright considerations

Provide multiple options per item when possible. Include specific search queries that would yield the best results.

Output format for each item:
---MEDIA_ITEM---
ORIGINAL: [the original media description]
YOUTUBE_SEARCH: [specific YouTube search queries]
NEWS_SEARCH: [news article search queries]
STOCK_SEARCH: [stock footage search terms]
COPYRIGHT_NOTES: [any copyright considerations]
---END_ITEM---`,

  gfxBrief: `You are a motion graphics designer specializing in documentary and true crime content. Given visual direction tags for GFX elements, create detailed motion design briefs.

For each GFX element, provide:
1. Exact data/text to display
2. Visual format (timeline, counter, org chart, map, etc.)
3. Animation style and timing
4. Color scheme suggestion
5. Font recommendations
6. Duration and keyframe notes

Output format for each:
---GFX_BRIEF---
ORIGINAL: [original GFX description]
TYPE: [timeline|counter|org_chart|map|comparison|text_overlay|data_viz]
DATA: [exact data/text to display]
ANIMATION: [animation style and timing details]
COLORS: [color scheme]
FONT: [font recommendations]
DURATION: [suggested duration]
NOTES: [additional production notes]
---END_BRIEF---`,

  audioDirection: `You are a music supervisor and sound designer for YouTube true crime content. Read the script and provide audio direction.

For each section provide:
1. Background music mood (tense, suspenseful, emotional, hopeful, dark, building, neutral)
2. BPM range
3. Search terms for royalty-free music libraries (Epidemic Sound, Artlist, YouTube Audio Library)
4. Specific sound effect cues with exact placement (at which word/phrase the SFX should hit)
5. Any silence/pause recommendations for dramatic effect

Think about audio storytelling — the music and SFX should enhance the narrative arc, not just fill space.

Output format for each section:
---AUDIO_SECTION---
SECTION: [section number]
SCRIPT: [the narration text]
MOOD: [music mood]
BPM: [BPM range]
SEARCH_TERMS: [music search terms]
SFX: [sound effects with placement]
NOTES: [additional audio notes]
---END_SECTION---`,

  timelineSegmentation: `You are a video editor specializing in YouTube true crime content. Break this script into timed segments for video editing.

For each segment:
- Calculate duration based on ~150 words per minute narration speed
- Include the narration text
- Note which visual layers apply
- Include audio cues
- Calculate cumulative timestamps

Output format:
---SEGMENT---
INDEX: [segment number, starting at 0]
START_TIME: [MM:SS format]
DURATION: [duration in seconds]
NARRATION: [the script text for this segment]
VISUAL_LAYERS: [JSON array of visual layer types used]
AUDIO_NOTES: [music mood + any SFX for this segment]
---END_SEGMENT---`,

  productionPackage: `You are a YouTube SEO and content strategy expert specializing in true crime content. Given a video script, generate a complete production package.

Provide:
1. 5 title options (mix of curiosity-driven, SEO-optimized, and emotional hooks) — aim for high CTR
2. 3 thumbnail concepts (describe the visual composition, text overlay, colors, emotion)
3. A YouTube description (first 2 lines are crucial — include hook + keywords, then full description with timestamps placeholder, relevant links placeholder, hashtags)
4. 30 relevant tags/keywords for YouTube SEO

Output format:
---PACKAGE---
TITLES: [JSON array of 5 title strings]
THUMBNAILS: [JSON array of 3 thumbnail concept objects with "concept" and "textOverlay" fields]
DESCRIPTION: [full YouTube description text]
TAGS: [comma-separated tags]
---END_PACKAGE---`,
};

export { generateWithRetry, SYSTEM_PROMPTS, getGeminiKey };
