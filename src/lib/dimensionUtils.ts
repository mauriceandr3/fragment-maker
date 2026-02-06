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

export interface DimensionAdjustmentResult {
  width: number;
  height: number;
  cellSize: number;
  adjusted: boolean;
  adjustmentType: 'none' | 'cellSize' | 'dimensions';
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
 * Adjust cell size when user manually changes it.
 * Dimensions stay fixed, find nearest valid cell size.
 *
 * @param forceExact - If true, force the exact cell size and snap dimensions instead.
 *                     Use this when user explicitly enters a custom value.
 */
export function adjustCellSizeForDimensions(
  width: number,
  height: number,
  targetCellSize: number,
  forceExact: boolean = false
): DimensionAdjustmentResult {
  const validCellSizes = getValidCellSizes(width, height);

  // If target is already valid, use it directly
  if (validCellSizes.includes(targetCellSize)) {
    return {
      width,
      height,
      cellSize: targetCellSize,
      adjusted: false,
      adjustmentType: 'none',
    };
  }

  // If forceExact is true (custom input), always snap dimensions to match the requested cell size
  if (forceExact) {
    const snappedWidth = snapToMultiple(width, targetCellSize);
    const snappedHeight = snapToMultiple(height, targetCellSize);

    return {
      width: snappedWidth,
      height: snappedHeight,
      cellSize: targetCellSize,
      adjusted: true,
      adjustmentType: 'dimensions',
    };
  }

  // For preset selection: try to find nearest valid cell size first
  if (validCellSizes.length > 0) {
    const newCellSize = findClosestValidCellSize(validCellSizes, targetCellSize)!;
    return {
      width,
      height,
      cellSize: newCellSize,
      adjusted: true,
      adjustmentType: 'cellSize',
    };
  }

  // No valid cell sizes exist - snap dimensions instead
  const snappedWidth = snapToMultiple(width, targetCellSize);
  const snappedHeight = snapToMultiple(height, targetCellSize);

  return {
    width: snappedWidth,
    height: snappedHeight,
    cellSize: targetCellSize,
    adjusted: true,
    adjustmentType: 'dimensions',
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

