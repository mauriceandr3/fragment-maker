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

export type FillType = 'linear' | 'linearHorizontal' | 'radial' | 'angular' | 'diamond' | 'square' | 'box';

export type SeedableParam =
  | 'threshold'
  | 'gamma'
  | 'frequency'
  | 'contrast'
  | 'directionalNeighbors'
  | 'directionDensity'
  | 'fillAmount';

export type CropDirection = 'width' | 'height';
export type ElongateAxis = 'none' | 'width' | 'height';
export type ColorMode = 'mono' | 'duo' | 'tri';

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
  /** Which axis to stretch cells along ('none' = square cells) */
  elongateAxis?: ElongateAxis;
  /** Multiplier for cell stretch (e.g. 4 with width axis = cells are 4x wide) */
  elongateAmount?: number;
  /** Color mode: mono (single foreground), duo (2 colors), tri (3 colors). Defaults to 'mono'. */
  colorMode?: ColorMode;
  /** Array of foreground colors (1-3 hex strings). Used when colorMode is 'duo' or 'tri'. */
  colors?: string[];
  /** Proportions for each color (0-1 values summing to 1). Length matches colors array. */
  colorProportions?: number[];
  /** Color to use for text rendering in multi-color mode (hex). Defaults to foregroundColor. */
  textColor?: string;
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
  /** Export format version (e.g., "2.6.0") */
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
  /** Pattern overlay config for "From" text state (v2.6.0+). Present when fromStateType='text' and pattern overlay is enabled. */
  fromTextPatternConfig?: FragmentConfig;
  /** Pattern overlay config for "To" text state (v2.6.0+). Present when toStateType='text' and pattern overlay is enabled. */
  toTextPatternConfig?: FragmentConfig;
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

    case 'linearHorizontal':
      return (x / cols) * 100;

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
// Multi-Color Assignment
// ============================================================================

/**
 * Assigns a color index to each filled cell in the grid based on proportions.
 * Uses seeded randomness so the same seed always produces the same assignment.
 * Returns null for mono mode (no assignment needed).
 */
export function assignCellColors(
  grid: boolean[][],
  seed: number,
  colorMode: ColorMode,
  proportions: number[],
  frequency: number = 1,
): number[][] | null {
  if (colorMode === 'mono') return null;

  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  // Collect all filled cell coordinates
  const filledCells: { x: number; y: number }[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x]) filledCells.push({ x, y });
    }
  }

  // Derive a shuffle seed that incorporates frequency so color distribution
  // changes when frequency changes, even if the grid pattern is identical.
  const shuffleSeed = seed + Math.round(frequency * 10000);

  // Fisher-Yates shuffle using seeded random
  for (let i = filledCells.length - 1; i > 0; i--) {
    const r = seededRandom(shuffleSeed, i, 9999);
    const j = Math.floor(r * (i + 1));
    [filledCells[i], filledCells[j]] = [filledCells[j], filledCells[i]];
  }

  // Initialize result grid with -1 (unfilled)
  const result: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1));

  // Assign colors based on proportions
  const total = filledCells.length;
  let assigned = 0;
  for (let colorIdx = 0; colorIdx < proportions.length; colorIdx++) {
    const count = colorIdx === proportions.length - 1
      ? total - assigned  // Last color gets remainder to avoid rounding gaps
      : Math.round(proportions[colorIdx] * total);
    for (let i = 0; i < count && assigned < total; i++, assigned++) {
      const cell = filledCells[assigned];
      result[cell.y][cell.x] = colorIdx;
    }
  }

  return result;
}

/**
 * Resolves the fill color for a cell given multi-color state.
 * Returns foregroundColor for mono mode, or the assigned color from the colors array.
 */
function getCellColor(
  colorAssignments: number[][] | null,
  colors: string[] | undefined,
  foregroundColor: string,
  x: number,
  y: number,
): string {
  if (!colorAssignments || !colors) return foregroundColor;
  const idx = colorAssignments[y]?.[x] ?? 0;
  return colors[idx] ?? foregroundColor;
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

      row.push(shouldFill && noise < threshold);
    }
    grid.push(row);
  }

  applyDirectionalNeighbors(grid, seed, directionalNeighbors, directionDensity);
  return grid;
}

/**
 * Upscale an entity-level grid to base-cell-level by repeating each cell
 * along the elongation axis. This preserves the visual elongation effect
 * while producing a grid at base-cell resolution (needed for diffs with text).
 */
