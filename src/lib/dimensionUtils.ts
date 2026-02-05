/**
 * Dimension and Cell Size Utilities
 *
 * Provides functions for calculating valid cell sizes and adjusting dimensions
 * to maintain grid alignment with the cell-first constraint system.
 */

// ============================================================================
// Constants
// ============================================================================

export const MIN_CELL_SIZE = 8;
export const MAX_CELL_SIZE = 128;
export const MIN_CANVAS_DIMENSION = 64;
export const MAX_CANVAS_DIMENSION = 4096;
export const DEFAULT_CELL_SIZE = 40;
export const DEFAULT_WIDTH = 1000;
export const DEFAULT_HEIGHT = 1000;

export const CELL_SIZE_PRESETS = [8, 16, 24, 32, 48, 64] as const;

// ============================================================================
// Types
// ============================================================================

export interface AspectRatio {
  width: number;
  height: number;
}

export type AspectRatioPreset = '1:1' | '4:3' | '3:2' | '16:9' | '9:16' | 'custom';

export const ASPECT_RATIO_PRESETS: Record<Exclude<AspectRatioPreset, 'custom'>, AspectRatio> = {
  '1:1': { width: 1, height: 1 },
  '4:3': { width: 4, height: 3 },
  '3:2': { width: 3, height: 2 },
  '16:9': { width: 16, height: 9 },
  '9:16': { width: 9, height: 16 },
};

export interface DimensionAdjustmentResult {
  width: number;
  height: number;
  cellSize: number;
  adjusted: boolean;
  adjustmentType: 'none' | 'cellSize' | 'dimensions';
  message?: string;
}

// ============================================================================
// Core Math Functions
// ============================================================================

/**
 * Calculate the Greatest Common Divisor of two numbers using Euclidean algorithm.
 */
export function gcd(a: number, b: number): number {
  a = Math.abs(Math.floor(a));
  b = Math.abs(Math.floor(b));
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

/**
 * Find all divisors of a number.
 */
export function getDivisors(n: number): number[] {
  n = Math.abs(Math.floor(n));
  if (n === 0) return [];

  const divisors: number[] = [];
  for (let i = 1; i <= Math.sqrt(n); i++) {
    if (n % i === 0) {
      divisors.push(i);
      if (i !== n / i) {
        divisors.push(n / i);
      }
    }
  }
  return divisors.sort((a, b) => a - b);
}

/**
 * Find all valid cell sizes for given dimensions.
 * Valid cell sizes are common divisors of both width and height that are >= MIN_CELL_SIZE.
 */
export function getValidCellSizes(width: number, height: number): number[] {
  const gcdValue = gcd(width, height);
  return getDivisors(gcdValue).filter(
    (d) => d >= MIN_CELL_SIZE && d <= MAX_CELL_SIZE
  );
}

/**
 * Find the valid cell size closest to the target value.
 */
export function findClosestValidCellSize(
  validSizes: number[],
  targetCellSize: number
): number | null {
  if (validSizes.length === 0) return null;

  return validSizes.reduce((closest, current) =>
    Math.abs(current - targetCellSize) < Math.abs(closest - targetCellSize)
      ? current
      : closest
  );
}

// ============================================================================
// Dimension Adjustment Functions
// ============================================================================

/**
 * Snap a dimension to the nearest multiple of cell size while respecting min/max constraints.
 */
export function snapToMultiple(
  value: number,
  cellSize: number,
  min: number = MIN_CANVAS_DIMENSION,
  max: number = MAX_CANVAS_DIMENSION
): number {
  const snapped = Math.round(value / cellSize) * cellSize;
  return Math.max(min, Math.min(max, snapped));
}

/**
 * Calculate height based on width and aspect ratio.
 */
export function calculateHeight(width: number, aspectRatio: AspectRatio): number {
  return Math.round((width * aspectRatio.height) / aspectRatio.width);
}

/**
 * Calculate width based on height and aspect ratio.
 */
export function calculateWidth(height: number, aspectRatio: AspectRatio): number {
  return Math.round((height * aspectRatio.width) / aspectRatio.height);
}

/**
 * Adjust dimensions and cell size to ensure grid alignment.
 *
 * Algorithm:
 * 1. Calculate GCD of width and height
 * 2. Find all divisors of GCD that are >= MIN_CELL_SIZE and <= MAX_CELL_SIZE
 * 3. Select divisor closest to current cell size
 * 4. If no valid divisors exist, snap dimensions to nearest multiples of current cell size
 */
export function adjustDimensionsAndCellSize(
  width: number,
  height: number,
  currentCellSize: number,
  aspectRatio: AspectRatio
): DimensionAdjustmentResult {
  // Validate inputs
  width = Math.max(MIN_CANVAS_DIMENSION, Math.min(MAX_CANVAS_DIMENSION, Math.floor(width)));
  height = Math.max(MIN_CANVAS_DIMENSION, Math.min(MAX_CANVAS_DIMENSION, Math.floor(height)));
  currentCellSize = Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, currentCellSize));

  // Check if current settings are already valid
  if (width % currentCellSize === 0 && height % currentCellSize === 0) {
    return {
      width,
      height,
      cellSize: currentCellSize,
      adjusted: false,
      adjustmentType: 'none',
    };
  }

  // Find valid cell sizes for these dimensions
  const validCellSizes = getValidCellSizes(width, height);

  if (validCellSizes.length > 0) {
    // Strategy 1: Adjust cell size to nearest valid divisor
    const newCellSize = findClosestValidCellSize(validCellSizes, currentCellSize)!;
    return {
      width,
      height,
      cellSize: newCellSize,
      adjusted: true,
      adjustmentType: 'cellSize',
      message: `Cell size adjusted to ${newCellSize}px to fit ${width}×${height} dimensions`,
    };
  } else {
    // Strategy 2: Snap dimensions to multiples of current cell size
    const snappedWidth = snapToMultiple(width, currentCellSize);
    const snappedHeight = calculateHeight(snappedWidth, aspectRatio);

    // Ensure snapped height is also a multiple and within bounds
    const finalHeight = snapToMultiple(snappedHeight, currentCellSize);
    const finalWidth = snappedWidth;

    return {
      width: finalWidth,
      height: finalHeight,
      cellSize: currentCellSize,
      adjusted: true,
      adjustmentType: 'dimensions',
      message: `Dimensions adjusted to ${finalWidth}×${finalHeight} to align with ${currentCellSize}px cells`,
    };
  }
}

