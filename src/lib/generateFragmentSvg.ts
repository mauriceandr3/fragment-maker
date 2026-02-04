/**
 * Fragment SVG Generator
 *
 * A self-contained module for generating Fragment pattern SVGs.
 * This module has no React dependencies and can be used standalone.
 *
 * @example
 * ```typescript
 * import { generateFragmentSvg, FragmentConfig } from './generateFragmentSvg';
 *
 * const config: FragmentConfig = {
 *   threshold: 0.5,
 *   gamma: 1.0,
 *   frequency: 0.1,
 *   contrast: 1.0,
 *   seed: 0.5,
 *   directionalNeighbors: 8,
 *   directionDensity: 50,
 *   fillAmount: 50,
 *   fillType: 'linear',
 *   invertFill: false,
 *   foregroundColor: '#FCFCFC',
 *   backgroundColor: '#000000',
 *   cellSize: 48,
 *   canvasSize: '1K',
 *   seedParam: 'frequency',
 * };
 *
 * const svg = generateFragmentSvg('my-seed-string', config);
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type FillType = 'linear' | 'radial' | 'angular' | 'diamond' | 'square';

export type CanvasSize = '1K' | '2K' | '4K';

export type SeedableParam =
  | 'threshold'
  | 'gamma'
  | 'frequency'
  | 'contrast'
  | 'directionalNeighbors'
  | 'directionDensity'
  | 'fillAmount';

export interface FragmentConfig {
  /** Density threshold for noise (0-1) */
  threshold: number;
  /** Gamma correction for contrast (0.1-3) */
  gamma: number;
  /** Noise frequency/detail level (0.01-0.5) */
  frequency: number;
  /** Noise contrast adjustment (0.1-3) */
  contrast: number;
  /** Base random seed (0-1) */
  seed: number;
  /** Boundary fragment extent (0-999) */
  directionalNeighbors: number;
  /** Number of boundary fragments (0-999) */
  directionDensity: number;
  /** Fill percentage (0-100) */
  fillAmount: number;
  /** Fill gradient type */
  fillType: FillType;
  /** Invert fill direction */
  invertFill: boolean;
  /** Foreground color (hex) */
  foregroundColor: string;
  /** Background color (hex) */
  backgroundColor: string;
  /** Cell size in pixels */
  cellSize: number;
  /** Canvas size preset */
  canvasSize: CanvasSize;
  /** Which parameter to vary based on seed string (optional, defaults to 'frequency') */
  seedParam?: SeedableParam;
}

// ============================================================================
// Constants
// ============================================================================

export const CANVAS_SIZES: Record<CanvasSize, { width: number; height: number }> = {
  '1K': { width: 1056, height: 1056 },
  '2K': { width: 2112, height: 2112 },
  '4K': { width: 4224, height: 4224 },
};

export const PARAM_RANGES: Record<SeedableParam, { min: number; max: number; step: number }> = {
  threshold: { min: 0, max: 1, step: 0.01 },
  gamma: { min: 0.1, max: 3, step: 0.1 },
  frequency: { min: 0.01, max: 0.5, step: 0.01 },
  contrast: { min: 0.1, max: 3, step: 0.1 },
  directionalNeighbors: { min: 0, max: 999, step: 1 },
  directionDensity: { min: 0, max: 999, step: 1 },
  fillAmount: { min: 0, max: 100, step: 1 },
};

// ============================================================================
// Hash Functions
// ============================================================================

/**
 * djb2 hash algorithm - converts a string to a 32-bit unsigned integer.
 * This is a simple, fast hash function that produces consistent results
 * across different platforms and environments.
 *
 * @param str - The string to hash
 * @returns A 32-bit unsigned integer hash value
 */
export function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) + hash) ^ char; // hash * 33 ^ char
  }
  // Convert to unsigned 32-bit integer
  return hash >>> 0;
}

/**
 * Normalizes a djb2 hash value to a range [0, 1].
 *
 * @param hash - The hash value from djb2Hash
 * @returns A number between 0 and 1
 */