export function upscaleGridToBaseLevel(
  entityGrid: boolean[][],
  elongateAxis: ElongateAxis,
  elongateAmount: number,
  baseCols: number,
  baseRows: number,
): boolean[][] {
  if (elongateAxis === 'none' || elongateAmount <= 1) return entityGrid;

  const result: boolean[][] = [];

  if (elongateAxis === 'height') {
    // Each entity row maps to `elongateAmount` base rows
    const entityRows = entityGrid.length;
    for (let ey = 0; ey < entityRows; ey++) {
      for (let r = 0; r < elongateAmount && result.length < baseRows; r++) {
        result.push([...entityGrid[ey]]);
      }
    }
  } else {
    // elongateAxis === 'width': each entity col maps to `elongateAmount` base cols
    for (let y = 0; y < entityGrid.length && y < baseRows; y++) {
      const row: boolean[] = [];
      for (let ex = 0; ex < entityGrid[y].length; ex++) {
        const val = entityGrid[y][ex];
        for (let r = 0; r < elongateAmount && row.length < baseCols; r++) {
          row.push(val);
        }
      }
      result.push(row);
    }
  }

  return result;
}

export interface CombinedGridResult {
  grid: boolean[][];
  colorAssignments: number[][];
  effectiveColors: string[];
}

export function generateCombinedTextPatternGrid(
  textGrid: boolean[][],
  patternConfig: FragmentConfig,
  baseCols: number,
  baseRows: number,
): CombinedGridResult {
  const dims = computeDimensions(patternConfig);
  const entityGrid = gridFromConfig(patternConfig, dims);
  const elongateAxis = patternConfig.elongateAxis ?? 'none';
  const elongateAmount = Math.max(1, Math.round(patternConfig.elongateAmount ?? 1));
  const patternBaseGrid = upscaleGridToBaseLevel(
    entityGrid, elongateAxis, elongateAmount, baseCols, baseRows,
  );
  const colorMode = patternConfig.colorMode ?? 'mono';
  const proportions = patternConfig.colorProportions ?? [1];
  const entityColorAssignments = assignCellColors(
    entityGrid, patternConfig.seed, colorMode, proportions, patternConfig.frequency,
  );
  const textColor = patternConfig.textColor ?? patternConfig.foregroundColor;
  const patternColors = patternConfig.colors ?? [patternConfig.foregroundColor];
  const effectiveColors = [textColor, ...patternColors];

  const grid: boolean[][] = [];
  const colorAssignments: number[][] = [];

  for (let y = 0; y < baseRows; y++) {
    const gridRow: boolean[] = [];
    const colorRow: number[] = [];
    for (let x = 0; x < baseCols; x++) {
      const isText = textGrid[y]?.[x] ?? false;
      const isPattern = patternBaseGrid[y]?.[x] ?? false;
      if (isText) {
        gridRow.push(true);
        colorRow.push(0);
      } else if (isPattern) {
        gridRow.push(true);
        const entityX = elongateAxis === 'width' ? Math.floor(x / elongateAmount) : x;
        const entityY = elongateAxis === 'height' ? Math.floor(y / elongateAmount) : y;
        const entityIdx = entityColorAssignments?.[entityY]?.[entityX] ?? 0;
        colorRow.push(entityIdx + 1);
      } else {
        gridRow.push(false);
        colorRow.push(0);
      }
    }
    grid.push(gridRow);
    colorAssignments.push(colorRow);
  }

  return { grid, colorAssignments, effectiveColors };
}

export interface GridToSvgOptions {
  allowCropping?: boolean;
  cropDirection?: CropDirection;
  /** Effective cell width (may differ from cellSize when elongated) */
  cellWidth?: number;
  /** Effective cell height (may differ from cellSize when elongated) */
  cellHeight?: number;
  /** Per-cell color assignments (from assignCellColors). null for mono mode. */
  colorAssignments?: number[][] | null;
  /** Array of foreground colors for multi-color mode. */
  colors?: string[];
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
  const cw = options?.cellWidth ?? cellSize;
  const ch = options?.cellHeight ?? cellSize;
  const colorAssignments = options?.colorAssignments;
  const colors = options?.colors;

  const viewBoxWidth = outputWidth;
  const viewBoxHeight = outputHeight;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" shape-rendering="crispEdges">`;

  // Background rect to fill the entire canvas
  svg += `<rect x="0" y="0" width="${viewBoxWidth}" height="${viewBoxHeight}" fill="${backgroundColor}"/>`;

