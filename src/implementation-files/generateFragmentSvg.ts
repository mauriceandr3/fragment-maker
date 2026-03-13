/**
 * Fragment SVG Generator
 *
 * A self-contained module for generating Fragment pattern SVGs.
 * For pattern-only configs, this file has no dependencies.
 * For text configs, also copy `generateTextGrid.ts`.
 *
 * ## Website Usage
 * ```typescript
 * import { generateSvgFromExport, type FragmentExport } from './generateFragmentSvg';
 *
 * const exportData: FragmentExport = await fetch('/fragment-config.json').then(r => r.json());
 * document.getElementById('container').innerHTML = generateSvgFromExport(exportData);
 * ```
 *
 * ## Exports
 * - `generateSvgFromExport` - Generate SVG from exported JSON (handles text + pattern)
 * - `generateDiffSvgFromExport` - Generate animated diff SVG from exported JSON
 * - `generateFragmentSvg` - Lower-level: pattern SVG from config + optional seed
 * - `generateFragmentDiffFromConfigs` - Lower-level: pattern diff from two configs
 * - `FragmentConfig`, `FragmentExport` - Configuration types
 */

import { parseFonts, generateTextGrid, type SerializedFontData, type TextConfig } from './generateTextGrid';
import { type LogoOverlayConfig, generateLogoOverlaySvg } from './logoOverlay';
import { type TextOverlayConfig, generateTextOverlaySvg } from './textOverlay';

// ============================================================================
// Types
// ============================================================================

export type FillType = 'linear' | 'radial' | 'angular' | 'diamond' | 'square' | 'box';

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
}

export interface GenerateFragmentDiffSvgOptions {
  seedA: string;
  seedB: string;
  config: FragmentConfig;
}

/**
 * Options for generating a diff SVG from two full configurations.
 * Used when animation is enabled and both From and To panels have independent params.
 */
export interface GenerateFragmentDiffFromConfigsOptions {
  /** The "From" configuration (pattern shown by default) */
  fromConfig: FragmentConfig;
  /** The "To" configuration (pattern shown on hover) */
  toConfig: FragmentConfig;
  /** Optional seed string for the "From" pattern (e.g. article title). Overrides the seedParam in fromConfig. */
  fromSeed?: string;
  /** Optional seed string for the "To" pattern. Overrides the seedParam in toConfig. */
  toSeed?: string;
}

/**
 * Animation settings exported in JSON format (v2.1.0+).
 * Nested structure for forwards compatibility with future animation settings.
 */
export interface AnimationSettings {
  /** Animation duration in milliseconds (100-5000, default: 600) */
  duration: number;
}

/**
 * Complete JSON export structure from Fragment Maker.
 * Use this type when importing exported JSON files in your application.
 *
 * @example
 * ```typescript
 * import type { FragmentExport } from './generateFragmentSvg';
 *
 * const fragmentExport: FragmentExport = await fetch('/fragment-config.json').then(r => r.json());
 *
 * // Access animation duration (v2.1.0+)
 * const duration = fragmentExport.animation?.duration ?? 600;
 * ```
 */
export interface FragmentExport {
  /** Export format version (e.g., "2.2.0") */
  version: string;
  /** ISO timestamp of export */
  exportedAt: string;
  /** Main fragment configuration (the "From" pattern when animation is enabled) */
  config: FragmentConfig;
  /** Optional animation settings (v2.1.0+). Present only when animation is enabled. */
  animation?: AnimationSettings;
  /** Optional "To" configuration for animation. Present only when animation is enabled. */
  toConfig?: FragmentConfig;
  /** Font data for text rendering (v2.2.0+). Present when any state uses text. */
  fonts?: SerializedFontData;
  /** State type for the "From" state (v2.2.0+). Defaults to 'pattern' if absent. */
  fromStateType?: 'pattern' | 'text';
  /** State type for the "To" state (v2.2.0+). Defaults to 'pattern' if absent. */
  toStateType?: 'pattern' | 'text';
  /** Text configuration for the "From" state (v2.2.0+). */
  fromTextConfig?: TextConfig;
  /** Text configuration for the "To" state (v2.2.0+). */
  toTextConfig?: TextConfig;
  /** Logo overlay configuration (v2.3.0+). Present only when logo is enabled. */
  logo?: LogoOverlayConfig;
  /** Text overlay configuration (v2.4.0+). Present only when text overlay is enabled. */
  textOverlay?: TextOverlayConfig;
}