/**
 * Adjust cell size when user manually changes it.
 * Dimensions stay fixed, find nearest valid cell size.
 */
export function adjustCellSizeForDimensions(
  width: number,
  height: number,
  targetCellSize: number
): DimensionAdjustmentResult {
  const validCellSizes = getValidCellSizes(width, height);

  if (validCellSizes.length === 0) {
    // No valid cell sizes - snap dimensions instead
    const snappedWidth = snapToMultiple(width, targetCellSize);
    const snappedHeight = snapToMultiple(height, targetCellSize);

    return {
      width: snappedWidth,
      height: snappedHeight,
      cellSize: targetCellSize,
      adjusted: true,
      adjustmentType: 'dimensions',
      message: `Dimensions adjusted to ${snappedWidth}×${snappedHeight} to align with ${targetCellSize}px cells`,
    };
  }

  if (validCellSizes.includes(targetCellSize)) {
    // Target cell size is valid
    return {
      width,
      height,
      cellSize: targetCellSize,
      adjusted: false,
      adjustmentType: 'none',
    };
  }

  // Find closest valid cell size
  const newCellSize = findClosestValidCellSize(validCellSizes, targetCellSize)!;
  return {
    width,
    height,
    cellSize: newCellSize,
    adjusted: true,
    adjustmentType: 'cellSize',
    message: `Cell size adjusted to ${newCellSize}px (nearest valid size for ${width}×${height})`,
  };
}

/**
 * Validate and clamp canvas dimension input.
 */
export function validateCanvasDimension(value: number): {
  valid: boolean;
  value: number;
  error?: string;
} {
  if (isNaN(value) || !isFinite(value)) {
    return { valid: false, value: MIN_CANVAS_DIMENSION, error: 'Invalid number' };
  }

  const intValue = Math.floor(value);

  if (intValue < MIN_CANVAS_DIMENSION) {
    return { valid: false, value: MIN_CANVAS_DIMENSION, error: `Minimum ${MIN_CANVAS_DIMENSION}px` };
  }

  if (intValue > MAX_CANVAS_DIMENSION) {
    return { valid: false, value: MAX_CANVAS_DIMENSION, error: `Maximum ${MAX_CANVAS_DIMENSION}px` };
  }

  return { valid: true, value: intValue };
}

/**
 * Validate and clamp cell size input.
 */
export function validateCellSize(value: number): {
  valid: boolean;
  value: number;
  error?: string;
} {
  if (isNaN(value) || !isFinite(value)) {
    return { valid: false, value: MIN_CELL_SIZE, error: 'Invalid number' };
  }

  const intValue = Math.floor(value);

  if (intValue < MIN_CELL_SIZE) {
    return { valid: false, value: MIN_CELL_SIZE, error: `Minimum ${MIN_CELL_SIZE}px` };
  }

  if (intValue > MAX_CELL_SIZE) {
    return { valid: false, value: MAX_CELL_SIZE, error: `Maximum ${MAX_CELL_SIZE}px` };
  }

  return { valid: true, value: intValue };
}

/**
 * Validate custom aspect ratio input (1-99).
 */
export function validateAspectRatioValue(value: number): {
  valid: boolean;
  value: number;
  error?: string;
} {
  if (isNaN(value) || !isFinite(value)) {
    return { valid: false, value: 1, error: 'Invalid number' };
  }

  const intValue = Math.floor(value);

  if (intValue < 1) {
    return { valid: false, value: 1, error: 'Minimum 1' };
  }

  if (intValue > 99) {
    return { valid: false, value: 99, error: 'Maximum 99' };
  }

  return { valid: true, value: intValue };
}