  // Render cells - entities at the edge are clipped to canvas bounds
  for (let y = 0; y < Math.min(rows, grid.length); y++) {
    for (let x = 0; x < Math.min(cols, grid[y]?.length || 0); x++) {
      if (!grid[y][x]) continue;

      // Clip to canvas bounds (handles partial entities at edges)
      const rectWidth = Math.min(cw, outputWidth - x * cw);
      const rectHeight = Math.min(ch, outputHeight - y * ch);

      if (rectWidth <= 0 || rectHeight <= 0) continue;

      const fill = getCellColor(colorAssignments ?? null, colors, foregroundColor, x, y);
      svg += `<rect x="${x * cw}" y="${y * ch}" width="${rectWidth}" height="${rectHeight}" fill="${fill}"/>`;
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
  cellWidth: number;
  cellHeight: number;
}

/**
 * Compute effective cell dimensions from base cellSize + elongation settings.
 */
export function getCellDimensions(config: {
  cellSize: number;
  elongateAxis?: ElongateAxis;
  elongateAmount?: number;
}): { cellWidth: number; cellHeight: number } {
  const { cellSize, elongateAxis = 'none', elongateAmount = 1 } = config;
  const amount = Math.max(1, Math.round(elongateAmount));
  return {
    cellWidth: elongateAxis === 'width' ? cellSize * amount : cellSize,
    cellHeight: elongateAxis === 'height' ? cellSize * amount : cellSize,
  };
}

function computeDimensions(config: {
  cellSize: number;
  canvasWidth?: number;
  canvasHeight?: number;
  allowCropping?: boolean;
  cropDirection?: CropDirection;
  elongateAxis?: ElongateAxis;
  elongateAmount?: number;
}): Dimensions {
  const {
    canvasWidth = 1056,
    canvasHeight = 1056,
    allowCropping = false,
    cropDirection = 'height',
  } = config;

  const { cellWidth, cellHeight } = getCellDimensions(config);

  const width = canvasWidth;
  const height = canvasHeight;

  // Grid cols/rows are at entity (elongated cell) level.
  // Use ceil so entities at the edge can be partially visible (clipped by viewBox).
  let cols: number;
  let rows: number;
  if (allowCropping) {
    if (cropDirection === 'width') {
      cols = Math.ceil(width / cellWidth);
      rows = Math.floor(height / cellHeight);
    } else {
      cols = Math.floor(width / cellWidth);
      rows = Math.ceil(height / cellHeight);
    }
  } else {
    cols = Math.ceil(width / cellWidth);
    rows = Math.ceil(height / cellHeight);
  }

  return { cols, rows, width, height, cellWidth, cellHeight };
}

/**
 * Compute base-cell-level dimensions (ignoring elongation) for text grids.
 */
function computeBaseDimensions(config: {
  cellSize: number;
  canvasWidth?: number;
  canvasHeight?: number;
  allowCropping?: boolean;
  cropDirection?: CropDirection;
}): { baseCols: number; baseRows: number } {
  const { cellSize, canvasWidth = 1056, canvasHeight = 1056, allowCropping = false, cropDirection = 'height' } = config;
  let baseCols: number;
  let baseRows: number;
  if (allowCropping) {
    if (cropDirection === 'width') {
      baseCols = Math.ceil(canvasWidth / cellSize);
      baseRows = Math.floor(canvasHeight / cellSize);
    } else {
      baseCols = Math.floor(canvasWidth / cellSize);
      baseRows = Math.ceil(canvasHeight / cellSize);
    }
  } else {
    baseCols = Math.floor(canvasWidth / cellSize);
    baseRows = Math.floor(canvasHeight / cellSize);
  }
  return { baseCols, baseRows };
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
  const colorMode = config.colorMode ?? 'mono';
  const colorAssignments = assignCellColors(
    grid, config.seed,
    colorMode,
    config.colorProportions ?? [1],
    config.frequency,
  );

  return gridToSvg(
    grid, dims.cols, dims.rows, config.cellSize, dims.width,
    config.foregroundColor, config.backgroundColor, dims.height,
    {
      cellWidth: dims.cellWidth, cellHeight: dims.cellHeight,
      colorAssignments,
      colors: config.colors,
    }
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
 * @internal Shared helper for building diff SVGs from two grids.
 */
interface DiffColorOptions {
  colorAssignmentsA?: number[][] | null;
  colorAssignmentsB?: number[][] | null;
  colors?: string[];
}

function buildDiffSvg(
  gridA: boolean[][],
  gridB: boolean[][],
  cols: number,
  rows: number,
  cw: number,
  ch: number,
  width: number,
  height: number,
  foregroundColor: string,
  backgroundColor: string,
  colorOpts?: DiffColorOptions,
): string {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`;
  svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="${backgroundColor}"/>`;

  for (let y = 0; y < Math.min(rows, gridA.length, gridB.length); y++) {
    for (let x = 0; x < Math.min(cols, gridA[y]?.length || 0, gridB[y]?.length || 0); x++) {
      const inA = gridA[y][x];
      const inB = gridB[y][x];
      if (!inA && !inB) continue;

      const rectWidth = Math.min(cw, width - x * cw);
      const rectHeight = Math.min(ch, height - y * ch);
      if (rectWidth <= 0 || rectHeight <= 0) continue;

      if (inA && inB) {
        const fillA = getCellColor(colorOpts?.colorAssignmentsA ?? null, colorOpts?.colors, foregroundColor, x, y);
        const fillB = getCellColor(colorOpts?.colorAssignmentsB ?? null, colorOpts?.colors, foregroundColor, x, y);
        if (fillA === fillB) {
          // Same color in both states — static, no animation needed
          svg += `<rect x="${x * cw}" y="${y * ch}" width="${rectWidth}" height="${rectHeight}" fill="${fillA}"/>`;
        } else {
          // Different colors — animate from A to B via fade out/in
          svg += `<rect x="${x * cw}" y="${y * ch}" width="${rectWidth}" height="${rectHeight}" fill="${fillB}" data-g="b" style="opacity:0"/>`;
          svg += `<rect x="${x * cw}" y="${y * ch}" width="${rectWidth}" height="${rectHeight}" fill="${fillA}" data-g="a"/>`;
        }
      } else if (inA) {
        const fill = getCellColor(colorOpts?.colorAssignmentsA ?? null, colorOpts?.colors, foregroundColor, x, y);
        svg += `<rect x="${x * cw}" y="${y * ch}" width="${rectWidth}" height="${rectHeight}" fill="${fill}" data-g="a"/>`;
      } else {
        const fill = getCellColor(colorOpts?.colorAssignmentsB ?? null, colorOpts?.colors, foregroundColor, x, y);
        svg += `<rect x="${x * cw}" y="${y * ch}" width="${rectWidth}" height="${rectHeight}" fill="${fill}" data-g="b" style="opacity:0"/>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
}

export interface MixedCellDiffOptions {
  /** Pattern grid at entity level */
  entityGrid: boolean[][];
  /** Text grid at base-cell level */
  textGrid: boolean[][];
  elongateAxis: ElongateAxis;
  elongateAmount: number;
  baseCols: number;
  baseRows: number;
  cellSize: number;
  width: number;
  height: number;
  foregroundColor: string;
  backgroundColor: string;
  /** true = pattern is "from" (visible, animates out), text is "to" */
  patternIsFrom: boolean;
  /** Multi-color: per-cell color assignments for entity grid (at entity level) */
  entityColorAssignments?: number[][] | null;
  /** Multi-color: per-cell color assignments for text grid (at base level) */
  textColorAssignments?: number[][] | null;
  /** Multi-color: array of foreground colors */
  colors?: string[];
  /** Color to use for text cells (defaults to foregroundColor) */
  textColor?: string;
}

/**
 * Build a diff SVG for pattern↔text with elongation.
 * Pattern-only cells are emitted as entity-sized rects (whole bars) so they
 * animate as single DOM elements. Text-only cells are individual base-cell rects.
 * Shared cells (in both pattern and text) are base-cell rects (always visible).
 */
export function buildMixedCellDiffSvg(opts: MixedCellDiffOptions): string {
  const { entityGrid, textGrid, elongateAxis, elongateAmount,
          baseCols, baseRows, cellSize, width, height,
          foregroundColor, backgroundColor, patternIsFrom,
          entityColorAssignments, colors, textColor: textColorOpt } = opts;

  const stretchX = elongateAxis === 'width' ? elongateAmount : 1;
  const stretchY = elongateAxis === 'height' ? elongateAmount : 1;
  const entityCols = entityGrid[0]?.length || 0;
  const entityRows = entityGrid.length;
  const tFill = textColorOpt ?? foregroundColor;

  const pTag = patternIsFrom ? ' data-g="a"' : ' data-g="b" style="opacity:0"';
  const tTag = patternIsFrom ? ' data-g="b" style="opacity:0"' : ' data-g="a"';

  // Multi-color for pattern cells only; text uses textColor
  const entityFill = (ex: number, ey: number) =>
    getCellColor(entityColorAssignments ?? null, colors, foregroundColor, ex, ey);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`;
  svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="${backgroundColor}"/>`;

  // Track which base cells have been emitted (shared or pattern-only entity rects)
  const emitted = new Set<number>(); // by * baseCols + bx
  const key = (bx: number, by: number) => by * baseCols + bx;

  // Collect shared cells and entity rects in two passes:
  // 1a. First pass: find shared cells, emit them FIRST (behind entity bars in SVG order)
  // 1b. Second pass: emit entity bars ON TOP (they cover shared cells initially,
  //     then animate to opacity 0, revealing the foreground-colored text underneath)
  const entityRects: Array<{ x: number; y: number; w: number; h: number; fill: string }> = [];

  for (let ey = 0; ey < entityRows; ey++) {
    for (let ex = 0; ex < entityCols; ex++) {
      if (!entityGrid[ey][ex]) continue;

      const eFill = entityFill(ex, ey);
      const baseXStart = ex * stretchX;
      const baseYStart = ey * stretchY;
      const baseXEnd = Math.min(baseXStart + stretchX, baseCols);
      const baseYEnd = Math.min(baseYStart + stretchY, baseRows);

      // Emit shared cells (behind bars)
      for (let by = baseYStart; by < baseYEnd; by++) {
        for (let bx = baseXStart; bx < baseXEnd; bx++) {
          emitted.add(key(bx, by));
          if (textGrid[by]?.[bx]) {
            const rw = Math.min(cellSize, width - bx * cellSize);
            const rh = Math.min(cellSize, height - by * cellSize);
            if (rw > 0 && rh > 0) {
              svg += `<rect x="${bx * cellSize}" y="${by * cellSize}" width="${rw}" height="${rh}" fill="${tFill}"/>`;
            }
          }
        }
      }

      // Collect entity rect for second pass
      const rw = Math.min((baseXEnd - baseXStart) * cellSize, width - baseXStart * cellSize);
      const rh = Math.min((baseYEnd - baseYStart) * cellSize, height - baseYStart * cellSize);
      if (rw > 0 && rh > 0) {
        entityRects.push({ x: baseXStart * cellSize, y: baseYStart * cellSize, w: rw, h: rh, fill: eFill });
      }
    }
  }

  // Emit entity bars on top (they cover the shared cells)
  for (const r of entityRects) {
    svg += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}"${pTag}/>`;
  }

  // 2. Emit text-only cells (not covered by any pattern entity)
  for (let by = 0; by < baseRows; by++) {
    for (let bx = 0; bx < baseCols; bx++) {
      if (!(textGrid[by]?.[bx])) continue;
      if (emitted.has(key(bx, by))) continue;

      const rw = Math.min(cellSize, width - bx * cellSize);
      const rh = Math.min(cellSize, height - by * cellSize);
      if (rw <= 0 || rh <= 0) continue;

      svg += `<rect x="${bx * cellSize}" y="${by * cellSize}" width="${rw}" height="${rh}" fill="${tFill}"${tTag}/>`;
    }
  }

  svg += '</svg>';
  return svg;
}

// ============================================================================
// Composite Diff (handles entity bars + text on same side)
// ============================================================================

/**
 * One side of a composite diff. Can contain entity bars, text cells, or both.
 * Entity bars are rendered as single rects (preserving elongation animation).
 * Text cells are rendered as individual base-cell rects.
 */
export interface CompositeDiffSide {
  /** Pattern grid at entity level (optional) */
  entityGrid?: boolean[][];
  /** Text grid at base-cell level (optional) */
  textGrid?: boolean[][];
  /** Color assignments for entity grid (at entity level) */
  entityColorAssignments?: number[][] | null;
  /** Color to use for text cells (defaults to foregroundColor) */
  textColor?: string;
  /** Array of foreground colors for entity grid */
  colors?: string[];
}

export interface CompositeDiffOptions {
  from: CompositeDiffSide;
  to: CompositeDiffSide;
  elongateAxis: ElongateAxis;
  elongateAmount: number;
  baseCols: number;
  baseRows: number;
  cellSize: number;
  width: number;
  height: number;
  foregroundColor: string;
  backgroundColor: string;
}

/**
 * Build a diff SVG supporting entity bars and text cells on the same side.
 * Entity bars animate as single DOM elements (preserving elongation).
 * Text cells animate as individual base-cell rects.
 *
 * Layering (bottom to top):
 * 1. Background rect
 * 2. Shared cells (always visible, adopt to-side color)
 * 3. From entity bars (data-g="a", cover shared cells initially)
 * 4. To entity bars (data-g="b", opacity:0)
 * 5. From text-only cells (data-g="a")
 * 6. To text-only cells (data-g="b", opacity:0)
 */
export function buildCompositeDiffSvg(opts: CompositeDiffOptions): string {
  const { from, to, elongateAxis, elongateAmount,
          baseCols, baseRows, cellSize, width, height,
          foregroundColor, backgroundColor } = opts;

  const stretchX = elongateAxis === 'width' ? elongateAmount : 1;
  const stretchY = elongateAxis === 'height' ? elongateAmount : 1;
  const key = (bx: number, by: number) => by * baseCols + bx;

  const fromTFill = from.textColor ?? foregroundColor;
  const toTFill = to.textColor ?? foregroundColor;

  const fromEntityFill = (ex: number, ey: number) =>
    getCellColor(from.entityColorAssignments ?? null, from.colors, foregroundColor, ex, ey);
  const toEntityFill = (ex: number, ey: number) =>
    getCellColor(to.entityColorAssignments ?? null, to.colors, foregroundColor, ex, ey);

  // Compute base-cell coverage for each side
  const fromEntityCols = from.entityGrid?.[0]?.length ?? 0;
  const fromEntityRows = from.entityGrid?.length ?? 0;
  const toEntityCols = to.entityGrid?.[0]?.length ?? 0;
  const toEntityRows = to.entityGrid?.length ?? 0;

  // Track which base cells are covered by entity bars on each side
  const fromEntityCoverage = new Set<number>();
  const toEntityCoverage = new Set<number>();

  if (from.entityGrid) {
    for (let ey = 0; ey < fromEntityRows; ey++) {
      for (let ex = 0; ex < fromEntityCols; ex++) {
        if (!from.entityGrid[ey][ex]) continue;
        for (let dy = 0; dy < stretchY; dy++) {
          for (let dx = 0; dx < stretchX; dx++) {
            const bx = ex * stretchX + dx;
            const by = ey * stretchY + dy;
            if (bx < baseCols && by < baseRows) fromEntityCoverage.add(key(bx, by));
          }
        }
      }
    }
  }

  if (to.entityGrid) {
    for (let ey = 0; ey < toEntityRows; ey++) {
      for (let ex = 0; ex < toEntityCols; ex++) {
        if (!to.entityGrid[ey][ex]) continue;
        for (let dy = 0; dy < stretchY; dy++) {
          for (let dx = 0; dx < stretchX; dx++) {
            const bx = ex * stretchX + dx;
            const by = ey * stretchY + dy;
            if (bx < baseCols && by < baseRows) toEntityCoverage.add(key(bx, by));
          }
        }
      }
    }
  }

  // Compute full base-cell coverage per side
  const isFromCell = (bx: number, by: number) =>
    fromEntityCoverage.has(key(bx, by)) || (from.textGrid?.[by]?.[bx] ?? false);
  const isToCell = (bx: number, by: number) =>
    toEntityCoverage.has(key(bx, by)) || (to.textGrid?.[by]?.[bx] ?? false);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`;
  svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="${backgroundColor}"/>`;

  // --- 1. Shared cells (behind everything) ---
  for (let by = 0; by < baseRows; by++) {
    for (let bx = 0; bx < baseCols; bx++) {
      if (!isFromCell(bx, by) || !isToCell(bx, by)) continue;
      const rw = Math.min(cellSize, width - bx * cellSize);
      const rh = Math.min(cellSize, height - by * cellSize);
      if (rw <= 0 || rh <= 0) continue;

      // Resolve from-side and to-side colors
      let fillFrom: string;
      if (from.textGrid?.[by]?.[bx]) {
        fillFrom = fromTFill;
      } else {
        const ex = Math.floor(bx / stretchX);
        const ey = Math.floor(by / stretchY);
        fillFrom = fromEntityFill(ex, ey);
      }
      let fillTo: string;
      if (to.textGrid?.[by]?.[bx]) {
        fillTo = toTFill;
      } else {
        const ex = Math.floor(bx / stretchX);
        const ey = Math.floor(by / stretchY);
        fillTo = toEntityFill(ex, ey);
      }

      if (fillFrom === fillTo) {
        svg += `<rect x="${bx * cellSize}" y="${by * cellSize}" width="${rw}" height="${rh}" fill="${fillFrom}"/>`;
      } else {
        // Different colors — animate from A to B via fade out/in
        svg += `<rect x="${bx * cellSize}" y="${by * cellSize}" width="${rw}" height="${rh}" fill="${fillTo}" data-g="b" style="opacity:0"/>`;
        svg += `<rect x="${bx * cellSize}" y="${by * cellSize}" width="${rw}" height="${rh}" fill="${fillFrom}" data-g="a"/>`;
      }
    }
  }

  // --- 2. From entity bars (data-g="a", on top of shared) ---
  if (from.entityGrid) {
    for (let ey = 0; ey < fromEntityRows; ey++) {
      for (let ex = 0; ex < fromEntityCols; ex++) {
        if (!from.entityGrid[ey][ex]) continue;
        const bxStart = ex * stretchX;
        const byStart = ey * stretchY;
        const bxEnd = Math.min(bxStart + stretchX, baseCols);
        const byEnd = Math.min(byStart + stretchY, baseRows);
        const rw = Math.min((bxEnd - bxStart) * cellSize, width - bxStart * cellSize);
        const rh = Math.min((byEnd - byStart) * cellSize, height - byStart * cellSize);
        if (rw > 0 && rh > 0) {
          const fill = fromEntityFill(ex, ey);
          svg += `<rect x="${bxStart * cellSize}" y="${byStart * cellSize}" width="${rw}" height="${rh}" fill="${fill}" data-g="a"/>`;
        }
      }
    }
  }

  // --- 3. To entity bars (data-g="b", opacity:0) ---
  if (to.entityGrid) {
    for (let ey = 0; ey < toEntityRows; ey++) {
      for (let ex = 0; ex < toEntityCols; ex++) {
        if (!to.entityGrid[ey][ex]) continue;
        const bxStart = ex * stretchX;
        const byStart = ey * stretchY;
        const bxEnd = Math.min(bxStart + stretchX, baseCols);
        const byEnd = Math.min(byStart + stretchY, baseRows);
        const rw = Math.min((bxEnd - bxStart) * cellSize, width - bxStart * cellSize);
        const rh = Math.min((byEnd - byStart) * cellSize, height - byStart * cellSize);
        if (rw > 0 && rh > 0) {
          const fill = toEntityFill(ex, ey);
          svg += `<rect x="${bxStart * cellSize}" y="${byStart * cellSize}" width="${rw}" height="${rh}" fill="${fill}" data-g="b" style="opacity:0"/>`;
        }
      }
    }
  }

  // --- 4. From text-only cells (data-g="a") ---
  // Only cells that are in from.textGrid but NOT covered by any from-entity bar and NOT shared
  if (from.textGrid) {
    for (let by = 0; by < baseRows; by++) {
      for (let bx = 0; bx < baseCols; bx++) {
        if (!from.textGrid[by][bx]) continue;
        if (fromEntityCoverage.has(key(bx, by))) continue; // covered by from entity bar
        if (isToCell(bx, by)) continue; // shared cell
        const rw = Math.min(cellSize, width - bx * cellSize);
        const rh = Math.min(cellSize, height - by * cellSize);
        if (rw > 0 && rh > 0) {
          svg += `<rect x="${bx * cellSize}" y="${by * cellSize}" width="${rw}" height="${rh}" fill="${fromTFill}" data-g="a"/>`;
        }
      }
    }
  }

  // --- 5. To text-only cells (data-g="b", opacity:0) ---
  // Only cells in to.textGrid but NOT covered by any to-entity bar and NOT shared
  if (to.textGrid) {
    for (let by = 0; by < baseRows; by++) {
      for (let bx = 0; bx < baseCols; bx++) {
        if (!to.textGrid[by][bx]) continue;
        if (toEntityCoverage.has(key(bx, by))) continue; // covered by to entity bar
        if (isFromCell(bx, by)) continue; // shared cell
        const rw = Math.min(cellSize, width - bx * cellSize);
        const rh = Math.min(cellSize, height - by * cellSize);
        if (rw > 0 && rh > 0) {
          svg += `<rect x="${bx * cellSize}" y="${by * cellSize}" width="${rw}" height="${rh}" fill="${toTFill}" data-g="b" style="opacity:0"/>`;
        }
      }
    }
  }

  svg += '</svg>';
  return svg;
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

  const { cols, rows, width, height, cellWidth, cellHeight } = dims;
  const { foregroundColor, backgroundColor } = rest;

  const colorMode = rest.colorMode ?? 'mono';
  const proportions = rest.colorProportions ?? [1];
  const colorAssignmentsA = assignCellColors(gridA, configA.seed, colorMode, proportions, configA.frequency);
  const colorAssignmentsB = assignCellColors(gridB, configB.seed, colorMode, proportions, configB.frequency);

  return buildDiffSvg(gridA, gridB, cols, rows, cellWidth, cellHeight, width, height, foregroundColor, backgroundColor, {
    colorAssignmentsA,
    colorAssignmentsB,
    colors: rest.colors,
  });
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
  /** Effective cell width (may differ from cellSize when elongated) */
  cellWidth?: number;
  /** Effective cell height (may differ from cellSize when elongated) */
  cellHeight?: number;
  /** Multi-color options for diff rendering */
  colorOpts?: DiffColorOptions;
}

/**
 * Generates a diff SVG from two pre-computed boolean grids.
 * Grid-agnostic: works with pattern grids, text grids, or any boolean[][] source.
 *
 * Cells shared by both grids are static. Cells unique to From get data-g="a" (visible, animate off).
 * Cells unique to To get data-g="b" (hidden, animate on).
 */
export function generateDiffFromGrids(options: GenerateDiffFromGridsOptions): string {
  const { gridFrom, gridTo, cols, rows, width, height, foregroundColor, backgroundColor } = options;
  const cw = options.cellWidth ?? options.cellSize;
  const ch = options.cellHeight ?? options.cellSize;

  return buildDiffSvg(gridFrom, gridTo, cols, rows, cw, ch, width, height, foregroundColor, backgroundColor, options.colorOpts);
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

  const { cols, rows, width, height, cellWidth, cellHeight } = dims;
  const { foregroundColor, backgroundColor } = fromConfig;

  // Multi-color: compute color assignments for both grids
  const colorMode = fromConfig.colorMode ?? 'mono';
  const proportions = fromConfig.colorProportions ?? [1];
  const colorAssignmentsA = assignCellColors(gridFrom, fromConfig.seed, colorMode, proportions, fromConfig.frequency);
  const colorAssignmentsB = assignCellColors(gridTo, toConfig.seed, colorMode, proportions, toConfig.frequency);

  return buildDiffSvg(gridFrom, gridTo, cols, rows, cellWidth, cellHeight, width, height, foregroundColor, backgroundColor, {
    colorAssignmentsA,
    colorAssignmentsB,
    colors: fromConfig.colors,
  });
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
    // Text always uses base-cell dimensions (never stretched by elongation)
    const { baseCols, baseRows } = computeBaseDimensions(config);
    const parsedFonts = parseFonts(fonts);
    const effectiveTextConfig = options?.text !== undefined
      ? { ...fromTextConfig, text: options.text }
      : fromTextConfig;
    const { grid } = generateTextGrid(effectiveTextConfig, baseCols, baseRows, parsedFonts);
    // Text uses a single solid color (textColor in multi-color mode, foreground in mono)
    const effectiveTextColor = (config.colorMode ?? 'mono') !== 'mono' && config.textColor
      ? config.textColor : config.foregroundColor;
    svg = gridToSvg(
      grid, baseCols, baseRows,
      config.cellSize, dims.width,
      effectiveTextColor, config.backgroundColor,
      dims.height,
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

  // At least one state is text — use composite diff (preserves entity bars).
  const { baseCols, baseRows } = computeBaseDimensions(config);
  if (baseCols <= 0 || baseRows <= 0) return '';

  const elongateAxis = config.elongateAxis ?? 'none';
  const elongateAmount = Math.max(1, Math.round(config.elongateAmount ?? 1));
  const colorMode = config.colorMode ?? 'mono';
  const colorProportions = config.colorProportions ?? [1];
  const parsedFonts = fonts ? parseFonts(fonts) : undefined;

  const fromPatternConfig = exportData.fromTextPatternConfig;
  const toPatternConfig = exportData.toTextPatternConfig;

  // Helper: build a CompositeDiffSide for a text state (with optional pattern overlay)
  const buildTextSide = (
    textConfig: NonNullable<typeof fromTextConfig>,
    patternOverlayConfig: typeof fromPatternConfig,
    textOverride?: string,
  ): CompositeDiffSide => {
    const effectiveTextConfig = textOverride !== undefined
      ? { ...textConfig, text: textOverride } : textConfig;
    const textGrid = generateTextGrid(effectiveTextConfig, baseCols, baseRows, parsedFonts!).grid;
    const side: CompositeDiffSide = {
      textGrid,
      textColor: config.textColor ?? config.foregroundColor,
    };
    if (patternOverlayConfig) {
      const overlayDims = computeDimensions(patternOverlayConfig);
      side.entityGrid = gridFromConfig(patternOverlayConfig, overlayDims);
      side.entityColorAssignments = assignCellColors(side.entityGrid, patternOverlayConfig.seed, colorMode, colorProportions, patternOverlayConfig.frequency);
      side.colors = config.colors;
    }
    return side;
  };

  // Helper: build a CompositeDiffSide for a pattern-only state
  const buildPatternSide = (patternConfig: FragmentConfig, seed?: string): CompositeDiffSide => {
    const resolved = seed
      ? applySeededParam(patternConfig, seed, patternConfig.seedParam ?? 'frequency')
      : patternConfig;
    const entityGrid = gridFromConfig(resolved, computeDimensions(resolved));
    return {
      entityGrid,
      entityColorAssignments: assignCellColors(entityGrid, resolved.seed, colorMode, colorProportions, resolved.frequency),
      colors: config.colors,
    };
  };

  let fromSide: CompositeDiffSide;
  if (fromIsText && fromTextConfig && parsedFonts) {
    fromSide = buildTextSide(fromTextConfig, fromPatternConfig, options?.fromText);
  } else {
    fromSide = buildPatternSide(config, options?.fromSeed);
  }

  let toSide: CompositeDiffSide;
  if (toIsText && toTextConfig && parsedFonts) {
    toSide = buildTextSide(toTextConfig, toPatternConfig, options?.toText);
  } else if (toConfig) {
    toSide = buildPatternSide(toConfig, options?.toSeed);
  } else {
    return '';
  }

  const svg = buildCompositeDiffSvg({
    from: fromSide, to: toSide,
    elongateAxis, elongateAmount, baseCols, baseRows,
    cellSize: config.cellSize, width: dims.width, height: dims.height,
    foregroundColor: config.foregroundColor, backgroundColor: config.backgroundColor,
  });

  return injectOverlays(svg, dims.width, dims.height, logo, textOverlay);
}