// ============================================================================
// Constants
// ============================================================================

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
  width: number,
  foregroundColor: string,
  backgroundColor: string,
  height: number,
  options?: GridToSvgOptions
): string {
  const outputWidth = width;
  const outputHeight = height;
  const { allowCropping = false, cropDirection = 'height' } = options ?? {};

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
// Shared Helpers
// ============================================================================

interface Dimensions {
  cols: number;
  rows: number;
  width: number;
  height: number;
}

function computeDimensions(config: {
  cellSize: number;
  canvasWidth?: number;
  canvasHeight?: number;
  allowCropping?: boolean;
  cropDirection?: CropDirection;
}): Dimensions {
  const {
    cellSize,
    canvasWidth = 1056,
    canvasHeight = 1056,
    allowCropping = false,
    cropDirection = 'height',
  } = config;

  const width = canvasWidth;
  const height = canvasHeight;

  let cols: number;
  let rows: number;
  if (allowCropping) {
    if (cropDirection === 'width') {
      cols = Math.ceil(width / cellSize);
      rows = Math.floor(height / cellSize);
    } else {
      cols = Math.floor(width / cellSize);
      rows = Math.ceil(height / cellSize);
    }
  } else {
    cols = Math.floor(width / cellSize);
    rows = Math.floor(height / cellSize);
  }

  return { cols, rows, width, height };
}

function applySeededParam(
  config: Omit<FragmentConfig, 'seedParam'>,
  seedString: string,
  seedParam: SeedableParam
): Omit<FragmentConfig, 'seedParam'> {
  const hash = djb2Hash(seedString);
  const normalizedHash = normalizeHash(hash);
  const paramRange = PARAM_RANGES[seedParam];
  const seededValue = paramRange.min + normalizedHash * (paramRange.max - paramRange.min);
  const roundedSeededValue =
    paramRange.step >= 1
      ? Math.round(seededValue)
      : Math.round(seededValue / paramRange.step) * paramRange.step;

  return { ...config, [seedParam]: roundedSeededValue };
}

function gridFromConfig(config: Omit<FragmentConfig, 'seedParam'>, dims: Dimensions): boolean[][] {
  return generateGrid(
    dims.cols, dims.rows,
    config.seed, config.threshold, config.gamma, config.frequency,
    config.contrast, config.fillAmount, config.fillType, config.invertFill,
    config.directionalNeighbors, config.directionDensity
  );
}

// ============================================================================
// Shared Rendering Pipeline
// ============================================================================

interface RenderParams {
  config: Omit<FragmentConfig, 'seedParam'>;
}

/**
 * @internal Shared dimension→grid→svg pipeline used by both generateFragmentSvg and generateFragmentSvgDirect.
 */
function renderConfigToSvg(params: RenderParams): string {
  const { config } = params;

  const dims = computeDimensions(config);
  if (dims.cols <= 0 || dims.rows <= 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="10" y="50" fill="red">Invalid dimensions</text></svg>`;
  }

  const grid = gridFromConfig(config, dims);

  return gridToSvg(
    grid, dims.cols, dims.rows, config.cellSize, dims.width,
    config.foregroundColor, config.backgroundColor, dims.height,
    { allowCropping: config.allowCropping, cropDirection: config.cropDirection }
  );
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
 * @returns SVG string
 */
export function generateFragmentSvg(options: GenerateFragmentSvgOptions): string {
  const { seed: seedString, config } = options;
  const { seedParam = 'frequency', ...rest } = config;

  if (seedString === undefined) {
    return renderConfigToSvg({ config: rest });
  }

  const seededConfig = applySeededParam(rest, seedString, seedParam);
  return renderConfigToSvg({ config: seededConfig });
}

/**
 * Generates a single diff SVG from two seed strings.
 * Cells shared by both patterns are static. Cells unique to pattern A get data-g="a" (visible, animate off).
 * Cells unique to pattern B get data-g="b" (hidden, animate on).
 */
export function generateFragmentDiffSvg(options: GenerateFragmentDiffSvgOptions): string {
  const { seedA, seedB, config } = options;
  const { seedParam = 'frequency', ...rest } = config;

  const dims = computeDimensions(rest);
  if (dims.cols <= 0 || dims.rows <= 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="10" y="50" fill="red">Invalid dimensions</text></svg>`;
  }

  const configA = applySeededParam(rest, seedA, seedParam);
  const configB = applySeededParam(rest, seedB, seedParam);

  const gridA = gridFromConfig(configA, dims);
  const gridB = gridFromConfig(configB, dims);

  const { cols, rows, width, height } = dims;
  const { cellSize, foregroundColor, backgroundColor, allowCropping = false, cropDirection = 'height' } = rest;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`;
  svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="${backgroundColor}"/>`;

  for (let y = 0; y < Math.min(rows, gridA.length); y++) {
    for (let x = 0; x < Math.min(cols, gridA[y]?.length || 0); x++) {
      const inA = gridA[y][x];
      const inB = gridB[y][x];
      if (!inA && !inB) continue;

      let rectWidth = cellSize;
      let rectHeight = cellSize;

      if (allowCropping) {
        if (cropDirection === 'width' && x === cols - 1) {
          rectWidth = Math.min(cellSize, width - x * cellSize);
        }
        if (cropDirection === 'height' && y === rows - 1) {
          rectHeight = Math.min(cellSize, height - y * cellSize);
        }
      }
      if (rectWidth <= 0 || rectHeight <= 0) continue;

      const pos = `x="${x * cellSize}" y="${y * cellSize}" width="${rectWidth}" height="${rectHeight}" fill="${foregroundColor}"`;

      if (inA && inB) {
        svg += `<rect ${pos}/>`;
      } else if (inA) {
        svg += `<rect ${pos} data-g="a"/>`;
      } else {
        svg += `<rect ${pos} data-g="b" style="opacity:0"/>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * Options for generating a diff SVG from raw boolean grids.
 * Used when grids come from different sources (pattern generator, text generator, etc.)
 */
export interface GenerateDiffFromGridsOptions {
  /** The "From" grid (pattern shown by default) */
  gridFrom: boolean[][];
  /** The "To" grid (pattern shown on hover) */
  gridTo: boolean[][];
  /** Grid columns */
  cols: number;
  /** Grid rows */
  rows: number;
  /** Cell size in pixels */
  cellSize: number;
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Foreground color (hex) */
  foregroundColor: string;
  /** Background color (hex) */
  backgroundColor: string;
  /** Allow cropping mode */
  allowCropping?: boolean;
  /** Which axis to crop */
  cropDirection?: CropDirection;
}

/**
 * Generates a diff SVG from two pre-computed boolean grids.
 * Grid-agnostic: works with pattern grids, text grids, or any boolean[][] source.
 *
 * Cells shared by both grids are static. Cells unique to From get data-g="a" (visible, animate off).
 * Cells unique to To get data-g="b" (hidden, animate on).
 */
export function generateDiffFromGrids(options: GenerateDiffFromGridsOptions): string {
  const {
    gridFrom,
    gridTo,
    cols,
    rows,
    cellSize,
    width,
    height,
    foregroundColor,
    backgroundColor,
    allowCropping = false,
    cropDirection = 'height',
  } = options;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`;
  svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="${backgroundColor}"/>`;

  for (let y = 0; y < Math.min(rows, gridFrom.length, gridTo.length); y++) {
    for (let x = 0; x < Math.min(cols, gridFrom[y]?.length || 0, gridTo[y]?.length || 0); x++) {
      const inFrom = gridFrom[y][x];
      const inTo = gridTo[y][x];
      if (!inFrom && !inTo) continue;

      let rectWidth = cellSize;
      let rectHeight = cellSize;

      if (allowCropping) {
        if (cropDirection === 'width' && x === cols - 1) {
          rectWidth = Math.min(cellSize, width - x * cellSize);
        }
        if (cropDirection === 'height' && y === rows - 1) {
          rectHeight = Math.min(cellSize, height - y * cellSize);
        }
      }
      if (rectWidth <= 0 || rectHeight <= 0) continue;

      const pos = `x="${x * cellSize}" y="${y * cellSize}" width="${rectWidth}" height="${rectHeight}" fill="${foregroundColor}"`;

      if (inFrom && inTo) {
        svg += `<rect ${pos}/>`;
      } else if (inFrom) {
        svg += `<rect ${pos} data-g="a"/>`;
      } else {
        svg += `<rect ${pos} data-g="b" style="opacity:0"/>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * Generates a diff SVG from two full configuration objects.
 * Used when the From and To panels have independently configured generator params.
 *
 * The fromConfig provides the base pattern (shown by default).
 * The toConfig provides the target pattern (shown on hover).
 * Colors and canvas settings are taken from fromConfig (these are shared settings).
 *
 * Cells shared by both patterns are static. Cells unique to From get data-g="a" (visible, animate off).
 * Cells unique to To get data-g="b" (hidden, animate on).
 */
export function generateFragmentDiffFromConfigs(options: GenerateFragmentDiffFromConfigsOptions): string {
  const { fromSeed, toSeed } = options;
  const { seedParam: fromSeedParam = 'frequency', ...fromRest } = options.fromConfig;
  const { seedParam: toSeedParam = 'frequency', ...toRest } = options.toConfig;

  const fromConfig = fromSeed ? applySeededParam(fromRest, fromSeed, fromSeedParam) : fromRest;
  const toConfig = toSeed ? applySeededParam(toRest, toSeed, toSeedParam) : toRest;

  // Use fromConfig for canvas/color settings (shared)
  const dims = computeDimensions(fromConfig);
  if (dims.cols <= 0 || dims.rows <= 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="10" y="50" fill="red">Invalid dimensions</text></svg>`;
  }

  const gridFrom = gridFromConfig(fromConfig, dims);
  const gridTo = gridFromConfig(toConfig, dims);

  const { cols, rows, width, height } = dims;
  const { cellSize, foregroundColor, backgroundColor, allowCropping = false, cropDirection = 'height' } = fromConfig;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`;
  svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="${backgroundColor}"/>`;

  for (let y = 0; y < Math.min(rows, gridFrom.length); y++) {
    for (let x = 0; x < Math.min(cols, gridFrom[y]?.length || 0); x++) {
      const inFrom = gridFrom[y][x];
      const inTo = gridTo[y][x];
      if (!inFrom && !inTo) continue;

      let rectWidth = cellSize;
      let rectHeight = cellSize;

      if (allowCropping) {
        if (cropDirection === 'width' && x === cols - 1) {
          rectWidth = Math.min(cellSize, width - x * cellSize);
        }
        if (cropDirection === 'height' && y === rows - 1) {
          rectHeight = Math.min(cellSize, height - y * cellSize);
        }
      }
      if (rectWidth <= 0 || rectHeight <= 0) continue;

      const pos = `x="${x * cellSize}" y="${y * cellSize}" width="${rectWidth}" height="${rectHeight}" fill="${foregroundColor}"`;

      if (inFrom && inTo) {
        svg += `<rect ${pos}/>`;
      } else if (inFrom) {
        svg += `<rect ${pos} data-g="a"/>`;
      } else {
        svg += `<rect ${pos} data-g="b" style="opacity:0"/>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
}

// ============================================================================
// Logo Overlay Helper
// ============================================================================

/** Inject a logo overlay SVG into a completed SVG string (before closing tag). */
function injectOverlays(
  svg: string,
  width: number,
  height: number,
  logo?: LogoOverlayConfig,
  textOverlay?: TextOverlayConfig,
): string {
  const behindSvg = generateTextOverlaySvg(textOverlay, width, height, 'behind');
  const aboveSvg = generateTextOverlaySvg(textOverlay, width, height, 'above');
  const logoSvg = logo?.enabled ? generateLogoOverlaySvg(logo, width, height) : '';

  if (!behindSvg && !aboveSvg && !logoSvg) return svg;

  let result = svg;

  // "behind" text goes right after the background rect (first <rect.../>)
  if (behindSvg) {
    const bgRectEnd = result.indexOf('/>');
    if (bgRectEnd !== -1) {
      const insertPos = bgRectEnd + 2;
      result = result.slice(0, insertPos) + behindSvg + result.slice(insertPos);
    }
  }

  // "above" text and logo go before closing </svg>
  const suffix = aboveSvg + logoSvg;
  if (suffix) {
    result = result.replace('</svg>', `${suffix}</svg>`);
  }

  return result;
}

// ============================================================================
// High-Level API (accepts full export JSON)
// ============================================================================

/**
 * Generates a static SVG from an exported Fragment Maker JSON config.
 * Handles both pattern and text states automatically — the consumer
 * does not need to know which state type the config uses.
 *
 * @param exportData - The full JSON export from Fragment Maker
 * @param options.seed - Optional seed string for per-item variation (pattern states only)
 * @param options.text - Optional text override (text states only). Replaces textConfig.text at render time.
 * @returns SVG string
 *
 * @example
 * ```typescript
 * const exportData = await fetch('/fragment-config.json').then(r => r.json());
 * document.getElementById('hero').innerHTML = generateSvgFromExport(exportData);
 * ```
 */
export function generateSvgFromExport(
  exportData: FragmentExport,
  options?: { seed?: string; text?: string }
): string {
  const { config, fromStateType, fromTextConfig, fonts, logo, textOverlay } = exportData;
  const dims = computeDimensions(config);

  let svg: string;

  if (fromStateType === 'text' && fromTextConfig && fonts) {
    const parsedFonts = parseFonts(fonts);
    const effectiveTextConfig = options?.text !== undefined
      ? { ...fromTextConfig, text: options.text }
      : fromTextConfig;
    const { grid } = generateTextGrid(effectiveTextConfig, dims.cols, dims.rows, parsedFonts);
    svg = gridToSvg(
      grid, dims.cols, dims.rows,
      config.cellSize, dims.width,
      config.foregroundColor, config.backgroundColor,
      dims.height,
      { allowCropping: config.allowCropping, cropDirection: config.cropDirection }
    );
  } else {
    svg = generateFragmentSvg({ config, seed: options?.seed });
  }

  return injectOverlays(svg, dims.width, dims.height, logo, textOverlay);
}

/**
 * Generates an animated diff SVG from an exported Fragment Maker JSON config.
 * Handles all four state type combinations (pattern↔pattern, text↔pattern,
 * pattern↔text, text↔text) automatically.
 *
 * Returns an SVG with `data-g="a"` and `data-g="b"` attributes for animation.
 * Use with `useFragmentReveal` for React, or manipulate the rects directly.
 *
 * @param exportData - The full JSON export from Fragment Maker (must have animation enabled)
 * @param options.fromSeed - Optional seed for the "from" pattern (pattern states only)
 * @param options.toSeed - Optional seed for the "to" pattern (pattern states only)
 * @param options.fromText - Optional text override for the "from" state (text states only)
 * @param options.toText - Optional text override for the "to" state (text states only)
 * @returns SVG string, or empty string if animation is not enabled
 *
 * @example
 * ```typescript
 * const exportData = await fetch('/fragment-config.json').then(r => r.json());
 * const svg = generateDiffSvgFromExport(exportData);
 * container.innerHTML = svg;
 * ```
 */
export function generateDiffSvgFromExport(
  exportData: FragmentExport,
  options?: { fromSeed?: string; toSeed?: string; fromText?: string; toText?: string }
): string {
  const { config, toConfig, fonts, fromStateType, toStateType, fromTextConfig, toTextConfig, logo, textOverlay } = exportData;

  if (!toConfig && !(toStateType === 'text' && toTextConfig)) return '';

  const fromIsText = fromStateType === 'text';
  const toIsText = toStateType === 'text';
  const dims = computeDimensions(config);

  // Both patterns: use the optimized config-based path
  if (!fromIsText && !toIsText && toConfig) {
    const svg = generateFragmentDiffFromConfigs({
      fromConfig: config,
      toConfig,
      fromSeed: options?.fromSeed,
      toSeed: options?.toSeed,
    });
    return injectOverlays(svg, dims.width, dims.height, logo, textOverlay);
  }

  // At least one state is text — use grid-based approach
  if (dims.cols <= 0 || dims.rows <= 0) return '';

  let gridFrom: boolean[][];
  let gridTo: boolean[][];

  if (fromIsText && fromTextConfig && fonts) {
    const parsedFonts = parseFonts(fonts);
    const effectiveFromTextConfig = options?.fromText !== undefined
      ? { ...fromTextConfig, text: options.fromText }
      : fromTextConfig;
    gridFrom = generateTextGrid(effectiveFromTextConfig, dims.cols, dims.rows, parsedFonts).grid;
  } else {
    const fromConfig = options?.fromSeed
      ? applySeededParam(config, options.fromSeed, config.seedParam ?? 'frequency')
      : config;
    gridFrom = gridFromConfig(fromConfig, dims);
  }

  if (toIsText && toTextConfig && fonts) {
    const parsedFonts = parseFonts(fonts);
    const effectiveToTextConfig = options?.toText !== undefined
      ? { ...toTextConfig, text: options.toText }
      : toTextConfig;
    gridTo = generateTextGrid(effectiveToTextConfig, dims.cols, dims.rows, parsedFonts).grid;
  } else if (toConfig) {
    const resolvedToConfig = options?.toSeed
      ? applySeededParam(toConfig, options.toSeed, toConfig.seedParam ?? 'frequency')
      : toConfig;
    gridTo = gridFromConfig(resolvedToConfig, dims);
  } else {
    return '';
  }

  const svg = generateDiffFromGrids({
    gridFrom,
    gridTo,
    cols: dims.cols,
    rows: dims.rows,
    cellSize: config.cellSize,
    width: dims.width,
    height: dims.height,
    foregroundColor: config.foregroundColor,
    backgroundColor: config.backgroundColor,
    allowCropping: config.allowCropping,
    cropDirection: config.cropDirection,
  });

  return injectOverlays(svg, dims.width, dims.height, logo, textOverlay);
}
