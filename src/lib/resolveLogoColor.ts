import { getColorRgb } from './colorUtils';
import type { LogoConfig } from '@/app/components/fragment/types';

type ColorMode = 'mono' | 'duo' | 'tri';

/**
 * Resolve the effective logo color based on colorSource.
 * - 'custom': use logoConfig.color
 * - 'color1'/'color2'/'color3': use the corresponding primary color
 *   (in mono mode, color1 = foregroundColor)
 */
export function resolveLogoColor(
  logoConfig: LogoConfig,
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
