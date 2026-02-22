/**
 * Gemini 3.1 Pro API integration for generating character portraits
 * and scene backgrounds from text descriptions.
 *
 * Uses the Gemini REST API with image generation capabilities.
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiImageResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType: string;
          data: string;
        };
        text?: string;
      }>;
    };
  }>;
  error?: {
    message: string;
    code: number;
  };
}

export type GenerationMode = 'character' | 'background' | 'prop';

function buildPrompt(description: string, mode: GenerationMode): string {
  const styleGuide =
    'Style: dark noir graphic novel, high contrast, dramatic shadows, ' +
    'comic book aesthetic, bold ink lines, limited color palette with deep ' +
    'blacks and moody accent colors. Film noir atmosphere.';

  switch (mode) {
    case 'character':
      return (
        `Generate a character portrait for a 2D cartoon/comic: ${description}. ` +
        `${styleGuide} The character should be drawn in a semi-realistic cartoon style ` +
        `suitable for animation. Transparent or solid color background. Full body or bust shot.`
      );
    case 'background':
      return (
        `Generate a scene background for a 2D animated cartoon: ${description}. ` +
        `${styleGuide} Wide 16:9 composition, atmospheric perspective, ` +
        `suitable as an animation backdrop. No characters in the scene.`
      );
    case 'prop':
      return (
        `Generate a prop/object for a 2D cartoon scene: ${description}. ` +
        `${styleGuide} Isolated object, clean edges suitable for compositing. ` +
        `Transparent or solid color background.`
      );
  }
}

export async function generateImage(
  apiKey: string,
  description: string,
  mode: GenerationMode
): Promise<string> {
  if (!apiKey) {
    throw new Error('Gemini API key is required. Add your key in the AI panel.');
  }

  const prompt = buildPrompt(description, mode);

  const response = await fetch(
    `${GEMINI_API_BASE}/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data: GeminiImageResponse = await response.json();

  if (data.error) {
    throw new Error(`Gemini API error: ${data.error.message}`);
  }

  // Extract image from response
  const candidates = data.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('No response from Gemini API');
  }

  const parts = candidates[0].content?.parts;
  if (!parts) {
    throw new Error('No content parts in Gemini response');
  }

  // Find the image part
  for (const part of parts) {
    if (part.inlineData) {
      const { mimeType, data: base64Data } = part.inlineData;
      return `data:${mimeType};base64,${base64Data}`;
    }
  }

  throw new Error(
    'No image generated. The model may have returned text only. Try a different description.'
  );
}

export async function generateSceneDescription(
  apiKey: string,
  prompt: string
): Promise<string> {
  const response = await fetch(
    `${GEMINI_API_BASE}/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a creative director for a noir-themed animated cartoon.
Given this scene concept, provide a brief cinematic description (2-3 sentences)
that could be used as direction for the scene: "${prompt}"`,
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No description generated.';
}
