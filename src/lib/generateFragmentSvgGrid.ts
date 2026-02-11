/**
 * Fragment SVG Grid Utilities
 *
 * Tool-specific functions for generating grid variations.
 * Imports core logic from generateFragmentSvg.ts.
 */

import {
  type FragmentConfig,
  type SeedableParam,
  type FillType,
  type CropDirection,
  PARAM_RANGES,
  generateFragmentSvgDirect,
} from './generateFragmentSvg';

// Re-export types that the tool needs
export type { FragmentConfig, SeedableParam, FillType, CropDirection };
export { PARAM_RANGES, generateFragmentSvgDirect };

/**
 * Generates an array of configurations with one parameter varying across its range.
 * Useful for grid view previews and batch generation.
 *
 * @param baseConfig - The base configuration (non-varying parameters)
 * @param varyingParam - Which parameter to vary across the configurations
 * @param count - Number of configurations to generate (default: 20)
 * @returns Array of configurations with the varying parameter adjusted
 */
export function generateGridVariations(
  baseConfig: Omit<FragmentConfig, 'seedParam'>,
  varyingParam: SeedableParam,
  count: number = 20
): Omit<FragmentConfig, 'seedParam'>[] {
  const range = PARAM_RANGES[varyingParam];
  const { min, max, step } = range;

  // Calculate all valid discrete values for this parameter
  const validValues: number[] = [];
  for (let value = min; value <= max + step / 2; value += step) {
    const roundedValue = step >= 1 ? Math.round(value) : Math.round(value / step) * step;
    if (roundedValue <= max) {
      validValues.push(roundedValue);
    }
  }

  const configs: Omit<FragmentConfig, 'seedParam'>[] = [];

  for (let i = 0; i < count; i++) {
    let paramValue: number;

    if (validValues.length >= count) {
      const t = count === 1 ? 0 : i / (count - 1);
      const rawValue = min + t * (max - min);

      if (step >= 1) {
        paramValue = Math.round(rawValue);
      } else {
        paramValue = Math.round(rawValue / step) * step;
      }

      paramValue = Math.max(min, Math.min(max, paramValue));
    } else {
      const slotIndex = Math.floor((i / count) * validValues.length);
      paramValue = validValues[Math.min(slotIndex, validValues.length - 1)];
    }

    configs.push({
      ...baseConfig,
      [varyingParam]: paramValue,
    });
  }

  return configs;
}