export function normalizeHash(hash: number): number {
  return hash / 0xffffffff;
}

// ============================================================================
// Core Generation Functions
// ============================================================================

/**
 * Seeded random number generator using sine-based hashing.
 * Produces deterministic pseudo-random values for given coordinates.
 */
function seededRandom(seed: number, x: number, y: number): number {
  const value = Math.sin(seed * 12.9898 + x * 78.233 + y * 43.758) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Calculates fill threshold based on gradient type.
 * Returns a percentage (0-100) indicating fill level at given coordinates.
 */
function calculateFillThreshold(
  x: number,
  y: number,
  fillType: FillType,
  cols: number,
  rows: number
): number {
  const centerX = cols / 2;
  const centerY = rows / 2;

  switch (fillType) {
    case 'linear':
      return (y / rows) * 100;

    case 'radial': {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
      return (distance / maxDistance) * 100;
    }

    case 'angular': {
      const angle = Math.atan2(y - centerY, x - centerX);
      return ((angle + Math.PI) / (2 * Math.PI)) * 100;
    }

    case 'diamond': {
      const diamondDistance = Math.abs(x - centerX) + Math.abs(y - centerY);
      const maxDiamondDistance = centerX + centerY;
      return (diamondDistance / maxDiamondDistance) * 100;
    }

    case 'square': {
      const squareDistance = Math.max(Math.abs(x - centerX), Math.abs(y - centerY));
      const maxSquareDistance = Math.max(centerX, centerY);
      return (squareDistance / maxSquareDistance) * 100;
    }
  }
}

/**
 * Creates a boundary fragment extending from a cell.
 * Modifies the grid in place to add directional line segments.
 */
function createBoundaryFragment(
  grid: boolean[][],
  startX: number,
  startY: number,
  color: boolean,
  seedOffset: number,
  seed: number,
  directionalNeighbors: number
): void {
  if (directionalNeighbors === 0) return;

  const actualRows = grid.length;
  const actualCols = grid[0]?.length || 0;

  if (actualCols === 0 || actualRows === 0) return;

  const directionSeed = seededRandom(seed, seedOffset, 6000);
  const isHorizontal = directionSeed > 0.5;

  const signSeed = seededRandom(seed, seedOffset, 6001);
  const direction = signSeed > 0.5 ? 1 : -1;

  const sizeSeed = seededRandom(seed, seedOffset, 6002);
  const maxLength = Math.min(Math.floor(directionalNeighbors / 50) + 2, 12);
  const length = Math.floor(sizeSeed * maxLength) + 2;

  const thicknessSeed = seededRandom(seed, seedOffset, 6003);
  const thickness = thicknessSeed > 0.7 ? 2 : 1;

  if (isHorizontal) {
    for (let i = 0; i < length; i++) {
      const x = startX + i * direction;
      if (x >= 0 && x < actualCols) {
        for (let t = 0; t < thickness; t++) {
          const y = startY + t;
          if (y >= 0 && y < actualRows) {
            grid[y][x] = color;
          }
        }
      }
    }
  } else {
    for (let i = 0; i < length; i++) {
      const y = startY + i * direction;
      if (y >= 0 && y < actualRows) {
        for (let t = 0; t < thickness; t++) {
          const x = startX + t;
          if (x >= 0 && x < actualCols) {
            grid[y][x] = color;
          }
        }
      }
    }
  }
}

/**
 * Applies directional neighbors at boundary transitions.
 * Finds cells at color boundaries and creates fragments from them.
 */
function applyDirectionalNeighbors(
  grid: boolean[][],
  seed: number,
  directionalNeighbors: number,
  directionDensity: number
): void {
  if (directionDensity === 0) return;
  if (!grid || grid.length === 0 || !grid[0] || grid[0].length === 0) return;

  const actualRows = grid.length;
  const actualCols = grid[0].length;
  const boundaryCells: { x: number; y: number; color: boolean }[] = [];

  // Find boundary cells
  for (let y = 0; y < actualRows; y++) {
    for (let x = 0; x < actualCols; x++) {
      const currentColor = grid[y][x];
      const neighbors = [
        { x: x - 1, y },
        { x: x + 1, y },
        { x, y: y - 1 },
        { x, y: y + 1 },
      ];

      const isBoundary = neighbors.some(
        (n) =>
          n.x >= 0 &&
          n.x < actualCols &&
          n.y >= 0 &&
          n.y < actualRows &&
          grid[n.y][n.x] !== currentColor
      );

      if (isBoundary) {
        boundaryCells.push({ x, y, color: currentColor });
      }
    }
  }

  // Select and create fragments
  const numFragments = Math.min(directionDensity, boundaryCells.length);
  for (let i = 0; i < numFragments; i++) {
    const randomSeed = seededRandom(seed, i, 5000);
    const index = Math.floor(randomSeed * boundaryCells.length);
    const cell = boundaryCells[index];
    createBoundaryFragment(grid, cell.x, cell.y, cell.color, i, seed, directionalNeighbors);
  }
}

/**
 * Generates a 2D boolean grid based on noise parameters.
 */
function generateGrid(
  cols: number,
  rows: number,
  seed: number,
  threshold: number,
  gamma: number,
  frequency: number,
  contrast: number,
  fillAmount: number,
  fillType: FillType,
  invertFill: boolean,
  directionalNeighbors: number,
  directionDensity: number
): boolean[][] {
  const grid: boolean[][] = [];

  for (let y = 0; y < rows; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < cols; x++) {
      // Generate and process noise
      let noise = seededRandom(seed, x * frequency, y * frequency);
      noise = Math.pow(noise, gamma);
      noise = (noise - 0.5) * contrast + 0.5;
      noise = Math.max(0, Math.min(1, noise));

      // Calculate fill threshold
      const fillThreshold = calculateFillThreshold(x, y, fillType, cols, rows);
      const effectiveFillAmount = invertFill ? 100 - fillAmount : fillAmount;
      const shouldFill = invertFill
        ? fillThreshold > effectiveFillAmount
        : fillThreshold <= effectiveFillAmount;

      row.push(shouldFill && noise > threshold);
    }
    grid.push(row);
  }

  applyDirectionalNeighbors(grid, seed, directionalNeighbors, directionDensity);
  return grid;
}

