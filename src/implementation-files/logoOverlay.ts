/**
 * Logo Overlay for Fragment Maker SVGs
 *
 * Supports multiple logo entries, each with its own logo type, position, size,
 * and color settings. Logo types are defined in the logo registry.
 *
 * Re-exports helpers used by the app UI (preview overlay, video export).
 */

import {
  type LogoId,
  LOGO_DEFINITIONS,
  getLogoSvgById,
  getLogoSvgDataUrlById,
} from '@/lib/logoRegistry';

// Re-export for backward compat & convenience
export { getLogoSvgById as getLogoSvg, getLogoSvgDataUrlById as getLogoSvgDataUrl };
export { type LogoId, LOGO_DEFINITIONS, getLogoSvgById, getLogoSvgDataUrlById };

/** @deprecated Use LOGO_DEFINITIONS[id].aspectRatio instead. */
export const LOGO_ASPECT_RATIO = 176 / 32;

/** Config for a single logo entry in the SVG overlay. */
export interface LogoOverlayEntryConfig {
  logoId: LogoId;
  x: number;        // horizontal position 0–100%
  y: number;        // vertical position 0–100%
  size: number;     // percentage of canvas width (5-50)
  color: string;    // hex color (only used for recolorable logos)
}

/** Config for the full logo overlay (multiple entries). */
export interface LogoOverlayConfig {
  enabled: boolean;
  entries: LogoOverlayEntryConfig[];
}

/** @deprecated Single-entry config kept for backward compat with old export format. */
export interface LegacyLogoOverlayConfig {
  enabled: boolean;
  x: number;
  y: number;
  size: number;
  color: string;
}

/**
 * Generates embedded `<svg>` element strings for all logo overlay entries,
 * positioned within a parent SVG's coordinate system.
 *
 * Returns empty string if disabled or no entries.
 */
export function generateLogoOverlaySvg(
  config: LogoOverlayConfig,
  canvasWidth: number,
  canvasHeight: number,
): string {
  if (!config.enabled || config.entries.length === 0) return '';

  return config.entries.map(entry => {
    const def = LOGO_DEFINITIONS[entry.logoId];
    if (!def) return '';

    const logoWidth = (entry.size / 100) * canvasWidth;
    const logoHeight = logoWidth / def.aspectRatio;

    const x = (entry.x / 100) * (canvasWidth - logoWidth);
    const y = (entry.y / 100) * (canvasHeight - logoHeight);

    if (def.supportsColorChange && def.paths) {
      const paths = def.paths.map(d => `<path d="${d}" fill="${entry.color}"/>`).join('');
      return `<svg x="${x}" y="${y}" width="${logoWidth}" height="${logoHeight}" viewBox="${def.viewBox}" fill="none">${paths}</svg>`;
    }
    // Fixed-color logo
    return `<svg x="${x}" y="${y}" width="${logoWidth}" height="${logoHeight}" viewBox="${def.viewBox}" fill="none">${def.rawSvgContent}</svg>`;
  }).join('');
}

/**
 * Generate logo overlay from legacy single-entry config.
 * Used for backward compat with old export format.
 */
export function generateLegacyLogoOverlaySvg(
  config: LegacyLogoOverlayConfig,
  canvasWidth: number,
  canvasHeight: number,
): string {
  if (!config.enabled) return '';
  return generateLogoOverlaySvg({
    enabled: true,
    entries: [{
      logoId: 'icp',
      x: config.x,
      y: config.y,
      size: config.size,
      color: config.color,
    }],
  }, canvasWidth, canvasHeight);
}
