/**
 * Text Overlay for Fragment Maker SVGs
 *
 * Renders text overlay entries as vectorized SVG path elements.
 * Used by generateSvgFromExport / generateDiffSvgFromExport when text overlay config is present.
 *
 * Also re-exports types and helpers used by the app UI (preview overlay, video export).
 */

export type TextOverlayAlignment = 'left' | 'center' | 'right';
export type TextOverlayZOrder = 'above' | 'behind';
export type TextOverlayFontWeight = 400 | 500 | 600 | 700;

export interface TextOverlayPathData {
  d: string;
  transform: string;
}

export interface TextOverlayEntry {
  id: string;
  content: string;
  y: number;
  fontSize: number;
  fontWeight: TextOverlayFontWeight;
  alignment: TextOverlayAlignment;
  color: string;
  lineHeight: number;
  sidePadding: number;
  zOrder: TextOverlayZOrder;
  paths?: TextOverlayPathData[];
}

export interface TextOverlayConfig {
  enabled: boolean;
  entries: TextOverlayEntry[];
}

export const DEFAULT_TEXT_OVERLAY_CONFIG: TextOverlayConfig = {
  enabled: false,
  entries: [],
};

export const DEFAULT_TEXT_OVERLAY_ENTRY: Omit<TextOverlayEntry, 'id'> = {
  content: '',
  y: 50,
  fontSize: 5,
  fontWeight: 400,
  alignment: 'center',
  color: '#FCFCFC',
  lineHeight: 1.4,
  sidePadding: 0,
  zOrder: 'above',
};

const VALID_FONT_WEIGHTS: TextOverlayFontWeight[] = [400, 500, 600, 700];

export function isValidFontWeight(w: number): w is TextOverlayFontWeight {
  return VALID_FONT_WEIGHTS.includes(w as TextOverlayFontWeight);
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function generateTextOverlaySvg(
  config: TextOverlayConfig | undefined,
  _canvasWidth: number,
  _canvasHeight: number,
  position: TextOverlayZOrder,
): string {
  if (!config?.enabled) return '';

  const entries = config.entries.filter(e => e.zOrder === position && e.content.trim());
  if (entries.length === 0) return '';

  return entries.map(entry => {
    if (!entry.paths?.length) return '';
    const paths = entry.paths
      .map(p => {
        const attrs = [`d="${escapeXml(p.d)}"`, `fill="${escapeXml(entry.color)}"`];
        if (p.transform) attrs.push(`transform="${escapeXml(p.transform)}"`);
        return `<path ${attrs.join(' ')}/>`;
      })
      .join('');
    return `<g>${paths}</g>`;
  }).join('');
}
