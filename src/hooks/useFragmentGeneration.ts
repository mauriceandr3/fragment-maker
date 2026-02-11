import { useState, useEffect, useMemo, useCallback, useDeferredValue } from "react";
import {
  generateGridVariations,
  generateFragmentSvgDirect,
  generateFragmentDiffSvg,
} from "@/lib/generateFragmentSvgGrid";
import { generateGrid as generateGridCore } from "@/lib/generateFragmentSvg";
import type { FragmentState } from "./useFragmentState";

export function useFragmentGeneration(state: FragmentState) {
  const {
    params,
    displayForeground,
    displayBackground,
    cellSize,
    canvasWidth,
    canvasHeight,
    allowCropping,
    cropDirection,
    gridDimensions,
    viewMode,
    debounced,
  } = state;

  const [grid, setGrid] = useState<boolean[][]>([]);
  const [hasGeneratedGrid, setHasGeneratedGrid] = useState(false);

  // Generate grid using the lib function directly
  const regenerateGrid = useCallback(() => {
    const { cols, rows } = gridDimensions;
    if (!cols || !rows || cols <= 0 || rows <= 0) {
      console.warn('Invalid grid dimensions:', { cols, rows });
      return;
    }

    const newGrid = generateGridCore(
      cols, rows,
      params.seed, params.threshold, params.gamma,
      params.frequency, params.contrast, params.fillAmount,
      params.fillType, params.invertFill,
      params.directionalNeighbors, params.directionDensity,
    );
    setGrid(newGrid);
  }, [gridDimensions, params]);

  // Trigger grid regeneration when parameters change
  useEffect(() => {
    regenerateGrid();
  }, [regenerateGrid]);

  // Generate SVG string for export/clipboard
  const generateSVG = useCallback((): string => {
    const config = {
      threshold: params.threshold,
      gamma: params.gamma,
      frequency: params.frequency,
      contrast: params.contrast,
      seed: params.seed,
      directionalNeighbors: params.directionalNeighbors,
      directionDensity: params.directionDensity,
      fillAmount: params.fillAmount,
      fillType: params.fillType,
      invertFill: params.invertFill,
      foregroundColor: displayForeground,
      backgroundColor: displayBackground,
      cellSize,
      canvasWidth,
      canvasHeight,
      allowCropping,
      cropDirection,
    };
    return generateFragmentSvgDirect(config);
  }, [params, displayForeground, displayBackground, cellSize, canvasWidth, canvasHeight, allowCropping, cropDirection]);

  // Generate diff SVG for animation preview
  const diffSvg = useMemo(() => {
    if (!debounced.animationEnabled || !debounced.animationSeedA || !debounced.animationSeedB) return '';
    return generateFragmentDiffSvg({
      seedA: debounced.animationSeedA,
      seedB: debounced.animationSeedB,
      config: {
        threshold: debounced.params.threshold,
        gamma: debounced.params.gamma,
        frequency: debounced.params.frequency,
        contrast: debounced.params.contrast,
        seed: debounced.params.seed,
        directionalNeighbors: debounced.params.directionalNeighbors,
        directionDensity: debounced.params.directionDensity,
        fillAmount: debounced.params.fillAmount,
        fillType: debounced.params.fillType,
        invertFill: debounced.params.invertFill,
        foregroundColor: displayForeground,
        backgroundColor: displayBackground,
        cellSize: debounced.cellSize,
        canvasWidth: debounced.canvasWidth,
        canvasHeight: debounced.canvasHeight,
        allowCropping: debounced.allowCropping,
        cropDirection: debounced.cropDirection,
      },
    });
  }, [debounced, displayForeground, displayBackground]);

  // Grid view variations
  const gridVariations = useMemo(() => {
    const baseConfig = {
      threshold: debounced.params.threshold,
      gamma: debounced.params.gamma,
      frequency: debounced.params.frequency,
      contrast: debounced.params.contrast,
      seed: debounced.params.seed,
      directionalNeighbors: debounced.params.directionalNeighbors,
      directionDensity: debounced.params.directionDensity,
      fillAmount: debounced.params.fillAmount,
      fillType: debounced.params.fillType,
      invertFill: debounced.params.invertFill,
      foregroundColor: debounced.invertColors ? debounced.background : debounced.foreground,
      backgroundColor: debounced.invertColors ? debounced.foreground : debounced.background,
      cellSize: debounced.cellSize,
      canvasWidth: debounced.canvasWidth,
      canvasHeight: debounced.canvasHeight,
      allowCropping: debounced.allowCropping,
      cropDirection: debounced.cropDirection,
    };
    return generateGridVariations(baseConfig, 'frequency', 20);
  }, [debounced]);

  const gridSvgs = useMemo(() => {
    return gridVariations.map((config) => generateFragmentSvgDirect(config));
  }, [gridVariations]);

  const deferredGridSvgs = useDeferredValue(gridSvgs);
  const isGridStale = deferredGridSvgs !== gridSvgs;

  // Mark grid as generated after first render (for skeleton display)
  useEffect(() => {
    if (viewMode === 'grid' && gridSvgs.length > 0 && !hasGeneratedGrid) {
      requestAnimationFrame(() => {
        setHasGeneratedGrid(true);
      });
    }
  }, [viewMode, gridSvgs, hasGeneratedGrid]);

  // Reset hasGeneratedGrid when switching away from grid view
  useEffect(() => {
    if (viewMode === 'single') {
      setHasGeneratedGrid(false);
    }
  }, [viewMode]);

  // Find which grid item best matches the current frequency value
  const highlightedGridIndex = useMemo(() => {
    const currentValue = params.frequency;
    let closestIndex = 0;
    let closestDiff = Infinity;

    for (let i = 0; i < gridVariations.length; i++) {
      const gridValue = gridVariations[i].frequency;
      const diff = Math.abs(gridValue - currentValue);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    return closestIndex;
  }, [params.frequency, gridVariations]);

  return {
    grid,
    generateSVG,
    diffSvg,
    gridVariations,
    gridSvgs,
    deferredGridSvgs,
    isGridStale,
    hasGeneratedGrid,
    highlightedGridIndex,
  } as const;
}

export type FragmentGeneration = ReturnType<typeof useFragmentGeneration>;
