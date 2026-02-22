import type { Scene, SceneAsset, SpeechBubble, Transform, Asset, BubbleStyle } from '../types';
import { getInterpolatedTransform } from './tweenEngine';

// Canvas constants
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const ASPECT_RATIO = 16 / 9;

// Image cache
const imageCache = new Map<string, HTMLImageElement>();

function loadImage(url: string): Promise<HTMLImageElement> {
  if (imageCache.has(url)) {
    return Promise.resolve(imageCache.get(url)!);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function getImageSync(url: string): HTMLImageElement | null {
  return imageCache.get(url) || null;
}

export function preloadSceneImages(scene: Scene, assetLibrary: Asset[]): void {
  if (scene.backgroundUrl) {
    loadImage(scene.backgroundUrl);
  }
  for (const sceneAsset of scene.assets) {
    const asset = assetLibrary.find((a) => a.id === sceneAsset.assetId);
    if (asset) {
      loadImage(asset.imageUrl);
    }
  }
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  const gridSize = 60;

  for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }

  // Center crosshair
  ctx.strokeStyle = 'rgba(255, 200, 50, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH / 2, 0);
  ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
  ctx.moveTo(0, CANVAS_HEIGHT / 2);
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
  ctx.stroke();
}

function drawAsset(
  ctx: CanvasRenderingContext2D,
  sceneAsset: SceneAsset,
  asset: Asset,
  transform: Transform,
  isSelected: boolean
) {
  const img = getImageSync(asset.imageUrl);

  ctx.save();
  ctx.globalAlpha = transform.opacity;
  ctx.translate(transform.x + (asset.width * transform.scaleX) / 2, transform.y + (asset.height * transform.scaleY) / 2);
  ctx.rotate((transform.rotation * Math.PI) / 180);

  const w = asset.width * transform.scaleX;
  const h = asset.height * transform.scaleY;

  if (img) {
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    // Placeholder
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#ccc';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(asset.name, 0, 5);
  }

  if (isSelected && sceneAsset.visible) {
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8);
    ctx.setLineDash([]);

    // Corner handles
    const handleSize = 10;
    ctx.fillStyle = '#ffd700';
    const corners = [
      [-w / 2 - 4, -h / 2 - 4],
      [w / 2 - 4, -h / 2 - 4],
      [-w / 2 - 4, h / 2 - 4],
      [w / 2 - 4, h / 2 - 4],
    ];
    for (const [cx, cy] of corners) {
      ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    }
  }

  ctx.restore();
}

