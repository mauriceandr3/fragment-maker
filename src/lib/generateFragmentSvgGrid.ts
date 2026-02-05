/**
 * Fragment SVG Grid Utilities
 *
 * Tool-specific functions for generating grid variations.
 * Imports core logic from generateFragmentSvg.ts.
 */

import {
  type FragmentConfig,
  type SeedableParam,
  type CanvasSize,
  type FillType,
  CANVAS_SIZES,
  PARAM_RANGES,
  generateGrid,
  gridToSvg,
} from './generateFragmentSvg';

// Re-export types that the tool needs
export type { FragmentConfig, SeedableParam, CanvasSize, FillType };
export { CANVAS_SIZES, PARAM_RANGES };

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

/**
 * Generates a Fragment pattern SVG with explicit parameter values (no seed string).
 * Uses the same core generation logic as generateFragmentSvg.
 *
 * @param config - The fragment configuration object
 * @returns SVG string
 */
export function generateFragmentSvgDirect(config: Omit<FragmentConfig, 'seedParam'>): string {
  const {
    threshold,
    gamma,
    frequency,
    contrast,
    seed,
    directionalNeighbors,
    directionDensity,
    fillAmount,
    fillType,
    invertFill,
    foregroundColor,
    backgroundColor,
    cellSize,
    canvasSize,
  } = config;

  const canvasDimensions = CANVAS_SIZES[canvasSize];
  const cols = Math.floor(canvasDimensions.width / cellSize);
  const rows = Math.floor(canvasDimensions.height / cellSize);

  if (cols <= 0 || rows <= 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="10" y="50" fill="red">Invalid dimensions</text></svg>`;
  }

  const grid = generateGrid(
    cols,
    rows,
    seed,
    threshold,
    gamma,
    frequency,
    contrast,
    fillAmount,
    fillType,
    invertFill,
    directionalNeighbors,
    directionDensity
  );

  return gridToSvg(grid, cols, rows, canvasSize, foregroundColor, backgroundColor);
}
