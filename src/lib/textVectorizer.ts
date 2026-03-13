import opentype from 'opentype.js';
import type {
  TextOverlayEntry,
  TextOverlayConfig,
  TextOverlayPathData,
} from '@/implementation-files/textOverlay';

let fontCache: opentype.Font | null = null;
let fontLoadPromise: Promise<opentype.Font> | null = null;

async function loadFont(): Promise<opentype.Font> {
  if (fontCache) return fontCache;
  if (fontLoadPromise) return fontLoadPromise;

  fontLoadPromise = opentype.load('/fonts/InterVariable.ttf').then(font => {
    fontCache = font;
    return font;
  });

  return fontLoadPromise;
}

function wrapText(
  font: opentype.Font,
  text: string,
  fontSize: number,
  maxWidth: number,
): string[] {
  const paragraphs = text.split('\n');
  const result: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      result.push('');
      continue;
    }

    const words = paragraph.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) {
      result.push('');
      continue;
    }

    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const testLine = `${currentLine} ${words[i]}`;
      const testWidth = font.getAdvanceWidth(testLine, fontSize);
      if (testWidth > maxWidth) {
        result.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    result.push(currentLine);
  }

  return result;
}

function computeAlignmentX(
  alignment: TextOverlayEntry['alignment'],
  lineWidth: number,
  canvasWidth: number,
): number {
  switch (alignment) {
    case 'left': return 0;
    case 'right': return canvasWidth - lineWidth;
    case 'center': return (canvasWidth - lineWidth) / 2;
  }
}

export async function vectorizeTextEntry(
  entry: TextOverlayEntry,
  canvasWidth: number,
  canvasHeight: number,
): Promise<TextOverlayPathData[]> {
  const font = await loadFont();
  const absFontSize = (entry.fontSize / 100) * canvasHeight;
  const absY = (entry.y / 100) * canvasHeight;
  const absLineHeight = absFontSize * entry.lineHeight;
  const padPx = (entry.sidePadding / 100) * canvasWidth;
  const contentWidth = canvasWidth - padPx * 2;

  const lines = wrapText(font, entry.content, absFontSize, contentWidth);
  const paths: TextOverlayPathData[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const lineWidth = font.getAdvanceWidth(line, absFontSize);
    const lineX = padPx + computeAlignmentX(entry.alignment, lineWidth, contentWidth);
    // opentype.js y baseline — place text with ascender at the y position
    const lineY = absY + absFontSize + i * absLineHeight;

    const path = font.getPath(line, lineX, lineY, absFontSize, {
      features: { liga: true, kern: true },
    });

    const d = path.toPathData(2);
    if (d) {
      paths.push({ d, transform: '' });
    }
  }

  return paths;
}

export async function vectorizeAllEntries(
  config: TextOverlayConfig,
  canvasWidth: number,
  canvasHeight: number,
): Promise<TextOverlayConfig> {
  if (!config.enabled || config.entries.length === 0) return config;

  const entries = await Promise.all(
    config.entries.map(async (entry) => {
      if (!entry.content.trim()) return entry;
      const paths = await vectorizeTextEntry(entry, canvasWidth, canvasHeight);
      return { ...entry, paths };
    })
  );

  return { ...config, entries };
}