/**
 * Converts a boolean grid to an SVG string.
 */
function gridToSvg(
  grid: boolean[][],
  cols: number,
  rows: number,
  canvasSize: CanvasSize,
  foregroundColor: string,
  backgroundColor: string
): string {
  const canvasDimensions = CANVAS_SIZES[canvasSize];
  const width = canvasDimensions.width;
  const height = canvasDimensions.height;

  const scaledCellWidth = width / cols;
  const scaledCellHeight = height / rows;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

  for (let y = 0; y < Math.min(rows, grid.length); y++) {
    for (let x = 0; x < Math.min(cols, grid[y]?.length || 0); x++) {
      const color = grid[y][x] ? foregroundColor : backgroundColor;
      svg += `<rect x="${x * scaledCellWidth}" y="${y * scaledCellHeight}" width="${scaledCellWidth}" height="${scaledCellHeight}" fill="${color}"/>`;
    }
  }

  svg += '</svg>';
  return svg;
}

// ============================================================================
// Main Exported Function
// ============================================================================

/**
 * Generates a Fragment pattern SVG from a seed string and configuration.
 *
 * The seed string is hashed using djb2 to produce a deterministic value
 * that modifies one parameter (specified by config.seedParam, defaults to 'frequency').
 * This allows generating unique but reproducible patterns from any string input
 * (e.g., user IDs, wallet addresses, etc.).
 *
 * @param seedString - Any string to use as seed (e.g., principal ID, username)
 * @param config - The fragment configuration object
 * @returns SVG string
 */
