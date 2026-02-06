/**
 * Fragment SVG Generator
 *
 * A self-contained module for generating Fragment pattern SVGs.
 * No dependencies required - copy this file to your website repo.
 *
 * ## Website Usage
 * ```typescript
 * import { generateFragmentSvg, type GenerateFragmentSvgOptions, type FragmentConfig } from './generateFragmentSvg';
 *
 * const config = await fetch('/config.json').then(r => r.json());
 * const svg = generateFragmentSvg({ seed: 'my-seed-string', config: config.config });
 * document.getElementById('container').innerHTML = svg;
 * ```
 *
 * ## Exports
 * - `generateFragmentSvg` - Main function for website use
 * - `generateGrid`, `gridToSvg` - Internal functions (for tool use only)
 */

// ============================================================================
// Types
// ============================================================================

export type FillType = 'linear' | 'radial' | 'angular' | 'diamond' | 'square' | 'box';

export type CanvasSize = '1K' | '2K' | '4K';

export type SeedableParam =
  | 'threshold'
  | 'gamma'
  | 'frequency'
  | 'contrast'
  | 'directionalNeighbors'
  | 'directionDensity'
  | 'fillAmount';

export type CropDirection = 'width' | 'height';

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
  /** Canvas size preset (deprecated, use canvasWidth/canvasHeight) */
  canvasSize?: CanvasSize;
  /** Canvas width in pixels */
  canvasWidth?: number;
  /** Canvas height in pixels */
  canvasHeight?: number;
  /** Which parameter to vary based on seed string (optional, defaults to 'frequency') */
  seedParam?: SeedableParam;
  /** Allow cropping mode - enables partial cells at edges */
  allowCropping?: boolean;
  /** Which axis to crop: 'width' crops rightmost column, 'height' crops bottom row */
  cropDirection?: CropDirection;
}

export interface GenerateFragmentSvgOptions {
  /** Any string to use as seed (e.g., principal ID, username). If omitted, uses config.seed directly. */
  seed?: string;
  /** The fragment configuration object */
  config: FragmentConfig;
  /** Optional output width in pixels. If provided without height, output is square. */
  width?: number;
  /** Optional output height in pixels. */
  height?: number;
  /** Scale cell size proportionally to maintain the same visual pattern at different dimensions. */
  maintainProportions?: boolean;
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
 */
export function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) + hash) ^ char;
  }
  return hash >>> 0;
}

/**
 * Normalizes a djb2 hash value to a range [0, 1].
 */
export function normalizeHash(hash: number): number {
  return hash / 0xffffffff;
}

// ============================================================================
// Internal Functions
// ============================================================================

function seededRandom(seed: number, x: number, y: number): number {
  const value = Math.sin(seed * 12.9898 + x * 78.233 + y * 43.758) * 43758.5453;
  return value - Math.floor(value);
}

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

    case 'box': {
      const distToEdge = Math.min(x, y, cols - 1 - x, rows - 1 - y);
      const maxDist = (Math.min(cols, rows) - 1) / 2;
      return maxDist > 0 ? (1 - distToEdge / maxDist) * 100 : 0;
    }
  }
}

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

  const numFragments = Math.min(directionDensity, boundaryCells.length);
  for (let i = 0; i < numFragments; i++) {
    const randomSeed = seededRandom(seed, i, 5000);
    const index = Math.floor(randomSeed * boundaryCells.length);
    const cell = boundaryCells[index];
    createBoundaryFragment(grid, cell.x, cell.y, cell.color, i, seed, directionalNeighbors);
  }
}

// ============================================================================
// Exported Internal Functions (for tool use)
// ============================================================================

/**
 * @internal Generates a 2D boolean grid. Exported for tool use only.
 */
