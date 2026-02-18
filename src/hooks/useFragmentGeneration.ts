import { useState, useEffect, useMemo, useCallback, useDeferredValue } from "react";
import {
  generateGridVariations,
  generateFragmentSvgDirect,
  generateFragmentDiffFromConfigs,
  generateDiffFromGrids,
} from "@/lib/generateFragmentSvgGrid";
import { generateGrid as generateGridCore, gridToSvg } from "@/implementation-files/generateFragmentSvg";
import { generateTextGrid } from "@/implementation-files/generateTextGrid";
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
    fromStateType,
    fromTextConfig,
  } = state;

  const [grid, setGrid] = useState<boolean[][]>([]);
  const [hasGeneratedGrid, setHasGeneratedGrid] = useState(false);

  // Generate grid for single view (from state)
  // Supports both pattern and text state types
  const regenerateGrid = useCallback(() => {
    const { cols, rows } = gridDimensions;
    if (!cols || !rows || cols <= 0 || rows <= 0) {
      console.warn('Invalid grid dimensions:', { cols, rows });
      return;
    }

    let newGrid: boolean[][];
    if (fromStateType === 'text') {
      const result = generateTextGrid(fromTextConfig, cols, rows);
      newGrid = result.grid;
    } else {
      newGrid = generateGridCore(
        cols, rows,
        params.seed, params.threshold, params.gamma,
        params.frequency, params.contrast, params.fillAmount,
        params.fillType, params.invertFill,
        params.directionalNeighbors, params.directionDensity,
      );
    }
    setGrid(newGrid);
  }, [gridDimensions, params, fromStateType, fromTextConfig]);

  // Trigger grid regeneration when parameters change
  useEffect(() => {
    regenerateGrid();
  }, [regenerateGrid]);

  // Generate SVG string for export/clipboard
  // Supports both pattern and text state types
  const generateSVG = useCallback((): string => {
    const { cols, rows } = gridDimensions;

    // For text state, generate from text grid
    if (fromStateType === 'text') {
      if (cols <= 0 || rows <= 0) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="10" y="50" fill="red">Invalid dimensions</text></svg>`;
      }
      const result = generateTextGrid(fromTextConfig, cols, rows);
      return gridToSvg(
        result.grid,
        cols,
        rows,
        cellSize,
        canvasWidth,
        displayForeground,
        displayBackground,
        canvasHeight,
        { allowCropping, cropDirection }
      );
    }

    // For pattern state, use the existing direct approach
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
  }, [params, displayForeground, displayBackground, cellSize, canvasWidth, canvasHeight, allowCropping, cropDirection, gridDimensions, fromStateType, fromTextConfig]);

  // Generate diff SVG for animation preview
  // Supports all four combinations: Pattern↔Pattern, Pattern↔Text, Text↔Pattern, Text↔Text
  const diffSvg = useMemo(() => {
    if (!debounced.animationEnabled || !debounced.toParams) return '';

    const { cols, rows } = gridDimensions;
    if (cols <= 0 || rows <= 0) return '';

    const fromIsText = debounced.fromStateType === 'text';
    const toIsText = debounced.toStateType === 'text';

    // If both are pattern, use the optimized config-based approach
    if (!fromIsText && !toIsText) {
      const sharedSettings = {
        foregroundColor: displayForeground,
        backgroundColor: displayBackground,
        cellSize: debounced.cellSize,
        canvasWidth: debounced.canvasWidth,
        canvasHeight: debounced.canvasHeight,
        allowCropping: debounced.allowCropping,
        cropDirection: debounced.cropDirection,
      };

      const fromConfig = {
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
        ...sharedSettings,
      };

      const toConfig = {
        threshold: debounced.toParams.threshold,
        gamma: debounced.toParams.gamma,
        frequency: debounced.toParams.frequency,
        contrast: debounced.toParams.contrast,
        seed: debounced.toParams.seed,
        directionalNeighbors: debounced.toParams.directionalNeighbors,
        directionDensity: debounced.toParams.directionDensity,
        fillAmount: debounced.toParams.fillAmount,
        fillType: debounced.toParams.fillType,
        invertFill: debounced.toParams.invertFill,
        ...sharedSettings,
      };

      return generateFragmentDiffFromConfigs({ fromConfig, toConfig });
    }

    // At least one state is text - use grid-based approach
    let gridFrom: boolean[][];
    let gridTo: boolean[][];

    // Generate "from" grid
    if (fromIsText) {
      const result = generateTextGrid(debounced.fromTextConfig, cols, rows);
      gridFrom = result.grid;
    } else {
      gridFrom = generateGridCore(
        cols, rows,
        debounced.params.seed, debounced.params.threshold, debounced.params.gamma,
        debounced.params.frequency, debounced.params.contrast, debounced.params.fillAmount,
        debounced.params.fillType, debounced.params.invertFill,
        debounced.params.directionalNeighbors, debounced.params.directionDensity,
      );
    }

    // Generate "to" grid
    if (toIsText) {
      const result = generateTextGrid(debounced.toTextConfig, cols, rows);
      gridTo = result.grid;
    } else {
      gridTo = generateGridCore(
        cols, rows,
        debounced.toParams.seed, debounced.toParams.threshold, debounced.toParams.gamma,
        debounced.toParams.frequency, debounced.toParams.contrast, debounced.toParams.fillAmount,
        debounced.toParams.fillType, debounced.toParams.invertFill,
        debounced.toParams.directionalNeighbors, debounced.toParams.directionDensity,
      );
    }

    return generateDiffFromGrids({
      gridFrom,
      gridTo,
      cols,
      rows,
      cellSize: debounced.cellSize,
      width: debounced.canvasWidth,
      height: debounced.canvasHeight,
      foregroundColor: displayForeground,
      backgroundColor: displayBackground,
      allowCropping: debounced.allowCropping,
      cropDirection: debounced.cropDirection,
    });
  }, [debounced, displayForeground, displayBackground, gridDimensions]);

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
