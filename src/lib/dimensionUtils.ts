/**
 * Dimension and Cell Size Utilities
 *
 * Provides functions for calculating valid cell sizes and adjusting dimensions
 * to maintain grid alignment with the cell-first constraint system.
 */

// ============================================================================
// Constants
// ============================================================================

export const MIN_CELL_SIZE = 2; // Absolute minimum (for small dimensions)
export const MAX_CELL_SIZE = 200; // Maximum cell size for buttons/slider
export const MIN_CANVAS_DIMENSION = 64;
export const MAX_CANVAS_DIMENSION = 4096;
export const DEFAULT_CELL_SIZE = 40;
export const DEFAULT_WIDTH = 1000;
export const DEFAULT_HEIGHT = 1000;

/**
 * Calculate the dynamic minimum cell size based on canvas dimensions.
 * This is roughly 1% of the largest dimension, with a floor of 2px.
 * Prevents performance issues with extremely small cells.
 */
export function getDynamicMinCellSize(width: number, height: number): number {
  return Math.max(2, Math.ceil(Math.max(width, height) * 0.01));
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
 * Get valid cell sizes for the dynamic GCD-based button system (PRD-007).
 * Returns divisors of GCD(width, height) that are >= dynamicMin and <= 200.
 * dynamicMin = max(2, ceil(max(width, height) * 0.01))
 */
export function getValidCellSizesForButtons(width: number, height: number): number[] {
  const gcdValue = gcd(width, height);
  const dynamicMin = getDynamicMinCellSize(width, height);
  return getDivisors(gcdValue).filter(
    (d) => d >= dynamicMin && d <= MAX_CELL_SIZE
  );
}

/**
 * Find the nearest valid cell size from the valid set.
 * Tie-breaking rule (PRD-011): when two valid sizes are equidistant, prefer the larger one.
 */
export function findNearestValidCellSize(
  validSizes: number[],
  targetCellSize: number
): number | null {
  if (validSizes.length === 0) return null;

  return validSizes.reduce((nearest, current) => {
    const currentDiff = Math.abs(current - targetCellSize);
    const nearestDiff = Math.abs(nearest - targetCellSize);

    // Tie-breaking: prefer larger value
    if (currentDiff < nearestDiff) {
      return current;
    } else if (currentDiff === nearestDiff && current > nearest) {
      return current;
    }
    return nearest;
  });
}

// ============================================================================
// Validation Functions
// ============================================================================


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