export function generateGrid(
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
      let noise = seededRandom(seed, x * frequency, y * frequency);
      noise = Math.pow(noise, gamma);
      noise = (noise - 0.5) * contrast + 0.5;
      noise = Math.max(0, Math.min(1, noise));

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

export interface GridToSvgOptions {
  allowCropping?: boolean;
  cropDirection?: CropDirection;
}

/**
 * @internal Converts a boolean grid to SVG. Exported for tool use only.
 */
export function gridToSvg(
  grid: boolean[][],
  cols: number,
  rows: number,
  cellSize: number,
  canvasSizeOrWidth: CanvasSize | number,
  foregroundColor: string,
  backgroundColor: string,
  outputHeightOrCanvasHeight?: number,
  canvasHeightOrOptions?: number | GridToSvgOptions,
  options?: GridToSvgOptions
): string {
  // Support both old (canvasSize) and new (width, height) signatures
  let outputWidth: number;
  let outputHeight: number;
  let croppingOptions: GridToSvgOptions = {};

  if (typeof canvasSizeOrWidth === 'string') {
    // Legacy: canvasSize preset
    const canvasDimensions = CANVAS_SIZES[canvasSizeOrWidth];
    outputWidth = canvasDimensions.width;
    outputHeight = canvasDimensions.height;
    if (outputHeightOrCanvasHeight !== undefined) {
      // outputHeightOrCanvasHeight is the desired output height for scaling
      const aspectRatio = outputWidth / outputHeight;
      outputHeight = outputHeightOrCanvasHeight;
      outputWidth = Math.round(outputHeightOrCanvasHeight * aspectRatio);
    }
    // Options could be in canvasHeightOrOptions
    if (typeof canvasHeightOrOptions === 'object') {
      croppingOptions = canvasHeightOrOptions;
    }
  } else {
    // New: explicit width/height
    outputWidth = canvasSizeOrWidth;
    outputHeight = outputHeightOrCanvasHeight ?? canvasSizeOrWidth;
    if (typeof canvasHeightOrOptions === 'number') {
      // canvasHeightOrOptions is the desired output height for scaling
      const aspectRatio = outputWidth / outputHeight;
      outputHeight = canvasHeightOrOptions;
      outputWidth = Math.round(canvasHeightOrOptions * aspectRatio);
      if (options) {
        croppingOptions = options;
      }
    } else if (typeof canvasHeightOrOptions === 'object') {
      croppingOptions = canvasHeightOrOptions;
    }
  }

  const { allowCropping = false, cropDirection = 'height' } = croppingOptions;

  // viewBox is always the exact canvas dimensions (not grid * cellSize)
  // This ensures the SVG output matches the user's specified dimensions
  const viewBoxWidth = outputWidth;
  const viewBoxHeight = outputHeight;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" shape-rendering="crispEdges">`;

  // Background rect to fill the entire canvas
  svg += `<rect x="0" y="0" width="${viewBoxWidth}" height="${viewBoxHeight}" fill="${backgroundColor}"/>`;

  // Render cells - with cropping, the last row/column may be partial
  for (let y = 0; y < Math.min(rows, grid.length); y++) {
    for (let x = 0; x < Math.min(cols, grid[y]?.length || 0); x++) {
      // Only render foreground cells (background is already filled)
      if (!grid[y][x]) continue;

      let rectWidth = cellSize;
      let rectHeight = cellSize;

      if (allowCropping) {
        // Calculate partial cell dimensions at edges
        if (cropDirection === 'width' && x === cols - 1) {
          // Last column may be narrower
          const remainingWidth = outputWidth - x * cellSize;
          rectWidth = Math.min(cellSize, remainingWidth);
        }
        if (cropDirection === 'height' && y === rows - 1) {
          // Last row may be shorter
          const remainingHeight = outputHeight - y * cellSize;
          rectHeight = Math.min(cellSize, remainingHeight);
        }
      }

      // Skip cells that would be completely outside the canvas
      if (rectWidth <= 0 || rectHeight <= 0) continue;

      svg += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${rectWidth}" height="${rectHeight}" fill="${foregroundColor}"/>`;
    }
  }

  svg += '</svg>';
  return svg;
}

// ============================================================================
// Shared Rendering Pipeline
// ============================================================================

interface RenderParams {
  config: Omit<FragmentConfig, 'seedParam'>;
  outputWidth?: number;
  outputHeight?: number;
  maintainProportions?: boolean;
}

/**
 * @internal Shared dimension→grid→svg pipeline used by both generateFragmentSvg and generateFragmentSvgDirect.
 */
function renderConfigToSvg(params: RenderParams): string {
  const {
    config,
    outputWidth,
    outputHeight,
    maintainProportions = false,
  } = params;

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
    canvasWidth: explicitWidth,
    canvasHeight: explicitHeight,
    allowCropping = false,
    cropDirection = 'height',
  } = config;

  // Use explicit dimensions if provided, otherwise fall back to canvasSize preset
  let width: number;
  let height: number;
  if (explicitWidth !== undefined && explicitHeight !== undefined) {
    width = explicitWidth;
    height = explicitHeight;
  } else if (canvasSize) {
    const canvasDimensions = CANVAS_SIZES[canvasSize];
    width = canvasDimensions.width;
    height = canvasDimensions.height;
  } else {
    // Default to 1K if nothing specified
    width = CANVAS_SIZES['1K'].width;
    height = CANVAS_SIZES['1K'].height;
  }

  // Override dimensions if output params provided
  let effectiveCellSize = cellSize;
  if (outputWidth !== undefined) {
    const origMaxAxis = Math.max(width, height);
    width = outputWidth;
    height = outputHeight !== undefined ? outputHeight : outputWidth;

    if (maintainProportions) {
      const cellRatio = cellSize / origMaxAxis;
      effectiveCellSize = cellRatio * Math.max(width, height);
    }
  }

  // Calculate cols/rows based on cropping mode
  // Crop width: ceil cols (partial last column), floor rows (full rows only)
  // Crop height: floor cols (full columns only), ceil rows (partial last row)
  let cols: number;
  let rows: number;
  if (allowCropping) {
    if (cropDirection === 'width') {
      cols = Math.ceil(width / effectiveCellSize);
      rows = Math.floor(height / effectiveCellSize);
    } else {
      cols = Math.floor(width / effectiveCellSize);
      rows = Math.ceil(height / effectiveCellSize);
    }
  } else {
    cols = Math.floor(width / effectiveCellSize);
    rows = Math.floor(height / effectiveCellSize);
  }

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

  return gridToSvg(grid, cols, rows, effectiveCellSize, width, foregroundColor, backgroundColor, height, { allowCropping, cropDirection });
}

