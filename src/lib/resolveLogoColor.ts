import { getColorRgb } from './colorUtils';
import type { LogoEntry } from '@/app/components/fragment/types';
import { LOGO_DEFINITIONS } from '@/lib/logoRegistry';

type ColorMode = 'mono' | 'duo' | 'tri';

/**
 * Resolve the effective logo color for a logo entry based on its colorSource.
 * - 'custom': use entry.color
 * - 'color1'/'color2'/'color3': use the corresponding primary color
 *   (in mono mode, color1 = foregroundColor)
 *
 * Returns null for fixed-color logos (they use their embedded colors).
 */
export function resolveLogoEntryColor(
  entry: Pick<LogoEntry, 'logoId' | 'color' | 'colorSource'>,
  colorMode: ColorMode,
  multiColors: string[],
  foregroundColor: string,
): string | null {
  const def = LOGO_DEFINITIONS[entry.logoId];
  if (!def?.supportsColorChange) return null;

  if (entry.colorSource === 'custom') return getColorRgb(entry.color);

  if (colorMode === 'mono') {
    return getColorRgb(foregroundColor);
  }

  const index = parseInt(entry.colorSource.replace('color', ''), 10) - 1;
  return getColorRgb(multiColors[index] ?? foregroundColor);
}

/**
 * @deprecated Use resolveLogoEntryColor instead.
 * Kept for backward compat with code that still uses the old LogoConfig shape.
 */
export function resolveLogoColor(
  logoConfig: { color: string; colorSource: string },
  colorMode: ColorMode,
  multiColors: string[],
  foregroundColor: string,
): string {
  if (logoConfig.colorSource === 'custom') return getColorRgb(logoConfig.color);

  if (colorMode === 'mono') {
    return getColorRgb(foregroundColor);
  }

  const index = parseInt(logoConfig.colorSource.replace('color', ''), 10) - 1;
  return getColorRgb(multiColors[index] ?? foregroundColor);
}