export function generateFragmentSvg(seedString: string, config: FragmentConfig): string {
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
    seedParam = 'frequency',
  } = config;

  // Hash the seed string and normalize to [0, 1]
  const hash = djb2Hash(seedString);
  const normalizedHash = normalizeHash(hash);

  // Calculate the seeded parameter value
  const paramRange = PARAM_RANGES[seedParam];
  const seededValue =
    paramRange.min + normalizedHash * (paramRange.max - paramRange.min);

  // Round to step if it's an integer parameter
  const roundedSeededValue =
    paramRange.step >= 1
      ? Math.round(seededValue)
      : Math.round(seededValue / paramRange.step) * paramRange.step;

  // Build effective parameters with the seeded value
  const effectiveParams = {
    threshold,
    gamma,
    frequency,
    contrast,
    directionalNeighbors,
    directionDensity,
    fillAmount,
    [seedParam]: roundedSeededValue,
  };

  // Calculate grid dimensions
  const canvasDimensions = CANVAS_SIZES[canvasSize];
  const cols = Math.floor(canvasDimensions.width / cellSize);
  const rows = Math.floor(canvasDimensions.height / cellSize);

  if (cols <= 0 || rows <= 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="10" y="50" fill="red">Invalid dimensions</text></svg>`;
  }

  // Generate the grid
  const grid = generateGrid(
    cols,
    rows,
    seed,
    effectiveParams.threshold,
    effectiveParams.gamma,
    effectiveParams.frequency,
    effectiveParams.contrast,
    effectiveParams.fillAmount,
    fillType,
    invertFill,
    effectiveParams.directionalNeighbors,
    effectiveParams.directionDensity
  );

  // Convert to SVG
  return gridToSvg(grid, cols, rows, canvasSize, foregroundColor, backgroundColor);
}

/**
 * Generates an array of configurations with one parameter varying across its range.
 * Useful for grid view previews and batch generation.
 *
 * For parameters with limited discrete values (e.g., integers with a small range),
 * values are repeated as needed to fill the requested count rather than interpolating
 * invalid values.
 *
 * @param baseConfig - The base configuration (non-varying parameters)
 * @param varyingParam - Which parameter to vary across the configurations
 * @param count - Number of configurations to generate (default: 20)
 * @returns Array of configurations with the varying parameter adjusted
 *
 * @example
 * ```typescript
 * const variations = generateGridVariations(baseConfig, 'frequency', 20);
 * // variations[0].frequency = 0.01 (min)
 * // variations[19].frequency = 0.5 (max)
 * ```
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
    // Round to avoid floating point errors
    const roundedValue = step >= 1 ? Math.round(value) : Math.round(value / step) * step;
    if (roundedValue <= max) {
      validValues.push(roundedValue);
    }
  }

  // Generate the configurations
  const configs: Omit<FragmentConfig, 'seedParam'>[] = [];

  for (let i = 0; i < count; i++) {
    let paramValue: number;

    if (validValues.length >= count) {
      // Enough unique values: distribute evenly across the range
      // Index 0 gets min, index (count-1) gets max
      const t = count === 1 ? 0 : i / (count - 1);
      const rawValue = min + t * (max - min);

      // Snap to nearest valid step
      if (step >= 1) {
        paramValue = Math.round(rawValue);
      } else {
        paramValue = Math.round(rawValue / step) * step;
      }

      // Clamp to valid range
      paramValue = Math.max(min, Math.min(max, paramValue));
    } else {
      // Not enough unique values: repeat values to fill count slots
      // Distribute available values as evenly as possible
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
 * This is useful when you want full control over all parameters.
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

  // Calculate grid dimensions
  const canvasDimensions = CANVAS_SIZES[canvasSize];
  const cols = Math.floor(canvasDimensions.width / cellSize);
  const rows = Math.floor(canvasDimensions.height / cellSize);

  if (cols <= 0 || rows <= 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="10" y="50" fill="red">Invalid dimensions</text></svg>`;
  }

  // Generate the grid
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

  // Convert to SVG
  return gridToSvg(grid, cols, rows, canvasSize, foregroundColor, backgroundColor);
}