// ============================================================================
// Main Exported Functions
// ============================================================================

/**
 * Generates a Fragment pattern SVG with explicit parameter values (no seed string).
 * Used by the tool's grid preview. Shares the same rendering pipeline as generateFragmentSvg.
 *
 * @param config - The fragment configuration object
 * @returns SVG string
 */
export function generateFragmentSvgDirect(config: Omit<FragmentConfig, 'seedParam'>): string {
  return renderConfigToSvg({ config });
}

/**
 * Generates a Fragment pattern SVG from a seed string and configuration.
 *
 * The seed string is hashed using djb2 to produce a deterministic value
 * that modifies one parameter (specified by config.seedParam, defaults to 'frequency').
 *
 * @param options - Generation options
 * @param options.seed - Any string to use as seed (e.g., principal ID, username)
 * @param options.config - The fragment configuration object
 * @param options.width - Optional output width in pixels. If provided without height, output is square.
 * @param options.height - Optional output height in pixels.
 * @param options.maintainProportions - Scale cell size proportionally to preserve visual pattern at different dimensions.
 * @returns SVG string
 */
export function generateFragmentSvg(options: GenerateFragmentSvgOptions): string {
  const { seed: seedString, config, width: outputWidth, height: outputHeight, maintainProportions = false } = options;

  const { seedParam = 'frequency', ...rest } = config;

  if (seedString === undefined) {
    return renderConfigToSvg({ config: rest, outputWidth, outputHeight, maintainProportions });
  }

  const hash = djb2Hash(seedString as string);
  const normalizedHash = normalizeHash(hash);

  const paramRange = PARAM_RANGES[seedParam];
  const seededValue = paramRange.min + normalizedHash * (paramRange.max - paramRange.min);

  const roundedSeededValue =
    paramRange.step >= 1
      ? Math.round(seededValue)
      : Math.round(seededValue / paramRange.step) * paramRange.step;

  const seededConfig = {
    ...rest,
    [seedParam]: roundedSeededValue,
  };

  return renderConfigToSvg({ config: seededConfig, outputWidth, outputHeight, maintainProportions });
}