function drawBubblePath(
  ctx: CanvasRenderingContext2D,
  bubble: SpeechBubble,
  style: BubbleStyle
) {
  const { x, y, width, height, tailX, tailY } = bubble;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const rx = width / 2;
  const ry = height / 2;

  ctx.beginPath();

  if (style === 'thought') {
    // Bumpy cloud shape
    const bumps = 12;
    for (let i = 0; i <= bumps; i++) {
      const angle = (i / bumps) * Math.PI * 2;
      const bumpRadius = 0.85 + 0.15 * Math.sin(i * 3);
      const px = cx + rx * bumpRadius * Math.cos(angle);
      const py = cy + ry * bumpRadius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    // Thought dots leading to tail
    ctx.fill();
    ctx.stroke();

    const dx = tailX - cx;
    const dy = tailY - cy;
    for (let i = 1; i <= 3; i++) {
      const t = i * 0.3;
      const dotX = cx + dx * t;
      const dotY = cy + dy * t;
      const dotR = 12 - i * 3;
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    return;
  }

  if (style === 'shout') {
    // Spiky starburst
    const spikes = 16;
    for (let i = 0; i <= spikes * 2; i++) {
      const angle = (i / (spikes * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? 1.0 : 0.8;
      const px = cx + rx * r * Math.cos(angle);
      const py = cy * r + ry * Math.sin(angle) * r + y * (1 - r);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else {
    // Standard rounded rectangle for speech/whisper/narration
    const radius = style === 'narration' ? 4 : 20;
    ctx.roundRect(x, y, width, height, radius);
    ctx.closePath();

    // Tail for speech
    if (style === 'speech' || style === 'whisper') {
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      const tailBase = 20;
      const edgeX = cx;
      const edgeY = y + height;
      ctx.moveTo(edgeX - tailBase / 2, edgeY - 2);
      ctx.lineTo(tailX, tailY);
      ctx.lineTo(edgeX + tailBase / 2, edgeY - 2);
      ctx.closePath();
    }
  }
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  bubble: SpeechBubble,
  isSelected: boolean
) {
  ctx.save();

  ctx.fillStyle = bubble.backgroundColor;
  ctx.strokeStyle = bubble.color;
  ctx.lineWidth = bubble.style === 'shout' ? 4 : 2.5;

  if (bubble.style === 'whisper') {
    ctx.setLineDash([6, 4]);
  }

  drawBubblePath(ctx, bubble, bubble.style);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  // Text
  ctx.fillStyle = bubble.color;
  ctx.font = `${bubble.style === 'shout' ? 'bold ' : ''}${bubble.fontSize}px 'Comic Sans MS', 'Bangers', cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (bubble.style === 'narration') {
    ctx.font = `italic ${bubble.fontSize}px Georgia, serif`;
  }

  // Word wrap
  const maxWidth = bubble.width - 24;
  const words = bubble.text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = bubble.fontSize * 1.3;
  const totalHeight = lines.length * lineHeight;
  const startY = bubble.y + bubble.height / 2 - totalHeight / 2 + lineHeight / 2;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], bubble.x + bubble.width / 2, startY + i * lineHeight);
  }

  if (isSelected) {
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(bubble.x - 4, bubble.y - 4, bubble.width + 8, bubble.height + 8);
    ctx.setLineDash([]);
  }

  ctx.restore();
}

export interface RenderOptions {
  showGrid: boolean;
  selectedAssetId: string | null;
  selectedBubbleId: string | null;
  currentTime: number;
  isPlaying: boolean;
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  assetLibrary: Asset[],
  options: RenderOptions
) {
  const { showGrid, selectedAssetId, selectedBubbleId, currentTime } = options;

  // Clear
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Background
  if (scene.backgroundUrl) {
    const bgImg = getImageSync(scene.backgroundUrl);
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      ctx.fillStyle = scene.backgroundColor;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  } else {
    ctx.fillStyle = scene.backgroundColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // Vignette overlay for noir feel
  const gradient = ctx.createRadialGradient(
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.3,
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.75
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (showGrid) drawGrid(ctx);

  // Sort assets by zIndex
  const sortedAssets = [...scene.assets]
    .filter((a) => a.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  // Draw assets
  for (const sceneAsset of sortedAssets) {
    const asset = assetLibrary.find((a) => a.id === sceneAsset.assetId);
    if (!asset) continue;

    const transform = getInterpolatedTransform(
      sceneAsset.id,
      currentTime,
      scene.keyframes,
      sceneAsset.transform
    );

    drawAsset(ctx, sceneAsset, asset, transform, sceneAsset.id === selectedAssetId);
  }

  // Draw speech bubbles
  for (const bubble of scene.speechBubbles) {
    drawSpeechBubble(ctx, bubble, bubble.id === selectedBubbleId);
  }

  // Film grain effect (subtle)
  ctx.save();
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 1000; i++) {
    const gx = Math.random() * CANVAS_WIDTH;
    const gy = Math.random() * CANVAS_HEIGHT;
    ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
    ctx.fillRect(gx, gy, 1, 1);
  }
  ctx.restore();
}

export function hitTestAsset(
  x: number,
  y: number,
  scene: Scene,
  assetLibrary: Asset[],
  currentTime: number
): string | null {
  // Iterate in reverse z-order (top first)
  const sorted = [...scene.assets]
    .filter((a) => a.visible)
    .sort((a, b) => b.zIndex - a.zIndex);

  for (const sceneAsset of sorted) {
    const asset = assetLibrary.find((a) => a.id === sceneAsset.assetId);
    if (!asset) continue;

    const transform = getInterpolatedTransform(
      sceneAsset.id,
      currentTime,
      scene.keyframes,
      sceneAsset.transform
    );

    const w = asset.width * transform.scaleX;
    const h = asset.height * transform.scaleY;

    if (
      x >= transform.x &&
      x <= transform.x + w &&
      y >= transform.y &&
      y <= transform.y + h
    ) {
      return sceneAsset.id;
    }
  }
  return null;
}

export function hitTestBubble(
  x: number,
  y: number,
  scene: Scene
): string | null {
  for (let i = scene.speechBubbles.length - 1; i >= 0; i--) {
    const b = scene.speechBubbles[i];
    if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
      return b.id;
    }
  }
  return null;
}
